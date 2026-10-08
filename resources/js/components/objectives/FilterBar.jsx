// resources/js/components/objectives/FilterBar.jsx
import { ChevronDown, RotateCcw } from 'lucide-react';
import { FieldSelect } from './controls';

/**
 * Filter bar. Pure-presentational: it reports changes up via `onChange`/`onReset`;
 * the page component performs the Inertia navigation.
 *
 * Props:
 *   role      'admin' | 'manager' | 'matchmaker'
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
          (options.matchmakers?.length > 0) || (options.managers?.length > 0) ? (
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-medium text-neutral-500 tracking-wide uppercase">Utilisateur</span>
              <div className="relative">
                <select
                  value={filters.user}
                  onChange={(e) => onChange('user', e.target.value)}
                  className="w-full h-9 pl-3 pr-8 text-[13px] text-neutral-800 bg-white rounded-md appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#890505]/15 transition-shadow"
                  style={{
                    border: isActive('user') ? '1px solid #890505' : '1px solid #e4e4e7',
                    boxShadow: isActive('user') ? '0 0 0 3px rgba(137,5,5,.06)' : 'none',
                  }}
                >
                  <option value="">Tous les utilisateurs</option>
                  {(options.matchmakers ?? []).length > 0 && (
                    <optgroup label="Matchmakers">
                      {(options.matchmakers ?? []).map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </optgroup>
                  )}
                  {(options.managers ?? []).length > 0 && (
                    <optgroup label="Managers">
                      {(options.managers ?? []).map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <ChevronDown size={15} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
              </div>
            </label>
          ) : (
            <FieldSelect
              label="Utilisateur"
              value={filters.user}
              options={options.users}
              active={isActive('user')}
              onChange={(v) => onChange('user', v)}
            />
          )
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
