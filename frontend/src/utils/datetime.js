// Dates from the backend are plain strings: slotDate "yyyy-MM-dd", times "HH:mm".
// They are parsed by hand (not with new Date("2026-11-25")) so the browser time zone can never shift the day.

const pad = (n) => String(n).padStart(2, '0');

export function toISODate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const todayISO = () => toISODate(new Date());

export function parseISODate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDaysISO(iso, days) {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function diffDays(fromIso, toIso) {
  return Math.round((parseISODate(toIso) - parseISODate(fromIso)) / 86400000);
}

export function formatDate(iso) {
  return parseISODate(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatTime(hm) {
  const [h, m] = hm.split(':').map(Number);
  return `${h % 12 || 12}:${pad(m)} ${h >= 12 ? 'PM' : 'AM'}`;
}

export function formatRange(start, end) {
  return `${formatTime(start)} - ${formatTime(end)}`;
}

export function toMinutes(hm) {
  const [h, m] = hm.split(':').map(Number);
  return h * 60 + m;
}

/** Date object for a slot's start, in the browser's local time zone. */
export function startsAt(dateIso, hm) {
  const [y, mo, d] = dateIso.split('-').map(Number);
  const [h, mi] = hm.split(':').map(Number);
  return new Date(y, mo - 1, d, h, mi);
}

/** "createdAt" arrives as an ISO instant (UTC). */
export function formatInstant(iso) {
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}
