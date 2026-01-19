import { Head, router, usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

export default function PropositionRequests() {
    const { receivedRequests = [], sentRequests = [] } = usePage().props;
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get('type') || 'received';
    const isLoading = (receivedRequests === null || receivedRequests === undefined) && (sentRequests === null || sentRequests === undefined);

    const [respondDialogOpen, setRespondDialogOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
    const [detailsRequest, setDetailsRequest] = useState(null);
    const [status, setStatus] = useState('accepted');
    const [rejectionReason, setRejectionReason] = useState('');
    const [sharePhone, setSharePhone] = useState(false);
    const [organizer, setOrganizer] = useState('');
    const [responseMessage, setResponseMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const getProfilePicture = (user) => {
        if (user?.profile?.profile_picture_path) {
            return `/storage/${user.profile.profile_picture_path}`;
        }
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=random`;
    };

    const getStatusBadge = (value) => {
        switch (value) {
            case 'pending':
                return <Badge className="bg-warning text-warning-foreground">En attente</Badge>;
            case 'accepted':
                return <Badge className="bg-success text-success-foreground">Acceptée</Badge>;
            case 'rejected':
                return <Badge className="bg-error text-error-foreground">Refusée</Badge>;
            default:
                return <Badge>{value}</Badge>;
        }
    };

    const openRespondDialog = (request) => {
        setSelectedRequest(request);
        setStatus('accepted');
        setRejectionReason('');
        setSharePhone(false);
        setOrganizer('');
        setResponseMessage('');
        setRespondDialogOpen(true);
    };

    const openDetailsDialog = (request) => {
        setDetailsRequest(request);
        setDetailsDialogOpen(true);
    };

    const handleSubmitResponse = () => {
        if (!selectedRequest) return;
        if (status === 'rejected' && !rejectionReason.trim()) return;
        if (status === 'accepted' && !organizer) return;

        setIsSubmitting(true);
        router.post(`/staff/proposition-requests/${selectedRequest.id}/respond`, {
            status,
            rejection_reason: rejectionReason || null,
            share_phone: status === 'accepted' ? sharePhone : false,
            organizer: status === 'accepted' ? organizer : null,
            response_message: responseMessage || null,
        }, {
            onSuccess: () => {
                setRespondDialogOpen(false);
                setSelectedRequest(null);
                setIsSubmitting(false);
            },
            onError: () => {
                setIsSubmitting(false);
            },
        });
    };

    const currentRequests = useMemo(() => {
        return type === 'sent' ? sentRequests : receivedRequests;
    }, [type, sentRequests, receivedRequests]);

    const normalizedRequests = useMemo(() => {
        if (Array.isArray(currentRequests)) {
            return currentRequests;
        }
        if (currentRequests && Array.isArray(currentRequests.data)) {
            return currentRequests.data;
        }
        return [];
    }, [currentRequests]);

    return (
        <AppLayout>
            <Head title="Demandes de propositions" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div>
                    <h1 className="text-2xl font-bold">
                        {type === 'received' ? 'Demandes reçues' : 'Demandes envoyées'}
                    </h1>
                    <p className="text-muted-foreground">
                        {type === 'received'
                            ? 'Demandes de propositions reçues de vos collègues'
                            : 'Demandes de propositions envoyées à d’autres matchmakers'}
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>{type === 'received' ? 'Demandes reçues' : 'Demandes envoyées'}</CardTitle>
                        <CardDescription>
                            {type === 'received'
                                ? 'Répondez aux demandes reçues.'
                                : 'Consultez l’état de vos demandes.'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {normalizedRequests.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-muted-foreground">Aucune demande pour le moment.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left border-b">
                                            <th className="py-2 pr-4">Profil de référence</th>
                                            <th className="py-2 pr-4">Profil compatible</th>
                                            <th className="py-2 pr-4">Matchmaker</th>
                                            <th className="py-2 pr-4">Statut</th>
                                            <th className="py-2 pr-4">Date</th>
                                            <th className="py-2 pr-4">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {isLoading ? (
                                            [1, 2, 3].map((i) => (
                                                <tr key={i} className="border-b">
                                                    <td className="py-3 pr-4"><Skeleton className="h-6 w-40" /></td>
                                                    <td className="py-3 pr-4"><Skeleton className="h-6 w-40" /></td>
                                                    <td className="py-3 pr-4"><Skeleton className="h-6 w-64" /></td>
                                                    <td className="py-3 pr-4"><Skeleton className="h-6 w-32" /></td>
                                                    <td className="py-3 pr-4"><Skeleton className="h-6 w-24" /></td>
                                                    <td className="py-3 pr-4"><Skeleton className="h-6 w-24" /></td>
                                                    <td className="py-3 pr-4"><Skeleton className="h-6 w-24" /></td>
                                                </tr>
                                            ))
                                        ) : (
                                            normalizedRequests.map((request) => {
                                                const refUser = request.reference_user || request.referenceUser;
                                                const compUser = request.compatible_user || request.compatibleUser;
                                                const matchmaker = type === 'received'
                                                    ? (request.from_matchmaker || request.fromMatchmaker)
                                                    : (request.to_matchmaker || request.toMatchmaker);

                                                return (
                                                    <tr
                                                        key={request.id}
                                                        className="border-b align-top cursor-pointer hover:bg-muted/50"
                                                        onClick={() => openDetailsDialog(request)}
                                                    >
                                                        <td className="py-3 pr-4">
                                                            <div className="flex items-center gap-2">
                                                                <img
                                                                    src={getProfilePicture(refUser)}
                                                                    alt={refUser?.name}
                                                                    className="h-8 w-8 rounded-full object-cover"
                                                                />
                                                                <div>
                                                                    <div className="font-medium">{refUser?.name || '-'}</div>
                                                                    <div className="text-xs text-muted-foreground">@{refUser?.username}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 pr-4">
                                                            <div className="flex items-center gap-2">
                                                                <img
                                                                    src={getProfilePicture(compUser)}
                                                                    alt={compUser?.name}
                                                                    className="h-8 w-8 rounded-full object-cover"
                                                                />
                                                                <div>
                                                                    <div className="font-medium">{compUser?.name || '-'}</div>
                                                                    <div className="text-xs text-muted-foreground">@{compUser?.username}</div>
                                                                </div>
                                                            </div>
                                                            {request.compatible_phone && (
                                                                <div className="text-xs text-muted-foreground mt-1">
                                                                    Tél: {request.compatible_phone}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="py-3 pr-4">
                                                            <div className="font-medium">{matchmaker?.name || '-'}</div>
                                                            {matchmaker?.email && (
                                                                <div className="text-xs text-muted-foreground">{matchmaker.email}</div>
                                                            )}
                                                        </td>
                                                        <td className="py-3 pr-4">
                                                            {getStatusBadge(request.status)}
                                                        </td>
                                                        <td className="py-3 pr-4 text-xs text-muted-foreground">
                                                            {new Date(request.created_at).toLocaleDateString('fr-FR', {
                                                                year: 'numeric',
                                                                month: 'short',
                                                                day: 'numeric',
                                                                hour: '2-digit',
                                                                minute: '2-digit',
                                                            })}
                                                        </td>
                                                        <td className="py-3 pr-4" onClick={(event) => event.stopPropagation()}>
                                                            {type === 'received' && request.status === 'pending' ? (
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => openRespondDialog(request)}
                                                                >
                                                                    Répondre
                                                                </Button>
                                                            ) : (
                                                                <span className="text-xs text-muted-foreground">-</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Détails de la demande</DialogTitle>
                        <DialogDescription>
                            Consultez le message et les réponses associées.
                        </DialogDescription>
                    </DialogHeader>
                    {detailsRequest && (
                        (() => {
                            const compUser = detailsRequest.compatible_user || detailsRequest.compatibleUser;
                            const sharedPhone = detailsRequest.share_phone
                                ? (detailsRequest.compatible_phone || compUser?.phone || '-')
                                : '-';
                            return (
                        <div className="space-y-4 text-sm">
                            <div>
                                <div className="text-xs text-muted-foreground">Message</div>
                                <textarea
                                    className="mt-2 w-full rounded-md border border-gray-300 p-3 text-sm"
                                    rows={3}
                                    value={detailsRequest.message || ''}
                                    disabled
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-xs text-muted-foreground">Statut</div>
                                    <Input className="mt-2" value={detailsRequest.status || '-'} disabled />
                                </div>
                                <div>
                                    <div className="text-xs text-muted-foreground">Organisateur</div>
                                    <Input className="mt-2" value={detailsRequest.organizer || '-'} disabled />
                                </div>
                                <div>
                                    <div className="text-xs text-muted-foreground">Partager téléphone</div>
                                    <Input className="mt-2" value={detailsRequest.share_phone ? 'Oui' : 'Non'} disabled />
                                </div>
                                <div>
                                    <div className="text-xs text-muted-foreground">Téléphone partagé</div>
                                    <Input className="mt-2" value={sharedPhone} disabled />
                                </div>
                            </div>
                            <div>
                                <div className="text-xs text-muted-foreground">Réponse</div>
                                <textarea
                                    className="mt-2 w-full rounded-md border border-gray-300 p-3 text-sm"
                                    rows={3}
                                    value={detailsRequest.response_message || ''}
                                    disabled
                                />
                            </div>
                            <div>
                                <div className="text-xs text-muted-foreground">Motif de refus</div>
                                <textarea
                                    className="mt-2 w-full rounded-md border border-gray-300 p-3 text-sm"
                                    rows={2}
                                    value={detailsRequest.rejection_reason || ''}
                                    disabled
                                />
                            </div>
                        </div>
                            );
                        })()
                    )}
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setDetailsDialogOpen(false)}>
                            Fermer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={respondDialogOpen} onOpenChange={setRespondDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Répondre à la demande</DialogTitle>
                        <DialogDescription>
                            Acceptez ou refusez la demande de propositions.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>Décision</Label>
                            <Select value={status} onValueChange={setStatus}>
                                <SelectTrigger className="mt-2">
                                    <SelectValue placeholder="Choisir" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="accepted">Accepter</SelectItem>
                                    <SelectItem value="rejected">Rejeter</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {status === 'accepted' && (
                            <>
                                <div>
                                    <Label>Partager le numéro de téléphone</Label>
                                    <Select value={sharePhone ? 'yes' : 'no'} onValueChange={(value) => setSharePhone(value === 'yes')}>
                                        <SelectTrigger className="mt-2">
                                            <SelectValue placeholder="Choisir" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="yes">Oui</SelectItem>
                                            <SelectItem value="no">Non</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Qui organise le rendez-vous</Label>
                                    <Select value={organizer} onValueChange={setOrganizer}>
                                        <SelectTrigger className="mt-2">
                                            <SelectValue placeholder="Choisir" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="vous">Vous</SelectItem>
                                            <SelectItem value="moi">Moi</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </>
                        )}

                        {status === 'rejected' && (
                            <div>
                                <Label>Motif de refus</Label>
                                <textarea
                                    className="mt-2 w-full rounded-md border border-gray-300 p-3 focus:border-[#096725] focus:outline-none focus:ring-1 focus:ring-[#096725]"
                                    rows={3}
                                    value={rejectionReason}
                                    onChange={(event) => setRejectionReason(event.target.value)}
                                    placeholder="Motif du refus..."
                                    required
                                />
                            </div>
                        )}

                        <div>
                            <Label>Message</Label>
                            <textarea
                                className="mt-2 w-full rounded-md border border-gray-300 p-3 focus:border-[#096725] focus:outline-none focus:ring-1 focus:ring-[#096725]"
                                rows={3}
                                value={responseMessage}
                                onChange={(event) => setResponseMessage(event.target.value)}
                                placeholder="Message complémentaire..."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setRespondDialogOpen(false)}
                        >
                            Annuler
                        </Button>
                        <Button onClick={handleSubmitResponse} disabled={isSubmitting}>
                            {isSubmitting ? 'Envoi...' : 'Envoyer'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

