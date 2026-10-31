'use client';

// Animated modal shell. Adapted from the idea behind Aceternity UI's "Animated Modal" (written for
// this app). Desktop: scale + fade with a soft spring. Narrow screens: a bottom sheet that slides up.
// Low-end devices: a short fade, no backdrop blur.
import { m } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useStore } from '@/lib/store';

interface Props {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  onClose(): void;
  width?: number;
  children: React.ReactNode;
  /** Custom header (detail view); replaces the title row. */
  header?: React.ReactNode;
  padded?: boolean;
  labelledBy?: string;
}

function useNarrow() {
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.innerWidth < 640);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const on = () => setNarrow(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return narrow;
}

export default function ModalShell({ title, subtitle, onClose, width = 680, children, header, padded = true }: Props) {
  const lowEnd = useStore((s) => s.lowEnd);
  const narrow = useNarrow();
  const panel = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    panel.current?.focus({ preventScroll: true });
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current();
    };
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('keydown', key);
      prev?.focus?.({ preventScroll: true });
    };
  }, []);

  const transition = lowEnd
    ? { duration: 0.12 }
    : narrow
      ? { type: 'tween' as const, duration: 0.24, ease: [0.2, 0.8, 0.2, 1] as const }
      : { type: 'spring' as const, stiffness: 380, damping: 30 };
  const hidden = lowEnd ? { opacity: 0 } : narrow ? { y: '100%' } : { opacity: 0, scale: 0.94, y: 8 };
  const shown = lowEnd ? { opacity: 1 } : narrow ? { y: 0 } : { opacity: 1, scale: 1, y: 0 };

  return (
    <div className={`fixed inset-0 z-[80] flex ${narrow ? 'items-end' : 'items-center justify-center p-[18px]'}`}>
      <m.div
        className={`absolute inset-0 bg-slate-900/30 ${lowEnd ? '' : 'backdrop-blur-[3px]'}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: lowEnd ? 0.1 : 0.18 }}
        onClick={onClose}
      />
      <m.div
        ref={panel}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        initial={hidden}
        animate={shown}
        exit={hidden}
        transition={transition}
        style={narrow ? undefined : { width: `min(${width}px, 96vw)` }}
        className={`relative flex flex-col overflow-hidden border border-line bg-panel-solid shadow-2xl outline-none ${
          narrow
            ? 'max-h-[92dvh] w-full rounded-t-[22px] pb-[env(safe-area-inset-bottom)]'
            : 'max-h-[94dvh] rounded-[24px]'
        }`}
      >
        {narrow && <div aria-hidden className="mx-auto mt-2 h-1.5 w-10 flex-none rounded-full bg-line" />}
        {header ?? (
          <div className="flex flex-none items-start justify-between gap-3 px-5 pb-2 pt-4 sm:px-[22px] sm:pt-[22px]">
            <div className="min-w-0">
              <h2 className="m-0 text-[21px] font-extrabold leading-tight">{title}</h2>
              {subtitle && <small className="muted font-semibold">{subtitle}</small>}
            </div>
            <CloseButton onClose={onClose} />
          </div>
        )}
        <div className={`min-h-0 flex-1 overflow-y-auto overscroll-contain ${padded ? 'px-5 pb-5 sm:px-[22px] sm:pb-[22px]' : ''}`}>
          {children}
        </div>
      </m.div>
    </div>
  );
}

export function CloseButton({ onClose }: { onClose(): void }) {
  return (
    <button className="btn flex-none rounded-full px-0 text-lg" onClick={onClose} aria-label="Close">
      ✕
    </button>
  );
}
