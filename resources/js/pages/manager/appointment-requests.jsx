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
import { Search, Eye, Send, Phone, Mail, Calendar, User, Stethoscope, ChevronLeft, ChevronRight, MessageSquarePlus } from 'lucide-react';

export default function AppointmentRequests() {
    const { t } = useTranslation();
    const { appointmentRequests = [], treatmentStatusFilter = 'all', statistics = {}, matchmakers = [] } = usePage().props;
    
    const [selectedRequestIds, setSelectedRequestIds] = useState([]);
    const [dispatchOpen, setDispatchOpen] = useState(false);
    const [selectedMatchmakerId, setSelectedMatchmakerId] = useState('');
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState(treatmentStatusFilter);

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

    const handleViewDetails = (request) => {
        setSelectedRequest(request);
        setDetailsOpen(true);
    };

    const getTreatmentStatusBadge = (status) => {
        return status === 'done' 
            ? <Badge variant="success" className="bg-green-500">Done</Badge>
            : <Badge variant="default" className="bg-yellow-500">Pending</Badge>;
    };

    // Get agency-only requests (can be dispatched to matchmakers)
    const agencyOnlyRequests = useMemo(() => {
        return appointmentRequests
            .filter(r => r.assigned_agency_id && !r.assigned_matchmaker_id && r.treatment_status === 'pending')
            .map(r => r.id);
    }, [appointmentRequests]);

    // Check if selected requests are valid for dispatch (agency-only + pending)
    const hasValidDispatchSelection = useMemo(() => {
        return selectedRequestIds.length > 0 && 
               selectedRequestIds.every(id => agencyOnlyRequests.includes(id));
    }, [selectedRequestIds, agencyOnlyRequests]);

    const toggleRequest = (id) => {
        setSelectedRequestIds(prev => 
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const toggleAll = () => {
        const agencyOnlyIds = filteredRequests
            .filter(r => agencyOnlyRequests.includes(r.id))
            .map(r => r.id);
        
        if (selectedRequestIds.length === agencyOnlyIds.length && 
            selectedRequestIds.every(id => agencyOnlyIds.includes(id))) {
            setSelectedRequestIds([]);
        } else {
            setSelectedRequestIds(agencyOnlyIds);
        }
    };

    const handleDispatch = () => {
        if (selectedRequestIds.length === 0 || !selectedMatchmakerId) return;

        // Only send agency-only requests
        const validIds = selectedRequestIds.filter(id => agencyOnlyRequests.includes(id));
        if (validIds.length === 0) return;

        router.post('/manager/appointment-requests/dispatch', {
            appointment_request_ids: validIds,
            matchmaker_id: parseInt(selectedMatchmakerId),
        }, {
            onSuccess: () => {
                setDispatchOpen(false);
                setSelectedMatchmakerId('');
                setSelectedRequestIds([]);
            }
        });
    };

    return (
        <AppLayout>
            <Head title="Agency Appointment Requests" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Appointment Requests - My Agency</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {/* Statistics */}
                        <div className="mb-6 grid grid-cols-3 gap-4">
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="text-2xl font-bold">{statistics.total || 0}</div>
                                    <p className="text-sm text-muted-foreground">Total Requests</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="text-2xl font-bold text-yellow-600">{statistics.pending || 0}</div>
                                    <p className="text-sm text-muted-foreground">Pending</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="text-2xl font-bold text-green-600">{statistics.done || 0}</div>
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
                                <Select value={filter} onValueChange={(value) => {
                                    setFilter(value);
                                    router.get(route('manager.appointment-requests'), { treatment_status: value }, {
                                        preserveState: true,
                                        preserveScroll: true,
                                    });
                                }}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All</SelectItem>
                                        <SelectItem value="pending">Pending</SelectItem>
                                        <SelectItem value="done">Done</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="mb-4 flex gap-2">
                            <Button
                                onClick={() => setDispatchOpen(true)}
                                disabled={!hasValidDispatchSelection}
                            >
                                <Send className="mr-2 h-4 w-4" />
                                Dispatch to Matchmaker ({selectedRequestIds.filter(id => agencyOnlyRequests.includes(id)).length})
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
                                                checked={selectedRequestIds.length > 0 && 
                                                    selectedRequestIds.every(id => agencyOnlyRequests.includes(id)) &&
                                                    filteredRequests.filter(r => agencyOnlyRequests.includes(r.id)).length > 0 &&
                                                    selectedRequestIds.length === filteredRequests.filter(r => agencyOnlyRequests.includes(r.id)).length}
                                                onChange={toggleAll}
                                            />
                                        </TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Phone</TableHead>
                                        <TableHead>City</TableHead>
                                        <TableHead>Country</TableHead>
                                        <TableHead>Reason</TableHead>
                                        <TableHead>Matchmaker</TableHead>
                                        <TableHead>Status</TableHead>
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
                                                        disabled={!agencyOnlyRequests.includes(request.id)}
                                                    />
                                                </TableCell>
                                                <TableCell className="font-medium">{request.name}</TableCell>
                                                <TableCell>{request.email}</TableCell>
                                                <TableCell>{request.phone}</TableCell>
                                                <TableCell>{request.city || '-'}</TableCell>
                                                <TableCell>{request.country || '-'}</TableCell>
                                                <TableCell className="max-w-xs truncate">{request.reason || '-'}</TableCell>
                                                <TableCell>
                                                    {request.assigned_matchmaker?.name || (request.assigned_agency_id && !request.assigned_matchmaker_id ? 'Unassigned' : '-')}
                                                </TableCell>
                                                <TableCell>{getTreatmentStatusBadge(request.treatment_status)}</TableCell>
                                                <TableCell>{new Date(request.created_at).toLocaleDateString()}</TableCell>
                                                <TableCell>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleViewDetails(request)}
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
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
                            Select a matchmaker to dispatch {selectedRequestIds.filter(id => agencyOnlyRequests.includes(id)).length} appointment request(s)
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>Matchmaker</Label>
                            <Select value={selectedMatchmakerId} onValueChange={setSelectedMatchmakerId}>
                                <SelectTrigger><SelectValue placeholder="Select matchmaker" /></SelectTrigger>
                                <SelectContent>
                                    {matchmakers.map(matchmaker => (
                                        <SelectItem key={matchmaker.id} value={matchmaker.id.toString()}>
                                            {matchmaker.name} {matchmaker.email ? `(${matchmaker.email})` : ''}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDispatchOpen(false)}>Cancel</Button>
                        <Button 
                            onClick={handleDispatch}
                            disabled={!selectedMatchmakerId}
                        >
                            Dispatch
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

                                       
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDetailsOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

