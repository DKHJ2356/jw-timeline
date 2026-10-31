'use client';

import { memo } from 'react';
import type { Entry } from '@/lib/types';
import { Avatar, type CSSVars } from './items';

/**
 * Labels for entries whose start has scrolled off the left edge. They live in a zero-width
 * sticky column, so the browser keeps them at the left edge while scrolling.
 */
export default memo(function FloatingLabels({
  labels,
  onOpen,
}: {
  labels: { entry: Entry; y: number }[];
  onOpen(id: number): void;
}) {
  return (
    <div className="tl-sticky">
      {labels.map(({ entry, y }) => (
        <button
          key={entry.id}
          type="button"
          className="tl-float-label"
          style={{ top: y, '--c': entry.colour || '#0066FF' } as CSSVars}
          onClick={() => onOpen(entry.id)}
          aria-label={`${entry.title} (open details)`}
        >
          <Avatar entry={entry} size={30} />
          <b>{entry.title}</b>
        </button>
      ))}
    </div>
  );
});
