import { blobToDataUrl, dataUrlToBlob, importDataUrlPhoto } from './images';
import { getImage, imageKey, putImages } from './persistence';
import { ENTRY_TYPES, type BackupFile, type BackupSettings, type Entry, type LegacyEntry, type Photo, type Positions, type SourceInfo, type TimelineState, type TrashedEntry } from './types';

export const BACKUP_FORMAT = 'BibleTimelineCompleteBackup';
export const BACKUP_VERSION = 2;

/** "2026-10-31-2105", used in backup file names. */
export function stamp(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

export function countPhotos(list: { photos?: unknown[]; media?: string; mediaItems?: string[] }[]): number {
  return list.reduce((n, e) => {
    if (e.photos?.length) return n + e.photos.length;
    if (Array.isArray(e.mediaItems) && e.mediaItems.length) return n + e.mediaItems.length;
    return n + (e.media ? 1 : 0);
  }, 0);
}

/** Builds a version 2 backup. Photos are embedded as data URLs so the file is self-contained. */
export async function buildBackup(state: TimelineState, settings: BackupSettings): Promise<BackupFile> {
  const images: NonNullable<BackupFile['images']> = {};
  for (const e of [...state.entries, ...state.trash]) {
    for (const p of e.photos ?? []) {
      if (images[p.id]) continue;
      const [full, thumb] = await Promise.all([getImage(imageKey(p.id, 'full')), getImage(imageKey(p.id, 'thumb'))]);
      if (full && thumb) images[p.id] = { full: await blobToDataUrl(full), thumb: await blobToDataUrl(thumb) };
    }
  }
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    app: { name: 'My Bible Timeline', currentYear: new Date().getFullYear() },
    timeline: { entries: state.entries, positions: state.positions, trash: state.trash },
    settings: { ...settings, hiddenEntryIds: state.hiddenIds },
    images,
    statistics: {
      entries: state.entries.length,
      trash: state.trash.length,
      images: countPhotos([...state.entries, ...state.trash]),
    },
  };
}

/** Checks a backup file's text. Throws if it is not a Bible Timeline backup. */
export function parseBackup(text: string): BackupFile {
  let b: BackupFile;
  try {
    b = JSON.parse(text);
  } catch {
    throw new Error('This is not a valid Bible Timeline backup.');
  }
  if (b?.format !== BACKUP_FORMAT || !Array.isArray(b.timeline?.entries)) {
    throw new Error('This is not a valid Bible Timeline backup.');
  }
  return b;
}

export function backupSummary(b: BackupFile) {
  return {
    createdAt: b.createdAt ? new Date(b.createdAt) : null,
    version: b.version ?? 1,
    entries: b.timeline.entries.length,
    trash: b.timeline.trash?.length ?? 0,
    images: b.statistics?.images ?? countPhotos([...b.timeline.entries, ...(b.timeline.trash ?? [])]),
  };
}

/** The photos of an old-format entry: data URLs plus their per-photo source details (v18.7 rules). */
export function legacyPhotoSources(e: LegacyEntry): { dataUrl: string; meta: SourceInfo }[] {
  const items = Array.isArray(e.mediaItems) && e.mediaItems.length ? e.mediaItems : e.media ? [e.media] : [];
  return items
    .map((dataUrl, n) => {
      const m = Array.isArray(e.mediaMeta) ? e.mediaMeta[n] : undefined;
      return {
        dataUrl,
        meta: {
          sourceTitle: m?.sourceTitle ?? e.sourceTitle ?? '',
          sourceUrl: m?.sourceUrl ?? e.sourceUrl ?? '',
          reference: m?.reference ?? e.reference ?? '',
        },
      };
    })
    .filter((p) => typeof p.dataUrl === 'string' && p.dataUrl.startsWith('data:'));
}

/** Normalises the fields of an entry read from any older format (no photo work). */
export function normaliseEntry(e: LegacyEntry): Entry {
  const { media: _media, mediaItems: _items, mediaMeta: _meta, savedPosition: _sp, deletedAt: _da, ...rest } = e;
  void _media; void _items; void _meta; void _sp; void _da;
  const type = ENTRY_TYPES.includes(rest.type) ? rest.type : 'Event';
  const ids = Array.isArray(rest.parentPersonIds)
    ? rest.parentPersonIds.map(Number).filter(Boolean)
    : rest.parentPersonId
      ? [Number(rest.parentPersonId)]
      : [];
  return {
    ...rest,
    id: Number(rest.id),
    title: String(rest.title ?? ''),
    type,
    start: Number(rest.start) || 0,
    end: Number.isFinite(Number(rest.end)) ? Number(rest.end) : Number(rest.start) || 0,
    parentPersonIds: type === 'Event' ? ids : [],
    parentPersonId: type === 'Event' ? (ids[0] ?? null) : null,
    photos: Array.isArray(rest.photos) ? rest.photos : [],
    coverIndex: Number(rest.coverIndex) || 0,
  };
}

/** Converts an old entry (data URL photos) into the new shape, storing its photos in IndexedDB. */
export async function convertLegacyEntry(e: LegacyEntry): Promise<Entry> {
  const out = normaliseEntry(e);
  const sources = legacyPhotoSources(e);
  if (sources.length && !(e.photos && e.photos.length)) {
    const photos: Photo[] = [];
    let cover = Number(e.coverIndex) || 0;
    for (let i = 0; i < sources.length; i++) {
      const p = await importDataUrlPhoto(sources[i].dataUrl, sources[i].meta);
      if (p) photos.push(p);
      else if (i < cover) cover--;
    }
    out.photos = photos;
    out.coverIndex = Math.max(0, Math.min(cover, photos.length - 1));
  }
  return out;
}

async function convertTrash(list: LegacyEntry[]): Promise<TrashedEntry[]> {
  const out: TrashedEntry[] = [];
  for (const t of list) {
    const e = await convertLegacyEntry(t);
    out.push({
      ...e,
      ...(t.savedPosition != null ? { savedPosition: t.savedPosition } : {}),
      deletedAt: t.deletedAt ?? new Date().toISOString(),
    });
  }
  return out;
}

/** Converts any older data (old localStorage or a version 1 backup) into the new state. */
export async function convertLegacyState(src: {
  entries: unknown[];
  positions?: Positions;
  trash?: unknown[];
  hiddenIds?: string[];
}): Promise<TimelineState> {
  const entries: Entry[] = [];
  for (const e of src.entries as LegacyEntry[]) entries.push(await convertLegacyEntry(e));
  return {
    entries,
    positions: { ...(src.positions ?? {}) },
    trash: await convertTrash((src.trash ?? []) as LegacyEntry[]),
    hiddenIds: (src.hiddenIds ?? []).map(String),
  };
}

/** Turns a parsed backup (version 1 or 2) into state, writing its photos to IndexedDB. */
export async function restoreBackup(b: BackupFile): Promise<{ state: TimelineState; settings: BackupSettings }> {
  if (b.images && Object.keys(b.images).length) {
    const blobs: { key: string; blob: Blob }[] = [];
    for (const [id, img] of Object.entries(b.images)) {
      try {
        blobs.push({ key: imageKey(id, 'full'), blob: dataUrlToBlob(img.full) });
        blobs.push({ key: imageKey(id, 'thumb'), blob: dataUrlToBlob(img.thumb) });
      } catch {
        // A damaged image is skipped; the entry keeps its blurred placeholder.
      }
    }
    await putImages(blobs);
  }
  const state = await convertLegacyState({
    entries: b.timeline.entries,
    positions: b.timeline.positions,
    trash: b.timeline.trash,
    hiddenIds: (b.settings?.hiddenEntryIds ?? []).map(String),
  });
  return { state, settings: b.settings ?? {} };
}
