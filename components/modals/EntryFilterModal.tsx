'use client';

import { useMemo, useState } from 'react';
import { useStore } from '@/lib/store';
import ModalShell from '../ui/aceternity/animated-modal';

/** Per-entry show/hide (saved, and included in backups). */
export default function EntryFilterModal() {
  const entries = useStore((s) => s.entries);
  const hiddenIds = useStore((s) => s.hiddenIds);
  const setHidden = useStore((s) => s.setHidden);
  const closeModal = useStore((s) => s.closeModal);
  const lowEnd = useStore((s) => s.lowEnd);
  const [hidden, setLocal] = useState(() => new Set(hiddenIds));
  const [q, setQ] = useState('');

  const sorted = useMemo(() => [...entries].sort((a, b) => a.title.localeCompare(b.title)), [entries]);
  const list = sorted.filter((e) => !q.trim() || `${e.title} ${e.subtitle ?? ''} ${e.type}`.toLowerCase().includes(q.trim().toLowerCase()));
  const visibleCount = entries.filter((e) => !hidden.has(String(e.id))).length;

  const setAll = (show: boolean) => {
    setQ('');
    setLocal(show ? new Set() : new Set(entries.map((e) => String(e.id))));
  };
  const toggle = (id: number, show: boolean) => {
    const next = new Set(hidden);
    if (show) next.delete(String(id));
    else next.add(String(id));
    setLocal(next);
  };

  return (
    <ModalShell
      title="Choose visible entries"
      subtitle={visibleCount === entries.length ? `All ${entries.length} entries are visible.` : `${visibleCount} of ${entries.length} entries are visible.`}
      onClose={closeModal}
      width={680}
    >
      <input className="field-input mt-3" placeholder="Search entries" aria-label="Search entries" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="mt-3 grid grid-cols-2 gap-2 sm:flex">
        <button className="btn btn-primary flex-1" onClick={() => setAll(true)}>
          Check all
        </button>
        <button className="btn flex-1" onClick={() => setAll(false)}>
          Uncheck all
        </button>
      </div>
      <div className={`mt-3 grid max-h-[52dvh] gap-[7px] overflow-auto pr-1 ${lowEnd ? 'cv-auto' : ''}`}>
        {list.length
          ? list.map((e) => (
              <label
                key={e.id}
                className="grid min-h-[48px] cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-2.5 rounded-[11px] border border-line bg-section px-[11px] py-2.5 hover:bg-accent/10"
              >
                <input type="checkbox" className="h-[18px] w-[18px] accent-accent" checked={!hidden.has(String(e.id))} onChange={(ev) => toggle(e.id, ev.target.checked)} />
                <span className="min-w-0">
                  <b className="block truncate">{e.title}</b>
                  <small className="muted font-semibold">{e.subtitle || e.type}</small>
                </span>
                <small className="muted font-semibold">{e.type}</small>
              </label>
            ))
          : 'No matching entries.'}
      </div>
      <button
        className="btn btn-primary mt-4 w-full"
        onClick={() => {
          setHidden([...hidden].filter((id) => entries.some((e) => String(e.id) === id)));
          closeModal();
        }}
      >
        Apply visibility
      </button>
    </ModalShell>
  );
}
