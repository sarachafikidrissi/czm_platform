import { Head, router, usePage, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Users, UserCheck, Edit, Shield } from 'lucide-react';
import CreateStaffButton from '@/components/admin/create-staff-button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';

export default function AdminDashboard() {
    const { t } = useTranslation();
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
    const [roleEditingUser, setRoleEditingUser] = useState(null);
    const [selectedRoles, setSelectedRoles] = useState([]);

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

    const handleEditRole = (user) => {
        setRoleEditingUser(user);
        const roles = Array.isArray(user.roles) ? user.roles.map((r) => r.name) : [];
        // Allow toggling manager, matchmaker, and admin in UI
        setSelectedRoles(roles.filter((r) => r === 'manager' || r === 'matchmaker' || r === 'admin'));
    };

    const handleUpdateRole = () => {
        if (!roleEditingUser || selectedRoles.length === 0) return;
        router.post(`/admin/users/${roleEditingUser.id}/update-role`, { roles: selectedRoles }, {
            onSuccess: () => {
                setRoleEditingUser(null);
                setSelectedRoles([]);
            }
        });
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'approved':
                return <Badge className="bg-success-bg text-success">{t('admin.dashboard.status.approved')}</Badge>;
            case 'pending':
                return <Badge className="bg-warning-light text-warning-foreground">{t('admin.dashboard.status.pending')}</Badge>;
            case 'rejected':
                return <Badge className="bg-error-bg text-error">{t('admin.dashboard.status.rejected')}</Badge>;
            default:
                return <Badge className="bg-muted text-muted-foreground">{status}</Badge>;
        }
    };

    return (
        <AppLayout>
            <Head title={t('admin.dashboard.title')} />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
            <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                    <h1 className="text-2xl font-bold">{t('admin.dashboard.title')}</h1>
                    <div className="flex items-center gap-2">
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="outline">{t('admin.dashboard.addService')}</Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                                <DialogHeader>
                                    <DialogTitle>{t('admin.dashboard.addServiceTitle')}</DialogTitle>
                                    <DialogDescription>
                                        {t('admin.dashboard.addServiceDescription')}
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="service-name">{t('admin.dashboard.serviceName')}</Label>
                                        <Input id="service-name" value={svcData.name} onChange={(e) => setSvcData('name', e.target.value)} placeholder={t('admin.dashboard.serviceNamePlaceholder')} />
                                        {svcErrors.name && <p className="text-red-500 text-sm">{svcErrors.name}</p>}
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => resetSvc()}>{t('common.cancel')}</Button>
                                    <Button onClick={submitService} disabled={svcProcessing || !svcData.name.trim()}>{t('admin.dashboard.add')}</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                        <CreateStaffButton agencies={agencies} />
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 bg-white rounded-lg p-3 border">
                    <div className="flex items-center gap-2">
                        <Label className="text-sm text-muted-foreground">{t('admin.dashboard.view')}</Label>
                        <Select value={viewParam} onValueChange={(v) => router.visit(`/admin/dashboard?view=${v}`, { preserveScroll: true, preserveState: true, replace: true })}>
                            <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="managers">{t('admin.dashboard.managers')}</SelectItem>
                                <SelectItem value="matchmakers">{t('admin.dashboard.matchmakers')}</SelectItem>
                                <SelectItem value="pending">{t('admin.dashboard.pending')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <Separator orientation="vertical" className="h-6" />
                    <Input placeholder={t('admin.dashboard.search')} className="h-9 w-[220px]" />
                    <div className="ml-auto flex items-center gap-2">
                        <Button variant="outline" className="h-9">
                            {t('admin.dashboard.dateRange')}
                        </Button>
                        <Button variant="outline" className="h-9">
                            {t('admin.dashboard.filter')}
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
                            {t('admin.dashboard.managers')}
                        </CardTitle>
                        <CardDescription>
                            {t('admin.dashboard.manageManagerAccounts')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className={viewParam !== 'managers' ? 'hidden' : ''}>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-10"></TableHead>
                                    <TableHead>{t('admin.dashboard.name')}</TableHead>
                                    <TableHead>{t('admin.dashboard.date')}</TableHead>
                                    <TableHead>{t('admin.dashboard.agency')}</TableHead>
                                    <TableHead>{t('admin.dashboard.role')}</TableHead>
                                    <TableHead className="text-right">{t('admin.dashboard.actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {managers.map((manager) => (
                                    <TableRow key={manager.id}>
                                        <TableCell><input type="checkbox" className="accent-neutral-800" /></TableCell>
                                        <TableCell className="font-medium">{manager.name}</TableCell>
                                        <TableCell className="text-muted-foreground">{new Date(manager.created_at ?? Date.now()).toLocaleDateString()}</TableCell>
                                        <TableCell>{manager.agency?.name || manager.agency || t('admin.dashboard.noAgency')}</TableCell>
                                        <TableCell><Badge className="bg-neutral-100 text-neutral-800 capitalize">{t('admin.dashboard.manager')}</Badge></TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex space-x-2 justify-end">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleEditAgency(manager)}
                                                    className="text-info hover:opacity-80"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleEditRole(manager)}
                                                    className="text-purple-600 hover:text-purple-700"
                                                >
                                                    <Shield className="w-4 h-4" />
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
                            {t('admin.dashboard.matchmakers')}
                        </CardTitle>
                        <CardDescription>
                            {t('admin.dashboard.manageMatchmakerAccounts')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className={viewParam !== 'matchmakers' ? 'hidden' : ''}>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-10"></TableHead>
                                    <TableHead>{t('admin.dashboard.name')}</TableHead>
                                    <TableHead>{t('admin.dashboard.date')}</TableHead>
                                    <TableHead>{t('admin.dashboard.agency')}</TableHead>
                                    <TableHead>{t('admin.dashboard.role')}</TableHead>
                                    <TableHead className="text-right">{t('admin.dashboard.actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {matchmakers.map((matchmaker) => (
                                    <TableRow key={matchmaker.id}>
                                        <TableCell><input type="checkbox" className="accent-neutral-800" /></TableCell>
                                        <TableCell className="font-medium">{matchmaker.name}</TableCell>
                                        <TableCell className="text-muted-foreground">{new Date(matchmaker.created_at ?? Date.now()).toLocaleDateString()}</TableCell>
                                        <TableCell>{matchmaker.agency?.name || matchmaker.agency || t('admin.dashboard.noAgency')}</TableCell>
                                        <TableCell><Badge className="bg-neutral-100 text-neutral-800 capitalize">{t('admin.dashboard.matchmaker')}</Badge></TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex space-x-2 justify-end">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleEditAgency(matchmaker)}
                                                    className="text-info hover:opacity-80"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleEditRole(matchmaker)}
                                                    className="text-purple-600 hover:text-purple-700"
                                                >
                                                    <Shield className="w-4 h-4" />
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
                        <DialogTitle>{t('admin.dashboard.editAgency')}</DialogTitle>
                        <DialogDescription>
                            {t('admin.dashboard.editAgencyDescription', { name: editingUser?.name })}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="agency">{t('admin.dashboard.selectAgency')}</Label>
                            <Select value={selectedAgency} onValueChange={setSelectedAgency}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t('admin.dashboard.selectAgencyPlaceholder')} />
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
                            {t('common.cancel')}
                        </Button>
                        <Button onClick={handleUpdateAgency} disabled={!selectedAgency}>
                            {t('admin.dashboard.updateAgency')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Role Modal */}
            <Dialog open={!!roleEditingUser} onOpenChange={() => setRoleEditingUser(null)}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{t('admin.dashboard.changeRole')}</DialogTitle>
                        <DialogDescription>
                            {t('admin.dashboard.changeRoleDescription', { name: roleEditingUser?.name })}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>{t('admin.dashboard.selectRoles')}</Label>
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={selectedRoles.includes('manager')}
                                    onChange={(e) => {
                                        setSelectedRoles((prev) => e.target.checked ? Array.from(new Set([...prev, 'manager'])) : prev.filter(r => r !== 'manager'));
                                    }}
                                />
                                <span>{t('admin.dashboard.manager')}</span>
                            </label>
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={selectedRoles.includes('matchmaker')}
                                    onChange={(e) => {
                                        setSelectedRoles((prev) => e.target.checked ? Array.from(new Set([...prev, 'matchmaker'])) : prev.filter(r => r !== 'matchmaker'));
                                    }}
                                />
                                <span>{t('admin.dashboard.matchmaker')}</span>
                            </label>
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={selectedRoles.includes('admin')}
                                    onChange={(e) => {
                                        setSelectedRoles((prev) => e.target.checked ? Array.from(new Set([...prev, 'admin'])) : prev.filter(r => r !== 'admin'));
                                    }}
                                />
                                <span>{t('admin.dashboard.admin')}</span>
                            </label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRoleEditingUser(null)}>
                            {t('common.cancel')}
                        </Button>
                        <Button onClick={handleUpdateRole} disabled={selectedRoles.length === 0}>
                            {t('admin.dashboard.updateRole')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
