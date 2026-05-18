import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { router } from '@inertiajs/react';
import { AlertTriangle, CalendarPlus, CreditCard, Crown, Flame, HeartHandshake, RefreshCw, UserPlus } from 'lucide-react';
import KpiStatCard, { KpiStatCardSkeleton } from './KpiStatCard';

const CARD_DEFS = [
    {
        key: 'prospects',
        label: 'Prospects',
        subLabel: 'nouveaux ce mois-ci',
        totalLabel: 'en base active',
        icon: UserPlus,
        color: 'blue',
        deltaTooltip: 'Variation par rapport au mois précédent',
    },
    {
        key: 'membres',
        label: 'Membres',
        subLabel: 'actifs ce mois',
        totalLabel: 'abonnements actifs',
        icon: CreditCard,
        color: 'green',
        deltaTooltip: 'Variation par rapport au mois précédent',
    },
    {
        key: 'clients',
        label: 'Clients',
        subLabel: 'en portefeuille',
        totalLabel: 'en gestion active',
        icon: Crown,
        color: 'emerald',
        deltaTooltip: 'Variation par rapport au mois précédent',
    },
    {
        key: 'propositions',
        label: 'Propositions',
        subLabel: 'en attente retour',
        totalLabel: 'en cours',
        icon: Flame,
        color: 'amber',
        deltaTooltip: 'Variation par rapport au mois précédent',
    },
    {
        key: 'rdvs',
        label: 'RDVs',
        subLabel: 'planifiés ce mois',
        totalLabel: 'ce mois',
        icon: CalendarPlus,
        color: 'purple',
        deltaTooltip: 'Variation par rapport au mois précédent',
    },
    {
        key: 'matchs',
        label: 'Matchs',
        subLabel: 'RDVs réussis',
        totalLabel: 'matchs validés',
        icon: HeartHandshake,
        color: 'red',
        deltaTooltip: 'Variation par rapport au mois précédent',
        iconTooltip: 'RDV marqué réussi — les deux personnes se sont rencontrées avec succès.',
    },
];

/**
 * KpiStatsGrid — renders the 6-card grid in one of 3 states:
 *   loading  → 6 skeleton cards
 *   error    → full-width alert with retry button
 *   success  → 6 KpiStatCard components
 *
 * Props:
 *   cards      object|null  keyed by metric name (from kpiStats.cards)
 *   loading    bool
 *   error      any          truthy = show error state
 *   month      number
 *   year       number
 *   extraParams object       forwarded to retry router.get
 */
export default function KpiStatsGrid({ cards, loading = false, error = null, month, year, extraParams = {} }) {
    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {CARD_DEFS.map((def) => <KpiStatCardSkeleton key={def.key} />)}
            </div>
        );
    }

    if (error) {
        return (
            <Alert variant="warning" className="bg-amber-50 border-amber-200">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <div className="flex items-center justify-between w-full gap-4">
                    <div>
                        <AlertTitle className="text-amber-800">Impossible de charger les statistiques</AlertTitle>
                        <AlertDescription className="text-amber-700 text-sm">
                            Une erreur est survenue. Veuillez réessayer.
                        </AlertDescription>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        className="flex-shrink-0 border-amber-400 text-amber-800 hover:bg-amber-100"
                        onClick={() =>
                            router.get(route('dashboard'), { month, year, ...extraParams }, {
                                preserveState: true, preserveScroll: true, only: ['kpiStats'],
                            })
                        }
                    >
                        <RefreshCw className="size-3.5 mr-1.5" />
                        Réessayer
                    </Button>
                </div>
            </Alert>
        );
    }

    if (!cards) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {CARD_DEFS.map((def) => {
                const data = cards[def.key] ?? { new_this_month: 0, total_active: 0, vs_last_month: 0, target: null };
                return (
                    <KpiStatCard
                        key={def.key}
                        label={def.label}
                        subLabel={def.subLabel}
                        totalLabel={def.totalLabel}
                        icon={def.icon}
                        color={def.color}
                        newThisMonth={data.new_this_month ?? 0}
                        totalActive={data.total_active ?? 0}
                        vsLastMonth={data.vs_last_month ?? 0}
                        target={data.target ?? null}
                        deltaTooltip={def.deltaTooltip}
                        iconTooltip={def.iconTooltip ?? null}
                    />
                );
            })}
        </div>
    );
}
