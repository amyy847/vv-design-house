// Turns the logo artwork into two transparent masks so CSS can colour it for any background:
//   logo-main.webp    the dark lettering ("Vanessa Victor")
//   logo-accent.webp  the light lettering (the curved "design house")
// Usage: node scripts/make-logo.mjs path/to/logo.(png|avif|webp)

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const input = process.argv[2] || path.join(root, 'vvlogo.avif');
const OUT = path.join(root, 'site/assets/img');
const WIDTH = 1200;

const trimmed = await sharp(input).ensureAlpha().trim({ threshold: 1 }).toBuffer();
const { data, info } = await sharp(trimmed)
  .resize({ width: WIDTH })
  .extend({ top: 4, bottom: 4, left: 4, right: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .raw()
  .toBuffer({ resolveWithObject: true });

const { width, height } = info;
const main = Buffer.alloc(width * height * 2);
const accent = Buffer.alloc(width * height * 2);
for (let i = 0, j = 0; i < data.length; i += 4, j += 2) {
  const lum = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
  const a = data[i + 3];
  // Dark pixels go to the main mask, light ones to the accent (sharp cut so neither leaves a ghost).
  const light = Math.min(1, Math.max(0, (lum - 0.35) / 0.3));
  main[j + 1] = Math.round(a * (1 - light)); // grey + alpha; only alpha matters for a CSS mask
  accent[j + 1] = Math.round(a * light);
}
const save = (buf, name) =>
  sharp(buf, { raw: { width, height, channels: 2 } }).webp({ quality: 90, alphaQuality: 90 }).toFile(path.join(OUT, name));
await save(main, 'logo-main.webp');
await save(accent, 'logo-accent.webp');
console.log(`logo ${width}x${height} (aspect-ratio ${width} / ${height})`);
