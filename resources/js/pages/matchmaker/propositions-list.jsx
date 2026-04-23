import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import AppLayout from '@/layouts/app-layout';
import { propositionToastFr } from '@/lib/proposition-toast-messages';
import { Head, router, usePage } from '@inertiajs/react';
import axios from 'axios';
import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function PropositionsList() {
    const { t } = useTranslation();
    const { showToast } = useToast();
    const { propositions: initialPropositions = [] } = usePage().props;
    const [propositions, setPropositions] = useState(initialPropositions);
    const [isSending, setIsSending] = useState({});
    const [errorByKey, setErrorByKey] = useState({});
    const [responseMessages, setResponseMessages] = useState({});
    const [processingIds, setProcessingIds] = useState({});
    const [responseErrors, setResponseErrors] = useState({});
    const [responseSuccesses, setResponseSuccesses] = useState({});
    const [isRespondModalOpen, setIsRespondModalOpen] = useState(false);
    const [activeRecipient, setActiveRecipient] = useState(null);
    const [activeRecipientLabel, setActiveRecipientLabel] = useState('');
    const [cancelEntry, setCancelEntry] = useState(null);
    const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
    /** While a grouped cancel request is in flight (one button per row). */
    const [cancellingEntryKey, setCancellingEntryKey] = useState(null);
    const getProfilePicture = (user) => {
        if (user?.profile?.profile_picture_path) {
            return `/storage/${user.profile.profile_picture_path}`;
        }
        if (!user?.name) return 'https://ui-avatars.com/api/?name=User&background=random';
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`;
    };

    const normalizeStatus = (status, isExpired) => {
        if (isExpired) return 'expired';
        if (status === 'cancelled') return 'cancelled';
        if (status === 'interested' || status === 'accepted') return 'accepted';
        if (status === 'not_interested' || status === 'rejected') return 'rejected';
        return 'pending';
    };

    const getStatusMeta = (status, isExpired) => {
        const normalized = normalizeStatus(status, isExpired);
        if (normalized === 'accepted') {
            return { label: 'Acceptée', variant: 'default', className: 'bg-emerald-50 text-emerald-700 border border-emerald-100' };
        }
        if (normalized === 'rejected') {
            return { label: 'Refusée', variant: 'destructive', className: 'bg-rose-50 text-rose-700 border border-rose-100' };
        }
        if (normalized === 'expired') {
            return { label: 'Expirée', variant: 'secondary', className: 'bg-amber-50 text-amber-700 border border-amber-100' };
        }
        if (normalized === 'cancelled') {
            return { label: 'Annulée', variant: 'secondary', className: 'bg-slate-100 text-slate-700 border border-slate-200' };
        }
        return { label: 'En attente', variant: 'outline', className: 'bg-slate-50 text-slate-600 border border-slate-200' };
    };

    const handleRespond = async (propositionId, status) => {
        const message = (responseMessages[propositionId] || '').trim();
        if (status === 'rejected' && !message) {
            setResponseErrors((prev) => ({ ...prev, [propositionId]: 'Veuillez saisir un motif de rejet.' }));
            return false;
        }

        setProcessingIds((prev) => ({ ...prev, [propositionId]: true }));
        setResponseErrors((prev) => ({ ...prev, [propositionId]: '' }));
        setResponseSuccesses((prev) => ({ ...prev, [propositionId]: '' }));
        try {
            await axios.post(`/propositions/${propositionId}/respond`, {
                status,
                response_message: message || null,
            });

            const mappedStatus = status === 'accepted' ? 'interested' : 'not_interested';
            setPropositions((prev) =>
                prev.map((item) =>
                    item.id === propositionId
                        ? {
                              ...item,
                              status: mappedStatus,
                              response_message: message || null,
                              responded_at: new Date().toISOString(),
                          }
                        : item,
                ),
            );
            setResponseSuccesses((prev) => ({ ...prev, [propositionId]: propositionToastFr.respondUpdateSuccess }));
            showToast(propositionToastFr.respondUpdateSuccess, undefined, 'success');
            return true;
        } catch (error) {
            const status = error?.response?.status;
            if (status === 403) {
                showToast(propositionToastFr.respondUpdateUnauthorized, undefined, 'error');
                setResponseErrors((prev) => ({ ...prev, [propositionId]: propositionToastFr.respondUpdateUnauthorized }));
            } else {
                showToast(propositionToastFr.respondUpdateError, undefined, 'error');
                setResponseErrors((prev) => ({ ...prev, [propositionId]: propositionToastFr.respondUpdateError }));
            }
            return false;
        } finally {
            setProcessingIds((prev) => ({ ...prev, [propositionId]: false }));
        }
    };

    const groupedPropositions = useMemo(() => {
        const map = new Map();

        propositions.forEach((proposition) => {
            const key = `${proposition.reference_user_id}-${proposition.compatible_user_id}-${proposition.message}`;
            if (!map.has(key)) {
                map.set(key, {
                    key,
                    reference_user: proposition.reference_user,
                    compatible_user: proposition.compatible_user,
                    message: proposition.message,
                    created_at: proposition.created_at,
                    recipients: {},
                });
            }
            const entry = map.get(key);
            entry.recipients[proposition.recipient_user_id] = proposition;

            if (new Date(proposition.created_at) < new Date(entry.created_at)) {
                entry.created_at = proposition.created_at;
            }
        });

        return Array.from(map.values());
    }, [propositions]);

    const getAggregateStatus = (entry) => {
        const recipientEntries = Object.values(entry.recipients);
        const normalizedStatuses = recipientEntries.map((item) => normalizeStatus(item.status, item.is_expired));

        if (normalizedStatuses.includes('cancelled')) {
            return 'cancelled';
        }
        if (normalizedStatuses.includes('expired')) {
            return 'expired';
        }
        if (normalizedStatuses.includes('rejected')) {
            return 'rejected';
        }
        if (normalizedStatuses.length === 2 && normalizedStatuses.every((s) => s === 'accepted')) {
            return 'accepted';
        }
        return 'pending';
    };

    const getCancellablePropositions = (entry) => Object.values(entry.recipients || {}).filter((p) => p && p.can_cancel);

    const handleConfirmCancel = async () => {
        if (!cancelEntry) return;
        const toCancel = getCancellablePropositions(cancelEntry);
        if (toCancel.length === 0) return;

        const entryKey = cancelEntry.key;
        setCancellingEntryKey(entryKey);
        try {
            const first = toCancel[0];
            const { data } = await axios.patch(`/staff/propositions/${first.id}/cancel`);
            const cancelledIds = new Set(
                Array.isArray(data?.cancelled_proposition_ids) && data.cancelled_proposition_ids.length > 0
                    ? data.cancelled_proposition_ids
                    : [first.id],
            );
            showToast(
                data?.pair_was_cancelled ? propositionToastFr.cancelSuccessPaired : propositionToastFr.cancelSuccess,
                undefined,
                'success',
            );
            setPropositions((prev) =>
                prev.map((item) =>
                    cancelledIds.has(item.id)
                        ? {
                              ...item,
                              status: 'cancelled',
                              is_active: false,
                              can_cancel: false,
                              cancelled_at: new Date().toISOString(),
                          }
                        : item,
                ),
            );
            setIsCancelDialogOpen(false);
            setCancelEntry(null);
        } catch (error) {
            const status = error?.response?.status;
            const backendMsg = error?.response?.data?.message;
            if (status === 403) {
                showToast(propositionToastFr.cancelUnauthorized, undefined, 'error');
            } else if (status === 422 && backendMsg === propositionToastFr.cancelInvalidState) {
                showToast(propositionToastFr.cancelInvalidState, undefined, 'warning');
            } else {
                showToast(propositionToastFr.cancelError, undefined, 'error');
            }
        } finally {
            setCancellingEntryKey(null);
        }
    };

    const getOtherRecipientId = (entry) => {
        const refId = entry.reference_user?.id;
        const compId = entry.compatible_user?.id;
        if (!refId || !compId) return null;

        const hasRef = !!entry.recipients[refId];
        const hasComp = !!entry.recipients[compId];
        if (hasRef && hasComp) return null;
        return hasRef ? compId : refId;
    };

    const canSendToOther = (entry) => {
        const refId = entry.reference_user?.id;
        const compId = entry.compatible_user?.id;
        if (!refId || !compId) return false;
        const hasRef = !!entry.recipients[refId];
        const hasComp = !!entry.recipients[compId];
        if (hasRef === hasComp) return false;
        const currentRecipient = hasRef ? entry.recipients[refId] : entry.recipients[compId];
        return normalizeStatus(currentRecipient?.status, currentRecipient?.is_expired) === 'accepted';
    };

    const handleSendToOther = async (entry) => {
        const recipientId = getOtherRecipientId(entry);
        if (!recipientId) return;

        const requestKey = entry.key;
        setIsSending((prev) => ({ ...prev, [requestKey]: true }));
        setErrorByKey((prev) => ({ ...prev, [requestKey]: '' }));
        try {
            const response = await axios.post('/staff/propositions/send-to-other', {
                reference_user_id: entry.reference_user?.id,
                compatible_user_id: entry.compatible_user?.id,
                recipient_user_id: recipientId,
                message: entry.message,
            });

            const newItem = {
                id: response?.data?.id || `${requestKey}-${recipientId}`,
                reference_user_id: entry.reference_user?.id,
                compatible_user_id: entry.compatible_user?.id,
                recipient_user_id: recipientId,
                reference_user: entry.reference_user,
                compatible_user: entry.compatible_user,
                recipient_user: recipientId === entry.reference_user?.id ? entry.reference_user : entry.compatible_user,
                message: entry.message,
                status: 'pending',
                response_message: null,
                user_comment: null,
                created_at: new Date().toISOString(),
            };

            setPropositions((prev) => [newItem, ...prev]);
            showToast(propositionToastFr.sendSuccess, undefined, 'success');
        } catch (error) {
            const status = error?.response?.status;
            const backendMsg = error?.response?.data?.message;
            if (status === 422 && backendMsg === propositionToastFr.sendBlockedActive) {
                showToast(propositionToastFr.sendBlockedActive, undefined, 'warning');
                setErrorByKey((prev) => ({ ...prev, [requestKey]: propositionToastFr.sendBlockedActive }));
            } else {
                showToast(propositionToastFr.sendError, undefined, 'error');
                setErrorByKey((prev) => ({ ...prev, [requestKey]: propositionToastFr.sendError }));
            }
        } finally {
            setIsSending((prev) => ({ ...prev, [requestKey]: false }));
        }
    };

    return (
        <AppLayout>
            <Head title={t('navigation.propositionsList')} />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="text-2xl font-semibold text-rose-900">
                            {t('navigation.propositionsList', { defaultValue: 'Liste des propositions' })}
                        </div>
                        <p className="text-muted-foreground text-sm">Gérez les mises en relation et les retours des candidats.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* <Button variant="outline" size="sm" className="gap-2">
                            Filtrer
                        </Button> */}
                        <Button size="sm" className="bg-rose-800 text-white hover:bg-rose-900" onClick={() => router.visit('/staff/match/search')}>
                            <Plus className="h-4 w-4" />
                            Nouvelle proposition
                        </Button>
                    </div>
                </div>
                {groupedPropositions.length === 0 ? (
                    <div className="border-sidebar-border/70 dark:border-sidebar-border rounded-xl border p-6 text-sm text-neutral-700 dark:text-neutral-200">
                        Aucune proposition envoyee pour le moment.
                    </div>
                ) : (
                    <Card className="border border-rose-100/60 shadow-sm">
                        <CardContent className="p-0">
                            <div className="hidden grid-cols-[minmax(200px,1.1fr)_minmax(200px,1.1fr)_minmax(180px,1.4fr)_minmax(200px,1.1fr)_minmax(140px,0.75fr)_minmax(240px,1.5fr)_minmax(100px,0.55fr)] gap-4 border-b bg-rose-50/60 px-5 py-3 text-xs font-semibold tracking-wide text-rose-900 uppercase lg:grid">
                                <div>Profil de référence</div>
                                <div>Profil compatible</div>
                                <div>Message</div>
                                <div>Statuts globaux</div>
                                <div>Annulation</div>
                                <div>Actions & réponses</div>
                                <div>Date d'envoi</div>
                            </div>
                            <div className="divide-y">
                                {groupedPropositions.map((entry) => {
                                    const refUser = entry.reference_user;
                                    const compUser = entry.compatible_user;
                                    const refRecipient = entry.recipients[refUser?.id];
                                    const compRecipient = entry.recipients[compUser?.id];
                                    const refStatusMeta = refRecipient
                                        ? getStatusMeta(refRecipient?.status, refRecipient?.is_expired)
                                        : {
                                              label: 'Non envoyée',
                                              variant: 'outline',
                                              className: 'bg-slate-50 text-slate-600 border border-slate-200',
                                          };
                                    const compStatusMeta = compRecipient
                                        ? getStatusMeta(compRecipient?.status, compRecipient?.is_expired)
                                        : {
                                              label: 'Non envoyée',
                                              variant: 'outline',
                                              className: 'bg-slate-50 text-slate-600 border border-slate-200',
                                          };
                                    const aggregateMeta = getStatusMeta(getAggregateStatus(entry));
                                    const refResponse = refRecipient?.response_message || refRecipient?.user_comment;
                                    const compResponse = compRecipient?.response_message || compRecipient?.user_comment;
                                    const showSendToOther = canSendToOther(entry);
                                    const rowError = errorByKey[entry.key];
                                    const refCanRespond =
                                        refRecipient &&
                                        !refRecipient?.is_expired &&
                                        refRecipient?.status !== 'cancelled' &&
                                        Boolean(refRecipient?.can_update_response);
                                    const compCanRespond =
                                        compRecipient &&
                                        !compRecipient?.is_expired &&
                                        compRecipient?.status !== 'cancelled' &&
                                        Boolean(compRecipient?.can_update_response);
                                    const refProcessing = refRecipient ? processingIds[refRecipient.id] : false;
                                    const compProcessing = compRecipient ? processingIds[compRecipient.id] : false;
                                    const refError = refRecipient ? responseErrors[refRecipient.id] : '';
                                    const compError = compRecipient ? responseErrors[compRecipient.id] : '';
                                    const refSuccess = refRecipient ? responseSuccesses[refRecipient.id] : '';
                                    const compSuccess = compRecipient ? responseSuccesses[compRecipient.id] : '';
                                    const refRespondDisabled = !refCanRespond || refProcessing;
                                    const compRespondDisabled = !compCanRespond || compProcessing;
                                    const refIsAnswered = refRecipient
                                        ? ['accepted', 'rejected', 'cancelled'].includes(
                                              normalizeStatus(refRecipient?.status, refRecipient?.is_expired),
                                          )
                                        : false;
                                    const compIsAnswered = compRecipient
                                        ? ['accepted', 'rejected', 'cancelled'].includes(
                                              normalizeStatus(compRecipient?.status, compRecipient?.is_expired),
                                          )
                                        : false;

                                    const cancellablePropositions = getCancellablePropositions(entry);
                                    const canShowGroupCancel = cancellablePropositions.length > 0;

                                    return (
                                        <div
                                            key={entry.key}
                                            className="grid grid-cols-1 gap-4 px-5 py-4 lg:grid-cols-[minmax(200px,1.1fr)_minmax(200px,1.1fr)_minmax(180px,1.4fr)_minmax(200px,1.1fr)_minmax(140px,0.75fr)_minmax(240px,1.5fr)_minmax(100px,0.55fr)]"
                                        >
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <img
                                                        src={getProfilePicture(refUser)}
                                                        alt={refUser?.name}
                                                        className="h-10 w-10 rounded-full object-cover"
                                                    />
                                                    <div>
                                                        <div className="text-sm font-semibold text-slate-900">{refUser?.name || '-'}</div>
                                                        <div className="text-muted-foreground text-xs">@{refUser?.username}</div>
                                                    </div>
                                                </div>
                                                {refUser?.username && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="mt-3 h-8 border-rose-200 text-rose-700 hover:bg-rose-50"
                                                        onClick={() => window.open(`/profile/${refUser.username}`, '_blank', 'noopener,noreferrer')}
                                                    >
                                                        Voir profil
                                                    </Button>
                                                )}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <img
                                                        src={getProfilePicture(compUser)}
                                                        alt={compUser?.name}
                                                        className="h-10 w-10 rounded-full object-cover"
                                                    />
                                                    <div>
                                                        <div className="text-sm font-semibold text-slate-900">{compUser?.name || '-'}</div>
                                                        <div className="text-muted-foreground text-xs">@{compUser?.username}</div>
                                                    </div>
                                                </div>
                                                {compUser?.username && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="mt-3 h-8 border-rose-200 text-rose-700 hover:bg-rose-50"
                                                        onClick={() => window.open(`/profile/${compUser.username}`, '_blank', 'noopener,noreferrer')}
                                                    >
                                                        Voir profil
                                                    </Button>
                                                )}
                                            </div>
                                            <div className="text-muted-foreground text-sm">
                                                {entry.message ? (
                                                    <span className="italic">"{entry.message}"</span>
                                                ) : (
                                                    <span className="text-muted-foreground text-xs">-</span>
                                                )}
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <Badge variant={refStatusMeta.variant} className={refStatusMeta.className}>
                                                        Réf: {refStatusMeta.label}
                                                    </Badge>
                                                    <Badge variant={compStatusMeta.variant} className={compStatusMeta.className}>
                                                        Comp: {compStatusMeta.label}
                                                    </Badge>
                                                </div>
                                                <Badge variant={aggregateMeta.variant} className={aggregateMeta.className}>
                                                    Global: {aggregateMeta.label}
                                                </Badge>
                                            </div>
                                            <div className="flex flex-col justify-center lg:min-h-[4rem]">
                                                {canShowGroupCancel ? (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-9 w-full border-rose-200 text-rose-800 hover:bg-rose-50"
                                                        disabled={cancellingEntryKey === entry.key}
                                                        onClick={() => {
                                                            setCancelEntry(entry);
                                                            setIsCancelDialogOpen(true);
                                                        }}
                                                    >
                                                        {cancellingEntryKey === entry.key
                                                            ? 'Annulation…'
                                                            : cancellablePropositions.length > 1
                                                              ? 'Annuler la proposition'
                                                              : 'Annuler la proposition'}
                                                    </Button>
                                                ) : (
                                                    <span className="text-muted-foreground text-xs">Proposition annulée</span>
                                                )}
                                            </div>
                                            <div className="grid gap-3 lg:grid-cols-2">
                                                <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                                                    <div className="text-[11px] font-semibold text-slate-500 uppercase">Rép. référence</div>
                                                    <Button
                                                        size="sm"
                                                        className="mt-3 h-8 w-full bg-rose-800 text-white hover:bg-rose-900"
                                                        disabled={refRespondDisabled}
                                                        onClick={() => {
                                                            setActiveRecipient(refRecipient || null);
                                                            setActiveRecipientLabel('Référence');
                                                            setIsRespondModalOpen(true);
                                                        }}
                                                    >
                                                        {refIsAnswered ? 'Mettre à jour la réponse' : 'Répondre'}
                                                    </Button>
                                                    {refResponse && (
                                                        <div className="mt-2 text-xs text-slate-600">Dernière réponse: {refResponse}</div>
                                                    )}
                                                    {refSuccess && <div className="mt-2 text-xs text-emerald-700">{refSuccess}</div>}
                                                </div>
                                                <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                                                    <div className="text-[11px] font-semibold text-slate-500 uppercase">Rép. compatible</div>
                                                    <Button
                                                        size="sm"
                                                        className="mt-3 h-8 w-full bg-rose-800 text-white hover:bg-rose-900"
                                                        disabled={compRespondDisabled}
                                                        onClick={() => {
                                                            setActiveRecipient(compRecipient || null);
                                                            setActiveRecipientLabel('Compatible');
                                                            setIsRespondModalOpen(true);
                                                        }}
                                                    >
                                                        {compIsAnswered ? 'Mettre à jour la réponse' : 'Répondre'}
                                                    </Button>
                                                    {compResponse && (
                                                        <div className="mt-2 text-xs text-slate-600">Dernière réponse: {compResponse}</div>
                                                    )}
                                                    {compSuccess && <div className="mt-2 text-xs text-emerald-700">{compSuccess}</div>}
                                                </div>
                                                {showSendToOther && (
                                                    <div className="lg:col-span-2">
                                                        <Button
                                                            size="sm"
                                                            className="h-8"
                                                            onClick={() => handleSendToOther(entry)}
                                                            disabled={isSending[entry.key]}
                                                        >
                                                            {isSending[entry.key] ? 'Envoi...' : 'Envoyer au profil restant'}
                                                        </Button>
                                                        {rowError && <div className="mt-2 text-xs text-red-600">{rowError}</div>}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="text-muted-foreground text-xs lg:text-right">
                                                {new Date(entry.created_at).toLocaleDateString()}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
            <Dialog
                open={isRespondModalOpen}
                onOpenChange={(open) => {
                    if (!open) {
                        setIsRespondModalOpen(false);
                        setActiveRecipient(null);
                        setActiveRecipientLabel('');
                    }
                }}
            >
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Répondre à la proposition</DialogTitle>
                        <DialogDescription>{activeRecipientLabel ? `Profil ${activeRecipientLabel.toLowerCase()}` : 'Réponse'}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                        <div className="text-xs font-semibold text-slate-500 uppercase">Motif</div>
                        <div className="text-muted-foreground text-xs">
                            Statut actuel:{' '}
                            {activeRecipient
                                ? normalizeStatus(activeRecipient.status, activeRecipient.is_expired) === 'accepted'
                                    ? 'Acceptée'
                                    : normalizeStatus(activeRecipient.status, activeRecipient.is_expired) === 'rejected'
                                      ? 'Refusée'
                                      : normalizeStatus(activeRecipient.status, activeRecipient.is_expired) === 'expired'
                                        ? 'Expirée'
                                        : 'En attente'
                                : '-'}
                        </div>
                        <textarea
                            value={activeRecipient ? responseMessages[activeRecipient.id] || '' : ''}
                            onChange={(event) => {
                                const value = event.target.value;
                                if (!activeRecipient) return;
                                setResponseMessages((prev) => ({
                                    ...prev,
                                    [activeRecipient.id]: value,
                                }));
                            }}
                            placeholder="Motif (obligatoire en cas de refus)"
                            rows={3}
                            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                            disabled={!activeRecipient || processingIds[activeRecipient.id]}
                        />
                        {activeRecipient && responseErrors[activeRecipient.id] && (
                            <div className="text-xs text-red-600">{responseErrors[activeRecipient.id]}</div>
                        )}
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setIsRespondModalOpen(false)}>
                            Annuler
                        </Button>
                        <Button
                            variant="outline"
                            className="border-rose-200 text-rose-700 hover:bg-rose-50"
                            disabled={!activeRecipient || processingIds[activeRecipient.id]}
                            onClick={async () => {
                                if (!activeRecipient) return;
                                const ok = await handleRespond(activeRecipient.id, 'rejected');
                                if (ok) setIsRespondModalOpen(false);
                            }}
                        >
                            Refuser
                        </Button>
                        <Button
                            className="bg-rose-800 text-white hover:bg-rose-900"
                            disabled={!activeRecipient || processingIds[activeRecipient.id]}
                            onClick={async () => {
                                if (!activeRecipient) return;
                                const ok = await handleRespond(activeRecipient.id, 'accepted');
                                if (ok) setIsRespondModalOpen(false);
                            }}
                        >
                            Accepter
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={isCancelDialogOpen}
                onOpenChange={(open) => {
                    setIsCancelDialogOpen(open);
                    if (!open) setCancelEntry(null);
                }}
            >
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Annuler la proposition</DialogTitle>
                        <DialogDescription>
                            {cancelEntry && getCancellablePropositions(cancelEntry).length > 1
                                ? 'Êtes-vous sûr de vouloir annuler cette proposition pour les deux profils (référence et compatible) ? Vous pourrez ensuite en envoyer une nouvelle.'
                                : 'Êtes-vous sûr de vouloir annuler cette proposition ? Cela permettra d’en envoyer une nouvelle vers ce profil.'}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setIsCancelDialogOpen(false)}>
                            Retour
                        </Button>
                        <Button
                            className="bg-rose-800 text-white hover:bg-rose-900"
                            disabled={!cancelEntry || cancellingEntryKey === cancelEntry.key}
                            onClick={handleConfirmCancel}
                        >
                            {cancelEntry && cancellingEntryKey === cancelEntry.key ? 'Annulation…' : 'Confirmer l’annulation'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
