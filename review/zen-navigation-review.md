# Zen: переход между страницами · 24.10.2026

| Before | After | Why |
| --- | --- | --- |
| Только @view-transition navigation:auto | Native при наличии CSSViewTransitionRule, анимация элементов и обычная навигация в остальных браузерах; `assets/js/motion.js` | Firefox/Zen не поддерживает переход между отдельными документами |
| Нет появления при обычной навигации | Одноразовый marker и ранний `assets/js/page-entry.js` | Новая композиция получает анимацию до первого рендера, без скрывающего слоя |
| Возможный долгий незавершённый выход | Таймер240мс, Escape, последняя ссылка, cleanup pageshow | Навигация остаётся управляемой, после Back нет полупрозрачного main |
| Меню закрывалось только на pageswap | Также site:navigate в site.js | Firefox-вариант не зависит от поддержки pageswap |

Код: выход160мс, появление350мс со stagger35/70мс; transform/opacity, сильный ease-out. Контент не становится полностью прозрачным. Нет fade корневого фона. Вход применяется только после pointer-ссылки на другую HTML-страницу того же origin. Enter и reduced motion обходят движение. Нативный переход в поддерживаемых браузерах не перехватывает ссылки. Фото в fallback не переносится между страницами.

Проверено: `node scripts/check-navigation-fallback.mjs` (VM-сценарии навигации/отмены/хранилища), `node scripts/check-motion.mjs` (native-ветка, подключение и хеши10 страниц), `node scripts/check-builder.mjs`, синтаксис JS, `git diff --check`. Это автоматические проверки поведения кода, не запуск Zen.

**Block** для визуальной приёмки и утверждения «в Zen исправлено»: браузерный доступ инструмента к локальному превью ранее запрещён URL policy, обход не выполнялся. Реальное поведение в Zen, screenshot/video, reduced motion ОС и мобильный Safari не проверены. Пользователю нужно обновить страницу и пройти по ссылкам меню; наблюдение в его браузере подтвердит результат.

Основание выбора fallback: [Zen: база Firefox](https://docs.zen-browser.app/user-manual/extensions), [MDN BCD: Firefox version_added:false для @view-transition](https://raw.githubusercontent.com/mdn/browser-compat-data/main/css/at-rules/view-transition.json), [CSSViewTransitionRule](https://developer.mozilla.org/en-US/docs/Web/API/CSSViewTransitionRule). Данные просмотрены24.10.2026. Версия Firefox/Zen пользователя не определялась по User-Agent; выбор механизма основан на доступности интерфейса.
