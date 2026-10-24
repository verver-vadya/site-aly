(()=>{
 const studies=[['poppy','Неровный мак','Живой силуэт, крупная сердцевина. Ближе всего к характеру главной.'],['initial','А / ателье','Буква и лист в одном знаке. Более строгий, собранный характер.'],['bouquet','Свободный букет','Три цветка разной высоты. Прямая связь с мастерской и конструктором.'],['petal','Лепестки над «й»','Цветок встроен в название. Компактный вариант с акцентом на слове.']];
 const params=new URLSearchParams(location.search);
 function select(value){
  const index=Number(value)-1;if(!Number.isInteger(index)||!studies[index])return;
  const [id,name,note]=studies[index],base=`assets/brand/studies/${id}/`;
  for(const [selector,file] of [['[data-study-logo]','logo.svg'],['[data-study-cream]','logo-cream.svg'],['[data-study-mark]','mark.svg'],['[data-study-favicon]','favicon.svg']])document.querySelectorAll(selector).forEach(image=>image.src=base+file);
  document.querySelector('link[rel=icon]').href=base+'favicon.svg';document.querySelector('[data-study-note]').textContent=note;
  document.querySelectorAll('[data-study]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.study===String(index+1))));
  document.title=`${name} · Логотип «Алого»`;const url=new URL(location.href);url.searchParams.set('logo',String(index+1));history.replaceState(null,'',url);
 }
 document.querySelectorAll('[data-study]').forEach(button=>button.addEventListener('click',()=>select(button.dataset.study)));
 document.documentElement.dataset.reviewClean=String(params.get('clean')==='1');select(/^[1-4]$/.test(params.get('logo')||'')?params.get('logo'):'1');
})();
