import { Head, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle, XCircle, User, Mail, Phone, Calendar } from 'lucide-react';

export default function ReactivationRequests() {
    const { requests = [], routePrefix = 'admin' } = usePage().props;
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [actionType, setActionType] = useState(null); // 'approve' or 'reject'
    const [reviewNotes, setReviewNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);

    const handleAction = (request, type) => {
        setSelectedRequest(request);
        setActionType(type);
        setReviewNotes('');
        setDialogOpen(true);
    };

    const submitAction = () => {
        if (!selectedRequest) return;

        const route = actionType === 'approve' 
            ? `/${routePrefix}/reactivation-requests/${selectedRequest.id}/approve`
            : `/${routePrefix}/reactivation-requests/${selectedRequest.id}/reject`;

        setSubmitting(true);
        router.post(route, {
            review_notes: reviewNotes || null
        }, {
            onSuccess: () => {
                setDialogOpen(false);
                setSelectedRequest(null);
                setReviewNotes('');
                setSubmitting(false);
            },
            onError: () => {
                setSubmitting(false);
            }
        });
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <AppLayout>
            <Head title="Demandes de Réactivation" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Demandes de Réactivation</h1>
                        <p className="text-muted-foreground">
                            Gérez les demandes de réactivation de compte envoyées par les utilisateurs
                        </p>
                    </div>
                    <Badge variant="outline" className="text-lg px-3 py-1">
                        {requests.length} demande{requests.length > 1 ? 's' : ''} en attente
                    </Badge>
                </div>

                {requests.length === 0 ? (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
                            <p className="text-lg font-semibold text-muted-foreground">
                                Aucune demande de réactivation en attente
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <Card>
                        <CardHeader>
                            <CardTitle>Demandes en attente</CardTitle>
                            <CardDescription>
                                Liste des demandes de réactivation soumises par les utilisateurs
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Utilisateur</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Téléphone</TableHead>
                                        <TableHead>Statut</TableHead>
                                        <TableHead>Matchmaker</TableHead>
                                        <TableHead>Date de demande</TableHead>
                                        <TableHead>Raison</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {requests.map((request) => (
                                        <TableRow key={request.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <User className="w-4 h-4 text-muted-foreground" />
                                                    {request.user?.name || 'N/A'}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Mail className="w-4 h-4 text-muted-foreground" />
                                                    {request.user?.email || 'N/A'}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Phone className="w-4 h-4 text-muted-foreground" />
                                                    {request.user?.phone || 'N/A'}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge 
                                                    variant={
                                                        request.user?.status === 'prospect' ? 'secondary' :
                                                        request.user?.status === 'member' ? 'default' :
                                                        request.user?.status === 'client' ? 'default' :
                                                        'outline'
                                                    }
                                                >
                                                    {request.user?.status === 'prospect' ? 'Prospect' :
                                                     request.user?.status === 'member' ? 'Membre' :
                                                     request.user?.status === 'client' ? 'Client' :
                                                     request.user?.status || 'N/A'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {request.user?.assigned_matchmaker?.name ? (
                                                    <span className="text-sm">{request.user.assigned_matchmaker.name}</span>
                                                ) : (
                                                    <span className="text-sm text-muted-foreground">Non assigné</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="w-4 h-4 text-muted-foreground" />
                                                    <span className="text-sm">{formatDate(request.created_at)}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="max-w-xs">
                                                <p className="text-sm text-muted-foreground truncate" title={request.reason}>
                                                    {request.reason || 'Aucune raison spécifiée'}
                                                </p>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="default"
                                                        onClick={() => handleAction(request, 'approve')}
                                                        className="bg-green-600 hover:bg-green-700"
                                                    >
                                                        <CheckCircle className="w-4 h-4 mr-1" />
                                                        Approuver
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        onClick={() => handleAction(request, 'reject')}
                                                    >
                                                        <XCircle className="w-4 h-4 mr-1" />
                                                        Rejeter
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}

                {/* Action Dialog */}
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                {actionType === 'approve' ? 'Approuver la demande' : 'Rejeter la demande'}
                            </DialogTitle>
                            <DialogDescription>
                                {actionType === 'approve' 
                                    ? `Approuver la demande de réactivation pour ${selectedRequest?.user?.name || 'cet utilisateur'} ?`
                                    : `Rejeter la demande de réactivation pour ${selectedRequest?.user?.name || 'cet utilisateur'} ?`}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="bg-gray-50 p-3 rounded-lg">
                                <p className="text-sm font-semibold mb-2">Raison de la demande:</p>
                                <p className="text-sm text-muted-foreground">{selectedRequest?.reason || 'Aucune raison spécifiée'}</p>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="review-notes">
                                    Notes (optionnel)
                                </Label>
                                <Textarea
                                    id="review-notes"
                                    value={reviewNotes}
                                    onChange={(e) => setReviewNotes(e.target.value)}
                                    placeholder="Ajouter des notes sur cette décision..."
                                    rows={3}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDialogOpen(false)}>
                                Annuler
                            </Button>
                            <Button
                                variant={actionType === 'approve' ? 'default' : 'destructive'}
                                onClick={submitAction}
                                disabled={submitting}
                                className={actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}
                            >
                                {submitting ? 'Traitement...' : (actionType === 'approve' ? 'Approuver' : 'Rejeter')}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}

