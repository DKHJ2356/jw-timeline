'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { importPhoto } from '@/lib/images';
import { StorageFullError } from '@/lib/persistence';
import { useStore } from '@/lib/store';
import type { Photo } from '@/lib/types';
import PhotoImg from '../../PhotoImg';

interface Props {
  photos: Photo[];
  cover: number;
  active: number;
  onChange(photos: Photo[], cover: number, active: number): void;
}

/** Add (pick or drag and drop) several pictures, choose the cover, remove, and pick which photo's sources to edit. */
export default function PhotoManager({ photos, cover, active, onChange }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(0);
  const toast = useStore((s) => s.toast);
  const latest = useRef(photos);
  useLayoutEffect(() => {
    latest.current = photos;
  }, [photos]);

  const add = async (files: FileList | File[] | null | undefined) => {
    const list = [...(files ?? [])];
    const images = list.filter((f) => f.type?.startsWith('image/'));
    if (!images.length) {
      toast('Please choose or drop picture or image files.', 'error');
      return;
    }
    setBusy(images.length);
    const added: Photo[] = [];
    for (const f of images) {
      try {
        added.push(await importPhoto(f));
      } catch (e) {
        toast(e instanceof StorageFullError ? e.message : `"${f.name}" could not be read as a picture.`, 'error');
      }
      setBusy((n) => n - 1);
    }
    if (added.length) {
      const next = [...latest.current, ...added];
      onChange(next, Math.min(cover, next.length - 1), next.length - added.length);
    }
  };

  const remove = (i: number) => {
    const next = photos.filter((_, n) => n !== i);
    let c = cover;
    if (i < c) c--;
    else if (i === c) c = Math.min(c, Math.max(0, next.length - 1));
    let a = active;
    if (i < a) a--;
    else if (i === a) a = Math.min(a, Math.max(0, next.length - 1));
    onChange(next, c, a);
  };

  return (
    <section className="section">
      <div className="flex items-center justify-between">
        <b>Media</b>
        <small className="muted font-bold">
          {busy ? `Processing ${busy}…` : photos.length ? `${photos.length} photo${photos.length === 1 ? '' : 's'}` : 'Optional'}
        </small>
      </div>
      <div
        role="button"
        tabIndex={0}
        aria-label="Add or drop pictures"
        onClick={() => input.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            input.current?.click();
          }
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
          setOver(true);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          add(e.dataTransfer.files);
        }}
        className={`mt-2 grid min-h-[76px] cursor-pointer place-items-center gap-0.5 rounded-[13px] border border-dashed p-3 text-center transition-colors ${
          over ? 'border-accent bg-accent/10 shadow-[inset_0_0_0_2px_rgba(8,145,178,.22)]' : 'border-slate-400'
        }`}
      >
        <b>+ Add pictures</b>
        <small className={`text-[11px] font-bold ${over ? 'text-accent' : 'muted'}`}>or drag and drop one or more pictures here</small>
        <input
          ref={input}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            add(e.target.files);
            e.target.value = '';
          }}
        />
      </div>
      {photos.length > 0 && (
        <>
          <div className="mt-2 grid grid-cols-2 gap-2 min-[560px]:grid-cols-3">
            {photos.map((p, i) => (
              <div
                key={p.id}
                onClick={(e) => {
                  if (!(e.target as HTMLElement).closest('button')) onChange(photos, cover, i);
                }}
                className={`relative min-w-0 cursor-pointer rounded-[11px] border-2 p-1 ${i === cover ? 'border-accent' : 'border-transparent'} ${
                  i === active ? 'bg-accent/10 shadow-[0_0_0_2px_rgba(8,145,178,.28)]' : 'bg-field'
                }`}
              >
                {i === cover && (
                  <span className="absolute left-[7px] top-[7px] z-[1] rounded-full bg-accent px-1.5 py-0.5 text-[9px] font-black text-white">
                    Cover
                  </span>
                )}
                <PhotoImg photo={p} size="thumb" width={160} height={76} alt={`Photo ${i + 1}`} className="block h-[68px] w-full rounded-[7px] object-cover sm:h-[76px]" />
                <div className="mt-1 grid grid-cols-[1fr_auto] gap-1">
                  <button type="button" className="btn min-h-[36px] px-1.5 text-[10px]" disabled={i === cover} onClick={() => onChange(photos, i, active)}>
                    {i === cover ? 'Cover photo' : 'Make cover'}
                  </button>
                  <button type="button" className="btn min-h-[36px] min-w-[36px] px-1.5 text-[10px]" onClick={() => remove(i)} aria-label={`Remove photo ${i + 1}`}>
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button type="button" className="btn mt-2" onClick={() => onChange([], 0, 0)}>
            Remove all images
          </button>
        </>
      )}
    </section>
  );
}
