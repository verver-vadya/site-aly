import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as model from '../assets/js/builder-model.mjs';
class Element{
 constructor(){this.listeners=new Map();this.attrs={};this.dataset={};this.textContent='';this.disabled=false;const classes=new Set();this.classList={add:key=>classes.add(key),toggle:(key,on)=>on?classes.add(key):classes.delete(key)}}
 addEventListener(type,fn,{signal}={}){if(signal?.aborted)return;const set=this.listeners.get(type)||new Set();set.add(fn);this.listeners.set(type,set);signal?.addEventListener('abort',()=>set.delete(fn),{once:true})}
 emit(type,extra={}){for(const fn of [...(this.listeners.get(type)||[])])fn({target:this,detail:1,preventDefault(){},...extra})}
 setAttribute(key,value){this.attrs[key]=value}getAttribute(key){return this.attrs[key]}
 matches(){return false}
 querySelector(key){return this.nodes?.[key]??null}
 querySelectorAll(key){return this.lists?.[key]??[]}
}
function root(){
 const root=new Element(),form=new Element(),stage=new Element(),canvas=new Element(),save=new Element(),icon=new Element();icon.nodes={path:new Element()};save.nodes={'morph-icon':icon};
 canvas.getContext=()=>({clearRect(){}});canvas.animate=()=>({cancel(){canvas.cancelled=true}});stage.nodes={canvas};
 form.nodes={};form.lists={};
 for(const [name,values] of Object.entries({palette:['milk','red','garden'],size:['small','medium','large'],wrap:Object.keys(model.WRAPS),ribbon:Object.keys(model.RIBBONS)}))form.lists[`[name=${name}]`]=values.map(value=>Object.assign(new Element(),{name,value}));
 const rows=model.FLOWERS.map((flower,i)=>{
  const row=new Element();row.dataset.flower=String(i);row.nodes={output:new Element()};
  for(const n of [-1,1]){const button=new Element();button.dataset.delta=String(n);button.closest=selector=>selector==='[data-flower]'?row:button;row.nodes[`[data-delta="${n}"]`]=button}
  form.nodes[`[data-flower="${i}"]`]=row;return row;
 });
 root.nodes={form,'.bouquet-canvas':stage,'[data-save]':save};
 for(const key of ['[data-builder-status]','[data-stem-count]','[data-price]','[data-palette-label]','[data-composition]','[data-custom-size]','[data-reset]','[data-loading]'])root.nodes[key]=new Element();
 return {root,form,canvas,save,rows,plus(i){const target=rows[i].nodes['[data-delta="1"]'];form.emit('click',{target})},counts(){return rows.map(row=>Number(row.nodes.output.textContent))}};
}
const stored=new Map(),win=new Element(),preference=new Element();preference.matches=false;
let draws=0,exports=0,downloads=0,resolveFont,delayImages=false;const imageResolvers=[];
const doc={fonts:{ready:Promise.resolve()},body:{append(){}},createElement(tag){if(tag==='canvas'){exports++;return{getContext:()=>({}),toBlob:fn=>fn({})}}return{click(){downloads++},remove(){}}}};
const context={...model,drawBouquet:()=>draws++,drawExport(){},AbortController,window:win,document:doc,
 localStorage:{getItem:key=>stored.get(key)||null,setItem:(key,value)=>stored.set(key,value)},customElements:{get:()=>true},matchMedia:()=>preference,
 Image:class{decode(){return delayImages?new Promise(resolve=>imageResolvers.push(resolve)):Promise.resolve()}},
 URL:class extends URL{static createObjectURL(){return 'blob:fixture'}static revokeObjectURL(){}},setTimeout:()=>1};
let source=fs.readFileSync(new URL('../assets/js/builder.js',import.meta.url),'utf8');
source=source.replace(/^import[^\n]+\n/gm,'').replace('export function mountBuilder','function mountBuilder').replaceAll('import.meta.url',JSON.stringify('https://aly.test/assets/js/builder.js'));
const mount=vm.runInNewContext(source+'\nmountBuilder',context);
const a=root(),first=mount(a.root);await first.ready;assert.deepEqual(a.counts(),[3,2,2,0,0,0,0,0]);a.plus(1);assert.deepEqual(a.counts(),[3,3,2,0,0,0,0,0]);
first.destroy();const previous=draws;a.plus(1);assert.equal(draws,previous,'Removed controls must not fire');assert.equal(win.listeners.get('pageshow').size,0);assert.equal(preference.listeners.get('change').size,0);
const b=root(),second=mount(b.root);await second.ready;assert.deepEqual(b.counts(),[3,3,2,0,0,0,0,0],'Re-entry restores the draft');b.plus(1);assert.deepEqual(b.counts(),[3,4,2,0,0,0,0,0],'A second visit must apply one increment, not two');
doc.fonts.ready=new Promise(resolve=>resolveFont=resolve);b.save.emit('click');second.destroy();resolveFont();for(let i=0;i<10;i++)await Promise.resolve();assert.equal(exports,0);assert.equal(downloads,0,'A disposed view must not start a late export');
delayImages=true;const c=root(),third=mount(c.root);const before=draws;third.destroy();imageResolvers.forEach(resolve=>resolve());await third.ready;assert.equal(draws,before,'Late image decoding must not redraw a removed view');
console.log('PASS: builder mount/dispose, restored draft, one increment per click after re-entry, no leaked global listeners, no late image render or export from a removed page. Simulated controls, not browser UI.');
