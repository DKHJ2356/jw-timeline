'use client';

import { buildBackup, parseBackup, stamp } from '@/lib/backup';
import { fromCsv, toCsv } from '@/lib/csv';
import { download } from '@/lib/download';
import { PALETTE } from '@/lib/sample';
import { useStore } from '@/lib/store';

const st = () => useStore.getState();

export async function saveBackup(prefix = 'Bible-Timeline-Backup'): Promise<void> {
  const s = st();
  const b = await buildBackup(
    { entries: s.entries, positions: s.positions, trash: s.trash, hiddenIds: s.hiddenIds },
    { theme: s.theme, zoom: s.zoom, canvasHeight: s.canvasH, filter: s.filter },
  );
  download(`${prefix}-${stamp()}.btlbackup`, JSON.stringify(b, null, 2));
}

export async function backupNow() {
  try {
    await saveBackup();
    st().toast('Backup file saved.');
  } catch (e) {
    console.error(e);
    st().toast('The backup could not be created.', 'error');
  }
}

export async function openRestoreFile(file: File) {
  try {
    const backup = parseBackup(await file.text());
    st().openModal({ kind: 'restore', backup });
  } catch (e) {
    st().toast(e instanceof Error ? e.message : 'This is not a valid Bible Timeline backup.', 'error');
  }
}

export function exportCsv() {
  download('Bible-Timeline-Text-Export.csv', toCsv(st().entries), 'text/csv;charset=utf-8');
}

export async function importCsvFile(file: File) {
  const s = st();
  const text = await file.text();
  const { entries, skipped } = fromCsv(text, s.nextId(), (i) => PALETTE[i % PALETTE.length]);
  if (!entries.length) {
    s.toast(skipped[0]?.reason ? `No entries imported: ${skipped[0].reason}` : 'No entries were found in this CSV file.', 'error');
    return;
  }
  const key = (e: { title: string; type: string; start: number; end: number }) =>
    `${e.title.toLowerCase()}|${e.type}|${e.start}|${e.end}`;
  const existing = new Set(s.entries.map(key));
  const fresh = entries.filter((e) => !existing.has(key(e)));
  const dupes = entries.length - fresh.length;
  if (!fresh.length) {
    s.toast(`All ${entries.length} entries in this file are already on the timeline.`);
    return;
  }
  const extra = [dupes ? `${dupes} already on the timeline` : '', skipped.length ? `${skipped.length} unreadable rows` : '']
    .filter(Boolean)
    .join(', ');
  if (!window.confirm(`Add ${fresh.length} entr${fresh.length === 1 ? 'y' : 'ies'} from this CSV file?${extra ? `\n(Skipping ${extra}.)` : ''}`)) return;
  // Person links inside the file must point at the entries actually added.
  const keptIds = new Set(fresh.map((e) => e.id));
  for (const e of fresh) {
    if (e.parentPersonIds?.length) {
      e.parentPersonIds = e.parentPersonIds.filter((id) => keptIds.has(id));
      e.parentPersonId = e.parentPersonIds[0] ?? null;
    }
  }
  s.addEntries(fresh);
  s.toast(`Imported ${fresh.length} entr${fresh.length === 1 ? 'y' : 'ies'} from CSV.`);
}

export function recover() {
  const s = st();
  const latest = s.snapshots[0];
  if (!latest) {
    s.toast('No earlier version has been saved yet.');
    return;
  }
  const when = new Date(latest.at).toLocaleString();
  if (!window.confirm(`Go back to the timeline as it was before the change at ${when}?\n(${s.snapshots.length} earlier version${s.snapshots.length === 1 ? '' : 's'} kept.)`)) return;
  if (s.recover()) s.toast('Earlier version restored.');
}

export function loadSample() {
  if (window.confirm('Replace current timeline with sample entries?')) st().loadSample();
}

export function resetPositions() {
  if (window.confirm('Reset all vertical positions?')) st().resetPositions();
}
