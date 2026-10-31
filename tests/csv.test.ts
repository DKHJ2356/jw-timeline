import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fromCsv, parseCsv, toCsv } from '@/lib/csv';
import type { Entry } from '@/lib/types';

const colour = () => '#00B8D9';

// Same column layout as the original app's older export (startApprox/endApprox, no parentPersonId).
const OLD_LAYOUT = [
  'title,subtitle,type,start,startMonth,startDay,end,endMonth,endDay,ongoing,reference,note,importance,colour,sourceTitle,sourceUrl,startApprox,endApprox',
  '"Adam","","Person","-4026","","","-3096","","","","Genesis 5","Lifespan entry.","","","","","",""',
  '"The Flood","","Event","-2370","","","-2369","","","","Genesis 7:11–8:19","","","","","","",""',
  '"Rainbow covenant","","Covenant","-2369","","","-2369","","","","Genesis 9:8-17","Line one\nline ""two""","2","#a100ff","","","true",""',
].join('\n');

describe('parseCsv', () => {
  it('handles quotes, commas and line breaks', () => {
    expect(parseCsv('a,b\r\n"x, y","say ""hi""\nnext"\n')).toEqual([
      ['a', 'b'],
      ['x, y', 'say "hi"\nnext'],
    ]);
  });
  it('strips a byte-order mark and blank lines', () => {
    expect(parseCsv('\uFEFFa\n\n1\n')).toEqual([['a'], ['1']]);
  });
});

describe('fromCsv', () => {
  it('reads the older column layout', () => {
    const { entries, skipped } = fromCsv(OLD_LAYOUT, 100, colour);
    expect(skipped).toEqual([]);
    expect(entries.map((e) => e.title)).toEqual(['Adam', 'The Flood', 'Rainbow covenant']);
    expect(entries[0]).toMatchObject({ id: 100, type: 'Person', start: -4026, end: -3096, importance: 3, colour: '#00B8D9' });
    expect(entries[1].reference).toBe('Genesis 7:11–8:19');
    expect(entries[2]).toMatchObject({ startApprox: true, endApprox: false, importance: 2, colour: '#A100FF' });
    expect(entries[2].note).toBe('Line one\nline "two"');
  });
  it('skips rows without a title or a valid year', () => {
    const { entries, skipped } = fromCsv('title,start\n"",1\n"X",abc\n"Y","33 CE"\n"Z","4 BCE"', 1, colour);
    expect(entries.map((e) => [e.title, e.start])).toEqual([
      ['Y', 33],
      ['Z', -4],
    ]);
    expect(skipped.map((s) => s.line)).toEqual([2, 3]);
  });
  it('rejects files without the needed columns', () => {
    expect(fromCsv('name,year\nA,1', 1, colour).skipped[0].reason).toMatch(/title/);
  });
});

describe('round trip', () => {
  it('keeps every text field, the ≈ flags and person links', () => {
    const src: Entry[] = [
      { id: 1, title: 'Abraham', subtitle: 'Patriarch 🌳', type: 'Person', start: -2018, end: -1843, colour: '#FF7A00', importance: 1, startApprox: true },
      { id: 2, title: 'Sarah', type: 'Person', start: -2008, end: -1881, colour: '#FF3B9D' },
      {
        id: 3, title: 'Covenant, "promise"', type: 'Event', start: -1943, end: -1943, startMonth: 'nisan', startDay: 14,
        endApprox: true, parentPersonIds: [1, 2], note: 'a\nb', sourceTitle: 'S', sourceUrl: 'https://example.org',
      },
    ];
    const csv = toCsv(src);
    expect(csv.split('\r\n')[0]).toContain('parentPersonIds');
    const { entries } = fromCsv(csv, 500, colour);
    expect(entries).toHaveLength(3);
    expect(entries[0]).toMatchObject({ title: 'Abraham', subtitle: 'Patriarch 🌳', startApprox: true, importance: 1 });
    expect(entries[2]).toMatchObject({
      title: 'Covenant, "promise"', startMonth: 'nisan', startDay: 14, endApprox: true, note: 'a\nb',
      parentPersonIds: [500, 501], parentPersonId: 500, sourceUrl: 'https://example.org',
    });
  });
});

const USER_CSV = 'C:/Users/domin/Downloads/bible-timeline-backup.csv';
describe.skipIf(!existsSync(USER_CSV))("the user's existing CSV file", () => {
  it('imports all 7 entries', () => {
    const { entries, skipped } = fromCsv(readFileSync(USER_CSV, 'utf8'), 1, colour);
    expect(skipped).toEqual([]);
    expect(entries).toHaveLength(7);
    expect(entries.find((e) => e.title === 'The Flood')).toMatchObject({ type: 'Event', start: -2370, end: -2369 });
  });
});
