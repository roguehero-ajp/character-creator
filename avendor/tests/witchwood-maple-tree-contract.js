'use strict';

const fs = require('fs');
const path = require('path');

const avendorRoot = path.resolve(__dirname, '..');
const registry = JSON.parse(
  fs.readFileSync(path.join(avendorRoot, 'data/maps/briarwell-area-registry.json'), 'utf8')
);
const areas = new Map(registry.areas.map((area) => [area.id, area]));
const maps = new Map(registry.areas
  .filter((area) => area.map)
  .map((area) => [
    area.id,
    JSON.parse(fs.readFileSync(path.join(avendorRoot, area.map), 'utf8'))
  ]));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function transition(areaId, transitionId) {
  const map = maps.get(areaId);
  return [...(map?.exits || []), ...(map?.portals || [])]
    .find((candidate) => candidate.id === transitionId);
}

function connection(connectionId) {
  return registry.connections.find((candidate) => candidate.id === connectionId);
}

function assertActiveConnection(connectionId, kind) {
  const record = connection(connectionId);
  assert(record?.status === 'active', `Connection is not active: ${connectionId}`);
  assert(record.kind === kind, `Connection has the wrong kind: ${connectionId}`);
}

const witchwoodContracts = {
  'briarwell-witchwood-w1': {
    art: 'briarwell-witchwood-w1-v2.webp',
    directions: ['east', 'south']
  },
  'briarwell-witchwood-w2': {
    art: 'briarwell-witchwood-w2-v2.webp',
    directions: ['east', 'north', 'southeast']
  }
};
Object.entries(witchwoodContracts).forEach(([areaId, contract]) => {
  const area = areas.get(areaId);
  const map = maps.get(areaId);
  assert(area?.status === 'playable' && area.map, `Witchwood area is not playable: ${areaId}`);
  assert(map?.version === '0.1.0', `Witchwood map has the wrong version: ${areaId}`);
  assert(map.art.background.endsWith(contract.art), `Approved mystical art is not active: ${areaId}`);
  assert(
    map.exits.map((exit) => exit.direction).sort().join(',') === contract.directions.sort().join(','),
    `Witchwood route directions changed: ${areaId}`
  );
});

[
  ['forest-f9-witchwood-w1', 'road'],
  ['forest-f10-witchwood-w2', 'road'],
  ['witchwood-w1-w2', 'road'],
  ['witchwood-w2-maple-tree', 'road'],
  ['maple-tree-base-middle', 'climb'],
  ['maple-tree-middle-crown', 'climb']
].forEach(([connectionId, kind]) => assertActiveConnection(connectionId, kind));

const treeAreaIds = [
  'briarwell-maple-tree-base',
  'briarwell-maple-tree-middle',
  'briarwell-maple-tree-crown'
];
treeAreaIds.forEach((areaId) => {
  const area = areas.get(areaId);
  const map = maps.get(areaId);
  assert(area?.status === 'playable' && area.map, `Ancient-maple screen is not playable: ${areaId}`);
  assert(map?.version === '0.1.0', `Ancient-maple map has the wrong version: ${areaId}`);
  assert(map.art.background.endsWith('.webp'), `Ancient-maple art must use its production WebP: ${areaId}`);
});

const climbContracts = [
  ['briarwell-maple-tree-base', 'climb-to-middle', 30, 'climb-fall-landing'],
  ['briarwell-maple-tree-middle', 'climb-to-crown', 15, 'middle-fall-landing']
];
climbContracts.forEach(([areaId, transitionId, modifier, failureSpawn]) => {
  const climb = transition(areaId, transitionId);
  assert(climb?.activation === 'interact' && climb.status === 'active', `Climb is not an active interaction: ${areaId}`);
  assert(
    climb.check?.type === 'skill'
      && climb.check.skill === 'Climb'
      && climb.check.modifier === modifier
      && climb.check.failureSpawn === failureSpawn,
    `Climb check contract changed: ${areaId}`
  );
});

const crown = maps.get('briarwell-maple-tree-crown');
const finalClimb = crown.interactables.find((feature) => feature.id === 'climb-to-cowl');
const perchDescent = crown.interactables.find((feature) => feature.id === 'descend-from-cowl');
assert(
  finalClimb?.action === 'climb'
    && finalClimb.successSpawn === 'cowl-perch'
    && finalClimb.check?.type === 'skill'
    && finalClimb.check.skill === 'Climb'
    && finalClimb.check.modifier === 0
    && finalClimb.check.failureSpawn === 'crown-fall-landing',
  'The crown must keep its hardest Climb check, fall landing and cowl-perch teleport.'
);
assert(
  crown.spawnPoints['cowl-perch']?.teleportOnly === true
    && perchDescent?.action === 'teleport'
    && perchDescent.successSpawn === 'crown-fall-landing'
    && perchDescent.teleportOnly === true,
  'The isolated cowl perch must have an explicit safe descent.'
);

const walkRuntime = fs.readFileSync(path.join(avendorRoot, 'js/walk-test.js'), 'utf8');
assert(walkRuntime.includes("check.type === 'skill'"), 'The walk runtime does not execute skill checks.');
assert(walkRuntime.includes('AvendorPlayerState?.naturalSkills'), 'Climb checks do not use the hero natural-skill rating.');
assert(walkRuntime.includes('check.failureSpawn'), 'Failed climbs do not use authored fall landings.');
assert(walkRuntime.includes('nearby.successSpawn'), 'Successful local climbs do not use authored teleport landings.');

console.log('Witchwood and three-screen ancient-maple climb checks passed.');
