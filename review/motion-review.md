# Motion review · 23.10.2026

| Before | After | Why |
| --- | --- | --- |
| Generic fade on hovered links, limited press feedback | Lift up to 3px, scale .97 on the inner control, arrow shift, transform underline; `assets/css/motion.css:16` | Explicit feedback; transitions remain interruptible, hover is gated by fine pointer |
| Immediate document replacement | Milk curtain, red mark, 250ms cover / 450ms uncover, 300ms content reveal; `assets/css/motion.css:49` | User-approved page transition using project motion tokens. The full-screen 450ms motion is deliberately longer than small-control feedback |
| Potential overlapping arrival/departure cleanup | Cancel arrival timer before starting departure; `assets/js/motion.js:55` | Rapid clicks during the arrival cannot cancel the next navigation |
| No transition recovery needed in old version | BFCache cleanup, Escape cancellation before navigation, fail-open boot and stalled-navigation reset; `assets/js/motion.js:10` | Keeps native history functional and prevents a permanent blocking cover |
| No navigation motion preference handling | Transform-free fade for reduced motion; immediate keyboard links; `assets/css/motion.css:64`, `assets/js/motion.js:51` | Respects accessibility and frequent keyboard navigation |

**Approve** for the implemented code and checked Chromium flows. Only transform/opacity animate. Small interactions use 160–240ms, custom curves; project-approved full-page motion uses 250/450ms. Keyframes are limited to the one-off navigation scene. There is no animation on first load, modified clicks, downloads, external links or keyboard navigation. Native Back keeps native history and scroll restoration.

Verification: `node scripts/check-motion.mjs` PASS (normal navigation, double clicks, rapid arrival/departure, Escape, reduced-motion timing, blocked storage, BFCache, modified/external/hash links and keyboard). Both JS files pass `node --check`. Browser: cover/uncover seen, arrival settles, Back and keyboard navigation work, 375px menu navigation and filtering work without overflow or console errors. Actual frame capture: `review/page-motion.gif` (arrival segment, not a performance measurement).

Limits: reduced-motion visuals reviewed in CSS and controller tested with a mocked preference; an actual OS reduced-motion run was not performed. Physical Safari/iPhone, hover/press in slow-motion, Windows display scaling and CPU ×4 remain to verify. This review does not claim frame-rate measurement or production readiness.
