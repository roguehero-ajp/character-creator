'use strict';

const fs = require('fs');
const path = require('path');

const avendorRoot = path.resolve(__dirname, '..');
const registry = JSON.parse(fs.readFileSync(path.join(avendorRoot, 'data/maps/briarwell-area-registry.json'), 'utf8'));
const areas = new Map(registry.areas.filter((area) => area.status === 'playable').map((area) => [area.id, area]));
const maps = new Map([...areas].map(([id, area]) => [id, JSON.parse(fs.readFileSync(path.join(avendorRoot, area.map), 'utf8'))]));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function transitionsFor(map) {
  return [...(map.exits || []), ...(map.portals || [])];
}

function getTransition(areaId, transitionId) {
  return transitionsFor(maps.get(areaId) || {}).find((transition) => transition.id === transitionId);
}

function oppositeDirection(direction) {
  return ({
    north: 'south', south: 'north', east: 'west', west: 'east',
    northeast: 'southwest', southwest: 'northeast', northwest: 'southeast', southeast: 'northwest'
  })[direction];
}

function assertConnection(connection) {
  assert(connection.endpoints.length === 2, `Connection must have two endpoints: ${connection.id}`);
  const [left, right] = connection.endpoints;
  const leftTransition = getTransition(left.areaId, left.transitionId);
  const rightTransition = getTransition(right.areaId, right.transitionId);
  assert(leftTransition, `Missing connection endpoint transition: ${connection.id}/${left.areaId}/${left.transitionId}`);
  assert(rightTransition, `Missing connection endpoint transition: ${connection.id}/${right.areaId}/${right.transitionId}`);

  if (connection.status === 'active') {
    assert(leftTransition.status === 'active', `Active route has inactive endpoint: ${connection.id}/${left.transitionId}`);
    assert(rightTransition.status === 'active', `Active route has inactive endpoint: ${connection.id}/${right.transitionId}`);
    assert(leftTransition.target?.areaId === right.areaId, `Route target mismatch: ${connection.id}/${left.areaId}`);
    assert(rightTransition.target?.areaId === left.areaId, `Route target mismatch: ${connection.id}/${right.areaId}`);
    assert(leftTransition.target?.returnTransitionId === right.transitionId, `Return transition mismatch: ${connection.id}/${left.areaId}`);
    assert(rightTransition.target?.returnTransitionId === left.transitionId, `Return transition mismatch: ${connection.id}/${right.areaId}`);
    assert(leftTransition.target?.spawnId === rightTransition.fallbackSpawn, `Arrival spawn does not match reciprocal fallback: ${connection.id}/${left.areaId}`);
    assert(rightTransition.target?.spawnId === leftTransition.fallbackSpawn, `Arrival spawn does not match reciprocal fallback: ${connection.id}/${right.areaId}`);
  }

  if (connection.visibility === 'public' && connection.kind === 'road') {
    assert(oppositeDirection(left.direction) === right.direction, `Public road directions are not reciprocal: ${connection.id}`);
    assert(leftTransition.direction === left.direction, `Registry/map direction mismatch: ${connection.id}/${left.areaId}`);
    assert(rightTransition.direction === right.direction, `Registry/map direction mismatch: ${connection.id}/${right.areaId}`);
  }
}

registry.connections.forEach(assertConnection);

registry.cityExits.forEach((cityExit) => {
  const transition = getTransition(cityExit.areaId, cityExit.transitionId);
  assert(transition, `City exit transition is missing: ${cityExit.id}`);
  assert(transition.direction === cityExit.direction, `City exit direction mismatch: ${cityExit.id}`);
  assert(transition.status === cityExit.status, `City exit status mismatch: ${cityExit.id}`);
  assert(transition.target === null, `Unassigned city exit unexpectedly has a map target: ${cityExit.id}`);
});

console.log(`Briarwell route-contract checks passed for ${registry.connections.length} connections and ${registry.cityExits.length} city exits.`);
