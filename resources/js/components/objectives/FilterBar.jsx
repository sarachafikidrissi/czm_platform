// resources/js/components/objectives/FilterBar.jsx
import { RotateCcw } from 'lucide-react';
import { FieldSelect } from './controls';

/**
 * Filter bar. Pure-presentational: it reports changes up via `onChange`/`onReset`;
 * the page component performs the Inertia navigation.
 *
 * Props:
 *   role      'admin' | 'manager' | 'conseiller'
 *   filters   { agency, user, month, year }   (current values)
 *   defaults  { agency, user, month, year }   (server defaults — used for "active" + dirty)
 *   options   { agencies: Option[], users: Option[], months: Option[], years: Option[] }
 *             where Option = string | { value, label }
 *   onChange(field, value)
 *   onReset()
 */
export default function FilterBar({ role, filters, defaults, options, onChange, onReset }) {
  const showAgency = role === 'admin';
  const showUser = role === 'admin' || role === 'manager';

  const isActive = (field) => String(filters[field]) !== String(defaults[field]);
  const isDirty = ['agency', 'user', 'month', 'year'].some(isActive);

  return (
    <div className="bg-white border border-neutral-200 rounded-xl px-4 py-3.5 sm:px-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {showAgency && (
          <FieldSelect
            label="Agence"
            value={filters.agency}
            options={options.agencies}
            active={isActive('agency')}
            onChange={(v) => onChange('agency', v)}
          />
        )}
        {showUser && (
          <FieldSelect
            label="Utilisateur"
            value={filters.user}
            options={options.users}
            active={isActive('user')}
            onChange={(v) => onChange('user', v)}
          />
        )}
        <FieldSelect
          label="Mois"
          value={filters.month}
          options={options.months}
          active={isActive('month')}
          onChange={(v) => onChange('month', v)}
        />
        <FieldSelect
          label="Année"
          value={filters.year}
          options={options.years}
          active={isActive('year')}
          onChange={(v) => onChange('year', v)}
        />
      </div>

      {isDirty && (
        <div className="flex justify-end mt-3">
          <button
            onClick={onReset}
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#890505] hover:text-[#6d0404] transition"
          >
            <RotateCcw size={13} /> Réinitialiser les filtres
          </button>
        </div>
      )}
    </div>
  );
}
