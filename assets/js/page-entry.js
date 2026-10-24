// Runs in the head before first paint. No page is hidden while loading.
(() => {
  if(typeof CSSViewTransitionRule!=='undefined'||typeof document.startViewTransition==='function')return;
  try{
    const raw=sessionStorage.getItem('aly-page-entry');
    sessionStorage.removeItem('aly-page-entry');
    if(!raw||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const entry=JSON.parse(raw),age=Date.now()-entry.at;
    if(entry.to===location.href&&age>=0&&age<8000)document.documentElement.dataset.pageEntry='true';
  }catch{/* Storage may be unavailable; ordinary navigation still works. */}
})();
