import { fd } from './dates';
import type { Entry, TypeFilter } from './types';

/** Case-, accent- and whitespace-insensitive form used for matching. */
export function searchText(v: unknown): string {
  return String(v ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLocaleLowerCase()
    .trim();
}

/**
 * The searchable text of an entry: only human-readable fields. Photo data is never included
 * (the original searched the whole JSON, including base64 image data).
 */
export function entrySearchText(e: Entry): string {
  const parts: unknown[] = [
    e.title,
    e.subtitle,
    e.type,
    e.note,
    e.reference,
    e.sourceTitle,
    e.sourceUrl,
    fd(e.start, e.startMonth, e.startDay),
    e.ongoing ? 'present' : fd(e.end, e.endMonth, e.endDay),
  ];
  for (const p of e.photos ?? []) parts.push(p.sourceTitle, p.sourceUrl, p.reference);
  return searchText(parts.filter(Boolean).join(' \u0001 '));
}

/** Entries shown on the timeline. A search also shows entries hidden with the visibility list. */
export function visibleEntries(entries: Entry[], hiddenIds: Set<string>, filter: TypeFilter, query: string): Entry[] {
  const q = searchText(query);
  return entries.filter(
    (e) =>
      (q || !hiddenIds.has(String(e.id))) &&
      (filter === 'All' || e.type === filter) &&
      (!q || entrySearchText(e).includes(q)),
  );
}

/** Names that start with the typed text, including hidden entries. */
export function suggestions(entries: Entry[], query: string): Entry[] {
  const q = searchText(query);
  if (!q) return [];
  return entries.filter((e) => searchText(e.title).startsWith(q)).sort((a, b) => a.title.localeCompare(b.title));
}
