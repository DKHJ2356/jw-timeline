import { NOW_YEAR, entrySpan, fmt } from './dates';
import type { Entry, Positions } from './types';

export const BASE_WIDTH = 2600;
export const MIN_YEAR = -4100;
export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 240;
export const MIN_HEIGHT = 900;
export const MAX_HEIGHT = 5000;
export const HEIGHT_STEP = 400;
/** The person life line sits this far below the person's top edge (v18.4). */
export const PERSON_LINE_OFFSET = 62;
/** Half of the 58 px avatar: the line starts at the centre of the circle. */
export const AVATAR_CENTRE = 29;
/** Linked-event photos and names appear from this zoom level. */
export const CLOSE_ZOOM = 4;

export const clampZoom = (z: number) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));
export const clampHeight = (h: number) => Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, h));

export function timelineWidth(zoom: number): number {
  return BASE_WIDTH * zoom;
}

/** Returns x(year) for a canvas of width `w`. */
export function makeX(w: number, nowYear = NOW_YEAR): (year: number) => number {
  const span = nowYear - MIN_YEAR;
  return (y) => ((y - MIN_YEAR) / span) * w;
}

/** Inverse of makeX. */
export function makeYear(w: number, nowYear = NOW_YEAR): (x: number) => number {
  const span = nowYear - MIN_YEAR;
  return (x) => (x / w) * span + MIN_YEAR;
}

/** Smallest "nice" year step that keeps ticks at least 60 px apart. */
export function tickStep(pixelsPerYear: number): number {
  return [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000].find((s) => s * pixelsPerYear >= 60) ?? 1000;
}

export interface Tick {
  year: number;
  label: string;
  current: boolean;
}

/** Year ticks for the whole timeline (the current year is always included). */
export function ticks(w: number, nowYear = NOW_YEAR): Tick[] {
  const span = nowYear - MIN_YEAR;
  const s = tickStep(w / span);
  const out: Tick[] = [];
  for (let y = Math.ceil(MIN_YEAR / s) * s; y <= nowYear; y += s) {
    out.push({ year: y, label: fmt(y), current: y === nowYear });
  }
  if (!out.some((t) => t.year === nowYear)) out.push({ year: nowYear, label: `${nowYear} CE`, current: true });
  return out.sort((a, b) => a.year - b.year);
}

/** Ticks whose x lies inside [from, to] (binary search, so it stays cheap at 240× zoom). */
export function ticksInRange(all: Tick[], x: (y: number) => number, from: number, to: number): Tick[] {
  let lo = 0;
  let hi = all.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (x(all[mid].year) < from) lo = mid + 1;
    else hi = mid;
  }
  const out: Tick[] = [];
  for (let i = lo; i < all.length && x(all[i].year) <= to; i++) out.push(all[i]);
  return out;
}

export function axisY(canvasH: number): number {
  return Math.round(canvasH * 0.55);
}

export function hasPhoto(e: Entry): boolean {
  return !!e.photos && e.photos.length > 0;
}

export function coverPhoto(e: Entry) {
  if (!e.photos?.length) return undefined;
  const i = Math.max(0, Math.min(Number(e.coverIndex) || 0, e.photos.length - 1));
  return e.photos[i];
}

/** Distance from an item's top edge to its line. */
export function lineOffset(e: Entry): number {
  if (e.type === 'Person') return PERSON_LINE_OFFSET;
  return hasPhoto(e) ? 62 : 42;
}

/** People an event is attached to (newer list, or the older single id). */
export function eventPersonIds(e: Entry | null | undefined): number[] {
  if (!e) return [];
  if (Array.isArray(e.parentPersonIds)) return e.parentPersonIds.map(Number).filter(Boolean);
  return e.parentPersonId ? [Number(e.parentPersonId)] : [];
}

/** Default vertical position, used until the user drags an item (same rule as the original). */
export function defaultTop(e: Entry, index: number, canvasH: number): number {
  return e.type === 'Person' ? 40 + (index % 5) * 110 : axisY(canvasH) + 90 + (index % 5) * 70;
}

export interface ItemLayout {
  entry: Entry;
  id: number;
  left: number;
  /** Saved or default top. Smart spacing never changes this. */
  baseTop: number;
  lineLeft: number;
  lineWidth: number;
  lineOffset: number;
  /** Estimated rendered size, used for smart spacing. */
  width: number;
  height: number;
  /** Horizontal extent of item plus line, used for virtualisation. */
  minX: number;
  maxX: number;
}

/** Rough rendered size of an item. Matches the CSS in globals.css closely enough for spacing. */
export function estimateSize(e: Entry, dateText: string): { width: number; height: number } {
  if (e.type === 'Person') {
    const text = Math.max(e.title.length * 8.2, dateText.length * 5.6);
    return { width: Math.max(78, 66 + text), height: 58 };
  }
  const width = 26 + (hasPhoto(e) ? 54 : 0) + (e.title.length + 2) * 7.6;
  return { width: Math.max(78, width), height: Math.max(52, hasPhoto(e) ? 62 : 34) };
}

export function layoutItems(
  items: Entry[],
  positions: Positions,
  w: number,
  canvasH: number,
  dateText: (e: Entry) => string,
  nowYear = NOW_YEAR,
): ItemLayout[] {
  const x = makeX(w, nowYear);
  return items.map((e, n) => {
    const [a, b] = entrySpan(e, nowYear);
    const left = x(a);
    const right = x(b);
    const lo = Math.min(left, right);
    const isPerson = e.type === 'Person';
    const personStart = isPerson ? left + AVATAR_CENTRE : lo;
    const lineLeft = isPerson ? Math.min(personStart, right) : lo;
    const lineRight = isPerson ? Math.max(personStart, right) : Math.max(left, right);
    const lineWidth = Math.max(12, lineRight - lineLeft);
    const { width, height } = estimateSize(e, dateText(e));
    const baseTop = positions[e.id] ?? defaultTop(e, n, canvasH);
    return {
      entry: e,
      id: e.id,
      left,
      baseTop,
      lineLeft,
      lineWidth,
      lineOffset: lineOffset(e),
      width,
      height,
      minX: Math.min(left, lineLeft),
      maxX: Math.max(left + width, lineLeft + lineWidth),
    };
  });
}

export interface SpacingInput {
  id: number;
  left: number;
  width: number;
  lineLeft: number;
  lineWidth: number;
  baseTop: number;
  height: number;
}

/**
 * Temporary smart spacing (v9/v10). Items in view that overlap (by label or by line) and are
 * vertically close are pushed down. Returns only the items that moved; saved positions are untouched.
 */
export function smartSpacing(
  items: SpacingInput[],
  viewLeft: number,
  viewRight: number,
  canvasH: number,
  minGap = 20,
): Map<number, number> {
  const visible = items
    .map((o) => ({
      id: o.id,
      left: o.left,
      right: o.left + o.width,
      lineLeft: o.lineLeft,
      lineRight: o.lineLeft + o.lineWidth,
      base: o.baseTop,
      height: o.height,
      top: o.baseTop,
    }))
    .filter((o) => Math.max(o.right, o.lineRight) > viewLeft + 4 && Math.min(o.left, o.lineLeft) < viewRight - 4)
    .sort((a, b) => a.base - b.base || a.lineLeft - b.lineLeft || a.left - b.left);
  const moved = new Map<number, number>();
  for (let i = 0; i < visible.length; i++) {
    const cur = visible[i];
    for (let j = 0; j < i; j++) {
      const prev = visible[j];
      const labelsOverlap = cur.left < prev.right + 28 && cur.right > prev.left - 28;
      const linesOverlap = cur.lineLeft < prev.lineRight && cur.lineRight > prev.lineLeft;
      const verticalNear = cur.top < prev.top + prev.height + minGap && cur.top + cur.height > prev.top - minGap;
      if ((labelsOverlap || linesOverlap) && verticalNear) cur.top = prev.top + prev.height + minGap;
    }
    cur.top = Math.max(6, Math.min(canvasH - cur.height - 8, cur.top));
    if (Math.abs(cur.top - cur.base) > 1) moved.set(cur.id, cur.top);
  }
  return moved;
}

export interface FloatCandidate {
  id: number;
  start: number;
  end: number;
  /** Canvas y of the entry's line. */
  lineY: number;
}

/**
 * Entries whose start has scrolled off the left edge while their line is still in view get a
 * floating label at the left edge. Returns label centre y values (canvas coordinates), spaced so
 * labels never overlap.
 */
export function floatingLabels(
  candidates: FloatCandidate[],
  viewLeft: number,
  labelHeight = 42,
  gap = 16,
): { id: number; y: number }[] {
  const picked = candidates
    .filter((c) => c.start < viewLeft + 15 && c.end > viewLeft + 100)
    .map((c) => ({ id: c.id, y: c.lineY }))
    .sort((a, b) => a.y - b.y);
  let next = -Infinity;
  for (const l of picked) {
    if (l.y - labelHeight / 2 < next) l.y = next + labelHeight / 2;
    next = l.y + labelHeight / 2 + gap;
  }
  return picked;
}

/** The scroll position that keeps `anchor` (px from the viewport's left edge) fixed while zooming. */
export function zoomScrollLeft(scrollLeft: number, anchor: number, oldZoom: number, newZoom: number): number {
  const ratio = (scrollLeft + anchor) / timelineWidth(oldZoom);
  return Math.max(0, ratio * timelineWidth(newZoom) - anchor);
}
