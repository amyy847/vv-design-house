import {
  gsap, motion, lenis, initSmoothScroll, initPage, loadProjects, projectImg, projectUrl, pad, revealText, revealPage,
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
// The page fades in now that its content is on screen (see transition.js).
revealPage();
initPage();

/* ---------- Rendering ---------- */

function render(p, next) {
  document.title = `${p.title} — VV Design House`;
  $('meta[name="description"]').setAttribute('content', p.summary || `${p.title}, a project by VV Design House.`);

  const details = [['City', p.city], ['Country', p.country], ['Area', p.area], ['Year', p.year], ['Category', p.category]]
    .filter(([, v]) => v);
  // "photos": a seamless wall. "gallery": the same wall with gaps around every photo. Neither has text.
  const photosOnly = p.layout === 'photos' || p.layout === 'gallery';
  const blocks = [['Brief', p.brief], ['Concept', p.concept], ['Outcome', p.outcome]].filter(([, t]) => t);
  const storyPhoto = p.images.length > 1 ? 1 : null;
  const galleryFrom = storyPhoto ? 2 : 1;
  const gallery = p.images.slice(galleryFrom);

  const photoButton = (n, sizes, eager = false) =>
    `<button type="button" data-open="${n}" aria-label="Open photo ${n + 1} of ${p.images.length}">${projectImg(p, n, { sizes, eager, alt: n === 0 ? p.title : '' })}</button>`;
  // Photos are referenced by file name in projects.json ("06"); this finds their position.
  const at = (file) => Math.max(0, p.images.findIndex((img) => img.file === file));

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
          ${p.tagline && !photosOnly ? `<p class="phero__tagline">${p.tagline}</p>` : ''}
          ${p.credit ? `<p class="phero__credit label">${p.credit}</p>` : ''}
        </div>
        <dl class="phero__details">
          ${details.map(([k, v]) => `<div><dt class="label">${k}</dt><dd>${v}</dd></div>`).join('')}
        </dl>
      </div>
    </section>

    ${p.images.length ? `<figure class="pcover" data-header="light">${photoButton(0, '100vw', true)}</figure>` : ''}

    ${photosOnly ? essay(p, photoButton) : p.chapters ? p.chapters.map((c) => chapter(c, p, at, photoButton)).join('') : genericBody()}

    ${next && next !== p ? `
    <a class="pnext" href="${projectUrl(next)}" data-header="light">
      <div class="pnext__media">${projectImg(next, 0, { sizes: '100vw' })}</div>
      <div class="pnext__body wrap">
        <p class="label">Next project</p>
        <h2 class="pnext__title">${next.title}</h2>
      </div>
    </a>` : ''}
    <div class="pmore wrap"><a class="btn" href="/projects">More projects ${arrow}</a></div>`;
  if (photosOnly) watchEssay(p, photoButton);

  // Projects without chapters yet: text blocks, the spaces list and an even gallery of every photo.
  function genericBody() {
    return `
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

    ${gallery.length ? `<section class="pgallery wrap" aria-label="Gallery">${gallery.map(galleryItem).join('')}</section>` : ''}`;
  }
}

/* ---------- Photos only ---------- */

// Every photo after the cover in one seamless wall: no gutters, no empty corners, nothing cropped.
// Photos are packed into rows that run the full width of the screen. Each row is exactly as tall as
// its photos need to meet edge to edge, so tall and wide photos can share a row. The rows are packed
// again when the screen width changes.
function essayRows(p, width) {
  const aspect = (n) => p.images[n].w / p.images[n].h;
  // Aim for rows about a third as tall as they are wide (never under 240px, never over 560px).
  const limit = width / Math.max(240, Math.min(560, width * 0.36));
  const rows = [];
  let row = [];
  let sum = 0;
  for (let n = 1; n < p.images.length; n++) {
    const a = aspect(n);
    // Close the row first if it is nearer the target without this photo.
    if (row.length && sum + a > limit && sum + a - limit > limit - sum) { rows.push(row); row = []; sum = 0; }
    row.push(n);
    sum += a;
    if (sum >= limit) { rows.push(row); row = []; sum = 0; }
  }
  // A short last row would be stretched far too tall, so it joins the row above.
  if (row.length) {
    if (rows.length && sum < limit * 0.75) rows[rows.length - 1].push(...row);
    else rows.push(row);
  }
  return rows;
}

function essayHtml(p, photoButton, width) {
  const aspect = (n) => p.images[n].w / p.images[n].h;
  return essayRows(p, width).map((row) => {
    const sum = row.reduce((total, n) => total + aspect(n), 0);
    const photos = row.map((n) =>
      `<figure class="essay__photo" style="--a:${aspect(n).toFixed(4)}">${photoButton(n, `${Math.round((100 * aspect(n)) / sum)}vw`)}</figure>`);
    return `<div class="essay__row" style="--sum:${sum.toFixed(4)};--n:${row.length}">${photos.join('')}</div>`;
  }).join('');
}

// Width the rows have to fill: the whole screen, or the screen minus its side margins for the gallery.
function essayWidth(p) {
  const screen = document.documentElement.clientWidth;
  return p.layout === 'gallery' ? screen - 2 * Math.min(56, Math.max(16, screen * 0.04)) : screen;
}

function essay(p, photoButton) {
  const gaps = p.layout === 'gallery';
  return `<section class="essay${gaps ? ' essay--gaps wrap' : ''}" aria-label="Photographs">${essayHtml(p, photoButton, essayWidth(p))}</section>`;
}

function watchEssay(p, photoButton) {
  const wall = $('.essay');
  let width = document.documentElement.clientWidth;
  let timer;
  addEventListener('resize', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const now = document.documentElement.clientWidth;
      if (now === width) return; // a phone's address bar changes the height only
      width = now;
      wall.innerHTML = essayHtml(p, photoButton, essayWidth(p));
    }, 150);
  });
}

/* ---------- Chapters ---------- */

// One section of a project page, laid out like a page of the project's PDF: a heading and a few
// lines of text with the photos that belong together. `align: "right"` mirrors the layout.
function chapter(c, p, at, photoButton) {
  const flip = c.align === 'right' ? ' is-flipped' : '';
  const photo = (file, sizes) => `<figure class="chapter__photo" data-reveal>${photoButton(at(file), sizes)}</figure>`;
  const text = c.title || c.text ? `
    <div class="chapter__text" data-reveal>
      ${c.title ? `<h2 class="chapter__title">${c.title}</h2>` : ''}
      ${(c.text || []).map((t) => `<p>${t}</p>`).join('')}
    </div>` : '';

  switch (c.layout) {
    // Text beside a staggered collage of smaller photos, split into two offset columns.
    case 'collage': {
      const cols = [c.images.filter((_, i) => i % 2 === 0), c.images.filter((_, i) => i % 2 === 1)];
      return `<section class="chapter chapter--collage${flip} wrap">
        ${text}
        <div class="collage collage--${c.images.length}">
          ${cols.map((col) => `<div class="collage__col">${col.map((f) => photo(f, '(min-width: 861px) 30vw, 50vw')).join('')}</div>`).join('')}
        </div>
      </section>`;
    }
    // One large photo, with the text and two smaller photos alongside.
    case 'feature':
      return `<section class="chapter chapter--feature${flip} wrap">
        ${photo(c.images[0], '(min-width: 861px) 60vw, 100vw')}
        <div class="feature__side">
          ${text}
          <div class="feature__smalls feature__smalls--${c.images.length - 1}">${c.images.slice(1).map((f) => photo(f, '(min-width: 861px) 18vw, 50vw')).join('')}</div>
        </div>
      </section>`;
    // A heading and caption over one photo running the full width of the page.
    case 'full':
      return `<section class="chapter chapter--full">
        ${text ? `<div class="chapter__head wrap">${text}</div>` : ''}
        ${photo(c.images[0], '100vw')}
      </section>`;
    // Photos side by side at the same height, however different their shapes.
    case 'row':
      return `<section class="chapter chapter--row wrap">
        ${text ? `<div class="chapter__head">${text}</div>` : ''}
        <div class="row${c.narrow ? ' row--narrow' : ''}">
          ${c.images.map((f) => {
            const img = p.images[at(f)];
            return `<div class="row__item" style="--share:${(img.w / img.h).toFixed(3)}">${photo(f, `(min-width: 861px) ${Math.round(100 / c.images.length)}vw, 50vw`)}</div>`;
          }).join('')}
        </div>
      </section>`;
    // Text beside a neat grid of small, evenly cropped photos.
    case 'tiles':
      return `<section class="chapter chapter--tiles wrap">
        <div class="tiles">${c.images.map((f) => photo(f, '(min-width: 861px) 20vw, 33vw')).join('')}</div>
        ${text}
      </section>`;
    // Four related photos in a quiet two-by-two grid.
    case 'grid':
      return `<section class="chapter chapter--grid wrap">${c.images.map((f) => photo(f, '(min-width: 861px) 40vw, 100vw')).join('')}</section>`;
    // A photo beside a warm panel holding a short statement.
    case 'quote':
      return `<section class="chapter chapter--quote${flip} wrap">
        ${photo(c.images[0], '(min-width: 861px) 58vw, 100vw')}
        <blockquote class="chapter__quote" data-reveal><p>${c.quote}</p></blockquote>
      </section>`;
    // A dark band: a small detail photo and the text, beside one large photo.
    case 'dark':
      return `<section class="chapter chapter--dark" data-header="light">
        <div class="dark__inner wrap">
          <div class="dark__side">${photo(c.images[0], '(min-width: 861px) 16vw, 40vw')}${text}</div>
          ${photo(c.images[1], '(min-width: 861px) 58vw, 100vw')}
        </div>
      </section>`;
    default:
      return '';
  }
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
