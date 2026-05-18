import { Button } from '@/components/ui/button';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { router } from '@inertiajs/react';
import { Building2, User, X } from 'lucide-react';
import { useCallback } from 'react';

/**
 * KpiFilterBar — admin cascade filter (agency → matchmaker).
 *
 * Props:
 *   agencies          array   [{ id, name }]
 *   matchmakers       array   [{ id, name, agency_id }] — already filtered by server
 *   agencyId          number|null   currently active agency filter
 *   matchmakerId      number|null   currently active matchmaker filter
 *   month             number
 *   year              number
 */
export default function KpiFilterBar({
    agencies = [],
    matchmakers = [],
    agencyId = null,
    matchmakerId = null,
    month,
    year,
}) {
    const agencyOptions = agencies.map((a) => ({ value: String(a.id), label: a.name }));
    const mmOptions     = matchmakers.map((m) => ({ value: String(m.id), label: m.name }));

    const hasFilter = agencyId || matchmakerId;

    const applyFilter = useCallback((newAgencyId, newMatchmakerId) => {
        const params = { month, year };
        if (newAgencyId)    params.agency_id     = newAgencyId;
        if (newMatchmakerId) params.matchmaker_id = newMatchmakerId;
        router.get(route('dashboard'), params, {
            preserveState: true, preserveScroll: true, only: ['kpiStats'],
        });
    }, [month, year]);

    const handleAgencyChange = (val) => {
        // When agency changes, clear matchmaker (cascade)
        applyFilter(val || null, null);
    };

    const handleMatchmakerChange = (val) => {
        applyFilter(agencyId, val || null);
    };

    const handleReset = () => {
        router.get(route('dashboard'), { month, year }, {
            preserveState: true, preserveScroll: true, only: ['kpiStats'],
        });
    };

    const agencyName     = agencies.find((a) => a.id === agencyId)?.name;
    const matchmakerName = matchmakers.find((m) => m.id === matchmakerId)?.name;

    return (
        <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-3">
                {/* Agency filter */}
                <div className="w-52">
                    <SearchableSelect
                        options={[{ value: '', label: 'Toutes les agences' }, ...agencyOptions]}
                        value={agencyId ? String(agencyId) : ''}
                        onValueChange={handleAgencyChange}
                        placeholder="Toutes les agences"
                    />
                </div>

                {/* Matchmaker filter — cascades from agency */}
                <div className="w-52">
                    <SearchableSelect
                        options={[{ value: '', label: 'Tous les conseillers' }, ...mmOptions]}
                        value={matchmakerId ? String(matchmakerId) : ''}
                        onValueChange={handleMatchmakerChange}
                        placeholder="Tous les conseillers"
                        disabled={mmOptions.length === 0}
                    />
                </div>

                {/* Reset button */}
                {hasFilter && (
                    <Button variant="ghost" size="sm" onClick={handleReset} className="text-muted-foreground gap-1.5">
                        <X className="size-3.5" />
                        Réinitialiser
                    </Button>
                )}
            </div>

            {/* Active filter breadcrumb pill */}
            {hasFilter && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground animate-in slide-in-from-top-1 duration-200">
                    <span className="font-medium text-foreground">Affichage :</span>
                    {agencyName && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
                            <Building2 className="size-3" />
                            {agencyName}
                        </span>
                    )}
                    {agencyName && matchmakerName && <span className="text-muted-foreground">›</span>}
                    {matchmakerName && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
                            <User className="size-3" />
                            {matchmakerName}
                        </span>
                    )}
                    <button
                        onClick={handleReset}
                        className="inline-flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors ml-1"
                    >
                        <X className="size-3" /> Réinitialiser
                    </button>
                </div>
            )}
        </div>
    );
}
