import { describe, it, expect, vi, afterEach } from 'vitest';
import { addMonths, today, currentMonth } from './utils';

afterEach(() => vi.useRealTimers());

describe('addMonths', () => {
  it('advances a mid-month date by one month', () => {
    expect(addMonths('2026-06-10', 1)).toBe('2026-07-10');
  });

  it('clamps to the last day of the target month (Jan 31 → Feb 28)', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
  });

  it('clamps to Feb 29 in a leap year', () => {
    expect(addMonths('2028-01-31', 1)).toBe('2028-02-29');
  });

  it('clamps a 30th/31st into a 30-day month (Mar 31 → Apr 30)', () => {
    expect(addMonths('2026-03-31', 1)).toBe('2026-04-30');
  });

  it('leaves the 30th untouched when the target month has 31 days', () => {
    expect(addMonths('2026-04-30', 1)).toBe('2026-05-30');
  });

  it('rolls over into the next year (Dec → Jan)', () => {
    expect(addMonths('2026-12-15', 1)).toBe('2027-01-15');
  });

  it('does not drift when applied repeatedly after a clamp (Jan 31 → Feb 28 → Mar 28 → Apr 28)', () => {
    const feb = addMonths('2026-01-31', 1);
    const mar = addMonths(feb, 1);
    const apr = addMonths(mar, 1);
    expect([feb, mar, apr]).toEqual(['2026-02-28', '2026-03-28', '2026-04-28']);
  });

  it('is a no-op with months = 0', () => {
    expect(addMonths('2026-06-10', 0)).toBe('2026-06-10');
  });
});

describe('today (IST)', () => {
  it('returns the IST date at the start of an IST day, not the UTC date', () => {
    // 2026-08-08T19:00:00Z == 2026-08-09 00:00 IST — UTC would say Aug 8
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-08T19:00:00Z'));
    expect(today()).toBe('2026-08-09');
  });

  it('returns the previous IST date one second before IST midnight', () => {
    // IST midnight is at 18:30:00Z — 2026-08-08T18:29:59Z == 2026-08-08 23:59:59 IST
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-08T18:29:59Z'));
    expect(today()).toBe('2026-08-08');
  });

  it('still lands on Aug 9 for the whole UTC evening window', () => {
    // 2026-08-09T18:29:59Z == 2026-08-09 23:59:59 IST
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-09T18:29:59Z'));
    expect(today()).toBe('2026-08-09');
  });
});

describe('currentMonth (IST)', () => {
  it('rolls to the new month at IST midnight, before the UTC date does', () => {
    // 2026-07-31T18:30:00Z == 2026-08-01 00:00 IST — UTC would still say July
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-31T18:30:00Z'));
    expect(currentMonth()).toBe('2026-08');
  });
});
