// resources/js/components/objectives/CommissionPill.jsx
import { Check, X, CheckCircle2, Minus } from 'lucide-react';
import { COMMISSION_META } from '@/lib/objectives';

const ICONS = { eligible: Check, noteligible: X, paid: CheckCircle2, aggregate: Minus };

/** Commission status badge. status: 'eligible' | 'noteligible' | 'paid' | 'aggregate'. */
export default function CommissionPill({ status }) {
  const meta = COMMISSION_META[status] ?? COMMISSION_META.noteligible;
  const Icon = ICONS[status] ?? X;

  return (
    <span
      className="inline-flex items-center gap-1.5 h-6 pl-2 pr-2.5 rounded-full text-[11px] font-medium"
      style={{ background: meta.bg, color: meta.fg }}
    >
      <Icon size={12} strokeWidth={2.4} />
      {meta.label}
    </span>
  );
}
