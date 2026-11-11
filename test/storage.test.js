import test from 'node:test';
import assert from 'node:assert/strict';
import { loadState, saveState } from '../app/src/storage.js';

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

test('legacy history is migrated and a 02:00 intake moves to the previous medication day', () => {
  const storage = memoryStorage({
    'daycounter.records': JSON.stringify({
      '2026-11-11': new Date(2026, 10, 11, 2, 0).toISOString(),
    }),
  });
  const state = loadState(storage);
  assert.equal(state.medications[0].id, 'creatina');
  assert.equal(state.records[0].medicationDay, '2026-11-10');
});

test('a state with no medications remains empty after saving and loading', () => {
  const storage = memoryStorage();
  const state = loadState(storage);
  state.medications = [];
  assert.equal(saveState(state, storage), true);
  assert.deepEqual(loadState(storage).medications, []);
});
