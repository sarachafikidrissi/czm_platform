import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UNASSIGNED } from '@/hooks/use-match-results-browser';
import { MATCH_PRIMARY } from '@/lib/matchmaking-result-display';
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';

function CriterionSelect({ value, onChange, allLabel, options, extra = null }) {
    return (
        <Select value={value} onValueChange={onChange}>
            <SelectTrigger className="h-9 w-full rounded-lg sm:w-44">
                <SelectValue placeholder={allLabel} />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">{allLabel}</SelectItem>
                {extra}
                {options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                        {option.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

/** Search bar + agency / matchmaker filters for matchmaking results (state from useMatchResultsBrowser). */
export default function MatchResultsToolbar({ browser, children = null }) {
    const {
        search,
        setSearch,
        agency,
        setAgency,
        matchmaker,
        setMatchmaker,
        options,
        hasCriteria,
        clearCriteria,
        serverMode,
        loading,
        error,
        total,
    } = browser;

    return (
        <div className="space-y-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                <div className="relative w-full sm:w-64">
                    <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                    <Input
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Rechercher un profil (nom, email…)"
                        className="h-9 rounded-lg pl-9"
                    />
                </div>
                <CriterionSelect value={agency} onChange={setAgency} allLabel="Toutes les agences" options={options.agencies} />
                <CriterionSelect
                    value={matchmaker}
                    onChange={setMatchmaker}
                    allLabel="Tous les matchmakers"
                    options={options.matchmakers}
                    extra={<SelectItem value={UNASSIGNED}>Non assigné</SelectItem>}
                />
                {hasCriteria && (
                    <Button type="button" variant="ghost" size="sm" onClick={clearCriteria} className="h-9 rounded-lg">
                        <X className="mr-1 h-4 w-4" />
                        Effacer
                    </Button>
                )}
                {children}
            </div>
            {serverMode && (
                <p className={`text-xs ${error ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {error ??
                        (loading
                            ? 'Recherche dans toute la base…'
                            : `Recherche dans toute la base : ${total} profil${total > 1 ? 's' : ''} trouvé${total > 1 ? 's' : ''}.`)}
                </p>
            )}
        </div>
    );
}

/** Previous / page numbers / next, shared by the results page and the profile tab. */
export function MatchResultsPagination({ browser }) {
    const { currentPage, setCurrentPage, totalPages } = browser;
    if (totalPages <= 1) return null;

    return (
        <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
            <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage <= 1}
                className="border-border focus-visible:ring-ring rounded-lg focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50"
            >
                <ChevronLeft className="h-4 w-4" />
                Précédent
            </Button>
            <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                    <Button
                        key={pageNum}
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`focus-visible:ring-ring min-w-[2.25rem] rounded-lg focus-visible:ring-2 focus-visible:ring-offset-2 ${
                            currentPage === pageNum ? 'text-white' : 'border-border'
                        }`}
                        style={currentPage === pageNum ? { backgroundColor: MATCH_PRIMARY, borderColor: MATCH_PRIMARY } : undefined}
                    >
                        {pageNum}
                    </Button>
                ))}
            </div>
            <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage >= totalPages}
                className="border-border focus-visible:ring-ring rounded-lg focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50"
            >
                Suivant
                <ChevronRight className="h-4 w-4" />
            </Button>
        </div>
    );
}
