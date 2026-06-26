import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  prepareObjectAnnotationData,
  prepareIssueAnnotationData,
  renderDesignAnnotations,
} from './design-helpers.mjs';

// ── prepareObjectAnnotationData ───────────────────────────────────────────────

test('prepareObjectAnnotationData: derives heading prefix and type from he_ id', () => {
  const [item] = prepareObjectAnnotationData([
    { id: 'he_001', tag: 'h1', name: 'Welcome', boundingBox: { x: 0, y: 0, width: 0.5, height: 0.1 } },
  ]);
  assert.equal(item.visualIDPrefix, 'he');
  assert.equal(item.type, 'heading');
});

test('prepareObjectAnnotationData: derives landmark prefix and type from lm_ id', () => {
  const [item] = prepareObjectAnnotationData([
    { id: 'lm_001', tag: 'nav', name: 'Primary nav', boundingBox: { x: 0, y: 0, width: 1, height: 0.1 } },
  ]);
  assert.equal(item.visualIDPrefix, 'lm');
  assert.equal(item.type, 'landmark');
});

test('prepareObjectAnnotationData: derives ui-component prefix and type from ui_ id', () => {
  const [item] = prepareObjectAnnotationData([
    { id: 'ui_001', tag: 'button', name: 'Submit', boundingBox: { x: 0, y: 0, width: 0.1, height: 0.05 } },
  ]);
  assert.equal(item.visualIDPrefix, 'ui');
  assert.equal(item.type, 'ui-component');
});

test('prepareObjectAnnotationData: maps tag to infoText and name to detailText', () => {
  const [item] = prepareObjectAnnotationData([
    { id: 'he_001', tag: 'h2', name: 'Section title', boundingBox: { x: 0, y: 0, width: 0.3, height: 0.05 } },
  ]);
  assert.equal(item.infoText, 'h2');
  assert.equal(item.detailText, 'Section title');
});

test('prepareObjectAnnotationData: detailText falls back to empty string when name is absent', () => {
  const [item] = prepareObjectAnnotationData([
    { id: 'lm_001', tag: 'main', boundingBox: { x: 0, y: 0, width: 1, height: 1 } },
  ]);
  assert.equal(item.detailText, '');
});

test('prepareObjectAnnotationData: boundingBox values are CSS % strings with d=1.01 expansion', () => {
  const [item] = prepareObjectAnnotationData([
    { id: 'he_001', tag: 'h1', name: '', boundingBox: { x: 0.1, y: 0.2, width: 0.3, height: 0.4 } },
  ]);
  // d=1.01: width=30.3%, height=40.4%, x=9.85%, y=19.8%
  assert.equal(item.boundingBox.width, '30.3%');
  assert.equal(item.boundingBox.height, '40.4%');
  assert.equal(item.boundingBox.x, '9.85%');
  assert.equal(item.boundingBox.y, '19.8%');
});

// ── prepareIssueAnnotationData ────────────────────────────────────────────────

test('prepareIssueAnnotationData: maps critical severity to cr prefix and issue-cr type', () => {
  const [item] = prepareIssueAnnotationData([
    { severity: 'critical', wcag: ['1.4.3'], title: 'Low contrast', boundingBox: { x: 0, y: 0, width: 0.1, height: 0.05 } },
  ]);
  assert.equal(item.visualIDPrefix, 'cr');
  assert.equal(item.type, 'issue-cr');
});

test('prepareIssueAnnotationData: maps high severity to hi prefix and issue-hi type', () => {
  const [item] = prepareIssueAnnotationData([
    { severity: 'high', wcag: [], title: 'Missing label', boundingBox: { x: 0, y: 0, width: 0.1, height: 0.05 } },
  ]);
  assert.equal(item.visualIDPrefix, 'hi');
  assert.equal(item.type, 'issue-hi');
});

test('prepareIssueAnnotationData: maps medium severity to md prefix and issue-md type', () => {
  const [item] = prepareIssueAnnotationData([
    { severity: 'medium', wcag: [], title: 'Poor focus order', boundingBox: { x: 0, y: 0, width: 0.1, height: 0.05 } },
  ]);
  assert.equal(item.visualIDPrefix, 'md');
  assert.equal(item.type, 'issue-md');
});

test('prepareIssueAnnotationData: maps low severity to lo prefix and issue-lo type', () => {
  const [item] = prepareIssueAnnotationData([
    { severity: 'low', wcag: [], title: 'Minor issue', boundingBox: { x: 0, y: 0, width: 0.1, height: 0.05 } },
  ]);
  assert.equal(item.visualIDPrefix, 'lo');
  assert.equal(item.type, 'issue-lo');
});

test('prepareIssueAnnotationData: joins wcag array into infoText', () => {
  const [item] = prepareIssueAnnotationData([
    { severity: 'high', wcag: ['2.4.6', '4.1.2'], title: 'Inaccessible name', boundingBox: { x: 0, y: 0, width: 0.1, height: 0.05 } },
  ]);
  assert.equal(item.infoText, '2.4.6, 4.1.2');
});

test('prepareIssueAnnotationData: maps title to detailText', () => {
  const [item] = prepareIssueAnnotationData([
    { severity: 'critical', wcag: ['1.4.3'], title: 'Low colour contrast', boundingBox: { x: 0, y: 0, width: 0.1, height: 0.05 } },
  ]);
  assert.equal(item.detailText, 'Low colour contrast');
});

test('prepareIssueAnnotationData: uses object boundingBox when objectID matches', () => {
  const objects = [{ id: 'he_001', boundingBox: { x: 0.5, y: 0.5, width: 0.2, height: 0.1 } }];
  const [item] = prepareIssueAnnotationData(
    [{ severity: 'high', objectID: 'he_001', wcag: [], title: 'Issue', boundingBox: { x: 0, y: 0, width: 0.1, height: 0.05 } }],
    objects,
  );
  assert.equal(item.boundingBox.width, '20.2%');
});

test('prepareIssueAnnotationData: computes staggered boundingBox when objectID has no match', () => {
  const [item] = prepareIssueAnnotationData(
    [{ severity: 'low', objectID: 'he_999', wcag: [], title: 'Issue' }],
    [],
  );
  assert.equal(item.boundingBox.x, '-0.02%');
  assert.equal(item.boundingBox.y, '-0.02%');
  assert.equal(item.boundingBox.width, '4.04%');
  assert.equal(item.boundingBox.height, '4.04%');
});

test('prepareIssueAnnotationData: computes staggered boundingBox when no objectID', () => {
  const [item] = prepareIssueAnnotationData([
    { severity: 'medium', wcag: [], title: 'Issue' },
  ]);
  assert.equal(item.boundingBox.x, '-0.02%');
  assert.equal(item.boundingBox.y, '-0.02%');
  assert.equal(item.boundingBox.width, '4.04%');
  assert.equal(item.boundingBox.height, '4.04%');
});

test('prepareIssueAnnotationData: second unpositioned item is offset horizontally', () => {
  const [, second] = prepareIssueAnnotationData([
    { severity: 'medium', wcag: [], title: 'First' },
    { severity: 'low', wcag: [], title: 'Second' },
  ]);
  assert.equal(second.boundingBox.x, '4.48%');
});

// ── renderDesignAnnotations ───────────────────────────────────────────────────

const makeItem = (overrides = {}) => ({
  visualIDPrefix: 'he',
  type: 'heading',
  boundingBox: { x: '10%', y: '20%', width: '30%', height: '5%' },
  infoText: 'h1',
  detailText: 'Welcome',
  ...overrides,
});

test('renderDesignAnnotations: bubble label is lowercase prefix with hyphen and 2-digit zero-padded index', () => {
  const html = renderDesignAnnotations([makeItem()]);
  assert.match(html, /<span class="bubble object-annotation__bubble">he-01<\/span>/);
});

test('renderDesignAnnotations: bubble index increments across items', () => {
  const html = renderDesignAnnotations([makeItem(), makeItem()]);
  assert.match(html, />he-01<\/span>/);
  assert.match(html, />he-02<\/span>/);
});

test('renderDesignAnnotations: aria-label uses uppercase prefix with hyphen and semicolon separators', () => {
  const html = renderDesignAnnotations([makeItem()]);
  assert.match(html, /aria-label="HE-01; h1; Welcome"/);
});

test('renderDesignAnnotations: CSS class uses object-annotation and type modifier', () => {
  const html = renderDesignAnnotations([makeItem()]);
  assert.match(html, /class="object-annotation object-annotation--heading"/);
});

test('renderDesignAnnotations: CSS class uses issue type modifier for issues', () => {
  const html = renderDesignAnnotations([makeItem({ visualIDPrefix: 'cr', type: 'issue-cr' })]);
  assert.match(html, /class="object-annotation object-annotation--issue-cr"/);
});

test('renderDesignAnnotations: style uses boundingBox values as CSS custom properties', () => {
  const html = renderDesignAnnotations([makeItem()]);
  assert.match(html, /style="--left: 10%; --top: 20%; --width: 30%; --height: 5%;"/);
});

test('renderDesignAnnotations: escapes HTML in infoText within aria-label', () => {
  const html = renderDesignAnnotations([makeItem({ infoText: '<h1>', detailText: 'Title' })]);
  assert.match(html, /aria-label="HE-01; &lt;h1&gt;; Title"/);
});

test('renderDesignAnnotations: escapes HTML in detailText within aria-label', () => {
  const html = renderDesignAnnotations([makeItem({ infoText: 'h1', detailText: 'A & B "quoted"' })]);
  assert.match(html, /aria-label="HE-01; h1; A &amp; B &quot;quoted&quot;"/);
});

test('renderDesignAnnotations: returns empty string for empty items array', () => {
  assert.equal(renderDesignAnnotations([]), '');
});

test('renderDesignAnnotations: null boundingBox renders with flow modifier class and no style', () => {
  const html = renderDesignAnnotations([makeItem({ boundingBox: null })]);
  assert.match(html, /class="object-annotation object-annotation--heading object-annotation--flow"/);
  assert.doesNotMatch(html, /style="/);
});

test('renderDesignAnnotations: null boundingBox renders without object-annotation__box span', () => {
  const html = renderDesignAnnotations([makeItem({ boundingBox: null })]);
  assert.doesNotMatch(html, /object-annotation__box/);
});
