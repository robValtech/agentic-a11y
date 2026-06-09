#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs, assertArg, LANDMARK_TAGS, buildTableRows } from './helpers.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_DIR = resolve(__dirname, '../templates');

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

/* Read and prepare the report data */
const analysisData = JSON.parse(analysisRaw);
const elements = Array.isArray(analysisData.elements)
  ? analysisData.elements
  : [];
const landmarks = elements.filter((element) => LANDMARK_TAGS.has(element.tag));
const landmarkTableRows = buildTableRows(landmarks, {
  prefix: 'L',
  rowIdPrefix: 'landmark',
  hasIssueCol: false,
});
const executiveSummary = `<p>${analysisData.meta.keyFindings}</p>`;
const imageAspectRatio = `${((analysisData.meta.designFile.height / analysisData.meta.designFile.width) * 100).toFixed(2)}%`;

/* Update HTML contents */
const html = readFileSync(join(TEMPLATE_DIR, 'report.template.html'), 'utf8')
  .replace('{{ASPECT_RATIO}}', imageAspectRatio)
  .replace('{{EXECUTIVE_SUMMARY}}', executiveSummary)
  .replace('{{LANDMARK_TABLE_ROWS}}', landmarkTableRows)
  .replace('{{COMPONENT_TABLE_ROWS}}', '')
  .replace('href="report.template.css"', 'href="style.css"')
  .replace('src="report.head-scripts.template.js"', 'src="head-scripts.js"')
  .replace('src="report.scripts.template.js"', 'src="scripts.js"');

/* Write the final html output and copy assets */
writeFileSync(join(dir, 'index.html'), html, 'utf8');
copyFileSync(
  join(TEMPLATE_DIR, 'report.head-scripts.template.js'),
  join(dir, 'head-scripts.js'),
);
copyFileSync(
  join(TEMPLATE_DIR, 'report.scripts.template.js'),
  join(dir, 'scripts.js'),
);
copyFileSync(join(TEMPLATE_DIR, 'report.template.css'), join(dir, 'style.css'));
