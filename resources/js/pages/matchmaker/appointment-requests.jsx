import { Head, router, usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, Eye, CheckCircle, Phone, Mail, Calendar, User, Stethoscope, ChevronLeft, ChevronRight, MessageSquarePlus } from 'lucide-react';

export default function AppointmentRequests() {
    const { t } = useTranslation();
    const { showToast } = useToast();
    const { appointmentRequests = [], treatmentStatusFilter = 'all' } = usePage().props;
    
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState(treatmentStatusFilter);
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [requestToMarkDone, setRequestToMarkDone] = useState(null);

    // Filter appointment requests
    const filteredRequests = useMemo(() => {
        let filtered = appointmentRequests;

        // Treatment status filter
        if (filter !== 'all') {
            filtered = filtered.filter(req => req.treatment_status === filter);
        }

        // Search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(req => 
                req.name?.toLowerCase().includes(query) ||
                req.email?.toLowerCase().includes(query) ||
                req.phone?.toLowerCase().includes(query) ||
                req.city?.toLowerCase().includes(query) ||
                req.reason?.toLowerCase().includes(query)
            );
        }

        return filtered;
    }, [appointmentRequests, searchQuery, filter]);

    // Statistics
    const stats = useMemo(() => {
        const pending = appointmentRequests.filter(r => r.treatment_status === 'pending').length;
        const done = appointmentRequests.filter(r => r.treatment_status === 'done').length;
        return { pending, done, total: appointmentRequests.length };
    }, [appointmentRequests]);

    const handleViewDetails = (request) => {
        setSelectedRequest(request);
        setDetailsOpen(true);
    };

    const handleMarkAsDone = (request) => {
        setRequestToMarkDone(request);
        setConfirmDialogOpen(true);
    };

    const confirmMarkAsDone = () => {
        if (requestToMarkDone) {
            router.post(`/staff/appointment-requests/${requestToMarkDone.id}/mark-done`, {}, {
                onSuccess: () => {
                    showToast('Success', 'Appointment request marked as done', 'success');
                    setConfirmDialogOpen(false);
                    setRequestToMarkDone(null);
                    router.reload();
                },
                onError: (errors) => {
                    showToast('Error', 'Failed to mark appointment request as done', 'error');
                }
            });
        }
    };

    const getTreatmentStatusBadge = (status) => {
        return status === 'done' 
            ? <Badge variant="success" className="bg-green-500">Done</Badge>
            : <Badge variant="default" className="bg-yellow-500">Pending</Badge>;
    };

    return (
        <AppLayout>
            <Head title="Appointment Requests" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <Card>
                    <CardHeader>
                        <CardTitle>My Appointment Requests</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {/* Statistics */}
                        <div className="mb-6 grid grid-cols-3 gap-4">
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="text-2xl font-bold">{stats.total}</div>
                                    <p className="text-sm text-muted-foreground">Total Requests</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                                    <p className="text-sm text-muted-foreground">Pending</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="text-2xl font-bold text-green-600">{stats.done}</div>
                                    <p className="text-sm text-muted-foreground">Done</p>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Filters */}
                        <div className="mb-4 flex flex-wrap items-end gap-4">
                            <div className="flex-1 min-w-[200px]">
                                <Label>Search</Label>
                                <div className="relative">
                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search by name, email, phone..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-8"
                                    />
                                </div>
                            </div>
                            <div className="grid gap-2 w-[180px]">
                                <Label>Treatment Status</Label>
                                <Select value={filter} onValueChange={setFilter}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All</SelectItem>
                                        <SelectItem value="pending">Pending</SelectItem>
                                        <SelectItem value="done">Done</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Phone</TableHead>
                                        <TableHead>City</TableHead>
                                        <TableHead>Country</TableHead>
                                        <TableHead>Reason</TableHead>
                                        <TableHead>Preferred Date</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredRequests.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                                                No appointment requests found
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredRequests.map((request) => (
                                            <TableRow key={request.id}>
                                                <TableCell className="font-medium">{request.name}</TableCell>
                                                <TableCell>{request.email}</TableCell>
                                                <TableCell>{request.phone}</TableCell>
                                                <TableCell>{request.city || '-'}</TableCell>
                                                <TableCell>{request.country || '-'}</TableCell>
                                                <TableCell className="max-w-xs truncate">{request.reason || '-'}</TableCell>
                                                <TableCell>
                                                    {request.preferred_date 
                                                        ? new Date(request.preferred_date).toLocaleDateString()
                                                        : '-'}
                                                </TableCell>
                                                <TableCell>{getTreatmentStatusBadge(request.treatment_status)}</TableCell>
                                                <TableCell>{new Date(request.created_at).toLocaleDateString()}</TableCell>
                                                <TableCell>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleViewDetails(request)}
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                        {request.treatment_status === 'pending' && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleMarkAsDone(request)}
                                                                className="text-green-600 hover:text-green-700"
                                                            >
                                                                <CheckCircle className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Details Dialog */}
            <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader className="border-b pb-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <DialogTitle className="text-2xl font-semibold">Request Appointment</DialogTitle>
                                {selectedRequest && (
                                    <span className="text-sm text-muted-foreground">#{String(selectedRequest.id).padStart(6, '0')}</span>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="sm">
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="text-sm text-muted-foreground">1 of 1</span>
                                <Button variant="ghost" size="sm">
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </DialogHeader>
                    {selectedRequest && (
                        <div className="space-y-6 py-4">
                            {/* Personal Detail Section */}
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="space-y-6">
                                        {/* Profile Picture and Name */}
                                        <div className="flex items-start gap-4">
                                            <div className="h-20 w-20 rounded-full overflow-hidden border-2 border-gray-200 bg-gray-100 flex items-center justify-center">
                                                {selectedRequest.name ? (
                                                    <span className="text-2xl font-bold text-gray-600">
                                                        {selectedRequest.name.charAt(0).toUpperCase()}
                                                    </span>
                                                ) : (
                                                    <User className="h-10 w-10 text-gray-400" />
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="text-xl font-semibold mb-2">{selectedRequest.name}</h3>
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                        <Phone className="h-4 w-4" />
                                                        <span>{selectedRequest.phone}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                        <Mail className="h-4 w-4" />
                                                        <span>{selectedRequest.email}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Reason */}
                                        <div>
                                            <Label className="text-sm font-medium mb-2 block">Reason</Label>
                                            <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-gray-50 p-3 rounded-md">
                                                {selectedRequest.reason || '-'}
                                            </p>
                                        </div>

                                        {/* Diagnose */}
                                        <div>
                                            <Label className="text-sm font-medium mb-3 flex items-center gap-2">
                                                <MessageSquarePlus className="h-4 w-4" />
                                                Message Supplementaire
                                            </Label>
                                            <div className="text-sm text-muted-foreground bg-gray-50 p-3 rounded-md whitespace-pre-wrap">
                                                {selectedRequest.message || '-'}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Booking Information Section */}
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="grid grid-cols-2 gap-6">
                                        {/* Date */}
                                        <div>
                                            <Label className="text-sm font-medium mb-3 flex items-center gap-2">
                                                <Calendar className="h-4 w-4" />
                                                Date
                                            </Label>
                                            <p className="text-sm text-muted-foreground">
                                                {selectedRequest.preferred_date ? (
                                                    (() => {
                                                        const date = new Date(selectedRequest.preferred_date);
                                                        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                                                        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                                                        const dayName = days[date.getDay()];
                                                        const day = date.getDate();
                                                        const month = months[date.getMonth()];
                                                        const hours = date.getHours();
                                                        const minutes = date.getMinutes();
                                                        const ampm = hours >= 12 ? 'PM' : 'AM';
                                                        const displayHours = hours % 12 || 12;
                                                        const nextHour = (hours + 1) % 12 || 12;
                                                        const formattedMinutes = minutes.toString().padStart(2, '0');
                                                        const nextMinutes = minutes.toString().padStart(2, '0');
                                                        return `${dayName}, ${day} ${month}, ${displayHours.toString().padStart(2, '0')}.${formattedMinutes} ${ampm} - ${nextHour.toString().padStart(2, '0')}.${nextMinutes} ${ampm}`;
                                                    })()
                                                ) : (
                                                    'Not specified'
                                                )}
                                            </p>
                                        </div>

                                       
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                    <DialogFooter>
                        {selectedRequest?.treatment_status === 'pending' && (
                            <Button
                                onClick={() => {
                                    setDetailsOpen(false);
                                    handleMarkAsDone(selectedRequest);
                                }}
                                className="bg-green-600 hover:bg-green-700"
                            >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Mark as Done
                            </Button>
                        )}
                        <Button variant="outline" onClick={() => setDetailsOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Mark as Done Confirmation Dialog */}
            <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Mark as Done</DialogTitle>
                        <DialogDescription>
                            Mark this appointment request as done?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setConfirmDialogOpen(false);
                                setRequestToMarkDone(null);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={confirmMarkAsDone}
                        >
                            Confirm
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

