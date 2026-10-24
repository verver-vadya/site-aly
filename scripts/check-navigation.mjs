import assert from 'node:assert/strict';
import {createNavigator,routeURL} from '../assets/js/navigation-core.mjs';

class Hub{
 constructor(){this.listeners=new Map()}
 addEventListener(type,fn,options={}){if(options?.signal?.aborted)return;const set=this.listeners.get(type)||new Set();set.add(fn);this.listeners.set(type,set);options?.signal?.addEventListener('abort',()=>set.delete(fn),{once:true})}
 dispatchEvent(event){for(const fn of [...(this.listeners.get(event.type)||[])])fn(event);return !event.defaultPrevented}
 emit(type,props={}){const event={type,defaultPrevented:false,preventDefault(){this.defaultPrevented=true},...props};this.dispatchEvent(event);return event}
}
class Node{
 constructor(attrs={}){this.attrs={...attrs};this.removed=false;this.isConnected=true}
 setAttribute(key,value){this.attrs[key]=String(value)}
 getAttribute(key){return this.attrs[key]??null}
 hasAttribute(key){return key in this.attrs}
 removeAttribute(key){delete this.attrs[key]}
 remove(){this.removed=true;this.isConnected=false}
 focus(){this.focused=true}
 scrollIntoView(){this.scrolled=true}
}
const link=(path,attrs={})=>Object.assign(new Node({href:path,...attrs}),{href:new URL(path,'https://aly.test/').href,target:attrs.target||''});
class Main extends Node{
 constructor(name,owner){super({id:'main'});this.name=name;this.owner=owner;this.fallbacks=[new Node(),new Node()]}
 querySelectorAll(selector){if(selector==='script,noscript')return this.fallbacks;return []}
 replaceWith(next){this.isConnected=false;next.isConnected=true;next.owner=this.owner;this.owner.main=next}
}
function fixture(name){
 const current=name.startsWith('bouquet-')?'catalog.html':name;
 return {title:name+' · Алый',main:new Main(name,null),meta:new Node({content:'Description '+name}),
  querySelector(selector){if(selector==='main')return this.main;if(selector==='header .brand')return new Node();if(selector==='meta[name="description"]')return this.meta;return null},
  querySelectorAll(){return [link(current,{'aria-current':'page'})]}};
}
function env({native=true,reduced=false,mount}={}){
 const doc=new Hub(),win=new Hub(),requests=[],mounts=[],timers=new Map(),transitions=[],assigned=[],replaced=[];let tid=0;
 doc.main=new Main('catalog.html',doc);doc.documentElement={dataset:{}};doc.title='catalog.html · Алый';doc.meta=new Node({content:'initial'});
 doc.links=['catalog.html','builder.html','events.html','atelier.html'].map(path=>link(path));doc.body={nodes:[],append(node){this.nodes.push(node)}};
 doc.querySelector=selector=>selector==='main'?doc.main:selector==='meta[name="description"]'?doc.meta:null;
 doc.querySelectorAll=selector=>selector==='header a[href]'?doc.links:[];
 doc.createElement=()=>new Node();doc.importNode=node=>new Main(node.name,doc);doc.anchor=new Node();doc.getElementById=id=>id==='composition'?doc.anchor:null;
 const pages=new Map();
 win.location={href:'https://aly.test/catalog.html',assign:url=>assigned.push(url),replace:url=>replaced.push(url)};
 win.scrollX=0;win.scrollY=0;win.scrollTo=options=>{win.scrollX=options.left;win.scrollY=options.top};
 const entries=[{url:win.location.href,state:null}];let index=0;
 win.history={scrollRestoration:'auto',get state(){return entries[index].state},replaceState(state,unused,url){entries[index]={state,url:new URL(url,win.location.href).href};win.location.href=entries[index].url},pushState(state,unused,url){entries.splice(index+1);entries.push({state,url:new URL(url,win.location.href).href});index++;win.location.href=entries[index].url},back(){index--;win.location.href=entries[index].url;win.emit('popstate',{state:entries[index].state})},forward(){index++;win.location.href=entries[index].url;win.emit('popstate',{state:entries[index].state})}};
 win.AbortController=AbortController;win.CustomEvent=class{constructor(type){this.type=type}};
 const preference=new Hub();preference.matches=reduced;win.matchMedia=()=>preference;
 win.setTimeout=(fn,ms)=>{const id=++tid;timers.set(id,{fn,ms});return id};win.clearTimeout=id=>timers.delete(id);
 win.DOMParser=class{parseFromString(text){return text==='invalid'?{querySelector:()=>null}:fixture(text)}};
 win.fetch=async(url,options)=>{
  requests.push({url,signal:options.signal});const key=new URL(url).pathname.slice(1);
  const custom=pages.get(key);if(custom)return custom(url,options);
  return {ok:true,url:url.split('#')[0],text:async()=>key};
 };
 if(native)doc.startViewTransition=update=>{
  const callback=Promise.resolve().then(update);
  const transition={ready:callback.then(()=>{}),updateCallbackDone:callback,finished:callback.then(()=>{}),skipTransition(){this.skipped=true}};
  transitions.push(transition);return transition;
 };
 const mountView=async(main,options)=>{
  if(mount)return mount(main,options);
  const handle={name:main.name,destroyed:0,ready:Promise.resolve(),destroy(){this.destroyed++}};mounts.push(handle);return handle;
 };
 const navigator=createNavigator(win,doc,mountView);
 const click=(href,extra={})=>doc.emit('click',{button:0,detail:1,target:{closest:()=>link(href)},...extra});
 return {doc,win,navigator,mounts,pages,transitions,requests,assigned,replaced,entries,timers,preference,click};
}
const flush=async()=>{for(let i=0;i<50;i++)await Promise.resolve()};
const destination=name=>new URL('https://aly.test/'+name);
for(const name of ['builder.html','bouquet-nezhno.html','index.html',''])assert(routeURL(link(name),'https://aly.test/catalog.html'));
for(const name of ['https://other.test/atelier.html','mailto:a@b.test','/other/atelier.html','concept.html','asset.png'])assert.equal(routeURL(link(name),'https://aly.test/catalog.html'),null);
assert.equal(routeURL(link('builder.html',{download:''}),'https://aly.test/catalog.html'),null);
assert.equal(routeURL(link('builder.html',{target:'_blank'}),'https://aly.test/catalog.html'),null);
{
 const e=env();await e.navigator.ready;e.win.scrollY=420;
 await e.navigator.navigate(destination('builder.html'));
 assert.equal(e.doc.main.name,'builder.html');assert.equal(e.doc.title,'builder.html · Алый');assert.equal(e.win.scrollY,0);
 assert.equal(e.entries.length,2);assert.deepEqual(e.entries[0].state.alyScroll,[0,420]);assert.equal(e.doc.links[1].getAttribute('aria-current'),'page');assert.equal(e.doc.links[0].getAttribute('aria-current'),null);
 assert(e.doc.main.fallbacks.every(node=>node.removed),'Inert-document scripts and noscript must not enter the live page');
 assert.equal(e.mounts[0].destroyed,1);assert.equal(e.transitions.length,1);assert.equal(e.doc.main.getAttribute('aria-busy'),'false');
 e.win.scrollY=680;await e.navigator.navigate(destination('atelier.html'));
 e.win.history.back();await flush();assert.equal(e.doc.main.name,'builder.html');assert.equal(e.win.scrollY,680);assert.equal(e.entries.length,3,'Back must not push another history entry');
 e.win.history.forward();await flush();assert.equal(e.doc.main.name,'atelier.html');
 e.navigator.destroy();assert.equal(e.win.history.scrollRestoration,'auto');assert(e.mounts.every(handle=>handle.destroyed===1),'Every mounted page must be disposed exactly once');
}
for(const config of [{reduced:true},{native:false}]){
 const e=env(config);await e.navigator.ready;await e.navigator.navigate(destination('atelier.html'));assert.equal(e.doc.main.name,'atelier.html');assert.equal(e.transitions.length,0);e.navigator.destroy();
}
{
 const e=env();await e.navigator.ready;const sameMain=e.doc.main;e.win.scrollY=320;
 assert(!e.click('catalog.html#composition').defaultPrevented);
 e.win.history.pushState(e.win.history.state,'','https://aly.test/catalog.html#composition');e.win.scrollY=900;
 e.win.history.back();await flush();assert.equal(e.win.scrollY,320);assert.equal(e.doc.main,sameMain);assert.equal(e.requests.length,0,'Hash history must keep the current page and its controls');e.navigator.destroy();
}
{
 const e=env();await e.navigator.ready;await e.navigator.navigate(destination('bouquet-nezhno.html#composition'),{keyboard:true});assert(e.doc.main.focused);assert(e.doc.anchor.scrolled);assert.equal(e.transitions.length,0);e.navigator.destroy();
}
for(const extra of [{ctrlKey:true},{metaKey:true},{shiftKey:true},{altKey:true},{button:1},{defaultPrevented:true}]){
 const e=env();await e.navigator.ready;const event=e.click('atelier.html',extra);assert.equal(event.defaultPrevented,!!extra.defaultPrevented);assert.equal(e.requests.length,0);e.navigator.destroy();
}
{
 const e=env();await e.navigator.ready;assert(!e.click('catalog.html#flowers').defaultPrevented);assert(e.click('catalog.html').defaultPrevented);assert.equal(e.requests.length,0);assert(e.click('atelier.html').defaultPrevented);await flush();assert.equal(e.doc.main.name,'atelier.html');e.navigator.destroy();
}
{
 const e=env();await e.navigator.ready;let resolveOld;e.pages.set('atelier.html',()=>new Promise(resolve=>resolveOld=resolve));
 const old=e.navigator.navigate(destination('atelier.html'));const latest=e.navigator.navigate(destination('events.html'));await latest;
 resolveOld({ok:true,url:'https://aly.test/atelier.html',text:async()=>'atelier.html'});await old;
 assert.equal(e.doc.main.name,'events.html');assert.equal(e.entries.length,2);assert(e.requests[0].signal.aborted);e.navigator.destroy();
}
{
 const e=env();await e.navigator.ready;e.pages.set('atelier.html',(url,{signal})=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(Error('Aborted')))));
 const pending=e.navigator.navigate(destination('atelier.html'));e.win.emit('keydown',{key:'Escape'});await pending;assert.equal(e.doc.main.name,'catalog.html');assert.equal(e.assigned.length,0);e.navigator.destroy();
}
for(const response of [{ok:false},{ok:true,url:'https://aly.test/atelier.html',text:async()=>'invalid'},{ok:true,url:'https://other.test/atelier.html',text:async()=>'atelier.html'}]){
 const e=env();await e.navigator.ready;e.pages.set('atelier.html',async()=>response);await e.navigator.navigate(destination('atelier.html'));assert.deepEqual(e.assigned,['https://aly.test/atelier.html']);assert.equal(e.doc.main.name,'catalog.html');e.navigator.destroy();
}
{
 const e=env();await e.navigator.ready;e.pages.set('atelier.html',async()=>({ok:false}));await e.navigator.navigate(destination('atelier.html'),{mode:'none'});assert.equal(e.replaced.length,1);assert.equal(e.entries.length,1);e.navigator.destroy();
}
{
 let resolveModule;const handles=[];
 const e=env({mount:async main=>{
  if(main.name==='builder.html')await new Promise(resolve=>resolveModule=resolve);
  const handle={name:main.name,ready:Promise.resolve(),destroyed:0,destroy(){this.destroyed++}};handles.push(handle);return handle;
 }});await e.navigator.ready;
 const first=e.navigator.navigate(destination('builder.html'));await flush();assert.equal(e.doc.main.name,'builder.html');
 e.win.emit('keydown',{key:'Escape'});resolveModule();await first;assert.equal(e.doc.main.name,'builder.html');assert.equal(handles.at(-1).destroyed,0,'Escape after commit must leave a live page');e.navigator.destroy();
}
{
 let resolveModule;const handles=[];
 const e=env({mount:async main=>{if(main.name==='builder.html')await new Promise(resolve=>resolveModule=resolve);const handle={name:main.name,ready:Promise.resolve(),destroyed:0,destroy(){this.destroyed++}};handles.push(handle);return handle}});await e.navigator.ready;
 const first=e.navigator.navigate(destination('builder.html'));await flush();
 const second=e.navigator.navigate(destination('events.html'));await second;resolveModule();await first;await flush();
 assert.equal(e.doc.main.name,'events.html');assert.equal(handles.find(h=>h.name==='builder.html').destroyed,1,'A late module must dispose its removed page');e.navigator.destroy();
}
console.log('PASS: shared View Transitions, DOM lifecycle, history/scroll, anchors, keyboard/reduced motion, modifiers, cancellation, racing requests, late modules and ordinary-navigation recovery. Simulated DOM, not browser UI.');
