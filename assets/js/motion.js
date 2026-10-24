// Keep native cross-document transitions where supported; Firefox/Zen uses
// short element animations around ordinary document navigation.
let keyboardNavigation=false;
addEventListener('pointerdown',()=>{keyboardNavigation=false},{passive:true});
addEventListener('keydown',event=>{if(event.key==='Enter')keyboardNavigation=true});
addEventListener('pageswap',event=>{
  if(keyboardNavigation||matchMedia('(prefers-reduced-motion: reduce)').matches)event.viewTransition?.skipTransition();
});
addEventListener('pageshow',()=>{keyboardNavigation=false});

if(typeof CSSViewTransitionRule==='undefined'&&typeof document.startViewTransition!=='function'){
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let pending=null;
  const clearEntry=()=>{try{sessionStorage.removeItem('aly-page-entry')}catch{}};
  function reset(){
    const previous=pending;pending=null;
    if(previous){clearTimeout(previous.timer);previous.animation?.cancel()}
  }
  function finish(token){
    if(pending!==token||token.done)return;
    token.done=true;clearTimeout(token.timer);
    try{sessionStorage.setItem('aly-page-entry',JSON.stringify({to:token.url,at:Date.now()}))}catch{}
    location.assign(token.url);
  }
  document.addEventListener('click',event=>{
    if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    const link=event.target.closest?.('a[href]');
    if(!link||link.hasAttribute('download')||(link.target&&link.target!=='_self'))return;
    let destination;try{destination=new URL(link.href,location.href)}catch{return}
    const current=new URL(location.href);
    if(destination.origin!==current.origin||!/^https?:$/.test(destination.protocol)||!/(?:\/|\.html)$/.test(destination.pathname))return;
    if(destination.pathname===current.pathname&&destination.search===current.search)return;
    const main=document.querySelector('main');
    if(reduced.matches||keyboardNavigation||event.detail===0||typeof main?.animate!=='function'){
      reset();clearEntry();return;
    }
    event.preventDefault();
    document.dispatchEvent(new CustomEvent('site:navigate'));
    delete document.documentElement.dataset.pageEntry;
    // A second click chooses the latest destination without restarting motion.
    if(pending){pending.url=destination.href;return}
    const token={url:destination.href,done:false};pending=token;
    try{
      token.animation=main.animate([{opacity:1,transform:'none'},{opacity:.65,transform:'translateY(-12px)'}],{duration:160,easing:'cubic-bezier(0.23,1,0.32,1)',fill:'forwards'});
      token.animation.finished.then(()=>finish(token),()=>{});
      // Do not leave navigation waiting on a paused/throttled animation.
      token.timer=setTimeout(()=>finish(token),240);
    }catch{finish(token)}
  });
  addEventListener('keydown',event=>{if(event.key==='Escape'){reset();clearEntry()}});
  reduced.addEventListener('change',()=>{if(reduced.matches&&pending){pending.animation?.cancel();finish(pending)}});
  addEventListener('pageshow',()=>{
    reset();
    setTimeout(()=>{delete document.documentElement.dataset.pageEntry},650);
  });
}
