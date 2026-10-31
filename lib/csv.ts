import { ENGLISH_MONTHS, HEBREW_MONTHS } from './dates';
import { eventPersonIds } from './layout';
import { ENTRY_TYPES, type Entry, type EntryType } from './types';

export const CSV_COLUMNS = [
  'id',
  'title',
  'subtitle',
  'type',
  'start',
  'startMonth',
  'startDay',
  'end',
  'endMonth',
  'endDay',
  'ongoing',
  'reference',
  'note',
  'importance',
  'colour',
  'sourceTitle',
  'sourceUrl',
  'startApprox',
  'endApprox',
  'parentPersonIds',
] as const;

function cell(v: unknown): string {
  return '"' + String(v ?? '').replaceAll('"', '""') + '"';
}

/** Text-only export of every entry (photos are not included; use Backup for those). */
export function toCsv(entries: Entry[]): string {
  const rows = entries.map((e) =>
    CSV_COLUMNS.map((k) => {
      if (k === 'parentPersonIds') return cell(e.type === 'Event' ? eventPersonIds(e).join(';') : '');
      if (k === 'ongoing' || k === 'startApprox' || k === 'endApprox') return cell(e[k] ? 'true' : '');
      return cell(e[k as keyof Entry] as unknown);
    }).join(','),
  );
  return '﻿' + [CSV_COLUMNS.join(','), ...rows].join('\r\n');
}

/** RFC 4180 parser: quoted fields, doubled quotes, commas and line breaks inside quotes. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((v) => v.trim() !== ''));
}

const truthy = (v?: string) => /^(true|yes|y|1|x|≈|~)$/i.test((v ?? '').trim());

function parseYear(v?: string): number | null {
  const s = (v ?? '').trim();
  if (!s) return null;
  const era = /^(\d+(?:\.\d+)?)\s*(BCE|BC|CE|AD)$/i.exec(s);
  if (era) return /^BC/i.test(era[2]) ? -Number(era[1]) : Number(era[1]);
  const n = Number(s);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

const monthKeysByName = new Map<string, string>();
for (const [k, v] of Object.entries(HEBREW_MONTHS)) {
  monthKeysByName.set(k, k);
  monthKeysByName.set(v[0].toLowerCase(), k);
  monthKeysByName.set(v[0].split(' ')[0].toLowerCase(), k);
}
for (const [k, v] of Object.entries(ENGLISH_MONTHS)) {
  monthKeysByName.set(k, k);
  monthKeysByName.set(v[0].toLowerCase(), k);
}

function parseMonth(v?: string): string | null {
  const s = (v ?? '').trim().toLowerCase();
  if (!s) return null;
  return monthKeysByName.get(s) ?? null;
}

function parseDay(v?: string): number | null {
  const n = Number((v ?? '').trim());
  return Number.isInteger(n) && n >= 1 && n <= 31 ? n : null;
}

function parseType(v?: string): EntryType {
  const s = (v ?? '').trim().toLowerCase();
  return ENTRY_TYPES.find((t) => t.toLowerCase() === s) ?? 'Event';
}

export interface CsvImportResult {
  entries: Entry[];
  skipped: { line: number; reason: string }[];
}

/**
 * Reads a CSV exported by this app or by the original app (any column order; older files
 * without `parentPersonIds` or the ≈ columns are fine). New ids are assigned from `nextId`;
 * person links are remapped when the file has an `id` column.
 */
export function fromCsv(text: string, nextId: number, defaultColour: (i: number) => string): CsvImportResult {
  const rows = parseCsv(text);
  const skipped: CsvImportResult['skipped'] = [];
  if (!rows.length) return { entries: [], skipped };
  const header = rows[0].map((h) => h.trim());
  const col = (name: string) => header.findIndex((h) => h.toLowerCase() === name.toLowerCase());
  if (col('title') < 0 || col('start') < 0) {
    return { entries: [], skipped: [{ line: 1, reason: 'The file needs at least "title" and "start" columns.' }] };
  }
  const get = (r: string[], name: string) => {
    const i = col(name);
    return i < 0 ? undefined : r[i];
  };
  const idMap = new Map<string, number>();
  const links: { entry: Entry; raw: string }[] = [];
  const entries: Entry[] = [];
  rows.slice(1).forEach((r, n) => {
    const line = n + 2;
    const title = (get(r, 'title') ?? '').trim();
    const start = parseYear(get(r, 'start'));
    if (!title) return skipped.push({ line, reason: 'missing title' });
    if (start == null) return skipped.push({ line, reason: 'missing or invalid start year' });
    const ongoing = truthy(get(r, 'ongoing'));
    const end = parseYear(get(r, 'end')) ?? start;
    const imp = Number(get(r, 'importance'));
    const colour = (get(r, 'colour') ?? get(r, 'color') ?? '').trim();
    const id = nextId + entries.length;
    const oldId = (get(r, 'id') ?? '').trim();
    if (oldId) idMap.set(oldId, id);
    const entry: Entry = {
      id,
      title,
      subtitle: (get(r, 'subtitle') ?? '').trim(),
      type: parseType(get(r, 'type')),
      start,
      end,
      ongoing,
      startMonth: parseMonth(get(r, 'startMonth')),
      startDay: parseDay(get(r, 'startDay')),
      endMonth: ongoing ? null : parseMonth(get(r, 'endMonth')),
      endDay: ongoing ? null : parseDay(get(r, 'endDay')),
      startApprox: truthy(get(r, 'startApprox')),
      endApprox: truthy(get(r, 'endApprox')),
      importance: Number.isInteger(imp) && imp >= 1 && imp <= 5 ? imp : 3,
      colour: /^#[0-9a-f]{6}$/i.test(colour) ? colour.toUpperCase() : defaultColour(entries.length),
      note: get(r, 'note') ?? '',
      reference: (get(r, 'reference') ?? '').trim(),
      sourceTitle: (get(r, 'sourceTitle') ?? '').trim(),
      sourceUrl: (get(r, 'sourceUrl') ?? '').trim(),
      parentPersonIds: [],
      parentPersonId: null,
      photos: [],
      coverIndex: 0,
    };
    const rawLinks = (get(r, 'parentPersonIds') ?? get(r, 'parentPersonId') ?? '').trim();
    if (entry.type === 'Event' && rawLinks) links.push({ entry, raw: rawLinks });
    entries.push(entry);
  });
  for (const { entry, raw } of links) {
    const ids = raw
      .split(/[;|\s]+/)
      .map((s) => idMap.get(s))
      .filter((v): v is number => v != null && entries.some((e) => e.id === v && e.type === 'Person'));
    entry.parentPersonIds = ids;
    entry.parentPersonId = ids[0] ?? null;
  }
  return { entries, skipped };
}
