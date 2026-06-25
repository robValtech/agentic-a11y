#!/usr/bin/env node

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

export function buildElementAnnotations(
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
