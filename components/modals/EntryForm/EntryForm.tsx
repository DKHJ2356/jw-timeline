'use client';

import { useMemo, useState } from 'react';
import { NOW_YEAR } from '@/lib/dates';
import { safeUrl } from '@/lib/download';
import { eventPersonIds } from '@/lib/layout';
import { SUBTITLE_PRESETS, leastUsedColour } from '@/lib/sample';
import { useStore } from '@/lib/store';
import { ENTRY_TYPES, type Entry, type EntryType, type Photo, type SourceInfo } from '@/lib/types';
import ModalShell from '../../ui/aceternity/animated-modal';
import ColourPicker from './ColourPicker';
import DateField, { type DateValue } from './DateField';
import PersonLinker from './PersonLinker';
import PhotoManager from './PhotoManager';

const PRESET_VALUES = SUBTITLE_PRESETS.map(([name, icon]) => `${name} ${icon}`);
const IMPORTANCE = ['Major', 'Important', 'Standard', 'Secondary', 'Detail'];

function dateValue(year: number | undefined, month?: string | null, day?: number | null, approx?: boolean, blankYear = false): DateValue {
  return {
    year: year == null || blankYear ? '' : String(Math.abs(year)),
    month: month ?? '',
    day: day ? String(day) : '',
    era: year != null && year >= 0 ? 'CE' : 'BCE',
    approx: !!approx,
  };
}

export default function EntryForm({ id }: { id: number | null }) {
  const entries = useStore((s) => s.entries);
  const saveEntry = useStore((s) => s.saveEntry);
  const closeModal = useStore((s) => s.closeModal);
  const toast = useStore((s) => s.toast);
  const [initial] = useState<Entry | undefined>(() => (id != null ? entries.find((e) => e.id === id) : undefined));
  const i = initial;

  const [type, setType] = useState<EntryType>(i?.type ?? 'Person');
  const [title, setTitle] = useState(i?.title ?? '');
  const [subtitle, setSubtitle] = useState(i?.subtitle ?? '');
  const [start, setStart] = useState<DateValue>(() => dateValue(i?.start, i?.startMonth, i?.startDay, i?.startApprox));
  const [end, setEnd] = useState<DateValue>(() => dateValue(i?.end, i?.endMonth, i?.endDay, i?.endApprox, !!i?.ongoing));
  const [ongoing, setOngoing] = useState(!!i?.ongoing);
  const [people, setPeople] = useState<number[]>(() => eventPersonIds(i));
  const [importance, setImportance] = useState(i?.importance ?? 3);
  const [note, setNote] = useState(i?.note ?? '');
  const [colour, setColour] = useState(() => i?.colour ?? leastUsedColour(entries));
  const [photos, setPhotos] = useState<Photo[]>(() => (i?.photos ?? []).map((p) => ({ ...p })));
  const [cover, setCover] = useState(() => Math.max(0, Math.min(Number(i?.coverIndex) || 0, (i?.photos?.length ?? 1) - 1)));
  const [active, setActive] = useState(cover);
  const [entrySource, setEntrySource] = useState<SourceInfo>({
    sourceTitle: i?.sourceTitle ?? '',
    sourceUrl: i?.sourceUrl ?? '',
    reference: i?.reference ?? '',
  });

  const personEntries = useMemo(() => entries.filter((e) => e.type === 'Person' && e.id !== id), [entries, id]);
  // With photos, the source fields belong to the selected photo (v18.7); otherwise to the entry.
  const activePhoto = photos[active];
  const source: SourceInfo = activePhoto ?? entrySource;
  const setSource = (patch: Partial<SourceInfo>) => {
    if (activePhoto) setPhotos(photos.map((p, n) => (n === active ? { ...p, ...patch } : p)));
    else setEntrySource({ ...entrySource, ...patch });
  };
  const preset = PRESET_VALUES.includes(subtitle) ? subtitle : '';

  const save = () => {
    const name = title.trim();
    const sv = Number(start.year);
    const ev = ongoing ? NOW_YEAR : end.year === '' ? sv : Number(end.year);
    if (!name || start.year === '' || !Number.isFinite(sv) || !Number.isFinite(ev)) {
      toast('Enter a name and a valid year.', 'error');
      return;
    }
    const startYear = start.era === 'BCE' ? -Math.abs(sv) : Math.abs(sv);
    // The end year keeps the start era unless the end era was set (the original's rule for an empty end year).
    const endEra = end.year === '' && !ongoing ? start.era : end.era;
    const endYear = ongoing ? NOW_YEAR : endEra === 'BCE' ? -Math.abs(ev) : Math.abs(ev);
    const coverMeta = photos[cover];
    const links = type === 'Event' ? people.filter((pid) => personEntries.some((p) => p.id === pid)) : [];
    const day = (v: string) => {
      const n = Number(v);
      return Number.isInteger(n) && n >= 1 && n <= 31 ? n : null;
    };
    const obj: Omit<Entry, 'id'> = {
      title: name,
      subtitle: subtitle.trim(),
      type,
      start: startYear,
      end: endYear,
      ongoing,
      parentPersonIds: links,
      parentPersonId: links[0] ?? null,
      startMonth: start.month || null,
      endMonth: ongoing ? null : end.month || null,
      startDay: day(start.day),
      endDay: ongoing ? null : day(end.day),
      startApprox: start.approx,
      endApprox: end.approx,
      importance,
      colour,
      note,
      photos,
      coverIndex: cover,
      sourceTitle: coverMeta ? coverMeta.sourceTitle : entrySource.sourceTitle,
      sourceUrl: coverMeta ? coverMeta.sourceUrl : entrySource.sourceUrl,
      reference: coverMeta ? coverMeta.reference : entrySource.reference,
    };
    saveEntry(obj, id);
    closeModal();
  };

  return (
    <ModalShell title={id != null ? 'Edit entry' : 'Add entry'} subtitle="Create or edit a timeline entry." onClose={closeModal} width={1040}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <div className="grid gap-4 lg:grid-cols-[1.5fr_.9fr]">
          <section className="section mt-3 flex flex-col">
            <div className="flex gap-[7px] overflow-x-auto" role="group" aria-label="Entry type">
              {ENTRY_TYPES.map((t) => (
                <button key={t} type="button" className={`btn flex-1 ${type === t ? 'btn-active' : ''}`} aria-pressed={type === t} onClick={() => setType(t)}>
                  {t}
                </button>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-1 items-end gap-x-2.5 gap-y-2 min-[481px]:grid-cols-2 min-[721px]:grid-cols-[minmax(0,1.18fr)_minmax(0,1fr)_minmax(155px,.9fr)]">
              <label className="label min-[481px]:col-span-2 min-[721px]:col-span-1">
                Name
                <input className="field-input" placeholder="e.g. Socrates" value={title} onChange={(e) => setTitle(e.target.value)} />
              </label>
              <label className="label">
                Subtitle
                <input className="field-input" placeholder="Write your own subtitle" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
              </label>
              <label className="label">
                Subtitle preset
                <select className="field-input" value={preset} onChange={(e) => e.target.value && setSubtitle(e.target.value)}>
                  <option value="">Choose preset</option>
                  {SUBTITLE_PRESETS.map(([name, icon]) => (
                    <option key={name} value={`${name} ${icon}`}>
                      {name}: {icon}
                    </option>
                  ))}
                </select>
              </label>
              <small className="muted text-[10px] font-bold min-[481px]:col-span-2 min-[721px]:col-start-2 min-[721px]:col-end-4">
                Write any subtitle, or choose a preset.
              </small>
            </div>

            <h3 className="mb-3 mt-5 text-base font-extrabold">Dates</h3>
            <div className="grid gap-2.5">
              <DateField label="Start" value={start} onChange={setStart} />
              <DateField label="End" value={end} onChange={setEnd} disabled={ongoing} />
            </div>
            <label className="mt-3.5 flex gap-2 rounded-[11px] bg-accent/10 p-2.5 md:ml-[46px]">
              <input type="checkbox" className="h-5 w-5 flex-none" checked={ongoing} onChange={(e) => setOngoing(e.target.checked)} />
              <span>
                <b>Ongoing / Active</b>
                <br />
                <small>Started, but has not ended.</small>
              </span>
            </label>

            {type === 'Event' && <PersonLinker people={personEntries} selected={people} onChange={setPeople} />}

            <h3 className="mb-3 mt-5 text-base font-extrabold">Importance</h3>
            <div className="flex gap-[7px]" role="group" aria-label="Importance">
              {IMPORTANCE.map((label, n) => (
                <button
                  key={label}
                  type="button"
                  className={`btn h-auto flex-1 flex-col gap-0 px-1 py-1.5 text-[12px] leading-tight sm:text-[14px] ${importance === n + 1 ? 'btn-active' : ''}`}
                  aria-pressed={importance === n + 1}
                  onClick={() => setImportance(n + 1)}
                >
                  {n + 1}
                  <span className="font-semibold">{label}</span>
                </button>
              ))}
            </div>

            <label className="label mt-5">
              Context
              <textarea
                className="field-input h-[170px] max-h-[260px] min-h-[150px] resize-y overflow-y-auto leading-normal md:h-[190px]"
                placeholder="A few lines about this item"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
          </section>

          <aside className="grid content-start gap-3 lg:mt-3">
            <section className="section">
              <div className="mb-2 flex items-center justify-between">
                <b>Colour</b>
                <small className="muted font-bold">Preset or custom</small>
              </div>
              <ColourPicker value={colour} onChange={setColour} />
              <div className="mt-3 flex items-center gap-2.5 rounded-[13px] bg-field p-3">
                <span className="tl-avatar" style={{ '--c': colour } as React.CSSProperties}>
                  {(title || '?')[0]}
                </span>
                <div className="grid min-w-0">
                  <b className="truncate">{title || 'Name'}</b>
                  <small className="truncate">{subtitle}</small>
                </div>
              </div>
            </section>

            <PhotoManager
              photos={photos}
              cover={cover}
              active={active}
              onChange={(p, c, a) => {
                setPhotos(p);
                setCover(c);
                setActive(a);
              }}
            />

            <section className="section">
              <div className="flex items-start justify-between gap-2">
                <b>{activePhoto ? `Photo ${active + 1} source details` : 'Entry source details'}</b>
                <small className="muted max-w-[58%] text-right font-semibold">
                  {activePhoto ? 'Select another thumbnail to edit its sources' : 'Used when no photo is selected'}
                </small>
              </div>
              <label className="label mt-3">
                Source title
                <input className="field-input" placeholder="Title, e.g. Britannica" value={source.sourceTitle} onChange={(e) => setSource({ sourceTitle: e.target.value })} />
              </label>
              <label className="label mt-3">
                Source link
                <span className="flex gap-2">
                  <input
                    className="field-input"
                    placeholder="https://"
                    inputMode="url"
                    value={source.sourceUrl}
                    onChange={(e) => setSource({ sourceUrl: e.target.value })}
                  />
                  <button
                    type="button"
                    className="btn"
                    disabled={!safeUrl(source.sourceUrl)}
                    onClick={() => {
                      const u = safeUrl(source.sourceUrl);
                      if (u) window.open(u, '_blank', 'noopener,noreferrer');
                    }}
                  >
                    Open
                  </button>
                </span>
              </label>
              <label className="label mt-3">
                Bible reference
                <input className="field-input" placeholder="Genesis 5:1-32" value={source.reference} onChange={(e) => setSource({ reference: e.target.value })} />
              </label>
            </section>
          </aside>
        </div>
        <button type="submit" className="btn btn-primary mt-4 w-full">
          Save entry
        </button>
      </form>
    </ModalShell>
  );
}
