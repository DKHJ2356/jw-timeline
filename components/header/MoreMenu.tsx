'use client';

import { AnimatePresence, m } from 'framer-motion';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '@/lib/store';
import { backupNow, exportCsv, loadSample, recover, resetPositions } from './actions';
import { HeightControls } from './ZoomControls';

interface Props {
  onRestore: () => void;
  onImportCsv: () => void;
}

const item =
  'flex min-h-[44px] w-full items-center rounded-[9px] px-3 text-left font-bold hover:bg-accent/10 focus-visible:bg-accent/10';

export default function MoreMenu({ onRestore, onImportCsv }: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const [sheet, setSheet] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const theme = useStore((s) => s.theme);
  const toggleTheme = useStore((s) => s.toggleTheme);
  const lowEnd = useStore((s) => s.lowEnd);

  const place = useCallback(() => {
    const r = btn.current?.getBoundingClientRect();
    if (!r) return;
    const narrow = window.innerWidth < 640;
    setSheet(narrow);
    const w = 260;
    const h = Math.min(420, menu.current?.scrollHeight ?? 300);
    const left = Math.min(window.innerWidth - w - 12, Math.max(12, r.right - w));
    const below = window.innerHeight - r.bottom - 12;
    setPos({ left, top: below >= h ? r.bottom + 8 : Math.max(12, r.top - h - 8) });
  }, []);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      const t = e.target as Node;
      if (!menu.current?.contains(t) && !btn.current?.contains(t)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', key);
    window.addEventListener('resize', place);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', key);
      window.removeEventListener('resize', place);
    };
  }, [open, place]);

  const run = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };

  const transition = lowEnd ? { duration: 0.08 } : { duration: 0.14, ease: 'easeOut' as const };

  return (
    <>
      <button
        ref={btn}
        className="btn"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        More ▾
      </button>
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {open && pos && (
              <>
                {sheet && (
                  <m.div
                    key="scrim"
                    className="fixed inset-0 z-[999] bg-slate-900/30"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={transition}
                  />
                )}
                <m.div
                  key="menu"
                  ref={menu}
                  role="menu"
                  initial={sheet ? { y: 40, opacity: 0 } : { y: -5, scale: 0.98, opacity: 0 }}
                  animate={{ y: 0, scale: 1, opacity: 1 }}
                  exit={sheet ? { y: 40, opacity: 0 } : { y: -5, scale: 0.98, opacity: 0 }}
                  transition={transition}
                  style={sheet ? undefined : { left: pos.left, top: pos.top }}
                  className={
                    sheet
                      ? 'fixed inset-x-0 bottom-0 z-[1000] grid max-h-[80dvh] gap-1 overflow-y-auto rounded-t-[20px] border border-line bg-panel-solid p-3 pb-[calc(12px+env(safe-area-inset-bottom))] shadow-2xl'
                      : 'fixed z-[1000] grid max-h-[min(420px,calc(100dvh-24px))] w-[260px] origin-top-right gap-1 overflow-y-auto rounded-[14px] border border-line bg-panel-solid p-2 shadow-2xl'
                  }
                >
                  <div className="grid gap-1 sm:hidden">
                    <button role="menuitem" className={item} onClick={run(backupNow)}>
                      Backup
                    </button>
                    <button role="menuitem" className={item} onClick={run(onRestore)}>
                      Restore backup…
                    </button>
                    <button role="menuitem" className={item} onClick={run(toggleTheme)}>
                      {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                    </button>
                    <div className="flex items-center justify-between px-3 py-1">
                      <span className="font-bold">Height</span>
                      <HeightControls />
                    </div>
                    <hr className="my-1 border-line" />
                  </div>
                  <button role="menuitem" className={item} onClick={run(exportCsv)}>
                    Export CSV
                  </button>
                  <button role="menuitem" className={item} onClick={run(onImportCsv)}>
                    Import CSV
                  </button>
                  <button role="menuitem" className={item} onClick={run(recover)}>
                    Recover browser data
                  </button>
                  <button role="menuitem" className={item} onClick={run(loadSample)}>
                    Load sample timeline
                  </button>
                  <button role="menuitem" className={item} onClick={run(resetPositions)}>
                    Reset display positions
                  </button>
                </m.div>
              </>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
