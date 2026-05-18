import { Button } from '@/components/ui/button';
import { router } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback } from 'react';

const MONTH_NAMES_FR = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

/**
 * MonthSelector — "← Février 2026 →"
 *
 * Props:
 *   month        number  1-12 (current selected month)
 *   year         number  four-digit year
 *   extraParams  object  additional params to merge into the router.get call
 *                        (e.g. agency_id, matchmaker_id)
 *   disabled     bool    disables both arrows (during loading)
 */
export default function MonthSelector({ month, year, extraParams = {}, disabled = false }) {
    const now = new Date();
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

    const navigate = useCallback((deltaMonths) => {
        let newMonth = month + deltaMonths;
        let newYear  = year;
        if (newMonth < 1)  { newMonth = 12; newYear -= 1; }
        if (newMonth > 12) { newMonth = 1;  newYear += 1; }

        router.get(
            route('dashboard'),
            { month: newMonth, year: newYear, ...extraParams },
            { preserveState: true, preserveScroll: true, only: ['kpiStats'] },
        );
    }, [month, year, extraParams]);

    return (
        <div className="flex items-center gap-1">
            <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => navigate(-1)}
                disabled={disabled}
                aria-label="Mois précédent"
            >
                <ChevronLeft className="size-4" />
            </Button>

            <span className="text-sm font-medium text-foreground min-w-[130px] text-center select-none">
                {MONTH_NAMES_FR[month - 1]} {year}
            </span>

            <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => navigate(1)}
                disabled={disabled || isCurrentMonth}
                aria-label="Mois suivant"
            >
                <ChevronRight className="size-4" />
            </Button>
        </div>
    );
}
