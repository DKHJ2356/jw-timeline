'use client';

import { useState } from 'react';
import { fd, NOW_YEAR } from '@/lib/dates';
import { safeUrl } from '@/lib/download';
import { eventPersonIds } from '@/lib/layout';
import { useStore } from '@/lib/store';
import type { Entry } from '@/lib/types';
import ModalShell, { CloseButton } from '../ui/aceternity/animated-modal';
import Gallery from './Gallery';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[14px] border border-line bg-section px-[15px] py-[14px]">
      <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[.08em] text-muted">{title}</span>
      {children}
    </section>
  );
}

export default function DetailModal({ id }: { id: number }) {
  const entries = useStore((s) => s.entries);
  const closeModal = useStore((s) => s.closeModal);
  const openModal = useStore((s) => s.openModal);
  const moveToTrash = useStore((s) => s.moveToTrash);
  const found = entries.find((e) => e.id === id);
  // Keep showing the entry while the modal animates out (for example after Move to Trash).
  const [opened] = useState<Entry | undefined>(found);
  const e = found ?? opened;
  const [index, setIndex] = useState(() => Math.max(0, Math.min(Number(e?.coverIndex) || 0, (e?.photos?.length ?? 1) - 1)));
  if (!e) return null;

  const people = eventPersonIds(e)
    .map((pid) => entries.find((p) => p.id === pid && p.type === 'Person'))
    .filter((p): p is Entry => !!p);
  const photos = e.photos ?? [];
  const photo = photos[index];
  const sourceUrl = safeUrl(e.sourceUrl);
  const photoUrl = safeUrl(photo?.sourceUrl);

  const header = (
    <div className="flex flex-none items-start justify-between gap-4 border-b border-line bg-gradient-to-br from-accent/10 to-transparent px-5 pb-4 pt-4 sm:px-6 sm:pt-[22px]">
      <div className="min-w-0">
        <h2 id="detail-title" className="m-0 text-[22px] font-extrabold leading-tight [overflow-wrap:anywhere] sm:text-[25px]">
          {e.title}
        </h2>
        <p className="m-0 mt-1.5 font-bold text-muted">
          {e.type}
          {e.subtitle ? ` · ${e.subtitle}` : ''}
        </p>
        {people.length > 0 && (
          <span className="mt-1.5 inline-block rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-extrabold">
            On {people.map((p) => p.title).join(', ')} timeline{people.length === 1 ? '' : 's'}
          </span>
        )}
      </div>
      <CloseButton onClose={closeModal} />
    </div>
  );

  return (
    <ModalShell title={e.title} header={header} onClose={closeModal} width={680}>
      <div className="grid gap-4 pt-4">
        <b className="block rounded-[11px] bg-accent/10 px-3 py-2.5 leading-snug">
          {fd(e.start, e.startMonth, e.startDay, e.startApprox)} to{' '}
          {e.ongoing ? `Present (${NOW_YEAR} CE)` : fd(e.end, e.endMonth, e.endDay, e.endApprox)}
        </b>
        {photos.length > 0 && <Gallery photos={photos} index={index} onIndex={setIndex} />}
        {photo && (photo.sourceTitle || photo.sourceUrl || photo.reference) && (
          <section className="rounded-xl border border-line bg-section px-3 py-2.5">
            {photo.sourceTitle && <b className="mb-1 block">{photo.sourceTitle}</b>}
            {photo.sourceUrl &&
              (photoUrl ? (
                <a className="block font-bold text-[#087b98] [overflow-wrap:anywhere]" href={photoUrl} target="_blank" rel="noopener noreferrer">
                  {photo.sourceUrl}
                </a>
              ) : (
                <p className="m-0 [overflow-wrap:anywhere]">{photo.sourceUrl}</p>
              ))}
            {photo.reference && <p className="m-0 mt-1">{photo.reference}</p>}
          </section>
        )}
        <Section title="Context">
          <p className="m-0 whitespace-pre-wrap leading-relaxed">{e.note || 'No note added.'}</p>
        </Section>
        {e.reference && (
          <Section title="Bible reference">
            <p className="m-0 whitespace-pre-wrap">{e.reference}</p>
          </Section>
        )}
        {(e.sourceTitle || e.sourceUrl) && (
          <Section title="Source">
            {sourceUrl ? (
              <a className="font-extrabold text-[#087b98] [overflow-wrap:anywhere] hover:underline" href={sourceUrl} target="_blank" rel="noopener noreferrer">
                {e.sourceTitle || e.sourceUrl}
              </a>
            ) : (
              <p className="m-0 font-bold [overflow-wrap:anywhere]">{e.sourceTitle || e.sourceUrl}</p>
            )}
          </Section>
        )}
        <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
          <button className="btn min-w-[96px]" onClick={() => openModal({ kind: 'form', id: e.id })}>
            Edit entry
          </button>
          <button
            className="btn btn-danger min-w-[96px]"
            onClick={() => {
              if (window.confirm(`Move "${e.title}" to Trash?`)) moveToTrash(e.id);
            }}
          >
            Move to Trash
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
