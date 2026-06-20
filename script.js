// Tiny page-transition router.
//
// This is a static multi-page site — every nav link is a real .html file
// with its own URL. To get a true "swipe between pages" feel (instead of
// a hard reload), this script intercepts clicks on internal links, fetches
// the next page in the background, and swaps <main> while sliding it out
// to the left and the new content in from the right.
//
// If anything goes wrong (slow network, fetch blocked, JS disabled), it
// just falls back to a normal page load — nothing breaks.

(function () {
  const mainEl = document.querySelector('main');
  if (!mainEl) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function isInternalPageLink(link) {
    if (!link || !link.href) return false;
    if (link.target === '_blank' || link.hasAttribute('download')) return false;
    let url;
    try {
      url = new URL(link.href, location.href);
    } catch (err) {
      return false;
    }
    if (url.origin !== location.origin) return false;
    if (!/\.html?$/.test(url.pathname)) return false;
    return true;
  }

  function updateActiveNav(url) {
    const targetPath = new URL(url, location.href).pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-links a').forEach((a) => {
      const linkPath = new URL(a.getAttribute('href'), location.href).pathname.split('/').pop() || 'index.html';
      a.classList.toggle('active', linkPath === targetPath);
    });
  }

  async function goTo(url, addToHistory) {
    try {
      if (!reduceMotion) {
        mainEl.classList.remove('is-entering');
        mainEl.classList.add('is-leaving');
      }

      const fetchPromise = fetch(url, { headers: { 'X-Requested-With': 'page-router' } });
      const [res] = await Promise.all([fetchPromise, wait(reduceMotion ? 0 : 300)]);

      if (!res.ok) throw new Error('Bad response');

      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const newMain = doc.querySelector('main');
      if (!newMain) throw new Error('No <main> in fetched page');

      mainEl.innerHTML = newMain.innerHTML;

      const newTitle = doc.querySelector('title');
      if (newTitle) document.title = newTitle.textContent;

      updateActiveNav(url);

      if (addToHistory) history.pushState({}, '', url);

      window.scrollTo(0, 0);

      if (!reduceMotion) {
        mainEl.classList.remove('is-leaving');
        mainEl.classList.add('is-entering');
      }
    } catch (err) {
      // Fallback: just navigate normally.
      location.href = url;
    }
  }

  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const link = e.target.closest('a');
    if (!isInternalPageLink(link)) return;

    const url = new URL(link.href, location.href).href;
    if (url === location.href) return;

    e.preventDefault();
    goTo(url, true);
  });

  window.addEventListener('popstate', () => {
    goTo(location.href, false);
  });
})();
