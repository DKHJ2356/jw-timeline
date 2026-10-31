import type { Entry } from './types';

export const NOW_YEAR = new Date().getFullYear();

/** Hebrew months: [name, matching English months, position within the year (1-12.5)]. */
export const HEBREW_MONTHS: Record<string, [string, string, number]> = {
  nisan: ['NISAN (ABIB)', 'MARCH–APRIL', 3.5],
  iyyar: ['IYYAR (ZIV)', 'APRIL–MAY', 4.5],
  sivan: ['SIVAN', 'MAY–JUNE', 5.5],
  tammuz: ['TAMMUZ', 'JUNE–JULY', 6.5],
  ab: ['AB', 'JULY–AUGUST', 7.5],
  elul: ['ELUL', 'AUGUST–SEPTEMBER', 8.5],
  tishri: ['TISHRI (ETHANIM)', 'SEPTEMBER–OCTOBER', 9.5],
  heshvan: ['HESHVAN (BUL)', 'OCTOBER–NOVEMBER', 10.5],
  chislev: ['CHISLEV', 'NOVEMBER–DECEMBER', 11.5],
  tebeth: ['TEBETH', 'DECEMBER–JANUARY', 12],
  shebat: ['SHEBAT', 'JANUARY–FEBRUARY', 1.5],
  adar: ['ADAR', 'FEBRUARY–MARCH', 2.5],
  veadar: ['VEADAR', 'MARCH (INTERCALARY)', 3],
};

export const ENGLISH_MONTHS: Record<string, [string, number]> = {
  eng_january: ['JANUARY', 1],
  eng_february: ['FEBRUARY', 2],
  eng_march: ['MARCH', 3],
  eng_april: ['APRIL', 4],
  eng_may: ['MAY', 5],
  eng_june: ['JUNE', 6],
  eng_july: ['JULY', 7],
  eng_august: ['AUGUST', 8],
  eng_september: ['SEPTEMBER', 9],
  eng_october: ['OCTOBER', 10],
  eng_november: ['NOVEMBER', 11],
  eng_december: ['DECEMBER', 12],
};

/** "4026 BCE" / "33 CE". */
export function fmt(y: number): string {
  return y < 0 ? `${Math.abs(Math.trunc(y))} BCE` : `${Math.trunc(y)} CE`;
}

export function monthPosition(m?: string | null): number | null {
  if (!m) return null;
  if (HEBREW_MONTHS[m]) return HEBREW_MONTHS[m][2];
  if (ENGLISH_MONTHS[m]) return ENGLISH_MONTHS[m][1];
  return null;
}

/** Decimal position of a date: year plus the fraction of the year given by month and day. */
export function dp(y: number, m?: string | null, d?: number | string | null): number {
  const mp = monthPosition(m);
  if (!mp) return y;
  return y + (mp - 1 + ((Number(d) || 15) - 1) / 31) / 12;
}

/** Display a date, e.g. "≈ NISAN (ABIB) 14 / MARCH–APRIL · 33 CE". */
export function fd(y: number, m?: string | null, d?: number | string | null, approx?: boolean): string {
  let md = '';
  if (m && HEBREW_MONTHS[m]) md = `${HEBREW_MONTHS[m][0]}${d ? ' ' + d : ''} / ${HEBREW_MONTHS[m][1]} · `;
  else if (m && ENGLISH_MONTHS[m]) md = `${ENGLISH_MONTHS[m][0]}${d ? ' ' + d : ''} · `;
  return (approx ? '≈ ' : '') + md + fmt(y);
}

export function endOf(e: Pick<Entry, 'ongoing' | 'end'>, nowYear = NOW_YEAR): number {
  return e.ongoing ? nowYear : e.end;
}

/** "start–end" text used on person cards. */
export function lifespanText(e: Entry, nowYear = NOW_YEAR, sep = '–'): string {
  const a = fd(e.start, e.startMonth, e.startDay, e.startApprox);
  const b = e.ongoing ? `Present (${nowYear} CE)` : fd(e.end, e.endMonth, e.endDay, e.endApprox);
  return `${a}${sep}${b}`;
}

/** Decimal start and end positions used for layout. */
export function entrySpan(e: Entry, nowYear = NOW_YEAR): [number, number] {
  return [
    dp(e.start, e.startMonth, e.startDay),
    dp(endOf(e, nowYear), e.ongoing ? null : e.endMonth, e.ongoing ? null : e.endDay),
  ];
}
