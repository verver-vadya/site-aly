import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {initialState,normalizeState,stemCount,estimate,flowerWord,choosePalette,chooseSize,changeCount,arrangement,foliageArrangement,MAX_STEMS,PALETTES,SIZES,FLOWERS,WRAPS,RIBBONS} from '../assets/js/builder-model.mjs';

const initial=initialState();
assert.equal(stemCount(initial),7);assert.equal(estimate(initial),2550);
assert.deepEqual(choosePalette(initial,'red').counts,[0,2,0,1,3,0,1,0]);
assert.equal(estimate({...initial,wrap:'ivory'}),2800);
assert.deepEqual(normalizeState(JSON.parse(JSON.stringify(initial))),initial);
for(const bad of [null,{},[],{...initial,version:3},{...initial,counts:[0,0,0,0]},{...initial,counts:[26,0,0,0]},{...initial,counts:[1.5,2,2,0]},{...initial,counts:[-1,3,3,0]},{...initial,counts:[null,3,3,0]},{...initial,counts:[25,1,0,0]}])assert.deepEqual(normalizeState(bad),initial);
assert.equal(normalizeState({...initial,wrap:'__proto__'}).wrap,'none');
let one={...initial,counts:[1,0,0,0,0,0,0,0]};assert.equal(changeCount(one,0,-1),one);assert.equal(changeCount(one,1,-1),one);
let max={...initial,counts:[MAX_STEMS,0,0,0,0,0,0,0]};assert.equal(changeCount(max,1,1),max);
assert.equal(changeCount(initial,9,1),initial);assert.equal(changeCount(initial,0,2),initial);
assert.deepEqual(changeCount(initial,1,1).counts,[3,3,2,0,0,0,0,0]);assert.equal(changeCount(initial,1,1).palette,'custom');assert.deepEqual(initial.counts,[3,2,2,0,0,0,0,0]);
assert.equal(choosePalette(initial,'unknown'),initial);assert.equal(chooseSize(initial,'unknown'),initial);
assert.deepEqual([1,2,5,11,21,22,25].map(flowerWord),['цветок','цветка','цветов','цветов','цветок','цветка','цветов']);
let cases=0;
for(let a=0;a<=MAX_STEMS;a++)for(let b=0;b<=MAX_STEMS-a;b++)for(let c=0;c<=MAX_STEMS-a-b;c++)for(let d=0;d<=MAX_STEMS-a-b-c;d++){
 const counts=[a,b,c,d,0,0,0,0],total=a+b+c+d;if(!total)continue;
 const state={...initial,counts};
 for(const [size,n] of Object.entries(SIZES)){
  const resized=chooseSize(state,size);assert.equal(stemCount(resized),n);assert(resized.counts.every(Number.isInteger));assert(resized.counts.every((v,i)=>v>=0&&(counts[i]>0||v===0)));
 }
 for(const palette of Object.keys(PALETTES))assert.equal(stemCount(choosePalette(state,palette)),total);
 const stems=arrangement(state);assert.equal(stems.length,total);
 for(let i=0;i<FLOWERS.length;i++)assert.equal(stems.filter(s=>s.species===i).length,counts[i]);
 assert(stems.every(s=>Number.isFinite(s.angle)&&Number.isFinite(s.length)));
 assert(stems.every(s=>s.x>0&&s.x<760&&s.y>0&&s.y<550&&s.size>0));
 assert(foliageArrangement(state).length<=3,'Foliage must stay sparse, even with 35 flowers');
 cases++;
}
for(const total of [7,13,19,25,35]){
 const stems=arrangement({...initial,counts:[total,0,0,0,0,0,0,0]});
 assert(Math.max(...stems.map(s=>s.y))-Math.min(...stems.map(s=>s.y))>80,'Large bouquets need several depth rows');
 assert(new Set(stems.map(s=>`${s.x.toFixed(2)},${s.y.toFixed(2)}`)).size===total);
 assert(stems.every((s,i)=>i===0||s.y>=stems[i-1].y),'Foreground heads must draw after the back row');
}
for(const count of [2,3]){
 const flowers=arrangement({...initial,counts:[count,0,0,0,0,0,0,0]});
 const separation=Math.min(...flowers.flatMap((a,i)=>flowers.slice(i+1).map(b=>Math.hypot(a.x-b.x,a.y-b.y))));
 assert(separation>180,'Sparse bouquets must retain air between flower heads');
 assert(Math.max(...flowers.map(f=>f.y))-Math.min(...flowers.map(f=>f.y))>=100,'Sparse bouquets need different heights');
}
assert.equal(changeCount({...initial,counts:[34,0,0,0,0,0,0,0]},0,1).counts[0],35);
assert.deepEqual(normalizeState({...initial,counts:[36,0,0,0,0,0,0,0]}),initial);
// Old four-species drafts migrate without losing choices or their packaging.
const migrated=normalizeState({version:1,palette:'custom',counts:[1,4,2,3],wrap:'kraft',ribbon:'milk'});
assert.deepEqual(migrated.counts,[1,4,2,3,0,0,0,0]);assert.equal(migrated.version,2);assert.equal(migrated.wrap,'kraft');
for(let seed=1;seed<=2500;seed++){
 const counts=Array(FLOWERS.length).fill(0),total=1+seed%MAX_STEMS;
 let value=seed;for(let n=0;n<total;n++){value=(Math.imul(value,1664525)+1013904223)>>>0;counts[value%FLOWERS.length]++}
 const state={...initial,counts},stems=arrangement(state);
 assert.deepEqual(normalizeState(state),state);assert.equal(stems.length,total);
 for(let i=0;i<FLOWERS.length;i++)assert.equal(stems.filter(s=>s.species===i).length,counts[i]);
 assert.equal(estimate(state),counts.reduce((sum,n,i)=>sum+n*FLOWERS[i].price,0));
 assert(stems.every(s=>typeof s.mirror==='boolean'));assert(stems.every(s=>s.x-s.size*.75>=0&&s.x+s.size*.75<=760));cases++;
}
const mirrored=arrangement({...initial,counts:[13,0,0,0,0,0,0,0]});
assert(mirrored.some(f=>f.mirror)&&mirrored.some(f=>!f.mirror),'Repeated heads need selective reflection');
for(const wrap of Object.keys(WRAPS))for(const ribbon of Object.keys(RIBBONS)){
 const state={...initial,wrap,ribbon};assert.deepEqual(normalizeState(state),state);assert.equal(estimate(state),2550+WRAPS[wrap].price);
}
for(const page of ['index','catalog','atelier','builder','events','contacts','bouquet-nezhno','bouquet-smelo','bouquet-po-svoemu','404']){
 const html=fs.readFileSync(new URL(`../${page}.html`,import.meta.url),'utf8');
 assert(html.includes('href="builder.html"'),page+' needs the constructor entry');
 assert.equal((html.match(/id="mobile-nav"/g)||[]).length,1);
}
const builder=fs.readFileSync(new URL('../builder.html',import.meta.url),'utf8');
assert(builder.includes('assets/js/navigation.js?v='));
assert(fs.readFileSync(new URL('../assets/js/navigation.js',import.meta.url),'utf8').includes("import('./builder.js?v="));
assert.equal((builder.match(/data-flower="/g)||[]).length,FLOWERS.length);
assert(builder.includes('<noscript>'));assert(builder.includes('data-save disabled'));
for(const module of ['builder-model.mjs','builder.js','builder-render.mjs','navigation.js']){
 const source=fs.readFileSync(new URL('../assets/js/'+module,import.meta.url),'utf8');
 for(const [,path,hash] of source.matchAll(/(?:from\s+|import\(\s*)['"](\.\/(?:builder(?:-(?:catalog|model|render)\.mjs|\.js)|navigation-core\.mjs))\?v=([0-9a-f]+)['"]/g)){
  const expected=createHash('sha256').update(fs.readFileSync(new URL('../assets/js/'+path,import.meta.url),'utf8').replace(/\r\n/g,'\n')).digest('hex').slice(0,10);
  assert.equal(hash,expected,module+' has a stale module dependency');
 }
}
console.log(`PASS: ${cases} valid compositions, resize/palette invariants, count limits, pricing, persistence validation, render inventory and constructor links on 10 pages.`);
