import { Head, router, usePage, useForm } from '@inertiajs/react';
import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle, Edit, Target, TrendingUp, Loader2, Eye } from 'lucide-react';

export default function ObjectivesIndex() {
    const { 
        objective, 
        realized, 
        progress, 
        commission, 
        month, 
        year, 
        userId,
        roleType, 
        users = [],
        canEdit,
        currentUser 
    } = usePage().props;

    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState(userId || null);
    const [detailDialogOpen, setDetailDialogOpen] = useState(false);
    const [selectedMetric, setSelectedMetric] = useState(null);
    const [detailData, setDetailData] = useState(null);
    const [loadingDetails, setLoadingDetails] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        role_type: roleType || 'matchmaker',
        month: month || new Date().getMonth() + 1,
        year: year || new Date().getFullYear(),
        target_ventes: objective?.target_ventes || 0,
        target_membres: objective?.target_membres || 0,
        target_rdv: objective?.target_rdv || 0,
        target_match: objective?.target_match || 0,
    });

    const metrics = [
        {
            key: 'ventes',
            label: 'Ventes',
            target: parseFloat(objective?.target_ventes) || 0,
            realized: parseFloat(realized?.ventes) || 0,
            progress: parseFloat(progress?.ventes) || 0,
            commission: commission?.ventes,
            format: (val) => `${(parseFloat(val) || 0).toFixed(2)} MAD`,
        },
        {
            key: 'membres',
            label: 'Membres',
            target: parseInt(objective?.target_membres) || 0,
            realized: parseInt(realized?.membres) || 0,
            progress: parseFloat(progress?.membres) || 0,
            commission: commission?.membres,
            format: (val) => (parseInt(val) || 0).toString(),
        },
        {
            key: 'rdv',
            label: 'RDV',
            target: parseInt(objective?.target_rdv) || 0,
            realized: parseInt(realized?.rdv) || 0,
            progress: parseFloat(progress?.rdv) || 0,
            commission: commission?.rdv,
            format: (val) => (parseInt(val) || 0).toString(),
        },
        {
            key: 'match',
            label: 'Match',
            target: parseInt(objective?.target_match) || 0,
            realized: parseInt(realized?.match) || 0,
            progress: parseFloat(progress?.match) || 0,
            commission: commission?.match,
            format: (val) => (parseInt(val) || 0).toString(),
        },
    ];

    const getProgressColor = (progressValue) => {
        if (progressValue >= 100) return 'bg-green-500';
        if (progressValue >= 50) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    const handleMonthYearChange = (newMonth, newYear) => {
        router.get('/objectives', {
            month: newMonth,
            year: newYear,
            user_id: selectedUserId,
        }, {
            preserveScroll: true,
            preserveState: false,
        });
    };

    const handleUserChange = (newUserId) => {
        setSelectedUserId(newUserId ? parseInt(newUserId) : null);
        router.get('/objectives', {
            month: month,
            year: year,
            user_id: newUserId ? parseInt(newUserId) : null,
        }, {
            preserveScroll: true,
            preserveState: false,
        });
    };

    const handleEdit = () => {
        if (objective) {
            setData({
                role_type: objective.role_type || roleType,
                month: objective.month,
                year: objective.year,
                target_ventes: objective.target_ventes,
                target_membres: objective.target_membres,
                target_rdv: objective.target_rdv,
                target_match: objective.target_match,
            });
        } else {
            setData({
                role_type: roleType,
                month: month,
                year: year,
                target_ventes: 0,
                target_membres: 0,
                target_rdv: 0,
                target_match: 0,
            });
        }
        setEditDialogOpen(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        post('/objectives', {
            onSuccess: () => {
                setEditDialogOpen(false);
                reset();
            },
        });
    };

    const handleMarkCommissionPaid = (objectiveId) => {
        if (confirm('Mark commission as paid for this objective?')) {
            router.post(`/objectives/${objectiveId}/mark-commission-paid`, {}, {
                onSuccess: () => {
                    router.reload();
                },
            });
        }
    };

    const handleRowClick = async (metric) => {
        setSelectedMetric(metric);
        setDetailDialogOpen(true);
        setLoadingDetails(true);
        setDetailData(null);

        try {
            const url = `/objectives/details?type=${metric.key}&user_id=${userId || ''}&month=${month}&year=${year}`;
            const response = await fetch(url, {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                credentials: 'same-origin',
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Failed to fetch details' }));
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Check if response has error
            if (data.error) {
                setDetailData({ error: data.error });
            } else {
                setDetailData(data);
            }
        } catch (error) {
            console.error('Error fetching details:', error);
            setDetailData({ 
                error: error.message || 'Failed to load details. Please try again.',
                details: [],
                total: 0
            });
        } finally {
            setLoadingDetails(false);
        }
    };

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    return (
        <AppLayout>
            <Head title="Monthly Objectives" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Target className="w-6 h-6" />
                            <h1 className="text-2xl font-bold">Monthly Objectives & Performance</h1>
                        </div>
                        {canEdit && (
                            <Button onClick={handleEdit} variant="outline">
                                <Edit className="w-4 h-4 mr-2" />
                                {objective ? 'Edit Objectives' : 'Set Objectives'}
                            </Button>
                        )}
                    </div>

                    {/* Filters */}
                    <div className="flex flex-wrap items-center gap-3 bg-card rounded-lg p-3 border">
                        {canEdit && users.length > 0 && (
                            <>
                                <div className="flex items-center gap-2">
                                    <Label className="text-sm text-muted-foreground">User</Label>
                                    <Select 
                                        value={selectedUserId?.toString() || 'all'} 
                                        onValueChange={(v) => handleUserChange(v === 'all' ? null : v)}
                                    >
                                        <SelectTrigger className="h-9 w-[200px]">
                                            <SelectValue placeholder="Select user" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Users</SelectItem>
                                            {users.map((user) => (
                                                <SelectItem key={user.id} value={user.id.toString()}>
                                                    {user.name} ({user.roles?.[0]?.name || 'N/A'})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="h-6 w-px bg-border" />
                            </>
                        )}
                        <div className="flex items-center gap-2">
                            <Label className="text-sm text-muted-foreground">Month</Label>
                            <Select 
                                value={month.toString()} 
                                onValueChange={(v) => handleMonthYearChange(parseInt(v), year)}
                            >
                                <SelectTrigger className="h-9 w-[150px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {monthNames.map((name, index) => (
                                        <SelectItem key={index + 1} value={(index + 1).toString()}>
                                            {name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center gap-2">
                            <Label className="text-sm text-muted-foreground">Year</Label>
                            <Input
                                type="number"
                                value={year}
                                onChange={(e) => handleMonthYearChange(month, parseInt(e.target.value) || year)}
                                className="h-9 w-[100px]"
                                min="2020"
                                max="2100"
                            />
                        </div>
                    </div>
                </div>

                {/* Objectives Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Performance Tracking</CardTitle>
                        <CardDescription>
                            {monthNames[month - 1]} {year}
                            {selectedUserId && users.find(u => u.id === selectedUserId) && (
                                <> - {users.find(u => u.id === selectedUserId).name} ({roleType === 'matchmaker' ? 'Matchmaker' : 'Manager'})</>
                            )}
                            {!selectedUserId && currentUser?.role && (
                                <> - {currentUser.name} ({roleType === 'matchmaker' ? 'Matchmaker' : 'Manager'})</>
                            )}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Objectif</TableHead>
                                        <TableHead>Réalisé</TableHead>
                                        <TableHead>Progress</TableHead>
                                        <TableHead>Commission</TableHead>
                                        {canEdit && objective && (
                                            <TableHead>Actions</TableHead>
                                        )}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {metrics.map((metric) => (
                                        <TableRow 
                                            key={metric.key}
                                            className="cursor-pointer hover:bg-muted/50"
                                            onClick={(e) => {
                                                // Don't trigger if clicking on Actions column
                                                if (!e.target.closest('td:last-child')) {
                                                    handleRowClick(metric);
                                                }
                                            }}
                                        >
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    {metric.label}
                                                    <Eye className="w-4 h-4 text-muted-foreground" />
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {metric.format(metric.target)}
                                            </TableCell>
                                            <TableCell>
                                                {metric.format(metric.realized)}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1">
                                                        <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-200">
                                                            <div
                                                                className={`h-full transition-all ${getProgressColor(metric.progress)}`}
                                                                style={{ width: `${metric.progress}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                    <span className="text-sm font-medium w-12 text-right">
                                                        {(parseFloat(metric.progress) || 0).toFixed(1)}%
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {metric.commission?.eligible ? (
                                                    <div className="flex flex-col gap-1">
                                                        <Badge className="bg-green-500 text-white w-fit">
                                                            <CheckCircle className="w-3 h-3 mr-1" />
                                                            10% eligible
                                                        </Badge>
                                                        {metric.key === 'ventes' && metric.commission.amount > 0 && (
                                                            <span className="text-xs text-muted-foreground">
                                                                {(parseFloat(metric.commission.amount) || 0).toFixed(2)} MAD
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-sm text-muted-foreground">Not eligible</span>
                                                )}
                                            </TableCell>
                                            {canEdit && objective && (
                                                <TableCell onClick={(e) => e.stopPropagation()}>
                                                    {metric.commission?.eligible && !objective.commission_paid && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleMarkCommissionPaid(objective.id);
                                                            }}
                                                        >
                                                            Mark Paid
                                                        </Button>
                                                    )}
                                                    {objective.commission_paid && (
                                                        <Badge className="bg-blue-500 text-white">
                                                            Paid
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        {!objective && (
                            <div className="text-center py-8 text-muted-foreground">
                                <p>No objectives set for this month. {canEdit && 'Click "Set Objectives" to create them.'}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Edit Dialog */}
                <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>
                                {objective ? 'Edit Objectives' : 'Set Objectives'}
                            </DialogTitle>
                            <DialogDescription>
                                Set monthly objectives for {monthNames[data.month - 1]} {data.year}
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit}>
                            <div className="grid gap-4 py-4">
                                {canEdit && (
                                    <div className="grid gap-2">
                                        <Label htmlFor="role_type">Role Type *</Label>
                                        <Select 
                                            value={data.role_type} 
                                            onValueChange={(v) => setData('role_type', v)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select role type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="matchmaker">Matchmakers (All)</SelectItem>
                                                <SelectItem value="manager">Managers (All)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <p className="text-xs text-muted-foreground">
                                            This objective will be shared by all {data.role_type === 'matchmaker' ? 'matchmakers' : 'managers'}. Each {data.role_type === 'matchmaker' ? 'matchmaker' : 'manager'} will see their own individual results.
                                        </p>
                                        {errors.role_type && (
                                            <p className="text-sm text-red-500">{errors.role_type}</p>
                                        )}
                                    </div>
                                )}
                                <div className="grid gap-2">
                                    <Label htmlFor="target_ventes">Target Ventes (MAD)</Label>
                                    <Input
                                        id="target_ventes"
                                        type="number"
                                        step="0.01"
                                        value={data.target_ventes}
                                        onChange={(e) => setData('target_ventes', parseFloat(e.target.value) || 0)}
                                        min="0"
                                    />
                                    {errors.target_ventes && (
                                        <p className="text-sm text-red-500">{errors.target_ventes}</p>
                                    )}
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="target_membres">Target Membres</Label>
                                    <Input
                                        id="target_membres"
                                        type="number"
                                        value={data.target_membres}
                                        onChange={(e) => setData('target_membres', parseInt(e.target.value) || 0)}
                                        min="0"
                                    />
                                    {errors.target_membres && (
                                        <p className="text-sm text-red-500">{errors.target_membres}</p>
                                    )}
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="target_rdv">Target RDV</Label>
                                    <Input
                                        id="target_rdv"
                                        type="number"
                                        value={data.target_rdv}
                                        onChange={(e) => setData('target_rdv', parseInt(e.target.value) || 0)}
                                        min="0"
                                    />
                                    {errors.target_rdv && (
                                        <p className="text-sm text-red-500">{errors.target_rdv}</p>
                                    )}
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="target_match">Target Match</Label>
                                    <Input
                                        id="target_match"
                                        type="number"
                                        value={data.target_match}
                                        onChange={(e) => setData('target_match', parseInt(e.target.value) || 0)}
                                        min="0"
                                    />
                                    {errors.target_match && (
                                        <p className="text-sm text-red-500">{errors.target_match}</p>
                                    )}
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={processing}>
                                    {objective ? 'Update' : 'Create'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Detail Dialog */}
                <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
                    <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>
                                {selectedMetric?.label} - History
                            </DialogTitle>
                            <DialogDescription>
                                {monthNames[month - 1]} {year} - Total: {detailData?.total || 0}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                            {loadingDetails ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                    <span className="ml-2 text-muted-foreground">Loading details...</span>
                                </div>
                            ) : detailData?.error ? (
                                <div className="text-center py-8 text-red-500">
                                    {detailData.error}
                                </div>
                            ) : !detailData?.details || detailData.details.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    No {selectedMetric?.label?.toLowerCase()} found for this period.
                                </div>
                            ) : selectedMetric?.key === 'ventes' ? (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Bill Number</TableHead>
                                                <TableHead>Client</TableHead>
                                                <TableHead>Email</TableHead>
                                                {roleType === 'manager' && <TableHead>Matchmaker</TableHead>}
                                                <TableHead>Pack</TableHead>
                                                <TableHead>Amount</TableHead>
                                                <TableHead>Payment Method</TableHead>
                                                <TableHead>Date</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {detailData.details.map((item) => (
                                                <TableRow key={item.id}>
                                                    <TableCell className="font-medium">{item.bill_number}</TableCell>
                                                    <TableCell>{item.user_name}</TableCell>
                                                    <TableCell>{item.user_email}</TableCell>
                                                    {roleType === 'manager' && (
                                                        <TableCell>{item.matchmaker_name}</TableCell>
                                                    )}
                                                    <TableCell>{item.pack_name}</TableCell>
                                                    <TableCell>{parseFloat(item.total_amount).toFixed(2)} MAD</TableCell>
                                                    <TableCell>{item.payment_method}</TableCell>
                                                    <TableCell>{item.created_at}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            ) : selectedMetric?.key === 'membres' ? (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Name</TableHead>
                                                <TableHead>Email</TableHead>
                                                <TableHead>Phone</TableHead>
                                                {roleType === 'manager' && <TableHead>Matchmaker</TableHead>}
                                                <TableHead>Status</TableHead>
                                                <TableHead>Validated At</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {detailData.details.map((item) => (
                                                <TableRow key={item.id}>
                                                    <TableCell className="font-medium">{item.name}</TableCell>
                                                    <TableCell>{item.email}</TableCell>
                                                    <TableCell>{item.phone || 'N/A'}</TableCell>
                                                    {roleType === 'manager' && (
                                                        <TableCell>{item.matchmaker_name}</TableCell>
                                                    )}
                                                    <TableCell>
                                                        <Badge variant="outline">{item.status}</Badge>
                                                    </TableCell>
                                                    <TableCell>{item.approved_at || 'N/A'}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    Details for {selectedMetric?.label} will be available soon.
                                </div>
                            )}
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>
                                Close
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}

