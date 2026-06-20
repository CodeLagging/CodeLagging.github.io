
(function () {
  const mainEl = document.querySelector('main');
  if (!mainEl) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Order mirrors the nav bar — used purely to decide swipe direction.
  const PAGE_ORDER = ['index.html', 'about.html', 'projects.html', 'connect.html'];

  function pathName(url) {
    const u = new URL(url, location.href);
    return u.pathname.split('/').pop() || 'index.html';
  }

  let currentPath = pathName(location.href);

  function getDirection(targetPath) {
    const curIdx = PAGE_ORDER.indexOf(currentPath);
    const tgtIdx = PAGE_ORDER.indexOf(targetPath);
    if (curIdx === -1 || tgtIdx === -1 || tgtIdx === curIdx) return 'forward';
    return tgtIdx > curIdx ? 'forward' : 'backward';
  }

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

  function updateActiveNav(targetPath) {
    document.querySelectorAll('.nav-links a').forEach((a) => {
      const linkPath = pathName(a.getAttribute('href'));
      a.classList.toggle('active', linkPath === targetPath);
    });
  }

  async function goTo(url, addToHistory) {
    const targetPath = pathName(url);
    const direction = getDirection(targetPath);

    try {
      if (!reduceMotion) {
        mainEl.classList.remove('is-entering-from-right', 'is-entering-from-left');
        mainEl.classList.add(direction === 'forward' ? 'is-leaving-left' : 'is-leaving-right');
      }

      const fetchPromise = fetch(url, { headers: { 'X-Requested-With': 'page-router' } });
      const [res] = await Promise.all([fetchPromise, wait(reduceMotion ? 0 : 400)]);

      if (!res.ok) throw new Error('Bad response');

      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const newMain = doc.querySelector('main');
      if (!newMain) throw new Error('No <main> in fetched page');

      mainEl.innerHTML = newMain.innerHTML;

      const newTitle = doc.querySelector('title');
      if (newTitle) document.title = newTitle.textContent;

      updateActiveNav(targetPath);

      if (addToHistory) history.pushState({}, '', url);

      window.scrollTo(0, 0);

      if (!reduceMotion) {
        mainEl.classList.remove('is-leaving-left', 'is-leaving-right');
        mainEl.classList.add(direction === 'forward' ? 'is-entering-from-right' : 'is-entering-from-left');
      }

      currentPath = targetPath;
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
