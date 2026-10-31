'use client';

import { create } from 'zustand';
import { clampHeight, clampZoom } from './layout';
import { pushSnapshot } from './persistence';
import { leastUsedColour, sampleEntries } from './sample';
import type { BackupFile, Entry, Positions, Snapshot, TimelineState, TrashedEntry, TypeFilter } from './types';

export type Theme = 'light' | 'dark';

export type Modal =
  | { kind: 'detail'; id: number }
  | { kind: 'form'; id: number | null }
  | { kind: 'filter' }
  | { kind: 'trash' }
  | { kind: 'restore'; backup: BackupFile }
  | null;

export interface Toast {
  id: number;
  text: string;
  kind: 'info' | 'error';
}

interface Store {
  ready: boolean;
  entries: Entry[];
  positions: Positions;
  trash: TrashedEntry[];
  hiddenIds: string[];
  snapshots: Snapshot[];
  filter: TypeFilter;
  query: string;
  zoom: number;
  canvasH: number;
  theme: Theme;
  lowEnd: boolean;
  modal: Modal;
  toasts: Toast[];
  /** Set when the timeline should scroll to an entry (search result). */
  focus: { id: number; nonce: number } | null;

  init(s: TimelineState, snapshots: Snapshot[], view: { zoom: number; canvasH: number; theme: Theme; lowEnd: boolean }): void;
  saveEntry(e: Omit<Entry, 'id'>, editingId: number | null): number;
  moveToTrash(id: number): void;
  restoreFromTrash(id: number): void;
  deleteFromTrash(id: number): void;
  emptyTrash(): void;
  setPosition(id: number, top: number): void;
  setHidden(ids: string[]): void;
  setFilter(f: TypeFilter): void;
  setQuery(q: string): void;
  setZoom(z: number): void;
  setCanvasH(h: number): void;
  toggleTheme(): void;
  addEntries(list: Entry[]): void;
  loadSample(): void;
  resetPositions(): void;
  recover(): boolean;
  replaceAll(s: TimelineState, view: { zoom?: number; canvasH?: number; theme?: Theme }): void;
  openModal(m: Modal): void;
  closeModal(): void;
  toast(text: string, kind?: Toast['kind']): void;
  dismissToast(id: number): void;
  focusEntry(id: number): void;
  nextId(): number;
}

function saveView(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // View settings are a convenience; ignore storage errors.
  }
}

export function applyThemeClass(theme: Theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#101418' : '#f8fafc');
}

let toastSeq = 1;

export const useStore = create<Store>()((set, get) => {
  /** Records the current entries before a change, so "Recover" can step back (last 3 states). */
  const snap = () => {
    const s = get();
    return pushSnapshot(s.snapshots, {
      at: new Date().toISOString(),
      entries: s.entries,
      positions: s.positions,
      hiddenIds: s.hiddenIds,
    });
  };

  return {
    ready: false,
    entries: [],
    positions: {},
    trash: [],
    hiddenIds: [],
    snapshots: [],
    filter: 'All',
    query: '',
    zoom: 1,
    canvasH: 1200,
    theme: 'light',
    lowEnd: false,
    modal: null,
    toasts: [],
    focus: null,

    init(s, snapshots, view) {
      set({ ...s, snapshots, ...view, ready: true });
    },

    nextId() {
      const used = [...get().entries, ...get().trash].map((e) => e.id);
      return Math.max(Date.now(), ...used.map((n) => n + 1));
    },

    saveEntry(e, editingId) {
      const snapshots = snap();
      if (editingId != null) {
        set((s) => ({
          snapshots,
          entries: s.entries.map((x) => (x.id === editingId ? { ...x, ...e, id: editingId } : x)),
        }));
        return editingId;
      }
      const id = get().nextId();
      set((s) => ({ snapshots, entries: [...s.entries, { ...e, id }] }));
      return id;
    },

    moveToTrash(id) {
      const s = get();
      const e = s.entries.find((x) => x.id === id);
      if (!e) return;
      const snapshots = snap();
      const positions = { ...s.positions };
      const savedPosition = positions[id];
      delete positions[id];
      const trashed: TrashedEntry = { ...e, deletedAt: new Date().toISOString() };
      if (savedPosition != null) trashed.savedPosition = savedPosition;
      set({ snapshots, entries: s.entries.filter((x) => x.id !== id), positions, trash: [trashed, ...s.trash], modal: null });
    },

    restoreFromTrash(id) {
      const s = get();
      const t = s.trash.find((x) => x.id === id);
      if (!t) return;
      const snapshots = snap();
      const { savedPosition, deletedAt: _d, ...entry } = t;
      void _d;
      const positions = { ...s.positions };
      if (savedPosition != null) positions[id] = savedPosition;
      set({ snapshots, entries: [...s.entries, entry], positions, trash: s.trash.filter((x) => x.id !== id) });
    },

    deleteFromTrash(id) {
      set((s) => ({ trash: s.trash.filter((x) => x.id !== id) }));
    },

    emptyTrash() {
      set({ trash: [] });
    },

    setPosition(id, top) {
      set((s) => ({ positions: { ...s.positions, [id]: top } }));
    },

    setHidden(ids) {
      set({ snapshots: snap(), hiddenIds: ids });
    },

    setFilter(filter) {
      set({ filter });
    },

    setQuery(query) {
      set({ query });
    },

    setZoom(z) {
      const zoom = clampZoom(z);
      saveView('timeline-zoom', String(zoom));
      set({ zoom });
    },

    setCanvasH(h) {
      const canvasH = clampHeight(h);
      saveView('timeline-canvas-height', String(canvasH));
      set({ canvasH });
    },

    toggleTheme() {
      const theme: Theme = get().theme === 'dark' ? 'light' : 'dark';
      saveView('timeline-theme', theme);
      applyThemeClass(theme);
      set({ theme });
    },

    addEntries(list) {
      set((s) => ({ snapshots: snap(), entries: [...s.entries, ...list] }));
    },

    loadSample() {
      set({ snapshots: snap(), entries: sampleEntries(), positions: {}, hiddenIds: [] });
    },

    resetPositions() {
      set({ snapshots: snap(), positions: {} });
    },

    recover() {
      const [latest, ...rest] = get().snapshots;
      if (!latest) return false;
      set({ entries: latest.entries, positions: latest.positions, hiddenIds: latest.hiddenIds, snapshots: rest });
      return true;
    },

    replaceAll(state, view) {
      const theme = view.theme ?? get().theme;
      const zoom = clampZoom(Number(view.zoom) || 1);
      const canvasH = clampHeight(Number(view.canvasH) || 1200);
      saveView('timeline-theme', theme);
      saveView('timeline-zoom', String(zoom));
      saveView('timeline-canvas-height', String(canvasH));
      applyThemeClass(theme);
      set({ snapshots: snap(), ...state, theme, zoom, canvasH, query: '', modal: null });
    },

    openModal(modal) {
      set({ modal });
    },

    closeModal() {
      set({ modal: null });
    },

    toast(text, kind = 'info') {
      const id = toastSeq++;
      set((s) => ({ toasts: [...s.toasts.slice(-2), { id, text, kind }] }));
      setTimeout(() => get().dismissToast(id), kind === 'error' ? 9000 : 4000);
    },

    dismissToast(id) {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    },

    focusEntry(id) {
      set({ focus: { id, nonce: Date.now() } });
    },
  };
});

export function defaultColour(): string {
  return leastUsedColour(useStore.getState().entries);
}
