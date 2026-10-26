import {
  motion, initSmoothScroll, initPage, loadProjects, projectImg, projectUrl, place, pad, revealText,
} from './core.js';

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const arrow = '<svg width="14" height="10"><use href="#arrow"/></svg>';
const SLIDER_MAX = 10;

initSmoothScroll();
const projects = await loadProjects();

$$('[data-project-count]').forEach((el) => (el.textContent = pad(projects.length)));
$('.plist').innerHTML = projects.map(row).join('');
document.querySelectorAll('.slider').forEach(initSlider);
revealText($('.page-title'), { start: 'top 95%' });
initPage();

function details(p) {
  return [
    ['Category', p.category],
    ['Location', place(p)],
    ['Area', p.area],
    ['Year', p.year],
  ].filter(([, v]) => v);
}

function row(p, i) {
  const photos = p.images.slice(0, SLIDER_MAX);
  return `
  <article class="prow" data-reveal>
    <div class="prow__info">
      <p class="prow__index label">${pad(i + 1)}${p.year ? ` — ${p.year}` : ''}</p>
      <h2 class="prow__title"><a href="${projectUrl(p)}">${p.title}</a></h2>
      ${p.tagline ? `<p class="prow__tagline">${p.tagline}</p>` : ''}
      <dl class="prow__details label">
        ${details(p).map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}
      </dl>
      <a class="btn" href="${projectUrl(p)}">View project <svg class="btn__arrow"><use href="#arrow"/></svg></a>
    </div>
    <div class="slider" aria-label="${p.title} photos">
      <div class="slider__track">
        ${photos.map((img, n) => `
          <figure class="slider__item" style="aspect-ratio:${img.w} / ${img.h}">
            ${projectImg(p, n, { sizes: '(min-width: 861px) 40vw, 90vw', alt: n === 0 ? p.title : '' })}
          </figure>`).join('')}
      </div>
      <div class="slider__bar">
        <div class="slider__progress"><span></span></div>
        <div class="slider__arrows">
          <button class="arrow-btn arrow-btn--prev" type="button" data-dir="-1" aria-label="Previous photo">${arrow}</button>
          <button class="arrow-btn" type="button" data-dir="1" aria-label="Next photo">${arrow}</button>
        </div>
      </div>
    </div>
  </article>`;
}

function initSlider(slider) {
  const track = $('.slider__track', slider);
  const bar = $('.slider__progress span', slider);
  const [prev, next] = $$('.arrow-btn', slider);

  const update = () => {
    const max = track.scrollWidth - track.clientWidth;
    const visible = track.clientWidth / track.scrollWidth;
    const progress = max > 0 ? track.scrollLeft / max : 1;
    bar.style.transform = `scaleX(${visible + (1 - visible) * progress})`;
    prev.disabled = track.scrollLeft <= 2;
    next.disabled = track.scrollLeft >= max - 2;
  };

  // Step to the next photo that is not fully in view.
  const step = (dir) => {
    const items = $$('.slider__item', track);
    const left = track.scrollLeft;
    const target = dir > 0
      ? items.find((el) => el.offsetLeft > left + 4)
      : [...items].reverse().find((el) => el.offsetLeft < left - 4);
    track.scrollTo({ left: target ? target.offsetLeft : 0, behavior: motion ? 'smooth' : 'auto' });
  };
  prev.addEventListener('click', () => step(-1));
  next.addEventListener('click', () => step(1));
  track.addEventListener('scroll', update, { passive: true });
  addEventListener('resize', update);
  track.querySelectorAll('img').forEach((img) => img.addEventListener('load', update, { once: true }));
  update();

  // Click-and-drag with a mouse (touch and trackpads scroll natively).
  let startX = 0;
  let startLeft = 0;
  let dragging = false;
  track.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    startX = e.clientX;
    startLeft = track.scrollLeft;
    dragging = true;
  });
  addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 4) track.classList.add('is-dragging');
    track.scrollLeft = startLeft - dx;
  });
  addEventListener('pointerup', () => {
    dragging = false;
    track.classList.remove('is-dragging');
  });
}
