(() => {
  'use strict';

  const FRAME_W = 128;
  const FRAME_H = 240;
  const WALK_FRAMES = 6;
  const WALK_FRAME_MS = 96;

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
        walk: 'assets/sprites/hero/body/male/walk.png'
      }
    ],
    female: [
      {
        id: 'body',
        idle: 'assets/sprites/hero/body/female/idle.png',
        walk: 'assets/sprites/hero/body/female/walk.png'
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

      const loaded = await Promise.all(layerDefs.map(async (def) => ({
        ...def,
        idleImage: await loadImage(def.idle),
        walkImage: await loadImage(def.walk)
      })));

      if (token !== this.loadToken) return;
      this.layers = loaded;
      this.ready = true;
      this.frame = 0;
      this.lastFrameAt = performance.now();
      this.draw();
    }

    setMotion(state, direction) {
      if (state !== this.state) {
        this.state = state;
        this.frame = 0;
        this.lastFrameAt = performance.now();
      }
      if (direction) this.direction = direction;
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
        ready: this.ready
      };
    }
  }

  window.AvendorSpriteEngine = Object.freeze({
    FRAME_W,
    FRAME_H,
    WALK_FRAMES,
    WALK_FRAME_MS,
    LayeredSprite,
    presets: BODY_LAYERS
  });
})();
