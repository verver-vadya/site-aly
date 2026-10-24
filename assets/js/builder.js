import {drawBouquet,drawExport} from './builder-render.mjs?v=5c12e29291';
import {FLOWERS,SIZES,WRAPS,RIBBONS,MAX_STEMS,initialState,normalizeState,stemCount,estimate,formatPrice,flowerWord,choosePalette,chooseSize,changeCount} from './builder-model.mjs?v=380d0fe0b8';

let memoryDraft=null;
export function mountBuilder(root){
if(!root)return null;
const lifecycle=new AbortController();let disposed=false;
const listen=(node,type,handler)=>node.addEventListener(type,handler,{signal:lifecycle.signal});
const form=root.querySelector('form');
const stage=root.querySelector('.bouquet-canvas');
const canvas=stage.querySelector('canvas');
const save=root.querySelector('[data-save]');
const status=root.querySelector('[data-builder-status]');
const storageKey='aly-bouquet-v1';
let state=memoryDraft?normalizeState(memoryDraft):initialState(),ready=false,saving=false,animation;
try{const saved=localStorage.getItem(storageKey);if(saved)state=normalizeState(JSON.parse(saved))}catch{/* Private browsing may deny storage. */}
const assets=Object.fromEntries(['heads','extraHeads','foliage','stems','bow','paper','paperFront','brand'].map(key=>[key,new Image()]));
assets.brand.src=new URL('../brand/logo.svg?v=8d2c58bb38',import.meta.url).href;
assets.heads.src=new URL('../images/flower-heads.webp',import.meta.url).href;
assets.foliage.src=new URL('../images/foliage.webp',import.meta.url).href;
assets.extraHeads.src=new URL('../images/flower-heads-extra.webp',import.meta.url).href;
assets.stems.src=new URL('../images/bare-stems.webp',import.meta.url).href;
assets.bow.src=new URL('../images/satin-bow.webp',import.meta.url).href;
assets.paper.src=new URL('../images/paper-texture.webp',import.meta.url).href;
assets.paperFront.src=new URL('../images/paper-front.webp',import.meta.url).href;
const motion=matchMedia('(prefers-reduced-motion: reduce)');
const downloadPath='M8 3.5C8 8.5 12 10.5 12 15.5M7.5 11L12 15.5L16.5 11M4.5 18V20.5H19.5V18';
const checkPath='M5 12.5C7.2 13.5 8 15.5 10 17C12 12 15 8 19.5 5.5';

function renderPreview(animate) {
  if(!ready||disposed)return;
  // Draw once per choice; only the completed canvas opacity/transform animates.
  canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height);
  drawBouquet(canvas.getContext('2d'),state,canvas.width,canvas.height,assets);
  animation?.cancel();
  if(animate&&!motion.matches)animation=canvas.animate([{opacity:.55,transform:'translateY(5px)'},{opacity:1,transform:'none'}],{duration:220,easing:'cubic-bezier(0.23,1,0.32,1)'});
}
function update({animate=false,persist=true}={}) {
  if(disposed)return;
  const total=stemCount(state);
  form.querySelectorAll('[name=palette]').forEach(input=>input.checked=input.value===state.palette);
  form.querySelectorAll('[name=size]').forEach(input=>input.checked=SIZES[input.value]===total);
  form.querySelectorAll('[name=wrap]').forEach(input=>input.checked=input.value===state.wrap);
  form.querySelectorAll('[name=ribbon]').forEach(input=>input.checked=input.value===state.ribbon);
  FLOWERS.forEach((flower,i)=>{
    const row=form.querySelector(`[data-flower="${i}"]`);
    row.querySelector('output').textContent=state.counts[i];
    row.querySelector('[data-delta="-1"]').disabled=state.counts[i]===0||total===1;
    row.querySelector('[data-delta="1"]').disabled=total>=MAX_STEMS;
    row.classList.toggle('is-included',state.counts[i]>0);
  });
  root.querySelector('[data-stem-count]').textContent=`${total} ${flowerWord(total)}`;
  root.querySelector('[data-price]').textContent=formatPrice(estimate(state));
  root.querySelector('[data-palette-label]').textContent=({milk:'Молочная',red:'Алая',garden:'Садовая',custom:'Твоя палитра'})[state.palette];
  root.querySelector('[data-composition]').textContent=FLOWERS.filter((f,i)=>state.counts[i]).map(f=>`${f.name} — ${state.counts[FLOWERS.indexOf(f)]}`).join(', ')+'. '+WRAPS[state.wrap].name+', '+RIBBONS[state.ribbon].name.toLowerCase()+'.';
  canvas.setAttribute('aria-label',`Эскиз букета: ${root.querySelector('[data-composition]').textContent}`);
  root.querySelector('[data-custom-size]').hidden=Object.values(SIZES).includes(total);
  if(persist)memoryDraft=normalizeState(state);
  if(persist)try{localStorage.setItem(storageKey,JSON.stringify(state))}catch{/* The constructor also works without persistence. */}
  save.disabled=!ready||saving;
  setSaveIcon(downloadPath);
  renderPreview(animate);
}
function setSaveIcon(path){
  const icon=save.querySelector('morph-icon');icon.setAttribute('icon',path);
  if(!customElements.get('morph-icon'))icon.querySelector('path').setAttribute('d',path);
}
listen(form,'submit',event=>event.preventDefault());
listen(form,'change',event=>{
  const {name,value}=event.target;
  if(name==='palette')state=choosePalette(state,value);
  else if(name==='size')state=chooseSize(state,value);
  else if(name==='wrap'&&Object.hasOwn(WRAPS,value))state={...state,wrap:value};
  else if(name==='ribbon'&&Object.hasOwn(RIBBONS,value))state={...state,ribbon:value};
  else return;
  status.textContent='';update({animate:!event.target.matches(':focus-visible')});
});
listen(form,'click',event=>{
  const button=event.target.closest('[data-delta]');if(!button)return;
  state=changeCount(state,Number(button.closest('[data-flower]').dataset.flower),Number(button.dataset.delta));
  status.textContent='';update({animate:event.detail>0});
});
listen(root.querySelector('[data-reset]'),'click',event=>{
  state=initialState();update({animate:event.detail>0});status.textContent='Вернули начальное сочетание.';
});
listen(save,'click',async()=>{
  if(!ready||saving||disposed)return;
  saving=true;save.disabled=true;status.textContent='Готовим картинку…';
  const snapshot=normalizeState(state);
  try{
    await document.fonts.ready;
    if(disposed)return;
    const exported=document.createElement('canvas');exported.width=1200;exported.height=1500;
    drawExport(exported.getContext('2d'),snapshot,assets);
    const blob=await new Promise(resolve=>exported.toBlob(resolve,'image/png'));
    if(disposed)return;
    if(!blob)throw new Error('Image export failed');
    const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='aly-moy-buket.png';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
    status.textContent='Картинка подготовлена для скачивания.';setSaveIcon(checkPath);
  }catch{if(!disposed)status.textContent='Не удалось сохранить картинку. Попробуй ещё раз.'}
  finally{saving=false;if(!disposed)save.disabled=!ready}
});
listen(motion,'change',()=>{animation?.cancel()});
// Native Back can restore an older document from memory; pick up newer saved choices.
listen(window,'pageshow',event=>{if(event.persisted){try{state=normalizeState(JSON.parse(localStorage.getItem(storageKey)))}catch{}update({persist:false})}});
update({persist:false});
const loaded=Promise.all(Object.values(assets).map(image=>image.decode())).then(()=>{if(disposed)return;ready=true;stage.classList.add('is-ready');root.querySelector('[data-loading]').hidden=true;update({persist:false})}).catch(()=>{
  if(disposed)return;
  root.querySelector('[data-loading]').textContent='Фото цветов не загрузились. Обнови страницу, чтобы увидеть свой букет.';
  status.textContent='Превью недоступно. Сохранение картинки временно отключено.';
});

return {ready:loaded,destroy(){disposed=true;lifecycle.abort();animation?.cancel()}};
}
