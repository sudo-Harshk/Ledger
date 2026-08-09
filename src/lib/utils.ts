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

// Converts a value from a native <input type="date"> (interpreted in the
// user's local timezone) to an IST YYYY-MM-DD string before persistence.
export function localDateToIST(localDateStr: string): string {
  return istDateStr(new Date(localDateStr + 'T00:00:00'));
}

const MONTH_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function parseParts(dateStr: string): { y: number; m: number; d: number } {
  const [y, m, d] = dateStr.split('-').map(Number);
  return { y, m, d };
}

function isLeap(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

export function daysInMonth(month: string): number {
  const [y, m] = month.split('-').map(Number);
  if (m === 2) return isLeap(y) ? 29 : 28;
  const days = [31, 0, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return days[m - 1];
}

/**
 * Pure calendar arithmetic on a YYYY-MM-DD string — no Date object, no timezone.
 * Clamps the day to the target month's last day (Jan 31 + 1mo → Feb 28).
 */
export function addMonths(dateStr: string, months: number): string {
  const { y, m, d } = parseParts(dateStr);
  const total   = y * 12 + (m - 1) + months;
  const targetY = Math.floor(total / 12);
  const targetM = (total % 12) + 1;
  const lastDay = daysInMonth(`${targetY}-${String(targetM).padStart(2, '0')}`);
  return `${targetY}-${String(targetM).padStart(2, '0')}-${String(Math.min(d, lastDay)).padStart(2, '0')}`;
}

function julianDay(y: number, m: number, d: number): number {
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
}

function julianToDate(jd: number): string {
  const a = jd + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((146097 * b) / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  const day = e - Math.floor((153 * m + 2) / 5) + 1;
  const month = m + 3 - 12 * Math.floor(m / 10);
  const year = 100 * b + d - 4800 + Math.floor(m / 10);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function addDays(dateStr: string, days: number): string {
  const { y, m, d } = parseParts(dateStr);
  return julianToDate(julianDay(y, m, d) + days);
}

// 0 = Sunday, 6 = Saturday
export function dayOfWeek(dateStr: string): number {
  let { y, m, d } = parseParts(dateStr);
  if (m < 3) { m += 12; y -= 1; }
  const K = y % 100;
  const J = Math.floor(y / 100);
  let h = (d + Math.floor(13 * (m + 1) / 5) + K + Math.floor(K / 4) + Math.floor(J / 4) - 2 * J) % 7;
  if (h < 0) h += 7;
  return (h + 6) % 7;
}

export function daysUntil(dateStr: string): number {
  const { y: ty, m: tm, d: td } = parseParts(today());
  const { y, m, d } = parseParts(dateStr);
  return julianDay(y, m, d) - julianDay(ty, tm, td);
}

export function getWeekDates(weekOffset = 0): string[] {
  const t = today();
  const dow = dayOfWeek(t);
  const monday = addDays(t, -((dow + 6) % 7) + weekOffset * 7);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export function weekRangeLabel(weekOffset: number): string {
  const dates = getWeekDates(weekOffset);
  if (weekOffset === 0) return 'This Week';
  if (weekOffset === -1) return 'Last Week';
  return `${formatShortDate(dates[0])} – ${formatShortDate(dates[6])}`;
}

export function formatDate(dateStr: string): string {
  const t = today();
  if (dateStr === t) return 'Today';
  if (dateStr === addDays(t, -1)) return 'Yesterday';
  const { y, m, d } = parseParts(dateStr);
  return `${d} ${MONTH_SHORT[m - 1]}, ${y}`;
}

export function formatShortDate(dateStr: string): string {
  const { m, d } = parseParts(dateStr);
  return `${d} ${MONTH_SHORT[m - 1]}`;
}

export function formatDateFull(dateStr: string): string {
  const { y, m, d } = parseParts(dateStr);
  return `${WEEKDAY_LONG[dayOfWeek(dateStr)]}, ${d} ${MONTH_LONG[m - 1]}${y === new Date().getFullYear() ? '' : ` ${y}`}`;
}

export function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return `${MONTH_LONG[m - 1]} ${y}`;
}

export function monthName(month: string): string {
  const m = parseParts(`${month}-01`).m;
  return MONTH_LONG[m - 1];
}

export function prevMonth(month: string): string {
  return addMonths(`${month}-01`, -1).slice(0, 7);
}

export function nextMonth(month: string): string {
  return addMonths(`${month}-01`, 1).slice(0, 7);
}

export function weekDayLabel(dateStr: string): string {
  return WEEKDAY_SHORT[dayOfWeek(dateStr)];
}
