import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { Head, usePage } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function PropositionsPage() {
    const { t } = useTranslation();
    const { propositions: initialPropositions = [], auth } = usePage().props;
    const [propositions, setPropositions] = useState(initialPropositions);
    const [responseMessages, setResponseMessages] = useState({});
    const [processingIds, setProcessingIds] = useState({});
    const [errors, setErrors] = useState({});
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

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

    const totalPages = Math.max(1, Math.ceil(sortedPropositions.length / itemsPerPage));
    const paginatedPropositions = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return sortedPropositions.slice(startIndex, startIndex + itemsPerPage);
    }, [sortedPropositions, currentPage]);

    const goToPage = (page) => {
        const nextPage = Math.min(Math.max(page, 1), totalPages);
        setCurrentPage(nextPage);
    };

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

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
                        : item,
                ),
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
                    <div className="border-sidebar-border/70 dark:border-sidebar-border rounded-xl border p-6 text-sm text-neutral-700 dark:text-neutral-200">
                        {t('pages.propositions.content', { defaultValue: 'Aucune proposition pour le moment.' })}
                    </div>
                ) : (
                    <div className="grid gap-4">
                        <div className="flex items-center justify-center gap-2 pb-2">
                            <button
                                type="button"
                                onClick={() => goToPage(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="h-8 w-8 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                                aria-label="Page précédente"
                            >
                                ‹
                            </button>
                            {Array.from({ length: totalPages }, (_, index) => {
                                const page = index + 1;
                                const isActive = page === currentPage;
                                return (
                                    <button
                                        key={page}
                                        type="button"
                                        onClick={() => goToPage(page)}
                                        className={`h-9 w-9 rounded-lg border ${
                                            isActive ? 'border-gray-300 bg-gray-100 text-gray-900 shadow-sm' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                                        }`}
                                    >
                                        {page}
                                    </button>
                                );
                            })}
                            <button
                                type="button"
                                onClick={() => goToPage(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="h-8 w-8 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                                aria-label="Page suivante"
                            >
                                ›
                            </button>
                        </div>
                        {paginatedPropositions.map((proposition) => {
                            const otherUser = getOtherUser(proposition);
                            const status = proposition.status;
                            const normalizedStatus = proposition.is_expired
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
                                            <CardTitle className="text-base">Proposition de {proposition.matchmaker?.name || 'Matchmaker'}</CardTitle>
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
                                        {otherUser && (
                                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                                <div className="flex flex-col items-center gap-3">
                                                    <img
                                                        src={normalizedStatus === 'expired' ? './images/expired.jpg' : getProfilePicture(otherUser)}
                                                        alt={otherUser.name}
                                                        className="h-40 w-40 rounded-md object-cover"
                                                    />
                                                    {/* <div>
                                                        <div className="font-medium">{otherUser.name}</div>
                                                        <div className="text-xs text-muted-foreground">@{otherUser.username}</div>
                                                    </div> */}
                                                </div>
                                            </div>
                                        )}
                                        <div className="text-center text-xl font-extrabold">{otherUser.name}</div>
                                        <div className="text-muted-foreground mt-2 flex flex-col text-sm">
                                            <span>
                                                <span className="text-black">Date: </span>
                                                {new Date(proposition.created_at).toLocaleDateString()}
                                            </span>
                                            <span>
                                                <span className="text-black">Status: </span>
                                                {normalizedStatus}
                                            </span>
                                        </div>
                                        <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-700">
                                            <span className="font-extrabold text-black">{proposition.matchmaker?.name || 'Matchmaker'}: </span>
                                            {proposition.message}
                                        </div>
                                        <div className="flex justify-center">
                                            {normalizedStatus === 'expired' ? (
                                                <div className="text-center text-sm  bg-red-600 text-white rounded-full px-4 py-1">Proposition expirée</div>
                                            ) : (
                                                <Button
                                                    variant="outline"
                                                    onClick={() =>
                                                        window.open(`/profile/${otherUser.username || otherUser.id}`, '_blank', 'noopener,noreferrer')
                                                    }
                                                    className="bg-[#096725] text-white hover:bg-[#07501d] hover:text-white"
                                                >
                                                    Visiter le profil compatible
                                                </Button>
                                            )}
                                        </div>

                                        {/* <div className="space-y-3">
                                            <Textarea
                                                value={responseMessages[proposition.id] || ''}
                                                onChange={(event) =>
                                                    setResponseMessages((prev) => ({ ...prev, [proposition.id]: event.target.value }))
                                                }
                                                placeholder="Message pour acceptation ou refus..."
                                                disabled={!isPending || isProcessing}
                                            />
                                            {errors[proposition.id] && <div className="text-sm text-red-600">{errors[proposition.id]}</div>}
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
                                                <div className="bg-muted text-muted-foreground rounded-lg p-3 text-sm">
                                                    Votre réponse: {proposition.response_message}
                                                </div>
                                            )}
                                        </div> */}
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
