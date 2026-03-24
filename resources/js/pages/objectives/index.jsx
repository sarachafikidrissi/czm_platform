import { Head, router, usePage, useForm } from '@inertiajs/react';
import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';

export default function ObjectivesIndex() {
    const { t } = useTranslation();
    const { 
        objective, 
        realized, 
        progress, 
        commission, 
        month, 
        year, 
        userId,
        agencyId,
        roleType, 
        scopeType,
        users = [],
        agencies = [],
        staffForObjectives = [],
        canEdit,
        currentUser 
    } = usePage().props;
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState(userId || null);
    const [selectedAgencyId, setSelectedAgencyId] = useState(agencyId || null);
    const [detailDialogOpen, setDetailDialogOpen] = useState(false);
    const [selectedMetric, setSelectedMetric] = useState(null);
    const [detailData, setDetailData] = useState(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [isNavigating, setIsNavigating] = useState(false);
    const [editDialogAgencyFilter, setEditDialogAgencyFilter] = useState(null);
    
    // Show skeleton loading only if there IS data (objective exists), otherwise show normal element
    // If there's no objective, show normal "no objectives" message instead of skeleton
    const hasData = objective !== null && objective !== undefined && realized !== null && realized !== undefined;
    const isLoading = hasData && isNavigating;
    
    // Track navigation state when filters change
    useEffect(() => {
        setIsNavigating(false); // Reset when props update (navigation finished)
    }, [objective, realized, progress, commission, month, year]);

    useEffect(() => {
        setSelectedUserId(userId || null);
    }, [userId]);

    useEffect(() => {
        setSelectedAgencyId(agencyId || null);
    }, [agencyId]);

    const { data, setData, post, processing, errors, reset } = useForm({
        objective_scope: 'staff',
        role_type: roleType || 'matchmaker',
        month: month || new Date().getMonth() + 1,
        year: year || new Date().getFullYear(),
        target_ventes: objective?.target_ventes || 0,
        target_membres: objective?.target_membres || 0,
        target_rdv: objective?.target_rdv || 0,
        target_match: objective?.target_match || 0,
        user_ids: [],
        agency_id: null,
    });

    /** Admin: agency filter without user → set targets for that agency aggregate (no role_type in API). */
    const useAgencyObjectiveForm =
        canEdit &&
        currentUser?.role === 'admin' &&
        !selectedUserId &&
        (objective?.role_type === 'agency' || !!selectedAgencyId);

    const filteredUsersForObjectiveForm = useMemo(() => {
        if (!canEdit || !staffForObjectives?.length || data.objective_scope === 'agency') return [];
        return staffForObjectives.filter((u) => {
            const role = u.roles?.find((r) => ['matchmaker', 'manager'].includes(r.name))?.name;
            if (data.role_type === 'matchmaker' && role !== 'matchmaker') return false;
            if (data.role_type === 'manager' && role !== 'manager') return false;
            if (editDialogAgencyFilter && u.agency_id !== editDialogAgencyFilter) return false;
            return true;
        });
    }, [canEdit, staffForObjectives, data.role_type, data.objective_scope, editDialogAgencyFilter]);

    const toggleObjectiveUserId = (id) => {
        const arr = Array.isArray(data.user_ids) ? [...data.user_ids] : [];
        const idx = arr.indexOf(id);
        if (idx >= 0) {
            arr.splice(idx, 1);
        } else {
            arr.push(id);
        }
        setData('user_ids', arr);
    };

    /** Manager + agency scope on /objectives: show full payout on Ventes row; Ma production & other scopes use personal ventes slice only. */
    const ventesCommissionDisplayMAD = useMemo(() => {
        if (currentUser?.role === 'manager' && scopeType === 'agency' && commission?.mode === 'manager') {
            return parseFloat(commission?.summary?.total_amount ?? 0);
        }
        return parseFloat(commission?.ventes?.amount ?? 0);
    }, [currentUser?.role, scopeType, commission]);

    const metrics = [
        {
            key: 'ventes',
            label: t('staff.objectives.sales'),
            target: parseFloat(objective?.target_ventes) || 0,
            realized: parseFloat(realized?.ventes) || 0,
            progress: parseFloat(progress?.ventes) || 0,
            commission: commission?.ventes,
            format: (val) => `${(parseFloat(val) || 0).toFixed(2)} MAD`,
        },
        {
            key: 'membres',
            label: t('staff.objectives.members'),
            target: parseInt(objective?.target_membres) || 0,
            realized: parseInt(realized?.membres) || 0,
            progress: parseFloat(progress?.membres) || 0,
            commission: commission?.membres,
            format: (val) => (parseInt(val) || 0).toString(),
        },
        {
            key: 'rdv',
            label: t('staff.objectives.appointments'),
            target: parseInt(objective?.target_rdv) || 0,
            realized: parseInt(realized?.rdv) || 0,
            progress: parseFloat(progress?.rdv) || 0,
            commission: commission?.rdv,
            format: (val) => (parseInt(val) || 0).toString(),
        },
        {
            key: 'match',
            label: t('staff.objectives.matches'),
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
        setIsNavigating(true);
        router.get('/objectives', {
            month: newMonth,
            year: newYear,
            user_id: selectedUserId,
            agency_id: selectedAgencyId,
        }, {
            preserveScroll: true,
            preserveState: false,
            onFinish: () => setIsNavigating(false),
        });
    };

    const handleUserChange = (newUserId) => {
        const parsedUserId = newUserId ? parseInt(newUserId) : null;
        setSelectedUserId(parsedUserId);
        if (currentUser?.role === 'admin' && parsedUserId) {
            setSelectedAgencyId(null);
        }
        setIsNavigating(true);
        router.get('/objectives', {
            month: month,
            year: year,
            user_id: parsedUserId,
            agency_id: currentUser?.role === 'admin' && parsedUserId ? null : selectedAgencyId,
        }, {
            preserveScroll: true,
            preserveState: false,
            onFinish: () => setIsNavigating(false),
        });
    };

    const handleAgencyChange = (newAgencyId) => {
        const parsedAgencyId = newAgencyId ? parseInt(newAgencyId) : null;
        setSelectedAgencyId(parsedAgencyId);
        if (currentUser?.role === 'admin' && parsedAgencyId) {
            setSelectedUserId(null);
        }
        setIsNavigating(true);
        router.get('/objectives', {
            month: month,
            year: year,
            user_id: currentUser?.role === 'admin' && parsedAgencyId ? null : selectedUserId,
            agency_id: parsedAgencyId,
        }, {
            preserveScroll: true,
            preserveState: false,
            onFinish: () => setIsNavigating(false),
        });
    };

    const handleEdit = () => {
        const staffRow = objective?.user_id
            ? staffForObjectives.find((u) => u.id === objective.user_id)
            : null;
        const initialAgencyFilter = staffRow?.agency_id ?? selectedAgencyId ?? null;
        const agencyIdForForm = objective?.agency_id ?? selectedAgencyId ?? null;

        if (useAgencyObjectiveForm && agencyIdForForm) {
            setData({
                objective_scope: 'agency',
                agency_id: agencyIdForForm,
                role_type: roleType || 'matchmaker',
                month: objective?.month ?? month,
                year: objective?.year ?? year,
                target_ventes: objective?.target_ventes ?? 0,
                target_membres: objective?.target_membres ?? 0,
                target_rdv: objective?.target_rdv ?? 0,
                target_match: objective?.target_match ?? 0,
                user_ids: [],
            });
            setEditDialogAgencyFilter(null);
            setEditDialogOpen(true);
            return;
        }

        if (objective) {
            setData({
                objective_scope: 'staff',
                role_type: objective.role_type && objective.role_type !== 'agency' ? objective.role_type : roleType,
                month: objective.month,
                year: objective.year,
                target_ventes: objective.target_ventes,
                target_membres: objective.target_membres,
                target_rdv: objective.target_rdv,
                target_match: objective.target_match,
                user_ids: objective.user_id ? [objective.user_id] : [],
                agency_id: initialAgencyFilter,
            });
        } else {
            setData({
                objective_scope: 'staff',
                role_type: roleType,
                month: month,
                year: year,
                target_ventes: 0,
                target_membres: 0,
                target_rdv: 0,
                target_match: 0,
                user_ids: [],
                agency_id: selectedAgencyId || null,
            });
        }
        setEditDialogAgencyFilter(initialAgencyFilter);
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
        if (confirm(t('staff.objectives.confirmMarkPaid'))) {
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
            const params = new URLSearchParams({
                type: metric.key,
                month: month.toString(),
                year: year.toString(),
            });
            if (selectedUserId) {
                params.set('user_id', selectedUserId.toString());
            }
            if (selectedAgencyId) {
                params.set('agency_id', selectedAgencyId.toString());
            }
            const url = `/objectives/details?${params.toString()}`;
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
        t('staff.objectives.months.january'),
        t('staff.objectives.months.february'),
        t('staff.objectives.months.march'),
        t('staff.objectives.months.april'),
        t('staff.objectives.months.may'),
        t('staff.objectives.months.june'),
        t('staff.objectives.months.july'),
        t('staff.objectives.months.august'),
        t('staff.objectives.months.september'),
        t('staff.objectives.months.october'),
        t('staff.objectives.months.november'),
        t('staff.objectives.months.december')
    ];

    return (
        <AppLayout>
            <Head title={t('staff.objectives.title')} />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Target className="w-6 h-6" />
                            <h1 className="text-2xl font-bold">{t('staff.objectives.titleAndPerformance')}</h1>
                        </div>
                        {canEdit && (
                            <Button onClick={handleEdit} variant="outline">
                                <Edit className="w-4 h-4 mr-2" />
                                {objective ? t('staff.objectives.editObjectives') : t('staff.objectives.setObjectives')}
                            </Button>
                        )}
                    </div>

                    {/* Filters */}
                    <div className="flex flex-wrap items-center gap-3 bg-card rounded-lg p-3 border">
                        {currentUser?.role === 'admin' && agencies.length > 0 && (
                            <>
                                <div className="flex items-center gap-2">
                                    <Label className="text-sm text-muted-foreground">{t('staff.agencies.agencies')}</Label>
                                    <Select
                                        value={selectedAgencyId?.toString() || 'all'}
                                        onValueChange={(v) => handleAgencyChange(v === 'all' ? null : v)}
                                    >
                                        <SelectTrigger className="h-9 w-[220px]">
                                            <SelectValue placeholder={t('staff.agencies.agencies')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">{t('staff.objectives.allAgencies')}</SelectItem>
                                            {agencies.map((agency) => (
                                                <SelectItem key={agency.id} value={agency.id.toString()}>
                                                    {agency.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="h-6 w-px bg-border" />
                            </>
                        )}
                        {['admin', 'manager'].includes(currentUser?.role) && users.length > 0 && (
                            <>
                                <div className="flex items-center gap-2">
                                    <Label className="text-sm text-muted-foreground">{t('staff.objectives.user')}</Label>
                                    <Select 
                                        value={selectedUserId?.toString() || 'all'} 
                                        onValueChange={(v) => handleUserChange(v === 'all' ? null : v)}
                                    >
                                        <SelectTrigger className="h-9 w-[200px]">
                                            <SelectValue placeholder={t('staff.objectives.selectUser')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">{t('staff.objectives.allUsers')}</SelectItem>
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
                            <Label className="text-sm text-muted-foreground">{t('staff.objectives.month')}</Label>
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
                            <Label className="text-sm text-muted-foreground">{t('staff.objectives.year')}</Label>
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
                        <div className="flex flex-wrap items-center gap-2">
                            <CardTitle>{t('staff.objectives.performanceTracking')}</CardTitle>
                            {objective?.role_type === 'agency' && (
                                <Badge variant="secondary">{t('staff.objectives.agencyObjectiveBadge')}</Badge>
                            )}
                            {objective?.user_id && objective.role_type !== 'agency' && (
                                <Badge variant="secondary">{t('staff.objectives.perUserObjective')}</Badge>
                            )}
                        </div>
                        <CardDescription>
                            {monthNames[month - 1]} {year}
                            {selectedUserId && users.find(u => u.id === selectedUserId) && (
                                <> - {users.find(u => u.id === selectedUserId).name} ({roleType === 'matchmaker' ? t('staff.matchmaker') : t('staff.agencies.manager')})</>
                            )}
                            {!selectedUserId && selectedAgencyId && agencies.find((a) => a.id === selectedAgencyId) && (
                                <> - {agencies.find((a) => a.id === selectedAgencyId).name} ({t('staff.agencies.agencies')})</>
                            )}
                            {!selectedUserId &&
                                selectedAgencyId &&
                                currentUser?.role === 'manager' &&
                                scopeType === 'agency' &&
                                !agencies?.length && (
                                    <> - {t('staff.agencies.agencies')}</>
                                )}
                            {!selectedUserId && !selectedAgencyId && currentUser?.role === 'admin' && scopeType === 'all' && (
                                <> - {t('staff.objectives.editDialog.matchmakersAll')}</>
                            )}
                            {!selectedUserId &&
                                !selectedAgencyId &&
                                currentUser?.role &&
                                !(currentUser.role === 'admin' && scopeType === 'all') &&
                                !(currentUser.role === 'manager' && scopeType === 'agency') && (
                                    <> - {currentUser.name} ({roleType === 'matchmaker' ? t('staff.matchmaker') : t('staff.agencies.manager')})</>
                                )}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('staff.objectives.type')}</TableHead>
                                        <TableHead>{t('staff.objectives.objectif')}</TableHead>
                                        <TableHead>{t('staff.objectives.realise')}</TableHead>
                                        <TableHead>{t('staff.objectives.progress')}</TableHead>
                                        <TableHead>{t('staff.objectives.commission')}</TableHead>
                                        {canEdit && objective && (
                                            <TableHead>{t('staff.objectives.actions')}</TableHead>
                                        )}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        [1, 2, 3, 4].map((i) => (
                                            <TableRow key={i}>
                                                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Skeleton className="h-2 w-full" />
                                                        <Skeleton className="h-4 w-12" />
                                                    </div>
                                                </TableCell>
                                                <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                                                {canEdit && <TableCell><Skeleton className="h-8 w-20" /></TableCell>}
                                            </TableRow>
                                        ))
                                    ) : (
                                        metrics.map((metric) => (
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
                                                            {metric.key === 'ventes'
                                                                ? t('staff.objectives.commissionPayoutEligible')
                                                                : t('staff.objectives.kpiThresholdMet')}
                                                        </Badge>
                                                        {metric.key === 'ventes' && ventesCommissionDisplayMAD > 0 && (
                                                            <span className="text-xs text-muted-foreground">
                                                                {ventesCommissionDisplayMAD.toFixed(2)} MAD
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-sm text-muted-foreground">{t('staff.objectives.notEligible')}</span>
                                                )}
                                            </TableCell>
                                            {canEdit && objective && (
                                                <TableCell onClick={(e) => e.stopPropagation()}>
                                                    {metric.key === 'ventes' &&
                                                        (commission?.summary?.eligible ?? metric.commission?.eligible) &&
                                                        (parseFloat(commission?.summary?.total_amount ?? 0) > 0) &&
                                                        !objective.commission_paid && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleMarkCommissionPaid(objective.id);
                                                            }}
                                                        >
                                                            {t('staff.objectives.markPaid')}
                                                        </Button>
                                                    )}
                                                    {metric.key === 'ventes' && objective.commission_paid && (
                                                        <Badge className="bg-blue-500 text-white">
                                                            {t('staff.objectives.paid')}
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                            )}
                                        </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {!objective && (
                            <div className="text-center py-8 text-muted-foreground">
                                <p>{t('staff.objectives.noObjectivesSet')} {canEdit && t('staff.objectives.setObjectives')}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Edit Dialog */}
                <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                    <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>
                                {objective ? t('staff.objectives.editDialog.title') : t('staff.objectives.editDialog.setObjectivesTitle')}
                            </DialogTitle>
                            <DialogDescription>
                                {t('staff.objectives.editDialog.setMonthlyObjectives', { month: monthNames[data.month - 1], year: data.year })}
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit}>
                            <div className="grid gap-4 py-4">
                                {canEdit && data.objective_scope === 'agency' && agencies.length > 0 && (
                                    <div className="grid gap-2">
                                        <Label>{t('staff.objectives.editDialog.agencyLabel')}</Label>
                                        <Select
                                            value={data.agency_id?.toString() ?? ''}
                                            onValueChange={(v) => setData('agency_id', parseInt(v, 10))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('staff.objectives.editDialog.agencyLabel')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {agencies.map((a) => (
                                                    <SelectItem key={a.id} value={a.id.toString()}>
                                                        {a.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-xs text-muted-foreground">
                                            {t('staff.objectives.editDialog.agencyObjectiveHint')}
                                        </p>
                                        {errors.agency_id && (
                                            <p className="text-sm text-red-500">{errors.agency_id}</p>
                                        )}
                                    </div>
                                )}
                                {canEdit && data.objective_scope === 'staff' && (
                                    <>
                                    <div className="grid gap-2">
                                        <Label htmlFor="role_type">{t('staff.objectives.editDialog.roleType')}</Label>
                                        <Select 
                                            value={data.role_type} 
                                            onValueChange={(v) => {
                                                setData('role_type', v);
                                                setData('user_ids', []);
                                            }}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('staff.objectives.editDialog.selectRoleType')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="matchmaker">{t('staff.objectives.editDialog.matchmakersAll')}</SelectItem>
                                                <SelectItem value="manager">{t('staff.objectives.editDialog.managersAll')}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {errors.role_type && (
                                            <p className="text-sm text-red-500">{errors.role_type}</p>
                                        )}
                                    </div>
                                    {agencies.length > 0 && (
                                        <div className="grid gap-2">
                                            <Label>{t('staff.objectives.editDialog.filterAgencyOptional')}</Label>
                                            <Select
                                                value={editDialogAgencyFilter?.toString() ?? 'all'}
                                                onValueChange={(v) => {
                                                    const parsed = v === 'all' ? null : parseInt(v, 10);
                                                    setEditDialogAgencyFilter(parsed);
                                                    setData('agency_id', parsed);
                                                }}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder={t('staff.objectives.allAgencies')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">{t('staff.objectives.allAgencies')}</SelectItem>
                                                    {agencies.map((a) => (
                                                        <SelectItem key={a.id} value={a.id.toString()}>
                                                            {a.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                    <div className="grid gap-2">
                                        <Label>{t('staff.objectives.editDialog.selectStaffOptional')}</Label>
                                        <p className="text-xs text-muted-foreground">
                                            {(!data.user_ids || data.user_ids.length === 0)
                                                ? t('staff.objectives.editDialog.scopeRoleDefault')
                                                : t('staff.objectives.editDialog.scopeUsersHint', { count: data.user_ids.length })}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {t('staff.objectives.editDialog.leaveEmptyForRole')}
                                        </p>
                                        <div className="max-h-48 overflow-y-auto rounded-md border p-2 space-y-2">
                                            {filteredUsersForObjectiveForm.length === 0 ? (
                                                <p className="text-sm text-muted-foreground">{t('staff.objectives.editDialog.noStaffMatch')}</p>
                                            ) : (
                                                filteredUsersForObjectiveForm.map((u) => (
                                                    <label key={u.id} className="flex items-center gap-2 cursor-pointer text-sm">
                                                        <Checkbox
                                                            checked={Array.isArray(data.user_ids) && data.user_ids.includes(u.id)}
                                                            onCheckedChange={() => toggleObjectiveUserId(u.id)}
                                                        />
                                                        <span>{u.name}</span>
                                                    </label>
                                                ))
                                            )}
                                        </div>
                                        {errors.user_ids && (
                                            <p className="text-sm text-red-500">{errors.user_ids}</p>
                                        )}
                                    </div>
                                    </>
                                )}
                                <div className="grid gap-2">
                                    <Label htmlFor="target_ventes">{t('staff.objectives.editDialog.targetSales')}</Label>
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
                                    <Label htmlFor="target_membres">{t('staff.objectives.editDialog.targetMembers')}</Label>
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
                                    <Label htmlFor="target_rdv">{t('staff.objectives.editDialog.targetAppointments')}</Label>
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
                                    <Label htmlFor="target_match">{t('staff.objectives.editDialog.targetMatches')}</Label>
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
                                    {t('staff.objectives.cancel')}
                                </Button>
                                <Button type="submit" disabled={processing}>
                                    {objective ? t('staff.objectives.update') : t('staff.objectives.create')}
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
                                {selectedMetric?.label} - {t('staff.objectives.history')}
                            </DialogTitle>
                            <DialogDescription>
                                {monthNames[month - 1]} {year} - {t('staff.objectives.total')}: {detailData?.total || 0}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                            {loadingDetails ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                    <span className="ml-2 text-muted-foreground">{t('staff.objectives.loadingDetails')}</span>
                                </div>
                            ) : detailData?.error ? (
                                <div className="text-center py-8 text-red-500">
                                    {detailData.error}
                                </div>
                            ) : !detailData?.details || detailData.details.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    {t('staff.objectives.noDataFound', { type: selectedMetric?.label?.toLowerCase() })}
                                </div>
                            ) : selectedMetric?.key === 'ventes' ? (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>{t('staff.objectives.billNumber')}</TableHead>
                                                <TableHead>{t('staff.objectives.client')}</TableHead>
                                                <TableHead>{t('staff.objectives.email')}</TableHead>
                                                {['agency', 'all'].includes(scopeType) && <TableHead>{t('staff.matchmaker')}</TableHead>}
                                                <TableHead>{t('staff.objectives.pack')}</TableHead>
                                                <TableHead>{t('staff.objectives.amount')}</TableHead>
                                                <TableHead>{t('staff.objectives.paymentMethod')}</TableHead>
                                                <TableHead>{t('staff.objectives.date')}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {detailData.details.map((item) => (
                                                <TableRow key={item.id}>
                                                    <TableCell className="font-medium">{item.bill_number}</TableCell>
                                                    <TableCell>{item.user_name}</TableCell>
                                                    <TableCell>{item.user_email}</TableCell>
                                                    {['agency', 'all'].includes(scopeType) && (
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
                                                <TableHead>{t('staff.objectives.name')}</TableHead>
                                                <TableHead>{t('staff.objectives.email')}</TableHead>
                                                <TableHead>{t('staff.objectives.phone')}</TableHead>
                                                {['agency', 'all'].includes(scopeType) && <TableHead>{t('staff.matchmaker')}</TableHead>}
                                                <TableHead>{t('staff.objectives.status')}</TableHead>
                                                <TableHead>{t('staff.objectives.validatedAt')}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {detailData.details.map((item) => (
                                                <TableRow key={item.id}>
                                                    <TableCell className="font-medium">{item.name}</TableCell>
                                                    <TableCell>{item.email}</TableCell>
                                                    <TableCell>{item.phone || 'N/A'}</TableCell>
                                                    {['agency', 'all'].includes(scopeType) && (
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
                                    {t('staff.objectives.detailsAvailable', { type: selectedMetric?.label })}
                                </div>
                            )}
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>
                                {t('staff.objectives.close')}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}

