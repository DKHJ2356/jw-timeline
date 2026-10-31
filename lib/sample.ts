import type { Entry } from './types';

/** The original app's demo entries, also used by "Load sample timeline". */
export const DEMO_ENTRIES: Entry[] = [
  { id: 1, title: 'Adam', type: 'Person', start: -4026, end: -3096, colour: '#FF7A00', reference: 'Genesis 5', note: 'Lifespan entry.' },
  { id: 2, title: 'Noah', type: 'Person', start: -2970, end: -2020, colour: '#0066FF', reference: 'Genesis 5' },
  { id: 3, title: 'The Flood', type: 'Event', start: -2370, end: -2369, colour: '#A100FF', reference: 'Genesis 7-8' },
];

export function sampleEntries(): Entry[] {
  return structuredClone(DEMO_ENTRIES);
}

/** The 15 preset colours. */
export const PALETTE = [
  '#FF7A00', '#FFD400', '#E31A1C', '#FF3B9D', '#A100FF', '#3F37C9', '#0066FF', '#00B8D9',
  '#00A896', '#00B93C', '#8BD600', '#7A3E00', '#6B7280', '#111827', '#FF4D5A',
];

/** The palette colour used least so far (the original's default for new entries). */
export function leastUsedColour(entries: Entry[]): string {
  return [...PALETTE].sort(
    (a, b) => entries.filter((e) => e.colour === a).length - entries.filter((e) => e.colour === b).length,
  )[0];
}

/** The 19 subtitle presets (v18). */
export const SUBTITLE_PRESETS: [string, string][] = [
  ['Bible Writer', '✍️'],
  ['Prophet', '📣'],
  ['Prophetess', '📣'],
  ['Priest', '🕊️'],
  ['High Priest', '🕊️⭐'],
  ['King', '👑'],
  ['Queen', '👑'],
  ['Judge', '⚖️'],
  ['Apostle', '👣'],
  ['Disciple', '📖'],
  ['Evangelizer', '📣'],
  ['Scribe', '🪶'],
  ['Governor', '🏛️'],
  ['Military Commander', '⚔️'],
  ['Patriarch', '🌳'],
  ['Shepherd', '🐑'],
  ['Faithful Worshipper', '🙏'],
  ['Opposer', '⛔'],
  ['False Prophet', '📣⚠️'],
];
