#!/usr/bin/env node

import { parseArgs, assertArg } from './helpers.mjs';

export function getFormattedRuntime(timestampStart, timestampEnd) {
  const diff = Math.abs(timestampEnd - timestampStart);
  const totalSeconds = Math.floor(diff / 1000);
  const mm = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const ss = String(totalSeconds % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const args = parseArgs(process.argv);
  assertArg(args, 'timestampStart');
  assertArg(args, 'timestampEnd');
  process.stdout.write(
    getFormattedRuntime(
      Number(args.timestampStart),
      Number(args.timestampEnd),
    ) + '\n',
  );
}
