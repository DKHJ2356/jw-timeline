'use client';

import { collectGarbage, referencedPhotoIds } from './persistence';
import { useStore } from './store';

/** Removes photo blobs that no entry, trash item or snapshot refers to. */
export function cleanUpPhotos() {
  const s = useStore.getState();
  const keep = referencedPhotoIds([s.entries, s.trash, ...s.snapshots.map((x) => x.entries)]);
  collectGarbage(keep).catch(() => undefined);
}
