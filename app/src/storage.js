// localStorage adapter. Every access is guarded: storage can be blocked or full.

const KEY = 'daycounter.records';

export function load(storage = globalThis.localStorage) {
  try {
    return JSON.parse(storage.getItem(KEY)) ?? {};
  } catch {
    return {};
  }
}

export function save(records, storage = globalThis.localStorage) {
  try {
    storage.setItem(KEY, JSON.stringify(records));
    return true;
  } catch {
    return false;
  }
}
