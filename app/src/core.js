// Pure date and intake logic. Dates are local unless they are stored as ISO strings.

const pad = (number) => String(number).padStart(2, '0');

export const DEFAULT_DAY_START_MINUTES = 3 * 60;

export function dayKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseDayKey(key) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(date, amount) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}

export function medicationDayKey(date, dayStartMinutes = DEFAULT_DAY_START_MINUTES) {
  const minutesNow = date.getHours() * 60 + date.getMinutes();
  return dayKey(minutesNow < dayStartMinutes ? addDays(date, -1) : date);
}

export function formatTime(date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function minutesToTime(minutes) {
  return `${pad(Math.floor(minutes / 60) % 24)}:${pad(minutes % 60)}`;
}

export function timeToMinutes(time) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function dateForMedicationDayTime(key, time, dayStartMinutes = DEFAULT_DAY_START_MINUTES) {
  const date = parseDayKey(key);
  const [hours, minutes] = time.split(':').map(Number);
  if (hours * 60 + minutes < dayStartMinutes) date.setDate(date.getDate() + 1);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

export function isScheduledForDay(medication, key) {
  const days = medication.scheduleDays?.length ? medication.scheduleDays : [0, 1, 2, 3, 4, 5, 6];
  return days.includes(parseDayKey(key).getDay());
}

export function findIntake(records, medicationId, key) {
  return records.find((record) => (
    record.medicationId === medicationId && record.medicationDay === key
  )) ?? null;
}

export function registerIntake(records, medicationId, now, dayStartMinutes = DEFAULT_DAY_START_MINUTES) {
  const key = medicationDayKey(now, dayStartMinutes);
  const existing = findIntake(records, medicationId, key);
  if (existing) return { records, record: existing, registered: false };

  const record = {
    id: `${medicationId}-${key}`,
    medicationId,
    medicationDay: key,
    takenAt: now.toISOString(),
  };
  return { records: [...records, record], record, registered: true };
}

export function editIntakeTime(records, medicationId, key, time, dayStartMinutes = DEFAULT_DAY_START_MINUTES) {
  const takenAt = dateForMedicationDayTime(key, time, dayStartMinutes).toISOString();
  return records.map((record) => (
    record.medicationId === medicationId && record.medicationDay === key
      ? { ...record, takenAt }
      : record
  ));
}

export function removeIntake(records, medicationId, key) {
  return records.filter((record) => !(
    record.medicationId === medicationId && record.medicationDay === key
  ));
}

export function reminderDate(medicationDay, reminderTime, dayStartMinutes = DEFAULT_DAY_START_MINUTES) {
  return dateForMedicationDayTime(medicationDay, reminderTime, dayStartMinutes);
}

// Backwards-compatible helpers kept for older integrations and tests.
export function getToday(records, now) {
  const iso = records[dayKey(now)];
  return iso ? new Date(iso) : null;
}

export function register(records, now) {
  const key = dayKey(now);
  if (records[key]) return { records, registered: false };
  return { records: { ...records, [key]: now.toISOString() }, registered: true };
}

export function editTime(records, key, time) {
  const [year, month, day] = key.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  return { ...records, [key]: new Date(year, month - 1, day, hours, minutes).toISOString() };
}
