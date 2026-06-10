// resources/js/components/objectives/PerformanceTable.jsx
import { Eye } from 'lucide-react';
import { formatValue, pct } from '@/lib/objectives';
import KpiTypeCell from './KpiTypeCell';
import ProgressBar from './ProgressBar';
import CommissionPill from './CommissionPill';

/** Desktop / tablet KPI table. `onOpenDetail(kpi)` opens the drilldown. */
export default function PerformanceTable({ kpis, onOpenDetail }) {
  return (
    <table className="w-full">
      <thead>
        <tr className="text-[11px] uppercase tracking-wide text-neutral-400 text-left border-b border-neutral-100">
          <th className="font-medium px-5 py-3">Type</th>
          <th className="font-medium px-3 py-3">Objectif</th>
          <th className="font-medium px-3 py-3">Réalisé</th>
          <th className="font-medium px-3 py-3">Progression</th>
          <th className="font-medium px-3 py-3">Commission</th>
          <th className="font-medium px-5 py-3 w-px" />
        </tr>
      </thead>
      <tbody className="divide-y divide-neutral-100">
        {kpis.map((kpi) => (
          <tr key={kpi.key} className="hover:bg-neutral-50/50 transition-colors">
            <td className="px-5 py-3.5"><KpiTypeCell kpi={kpi} /></td>
            <td className="px-3 py-3.5 text-[13px] font-mono font-medium text-neutral-700 tabular-nums">{formatValue(kpi, 'objectif')}</td>
            <td className="px-3 py-3.5 text-[13px] font-mono font-medium text-neutral-900 tabular-nums">{formatValue(kpi, 'realise')}</td>
            <td className="px-3 py-3.5"><ProgressBar value={pct(kpi.realise, kpi.objectif)} /></td>
            <td className="px-3 py-3.5"><CommissionPill status={kpi.commission} /></td>
            <td className="px-5 py-3.5 text-right">
              <button
                onClick={() => onOpenDetail(kpi)}
                title="Voir le détail"
                className="inline-flex items-center justify-center w-8 h-8 rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition"
              >
                <Eye size={16} />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
