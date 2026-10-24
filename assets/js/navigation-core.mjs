const PAGES=new Set(['','index.html','catalog.html','builder.html','events.html','atelier.html','contacts.html','404.html','bouquet-nezhno.html','bouquet-smelo.html','bouquet-po-svoemu.html']);
export function routeURL(link,currentHref){
  if(!link||link.hasAttribute('download')||(link.target&&link.target.toLowerCase()!=='_self'))return null;
  let url;try{url=new URL(link.href,currentHref)}catch{return null}
  const current=new URL(currentHref),directory=new URL('.',current).pathname;
  if(url.origin!==current.origin||!/^https?:$/.test(url.protocol)||new URL('.',url).pathname!==directory||!PAGES.has(url.pathname.slice(directory.length)))return null;
  return url;
}

// Native links are the fallback. Only known local pages are enhanced, and every
// route installs/disposes its own interactions instead of re-executing scripts.
export function createNavigator(win,doc,mountView){
  const reduced=win.matchMedia('(prefers-reduced-motion: reduce)');
  const controller=new win.AbortController(),signal=controller.signal;
  const previousRestoration=win.history.scrollRestoration;
  win.history.scrollRestoration='manual';
  let revision=0,request=null,transition=null,view=null,viewController=null,scrollTimer=null,busy=false,destroyed=false,committed=-1,pendingMode='push';
  let renderedURL=new URL(win.location.href);
  const announce=doc.createElement('div');announce.className='route-announcer';announce.setAttribute('role','status');announce.setAttribute('aria-live','polite');doc.body.append(announce);
  const stateWithScroll=()=>({...((win.history.state&&typeof win.history.state==='object')?win.history.state:{}),alyScroll:[win.scrollX,win.scrollY]});
  function rememberScroll(){if(!busy&&!destroyed)win.history.replaceState(stateWithScroll(),'',win.location.href)}
  function loading(value){busy=value;doc.documentElement.dataset.routeLoading=String(value);doc.querySelector('main')?.setAttribute('aria-busy',String(value))}
  function closeMenu(){doc.dispatchEvent(new win.CustomEvent('site:navigate'))}
  function skip(){transition?.skipTransition()}
  function cancel(){
    skip();
    // Once the URL/main have changed, finish mounting that page. A browser Back
    // has already changed the URL too; cancelling its fetch would desync them.
    if(committed===revision||pendingMode==='none')return;
    revision++;request?.abort();loading(false);
  }
  function discardView(){viewController?.abort();view?.destroy();view=null}
  function installView(main){
    const owner=new win.AbortController();viewController=owner;
    const promise=Promise.resolve().then(()=>mountView(main,{signal:owner.signal}));
    promise.then(mounted=>{if(!owner.signal.aborted&&doc.querySelector('main')===main&&!destroyed)view=mounted;else mounted?.destroy()},()=>{});
    return promise;
  }
  function abortable(promise,abortSignal){
    return new Promise((resolve,reject)=>{
      const abort=()=>reject(Error('Navigation cancelled'));
      if(abortSignal.aborted){abort();return}
      abortSignal.addEventListener('abort',abort,{once:true});
      Promise.resolve(promise).then(resolve,reject).finally(()=>abortSignal.removeEventListener('abort',abort));
    });
  }
  function applyNavigation(parsed){
    doc.title=parsed.title;
    const description=parsed.querySelector('meta[name="description"]');
    if(description)doc.querySelector('meta[name="description"]')?.setAttribute('content',description.getAttribute('content'));
    const current=new Set([...parsed.querySelectorAll('header a[aria-current="page"]')].map(link=>link.getAttribute('href')));
    doc.querySelectorAll('header a[href]').forEach(link=>{if(current.has(link.getAttribute('href')))link.setAttribute('aria-current','page');else link.removeAttribute('aria-current')});
  }
  function position(url,scroll,keyboard){
    const main=doc.querySelector('main');
    if(keyboard){main.setAttribute('tabindex','-1');main.focus({preventScroll:true})}
    let anchor=null;try{if(url.hash)anchor=doc.getElementById(decodeURIComponent(url.hash.slice(1)))}catch{}
    if(anchor)anchor.scrollIntoView({behavior:'instant',block:'start'});
    else win.scrollTo({left:scroll?.[0]||0,top:scroll?.[1]||0,behavior:'instant'});
  }
  function preloadImages(main,url,abortSignal,parsed){
    const sources=[...[...main.querySelectorAll('img')].slice(0,3).map(node=>node.getAttribute('src')),...[...parsed.querySelectorAll('link[rel="preload"][as="image"]')].map(node=>node.getAttribute('href'))];
    if(!sources.length||!win.Image)return Promise.resolve();
    return new Promise(resolve=>{
      let done=false,timer;
      const finish=()=>{if(done)return;done=true;win.clearTimeout(timer);abortSignal.removeEventListener('abort',finish);resolve()};
      timer=win.setTimeout(finish,700);abortSignal.addEventListener('abort',finish,{once:true});
      Promise.allSettled(sources.map(source=>{const image=new win.Image();image.src=new URL(source,url).href;return image.decode()})).then(finish);
    });
  }
  function boundedReady(ready){
    if(!ready)return Promise.resolve();
    return new Promise(resolve=>{const timer=win.setTimeout(resolve,800);Promise.resolve(ready).catch(()=>{}).finally(()=>{win.clearTimeout(timer);resolve()})});
  }
  async function navigate(url,{mode='push',scroll=null,keyboard=false}={}){
    if(destroyed)return;
    const id=++revision;request?.abort();skip();win.clearTimeout(scrollTimer);
    pendingMode=mode;
    const aborter=new win.AbortController();request=aborter;
    loading(true);closeMenu();
    const timeout=win.setTimeout(()=>aborter.abort(),6500);
    try{
      const response=await win.fetch(url.href,{signal:aborter.signal,cache:'no-cache',credentials:'same-origin'});
      if(!response.ok)throw Error('Page unavailable');
      if(response.url&&new URL(response.url).href!==url.href.split('#')[0])throw Error('Redirect requires ordinary navigation');
      const parsed=new win.DOMParser().parseFromString(await response.text(),'text/html');
      const incoming=parsed.querySelector('main');
      if(!incoming||!parsed.querySelector('header .brand'))throw Error('Not an Alый page');
      await preloadImages(incoming,url,aborter.signal,parsed);
      if(id!==revision||destroyed)return;
      if(transition){try{await transition.finished}catch{}if(id!==revision)return}
      const update=async()=>{
        if(id!==revision||destroyed)return;
        const main=doc.importNode(incoming,true);
        // DOMParser parses noscript with scripting disabled. Removing it here
        // prevents its fallback <style> from hiding a live constructor.
        main.querySelectorAll('script,noscript').forEach(node=>node.remove());
        discardView();committed=id;
        if(mode==='push'){
          win.history.replaceState(stateWithScroll(),'',win.location.href);
          win.history.pushState({alyScroll:[0,0]},'',url.href);
        }
        doc.querySelector('main').replaceWith(main);renderedURL=url;applyNavigation(parsed);
        doc.dispatchEvent(new win.CustomEvent('site:ready'));
        const mounted=await abortable(installView(main),aborter.signal);
        if(id!==revision||destroyed)return;
        await abortable(boundedReady(mounted?.ready),aborter.signal);
        if(id!==revision||destroyed)return;
        position(url,scroll,keyboard);announce.textContent=`Открыта страница: ${doc.title}`;
      };
      if(typeof doc.startViewTransition==='function'&&!reduced.matches&&!keyboard){
        transition=doc.startViewTransition(update);
        const active=transition;
        // Rejections (e.g. duplicate names or a cancelled transition) must never
        // reject globally. updateCallbackDone carries actual application errors.
        active.ready.catch(()=>{});active.finished.catch(()=>{});
        await active.updateCallbackDone;
        if(id===revision)loading(false);
        await active.finished;
        if(transition===active)transition=null;
      }else{await update();if(id===revision)loading(false)}
    }catch{
      if(id===revision&&!destroyed){
        loading(false);
        // Recover with a real document if fetch/parsing/module setup fails.
        if(mode==='push')win.location.assign(url.href);else win.location.replace(url.href);
      }
    }finally{
      win.clearTimeout(timeout);
      if(id===revision){request=null;loading(false)}
    }
  }
  function click(event){
    if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    const url=routeURL(event.target.closest?.('a[href]'),win.location.href);if(!url)return;
    const current=new URL(win.location.href);
    if(url.pathname===current.pathname&&url.search===current.search&&url.hash!==current.hash){rememberScroll();return}
    event.preventDefault();
    if(url.href===current.href){closeMenu();return}
    navigate(url,{keyboard:event.detail===0});
  }
  rememberScroll();
  doc.addEventListener('click',click,{signal});
  win.addEventListener('popstate',event=>{
    const url=new URL(win.location.href);
    if(url.pathname===renderedURL.pathname&&url.search===renderedURL.search){
      revision++;request?.abort();skip();win.clearTimeout(scrollTimer);loading(false);
      renderedURL=url;position(url,event.state?.alyScroll,false);return;
    }
    navigate(url,{mode:'none',scroll:event.state?.alyScroll});
  },{signal});
  doc.addEventListener('site:urlchange',()=>{renderedURL=new URL(win.location.href)},{signal});
  win.addEventListener('scroll',()=>{win.clearTimeout(scrollTimer);if(!busy)scrollTimer=win.setTimeout(rememberScroll,120)},{passive:true,signal});
  win.addEventListener('pagehide',rememberScroll,{signal});
  win.addEventListener('keydown',event=>{if(event.key==='Escape')cancel()},{signal});
  reduced.addEventListener('change',()=>{if(reduced.matches)skip()},{signal});
  const initial=installView(doc.querySelector('main'));
  initial.catch(()=>{announce.textContent='Не удалось загрузить интерактивные элементы. Обнови страницу.'});
  return {navigate,ready:initial,destroy(){destroyed=true;revision++;request?.abort();skip();controller.abort();win.clearTimeout(scrollTimer);discardView();announce.remove();win.history.scrollRestoration=previousRestoration}};
}
