'use strict';

const fs = require('fs');
const path = require('path');

const avendorRoot = path.resolve(__dirname, '..');
const map = JSON.parse(fs.readFileSync(
  path.join(avendorRoot, 'data/maps/briarwell-town-center.json'),
  'utf8'
));
const output = process.argv[2] || '/tmp/avendor-town-center-debug.mvg';
const { width, height } = map.referenceSize;

function points(region) {
  return region.points.map((point) => point.join(',')).join(' ');
}

function polygons(regions, className) {
  return regions.map((region) => (
    `<polygon class="${className}" points="${points(region)}"><title>${region.id}</title></polygon>`
  )).join('\n');
}

const anchors = map.npcs.map((anchor) => (
  `<g class="anchor"><circle cx="${anchor.x}" cy="${anchor.y}" r="9"/>`
  + `<text x="${anchor.x + 14}" y="${anchor.y - 10}">${anchor.id}</text></g>`
)).join('\n');

const interactables = map.interactables.map((item) => (
  `<g class="interactable"><circle cx="${item.x}" cy="${item.y}" r="${item.radius}"/>`
  + `<text x="${item.x + 12}" y="${item.y + 5}">${item.id}</text></g>`
)).join('\n');

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <style>
    polygon { stroke-width: 3; }
    .walkable { fill: #2ecc7130; stroke: #68ffa4d9; }
    .collision { fill: #e74c3c44; stroke: #ff6c5ef2; }
    .exit { fill: #3498db55; stroke: #69cdfff2; }
    .portal { fill: #9b59b655; stroke: #e68efff2; }
    .occluder { fill: #fff4c20f; stroke: #ffe27ac7; stroke-dasharray: 14 8; }
    .anchor circle { fill: #ffd166; stroke: #231a08; stroke-width: 3; }
    .anchor text, .interactable text { fill: #fff0b8; stroke: #000; stroke-width: 4; paint-order: stroke; font: 700 18px monospace; }
    .interactable circle { fill: none; stroke: #ffae42; stroke-width: 3; stroke-dasharray: 10 7; }
  </style>
  ${polygons(map.walkable, 'walkable')}
  ${polygons(map.collisions, 'collision')}
  ${polygons(map.exits, 'exit')}
  ${polygons(map.portals, 'portal')}
  ${polygons(map.depthOccluders, 'occluder')}
  ${interactables}
  ${anchors}
</svg>`;

function mvgPolygons(regions, fill, stroke) {
  return [
    `fill '${fill}'`,
    `stroke '${stroke}'`,
    'stroke-width 3',
    ...regions.map((region) => `polygon ${region.points.map((point) => point.join(',')).join(' ')}`)
  ].join('\n');
}

const mvg = [
  `viewbox 0 0 ${width} ${height}`,
  mvgPolygons(map.walkable, 'rgba(46,204,113,0.19)', 'rgba(104,255,164,0.85)'),
  mvgPolygons(map.collisions, 'rgba(231,76,60,0.27)', 'rgba(255,108,94,0.95)'),
  mvgPolygons(map.exits, 'rgba(52,152,219,0.34)', 'rgba(105,205,255,0.95)'),
  mvgPolygons(map.portals, 'rgba(155,89,182,0.34)', 'rgba(230,142,255,0.95)'),
  mvgPolygons(map.depthOccluders, 'rgba(255,244,194,0.06)', 'rgba(255,226,122,0.78)'),
  "fill 'none'",
  "stroke 'rgba(255,174,66,0.95)'",
  'stroke-width 3',
  ...map.interactables.map((item) => `circle ${item.x},${item.y} ${item.x + item.radius},${item.y}`),
  "fill '#ffd166'",
  "stroke '#231a08'",
  'stroke-width 3',
  ...map.npcs.map((anchor) => `circle ${anchor.x},${anchor.y} ${anchor.x + 9},${anchor.y}`)
].join('\n');

fs.writeFileSync(output, path.extname(output).toLowerCase() === '.svg' ? svg : mvg);
console.log(output);
