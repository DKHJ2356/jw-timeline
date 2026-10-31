export const ENTRY_TYPES = ['Person', 'Work', 'Event', 'Period', 'Covenant'] as const;
export type EntryType = (typeof ENTRY_TYPES)[number];
export type TypeFilter = 'All' | EntryType;

/** Text that can belong to a single photo (or to the entry when it has no photos). */
export interface SourceInfo {
  sourceTitle: string;
  sourceUrl: string;
  reference: string;
}

/** A photo stored as blobs in IndexedDB (`<id>:full` and `<id>:thumb`). */
export interface Photo extends SourceInfo {
  id: string;
  /** Width and height of the full-size version. */
  w: number;
  h: number;
  /** Tiny blurred placeholder, stored inline as a data URL. */
  blur: string;
}

export interface Entry {
  id: number;
  title: string;
  subtitle?: string;
  type: EntryType;
  start: number;
  end: number;
  ongoing?: boolean;
  startMonth?: string | null;
  startDay?: number | null;
  endMonth?: string | null;
  endDay?: number | null;
  startApprox?: boolean;
  endApprox?: boolean;
  importance?: number;
  colour?: string;
  note?: string;
  reference?: string;
  sourceTitle?: string;
  sourceUrl?: string;
  parentPersonIds?: number[];
  /** Older single-person link, kept for backward compatibility. */
  parentPersonId?: number | null;
  photos?: Photo[];
  coverIndex?: number;
}

export interface TrashedEntry extends Entry {
  savedPosition?: number;
  deletedAt: string;
}

export type Positions = Record<string, number>;

/** The part of the state that is saved to IndexedDB. */
export interface TimelineState {
  entries: Entry[];
  positions: Positions;
  trash: TrashedEntry[];
  hiddenIds: string[];
}

export interface Snapshot {
  at: string;
  entries: Entry[];
  positions: Positions;
  hiddenIds: string[];
}

/** Entry shape used by the original single-file app (and .btlbackup version 1). */
export interface LegacyEntry extends Omit<Entry, 'photos'> {
  media?: string;
  mediaItems?: string[];
  mediaMeta?: Partial<SourceInfo>[];
  photos?: Photo[];
  savedPosition?: number;
  deletedAt?: string;
}

export interface BackupSettings {
  theme?: 'light' | 'dark';
  zoom?: number;
  canvasHeight?: number;
  filter?: string;
  hiddenEntryIds?: (string | number)[];
}

export interface BackupFile {
  format: 'BibleTimelineCompleteBackup';
  version: number;
  createdAt: string;
  app?: Record<string, unknown>;
  timeline: { entries: LegacyEntry[]; positions?: Positions; trash?: LegacyEntry[] };
  settings?: BackupSettings;
  /** Version 2 only: photo id -> data URLs. */
  images?: Record<string, { full: string; thumb: string }>;
  statistics?: { entries?: number; trash?: number; images?: number };
}
