import { Head, router, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';

import AppLayout from '@/layouts/app-layout';
import { useMediaQuery } from '@/hooks/use-media-query';
import PerformanceTable from '@/components/objectives/PerformanceTable';
import KpiCards from '@/components/objectives/KpiCards';
import CommissionFooter from '@/components/objectives/CommissionFooter';
import EmptyState from '@/components/objectives/EmptyState';
import SkeletonRows from '@/components/objectives/SkeletonRows';
import DetailModal from '@/components/objectives/DetailModal';
import { FieldSelect } from '@/components/objectives/controls';

const MONTH_NAMES = [
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

function mapDetailsToHistory(type, data) {
    const rows = data?.details ?? [];
    if (type === 'ventes') {
        const mapped = rows.map((r) => ({
            date: r.bill_date || r.created_at?.slice(0, 10) || '—',
            client: r.user_name || '—',
            montant: parseFloat(r.total_amount) || 0,
            statut: 'Validé',
        }));
        const total = mapped.reduce((sum, r) => sum + r.montant, 0);
        return { rows: mapped, total };
    }
    if (type === 'membres') {
        const mapped = rows.map((r) => ({
            date: r.approved_at?.slice(0, 10) || '—',
            membre: r.name || '—',
            validePar: r.matchmaker_name || r.validated_by || '—',
        }));
        return { rows: mapped, total: mapped.length };
    }
    return { rows: [], total: 0 };
}

function buildKpis(objective, realized, commission) {
    const definitions = [
        { key: 'ventes', label: 'Ventes', active: true, target: 'target_ventes', unit: 'MAD' },
        { key: 'membres', label: 'Membres', active: true, target: 'target_membres', unit: '' },
        { key: 'rdv', label: 'RDV', active: false, target: 'target_rdv', unit: '' },
        { key: 'match', label: 'Match', active: false, target: 'target_match', unit: '' },
    ];

    return definitions.map((def) => {
        const commissionEntry = commission?.[def.key];
        let commissionStatus = 'noteligible';
        if (objective?.commission_paid && def.key === 'ventes') {
            commissionStatus = 'paid';
        } else if (commissionEntry?.eligible) {
            commissionStatus = 'eligible';
        }

        return {
            key: def.key,
            label: def.label,
            active: def.active,
            objectif: parseFloat(objective?.[def.target]) || 0,
            realise: parseFloat(realized?.[def.key]) || 0,
            unit: def.unit,
            commission: commissionStatus,
        };
    });
}

function buildHandoffCommission(commission, objective) {
    if (objective?.commission_paid) {
        return {
            status: 'paid',
            eligibleTotal: 0,
            paidTotal: parseFloat(commission?.summary?.total_amount) || 0,
        };
    }
    if (commission?.summary?.eligible) {
        return {
            status: 'eligible',
            eligibleTotal: parseFloat(commission?.summary?.total_amount) || 0,
            paidTotal: 0,
        };
    }
    return { status: 'none', eligibleTotal: 0, paidTotal: 0 };
}

export default function ManagerMyProduction() {
    const { objective, realized, commission, month, year, currentUser } = usePage().props;
    const [isNavigating, setIsNavigating] = useState(false);
    const [detailKpi, setDetailKpi] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const isMobile = useMediaQuery('(max-width: 767px)');

    useEffect(() => {
        setIsNavigating(false);
    }, [objective, realized, month, year]);

    const monthOptions = MONTH_NAMES.map((name, index) => ({
        value: String(index + 1),
        label: name,
    }));

    const yearOptions = Array.from({ length: 11 }, (_, i) => {
        const y = 2020 + i;
        return { value: String(y), label: String(y) };
    });

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

    const kpis = useMemo(() => buildKpis(objective, realized, commission), [objective, realized, commission]);
    const handoffCommission = useMemo(() => buildHandoffCommission(commission, objective), [commission, objective]);

    const period = {
        month: MONTH_NAMES[(month || 1) - 1],
        year,
        label: `${MONTH_NAMES[(month || 1) - 1]} ${year}`,
        scope: currentUser?.name ? `${currentUser.name} · Manager` : 'Ma production',
    };

    const openDetail = async (kpi) => {
        setDetailKpi({ ...kpi, history: null });
        setDetailLoading(true);

        try {
            const params = new URLSearchParams({
                type: kpi.key,
                month: String(month),
                year: String(year),
            });
            if (currentUser?.id) {
                params.set('user_id', String(currentUser.id));
            }

            const response = await fetch(`${route('objectives.details')}?${params.toString()}`, {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                credentials: 'same-origin',
            });

            if (!response.ok) {
                throw new Error('Failed to fetch details');
            }

            const data = await response.json();
            const history = mapDetailsToHistory(kpi.key, data);
            setDetailKpi({ ...kpi, history });
        } catch {
            setDetailKpi({ ...kpi, history: { rows: [], total: 0 }, loadError: true });
        } finally {
            setDetailLoading(false);
        }
    };

    return (
        <AppLayout>
            <Head title="Ma production" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4 w-full">
                <div className="flex items-center gap-3">
                    <div className="min-w-0">
                        <h1 className="text-[15px] font-semibold text-neutral-900 truncate">Ma production</h1>
                        <p className="text-[11.5px] text-neutral-400 -mt-0.5">{period.label}</p>
                    </div>
                </div>

                <div className="bg-white border border-neutral-200 rounded-xl px-4 py-3.5 sm:px-5">
                    <div className="grid grid-cols-2 gap-3 max-w-md">
                        <FieldSelect
                            label="Mois"
                            value={String(month)}
                            options={monthOptions}
                            onChange={(v) => handleMonthYearChange(parseInt(v, 10), year)}
                        />
                        <FieldSelect
                            label="Année"
                            value={String(year)}
                            options={yearOptions}
                            onChange={(v) => handleMonthYearChange(month, parseInt(v, 10))}
                        />
                    </div>
                </div>

                <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-neutral-100">
                        <h2 className="text-[14px] font-medium text-neutral-900">Suivi de Performance</h2>
                        <p className="text-[12px] text-neutral-400 mt-0.5">
                            {period.label} · {period.scope}
                        </p>
                    </div>

                    {isNavigating ? (
                        <SkeletonRows count={3} />
                    ) : objective === null ? (
                        <EmptyState role="manager" locale="fr" onDefine={() => {}} />
                    ) : (
                        <>
                            <div className="hidden md:block">
                                <PerformanceTable kpis={kpis} onOpenDetail={openDetail} />
                            </div>
                            <div className="md:hidden">
                                <KpiCards kpis={kpis} onOpenDetail={openDetail} />
                            </div>
                            <CommissionFooter commission={handoffCommission} role="manager" />
                        </>
                    )}
                </div>
            </div>

            <DetailModal
                open={!!detailKpi}
                onClose={() => setDetailKpi(null)}
                isMobile={isMobile}
                kpi={detailKpi}
                period={period}
                loading={detailLoading}
            />
        </AppLayout>
    );
}
