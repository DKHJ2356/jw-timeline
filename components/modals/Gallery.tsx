'use client';

import { m, type PanInfo } from 'framer-motion';
import { useEffect } from 'react';
import type { Photo } from '@/lib/types';
import PhotoImg from '../PhotoImg';

interface Props {
  photos: Photo[];
  index: number;
  onIndex(i: number): void;
}

/** Full-size photos (loaded only here, never on the timeline), with arrows, swipe and a counter. */
export default function Gallery({ photos, index, onIndex }: Props) {
  const n = photos.length;
  const go = (step: number) => n > 1 && onIndex((index + step + n) % n);

  useEffect(() => {
    if (n < 2) return;
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest('input,textarea,select')) return;
      if (e.key === 'ArrowLeft') onIndex((index - 1 + n) % n);
      if (e.key === 'ArrowRight') onIndex((index + 1) % n);
    };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [index, n, onIndex]);

  const photo = photos[index];
  if (!photo) return null;
  const ratio = photo.w && photo.h ? photo.h / photo.w : 0.66;

  return (
    <div className="relative flex items-center justify-center overflow-hidden rounded-2xl border border-line bg-slate-900/5">
      <m.div
        key={photo.id}
        className="w-full touch-pan-y"
        drag={n > 1 ? 'x' : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.5}
        onDragEnd={(_e: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
          if (Math.abs(info.offset.x) > 45) go(info.offset.x < 0 ? 1 : -1);
        }}
        initial={{ opacity: 0.4 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.18 }}
      >
        <PhotoImg
          photo={photo}
          size="full"
          width={photo.w || 1600}
          height={photo.h || 1056}
          eager
          alt={`Photo ${index + 1} of ${n}`}
          className="mx-auto block h-auto max-h-[min(430px,55dvh)] w-auto max-w-full object-contain"
          style={{ aspectRatio: ratio ? `${1 / ratio}` : undefined }}
        />
      </m.div>
      {n > 1 && (
        <>
          <button
            type="button"
            className="absolute left-2 top-1/2 z-[2] h-[46px] w-[44px] -translate-y-1/2 rounded-xl bg-slate-900/80 text-[28px] leading-none text-white"
            onClick={() => go(-1)}
            aria-label="Previous photo"
          >
            ‹
          </button>
          <button
            type="button"
            className="absolute right-2 top-1/2 z-[2] h-[46px] w-[44px] -translate-y-1/2 rounded-xl bg-slate-900/80 text-[28px] leading-none text-white"
            onClick={() => go(1)}
            aria-label="Next photo"
          >
            ›
          </button>
          <span className="absolute bottom-2 right-2.5 rounded-full bg-slate-900/80 px-2 py-1 text-[11px] font-extrabold text-white">
            {index + 1} / {n}
          </span>
        </>
      )}
    </div>
  );
}
