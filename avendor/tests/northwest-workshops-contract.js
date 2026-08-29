'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const avendorRoot = path.resolve(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(avendorRoot, 'data/maps/briarwell-northwest-workshops.json'), 'utf8'));
const engineSource = fs.readFileSync(path.join(avendorRoot, 'js/map-engine.js'), 'utf8');
const context = { window: {}, console };
vm.createContext(context);
vm.runInContext(engineSource, context);

const MapGeometry = context.window.AvendorMapEngine.MapGeometry;
const map = new MapGeometry(data);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const exitsById = new Map(data.exits.map((exit) => [exit.id, exit]));
assert(data.exits.length === 2, `Northwest Workshops must expose exactly two exits; found ${data.exits.length}.`);
assert(exitsById.has('east-road'), 'Northwest Workshops east exit is missing.');
assert(exitsById.has('southwest-road'), 'Northwest Workshops southwest exit is missing.');
assert(!data.exits.some((exit) => exit.direction === 'north'), 'Northwest Workshops regained a north exit.');
assert(!data.exits.some((exit) => exit.direction === 'southeast'), 'Northwest Workshops gained a southeast visual exit.');
assert(exitsById.get('southwest-road').direction === 'southwest', 'Workshop return exit no longer reads southwest on screen.');
assert(exitsById.get('southwest-road').worldDirection === 'southeast', 'Workshop return route lost its Town Center world-direction metadata.');

assert(map.isWalkable(760, 790), 'Workshop-square default position is blocked.');
assert(map.isWalkable(620, 955), 'Southwest arrival position is blocked.');
assert(map.isWalkable(1300, 625), 'East arrival position is blocked.');
assert(map.isWalkable(1410, 636), 'East exit center is blocked.');
assert(map.isWalkable(598, 1046), 'Southwest exit center is blocked.');
assert(!map.isWalkable(1240, 440), 'Closed northern/east work-yard edge is unexpectedly walkable.');
assert(!map.isWalkable(1250, 900), 'Southeast foreground wall is unexpectedly walkable.');

const northwestMapArt = data.art?.background || '';
assert(northwestMapArt.endsWith('briarwell-northwest-workshops-v2.png'), 'Northwest Workshops is not pointed at the approved v2 canonical art.');

console.log('Northwest Workshops final-layout contract checks passed.');
