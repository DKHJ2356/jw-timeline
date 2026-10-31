import { describe, expect, it } from 'vitest';
import { entrySearchText, searchText, suggestions, visibleEntries } from '@/lib/search';
import type { Entry } from '@/lib/types';

const entries: Entry[] = [
  { id: 1, title: 'Adam', type: 'Person', start: -4026, end: -3096, note: 'First man' },
  { id: 2, title: 'Noah', type: 'Person', start: -2970, end: -2020 },
  {
    id: 3,
    title: 'The Flood',
    type: 'Event',
    start: -2370,
    end: -2369,
    photos: [{ id: 'x', w: 1, h: 1, blur: 'data:image/webp;base64,QWRhbUFkYW0=', sourceTitle: '', sourceUrl: '', reference: 'Gen 7' }],
  },
  { id: 4, title: 'Élie', type: 'Person', start: -900, end: -850 },
];

describe('searchText', () => {
  it('ignores case, accents and spaces', () => {
    expect(searchText('  ÉLIE ')).toBe('elie');
    expect(searchText(null)).toBe('');
  });
});

describe('visibleEntries', () => {
  it('hides hidden entries unless searching', () => {
    const hidden = new Set(['2']);
    expect(visibleEntries(entries, hidden, 'All', '').map((e) => e.id)).toEqual([1, 3, 4]);
    expect(visibleEntries(entries, hidden, 'All', 'noah').map((e) => e.id)).toEqual([2]);
  });
  it('filters by type', () => {
    expect(visibleEntries(entries, new Set(), 'Event', '').map((e) => e.id)).toEqual([3]);
  });
  it('searches text fields only, never photo data', () => {
    expect(entrySearchText(entries[2])).not.toContain('qwrh');
    expect(visibleEntries(entries, new Set(), 'All', 'QWRh').length).toBe(0);
    expect(visibleEntries(entries, new Set(), 'All', 'gen 7').map((e) => e.id)).toEqual([3]);
    expect(visibleEntries(entries, new Set(), 'All', 'first man').map((e) => e.id)).toEqual([1]);
  });
  it('matches displayed years', () => {
    expect(visibleEntries(entries, new Set(), 'All', '4026 bce').map((e) => e.id)).toEqual([1]);
  });
});

describe('suggestions', () => {
  it('lists names starting with the text, including hidden entries', () => {
    expect(suggestions(entries, 'a').map((e) => e.title)).toEqual(['Adam']);
    expect(suggestions(entries, 'eli').map((e) => e.title)).toEqual(['Élie']);
    expect(suggestions(entries, '')).toEqual([]);
  });
});
