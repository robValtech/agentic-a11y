import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getFormattedRuntime } from './get-formatted-runtime.mjs';

// ── getFormattedRuntime ───────────────────────────────────────────────────────

test('getFormattedRuntime: returns "00:00" for identical timestamps', () => {
  assert.equal(getFormattedRuntime(1000, 1000), '00:00');
});

test('getFormattedRuntime: formats seconds only', () => {
  assert.equal(getFormattedRuntime(0, 5000), '00:05');
});

test('getFormattedRuntime: formats minutes and seconds', () => {
  assert.equal(getFormattedRuntime(0, 90000), '01:30');
});

test('getFormattedRuntime: pads minutes and seconds to two digits', () => {
  assert.equal(getFormattedRuntime(0, 60000), '01:00');
});

test('getFormattedRuntime: handles durations over one hour', () => {
  assert.equal(getFormattedRuntime(0, 3660000), '61:00');
});

test('getFormattedRuntime: uses absolute difference when end is before start', () => {
  assert.equal(getFormattedRuntime(90000, 0), '01:30');
});

test('getFormattedRuntime: floors partial seconds', () => {
  assert.equal(getFormattedRuntime(0, 1999), '00:01');
});

test('getFormattedRuntime: returns "00:00" for a zero millisecond duration', () => {
  assert.equal(getFormattedRuntime(0, 0), '00:00');
});
