// Generates soft "light and shadow" placeholder photos into photos-src/ so the site can be
// built before the real photography arrives. Delete photos-src/<slug>/ and drop in real photos
// whenever they are ready, then run `npm run images`.
// Usage: npm run placeholders && npm run images

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(root, 'photos-src');
const { projects } = JSON.parse(await fs.readFile(path.join(root, 'site/data/projects.json'), 'utf8'));

const PER_PROJECT = 8;
const RATIOS = [[3, 2], [3, 2], [4, 5], [3, 2], [16, 10], [4, 5], [3, 2], [3, 2]];

function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hex = (c) => c.replace('#', '').match(/../g).map((x) => parseInt(x, 16));
const mix = (c, to, t) => '#' + hex(c).map((v, i) => Math.round(v + (hex(to)[i] - v) * t).toString(16).padStart(2, '0')).join('');

function tones(base) {
  return {
    hi: mix(base, '#ffffff', 0.72),
    wall: mix(base, '#ffffff', 0.5),
    mid: mix(base, '#ffffff', 0.2),
    low: mix(base, '#000000', 0.12),
    deep: mix(base, '#000000', 0.38),
  };
}

const scenes = {
  // Arched windows throwing light across a wall and floor.
  arches(w, h, c, r) {
    const fy = h * (0.66 + r() * 0.1);
    const aw = w * (0.12 + r() * 0.06);
    const x0 = w * (0.25 + r() * 0.2);
    const arch = (x) => `<path d="M${x} ${fy + h * 0.2} V${h * 0.38} a${aw / 2} ${aw / 2} 0 0 1 ${aw} 0 V${fy + h * 0.2} Z"/>`;
    return `
      <rect width="${w}" height="${h}" fill="url(#wall)"/>
      <rect y="${fy}" width="${w}" height="${h - fy}" fill="url(#floor)"/>
      <g fill="${c.hi}" opacity=".75" filter="url(#soft)" transform="translate(${w * 0.08} 0) skewX(-${18 + r() * 14})">
        ${arch(x0)}${arch(x0 + aw * 1.6)}
      </g>
      <rect width="${w * 0.22}" height="${h}" fill="url(#shadeL)"/>`;
  },
  // Columns with long shadows on the floor.
  colonnade(w, h, c, r) {
    const fy = h * (0.62 + r() * 0.08);
    const n = 4;
    const cw = w * 0.07;
    let cols = '';
    let shadows = '';
    for (let i = 0; i < n; i++) {
      const x = w * 0.12 + i * (w * 0.76 / (n - 1)) - cw / 2;
      cols += `<rect x="${x}" y="0" width="${cw}" height="${fy}" fill="url(#col)"/>`;
      shadows += `<polygon points="${x},${fy} ${x + cw},${fy} ${x + cw + w * 0.32},${h} ${x + w * 0.22},${h}"/>`;
    }
    return `
      <rect width="${w}" height="${h}" fill="url(#wall)"/>
      <rect y="${fy}" width="${w}" height="${h - fy}" fill="url(#floor)"/>
      <g fill="${c.deep}" opacity=".22" filter="url(#soft)">${shadows}</g>
      ${cols}
      <rect y="${fy - 2}" width="${w}" height="3" fill="${c.low}" opacity=".4"/>`;
  },
  // Two walls meeting in a corner, cut by a diagonal beam of light.
  corner(w, h, c, r) {
    const cx = w * (0.38 + r() * 0.24);
    const fy = h * 0.74;
    return `
      <rect width="${w}" height="${h}" fill="${c.wall}"/>
      <polygon points="0,0 ${cx},0 ${cx},${fy} 0,${h}" fill="url(#shadeL)"/>
      <polygon points="0,${h} ${cx},${fy} ${w},${fy + h * 0.04} ${w},${h}" fill="url(#floor)"/>
      <polygon points="${cx + w * 0.08},0 ${cx + w * 0.3},0 ${w * 0.9},${h} ${w * 0.55},${h}" fill="${c.hi}" opacity=".55" filter="url(#soft)"/>
      <line x1="${cx}" y1="0" x2="${cx}" y2="${fy}" stroke="${c.low}" stroke-width="2" opacity=".35"/>`;
  },
  // Stepped plinths beside a curved wall.
  steps(w, h, c, r) {
    let bands = '';
    const n = 5;
    for (let i = 0; i < n; i++) {
      const y = h * 0.5 + i * h * 0.1;
      const x = w * 0.08 + i * w * 0.05;
      bands += `<rect x="${x}" y="${y}" width="${w * 0.5}" height="${h * 0.1}" fill="${i % 2 ? c.mid : c.hi}"/>
        <rect x="${x}" y="${y}" width="${w * 0.5}" height="${h * 0.018}" fill="${c.low}" opacity=".25" filter="url(#soft)"/>`;
    }
    return `
      <rect width="${w}" height="${h}" fill="url(#wall)"/>
      <ellipse cx="${w * (0.86 + r() * 0.08)}" cy="${h * 0.5}" rx="${w * 0.3}" ry="${h * 0.9}" fill="url(#curve)"/>
      ${bands}`;
  },
  // A deep arched niche in a vaulted wall.
  niche(w, h, c) {
    const nw = Math.min(w, h) * 0.36;
    const nx = w / 2 - nw / 2;
    return `
      <rect width="${w}" height="${h}" fill="url(#wall)"/>
      <rect width="${w}" height="${h}" fill="url(#vault)"/>
      <path d="M${nx} ${h * 0.82} V${h * 0.4} a${nw / 2} ${nw / 2} 0 0 1 ${nw} 0 V${h * 0.82} Z" fill="url(#nicheFill)"/>
      <rect x="${nx - nw * 0.2}" y="${h * 0.82}" width="${nw * 1.4}" height="${h * 0.03}" fill="${c.hi}"/>
      <rect x="${nx - nw * 0.2}" y="${h * 0.85}" width="${nw * 1.4}" height="${h * 0.02}" fill="${c.deep}" opacity=".25" filter="url(#soft)"/>`;
  },
};
const SCENE_ORDER = ['arches', 'colonnade', 'corner', 'niche', 'steps'];

function svg(w, h, base, sceneName, seed, label) {
  const c = tones(base);
  const r = rng(seed);
  const body = scenes[sceneName](w, h, c, r);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="wall" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c.hi}"/><stop offset="1" stop-color="${c.mid}"/></linearGradient>
    <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.mid}"/><stop offset="1" stop-color="${c.low}"/></linearGradient>
    <linearGradient id="shadeL" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${c.low}" stop-opacity=".9"/><stop offset="1" stop-color="${c.mid}" stop-opacity=".2"/></linearGradient>
    <linearGradient id="col" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${c.hi}"/><stop offset=".55" stop-color="${c.wall}"/><stop offset="1" stop-color="${c.low}"/></linearGradient>
    <radialGradient id="curve" cx=".2" cy=".4" r=".9"><stop offset="0" stop-color="${c.hi}"/><stop offset="1" stop-color="${c.low}"/></radialGradient>
    <radialGradient id="vault" cx=".5" cy=".1" r=".9"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset="1" stop-color="${c.low}" stop-opacity=".45"/></radialGradient>
    <linearGradient id="nicheFill" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${c.deep}" stop-opacity=".55"/><stop offset=".6" stop-color="${c.mid}"/><stop offset="1" stop-color="${c.wall}"/></linearGradient>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${Math.round(w * 0.006)}"/></filter>
    <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
  </defs>
  ${body}
  <rect width="${w}" height="${h}" filter="url(#grain)" opacity=".06"/>
  <text x="${w * 0.025}" y="${h - w * 0.022}" font-family="Arial, sans-serif" font-size="${Math.round(w * 0.009)}" letter-spacing="${w * 0.002}" fill="#000" opacity=".28">${label}</text>
</svg>`;
}

async function render(file, w, h, base, scene, seed, label) {
  await sharp(Buffer.from(svg(w, h, base, scene, seed, label))).jpeg({ quality: 90 }).toFile(file);
}

const long = 2400;
for (const [pi, p] of projects.entries()) {
  const dir = path.join(SRC, p.slug);
  await fs.mkdir(dir, { recursive: true });
  for (let i = 0; i < PER_PROJECT; i++) {
    const [rw, rh] = RATIOS[i % RATIOS.length];
    const w = rw >= rh ? long : Math.round((long * rw) / rh);
    const h = rw >= rh ? Math.round((long * rh) / rw) : long;
    const scene = SCENE_ORDER[(pi + i) % SCENE_ORDER.length];
    const n = String(i + 1).padStart(2, '0');
    await render(path.join(dir, `${n}.jpg`), w, h, p.color, scene, pi * 100 + i, `PLACEHOLDER · ${p.title.toUpperCase()} · ${n}`);
  }
  console.log(`✓ ${p.slug}`);
}

// Site images: hero (soft white/grey) and the founder portrait.
const site = path.join(SRC, '_site');
await fs.mkdir(site, { recursive: true });
await render(path.join(site, 'hero.jpg'), 2400, 1500, '#d9d8d4', 'colonnade', 7, 'PLACEHOLDER · HERO');
const portrait = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="2000">
  <defs><radialGradient id="bg" cx=".5" cy=".3" r=".9"><stop offset="0" stop-color="#d8d6d2"/><stop offset="1" stop-color="#8e8b86"/></radialGradient>
  <filter id="s"><feGaussianBlur stdDeviation="14"/></filter></defs>
  <rect width="1600" height="2000" fill="url(#bg)"/>
  <g fill="#4a4844" filter="url(#s)"><ellipse cx="800" cy="760" rx="230" ry="290"/><path d="M260 2000 C300 1450 520 1250 800 1250 C1080 1250 1300 1450 1340 2000 Z"/></g>
  <text x="40" y="1960" font-family="Arial" font-size="22" letter-spacing="4" fill="#000" opacity=".35">PLACEHOLDER · PORTRAIT</text>
</svg>`;
await sharp(Buffer.from(portrait)).jpeg({ quality: 90 }).toFile(path.join(site, 'portrait.jpg'));
console.log('✓ _site (hero, portrait)');
