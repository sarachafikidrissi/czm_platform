import { Head, router, usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, Eye, Send, UserPlus, Phone, Mail, Calendar, User, Stethoscope, ChevronLeft, ChevronRight, MessageSquarePlus } from 'lucide-react';

export default function AppointmentRequests() {
    const { t } = useTranslation();
    const { appointmentRequests = [], agencies = [], matchmakers = [], filters = {} } = usePage().props;
    
    const [selectedRequestIds, setSelectedRequestIds] = useState([]);
    const [dispatchOpen, setDispatchOpen] = useState(false);
    const [reassignOpen, setReassignOpen] = useState(false);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [dispatchType, setDispatchType] = useState('agency');
    const [reassignType, setReassignType] = useState('agency');
    const [selectedAgencyId, setSelectedAgencyId] = useState('');
    const [selectedMatchmakerId, setSelectedMatchmakerId] = useState('');
    const [selectedReassignAgencyId, setSelectedReassignAgencyId] = useState('');
    const [selectedReassignMatchmakerId, setSelectedReassignMatchmakerId] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState(filters?.status || 'all');
    const [treatmentStatusFilter, setTreatmentStatusFilter] = useState(filters?.treatment_status || 'all');
    const [dispatchFilter, setDispatchFilter] = useState(filters?.dispatch || 'all');

    // Filter appointment requests
    const filteredRequests = useMemo(() => {
        let filtered = appointmentRequests;

        // Search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(req => 
                req.name?.toLowerCase().includes(query) ||
                req.email?.toLowerCase().includes(query) ||
                req.phone?.toLowerCase().includes(query) ||
                req.city?.toLowerCase().includes(query) ||
                req.country?.toLowerCase().includes(query)
            );
        }

        // Status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter(req => req.status === statusFilter);
        }

        // Treatment status filter
        if (treatmentStatusFilter !== 'all') {
            filtered = filtered.filter(req => req.treatment_status === treatmentStatusFilter);
        }

        // Dispatch filter
        if (dispatchFilter === 'dispatched') {
            filtered = filtered.filter(req => req.assigned_agency_id || req.assigned_matchmaker_id);
        } else if (dispatchFilter === 'not_dispatched') {
            filtered = filtered.filter(req => !req.assigned_agency_id && !req.assigned_matchmaker_id);
        }

        return filtered;
    }, [appointmentRequests, searchQuery, statusFilter, treatmentStatusFilter, dispatchFilter]);

    // Statistics
    const stats = useMemo(() => {
        const pending = appointmentRequests.filter(r => r.treatment_status === 'pending').length;
        const done = appointmentRequests.filter(r => r.treatment_status === 'done').length;
        return { pending, done, total: appointmentRequests.length };
    }, [appointmentRequests]);

    // Get requests that can be reassigned (dispatched + pending treatment)
    const reassignableRequests = useMemo(() => {
        return appointmentRequests
            .filter(r => r.status === 'dispatched' && r.treatment_status === 'pending')
            .map(r => r.id);
    }, [appointmentRequests]);

    // Check if selected requests are valid for reassign
    const hasValidReassignSelection = useMemo(() => {
        return selectedRequestIds.length > 0 && 
               selectedRequestIds.every(id => reassignableRequests.includes(id));
    }, [selectedRequestIds, reassignableRequests]);

    const handleViewDetails = (request) => {
        setSelectedRequest(request);
        setDetailsOpen(true);
    };

    const handleDispatch = () => {
        if (selectedRequestIds.length === 0) return;
        if (dispatchType === 'agency' && !selectedAgencyId) return;
        if (dispatchType === 'matchmaker' && !selectedMatchmakerId) return;

        const payload = {
            appointment_request_ids: selectedRequestIds,
            dispatch_type: dispatchType,
        };

        if (dispatchType === 'agency') {
            payload.agency_id = parseInt(selectedAgencyId);
        } else {
            payload.matchmaker_id = parseInt(selectedMatchmakerId);
        }

        router.post('/admin/appointment-requests/dispatch', payload, {
            onSuccess: () => {
                setDispatchOpen(false);
                setSelectedAgencyId('');
                setSelectedMatchmakerId('');
                setSelectedRequestIds([]);
                setDispatchType('agency');
            }
        });
    };

    const handleReassign = () => {
        if (selectedRequestIds.length === 0) return;
        if (reassignType === 'agency' && !selectedReassignAgencyId) return;
        if (reassignType === 'matchmaker' && !selectedReassignMatchmakerId) return;

        // Only send reassignable requests
        const validIds = selectedRequestIds.filter(id => reassignableRequests.includes(id));
        if (validIds.length === 0) return;

        const payload = {
            appointment_request_ids: validIds,
            reassign_type: reassignType,
        };

        if (reassignType === 'agency') {
            payload.agency_id = parseInt(selectedReassignAgencyId);
        } else {
            payload.matchmaker_id = parseInt(selectedReassignMatchmakerId);
        }

        router.post('/admin/appointment-requests/reassign', payload, {
            onSuccess: () => {
                setReassignOpen(false);
                setSelectedReassignAgencyId('');
                setSelectedReassignMatchmakerId('');
                setSelectedRequestIds([]);
                setReassignType('agency');
            }
        });
    };

    const handleConvertToProspect = (request) => {
        if (confirm('Are you sure you want to convert this appointment request to a prospect?')) {
            router.post(`/admin/appointment-requests/${request.id}/convert`, {}, {
                onSuccess: () => {
                    router.reload();
                }
            });
        }
    };

    const toggleRequest = (id) => {
        setSelectedRequestIds(prev => 
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const toggleAll = () => {
        if (selectedRequestIds.length === filteredRequests.length) {
            setSelectedRequestIds([]);
        } else {
            setSelectedRequestIds(filteredRequests.map(r => r.id));
        }
    };

    const getStatusBadge = (status) => {
        const variants = {
            pending: 'default',
            dispatched: 'secondary',
            converted: 'success',
            cancelled: 'destructive',
        };
        return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
    };

    const getTreatmentStatusBadge = (status) => {
        return status === 'done' 
            ? <Badge variant="success" className="bg-green-500">Done</Badge>
            : <Badge variant="default">Pending</Badge>;
    };

    return (
        <AppLayout>
            <Head title="Appointment Requests" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Appointment Requests</CardTitle>
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
                                <Label>Status</Label>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All</SelectItem>
                                        <SelectItem value="pending">Pending</SelectItem>
                                        <SelectItem value="dispatched">Dispatched</SelectItem>
                                        <SelectItem value="converted">Converted</SelectItem>
                                        <SelectItem value="cancelled">Cancelled</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2 w-[180px]">
                                <Label>Treatment Status</Label>
                                <Select value={treatmentStatusFilter} onValueChange={setTreatmentStatusFilter}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All</SelectItem>
                                        <SelectItem value="pending">Pending</SelectItem>
                                        <SelectItem value="done">Done</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2 w-[180px]">
                                <Label>Dispatch</Label>
                                <Select value={dispatchFilter} onValueChange={setDispatchFilter}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All</SelectItem>
                                        <SelectItem value="dispatched">Dispatched</SelectItem>
                                        <SelectItem value="not_dispatched">Not Dispatched</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="mb-4 flex gap-2">
                            <Button
                                onClick={() => setDispatchOpen(true)}
                                disabled={selectedRequestIds.length === 0}
                            >
                                <Send className="mr-2 h-4 w-4" />
                                Dispatch ({selectedRequestIds.length})
                            </Button>
                            <Button
                                onClick={() => setReassignOpen(true)}
                                disabled={!hasValidReassignSelection}
                                variant="outline"
                            >
                                <Send className="mr-2 h-4 w-4" />
                                Reassign ({selectedRequestIds.filter(id => reassignableRequests.includes(id)).length})
                            </Button>
                        </div>

                        {/* Table */}
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-12">
                                            <input
                                                type="checkbox"
                                                checked={selectedRequestIds.length === filteredRequests.length && filteredRequests.length > 0}
                                                onChange={toggleAll}
                                            />
                                        </TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Phone</TableHead>
                                        <TableHead>City</TableHead>
                                        <TableHead>Country</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Treatment</TableHead>
                                        <TableHead>Assigned To</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredRequests.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                                                No appointment requests found
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredRequests.map((request) => (
                                            <TableRow key={request.id}>
                                                <TableCell>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedRequestIds.includes(request.id)}
                                                        onChange={() => toggleRequest(request.id)}
                                                    />
                                                </TableCell>
                                                <TableCell>{request.name}</TableCell>
                                                <TableCell>{request.email}</TableCell>
                                                <TableCell>{request.phone}</TableCell>
                                                <TableCell>{request.city || '-'}</TableCell>
                                                <TableCell>{request.country || '-'}</TableCell>
                                                <TableCell>{getStatusBadge(request.status)}</TableCell>
                                                <TableCell>{getTreatmentStatusBadge(request.treatment_status)}</TableCell>
                                                <TableCell>
                                                    {request.assigned_matchmaker_id 
                                                        ? `Matchmaker: ${request.assigned_matchmaker?.name || 'N/A'}`
                                                        : request.assigned_agency_id
                                                        ? `Agency: ${request.assigned_agency?.name || 'N/A'}`
                                                        : '-'}
                                                </TableCell>
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
                                                        {request.status !== 'converted' && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleConvertToProspect(request)}
                                                            >
                                                                <UserPlus className="h-4 w-4" />
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

            {/* Dispatch Dialog */}
            <Dialog open={dispatchOpen} onOpenChange={setDispatchOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Dispatch Appointment Requests</DialogTitle>
                        <DialogDescription>
                            Select where to dispatch {selectedRequestIds.length} appointment request(s)
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>Dispatch Type</Label>
                            <Select value={dispatchType} onValueChange={setDispatchType}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="agency">Agency</SelectItem>
                                    <SelectItem value="matchmaker">Matchmaker</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {dispatchType === 'agency' && (
                            <div>
                                <Label>Agency</Label>
                                <Select value={selectedAgencyId} onValueChange={setSelectedAgencyId}>
                                    <SelectTrigger><SelectValue placeholder="Select agency" /></SelectTrigger>
                                    <SelectContent>
                                        {agencies.map(agency => (
                                            <SelectItem key={agency.id} value={agency.id.toString()}>
                                                {agency.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        {dispatchType === 'matchmaker' && (
                            <div>
                                <Label>Matchmaker</Label>
                                <Select value={selectedMatchmakerId} onValueChange={setSelectedMatchmakerId}>
                                    <SelectTrigger><SelectValue placeholder="Select matchmaker" /></SelectTrigger>
                                    <SelectContent>
                                        {matchmakers.map(matchmaker => (
                                            <SelectItem key={matchmaker.id} value={matchmaker.id.toString()}>
                                                {matchmaker.name} ({matchmaker.agency?.name || 'No Agency'})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDispatchOpen(false)}>Cancel</Button>
                        <Button onClick={handleDispatch}>Dispatch</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reassign Dialog */}
            <Dialog open={reassignOpen} onOpenChange={setReassignOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reassign Appointment Requests</DialogTitle>
                        <DialogDescription>
                            Reassign {selectedRequestIds.filter(id => reassignableRequests.includes(id)).length} appointment request(s) to a different agency or matchmaker. Only dispatched and pending requests can be reassigned.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>Reassign Type</Label>
                            <Select value={reassignType} onValueChange={(value) => {
                                setReassignType(value);
                                setSelectedReassignAgencyId('');
                                setSelectedReassignMatchmakerId('');
                            }}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="agency">Agency</SelectItem>
                                    <SelectItem value="matchmaker">Matchmaker</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {reassignType === 'agency' && (
                            <div>
                                <Label>Agency</Label>
                                <Select value={selectedReassignAgencyId} onValueChange={setSelectedReassignAgencyId}>
                                    <SelectTrigger><SelectValue placeholder="Select agency" /></SelectTrigger>
                                    <SelectContent>
                                        {agencies.map(agency => (
                                            <SelectItem key={agency.id} value={agency.id.toString()}>
                                                {agency.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        {reassignType === 'matchmaker' && (
                            <div>
                                <Label>Matchmaker</Label>
                                <Select value={selectedReassignMatchmakerId} onValueChange={setSelectedReassignMatchmakerId}>
                                    <SelectTrigger><SelectValue placeholder="Select matchmaker" /></SelectTrigger>
                                    <SelectContent>
                                        {matchmakers.map(matchmaker => (
                                            <SelectItem key={matchmaker.id} value={matchmaker.id.toString()}>
                                                {matchmaker.name} ({matchmaker.agency?.name || 'No Agency'})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setReassignOpen(false)}>Cancel</Button>
                        <Button 
                            onClick={handleReassign}
                            disabled={
                                (reassignType === 'agency' && !selectedReassignAgencyId) || 
                                (reassignType === 'matchmaker' && !selectedReassignMatchmakerId)
                            }
                        >
                            Reassign
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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
                                            <MessageSquarePlus className="h-4 w-4" />                                                Message Supplementaire
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

                                        {/* Appointment Type */}
                                        <div>
                                            <Label className="text-sm font-medium mb-3 flex items-center gap-2">
                                                <User className="h-4 w-4" />
                                                Appointment Type
                                            </Label>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-muted-foreground">Chat WhatsApp</span>
                                                <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                                                </svg>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                    <DialogFooter>
                        <Button onClick={() => setDetailsOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

