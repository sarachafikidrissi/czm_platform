// resources/js/lib/objectives.js
// Presentation-only constants & formatters for the Objectives page.
// These are design decisions (icon + tint per KPI type), NOT data — they stay
// on the frontend. All numeric/label data arrives from the Inertia controller.

import { ShoppingCart, Users, Calendar, Heart } from 'lucide-react';

/** Locale-aware number formatter → "14 500" */
export const fmt = (n) => new Intl.NumberFormat('fr-FR').format(n ?? 0);

/** Money formatter → "14 500 MAD" */
export const mad = (n) => `${fmt(n)} MAD`;

/** Progress percentage, capped, integer. */
export const pct = (realise, objectif) =>
  objectif ? Math.min(999, Math.round((realise / objectif) * 100)) : 0;

/** Threshold color: <50 red, 50–79 amber, 80+ green. */
export const progressColor = (v) => (v >= 80 ? '#22c55e' : v >= 50 ? '#f59e0b' : '#ef4444');

/** Format a kpi field respecting its unit. key = 'objectif' | 'realise'. */
export const formatValue = (kpi, key) => (kpi.unit === 'MAD' ? mad(kpi[key]) : fmt(kpi[key]));

/**
 * Per-KPI presentation metadata, keyed by kpi.key.
 * Swap the icon imports for your Tabler equivalents if the project uses Tabler:
 *   ventes → IconShoppingCart, membres → IconUsers, rdv → IconCalendar, match → IconHeart
 */
export const KPI_META = {
  ventes:  { icon: ShoppingCart, tint: { bg: '#e9f0fd', fg: '#2563eb' } },
  membres: { icon: Users,        tint: { bg: '#e6f3ec', fg: '#15803d' } },
  rdv:     { icon: Calendar,     tint: { bg: '#fdf0e0', fg: '#c2740a' } },
  match:   { icon: Heart,        tint: { bg: '#fce8f1', fg: '#db2777' } },
};

/** Commission badge presentation, keyed by status string from the API. */
export const COMMISSION_META = {
  eligible:    { label: 'Éligible',     bg: '#e6f3ec', fg: '#0b2724' },
  noteligible: { label: 'Non éligible', bg: '#f4f4f5', fg: '#71717a' },
  paid:        { label: 'Payée',        bg: '#e9f0fd', fg: '#1d4ed8' },
  aggregate:   { label: 'Agrégat',      bg: '#f4f4f5', fg: '#71717a' },
};

/** Empty-state copy by locale (route through your i18n layer if you have one). */
export const EMPTY_COPY = {
  fr: { text: "Aucun objectif n'a été défini pour ce mois.", cta: 'Définir un objectif', rtl: false },
  en: { text: 'No objective has been set for this month.',    cta: 'Set an objective',    rtl: false },
  ar: { text: 'لم يتم تحديد أي هدف لهذا الشهر.',              cta: 'تحديد هدف',           rtl: true  },
};
