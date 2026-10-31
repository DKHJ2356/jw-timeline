'use client';

import { AnimatePresence, m } from 'framer-motion';
import { useStore } from '@/lib/store';

export default function Toasts() {
  const toasts = useStore((s) => s.toasts);
  const dismiss = useStore((s) => s.dismissToast);
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--ruler-h)+12px+env(safe-area-inset-bottom))] z-[3000] grid justify-items-center gap-2 px-4"
      aria-live="polite"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <m.div
            key={t.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.16 }}
            role={t.kind === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto flex max-w-[min(520px,100%)] items-center gap-3 rounded-xl px-4 py-3 font-semibold text-white shadow-xl ${
              t.kind === 'error' ? 'bg-danger' : 'bg-slate-800'
            }`}
          >
            <span>{t.text}</span>
            <button className="min-h-[36px] min-w-[36px] rounded-lg font-black" onClick={() => dismiss(t.id)} aria-label="Dismiss">
              ✕
            </button>
          </m.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
