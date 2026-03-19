import { Head, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function ManagerMyProduction() {
    const { objective, realized, progress, month, year } = usePage().props;
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

    const rows = [
        {
            key: 'ventes',
            label: 'Ventes',
            target: parseFloat(objective?.target_ventes) || 0,
            realized: parseFloat(realized?.ventes) || 0,
            progress: parseFloat(progress?.ventes) || 0,
        },
        {
            key: 'membres',
            label: 'Membres',
            target: parseInt(objective?.target_membres) || 0,
            realized: parseInt(realized?.membres) || 0,
            progress: parseFloat(progress?.membres) || 0,
        },
        {
            key: 'rdv',
            label: 'RDV',
            target: parseInt(objective?.target_rdv) || 0,
            realized: parseInt(realized?.rdv) || 0,
            progress: parseFloat(progress?.rdv) || 0,
        },
        {
            key: 'match',
            label: 'Match',
            target: parseInt(objective?.target_match) || 0,
            realized: parseInt(realized?.match) || 0,
            progress: parseFloat(progress?.match) || 0,
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
                                        <TableHead>% Atteint</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {rows.map((r) => (
                                        <TableRow key={r.key} className={isNavigating ? 'opacity-70' : undefined}>
                                            <TableCell className="font-medium">{r.label}</TableCell>
                                            <TableCell>{r.target}</TableCell>
                                            <TableCell>{r.realized}</TableCell>
                                            <TableCell>{(parseFloat(r.progress) || 0).toFixed(0)}%</TableCell>
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

