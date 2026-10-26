import {
  gsap, motion, lenis, initSmoothScroll, initPage, loadProjects, projectImg, projectUrl, pad, revealText,
} from './core.js';

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const arrow = '<svg class="btn__arrow"><use href="#arrow"/></svg>';

// Gallery rhythm: one full-width photo, then pairs (6+6, 7+5, 5+7). Ratios keep each pair the same height.
const SLOTS = [[12, '16 / 9'], [6, '4 / 5'], [6, '4 / 5'], [7, '4 / 3'], [5, '20 / 21'], [5, '20 / 21'], [7, '4 / 3']];

initSmoothScroll();
const projects = await loadProjects();
// /projects/<slug> on Netlify; ?p=<slug> also works.
const slug = decodeURIComponent(location.pathname.match(/^\/projects\/([^/]+)/)?.[1] || new URLSearchParams(location.search).get('p') || '');
const index = projects.findIndex((p) => p.slug === slug);
const main = $('#main');

if (index === -1) {
  main.innerHTML = `<section class="pempty">
    <p class="label">Portfolio</p>
    <h1 class="page-title">Project not found</h1>
    <a class="btn" href="/projects">See all projects ${arrow}</a>
  </section>`;
} else {
  const project = projects[index];
  render(project, projects[(index + 1) % projects.length]);
  setupLightbox(project);
  setupMotion();
}
initPage();

/* ---------- Rendering ---------- */

function render(p, next) {
  document.title = `${p.title} — VV Design House`;
  $('meta[name="description"]').setAttribute('content', p.summary || `${p.title}, a project by VV Design House.`);

  const details = [['City', p.city], ['Country', p.country], ['Area', p.area], ['Year', p.year], ['Category', p.category]]
    .filter(([, v]) => v);
  const blocks = [['Brief', p.brief], ['Concept', p.concept], ['Outcome', p.outcome]].filter(([, t]) => t);
  const storyPhoto = p.images.length > 1 ? 1 : null;
  const galleryFrom = storyPhoto ? 2 : 1;
  const gallery = p.images.slice(galleryFrom);

  const photoButton = (n, sizes, eager = false) =>
    `<button type="button" data-open="${n}" aria-label="Open photo ${n + 1} of ${p.images.length}">${projectImg(p, n, { sizes, eager, alt: n === 0 ? p.title : '' })}</button>`;

  const galleryItem = (img, k) => {
    let [span, ratio] = SLOTS[k % SLOTS.length];
    // A photo left alone at the end of a pair row goes full width instead.
    if (k === gallery.length - 1 && [1, 3, 5].includes(k % SLOTS.length)) [span, ratio] = SLOTS[0];
    return `<figure class="gitem" data-reveal style="--span:${span};--ratio:${ratio};--natural:${img.w} / ${img.h}">
      ${photoButton(galleryFrom + k, span === 12 ? '100vw' : '(min-width: 861px) 50vw, 100vw')}
    </figure>`;
  };

  main.innerHTML = `
    <section class="phero wrap">
      <p class="phero__kicker label"><a class="link-line" href="/projects">Portfolio</a> / ${p.category}</p>
      <h1 class="phero__title">${p.title}</h1>
      <div class="phero__row">
        <div>
          ${p.tagline ? `<p class="phero__tagline">${p.tagline}</p>` : ''}
          ${p.credit ? `<p class="phero__credit label">${p.credit}</p>` : ''}
        </div>
        <dl class="phero__details">
          ${details.map(([k, v]) => `<div><dt class="label">${k}</dt><dd>${v}</dd></div>`).join('')}
        </dl>
      </div>
    </section>

    ${p.images.length ? `<figure class="pcover" data-header="light">${photoButton(0, '100vw', true)}</figure>` : ''}

    ${blocks.length ? `
    <section class="pstory wrap ${storyPhoto ? '' : 'pstory--solo'}">
      <div class="pstory__blocks">
        ${blocks.map(([label, text], n) => `
          <div class="pblock" data-reveal>
            <span class="label"><i>${pad(n + 1)}</i>${label}</span>
            <p>${text}</p>
          </div>`).join('')}
      </div>
      ${storyPhoto ? `<figure class="pstory__photo">${photoButton(storyPhoto, '(min-width: 861px) 55vw, 100vw')}</figure>` : ''}
    </section>` : ''}

    ${p.quote ? `<p class="pquote">“${p.quote}”</p>` : ''}

    ${p.spaces?.length ? `
    <section class="pspaces wrap">
      <div class="pspaces__head"><h2>The spaces</h2><p class="label">${pad(p.spaces.length)} areas</p></div>
      <ol>
        ${p.spaces.map((s, n) => `
          <li data-reveal>
            <span class="label">${pad(n + 1)}</span>
            <h3>${s.title}</h3>
            ${s.text ? `<p>${s.text}</p>` : ''}
          </li>`).join('')}
      </ol>
    </section>` : ''}

    ${gallery.length ? `<section class="pgallery wrap" aria-label="Gallery">${gallery.map(galleryItem).join('')}</section>` : ''}

    ${next && next !== p ? `
    <a class="pnext" href="${projectUrl(next)}" data-header="light">
      <div class="pnext__media">${projectImg(next, 0, { sizes: '100vw' })}</div>
      <div class="pnext__body wrap">
        <p class="label">Next project</p>
        <h2 class="pnext__title">${next.title}</h2>
      </div>
    </a>` : ''}
    <div class="pmore wrap"><a class="btn" href="/projects">More projects ${arrow}</a></div>`;
}

/* ---------- Motion ---------- */

function setupMotion() {
  if (!motion) return;
  revealText($('.phero__title'), { start: 'top 95%' });
  revealText($('.pquote'));
  const cover = $('.pcover');
  if (cover) gsap.fromTo(cover, { opacity: 0 }, { opacity: 1, duration: 1.6, ease: 'power2.out', delay: 0.2 });
}

/* ---------- Lightbox ---------- */

function setupLightbox(p) {
  const box = $('.lightbox');
  const img = $('.lightbox__figure img', box);
  const count = $('.lightbox__count', box);
  const total = p.images.length;
  let current = 0;
  $('.lightbox__title', box).textContent = p.title;

  const src = (n) => `/assets/img/projects/${p.slug}/${p.images[n].file}.webp`;
  const show = (n) => {
    current = (n + total) % total;
    img.src = src(current);
    img.alt = `${p.title}, photo ${current + 1} of ${total}`;
    count.textContent = `${pad(current + 1)} / ${pad(total)}`;
    new Image().src = src((current + 1) % total); // preload the next one
    if (motion) gsap.fromTo(img, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'power2.out' });
  };

  main.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-open]');
    if (!trigger) return;
    show(Number(trigger.dataset.open));
    box.showModal();
    lenis?.stop();
  });
  box.addEventListener('close', () => lenis?.start());
  $('.lightbox__close', box).addEventListener('click', () => box.close());
  $$('[data-dir]', box).forEach((b) => b.addEventListener('click', () => show(current + Number(b.dataset.dir))));
  box.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') show(current + 1);
    if (e.key === 'ArrowLeft') show(current - 1);
  });
  // Clicking the dark area around the photo closes; swiping changes photo.
  const figure = $('.lightbox__figure', box);
  figure.addEventListener('click', (e) => { if (e.target === figure) box.close(); });
  let startX = null;
  figure.addEventListener('pointerdown', (e) => { startX = e.clientX; });
  figure.addEventListener('pointerup', (e) => {
    if (startX === null) return;
    const dx = e.clientX - startX;
    startX = null;
    if (Math.abs(dx) > 50) show(current + (dx < 0 ? 1 : -1));
  });
}
