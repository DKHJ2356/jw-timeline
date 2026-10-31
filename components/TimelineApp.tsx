'use client';

import { LazyMotion } from 'framer-motion';
import { useEffect } from 'react';
import { convertLegacyState } from '@/lib/backup';
import { cleanUpPhotos } from '@/lib/cleanup';
import { detectLowEnd } from '@/lib/device';
import { clampHeight, clampZoom } from '@/lib/layout';
import {
  StorageFullError,
  loadSnapshots,
  loadState,
  markLegacyMigrated,
  readLegacyLocalStorage,
  saveSnapshots,
  saveState,
} from '@/lib/persistence';
import { sampleEntries } from '@/lib/sample';
import { applyThemeClass, useStore, type Theme } from '@/lib/store';
import type { TimelineState } from '@/lib/types';
import Toolbar from './header/Toolbar';
import ModalHost from './modals/ModalHost';
import TimelineViewport from './timeline/TimelineViewport';
import Toasts from './Toasts';

const loadFeatures = () => import('@/lib/motion-features').then((m) => m.default);

function readView() {
  const get = (k: string) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  };
  const theme: Theme = get('timeline-theme') === 'dark' ? 'dark' : 'light';
  return {
    theme,
    zoom: clampZoom(Number(get('timeline-zoom')) || 1),
    canvasH: clampHeight(Number(get('timeline-canvas-height')) || 1200),
  };
}

function reportSaveError(e: unknown) {
  const text = e instanceof StorageFullError ? e.message : 'Your last change could not be saved on this device.';
  useStore.getState().toast(text, 'error');
}

async function boot() {
  const lowEnd = detectLowEnd();
  const view = readView();
  applyThemeClass(view.theme);
  document.documentElement.classList.toggle('low-end', lowEnd);
  let state: TimelineState | undefined;
  let snapshots = [] as Awaited<ReturnType<typeof loadSnapshots>>;
  let message: { text: string; kind: 'info' | 'error' } | null = null;
  try {
    state = await loadState();
    snapshots = await loadSnapshots();
    if (!state) {
      const legacy = readLegacyLocalStorage();
      if (legacy) {
        state = await convertLegacyState(legacy);
        markLegacyMigrated();
        message = { text: 'Your timeline from the earlier version of the app was moved into this one.', kind: 'info' };
      } else {
        state = { entries: sampleEntries(), positions: {}, trash: [], hiddenIds: [] };
      }
      await saveState(state);
    }
  } catch (e) {
    console.error(e);
    state ??= { entries: sampleEntries(), positions: {}, trash: [], hiddenIds: [] };
    message = {
      text: 'This browser is not letting the app store data (private browsing?). Changes will not be kept.',
      kind: 'error',
    };
  }
  useStore.getState().init(state, snapshots, { ...view, lowEnd });
  if (message) useStore.getState().toast(message.text, message.kind);
  const idle = window.requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 1500));
  idle(() => cleanUpPhotos());
}

export default function TimelineApp() {
  const ready = useStore((s) => s.ready);
  const lowEnd = useStore((s) => s.lowEnd);

  useEffect(() => {
    boot();
  }, []);

  // Save changes to IndexedDB (debounced), and flush when the page is hidden.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const flush = () => {
      if (timer) clearTimeout(timer);
      timer = null;
      const s = useStore.getState();
      if (!s.ready) return;
      saveState({ entries: s.entries, positions: s.positions, trash: s.trash, hiddenIds: s.hiddenIds }).catch(
        reportSaveError,
      );
    };
    const unsub = useStore.subscribe((s, p) => {
      if (!s.ready || !p.ready) return;
      if (s.entries !== p.entries || s.positions !== p.positions || s.trash !== p.trash || s.hiddenIds !== p.hiddenIds) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(flush, 250);
      }
      if (s.snapshots !== p.snapshots) saveSnapshots(s.snapshots).catch(reportSaveError);
    });
    const onHide = () => {
      if (timer) flush();
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onHide);
    return () => {
      unsub();
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onHide);
    };
  }, []);

  // Offline support for the home-screen app.
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    }
  }, []);

  // Stop Safari's own page pinch-zoom; the timeline handles pinch itself.
  useEffect(() => {
    const stop = (e: Event) => e.preventDefault();
    document.addEventListener('gesturestart', stop, { passive: false });
    document.addEventListener('gesturechange', stop, { passive: false });
    return () => {
      document.removeEventListener('gesturestart', stop);
      document.removeEventListener('gesturechange', stop);
    };
  }, []);

  return (
    <LazyMotion features={loadFeatures} strict>
      <div className={`flex h-dvh flex-col ${lowEnd ? 'low-end' : ''}`}>
        <Toolbar />
        <main className="relative min-h-0 flex-1">
          {ready ? (
            <TimelineViewport />
          ) : (
            <div className="grid h-full place-items-center font-bold text-muted" role="status">
              Loading your timeline…
            </div>
          )}
        </main>
        <ModalHost />
        <Toasts />
      </div>
    </LazyMotion>
  );
}
