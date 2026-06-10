// resources/js/components/objectives/DetailModal.jsx
import { Receipt, Inbox } from 'lucide-react';
import { mad, KPI_META } from '@/lib/objectives';
import { Modal, ModalHeader } from './Modal';
import { Button } from './controls';

/**
 * Drilldown opened by the eye icon.
 * Props:
 *   open, onClose, isMobile, period
 *   kpi  the selected row, expected shape:
 *     { key, label, unit, history: { rows: [...], total: number } }
 *     - ventes  rows: { date, client, montant, statut }
 *     - membres rows: { date, membre, validePar }
 *   If `history` is loaded lazily, pass a `loading` flag and render a spinner.
 */
export default function DetailModal({ open, onClose, isMobile, kpi, period, loading = false }) {
  if (!kpi) return null;

  const rows = kpi.history?.rows ?? [];
  const total = kpi.history?.total ?? (kpi.key === 'ventes' ? 0 : rows.length);
  const isVentes = kpi.key === 'ventes';
  const tint = KPI_META[kpi.key]?.tint;
  const HeaderIcon = isVentes ? Receipt : KPI_META[kpi.key]?.icon;
  const maxWidth = isVentes ? 560 : 460;
  const subtitle = isVentes
    ? `${period?.label ?? ''} · Total : ${mad(total)}`
    : `${period?.label ?? ''} · Total : ${total} membre${total > 1 ? 's' : ''}`;

  return (
    <Modal open={open} onClose={onClose} isMobile={isMobile} maxWidth={maxWidth}>
      <ModalHeader icon={HeaderIcon} iconTint={tint} title={`${kpi.label} — Historique`} subtitle={subtitle} onClose={onClose} />

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center text-center px-6 py-10">
            <div className="text-neutral-400 text-[13px]">Chargement...</div>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center px-6 py-10">
            <div className="text-neutral-300 mb-3"><Inbox size={36} strokeWidth={1.5} /></div>
            <p className="text-[13px] text-neutral-500">Aucun {kpi.label.toLowerCase()} trouvé pour cette période.</p>
          </div>
        ) : isVentes ? (
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-neutral-400 text-left">
                <th className="font-medium px-5 py-2.5">Date</th>
                <th className="font-medium px-3 py-2.5">Client</th>
                <th className="font-medium px-3 py-2.5 text-right">Montant</th>
                <th className="font-medium px-5 py-2.5 text-right">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {rows.map((r, i) => (
                <tr key={i} className="hover:bg-neutral-50/60">
                  <td className="px-5 py-2.5 font-mono text-neutral-500">{r.date}</td>
                  <td className="px-3 py-2.5 text-neutral-800">{r.client}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-neutral-800">{mad(r.montant)}</td>
                  <td className="px-5 py-2.5 text-right">
                    <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${r.statut === 'Validé' ? 'bg-[#e6f3ec] text-[#15803d]' : 'bg-[#fdf0e0] text-[#c2740a]'}`}>{r.statut}</span>
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-neutral-200 font-semibold">
                <td className="px-5 py-2.5 text-neutral-500" colSpan={2}>Total</td>
                <td className="px-3 py-2.5 text-right font-mono text-neutral-900">{mad(total)}</td>
                <td className="px-5 py-2.5" />
              </tr>
            </tbody>
          </table>
        ) : (
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-neutral-400 text-left">
                <th className="font-medium px-5 py-2.5">Date</th>
                <th className="font-medium px-3 py-2.5">Membre</th>
                <th className="font-medium px-5 py-2.5 text-right">Validé par</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {rows.map((r, i) => (
                <tr key={i} className="hover:bg-neutral-50/60">
                  <td className="px-5 py-2.5 font-mono text-neutral-500">{r.date}</td>
                  <td className="px-3 py-2.5 text-neutral-800">{r.membre}</td>
                  <td className="px-5 py-2.5 text-right text-neutral-500">{r.validePar}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-neutral-200 font-semibold">
                <td className="px-5 py-2.5 text-neutral-500">Total</td>
                <td className="px-3 py-2.5 text-neutral-900">{total} membres</td>
                <td className="px-5 py-2.5" />
              </tr>
            </tbody>
          </table>
        )}
      </div>

      <div className="flex items-center justify-end px-5 py-3.5 border-t border-neutral-100 flex-shrink-0">
        <Button variant="secondary" onClick={onClose}>Fermer</Button>
      </div>
    </Modal>
  );
}
