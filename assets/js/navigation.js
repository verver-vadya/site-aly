import {createNavigator} from './navigation-core.mjs?v=9f3f2cf10a';

async function mountView(main,{signal}){
  const root=main.querySelector('[data-builder]');if(!root)return null;
  try{
    const {mountBuilder}=await import('./builder.js?v=6547af0310');
    if(signal.aborted||!main.isConnected)return null;
    return mountBuilder(root);
  }catch(error){
    if(signal.aborted)return null;
    root.querySelector('[data-loading]').textContent='Конструктор не загрузился. Обнови страницу, чтобы попробовать снова.';
    root.querySelectorAll('form input,form button,[data-save]').forEach(input=>input.disabled=true);
    throw error;
  }
}

// Firefox 144+/Zen, Chromium and Safari use the same same-document transition.
// Browsers without this API retain the existing ordinary-link fallback.
if(typeof document.startViewTransition==='function')createNavigator(window,document,mountView);
else mountView(document.querySelector('main'),{signal:new AbortController().signal}).catch(()=>{});
