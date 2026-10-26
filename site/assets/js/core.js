// Shared setup for every page: smooth scrolling, header behaviour, data loading and reveal helpers.
// GSAP, ScrollTrigger and Lenis are loaded as globals from the CDN (see the <script> tags).

export const gsap = window.gsap;
export const ScrollTrigger = window.ScrollTrigger;
export const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
// Animations run only when the libraries loaded and the visitor has not asked for less motion.
export const motion = Boolean(gsap && ScrollTrigger && window.Lenis) && !reducedMotion;
export const DESKTOP = '(min-width: 861px)';

if (!motion) document.documentElement.classList.remove('motion');
if (gsap && ScrollTrigger) {
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });
}

export let lenis = null;

export function initSmoothScroll() {
  if (!motion) return null;
  lenis = new window.Lenis({ lerp: 0.09 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  return lenis;
}

export function scrollToTarget(target, options = {}) {
  if (lenis) return lenis.scrollTo(target, { duration: 1.4, ...options });
  const top = typeof target === 'number' ? target : target.getBoundingClientRect().top + window.scrollY;
  window.scrollTo({ top, behavior: reducedMotion || options.immediate ? 'auto' : 'smooth' });
}

/* ---------- Data ---------- */

let projectsPromise;
export function loadProjects() {
  projectsPromise ??= fetch('/data/projects.json')
    .then((r) => r.json())
    .then((d) => d.projects);
  return projectsPromise;
}

export const pad = (n) => String(n).padStart(2, '0');
export const projectUrl = (p) => `/projects/${p.slug}`;
export const place = (p) => [p.city, p.country].filter(Boolean).join(', ');

// <img> markup for one project photo, with an 800px / 2000px srcset.
export function projectImg(p, index = 0, { sizes = '100vw', alt = '', eager = false } = {}) {
  const img = p.images[index] || p.images[0];
  if (!img) return '<span class="img-missing"></span>';
  const base = `/assets/img/projects/${p.slug}/${img.file}`;
  return `<img src="${base}-sm.webp" srcset="${base}-sm.webp 800w, ${base}.webp 2000w" sizes="${sizes}"
    width="${img.w}" height="${img.h}" alt="${alt}" ${eager ? '' : 'loading="lazy"'} decoding="async">`;
}

/* ---------- Reveals ---------- */

// Fades a heading or paragraph softly into place when it scrolls into view.
export function revealText(el, { start = 'top 85%' } = {}) {
  if (!motion || !el) return;
  gsap.fromTo(el, { opacity: 0, y: 14 }, {
    opacity: 1, y: 0, duration: 1.4, ease: 'power2.out',
    scrollTrigger: { trigger: el, start, once: true },
  });
}

/* ---------- Header ---------- */

function initHeader() {
  const header = document.querySelector('.site-header');
  if (!header) return;
  const path = location.pathname.replace(/\/$/, '') || '/';
  header.querySelectorAll('.site-nav a').forEach((a) => {
    const href = a.getAttribute('href');
    if (href !== '/' && !href.includes('#') && path.startsWith(href)) a.setAttribute('aria-current', 'page');
  });

  let lastY = window.scrollY;
  let queued = false;
  const update = () => {
    queued = false;
    const y = window.scrollY;
    // Light or dark text, depending on the section under the header.
    let theme = 'dark';
    for (const el of document.elementsFromPoint(window.innerWidth / 2, header.offsetHeight / 2)) {
      if (header.contains(el)) continue;
      const section = el.closest('[data-header]');
      if (section) { theme = section.dataset.header; break; }
    }
    header.classList.toggle('is-light', theme === 'light');
    header.classList.toggle('is-top', y < window.innerHeight * 0.6);
    // Hide while scrolling down, show again when scrolling up.
    if (y > lastY + 4 && y > window.innerHeight * 0.5) header.classList.add('is-hidden');
    else if (y < lastY - 4 || y < 40) header.classList.remove('is-hidden');
    lastY = y;
  };
  addEventListener('scroll', () => {
    if (!queued) { queued = true; requestAnimationFrame(update); }
  }, { passive: true });
  addEventListener('resize', update);
  update();
}

/* ---------- Page-wide behaviour ---------- */

function initLinks() {
  // Same-page anchors (#about or /#about) scroll smoothly instead of jumping.
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href*="#"]');
    if (!a) return;
    const url = new URL(a.href);
    if (url.pathname !== location.pathname || !url.hash) return;
    const target = document.querySelector(url.hash);
    if (!target) return;
    e.preventDefault();
    scrollToTarget(target);
    history.replaceState(null, '', url.hash);
  });
  document.querySelectorAll('[data-back-to-top]').forEach((b) =>
    b.addEventListener('click', () => scrollToTarget(0, { duration: 2 })),
  );
  document.querySelectorAll('[data-year]').forEach((el) => (el.textContent = new Date().getFullYear()));
}

function initReveals() {
  if (!motion) return;
  revealText(document.querySelector('.footer__title'));

  const items = gsap.utils.toArray('[data-reveal]');
  gsap.set(items, { y: 16 });
  ScrollTrigger.batch(items, {
    start: 'top 88%',
    once: true,
    onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 1.4, stagger: 0.1, ease: 'power2.out' }),
  });

  initSketch();
}

const SKETCH_SECONDS = 7;

// The footer sketch draws itself stroke by stroke, like a pen on paper. This needs an SVG made of
// line strokes (one <path> per stroke, in drawing order); a scanned PNG/JPG sketch simply fades in.
async function initSketch() {
  const img = document.querySelector('.footer__sketch img');
  if (!img) return;
  const svgText = img.src.endsWith('.svg')
    ? await fetch(img.src).then((r) => (r.ok ? r.text() : '')).catch(() => '')
    : '';
  const holder = document.createElement('div');
  holder.innerHTML = svgText;
  const svg = holder.querySelector('svg');
  const paths = svg ? [...svg.querySelectorAll('path')] : [];
  if (!paths.length) {
    gsap.from(img, { opacity: 0, duration: 1.6, scrollTrigger: { trigger: img, start: 'top 92%', once: true } });
    return;
  }

  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', img.alt);
  svg.style.visibility = 'hidden';
  img.replaceWith(svg);

  // Constant pen speed: long lines take longer. Each stroke starts before the previous one ends,
  // and shading (hatching) is dashed off quicker, like a real hand.
  const tl = gsap.timeline({ paused: true });
  let at = 0;
  for (const p of paths) {
    const len = p.getTotalLength();
    const hatch = p.classList.contains('h');
    const duration = 0.12 + len / (hatch ? 900 : 500);
    p.style.strokeDasharray = `${len} ${len + 4}`;
    p.style.strokeDashoffset = len + 2;
    tl.to(p, { strokeDashoffset: 0, duration, ease: 'power1.inOut' }, at);
    at += duration * (hatch ? 0.3 : 0.55);
  }
  tl.timeScale(tl.duration() / SKETCH_SECONDS);
  svg.style.visibility = '';
  ScrollTrigger.create({ trigger: svg, start: 'top 92%', once: true, onEnter: () => tl.play() });
}

// Call once, after the page's own ScrollTriggers exist, so positions account for pinned sections.
export function initPage() {
  initHeader();
  initLinks();
  initReveals();
  if (ScrollTrigger) {
    ScrollTrigger.sort();
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
    addEventListener('load', () => ScrollTrigger.refresh());
  }
}
