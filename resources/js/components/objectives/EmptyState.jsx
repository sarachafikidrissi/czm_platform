// resources/js/components/objectives/EmptyState.jsx
import { Target, Plus } from 'lucide-react';
import { EMPTY_COPY } from '@/lib/objectives';
import { Button } from './controls';

/**
 * Shown when `objective === null`. Localized message + admin-only CTA.
 * Props: role, locale ('fr'|'en'|'ar'), onDefine
 */
export default function EmptyState({ role, locale = 'fr', onDefine }) {
  const copy = EMPTY_COPY[locale] ?? EMPTY_COPY.fr;

  return (
    <div
      className="flex flex-col items-center justify-center text-center px-6 py-12"
      dir={copy.rtl ? 'rtl' : 'ltr'}
    >
      {/* Swap for Tabler's <IconTargetOff/> if the project uses Tabler. */}
      <div className="text-neutral-300 mb-4">
        <Target size={48} strokeWidth={1.4} />
      </div>
      <p
        className="text-[14px] text-neutral-500 max-w-xs"
        style={copy.rtl ? { fontFamily: "'IBM Plex Sans Arabic', sans-serif" } : undefined}
      >
        {copy.text}
      </p>
      {role === 'admin' && (
        <div className="mt-5">
          <Button variant="primary" icon={Plus} onClick={onDefine}>{copy.cta}</Button>
        </div>
      )}
    </div>
  );
}
