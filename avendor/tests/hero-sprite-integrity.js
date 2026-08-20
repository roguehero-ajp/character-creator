'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const FRAME_WIDTH = 128;
const FRAME_HEIGHT = 240;
const DIRECTION_ROWS = 5;
const WALK_COLUMNS = 6;
const ALPHA_THRESHOLD = 16;
const avendorRoot = path.resolve(__dirname, '..');

const atlases = [
  {
    body: 'male',
    state: 'idle',
    columns: 1,
    expectedVisibleHeight: 192,
    file: 'assets/sprites/hero/body/male/idle.png'
  },
  {
    body: 'male',
    state: 'walk',
    columns: WALK_COLUMNS,
    expectedVisibleHeight: 192,
    file: 'assets/sprites/hero/body/male/walk.png'
  },
  {
    body: 'female',
    state: 'idle',
    columns: 1,
    expectedVisibleHeight: 180,
    file: 'assets/sprites/hero/body/female/idle.png'
  },
  {
    body: 'female',
    state: 'walk',
    columns: WALK_COLUMNS,
    expectedVisibleHeight: 180,
    file: 'assets/sprites/hero/body/female/walk.png'
  }
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function paethPredictor(left, above, upperLeft) {
  const prediction = left + above - upperLeft;
  const leftDistance = Math.abs(prediction - left);
  const aboveDistance = Math.abs(prediction - above);
  const upperLeftDistance = Math.abs(prediction - upperLeft);
  if (leftDistance <= aboveDistance && leftDistance <= upperLeftDistance) return left;
  if (aboveDistance <= upperLeftDistance) return above;
  return upperLeft;
}

function decodeRgbaPng(filePath) {
  const png = fs.readFileSync(filePath);
  assert(
    png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
    `${filePath} is not a PNG.`
  );

  let offset = 8;
  let width = 0;
  let height = 0;
  const compressed = [];

  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.toString('ascii', offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;

    if (type === 'IHDR') {
      width = png.readUInt32BE(dataStart);
      height = png.readUInt32BE(dataStart + 4);
      assert(png[dataStart + 8] === 8, `${filePath} must use 8-bit channels.`);
      assert(png[dataStart + 9] === 6, `${filePath} must use RGBA colour.`);
      assert(png[dataStart + 12] === 0, `${filePath} must be non-interlaced.`);
    } else if (type === 'IDAT') {
      compressed.push(png.subarray(dataStart, dataEnd));
    } else if (type === 'IEND') {
      break;
    }

    offset = dataEnd + 4;
  }

  assert(width > 0 && height > 0 && compressed.length > 0, `${filePath} is incomplete.`);
  const inflated = zlib.inflateSync(Buffer.concat(compressed));
  const bytesPerPixel = 4;
  const stride = width * bytesPerPixel;
  const expectedBytes = height * (stride + 1);
  assert(inflated.length === expectedBytes, `${filePath} has unexpected scanline data.`);

  const pixels = Buffer.alloc(width * height * bytesPerPixel);
  let sourceOffset = 0;

  for (let y = 0; y < height; y += 1) {
    const filter = inflated[sourceOffset];
    sourceOffset += 1;
    const rowOffset = y * stride;
    const previousRowOffset = rowOffset - stride;

    for (let x = 0; x < stride; x += 1) {
      const encoded = inflated[sourceOffset + x];
      const left = x >= bytesPerPixel ? pixels[rowOffset + x - bytesPerPixel] : 0;
      const above = y > 0 ? pixels[previousRowOffset + x] : 0;
      const upperLeft = y > 0 && x >= bytesPerPixel
        ? pixels[previousRowOffset + x - bytesPerPixel]
        : 0;
      let predictor = 0;

      if (filter === 1) predictor = left;
      else if (filter === 2) predictor = above;
      else if (filter === 3) predictor = Math.floor((left + above) / 2);
      else if (filter === 4) predictor = paethPredictor(left, above, upperLeft);
      else assert(filter === 0, `${filePath} uses unsupported PNG filter ${filter}.`);

      pixels[rowOffset + x] = (encoded + predictor) & 0xff;
    }

    sourceOffset += stride;
  }

  return { width, height, pixels };
}

function inspectFrame(image, column, row) {
  let minX = FRAME_WIDTH;
  let minY = FRAME_HEIGHT;
  let maxX = -1;
  let maxY = -1;
  let visiblePixels = 0;
  const frameBytes = Buffer.alloc(FRAME_WIDTH * FRAME_HEIGHT * 4);

  for (let y = 0; y < FRAME_HEIGHT; y += 1) {
    for (let x = 0; x < FRAME_WIDTH; x += 1) {
      const sourceX = (column * FRAME_WIDTH) + x;
      const sourceY = (row * FRAME_HEIGHT) + y;
      const sourceIndex = ((sourceY * image.width) + sourceX) * 4;
      const targetIndex = ((y * FRAME_WIDTH) + x) * 4;
      image.pixels.copy(frameBytes, targetIndex, sourceIndex, sourceIndex + 4);

      if (image.pixels[sourceIndex + 3] < ALPHA_THRESHOLD) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      visiblePixels += 1;
    }
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    visiblePixels,
    width: maxX >= minX ? maxX - minX + 1 : 0,
    height: maxY >= minY ? maxY - minY + 1 : 0,
    hash: crypto.createHash('sha256').update(frameBytes).digest('hex')
  };
}

let inspectedFrames = 0;
const bodyHeights = new Map();

atlases.forEach((atlas) => {
  const filePath = path.join(avendorRoot, atlas.file);
  const image = decodeRgbaPng(filePath);
  assert(
    image.width === FRAME_WIDTH * atlas.columns
      && image.height === FRAME_HEIGHT * DIRECTION_ROWS,
    `${atlas.file} must be ${FRAME_WIDTH * atlas.columns}x${FRAME_HEIGHT * DIRECTION_ROWS}.`
  );

  for (let row = 0; row < DIRECTION_ROWS; row += 1) {
    const rowHashes = new Set();

    for (let column = 0; column < atlas.columns; column += 1) {
      const frame = inspectFrame(image, column, row);
      const label = `${atlas.body} ${atlas.state} row ${row} column ${column}`;
      assert(frame.visiblePixels >= 1800, `${label} has too little visible body art.`);
      assert(frame.height === atlas.expectedVisibleHeight, `${label} has the wrong visible height.`);
      assert(frame.width >= 40 && frame.width <= 120, `${label} has an invalid silhouette width.`);
      assert(frame.minX >= 4 && frame.maxX <= 123, `${label} is clipped against a side edge.`);
      assert(frame.minY >= 32, `${label} is clipped against the top edge.`);
      assert(frame.maxY >= 222 && frame.maxY <= 223, `${label} is off the shared foot anchor.`);
      rowHashes.add(frame.hash);
      inspectedFrames += 1;
      bodyHeights.set(atlas.body, frame.height);
    }

    if (atlas.state === 'walk') {
      assert(rowHashes.size >= 4, `${atlas.body} walk row ${row} does not contain a real gait cycle.`);
    }
  }
});

assert(
  bodyHeights.get('male') > bodyHeights.get('female'),
  'The male aesthetic-height refinement was lost.'
);

console.log(`Hero sprite integrity passed (${inspectedFrames} complete frames checked).`);
