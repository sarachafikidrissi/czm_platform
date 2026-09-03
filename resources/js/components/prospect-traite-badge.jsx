import { Badge } from '@/components/ui/badge';

export function ProspectTraiteBadge({ isTraite }) {
    return (
        <Badge
            variant={isTraite ? 'default' : 'outline'}
            className={isTraite ? 'bg-emerald-600 text-white hover:bg-emerald-600' : 'border-slate-300 text-slate-600'}
        >
            {isTraite ? 'Traité' : 'Non traité'}
        </Badge>
    );
}
