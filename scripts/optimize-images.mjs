// Converts original photos to WebP and records them in projects.json.
//
//   photos-src/<project-slug>/*.jpg   ->  site/assets/img/projects/<slug>/01.webp (2000px) + 01-sm.webp (800px)
//   photos-src/_site/*.jpg            ->  site/assets/img/site/<name>.webp + <name>-sm.webp
//
// Photos are ordered by file name (1, 2, 10 sort naturally). The first photo is the project cover.
// Usage: npm run images          (only converts new or changed photos)
//        npm run images:force    (re-converts everything)

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(root, 'photos-src');
const OUT_PROJECTS = path.join(root, 'site/assets/img/projects');
const OUT_SITE = path.join(root, 'site/assets/img/site');
const DATA = path.join(root, 'site/data/projects.json');

const SIZES = [
  { suffix: '', width: 2000, quality: 80 },
  { suffix: '-sm', width: 800, quality: 76 },
];
const INPUT = /\.(jpe?g|png|webp|tiff?|avif)$/i;
const force = process.argv.includes('--force');

const byName = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

async function exists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

async function isFresh(src, out) {
  if (force || !(await exists(out))) return false;
  const [s, o] = await Promise.all([fs.stat(src), fs.stat(out)]);
  return o.mtimeMs >= s.mtimeMs;
}

// Writes both sizes of one photo and returns the large image's dimensions.
async function convert(src, outDir, name) {
  for (const { suffix, width, quality } of SIZES) {
    const out = path.join(outDir, `${name}${suffix}.webp`);
    if (await isFresh(src, out)) continue;
    await sharp(src)
      .rotate() // respect camera orientation
      .resize({ width, height: width, fit: 'inside', withoutEnlargement: true })
      .webp({ quality, effort: 5 })
      .toFile(out);
  }
  const { width, height } = await sharp(path.join(outDir, `${name}.webp`)).metadata();
  return { w: width, h: height };
}

async function listPhotos(dir) {
  const files = (await fs.readdir(dir)).filter((f) => INPUT.test(f)).sort(byName);
  return files.map((f) => path.join(dir, f));
}

// Removes old outputs (e.g. after deleting a photo) so the folder matches the source.
async function prune(outDir, keep) {
  for (const f of await fs.readdir(outDir)) {
    const base = f.replace(/(-sm)?\.webp$/, '');
    if (f.endsWith('.webp') && !keep.has(base)) await fs.rm(path.join(outDir, f));
  }
}

async function main() {
  if (!(await exists(SRC))) {
    console.error(`No photos-src folder found. Create photos-src/<project-slug>/ and add photos.`);
    process.exit(1);
  }
  const data = JSON.parse(await fs.readFile(DATA, 'utf8'));
  const slugs = new Set(data.projects.map((p) => p.slug));
  const folders = (await fs.readdir(SRC, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name);

  // Site-wide images (hero, portrait…) keep their own file names.
  if (folders.includes('_site')) {
    await fs.mkdir(OUT_SITE, { recursive: true });
    for (const src of await listPhotos(path.join(SRC, '_site'))) {
      const name = path.basename(src, path.extname(src)).toLowerCase().replace(/[^a-z0-9-]+/g, '-');
      await convert(src, OUT_SITE, name);
      console.log(`  site/${name}.webp`);
    }
  }

  for (const project of data.projects) {
    const srcDir = path.join(SRC, project.slug);
    if (!folders.includes(project.slug)) {
      console.warn(`! ${project.slug}: no photos (expected photos-src/${project.slug}/)`);
      continue;
    }
    const outDir = path.join(OUT_PROJECTS, project.slug);
    await fs.mkdir(outDir, { recursive: true });

    const photos = await listPhotos(srcDir);
    const images = [];
    for (const [i, src] of photos.entries()) {
      const file = String(i + 1).padStart(2, '0');
      images.push({ file, ...(await convert(src, outDir, file)) });
    }
    await prune(outDir, new Set(images.map((img) => img.file)));
    project.images = images;
    console.log(`✓ ${project.slug}: ${images.length} photos`);
  }

  for (const f of folders) {
    if (f !== '_site' && !slugs.has(f)) console.warn(`! photos-src/${f}/ does not match any slug in projects.json`);
  }

  await fs.writeFile(DATA, JSON.stringify(data, null, 2) + '\n');
  console.log('projects.json updated.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
