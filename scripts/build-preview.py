"""Package only public pages and their assets; source studies stay in Git."""
from pathlib import Path
import os
import re
import shutil

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / '.publish'
OUT.mkdir(exist_ok=True)
pages = ['index.html', 'catalog.html', 'events.html', 'atelier.html',
         'contacts.html', 'builder.html', 'bouquet-nezhno.html',
         'bouquet-smelo.html', 'bouquet-po-svoemu.html', '404.html']
revision = os.environ.get('GITHUB_SHA', 'local')
base = os.environ.get('BASE_PATH', '/site-aly/').rstrip('/') + '/'
for page in pages:
    text = (ROOT / page).read_text(encoding='utf-8')
    text = text.replace('</head>', f'<meta name="build" content="{revision}"></head>')
    if page == '404.html':
        text = text.replace('<base href="/">', f'<base href="{base}">')
    if os.environ.get('PREVIEW_INDEX') == 'true' and page != '404.html':
        text = re.sub(r'<meta name="robots"[^>]*>', '', text)
    (OUT / page).write_text(text, encoding='utf-8')
for source in (ROOT / 'assets').rglob('*'):
    relative = source.relative_to(ROOT)
    if not source.is_file() or source.suffix == '.png' or 'studies' in relative.parts:
        continue
    target = OUT / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source, target)
for name in ['robots.txt', 'sitemap.xml', 'CREDITS.md']:
    shutil.copyfile(ROOT / name, OUT / name)
(OUT / '.nojekyll').touch()
print(f'Packaged {len(pages)} pages in {OUT.name}; build {revision}.')
