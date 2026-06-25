#!/usr/bin/env node

import {
  WCAG_SLUGS,
  WCAG_SC_LEVELS,
  ISSUE_SEVERITY_ORDER,
  ISSUE_PREFIX,
  CONFIDENCE_LEVELS,
} from './constants.mjs';

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------
export function parseArgs(argv = []) {
  const args = {};
  for (let index = 2; index < argv.length; index++) {
    const value = argv[index];
    if (value.startsWith('--')) {
      const key = value.slice(2);
      const next = argv[index + 1];
      if (!next || next.startsWith('--')) {
        args[key] = true;
      } else {
        args[key] = next;
        index++;
      }
    }
  }
  return args;
}

export function assertArg(args, name, isQuiet) {
  if (!args[name]) {
    if (!isQuiet) {
      console.error(`Error: missing required argument --${name}`);
      process.exit(1);
    } else {
      console.info(`Info: missing argument --${name}`);
      return false;
    }
    return true;
  }
}

export const LANDMARK_TAGS = new Set([
  'banner',
  'complementary',
  'contentinfo',
  'form',
  'main',
  'navigation',
  'region',
  'section',
  'search',
]);

// ---------------------------------------------------------------------------
// HTML escaping
// ---------------------------------------------------------------------------
export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---------------------------------------------------------------------------
// Confidence level lookup
// ---------------------------------------------------------------------------
export function getConfidenceLevelObj(value) {
  const levels = Object.values(CONFIDENCE_LEVELS);
  return levels.find((lvl) => value <= lvl.max) ?? levels[0];
}

// ---------------------------------------------------------------------------
// Table row builder
// Generates joined <tr> HTML strings for landmark and component tables.
//
// Options:
//   prefix      — ID prefix string, e.g. 'L' → L1, L2, …  (default: 'L')
//   rowIdPrefix — HTML id attribute prefix, e.g. 'landmark' → id="landmark-L1"
//   hasIssueCol — whether to render the 5th Issue <td>  (default: false)
// ---------------------------------------------------------------------------
export function buildTableRows(
  elements,
  {
    prefix = '',
    rowIdPrefix = '',
    hasIssueCol = false,
    containsIdMap = null,
  } = {},
) {
  return elements
    .map((el, i) => {
      const id = `${prefix}${i + 1}`;
      const { tag, name, description, issue, issueId, severity, contains } = el;
      const sortTag = escapeHtml(tag ?? '');
      const sortIssue = issue ? (severity ?? 'medium') : 'none';

      let issueCell = '';
      if (hasIssueCol) {
        const issueBubble = issue
          ? `<a href="#issue-${issueId}" class="bubble bubble--${severity}" aria-label="Related issue ${issueId}">${issueId}</a>`
          : '<span aria-hidden="true">-</span>';
        issueCell = `\n            <td>${issueBubble}</td>`;
      }

      let containsCell = '';
      if (containsIdMap !== null) {
        const bubbles =
          Array.isArray(contains) && contains.length > 0
            ? contains
                .map((schemaId) => {
                  const visualId = containsIdMap.get(schemaId);
                  return visualId
                    ? `<span class="bubble" aria-label="${visualId}">${visualId}</span>`
                    : '';
                })
                .filter(Boolean)
                .join(' ')
            : '-';
        containsCell = `\n            <td><span class="bubble-container">${bubbles}</span></td>`;
      }

      return (
        `          <tr id="${rowIdPrefix}-${id}" data-sort-id="${i + 1}" data-sort-tag="${sortTag}" data-sort-issue="${sortIssue}">\n` +
        `            <td><span class="bubble" aria-label="${id}">${id}</span></td>\n` +
        `            <td><code class="inline-code">${escapeHtml(tag ?? '')}</code></td>\n` +
        `            <td>${escapeHtml(name ?? '')}</td>\n` +
        `            <td>${escapeHtml(description ?? '')}</td>${issueCell}${containsCell}\n` +
        `          </tr>`
      );
    })
    .join('\n');
}

function toPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return '0%';
  }
  return `${Number((number * 100).toFixed(3))}%`;
}

// TODO: Make defensive
function getObjectIDPrefix(objectID) {
  return objectID.substring(0, objectID.indexOf('_') + 1);
}

// TODO: Make defensive
export function getObjectsByObjectIdPrefix(objects, prefix) {
  return objects.filter((object) => getObjectIDPrefix(object.id) === prefix);
}

export function buildObjectAnnotations(
  elements,
  { prefix = '', typeLabel = '' } = {},
) {
  return elements
    .map((element, index) => {
      const id = `${prefix}${index + 1}`;
      const { boundingBox = {}, name } = element;

      const d = 1.01;
      const width = toPercent(boundingBox.width * d);
      const height = toPercent(boundingBox.height * d);
      const top = toPercent(boundingBox.y + boundingBox.height * (1 - d) * 0.5);
      const left = toPercent(boundingBox.x + boundingBox.width * (1 - d) * 0.5);

      const style = [
        `left: ${left}`,
        `top: ${top}`,
        `width: ${width}`,
        `height: ${height}`,
      ].join('; ');

      const className = `element-annotation element-annotation--${typeLabel.toLowerCase()}`;

      return (
        `          <div class="${className}" style="${style}" aria-label="${escapeHtml(`${typeLabel} ${id}: ${name ?? ''}, ${element.tag}`)}">\n` +
        `            <span class="bubble" aria-hidden="true">${id}</span>\n` +
        `          </div>`
      );
    })
    .join('\n');
}

// ---------------------------------------------------------------------------
// Issue card builder
// ---------------------------------------------------------------------------
function buildIssueCard({ issueId, severity, confidenceScore, label, issue }) {
  const wcagScs = issue.wcag ?? [];
  const wcagLinks = wcagScs
    .map((sc, i) => {
      const slug = WCAG_SLUGS[sc];
      const level = WCAG_SC_LEVELS[sc];
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
        `                >SC ${sc}(${level})</a\n` +
        `              >${comma}\n` +
        `            </li>`
      );
    })
    .join('\n');

  const confidenceLevelObj = getConfidenceLevelObj(confidenceScore);
  const confidenceLabel = confidenceLevelObj.label;

  return (
    `        <article class="issue-card issue-card--${severity}" id="issue-${issueId}" aria-labelledby="issue-${issueId}-title">\n` +
    `          <header class="issue-card__header">\n` +
    `            <div>\n` +
    `              <span class="issue-card__badge badge--${severity}">${issueId}</span>\n` +
    `              <h3 class="issue-card__title" id="issue-${issueId}-title">${escapeHtml(issue.title)}</h3>\n` +
    `            </div>\n` +
    `            <div>\n` +
    `              <div class="issue-card__detail">\n` +
    `                <span class="issue-card__detail-title">Severity:</span>\n` +
    `                <span class="issue-card__detail-value">${severity}</span>\n` +
    `              </div>\n` +
    `              <div class="issue-card__detail">\n` +
    `                <span class="issue-card__detail-title">Confidence:</span>\n` +
    `                <span class="issue-card__detail-value">${confidenceLabel}</span>\n` +
    `              </div>\n` +
    `              <div class="issue-card__detail">\n` +
    `                <span class="issue-card__detail-title" aria-hidden="true">WCAG:</span>\n` +
    `                <ul class="issue-card__detail-value" aria-label="WCAG criteria">\n` +
    `${wcagLinks}\n` +
    `                </ul>\n` +
    `              </div>\n` +
    `            <div>\n` +
    `          </header>\n` +
    `          <div class="issue-card__body">\n` +
    `            <p class="issue-card__element-label"><strong>Element:</strong> ${escapeHtml(label ?? '-')}</p>\n` +
    `            <p>${escapeHtml(issue.description)}</p>\n` +
    `            <div class="issue-card__fix"><strong>Fix:</strong> ${escapeHtml(issue.fix)}</div>\n` +
    `          </div>\n` +
    `        </article>`
  );
}

export function buildIssueCards(issues, objects = []) {
  if (!issues.length) return '';
  const objectMap = new Map(objects.filter((o) => o.id).map((o) => [o.id, o]));
  const sorted = [...issues].sort((a, b) => {
    const severityDiff =
      (ISSUE_SEVERITY_ORDER[a.severity] ?? 99) -
      (ISSUE_SEVERITY_ORDER[b.severity] ?? 99);
    if (severityDiff !== 0) return severityDiff;
    return (b.confidence?.level ?? 0) - (a.confidence?.level ?? 0);
  });
  const counters = {};
  const cards = sorted
    .map((issue) => {
      const { severity, confidence, objectID } = issue;
      const prefix = ISSUE_PREFIX[severity] ?? 'I';
      counters[severity] = (counters[severity] ?? 0) + 1;
      const confidenceScore = confidence.level;
      const issueId = `${prefix}${counters[severity]}`;
      const relatedObject = objectID ? objectMap.get(objectID) : null;
      const label = relatedObject?.name ?? relatedObject?.tag ?? null;
      return buildIssueCard({
        issueId,
        severity,
        confidenceScore,
        label,
        issue,
      });
    })
    .join('\n');
  return `      <div class="issue-cards">\n${cards}\n      </div>`;
}

// ---------------------------------------------------------------------------
// Get a human readable date based on a timestamp
// ---------------------------------------------------------------------------
export function getFormattedDate(timestamp) {
  const pad = (n, w = 2) => String(n).padStart(w, '0');
  const ts = timestamp ? new Date(timestamp) : new Date();
  const formattedDate =
    `${pad(ts.getDate())}/${pad(ts.getMonth() + 1)}/${ts.getFullYear()} ` +
    `${pad(ts.getHours())}:${pad(ts.getMinutes())}:${pad(ts.getSeconds())}`;
  return formattedDate;
}
