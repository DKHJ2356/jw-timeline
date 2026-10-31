'use client';

import { motionValue, type MotionValue } from 'framer-motion';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { dp, lifespanText } from '@/lib/dates';
import { isCoarsePointer } from '@/lib/device';
import {
  CLOSE_ZOOM,
  PERSON_LINE_OFFSET,
  axisY as axisYOf,
  clampZoom,
  eventPersonIds,
  floatingLabels,
  layoutItems,
  makeX,
  smartSpacing,
  ticks as allTicksFor,
  ticksInRange,
  timelineWidth,
  zoomScrollLeft,
  type ItemLayout,
} from '@/lib/layout';
import { visibleEntries } from '@/lib/search';
import { useStore } from '@/lib/store';
import type { Entry } from '@/lib/types';
import { registerZoomHandler } from '@/lib/zoomBus';
import FloatingLabels from './FloatingLabels';
import { LifeLine, TimelineItem } from './items';
import LinkedEventMarker from './LinkedEventMarker';
import SharedEventConnector, { type SharedPerson } from './SharedEventConnector';
import { RulerTicks, YearAxis } from './YearAxis';

const EmptyState = dynamic(() => import('./EmptyState'), { ssr: false });

const RULER_H = 44;
const DRAG_MIN = 5;
const DRAG_BOTTOM = 95;

interface Win {
  from: number;
  to: number;
}

interface Gesture {
  startZoom: number;
  scale: number;
  anchor: number;
  originX: number;
  startScroll: number;
}

const dateText = (e: Entry) => (e.type === 'Person' ? lifespanText(e) : e.title);

const sameMap = (a: Map<number, number>, b: Map<number, number>) =>
  a.size === b.size && [...a].every(([k, v]) => b.get(k) === v);

export default function TimelineViewport() {
  const entries = useStore((s) => s.entries);
  const positions = useStore((s) => s.positions);
  const hiddenIds = useStore((s) => s.hiddenIds);
  const filter = useStore((s) => s.filter);
  const query = useStore((s) => s.query);
  const zoom = useStore((s) => s.zoom);
  const canvasH = useStore((s) => s.canvasH);
  const focus = useStore((s) => s.focus);
  const lowEnd = useStore((s) => s.lowEnd);
  const setZoom = useStore((s) => s.setZoom);
  const setPosition = useStore((s) => s.setPosition);
  const openModal = useStore((s) => s.openModal);

  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const rulerRef = useRef<HTMLDivElement>(null);
  const rulerInnerRef = useRef<HTMLDivElement>(null);

  const [coarse] = useState(isCoarsePointer);
  const [win, setWin] = useState<Win>(() => ({ from: -1500, to: 3000 }));
  const [spaced, setSpaced] = useState<Map<number, number>>(() => new Map());
  const [dragging, setDragging] = useState<number | null>(null);
  const [floatKey, setFloatKey] = useState('');

  const w = timelineWidth(zoom);
  const x = useMemo(() => makeX(w), [w]);
  const axisY = axisYOf(canvasH);
  const closeZoom = zoom >= CLOSE_ZOOM;

  // ---- what is shown ------------------------------------------------------
  const hidden = useMemo(() => new Set(hiddenIds), [hiddenIds]);
  const visible = useMemo(() => visibleEntries(entries, hidden, filter, query), [entries, hidden, filter, query]);
  const { items, linked } = useMemo(() => {
    const persons = new Map(visible.filter((e) => e.type === 'Person').map((e) => [e.id, e]));
    const linked: { event: Entry; people: Entry[] }[] = [];
    const items: Entry[] = [];
    for (const e of visible) {
      const people = e.type === 'Event' ? eventPersonIds(e).map((id) => persons.get(id)).filter((p): p is Entry => !!p) : [];
      // An event whose people are not shown falls back to a separate card.
      if (people.length) linked.push({ event: e, people });
      else items.push(e);
    }
    return { items, linked };
  }, [visible]);

  const layout = useMemo(() => layoutItems(items, positions, w, canvasH, dateText), [items, positions, w, canvasH]);
  const byId = useMemo(() => new Map(layout.map((l) => [l.id, l])), [layout]);

  const displayTop = useCallback(
    (l: ItemLayout) => (dragging != null ? l.baseTop : (spaced.get(l.id) ?? l.baseTop)),
    [dragging, spaced],
  );

  // One motion value per entry: the drag offset shared by the item, its line and its markers.
  const [mvs] = useState(() => new Map<number, MotionValue<number>>());
  const mvFor = useCallback(
    (id: number) => {
      let v = mvs.get(id);
      if (!v) {
        v = motionValue(0);
        mvs.set(id, v);
      }
      return v;
    },
    [mvs],
  );

  // Refs so the scroll loop always sees the latest values without re-subscribing.
  const live = useRef({ layout, spaced, dragging, axisY, w, coarse, x });
  const winRef = useRef(win);
  useLayoutEffect(() => {
    live.current = { layout, spaced, dragging, axisY, w, coarse, x };
    winRef.current = win;
  });
  const gesture = useRef<Gesture | null>(null);
  const pendingScroll = useRef<number | null>(null);

  // ---- floating ruler (moved with a transform, never rebuilt per frame) ----
  const updateRuler = useCallback(() => {
    const sc = scrollRef.current;
    const ruler = rulerRef.current;
    const inner = rulerInnerRef.current;
    if (!sc || !ruler || !inner) return;
    const { axisY: ay, coarse: isCoarse } = live.current;
    const edge = 48;
    const axisScreen = ay - sc.scrollTop;
    const show = !(axisScreen >= edge && axisScreen <= sc.clientHeight - edge);
    ruler.classList.toggle('show', show);
    if (show) {
      const sbH = sc.offsetHeight - sc.clientHeight;
      ruler.style.right = `${sc.offsetWidth - sc.clientWidth}px`;
      if (isCoarse || axisScreen >= edge) {
        ruler.style.top = 'auto';
        ruler.style.bottom = `${sbH}px`;
      } else {
        ruler.style.top = '0px';
        ruler.style.bottom = 'auto';
      }
    }
    const g = gesture.current;
    inner.style.transform = g
      ? `translate3d(${-sc.scrollLeft}px,0,0) translateX(${g.originX}px) scaleX(${g.scale}) translateX(${-g.originX}px)`
      : `translate3d(${-sc.scrollLeft}px,0,0)`;
  }, []);

  // ---- floating labels -----------------------------------------------------
  const computeFloat = useCallback(() => {
    const sc = scrollRef.current;
    if (!sc) return;
    const { layout: lay, spaced: sp, dragging: dr } = live.current;
    const top = (l: ItemLayout) => (dr != null ? l.baseTop : (sp.get(l.id) ?? l.baseTop));
    const labels = floatingLabels(
      lay.map((l) => ({ id: l.id, start: l.left, end: l.lineLeft + l.lineWidth, lineY: top(l) + l.lineOffset })),
      sc.scrollLeft,
    );
    const key = labels.map((l) => `${l.id}:${Math.round(l.y)}`).join('|');
    setFloatKey((k) => (k === key ? k : key));
  }, []);

  const floatLabels = useMemo(() => {
    if (!floatKey) return [];
    return floatKey
      .split('|')
      .map((s) => {
        const [id, y] = s.split(':').map(Number);
        const entry = byId.get(id)?.entry;
        return entry ? { entry, y } : null;
      })
      .filter((v): v is { entry: Entry; y: number } => !!v);
  }, [floatKey, byId]);
  const replaced = useMemo(() => new Set(floatLabels.map((l) => l.entry.id)), [floatLabels]);

  // ---- smart spacing (temporary; saved positions never change) -------------
  const runSpacing = useCallback(() => {
    const sc = scrollRef.current;
    if (!sc || live.current.dragging != null) return;
    const next = smartSpacing(live.current.layout, sc.scrollLeft, sc.scrollLeft + sc.clientWidth, canvasH);
    setSpaced((prev) => (sameMap(prev, next) ? prev : next));
  }, [canvasH]);

  useEffect(() => {
    runSpacing();
  }, [layout, dragging, runSpacing]);

  useEffect(() => {
    computeFloat();
    updateRuler();
  }, [layout, spaced, dragging, axisY, computeFloat, updateRuler]);

  // ---- render window (one screen of buffer each side) ----------------------
  const windowFor = useCallback((scrollLeft: number, cw: number): Win => ({ from: scrollLeft - cw, to: scrollLeft + 2 * cw }), []);

  const maybeMoveWindow = useCallback(() => {
    const sc = scrollRef.current;
    if (!sc) return;
    const cw = sc.clientWidth;
    const sl = sc.scrollLeft;
    const cur = winRef.current;
    if (sl < cur.from + cw * 0.5 || sl + cw > cur.to - cw * 0.5) {
      const next = windowFor(sl, cw);
      winRef.current = next;
      setWin(next);
    }
  }, [windowFor]);

  // ---- scroll loop ---------------------------------------------------------
  useEffect(() => {
    const sc = scrollRef.current;
    if (!sc) return;
    let frame = 0;
    let idle: ReturnType<typeof setTimeout> | undefined;
    const tick = () => {
      frame = 0;
      updateRuler();
      maybeMoveWindow();
      computeFloat();
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(tick);
      clearTimeout(idle);
      idle = setTimeout(runSpacing, 140);
    };
    sc.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    maybeMoveWindow();
    return () => {
      sc.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(frame);
      clearTimeout(idle);
    };
  }, [updateRuler, maybeMoveWindow, computeFloat, runSpacing]);

  // ---- zoom ----------------------------------------------------------------
  const applyGesture = useCallback(() => {
    const c = contentRef.current;
    const g = gesture.current;
    if (c) {
      if (g) {
        c.classList.add('gesturing');
        c.style.transformOrigin = `${g.originX}px 0`;
        c.style.transform = `scaleX(${g.scale})`;
      } else {
        c.classList.remove('gesturing');
        c.style.transform = '';
      }
    }
    updateRuler();
  }, [updateRuler]);

  /** Commits a new zoom, keeping `anchor` (px from the viewport's left edge) in place. */
  const commitZoom = useCallback(
    (newZoom: number, anchor: number, fromZoom: number, fromScroll: number) => {
      const sc = scrollRef.current;
      const z = clampZoom(newZoom);
      if (!sc || Math.abs(z - useStore.getState().zoom) < 1e-9) {
        applyGesture();
        return;
      }
      const sl = zoomScrollLeft(fromScroll, anchor, fromZoom, z);
      pendingScroll.current = sl;
      const next = windowFor(sl, sc.clientWidth);
      winRef.current = next;
      setWin(next);
      setZoom(z);
    },
    [applyGesture, setZoom, windowFor],
  );

  // After the new zoom is laid out: drop the temporary transform and restore the anchor point.
  useLayoutEffect(() => {
    const sc = scrollRef.current;
    if (sc && pendingScroll.current != null) {
      sc.scrollLeft = pendingScroll.current;
      pendingScroll.current = null;
    }
    applyGesture();
  }, [zoom, applyGesture]);

  const beginGesture = useCallback((anchor: number) => {
    const sc = scrollRef.current;
    if (!sc || gesture.current) return;
    gesture.current = { startZoom: useStore.getState().zoom, scale: 1, anchor, originX: sc.scrollLeft + anchor, startScroll: sc.scrollLeft };
  }, []);

  const scaleGesture = useCallback(
    (scale: number) => {
      const g = gesture.current;
      if (!g) return;
      g.scale = clampZoom(g.startZoom * scale) / g.startZoom;
      applyGesture();
    },
    [applyGesture],
  );

  const endGesture = useCallback(() => {
    const g = gesture.current;
    if (!g) return;
    gesture.current = null;
    commitZoom(g.startZoom * g.scale, g.anchor, g.startZoom, g.startScroll);
  }, [commitZoom]);

  // Zoom buttons keep the centre of the view in place.
  useEffect(() => {
    registerZoomHandler((z) => {
      const sc = scrollRef.current;
      if (!sc) return;
      commitZoom(z, sc.clientWidth / 2, useStore.getState().zoom, sc.scrollLeft);
    });
    return () => registerZoomHandler(null);
  }, [commitZoom]);

  // Wheel: zoom at the cursor; Shift+wheel or sideways wheel pans. Pinch: zoom between the fingers.
  useEffect(() => {
    const sc = scrollRef.current;
    if (!sc) return;
    let commitTimer: ReturnType<typeof setTimeout> | undefined;
    const onWheel = (e: WheelEvent) => {
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? sc.clientHeight : 1;
      const dx = e.deltaX * unit;
      const dy = e.deltaY * unit;
      e.preventDefault();
      if (Math.abs(dx) > Math.abs(dy)) {
        sc.scrollLeft += dx;
      } else if (e.shiftKey) {
        sc.scrollLeft += dy;
      } else {
        beginGesture(e.clientX - sc.getBoundingClientRect().left);
        const g = gesture.current;
        if (g) scaleGesture(g.scale * Math.exp(-dy * 0.0025));
        clearTimeout(commitTimer);
        commitTimer = setTimeout(endGesture, 160);
      }
    };
    let pinch: { d0: number } | null = null;
    const dist = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const mid = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        pinch = { d0: dist(e.touches) || 1 };
        beginGesture(mid - sc.getBoundingClientRect().left);
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (pinch && e.touches.length === 2) {
        e.preventDefault();
        scaleGesture(dist(e.touches) / pinch.d0);
      }
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (pinch && e.touches.length < 2) {
        pinch = null;
        endGesture();
      }
    };
    sc.addEventListener('wheel', onWheel, { passive: false });
    sc.addEventListener('touchstart', onTouchStart, { passive: true });
    sc.addEventListener('touchmove', onTouchMove, { passive: false });
    sc.addEventListener('touchend', onTouchEnd, { passive: true });
    sc.addEventListener('touchcancel', onTouchEnd, { passive: true });
    return () => {
      clearTimeout(commitTimer);
      sc.removeEventListener('wheel', onWheel);
      sc.removeEventListener('touchstart', onTouchStart);
      sc.removeEventListener('touchmove', onTouchMove);
      sc.removeEventListener('touchend', onTouchEnd);
      sc.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [beginGesture, scaleGesture, endGesture]);

  // Mouse: drag empty space to pan (the original showed a grab cursor).
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button')) return;
    const sc = scrollRef.current;
    if (!sc) return;
    const start = { x: e.clientX, y: e.clientY, l: sc.scrollLeft, t: sc.scrollTop };
    sc.style.cursor = 'grabbing';
    const move = (ev: PointerEvent) => {
      sc.scrollLeft = start.l - (ev.clientX - start.x);
      sc.scrollTop = start.t - (ev.clientY - start.y);
    };
    const up = () => {
      sc.style.cursor = '';
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  // ---- dragging items ------------------------------------------------------
  const onOpen = useCallback((id: number) => openModal({ kind: 'detail', id }), [openModal]);
  const onDragStart = useCallback((id: number) => setDragging(id), []);
  const onDragEnd = useCallback(
    (id: number, offsetY: number) => {
      const l = live.current.layout.find((v) => v.id === id);
      setDragging(null);
      if (!l) return;
      const top = Math.round(Math.max(DRAG_MIN, Math.min(canvasH - DRAG_BOTTOM, l.baseTop + offsetY)));
      if (top === l.baseTop) mvFor(id).set(0);
      else setPosition(id, top);
    },
    [canvasH, mvFor, setPosition],
  );
  // Once the new position is rendered, clear the drag offset in the same frame.
  useLayoutEffect(() => {
    for (const [id, v] of mvs) if (id !== dragging && v.get() !== 0) v.set(0);
  }, [positions, dragging, mvs]);

  // ---- scroll to a search result -------------------------------------------
  useEffect(() => {
    if (!focus) return;
    const sc = scrollRef.current;
    if (!sc) return;
    const target = (() => {
      const l = byId.get(focus.id);
      if (l) return { left: l.left, top: displayTop(l) };
      const link = linked.find((k) => k.event.id === focus.id);
      const pl = link && byId.get(link.people[0].id);
      if (link && pl) return { left: x(dp(link.event.start, link.event.startMonth, link.event.startDay)), top: displayTop(pl) + PERSON_LINE_OFFSET };
      return null;
    })();
    if (!target) return;
    sc.scrollTo({
      left: Math.max(0, target.left - sc.clientWidth / 2),
      top: Math.max(0, target.top - sc.clientHeight / 2),
      behavior: lowEnd ? 'auto' : 'smooth',
    });
    // Only when a new search result is chosen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus]);

  // ---- what to draw --------------------------------------------------------
  const allTicks = useMemo(() => allTicksFor(w), [w]);
  const visTicks = useMemo(() => ticksInRange(allTicks, x, win.from, win.to), [allTicks, x, win]);
  const inWin = layout.filter((l) => l.maxX >= win.from && l.minX <= win.to);
  const lineY = (pid: number) => {
    const pl = byId.get(pid);
    return pl ? displayTop(pl) + PERSON_LINE_OFFSET : null;
  };

  return (
    <div className="absolute inset-0">
      <div ref={scrollRef} className="tl-scroll" onPointerDown={onPointerDown}>
        <div className="tl-canvas" style={{ width: w, height: canvasH + (coarse ? RULER_H : 0) }}>
          <FloatingLabels labels={floatLabels} onOpen={onOpen} />
          <div ref={contentRef} className="tl-content" style={{ width: w, height: canvasH }}>
            <YearAxis ticks={visTicks} x={x} axisY={axisY} />
            {inWin.map((l) => (
              <LifeLine key={`l${l.id}`} layout={l} top={displayTop(l)} mv={mvFor(l.id)} />
            ))}
            {inWin.map((l) => (
              <TimelineItem
                key={l.id}
                layout={l}
                top={displayTop(l)}
                mv={mvFor(l.id)}
                replaced={replaced.has(l.id)}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onOpen={onOpen}
              />
            ))}
            {linked.map(({ event, people }) => {
              const ex = x(dp(event.start, event.startMonth, event.startDay));
              if (ex < win.from || ex > win.to) return null;
              const withY = people
                .map((p) => ({ person: p, lineY: lineY(p.id), mv: mvFor(p.id) }))
                .filter((p): p is SharedPerson => p.lineY != null);
              if (!withY.length) return null;
              if (withY.length === 1) {
                return (
                  <LinkedEventMarker
                    key={`e${event.id}`}
                    event={event}
                    person={withY[0].person}
                    x={ex}
                    lineY={withY[0].lineY}
                    mv={withY[0].mv}
                    closeZoom={closeZoom}
                    lowEnd={lowEnd}
                    onOpen={onOpen}
                  />
                );
              }
              return (
                <SharedEventConnector
                  key={`e${event.id}`}
                  event={event}
                  people={withY}
                  x={ex}
                  closeZoom={closeZoom}
                  lowEnd={lowEnd}
                  onOpen={onOpen}
                />
              );
            })}
          </div>
        </div>
      </div>
      <div ref={rulerRef} className="tl-ruler" aria-hidden>
        <div ref={rulerInnerRef} className="tl-ruler-inner" style={{ width: w }}>
          <RulerTicks ticks={visTicks} x={x} />
        </div>
      </div>
      {visible.length === 0 && <EmptyState hasEntries={entries.length > 0} lowEnd={lowEnd} />}
    </div>
  );
}
