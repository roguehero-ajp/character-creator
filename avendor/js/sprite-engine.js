(() => {
  'use strict';

  const FRAME_W = 128;
  const FRAME_H = 240;
  const DIRECTION_ROWS = 5;
  const WALK_FRAMES = 6;
  const WALK_FRAME_MS = 96;
  const RIG_VERSION = '0.4.0';
  const ART_VERSION = '0.4.3';

  const ROW = Object.freeze({
    south: 0,
    southeast: 1,
    east: 2,
    northeast: 3,
    north: 4
  });

  const MIRROR_TO = Object.freeze({
    southwest: 'southeast',
    west: 'east',
    northwest: 'northeast'
  });

  const BODY_LAYERS = Object.freeze({
    male: [
      {
        id: 'body',
        idle: 'assets/sprites/hero/body/male/idle.png',
        walk: 'assets/sprites/hero/body/male/walk.png',
        coverage: 'full-body'
      }
    ],
    female: [
      {
        id: 'body',
        idle: 'assets/sprites/hero/body/female/idle.png',
        walk: 'assets/sprites/hero/body/female/walk.png',
        coverage: 'full-body'
      }
    ]
  });

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Could not load sprite atlas: ${src}`));
      img.src = src;
    });
  }

  function validateAtlasShape(image, src, columns) {
    const expectedWidth = FRAME_W * columns;
    const expectedHeight = FRAME_H * DIRECTION_ROWS;
    if (image.naturalWidth !== expectedWidth || image.naturalHeight !== expectedHeight) {
      throw new Error(
        `Sprite atlas has the wrong dimensions: ${src} `
        + `(expected ${expectedWidth}x${expectedHeight}, got ${image.naturalWidth}x${image.naturalHeight})`
      );
    }
  }

  function validateFullBodyFrames(image, src, columns) {
    const canvas = document.createElement('canvas');
    canvas.width = FRAME_W;
    canvas.height = FRAME_H;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.imageSmoothingEnabled = false;

    for (let row = 0; row < DIRECTION_ROWS; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        ctx.clearRect(0, 0, FRAME_W, FRAME_H);
        ctx.drawImage(
          image,
          column * FRAME_W, row * FRAME_H, FRAME_W, FRAME_H,
          0, 0, FRAME_W, FRAME_H
        );

        const pixels = ctx.getImageData(0, 0, FRAME_W, FRAME_H).data;
        let minY = FRAME_H;
        let maxY = -1;
        let visiblePixels = 0;

        for (let index = 3; index < pixels.length; index += 4) {
          if (pixels[index] < 16) continue;
          const y = Math.floor((index >> 2) / FRAME_W);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
          visiblePixels += 1;
        }

        const visibleHeight = maxY >= minY ? maxY - minY + 1 : 0;
        if (visiblePixels < 1200 || visibleHeight < 150 || maxY < 208) {
          throw new Error(
            `Sprite frame is incomplete: ${src} row ${row}, column ${column} `
            + `(${visiblePixels} visible pixels, ${visibleHeight}px high, bottom ${maxY})`
          );
        }
      }
    }
  }

  async function loadLayer(def) {
    const [idleImage, walkImage] = await Promise.all([
      loadImage(def.idle),
      loadImage(def.walk)
    ]);

    validateAtlasShape(idleImage, def.idle, 1);
    validateAtlasShape(walkImage, def.walk, WALK_FRAMES);
    if (def.coverage === 'full-body') {
      validateFullBodyFrames(idleImage, def.idle, 1);
      validateFullBodyFrames(walkImage, def.walk, WALK_FRAMES);
    }

    return { ...def, idleImage, walkImage };
  }

  class LayeredSprite {
    constructor(canvas, options = {}) {
      if (!(canvas instanceof HTMLCanvasElement)) {
        throw new TypeError('LayeredSprite requires a canvas element.');
      }

      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.ctx.imageSmoothingEnabled = false;
      this.body = options.body || 'male';
      this.direction = 'south';
      this.state = 'idle';
      this.frame = 0;
      this.lastFrameAt = performance.now();
      this.layers = [];
      this.ready = false;
      this.loadToken = 0;
    }

    async setBody(body) {
      if (!BODY_LAYERS[body]) body = 'male';
      this.body = body;
      sessionStorage.setItem('avendorHeroBody', body);
      await this.setLayers(BODY_LAYERS[body]);
    }

    async setLayers(layerDefs) {
      const token = ++this.loadToken;
      this.ready = false;

      const loaded = await Promise.all(layerDefs.map(loadLayer));

      if (token !== this.loadToken) return;
      this.layers = loaded;
      this.ready = true;
      this.frame = 0;
      this.lastFrameAt = performance.now();
      this.draw();
    }

    setMotion(state, direction) {
      const stateChanged = state !== this.state;
      const directionChanged = Boolean(direction && direction !== this.direction);
      if (stateChanged) {
        this.state = state;
        this.frame = 0;
        this.lastFrameAt = performance.now();
      }
      if (direction) this.direction = direction;
      if (this.ready && (stateChanged || directionChanged)) this.draw();
    }

    update(now) {
      if (!this.ready) return;
      if (this.state === 'walk') {
        const elapsed = now - this.lastFrameAt;
        if (elapsed >= WALK_FRAME_MS) {
          const steps = Math.floor(elapsed / WALK_FRAME_MS);
          this.frame = (this.frame + steps) % WALK_FRAMES;
          this.lastFrameAt += steps * WALK_FRAME_MS;
          this.draw();
        }
      } else if (this.frame !== 0) {
        this.frame = 0;
        this.draw();
      }
    }

    draw() {
      const { ctx } = this;
      ctx.clearRect(0, 0, FRAME_W, FRAME_H);
      if (!this.ready) return;

      const mirrored = Boolean(MIRROR_TO[this.direction]);
      const sourceDirection = MIRROR_TO[this.direction] || this.direction;
      const row = ROW[sourceDirection] ?? ROW.south;
      const walk = this.state === 'walk';
      const sx = walk ? this.frame * FRAME_W : 0;
      const sy = row * FRAME_H;

      ctx.save();
      ctx.imageSmoothingEnabled = false;
      if (mirrored) {
        ctx.translate(FRAME_W, 0);
        ctx.scale(-1, 1);
      }

      for (const layer of this.layers) {
        const img = walk ? layer.walkImage : layer.idleImage;
        ctx.drawImage(
          img,
          sx, sy, FRAME_W, FRAME_H,
          0, 0, FRAME_W, FRAME_H
        );
      }
      ctx.restore();
    }

    getStatus() {
      return {
        body: this.body,
        direction: this.direction,
        state: this.state,
        frame: this.frame,
        ready: this.ready,
        rigVersion: RIG_VERSION,
        artVersion: ART_VERSION
      };
    }
  }

  window.AvendorSpriteEngine = Object.freeze({
    FRAME_W,
    FRAME_H,
    DIRECTION_ROWS,
    WALK_FRAMES,
    WALK_FRAME_MS,
    RIG_VERSION,
    ART_VERSION,
    LayeredSprite,
    presets: BODY_LAYERS
  });
})();
