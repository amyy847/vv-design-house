import {
  gsap, ScrollTrigger, motion, DESKTOP, lenis,
  initSmoothScroll, initPage, loadProjects, projectImg, projectUrl, place, pad,
  revealText, scrollToTarget,
} from './core.js';

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];

initSmoothScroll();
const projects = await loadProjects();
// The homepage shows the first three projects in projects.json; reorder the file to change them.
const featured = projects.slice(0, 3);

renderFeatured();
$$('[data-project-count]').forEach((el) => { el.textContent = pad(projects.length); });

const introDone = playIntro();
setupHero();
setupFeatured();
setupAbout();
initPage();

if (location.hash) {
  introDone.then(() => {
    const target = document.querySelector(location.hash);
    if (target) requestAnimationFrame(() => scrollToTarget(target, { immediate: true }));
  });
}

/* ---------- Rendering ---------- */

// The panel behind each project is a deep tone of its colour, so white text reads on it.
function panelColor(p) {
  const hex = (p.color || '#d9cdbd').slice(1);
  const ink = [0x26, 0x23, 0x1f];
  return '#' + ink.map((v, k) => {
    const c = parseInt(hex.slice(k * 2, k * 2 + 2), 16);
    return Math.round(c + (v - c) * 0.5).toString(16).padStart(2, '0');
  }).join('');
}

function projectDetails(p) {
  return [['Category', p.category], ['Location', place(p)], ['Area', p.area], ['Year', p.year]].filter(([, v]) => v);
}

function renderFeatured() {
  const section = $('.featured');
  section.style.setProperty('--panel', panelColor(featured[0]));
  $('.featured__total', section).textContent = pad(featured.length);
  $('.featured__zoom', section).innerHTML = featured.map((p, i) =>
    `<div class="fmedia${i ? '' : ' is-active'}">${projectImg(p, 0, { sizes: '100vw' })}</div>`).join('');
  $('.featured__titles', section).innerHTML = featured.map((p, i) => `
    <h3 class="ftitle${i ? '' : ' is-active'}">
      <a href="${projectUrl(p)}"><span class="mask"><span>${p.title}</span></span></a>
      ${p.tagline ? `<span class="ftitle__tag">${p.tagline}</span>` : ''}
    </h3>`).join('');
  $('.featured__details', section).innerHTML = featured.map((p, i) => `
    <dl class="fdetails${i ? '' : ' is-active'}">
      ${projectDetails(p).map(([k, v]) => `<div><dt class="label">${k}</dt><dd>${v}</dd></div>`).join('')}
    </dl>`).join('');
  $('.featured__view', section).href = projectUrl(featured[0]);
}

/* ---------- 1. Intro ---------- */

function playIntro() {
  const intro = $('.intro');
  const hero = $('.hero');
  const heroImg = $('.hero__media img');
  const heroLogo = $('.hero__logo', hero);
  // Coming from another page of this site (not a refresh) means the visitor has already seen it.
  const navType = performance.getEntriesByType('navigation')[0]?.type;
  const internal = document.referrer.startsWith(location.origin) && navType !== 'reload';

  // The header only fades: its CSS transform transition (hide on scroll) would fight a GSAP y tween.
  const fadeIn = (targets) => gsap.timeline()
    .fromTo('.site-header', { opacity: 0 }, { opacity: 1, duration: 1.2, clearProps: 'opacity' })
    .fromTo(targets, { opacity: 0, y: 14 }, {
      opacity: 1, y: 0, duration: 1.2, stagger: 0.12, ease: 'power2.out', clearProps: 'transform,opacity',
    }, 0.1);

  // Skip the intro for reduced motion, navigation within the site, and deep links (/#about).
  if (!motion || internal || location.hash) {
    intro.remove();
    if (motion) fadeIn([heroLogo, '.hero__foot']);
    return Promise.resolve();
  }

  lenis.stop();
  window.scrollTo(0, 0);
  gsap.set(['.site-header', heroLogo, '.hero__foot'], { opacity: 0 });

  // The logo stays on screen throughout: the hero photo opens up behind it, then the logo
  // glides into its place in the hero, so it never disappears and reappears.
  const logo = $('.intro__logo', intro);
  const reveal = document.createElement('div');
  reveal.className = 'intro__reveal';
  reveal.innerHTML = `<img src="${heroImg.currentSrc || heroImg.src}" alt="">`;
  intro.prepend(reveal);

  const ready = Promise.all([document.fonts?.ready, heroImg.decode().catch(() => {})]);
  const timeout = new Promise((r) => setTimeout(r, 2500));

  return Promise.race([ready, timeout]).then(() => new Promise((resolve) => {
    const from = logo.getBoundingClientRect();
    const to = $('.logo', heroLogo).getBoundingClientRect();
    const glide = {
      x: to.left + to.width / 2 - (from.left + from.width / 2),
      y: to.top + to.height / 2 - (from.top + from.height / 2),
      scale: to.width / from.width,
    };

    gsap.timeline({
      onComplete: () => {
        gsap.set(heroLogo, { opacity: 1 });
        intro.remove();
        lenis.start();
        fadeIn(['.hero__foot']);
        resolve();
      },
    })
      // The logo appears softly on a plain cream screen.
      .fromTo(logo, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 1.2, ease: 'power2.out' })
      // A thin slit of the hero photo opens behind it and widens into a small window…
      // (Every stage names its start explicitly: browsers shorten symmetric inset() values, which
      // would make GSAP pair up the wrong numbers and push the window off-centre.)
      .fromTo(reveal, { clipPath: 'inset(36% 50% 36% 50%)' }, { clipPath: 'inset(36% 49.85% 36% 49.85%)', duration: 0.3, ease: 'power1.out' }, '+=0.4')
      .fromTo(reveal, { clipPath: 'inset(36% 49.85% 36% 49.85%)' }, { clipPath: 'inset(36% 38% 36% 38%)', duration: 0.9, ease: 'power2.inOut', immediateRender: false })
      // …then fills the screen while the logo glides to its place in the hero.
      .fromTo(reveal, { clipPath: 'inset(36% 38% 36% 38%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.3, ease: 'power3.inOut', immediateRender: false }, '+=0.2')
      .to(logo, { ...glide, duration: 1.3, ease: 'power3.inOut' }, '<');
  }));
}

/* ---------- 2. Hero ---------- */

function setupHero() {
  if (!motion) return;
  gsap.to('.hero__media img', {
    yPercent: 8, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
  });
}

/* ---------- 4. Featured projects ---------- */

function setupFeatured() {
  const section = $('.featured');
  const panel = $('.featured__panel', section);
  const frame = $('.featured__frame', section);
  const media = $$('.fmedia', section);
  const titles = $$('.ftitle', section);
  const details = $$('.fdetails', section);
  const current = $('.featured__current', section);
  const view = $('.featured__view', section);
  const total = featured.length;
  const titleText = titles.map((t) => $('.mask > span', t));
  const soft = titles.map((t, i) => [$('.ftitle__tag', t), details[i]].filter(Boolean));
  let active = 0;
  let busy = false;

  // Counter, link and panel colour follow the project on screen.
  const setActive = (i) => {
    if (i === active) return;
    const dir = i > active ? 1 : -1;
    active = i;
    current.textContent = pad(i + 1);
    view.href = projectUrl(featured[i]);
    section.style.setProperty('--panel', panelColor(featured[i]));
    if (motion) gsap.fromTo(current, { yPercent: 60 * dir, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.5, ease: 'power3.out' });
  };

  // Without pinning (phones, reduced motion), arrows and swipes switch projects with a wipe.
  const show = (target) => {
    const next = (target + total) % total;
    if (busy || next === active) return;
    const dir = next > active ? 1 : -1;
    const prev = active;
    setActive(next);
    const lists = [media, titles, details];
    lists.forEach((l) => l[next].classList.add('is-active'));
    const finish = () => {
      lists.forEach((l) => l[prev].classList.remove('is-active'));
      busy = false;
    };
    if (!motion) { finish(); return; }
    busy = true;
    const inImg = $('img', media[next]);
    gsap.set(media[next], { zIndex: 2 });
    gsap.set(media[prev], { zIndex: 1 });
    gsap.timeline({
      onComplete: () => {
        gsap.set([media[next], media[prev], inImg, titleText[prev], ...soft[prev]], { clearProps: 'all' });
        finish();
      },
    })
      .fromTo(media[next], { clipPath: dir > 0 ? 'inset(0% 0% 0% 100%)' : 'inset(0% 100% 0% 0%)' },
        { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1, ease: 'expo.inOut' }, 0)
      .fromTo(inImg, { scale: 1.12 }, { scale: 1, duration: 1.4, ease: 'expo.out' }, 0.1)
      .to(titleText[prev], { yPercent: -110, duration: 0.5, ease: 'power2.in' }, 0)
      .to(soft[prev], { opacity: 0, duration: 0.3 }, 0)
      .fromTo(titleText[next], { yPercent: 110 }, { yPercent: 0, duration: 0.8, ease: 'power3.out' }, 0.5)
      .fromTo(soft[next], { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }, 0.65);
  };
  let goTo = show;

  $$('.featured__arrow', section).forEach((b) => b.addEventListener('click', () => goTo(active + Number(b.dataset.dir))));
  section.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') goTo(active + 1);
    if (e.key === 'ArrowLeft') goTo(active - 1);
  });
  let startX = null;
  frame.addEventListener('pointerdown', (e) => { startX = e.clientX; });
  frame.addEventListener('pointerup', (e) => {
    if (startX === null) return;
    const dx = e.clientX - startX;
    startX = null;
    if (Math.abs(dx) > 50) goTo(active + (dx < 0 ? 1 : -1));
  });

  if (!motion) return;
  const mm = gsap.matchMedia();

  // Desktop: the panel slides up with the first photo as a smaller window inside it. Scrolling
  // zooms it to full screen, then carries on to the second and third projects before moving on.
  mm.add(DESKTOP, () => {
    const zoom = $('.featured__zoom', section);
    const shade = $('.featured__shade', section);
    const lead = $('.featured__lead', section);
    const titleBox = $('.featured__titles', section);
    const detailBox = $('.featured__details', section);
    const nav = $('.featured__nav', section);
    const WINDOW = 'inset(13% 13% 19% 17%)';
    const HOLD = 0.4;
    // How far a text block must move to sit at the vertical middle of the small window.
    const toMiddle = (el, extra = () => 0) => () => panel.clientHeight * 0.47 - (extra() + el.offsetTop + el.offsetHeight / 2);

    // All the projects are stacked and waiting; later ones stay hidden until their turn.
    [media, titles, details].forEach((l) => l.forEach((el) => el.classList.add('is-active')));
    gsap.set(media.slice(1), { clipPath: 'inset(0% 0% 0% 100%)' });
    gsap.set(titleText.slice(1), { yPercent: 110 });
    gsap.set(soft.slice(1).flat(), { opacity: 0 });

    gsap.fromTo(panel, { clipPath: 'inset(0% 0.7% 0% 0.7%)' }, {
      clipPath: 'inset(0% 0% 0% 0%)', ease: 'none',
      scrollTrigger: { trigger: section, start: 'top bottom', end: 'top top', scrub: true },
    });

    gsap.set(zoom, { transformOrigin: '52% 47%' });
    const tl = gsap.timeline({ defaults: { ease: 'power1.inOut', duration: 1 } })
      .fromTo(frame, { clipPath: WINDOW }, { clipPath: 'inset(0% 0% 0% 0%)' }, 0)
      .fromTo(zoom, { scale: 0.84 }, { scale: 1 }, 0)
      .fromTo(lead, { y: toMiddle(titleBox, () => lead.offsetTop) }, { y: 0 }, 0)
      .fromTo(detailBox, { y: toMiddle(detailBox) }, { y: 0 }, 0)
      .fromTo(shade, { opacity: 0.3 }, { opacity: 1, ease: 'none' }, 0)
      .fromTo(nav, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'none' }, 0.7)
      .addLabel('p0');
    for (let i = 1; i < total; i++) {
      const at = tl.duration() + HOLD;
      tl.fromTo(media[i], { clipPath: 'inset(0% 0% 0% 100%)' },
        { clipPath: 'inset(0% 0% 0% 0%)', ease: 'power2.inOut', immediateRender: false }, at)
        .fromTo($('img', media[i]), { scale: 1.12 }, { scale: 1, duration: 1.2, ease: 'power2.out', immediateRender: false }, at)
        .to($('img', media[i - 1]), { xPercent: -8, ease: 'power2.inOut' }, at)
        .to(titleText[i - 1], { yPercent: -110, duration: 0.4, ease: 'power2.in' }, at)
        .to(soft[i - 1], { opacity: 0, duration: 0.3, ease: 'none' }, at)
        .to(titleText[i], { yPercent: 0, duration: 0.6, ease: 'power3.out' }, at + 0.5)
        .to(soft[i], { opacity: 1, duration: 0.5, ease: 'none' }, at + 0.6)
        .addLabel(`p${i}`, at + 1.1);
    }
    tl.to({}, { duration: HOLD }); // rest on the last project before the page moves on

    const labels = featured.map((_, i) => tl.labels[`p${i}`]);
    const st = ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: () => `+=${tl.duration() * window.innerHeight * 0.6}`,
      pin: true,
      scrub: 0.6,
      animation: tl,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        const t = self.progress * tl.duration();
        let i = 0;
        labels.forEach((time, n) => { if (n && t >= time - 0.6) i = n; });
        setActive(i);
      },
    });

    // Arrows scroll to a project; scrolling that stops mid-change settles on the nearest one.
    const positions = () => labels.map((_, i) => st.labelToScroll(`p${i}`));
    goTo = (i) => scrollToTarget(positions()[Math.max(0, Math.min(total - 1, i))], { duration: 1.2 });
    let timer;
    const snap = () => {
      const y = window.scrollY;
      const stops = positions();
      if (y <= stops[0] + 2 || y >= stops[total - 1] - 2) return;
      const next = stops.findIndex((p) => p > y);
      const a = stops[next - 1];
      const b = stops[next];
      const frac = (y - a) / (b - a);
      const target = lenis.direction >= 0 ? (frac > 0.15 ? b : a) : (frac < 0.85 ? a : b);
      if (Math.abs(target - y) > 2) lenis.scrollTo(target, { duration: 0.9 });
    };
    const onScroll = () => { clearTimeout(timer); timer = setTimeout(snap, 180); };
    lenis.on('scroll', onScroll);

    return () => {
      clearTimeout(timer);
      lenis.off('scroll', onScroll);
      [media, titles, details].forEach((l) => l.forEach((el, n) => el.classList.toggle('is-active', n === active)));
      goTo = show;
    };
  });

  // Phones and tablets: no pinning, just a light zoom as the section scrolls in.
  mm.add(`not all and ${DESKTOP}`, () => {
    gsap.fromTo(frame, { clipPath: 'inset(6% 5% 6% 5%)' }, {
      clipPath: 'inset(0% 0% 0% 0%)', ease: 'none',
      scrollTrigger: { trigger: section, start: 'top 85%', end: 'top 15%', scrub: true },
    });
  });
}

/* ---------- 5. About ---------- */

function setupAbout() {
  if (!motion) return;
  revealText($('.about__title'));
  revealText($('.founder__quote'), { start: 'top 82%' });
  const portrait = $('.founder__portrait');
  gsap.fromTo(portrait, { opacity: 0 }, {
    opacity: 1, duration: 1.6, ease: 'power2.out',
    scrollTrigger: { trigger: portrait, start: 'top 85%', once: true },
  });
}
