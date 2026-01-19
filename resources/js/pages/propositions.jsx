import AppLayout from '@/layouts/app-layout';
import { Head, usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';

export default function PropositionsPage() {
    const { t } = useTranslation();
    const { propositions: initialPropositions = [], auth } = usePage().props;
    const [propositions, setPropositions] = useState(initialPropositions);
    const [responseMessages, setResponseMessages] = useState({});
    const [processingIds, setProcessingIds] = useState({});
    const [errors, setErrors] = useState({});

    const currentUserId = auth?.user?.id;

    const getOtherUser = (proposition) => {
        if (proposition.reference_user?.id === currentUserId) {
            return proposition.compatible_user;
        }
        return proposition.reference_user;
    };

    const getProfilePicture = (user) => {
        if (user?.profile?.profile_picture_path) {
            return `/storage/${user.profile.profile_picture_path}`;
        }
        if (!user?.name) return 'https://ui-avatars.com/api/?name=User&background=random';
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`;
    };

    const sortedPropositions = useMemo(() => {
        return [...propositions].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }, [propositions]);

    const handleRespond = async (propositionId, status) => {
        const message = (responseMessages[propositionId] || '').trim();
        if (status === 'rejected' && !message) {
            setErrors((prev) => ({ ...prev, [propositionId]: 'Veuillez saisir un motif de rejet.' }));
            return;
        }

        setProcessingIds((prev) => ({ ...prev, [propositionId]: true }));
        setErrors((prev) => ({ ...prev, [propositionId]: '' }));
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
                        : item
                )
            );
        } catch (error) {
            const messageText = error?.response?.data?.message || 'Une erreur est survenue.';
            setErrors((prev) => ({ ...prev, [propositionId]: messageText }));
        } finally {
            setProcessingIds((prev) => ({ ...prev, [propositionId]: false }));
        }
    };

    return (
        <AppLayout breadcrumbs={[{ title: t('breadcrumbs.propositions'), href: '/propositions' }]}> 
            <Head title={t('breadcrumbs.propositions')} />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="text-lg font-semibold">{t('pages.propositions.title', { defaultValue: 'Propositions' })}</div>
                {sortedPropositions.length === 0 ? (
                <div className="rounded-xl border border-sidebar-border/70 dark:border-sidebar-border p-6 text-sm text-neutral-700 dark:text-neutral-200">
                        {t('pages.propositions.content', { defaultValue: 'Aucune proposition pour le moment.' })}
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {sortedPropositions.map((proposition) => {
                            const otherUser = getOtherUser(proposition);
                            const status = proposition.status;
                            const normalizedStatus =
                                proposition.is_expired
                                    ? 'expired'
                                    : status === 'interested' || status === 'accepted'
                                    ? 'accepted'
                                    : status === 'not_interested' || status === 'rejected'
                                    ? 'rejected'
                                    : 'pending';
                            const isPending = normalizedStatus === 'pending';
                            const isProcessing = processingIds[proposition.id];

                            return (
                                <Card key={proposition.id}>
                                    <CardHeader className="flex flex-row items-start justify-between gap-4">
                                        <div>
                                            <CardTitle className="text-base">
                                                Proposition de {proposition.matchmaker?.name || 'Matchmaker'}
                                            </CardTitle>
                                            <div className="mt-2 text-sm text-muted-foreground">
                                                Envoyée le {new Date(proposition.created_at).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <Badge
                                            variant={
                                                normalizedStatus === 'accepted'
                                                    ? 'default'
                                                    : normalizedStatus === 'rejected'
                                                    ? 'destructive'
                                                    : normalizedStatus === 'expired'
                                                    ? 'secondary'
                                                    : 'outline'
                                            }
                                        >
                                            {normalizedStatus === 'accepted'
                                                ? 'Acceptée'
                                                : normalizedStatus === 'rejected'
                                                ? 'Refusée'
                                                : normalizedStatus === 'expired'
                                                ? 'Expirée'
                                                : 'En attente'}
                                        </Badge>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-700">
                                            {proposition.message}
                                        </div>

                                        {otherUser && (
                                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                                <div className="flex items-center gap-3">
                                                    <img
                                                        src={getProfilePicture(otherUser)}
                                                        alt={otherUser.name}
                                                        className="h-12 w-12 rounded-full object-cover"
                                                    />
                                                    <div>
                                                        <div className="font-medium">{otherUser.name}</div>
                                                        <div className="text-xs text-muted-foreground">@{otherUser.username}</div>
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="outline"
                                                    onClick={() =>
                                                        window.open(`/profile/${otherUser.username || otherUser.id}`, '_blank', 'noopener,noreferrer')
                                                    }
                                                >
                                                    Visiter le profil compatible
                                                </Button>
                                            </div>
                                        )}

                                        <div className="space-y-3">
                                            <Textarea
                                                value={responseMessages[proposition.id] || ''}
                                                onChange={(event) =>
                                                    setResponseMessages((prev) => ({ ...prev, [proposition.id]: event.target.value }))
                                                }
                                                placeholder="Message pour acceptation ou refus..."
                                                disabled={!isPending || isProcessing}
                                            />
                                            {errors[proposition.id] && (
                                                <div className="text-sm text-red-600">{errors[proposition.id]}</div>
                                            )}
                                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
                                                <div className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id={`accept-${proposition.id}`}
                                                        checked={normalizedStatus === 'accepted'}
                                                        disabled={!isPending || isProcessing}
                                                        onCheckedChange={() => handleRespond(proposition.id, 'accepted')}
                                                    />
                                                    <label htmlFor={`accept-${proposition.id}`} className="text-sm">
                                                        Accepter
                                                    </label>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id={`reject-${proposition.id}`}
                                                        checked={normalizedStatus === 'rejected'}
                                                        disabled={!isPending || isProcessing}
                                                        onCheckedChange={() => handleRespond(proposition.id, 'rejected')}
                                                    />
                                                    <label htmlFor={`reject-${proposition.id}`} className="text-sm">
                                                        Refuser
                                                    </label>
                                                </div>
                                            </div>
                                            {proposition.response_message && !isPending && (
                                                <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                                                    Votre réponse: {proposition.response_message}
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                </div>
                )}
            </div>
        </AppLayout>
    );
}


