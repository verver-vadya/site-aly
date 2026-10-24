import {FLOWERS,WRAPS,RIBBONS} from './builder-catalog.mjs?v=65620d58b8';
export {FLOWERS,WRAPS,RIBBONS};
export const MAX_STEMS = 35;
export const SIZES = { small:7, medium:13, large:19 };
export const PALETTES = { milk:[2,0,0,0,0,2,0,1], red:[0,2,0,1,3,0,1,0], garden:[3,2,2,0,0,0,0,0] };
export const initialState = () => ({ version:2, palette:'garden', counts:FLOWERS.map(f=>f.defaultCount), wrap:'none', ribbon:'wine' });
export const stemCount = state => state.counts.reduce((a,b)=>a+b,0);
export const estimate = state => state.counts.reduce((sum,n,i)=>sum+n*FLOWERS[i].price,WRAPS[state.wrap].price);
export const formatPrice = value => new Intl.NumberFormat('ru-RU').format(value)+' ₽';
export const flowerWord = n => n%10===1&&n%100!==11?'цветок':n%10>=2&&n%10<=4&&(n%100<12||n%100>14)?'цветка':'цветов';
export function distribute(weights,total) {
  const sum=weights.reduce((a,b)=>a+b,0)||1;
  const exact=weights.map(w=>w/sum*total), result=exact.map(Math.floor);
  const order=exact.map((v,i)=>({i,rest:v-result[i]})).sort((a,b)=>b.rest-a.rest);
  for(let n=total-result.reduce((a,b)=>a+b,0),i=0;i<n;i++)result[order[i%order.length].i]++;
  return result;
}
export function normalizeState(raw) {
  const fallback=initialState();
  if(!raw||!Array.isArray(raw.counts))return fallback;
  const legacy=raw.version===1&&raw.counts.length===4;
  if(!legacy&&(raw.version!==2||raw.counts.length!==FLOWERS.length))return fallback;
  if(!raw.counts.every(n=>Number.isInteger(n)&&n>=0&&n<=MAX_STEMS))return fallback;
  const total=raw.counts.reduce((a,b)=>a+b,0);
  if(total<1||total>MAX_STEMS)return fallback;
  return {version:2,palette:Object.hasOwn(PALETTES,raw.palette)?raw.palette:'custom',counts:legacy?[...raw.counts,...Array(FLOWERS.length-4).fill(0)]:[...raw.counts],wrap:Object.hasOwn(WRAPS,raw.wrap)?raw.wrap:'none',ribbon:Object.hasOwn(RIBBONS,raw.ribbon)?raw.ribbon:'wine'};
}
export function choosePalette(state,palette) {
  return Object.hasOwn(PALETTES,palette)?{...state,palette,counts:distribute(PALETTES[palette],stemCount(state))}:state;
}
export function chooseSize(state,size) {
  return Object.hasOwn(SIZES,size)?{...state,counts:distribute(state.counts,SIZES[size])}:state;
}
export function changeCount(state,index,delta) {
  if(!Number.isInteger(index)||index<0||index>=FLOWERS.length||![-1,1].includes(delta))return state;
  const total=stemCount(state),n=state.counts[index]+delta;
  if(n<0||total+delta<1||total+delta>MAX_STEMS)return state;
  const counts=[...state.counts];counts[index]=n;
  return {...state,palette:'custom',counts};
}
export function arrangement(state) {
  // Interleave species so the preview forms a composition, rather than colour bands.
  const remaining=[...state.counts],sequence=[];
  while(remaining.some(Boolean))remaining.forEach((n,i)=>{if(n){sequence.push(i);remaining[i]--}});
  // A seeded shuffle breaks the angular colour bands of a repeated species
  // cycle while retaining exact inventory and deterministic saved bouquets.
  let seed=state.counts.reduce((sum,n,i)=>sum+n*(i+17)*2654435761,2166136261)>>>0;
  for(let i=sequence.length-1;i>0;i--){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const j=seed%(i+1);[sequence[i],sequence[j]]=[sequence[j],sequence[i]]}
  const total=sequence.length;
  const radiusX=Math.min(280,176+Math.max(0,total-4)*4.1);
  const radiusY=Math.min(185,105+Math.max(0,total-4)*3.7);
  const centreY=total<=3?234:270;
  const baseSize=total===1?220:total<=3?192:total<=7?174:total<=13?167:Math.max(130,152-Math.max(0,total-25)*2.2);
  const loose=total===1?[[0,24]]:total===2?[[-110,-30],[105,80]]:[[-132,-45],[128,5],[-24,145]];
  // Golden-angle packing spreads heads in two dimensions. Sorting by depth
  // gives a back, middle and foreground instead of a single repeated fan.
  return sequence.map((species,i)=>{
    const theta=i*2.399963229728653+.62,r=Math.sqrt((i+.5)/total);
    let x=384+(total<=3?loose[i][0]:Math.cos(theta)*radiusX*r+Math.sin(i*1.71)*4);
    let y=centreY+(total<=3?loose[i][1]:Math.sin(theta)*radiusY*r+Math.cos(i*2.13)*4);
    const size=baseSize*(.94+Math.sin(i*1.93+species)*.06+(y-centreY)/1200);
    x=Math.max(size*.75+12,Math.min(748-size*.75,x));
    y=Math.max(size*.5+12,y);
    const angle=Math.atan2(x-384,650-y);
    // Calyx and stalk share a direction; independent head rotation made the
    // first stem segment turn sharply just below the flower.
    const tilt=angle+Math.sin(i*1.73+species)*.065;
    return {species,x,y,size,mirror:(i+species)%3===1,tilt,angle,length:Math.hypot(x-384,650-y)};
  }).sort((a,b)=>a.y-b.y);
}
export function foliageArrangement(state){
  const total=stemCount(state),count=Math.min(3,Math.ceil(total/8));
  const angles=count===1?[-.16]:count===2?[-.43,.38]:[-.54,.07,.48];
  return angles.map((angle,i)=>({angle,height:(total<=3?350:total<=8?405:455)+(i%2)*14}));
}
