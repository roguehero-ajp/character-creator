'use strict';

const fs = require('fs');
const path = require('path');

const avendorRoot = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(avendorRoot, 'walk-test.html'), 'utf8');
const source = fs.readFileSync(path.join(avendorRoot, 'js/world-time.js'), 'utf8');
const css = fs.readFileSync(path.join(avendorRoot, 'css/hero-rig.css'), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const worldTimeIndex = html.indexOf('js/world-time.js');
const environmentIndex = html.indexOf('js/environment-animation.js');
const walkTestIndex = html.indexOf('js/walk-test.js');

assert(worldTimeIndex >= 0, 'Walk test does not load the world-time controller.');
assert(worldTimeIndex < environmentIndex, 'World-time controller must load before environment animation.');
assert(worldTimeIndex < walkTestIndex, 'World-time controller must load before walk-test runtime.');
assert(html.includes('id="daypart-overlay"'), 'Walk test has no ambient daypart overlay.');
assert(html.includes('id="daypart-cycle"'), 'Walk test has no daypart test control.');
assert(source.includes("['dawn', 'day', 'dusk', 'night']"), 'World-time controller does not expose all four visual dayparts.');
assert(source.includes("DEFAULT_DAYPART = 'dusk'"), 'Approved dusk presentation is no longer the Phase 1 default.');
assert(source.includes("params.get('daypart')"), 'Daypart query-string override is missing.');
assert(source.includes('sessionStorage'), 'Daypart selection does not persist during the test session.');
assert(source.includes('avendor:daypartchange'), 'Daypart-change event is missing.');
assert(source.includes('setDaypart'), 'World-time API has no explicit daypart setter.');
assert(source.includes('cycleDaypart'), 'World-time API has no manual daypart cycle control.');
assert(css.includes('[data-daypart="dawn"]'), 'Dawn presentation styling is missing.');
assert(css.includes('[data-daypart="day"]'), 'Day presentation styling is missing.');
assert(css.includes('[data-daypart="dusk"]'), 'Dusk presentation styling is missing.');
assert(css.includes('[data-daypart="night"]'), 'Night presentation styling is missing.');
assert(css.includes('z-index: 3000'), 'Daypart overlay no longer sits above world sprites and below debug/UI layers.');

console.log('Visual daypart foundation smoke checks passed.');
