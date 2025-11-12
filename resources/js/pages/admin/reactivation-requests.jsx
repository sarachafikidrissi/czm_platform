import { Head, router, usePage } from '@inertiajs/react';
import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { AlertCircle, CheckCircle, XCircle, User, Mail, Phone, Calendar, Search } from 'lucide-react';

export default function ReactivationRequests() {
    const { t } = useTranslation();
    const { requests = [], routePrefix = 'admin' } = usePage().props;
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [actionType, setActionType] = useState(null); // 'approve' or 'reject'
    const [reviewNotes, setReviewNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

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
        if (!dateString) return t('common.notAvailable');
        return new Date(dateString).toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Filter requests based on search query
    const filteredRequests = useMemo(() => {
        if (!searchQuery.trim()) {
            return requests;
        }
        const query = searchQuery.toLowerCase().trim();
        return requests.filter(request => {
            const name = (request.user?.name || '').toLowerCase();
            const email = (request.user?.email || '').toLowerCase();
            const username = (request.user?.username || '').toLowerCase();
            return name.includes(query) || email.includes(query) || username.includes(query);
        });
    }, [requests, searchQuery]);

    return (
        <AppLayout>
            <Head title={t('staff.reactivationRequests.title')} />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">{t('staff.reactivationRequests.title')}</h1>
                        <p className="text-muted-foreground">
                            {t('staff.reactivationRequests.description')}
                        </p>
                    </div>
                    <Badge variant="outline" className="text-lg px-3 py-1">
                        {t('staff.reactivationRequests.requestsFound', { 
                            count: filteredRequests.length, 
                            plural: filteredRequests.length > 1 ? 's' : '',
                            status: searchQuery.trim() ? t('staff.reactivationRequests.found') : t('staff.reactivationRequests.pending')
                        })}
                    </Badge>
                </div>

                {/* Search Bar */}
                {requests.length > 0 && (
                    <div className="mb-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder={t('staff.reactivationRequests.searchPlaceholder')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>
                )}

                {filteredRequests.length === 0 && searchQuery.trim() && (
                    <div className="mb-4 p-4 bg-info-light border border-info rounded-lg">
                        <p className="text-info-foreground text-sm">
                            {t('common.noResults', { query: searchQuery })}
                        </p>
                    </div>
                )}

                {requests.length === 0 ? (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
                            <p className="text-lg font-semibold text-muted-foreground">
                                {t('staff.reactivationRequests.noRequests')}
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('staff.reactivationRequests.title')}</CardTitle>
                            <CardDescription>
                                {t('staff.reactivationRequests.description')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('staff.reactivationRequests.user')}</TableHead>
                                        <TableHead>{t('staff.userInfo.email')}</TableHead>
                                        <TableHead>{t('staff.userInfo.phone')}</TableHead>
                                        <TableHead>{t('common.status')}</TableHead>
                                        <TableHead>{t('staff.matchmaker')}</TableHead>
                                        <TableHead>{t('staff.reactivationRequests.requestDate')}</TableHead>
                                        <TableHead>{t('staff.reactivationRequests.reason')}</TableHead>
                                        <TableHead className="text-right">{t('staff.tableHeaders.actions')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredRequests.map((request) => (
                                        <TableRow key={request.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <User className="w-4 h-4 text-muted-foreground" />
                                                    {request.user?.name || t('common.notAvailable')}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Mail className="w-4 h-4 text-muted-foreground" />
                                                    {request.user?.email || t('common.notAvailable')}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Phone className="w-4 h-4 text-muted-foreground" />
                                                    {request.user?.phone || t('common.notAvailable')}
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
                                                    {request.user?.status === 'prospect' ? t('staff.reactivationRequests.status.prospect') :
                                                     request.user?.status === 'member' ? t('staff.reactivationRequests.status.member') :
                                                     request.user?.status === 'client' ? t('staff.reactivationRequests.status.client') :
                                                     request.user?.status || t('common.notAvailable')}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {request.user?.assigned_matchmaker?.name ? (
                                                    <span className="text-sm">{request.user.assigned_matchmaker.name}</span>
                                                ) : (
                                                    <span className="text-sm text-muted-foreground">{t('staff.userInfo.noAgency')}</span>
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
                                                    {request.reason || t('staff.reactivationRequests.noReason')}
                                                </p>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="default"
                                                        onClick={() => handleAction(request, 'approve')}
                                                        className="bg-success hover:opacity-90"
                                                    >
                                                        <CheckCircle className="w-4 h-4 mr-1" />
                                                        {t('staff.reactivationRequests.approve')}
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        onClick={() => handleAction(request, 'reject')}
                                                    >
                                                        <XCircle className="w-4 h-4 mr-1" />
                                                        {t('staff.reactivationRequests.reject')}
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
                                {actionType === 'approve' ? t('staff.reactivationRequests.approveDialog.title') : t('staff.reactivationRequests.rejectDialog.title')}
                            </DialogTitle>
                            <DialogDescription>
                                {actionType === 'approve' 
                                    ? t('staff.reactivationRequests.approveDialog.description', { name: selectedRequest?.user?.name || t('staff.reactivationRequests.user') })
                                    : t('staff.reactivationRequests.rejectDialog.description', { name: selectedRequest?.user?.name || t('staff.reactivationRequests.user') })}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="bg-muted p-3 rounded-lg">
                                <p className="text-sm font-semibold mb-2">{t('staff.reactivationRequests.reason')}:</p>
                                <p className="text-sm text-muted-foreground">{selectedRequest?.reason || t('staff.reactivationRequests.noReason')}</p>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="review-notes">
                                    {t('staff.reactivationRequests.reviewNotes')} ({t('common.optional')})
                                </Label>
                                <Textarea
                                    id="review-notes"
                                    value={reviewNotes}
                                    onChange={(e) => setReviewNotes(e.target.value)}
                                    placeholder={actionType === 'approve' ? t('staff.reactivationRequests.approveDialog.reviewNotesPlaceholder') : t('staff.reactivationRequests.rejectDialog.reviewNotesPlaceholder')}
                                    rows={3}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDialogOpen(false)}>
                                {t('common.cancel')}
                            </Button>
                            <Button
                                variant={actionType === 'approve' ? 'default' : 'destructive'}
                                onClick={submitAction}
                                disabled={submitting}
                                className={actionType === 'approve' ? 'bg-success hover:opacity-90' : ''}
                            >
                                {submitting ? (actionType === 'approve' ? t('staff.reactivationRequests.approving') : t('staff.reactivationRequests.rejecting')) : (actionType === 'approve' ? t('staff.reactivationRequests.approveDialog.approveButton') : t('staff.reactivationRequests.rejectDialog.rejectButton'))}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}

