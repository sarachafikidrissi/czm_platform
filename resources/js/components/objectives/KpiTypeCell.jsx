// resources/js/components/objectives/KpiTypeCell.jsx
import { KPI_META } from '@/lib/objectives';

/** Icon square + label (+ "(non actif)" suffix for inactive KPIs). */
export default function KpiTypeCell({ kpi }) {
  const meta = KPI_META[kpi.key] ?? {};
  const Icon = meta.icon;
  const tint = meta.tint ?? { bg: '#f4f4f5', fg: '#525252' };

  return (
    <div className="flex items-center gap-2.5">
      <div
        className="flex items-center justify-center flex-shrink-0"
        style={{ width: 28, height: 28, borderRadius: 6, background: tint.bg, color: tint.fg }}
      >
        {Icon && <Icon size={15} />}
      </div>
      <span className="text-[13px] font-medium text-neutral-800">
        {kpi.label}
        {!kpi.active && <span className="ml-1.5 text-[11px] italic text-neutral-400">(non actif)</span>}
      </span>
    </div>
  );
}
