// Page transitions. Clicking a link to another page fades the current one out while it drifts up a
// little; the next page then starts invisible, a little low, and fades in softly (CSS in base.css).
// Loaded in the <head> of every page, before first paint, so an arriving page never flashes.
// A page that builds its content with JavaScript sets data-pt-wait on <html> and calls
// window.__ptReveal() when the content is ready.
(function () {
  var d = document.documentElement;
  var arrived = false;
  try { arrived = sessionStorage.getItem('vv-nav') === '1'; sessionStorage.removeItem('vv-nav'); } catch (e) {}
  // The 'motion' flag is set in the <head> (off for visitors who prefer reduced motion).
  var motion = d.classList.contains('motion');

  if (arrived && motion) {
    d.classList.add('pt-enter');
    var wait = d.hasAttribute('data-pt-wait');
    var reveal = function () {
      if (!d.classList.contains('pt-enter')) return;
      d.classList.add('pt-in');
      void d.offsetWidth; // apply the hidden state first, so removing it below animates
      d.classList.remove('pt-enter');
      // Scroll animations measured the page while it was shifted; measure again once it has settled.
      setTimeout(function () {
        d.classList.remove('pt-in');
        if (window.ScrollTrigger) window.ScrollTrigger.refresh();
      }, 900);
    };
    window.__ptReveal = reveal;
    if (!wait) addEventListener('DOMContentLoaded', reveal);
    setTimeout(reveal, wait ? 2500 : 1500); // never leave a page hidden
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === '_blank' || a.hasAttribute('download')) return;
    var u = new URL(a.href, location.href);
    if (u.origin !== location.origin) return;
    if (u.pathname === location.pathname && u.search === location.search) return; // same page: smooth scroll instead
    try { sessionStorage.setItem('vv-nav', '1'); } catch (err) {}
    if (!motion) return;
    e.preventDefault();
    d.classList.add('pt-leave');
    setTimeout(function () { location.href = a.href; }, 450);
  });

  // Coming back with the browser's back button can restore the page as it was left: show it again.
  addEventListener('pageshow', function (e) {
    if (e.persisted) d.classList.remove('pt-leave', 'pt-enter', 'pt-in');
  });
})();
