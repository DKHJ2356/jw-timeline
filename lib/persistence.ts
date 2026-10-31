import { openDB, type IDBPDatabase } from 'idb';
import type { Entry, Snapshot, TimelineState } from './types';

const DB_NAME = 'bible-timeline';
const DB_VERSION = 1;
const KV = 'kv';
const IMAGES = 'images';
export const MAX_SNAPSHOTS = 3;

/** Old localStorage keys of the single-file app. */
export const LEGACY_KEYS = {
  data: 'timeline-data',
  positions: 'timeline-pos',
  trash: 'timeline-trash',
  hidden: 'timeline-hidden-entry-ids',
  migrated: 'timeline-migrated-to-indexeddb',
} as const;

export class StorageFullError extends Error {
  constructor(cause?: unknown) {
    super('The device storage is full, so the change could not be saved. Make a backup, then remove some photos or old entries.');
    this.name = 'StorageFullError';
    this.cause = cause;
  }
}

function isQuotaError(e: unknown): boolean {
  if (!(e instanceof Error) && !(typeof DOMException !== 'undefined' && e instanceof DOMException)) return false;
  const err = e as { name?: string; code?: number; message?: string };
  return err.name === 'QuotaExceededError' || err.code === 22 || /quota/i.test(err.message ?? '');
}

/** Wraps a write so storage-full errors become StorageFullError (shown to the user as a toast). */
async function write<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (isQuotaError(e)) throw new StorageFullError(e);
    throw e;
  }
}

let dbPromise: Promise<IDBPDatabase> | null = null;

export function db(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(d) {
        if (!d.objectStoreNames.contains(KV)) d.createObjectStore(KV);
        if (!d.objectStoreNames.contains(IMAGES)) d.createObjectStore(IMAGES);
      },
    });
  }
  return dbPromise;
}

export async function loadState(): Promise<TimelineState | undefined> {
  return (await db()).get(KV, 'state');
}

export async function saveState(state: TimelineState): Promise<void> {
  await write(async () => {
    await (await db()).put(KV, state, 'state');
  });
}

export async function loadSnapshots(): Promise<Snapshot[]> {
  return ((await (await db()).get(KV, 'snapshots')) as Snapshot[] | undefined) ?? [];
}

export async function saveSnapshots(list: Snapshot[]): Promise<void> {
  await write(async () => {
    await (await db()).put(KV, list, 'snapshots');
  });
}

/**
 * Adds a snapshot to the front of the rotating list, keeping at most `max`.
 * A snapshot identical to the newest one is not added twice.
 */
export function pushSnapshot(list: Snapshot[], snap: Snapshot, max = MAX_SNAPSHOTS): Snapshot[] {
  const latest = list[0];
  if (
    latest &&
    JSON.stringify(latest.entries) === JSON.stringify(snap.entries) &&
    JSON.stringify(latest.hiddenIds) === JSON.stringify(snap.hiddenIds)
  ) {
    return list;
  }
  return [snap, ...list].slice(0, max);
}

export const imageKey = (photoId: string, size: 'full' | 'thumb') => `${photoId}:${size}`;

export async function putImages(items: { key: string; blob: Blob }[]): Promise<void> {
  if (!items.length) return;
  await write(async () => {
    const tx = (await db()).transaction(IMAGES, 'readwrite');
    await Promise.all([...items.map((i) => tx.store.put(i.blob, i.key)), tx.done]);
  });
}

export async function getImage(key: string): Promise<Blob | undefined> {
  return (await db()).get(IMAGES, key);
}

export async function deleteImages(keys: string[]): Promise<void> {
  if (!keys.length) return;
  const tx = (await db()).transaction(IMAGES, 'readwrite');
  await Promise.all([...keys.map((k) => tx.store.delete(k)), tx.done]);
}

export async function imageKeys(): Promise<string[]> {
  return ((await (await db()).getAllKeys(IMAGES)) as IDBValidKey[]).map(String);
}

/** Photo ids referenced anywhere (entries, trash, snapshots). */
export function referencedPhotoIds(lists: Entry[][]): Set<string> {
  const ids = new Set<string>();
  for (const list of lists) for (const e of list) for (const p of e.photos ?? []) ids.add(p.id);
  return ids;
}

/** Deletes blobs that nothing refers to any more (for example photos added to a cancelled form). */
export async function collectGarbage(keep: Set<string>): Promise<number> {
  const unused = (await imageKeys()).filter((k) => !keep.has(k.split(':')[0]));
  await deleteImages(unused);
  return unused.length;
}

function readLegacy<T>(key: string, fallback: T): T {
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? 'null');
    return (v ?? fallback) as T;
  } catch {
    return fallback;
  }
}

/** Old single-file app data on this same site, if there is any and it has not been migrated yet. */
export function readLegacyLocalStorage(): {
  entries: unknown[];
  positions: Record<string, number>;
  trash: unknown[];
  hiddenIds: string[];
} | null {
  if (typeof localStorage === 'undefined') return null;
  if (localStorage.getItem(LEGACY_KEYS.migrated)) return null;
  const entries = readLegacy<unknown[] | null>(LEGACY_KEYS.data, null);
  if (!Array.isArray(entries)) return null;
  return {
    entries,
    positions: readLegacy(LEGACY_KEYS.positions, {}),
    trash: readLegacy(LEGACY_KEYS.trash, []),
    hiddenIds: readLegacy<unknown[]>(LEGACY_KEYS.hidden, []).map(String),
  };
}

/** The old keys are left in place (nothing is deleted); this flag stops a second migration. */
export function markLegacyMigrated(): void {
  try {
    localStorage.setItem(LEGACY_KEYS.migrated, new Date().toISOString());
  } catch {
    // localStorage full or blocked: migration may run again next time, which is harmless.
  }
}
