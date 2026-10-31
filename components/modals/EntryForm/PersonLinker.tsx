'use client';

import { fmt } from '@/lib/dates';
import type { Entry } from '@/lib/types';

interface Props {
  people: Entry[];
  selected: number[];
  onChange(ids: number[]): void;
}

/** Choose the people whose timelines an event belongs on (v18.8 multi-person events). */
export default function PersonLinker({ people, selected, onChange }: Props) {
  const sorted = [...people].sort((a, b) => a.title.localeCompare(b.title));
  const set = new Set(selected);
  return (
    <div className="mt-3 rounded-[13px] border border-accent/25 bg-accent/5 p-3">
      <div className="flex items-center justify-between gap-2">
        <b>Place this event on people’s timelines</b>
        <small className="muted font-bold">{selected.length ? `${selected.length} selected` : 'Separate event'}</small>
      </div>
      <div className="mt-2.5 grid max-h-[180px] grid-cols-1 gap-[7px] overflow-y-auto p-1 sm:grid-cols-2">
        {sorted.length ? (
          sorted.map((p) => (
            <label key={p.id} className="flex min-h-[44px] items-center gap-2 rounded-[10px] border border-line bg-field px-2.5 py-2 font-bold">
              <input
                type="checkbox"
                className="h-5 w-5 flex-none"
                checked={set.has(p.id)}
                onChange={(e) => onChange(e.target.checked ? [...selected, p.id] : selected.filter((id) => id !== p.id))}
              />
              <span>
                {p.title}
                <br />
                <small className="muted">
                  {fmt(p.start)}–{p.ongoing ? 'Present' : fmt(p.end)}
                </small>
              </span>
            </label>
          ))
        ) : (
          <small>No person entries are available.</small>
        )}
      </div>
      <small className="muted">
        Select one or more people. With multiple people, the event appears between their timelines with a vertical connection.
      </small>
    </div>
  );
}
