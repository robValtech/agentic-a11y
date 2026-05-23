import { test, mock, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { writeFileSync, rmSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs, formatAjvErrors } from "./validate-json.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT = resolve(__dirname, "validate-json.mjs");
const SCHEMA = resolve(__dirname, "../schemas/__test__/mock.schema.json");
const TMP_DIR = resolve(__dirname, "../../.tmp-test");

// ─── Setup / Teardown ──────────────────────────────────────────────────────────

beforeEach(() => {
  mkdirSync(TMP_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TMP_DIR, { recursive: true, force: true });
});

// ─── Helpers ───────────────────────────────────────────────────────────────────

function spawnScript(args = [], stdin = null) {
  const options = { encoding: "utf8", input: stdin ?? undefined };
  return spawnSync("node", [SCRIPT, ...args], options);
}

function writeTmp(name, content) {
  const filePath = resolve(TMP_DIR, name);
  writeFileSync(filePath, content, "utf8");
  return filePath;
}

function assertFails(args, stdin, expectedError) {
  const result = spawnScript(args, stdin);
  assert.equal(result.status, 1, `Expected exit code 1 for: ${args.join(" ")}`);
  const output = JSON.parse(result.stdout);
  assert.equal(output.ok, false);
  assert.ok(
    output.errors.some((e) => e.includes(expectedError)),
    `Expected error message to include "${expectedError}"`,
  );
}

// ── parseArgs ─────────────────────────────────────────────────────────────────

test("parseArgs: returns empty object for no flags", () => {
  assert.deepEqual(parseArgs(["node", "script.mjs"]), {});
});
// ... existing code ...
test("formatAjvErrors: handles multiple errors", () => {
  const errors = [
    {
      instancePath: "/version",
      message: "must be equal to constant",
      params: {},
    },
    {
      instancePath: "",
      message: "must have required property",
      params: { missingProperty: "elements" },
    },
  ];
  assert.deepEqual(formatAjvErrors(errors), [
    "/version must be equal to constant",
    "/ must have required property (elements)",
  ]);
});

// ── main (integration via child process) ──────────────────────────────────────

test("main: exits 1 and reports error when --schema is missing", () => {
  assertFails(["--json", "data.json"], null, "--schema");
});

test("main: exits 1 when both --json and --stdin are supplied", () => {
  assertFails(
    ["--schema", SCHEMA, "--json", "a.json", "--stdin"],
    "{}",
    "input source",
  );
});

test("main: exits 1 when neither --json nor --stdin is supplied", () => {
  assertFails(["--schema", SCHEMA], null, "input source");
});

test("main: exits 1 when --json file does not exist", () => {
  assertFails(
    ["--schema", SCHEMA, "--json", "/nonexistent/file.json"],
    null,
    "Unable to read input JSON",
  );
});

test("main: exits 1 when --schema file does not exist", () => {
  const tmpJson = writeTmp("valid.json", "{}");
  assertFails(
    ["--schema", "/nonexistent/schema.json", "--json", tmpJson],
    null,
    "Unable to read schema",
  );
});

test("main: exits 1 when --json file contains invalid JSON", () => {
  const tmpJson = writeTmp("bad.json", "{ not valid json }");
  assertFails(["--schema", SCHEMA, "--json", tmpJson], null, "not valid JSON");
});

test("main: exits 1 when stdin contains invalid JSON", () => {
  assertFails(
    ["--schema", SCHEMA, "--stdin"],
    "{ not valid }",
    "not valid JSON",
  );
});

test("main: exits 1 when JSON does not match schema", () => {
  const invalidJson = JSON.stringify({ invalid: true });
  assertFails(
    ["--schema", SCHEMA, "--stdin"],
    invalidJson,
    "must have required property",
  );
});

test("main: exits 1 when --json file does not match schema", () => {
  const tmpJson = writeTmp(
    "invalid-schema.json",
    JSON.stringify({ foo: "bar" }),
  );
  assertFails(
    ["--schema", SCHEMA, "--json", tmpJson],
    null,
    "must have required property",
  );
});

test("main: exits 0 when JSON from file is valid", () => {
  const validJson = {
    version: "1.0.0",
    greeting: "Hello",
  };
  const tmpJson = writeTmp("valid.json", JSON.stringify(validJson));
  const result = spawnScript(["--schema", SCHEMA, "--json", tmpJson]);
  assert.equal(result.status, 0);
  const output = JSON.parse(result.stdout);
  assert.deepEqual(output, { ok: true });
});

test("main: exits 0 when JSON from stdin is valid", () => {
  const validJson = {
    version: "1.0.0",
    greeting: "Szia",
  };
  const result = spawnScript(
    ["--schema", SCHEMA, "--stdin"],
    JSON.stringify(validJson),
  );
  assert.equal(result.status, 0);
  const output = JSON.parse(result.stdout);
  assert.deepEqual(output, { ok: true });
});
