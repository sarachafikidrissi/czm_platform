import { useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import { Plus } from 'lucide-react';

import AppLayout from '@/layouts/app-layout';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/objectives/controls';
import FilterBar from '@/components/objectives/FilterBar';
import PerformanceTable from '@/components/objectives/PerformanceTable';
import KpiCards from '@/components/objectives/KpiCards';
import CommissionFooter from '@/components/objectives/CommissionFooter';
import EmptyState from '@/components/objectives/EmptyState';
import SkeletonRows from '@/components/objectives/SkeletonRows';
import EditObjectivesModal from '@/components/objectives/EditObjectivesModal';
import DetailModal from '@/components/objectives/DetailModal';

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

export default function ObjectivesIndex({
    role: viewRole,
    locale = 'fr',
    period,
    filters: initialFilters,
    filterDefaults,
    filterOptions,
    objective,
    kpis = [],
    commission,
    staff = [],
    existingObjectives = {},
    payableObjectiveId = null,
}) {
    const page = usePage();

    if (viewRole === 'conseiller') {
        page.props.role = 'matchmaker';
    }

    const { showToast } = useToast();
    const isMobile = useMediaQuery('(max-width: 767px)');

    const [filters, setFilters] = useState(initialFilters);
    const [loading, setLoading] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [detailKpi, setDetailKpi] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [paying, setPaying] = useState(false);

    const buildQuery = (next) => {
        const query = {
            month: next.month,
            year: next.year,
        };
        if (next.user) query.user_id = next.user;
        if (next.agency) query.agency_id = next.agency;
        return query;
    };

    const navigate = (next) => {
        setFilters(next);
        router.get(route('objectives.index'), buildQuery(next), {
            preserveState: true,
            preserveScroll: true,
            replace: true,
            onStart: () => setLoading(true),
            onFinish: () => setLoading(false),
        });
    };

    const onFilterChange = (field, value) => navigate({ ...filters, [field]: value });
    const onReset = () => navigate({ ...filterDefaults });

    const markPaid = () => {
        if (!payableObjectiveId) return;
        router.post(route('objectives.mark-commission-paid', payableObjectiveId), {}, {
            preserveScroll: true,
            onStart: () => setPaying(true),
            onFinish: () => setPaying(false),
            onSuccess: () => showToast('Commission marquée comme payée', undefined, 'success'),
            onError: () => showToast('Erreur lors du marquage', undefined, 'error'),
        });
    };

    const openDetail = async (kpi) => {
        setDetailKpi({ ...kpi, history: null });
        setDetailLoading(true);

        try {
            const params = new URLSearchParams({
                type: kpi.key,
                month: filters.month,
                year: filters.year,
            });
            if (filters.user) params.set('user_id', filters.user);
            if (filters.agency) params.set('agency_id', filters.agency);

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

    const canDefine = viewRole === 'admin';

    return (
        <AppLayout>
            <Head title="Objectifs Mensuels & Performance" />

            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4 w-full">
                <div className="flex items-center gap-3">
                    <div className="min-w-0">
                        <h1 className="text-[15px] font-semibold text-neutral-900 truncate">
                            Objectifs Mensuels &amp; Performance
                        </h1>
                        <p className="text-[11.5px] text-neutral-400 -mt-0.5">Suivi des cibles &amp; commissions</p>
                    </div>
                    {canDefine && (
                        <div className="ml-auto">
                            <Button variant="primary" icon={Plus} onClick={() => setEditOpen(true)}>
                                <span className="hidden sm:inline">Définir les objectifs</span>
                                <span className="sm:hidden">Objectifs</span>
                            </Button>
                        </div>
                    )}
                </div>

                <FilterBar
                    role={viewRole}
                    filters={filters}
                    defaults={filterDefaults}
                    options={filterOptions}
                    onChange={onFilterChange}
                    onReset={onReset}
                />

                <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-neutral-100">
                        <h2 className="text-[14px] font-medium text-neutral-900">Suivi de Performance</h2>
                        <p className="text-[12px] text-neutral-400 mt-0.5">
                            {period?.label} · {period?.scope}
                        </p>
                    </div>

                    {loading ? (
                        <SkeletonRows count={3} />
                    ) : objective === null ? (
                        <EmptyState role={viewRole} locale={locale} onDefine={() => setEditOpen(true)} />
                    ) : (
                        <>
                            <div className="hidden md:block">
                                <PerformanceTable kpis={kpis} onOpenDetail={openDetail} />
                            </div>
                            <div className="md:hidden">
                                <KpiCards kpis={kpis} onOpenDetail={openDetail} />
                            </div>
                            <CommissionFooter
                                commission={commission}
                                role={viewRole}
                                onMarkPaid={markPaid}
                                processing={paying}
                            />
                        </>
                    )}
                </div>
            </div>

            {canDefine && (
                <EditObjectivesModal
                    open={editOpen}
                    onClose={() => setEditOpen(false)}
                    isMobile={isMobile}
                    period={period}
                    staff={staff}
                    filters={filters}
                    existingObjectives={existingObjectives}
                />
            )}

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
