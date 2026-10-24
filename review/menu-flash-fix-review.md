# Проверка исправлений, 23.10.2026

| Before | After | Why |
| --- | --- | --- |
| Header/main had separate automatic stacking contexts; page text painted over menu | Header position:relative / z-index:30, `assets/css/menu.css` | Removes the actual overpainting and restores menu hit targets |
| Background assembled from nine transformed pieces | One continuous surface; static text; `assets/css/menu.css` | No interpolation seams; no changing text coordinates while tapping |
| 44px rows, first link around y72 | 48px rows, first link y88, 72px top inset | More room below close button, lower items, larger hit areas |
| Blur/focusout cleanup plus deferred opening | Completed focusin destination, synchronous state + CSS transitions; `assets/js/site.js` | Avoids transient focus races and requestAnimationFrame coupling to document transitions |
| Root snapshot faded with page content | Opaque paper root; named main content fades separately; `assets/css/motion.css` | Prevents the entire page/background fading to the browser canvas |
| Unversioned assets could remain cached after HTML updates | Content hash in every CSS/JS URL; generator/test enforce agreement | Browser receives the exact asset version generated into HTML |

**Approve** in the tested browser conditions. Original defects were visually reproduced; after screenshots show solid panel and complete labels. Browser checks: all four menu items navigate immediately after opening; 320px no overflow,48px targets; Escape/outside/rapid toggle work.1280px recorded main→catalog, product and Back.22 captured main→catalog frames retain RGB245/241/232 at the page corner; contact sheet was viewed, no fullscreen white flash seen. Not an FPS benchmark. Console warnings/errors empty in checked flows.

Native navigation and generated HTML tests pass, including SHA256 agreement for assets across9 pages. Shared product photo names remain unique. Only panel transform/opacity and one-off document snapshot transitions move; link geometry remains fixed. Existing project easing/durations retained. No production deployment or merge.

Limits: physical Safari/iPhone, Windows125/150%, CPU×4 and OS reduced-motion visuals remain unverified. GIF/screenshot capture samples frames and cannot exclude every unsampled rendering defect.
