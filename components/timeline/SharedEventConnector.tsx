'use client';

import { m, useMotionValue, type MotionValue } from 'framer-motion';
import { memo, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { coverPhoto } from '@/lib/layout';
import type { Entry } from '@/lib/types';
import PhotoImg from '../PhotoImg';
import type { MotionVars } from './items';

export interface SharedPerson {
  person: Entry;
  lineY: number;
  mv: MotionValue<number>;
}

interface Props {
  event: Entry;
  people: SharedPerson[];
  x: number;
  closeZoom: boolean;
  lowEnd: boolean;
  onOpen(id: number): void;
}

/**
 * A multi-person event: a vertical connector between the people's lines, a dot on each line and a
 * shared marker at the midpoint. Everything follows the people live while they are dragged.
 */
export default memo(function SharedEventConnector({ event, people, x, closeZoom, lowEnd, onOpen }: Props) {
  const top = useMotionValue(0);
  const height = useMotionValue(3);
  const mid = useMotionValue(0);
  const latest = useRef(people);
  latest.current = people;

  const recompute = useCallback(() => {
    const ys = latest.current.map((p) => p.lineY + p.mv.get());
    const min = Math.min(...ys);
    const max = Math.max(...ys);
    top.set(min);
    height.set(Math.max(3, max - min));
    mid.set((min + max) / 2);
  }, [top, height, mid]);

  useLayoutEffect(recompute);

  const mvKey = people.map((p) => p.person.id).join(',');
  useEffect(() => {
    const offs = latest.current.map((p) => p.mv.on('change', recompute));
    return () => offs.forEach((off) => off());
  }, [mvKey, recompute]);

  const colour = event.colour || '#E31A1C';
  const cover = coverPhoto(event);
  const showPhoto = !!cover && closeZoom;
  const names = people.map((p) => p.person.title).join(', ');
  const open = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    onOpen(event.id);
  };
  const hover = lowEnd ? undefined : { scale: 1.2 };

  return (
    <>
      <m.div aria-hidden className="tl-connector" style={{ left: x, top: 0, y: top, height, '--event-colour': colour } as MotionVars} />
      {people.map((p) => (
        <m.button
          key={p.person.id}
          type="button"
          data-event-id={event.id}
          className="tl-endpoint"
          style={
            { left: x, top: p.lineY, y: p.mv, '--event-colour': colour, '--person-colour': p.person.colour || '#0066FF' } as MotionVars
          }
          whileHover={hover}
          whileFocus={hover}
          title={`${event.title} — ${p.person.title}`}
          aria-label={`${event.title} connection with ${p.person.title}`}
          onClick={open}
        />
      ))}
      <m.button
        type="button"
        data-event-id={event.id}
        className={`tl-marker shared ${closeZoom ? 'expanded' : ''}`}
        style={{ left: x, top: 0, y: mid, '--event-colour': colour } as MotionVars}
        whileHover={lowEnd ? undefined : { scale: 1.15 }}
        whileFocus={lowEnd ? undefined : { scale: 1.15 }}
        title={`${event.title} — ${names}`}
        aria-label={`Open ${event.title} event`}
        onClick={open}
      >
        {showPhoto && cover ? <PhotoImg photo={cover} size="thumb" width={42} height={42} /> : '◆'}
      </m.button>
      {closeZoom && (
        <m.span aria-hidden className="tl-shared-label" style={{ left: x, top: 0, y: mid }}>
          {event.title}
        </m.span>
      )}
    </>
  );
});
