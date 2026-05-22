#!/usr/bin/env node

export function parseArgs(argv = []) {
  const args = {};
  for (let index = 2; index < argv.length; index++) {
    const value = argv[index];
    if (value.startsWith("--")) {
      const key = value.slice(2);
      const next = argv[index + 1];
      if (!next || next.startsWith("--")) {
        args[key] = true;
      } else {
        args[key] = next;
        index++;
      }
    }
  }
  return args;
}

export function assertArg(args, name) {
  if (!args[name]) {
    console.error(`Error: missing required argument --${name}`);
    process.exit(1);
  }
}
