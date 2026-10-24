// Run before the body paints. First visits and ordinary reloads stay unanimated.
(() => {
  try {
    const key = 'aly-page-arrival';
    const pending = JSON.parse(sessionStorage.getItem(key) || 'null');
    sessionStorage.removeItem(key);
    if (pending?.path !== location.pathname + location.search || Date.now() - pending.time > 10000) return;
    document.documentElement.classList.add('motion-preparing');
    // Fail open if the deferred controller cannot run.
    setTimeout(() => document.documentElement.classList.remove('motion-preparing'), 1800);
  } catch { /* Storage restrictions must never block navigation. */ }
})();
