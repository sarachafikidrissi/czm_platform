import { Head, router, usePage, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Users, UserCheck } from 'lucide-react';
import CreateStaffButton from '@/components/admin/create-staff-button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';

export default function AdminDashboard() {
    const { managers, matchmakers } = usePage().props;
    const url = usePage().url;
    const viewParam = (() => {
        const qIndex = url.indexOf('?');
        if (qIndex === -1) return 'managers';
        const params = new URLSearchParams(url.slice(qIndex + 1));
        return params.get('view') || 'managers';
    })();

    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        phone: '',
        role: 'manager',
        agency: '',
    });

    const handleApprove = (id) => {
        router.post(`/admin/users/${id}/approve`);
    };

    const handleReject = (id) => {
        router.post(`/admin/users/${id}/reject`);
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
                    <CreateStaffButton />
                </div>
                <div className="flex flex-wrap items-center gap-3 bg-white rounded-lg p-3 border">
                    <div className="flex items-center gap-2">
                        <Label className="text-sm text-muted-foreground">View</Label>
                        <Select defaultValue="all">
                            <SelectTrigger className="h-9 w-[120px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All</SelectItem>
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
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {managers.map((manager) => (
                                    <TableRow key={manager.id}>
                                        <TableCell><input type="checkbox" className="accent-neutral-800" /></TableCell>
                                        <TableCell className="font-medium">{manager.name}</TableCell>
                                        <TableCell className="text-muted-foreground">{new Date(manager.created_at ?? Date.now()).toLocaleDateString()}</TableCell>
                                        <TableCell>{manager.agency}</TableCell>
                                        <TableCell>{getStatusBadge(manager.approval_status)}</TableCell>
                                        <TableCell className="text-right">
                                            {manager.approval_status === 'pending' && (
                                                <div className="flex space-x-2">
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
                                                </div>
                                            )}
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
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {matchmakers.map((matchmaker) => (
                                    <TableRow key={matchmaker.id}>
                                        <TableCell><input type="checkbox" className="accent-neutral-800" /></TableCell>
                                        <TableCell className="font-medium">{matchmaker.name}</TableCell>
                                        <TableCell className="text-muted-foreground">{new Date(matchmaker.created_at ?? Date.now()).toLocaleDateString()}</TableCell>
                                        <TableCell>{matchmaker.agency}</TableCell>
                                        <TableCell>{getStatusBadge(matchmaker.approval_status)}</TableCell>
                                        <TableCell className="text-right">
                                            {matchmaker.approval_status === 'pending' && (
                                                <div className="flex space-x-2">
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
                                                </div>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
            </div>
        </AppLayout>
    );
}
