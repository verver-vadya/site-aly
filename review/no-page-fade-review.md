# Повторное мигание — итоговая проверка

| Before | After | Why |
| --- | --- | --- |
| Both old/new page content became almost transparent | All cross-document animation disabled, `assets/css/motion.css` | The earlier paper-color fix missed the content-opacity dip, which was reproduced in frame capture |
| Native shared-photo transition could still block a click immediately after Back | Photo transition also disabled, controller no longer loaded, generated photo names removed | The fast Back→next-link scenario failed during the photo-only experiment; that variant was not shipped |
| Tests covered inactive controller details | Generated pages must not load retired controllers; CSS forbids navigation:auto; current asset hashes checked | Validation now matches the actual stable navigation policy |

**Approve** for the simplified result. UI feedback, Morphicons and mobile menu remain; no opacity/transform animation applies to changing documents. Tested1280px catalog→events, catalog→product→Back→atelier (immediate next click passed).18 captured catalog→events frames show fully visible new content; no full-screen fade.375px mobile menu navigation passed without overflow, checked console has no errors/warnings. Node checks pass across9 generated pages.

Previous measurements of a constant paper-colored corner did not establish that the content stopped blinking. The updated comparison shows the content itself. No claim about physical Safari/iPhone, OS reduced motion, CPU×4 or Windows display scaling is made. Inter-page motion can only be reintroduced as a separately verified change; the retired versions remain recoverable in Git.
