#!/usr/bin/env node

import Ajv from "ajv";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "./helpers.mjs";

function readStdin() {
  return new Promise((resolveInput, rejectInput) => {
    let buffer = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      buffer += chunk;
    });
    process.stdin.on("end", () => {
      resolveInput(buffer);
    });
    process.stdin.on("error", rejectInput);
  });
}

export function formatAjvErrors(errors) {
  return (errors ?? []).map((error) => {
    const instancePath = error.instancePath || "/";
    const suffix = error.params?.missingProperty
      ? ` (${error.params.missingProperty})`
      : error.params?.additionalProperty
        ? ` (${error.params.additionalProperty})`
        : "";
    return `${instancePath} ${error.message}${suffix}`.trim();
  });
}

async function main() {
  const args = parseArgs(process.argv);
  const schemaPath = args.schema ? resolve(args.schema) : null;
  const useStdin = Boolean(args.stdin);
  const jsonPath = args.json ? resolve(args.json) : null;

  if (!schemaPath) {
    console.log(
      JSON.stringify(
        {
          ok: false,
          errors: ["Missing required argument: --schema <path>."],
        },
        null,
        2,
      ),
    );
    process.exit(1);
  }

  if ((useStdin && jsonPath) || (!useStdin && !jsonPath)) {
    console.log(
      JSON.stringify(
        {
          ok: false,
          errors: [
            "Provide exactly one input source: --json <path> or --stdin.",
          ],
        },
        null,
        2,
      ),
    );
    process.exit(1);
  }

  let rawJson;
  try {
    rawJson = useStdin ? await readStdin() : readFileSync(jsonPath, "utf8");
  } catch (error) {
    console.log(
      JSON.stringify(
        {
          ok: false,
          errors: [`Unable to read input JSON: ${error.message}`],
        },
        null,
        2,
      ),
    );
    process.exit(1);
  }

  let input;
  try {
    input = JSON.parse(rawJson);
  } catch (error) {
    console.log(
      JSON.stringify(
        {
          ok: false,
          errors: [`Input is not valid JSON: ${error.message}`],
        },
        null,
        2,
      ),
    );
    process.exit(1);
  }

  let schema;
  try {
    schema = JSON.parse(readFileSync(schemaPath, "utf8"));
  } catch (error) {
    console.log(
      JSON.stringify(
        {
          ok: false,
          errors: [`Unable to read schema: ${error.message}`],
        },
        null,
        2,
      ),
    );
    process.exit(1);
  }

  const ajv = new Ajv({ allErrors: true, strict: false });
  const validate = ajv.compile(schema);
  const valid = validate(input);

  if (!valid) {
    console.log(
      JSON.stringify(
        {
          ok: false,
          errors: formatAjvErrors(validate.errors),
        },
        null,
        2,
      ),
    );
    process.exit(1);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
      },
      null,
      2,
    ),
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.log(
      JSON.stringify(
        {
          ok: false,
          errors: [error.message],
        },
        null,
        2,
      ),
    );
    process.exit(1);
  });
}
