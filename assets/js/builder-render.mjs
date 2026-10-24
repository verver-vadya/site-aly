import {FLOWERS,WRAPS,RIBBONS,stemCount,estimate,formatPrice,flowerWord,arrangement,foliageArrangement} from './builder-model.mjs?v=380d0fe0b8';

const surfaceCache=new WeakMap();
const rgb=hex=>hex.match(/[a-f0-9]{2}/gi).map(v=>parseInt(v,16));
const tone=(hex,amount)=>'rgb('+rgb(hex).map(v=>Math.round(amount>0?v+(255-v)*amount:v*(1+amount))).join(',')+')';
function cacheFor(assets){let cache=surfaceCache.get(assets);if(!cache){cache=new Map();surfaceCache.set(assets,cache)}return cache}
function surface(assets,width,height){
  const canvas=assets.createCanvas?assets.createCanvas(width,height):document.createElement('canvas');canvas.width=width;canvas.height=height;return canvas;
}
function photoLayers(assets,key,image,crop,mirror=false){
  const cache=cacheFor(assets),cacheKey='light:'+key+':'+mirror;if(cache.has(cacheKey))return cache.get(cacheKey);
  const width=384,height=Math.round(width*crop[3]/crop[2]);
  const mask=surface(assets,width,height),m=mask.getContext('2d');
  if(mirror){m.translate(width,0);m.scale(-1,1)}m.drawImage(image,...crop,0,0,width,height);
  const shadow=surface(assets,width,height),c=shadow.getContext('2d');
  c.shadowColor='#231812b3';c.shadowBlur=9;c.shadowOffsetX=12;c.shadowOffsetY=17;c.drawImage(mask,0,0);
  c.shadowColor='transparent';c.globalCompositeOperation='destination-out';c.drawImage(mask,0,0);c.globalCompositeOperation='source-over';
  const light=surface(assets,width,height),l=light.getContext('2d');l.drawImage(mask,0,0);l.globalCompositeOperation='source-in';
  const gradient=l.createLinearGradient(0,0,width,height*.35);gradient.addColorStop(0,'#fff1d52c');gradient.addColorStop(.25,'#ffffff00');gradient.addColorStop(.5,'#252b3610');gradient.addColorStop(.75,'#252b3630');gradient.addColorStop(1,'#1a223d54');l.fillStyle=gradient;l.fillRect(0,0,width,height);
  const result={shadow,light};cache.set(cacheKey,result);return result;
}
function contactShadow(ctx,image,x,y,width,height){
  ctx.save();ctx.globalCompositeOperation='source-atop';ctx.drawImage(image,x,y,width,height);ctx.restore();
}
function sheet(ctx,path,gradient,texture,shadow=false){
  ctx.save();
  if(shadow){ctx.shadowColor='#30241d28';ctx.shadowBlur=10;ctx.shadowOffsetY=3}
  ctx.fillStyle=gradient;ctx.fill(path);ctx.shadowColor='transparent';
  ctx.clip(path);
  if(texture){ctx.globalCompositeOperation='soft-light';ctx.globalAlpha=.38;ctx.drawImage(texture,165,375,390,405);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over'}
  ctx.restore();
}
function tintedAsset(assets,key,image,color){
  const cache=cacheFor(assets);
  if(cache.has(key))return cache.get(key);
  const scale=Math.min(1,(image===assets.bow?768:800)/Math.max(image.width,image.height));
  const tinted=surface(assets,Math.round(image.width*scale),Math.round(image.height*scale));
  const c=tinted.getContext('2d');c.drawImage(image,0,0,tinted.width,tinted.height);
  // Multiply preserves photographic fibres, folds and directional highlights.
  c.globalCompositeOperation='multiply';c.fillStyle=color;c.fillRect(0,0,tinted.width,tinted.height);
  c.globalCompositeOperation='destination-in';c.drawImage(image,0,0,tinted.width,tinted.height);c.globalCompositeOperation='source-over';cache.set(key,tinted);
  return tinted;
}
function paper(ctx,kind,assets,front=false) {
  const base=WRAPS[kind].color;if(!base)return;
  ctx.save();
  if(!front){
    // The open collar sits behind the flower heads and in front of the foliage.
    const path=new Path2D();path.moveTo(176,396);path.quadraticCurveTo(273,426,392,482);path.quadraticCurveTo(466,443,542,385);path.lineTo(490,550);path.lineTo(419,650);path.lineTo(448,751);path.lineTo(317,746);path.lineTo(350,650);path.lineTo(266,559);path.closePath();
    const shade=ctx.createLinearGradient(210,410,455,665);shade.addColorStop(0,tone(base,-.05));shade.addColorStop(.5,tone(base,-.2));shade.addColorStop(1,tone(base,-.32));
    sheet(ctx,path,shade,assets.paper);
    ctx.strokeStyle=tone(base,.28);ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(177,397);ctx.quadraticCurveTo(273,427,392,483);ctx.quadraticCurveTo(466,444,540,387);ctx.stroke();
    ctx.restore();return;
  }
  const frontPhoto=tintedAsset(assets,'wrap:'+kind,assets.paperFront,base);
  // The photograph contains an alpha opening: stems stay visible above the
  // gathered waist, while the overlapping front sheets cover their lower ends.
  const layers=photoLayers(assets,'paper',assets.paperFront,[0,0,assets.paperFront.width,assets.paperFront.height]);
  contactShadow(ctx,layers.shadow,180,378,400,400);ctx.drawImage(frontPhoto,180,378,400,400);ctx.restore();
}
function ribbon(ctx,key,assets) {
  const color=RIBBONS[key].color;if(!color||!assets.bow)return;
  const tinted=tintedAsset(assets,'bow:'+key,assets.bow,color);
  ctx.save();ctx.strokeStyle=tone(color,-.18);ctx.lineWidth=7;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(351,651);ctx.bezierCurveTo(378,644,402,645,419,651);ctx.stroke();
  // Knot at the waist, loose fabric loops and two naturally curling tails.
  const width=164,height=246,x=384-width/2,y=650-height*(330/1536);
  const layers=photoLayers(assets,'bow',assets.bow,[0,0,assets.bow.width,assets.bow.height]);
  contactShadow(ctx,layers.shadow,x,y,width,height);ctx.drawImage(tinted,x,y,width,height);ctx.restore();
}
function stemPoint(stem,i,t){
  const [ax,ay]=FLOWERS[stem.species].attachment;
  const dx=(ax-.5)*stem.size*1.5*(stem.mirror?-1:1),dy=(ay-.5)*stem.size;
  const x=stem.x+dx*Math.cos(stem.tilt)-dy*Math.sin(stem.tilt),y=stem.y+dx*Math.sin(stem.tilt)+dy*Math.cos(stem.tilt);
  const waistX=384+(i%3-1)*3;
  const length=Math.hypot(waistX-x,650-y),bend=Math.sin(i*1.7+stem.species)*10;
  const controlX=(x+waistX)/2-(650-y)/length*bend;
  const controlY=(y+650)/2+(waistX-x)/length*bend;
  if(t<=.82){
    const u=t/.82,v=1-u;
    // A shallow arc preserves a believable, almost straight cut stem.
    return {x:v*v*x+2*v*u*controlX+u*u*waistX,y:v*v*y+2*v*u*controlY+u*u*650};
  }
  const u=(t-.82)/.18,v=1-u;
  const slope=(waistX-controlX)/(650-controlY),endY=719+(i%4)*6;
  const endX=waistX+Math.max(-24,Math.min(24,slope*(endY-650)));
  return {x:v*v*v*waistX+3*v*v*u*(waistX+slope*22)+3*v*u*u*endX+u*u*u*endX,y:v*v*v*650+3*v*v*u*672+3*v*u*u*(endY-22)+u*u*u*endY};
}
function drawStems(ctx,stems,assets){
  if(!assets.stems)return;
  const cache=cacheFor(assets),signature=JSON.stringify(stems);
  let layer=cache.get('stem-layer');
  if(!layer){layer={canvas:surface(assets,1520,1700),signature:null};cache.set('stem-layer',layer)}
  if(layer.signature!==signature){
    const c=layer.canvas.getContext('2d');c.clearRect(0,0,1520,1700);c.save();c.scale(2,2);paintStems(c,stems,assets);c.restore();layer.signature=signature;
  }
  ctx.drawImage(layer.canvas,0,0,760,850);
}
function paintStems(ctx,stems,assets){
  if(!assets.stems)return;
  const cache=cacheFor(assets);let sprites=cache.get('stem-sprites');
  if(!sprites){
    // Tight crops avoid repeatedly sampling a large mostly transparent atlas.
    // Bounds refer to the inspected generated asset; the source stays intact.
    sprites=[[165,136],[546,79],[931,36],[1264,114]].map(([x,w])=>{const canvas=surface(assets,w,1024);canvas.getContext('2d').drawImage(assets.stems,x,0,w,1024,0,0,w,1024);return canvas});cache.set('stem-sprites',sprites);
  }
  const segments=12;
  stems.forEach((stem,i)=>{
    const type=FLOWERS[stem.species].stemType,image=sprites[type];
    // Short photographic strips follow a curved path into the hand-tied waist.
    // The actual stem occupies the centre of a transparent column, retaining
    // nodes, fibres and uneven edges without adding a leaf per flower.
    for(let j=0;j<segments;j++){
      const a=stemPoint(stem,i,j/segments),b=stemPoint(stem,i,(j+1)/segments);
      const length=Math.hypot(b.x-a.x,b.y-a.y),width=[11,8,4,10][type];
      ctx.save();ctx.translate((a.x+b.x)/2,(a.y+b.y)/2);ctx.rotate(Math.atan2(b.y-a.y,b.x-a.x)-Math.PI/2);
      ctx.drawImage(image,0,j*image.height/segments,image.width,image.height/segments,-width/2,-length/2,width,length+.8);ctx.restore();
    }
  });
}
function drawHead(ctx,flower,assets){
  ctx.save();ctx.translate(flower.x,flower.y);ctx.rotate(flower.tilt);
  const w=flower.size*1.5,h=flower.size,cell=flower.species%4,heads=flower.species<4?assets.heads:assets.extraHeads;
  const sw=heads.width/2,sh=heads.height/2,crop=[(cell%2)*sw,Math.floor(cell/2)*sh,sw,sh];
  const layers=photoLayers(assets,'flower:'+flower.species,heads,crop,flower.mirror);
  contactShadow(ctx,layers.shadow,-w/2,-h/2,w,h);
  ctx.save();if(flower.mirror)ctx.scale(-1,1);ctx.drawImage(heads,...crop,-w/2,-h/2,w,h);ctx.restore();
  // Lighting stays on the left even when the source flower is reflected.
  ctx.drawImage(layers.light,-w/2,-h/2,w,h);ctx.restore();
}
function foliageStalk(ctx,branch,image){
  const w=branch.height*2/3;
  ctx.save();ctx.translate(384,650);ctx.rotate(branch.angle);ctx.translate(-w/2,-branch.height);ctx.scale(w/1024,branch.height/1536);
  // Only the bare stalk crosses in front of the rear collar. Leaves retain
  // their separate layer behind the paper, so no leaf passes through a sheet.
  ctx.beginPath();for(const [i,[x,y]] of [[530,690],[550,800],[574,950],[566,1100],[536,1330],[514,1536],[570,1536],[588,1330],[622,1100],[637,950],[615,800],[596,690]].entries()){if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)}ctx.closePath();ctx.clip();ctx.drawImage(image,0,0);ctx.restore();
}
export function drawBouquet(target,selected,width,height,assets) {
  const cache=cacheFor(assets),key='scene:'+width+':'+height;
  let scene=cache.get(key);if(!scene){scene=surface(assets,width,height);cache.set(key,scene)}
  const ctx=scene.getContext('2d');ctx.clearRect(0,0,width,height);ctx.save();ctx.scale(width/760,height/850);
  const stems=arrangement(selected);
  // Foliage is behind the paper collar. Its tips can emerge freely outside,
  // while every part behind a sheet is occluded instead of cut on a flat line.
  for(const branch of foliageArrangement(selected)){
    ctx.save();ctx.translate(384,650);ctx.rotate(branch.angle);
    const w=branch.height*2/3;ctx.drawImage(assets.foliage,-w/2,-branch.height,w,branch.height);ctx.restore();
  }
  paper(ctx,selected.wrap,assets);
  if(selected.wrap!=='none')for(const branch of foliageArrangement(selected))foliageStalk(ctx,branch,assets.foliage);
  drawStems(ctx,stems,assets);
  for(const flower of stems)drawHead(ctx,flower,assets);
  paper(ctx,selected.wrap,assets,true);
  ribbon(ctx,selected.ribbon,assets);
  // An isolated transparent scene makes contact shadows affect plant/paper
  // surfaces only; the surrounding page remains free from dark cutout halos.
  ctx.globalCompositeOperation='source-atop';
  const daylight=ctx.createLinearGradient(120,160,650,450);daylight.addColorStop(0,'#fff2d523');daylight.addColorStop(.18,'#fff2d510');daylight.addColorStop(.36,'#ffffff00');daylight.addColorStop(.55,'#24313a16');daylight.addColorStop(.8,'#24313a26');daylight.addColorStop(1,'#202b3d32');ctx.fillStyle=daylight;ctx.fillRect(0,0,760,850);ctx.restore();
  // Blur a small silhouette, rather than the full Retina scene on each click.
  const shadowKey='scene-shadow',shadowWidth=380,shadowHeight=425;
  let cast=cache.get(shadowKey);if(!cast){cast=surface(assets,shadowWidth,shadowHeight);cache.set(shadowKey,cast)}
  const c=cast.getContext('2d');c.clearRect(0,0,shadowWidth,shadowHeight);c.shadowColor='#332b2510';c.shadowBlur=9;c.shadowOffsetX=3;c.shadowOffsetY=4;c.drawImage(scene,0,0,shadowWidth,shadowHeight);
  c.shadowColor='transparent';c.globalCompositeOperation='destination-out';c.drawImage(scene,0,0,shadowWidth,shadowHeight);c.globalCompositeOperation='source-over';
  target.save();target.drawImage(cast,0,0,width,height);target.drawImage(scene,0,0);target.restore();
}
function wrapText(ctx,text,x,y,maxWidth,lineHeight){
  let line='';for(const word of text.split(' ')){const next=line?line+' '+word:word;if(ctx.measureText(next).width>maxWidth&&line){ctx.fillText(line,x,y);y+=lineHeight;line=word}else line=next}ctx.fillText(line,x,y);return y+lineHeight;
}
export function drawExport(ctx,snapshot,assets){
    ctx.fillStyle='#f5f1e8';ctx.fillRect(0,0,1200,1500);
    ctx.drawImage(assets.brand,72,33,216,72);
    ctx.fillStyle='#bd2c21';
    ctx.font='18px Manrope, Arial';ctx.fillText('ТВОЙ БУКЕТ / ВИЗУАЛЬНЫЙ ЭСКИЗ',540,82);
    ctx.save();ctx.translate(150,100);drawBouquet(ctx,snapshot,900,1007,assets);ctx.restore();
    ctx.strokeStyle='#cfc7b9';ctx.beginPath();ctx.moveTo(72,1142);ctx.lineTo(1128,1142);ctx.stroke();
    ctx.fillStyle='#332b25';ctx.font='38px Prata, Georgia';ctx.fillText(`${stemCount(snapshot)} ${flowerWord(stemCount(snapshot))}. Твоё сочетание.`,72,1210);
    ctx.font='20px Manrope, Arial';
    const description=FLOWERS.map((f,i)=>snapshot.counts[i]?`${f.name} — ${snapshot.counts[i]}`:null).filter(Boolean).join(' · ');
    let y=wrapText(ctx,description,72,1260,980,33);
    y=wrapText(ctx,WRAPS[snapshot.wrap].name+' · '+RIBBONS[snapshot.ribbon].name,72,y+5,980,33);
    ctx.fillStyle='#71675d';ctx.font='19px Manrope, Arial';
    ctx.fillText('Условная стоимость '+formatPrice(estimate(snapshot))+'. Концепт verver. Заказы не принимаются.',72,1435);
}
