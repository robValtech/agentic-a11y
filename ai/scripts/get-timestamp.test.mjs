import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCRIPT_PATH = path.join(__dirname, 'get-timestamp.mjs');

test('get-timestamp: returns a value', (t) => {
  const output = execSync(`node ${SCRIPT_PATH}`, { encoding: 'utf8' })
    .toString()
    .trim();
  console.log(
    `${JSON.stringify(output)}, OUTPUT value: "${output}", Length: ${output.length}, ${typeof output}, ${Number(output)}`,
  );
  assert.ok(output, 'should return a value');
});

test('get-timestamp: returns a numeric value', (t) => {
  const output = execSync(`node ${SCRIPT_PATH}`).toString().trim();
  assert.ok(!isNaN(output), 'should be a number');
  assert.ok(Number.isInteger(Number(output)), 'should be an integer');
});

test('get-timestamp: returns a value close to Date.now()', (t) => {
  const before = Date.now();
  const output = execSync(`node ${SCRIPT_PATH}`).toString().trim();
  const timestamp = parseInt(output, 10);
  const after = Date.now();
  assert.ok(
    timestamp >= before && timestamp <= after,
    `Expected ${timestamp} to be between ${before} and ${after}`,
  );
});
