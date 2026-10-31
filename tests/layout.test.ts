import { describe, expect, it } from 'vitest';
import {
  defaultTop,
  eventPersonIds,
  floatingLabels,
  layoutItems,
  lineOffset,
  makeX,
  smartSpacing,
  tickStep,
  ticks,
  ticksInRange,
  timelineWidth,
  zoomScrollLeft,
  MIN_YEAR,
  PERSON_LINE_OFFSET,
} from '@/lib/layout';
import type { Entry } from '@/lib/types';

describe('tickStep', () => {
  it('picks the smallest step that is at least 60 px wide', () => {
    expect(tickStep(100)).toBe(1);
    expect(tickStep(30)).toBe(2);
    expect(tickStep(12)).toBe(5);
    expect(tickStep(2600 / 6126)).toBe(200);
    expect(tickStep(0.01)).toBe(1000);
  });
});

describe('ticks', () => {
  it('covers the range and always includes the current year', () => {
    const t = ticks(timelineWidth(1), 2026);
    expect(t[0].year).toBe(-4000);
    expect(t.at(-1)).toEqual({ year: 2026, label: '2026 CE', current: true });
    expect(t.filter((x) => x.current)).toHaveLength(1);
  });
  it('gives one tick per year at 240x zoom, and range lookup is exact', () => {
    const w = timelineWidth(240);
    const all = ticks(w, 2026);
    expect(all.length).toBe(2026 - MIN_YEAR + 1);
    const x = makeX(w, 2026);
    const vis = ticksInRange(all, x, x(-1000), x(-990));
    expect(vis.map((v) => v.year)).toEqual([-1000, -999, -998, -997, -996, -995, -994, -993, -992, -991, -990]);
  });
});

describe('positions', () => {
  const person: Entry = { id: 1, title: 'Adam', type: 'Person', start: -4026, end: -3096 };
  const ev: Entry = { id: 2, title: 'Flood', type: 'Event', start: -2370, end: -2369 };
  it('default tops follow the original rule', () => {
    expect(defaultTop(person, 0, 1200)).toBe(40);
    expect(defaultTop(person, 6, 1200)).toBe(150);
    expect(defaultTop(ev, 1, 1200)).toBe(660 + 90 + 70);
  });
  it('person lines are 62 px below the person and start at the circle centre', () => {
    expect(lineOffset(person)).toBe(PERSON_LINE_OFFSET);
    expect(PERSON_LINE_OFFSET).toBe(62);
    const [l] = layoutItems([person], {}, 2600, 1200, () => '');
    expect(l.lineLeft).toBeCloseTo(l.left + 29);
    expect(lineOffset(ev)).toBe(42);
    expect(
      lineOffset({ ...ev, photos: [{ id: 'a', w: 1, h: 1, blur: '', sourceTitle: '', sourceUrl: '', reference: '' }] }),
    ).toBe(62);
  });
  it('saved positions win over defaults', () => {
    const [l] = layoutItems([person], { 1: 300 }, 2600, 1200, () => '');
    expect(l.baseTop).toBe(300);
  });
  it('reads both link formats', () => {
    expect(eventPersonIds({ ...ev, parentPersonIds: [1, 3] })).toEqual([1, 3]);
    expect(eventPersonIds({ ...ev, parentPersonId: 7 })).toEqual([7]);
    expect(eventPersonIds(ev)).toEqual([]);
  });
});

describe('smartSpacing', () => {
  const box = (id: number, left: number, top: number) => ({
    id,
    left,
    width: 120,
    lineLeft: left,
    lineWidth: 300,
    baseTop: top,
    height: 58,
  });
  it('pushes overlapping items down without touching the inputs', () => {
    const items = [box(1, 100, 40), box(2, 150, 50)];
    const moved = smartSpacing(items, 0, 1000, 1200);
    expect(moved.get(1)).toBeUndefined();
    expect(moved.get(2)).toBe(40 + 58 + 20);
    expect(items[1].baseTop).toBe(50);
  });
  it('leaves items that are far apart alone', () => {
    expect(smartSpacing([box(1, 100, 40), box(2, 2000, 40)], 0, 3000, 1200).size).toBe(0);
    expect(smartSpacing([box(1, 100, 40), box(2, 100, 400)], 0, 3000, 1200).size).toBe(0);
  });
  it('ignores items outside the view', () => {
    expect(smartSpacing([box(1, 5000, 40), box(2, 5000, 50)], 0, 1000, 1200).size).toBe(0);
  });
  it('keeps items inside the canvas', () => {
    const moved = smartSpacing([box(1, 100, 1100), box(2, 100, 1110)], 0, 1000, 1200);
    expect(moved.get(2)).toBe(1200 - 58 - 8);
  });
});

describe('floatingLabels', () => {
  it('picks entries that started off-screen and spaces them', () => {
    const out = floatingLabels(
      [
        { id: 1, start: 0, end: 5000, lineY: 100 },
        { id: 2, start: 10, end: 5000, lineY: 110 },
        { id: 3, start: 2000, end: 5000, lineY: 120 },
        { id: 4, start: 0, end: 1050, lineY: 500 },
      ],
      1000,
    );
    expect(out.map((l) => l.id)).toEqual([1, 2]);
    expect(out[1].y).toBe(100 + 21 + 16 + 21);
  });
});

describe('zoomScrollLeft', () => {
  it('keeps the anchor point under the cursor', () => {
    const sl = zoomScrollLeft(1000, 200, 1, 2);
    expect((sl + 200) / timelineWidth(2)).toBeCloseTo((1000 + 200) / timelineWidth(1));
  });
});
