'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const avendorRoot = path.resolve(__dirname, '..');
const ledgePath = path.join(avendorRoot, 'data/maps/briarwell-rock-ledge-pass.json');
const waterfallPath = path.join(avendorRoot, 'data/maps/briarwell-waterfall.json');
const htmlPath = path.join(avendorRoot, 'walk-test.html');
const runtimePath = path.join(avendorRoot, 'js/walk-test.js');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function scriptedRoll(...values) {
  return (minimum, maximum) => {
    assert(values.length > 0, 'The ledge evaluator requested an unexpected roll.');
    const value = values.shift();
    assert(value >= minimum && value <= maximum, `Scripted roll ${value} is outside d${maximum}.`);
    return value;
  };
}

const context = { window: {}, console, Math, Uint32Array };
vm.createContext(context);
vm.runInContext(
  fs.readFileSync(path.join(avendorRoot, 'js/ledge-hazard.js'), 'utf8'),
  context
);

const evaluator = context.window.AvendorLedgeHazard;
assert(evaluator, 'The Rock Ledge hazard evaluator did not load.');
assert(evaluator.calculateChance(5, 25, 7) === 60, 'The ×7 checkpoint does not add the Climb rating.');
assert(evaluator.calculateChance(5, 25, 6) === 55, 'The ×6 checkpoint does not add the Climb rating.');
assert(evaluator.calculateChance(10, 99, 7) === 100, 'A d100 ledge chance must cap naturally at 100.');

const check = { type: 'ledge-balance', multiplier: 7 };
const exactPass = evaluator.resolve(
  check,
  { agility: 5, climb: 25, luck: 1 },
  scriptedRoll(60)
);
assert(
  exactPass.outcome === 'crossed'
    && exactPass.chance === 60
    && exactPass.agilityRoll === 60
    && exactPass.luckRoll === null,
  'Rolling exactly Agility × 7 + Climb must cross without spending Luck.'
);

const luckyCatch = evaluator.resolve(
  check,
  { agility: 5, climb: 25, luck: 4 },
  scriptedRoll(61, 4)
);
assert(
  luckyCatch.outcome === 'caught'
    && luckyCatch.agilityRoll === 61
    && luckyCatch.luckRoll === 4,
  'A failed ledge check followed by 1d10 ≤ Luck must catch the ledge.'
);

const riverFall = evaluator.resolve(
  check,
  { agility: 5, climb: 25, luck: 4 },
  scriptedRoll(61, 5)
);
assert(
  riverFall.outcome === 'fell'
    && riverFall.agilityRoll === 61
    && riverFall.luckRoll === 5,
  'Failing both the ledge check and hidden Luck check must cause a fall.'
);

const ledge = JSON.parse(fs.readFileSync(ledgePath, 'utf8'));
const waterfall = JSON.parse(fs.readFileSync(waterfallPath, 'utf8'));
assert(ledge.referenceSize.width === 2048 && ledge.referenceSize.height === 944, 'Rock Ledge Pass must remain a shallow scrollable map.');
assert(ledge.movement.speedY < ledge.movement.speedX, 'Rock Ledge Pass must substantially limit vertical movement.');
assert(ledge.hazards.map((hazard) => hazard.check.multiplier).join(',') === '7,6,7', 'The three checkpoints are not ordered ×7, ×6, ×7.');
assert(
  ledge.hazards.every((hazard) => (
    hazard.check.stat === 'agility'
      && hazard.check.skill === 'Climb'
      && hazard.check.die === 100
      && hazard.check.luckCheck?.stat === 'luck'
      && hazard.check.luckCheck?.die === 10
      && hazard.check.luckCheck?.operator === '<='
      && hazard.check.failureTarget?.areaId === 'briarwell-waterfall'
      && hazard.check.failureTarget?.spawnId === 'from-mountain-fall'
  )),
  'One or more Rock Ledge checkpoints lost its Agility + Climb, Luck, or Waterfall contract.'
);
assert(
  waterfall.version === '0.3.0'
    && waterfall.forcedEntry?.status === 'active'
    && waterfall.forcedEntry?.sourceAreaId === ledge.id
    && waterfall.spawnPoints?.[waterfall.forcedEntry.spawnId],
  'Waterfall does not expose the active forced arrival used by Rock Ledge falls.'
);

const html = fs.readFileSync(htmlPath, 'utf8');
assert(
  html.indexOf('js/ledge-hazard.js') > html.indexOf('js/player-state.js')
    && html.indexOf('js/ledge-hazard.js') < html.indexOf('js/walk-test.js'),
  'The ledge evaluator must load after player state and before the walk runtime.'
);

const runtime = fs.readFileSync(runtimePath, 'utf8');
assert(runtime.includes("naturalSkillRating(hazard.check.skill || 'Climb', state)"), 'The runtime does not use the hero\'s natural Climb rating.');
assert(runtime.includes('map.getHazardAt(position)'), 'The walk loop does not detect authored ledge hazards.');
assert(runtime.includes('await loadArea(target.areaId, target.spawnId)'), 'A failed Luck check does not load the authored Waterfall arrival.');
assert(
  !runtime.includes('${result.luck') && !runtime.includes('${state?.luck'),
  'The runtime must not reveal the hidden Luck score or roll in player-facing text.'
);

console.log('Rock Ledge Agility + Climb checks, hidden Luck catches and Waterfall falls passed.');
