import { Head, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CheckCircle } from 'lucide-react';

export default function ManagerMyProduction() {
    const { t } = useTranslation();
    const { objective, realized, progress, commission, month, year } = usePage().props;
    const [isNavigating, setIsNavigating] = useState(false);

    useEffect(() => {
        setIsNavigating(false);
    }, [objective, realized, progress, month, year]);

    const monthNames = [
        'Janvier',
        'Février',
        'Mars',
        'Avril',
        'Mai',
        'Juin',
        'Juillet',
        'Août',
        'Septembre',
        'Octobre',
        'Novembre',
        'Décembre',
    ];

    const handleMonthYearChange = (newMonth, newYear) => {
        setIsNavigating(true);
        router.get(
            '/manager/my-production',
            {
                month: newMonth,
                year: newYear,
            },
            {
                preserveScroll: true,
                preserveState: false,
                onFinish: () => setIsNavigating(false),
            },
        );
    };

    const getProgressColor = (progressValue) => {
        if (progressValue >= 100) return 'bg-green-500';
        if (progressValue >= 50) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    const rows = [
        {
            key: 'ventes',
            label: 'Ventes',
            target: parseFloat(objective?.target_ventes) || 0,
            realized: parseFloat(realized?.ventes) || 0,
            progressPct: parseFloat(progress?.ventes) || 0,
            commission: commission?.ventes,
            formatTarget: (v) => `${(parseFloat(v) || 0).toFixed(2)} MAD`,
            formatRealized: (v) => `${(parseFloat(v) || 0).toFixed(2)} MAD`,
        },
        {
            key: 'membres',
            label: 'Membres',
            target: parseInt(objective?.target_membres) || 0,
            realized: parseInt(realized?.membres) || 0,
            progressPct: parseFloat(progress?.membres) || 0,
            commission: commission?.membres,
            formatTarget: (v) => String(parseInt(v) || 0),
            formatRealized: (v) => String(parseInt(v) || 0),
        },
        {
            key: 'rdv',
            label: 'RDV',
            target: parseInt(objective?.target_rdv) || 0,
            realized: parseInt(realized?.rdv) || 0,
            progressPct: parseFloat(progress?.rdv) || 0,
            commission: commission?.rdv,
            formatTarget: (v) => String(parseInt(v) || 0),
            formatRealized: (v) => String(parseInt(v) || 0),
        },
        {
            key: 'match',
            label: 'Match',
            target: parseInt(objective?.target_match) || 0,
            realized: parseInt(realized?.match) || 0,
            progressPct: parseFloat(progress?.match) || 0,
            commission: commission?.match,
            formatTarget: (v) => String(parseInt(v) || 0),
            formatRealized: (v) => String(parseInt(v) || 0),
        },
    ];

    return (
        <AppLayout>
            <Head title="Ma production" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Ma production</CardTitle>
                        <CardDescription>
                            {monthNames[(month || 1) - 1]} {year}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3">
                            <div className="flex items-center gap-2">
                                <Label className="text-sm text-muted-foreground">Mois</Label>
                                <Select value={month.toString()} onValueChange={(v) => handleMonthYearChange(parseInt(v), year)}>
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
                                <Label className="text-sm text-muted-foreground">Année</Label>
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

                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Métrique</TableHead>
                                        <TableHead>Objectif</TableHead>
                                        <TableHead>Réalisé</TableHead>
                                        <TableHead>{t('staff.objectives.progress')}</TableHead>
                                        <TableHead>{t('staff.objectives.commission')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {rows.map((r) => (
                                        <TableRow key={r.key} className={isNavigating ? 'opacity-70' : undefined}>
                                            <TableCell className="font-medium">{r.label}</TableCell>
                                            <TableCell>{r.formatTarget(r.target)}</TableCell>
                                            <TableCell>{r.formatRealized(r.realized)}</TableCell>
                                            <TableCell>
                                                <div className="flex min-w-[140px] items-center gap-2">
                                                    <div className="flex-1">
                                                        <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-200">
                                                            <div
                                                                className={`h-full transition-all ${getProgressColor(r.progressPct)}`}
                                                                style={{ width: `${Math.min(100, r.progressPct)}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                    <span className="text-sm font-medium w-12 shrink-0 text-right">
                                                        {(parseFloat(r.progressPct) || 0).toFixed(1)}%
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {r.commission?.eligible ? (
                                                    <div className="flex flex-col gap-1">
                                                        <Badge className="w-fit bg-green-500 text-white">
                                                            <CheckCircle className="mr-1 h-3 w-3" />
                                                            {r.key === 'ventes'
                                                                ? t('staff.objectives.commissionPayoutEligible')
                                                                : t('staff.objectives.kpiThresholdMet')}
                                                        </Badge>
                                                        {r.key === 'ventes' &&
                                                            (parseFloat(commission?.summary?.total_amount ?? r.commission?.amount) || 0) > 0 && (
                                                                <span className="text-xs text-muted-foreground">
                                                                    {(
                                                                        parseFloat(commission?.summary?.total_amount ?? r.commission?.amount) || 0
                                                                    ).toFixed(2)}{' '}
                                                                    MAD
                                                                </span>
                                                            )}
                                                    </div>
                                                ) : (
                                                    <span className="text-sm text-muted-foreground">{t('staff.objectives.notEligible')}</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}

