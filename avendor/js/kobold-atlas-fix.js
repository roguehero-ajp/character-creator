(() => {
  'use strict';

  const style = document.createElement('style');
  style.textContent = `
    .kobold-runtime-sprite {
      aspect-ratio: 5 / 6 !important;
      background-image: url("assets/sprites/creatures/kobolds/kobold-walk-ew.svg") !important;
      background-size: 600% 400% !important;
    }
    .kobold-runtime-sprite[data-variant="regular"] { background-position-y: 0% !important; }
    .kobold-runtime-sprite[data-variant="champion"] { background-position-y: 33.3333% !important; }
    .kobold-runtime-sprite[data-variant="wizard"] { background-position-y: 66.6667% !important; }
    .kobold-runtime-sprite[data-variant="chieftain"] { background-position-y: 100% !important; }
  `;
  document.head.appendChild(style);
})();
