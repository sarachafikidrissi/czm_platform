// resources/js/components/objectives/ProgressBar.jsx
import { useEffect, useState } from 'react';
import { progressColor } from '@/lib/objectives';

/** Animated, threshold-colored progress bar. */
export default function ProgressBar({ value, width = 100 }) {
  const [w, setW] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setW(Math.min(100, value)), 60);
    return () => clearTimeout(t);
  }, [value]);

  const color = progressColor(value);

  return (
    <div className="flex items-center gap-2.5">
      <div className="rounded-full overflow-hidden" style={{ width, height: 8, background: '#ececed' }}>
        <div
          style={{
            width: `${w}%`,
            height: '100%',
            background: color,
            borderRadius: 999,
            transition: 'width 600ms cubic-bezier(.22,1,.36,1)',
          }}
        />
      </div>
      <span className="text-[12px] font-mono font-medium tabular-nums" style={{ color }}>{value}%</span>
    </div>
  );
}
