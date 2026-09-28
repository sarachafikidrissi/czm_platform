import { Badge } from '@/components/ui/badge';

function formatUntreatedLabel(count) {
    const safeCount = Number(count) || 0;
    return `${safeCount} non traité${safeCount === 1 ? '' : 's'}`;
}

export function UntreatedProspectBadge({ count = 0, className = '' }) {
    const safeCount = Number(count) || 0;

    return (
        <Badge
            variant="outline"
            className={`border-amber-300 bg-amber-50 text-amber-800 ${className}`.trim()}
        >
            {formatUntreatedLabel(safeCount)}
        </Badge>
    );
}

export function withUntreatedCount(label, count) {
    const safeCount = Number(count) || 0;
    return `${label} (${safeCount})`;
}
