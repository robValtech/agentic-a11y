#!/usr/bin/env node

import { escapeHtml, buildVisualID } from './helpers.mjs';

const OBJECT_ANNOTATION_TYPE_MAP = {
  he_: { visualIDPrefix: 'he', type: 'heading' },
  lm_: { visualIDPrefix: 'lm', type: 'landmark' },
  ui_: { visualIDPrefix: 'ui', type: 'ui-component' },
};

const ISSUE_ANNOTATION_TYPE_MAP = {
  critical: { visualIDPrefix: 'cr', type: 'issue-cr' },
  high: { visualIDPrefix: 'hi', type: 'issue-hi' },
  medium: { visualIDPrefix: 'md', type: 'issue-md' },
  low: { visualIDPrefix: 'lo', type: 'issue-lo' },
};

const STAGGER_SIZE = 0.04;
const STAGGER_GAP = 0.005;
const STAGGER_Y = 0;

function toPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return '0%';
  }
  return `${Number((number * 100).toFixed(3))}%`;
}

function toBoundingBoxCss(boundingBox = {}) {
  const d = 1.01;
  return {
    x: toPercent(boundingBox.x + boundingBox.width * (1 - d) * 0.5),
    y: toPercent(boundingBox.y + boundingBox.height * (1 - d) * 0.5),
    width: toPercent(boundingBox.width * d),
    height: toPercent(boundingBox.height * d),
  };
}

export function prepareObjectAnnotationData(objects) {
  return objects.map((object) => {
    const idPrefix = Object.keys(OBJECT_ANNOTATION_TYPE_MAP).find((prefix) =>
      object.id?.startsWith(prefix),
    );
    const { visualIDPrefix, type } = OBJECT_ANNOTATION_TYPE_MAP[idPrefix] ?? {};
    return {
      visualIDPrefix,
      type,
      boundingBox: toBoundingBoxCss(object.boundingBox),
      infoText: object.tag ?? '',
      detailText: object.name ?? '',
    };
  });
}

export function prepareIssueAnnotationData(issues, objects = []) {
  const objectMap = new Map(objects.filter((o) => o.id).map((o) => [o.id, o]));
  let unpositionedCount = 0;
  return issues.map((issue) => {
    const { severity, objectID, wcag, title } = issue;
    const { visualIDPrefix, type } = ISSUE_ANNOTATION_TYPE_MAP[severity] ?? {};
    const resolvedBoundingBox = objectID
      ? (objectMap.get(objectID)?.boundingBox ?? null)
      : null;
    const boundingBox = resolvedBoundingBox
      ? toBoundingBoxCss(resolvedBoundingBox)
      : toBoundingBoxCss({
          x: unpositionedCount++ * (STAGGER_SIZE + STAGGER_GAP),
          y: STAGGER_Y,
          width: STAGGER_SIZE,
          height: STAGGER_SIZE,
        });
    return {
      visualIDPrefix,
      type,
      boundingBox,
      infoText: (wcag ?? []).join(', '),
      detailText: title ?? '',
    };
  });
}

export function renderDesignAnnotations(items) {
  return items
    .map((item, i) => {
      const { visualIDPrefix, type, boundingBox, infoText, detailText } = item;
      const visualID = buildVisualID(visualIDPrefix, i + 1);
      const bubbleLabel = visualID;
      const ariaLabel = `${visualID.toUpperCase()}; ${escapeHtml(infoText)}; ${escapeHtml(detailText)}`;
      const className = `object-annotation object-annotation--${type}`;

      if (!boundingBox) {
        return (
          `          <div class="${className} object-annotation--flow" aria-label="${ariaLabel}">\n` +
          `            <span class="bubble object-annotation__bubble">${bubbleLabel}</span>\n` +
          `          </div>`
        );
      }

      const style = `--left: ${boundingBox.x}; --top: ${boundingBox.y}; --width: ${boundingBox.width}; --height: ${boundingBox.height};`;

      return (
        `          <div class="${className}" style="${style}" aria-label="${ariaLabel}">\n` +
        `            <span class="object-annotation__box" aria-hidden="true">&nbsp;</span>\n` +
        `            <span class="bubble object-annotation__bubble">${bubbleLabel}</span>\n` +
        `          </div>`
      );
    })
    .join('\n');
}
