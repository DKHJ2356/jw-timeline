'use client';

// Animated, cycling placeholder text for an input. Adapted from the idea behind Aceternity UI's
// "Placeholders and Vanish Input" (written for this app; no canvas vanish effect, to stay light).
import { AnimatePresence, m } from 'framer-motion';
import { useEffect, useState } from 'react';

export default function AnimatedPlaceholder({ placeholders, interval = 3200 }: { placeholders: string[]; interval?: number }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') setI((n) => (n + 1) % placeholders.length);
    }, interval);
    return () => clearInterval(id);
  }, [placeholders.length, interval]);
  return (
    <span aria-hidden className="pointer-events-none absolute inset-y-0 left-[11px] right-2 flex items-center overflow-hidden">
      <AnimatePresence mode="wait" initial={false}>
        <m.span
          key={i}
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -10, opacity: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="truncate text-muted"
        >
          {placeholders[i]}
        </m.span>
      </AnimatePresence>
    </span>
  );
}
