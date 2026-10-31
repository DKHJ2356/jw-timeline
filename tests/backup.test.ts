import { describe, expect, it } from 'vitest';
import { backupSummary, countPhotos, legacyPhotoSources, normaliseEntry, parseBackup } from '@/lib/backup';
import { pushSnapshot } from '@/lib/persistence';
import type { LegacyEntry, Snapshot } from '@/lib/types';

const PNG = 'data:image/png;base64,iVBORw0KGgo=';

describe('legacyPhotoSources', () => {
  it('reads several photos with per-photo sources, falling back to the entry source (v18.7)', () => {
    const e: LegacyEntry = {
      id: 1, title: 'A', type: 'Event', start: 1, end: 1, sourceTitle: 'Entry source', reference: 'Gen 1',
      mediaItems: [PNG, PNG], mediaMeta: [{ sourceTitle: 'Photo 1' }],
    };
    expect(legacyPhotoSources(e)).toEqual([
      { dataUrl: PNG, meta: { sourceTitle: 'Photo 1', sourceUrl: '', reference: 'Gen 1' } },
      { dataUrl: PNG, meta: { sourceTitle: 'Entry source', sourceUrl: '', reference: 'Gen 1' } },
    ]);
  });
  it('reads the older single media field', () => {
    expect(legacyPhotoSources({ id: 1, title: 'A', type: 'Person', start: 1, end: 2, media: PNG })).toHaveLength(1);
    expect(legacyPhotoSources({ id: 1, title: 'A', type: 'Person', start: 1, end: 2 })).toHaveLength(0);
  });
});

describe('normaliseEntry', () => {
  it('turns the old single person link into the list and drops old photo fields', () => {
    const e = normaliseEntry({ id: 5, title: 'X', type: 'Event', start: -10, end: -9, parentPersonId: 2, media: PNG, mediaItems: [PNG] });
    expect(e.parentPersonIds).toEqual([2]);
    expect(e.parentPersonId).toBe(2);
    expect('media' in e).toBe(false);
    expect('mediaItems' in e).toBe(false);
  });
  it('clears links on non-events', () => {
    expect(normaliseEntry({ id: 5, title: 'X', type: 'Person', start: -10, end: -9, parentPersonIds: [1] }).parentPersonIds).toEqual([]);
  });
});

describe('parseBackup', () => {
  it('accepts version 1 backups and summarises them', () => {
    const b = parseBackup(JSON.stringify({
      format: 'BibleTimelineCompleteBackup', version: 1, createdAt: '2026-01-01T00:00:00Z',
      timeline: { entries: [{ id: 1, title: 'A', type: 'Person', start: 1, end: 2, mediaItems: [PNG, PNG] }], positions: {}, trash: [] },
    }));
    expect(backupSummary(b)).toMatchObject({ version: 1, entries: 1, trash: 0, images: 2 });
  });
  it('rejects other files', () => {
    expect(() => parseBackup('{}')).toThrow(/not a valid/);
    expect(() => parseBackup('not json')).toThrow(/not a valid/);
  });
  it('counts photos in every format', () => {
    expect(countPhotos([{ media: PNG }, { mediaItems: [PNG, PNG] }, { photos: [1, 2, 3] }])).toBe(6);
  });
});

describe('pushSnapshot (Recover keeps the last 3 states)', () => {
  const s = (n: number): Snapshot => ({ at: String(n), entries: [{ id: n, title: String(n), type: 'Event', start: 0, end: 0 }], positions: {}, hiddenIds: [] });
  it('keeps the newest three', () => {
    let list: Snapshot[] = [];
    for (let i = 1; i <= 5; i++) list = pushSnapshot(list, s(i));
    expect(list.map((x) => x.at)).toEqual(['5', '4', '3']);
  });
  it('does not store the same state twice in a row', () => {
    const list = pushSnapshot([s(1)], { ...s(1), at: 'later' });
    expect(list).toHaveLength(1);
  });
});
