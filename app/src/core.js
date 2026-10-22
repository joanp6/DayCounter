// Pure logic: no DOM, no storage. The clock (`now`) is always injected.
// Records shape: { "YYYY-MM-DD": "<ISO timestamp>" } — one intake per local day.

const pad = (n) => String(n).padStart(2, '0');

export function dayKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function formatTime(date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function getToday(records, now) {
  const iso = records[dayKey(now)];
  return iso ? new Date(iso) : null;
}

// Registers `now` only if today has no intake yet. Never overwrites.
export function register(records, now) {
  const key = dayKey(now);
  if (records[key]) return { records, registered: false };
  return { records: { ...records, [key]: now.toISOString() }, registered: true };
}

// Sets the intake time ("HH:MM") for the given day key.
export function editTime(records, key, time) {
  const [y, m, d] = key.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return { ...records, [key]: new Date(y, m - 1, d, hh, mm).toISOString() };
}
