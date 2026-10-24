import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
const source=fs.readFileSync(new URL('../assets/js/motion.js',import.meta.url),'utf8');
const motionCSS=fs.readFileSync(new URL('../assets/css/motion.css',import.meta.url),'utf8');
assert(/@view-transition\s*\{\s*navigation\s*:\s*auto/.test(motionCSS),'The requested page animation must remain enabled');
function run(reduced=false){
 const events={};let skipped=0;
 vm.runInNewContext(source,{CSSViewTransitionRule:function(){},addEventListener:(key,fn)=>events[key]=fn,matchMedia:()=>({matches:reduced})});
 const swap=()=>events.pageswap({viewTransition:{skipTransition(){skipped++}}});
 assert(!events.click,'Native links must not be intercepted');
 swap();assert.equal(skipped,reduced?1:0);
 events.keydown({key:'Enter'});swap();assert.equal(skipped,reduced?2:1);
 events.pointerdown();swap();assert.equal(skipped,reduced?3:1);
 events.pageshow();return skipped;
}
run();run(true);
for(const page of ['index.html','catalog.html','bouquet-nezhno.html','bouquet-smelo.html','bouquet-po-svoemu.html','events.html','atelier.html','builder.html','contacts.html','404.html']){
 const html=fs.readFileSync(new URL('../'+page,import.meta.url),'utf8');
 assert(!html.includes('page-curtain'),page+' still includes curtain');
 assert(!html.includes('motion-boot.js'),page+' still includes the curtain boot');
 const names=[...html.matchAll(/view-transition-name:([^";]+)/g)].map(m=>m[1]);
 assert.equal(new Set(names).size,names.length,page+' has duplicate shared images');
 assert.equal(names.length,page==='catalog.html'?3:page.startsWith('bouquet-')?1:0,page+' has missing or extra shared photos');
 assert(html.includes('assets/js/motion.js?v='),page+' is missing the navigation accessibility controller');
 assert(html.includes('assets/js/navigation.js?v='),page+' is missing the shared transition controller');
 assert(html.includes('<head><script src="assets/js/page-entry.js?v='),page+' is missing the early fallback entry controller');
 assert(html.includes('data-menu-icon'),page+' is missing menu icon');
 assert(html.includes('assets/js/icons.js'),page+' is missing icon loader');
 assert(html.includes('aria-controls="mobile-nav"'),page+' is missing menu controls');
 const assets=[...html.matchAll(/(?:href|src)="(assets\/(?:css|js)\/[^"?]+)\?v=([0-9a-f]+)"/g)];
 assert(assets.length>=7,page+' must version all CSS/JS references');
 for(const [,path,hash] of assets){
  const expected=createHash('sha256').update(fs.readFileSync(new URL('../'+path,import.meta.url),'utf8').replace(/\r\n/g,'\n')).digest('hex').slice(0,10);
  assert.equal(hash,expected,page+' refers to a stale version of '+path);
 }
}
console.log('PASS: native navigation, keyboard/reduced-motion opt-out, unique photo names, menu markup and fresh asset hashes across 10 pages.');
