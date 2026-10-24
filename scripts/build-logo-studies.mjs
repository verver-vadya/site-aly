// Optional authoring helper: pass an installed @napi-rs/canvas/index.js path.
// The site itself only uses the generated SVG, HTML and CSS files.
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
if(!process.argv[2])throw new Error('Pass the absolute native Canvas package path.');
const {createCanvas,loadImage,GlobalFonts,convertSVGTextToPath}=await import(pathToFileURL(process.argv[2]));
GlobalFonts.registerFromPath('assets/fonts/prata-cyrillic-400-normal.woff2','Prata');
GlobalFonts.registerFromPath('assets/fonts/manrope-cyrillic-wght-normal.woff2','Manrope');
GlobalFonts.registerFromPath('assets/fonts/manrope-latin-wght-normal.woff2','Manrope');
const red='#bd2c21',paper='#f5f1e8',ink='#332b25';
const marks=[
  '<path fill-rule="evenodd" d="M32 17C25 3 14 2 10 12C2 17 5 29 18 33C3 34 3 47 13 51C20 59 31 54 33 43C35 59 48 62 54 50C66 44 61 32 47 30C61 23 60 11 49 7C40 2 32 8 32 17ZM38 31A6 6 0 1 1 26 31A6 6 0 1 1 38 31Z"/>',
  '<path fill-rule="evenodd" d="M7 54H22V51H17L22 39H41L46 51H40V54H59V51H54L36 9H30L12 51H7ZM24 34L31 16L39 34Z"/><path d="M40 34C39 25 47 19 57 20C56 28 50 35 40 34Z"/>',
  '<g fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round"><path d="M16 25C22 34 28 41 35 57M33 19L35 57M50 31C44 39 38 46 35 57"/></g><path d="M16 26C5 21 8 11 15 7C23 12 26 23 16 26ZM33 20C23 15 27 4 34 2C42 9 43 17 33 20ZM49 32C40 26 44 17 53 13C60 21 59 29 49 32Z"/>',
  '<path d="M30 44C11 43 4 26 10 13C24 17 31 28 30 44ZM34 44C33 26 43 12 57 9C59 25 50 41 34 44Z"/><circle cx="32" cy="49" r="3.5"/>'
];
const studies=[
 {id:'poppy',name:'Неровный мак',note:'Живой силуэт, крупная сердцевина. Ближе всего к характеру главной.'},
 {id:'initial',name:'А / ателье',note:'Буква и лист в одном знаке. Более строгий, собранный характер.'},
 {id:'bouquet',name:'Свободный букет',note:'Три цветка разной высоты. Прямая связь с мастерской и конструктором.'},
 {id:'petal',name:'Лепестки над «й»',note:'Цветок встроен в название. Компактный вариант с акцентом на слове.'}
];
function outlined(text){
 const svg=convertSVGTextToPath(`<svg xmlns="http://www.w3.org/2000/svg" width="240" height="80"><text x="0" y="65" font-family="Prata" font-size="64">${text}</text></svg>`).toString();
 return svg.slice(svg.indexOf('>',svg.indexOf('<svg'))+1,svg.lastIndexOf('</svg>')).replace(/fill="(?:#[a-f0-9]+|black)"/gi,'fill="currentColor"');
}
async function vectorImage(path){
 const source=fs.readFileSync(path,'utf8').replace(/ width="([0-9]+)"/,(_,v)=>` width="${Number(v)*4}"`).replace(/ height="([0-9]+)"/,(_,v)=>` height="${Number(v)*4}"`);
 return loadImage(Buffer.from(source));
}
const word=outlined('алый'),plain=outlined('алыи');
const petalWord=plain+'<path d="M146 25C134 25 129 16 133 10C142 11 147 16 146 25ZM149 25C148 16 154 10 162 9C165 17 159 24 149 25Z"/>';
function svg(content,w=64,h=64,color=red){return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" color="${color}" fill="currentColor">${content}</svg>`}
for(const [i,study] of studies.entries()){
 const dir=`assets/brand/studies/${study.id}`;fs.mkdirSync(dir,{recursive:true});
 const width=i===3?172:240;
 const lockup=i===3?petalWord:`<g transform="translate(0 9) scale(.8125)">${marks[i]}</g><g transform="translate(68)">${word}</g>`;
 for(const [suffix,color] of [['',red],['-cream',paper],['-ink',ink]])fs.writeFileSync(`${dir}/logo${suffix}.svg`,svg(lockup,width,80,color));
 fs.writeFileSync(`${dir}/mark.svg`,svg(marks[i]));
 fs.writeFileSync(`${dir}/favicon.svg`,svg(`<rect width="64" height="64" rx="12" fill="${paper}"/><g transform="translate(7 7) scale(.78)">${marks[i]}</g>`));
}
fs.writeFileSync('assets/brand/studies/catalog.json',JSON.stringify(studies,null,2)+'\n');
// Use the actual homepage shell for interactive context, including its menu.
let html=fs.readFileSync('index.html','utf8');
html=html.replace(/<title>.*?<\/title>/,'<title>Логотип «Алого» · четыре направления</title>');
html=html.replace(/<script[^>]*src="assets\/js\/(?:page-entry|motion|navigation)\.js[^>]*><\/script>/g,'');
html=html.replace(/<link rel="icon"[^>]*>/,'<link rel="icon" href="assets/brand/studies/poppy/favicon.svg">');
html=html.replace(/(<a class="brand"[^>]*>).*?<\/a>/g,'$1<img class="study-logo" data-study-logo src="assets/brand/studies/poppy/logo.svg" width="240" height="80" alt="Алый"></a>');
html=html.replace(/<svg class="event-mark"[^>]*>.*?<\/svg>/,'<img class="event-mark" data-study-mark src="assets/brand/studies/poppy/mark.svg" alt="">');
html=html.replace(/<img class="event-mark"[^>]*>/,'<img class="event-mark" data-study-mark src="assets/brand/studies/poppy/mark.svg" alt="">');
const controls=`<aside class="study-controls" aria-label="Сравнение логотипов"><div><p>АЛЫЙ / ПОИСК ЗНАКА</p><div class="study-choices" role="group" aria-label="Выбрать направление">${studies.map((s,i)=>`<button type="button" data-study="${i+1}" aria-pressed="${i===0}"><small>0${i+1}</small>${s.name}</button>`).join('')}</div><p data-study-note role="status">${studies[0].note}</p></div><a href="index.html">Вернуться на сайт</a></aside>`;
html=html.replace('</header>','</header>'+controls);
const proof=`<section class="study-proof" aria-label="Проверка логотипа"><div class="study-proof-logo"><img data-study-logo src="assets/brand/studies/poppy/logo.svg" alt="Алый" width="240" height="80"></div><div class="study-proof-logo study-reverse"><img data-study-cream src="assets/brand/studies/poppy/logo-cream.svg" alt="Алый на красном фоне" width="240" height="80"></div><div class="study-sizes"><span>Иконка вкладки</span><img data-study-favicon src="assets/brand/studies/poppy/favicon.svg" width="16" height="16" alt=""><img data-study-favicon src="assets/brand/studies/poppy/favicon.svg" width="32" height="32" alt=""><span>16 / 32 px</span></div></section>`;
html=html.replace('</footer>','</footer>'+proof);
html=html.replace('</head>','<link rel="stylesheet" href="assets/css/logo-preview.css"><script src="assets/js/logo-preview.js" defer></script></head>');
fs.writeFileSync('logo-preview.html',html);
// A review board of vectors at several sizes, not a browser screenshot.
const board=createCanvas(1600,1240),c=board.getContext('2d');c.fillStyle=paper;c.fillRect(0,0,1600,1240);
c.fillStyle=ink;c.font='24px Arial';c.fillText('АЛЫЙ / ЧЕТЫРЕ НАПРАВЛЕНИЯ ЗНАКА',48,52);
for(const [i,study] of studies.entries()){
 const y=94+i*280,dir=`assets/brand/studies/${study.id}`;
 c.strokeStyle='#cfc7b9';c.beginPath();c.moveTo(48,y);c.lineTo(1552,y);c.stroke();
 c.fillStyle=ink;c.font='21px Arial';c.fillText(`0${i+1}`,48,y+58);c.font='18px Arial';c.fillText(study.name,48,y+94);
 const logo=await vectorImage(dir+'/logo.svg'),cream=await vectorImage(dir+'/logo-cream.svg'),mark=await vectorImage(dir+'/mark.svg'),favicon=await vectorImage(dir+'/favicon.svg');
 const h=116,w=logo.width/logo.height*h;
 c.drawImage(logo,240,y+48,w,h);c.fillStyle=red;c.fillRect(680,y+28,444,176);c.drawImage(cream,700+(404-w)/2,y+58,w,h);
 c.drawImage(mark,1180,y+54,96,96);c.drawImage(favicon,1344,y+92,16,16);c.drawImage(favicon,1400,y+84,32,32);
 c.fillStyle='#71675d';c.font='16px Arial';c.fillText('16',1344,y+145);c.fillText('32',1400,y+145);c.fillText(study.note,240,y+241);
}
fs.writeFileSync('review/logo-directions.webp',board.toBuffer('image/webp',92));
// Original authored icon set on the same review sheet.
const icons=JSON.parse(fs.readFileSync('assets/data/ui-icons.json','utf8'));
const iconBoard=createCanvas(1440,260),ic=iconBoard.getContext('2d');ic.fillStyle=paper;ic.fillRect(0,0,1440,260);ic.fillStyle=ink;ic.font='22px Arial';ic.fillText('АЛЫЙ / СВОИ МАЛЕНЬКИЕ ИКОНКИ',40,42);
for(const [i,[name,path]] of Object.entries(icons).entries()){
 const image=await loadImage(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24"><path d="${path}" fill="none" stroke="${red}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`));
 ic.drawImage(image,40+i*175,86,64,64);ic.drawImage(image,116+i*175,116,20,20);ic.fillStyle=ink;ic.font='16px Arial';ic.fillText(name,40+i*175,198);
}
fs.writeFileSync('review/ui-icon-directions.webp',iconBoard.toBuffer('image/webp',92));
console.log('Created 4 outlined logo studies, 16/32 favicon previews, live homepage preview and original UI icon board.');
