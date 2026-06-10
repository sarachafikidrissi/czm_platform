// resources/js/components/objectives/CommissionFooter.jsx
import { Wallet, CheckCircle2 } from 'lucide-react';
import { mad } from '@/lib/objectives';
import { Button } from './controls';

/**
 * Conditional commission bar under the table.
 *  - eligible & unpaid → green badge + "Marquer payée" (admin only)
 *  - already paid      → blue "Commission payée" badge, no button
 *  - aggregate / none  → nothing
 *
 * Props:
 *   commission { status: 'eligible'|'paid'|'none'|'aggregate', eligibleTotal, paidTotal }
 *   role, onMarkPaid, processing
 */
export default function CommissionFooter({ commission, role, onMarkPaid, processing = false }) {
  if (!commission || commission.status === 'aggregate' || commission.status === 'none') return null;

  if (commission.status === 'eligible') {
    return (
      <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-t border-neutral-100 bg-[#e6f3ec]/40">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="inline-flex items-center gap-1.5 h-6 pl-2 pr-2.5 rounded-full text-[11px] font-medium"
            style={{ background: '#e6f3ec', color: '#0b2724' }}
          >
            <Wallet size={12} /> Commission éligible
          </span>
          <span className="text-[13px] font-mono font-semibold text-[#0b2724] tabular-nums">{mad(commission.eligibleTotal)}</span>
        </div>
        {role === 'admin' && (
          <Button variant="primary" size="sm" icon={CheckCircle2} onClick={onMarkPaid} disabled={processing}>
            Marquer payée
          </Button>
        )}
      </div>
    );
  }

  if (commission.status === 'paid') {
    return (
      <div className="flex items-center gap-2 px-5 py-3.5 border-t border-neutral-100 bg-[#e9f0fd]/40">
        <span
          className="inline-flex items-center gap-1.5 h-6 pl-2 pr-2.5 rounded-full text-[11px] font-medium"
          style={{ background: '#e9f0fd', color: '#1d4ed8' }}
        >
          <CheckCircle2 size={12} /> Commission payée
        </span>
        <span className="text-[13px] font-mono font-semibold text-[#1d4ed8] tabular-nums">{mad(commission.paidTotal)}</span>
      </div>
    );
  }

  return null;
}
