"""Build static concept pages using the approved homepage shell. No dependencies."""
from pathlib import Path
import re
import hashlib
import json

ROOT = Path(__file__).resolve().parents[1]
builder_catalog = json.loads((ROOT / 'assets/data/builder-catalog.json').read_text(encoding='utf-8'))
catalog_module = '// Generated from assets/data/builder-catalog.json by scripts/build-pages.py.\n'
for name, key in [('FLOWERS','flowers'),('WRAPS','wraps'),('RIBBONS','ribbons')]:
    catalog_module += f'export const {name} = ' + json.dumps(builder_catalog[key], ensure_ascii=False, separators=(',', ':')) + ';\n'
(ROOT / 'assets/js/builder-catalog.mjs').write_text(catalog_module, encoding='utf-8')
icons = json.loads((ROOT / 'assets/data/ui-icons.json').read_text(encoding='utf-8'))
# HTML and the two classic/module consumers share the same authored paths.
site_js = ROOT / 'assets/js/site.js'
site_text = site_js.read_text(encoding='utf-8')
site_text = re.sub(r'const paths=\{[^;]+;', 'const paths=' + json.dumps({key:icons[key] for key in ['menu','close','plus','minus']},separators=(',',':')) + ';', site_text)
site_js.write_text(site_text,encoding='utf-8')
builder_js = ROOT / 'assets/js/builder.js'
builder_text = builder_js.read_text(encoding='utf-8')
for variable,key in [('downloadPath','download'),('checkPath','check')]:
    builder_text = re.sub(r"const " + variable + r"='[^']+';", f"const {variable}='{icons[key]}';", builder_text)
builder_js.write_text(builder_text,encoding='utf-8')
def ui_icon(key):
    return f'<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="{icons[key]}"/></svg>'

def asset_digest(path):
    # Git may use CRLF on Windows and LF on hosting/CI. Cache identities must
    # depend on text content, not the checkout's newline convention.
    return hashlib.sha256(path.read_bytes().replace(b'\r\n', b'\n')).hexdigest()[:10]

# The chosen identity is the source for the site, favicon and PNG export.
brand = json.loads((ROOT / 'assets/brand/selected.json').read_text(encoding='utf-8'))
assert brand['direction'] in {'poppy','initial','bouquet','petal'}
for filename in ['logo.svg','logo-cream.svg','logo-ink.svg','mark.svg','favicon.svg']:
    (ROOT / 'assets/brand' / filename).write_bytes((ROOT / 'assets/brand/studies' / brand['direction'] / filename).read_bytes())
def brand_url(filename):
    path = 'assets/brand/' + filename
    return path + '?v=' + asset_digest(ROOT / path)
builder_text = builder_js.read_text(encoding='utf-8')
builder_text = re.sub(r"\.\./brand/logo\.svg(?:\?v=[0-9a-f]+)?", '../brand/logo.svg?v=' + asset_digest(ROOT / 'assets/brand/logo.svg'), builder_text)
builder_js.write_text(builder_text, encoding='utf-8')
# Version module dependencies as well as the HTML entry point: a renderer update
# must reach an already-open constructor without mixing old and new modules.
for module in ['builder-model.mjs', 'builder-render.mjs', 'builder.js', 'navigation.js']:
    module_path = ROOT / 'assets/js' / module
    module_source = module_path.read_text(encoding='utf-8')
    def version_import(match):
        prefix, dependency, suffix = match.groups()
        digest = asset_digest(module_path.parent / dependency)
        return f'{prefix}{dependency}?v={digest}{suffix}'
    versioned = re.sub(r'''((?:from\s+|import\(\s*)['"])(\./(?:builder(?:-(?:catalog|model|render)\.mjs|\.js)|navigation-core\.mjs))(?:\?v=[0-9a-f]+)?(['"])''', version_import, module_source)
    if versioned != module_source:
        module_path.write_text(versioned, encoding='utf-8')
source = (ROOT / 'concept.html').read_text(encoding='utf-8')
head = source.split('<body>')[0].replace('assets/js/concept.js', 'assets/js/site.js')
head = head.replace('href="flower.svg"', f'href="{brand_url("favicon.svg")}"')
head = head.replace('</head>', '<link rel="stylesheet" href="assets/css/pages.css"></head>')
head = head.replace('</head>', '<link rel="stylesheet" href="assets/css/builder.css"></head>')
head = head.replace('</head>', '<link rel="stylesheet" href="assets/css/motion.css"><link rel="stylesheet" href="assets/css/menu.css"><script src="assets/js/motion.js" defer></script><script type="module" src="assets/js/icons.js"></script></head>')
head = head.replace('<head>', '<head><script src="assets/js/page-entry.js"></script>', 1)
head = head.replace('</head>', '<script type="module" src="assets/js/navigation.js"></script></head>')
# Local previews and static hosting must not mix fresh HTML with stale assets.
def version_asset(match):
    attribute, path = match.groups()
    digest = asset_digest(ROOT / path)
    return f'{attribute}="{path}?v={digest}"'
head = re.sub(r'(href|src)="(assets/(?:css|js)/[^"?]+)"', version_asset, head)
shell = source.split('<body>')[1].split('<main id="main">')[0]
shell = re.sub(r'<svg\b[^>]*class="defs"[^>]*>.*?</svg>', '', shell)
footer = '<footer>' + source.split('<footer>')[1].split('</footer>')[0] + '</footer>'
destinations = {'#collection':'catalog.html','#events':'events.html','#atelier':'atelier.html'}
for old, new in destinations.items():
    shell = shell.replace(f'href="{old}"', f'href="{new}"')
shell = shell.replace('<a href="catalog.html">Букеты</a>', '<a href="catalog.html">Букеты</a><a href="builder.html">Собрать свой</a>')
footer = footer.replace('Концепт · verver © 2026', '<a href="contacts.html">О концепте · verver © 2026</a>')

def write(name, title, content, current=None):
    page_shell = shell
    if current:
        page_shell = page_shell.replace(f'href="{current}"', f'href="{current}" aria-current="page"')
    page_head = re.sub(r'<title>.*?</title>', f'<title>{title} · Алый</title>', head)
    page_head = re.sub(r'<meta name="description"[^>]*>', f'<meta name="description" content="{title}. Портфолио-концепт цветочной мастерской «Алый».">', page_head)
    page_url = 'https://verver-vadya.github.io/site-aly/' + ('' if name == 'index.html' else name)
    social = f'<link rel="canonical" href="{page_url}"><meta property="og:type" content="website"><meta property="og:locale" content="ru_RU"><meta property="og:title" content="{title} · Алый"><meta property="og:description" content="Цветочная мастерская и конструктор собственного букета. Портфолио-концепт verver."><meta property="og:url" content="{page_url}"><meta property="og:image" content="https://verver-vadya.github.io/site-aly/assets/images/social.jpg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">'
    page_head = page_head.replace('</head>', social + '</head>')
    if name == '404.html':
        page_head = page_head.replace('<head>', '<head><base href="/">', 1)
    if name == 'builder.html':
        page_head = page_head.replace('</head>', ''.join(f'<link rel="preload" as="image" href="assets/images/{asset}.webp">' for asset in ['flower-heads','flower-heads-extra','foliage','bare-stems','satin-bow','paper-texture','paper-front']) + '</head>')
        page_head = re.sub(r'(href|src)="(assets/(?:css|js)/[^"?]+)"', version_asset, page_head)
    body = page_shell + '<main id="main">' + content + '</main>' + footer
    body = re.sub(r'(<a class="brand"[^>]*>).*?</a>', lambda match: match.group(1) + f'<img class="brand-logo" src="{brand_url("logo.svg")}" width="240" height="80" alt="Алый"></a>', body)
    body = re.sub(r'<svg class="event-mark"[^>]*>.*?</svg>', f'<img class="event-mark" src="{brand_url("mark.svg")}" width="64" height="64" alt="">', body)
    menu_path = icons['menu']
    icon = f'<morph-icon data-menu-icon icon="{menu_path}" reduced-motion="user" size="22" stroke-width="1.6" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="{menu_path}"/></svg></morph-icon>'
    trigger = f'<div class="bloom-menu" data-open="false"><div class="menu-surface" aria-hidden="true">' + '' + f'</div><button class="menu-button" aria-label="Меню" aria-expanded="false" aria-controls="mobile-nav">{icon}</button>'
    menu_match = re.search(r'<nav id="mobile-nav".*?</nav>', body)
    menu_html = menu_match.group(0).replace('</nav>', '<a href="contacts.html">О концепте</a></nav>')
    fallback = menu_html.replace('id="mobile-nav"', '').replace('class="mobile-nav"','class="menu-fallback"').replace(' hidden','')
    body = body.replace(menu_match.group(0), '')
    body = re.sub(r'<button class="menu-button".*?</button>', trigger + menu_html + '</div><noscript>' + fallback + '</noscript>', body)
    plus = icons['plus']
    care_icon = f'<morph-icon data-care-icon icon="{plus}" reduced-motion="user" size="20" stroke-width="1.6" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="{plus}"/></svg></morph-icon>'
    body = body.replace('<summary>Как сохранить цветы</summary>', '<summary><span>Как сохранить цветы</span>' + care_icon + '</summary>')
    # Photo names match only catalog cards and the main product image, not related cards.
    if name == 'catalog.html':
        for product in products:
            body = body.replace(f'<div class="product-image"><img src="assets/images/{product["image"]}.webp"', f'<div class="product-image" style="view-transition-name:photo-{product["slug"]}"><img src="assets/images/{product["image"]}.webp"')
    if name.startswith('bouquet-'):
        slug = name.removeprefix('bouquet-').removesuffix('.html')
        body = body.replace('<div class="detail-image">', f'<div class="detail-image" style="view-transition-name:photo-{slug}">')
    body = re.sub(r'(?<![>])([↗↓])', r'<span class="motion-arrow" aria-hidden="true">\1</span>', body)
    body = body.replace('<span aria-hidden="true">↗</span>', '<span class="motion-arrow" aria-hidden="true">↗</span>')
    body = body.replace('<span>↗</span>', '<span class="motion-arrow" aria-hidden="true">↗</span>')
    for glyph,key in [('↗','arrow'),('↓','down')]:
        body = body.replace(glyph,ui_icon(key))
    for original,key in [('M12 3v12M7 10l5 5 5-5M5 16v4h14v-4','download'),('M12 5v14M5 12h14','plus'),('M5 12h14','minus')]:
        body = body.replace(original,icons[key])
    body = re.sub(r'(<button\b[^>]*>)(.*?)(</button>)', r'\1<span class="control-inner">\2</span>\3', body)
    body = re.sub(r'(<a class="cta"[^>]*>)(.*?)(</a>)', r'\1<span class="control-inner">\2</span>\3', body)
    (ROOT / name).write_text(page_head + '<body>' + body + '</body></html>', encoding='utf-8')

products = [
    dict(slug='nezhno', name='Нежно', image='tender', tone='light', caption='Молочный · воздушный', price='5 900', mood='Тихий комплимент. Большая нежность.', description='Светлая палитра, мягкие формы и много воздуха. Букет для признаний, которым не нужна громкость.', flowers='Садовая роза, ранункулюс, белая космея, сезонная зелень.', detail='Свободный силуэт, молочные и сливочные оттенки, длинная шёлковая лента.'),
    dict(slug='smelo', name='Смело', image='bold', tone='red', caption='Алый · выразительный', price='7 500', mood='Когда хочется сказать всё сразу.', description='Открытые цветы, глубокий красный и графичные линии. Букет, который не пытается быть незаметным.', flowers='Антуриум, георгин, тюльпан, сезонная зелень.', detail='Скульптурная форма, алые и винные оттенки, лента в тон цветам.'),
    dict(slug='po-svoemu', name='По-своему', image='wild', tone='garden', caption='Садовый · свободный', price='6 500', mood='Немного сада. Много свободы.', description='Как будто цветы только что принесли из сада: разные высоты, живые линии и неожиданные сочетания.', flowers='Космея, скабиоза, георгин, мелкие полевые цветы и сезонная зелень.', detail='Асимметричная сборка, пудровые, сливочные и бордовые оттенки.')
]

def card(p):
    return f'''<article class="product-card" data-tone="{p['tone']}"><a href="bouquet-{p['slug']}.html"><div class="product-image"><img src="assets/images/{p['image']}.webp" alt="Букет «{p['name']}»: {p['caption'].lower()}" width="1024" height="1536" loading="lazy"></div><div class="product-card-title"><h2>{p['name']}</h2><span>{p['price']} ₽</span></div><p>{p['caption']} <span aria-hidden="true">↗</span></p></a></article>'''

home = source.split('<main id="main">')[1].split('</main>')[0]
home = home.replace('href="#collection"', 'href="catalog.html"').replace('href="#atelier"', 'href="atelier.html"')
for p in products:
    home = home.replace(f'<button data-bouquet="{p["name"]}">', f'<a href="bouquet-{p["slug"]}.html">', 1)
home = home.replace('</button>', '</a>')
home = home.replace('<a href="atelier.html">О мастерской ↗</a>', '<a href="events.html">Оформление событий ↗</a>')
home = home.replace('КОНЦЕПТ / SITES — 2026','КОНЦЕПТ / SITES — 2026')
write('index.html', 'Цветы с характером', home)

catalog = '''<section class="page-heading"><p class="eyebrow">ГЛАВНАЯ / БУКЕТЫ</p><h1>Что хочется<br><i>сказать?</i></h1><div class="page-heading-bottom"><p>Начни с чувства. Мы придумали три букета —<br>с разным настроением и общим характером.</p><span class="eyebrow">КОЛЛЕКЦИЯ «БЫТЬ СОБОЙ»</span></div></section><section class="catalog-section"><div class="catalog-filters" role="group" aria-label="Палитра букета"><button data-filter="all" aria-pressed="true">Все букеты</button><button data-filter="light" aria-pressed="false">Светлые</button><button data-filter="red" aria-pressed="false">Красные</button><button data-filter="garden" aria-pressed="false">Садовые</button><span id="result-count" role="status">3 букета</span></div><div class="product-grid">''' + ''.join(card(p) for p in products) + '''</div><p class="concept-note">Букеты, составы и цены придуманы для концепта. Изображения сгенерированы; заказов и оплаты на сайте нет.</p></section><section class="closing-note"><p class="eyebrow">НЕ ТОЛЬКО ДЛЯ ВАЗЫ</p><h2>А если цветов<br><i>нужно больше?</i></h2><a class="text-link" href="events.html">Цветы для событий ↗</a></section>'''
build_invite = '''<section class="closing-note build-invite"><p class="eyebrow">А МОЖНО ПО-СВОЕМУ</p><h2>Твои цветы.<br><i>Твоё сочетание.</i></h2><p>Добавь любимые цветы, выбери ленту.<br>Посмотри, что получится — и сохрани свой букет.</p><a class="cta" href="builder.html">Собрать свой букет ↗</a></section>'''
catalog = catalog.replace('<section class="closing-note">', build_invite + '<section class="closing-note">', 1)
write('catalog.html', 'Букеты с характером', catalog, 'catalog.html')

for p in products:
    others = ''.join(card(other) for other in products if other != p)
    content = f'''<div class="breadcrumbs"><a href="catalog.html">Букеты</a> / {p['name']}</div><section class="product-detail"><div class="detail-image"><img src="assets/images/{p['image']}.webp" width="1024" height="1536" alt="Букет «{p['name']}» — {p['caption'].lower()}" fetchpriority="high"></div><div class="detail-copy"><p class="eyebrow">{p['caption'].upper()}</p><h1>{p['name']}</h1><p class="product-mood">{p['mood']}</p><p>{p['description']}</p><p class="product-price">{p['price']} ₽ <small>пример цены</small></p><a class="cta" href="#composition">Рассмотреть букет <span aria-hidden="true">↓</span></a><div class="product-composition" id="composition"><h2>Состав и характер</h2><p>{p['flowers']}</p><p>{p['detail']}</p><p class="concept-note">Эскиз букета для портфолио. Состав и цена условные. Заказы не принимаются.</p></div><details class="care"><summary>Как сохранить цветы</summary><p>Поставь букет в чистую вазу, убери листья ниже уровня воды и обнови срезы. Меняй воду ежедневно, держи цветы подальше от батареи, прямого солнца и фруктов.</p></details></div></section><section class="catalog-section related"><p class="eyebrow">ДРУГОЕ НАСТРОЕНИЕ</p><div class="product-grid">{others}</div></section>'''
    write(f'bouquet-{p["slug"]}.html', f'Букет «{p["name"]}»', content, 'catalog.html')

events = '''<section class="page-heading"><p class="eyebrow">ГЛАВНАЯ / СОБЫТИЯ</p><h1>Цветы меняют<br><i>пространство.</i></h1><div class="page-heading-bottom"><p>От камерного ужина до большого праздника.<br>Цветы продолжают историю, которую ты задумал.</p></div></section><section class="event-editorial"><div class="event-still"><img src="assets/images/bold.webp" width="1024" height="1536" alt="Скульптурный красный букет — пример палитры события"></div><div class="event-statement"><p class="eyebrow">НЕ ДЕКОРАЦИЯ. НАСТРОЕНИЕ.</p><h2>Один цвет.<br>Совсем другое<br><i>ощущение.</i></h2><p>Смотрим на свет, фактуры и ритм места. Иногда достаточно нескольких стеблей. Иногда цветам хочется отдать всю комнату.</p></div></section><section class="service-rows"><article><span>01</span><h2>За одним столом</h2><p>Камерные ужины, встречи и семейные праздники. Низкие композиции, которые оставляют место разговору.</p></article><article><span>02</span><h2>Важный день</h2><p>Свадебный букет, церемония и цветы на столах — как части одной истории, без готового сценария.</p></article><article><span>03</span><h2>В ритме бренда</h2><p>Витрины, съёмки, открытия пространств. Цветы работают с идеей, цветом и характером проекта.</p></article></section><section class="closing-note"><p class="eyebrow">ОТ ЗАМЫСЛА К ЦВЕТАМ</p><h2>Сначала — история.<br><i>Потом — лепестки.</i></h2><p>Повод, пространство, палитра и бюджет — четыре отправные точки будущего оформления.</p><a class="text-link" href="contacts.html">Об этом концепте ↗</a><p class="concept-note">Мастерская вымышлена. Реальные услуги по оформлению событий здесь не продаются.</p></section>'''
write('events.html','Цветы для событий',events,'events.html')

atelier = '''<section class="page-heading atelier-heading"><p class="eyebrow">ГЛАВНАЯ / МАСТЕРСКАЯ</p><h1>Всё живое<br><i>несовершенно.</i></h1><div class="page-heading-bottom"><p>Именно это нам и нравится.</p></div></section><section class="atelier-editorial"><div class="atelier-flower"><img src="assets/images/poppy.webp" width="1024" height="1536" alt="Мак с живыми складками на лепестках" loading="lazy"></div><div><p class="eyebrow">ПОЧЕМУ «АЛЫЙ»</p><h2>Не оттенок.<br><i>Состояние.</i></h2><p>Алый — цвет, который невозможно не заметить. Так мы и думаем о цветах: не как об обязательном подарке, а как о способе быть услышанным.</p><p>Неровный стебель, раскрытый лепесток, неожиданная ветка — всё это делает букет живым. Мы оставляем ему свободу.</p><a class="text-link" href="catalog.html">Познакомиться с букетами ↗</a></div></section><section class="principles section"><p class="eyebrow">ТРИ ПРОСТЫЕ ВЕЩИ</p><article><h2>По сезону</h2><p>Выбираем цветы в их время. Пусть у каждого месяца будет свой запах, форма и цвет.</p></article><article><h2>Без тесных рамок</h2><p>Не собираем цветы в идеальный шар. Оставляем разные высоты, воздух и движение.</p></article><article><h2>По-человечески</h2><p>Для подарка не обязательно искать повод. Иногда достаточно сказать: «Я о тебе думаю».</p></article></section><section class="closing-note"><p class="eyebrow">ПОРТФОЛИО-КОНЦЕПТ</p><h2>Придумано с характером.<br><i>Сделано verver.</i></h2><a class="text-link" href="contacts.html">Об авторе и проекте ↗</a></section>'''
atelier = atelier.replace('<section class="principles section">', (ROOT / 'scripts/workshop-content.html').read_text(encoding='utf-8') + '<section class="principles section">')
write('atelier.html','О мастерской',atelier,'atelier.html')

builder = (ROOT / 'scripts/builder-content.html').read_text(encoding='utf-8')
flower_rows = ''
for i, flower in enumerate(builder_catalog['flowers']):
    name, price, count = flower['name'], flower['price'], flower['defaultCount']
    sheet = 'flower-heads' if i < 4 else 'flower-heads-extra'
    flower_rows += f'''<div class="flower-row" data-flower="{i}"><span class="flower-sample" style="--flower-col:{i%2};--flower-row:{(i%4)//2};--flower-sheet:url('assets/images/{sheet}.webp')" aria-hidden="true"></span><div class="flower-name">{name}<small>{price} ₽ / стебель</small></div><div class="flower-counter"><button type="button" data-delta="-1" aria-label="Убрать: {name}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M5 12h14"/></svg></button><output aria-label="{name}: количество">{count}</output><button type="button" data-delta="1" aria-label="Добавить: {name}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></button></div></div>'''
def material_choices(kind, selected):
    return ''.join(f'<label class="choice"><input type="radio" name="{kind}" value="{key}"' + (' checked' if key == selected else '') + '>' + (f'<span class="material-dot {kind}-dot" style="--swatch:{item["color"]}" aria-hidden="true"></span>' if item['color'] else '') + item['label'] + '</label>' for key,item in builder_catalog['wraps' if kind == 'wrap' else 'ribbons'].items())
builder = builder.replace('WRAP_CHOICES',material_choices('wrap','none')).replace('RIBBON_CHOICES',material_choices('ribbon','wine'))
write('builder.html','Собрать свой букет',builder.replace('FLOWER_ROWS',flower_rows),'builder.html')

contacts = '''<section class="page-heading"><p class="eyebrow">ГЛАВНАЯ / О КОНЦЕПТЕ</p><h1>«Алый» — идея.<br><i>Сайт — настоящий.</i></h1><div class="page-heading-bottom"><p>Вымышленная цветочная мастерская.<br>Концепт бренда и сайта для портфолио verver.</p></div></section><section class="about-concept section"><div><h2>Что здесь придумано</h2><p>Название, букеты, ассортимент, цены и тексты мастерской созданы для демонстрации дизайна. Цветы на изображениях сгенерированы ИИ. У «Алого» нет магазина, адреса и сотрудников.</p><p>Сайт не принимает заказы, платежи и персональные данные. Аналитика и внешние формы не подключены.</p></div><div><h2>Нужен сайт<br><i>для твоего дела?</i></h2><p>Напиши Вадиму, автору проекта. Эти контакты — для разработки сайтов, а не для покупки цветов.</p><a class="text-link" href="https://t.me/notverver">Telegram · @notverver ↗</a><a class="text-link" href="mailto:verver.company@mail.ru">verver.company@mail.ru ↗</a><a class="text-link" href="https://t.me/ververcompany">Канал ververcompany ↗</a></div></section>'''
write('contacts.html','О концепте и авторе',contacts)
write('404.html','Страница не найдена','<section class="page-heading error-page"><p class="eyebrow">404 / НЕ ТА ТРОПИНКА</p><h1>Здесь пока<br><i>ничего не выросло.</i></h1><p>Возможно, адрес изменился. Начнём с главной?</p><a class="cta" href="index.html">На главную <span>↗</span></a></section>')
print('Built 10 pages, including the bouquet constructor and workshop story.')
