import { Head, router, usePage, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Users, UserCheck, Edit } from 'lucide-react';
import CreateStaffButton from '@/components/admin/create-staff-button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';

export default function AdminDashboard() {
    const { managers, matchmakers, agencies } = usePage().props;
    const url = usePage().url;
    const viewParam = (() => {
        const qIndex = url.indexOf('?');
        if (qIndex === -1) return 'managers';
        const params = new URLSearchParams(url.slice(qIndex + 1));
        return params.get('view') || 'managers';
    })();

    const [editingUser, setEditingUser] = useState(null);
    const [selectedAgency, setSelectedAgency] = useState('');

    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        phone: '',
        role: 'manager',
        agency: '',
    });

    // Quick action: Add Service
    const { data: svcData, setData: setSvcData, post: postSvc, processing: svcProcessing, errors: svcErrors, reset: resetSvc } = useForm({
        name: '',
    });
    const submitService = () => {
        postSvc('/admin/services', {
            onSuccess: () => resetSvc(),
        });
    };

    const handleApprove = (id) => {
        router.post(`/admin/users/${id}/approve`);
    };

    const handleReject = (id) => {
        router.post(`/admin/users/${id}/reject`);
    };

    const handleEditAgency = (user) => {
        setEditingUser(user);
        setSelectedAgency(user.agency_id?.toString() || '');
    };

    const handleUpdateAgency = () => {
        if (!editingUser || !selectedAgency) return;
        
        router.post(`/admin/users/${editingUser.id}/update-agency`, {
            agency_id: selectedAgency
        }, {
            onSuccess: () => {
                setEditingUser(null);
                setSelectedAgency('');
            }
        });
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'approved':
                return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
            case 'pending':
                return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
            case 'rejected':
                return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
            default:
                return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
        }
    };

    return (
        <AppLayout>
            <Head title="Admin Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
            <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                    <h1 className="text-2xl font-bold">Admin Dashboard</h1>
                    <div className="flex items-center gap-2">
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="outline">Add Service</Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                                <DialogHeader>
                                    <DialogTitle>Add Service</DialogTitle>
                                    <DialogDescription>
                                        Create a service that can be selected during prospect validation.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="service-name">Service Name</Label>
                                        <Input id="service-name" value={svcData.name} onChange={(e) => setSvcData('name', e.target.value)} placeholder="Ex: Consultation" />
                                        {svcErrors.name && <p className="text-red-500 text-sm">{svcErrors.name}</p>}
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => resetSvc()}>Cancel</Button>
                                    <Button onClick={submitService} disabled={svcProcessing || !svcData.name.trim()}>Add</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                        <CreateStaffButton agencies={agencies} />
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 bg-white rounded-lg p-3 border">
                    <div className="flex items-center gap-2">
                        <Label className="text-sm text-muted-foreground">View</Label>
                        <Select value={viewParam} onValueChange={(v) => router.visit(`/admin/dashboard?view=${v}`, { preserveScroll: true, preserveState: true, replace: true })}>
                            <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="managers">Managers</SelectItem>
                                <SelectItem value="matchmakers">Matchmakers</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <Separator orientation="vertical" className="h-6" />
                    <Input placeholder="Search" className="h-9 w-[220px]" />
                    <div className="ml-auto flex items-center gap-2">
                        <Button variant="outline" className="h-9">
                            Date Range
                        </Button>
                        <Button variant="outline" className="h-9">
                            Filter
                        </Button>
                    </div>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-1">
                {/* Managers Table */}
                <Card className="overflow-hidden">
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <Users className="w-5 h-5 mr-2" />
                            Managers
                        </CardTitle>
                        <CardDescription>
                            Manage manager accounts and approvals
                        </CardDescription>
                    </CardHeader>
                    <CardContent className={viewParam !== 'managers' ? 'hidden' : ''}>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-10"></TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Agency</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {managers.map((manager) => (
                                    <TableRow key={manager.id}>
                                        <TableCell><input type="checkbox" className="accent-neutral-800" /></TableCell>
                                        <TableCell className="font-medium">{manager.name}</TableCell>
                                        <TableCell className="text-muted-foreground">{new Date(manager.created_at ?? Date.now()).toLocaleDateString()}</TableCell>
                                        <TableCell>{manager.agency?.name || manager.agency || 'No Agency'}</TableCell>
                                        <TableCell><Badge className="bg-neutral-100 text-neutral-800 capitalize">manager</Badge></TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex space-x-2 justify-end">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleEditAgency(manager)}
                                                    className="text-blue-600 hover:text-blue-700"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                                {manager.approval_status === 'pending' && (
                                                    <>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleApprove(manager.id)}
                                                            className="text-green-600 hover:text-green-700"
                                                        >
                                                            <CheckCircle className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleReject(manager.id)}
                                                            className="text-red-600 hover:text-red-700"
                                                        >
                                                            <XCircle className="w-4 h-4" />
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Matchmakers Table */}
                <Card className="overflow-hidden">
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <UserCheck className="w-5 h-5 mr-2" />
                            Matchmakers
                        </CardTitle>
                        <CardDescription>
                            Manage matchmaker accounts and approvals
                        </CardDescription>
                    </CardHeader>
                    <CardContent className={viewParam !== 'matchmakers' ? 'hidden' : ''}>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-10"></TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Agency</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {matchmakers.map((matchmaker) => (
                                    <TableRow key={matchmaker.id}>
                                        <TableCell><input type="checkbox" className="accent-neutral-800" /></TableCell>
                                        <TableCell className="font-medium">{matchmaker.name}</TableCell>
                                        <TableCell className="text-muted-foreground">{new Date(matchmaker.created_at ?? Date.now()).toLocaleDateString()}</TableCell>
                                        <TableCell>{matchmaker.agency?.name || matchmaker.agency || 'No Agency'}</TableCell>
                                        <TableCell><Badge className="bg-neutral-100 text-neutral-800 capitalize">matchmaker</Badge></TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex space-x-2 justify-end">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleEditAgency(matchmaker)}
                                                    className="text-blue-600 hover:text-blue-700"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                                {matchmaker.approval_status === 'pending' && (
                                                    <>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleApprove(matchmaker.id)}
                                                            className="text-green-600 hover:text-green-700"
                                                        >
                                                            <CheckCircle className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleReject(matchmaker.id)}
                                                            className="text-red-600 hover:text-red-700"
                                                        >
                                                            <XCircle className="w-4 h-4" />
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
            </div>

            {/* Edit Agency Modal */}
            <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Edit Agency</DialogTitle>
                        <DialogDescription>
                            Change the agency for {editingUser?.name}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="agency">Select Agency</Label>
                            <Select value={selectedAgency} onValueChange={setSelectedAgency}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select an agency" />
                                </SelectTrigger>
                                <SelectContent>
                                    {agencies.map((agency) => (
                                        <SelectItem key={agency.id} value={agency.id.toString()}>
                                            {agency.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingUser(null)}>
                            Cancel
                        </Button>
                        <Button onClick={handleUpdateAgency} disabled={!selectedAgency}>
                            Update Agency
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
