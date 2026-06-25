#!/usr/bin/env node

export const OBJECT_ID_PREFIXES = {
  heading: 'he_',
  landmark: 'lm_',
  uiComponent: 'ui_',
};

// ---------------------------------------------------------------------------
// WCAG SC → Understanding slug lookup table (WCAG 2.2)
// ---------------------------------------------------------------------------
export const WCAG_SLUGS = {
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
export const ISSUE_SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

export const ISSUE_PREFIX = {
  critical: 'C',
  high: 'H',
  medium: 'M',
  low: 'L',
};

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
            : '';
        containsCell = `\n            <td>${bubbles}</td>`;
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
function buildIssueCard({ issueId, severity, label, issue }) {
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
    `            <p class="issue-card__element-label"><strong>Element:</strong> ${escapeHtml(label ?? '')}</p>\n` +
    `            <p>${escapeHtml(issue.description)}</p>\n` +
    `            <div class="issue-card__fix"><strong>Fix:</strong> ${escapeHtml(issue.fix)}</div>\n` +
    `          </div>\n` +
    `        </article>`
  );
}

export function buildIssueCards(issues, objects = []) {
  if (!issues.length) return '';
  const objectMap = new Map(
    objects.filter((o) => o.id).map((o) => [o.id, o]),
  );
  const sorted = [...issues].sort(
    (a, b) =>
      (ISSUE_SEVERITY_ORDER[a.severity] ?? 99) -
      (ISSUE_SEVERITY_ORDER[b.severity] ?? 99),
  );
  const counters = {};
  const cards = sorted
    .map((issue) => {
      const { severity, objectID } = issue;
      const prefix = ISSUE_PREFIX[severity] ?? 'I';
      counters[severity] = (counters[severity] ?? 0) + 1;
      const issueId = `${prefix}${counters[severity]}`;
      const relatedObject = objectID ? objectMap.get(objectID) : null;
      const label = relatedObject?.name ?? relatedObject?.tag ?? null;
      return buildIssueCard({ issueId, severity, label, issue });
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
