// resources/js/components/objectives/Modal.jsx
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

/**
 * Responsive modal shell:
 *  - desktop  → centered dialog
 *  - mobile   → bottom sheet (slides up, drag handle)
 * Entrance/exit handled with Tailwind transition utilities (no custom keyframes).
 */
export function Modal({ open, onClose, isMobile, maxWidth = 520, children }) {
  const [mounted, setMounted] = useState(false);
  const [show, setShow] = useState(false);

  // mount → next frame → animate in
  useEffect(() => {
    if (open) {
      setMounted(true);
      const id = requestAnimationFrame(() => setShow(true));
      return () => cancelAnimationFrame(id);
    }
    setShow(false);
    const t = setTimeout(() => setMounted(false), 250); // wait for exit transition
    return () => clearTimeout(t);
  }, [open]);

  // escape + scroll lock
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!mounted) return null;

  return (
    <div className={`fixed inset-0 z-[100] flex ${isMobile ? 'items-end' : 'items-center'} justify-center`}>
      <div
        className={`absolute inset-0 bg-neutral-900/40 backdrop-blur-[1px] transition-opacity duration-200 ${show ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <div
        className={[
          'relative bg-white flex flex-col transition-all',
          isMobile
            ? `w-full rounded-t-2xl duration-300 ${show ? 'translate-y-0' : 'translate-y-full'}`
            : `rounded-xl duration-200 ${show ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`,
        ].join(' ')}
        style={{
          maxWidth: isMobile ? '100%' : maxWidth,
          width: isMobile ? '100%' : 'calc(100% - 3rem)',
          maxHeight: isMobile ? '92%' : '80vh',
          boxShadow: '0 20px 60px -12px rgba(0,0,0,.28)',
        }}
      >
        {isMobile && (
          <div className="flex justify-center pt-2.5 pb-1 flex-shrink-0">
            <div className="w-10 h-1 rounded-full bg-neutral-300" />
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

export function ModalHeader({ icon: Icon, iconTint, title, subtitle, onClose }) {
  return (
    <div className="flex items-start gap-3 px-5 pt-4 pb-3.5 border-b border-neutral-100 flex-shrink-0">
      {Icon && (
        <div
          className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0"
          style={{ background: iconTint?.bg || '#f4f4f5', color: iconTint?.fg || '#525252' }}
        >
          <Icon size={16} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h2 className="text-[14.5px] font-semibold text-neutral-900 leading-tight">{title}</h2>
        {subtitle && <p className="text-[12px] text-neutral-500 mt-0.5 leading-snug">{subtitle}</p>}
      </div>
      <button
        onClick={onClose}
        className="flex items-center justify-center w-7 h-7 -mt-0.5 -mr-1 rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition flex-shrink-0"
      >
        <X size={16} />
      </button>
    </div>
  );
}
