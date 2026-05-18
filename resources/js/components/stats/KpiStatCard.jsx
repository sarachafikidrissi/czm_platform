import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { TrendingDown, TrendingUp } from 'lucide-react';

/**
 * KpiStatCard — monthly KPI metric card.
 *
 * Props:
 *   label         string      e.g. "Prospects"
 *   subLabel      string      e.g. "nouveaux ce mois-ci"
 *   newThisMonth  number      primary stat
 *   totalActive   number      footer context
 *   totalLabel    string      e.g. "en base active"
 *   target        number|null from MonthlyObjective; hides progress bar if null
 *   vsLastMonth   number      signed delta (+2, -1, 0)
 *   icon          ReactNode   Lucide icon component
 *   color         'blue'|'green'|'emerald'|'amber'|'purple'|'red'
 *   deltaTooltip  string|null optional tooltip on delta badge
 *   iconTooltip   string|null optional tooltip on icon (used for Matchs)
 */
export default function KpiStatCard({
    label,
    subLabel = 'nouveaux ce mois-ci',
    newThisMonth = 0,
    totalActive = 0,
    totalLabel = 'en gestion active',
    target = null,
    vsLastMonth = 0,
    icon: Icon,
    color = 'blue',
    deltaTooltip = null,
    iconTooltip = null,
}) {
    const colorMap = {
        blue:    { bg: 'bg-blue-50',    icon: 'text-blue-500',    fill: 'bg-blue-500' },
        green:   { bg: 'bg-green-50',   icon: 'text-[#096725]',   fill: 'bg-[#096725]' },
        emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', fill: 'bg-emerald-600' },
        amber:   { bg: 'bg-amber-50',   icon: 'text-amber-500',   fill: 'bg-amber-500' },
        purple:  { bg: 'bg-purple-50',  icon: 'text-purple-500',  fill: 'bg-purple-500' },
        red:     { bg: 'bg-red-50',     icon: 'text-[#890505]',   fill: 'bg-[#890505]' },
    };

    const c = colorMap[color] ?? colorMap.blue;

    // Progress bar color based on completion %
    const pct = target ? Math.round((newThisMonth / target) * 100) : 0;
    const progressColor = pct >= 80 ? 'bg-[#096725]' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500';

    const deltaPositive = vsLastMonth > 0;
    const deltaNegative = vsLastMonth < 0;

    const DeltaBadge = (
        <span
            className={cn(
                'inline-flex items-center gap-0.5 text-xs font-semibold',
                deltaPositive && 'text-[#096725]',
                deltaNegative && 'text-red-500',
                !deltaPositive && !deltaNegative && 'text-muted-foreground',
            )}
        >
            {deltaPositive && <TrendingUp className="size-3" />}
            {deltaNegative && <TrendingDown className="size-3" />}
            {vsLastMonth === 0 ? '—' : `${vsLastMonth > 0 ? '+' : ''}${vsLastMonth}`}
        </span>
    );

    const IconChip = (
        <div className={cn('rounded-lg p-2 flex-shrink-0', c.bg)}>
            {Icon && <Icon className={cn('size-4', c.icon)} />}
        </div>
    );

    return (
        <TooltipProvider>
            <div className="rounded-xl border bg-white py-5 px-6 shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col gap-0">
                {/* Row 1: label + icon chip */}
                <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium text-muted-foreground">{label}</span>
                    {iconTooltip ? (
                        <Tooltip>
                            <TooltipTrigger asChild>{IconChip}</TooltipTrigger>
                            <TooltipContent side="top"><p className="max-w-[200px] text-xs">{iconTooltip}</p></TooltipContent>
                        </Tooltip>
                    ) : IconChip}
                </div>

                {/* Row 2: big number + delta */}
                <div className="mt-3 flex items-end justify-between gap-2">
                    <div>
                        <div className="text-3xl font-bold text-foreground leading-none">{newThisMonth}</div>
                        <div className="text-[11px] text-muted-foreground mt-1">{subLabel}</div>
                    </div>
                    {deltaTooltip ? (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span className="cursor-help">{DeltaBadge}</span>
                            </TooltipTrigger>
                            <TooltipContent side="top"><p className="max-w-[200px] text-xs">{deltaTooltip}</p></TooltipContent>
                        </Tooltip>
                    ) : DeltaBadge}
                </div>

                {/* Row 3: progress bar (only when target is set) */}
                {target !== null && target > 0 && (
                    <div className="mt-3">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-muted-foreground">vs objectif</span>
                            <span className={cn('text-xs font-semibold', pct >= 80 ? 'text-[#096725]' : pct >= 50 ? 'text-amber-600' : 'text-red-500')}>
                                {newThisMonth} / {target}
                            </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                            <div
                                className={cn('h-full rounded-full transition-all duration-500', progressColor)}
                                style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Dashed separator */}
                <div className="mt-3 pt-3 border-t border-dashed border-border" />

                {/* Row 4: total active footer */}
                <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-foreground">{totalActive}</span>
                    <span className="text-xs text-muted-foreground">{totalLabel}</span>
                </div>
            </div>
        </TooltipProvider>
    );
}

export function KpiStatCardSkeleton() {
    return (
        <div className="rounded-xl border bg-white py-5 px-6 shadow-sm flex flex-col gap-3">
            <div className="flex items-start justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
            <Skeleton className="h-9 w-16" />
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-1.5 w-full" />
            <div className="border-t border-dashed border-border mt-1 pt-3">
                <Skeleton className="h-4 w-28" />
            </div>
        </div>
    );
}
