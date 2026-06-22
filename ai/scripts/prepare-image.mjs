#!/usr/bin/env node

import { existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import sharp from 'sharp';
import { parseArgs, assertArg } from './helpers.mjs';

/**
 * Prepare the design image for analysis and reporting.
 *
 * Reads any sharp-supported image (png, jpg, webp, tiff, gif, svg, avif),
 * resizes it so that neither dimension exceeds 1440px (never enlarging smaller
 * images), encodes it to WebP (quality 80), and writes it as `design.webp` in
 * the destination directory. Using `fit: 'inside'` mirrors the behaviour of
 * `sips -Z 1440`, which constrains the longest side — not just the width.
 *
 * Prints the final pixel dimensions as JSON to stdout, e.g.
 *   {"width":1440,"height":1153}
 * These are the canvas size for all bounding box coordinates.
 *
 * Usage:
 *   node ai/scripts/prepare-image.mjs --src <image-path> --dest <output-dir>
 */

const MAX_SIZE = 1440;
const WEBP_QUALITY = 80;

const args = parseArgs(process.argv);
assertArg(args, 'src');
assertArg(args, 'dest');

const srcPath = resolve(args.src);
const destDir = resolve(args.dest);

if (!existsSync(srcPath)) {
  console.error('Error: source image not found');
  process.exit(1);
}

mkdirSync(destDir, { recursive: true });

const outPath = join(destDir, 'design.webp');

try {
  const info = await sharp(srcPath)
    .resize({
      width: MAX_SIZE,
      withoutEnlargement: true,
    })
    .webp({ quality: WEBP_QUALITY })
    .toFile(outPath);

  console.log(JSON.stringify({ width: info.width, height: info.height }));
} catch (error) {
  console.error(`Error: failed to process image — ${error.message}`);
  process.exit(1);
}
