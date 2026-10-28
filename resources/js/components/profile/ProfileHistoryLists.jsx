import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Link } from '@inertiajs/react';
import axios from 'axios';
import { AlertTriangle, Calendar, ExternalLink, Heart, Loader2, Lock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const PROPOSITION_TONES = {
    pending: 'bg-[#fff3d6] text-[#7f4d00]',
    interested: 'bg-[#e6f5eb] text-[#1d7440]',
    accepted: 'bg-[#e6f5eb] text-[#1d7440]',
    not_interested: 'bg-[#fdf0ef] text-[#a3201a]',
    cancelled: 'bg-[#eceef2] text-[#363b47]',
    expired: 'bg-[#eceef2] text-[#363b47]',
    closed: 'bg-[#fdf2f2] text-[#890505]',
};

const RDV_TONES = {
    en_cours: 'bg-[#fdf2f2] text-[#890505]',
    reussi: 'bg-[#890505] text-white',
    echec: 'bg-[#fdf0ef] text-[#a3201a]',
};

function formatDate(value) {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('fr-FR');
}

/** Loads a JSON list once when the tab is shown. */
function useHistory(url, key) {
    const [state, setState] = useState({ loading: true, error: false, items: [] });

    useEffect(() => {
        let cancelled = false;
        setState({ loading: true, error: false, items: [] });
        axios
            .get(url)
            .then(({ data }) => !cancelled && setState({ loading: false, error: false, items: data[key] || [] }))
            .catch(() => !cancelled && setState({ loading: false, error: true, items: [] }));
        return () => {
            cancelled = true;
        };
    }, [url, key]);

    return state;
}

function Person({ person }) {
    if (!person) return null;
    return (
        <div className="flex min-w-0 items-center gap-3">
            {person.photo ? (
                <img src={person.photo} alt="" className="h-10 w-10 flex-none rounded-full object-cover" />
            ) : (
                <span aria-hidden className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-[#f6e3e1] text-sm font-black text-[#7a1712]">
                    {person.name?.charAt(0)}
                </span>
            )}
            <div className="min-w-0">
                {person.username ? (
                    <Link href={`/profile/${person.username}`} className="font-semibold text-[#890505] underline-offset-2 hover:underline">
                        {person.name}
                    </Link>
                ) : (
                    <span className="font-semibold">{person.name}</span>
                )}
            </div>
        </div>
    );
}

function HistoryShell({ icon: Icon, title, state, emptyText, columns, t, children }) {
    return (
        <Card className="border-gray-200 bg-white">
            <CardContent className="p-6">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
                    <Icon className="h-5 w-5 text-red-600" aria-hidden />
                    {title}
                </h3>
                {state.loading ? (
                    <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        {t('profile.historyLoading')}
                    </p>
                ) : state.error ? (
                    <p role="alert" className="flex items-center gap-2 text-sm font-semibold text-red-700">
                        <AlertTriangle className="h-4 w-4" aria-hidden />
                        {t('profile.historyLoadError')}
                    </p>
                ) : state.items.length === 0 ? (
                    <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">{emptyText}</p>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {columns.map((column) => (
                                    <TableHead key={column} className="text-start">
                                        {column}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>{children}</TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}

function DetailsLink({ url, reservedKey, t }) {
    return url ? (
        <Link href={url} className="inline-flex items-center gap-1 text-sm font-semibold text-[#890505] hover:underline">
            <ExternalLink className="h-4 w-4" aria-hidden />
            {t('profile.historyViewDetails')}
        </Link>
    ) : (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500">
            <Lock className="h-3.5 w-3.5" aria-hidden />
            {t(reservedKey)}
        </span>
    );
}

export function ProfilePropositionsHistory({ userId, profileName }) {
    const { t } = useTranslation();
    const state = useHistory(`/staff/users/${userId}/propositions-history`, 'propositions');

    const answerText = (answer) => {
        if (!answer?.responded_at) return t('profile.historyAnswerWaiting');
        return answer.user_response === 'not_interested' ? t('profile.historyAnswerNotInterested') : t('profile.historyAnswerInterested');
    };

    return (
        <HistoryShell
            icon={Heart}
            title={t('profile.historyPropositionsTitle')}
            state={state}
            emptyText={t('profile.historyNoPropositions')}
            columns={[
                t('profile.historyColProfile'),
                t('profile.historyColDate'),
                t('profile.historyColCreatedBy'),
                t('profile.historyColAnswers'),
                t('profile.historyColStatus'),
                t('profile.historyColDetails'),
            ]}
            t={t}
        >
            {state.items.map((item) => (
                <TableRow key={item.id}>
                    <TableCell>
                        <Person person={item.counterpart} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(item.created_at)}</TableCell>
                    <TableCell>{item.created_by_me ? t('profile.historyYou') : item.creator?.name || '—'}</TableCell>
                    <TableCell className="text-xs">
                        <div>
                            <span className="text-muted-foreground">{profileName} :</span> {answerText(item.profile_answer)}
                        </div>
                        {item.counterpart && (
                            <div>
                                <span className="text-muted-foreground">{item.counterpart.name} :</span> {answerText(item.counterpart_answer)}
                            </div>
                        )}
                    </TableCell>
                    <TableCell>
                        <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${PROPOSITION_TONES[item.status] || PROPOSITION_TONES.cancelled}`}>
                            {t(`profile.historyPropStatus_${item.status}`, { defaultValue: item.status })}
                        </span>
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                        <DetailsLink url={item.url} reservedKey="profile.historyPropositionReserved" t={t} />
                    </TableCell>
                </TableRow>
            ))}
        </HistoryShell>
    );
}

export function ProfileRdvsHistory({ userId }) {
    const { t } = useTranslation();
    const state = useHistory(`/staff/users/${userId}/rdvs-history`, 'rdvs');

    return (
        <HistoryShell
            icon={Calendar}
            title={t('profile.historyRdvsTitle')}
            state={state}
            emptyText={t('profile.historyNoRdvs')}
            columns={[
                t('profile.historyColProfile'),
                t('profile.historyColDate'),
                t('profile.historyColOrganisedBy'),
                t('profile.historyColFeedback'),
                t('profile.historyColStatus'),
                t('profile.historyColDetails'),
            ]}
            t={t}
        >
            {state.items.map((item) => (
                <TableRow key={item.id}>
                    <TableCell>
                        <Person person={item.counterpart} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(item.created_at)}</TableCell>
                    <TableCell>{item.created_by_me ? t('profile.historyYou') : item.creator?.name || '—'}</TableCell>
                    <TableCell className="text-xs">
                        {item.has_feedback ? t('profile.historyFeedbackGiven') : t('profile.historyFeedbackMissing')}
                    </TableCell>
                    <TableCell>
                        <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${RDV_TONES[item.status] || RDV_TONES.en_cours}`}>
                            {t(`profile.historyRdvStatus_${item.status}`, { defaultValue: item.status })}
                        </span>
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                        <DetailsLink url={item.url} reservedKey="profile.historyRdvReserved" t={t} />
                    </TableCell>
                </TableRow>
            ))}
        </HistoryShell>
    );
}
