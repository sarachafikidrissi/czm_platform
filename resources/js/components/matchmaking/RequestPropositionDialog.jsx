import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import axios from 'axios';
import { AlertTriangle, Clock, Loader2, Lock, Search, Send, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

// Server reason (PropositionRequestController::referenceIneligibility) -> translation key.
const BLOCKED_REASON_KEYS = {
    prospect: 'profile.requestPropositionBlockedProspect',
    not_member: 'profile.requestPropositionBlockedNotMember',
    deactivated: 'profile.requestPropositionBlockedDeactivated',
    incomplete: 'profile.requestPropositionBlockedIncomplete',
    same_gender: 'profile.requestPropositionBlockedSameGender',
    reference_active: 'profile.requestPropositionBlockedActiveProposition',
    reference_rdv: 'profile.requestPropositionBlockedRdv',
};

// Request-level refusals from the server (PropositionRequestController::REQUEST_BLOCK_MESSAGES).
const PROFILE_BLOCK_KEYS = {
    open_request: 'profile.requestPropositionOpenRequest',
    compatible_active: 'profile.requestPropositionProfileEngaged',
    compatible_rdv: 'profile.requestPropositionProfileEngaged',
};

function MemberOption({ member, checked, onPick, t, showSuggestedTag = false }) {
    const blockedText = member.blocked_reason
        ? t(BLOCKED_REASON_KEYS[member.blocked_reason] || 'profile.requestPropositionBlockedNotMember')
        : member.pending
          ? t('profile.requestPropositionPairPending')
          : null;
    const disabled = Boolean(blockedText);

    return (
        <label
            className={`flex items-center gap-3 rounded-xl border-[1.5px] px-3 py-2.5 ${
                disabled
                    ? 'cursor-not-allowed bg-gray-50 text-gray-500'
                    : checked
                      ? 'cursor-pointer border-[#890505] bg-[#fdf2f2]'
                      : 'cursor-pointer hover:border-[#e8b4b4]'
            }`}
        >
            <input
                type="radio"
                name="rp-member"
                className="h-4 w-4 accent-[#890505]"
                disabled={disabled}
                checked={checked}
                onChange={() => onPick(member)}
            />
            {member.photo ? (
                <img src={member.photo} alt="" className="h-9 w-9 flex-none rounded-full object-cover" />
            ) : (
                <span aria-hidden className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-700">
                    {member.name?.charAt(0)}
                </span>
            )}
            <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">
                    {member.name}
                    {member.age ? `, ${t('profile.requestPropositionAge', { age: member.age })}` : ''}
                </span>
                {blockedText ? (
                    <span className={`mt-0.5 inline-flex items-center gap-1 text-xs font-bold ${member.pending && !member.blocked_reason ? 'text-amber-700' : 'text-gray-500'}`}>
                        {member.pending && !member.blocked_reason ? <Clock className="h-3 w-3" aria-hidden /> : <Lock className="h-3 w-3" aria-hidden />}
                        {blockedText}
                    </span>
                ) : (
                    <span className="block truncate text-xs text-muted-foreground">
                        {[
                            member.city,
                            showSuggestedTag
                                ? t(member.suggested ? 'profile.requestPropositionInSuggestions' : 'profile.requestPropositionNotSuggested')
                                : null,
                        ]
                            .filter(Boolean)
                            .join(' · ')}
                    </span>
                )}
            </span>
            {member.score != null && !disabled && (
                <span className="flex-none text-xs font-bold text-[#890505]">{t('profile.requestPropositionCompatibility', { score: member.score })}</span>
            )}
        </label>
    );
}

/**
 * Request a proposition from someone else's member/client profile (REQUEST rule).
 * Shows my members the engine finds compatible (suggestions) and lets the matchmaker search any of
 * their members; only those meeting the conditions (member/client, active, complete, opposite gender) can be picked.
 */
export default function RequestPropositionDialog({ open, onOpenChange, subject, onSent }) {
    const { t } = useTranslation();
    const { showToast } = useToast();

    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState('');
    const [owner, setOwner] = useState(null);
    const [suggestions, setSuggestions] = useState([]);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState(null);
    const [searching, setSearching] = useState(false);
    const [picked, setPicked] = useState(null);
    const [message, setMessage] = useState('');
    const [errors, setErrors] = useState({});
    const [sending, setSending] = useState(false);
    const searchSeq = useRef(0);

    const ownerName = owner?.name || '';
    const endpoint = subject?.id ? `/staff/proposition-requests/eligible-references/${subject.id}` : null;

    // Initial load: compatible suggestions.
    useEffect(() => {
        if (!open || !endpoint) return;

        let cancelled = false;
        setLoading(true);
        setLoadError('');
        setPicked(null);
        setMessage('');
        setQuery('');
        setResults(null);
        setErrors({});

        axios
            .get(endpoint)
            .then(({ data }) => {
                if (cancelled) return;
                setOwner(data.owner);
                setSuggestions(data.suggestions || []);
            })
            .catch(() => {
                if (!cancelled) setLoadError(t('profile.requestPropositionLoadError'));
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [open, endpoint, t]);

    // Debounced search across all of my members (compatible or not).
    useEffect(() => {
        if (!open || !endpoint) return;
        const q = query.trim();
        if (q.length < 2) {
            setResults(null);
            setSearching(false);
            return;
        }

        const seq = ++searchSeq.current;
        setSearching(true);
        const timer = setTimeout(() => {
            axios
                .get(endpoint, { params: { q } })
                .then(({ data }) => {
                    if (seq === searchSeq.current) setResults(data.results || []);
                })
                .catch(() => {
                    if (seq === searchSeq.current) setResults([]);
                })
                .finally(() => {
                    if (seq === searchSeq.current) setSearching(false);
                });
        }, 300);

        return () => clearTimeout(timer);
    }, [query, open, endpoint]);

    const pickedId = picked?.id ?? null;
    const lockMember = (id, changes) => {
        const lock = (list) => list?.map((m) => (m.id === id ? { ...m, ...changes } : m)) ?? list;
        setSuggestions((list) => lock(list));
        setResults((list) => lock(list));
    };

    const onPick = (member) => {
        setPicked(member);
        setErrors((e) => ({ ...e, member: undefined, form: undefined }));
    };

    const submit = async () => {
        const nextErrors = {};
        if (!picked) nextErrors.member = t('profile.requestPropositionChooseMember');
        if (!message.trim()) nextErrors.message = t('profile.requestPropositionMessageRequired', { owner: ownerName });
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length) return;

        setSending(true);
        try {
            await axios.post('/staff/proposition-requests', {
                reference_user_id: picked.id,
                compatible_user_id: subject.id,
                message: message.trim(),
            });
            showToast(t('profile.requestPropositionSent', { owner: ownerName, member: picked.name }), undefined, 'success');
            onOpenChange(false);
            onSent?.();
        } catch (err) {
            const data = err?.response?.data || {};
            const status = err?.response?.status;
            if (status === 422 && data.error === 'reference_not_eligible') {
                setErrors({ form: t('profile.requestPropositionReferenceNotEligible') });
            } else if (status === 422 && BLOCKED_REASON_KEYS[data.error]) {
                // My member is engaged (active proposition / RDV): lock it with the reason.
                lockMember(picked.id, { blocked_reason: data.error });
                setPicked(null);
                setErrors({ form: t(BLOCKED_REASON_KEYS[data.error]) });
            } else if (status === 422 && PROFILE_BLOCK_KEYS[data.error]) {
                setErrors({ form: t(PROFILE_BLOCK_KEYS[data.error]) });
            } else if (status === 422 && String(data.message || '').includes('déjà en attente')) {
                // Duplicate pending request for this pair: lock that member.
                lockMember(picked.id, { pending: true });
                setPicked(null);
                setErrors({ form: t('profile.requestPropositionPairPending') });
            } else {
                setErrors({ form: t('profile.requestPropositionError') });
            }
        } finally {
            setSending(false);
        }
    };

    const searchActive = query.trim().length >= 2;

    return (
        <Dialog open={open} onOpenChange={(next) => !sending && onOpenChange(next)}>
            <DialogContent className="sm:max-w-[580px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Send className="h-5 w-5 text-[#890505]" aria-hidden />
                        {t('profile.requestPropositionAction')}
                    </DialogTitle>
                    {ownerName && <DialogDescription>{t('profile.requestPropositionIntro', { owner: ownerName })}</DialogDescription>}
                </DialogHeader>

                {loading && (
                    <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground" role="status">
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        {t('profile.requestPropositionLoading')}
                    </div>
                )}

                {loadError && (
                    <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-800">
                        <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" aria-hidden />
                        {loadError}
                    </div>
                )}

                {!loading && !loadError && (
                    <div className="space-y-4">
                        {errors.form && (
                            <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-800">
                                <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" aria-hidden />
                                {errors.form}
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="rp-search">{t('profile.requestPropositionSearchLabel')}</Label>
                            <div className="relative">
                                <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                                <Input
                                    id="rp-search"
                                    type="search"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder={t('profile.requestPropositionSearchPlaceholder')}
                                    className="ps-9"
                                    autoComplete="off"
                                />
                            </div>
                            {query.trim().length === 1 && <p className="text-xs text-muted-foreground">{t('profile.requestPropositionSearchHint')}</p>}
                        </div>

                        <div role="radiogroup" aria-labelledby="rp-member-label" className="space-y-3">
                            <span id="rp-member-label" className="sr-only">
                                {t('profile.requestPropositionMemberLabel')}
                            </span>

                            {searchActive && (
                                <section className="space-y-2" aria-live="polite">
                                    <h4 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-muted-foreground">
                                        <Search className="h-3.5 w-3.5" aria-hidden />
                                        {t('profile.requestPropositionResultsTitle')}
                                    </h4>
                                    {searching && results === null ? (
                                        <p className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                                            {t('profile.requestPropositionSearching')}
                                        </p>
                                    ) : results && results.length > 0 ? (
                                        <div className="max-h-[220px] space-y-2 overflow-y-auto pe-1">
                                            {results.map((member) => (
                                                <MemberOption key={`r-${member.id}`} member={member} checked={pickedId === member.id} onPick={onPick} t={t} showSuggestedTag />
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="rounded-xl border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
                                            {t('profile.requestPropositionNoResults')}
                                        </p>
                                    )}
                                </section>
                            )}

                            <section className="space-y-2">
                                <h4 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-muted-foreground">
                                    <Sparkles className="h-3.5 w-3.5 text-[#890505]" aria-hidden />
                                    {t('profile.requestPropositionSuggestionsTitle')}
                                </h4>
                                {suggestions.length > 0 ? (
                                    <div className="max-h-[220px] space-y-2 overflow-y-auto pe-1">
                                        {suggestions.map((member) => (
                                            <MemberOption key={`s-${member.id}`} member={member} checked={pickedId === member.id} onPick={onPick} t={t} />
                                        ))}
                                    </div>
                                ) : (
                                    <p className="rounded-xl border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
                                        {t('profile.requestPropositionNoSuggestions')}
                                    </p>
                                )}
                            </section>

                            {errors.member && (
                                <p role="alert" className="text-xs font-semibold text-red-700">
                                    {errors.member}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="rp-message">
                                {t('profile.requestPropositionMessageLabel', { owner: ownerName })} <span className="text-red-700">*</span>
                            </Label>
                            <Textarea
                                id="rp-message"
                                value={message}
                                maxLength={2000}
                                aria-invalid={errors.message ? 'true' : undefined}
                                onChange={(e) => {
                                    setMessage(e.target.value);
                                    if (errors.message) setErrors((x) => ({ ...x, message: undefined }));
                                }}
                                placeholder={t('profile.requestPropositionMessagePlaceholder', { owner: ownerName })}
                                className="min-h-[88px]"
                            />
                            {errors.message && (
                                <p role="alert" className="text-xs font-semibold text-red-700">
                                    {errors.message}
                                </p>
                            )}
                        </div>
                    </div>
                )}

                <DialogFooter>
                    {loadError ? (
                        <Button type="button" onClick={() => onOpenChange(false)}>
                            {t('profile.requestPropositionClose')}
                        </Button>
                    ) : (
                        <>
                            <Button type="button" variant="outline" disabled={sending} onClick={() => onOpenChange(false)}>
                                {t('profile.requestPropositionCancel')}
                            </Button>
                            <Button type="button" disabled={sending || loading} onClick={submit} className="gap-2 bg-[#890505] text-white hover:bg-[#6d0404]">
                                {sending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
                                {t('profile.requestPropositionSubmit')}
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
