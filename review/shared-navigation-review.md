# Общая навигация Zen/Chromium · 24.10.2026

| Before | After | Why |
| --- | --- | --- |
| Zen имел упрощённый выход/вход вокруг перезагрузки | same-document startViewTransition с теми же CSS-снимками заголовка/main/фото | Пользователь одобрил одинаковую композиционную анимацию |
| Полная замена документа на каждый клик | Загрузка известных HTML, постоянная шапка, замена main | Отсутствует разрыв между двумя документами при улучшенной навигации |
| Инициализация конструктора только при загрузке модуля | mount/destroy/ready и сохранённый черновик | Повторный вход остаётся рабочим, без двойных кликов/утечек |
| Локальные обработчики каталога и ухода | Делегирование + site:ready | Обрабатываются новые элементы после маршрута |
| Риск noscript-style из DOMParser | Script/noscript удаляются из импортируемого main | В DOMParser scripting выключен: fallback-style мог бы скрыть форму |

Сохраняются прежние длительности/easing. При клавиатурном переходе и reduced motion main меняется без анимации. Клик во время эффекта пропускает текущий снимок; устаревший ответ не заменит новую страницу. История/прокрутка обновляются явно; якоря сохраняют живую страницу. Если загрузка не удалась, обычная навигация остаётся запасным механизмом. Конструктор закрывает собственные обработчики и не экспортирует после ухода. Анимация общих фото использует одни и те же view-transition-name.

**Block** для окончательной визуальной приёмки: инструмент браузера ранее запретил доступ к localhost; обход не выполнялся. Реальные кадры Zen/Chromium, меню, Canvas во время снимка, Safari и жесты Back не просмотрены.

Автопроверки: scripts/check-navigation.mjs — моделируемые DOM и history, ошибки, гонки запросов, поздние модули, отмена и якоря; scripts/check-builder-lifecycle.mjs — реальный код mountBuilder в контролируемом окружении, draft/re-entry/cleanup/поздний экспорт; scripts/check-motion.mjs и check-navigation-fallback.mjs — резервные ветки и10 HTML; check-builder.mjs — модель и импорты. Эти тесты не являются браузерным E2E.

API: [MDN Using View Transitions](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API/Using), [MDN: Firefox144 same-document и отличие cross-document](https://developer.mozilla.org/en-US/blog/view-transitions-beginner-guide/). Поддержка определяется функцией document.startViewTransition, не названием браузера.
