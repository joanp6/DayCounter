import { DEFAULT_DAY_START_MINUTES, medicationDayKey } from './core.js';

const STATE_KEY = 'daycounter.state.v2';
const LEGACY_RECORDS_KEY = 'daycounter.records';

const defaultMedication = () => ({
  id: 'creatina',
  name: 'Creatina',
  instructions: 'Toma diaria',
  scheduleDays: [0, 1, 2, 3, 4, 5, 6],
  reminderEnabled: false,
  reminderTime: '20:00',
  color: '#2864dc',
});

export function createDefaultState() {
  return {
    version: 2,
    settings: { dayStartMinutes: DEFAULT_DAY_START_MINUTES },
    medications: [defaultMedication()],
    records: [],
    remindersSent: {},
  };
}

function normaliseState(value) {
  const fallback = createDefaultState();
  if (!value || typeof value !== 'object') return fallback;
  return {
    ...fallback,
    ...value,
    settings: { ...fallback.settings, ...(value.settings ?? {}) },
    medications: Array.isArray(value.medications) ? value.medications : fallback.medications,
    records: Array.isArray(value.records) ? value.records : [],
    remindersSent: value.remindersSent && typeof value.remindersSent === 'object'
      ? value.remindersSent
      : {},
  };
}

function migrateLegacy(storage) {
  const state = createDefaultState();
  const legacy = JSON.parse(storage.getItem(LEGACY_RECORDS_KEY) ?? '{}');
  const seenDays = new Set();

  for (const [oldKey, iso] of Object.entries(legacy)) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) continue;
    const medicationDay = medicationDayKey(date, state.settings.dayStartMinutes);
    if (seenDays.has(medicationDay)) continue;
    seenDays.add(medicationDay);
    state.records.push({
      id: `creatina-${medicationDay}`,
      medicationId: 'creatina',
      medicationDay,
      takenAt: iso,
      migratedFrom: oldKey,
    });
  }
  return state;
}

export function loadState(storage = globalThis.localStorage) {
  try {
    const saved = storage.getItem(STATE_KEY);
    if (saved) return normaliseState(JSON.parse(saved));
    const state = migrateLegacy(storage);
    saveState(state, storage);
    return state;
  } catch {
    return createDefaultState();
  }
}

export function saveState(state, storage = globalThis.localStorage) {
  try {
    storage.setItem(STATE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

// Legacy adapter kept so previous imports keep working.
export function load(storage = globalThis.localStorage) {
  try {
    return JSON.parse(storage.getItem(LEGACY_RECORDS_KEY)) ?? {};
  } catch {
    return {};
  }
}

export function save(records, storage = globalThis.localStorage) {
  try {
    storage.setItem(LEGACY_RECORDS_KEY, JSON.stringify(records));
    return true;
  } catch {
    return false;
  }
}
