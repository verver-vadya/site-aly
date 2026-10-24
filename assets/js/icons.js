// Анимированные иконки: <morph-icon> из morphicons (MIT), файлы лежат в assets/vendor/morphicons/.
// Иконка перетекает в новую, когда меняется атрибут icon (авторская строка SVG d из assets/data/ui-icons.json):
//   el.setAttribute("icon", "M18 6 6 18M6 6l12 12");
// Внутри <morph-icon> сразу пишем обычный <svg><path d="…"/></svg>: так иконка видна
// и без JS, а элемент подхватывает её как есть. reduced-motion="user" отключает анимацию,
// если в системе включено «уменьшить движение».
import { defineMorphIcon } from "../vendor/morphicons/element.js";

defineMorphIcon();

// Critically damped icon morphs: no playful overshoot in the editorial design.
function tuneIcons(){document.querySelectorAll("morph-icon").forEach(icon=>{icon.spring={stiffness:420,damping:42};})}
tuneIcons();document.addEventListener('site:ready',tuneIcons);
