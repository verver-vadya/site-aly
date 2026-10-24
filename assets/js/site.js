const menuButton=document.querySelector('.menu-button');
const menu=document.querySelector('#mobile-nav');
const bloom=document.querySelector('.bloom-menu');
const menuIcon=document.querySelector('[data-menu-icon]');
const paths={"menu":"M4 8.5C9 6.8 14 6.8 20 8.5M4 15.5C10 17.2 15 17.2 20 15.5","close":"M6 6C10 9 14 15 18 18M18 6C14 9 10 15 6 18","plus":"M12 4.5C11.2 9.5 12.8 14.5 12 19.5M4.5 12C9.5 11.2 14.5 12.8 19.5 12","minus":"M4.5 12C9.5 11.2 14.5 12.8 19.5 12"};
let menuTimer;
function setIcon(icon,path){
  if(!icon)return;
  icon.setAttribute('icon',path);
  if(!customElements.get('morph-icon'))icon.querySelector('path')?.setAttribute('d',path);
}
function setMenu(open,{focus=false,immediate=false}={}){
  clearTimeout(menuTimer);
  bloom.dataset.instant=String(immediate);
  menuButton.setAttribute('aria-expanded',String(open));
  bloom.dataset.open=String(open);
  setIcon(menuIcon,open?paths.close:paths.menu);
  if(open){
    bloom.dataset.open='false';
    menu.hidden=false;menu.inert=false;menu.removeAttribute('aria-hidden');
    // Flush only the initial state, before the compositor starts the transition.
    if(!matchMedia('(prefers-reduced-motion: reduce)').matches)menu.getBoundingClientRect();
    bloom.dataset.open='true';
  }else{
    menu.inert=true;menu.setAttribute('aria-hidden','true');
    if(immediate)menu.hidden=true;
    else menuTimer=setTimeout(()=>{menu.hidden=true},320);
    if(focus)menuButton.focus();
  }
}
menuButton.addEventListener('click',event=>setMenu(menuButton.getAttribute('aria-expanded')!=='true',{immediate:event.detail===0}));
// Keep links active throughout default browser activation. Close at snapshot time.
addEventListener('pageswap',()=>setMenu(false,{immediate:true}));
document.addEventListener('site:navigate',()=>setMenu(false,{immediate:true}));
document.addEventListener('click',e=>{if(!bloom.contains(e.target))setMenu(false)});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menuButton.getAttribute('aria-expanded')==='true')setMenu(false,{focus:true,immediate:true})});
// Inspect the completed focus destination, never the transient blur/focusout state.
document.addEventListener('focusin',event=>{if(menuButton.getAttribute('aria-expanded')==='true'&&!bloom.contains(event.target))setMenu(false,{immediate:true})});
menuButton.addEventListener('keydown',e=>{if(e.key==='ArrowDown'){e.preventDefault();setMenu(true,{immediate:true});menu.querySelector('a').focus()}});
matchMedia('(max-width: 600px)').addEventListener('change',()=>setMenu(false,{immediate:true}));
addEventListener('pageshow',e=>{if(e.persisted)setMenu(false,{immediate:true})});
document.addEventListener('toggle',event=>{const details=event.target;if(details.matches('.care'))setIcon(details.querySelector('[data-care-icon]'),details.open?paths.minus:paths.plus)},true);
function filterCatalog(value){
  if(!['all','light','red','garden'].includes(value))value='all';
  const filters=document.querySelectorAll('[data-filter]'),cards=document.querySelectorAll('[data-tone]');
  filters.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.filter===value)));
  let count=0;cards.forEach(card=>{card.hidden=value!=='all'&&card.dataset.tone!==value;if(!card.hidden)count++});
  const countLabel=document.querySelector('#result-count');
  if(countLabel)countLabel.textContent=count===1?'1 букет':`${count} букета`;
}
function initPage(){filterCatalog(new URL(location.href).searchParams.get('palette')||'all')}
initPage();document.addEventListener('site:ready',initPage);
document.addEventListener('click',event=>{
  const button=event.target.closest('[data-filter]');if(!button)return;
  filterCatalog(button.dataset.filter);const url=new URL(location.href);
  if(button.dataset.filter==='all')url.searchParams.delete('palette');else url.searchParams.set('palette',button.dataset.filter);
  history.replaceState(history.state,'',url);
  document.dispatchEvent(new CustomEvent('site:urlchange'));
});
