import { describe, expect, it } from 'vitest';
import { dp, entrySpan, fd, fmt, lifespanText, monthPosition } from '@/lib/dates';
import type { Entry } from '@/lib/types';

describe('fmt', () => {
  it('formats BCE and CE years', () => {
    expect(fmt(-4026)).toBe('4026 BCE');
    expect(fmt(33)).toBe('33 CE');
    expect(fmt(0)).toBe('0 CE');
    expect(fmt(-2369.4)).toBe('2369 BCE');
  });
});

describe('dp', () => {
  it('returns the year when no month is given', () => {
    expect(dp(-2370)).toBe(-2370);
    expect(dp(-2370, '', 5)).toBe(-2370);
    expect(dp(-2370, 'unknown')).toBe(-2370);
  });
  it('uses English month positions (day 15 by default)', () => {
    expect(dp(2000, 'eng_january')).toBeCloseTo(2000 + (0 + 14 / 31) / 12);
    expect(dp(2000, 'eng_december', 31)).toBeCloseTo(2000 + (11 + 30 / 31) / 12);
  });
  it('uses Hebrew month positions', () => {
    expect(monthPosition('nisan')).toBe(3.5);
    expect(dp(33, 'nisan', 14)).toBeCloseTo(33 + (2.5 + 13 / 31) / 12);
    expect(dp(-607, 'ab', 1)).toBeCloseTo(-607 + 6.5 / 12);
  });
});

describe('fd', () => {
  it('shows plain years', () => expect(fd(-2370)).toBe('2370 BCE'));
  it('shows the approximate flag', () => expect(fd(-2370, null, null, true)).toBe('≈ 2370 BCE'));
  it('shows Hebrew months with their English months', () =>
    expect(fd(33, 'nisan', 14)).toBe('NISAN (ABIB) 14 / MARCH–APRIL · 33 CE'));
  it('shows English months', () => expect(fd(1914, 'eng_october', null, true)).toBe('≈ OCTOBER · 1914 CE'));
});

describe('ongoing entries', () => {
  const e: Entry = { id: 1, title: 'X', type: 'Period', start: 1914, end: 1914, ongoing: true, endMonth: 'eng_june' };
  it('end at the current year and ignore the end month', () => {
    expect(entrySpan(e, 2026)).toEqual([1914, 2026]);
    expect(lifespanText(e, 2026)).toBe('1914 CE–Present (2026 CE)');
  });
});
