import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../assets/js/motion.js',import.meta.url),'utf8');
const boot=fs.readFileSync(new URL('../assets/js/page-entry.js',import.meta.url),'utf8');
function environment({native=false,sameDocument=false,reduced=false,denied=false,animateThrows=false}={}){
 const events={},docEvents={},timers=new Map(),storage=new Map(),animations=[],navigations=[];
 let timerId=0;
 const on=(registry,name,fn)=>(registry[name]??=[]).push(fn);
 const emit=(registry,name,event={})=>(registry[name]||[]).forEach(fn=>fn(event));
 const preference={matches:reduced,addEventListener:(name,fn)=>on(events,'motion-'+name,fn)};
 const dataset={};
 const main={animate(frames,options){
  if(animateThrows)throw Error('Unavailable animation');
  let resolve,reject;const finished=new Promise((yes,no)=>{resolve=yes;reject=no});
  const animation={frames,options,finished,resolve,cancel(){this.cancelled=true;reject(Error('Cancelled'))}};
  animations.push(animation);return animation;
 }};
 const context={URL,Date:{now:()=>10000},matchMedia:()=>preference,
  addEventListener:(name,fn)=>on(events,name,fn),
  setTimeout:(fn,ms)=>{const id=++timerId;timers.set(id,{fn,ms});return id},clearTimeout:id=>timers.delete(id),
  location:{href:'https://aly.test/catalog.html',assign:url=>navigations.push(url)},
  sessionStorage:{getItem:key=>{if(denied)throw Error('Denied');return storage.get(key)??null},setItem:(key,value)=>{if(denied)throw Error('Denied');storage.set(key,value)},removeItem:key=>{if(denied)throw Error('Denied');storage.delete(key)}},
  document:{documentElement:{dataset},querySelector:()=>main,addEventListener:(name,fn)=>on(docEvents,name,fn),dispatchEvent:event=>emit(docEvents,event.type,event)},
  CustomEvent:class{constructor(type){this.type=type}}
 };
 if(native)context.CSSViewTransitionRule=function(){};
 if(sameDocument)context.document.startViewTransition=function(){};
 const click=(href='https://aly.test/atelier.html',options={})=>{
  const anchor={href,target:options.target||'',hasAttribute:name=>name==='download'&&!!options.download};
  const event={button:0,detail:1,defaultPrevented:false,target:{closest:()=>anchor},preventDefault(){this.defaultPrevented=true},...options};
  emit(docEvents,'click',event);return event;
 };
 return {context,events,docEvents,preference,timers,storage,animations,navigations,dataset,main,click,
  emit:(name,event)=>emit(events,name,event),
  load:()=>vm.runInNewContext(source,context),loadBoot:()=>vm.runInNewContext(boot,context)};
}
const settle=async()=>{await Promise.resolve();await Promise.resolve()};
{
 const env=environment();env.load();let closing=0;env.context.document.addEventListener('site:navigate',()=>closing++);
 assert(env.click().defaultPrevented);assert.equal(closing,1);assert.equal(env.navigations.length,0);assert.equal(env.animations[0].options.duration,160);
 assert(env.animations[0].frames.every(frame=>frame.opacity>=.6),'The outgoing document must stay visible');
 env.animations[0].resolve();await settle();
 assert.deepEqual(env.navigations,['https://aly.test/atelier.html']);
 assert.deepEqual(JSON.parse(env.storage.get('aly-page-entry')),{to:'https://aly.test/atelier.html',at:10000});
 assert.equal(env.timers.size,0,'Completion must remove the timeout');
 env.emit('pageshow',{persisted:true});assert(env.animations[0].cancelled,'Back restores an unfaded document');
}
{
 const env=environment();env.load();env.click();env.click('https://aly.test/events.html');
 assert.equal(env.animations.length,1,'A rapid second click must not restart the exit');
 env.animations[0].resolve();await settle();assert.deepEqual(env.navigations,['https://aly.test/events.html']);
}
{
 const env=environment();env.load();env.click();env.emit('keydown',{key:'Escape'});await settle();
 assert.equal(env.navigations.length,0);assert.equal(env.timers.size,0);assert.equal(env.storage.size,0);assert(env.animations[0].cancelled);
 env.click('https://aly.test/events.html');env.animations[1].resolve();await settle();assert.equal(env.navigations.length,1);
}
{
 const env=environment();env.load();env.click();const timer=[...env.timers.values()].find(t=>t.ms===240);timer.fn();
 assert.equal(env.navigations.length,1,'Paused animation must not trap navigation');env.animations[0].resolve();await settle();assert.equal(env.navigations.length,1,'Finish must not navigate twice');
}
for(const options of [{detail:0},{ctrlKey:true},{metaKey:true},{shiftKey:true},{altKey:true},{button:1},{defaultPrevented:true},{target:'_blank'},{download:true}]){
 const env=environment();env.load();const event=env.click(undefined,options);assert.equal(env.animations.length,0);assert.equal(event.defaultPrevented,!!options.defaultPrevented);
}
for(const url of ['https://other.test/atelier.html','mailto:test@example.com','https://aly.test/catalog.html#flowers','https://aly.test/photo.webp']){
 const env=environment();env.load();assert(!env.click(url).defaultPrevented);assert.equal(env.animations.length,0);
}
{
 const env=environment();env.load();env.emit('keydown',{key:'Enter'});assert(!env.click().defaultPrevented);env.emit('pointerdown');assert(env.click().defaultPrevented);
}
{
 const env=environment({native:true});env.load();assert(!env.docEvents.click,'Native browsers must retain their default link navigation');
}
{
 const env=environment({sameDocument:true});env.load();assert(!env.docEvents.click,'The legacy exit fallback must not compete with the shared navigator');env.loadBoot();assert(!env.dataset.pageEntry);
}
{
 const env=environment({reduced:true});env.load();assert(!env.click().defaultPrevented);assert.equal(env.animations.length,0);
}
{
 const env=environment();env.load();env.click();env.preference.matches=true;env.emit('motion-change');await settle();assert.equal(env.navigations.length,1);assert(env.animations[0].cancelled);
}
for(const config of [{denied:true},{animateThrows:true}]){
 const env=environment(config);env.load();env.click();if(env.animations.length){env.animations[0].resolve();await settle()}assert.equal(env.navigations.length,1,'Unavailable storage/animation must not break navigation');
}
for(const [entry,enabled] of [[{to:'https://aly.test/catalog.html',at:9990},true],[{to:'https://aly.test/atelier.html',at:9990},false],[{to:'https://aly.test/catalog.html',at:0},false],[{to:'https://aly.test/catalog.html',at:11000},false],['bad json',false]]){
 const env=environment();env.storage.set('aly-page-entry',typeof entry==='string'?entry:JSON.stringify(entry));env.loadBoot();assert.equal(env.dataset.pageEntry==='true',enabled);assert.equal(env.storage.size,0);
}
for(const config of [{native:true},{reduced:true},{denied:true}]){
 const env=environment(config);env.storage.set('aly-page-entry',JSON.stringify({to:'https://aly.test/catalog.html',at:9990}));env.loadBoot();assert(!env.dataset.pageEntry);
}
console.log('PASS: Firefox/Zen fallback, repeat clicks, Escape, Back cleanup, timeout, keyboard/reduced motion, native opt-out, storage failures and one-use pre-paint markers. Browser UI still requires verification.');
