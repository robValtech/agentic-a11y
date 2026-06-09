import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs, assertArg, LANDMARK_TAGS } from './helpers.mjs';

// ── parseArgs ─────────────────────────────────────────────────────────────────

test('parseArgs: returns empty object for empty argv', () => {
  assert.deepEqual(parseArgs([]), {});
});

test('parseArgs: returns empty object when argv has no flags', () => {
  assert.deepEqual(parseArgs(['node', 'script.mjs']), {});
});

test('parseArgs: parses a single --key value pair', () => {
  assert.deepEqual(
    parseArgs(['node', 'script.mjs', '--output', '/some/path']),
    { output: '/some/path' },
  );
});

test('parseArgs: parses multiple --key value pairs', () => {
  assert.deepEqual(
    parseArgs(['node', 'script.mjs', '--json', 'a.json', '--image', 'b.png']),
    { json: 'a.json', image: 'b.png' },
  );
});

test('parseArgs: sets boolean true for a flag at end of argv', () => {
  assert.deepEqual(parseArgs(['node', 'script.mjs', '--verbose']), {
    verbose: true,
  });
});

test('parseArgs: sets boolean true when next token is another flag', () => {
  assert.deepEqual(
    parseArgs(['node', 'script.mjs', '--dry-run', '--output', '/path']),
    { 'dry-run': true, output: '/path' },
  );
});

// ── assertArg ─────────────────────────────────────────────────────────────────

test('assertArg: does not call process.exit when arg is present', () => {
  const exitMock = mock.method(process, 'exit', () => {});
  assertArg({ output: '/path' }, 'output');
  assert.equal(exitMock.mock.calls.length, 0);
  mock.restoreAll();
});

test('assertArg: calls process.exit(1) when arg is missing', () => {
  const exitMock = mock.method(process, 'exit', () => {});
  mock.method(console, 'error', () => {});
  assertArg({}, 'output');
  assert.equal(exitMock.mock.calls.length, 1);
  assert.equal(exitMock.mock.calls[0].arguments[0], 1);
  mock.restoreAll();
});

test('assertArg: logs correct error message when arg is missing', () => {
  mock.method(process, 'exit', () => {});
  const errorMock = mock.method(console, 'error', () => {});
  assertArg({}, 'schema');
  assert.equal(errorMock.mock.calls.length, 1);
  assert.equal(
    errorMock.mock.calls[0].arguments[0],
    'Error: missing required argument --schema',
  );
  mock.restoreAll();
});

// ── LANDMARK_TAGS ─────────────────────────────────────────────────────────────

test('LANDMARK_TAGS: contains all expected landmark roles', () => {
  const expected = [
    'banner',
    'complementary',
    'contentinfo',
    'form',
    'main',
    'navigation',
    'region',
    'section',
    'search',
  ];
  for (const tag of expected) {
    assert.ok(
      LANDMARK_TAGS.has(tag),
      `expected LANDMARK_TAGS to contain "${tag}"`,
    );
  }
  assert.equal(LANDMARK_TAGS.size, expected.length);
});

test('LANDMARK_TAGS: excludes non-landmark tags', () => {
  assert.equal(LANDMARK_TAGS.has('a'), false);
  assert.equal(LANDMARK_TAGS.has('button'), false);
});
