#!/usr/bin/env node

import { resolve } from 'node:path';
import { parseArgs, softAssertArg } from './helpers.mjs';

export function getFormattedRuntime(timestampStart, timestampEnd) {
  const diff = Math.abs(timestampEnd - timestampStart);
  const totalSeconds = Math.floor(diff / 1000);
  const mm = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const ss = String(totalSeconds % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

const args = parseArgs(process.argv);
if (
  args &&
  assertArg(args, 'timestampStart', true) &&
  assertArg(args, 'timestampEnd', true)
) {
  const timestampStart = resolve(args, 'timestampStart');
  const timestampEnd = resolve(args, 'timestampEnd');
  process.stdout.write(
    getFormattedDateTime(timestampStart, timestampEnd) + '\n',
  );
}
