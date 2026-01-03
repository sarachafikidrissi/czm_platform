import { Head, router, usePage } from '@inertiajs/react';
import { useState, useMemo } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, XCircle, ArrowRightLeft, User, Mail, Phone, MapPin, Copy, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '@/components/ui/skeleton';

export default function TransferRequests() {
    const { t } = useTranslation();
    const { receivedRequests = [], sentRequests = [] } = usePage().props;
    const isLoading = (receivedRequests === null || receivedRequests === undefined) && (sentRequests === null || sentRequests === undefined);
    
    // Get the type from URL query parameter, default to 'received'
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get('type') || 'received';
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [rejecting, setRejecting] = useState(false);
    const [userInfoModalOpen, setUserInfoModalOpen] = useState(false);
    const [selectedUserForInfo, setSelectedUserForInfo] = useState(null);

    const handleAccept = (request) => {
        router.post(`/staff/transfer-requests/${request.id}/accept`, {}, {
            onSuccess: () => {
                // Success handled by redirect
            },
            onError: () => {
                // Error handled by redirect
            }
        });
    };

    const handleRejectClick = (request) => {
        setSelectedRequest(request);
        setRejectionReason('');
        setRejectDialogOpen(true);
    };

    const handleRejectSubmit = () => {
        if (!selectedRequest || !rejectionReason.trim()) return;
        
        setRejecting(true);
        router.post(`/staff/transfer-requests/${selectedRequest.id}/reject`, {
            rejection_reason: rejectionReason
        }, {
            onSuccess: () => {
                setRejectDialogOpen(false);
                setRejectionReason('');
                setSelectedRequest(null);
                setRejecting(false);
            },
            onError: () => {
                setRejecting(false);
            }
        });
    };

    const handleUserClick = (user) => {
        setSelectedUserForInfo(user);
        setUserInfoModalOpen(true);
    };

    const handleCopyLink = () => {
        if (selectedUserForInfo) {
            const profileUrl = `${window.location.origin}/profile/${selectedUserForInfo.username || selectedUserForInfo.id}`;
            navigator.clipboard.writeText(profileUrl).then(() => {
                // You could add a toast notification here
            });
        }
    };

    const handleViewProfile = () => {
        if (selectedUserForInfo) {
            window.open(`/profile/${selectedUserForInfo.username || selectedUserForInfo.id}`, '_blank', 'noopener,noreferrer');
        }
    };

    const getProfilePicture = (user) => {
        if (user?.profile?.profile_picture_path) {
            return `/storage/${user.profile.profile_picture_path}`;
        }
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=random`;
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'pending':
                return <Badge className="bg-warning text-warning-foreground">En attente</Badge>;
            case 'accepted':
                return <Badge className="bg-success text-success-foreground">Accepté</Badge>;
            case 'rejected':
                return <Badge className="bg-error text-error-foreground">Rejeté</Badge>;
            default:
                return <Badge>{status}</Badge>;
        }
    };

    return (
        <AppLayout>
            <Head title="Demandes de transfert" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">
                            {type === 'received' ? t('navigation.receivedRequests', { defaultValue: 'Demandes reçues' }) : t('navigation.sentRequests', { defaultValue: 'Demandes envoyées' })}
                        </h1>
                        <p className="text-muted-foreground">
                            {type === 'received' 
                                ? 'Demandes de transfert que vous avez reçues'
                                : 'Demandes de transfert que vous avez envoyées'}
                        </p>
                    </div>
                </div>

                {/* Received Requests */}
                {type === 'received' && (
                <Card>
                    <CardHeader>
                        <CardTitle>Demandes reçues</CardTitle>
                        <CardDescription>Demandes de transfert que vous avez reçues</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {receivedRequests.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-muted-foreground">Aucune demande reçue pour le moment.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Utilisateur</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Téléphone</TableHead>
                                            <TableHead>Statut</TableHead>
                                            <TableHead>Demandé par</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Raison</TableHead>
                                            <TableHead>Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoading ? (
                                            [1, 2, 3, 4, 5].map((i) => (
                                                <TableRow key={i}>
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            <Skeleton className="w-10 h-10 rounded-full" />
                                                            <div>
                                                                <Skeleton className="h-4 w-32 mb-2" />
                                                                <Skeleton className="h-3 w-24" />
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                                                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                                                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                                                    <TableCell>
                                                        <div className="flex gap-2">
                                                            <Skeleton className="h-8 w-20" />
                                                            <Skeleton className="h-8 w-20" />
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            receivedRequests.map((request) => (
                                            <TableRow 
                                                key={request.id}
                                                className="cursor-pointer hover:bg-muted/50"
                                                onClick={() => handleUserClick(request.user)}
                                            >
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <img
                                                            src={getProfilePicture(request.user)}
                                                            alt={request.user?.name}
                                                            className="w-10 h-10 rounded-full object-cover"
                                                            onError={(e) => {
                                                                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(request.user?.name || 'User')}&background=random`;
                                                            }}
                                                        />
                                                        <div>
                                                            <div className="font-medium">{request.user?.name}</div>
                                                            <div className="text-sm text-muted-foreground">
                                                                {request.user?.city && request.user?.country 
                                                                    ? `${request.user.city}, ${request.user.country}`
                                                                    : request.user?.city || request.user?.country || 'N/A'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>{request.user?.email || 'N/A'}</TableCell>
                                                <TableCell>{request.user?.phone || 'N/A'}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{request.user?.status || 'N/A'}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div>
                                                        <div className="font-medium">{request.from_matchmaker?.name}</div>
                                                        {request.from_matchmaker?.email && (
                                                            <div className="text-sm text-muted-foreground">
                                                                {request.from_matchmaker.email}
                                                            </div>
                                                        )}
                                                        {request.from_matchmaker?.agency && (
                                                            <div className="text-xs text-muted-foreground">
                                                                {request.from_matchmaker.agency.name}
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {new Date(request.created_at).toLocaleDateString('fr-FR', {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </TableCell>
                                                <TableCell>
                                                    {request.reason ? (
                                                        <div className="max-w-xs">
                                                            <p className="text-sm text-muted-foreground line-clamp-2" title={request.reason}>
                                                                {request.reason}
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <span className="text-sm text-muted-foreground">-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="default"
                                                            className="bg-success hover:opacity-90"
                                                            onClick={() => handleAccept(request)}
                                                        >
                                                            <CheckCircle className="w-4 h-4 mr-1" />
                                                            Accepter
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="destructive"
                                                            onClick={() => handleRejectClick(request)}
                                                        >
                                                            <XCircle className="w-4 h-4 mr-1" />
                                                            Rejeter
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
                )}

                {/* Sent Requests */}
                {type === 'sent' && (
                <Card>
                    <CardHeader>
                        <CardTitle>Demandes envoyées</CardTitle>
                        <CardDescription>Demandes de transfert que vous avez envoyées</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {sentRequests.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-muted-foreground">Aucune demande envoyée pour le moment.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Utilisateur</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Téléphone</TableHead>
                                            <TableHead>Statut</TableHead>
                                            <TableHead>Transféré à</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Raison</TableHead>
                                            <TableHead>Statut de la demande</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoading ? (
                                            [1, 2, 3, 4, 5].map((i) => (
                                                <TableRow key={i}>
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            <Skeleton className="w-10 h-10 rounded-full" />
                                                            <div>
                                                                <Skeleton className="h-4 w-32 mb-2" />
                                                                <Skeleton className="h-3 w-24" />
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                                                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                                                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                                                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            sentRequests.map((request) => (
                                            <TableRow 
                                                key={request.id}
                                                className="cursor-pointer hover:bg-muted/50"
                                                onClick={() => handleUserClick(request.user)}
                                            >
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <img
                                                            src={getProfilePicture(request.user)}
                                                            alt={request.user?.name}
                                                            className="w-10 h-10 rounded-full object-cover"
                                                            onError={(e) => {
                                                                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(request.user?.name || 'User')}&background=random`;
                                                            }}
                                                        />
                                                        <div>
                                                            <div className="font-medium">{request.user?.name}</div>
                                                            <div className="text-sm text-muted-foreground">
                                                                {request.user?.city && request.user?.country 
                                                                    ? `${request.user.city}, ${request.user.country}`
                                                                    : request.user?.city || request.user?.country || 'N/A'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>{request.user?.email || 'N/A'}</TableCell>
                                                <TableCell>{request.user?.phone || 'N/A'}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{request.user?.status || 'N/A'}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div>
                                                        <div className="font-medium">{request.to_matchmaker?.name}</div>
                                                        {request.to_matchmaker?.email && (
                                                            <div className="text-sm text-muted-foreground">
                                                                {request.to_matchmaker.email}
                                                            </div>
                                                        )}
                                                        {request.to_matchmaker?.agency && (
                                                            <div className="text-xs text-muted-foreground">
                                                                {request.to_matchmaker.agency.name}
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {new Date(request.created_at).toLocaleDateString('fr-FR', {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </TableCell>
                                                <TableCell>
                                                    {request.reason ? (
                                                        <div className="max-w-xs">
                                                            <p className="text-sm text-muted-foreground line-clamp-2" title={request.reason}>
                                                                {request.reason}
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <span className="text-sm text-muted-foreground">-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col gap-1">
                                                        {getStatusBadge(request.status)}
                                                        {request.status === 'rejected' && request.rejection_reason && (
                                                            <div className="mt-1 p-2 bg-error-light border border-error rounded text-xs">
                                                                <p className="font-semibold text-error mb-1">Raison du rejet:</p>
                                                                <p className="text-error">{request.rejection_reason}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
                )}

                {/* User Info Modal */}
                <Dialog open={userInfoModalOpen} onOpenChange={setUserInfoModalOpen}>
                    <DialogContent className="w-[95vw] sm:w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        {selectedUserForInfo && (
                            <>
                                {/* Header Section with Profile Picture */}
                                <div className="flex flex-col items-center gap-4 pb-6 border-b">
                                    <div className="relative">
                                        <img
                                            src={getProfilePicture(selectedUserForInfo)}
                                            alt={selectedUserForInfo.name}
                                            className="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover"
                                            onError={(e) => {
                                                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedUserForInfo.name)}&background=random`;
                                            }}
                                        />
                                        <div className="absolute bottom-0 right-0 bg-blue-600 rounded-full p-1.5 border-2 border-white">
                                            <Check className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                                        </div>
                                    </div>
                                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 w-full px-2 sm:px-0">
                                        <div className="text-center sm:text-left flex-1">
                                            <h2 className="text-lg sm:text-xl font-semibold break-words">{selectedUserForInfo.name}</h2>
                                            <p className="text-xs sm:text-sm text-muted-foreground break-all">{selectedUserForInfo.email}</p>
                                        </div>
                                        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={handleCopyLink}
                                                className="flex items-center justify-center gap-2 w-full sm:w-auto"
                                            >
                                                <Copy className="w-4 h-4" />
                                                Copier le lien
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={handleViewProfile}
                                                className="flex items-center justify-center gap-2 w-full sm:w-auto"
                                            >
                                                Voir le profil
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                {/* Form Fields Section - Read Only */}
                                <div className="space-y-6 py-4 px-2 sm:px-0">
                                    {/* Name Fields */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="firstName">Prénom</Label>
                                            <Input
                                                id="firstName"
                                                value={(selectedUserForInfo.name || '').split(' ')[0] || ''}
                                                disabled
                                                className="bg-muted"
                                                placeholder="Prénom"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="lastName" className="opacity-0">Nom</Label>
                                            <Input
                                                id="lastName"
                                                value={(selectedUserForInfo.name || '').split(' ').slice(1).join(' ') || ''}
                                                disabled
                                                className="bg-muted"
                                                placeholder="Nom"
                                            />
                                        </div>
                                    </div>

                                    {/* Email Address */}
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email</Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input
                                                id="email"
                                                type="email"
                                                value={selectedUserForInfo.email || ''}
                                                disabled
                                                className="pl-10 bg-muted"
                                                placeholder="Email address"
                                            />
                                        </div>
                                    </div>

                                    {/* Phone */}
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Téléphone</Label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input
                                                id="phone"
                                                value={selectedUserForInfo.phone || ''}
                                                disabled
                                                className="pl-10 bg-muted"
                                                placeholder="Téléphone"
                                            />
                                        </div>
                                    </div>

                                    {/* Location */}
                                    {(selectedUserForInfo.city || selectedUserForInfo.country) && (
                                        <div className="space-y-2">
                                            <Label htmlFor="location">Localisation</Label>
                                            <div className="relative">
                                                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                <Input
                                                    id="location"
                                                    value={`${selectedUserForInfo.city || ''}${selectedUserForInfo.city && selectedUserForInfo.country ? ', ' : ''}${selectedUserForInfo.country || ''}`}
                                                    disabled
                                                    className="pl-10 bg-muted"
                                                    placeholder="Localisation"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Status */}
                                    <div className="space-y-2">
                                        <Label htmlFor="status">Statut</Label>
                                        <Input
                                            id="status"
                                            value={selectedUserForInfo.status || ''}
                                            disabled
                                            className="bg-muted"
                                            placeholder="Statut"
                                        />
                                    </div>

                                    {/* Assigned Matchmaker */}
                                    {selectedUserForInfo.assigned_matchmaker && (
                                        <div className="space-y-2">
                                            <Label htmlFor="matchmaker">Matchmaker assigné</Label>
                                            <Input
                                                id="matchmaker"
                                                value={selectedUserForInfo.assigned_matchmaker.name || ''}
                                                disabled
                                                className="bg-muted"
                                                placeholder="Matchmaker"
                                            />
                                        </div>
                                    )}

                                    {/* Agency */}
                                    {selectedUserForInfo.agency && (
                                        <div className="space-y-2">
                                            <Label htmlFor="agency">Agence</Label>
                                            <Input
                                                id="agency"
                                                value={selectedUserForInfo.agency.name || ''}
                                                disabled
                                                className="bg-muted"
                                                placeholder="Agence"
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Footer Buttons */}
                                <DialogFooter className="flex justify-end">
                                    <Button
                                        variant="outline"
                                        onClick={() => setUserInfoModalOpen(false)}
                                    >
                                        Fermer
                                    </Button>
                                </DialogFooter>
                            </>
                        )}
                    </DialogContent>
                </Dialog>

                {/* Rejection Dialog */}
                <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Rejeter la demande de transfert</DialogTitle>
                            <DialogDescription>
                                Veuillez fournir une raison pour le rejet de cette demande de transfert
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="rejection-reason">Raison du rejet *</Label>
                                <Textarea
                                    id="rejection-reason"
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    placeholder="Expliquez pourquoi vous rejetez cette demande de transfert..."
                                    rows={4}
                                    required
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
                                Annuler
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleRejectSubmit}
                                disabled={!rejectionReason.trim() || rejecting}
                            >
                                {rejecting ? 'Envoi...' : 'Rejeter'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
