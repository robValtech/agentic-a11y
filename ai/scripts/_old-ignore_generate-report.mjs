#!/usr/bin/env node
/**
 * generate-report.mjs
 *
 * Generates an annotated HTML accessibility review page from analysis JSON and
 * design review templates. Replaces the LLM-driven HTML generation step that
 * previously caused 2–4 minute generation times.
 *
 * Usage:
 *   node generate-report.mjs \
 *     --json     <path-to-analysis-result.json> \
 *     --image    <path-to-source-image> \
 *     --output   <path-to-output-folder> \
 *     --template-dir <path-to-template-folder>
 *
 * Outputs to <output-folder>:
 *   index.html  — annotated HTML report
 *   style.css   — copied template CSS
 *   design.jpg  — source image converted to JPEG via sips
 */

import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { resolve, join, basename } from 'node:path';
import { execSync } from 'node:child_process';
import { parseArgs, assertArg } from './helpers.mjs';

// ---------------------------------------------------------------------------
// WCAG SC → Understanding slug lookup table (WCAG 2.2)
// ---------------------------------------------------------------------------
const WCAG_SLUGS = {
  '1.1.1': 'non-text-content',
  '1.2.1': 'audio-only-and-video-only-prerecorded',
  '1.2.2': 'captions-prerecorded',
  '1.2.3': 'audio-description-or-media-alternative-prerecorded',
  '1.2.4': 'captions-live',
  '1.2.5': 'audio-description-prerecorded',
  '1.2.6': 'sign-language-prerecorded',
  '1.2.7': 'extended-audio-description-prerecorded',
  '1.2.8': 'media-alternative-prerecorded',
  '1.2.9': 'audio-only-live',
  '1.3.1': 'info-and-relationships',
  '1.3.2': 'meaningful-sequence',
  '1.3.3': 'sensory-characteristics',
  '1.3.4': 'orientation',
  '1.3.5': 'identify-input-purpose',
  '1.3.6': 'identify-purpose',
  '1.4.1': 'use-of-color',
  '1.4.2': 'audio-control',
  '1.4.3': 'contrast-minimum',
  '1.4.4': 'resize-text',
  '1.4.5': 'images-of-text',
  '1.4.6': 'contrast-enhanced',
  '1.4.7': 'low-or-no-background-audio',
  '1.4.8': 'visual-presentation',
  '1.4.9': 'images-of-text-no-exception',
  '1.4.10': 'reflow',
  '1.4.11': 'non-text-contrast',
  '1.4.12': 'text-spacing',
  '1.4.13': 'content-on-hover-or-focus',
  '2.1.1': 'keyboard',
  '2.1.2': 'no-keyboard-trap',
  '2.1.3': 'keyboard-no-exception',
  '2.1.4': 'character-key-shortcuts',
  '2.2.1': 'timing-adjustable',
  '2.2.2': 'pause-stop-hide',
  '2.2.3': 'no-timing',
  '2.2.4': 'interruptions',
  '2.2.5': 're-authenticating',
  '2.2.6': 'timeouts',
  '2.3.1': 'three-flashes-or-below-threshold',
  '2.3.2': 'three-flashes',
  '2.3.3': 'animation-from-interactions',
  '2.4.1': 'bypass-blocks',
  '2.4.2': 'page-titled',
  '2.4.3': 'focus-order',
  '2.4.4': 'link-purpose-in-context',
  '2.4.5': 'multiple-ways',
  '2.4.6': 'headings-and-labels',
  '2.4.7': 'focus-visible',
  '2.4.8': 'location',
  '2.4.9': 'link-purpose-link-only',
  '2.4.10': 'section-headings',
  '2.4.11': 'focus-not-obscured-minimum',
  '2.4.12': 'focus-not-obscured-enhanced',
  '2.4.13': 'focus-appearance',
  '2.5.1': 'pointer-gestures',
  '2.5.2': 'pointer-cancellation',
  '2.5.3': 'label-in-name',
  '2.5.4': 'motion-actuation',
  '2.5.5': 'target-size-enhanced',
  '2.5.6': 'concurrent-input-mechanisms',
  '2.5.7': 'dragging-movements',
  '2.5.8': 'target-size-minimum',
  '3.1.1': 'language-of-page',
  '3.1.2': 'language-of-parts',
  '3.1.3': 'unusual-words',
  '3.1.4': 'abbreviations',
  '3.1.5': 'reading-level',
  '3.1.6': 'pronunciation',
  '3.2.1': 'on-focus',
  '3.2.2': 'on-input',
  '3.2.3': 'consistent-navigation',
  '3.2.4': 'consistent-identification',
  '3.2.5': 'change-on-request',
  '3.2.6': 'consistent-help',
  '3.3.1': 'error-identification',
  '3.3.2': 'labels-or-instructions',
  '3.3.3': 'error-suggestion',
  '3.3.4': 'error-prevention-legal-financial-data',
  '3.3.5': 'help',
  '3.3.6': 'error-prevention-all',
  '3.3.7': 'redundant-entry',
  '3.3.8': 'accessible-authentication-minimum',
  '3.3.9': 'accessible-authentication-enhanced',
  '4.1.1': 'parsing',
  '4.1.2': 'name-role-value',
  '4.1.3': 'status-messages',
};

// ---------------------------------------------------------------------------
// Severity ordering for issue card sort
// ---------------------------------------------------------------------------
const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2 };

const ISSUE_PREFIX = {
  critical: 'C',
  high: 'H',
  medium: 'M',
};

// ---------------------------------------------------------------------------
// Image utilities
// ---------------------------------------------------------------------------
function getImageDimensions(imagePath) {
  const result = execSync(
    `sips -g pixelWidth -g pixelHeight "${imagePath}"`,
  ).toString();
  const width = parseInt(result.match(/pixelWidth:\s*(\d+)/)?.[1], 10);
  const height = parseInt(result.match(/pixelHeight:\s*(\d+)/)?.[1], 10);
  if (!width || !height) {
    throw new Error(`Could not read dimensions from: ${imagePath}`);
  }
  return { width, height };
}

function convertToJpeg(sourcePath, outputPath) {
  execSync(
    `sips --setProperty format jpeg "${sourcePath}" --out "${outputPath}"`,
  );
}

function normaliseIssueData(analysis) {
  const allItems = [
    ...(analysis.landmarks ?? []),
    ...(analysis.elements ?? []),
    ...(analysis.unidentified ?? []),
  ];

  const issueCounters = { critical: 0, high: 0, medium: 0 };
  const usedIssueIds = new Set();

  for (const item of allItems) {
    if (!item.issue || !item.issueId) continue;
    usedIssueIds.add(item.issueId);

    const match = /^([CHM])(\d+)$/.exec(item.issueId);
    if (!match) continue;

    const sev =
      match[1] === 'C' ? 'critical' : match[1] === 'H' ? 'high' : 'medium';
    const current = Number.parseInt(match[2], 10);
    issueCounters[sev] = Math.max(issueCounters[sev], current);
  }

  for (const item of allItems) {
    if (!item.issue) continue;

    const severity = item.severity ?? item.issue?.severity ?? 'medium';
    item.severity = severity;

    if (!item.issueId) {
      const prefix = ISSUE_PREFIX[severity] ?? 'M';
      do {
        issueCounters[severity] = (issueCounters[severity] ?? 0) + 1;
        item.issueId = `${prefix}${issueCounters[severity]}`;
      } while (usedIssueIds.has(item.issueId));
    }

    usedIssueIds.add(item.issueId);
  }

  return allItems.filter((item) => item.issue && item.issueId);
}

// ---------------------------------------------------------------------------
// Bubble HTML builder
// ---------------------------------------------------------------------------
function buildBubbles(analysis) {
  const lines = [];
  let neutralCounter = 0;

  function nextNeutral() {
    neutralCounter++;
    return `N${neutralCounter}`;
  }

  function renderItem(item) {
    const { x, y, label, name, severity, issueId } = item;
    const displayLabel = label ?? name ?? '';
    const left = `${x}%`;
    const top = `${y}%`;

    if (issueId) {
      const cls = `bubble bubble--${severity}`;
      lines.push(
        `          <a\n` +
          `            href="#issue-${issueId}"\n` +
          `            class="${cls}"\n` +
          `            style="left: ${left}; top: ${top};"\n` +
          `            aria-label="${escapeHtml(displayLabel)} (${issueId})"\n` +
          `            >${issueId}</a\n` +
          `          >`,
      );
    } else {
      const code = nextNeutral();
      lines.push(
        `          <span\n` +
          `            class="bubble bubble--neutral"\n` +
          `            style="left: ${left}; top: ${top};"\n` +
          `            aria-label="${escapeHtml(displayLabel)} (${code})"\n` +
          `            >${code}</span\n` +
          `          >`,
      );
    }
  }

  for (const item of analysis.landmarks ?? []) renderItem(item);

  // Elements: render as E-bubbles linking to the elements table.
  // If the element has an issue, use a severity-coloured bubble labelled with
  // the issue ID (e.g. M1) so the design overlay is consistent with the table.
  for (const item of analysis.elements ?? []) {
    const { boundingBox, label, name, elementId, issue, issueId, severity } =
      item;
    const displayLabel = label ?? name ?? '';

    if (issue && issueId) {
      lines.push(
        `          <a\n` +
          `            href="#element-${elementId}"\n` +
          `            class="bubble bubble--${severity}"\n` +
          `            style="left: ${boundingBox.x}%; top: ${boundingBox.y}%;"\n` +
          `            aria-label="${escapeHtml(displayLabel)} (${issueId})"\n` +
          `            >${issueId}</a\n` +
          `          >`,
      );
    } else {
      lines.push(
        `          <a\n` +
          `            href="#element-${elementId}"\n` +
          `            class="bubble bubble--neutral"\n` +
          `            style="left: ${boundingBox.x}%; top: ${boundingBox.y}%;"\n` +
          `            aria-label="${escapeHtml(displayLabel)} (${elementId})"\n` +
          `            >${elementId}</a\n` +
          `          >`,
      );
    }
  }

  for (const item of analysis.unidentified ?? []) renderItem(item);

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Elements panel HTML builder
// ---------------------------------------------------------------------------
function buildElementsPanel(analysis) {
  const elements = analysis.elements ?? [];

  if (elements.length === 0) {
    return `      <section class="section elements-panel" aria-labelledby="elements-heading">
        <h2 class="section__heading" id="elements-heading">Semantic Elements</h2>
        <p>No elements were identified.</p>
      </section>`;
  }

  const rows = elements
    .map((el) => {
      const { elementId, tag, name, description, issue, issueId, severity } =
        el;
      const issueBubble = issue
        ? `<a href="#issue-${issueId}" class="bubble bubble--${severity}" aria-label="Related issue ${issueId}">${issueId}</a>`
        : '<span aria-hidden="true">-</span>';

      // Numeric ID for sort (E1 → 1, E12 → 12)
      const sortId = parseInt(elementId.replace(/^E/, ''), 10) || 0;
      const sortTag = escapeHtml(tag ?? '');
      const sortIssue = issue ? (severity ?? 'medium') : 'none';

      return (
        `          <tr id="element-${elementId}" data-sort-id="${sortId}" data-sort-tag="${sortTag}" data-sort-issue="${sortIssue}">\n` +
        `            <td><span class="bubble bubble--neutral" aria-label="${elementId}">${elementId}</span></td>\n` +
        `            <td><code>${escapeHtml(tag ?? '')}</code></td>\n` +
        `            <td>${escapeHtml(name ?? '')}</td>\n` +
        `            <td>${escapeHtml(description ?? '')}</td>\n` +
        `            <td>${issueBubble}</td>\n` +
        `          </tr>`
      );
    })
    .join('\n');

  return `      <section class="section elements-panel" aria-labelledby="elements-heading">
        <div class="section-toolbar">
          <h2 class="section__heading" id="elements-heading">Semantic Elements</h2>
          <button
            class="markers-toggle markers-toggle--inverted"
            id="no-issues-toggle"
            type="button"
            aria-pressed="true"
            aria-controls="elements-table"
          >
            <!-- Eye-open icon: shown when no-issue rows are visible (aria-pressed=false) -->
            <svg class="toggle-icon toggle-icon--visible" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <!-- Eye-closed icon: shown when no-issue rows are hidden (aria-pressed=true) -->
            <svg class="toggle-icon toggle-icon--hidden" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
            <span class="toggle-label">Show all elements</span>
          </button>
        </div>
        <table class="elements-table" id="elements-table" aria-label="Identified elements">
          <thead>
            <tr>
              <th scope="col" data-sort-col="id" aria-sort="none"><button class="sort-btn" aria-label="Sort by ID">ID <span class="sort-icon" aria-hidden="true"></span></button></th>
              <th scope="col" data-sort-col="tag" aria-sort="none"><button class="sort-btn" aria-label="Sort by Tag">Tag <span class="sort-icon" aria-hidden="true"></span></button></th>
              <th scope="col">Name</th>
              <th scope="col">Description</th>
              <th scope="col" data-sort-col="issue" aria-sort="none"><button class="sort-btn" aria-label="Sort by Issue">Issue <span class="sort-icon" aria-hidden="true"></span></button></th>
            </tr>
          </thead>
          <tbody>
${rows}
          </tbody>
        </table>
      </section>`;
}

// ---------------------------------------------------------------------------
// Executive summary HTML builder
// ---------------------------------------------------------------------------
function buildExecutiveSummary(analysis) {
  const keyFindings = analysis.meta?.keyFindings ?? '';

  // Collect issues from elements and flags
  const elementIssues = (analysis.elements ?? []).filter((el) => el.issue);
  const flags = analysis.flags ?? [];

  const total = elementIssues.length + flags.length;
  const flagCount = flags.length;

  // Count by severity across both sources
  const ORDER = ['critical', 'high', 'medium', 'low'];
  const severityCounts = {};

  for (const el of elementIssues) {
    const sev = el.issue?.severity ?? 'medium';
    severityCounts[sev] = (severityCounts[sev] ?? 0) + 1;
  }
  for (const flag of flags) {
    const sev = flag.severity ?? 'medium';
    severityCounts[sev] = (severityCounts[sev] ?? 0) + 1;
  }

  const parts = ORDER.filter((sev) => (severityCounts[sev] ?? 0) > 0).map(
    (sev) => `${severityCounts[sev]} ${sev}`,
  );

  let countPara = '';
  let flagPara = '';

  if (total === 0) {
    countPara = '<p>No accessibility issues were detected.</p>';
  } else {
    const breakdown = parts.join(', ');
    const verb = total !== 1 ? 'were' : 'was';
    countPara = `<p>A total of ${total} issue${total !== 1 ? 's' : ''} ${verb} detected: ${breakdown}.</p>`;
    if (flagCount > 0) {
      const flagVerb = flagCount !== 1 ? 'are' : 'is';
      flagPara = `<p>${flagCount} of these cannot be determined based on the design alone and ${flagVerb} recommended to be manually checked.</p>`;
    }
  }

  return (
    `      <section class="section executive-summary" aria-labelledby="summary-heading">\n` +
    `        <h2 class="section__heading" id="summary-heading">Executive Summary</h2>\n` +
    `        <p>${escapeHtml(keyFindings)}</p>\n` +
    (countPara ? `        ${countPara}\n` : '') +
    (flagPara ? `        ${flagPara}\n` : '') +
    `      </section>`
  );
}

// ---------------------------------------------------------------------------
// Issues panel HTML builder
// ---------------------------------------------------------------------------
function buildIssuesPanel(issueItems) {
  // Sort: Critical → High → Medium
  issueItems.sort((a, b) => {
    const aOrder = SEVERITY_ORDER[a.severity] ?? 99;
    const bOrder = SEVERITY_ORDER[b.severity] ?? 99;
    return aOrder - bOrder;
  });

  if (issueItems.length === 0) {
    return `      <section class="section issues-panel" aria-labelledby="issues-heading">
        <h2 class="section__heading" id="issues-heading">Accessibility Issues</h2>
        <p>No issues were identified.</p>
      </section>`;
  }

  const cards = issueItems.map((item) => buildIssueCard(item)).join('\n\n');

  return `      <section class="section issues-panel" aria-labelledby="issues-heading">
        <h2 class="section__heading" id="issues-heading">Accessibility Issues</h2>

${cards}
      </section>`;
}

function buildIssueCard(item) {
  const { issueId, severity, label, issue } = item;
  const wcagScs = issue.wcag ?? [];
  const wcagLinks = wcagScs
    .map((sc, i) => {
      const slug = WCAG_SLUGS[sc];
      const href = slug
        ? `https://www.w3.org/WAI/WCAG22/Understanding/${slug}`
        : `https://www.w3.org/WAI/WCAG22/Understanding/`;
      const comma =
        i < wcagScs.length - 1 ? `<span aria-hidden="true">,</span>` : '';
      return (
        `            <li>\n` +
        `              <a\n` +
        `                href="${href}"\n` +
        `                target="_blank"\n` +
        `                rel="noopener noreferrer"\n` +
        `                >SC ${sc}</a\n` +
        `              >${comma}\n` +
        `            </li>`
      );
    })
    .join('\n');

  return (
    `        <article class="issue-card issue-card--${severity}" id="issue-${issueId}" aria-labelledby="issue-${issueId}-title">\n` +
    `          <header class="issue-card__header">\n` +
    `            <span class="issue-card__badge badge--${severity}">${issueId}</span>\n` +
    `            <h3 class="issue-card__title" id="issue-${issueId}-title">${escapeHtml(issue.title)}</h3>\n` +
    `            <div class="issue-card__wcag-wrapper">\n` +
    `              <span class="issue-card__wcag-label" aria-hidden="true">WCAG:</span>\n` +
    `              <ul class="issue-card__wcag" aria-label="WCAG criteria">\n` +
    `${wcagLinks}\n` +
    `              </ul>\n` +
    `            </div>\n` +
    `          </header>\n` +
    `          <div class="issue-card__body">\n` +
    `            <p class="issue-card__element-label"><strong>Element:</strong> ${escapeHtml(label ?? item.name ?? item.tag ?? '')}</p>\n` +
    `            <p>${escapeHtml(issue.description)}</p>\n` +
    `            <div class="issue-card__fix"><strong>Fix:</strong> ${escapeHtml(issue.fix)}</div>\n` +
    `          </div>\n` +
    `        </article>`
  );
}

// ---------------------------------------------------------------------------
// Meta panel HTML builder
// ---------------------------------------------------------------------------
function buildMetaPanel(analysis) {
  const meta = analysis.meta ?? {};
  const pad = (n, w = 2) => String(n).padStart(w, '0');

  // Date from timestampEnd (fall back to now)
  const ts = meta.timestampEnd ? new Date(meta.timestampEnd) : new Date();
  const date =
    `${pad(ts.getDate())}/${pad(ts.getMonth() + 1)}/${ts.getFullYear()} ` +
    `${pad(ts.getHours())}:${pad(ts.getMinutes())}:${pad(ts.getSeconds())}`;

  // Runtime in HH:MM:SS:cs (centiseconds)
  let runtime = 'N/A';
  if (meta.timestampStart && meta.timestampEnd) {
    const diff = meta.timestampEnd - meta.timestampStart;
    const cs = Math.floor((diff % 1000) / 10);
    const totalSec = Math.floor(diff / 1000);
    const sec = totalSec % 60;
    const totalMin = Math.floor(totalSec / 60);
    const min = totalMin % 60;
    const hr = Math.floor(totalMin / 60);
    runtime = `${pad(hr)}:${pad(min)}:${pad(sec)}:${pad(cs)}`;
  }

  const totalElements = (analysis.elements ?? []).length;
  const totalIssues =
    (analysis.elements ?? []).filter((el) => el.issue).length +
    (analysis.flags ?? []).length;

  const items = [
    ['Date', escapeHtml(date)],
    ['Filename', escapeHtml(meta.fileName ?? '')],
    ['Analyst', escapeHtml(meta.modelName ?? '')],
    ['Prompt', escapeHtml(meta.prompt ?? '')],
    ['Runtime', escapeHtml(runtime)],
    ['Total elements', String(totalElements)],
    ['Total issues', String(totalIssues)],
  ];

  const listItems = items
    .map(
      ([label, value]) =>
        `          <li><strong>${label}:</strong> ${value}</li>`,
    )
    .join('\n');

  return (
    `      <section class="section meta-panel" aria-labelledby="meta-heading">\n` +
    `        <h2 class="section__heading" id="meta-heading">Meta</h2>\n` +
    `        <ul class="meta-list">\n` +
    `${listItems}\n` +
    `        </ul>\n` +
    `      </section>`
  );
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const args = parseArgs(process.argv);
assertArg(args, 'json');
assertArg(args, 'image');
assertArg(args, 'output');
assertArg(args, 'template-dir');

const jsonPath = resolve(args['json']);
const imagePath = resolve(args['image']);
const outputDir = resolve(args['output']);
const templateDir = resolve(args['template-dir']);

const htmlTemplatePath = join(templateDir, 'report.template.html');
const cssTemplatePath = join(templateDir, 'report.template.css');

// Read inputs
const analysis = JSON.parse(readFileSync(jsonPath, 'utf8'));
let htmlTemplate = readFileSync(htmlTemplatePath, 'utf8');
const cssTemplate = readFileSync(cssTemplatePath, 'utf8');

// Assign elementIds (E1, E2, …) to each element in the input array
(analysis.elements ?? []).forEach((el, i) => {
  el.elementId = `E${i + 1}`;
});

const issueItems = normaliseIssueData(analysis);

// Calculate values
const filename = analysis.filename ?? basename(imagePath);
const { width, height } = getImageDimensions(imagePath);
const aspectRatio = `${((height / width) * 100).toFixed(2)}%`;
const executiveSummaryHtml = buildExecutiveSummary(analysis);
const bubblesHtml = buildBubbles(analysis);
const elementsPanelHtml = buildElementsPanel(analysis);
const issuesPanelHtml = buildIssuesPanel(issueItems);
const metaPanelHtml = buildMetaPanel(analysis);

// Apply template replacements
htmlTemplate = htmlTemplate
  .replaceAll('{{FILENAME}}', escapeHtml(filename))
  .replace('{{ASPECT_RATIO}}', aspectRatio)
  .replace('{{EXECUTIVE_SUMMARY}}', executiveSummaryHtml)
  .replace('{{BUBBLES}}', bubblesHtml)
  .replace('{{ELEMENTS_PANEL}}', elementsPanelHtml)
  .replace('{{ISSUES_PANEL}}', issuesPanelHtml)
  .replace('{{META_PANEL}}', metaPanelHtml)
  .replace('href="a11y-design-review-report.template.css"', 'href="style.css"');

// Ensure output directory exists
mkdirSync(outputDir, { recursive: true });

// Write output files
const htmlOutPath = join(outputDir, 'index.html');
const cssOutPath = join(outputDir, 'style.css');
const imageOutPath = join(outputDir, 'design.jpg');

writeFileSync(htmlOutPath, htmlTemplate, 'utf8');
writeFileSync(cssOutPath, cssTemplate, 'utf8');
convertToJpeg(imagePath, imageOutPath);

// Confirm
console.log(
  JSON.stringify(
    { html: htmlOutPath, css: cssOutPath, image: imageOutPath },
    null,
    2,
  ),
);
