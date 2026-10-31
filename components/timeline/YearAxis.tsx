'use client';

import { memo } from 'react';
import type { Tick } from '@/lib/layout';

/** The orange axis and the year ticks that are inside the rendered window. */
export const YearAxis = memo(function YearAxis({ ticks, x, axisY }: { ticks: Tick[]; x: (y: number) => number; axisY: number }) {
  return (
    <>
      <div className="tl-axis" style={{ top: axisY }} aria-hidden />
      {ticks.map((t) => (
        <div key={t.year} className={`tl-tick ${t.current ? 'current' : ''}`} style={{ left: x(t.year) }} aria-hidden>
          <span style={{ top: axisY + 9 }}>{t.label}</span>
        </div>
      ))}
    </>
  );
});

/** Tick marks for the floating ruler (moved by the viewport with a transform, no re-render per frame). */
export const RulerTicks = memo(function RulerTicks({ ticks, x }: { ticks: Tick[]; x: (y: number) => number }) {
  return (
    <>
      {ticks.map((t) => (
        <div key={t.year} className={`tl-tick ${t.current ? 'current' : ''}`} style={{ left: x(t.year) }}>
          <span>{t.label}</span>
        </div>
      ))}
    </>
  );
});
