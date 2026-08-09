export function nanoid(): string {
  return crypto.randomUUID();
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
}

function localDateStr(d: Date): string {
  const y  = d.getFullYear();
  const m  = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

const IST_TZ = 'Asia/Kolkata';

// Formats a Date as YYYY-MM-DD in IST (Asia/Kolkata), bypassing the device
// timezone entirely — "now" is always IST, never UTC.
function istDateStr(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

export function today(): string {
  return istDateStr(new Date());
}

export function currentMonth(): string {
  return istDateStr(new Date()).slice(0, 7);
}

/**
 * Pure calendar arithmetic on a YYYY-MM-DD string — no Date object, no timezone.
 * Clamps the day to the target month's last day (Jan 31 + 1mo → Feb 28).
 */
export function addMonths(dateStr: string, months: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const total     = y * 12 + (m - 1) + months;
  const targetY   = Math.floor(total / 12);
  const targetM   = (total % 12) + 1;
  const lastDay   = new Date(targetY, targetM, 0).getDate();
  return `${targetY}-${String(targetM).padStart(2, '0')}-${String(Math.min(d, lastDay)).padStart(2, '0')}`;
}

export function getWeekDates(weekOffset = 0): string[] {
  const now = new Date();
  const day = now.getDay(); // 0 = Sun
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7) + weekOffset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return localDateStr(d);
  });
}

export function weekRangeLabel(weekOffset: number): string {
  const dates = getWeekDates(weekOffset);
  if (weekOffset === 0) return 'This Week';
  if (weekOffset === -1) return 'Last Week';
  const start = new Date(dates[0] + 'T00:00:00');
  const end   = new Date(dates[6] + 'T00:00:00');
  const fmt   = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  return `${fmt(start)} – ${fmt(end)}`;
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const t = today();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = localDateStr(yesterday);
  if (dateStr === t) return 'Today';
  if (dateStr === yStr) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function daysUntil(dateStr: string): number {
  const target = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / 86400000);
}

export function daysInMonth(month: string): number {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

export function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export function prevMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return localDateStr(d).slice(0, 7);
}

export function nextMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m, 1);
  return localDateStr(d).slice(0, 7);
}

export function weekDayLabel(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short' }).slice(0, 3);
}
