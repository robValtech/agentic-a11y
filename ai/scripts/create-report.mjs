#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs, assertArg, LANDMARK_TAGS } from './helpers.mjs';

const args = parseArgs(process.argv);
assertArg(args, 'dir');

const dir = args.dir;

if (!existsSync(dir)) {
  console.error('Error: Working directory not found');
  process.exit(1);
}

let analysisRaw;
try {
  analysisRaw = readFileSync(join(dir, 'analysis.json'), 'utf8');
} catch {
  console.error('Error: analysis.json not found');
  process.exit(1);
}

if (!existsSync(join(dir, 'design.jpg'))) {
  console.error('Error: design.jpg not found');
  process.exit(1);
}

const analysisData = JSON.parse(analysisRaw);
const elements = Array.isArray(analysisData.elements)
  ? analysisData.elements
  : [];
const landmarks = elements.filter((element) => LANDMARK_TAGS.has(element.tag));
