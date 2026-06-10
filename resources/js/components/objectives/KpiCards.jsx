// resources/js/components/objectives/KpiCards.jsx
import { Eye } from 'lucide-react';
import { formatValue, pct } from '@/lib/objectives';
import KpiTypeCell from './KpiTypeCell';
import ProgressBar from './ProgressBar';
import CommissionPill from './CommissionPill';

/** Mobile layout: one card per KPI (replaces the table below md). */
export default function KpiCards({ kpis, onOpenDetail }) {
  return (
    <div className="flex flex-col gap-3 p-3">
      {kpis.map((kpi) => (
        <div key={kpi.key} className="border border-neutral-200 rounded-lg p-3.5">
          <div className="flex items-center justify-between mb-3">
            <KpiTypeCell kpi={kpi} />
            <button
              onClick={() => onOpenDetail(kpi)}
              className="inline-flex items-center justify-center w-8 h-8 rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition"
            >
              <Eye size={16} />
            </button>
          </div>

          <div className="flex items-center justify-between gap-3 text-[12.5px] mb-1.5">
            <span className="text-neutral-400 flex-shrink-0">Objectif</span>
            <span className="font-mono font-medium text-neutral-700 whitespace-nowrap">{formatValue(kpi, 'objectif')}</span>
          </div>
          <div className="flex items-center justify-between gap-3 text-[12.5px] mb-3.5">
            <span className="text-neutral-400 flex-shrink-0">Réalisé</span>
            <span className="font-mono font-medium text-neutral-900 whitespace-nowrap">{formatValue(kpi, 'realise')}</span>
          </div>

          <div className="mb-3">
            <ProgressBar value={pct(kpi.realise, kpi.objectif)} width={180} />
          </div>
          <CommissionPill status={kpi.commission} />
        </div>
      ))}
    </div>
  );
}
