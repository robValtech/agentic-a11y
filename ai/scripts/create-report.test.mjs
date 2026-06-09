import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { writeFileSync, rmSync, mkdirSync } from 'node:fs';
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

function validAnalysis() {
  return JSON.stringify({
    elements: [
      { tag: 'main', name: 'Main content' },
      { tag: 'navigation', name: 'Primary nav' },
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
