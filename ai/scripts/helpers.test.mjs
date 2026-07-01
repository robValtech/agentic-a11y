import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseArgs,
  assertArg,
  LANDMARK_TAGS,
  escapeHtml,
  buildVisualID,
  buildTableRows,
  buildIssueCards,
  getFormattedDate,
  getConfidenceLevelObj as getConfidenceLevel,
} from './helpers.mjs';

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

// ── buildVisualID ─────────────────────────────────────────────────────────────

test('buildVisualID: formats a single-digit index with zero-padding', () => {
  assert.equal(buildVisualID('lm', 1), 'lm-01');
});

test('buildVisualID: formats a two-digit index without extra padding', () => {
  assert.equal(buildVisualID('cr', 12), 'cr-12');
});

// ── escapeHtml ────────────────────────────────────────────────────────────────

test('escapeHtml: returns plain strings unchanged', () => {
  assert.equal(escapeHtml('hello world'), 'hello world');
});

test('escapeHtml: escapes ampersand', () => {
  assert.equal(escapeHtml('a & b'), 'a &amp; b');
});

test('escapeHtml: escapes less-than', () => {
  assert.equal(escapeHtml('<div>'), '&lt;div&gt;');
});

test('escapeHtml: escapes double quote', () => {
  assert.equal(escapeHtml('"hello"'), '&quot;hello&quot;');
});

test('escapeHtml: escapes all special characters together', () => {
  assert.equal(
    escapeHtml('<script src="x.js">a & b</script>'),
    '&lt;script src=&quot;x.js&quot;&gt;a &amp; b&lt;/script&gt;',
  );
});

test('escapeHtml: coerces non-string values to string', () => {
  assert.equal(escapeHtml(42), '42');
});

// ── buildTableRows ────────────────────────────────────────────────────────────

test('buildTableRows: returns empty string for an empty array', () => {
  assert.equal(buildTableRows([]), '');
});

test('buildTableRows: renders a row with the correct id, tag, name, and description', () => {
  const html = buildTableRows(
    [{ tag: 'nav', name: 'Main nav', description: 'Primary navigation' }],
    { prefix: 'L', rowIdPrefix: 'landmark' },
  );
  assert.match(html, /id="landmark-L-01"/);
  assert.match(html, /<code class="inline-code">nav<\/code>/);
  assert.match(html, /Main nav/);
  assert.match(html, /Primary navigation/);
});

test('buildTableRows: uses the supplied prefix for IDs', () => {
  const html = buildTableRows(
    [{ tag: 'button', name: 'Submit', description: '' }],
    { prefix: 'C', rowIdPrefix: 'component' },
  );
  assert.match(html, /id="component-C-01"/);
  assert.match(html, />C-01<\/span>/);
});

test('buildTableRows: omits issue cell when hasIssueCol is false', () => {
  const html = buildTableRows([
    {
      tag: 'main',
      name: 'Main',
      description: '',
      issue: 'Missing label',
      issueId: 'I1',
      severity: 'high',
    },
  ]);
  assert.doesNotMatch(html, /href="#issue-/);
});

test('buildTableRows: renders issue link when hasIssueCol is true and issue is present', () => {
  const html = buildTableRows(
    [
      {
        tag: 'img',
        name: 'Logo',
        description: '',
        issue: 'Missing alt',
        issueId: 'I3',
        severity: 'critical',
      },
    ],
    { hasIssueCol: true },
  );
  assert.match(html, /href="#issue-I3"/);
  assert.match(html, /class="bubble bubble--critical"/);
  assert.match(html, /aria-label="Related issue I3"/);
});

test('buildTableRows: renders a dash cell when hasIssueCol is true but no issue', () => {
  const html = buildTableRows([{ tag: 'nav', name: 'Nav', description: '' }], {
    hasIssueCol: true,
  });
  assert.match(html, /<span aria-hidden="true">-<\/span>/);
});

test('buildTableRows: escapes HTML in tag, name, and description fields', () => {
  const html = buildTableRows([
    { tag: '<b>', name: 'A & B', description: '"quoted"' },
  ]);
  assert.match(html, /&lt;b&gt;/);
  assert.match(html, /A &amp; B/);
  assert.match(html, /&quot;quoted&quot;/);
});

test('buildTableRows: assigns sequential IDs across multiple rows', () => {
  const html = buildTableRows(
    [
      { tag: 'header', name: 'Header', description: '' },
      { tag: 'footer', name: 'Footer', description: '' },
    ],
    { prefix: 'L' },
  );
  assert.match(html, />L-01<\/span>/);
  assert.match(html, />L-02<\/span>/);
});

test('buildTableRows: renders contains bubbles when containsIdMap is provided and contains is populated', () => {
  const idMap = new Map([['lm_002', 'L2']]);
  const html = buildTableRows(
    [
      {
        tag: 'banner',
        name: 'Header',
        description: '',
        contains: ['lm_002'],
      },
    ],
    { containsIdMap: idMap },
  );
  assert.match(html, /aria-label="L2"/);
  assert.match(html, />L2<\/span>/);
});

test('buildTableRows: renders empty contains cell when contains array is empty', () => {
  const idMap = new Map();
  const html = buildTableRows(
    [{ tag: 'main', name: 'Main', description: '', contains: [] }],
    { containsIdMap: idMap },
  );
  assert.match(html, /<td><\/td>/);
});

test('buildTableRows: omits contains cell when containsIdMap is not provided', () => {
  const html = buildTableRows([
    { tag: 'nav', name: 'Nav', description: '', contains: ['lm_001'] },
  ]);
  assert.doesNotMatch(html, /lm_001/);
});

// ── buildIssueCards ───────────────────────────────────────────────────────────

const makeIssue = (overrides = {}) => ({
  severity: 'high',
  wcag: ['1.4.3'],
  title: 'Low contrast',
  description: 'Text contrast ratio is too low.',
  fix: 'Increase contrast ratio to at least 4.5:1.',
  confidence: { level: 0.8 },
  ...overrides,
});

test('buildIssueCards: badge renders visual ID with severity prefix and zero-padded index', () => {
  const html = buildIssueCards([makeIssue({ severity: 'critical' })]);
  assert.match(html, /class="issue-card__badge badge--critical">cr-01<\/span>/);
});

test('buildIssueCards: article id uses visual ID format', () => {
  const html = buildIssueCards([makeIssue({ severity: 'high' })]);
  assert.match(html, /id="issue-hi-01"/);
});

test('buildIssueCards: assigns sequential visual IDs per severity', () => {
  const html = buildIssueCards([
    makeIssue({ severity: 'critical' }),
    makeIssue({ severity: 'critical' }),
  ]);
  assert.match(html, /badge--critical">cr-01<\/span>/);
  assert.match(html, /badge--critical">cr-02<\/span>/);
});

test('buildIssueCards: sorts by severity before assigning IDs', () => {
  const html = buildIssueCards([
    makeIssue({ severity: 'low' }),
    makeIssue({ severity: 'critical' }),
  ]);
  assert.match(html, /badge--critical">cr-01<\/span>/);
  assert.match(html, /badge--low">lo-01<\/span>/);
});

test('buildIssueCards: returns empty string for empty array', () => {
  assert.equal(buildIssueCards([]), '');
});

// ── getConfidenceLevel ────────────────────────────────────────────────────────

test('getConfidenceLevel: returns "very low" for 0', () => {
  assert.equal(getConfidenceLevel(0).label, 'very low');
});

test('getConfidenceLevel: returns "very low" at the 0.4 boundary', () => {
  assert.equal(getConfidenceLevel(0.4).label, 'very low');
});

test('getConfidenceLevel: returns "low" just above 0.4', () => {
  assert.equal(getConfidenceLevel(0.41).label, 'low');
});

test('getConfidenceLevel: returns "low" at the 0.6 boundary', () => {
  assert.equal(getConfidenceLevel(0.6).label, 'low');
});

test('getConfidenceLevel: returns "moderate" just above 0.6', () => {
  assert.equal(getConfidenceLevel(0.61).label, 'moderate');
});

test('getConfidenceLevel: returns "moderate" at the 0.75 boundary', () => {
  assert.equal(getConfidenceLevel(0.75).label, 'moderate');
});

test('getConfidenceLevel: returns "high" just above 0.75', () => {
  assert.equal(getConfidenceLevel(0.76).label, 'high');
});

test('getConfidenceLevel: returns "high" at the 0.9 boundary', () => {
  assert.equal(getConfidenceLevel(0.9).label, 'high');
});

test('getConfidenceLevel: returns "very high" just above 0.9', () => {
  assert.equal(getConfidenceLevel(0.91).label, 'very high');
});

test('getConfidenceLevel: returns "very high" at 1.0', () => {
  assert.equal(getConfidenceLevel(1).label, 'very high');
});

test('getConfidenceLevel: falls back to "very low" for out-of-range values above 1', () => {
  assert.equal(getConfidenceLevel(1.5).label, 'very low');
});

// ── getFormattedDate ──────────────────────────────────────────────────────────

test('getFormattedDate: formats a given timestamp as dd/mm/yyyy hh:mm:ss', () => {
  // Use a local-time Date to avoid timezone issues
  const d = new Date(2024, 0, 15, 10, 30, 45); // 15 Jan 2024, 10:30:45 local
  assert.equal(getFormattedDate(d.getTime()), '15/01/2024 10:30:45');
});

test('getFormattedDate: pads single-digit day, month, and time components', () => {
  const d = new Date(2024, 1, 5, 9, 7, 3); // 5 Feb 2024, 09:07:03 local
  assert.equal(getFormattedDate(d.getTime()), '05/02/2024 09:07:03');
});

test('getFormattedDate: returns a correctly formatted string when called without arguments', () => {
  const result = getFormattedDate();
  assert.match(result, /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/);
});
