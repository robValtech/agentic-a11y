import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, rmSync, mkdirSync, statSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT = resolve(__dirname, 'prepare-image.mjs');
const TMP_DIR = resolve(__dirname, '../../.tmp-test-prepare-image');

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

async function writeSourceImage(name, width, height) {
  const path = join(TMP_DIR, name);
  await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 100, g: 150, b: 200 },
    },
  })
    .png()
    .toFile(path);
  return path;
}

// ─── Tests ──────────────────────────────────────────────────────────────────────

test('prepare-image: exits 1 when --src is missing', () => {
  const result = spawnScript(['--dest', TMP_DIR]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Error: missing required argument --src/);
});

test('prepare-image: exits 1 when --dest is missing', async () => {
  const src = await writeSourceImage('in.png', 800, 600);
  const result = spawnScript(['--src', src]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Error: missing required argument --dest/);
});

test('prepare-image: exits 1 when the source image does not exist', () => {
  const result = spawnScript([
    '--src',
    join(TMP_DIR, 'no-such.png'),
    '--dest',
    TMP_DIR,
  ]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Error: source image not found/);
});

test('prepare-image: writes design.webp to the destination directory', async () => {
  const src = await writeSourceImage('in.png', 800, 600);
  const result = spawnScript(['--src', src, '--dest', TMP_DIR]);
  assert.equal(result.status, 0);
  assert.ok(existsSync(join(TMP_DIR, 'design.webp')), 'design.webp exists');
});

test('prepare-image: prints final dimensions as JSON', async () => {
  const src = await writeSourceImage('in.png', 800, 600);
  const result = spawnScript(['--src', src, '--dest', TMP_DIR]);
  const dims = JSON.parse(result.stdout);
  assert.equal(dims.width, 800);
  assert.equal(dims.height, 600);
});

test('prepare-image: resizes images wider than 1440px', async () => {
  const src = await writeSourceImage('wide.png', 2880, 1440);
  const result = spawnScript(['--src', src, '--dest', TMP_DIR]);
  const dims = JSON.parse(result.stdout);
  assert.equal(dims.width, 1440);
  assert.equal(dims.height, 720, 'aspect ratio preserved');
});

test('prepare-image: resizes images taller than 1440px (constrains longest side)', async () => {
  // 1440×2880 — height is the longest side; should scale down to 720×1440
  const src = await writeSourceImage('tall.png', 1440, 2880);
  const result = spawnScript(['--src', src, '--dest', TMP_DIR]);
  const dims = JSON.parse(result.stdout);
  assert.equal(dims.height, 1440, 'longest side capped at 1440');
  assert.equal(dims.width, 720, 'aspect ratio preserved');
});

test('prepare-image: does not enlarge images narrower than 1440px', async () => {
  const src = await writeSourceImage('narrow.png', 600, 400);
  const result = spawnScript(['--src', src, '--dest', TMP_DIR]);
  const dims = JSON.parse(result.stdout);
  assert.equal(dims.width, 600);
  assert.equal(dims.height, 400);
});

test('prepare-image: outputs a genuine WebP file', async () => {
  const src = await writeSourceImage('in.png', 800, 600);
  spawnScript(['--src', src, '--dest', TMP_DIR]);
  const meta = await sharp(join(TMP_DIR, 'design.webp')).metadata();
  assert.equal(meta.format, 'webp');
});

test('prepare-image: accepts a webp source image', async () => {
  const path = join(TMP_DIR, 'in.webp');
  await sharp({
    create: {
      width: 1000,
      height: 500,
      channels: 3,
      background: { r: 10, g: 20, b: 30 },
    },
  })
    .webp()
    .toFile(path);
  const result = spawnScript(['--src', path, '--dest', TMP_DIR]);
  assert.equal(result.status, 0);
  const dims = JSON.parse(result.stdout);
  assert.equal(dims.width, 1000);
  assert.equal(dims.height, 500);
});

test('prepare-image: creates the destination directory if missing', async () => {
  const src = await writeSourceImage('in.png', 800, 600);
  const nestedDest = join(TMP_DIR, 'nested', 'out');
  const result = spawnScript(['--src', src, '--dest', nestedDest]);
  assert.equal(result.status, 0);
  assert.ok(statSync(join(nestedDest, 'design.webp')).isFile());
});
