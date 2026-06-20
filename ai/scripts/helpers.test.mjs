import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseArgs,
  assertArg,
  LANDMARK_TAGS,
  escapeHtml,
  buildTableRows,
  buildLandmarkAnnotations,
  getFormattedDate,
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

// ── buildLandmarkAnnotations ──────────────────────────────────────────────────

test('buildLandmarkAnnotations: renders landmark boxes using percentage coordinates', () => {
  const html = buildLandmarkAnnotations([
    {
      tag: 'main',
      name: 'Main content',
      boundingBox: { x: 0.1, y: 0.2, width: 0.3, height: 0.4 },
    },
  ]);

  assert.match(html, /class="landmark-annotation"/);
  // coordinates are expanded by d=1.01: left=9.85%, top=19.8%, width=30.3%, height=40.4%
  assert.match(
    html,
    /style="left: 9\.85%; top: 19\.8%; width: 30\.3%; height: 40\.4%"/,
  );
  assert.match(html, /<span class="bubble" aria-hidden="true">L1<\/span>/);
  assert.match(html, /aria-label="Landmark L1: Main content, main"/);
});

test('buildLandmarkAnnotations: escapes landmark names in aria labels', () => {
  const html = buildLandmarkAnnotations([
    {
      tag: 'navigation',
      name: 'Primary <nav> & "links"',
      boundingBox: { x: 0, y: 0, width: 1, height: 0.25 },
    },
  ]);

  assert.match(
    html,
    /aria-label="Landmark L1: Primary &lt;nav&gt; &amp; &quot;links&quot;, navigation"/,
  );
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
  const html = buildTableRows([
    { tag: 'nav', name: 'Main nav', description: 'Primary navigation' },
  ]);
  assert.match(html, /id="landmark-L1"/);
  assert.match(html, /<code class="inline-code">nav<\/code>/);
  assert.match(html, /Main nav/);
  assert.match(html, /Primary navigation/);
});

test('buildTableRows: uses the supplied prefix for IDs', () => {
  const html = buildTableRows(
    [{ tag: 'button', name: 'Submit', description: '' }],
    { prefix: 'C', rowIdPrefix: 'component' },
  );
  assert.match(html, /id="component-C1"/);
  assert.match(html, /aria-label="C1"/);
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
  const html = buildTableRows([
    { tag: 'header', name: 'Header', description: '' },
    { tag: 'footer', name: 'Footer', description: '' },
  ]);
  assert.match(html, /aria-label="L1"/);
  assert.match(html, /aria-label="L2"/);
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
