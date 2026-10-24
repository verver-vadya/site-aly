import fs from 'node:fs';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {initialState,choosePalette,chooseSize,FLOWERS,WRAPS,RIBBONS} from '../assets/js/builder-model.mjs';
import {drawExport,drawBouquet} from '../assets/js/builder-render.mjs';

// Optional offline check. The website has no runtime package dependency.
// Pass an installed @napi-rs/canvas/index.js path; no browser is started.
if(!process.argv[2])throw new Error('Pass an absolute path to an installed @napi-rs/canvas/index.js.');
const {createCanvas,loadImage,GlobalFonts,Path2D}=await import(pathToFileURL(process.argv[2]));
globalThis.Path2D=Path2D;
GlobalFonts.registerFromPath('assets/fonts/prata-cyrillic-400-normal.woff2','Prata');
GlobalFonts.registerFromPath('assets/fonts/manrope-cyrillic-wght-normal.woff2','Manrope');
const assets={createCanvas};
assets.brand=await loadImage('assets/brand/logo.svg');
for(const [key,file] of Object.entries({heads:'flower-heads',extraHeads:'flower-heads-extra',foliage:'foliage',stems:'bare-stems',bow:'satin-bow',paper:'paper-texture',paperFront:'paper-front'}))assets[key]=await loadImage('assets/images/'+file+'.webp');
for(const [name,state] of [['garden',initialState()],['red',{...chooseSize(choosePalette(initialState(),'red'),'medium'),wrap:'ivory'}],['milk',{...chooseSize(choosePalette(initialState(),'milk'),'large'),wrap:'kraft',ribbon:'milk'}],['full',{...initialState(),counts:[4,3,3,2,4,3,3,3],wrap:'ivory'}],['max',{...initialState(),counts:[6,5,4,3,5,4,4,4],wrap:'sage',ribbon:'rose'}],['sparse',{...initialState(),counts:[0,0,1,0,1,0,0,1],wrap:'none',ribbon:'milk'}]]){
 const canvas=createCanvas(1200,1500);drawExport(canvas.getContext('2d'),state,assets);
 assert.deepEqual([...canvas.getContext('2d').getImageData(0,0,1,1).data],[245,241,232,255]);
 assert.equal(canvas.getContext('2d').getImageData(500,600,1,1).data[3],255,'Export must remain opaque behind flowers');
 fs.writeFileSync(`review/builder-${name}-sample.webp`,canvas.toBuffer('image/webp',85));
}
// Attachment points must begin inside the calyx/head, including reflected
// asymmetric callas. This prevents a loose stem beside a floating flower.
for(let i=0;i<FLOWERS.length;i++){
 const image=i<4?assets.heads:assets.extraHeads,cell=i%4,[ax,ay]=FLOWERS[i].attachment;
 const sample=createCanvas(image.width,image.height);sample.getContext('2d').drawImage(image,0,0);
 assert(sample.getContext('2d').getImageData(Math.floor((cell%2+ax)*image.width/2),Math.floor((Math.floor(cell/2)+ay)*image.height/2),1,1).data[3]>180,'Stem attachment is outside flower '+FLOWERS[i].name);
}
for(let i=0;i<FLOWERS.length;i++){
 const canvas=createCanvas(760,850),counts=Array(FLOWERS.length).fill(0);counts[i]=1;
 drawBouquet(canvas.getContext('2d'),{...initialState(),counts,ribbon:'none'},760,850,assets);
 const data=canvas.getContext('2d').getImageData(0,0,760,850).data;
 let ink=0;for(let p=3;p<data.length;p+=4)if(data[p]>128)ink++;
 assert(ink>15000,`Species ${i} did not render`);
}
// A deliberately oversized green sprite exposes foliage that would otherwise
// show through the paper collar. This checks occlusion, not just draw order.
const greenSprite=createCanvas(1024,1536);greenSprite.getContext('2d').fillStyle='#00ff00';greenSprite.getContext('2d').fillRect(0,0,1024,1536);
const fixtureAssets={...assets,heads:createCanvas(1536,1024),extraHeads:createCanvas(1536,1024),foliage:greenSprite,stems:null};
const lush={...initialState(),counts:[25,0,0,0,0,0,0,0],ribbon:'none'};
const unwrapped=createCanvas(760,850);drawBouquet(unwrapped.getContext('2d'),lush,760,850,fixtureAssets);
// Check the marker's hue rather than brightness: directional lighting can
// darken a correctly visible leaf without changing whether paper occludes it.
const isGreen=data=>data[1]>100&&data[1]>data[0]*2&&data[1]>data[2]*2&&data[3]>200;
for(const kind of Object.keys(WRAPS).filter(key=>key!=='none')){
 const wrapped=createCanvas(760,850);drawBouquet(wrapped.getContext('2d'),{...lush,wrap:kind},760,850,fixtureAssets);
 for(const [x,y] of [[490,440],[260,470]]){
  assert(isGreen(unwrapped.getContext('2d').getImageData(x,y,1,1).data),'Fixture must include a protruding leaf');
  assert(!isGreen(wrapped.getContext('2d').getImageData(x,y,1,1).data),kind+' must hide foliage behind its paper collar');
 }
}
// Regression: wrapping must occlude stems with its actual alpha silhouette,
// never remove a segment that is still in open air above/alongside a sheet.
const transparent=createCanvas(1536,1024),emptyFoliage=createCanvas(1024,1536);
const stemAssets={...assets,heads:transparent,extraHeads:transparent,foliage:emptyFoliage};
const wide={...initialState(),counts:[6,5,4,3,5,4,4,4],ribbon:'none'};
const bare=createCanvas(760,850),sleeved=createCanvas(760,850),paperOnly=createCanvas(760,850);
drawBouquet(bare.getContext('2d'),wide,760,850,stemAssets);
drawBouquet(sleeved.getContext('2d'),{...wide,wrap:'kraft'},760,850,stemAssets);
drawBouquet(paperOnly.getContext('2d'),{...wide,wrap:'kraft'},760,850,{...stemAssets,stems:null});
const bareData=bare.getContext('2d').getImageData(0,0,760,850).data,wrappedData=sleeved.getContext('2d').getImageData(0,0,760,850).data,paperData=paperOnly.getContext('2d').getImageData(0,0,760,850).data;
let exposed=0,missing=0,firstMissing;
for(let y=250;y<650;y++)for(let x=80;x<690;x++){
 const p=(y*760+x)*4;
 if(bareData[p+3]>200&&paperData[p+3]<10){exposed++;if(wrappedData[p+3]<150){missing++;firstMissing??=[x,y]}}
}
assert(exposed>500,'The fixture must contain exposed stems around the paper');
assert.equal(missing,0,'Wrapping removed a stem in open air; first missing pixel '+firstMissing);
// The lower foliage stalk belongs inside the sleeve, in front of its rear
// sheet. A source-coloured marker isolates that stalk from the hidden leaves.
const markedFoliage=createCanvas(1024,1536),markedCtx=markedFoliage.getContext('2d');markedCtx.fillStyle='#00ff00';markedCtx.fillRect(578,960,30,90);
const stalkAssets={...assets,heads:transparent,extraHeads:transparent,stems:null,foliage:markedFoliage};
const stalkState={...initialState(),counts:[7,0,0,0,0,0,0,0],wrap:'kraft',ribbon:'none'};
const stalkCanvas=createCanvas(760,850);drawBouquet(stalkCanvas.getContext('2d'),stalkState,760,850,stalkAssets);
const stalkData=stalkCanvas.getContext('2d').getImageData(0,0,760,850).data;
let stalkGreen=0;for(let p=0;p<stalkData.length;p+=4)if(isGreen(stalkData.subarray(p,p+4)))stalkGreen++;
assert(stalkGreen>10,'The bare foliage stalk vanished behind the rear paper collar');
// A contact sheet makes every paper/ribbon tint and fold easy to inspect.
const materialSheet=createCanvas(1520,1700);
const materialKeys=Object.keys(WRAPS).filter(key=>key!=='none');
for(let i=0;i<materialKeys.length;i++){
 const ctx=materialSheet.getContext('2d');ctx.save();ctx.translate((i%3)*506,Math.floor(i/3)*850);ctx.fillStyle='#eee8dc';ctx.fillRect(0,0,506,850);
 const wrap=materialKeys[i],ribbon=Object.keys(RIBBONS)[i];
 drawBouquet(ctx,{...initialState(),counts:[1,0,0,0,2,1,1,2],wrap,ribbon},506,770,assets);
 ctx.fillStyle='#332b25';ctx.font='18px Manrope';ctx.fillText(WRAPS[wrap].label+' · '+RIBBONS[ribbon].label,24,815);ctx.restore();
}
fs.writeFileSync('review/builder-materials-sample.webp',materialSheet.toBuffer('image/webp',85));
// Every material combination must draw without compositing errors.
for(const wrap of Object.keys(WRAPS))for(const ribbon of Object.keys(RIBBONS)){
 const canvas=createCanvas(380,425);drawBouquet(canvas.getContext('2d'),{...initialState(),wrap,ribbon},380,425,assets);
 assert(canvas.getContext('2d').getImageData(192,325,1,1).data[3]>0);
}
console.log('PASS: native Canvas drew 8 species, 49 material combinations and bouquet exports up to 35 flowers, with opaque backgrounds, paper occlusion and no stem gaps outside the paper. Offline rendering only, not browser UI verification.');
