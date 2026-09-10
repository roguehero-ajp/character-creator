'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const avendorRoot = path.resolve(__dirname, '..');
const map = JSON.parse(
  fs.readFileSync(path.join(avendorRoot, 'data/maps/briarwell-redluk.json'), 'utf8')
);
const source = fs.readFileSync(path.join(avendorRoot, 'js/redluk-encounter.js'), 'utf8');
const walkTestSource = fs.readFileSync(path.join(avendorRoot, 'js/walk-test.js'), 'utf8');
const walkTestHtml = fs.readFileSync(path.join(avendorRoot, 'walk-test.html'), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const context = { window: {}, console };
vm.createContext(context);
vm.runInContext(source, context);

const engine = context.window.AvendorRedlukEncounter;
const config = map.cinematicEncounter;
const geometryContext = { window: {}, console };
vm.createContext(geometryContext);
vm.runInContext(
  fs.readFileSync(path.join(avendorRoot, 'js/map-engine.js'), 'utf8'),
  geometryContext
);
const geometry = new geometryContext.window.AvendorMapEngine.MapGeometry(map);

assert(engine?.AREA_ID === 'briarwell-redluk', 'The Redluk timeline engine did not initialize.');
assert(config?.status === 'scaffold', 'Redluk must identify the encounter as a replaceable scaffold.');
assert(config.trigger?.type === 'cross-x' && config.trigger.direction === 'east', 'The Redluk encounter requires an eastbound crossing trigger.');
assert(config.actors.length === 8, 'The Redluk convergence must stage eight rank placeholders.');
assert(config.actors.every((actor) => actor.spriteStatus === 'placeholder'), 'A Redluk rank incorrectly claims final sprite art.');
assert(config.elderOrc.spriteStatus === 'placeholder', 'The elder orc incorrectly claims final sprite art.');
assert(geometry.isWalkable(config.trigger.x, 540), 'The Redluk cinematic trigger is outside the playable shelf.');
assert(
  [...config.actors, config.elderOrc].every((actor) => geometry.isWalkable(actor.halt.x, actor.halt.y)),
  'A Redluk actor halt anchor is outside the playable convergence ground.'
);

const waiting = engine.getTimelineState(config, 0);
assert(waiting.phase === 'emerging' && waiting.ranks.every((actor) => actor.opacity === 0), 'The ranks must begin hidden in the mountain fissures.');

const emerging = engine.getTimelineState(config, 700);
assert(
  emerging.phase === 'emerging'
    && emerging.ranks.every((actor) => actor.opacity > 0 && actor.opacity < 1),
  'The ranks do not emerge gradually.'
);

const closing = engine.getTimelineState(config, 3600);
assert(
  closing.phase === 'closing-in'
    && closing.ranks.every((actor, index) => (
      actor.moving
        && actor.x !== config.actors[index].start.x
        && actor.x !== config.actors[index].halt.x
    )),
  'The rank placeholders are not advancing between their emergence and halt anchors.'
);

const stopped = engine.getTimelineState(config, config.timing.stopMs);
assert(stopped.phase === 'stopped', 'The orc ranks do not enter the stopped phase on cue.');
assert(stopped.caption === 'Stop...', 'The only authored Redluk line must remain the quiet "Stop..." cue.');
assert(
  stopped.ranks.every((actor, index) => (
    !actor.moving
      && actor.x === config.actors[index].halt.x
      && actor.y === config.actors[index].halt.y
  )),
  'The orc ranks drift after the elder orders them to stop.'
);

const elderEntering = engine.getTimelineState(config, 9300);
assert(
  elderEntering.phase === 'elder-entering'
    && elderEntering.elder.moving
    && elderEntering.elder.opacity > 0
    && elderEntering.elder.opacity < 1,
  'The elder orc does not make a distinct entrance after the ranks halt.'
);

const complete = engine.getTimelineState(config, config.timing.completeMs);
assert(
  complete.complete
    && complete.phase === 'complete'
    && complete.elder.x === config.elderOrc.halt.x
    && complete.elder.y === config.elderOrc.halt.y,
  'The Redluk scaffold does not settle into its completed tableau.'
);

assert(
  engine.crossedTrigger(config, 1700, 1725)
    && !engine.crossedTrigger(config, 1725, 1750)
    && !engine.crossedTrigger(config, 1700, 1715),
  'The Redluk trigger is not a one-time eastbound boundary crossing.'
);
assert(
  config.beats.filter((beat) => beat.line).length === 1
    && config.beats.some((beat) => beat.id === 'orc-halt')
    && config.beats.some((beat) => beat.id === 'elder-entry'),
  'The scaffold must preserve the approved beats without inventing extra dialogue.'
);
assert(
  walkTestSource.includes('setMovementLock')
    && walkTestHtml.indexOf('js/kobold-sewer-runtime.js') < walkTestHtml.indexOf('js/redluk-encounter.js'),
  'The Redluk runtime must load after the shared wide-area camera and use the owned movement lock.'
);

function makeClassList() {
  const values = new Set();
  return {
    add: (...names) => names.forEach((name) => values.add(name)),
    remove: (...names) => names.forEach((name) => values.delete(name)),
    toggle(name, forced) {
      const enabled = forced === undefined ? !values.has(name) : Boolean(forced);
      if (enabled) values.add(name);
      else values.delete(name);
      return enabled;
    },
    contains: (name) => values.has(name)
  };
}

function makeStyle() {
  return {
    setProperty(name, value) {
      this[name] = value;
    }
  };
}

function makeElement() {
  return {
    className: '',
    classList: makeClassList(),
    dataset: {},
    style: makeStyle(),
    textContent: '',
    appendChild() {},
    insertBefore() {},
    remove() { this.removed = true; },
    setAttribute() {}
  };
}

const stage = makeElement();
const debugCanvas = makeElement();
const geometryCanvas = makeElement();
const elements = {
  'walk-stage': stage,
  'map-debug-layer': debugCanvas,
  'geometry-sketch-layer': geometryCanvas
};
const frames = [];
const locks = new Set();
let heroPosition = { x: 1700, y: 540 };
let runtimeNow = 0;
const sceneMap = {
  width: map.referenceSize.width,
  height: map.referenceSize.height,
  data: map,
  getScale: () => 0.78,
  getDepth: (y) => 1000 + y
};
const runtimeContext = {
  console,
  performance: { now: () => runtimeNow },
  requestAnimationFrame(callback) { frames.push(callback); },
  document: {
    head: { appendChild() {} },
    createElement: makeElement,
    getElementById: (id) => elements[id] || null
  },
  window: {
    AvendorKoboldRuntime: { getCameraX: () => 976 },
    AvendorWalkTest: {
      getArea: () => ({ id: 'briarwell-redluk' }),
      getMap: () => sceneMap,
      getPosition: () => heroPosition,
      setMovementLock(lockId, locked) {
        if (locked) locks.add(lockId);
        else locks.delete(lockId);
        return locks.size > 0;
      }
    }
  }
};
vm.createContext(runtimeContext);
vm.runInContext(source, runtimeContext);

assert(frames.length === 1, 'The live Redluk runtime did not schedule its update loop.');
frames.shift()(0);
assert(
  runtimeContext.window.AvendorRedlukRuntime.getState().phase === 'waiting'
    && runtimeContext.window.AvendorRedlukRuntime.getState().rankCount === 8,
  'The live Redluk runtime did not mount its waiting actors.'
);

heroPosition = { x: 1730, y: 540 };
runtimeNow = 100;
frames.shift()(runtimeNow);
assert(
  runtimeContext.window.AvendorRedlukRuntime.getState().triggered
    && runtimeContext.window.AvendorRedlukRuntime.getState().movementLocked
    && locks.has('redluk-orc-convergence'),
  'Crossing the live Redluk trigger did not acquire its movement lock.'
);

runtimeNow = 6600;
frames.shift()(runtimeNow);
assert(
  runtimeContext.window.AvendorRedlukRuntime.getState().phase === 'stopped'
    && runtimeContext.window.AvendorRedlukRuntime.getState().movementLocked,
  'The live Redluk runtime did not hold its stopped tableau.'
);

runtimeNow = 11200;
frames.shift()(runtimeNow);
assert(
  runtimeContext.window.AvendorRedlukRuntime.getState().complete
    && !runtimeContext.window.AvendorRedlukRuntime.getState().movementLocked
    && locks.size === 0,
  'The live Redluk runtime did not release its owned movement lock on completion.'
);

console.log('Redluk orc-convergence timeline, quiet Stop beat and elder entrance contracts passed.');
