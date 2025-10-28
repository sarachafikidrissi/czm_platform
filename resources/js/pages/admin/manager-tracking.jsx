import { Head, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function ManagerTracking() {
    const { prospects = [], matchmakers = [], status = 'all' } = usePage().props;
    const [selectedStatus, setSelectedStatus] = useState(status);

    const handleStatusFilter = (newStatus) => {
        setSelectedStatus(newStatus);
        router.visit(`/manager/tracking?status=${newStatus}`, { preserveScroll: true, preserveState: true, replace: true });
    };

    const getStatusBadge = (status) => {
        const variants = {
            prospect: 'secondary',
            member: 'default',
            client: 'success'
        };
        return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
    };

    const getDispatchInfo = (prospect) => {
        if (prospect.assigned_matchmaker_id) {
            return (
                <div className="text-sm">
                    <div className="font-medium text-green-600">Assigned to Matchmaker</div>
                    <div className="text-gray-600">{prospect.assigned_matchmaker?.name || 'Unknown'}</div>
                    {prospect.agency_id && (
                        <div className="text-blue-600">Agency: {prospect.agency?.name || 'Unknown'}</div>
                    )}
                </div>
            );
        } else if (prospect.agency_id) {
            return (
                <div className="text-sm">
                    <div className="font-medium text-blue-600">Dispatched to Agency</div>
                    <div className="text-gray-600">{prospect.agency?.name || 'Unknown'}</div>
                </div>
            );
        } else {
            return <span className="text-gray-500 text-sm">Not dispatched</span>;
        }
    };

    return (
        <AppLayout>
            <Head title="Assignment Tracking" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Historical Validation Tracking</CardTitle>
                        <p className="text-sm text-gray-600">
                            View all prospects, members, and clients that were validated when you were the manager in charge. 
                            This includes historical data from all agencies where you served as manager during validation.
                        </p>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-4 mb-6">
                            <div className="grid gap-2 w-[200px]">
                                <Label>Status Filter</Label>
                                <Select value={selectedStatus} onValueChange={handleStatusFilter}>
                                    <SelectTrigger className="h-9">
                                        <SelectValue placeholder="All Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Status</SelectItem>
                                        <SelectItem value="prospect">Prospects</SelectItem>
                                        <SelectItem value="member">Members</SelectItem>
                                        <SelectItem value="client">Clients</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Phone</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Agency</TableHead>
                                    <TableHead>Validated By</TableHead>
                                    <TableHead>Validated Date</TableHead>
                                    <TableHead>Created</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {prospects.map((prospect) => (
                                    <TableRow key={prospect.id}>
                                        <TableCell className="font-medium">{prospect.name}</TableCell>
                                        <TableCell>{prospect.email}</TableCell>
                                        <TableCell>{prospect.phone}</TableCell>
                                        <TableCell>{getStatusBadge(prospect.status)}</TableCell>
                                        <TableCell>{prospect.agency?.name || 'N/A'}</TableCell>
                                        <TableCell>{prospect.assigned_matchmaker?.name || 'N/A'}</TableCell>
                                        <TableCell>{prospect.approved_at ? new Date(prospect.approved_at).toLocaleDateString() : 'N/A'}</TableCell>
                                        <TableCell>{new Date(prospect.created_at).toLocaleDateString()}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>

                        {prospects.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                                No users found that were validated when you were the manager in charge.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
