'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const avendorRoot = path.resolve(__dirname, '..');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function makeStyle() {
  return {
    setProperty(name, value) {
      this[name] = value;
    }
  };
}

const stageArt = { style: makeStyle() };
const player = { style: makeStyle() };
const mark = { style: makeStyle() };
const debugCanvas = {};
const geometryCanvas = {};
const stage = {
  dataset: {},
  style: makeStyle(),
  querySelector(selector) {
    return selector === '.stage-art' ? stageArt : null;
  },
  insertBefore() {}
};

const elements = {
  'walk-stage': stage,
  player,
  'confusion-mark': mark,
  'map-debug-layer': debugCanvas,
  'geometry-sketch-layer': geometryCanvas
};

const document = {
  head: { appendChild() {} },
  getElementById(id) {
    return elements[id] || null;
  },
  createElement() {
    return { style: makeStyle() };
  }
};

let sceneMap = {
  width: 2048,
  height: 944,
  data: { id: 'briarwell-ogre-clearing' },
  getScale: () => 0.78,
  getDepth: (y) => 1000 + y
};
let area = { id: 'briarwell-ogre-clearing' };
let heroPosition = { x: 1748, y: 520 };
const frames = [];

const context = {
  console,
  document,
  performance: { now: () => 0 },
  requestAnimationFrame(callback) {
    frames.push(callback);
  },
  window: {
    AvendorWalkTest: {
      getMap: () => sceneMap,
      getArea: () => area,
      getPosition: () => heroPosition
    }
  }
};

vm.createContext(context);
vm.runInContext(
  fs.readFileSync(path.join(avendorRoot, 'js/kobold-sewer-runtime.js'), 'utf8'),
  context
);

assert(frames.length === 1, 'The wide-area camera runtime did not schedule its update loop.');
frames.shift()(16);

assert(stage.dataset.cameraScroll === 'true', "The Ogre's Clearing did not enable camera scrolling.");
assert(context.window.AvendorKoboldRuntime.getCameraX() === 600, 'The camera did not reach the wide arena right boundary.');
assert(Math.abs(parseFloat(stageArt.style.width) - (2048 / 1448 * 100)) < 0.001, 'The wide background has the wrong rendered width.');
assert(Math.abs(parseFloat(stageArt.style.left) + (600 / 1448 * 100)) < 0.001, 'The wide background did not pan opposite the hero.');
assert(Math.abs(parseFloat(player.style.left) - (1148 / 1448 * 100)) < 0.001, 'The hero was not held inside the scrolling viewport.');
assert(stage.style['--stage-ratio'] === '1448 / 944', 'The wide arena did not preserve its viewport height.');

sceneMap = {
  width: 2048,
  height: 944,
  data: { id: 'briarwell-rock-ledge-pass' },
  getScale: () => 0.72,
  getDepth: (y) => 1000 + y
};
area = { id: 'briarwell-rock-ledge-pass' };
heroPosition = { x: 1024, y: 500 };
frames.shift()(24);

assert(stage.dataset.cameraScroll === 'true', 'Rock Ledge Pass did not enable horizontal camera scrolling.');
assert(context.window.AvendorKoboldRuntime.getCameraX() === 300, 'Rock Ledge Pass did not center its mid-route camera.');
assert(Math.abs(parseFloat(stageArt.style.left) + (300 / 1448 * 100)) < 0.001, 'Rock Ledge Pass did not pan its background with the hero.');
assert(stage.style['--stage-ratio'] === '1448 / 944', 'Rock Ledge Pass did not preserve its shallow viewport height.');

sceneMap = {
  width: 2048,
  height: 944,
  data: { id: 'briarwell-mountain-m15' },
  getScale: () => 0.78,
  getDepth: (y) => 1000 + y
};
area = { id: 'briarwell-mountain-m15' };
heroPosition = { x: 1748, y: 520 };
frames.shift()(32);

assert(stage.dataset.cameraScroll === 'true', 'Mountain M15 did not enable horizontal camera scrolling.');
assert(context.window.AvendorKoboldRuntime.getCameraX() === 600, 'Mountain M15 did not reach its east camera boundary.');
assert(stage.style['--stage-ratio'] === '1448 / 944', 'Mountain M15 did not preserve its wide-arena viewport height.');

sceneMap = {
  width: 3072,
  height: 944,
  data: { id: 'briarwell-redluk' },
  getScale: () => 0.78,
  getDepth: (y) => 1000 + y
};
area = { id: 'briarwell-redluk' };
heroPosition = { x: 2850, y: 520 };
frames.shift()(40);

assert(stage.dataset.cameraScroll === 'true', 'Redluk did not enable horizontal camera scrolling.');
assert(context.window.AvendorKoboldRuntime.getCameraX() === 1624, 'Redluk did not reach its sealed east camera boundary.');
assert(Math.abs(parseFloat(stageArt.style.width) - (3072 / 1448 * 100)) < 0.001, 'Redluk has the wrong rendered panorama width.');
assert(Math.abs(parseFloat(stageArt.style.left) + (1624 / 1448 * 100)) < 0.001, 'Redluk did not pan across its full panorama.');
assert(Math.abs(parseFloat(player.style.left) - (1226 / 1448 * 100)) < 0.001, 'The hero was not held inside the Redluk viewport.');
assert(stage.style['--stage-ratio'] === '1448 / 944', 'Redluk did not preserve its panoramic viewport height.');

sceneMap = {
  width: 3072,
  height: 1024,
  data: { id: 'briarwell-dwarven-cave-battle-chamber' },
  getScale: () => 0.8,
  getDepth: (y) => 1000 + y
};
area = { id: 'briarwell-dwarven-cave-battle-chamber' };
heroPosition = { x: 2810, y: 570 };
frames.shift()(44);

assert(stage.dataset.cameraScroll === 'true', 'The Dwarven Cave battle chamber did not enable horizontal camera scrolling.');
assert(context.window.AvendorKoboldRuntime.getCameraX() === 1624, 'The Dwarven Cave battle camera did not reach its east boundary.');
assert(Math.abs(parseFloat(stageArt.style.width) - (3072 / 1448 * 100)) < 0.001, 'The Dwarven Cave battle chamber has the wrong rendered panorama width.');
assert(stage.style['--stage-ratio'] === '1448 / 1024', 'The Dwarven Cave battle chamber did not preserve its panoramic viewport height.');

sceneMap = {
  width: 1448,
  height: 1086,
  data: { id: 'briarwell-forest-f20' },
  getScale: () => 0.76,
  getDepth: (y) => 1000 + y
};
area = { id: 'briarwell-forest-f20' };
heroPosition = { x: 720, y: 620 };
frames.shift()(48);

assert(stage.dataset.cameraScroll === 'false', 'Leaving the Ogre arena did not disable camera scrolling.');
assert(context.window.AvendorKoboldRuntime.getCameraX() === 0, 'The camera offset survived into a normal-width map.');
assert(stageArt.style.left === '0' && stageArt.style.width === '100%', 'Normal-width background sizing was not restored.');
assert(stage.style['--stage-ratio'] === '1448 / 1086', 'The normal map aspect ratio was not restored.');

console.log("Wide-area camera scrolling passes for the Ogre's Clearing, Rock Ledge Pass, M15, Redluk and the Dwarven Cave battle chamber, then resets on F20.");
