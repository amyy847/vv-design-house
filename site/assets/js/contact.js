import { initSmoothScroll, initPage, revealText } from './core.js';

const $ = (s, root = document) => root.querySelector(s);

initSmoothScroll();
revealText($('.page-title'), { start: 'top 95%' });
setupForm();
initPage();

// Turns the enquiry into an email in the visitor's own email app, addressed to the studio.
function setupForm() {
  const form = $('.cform');
  const note = $('.cform__note', form);
  const to = $('[data-contact-email]').textContent.trim();

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const missing = [...form.querySelectorAll('[required]')].find((el) => !el.checkValidity());
    if (missing) {
      note.textContent = missing.type === 'email' && missing.value
        ? 'Please check your email address.'
        : 'Please add your name, email and a few words about the space.';
      missing.focus();
      return;
    }

    const data = new FormData(form);
    const field = (k) => (data.get(k) || '').toString().trim();
    const subject = `Project enquiry${field('type') ? ` — ${field('type')}` : ''} — ${field('name')}`;
    const details = [
      `Name: ${field('name')}`,
      `Email: ${field('email')}`,
      field('phone') && `Phone: ${field('phone')}`,
      field('location') && `Project location: ${field('location')}`,
      field('type') && `Type: ${field('type')}`,
    ].filter(Boolean);
    const body = [field('message'), '', '—', ...details].join('\n');

    location.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    note.textContent = `Your email app should open with the message ready to send. If it doesn’t, write to ${to}.`;
  });
}
