'use client';

import { m, type MotionStyle, type MotionValue, type PanInfo } from 'framer-motion';
import { memo, useRef } from 'react';
import { lifespanText } from '@/lib/dates';
import { coverPhoto, type ItemLayout } from '@/lib/layout';
import type { Entry } from '@/lib/types';
import PhotoImg from '../PhotoImg';

export type CSSVars = React.CSSProperties & Record<`--${string}`, string | number>;
export type MotionVars = MotionStyle & Record<`--${string}`, string | number>;

export interface DragHandlers {
  onDragStart(id: number): void;
  onDragEnd(id: number, offsetY: number): void;
  onOpen(id: number): void;
}

export function Avatar({ entry, size }: { entry: Entry; size: number }) {
  const cover = coverPhoto(entry);
  return (
    <span className="tl-avatar">
      {cover ? (
        <PhotoImg photo={cover} size="thumb" width={size} height={size} />
      ) : (
        (entry.title || '?')[0]
      )}
    </span>
  );
}

interface ItemProps extends DragHandlers {
  layout: ItemLayout;
  top: number;
  mv: MotionValue<number>;
  replaced: boolean;
}

/** A person (circle + name + dates) or a card (event, work, period, covenant). Drag vertically to move. */
export const TimelineItem = memo(function TimelineItem({ layout, top, mv, replaced, onDragStart, onDragEnd, onOpen }: ItemProps) {
  const e = layout.entry;
  const dragged = useRef(false);
  const colour = e.colour || '#0066FF';
  const cover = coverPhoto(e);
  const isPerson = e.type === 'Person';
  return (
    <m.button
      type="button"
      data-id={e.id}
      className={`tl-item ${isPerson ? 'tl-person' : 'tl-card'} ${replaced ? 'float-replaced' : ''}`}
      style={{ left: layout.left, top, y: mv, '--c': colour } as MotionVars}
      drag="y"
      dragMomentum={false}
      dragElastic={0}
      onPointerDown={() => {
        dragged.current = false;
      }}
      onDragStart={() => {
        dragged.current = true;
        onDragStart(e.id);
      }}
      onDragEnd={(_ev: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => onDragEnd(e.id, info.offset.y)}
      onClick={() => {
        if (dragged.current) {
          dragged.current = false;
          return;
        }
        onOpen(e.id);
      }}
      aria-label={`${e.title}, ${e.type}. Open details, or drag up or down to move.`}
    >
      {isPerson ? (
        <>
          <Avatar entry={e} size={52} />
          <span className="tl-copy">
            <b>{e.title}</b>
            <small>{lifespanText(e)}</small>
          </span>
        </>
      ) : (
        <>
          {cover && (
            <span className="tl-thumb">
              <PhotoImg photo={cover} size="thumb" width={40} height={40} />
            </span>
          )}
          <span>◆ {e.title}</span>
        </>
      )}
    </m.button>
  );
});

export const LifeLine = memo(function LifeLine({ layout, top, mv }: { layout: ItemLayout; top: number; mv: MotionValue<number> }) {
  const e = layout.entry;
  return (
    <m.div
      aria-hidden
      className={`tl-line ${e.ongoing ? 'ongoing' : ''}`}
      style={{ left: layout.lineLeft, top: top + layout.lineOffset, width: layout.lineWidth, y: mv, '--c': e.colour || '#0066FF' } as MotionVars}
    />
  );
});
