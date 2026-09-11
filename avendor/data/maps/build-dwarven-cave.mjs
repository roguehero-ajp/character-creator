import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const outputDirectory = path.dirname(fileURLToPath(import.meta.url));
const artRoot = 'assets/maps/briarwell/mountains/dwarven-cave/interior/background';

const STANDARD_SIZE = Object.freeze({ width: 1448, height: 1086 });
const STANDARD_MOVEMENT = Object.freeze({
  speedX: 270,
  speedY: 202,
  footRadius: 12,
  maxStep: 6,
  resolver: 'smooth-slide'
});
const STANDARD_PERSPECTIVE = Object.freeze({
  stops: [
    { y: 180, scale: 0.44 },
    { y: 420, scale: 0.58 },
    { y: 680, scale: 0.76 },
    { y: 980, scale: 1 }
  ]
});

const baseFloor = Object.freeze({
  id: 'central-floor',
  points: [
    [150, 300], [1298, 300], [1360, 410], [1360, 700],
    [1160, 860], [288, 860], [88, 700], [88, 410]
  ]
});

const directionGeometry = Object.freeze({
  west: {
    spawn: { x: 170, y: 515, facing: 'east' },
    walkable: { id: 'west-approach', points: [[0, 330], [430, 330], [430, 690], [0, 690]] },
    trigger: [[0, 375], [105, 375], [105, 650], [0, 650]]
  },
  east: {
    spawn: { x: 1278, y: 515, facing: 'west' },
    walkable: { id: 'east-approach', points: [[1018, 330], [1448, 330], [1448, 690], [1018, 690]] },
    trigger: [[1343, 375], [1448, 375], [1448, 650], [1343, 650]]
  },
  north: {
    spawn: { x: 724, y: 235, facing: 'south' },
    walkable: { id: 'north-approach', points: [[545, 0], [903, 0], [965, 430], [483, 430]] },
    trigger: [[610, 0], [838, 0], [838, 135], [610, 135]]
  },
  south: {
    spawn: { x: 724, y: 825, facing: 'north' },
    walkable: { id: 'south-approach', points: [[483, 700], [965, 700], [903, 1086], [545, 1086]] },
    trigger: [[590, 955], [858, 955], [858, 1086], [590, 1086]]
  },
  southeast: {
    spawn: { x: 1160, y: 710, facing: 'northwest' },
    walkable: { id: 'southeast-approach', points: [[900, 520], [1448, 520], [1448, 940], [1080, 870]] },
    trigger: [[1300, 600], [1448, 550], [1448, 900], [1320, 850]]
  }
});

function passageId(direction) {
  return `${direction}-passage`;
}

function createTransition(link) {
  const geometry = directionGeometry[link.direction];
  const transition = {
    id: link.id || passageId(link.direction),
    label: link.label,
    direction: link.direction,
    status: 'active',
    target: {
      areaId: link.targetAreaId,
      spawnId: link.targetSpawnId,
      returnTransitionId: link.returnTransitionId
    },
    fallbackSpawn: link.fallbackSpawn || `from-${link.direction}`,
    points: link.points || geometry.trigger
  };

  if (link.activation) {
    transition.activation = link.activation;
    transition.interactionTarget = link.interactionTarget;
    transition.radius = link.radius;
  }
  if (link.check) transition.check = link.check;
  return transition;
}

function standardMap(specification) {
  const directions = [...new Set(
    specification.links
      .filter((link) => link.walkable !== false)
      .map((link) => link.direction)
  )];
  const spawnPoints = {
    default: specification.defaultSpawn || directionGeometry[directions[0]].spawn,
    ...Object.fromEntries(directions.map((direction) => [
      `from-${direction}`,
      directionGeometry[direction].spawn
    ])),
    ...(specification.extraSpawns || {})
  };
  const exits = specification.links
    .filter((link) => !link.activation)
    .map(createTransition);
  const portals = specification.links
    .filter((link) => link.activation)
    .map(createTransition);

  return {
    schemaVersion: 2,
    id: specification.id,
    title: specification.title,
    version: '0.1.0',
    referenceSize: STANDARD_SIZE,
    art: {
      background: `${artRoot}/${specification.art}`,
      alt: specification.alt
    },
    movement: STANDARD_MOVEMENT,
    perspective: STANDARD_PERSPECTIVE,
    spawnPoints,
    walkable: [baseFloor, ...directions.map((direction) => directionGeometry[direction].walkable)],
    collisions: [],
    exits,
    portals,
    depthOccluders: [],
    interactables: specification.interactables || [],
    npcs: [],
    ...(specification.extraData || {})
  };
}

const areas = [
  standardMap({
    id: 'briarwell-dwarven-cave-c01',
    title: 'Dwarven Cave - C1',
    art: 'briarwell-dwarven-cave-c01-v1.webp',
    alt: 'The first frost-dusted dwarven hall branches east and south from the mountain forecourt',
    links: [
      { direction: 'west', label: 'West passage to the Dwarven Cave forecourt', targetAreaId: 'briarwell-mountain-dwarven-cave', targetSpawnId: 'from-interior', returnTransitionId: 'dwarven-cave-descent' },
      { direction: 'east', label: 'East passage to Dwarven Cave C2', targetAreaId: 'briarwell-dwarven-cave-c02', targetSpawnId: 'from-west', returnTransitionId: 'west-passage' },
      { direction: 'south', label: 'South passage to Dwarven Cave C3', targetAreaId: 'briarwell-dwarven-cave-c03', targetSpawnId: 'from-north', returnTransitionId: 'north-passage' }
    ]
  }),
  standardMap({
    id: 'briarwell-dwarven-cave-c02',
    title: 'Dwarven Cave - C2',
    art: 'briarwell-dwarven-cave-c02-v1.webp',
    alt: 'A cracked dwarven compass marks passages west, east and south',
    links: [
      { direction: 'west', label: 'West passage to Dwarven Cave C1', targetAreaId: 'briarwell-dwarven-cave-c01', targetSpawnId: 'from-east', returnTransitionId: 'east-passage' },
      { direction: 'east', label: 'East passage to Dwarven Cave C4', targetAreaId: 'briarwell-dwarven-cave-c04', targetSpawnId: 'from-west', returnTransitionId: 'west-passage' },
      { direction: 'south', label: 'South passage to Dwarven Cave C10', targetAreaId: 'briarwell-dwarven-cave-c10', targetSpawnId: 'from-north', returnTransitionId: 'north-passage' }
    ]
  }),
  standardMap({
    id: 'briarwell-dwarven-cave-c03',
    title: 'Dwarven Cave - C3',
    art: 'briarwell-dwarven-cave-c03-v1.webp',
    alt: 'A tall dwarven descent hall continues north and south through the mountain',
    links: [
      { direction: 'north', label: 'North passage to Dwarven Cave C1', targetAreaId: 'briarwell-dwarven-cave-c01', targetSpawnId: 'from-south', returnTransitionId: 'south-passage' },
      { direction: 'south', label: 'South passage to Dwarven Cave C13', targetAreaId: 'briarwell-dwarven-cave-c13', targetSpawnId: 'from-north', returnTransitionId: 'north-passage' }
    ]
  }),
  standardMap({
    id: 'briarwell-dwarven-cave-c04',
    title: 'Dwarven Cave - C4',
    art: 'briarwell-dwarven-cave-c04-v1.webp',
    alt: 'A monumental dwarven pillar junction opens west, east and north',
    links: [
      { direction: 'west', label: 'West passage to Dwarven Cave C2', targetAreaId: 'briarwell-dwarven-cave-c02', targetSpawnId: 'from-east', returnTransitionId: 'east-passage' },
      { direction: 'east', label: 'East passage to Dwarven Cave C7', targetAreaId: 'briarwell-dwarven-cave-c07', targetSpawnId: 'from-west', returnTransitionId: 'west-passage' },
      { direction: 'north', label: 'North passage to Dwarven Cave C5', targetAreaId: 'briarwell-dwarven-cave-c05', targetSpawnId: 'from-south', returnTransitionId: 'south-passage' }
    ]
  }),
  standardMap({
    id: 'briarwell-dwarven-cave-c05',
    title: 'Dwarven Cave - C5',
    art: 'briarwell-dwarven-cave-c05-v1.webp',
    alt: 'An upper dwarven gallery surrounds a dry basin between south and east passages',
    links: [
      { direction: 'south', label: 'South passage to Dwarven Cave C4', targetAreaId: 'briarwell-dwarven-cave-c04', targetSpawnId: 'from-north', returnTransitionId: 'north-passage' },
      { direction: 'east', label: 'East passage to Dwarven Cave C6', targetAreaId: 'briarwell-dwarven-cave-c06', targetSpawnId: 'from-west', returnTransitionId: 'west-passage' }
    ]
  }),
  standardMap({
    id: 'briarwell-dwarven-cave-c06',
    title: 'Dwarven Cave - C6',
    art: 'briarwell-dwarven-cave-c06-v1.webp',
    alt: 'A dwarven mechanism hall has visible passages west and south and a seemingly solid carved east wall',
    extraSpawns: {
      'from-secret': { x: 1165, y: 505, facing: 'west' }
    },
    links: [
      { direction: 'west', label: 'West passage to Dwarven Cave C5', targetAreaId: 'briarwell-dwarven-cave-c05', targetSpawnId: 'from-east', returnTransitionId: 'east-passage' },
      { direction: 'south', label: 'South passage to Dwarven Cave C7', targetAreaId: 'briarwell-dwarven-cave-c07', targetSpawnId: 'from-north', returnTransitionId: 'north-passage' },
      {
        id: 'secret-door',
        direction: 'east',
        label: 'Concealed dwarven mechanism',
        targetAreaId: 'briarwell-dwarven-cave-secret',
        targetSpawnId: 'from-west',
        returnTransitionId: 'west-passage',
        fallbackSpawn: 'from-secret',
        activation: 'interact',
        points: [[1190, 270], [1415, 270], [1415, 620], [1190, 620]],
        interactionTarget: { x: 1270, y: 430 },
        radius: 155,
        walkable: false,
        check: {
          type: 'skill',
          skill: 'Search',
          divisor: 2,
          die: 100,
          discoveryId: 'briarwell-dwarven-cave-c06-secret-door',
          successText: 'A nearly invisible diamond pivots beneath your fingers. Stone grinds aside, revealing a secret dwarven door.',
          failureText: 'The east wall is exquisitely fitted. Whatever opens it remains hidden.'
        }
      }
    ]
  }),
  standardMap({
    id: 'briarwell-dwarven-cave-c07',
    title: 'Dwarven Cave - C7',
    art: 'briarwell-dwarven-cave-c07-v1.webp',
    alt: 'A deep dwarven junction circles an octagonal floor seal with passages west, north and south',
    links: [
      { direction: 'west', label: 'West passage to Dwarven Cave C4', targetAreaId: 'briarwell-dwarven-cave-c04', targetSpawnId: 'from-east', returnTransitionId: 'east-passage' },
      { direction: 'north', label: 'North passage to Dwarven Cave C6', targetAreaId: 'briarwell-dwarven-cave-c06', targetSpawnId: 'from-south', returnTransitionId: 'south-passage' },
      { direction: 'south', label: 'South passage to Dwarven Cave C8', targetAreaId: 'briarwell-dwarven-cave-c08', targetSpawnId: 'from-north', returnTransitionId: 'north-passage' }
    ]
  }),
  standardMap({
    id: 'briarwell-dwarven-cave-c08',
    title: 'Dwarven Cave - C8',
    art: 'briarwell-dwarven-cave-c08-v1.webp',
    alt: 'A worn dwarven gallery runs north and south past old braziers',
    links: [
      { direction: 'north', label: 'North passage to Dwarven Cave C7', targetAreaId: 'briarwell-dwarven-cave-c07', targetSpawnId: 'from-south', returnTransitionId: 'south-passage' },
      { direction: 'south', label: 'South passage to Dwarven Cave C9', targetAreaId: 'briarwell-dwarven-cave-c09', targetSpawnId: 'from-north', returnTransitionId: 'north-passage' }
    ]
  }),
  standardMap({
    id: 'briarwell-dwarven-cave-c09',
    title: 'Dwarven Cave - C9',
    art: 'briarwell-dwarven-cave-c09-v1.webp',
    alt: 'A dwarven junction opens north and west while cold daylight pours through a southeast cliffside arch',
    extraSpawns: {
      'from-cliffside': { x: 1135, y: 675, facing: 'northwest' }
    },
    links: [
      { direction: 'north', label: 'North passage to Dwarven Cave C8', targetAreaId: 'briarwell-dwarven-cave-c08', targetSpawnId: 'from-south', returnTransitionId: 'south-passage' },
      { direction: 'west', label: 'West passage to Dwarven Cave C12', targetAreaId: 'briarwell-dwarven-cave-c12', targetSpawnId: 'from-east', returnTransitionId: 'east-passage' },
      { direction: 'southeast', label: 'Southeast opening to the Dwarven Cliffside', targetAreaId: 'briarwell-dwarven-cave-cliffside', targetSpawnId: 'from-cave', returnTransitionId: 'northwest-passage', fallbackSpawn: 'from-cliffside' }
    ]
  }),
  standardMap({
    id: 'briarwell-dwarven-cave-c10',
    title: 'Dwarven Cave - C10',
    art: 'briarwell-dwarven-cave-c10-v1.webp',
    alt: 'A north-south dwarven hall bears the first crude traces of goblin occupation',
    links: [
      { direction: 'north', label: 'North passage to Dwarven Cave C2', targetAreaId: 'briarwell-dwarven-cave-c02', targetSpawnId: 'from-south', returnTransitionId: 'south-passage' },
      { direction: 'south', label: 'South passage to Dwarven Cave C11', targetAreaId: 'briarwell-dwarven-cave-c11', targetSpawnId: 'from-north', returnTransitionId: 'north-passage' }
    ]
  }),
  standardMap({
    id: 'briarwell-dwarven-cave-c11',
    title: 'Dwarven Cave - C11',
    art: 'briarwell-dwarven-cave-c11-v1.webp',
    alt: 'A deep dwarven corner hall turns from north to east beneath crude lashings',
    links: [
      { direction: 'north', label: 'North passage to Dwarven Cave C10', targetAreaId: 'briarwell-dwarven-cave-c10', targetSpawnId: 'from-south', returnTransitionId: 'south-passage' },
      { direction: 'east', label: 'East passage to Dwarven Cave C12', targetAreaId: 'briarwell-dwarven-cave-c12', targetSpawnId: 'from-west', returnTransitionId: 'west-passage' }
    ]
  }),
  standardMap({
    id: 'briarwell-dwarven-cave-c12',
    title: 'Dwarven Cave - C12',
    art: 'briarwell-dwarven-cave-c12-v1.webp',
    alt: 'A battered east-west dwarven connector gallery shows signs of frequent goblin traffic',
    links: [
      { direction: 'west', label: 'West passage to Dwarven Cave C11', targetAreaId: 'briarwell-dwarven-cave-c11', targetSpawnId: 'from-east', returnTransitionId: 'east-passage' },
      { direction: 'east', label: 'East passage to Dwarven Cave C9', targetAreaId: 'briarwell-dwarven-cave-c09', targetSpawnId: 'from-west', returnTransitionId: 'west-passage' }
    ]
  }),
  standardMap({
    id: 'briarwell-dwarven-cave-c13',
    title: 'Dwarven Cave - C13',
    art: 'briarwell-dwarven-cave-c13-v1.webp',
    alt: 'A dwarven corner chamber runs north and west toward increasingly warm goblin firelight',
    links: [
      { direction: 'north', label: 'North passage to Dwarven Cave C3', targetAreaId: 'briarwell-dwarven-cave-c03', targetSpawnId: 'from-south', returnTransitionId: 'south-passage' },
      { direction: 'west', label: 'West passage to Dwarven Cave C14', targetAreaId: 'briarwell-dwarven-cave-c14', targetSpawnId: 'from-east', returnTransitionId: 'east-passage' }
    ]
  }),
  standardMap({
    id: 'briarwell-dwarven-cave-c14',
    title: 'Dwarven Cave - C14',
    art: 'briarwell-dwarven-cave-c14-v1.webp',
    alt: 'A goblin-used corner chamber connects east and south through ancient dwarven stone',
    links: [
      { direction: 'east', label: 'East passage to Dwarven Cave C13', targetAreaId: 'briarwell-dwarven-cave-c13', targetSpawnId: 'from-west', returnTransitionId: 'west-passage' },
      { direction: 'south', label: 'South passage to Dwarven Cave C15', targetAreaId: 'briarwell-dwarven-cave-c15', targetSpawnId: 'from-north', returnTransitionId: 'north-passage' }
    ]
  }),
  standardMap({
    id: 'briarwell-dwarven-cave-c15',
    title: 'Dwarven Cave - C15',
    art: 'briarwell-dwarven-cave-c15-v1.webp',
    alt: 'A smoky dwarven guard hall now serves as the north-to-east approach to a goblin lair',
    links: [
      { direction: 'north', label: 'North passage to Dwarven Cave C14', targetAreaId: 'briarwell-dwarven-cave-c14', targetSpawnId: 'from-south', returnTransitionId: 'south-passage' },
      { direction: 'east', label: 'East passage to Dwarven Cave C16', targetAreaId: 'briarwell-dwarven-cave-c16', targetSpawnId: 'from-west', returnTransitionId: 'west-passage' }
    ]
  }),
  standardMap({
    id: 'briarwell-dwarven-cave-c16',
    title: 'Dwarven Cave - C16',
    art: 'briarwell-dwarven-cave-c16-v1.webp',
    alt: 'A fortified east-west dwarven antechamber stands immediately before the goblin battle chamber',
    links: [
      { direction: 'west', label: 'West passage to Dwarven Cave C15', targetAreaId: 'briarwell-dwarven-cave-c15', targetSpawnId: 'from-east', returnTransitionId: 'east-passage' },
      { direction: 'east', label: 'East passage to the Goblin Battle Chamber', targetAreaId: 'briarwell-dwarven-cave-battle-chamber', targetSpawnId: 'from-west', returnTransitionId: 'west-passage' }
    ]
  }),
  standardMap({
    id: 'briarwell-dwarven-cave-secret',
    title: 'Dwarven Cave - Secret Armoury',
    art: 'briarwell-dwarven-cave-secret-v1.webp',
    alt: 'A preserved dwarven armoury holds a closed chest, plate mail, a two-handed sword and a mace',
    links: [
      { direction: 'west', label: 'Hidden west door to Dwarven Cave C6', targetAreaId: 'briarwell-dwarven-cave-c06', targetSpawnId: 'from-secret', returnTransitionId: 'secret-door' }
    ],
    interactables: [
      {
        id: 'dwarven-treasure-chest',
        label: 'Iron-banded dwarven chest',
        x: 485,
        y: 430,
        radius: 125,
        action: 'roll-dwarven-treasure',
        loot: {
          once: true,
          silver: { minimum: 1, maximum: 100 },
          gold: { minimum: 1, maximum: 100 }
        },
        interactionText: 'The sealed chest is deep enough to hold a substantial cache of coin.'
      },
      {
        id: 'dwarven-plate-mail',
        label: 'Dwarven plate mail',
        x: 790,
        y: 430,
        radius: 125,
        item: { id: 'dwarven-plate-mail', type: 'armour', quantity: 1 },
        interactionText: 'A complete suit of plate mail rests on a stout dwarven armour rack, ready for a future inventory handoff.'
      },
      {
        id: 'dwarven-two-handed-sword',
        label: 'Dwarven two-handed sword',
        x: 1080,
        y: 475,
        radius: 120,
        item: { id: 'dwarven-two-handed-sword', type: 'weapon', quantity: 1 },
        interactionText: 'A massive two-handed sword leans against the wall, its edge still carefully protected.'
      },
      {
        id: 'dwarven-mace',
        label: 'Dwarven mace',
        x: 1270,
        y: 420,
        radius: 115,
        item: { id: 'dwarven-mace', type: 'weapon', quantity: 1 },
        interactionText: 'A heavy dwarven mace rests horizontally in its fitted wall rack.'
      }
    ],
    extraData: {
      treasureStatus: 'inventory-handoff-pending'
    }
  })
];

areas.push({
  schemaVersion: 2,
  id: 'briarwell-dwarven-cave-battle-chamber',
  title: 'Dwarven Cave - Goblin Battle Chamber',
  version: '0.1.0',
  referenceSize: { width: 3072, height: 1024 },
  art: {
    background: `${artRoot}/briarwell-dwarven-cave-battle-chamber-v1.webp`,
    alt: 'An immense torchlit dwarven great hall has become a fortified goblin battle chamber'
  },
  movement: { ...STANDARD_MOVEMENT, speedX: 275, speedY: 205 },
  perspective: {
    stops: [
      { y: 230, scale: 0.5 },
      { y: 430, scale: 0.64 },
      { y: 650, scale: 0.8 },
      { y: 900, scale: 1 }
    ]
  },
  spawnPoints: {
    default: { x: 180, y: 570, facing: 'east' },
    'from-west': { x: 180, y: 570, facing: 'east' }
  },
  walkable: [{
    id: 'great-hall-floor',
    points: [[0, 285], [3072, 285], [3072, 805], [2780, 830], [300, 830], [0, 805]]
  }],
  collisions: [],
  exits: [{
    id: 'west-passage',
    label: 'West passage to Dwarven Cave C16',
    direction: 'west',
    status: 'active',
    target: {
      areaId: 'briarwell-dwarven-cave-c16',
      spawnId: 'from-east',
      returnTransitionId: 'east-passage'
    },
    fallbackSpawn: 'from-west',
    points: [[0, 390], [100, 390], [100, 700], [0, 700]]
  }],
  portals: [],
  depthOccluders: [],
  interactables: [{
    id: 'goblin-chieftain-dais',
    label: 'Goblin chieftain command dais',
    x: 2860,
    y: 420,
    radius: 170,
    interactionText: 'The ancient dwarven dais has been draped in hides and claimed by the hobgoblin chieftain.'
  }],
  npcs: [],
  goblinEncounter: {
    id: 'dwarven-cave-goblin-force',
    status: 'scaffold',
    combatStatus: 'pending',
    actors: [
      { id: 'goblin-01', variant: 'goblin', spriteStatus: 'placeholder', x: 1480, y: 535, scale: 0.82 },
      { id: 'goblin-02', variant: 'goblin', spriteStatus: 'placeholder', x: 1640, y: 655, scale: 0.86 },
      { id: 'goblin-03', variant: 'goblin', spriteStatus: 'placeholder', x: 1810, y: 515, scale: 0.84 },
      { id: 'goblin-04', variant: 'goblin', spriteStatus: 'placeholder', x: 1980, y: 660, scale: 0.9 },
      { id: 'goblin-05', variant: 'goblin', spriteStatus: 'placeholder', x: 2150, y: 535, scale: 0.88 },
      { id: 'hobgoblin-01', variant: 'hobgoblin', spriteStatus: 'placeholder', x: 2380, y: 630, scale: 1.05 },
      { id: 'hobgoblin-02', variant: 'hobgoblin', spriteStatus: 'placeholder', x: 2550, y: 510, scale: 1.08 },
      { id: 'hobgoblin-chieftain', variant: 'chieftain', spriteStatus: 'placeholder', x: 2810, y: 520, scale: 1.24 }
    ]
  }
});

areas.push({
  schemaVersion: 2,
  id: 'briarwell-dwarven-cave-cliffside',
  title: 'Dwarven Cave - Cliffside Overlook',
  version: '0.1.0',
  referenceSize: STANDARD_SIZE,
  art: {
    background: `${artRoot}/briarwell-dwarven-cave-cliffside-v1.webp`,
    alt: 'A broad snowy shelf outside an ancient dwarven arch overlooks the mountains above Briarwell'
  },
  movement: { ...STANDARD_MOVEMENT, speedX: 275, speedY: 205 },
  perspective: STANDARD_PERSPECTIVE,
  spawnPoints: {
    default: { x: 360, y: 430, facing: 'southeast' },
    'from-cave': { x: 360, y: 430, facing: 'southeast' }
  },
  walkable: [{
    id: 'cliffside-shelf',
    points: [[125, 270], [430, 260], [720, 300], [1020, 340], [1260, 390], [1370, 480], [1320, 650], [1120, 735], [810, 720], [500, 670], [250, 590], [110, 455]]
  }],
  collisions: [],
  exits: [],
  portals: [{
    id: 'northwest-passage',
    label: 'Northwest arch to Dwarven Cave C9',
    direction: 'northwest',
    status: 'active',
    activation: 'auto',
    target: {
      areaId: 'briarwell-dwarven-cave-c09',
      spawnId: 'from-cliffside',
      returnTransitionId: 'southeast-passage'
    },
    fallbackSpawn: 'from-cave',
    points: [[125, 260], [305, 250], [335, 370], [180, 430]]
  }],
  depthOccluders: [],
  interactables: [],
  npcs: [],
  scenicView: {
    id: 'briarwell-from-dwarven-cliff',
    trigger: {
      type: 'enter-polygon',
      points: [[1010, 390], [1340, 420], [1340, 650], [1040, 690]]
    },
    image: `${artRoot}/briarwell-dwarven-cave-cliffside-vista-v1.webp`,
    imageSize: { width: 2048, height: 1152 },
    alt: 'A majestic winter panorama from the mountain cliff shows Briarwell on the left beside a broad lake with exactly two islands',
    caption: 'Briarwell rests far below, beyond the mountain mist.'
  }
});

for (const area of areas) {
  const filename = `${area.id}.json`;
  await writeFile(path.join(outputDirectory, filename), `${JSON.stringify(area, null, 2)}\n`);
}

console.log(`Wrote ${areas.length} Dwarven Cave maps.`);
