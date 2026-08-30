import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const outputDirectory = dirname(fileURLToPath(import.meta.url));
const WIDTH = 1448;
const HEIGHT = 1086;

const ART = Object.freeze({
  1: 'sewer-area-01-v1.png',
  2: 'sewer-corner-es-v1.png',
  3: 'sewer-straight-ns-v1.png',
  4: 'sewer-area-04-v1.png',
  5: 'sewer-area-05-v1.png',
  6: 'sewer-straight-ew-v1.png',
  7: 'sewer-area-07-v1.png',
  8: 'sewer-junction-nsw-v1.png',
  9: 'sewer-junction-nsw-v1.png',
  10: 'sewer-junction-new-v1.png',
  11: 'sewer-junction-nsw-v1.png',
  12: 'sewer-junction-ews-v1.png',
  13: 'sewer-corner-es-v1.png',
  14: 'sewer-area-14-v1.png',
  15: 'sewer-area-15-v1.png',
  secret: 'sewer-secret-room-v1.png'
});

const LABELS = Object.freeze({
  north: 'North tunnel',
  east: 'East tunnel',
  south: 'South tunnel',
  west: 'West tunnel'
});

const TRIGGER_POINTS = Object.freeze({
  north: [[568, 220], [880, 220], [914, 348], [534, 348]],
  east: [[1186, 424], [1432, 424], [1432, 812], [1186, 812]],
  south: [[500, 872], [948, 872], [992, 1062], [456, 1062]],
  west: [[16, 424], [262, 424], [262, 812], [16, 812]]
});

const FALLBACK_SPAWN = Object.freeze({
  north: 'from-north',
  east: 'from-east',
  south: 'from-south',
  west: 'from-west'
});

const TARGET_SPAWN = Object.freeze({
  north: 'from-south',
  east: 'from-west',
  south: 'from-north',
  west: 'from-east'
});

const OPPOSITE = Object.freeze({
  north: 'south',
  east: 'west',
  south: 'north',
  west: 'east'
});

const roomLinks = Object.freeze({
  1: { north: 13, east: 10, west: 2 },
  2: { east: 1, south: 3 },
  3: { north: 2, south: 4 },
  4: { north: 3, east: 5 },
  5: { east: 6, west: 4 },
  6: { east: 7, west: 5 },
  7: { north: 8, west: 6 },
  8: { north: 9, south: 7, west: 15 },
  9: { north: 11, south: 8, west: 10 },
  10: { north: 12, east: 9, west: 1 },
  11: { north: 14, south: 9, west: 12 },
  12: { east: 11, south: 10, west: 13 },
  13: { east: 12, south: 1 },
  14: { south: 11 },
  15: { east: 8 }
});

function roomId(number) {
  return `briarwell-sewer-${String(number).padStart(2, '0')}`;
}

function directionExit(direction, targetRoom) {
  return {
    id: `${direction}-tunnel`,
    label: `${LABELS[direction]} to Sewer Area ${targetRoom}`,
    direction,
    status: 'active',
    target: {
      areaId: roomId(targetRoom),
      spawnId: TARGET_SPAWN[direction],
      returnTransitionId: `${OPPOSITE[direction]}-tunnel`
    },
    fallbackSpawn: FALLBACK_SPAWN[direction],
    points: TRIGGER_POINTS[direction]
  };
}

function interactionPortal({ id, label, targetAreaId, targetSpawnId, returnTransitionId, fallbackSpawn, points, interactionTarget, radius, check = null }) {
  const portal = {
    id,
    label,
    status: 'active',
    activation: 'interact',
    target: {
      areaId: targetAreaId,
      spawnId: targetSpawnId,
      returnTransitionId
    },
    fallbackSpawn,
    points,
    interactionTarget,
    radius
  };
  if (check) portal.check = check;
  return portal;
}

function baseSpawns(directions, portals) {
  const allSpawns = {
    default: { x: 724, y: 650, facing: 'north' },
    'from-north': { x: 724, y: 410, facing: 'south' },
    'from-east': { x: 1095, y: 650, facing: 'west' },
    'from-south': { x: 724, y: 800, facing: 'north' },
    'from-west': { x: 353, y: 650, facing: 'east' }
  };
  const needed = new Set([
    'default',
    ...directions.map((direction) => `from-${direction}`),
    ...portals.map((portal) => portal.fallbackSpawn)
  ]);
  return Object.fromEntries(
    Object.entries(allSpawns).filter(([spawnId]) => needed.has(spawnId))
  );
}

function walkableFor(directions) {
  const walkable = [{
    id: 'central-dry-floor',
    points: [[118, 302], [1330, 302], [1390, 418], [1390, 918], [1318, 974], [130, 974], [58, 918], [58, 418]]
  }];
  if (directions.includes('north')) {
    walkable.push({ id: 'north-approach', points: [[538, 180], [910, 180], [940, 430], [508, 430]] });
  }
  if (directions.includes('east')) {
    walkable.push({ id: 'east-approach', points: [[1050, 336], [1446, 336], [1446, 870], [1050, 870]] });
  }
  if (directions.includes('south')) {
    walkable.push({ id: 'south-approach', points: [[438, 742], [1010, 742], [1038, 1084], [410, 1084]] });
  }
  if (directions.includes('west')) {
    walkable.push({ id: 'west-approach', points: [[2, 336], [398, 336], [398, 870], [2, 870]] });
  }
  return walkable;
}

function commonRoom(number, options = {}) {
  const directions = Object.keys(roomLinks[number]);
  const title = `Briarwell Sewers - Area ${number}`;
  const portals = options.portals || [];
  return {
    schemaVersion: 2,
    id: roomId(number),
    title,
    version: '1.0.0',
    sewerAreaNumber: number,
    referenceSize: { width: WIDTH, height: HEIGHT },
    art: {
      background: `assets/maps/briarwell/sewers/background/${ART[number]}`,
      alt: options.alt || `${title}, an underground stone passage with ${directions.join(', ')} routes`
    },
    movement: {
      speedX: 265,
      speedY: 198,
      footRadiusX: 12,
      footRadiusY: 8,
      maxStep: 6,
      resolver: 'smooth-slide'
    },
    perspective: {
      stops: [
        { y: 260, scale: 0.5 },
        { y: 480, scale: 0.64 },
        { y: 720, scale: 0.8 },
        { y: 940, scale: 0.94 }
      ]
    },
    spawnPoints: { ...baseSpawns(directions, portals), ...(options.spawnPoints || {}) },
    walkable: options.walkable || walkableFor(directions),
    collisions: options.collisions || [],
    exits: directions.map((direction) => directionExit(direction, roomLinks[number][direction])),
    portals,
    depthOccluders: options.depthOccluders || [{
      id: 'foreground-masonry',
      depthY: 1000,
      points: [[0, 974], [1448, 974], [1448, 1086], [0, 1086]]
    }],
    interactables: options.interactables || [],
    npcs: []
  };
}

const rooms = [];

rooms.push(commonRoom(1, {
  alt: 'Spring-fed Sewer Area 1 beneath the Town Center well, with a raised clear-water cistern separated from the lower sewer channels',
  spawnPoints: {
    'from-town-center-well': { x: 600, y: 455, facing: 'southeast' }
  },
  collisions: [{
    id: 'raised-clean-water-cistern',
    points: [[0, 0], [620, 0], [654, 286], [610, 382], [532, 442], [0, 442]]
  }],
  portals: [interactionPortal({
    id: 'town-center-well-ladder',
    label: 'Climb to the Town Center well',
    targetAreaId: 'briarwell-town-center',
    targetSpawnId: 'well-return',
    returnTransitionId: 'well-sewer-access',
    fallbackSpawn: 'from-town-center-well',
    points: [[318, 220], [500, 220], [552, 430], [390, 470]],
    interactionTarget: { x: 545, y: 430 },
    radius: 155
  })],
  interactables: [{
    id: 'clean-spring-cistern',
    label: 'Spring-fed well cistern',
    x: 500,
    y: 375,
    radius: 118,
    interactionText: 'Clear spring water fills the raised well cistern. Its overflow falls one-way into the lower sewer channel, safely beyond the masonry divider.'
  }]
}));

rooms.push(commonRoom(2));
rooms.push(commonRoom(3));

rooms.push(commonRoom(4, {
  alt: "Sewer Area 4 with north and east tunnels and a ladder to the alley beside Ainsley's",
  spawnPoints: {
    'from-ainsley-alley': { x: 450, y: 470, facing: 'southeast' }
  },
  portals: [interactionPortal({
    id: 'ainsley-alley-ladder',
    label: "Climb to the alley beside Ainsley's",
    targetAreaId: 'briarwell-ainsley-church',
    targetSpawnId: 'grate-return',
    returnTransitionId: 'sewer-grate',
    fallbackSpawn: 'from-ainsley-alley',
    points: [[118, 120], [430, 120], [480, 470], [180, 500]],
    interactionTarget: { x: 440, y: 440 },
    radius: 165
  })]
}));

rooms.push(commonRoom(5, {
  alt: 'Sewer Area 5, an east-west passage with subtly mismatched dwarven masonry along the south wall',
  portals: [interactionPortal({
    id: 'hidden-dwarven-door',
    label: 'Unusual southern masonry',
    targetAreaId: 'briarwell-sewer-secret',
    targetSpawnId: 'from-north',
    returnTransitionId: 'north-passage',
    fallbackSpawn: 'from-south',
    points: [[590, 820], [858, 820], [902, 1030], [546, 1030]],
    interactionTarget: { x: 724, y: 825 },
    radius: 155,
    check: {
      type: 'stat',
      stat: 'perception',
      target: 12,
      discoveryId: 'briarwell-sewer-dwarven-door',
      successText: 'A hairline seam resolves into a dwarven door. The ancient lock releases with a stone sigh.',
      failureText: 'The blocks are unusually precise, but their pattern refuses to reveal itself.'
    }
  })]
}));

rooms.push(commonRoom(6));

rooms.push(commonRoom(7, {
  alt: 'Sewer Area 7 with north and west tunnels and a stone stair and ladder rising to the docks',
  spawnPoints: {
    'from-docks': { x: 724, y: 800, facing: 'north' }
  },
  portals: [interactionPortal({
    id: 'docks-ladder',
    label: 'Climb to the Briarwell docks',
    targetAreaId: 'briarwell-docks',
    targetSpawnId: 'sewer-return',
    returnTransitionId: 'sewer-access',
    fallbackSpawn: 'from-docks',
    points: [[520, 770], [928, 770], [982, 1080], [466, 1080]],
    interactionTarget: { x: 724, y: 820 },
    radius: 180
  })]
}));

rooms.push(commonRoom(8));
rooms.push(commonRoom(9));
rooms.push(commonRoom(10));
rooms.push(commonRoom(11));
rooms.push(commonRoom(12));
rooms.push(commonRoom(13));

rooms.push(commonRoom(14, {
  alt: "Sewer Area 14 with a south tunnel and natural cave ladder rising near Ms. Blight's property",
  spawnPoints: {
    'from-blight-cave': { x: 724, y: 455, facing: 'south' }
  },
  portals: [interactionPortal({
    id: 'blight-cave-ladder',
    label: "Climb through the cave near Ms. Blight's",
    targetAreaId: 'briarwell-blight-orphanage',
    targetSpawnId: 'cave-return',
    returnTransitionId: 'sewer-cave',
    fallbackSpawn: 'from-blight-cave',
    points: [[542, 94], [906, 94], [944, 430], [504, 430]],
    interactionTarget: { x: 724, y: 430 },
    radius: 175
  })]
}));

rooms.push(commonRoom(15, {
  alt: 'Sewer Area 15, a dead-end kobold lair occupied by ordinary kobolds, a robed wizard and an armoured champion',
  collisions: [{
    id: 'kobold-war-party',
    points: [[84, 80], [1364, 80], [1364, 566], [1010, 610], [438, 610], [84, 566]]
  }],
  interactables: [{
    id: 'kobold-war-party',
    label: 'Kobold war party',
    x: 724,
    y: 590,
    radius: 270,
    state: 'combat-encounter',
    interactionText: 'Ten kobolds hold the lair ahead. A robed wizard and heavily armoured champion stand among them; approaching farther will require combat.'
  }]
}));

const secret = {
  schemaVersion: 2,
  id: 'briarwell-sewer-secret',
  title: 'Briarwell Sewers - Ancient Dwarven Chamber',
  version: '1.0.0',
  sewerAreaNumber: null,
  referenceSize: { width: WIDTH, height: HEIGHT },
  art: {
    background: `assets/maps/briarwell/sewers/background/${ART.secret}`,
    alt: 'Ancient dwarven chamber containing a wall-mounted two-handed battle axe and a closed iron-banded treasure chest'
  },
  movement: {
    speedX: 265,
    speedY: 198,
    footRadiusX: 12,
    footRadiusY: 8,
    maxStep: 6,
    resolver: 'smooth-slide'
  },
  perspective: {
    stops: [
      { y: 260, scale: 0.5 },
      { y: 480, scale: 0.64 },
      { y: 720, scale: 0.8 },
      { y: 940, scale: 0.94 }
    ]
  },
  spawnPoints: {
    default: { x: 724, y: 700, facing: 'north' },
    'from-north': { x: 850, y: 420, facing: 'south' }
  },
  walkable: [{
    id: 'dwarven-chamber-floor',
    points: [[126, 286], [1322, 286], [1390, 910], [1280, 978], [168, 978], [58, 910]]
  }, {
    id: 'north-passage-approach',
    points: [[720, 180], [1070, 180], [1110, 480], [680, 480]]
  }],
  collisions: [{
    id: 'treasure-chest-plinth',
    points: [[54, 642], [430, 642], [468, 956], [40, 956]]
  }, {
    id: 'battle-axe-plinth',
    points: [[330, 50], [690, 50], [710, 330], [310, 330]]
  }],
  exits: [{
    id: 'north-passage',
    label: 'Hidden passage to Sewer Area 5',
    direction: 'north',
    status: 'active',
    target: {
      areaId: roomId(5),
      spawnId: 'from-south',
      returnTransitionId: 'hidden-dwarven-door'
    },
    fallbackSpawn: 'from-north',
    points: [[720, 180], [1070, 180], [1088, 340], [702, 340]]
  }],
  portals: [],
  depthOccluders: [{
    id: 'foreground-dwarven-masonry',
    depthY: 1000,
    points: [[0, 974], [1448, 974], [1448, 1086], [0, 1086]]
  }],
  interactables: [{
    id: 'ancient-two-handed-battle-axe',
    label: 'Ancient two-handed battle axe',
    x: 515,
    y: 365,
    radius: 150,
    state: 'treasure-unclaimed',
    interactionText: 'A formidable two-handed battle axe rests in a carved dwarven mount. It can be claimed when the inventory system is active.'
  }, {
    id: 'dwarven-treasure-chest',
    label: 'Iron-banded dwarven treasure chest',
    x: 410,
    y: 760,
    radius: 165,
    state: 'treasure-unclaimed',
    interactionText: 'The chest holds chainmail armour, 350 silver and 20 gold, preserved for the future inventory system.'
  }],
  npcs: []
};

rooms.forEach((room) => {
  const name = `briarwell-sewer-${String(room.sewerAreaNumber).padStart(2, '0')}.json`;
  writeFileSync(join(outputDirectory, name), `${JSON.stringify(room, null, 2)}\n`);
});
writeFileSync(
  join(outputDirectory, 'briarwell-sewer-secret.json'),
  `${JSON.stringify(secret, null, 2)}\n`
);

console.log(`Wrote ${rooms.length + 1} Briarwell sewer map files.`);
