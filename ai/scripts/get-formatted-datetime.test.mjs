import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getFormattedDateTime } from './get-formatted-datetime.mjs';

const EPOCH = 0; // 1970-01-01T00:00:00.000Z → "700101_000000"
const KNOWN_TS = 1748000000000; // 2025-05-23T11:33:20.000Z → "250523_113320"

test('getFormattedDateTime: returns a string', () => {
  assert.equal(typeof getFormattedDateTime(), 'string');
});

test('getFormattedDateTime: output matches YYMMDD_HHMMSS format', () => {
  assert.match(getFormattedDateTime(), /^\d{6}_\d{6}$/);
});

test('getFormattedDateTime: formats epoch timestamp correctly', () => {
  assert.equal(getFormattedDateTime(EPOCH), '700101_000000');
});

test('getFormattedDateTime: formats a known timestamp correctly', () => {
  assert.equal(getFormattedDateTime(KNOWN_TS), '250523_113320');
});

test('getFormattedDateTime: uses current time when called with no arguments', () => {
  const before = Date.now();
  const result = getFormattedDateTime();
  const after = Date.now();

  // Derive the expected range of valid outputs
  const formatTs = (ts) => {
    const dt = new Date(ts)
      .toISOString()
      .replace(/[-:.TZ]/g, '')
      .slice(2, 14);
    return `${dt.substring(0, 6)}_${dt.slice(6)}`;
  };

  assert.ok(
    result >= formatTs(before) && result <= formatTs(after),
    `Expected result "${result}" to be within range [${formatTs(before)}, ${formatTs(after)}]`,
  );
});
