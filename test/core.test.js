import test from 'node:test';
import assert from 'node:assert/strict';
import {
  medicationDayKey,
  registerIntake,
  editIntakeTime,
  findIntake,
  reminderDate,
  isScheduledForDay,
} from '../app/src/core.js';

test('the medication day runs from 03:00 to 03:00', () => {
  assert.equal(medicationDayKey(new Date(2026, 10, 11, 2, 59), 180), '2026-11-10');
  assert.equal(medicationDayKey(new Date(2026, 10, 11, 3, 0), 180), '2026-11-11');
});

test('an NFC intake does not duplicate the same medication day', () => {
  const first = registerIntake([], 'creatina', new Date(2026, 10, 12, 2, 0), 180);
  const second = registerIntake(first.records, 'creatina', new Date(2026, 10, 12, 20, 0), 180);
  assert.equal(first.record.medicationDay, '2026-11-11');
  assert.equal(second.registered, true);
  assert.equal(second.record.medicationDay, '2026-11-12');

  const duplicate = registerIntake(second.records, 'creatina', new Date(2026, 10, 12, 21, 0), 180);
  assert.equal(duplicate.registered, false);
  assert.equal(duplicate.records.length, 2);
});

test('different medications can be recorded on the same day', () => {
  const now = new Date(2026, 10, 11, 10, 0);
  const first = registerIntake([], 'a', now, 180);
  const second = registerIntake(first.records, 'b', now, 180);
  assert.equal(second.records.length, 2);
});

test('editing to 02:30 keeps the intake in the selected medication day', () => {
  const initial = registerIntake([], 'a', new Date(2026, 10, 11, 12, 0), 180);
  const edited = editIntakeTime(initial.records, 'a', '2026-11-11', '02:30', 180);
  const record = findIntake(edited, 'a', '2026-11-11');
  const date = new Date(record.takenAt);
  assert.equal(date.getDate(), 12);
  assert.equal(date.getHours(), 2);
  assert.equal(date.getMinutes(), 30);
});

test('a 02:00 reminder for a medication day occurs the following calendar date', () => {
  const date = reminderDate('2026-11-11', '02:00', 180);
  assert.equal(date.getDate(), 12);
  assert.equal(date.getHours(), 2);
});

test('weekly schedules use the medication-day weekday', () => {
  const mondayOnly = { scheduleDays: [1] };
  assert.equal(isScheduledForDay(mondayOnly, '2026-11-09'), true);
  assert.equal(isScheduledForDay(mondayOnly, '2026-11-10'), false);
});
