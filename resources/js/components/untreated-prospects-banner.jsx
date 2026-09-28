import { Button } from '@/components/ui/button';
import { AlertTriangle, Check, ChevronRight } from 'lucide-react';

export function UntreatedProspectsBanner({ summary, onFilterUntreated }) {
    const count = Number(summary?.count) || 0;
    if (count <= 0) {
        return null;
    }

    const headline =
        count === 1
            ? "1 prospect attend d'être traité"
            : `${count} prospects attendent d'être traités`;

    return (
        <div className="mb-4 flex flex-col gap-3 rounded-xl border border-rose-200 border-l-4 border-l-[#890505] bg-rose-50 py-4 pr-4 pl-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-10 flex-shrink-0 items-center justify-center rounded-lg bg-white text-[#890505] shadow-sm">
                    <AlertTriangle className="size-5" />
                </div>
                <p className="text-base font-bold text-[#890505]">{headline}</p>
            </div>
            <div className="flex flex-shrink-0 items-center sm:justify-end">
                <Button
                    type="button"
                    className="bg-[#890505] text-white hover:bg-[#6d0404]"
                    onClick={onFilterUntreated}
                >
                    Traiter maintenant
                    <ChevronRight className="ml-1 size-4" />
                </Button>
            </div>
        </div>
    );
}

export function UntreatedProspectsClearPill({ summary }) {
    const count = Number(summary?.count) || 0;
    if (count > 0) {
        return null;
    }

    return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
            <Check className="size-3.5" strokeWidth={2.5} />
            Aucun prospect en attente
        </span>
    );
}
