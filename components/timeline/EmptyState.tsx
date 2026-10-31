'use client';

import dynamic from 'next/dynamic';
import { useStore } from '@/lib/store';

const Spotlight = dynamic(() => import('../ui/aceternity/spotlight'), { ssr: false });

/** Shown when nothing matches the current search, filter or visibility choices. */
export default function EmptyState({ hasEntries, lowEnd }: { hasEntries: boolean; lowEnd: boolean }) {
  const openModal = useStore((s) => s.openModal);
  const setQuery = useStore((s) => s.setQuery);
  const setFilter = useStore((s) => s.setFilter);
  const query = useStore((s) => s.query);
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center overflow-hidden px-4">
      {!lowEnd && <Spotlight />}
      <div className="pointer-events-auto relative grid max-w-sm justify-items-center gap-3 rounded-2xl border border-line bg-panel-solid p-6 text-center shadow-xl">
        <b className="text-[17px]">{hasEntries ? 'Nothing to show here' : 'Your timeline is empty'}</b>
        <p className="m-0 text-muted">
          {hasEntries
            ? query
              ? `No entry matches "${query}".`
              : 'All entries are hidden by the type filter or the visibility list.'
            : 'Add a person, event, work, period or covenant to begin.'}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {hasEntries && (
            <button
              className="btn"
              onClick={() => {
                setQuery('');
                setFilter('All');
              }}
            >
              Clear search and filter
            </button>
          )}
          <button className="btn btn-primary" onClick={() => openModal({ kind: 'form', id: null })}>
            + Add entry
          </button>
        </div>
      </div>
    </div>
  );
}
