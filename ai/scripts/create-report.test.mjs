import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  writeFileSync,
  readFileSync,
  existsSync,
  rmSync,
  mkdirSync,
} from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT = resolve(__dirname, 'create-report.mjs');
const TMP_DIR = resolve(__dirname, '../../.tmp-test-create-report');

// ─── Setup / Teardown ──────────────────────────────────────────────────────────

beforeEach(() => {
  mkdirSync(TMP_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TMP_DIR, { recursive: true, force: true });
});

// ─── Helpers ───────────────────────────────────────────────────────────────────

function spawnScript(args = []) {
  return spawnSync('node', [SCRIPT, ...args], { encoding: 'utf8' });
}

function writeAnalysis(content) {
  writeFileSync(join(TMP_DIR, 'analysis.json'), content, 'utf8');
}

function writeDesign() {
  writeFileSync(join(TMP_DIR, 'design.jpg'), '', 'utf8');
}

function readOutput(name) {
  return readFileSync(join(TMP_DIR, name), 'utf8');
}

function validAnalysis() {
  return JSON.stringify({
    meta: {
      keyFindings: 'KEY_FINDINGS_SENTINEL',
      designFile: { width: 1000, height: 500 },
    },
    elements: [
      {
        tag: 'main',
        name: 'Main content',
        boundingBox: { x: 0.1, y: 0.2, width: 0.3, height: 0.4 },
      },
      {
        tag: 'navigation',
        name: 'Primary nav',
        boundingBox: { x: 0.5, y: 0.1, width: 0.2, height: 0.1 },
      },
      { tag: 'button', name: 'Submit' },
    ],
  });
}

// ─── Tests ──────────────────────────────────────────────────────────────────────

test('create-report: exits 1 when --dir is missing', () => {
  const result = spawnScript([]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Error: missing required argument --dir/);
});

test('create-report: exits 1 when working directory does not exist', () => {
  const result = spawnScript(['--dir', join(TMP_DIR, 'no-such-dir')]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Error: Working directory not found/);
});

test('create-report: exits 1 when analysis.json is missing', () => {
  const result = spawnScript(['--dir', TMP_DIR]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Error: analysis.json not found/);
});

test('create-report: exits 1 when design.jpg is missing', () => {
  writeAnalysis(validAnalysis());
  const result = spawnScript(['--dir', TMP_DIR]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Error: design.jpg not found/);
});

test('create-report: exits 0 for a valid directory', () => {
  writeAnalysis(validAnalysis());
  writeDesign();
  const result = spawnScript(['--dir', TMP_DIR]);
  assert.equal(result.status, 0);
});

test('create-report: exits non-zero when analysis.json is malformed', () => {
  writeAnalysis('{ not valid json');
  writeDesign();
  const result = spawnScript(['--dir', TMP_DIR]);
  assert.notEqual(result.status, 0);
});

test('create-report: writes index.html and copies the three assets', () => {
  writeAnalysis(validAnalysis());
  writeDesign();
  spawnScript(['--dir', TMP_DIR]);
  assert.ok(existsSync(join(TMP_DIR, 'index.html')), 'index.html');
  assert.ok(existsSync(join(TMP_DIR, 'head-scripts.js')), 'head-scripts.js');
  assert.ok(existsSync(join(TMP_DIR, 'scripts.js')), 'scripts.js');
  assert.ok(existsSync(join(TMP_DIR, 'style.css')), 'style.css');
});

test('create-report: index.html references the renamed assets', () => {
  writeAnalysis(validAnalysis());
  writeDesign();
  spawnScript(['--dir', TMP_DIR]);
  const html = readOutput('index.html');
  assert.match(html, /href="style\.css"/);
  assert.match(html, /src="head-scripts\.js"/);
  assert.match(html, /src="scripts\.js"/);
});

test('create-report: index.html has no leftover template references', () => {
  writeAnalysis(validAnalysis());
  writeDesign();
  spawnScript(['--dir', TMP_DIR]);
  const html = readOutput('index.html');
  assert.doesNotMatch(html, /report\.template\.css/);
  assert.doesNotMatch(html, /report\.head-scripts\.template\.js/);
  assert.doesNotMatch(html, /report\.scripts\.template\.js/);
  assert.doesNotMatch(html, /\{\{EXECUTIVE_SUMMARY\}\}/);
});

test('create-report: injects keyFindings as the executive summary', () => {
  writeAnalysis(validAnalysis());
  writeDesign();
  spawnScript(['--dir', TMP_DIR]);
  const html = readOutput('index.html');
  assert.match(html, /<p>KEY_FINDINGS_SENTINEL<\/p>/);
});

test('create-report: renders landmark annotation boxes on the design', () => {
  writeAnalysis(validAnalysis());
  writeDesign();
  spawnScript(['--dir', TMP_DIR]);
  const html = readOutput('index.html');

  assert.match(html, /class="landmark-annotation"/);
  // coordinates are expanded by d=1.1: left=8.5%, top=18%, width=33%, height=44%
  assert.match(html, /style="left: 8\.5%; top: 18%; width: 33%; height: 44%"/);
  assert.match(
    html,
    /<span class="bubble bubble--neutral" aria-hidden="true">L1<\/span>/,
  );
  assert.match(
    html,
    /<span class="bubble bubble--neutral" aria-hidden="true">L2<\/span>/,
  );
  assert.doesNotMatch(html, /Landmark L3: Submit/);
});
