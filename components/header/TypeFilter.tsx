'use client';

import { useStore } from '@/lib/store';
import { ENTRY_TYPES, type TypeFilter as Filter } from '@/lib/types';

export default function TypeFilter() {
  const filter = useStore((s) => s.filter);
  const setFilter = useStore((s) => s.setFilter);
  return (
    <select
      aria-label="Show entry type"
      value={filter}
      onChange={(e) => setFilter(e.target.value as Filter)}
      className="btn pr-2"
    >
      <option value="All">All</option>
      {ENTRY_TYPES.map((t) => (
        <option key={t} value={t}>
          {t}
        </option>
      ))}
    </select>
  );
}
