// resources/js/components/objectives/controls.jsx
// Small presentational form primitives used across the Objectives page.
// If your project already ships an @/components/ui/button etc., delete these
// and import yours instead — the markup/classes below are the reference.

import { ChevronDown } from 'lucide-react';

const BTN_SIZES = { sm: 'h-8 px-3 text-[12px]', md: 'h-9 px-3.5 text-[13px]', lg: 'h-10 px-4 text-[13px]' };
const BTN_VARIANTS = {
  primary: 'bg-[#890505] text-white hover:bg-[#6d0404] active:bg-[#5a0303]',
  secondary: 'bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300',
  ghost: 'bg-transparent text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800',
};

export function Button({ variant = 'primary', size = 'md', icon: Icon, children, className = '', ...rest }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed select-none whitespace-nowrap ${BTN_SIZES[size]} ${BTN_VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {Icon && <Icon size={size === 'sm' ? 14 : 15} />}
      {children}
    </button>
  );
}

export function FieldSelect({ label, value, onChange, options, active = false, disabled = false }) {
  return (
    <label className={`flex flex-col gap-1.5 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <span className="text-[11px] font-medium text-neutral-500 tracking-wide uppercase">{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-full h-9 pl-3 pr-8 text-[13px] text-neutral-800 bg-white rounded-md appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#890505]/15 transition-shadow"
          style={{
            border: active ? '1px solid #890505' : '1px solid #e4e4e7',
            boxShadow: active ? '0 0 0 3px rgba(137,5,5,.06)' : 'none',
          }}
        >
          {options.map((o) => (
            <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
          ))}
        </select>
        <ChevronDown size={15} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
      </div>
    </label>
  );
}

export function NumberField({ label, value, onChange, suffix, note, decimal = false }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12px] font-medium text-neutral-700">{label}</span>
      <div className="relative">
        <input
          type="text"
          inputMode={decimal ? 'decimal' : 'numeric'}
          value={value}
          onChange={(e) => {
            const raw = e.target.value;
            onChange(decimal ? raw.replace(/[^0-9.]/g, '') : raw.replace(/[^0-9]/g, ''));
          }}
          className="w-full h-9 pl-3 pr-12 text-[13px] font-mono text-neutral-800 bg-white border border-neutral-200 rounded-md focus:outline-none focus:border-[#890505] focus:ring-2 focus:ring-[#890505]/10 transition"
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-mono text-neutral-400">{suffix}</span>
        )}
      </div>
      {note && <span className="text-[11px] italic text-neutral-400">{note}</span>}
    </label>
  );
}
