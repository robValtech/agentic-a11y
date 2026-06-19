#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseArgs,
  assertArg,
  LANDMARK_TAGS,
  buildLandmarkAnnotations,
  buildTableRows,
  getFormattedDate,
} from './helpers.mjs';
import { getFormattedRuntime } from './get-formatted-runtime.mjs';

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
const landmarkAnnotations = buildLandmarkAnnotations(landmarks);
const metaData = analysisData.meta;
const designFile = metaData.designFile;
const executiveSummary = `<p>${metaData.keyFindings}</p>`;
const designAspectRatio = `${(1 / (designFile.height / designFile.width)).toFixed(2)}`;
console.log(
  designFile.name,
  designFile.width,
  designFile.height,
  designAspectRatio,
);

const metaDataDate = getFormattedDate(metaData.timestampEnd);
const formattedMetaRuntime = getFormattedRuntime(
  metaData.timestampStart,
  metaData.timestampEnd,
);

/* Update HTML contents */
const html = readFileSync(join(TEMPLATE_DIR, 'report.template.html'), 'utf8')
  .replace('{{DESIGN_ASPECT_RATIO}}', designAspectRatio)
  .replace('{{EXECUTIVE_SUMMARY}}', executiveSummary)
  // Landmarks
  .replace('{{LANDMARK_MARKERS}}', landmarkAnnotations)
  .replace('{{LANDMARK_TABLE_ROWS}}', landmarkTableRows)
  // UI Components
  .replace('{{UI_COMPONENT_TABLE_ROWS}}', '')
  .replace('{{UI_COMPONENT_MARKERS}}', '')
  // A11Y Issues
  .replace('{{A11Y_ISSUE_MARKERS}}', '')
  .replace('{{A11Y_ISSUES}}', '')
  // A11Y Flags
  .replace('{{A11Y_FLAG_MARKERS}}', '')
  .replace('{{A11Y_FLAGS}}', '')
  // Metadata
  .replace('{{METADATA_DATE}}', metaDataDate)
  .replaceAll('{{METADATA_FILE_NAME}}', designFile.name)
  .replace('{{METADATA_ANALYST}}', metaData.modelName)
  .replace('{{METADATA_PROMPT}}', metaData.prompt)
  .replace('{{METADATA_RUNTIME}}', formattedMetaRuntime)
  .replace('{{METADATA_TOTAL_ELEMENTS}}', 'N/A')
  .replace('{{METADATA_TOTAL_ISSUES}}', 'N/A')
  // File refs
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
