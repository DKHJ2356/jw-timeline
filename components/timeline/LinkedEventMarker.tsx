'use client';

import { m, type MotionValue } from 'framer-motion';
import { memo } from 'react';
import { coverPhoto } from '@/lib/layout';
import type { Entry } from '@/lib/types';
import PhotoImg from '../PhotoImg';
import type { MotionVars } from './items';

interface Props {
  event: Entry;
  person: Entry;
  x: number;
  /** The person's real line position (bug fix: computed from the person's actual top). */
  lineY: number;
  mv: MotionValue<number>;
  closeZoom: boolean;
  lowEnd: boolean;
  onOpen(id: number): void;
}

/** A single-person event: a dot on that person's life line. Shows its photo from 4× zoom. */
export default memo(function LinkedEventMarker({ event, person, x, lineY, mv, closeZoom, lowEnd, onOpen }: Props) {
  const cover = coverPhoto(event);
  const showPhoto = !!cover && closeZoom;
  return (
    <m.button
      type="button"
      data-event-id={event.id}
      className={`tl-marker ${showPhoto ? 'photo' : ''}`}
      style={
        {
          left: x,
          top: lineY,
          y: mv,
          '--event-colour': event.colour || '#E31A1C',
          '--person-colour': person.colour || '#0066FF',
        } as MotionVars
      }
      whileHover={lowEnd ? undefined : { scale: 1.15 }}
      whileFocus={lowEnd ? undefined : { scale: 1.15 }}
      title={`${event.title} — ${person.title}`}
      aria-label={`${event.title}, event in ${person.title}'s life`}
      onClick={(e) => {
        e.stopPropagation();
        onOpen(event.id);
      }}
    >
      {showPhoto && cover && <PhotoImg photo={cover} size="thumb" width={42} height={42} />}
      <span className="tl-marker-label">{event.title}</span>
    </m.button>
  );
});
