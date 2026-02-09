import { Head, usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import axios from 'axios';

export default function PropositionsList() {
    const { t } = useTranslation();
    const { propositions: initialPropositions = [], auth } = usePage().props;
    const [propositions, setPropositions] = useState(initialPropositions);
    const [isSending, setIsSending] = useState({});
    const [errorByKey, setErrorByKey] = useState({});
    const [responseMessages, setResponseMessages] = useState({});
    const [processingIds, setProcessingIds] = useState({});
    const [responseErrors, setResponseErrors] = useState({});
    const currentUserId = auth?.user?.id;

    const getProfilePicture = (user) => {
        if (user?.profile?.profile_picture_path) {
            return `/storage/${user.profile.profile_picture_path}`;
        }
        if (!user?.name) return 'https://ui-avatars.com/api/?name=User&background=random';
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`;
    };

    const normalizeStatus = (status, isExpired) => {
        if (isExpired) return 'expired';
        if (status === 'interested' || status === 'accepted') return 'accepted';
        if (status === 'not_interested' || status === 'rejected') return 'rejected';
        return 'pending';
    };

    const getStatusMeta = (status, isExpired) => {
        const normalized = normalizeStatus(status, isExpired);
        if (normalized === 'accepted') {
            return { label: 'Acceptée', variant: 'default' };
        }
        if (normalized === 'rejected') {
            return { label: 'Refusée', variant: 'destructive' };
        }
        if (normalized === 'expired') {
            return { label: 'Expirée', variant: 'secondary' };
        }
        return { label: 'En attente de réponse', variant: 'outline' };
    };

    const canRespondAsMatchmaker = (proposition) => {
        const recipientMatchmakerId = proposition?.recipient_user?.assigned_matchmaker_id;
        return Boolean(currentUserId && recipientMatchmakerId && recipientMatchmakerId === currentUserId);
    };

    const handleRespond = async (propositionId, status) => {
        const message = (responseMessages[propositionId] || '').trim();
        if (status === 'rejected' && !message) {
            setResponseErrors((prev) => ({ ...prev, [propositionId]: 'Veuillez saisir un motif de rejet.' }));
            return;
        }

        setProcessingIds((prev) => ({ ...prev, [propositionId]: true }));
        setResponseErrors((prev) => ({ ...prev, [propositionId]: '' }));
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
        } catch (error) {
            const messageText = error?.response?.data?.message || 'Une erreur est survenue.';
            setResponseErrors((prev) => ({ ...prev, [propositionId]: messageText }));
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
        } catch (error) {
            const message = error?.response?.data?.message || 'Une erreur est survenue.';
            setErrorByKey((prev) => ({ ...prev, [requestKey]: message }));
        } finally {
            setIsSending((prev) => ({ ...prev, [requestKey]: false }));
        }
    };

    return (
        <AppLayout>
            <Head title={t('navigation.propositionsList')} />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="text-lg font-semibold">{t('navigation.propositionsList')}</div>
                {groupedPropositions.length === 0 ? (
                    <div className="rounded-xl border border-sidebar-border/70 dark:border-sidebar-border p-6 text-sm text-neutral-700 dark:text-neutral-200">
                        Aucune proposition envoyee pour le moment.
                    </div>
                ) : (
                <Card>
                    <CardHeader>
                        <CardTitle>{t('navigation.propositionsList')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Profil de référence</TableHead>
                                        <TableHead>Profil compatible</TableHead>
                                        <TableHead>Message</TableHead>
                                        <TableHead>Statut référence</TableHead>
                                        <TableHead>Statut compatible</TableHead>
                                        <TableHead>Statut global</TableHead>
                                        <TableHead>Réponse référence</TableHead>
                                        <TableHead>Réponse compatible</TableHead>
                                        <TableHead>Envoyée le</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {groupedPropositions.map((entry) => {
                                        const refUser = entry.reference_user;
                                        const compUser = entry.compatible_user;
                                        const refRecipient = entry.recipients[refUser?.id];
                                        const compRecipient = entry.recipients[compUser?.id];
                                        const refStatusMeta = refRecipient
                                            ? getStatusMeta(refRecipient?.status, refRecipient?.is_expired)
                                            : { label: 'Non envoyée', variant: 'outline' };
                                        const compStatusMeta = compRecipient
                                            ? getStatusMeta(compRecipient?.status, compRecipient?.is_expired)
                                            : { label: 'Non envoyée', variant: 'outline' };
                                        const aggregateMeta = getStatusMeta(getAggregateStatus(entry));
                                        const refResponse = refRecipient?.response_message || refRecipient?.user_comment;
                                        const compResponse = compRecipient?.response_message || compRecipient?.user_comment;
                                        const showSendToOther = canSendToOther(entry);
                                        const rowError = errorByKey[entry.key];
                                        const refCanRespond = refRecipient
                                            && normalizeStatus(refRecipient?.status, refRecipient?.is_expired) === 'pending'
                                            && !refRecipient?.is_expired
                                            && canRespondAsMatchmaker(refRecipient);
                                        const compCanRespond = compRecipient
                                            && normalizeStatus(compRecipient?.status, compRecipient?.is_expired) === 'pending'
                                            && !compRecipient?.is_expired
                                            && canRespondAsMatchmaker(compRecipient);
                                        const refProcessing = refRecipient ? processingIds[refRecipient.id] : false;
                                        const compProcessing = compRecipient ? processingIds[compRecipient.id] : false;
                                        const refError = refRecipient ? responseErrors[refRecipient.id] : '';
                                        const compError = compRecipient ? responseErrors[compRecipient.id] : '';

                                        return (
                                            <TableRow key={entry.key}>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <img
                                                            src={getProfilePicture(refUser)}
                                                            alt={refUser?.name}
                                                            className="h-8 w-8 rounded-full object-cover"
                                                        />
                                                        <div>
                                                            <div className="text-sm font-medium">
                                                                {refUser?.name || '-'}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">
                                                                @{refUser?.username}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {refUser?.username && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="mt-2"
                                                            onClick={() =>
                                                                window.open(
                                                                    `/profile/${refUser.username}`,
                                                                    '_blank',
                                                                    'noopener,noreferrer'
                                                                )
                                                            }
                                                        >
                                                            Voir profil
                                                        </Button>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <img
                                                            src={getProfilePicture(compUser)}
                                                            alt={compUser?.name}
                                                            className="h-8 w-8 rounded-full object-cover"
                                                        />
                                                        <div>
                                                            <div className="text-sm font-medium">
                                                                {compUser?.name || '-'}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">
                                                                @{compUser?.username}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {compUser?.username && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="mt-2"
                                                            onClick={() =>
                                                                window.open(
                                                                    `/profile/${compUser.username}`,
                                                                    '_blank',
                                                                    'noopener,noreferrer'
                                                                )
                                                            }
                                                        >
                                                            Voir profil
                                                        </Button>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-sm text-muted-foreground">
                                                        {entry.message}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={refStatusMeta.variant}>{refStatusMeta.label}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={compStatusMeta.variant}>{compStatusMeta.label}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={aggregateMeta.variant}>{aggregateMeta.label}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {refResponse ? (
                                                        <div className="text-sm text-muted-foreground">{refResponse}</div>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">-</span>
                                                    )}
                                                    {refCanRespond && (
                                                        <div className="mt-2 space-y-2">
                                                            <textarea
                                                                value={responseMessages[refRecipient.id] || ''}
                                                                onChange={(event) =>
                                                                    setResponseMessages((prev) => ({
                                                                        ...prev,
                                                                        [refRecipient.id]: event.target.value,
                                                                    }))
                                                                }
                                                                placeholder="Motif (obligatoire en cas de refus)"
                                                                rows={2}
                                                                className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs"
                                                                disabled={refProcessing}
                                                            />
                                                            {refError && <div className="text-xs text-red-600">{refError}</div>}
                                                            <div className="flex flex-wrap gap-2">
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    disabled={refProcessing}
                                                                    onClick={() => handleRespond(refRecipient.id, 'accepted')}
                                                                >
                                                                    Accepter
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="destructive"
                                                                    disabled={refProcessing}
                                                                    onClick={() => handleRespond(refRecipient.id, 'rejected')}
                                                                >
                                                                    Refuser
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {compResponse ? (
                                                        <div className="text-sm text-muted-foreground">{compResponse}</div>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">-</span>
                                                    )}
                                                    {compCanRespond && (
                                                        <div className="mt-2 space-y-2">
                                                            <textarea
                                                                value={responseMessages[compRecipient.id] || ''}
                                                                onChange={(event) =>
                                                                    setResponseMessages((prev) => ({
                                                                        ...prev,
                                                                        [compRecipient.id]: event.target.value,
                                                                    }))
                                                                }
                                                                placeholder="Motif (obligatoire en cas de refus)"
                                                                rows={2}
                                                                className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs"
                                                                disabled={compProcessing}
                                                            />
                                                            {compError && <div className="text-xs text-red-600">{compError}</div>}
                                                            <div className="flex flex-wrap gap-2">
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    disabled={compProcessing}
                                                                    onClick={() => handleRespond(compRecipient.id, 'accepted')}
                                                                >
                                                                    Accepter
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="destructive"
                                                                    disabled={compProcessing}
                                                                    onClick={() => handleRespond(compRecipient.id, 'rejected')}
                                                                >
                                                                    Refuser
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-xs text-muted-foreground">
                                                        {new Date(entry.created_at).toLocaleDateString()}
                                                    </span>
                                                    {showSendToOther && (
                                                        <div className="mt-3">
                                                            <Button
                                                                size="sm"
                                                                onClick={() => handleSendToOther(entry)}
                                                                disabled={isSending[entry.key]}
                                                            >
                                                                {isSending[entry.key] ? 'Envoi...' : 'Envoyer au profil restant'}
                                                            </Button>
                                                            {rowError && (
                                                                <div className="mt-2 text-xs text-red-600">
                                                                    {rowError}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                    </CardContent>
                </Card>
                )}
            </div>
        </AppLayout>
    );
}



