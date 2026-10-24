# Motion V2 review · 23.10.2026

| Before | After | Why |
| --- | --- | --- |
| Plain mobile dropdown | Circle becomes 220px panel with transform-only background patches; `assets/css/menu.css:1` | Recreates the approved portfolio interaction without adding React/Bloom to this static site |
| Static menu and disclosure symbols | Locally bundled Morphicons menu/close and plus/minus, explicit SVG 22/20px; `assets/js/icons.js`, `assets/css/menu.css:4` | Morphs communicate state, fixed SVG sizing handles display:contents hosts |
| focusout checked temporary activeElement | Check relatedTarget; `assets/js/site.js` | Keeps the actual link clickable during pointer focus; reproduced with an event trace and confirmed after the fix |
| Full-screen curtain and delayed navigation | Native cross-document transitions, stable header, separate title and shared product photos; `assets/css/motion.css:49` | Implements the newly chosen composition transition; no intercepting clicks, storage marker or loading cover |
| Motion in all pointer navigation | Reduced motion disables document transitions, Enter skips them; `assets/js/motion.js` | Immediate accessible keyboard navigation and ordinary fallback |

**Approve** within tested Chromium conditions. Popover background uses transforms only, no animated layout. Microfeedback is interruptible; navigation scenes are one-off keyframes. The 500/320ms menu timing follows SITES project rules. Shared photo geometry is interpolated by native View Transitions snapshot layers; original page layout is not animated by custom JS. Morphicons necessarily interpolates SVG path geometry for its small icons; that is the explicitly requested library, not a blanket transform-only claim.

Evidence: node scripts/check-motion.mjs PASS (native navigation, keyboard/reduced-motion skip, unique photo names, menu/icon markup across nine pages); JS syntax checks PASS. Browser checks: 320px fixed SVG and no permanent overflow; 375px opening, Escape, outside click, rapid toggles and actual menu navigation to Events; care plus/minus state; catalog/product navigation and Back at desktop. No console warnings/errors in the checked flows. Real frame captures are menu-v2.gif and photo-v2.gif; they are not FPS measurements.

Limits: physical Safari/iPhone, OS reduced-motion appearance, Windows 125/150% and CPU ×4 remain unverified. Native transitions fall back to ordinary navigation if unsupported. The portfolio interaction is recreated in vanilla code, not the exact React Bloom package.

API behavior verified against [Chrome's cross-document View Transitions documentation](https://developer.chrome.com/docs/web-platform/view-transitions/cross-document): same-origin pages opt in via @view-transition; matched unique names connect photo snapshots. Source compatibility notes are not a substitute for device checks.
