(() => {
  'use strict';

  const FRAME_W = 128;
  const FRAME_H = 240;
  const WALK_FRAMES = 8;
  const WALK_POSE_MS = 105;
  const CANDIDATE_URL = 'data/hero-animation/male-east-west-candidate-0.3.json';
  const VERSION = '0.6.1';

  const MEASUREMENTS = Object.freeze({
    headRadius: 17,
    neck: 8,
    torso: 55,
    shoulderHalfWidth: 4,
    hipHalfWidth: 3,
    upperArm: 38,
    forearm: 35,
    thigh: 52,
    shin: 50,
    foot: 24
  });

  const PART_ATLASES = Object.freeze({
    male: Object.freeze({
      src: 'assets/sprites/hero/combat-test/male-profile-parts.png',
      width: 256,
      height: 73,
      rects: Object.freeze({
        head: Object.freeze({ x: 4, y: 4, w: 46, h: 47 }),
        torso: Object.freeze({ x: 54, y: 4, w: 58, h: 65 }),
        upperArm: Object.freeze({ x: 116, y: 4, w: 22, h: 20 }),
        forearm: Object.freeze({ x: 142, y: 4, w: 20, h: 25 }),
        thigh: Object.freeze({ x: 166, y: 4, w: 23, h: 21 }),
        shin: Object.freeze({ x: 193, y: 4, w: 22, h: 30 }),
        foot: Object.freeze({ x: 219, y: 4, w: 21, h: 18 })
      })
    }),
    female: Object.freeze({
      src: 'assets/sprites/hero/combat-test/female-profile-parts.png',
      width: 256,
      height: 74,
      rects: Object.freeze({
        head: Object.freeze({ x: 4, y: 4, w: 50, h: 42 }),
        torso: Object.freeze({ x: 58, y: 4, w: 56, h: 66 }),
        upperArm: Object.freeze({ x: 118, y: 4, w: 20, h: 17 }),
        forearm: Object.freeze({ x: 142, y: 4, w: 19, h: 20 }),
        thigh: Object.freeze({ x: 165, y: 4, w: 22, h: 23 }),
        shin: Object.freeze({ x: 191, y: 4, w: 20, h: 25 }),
        foot: Object.freeze({ x: 215, y: 4, w: 21, h: 18 })
      })
    })
  });

  const DISPLAY = Object.freeze({
    male: Object.freeze({
      head: Object.freeze({ w: 47, h: 48, x: -21, y: -23 }),
      torso: Object.freeze({ w: 55, h: 73, x: -26, y: -8 }),
      upperArmWidth: 17,
      forearmWidth: 14,
      thighWidth: 18,
      shinWidth: 17,
      foot: Object.freeze({ w: 31, h: 21, x: -5, y: -13 })
    }),
    female: Object.freeze({
      head: Object.freeze({ w: 51, h: 43, x: -27, y: -20 }),
      torso: Object.freeze({ w: 52, h: 71, x: -24, y: -7 }),
      upperArmWidth: 15,
      forearmWidth: 12,
      thighWidth: 16,
      shinWidth: 15,
      foot: Object.freeze({ w: 29, h: 20, x: -5, y: -12 })
    })
  });

  let candidatePromise = null;
  const atlasPromises = new Map();

  function loadCandidate() {
    if (!candidatePromise) {
      candidatePromise = fetch(CANDIDATE_URL, { cache: 'no-store' })
        .then((response) => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.json();
        })
        .then((data) => {
          const order = data?.poseOrder;
          if (
            data?.body !== 'male'
            || data?.direction !== 'east'
            || !Array.isArray(order)
            || order.length !== 9
            || order[0] !== 'idle'
            || order[8] !== 'walk8'
            || !data?.poses
          ) {
            throw new Error('Unexpected candidate 0.3 payload');
          }
          return data;
        });
    }
    return candidatePromise;
  }

  function loadPartAtlas(body) {
    const normalized = body === 'female' ? 'female' : 'male';
    if (atlasPromises.has(normalized)) return atlasPromises.get(normalized);

    const def = PART_ATLASES[normalized];
    const promise = new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = 'async';
      image.onload = () => {
        if (image.naturalWidth !== def.width || image.naturalHeight !== def.height) {
          reject(new Error(
            `Combat PNG part atlas has wrong dimensions: ${def.src} `
            + `(expected ${def.width}x${def.height}, got ${image.naturalWidth}x${image.naturalHeight})`
          ));
          return;
        }
        resolve({ image, def });
      };
      image.onerror = () => reject(new Error(`Could not load combat PNG part atlas: ${def.src}`));
      image.src = `${def.src}?v=${encodeURIComponent(VERSION)}`;
    });

    atlasPromises.set(normalized, promise);
    return promise;
  }

  function radians(degrees) {
    return degrees * Math.PI / 180;
  }

  function fromDown(origin, length, degrees) {
    const angle = radians(degrees);
    return {
      x: origin.x + Math.sin(angle) * length,
      y: origin.y + Math.cos(angle) * length
    };
  }

  function fromUp(origin, length, degrees) {
    const angle = radians(degrees);
    return {
      x: origin.x + Math.sin(angle) * length,
      y: origin.y - Math.cos(angle) * length
    };
  }

  function footTip(ankle, length, degrees) {
    const angle = radians(degrees);
    return {
      x: ankle.x + Math.cos(angle) * length,
      y: ankle.y + Math.sin(angle) * length
    };
  }

  function segmentAngle(a, b) {
    return Math.atan2(b.y - a.y, b.x - a.x);
  }

  function segmentLength(a, b) {
    return Math.hypot(b.x - a.x, b.y - a.y);
  }

  function buildSkeleton(pose) {
    const m = MEASUREMENTS;
    const pelvis = { x: FRAME_W / 2, y: pose.pelvisY };
    const shoulder = fromUp(pelvis, m.torso, pose.torsoLean);
    const neck = fromUp(shoulder, m.neck, pose.torsoLean);
    const headBase = fromUp(neck, m.headRadius, pose.torsoLean);
    const head = { x: headBase.x + pose.headForward, y: headBase.y };

    const nearShoulder = { x: shoulder.x + m.shoulderHalfWidth, y: shoulder.y };
    const farShoulder = { x: shoulder.x - m.shoulderHalfWidth, y: shoulder.y + 1 };
    const nearHip = { x: pelvis.x + m.hipHalfWidth, y: pelvis.y };
    const farHip = { x: pelvis.x - m.hipHalfWidth, y: pelvis.y + 1 };

    const nearElbow = fromDown(nearShoulder, m.upperArm, pose.nearUpperArm);
    const nearWrist = fromDown(nearElbow, m.forearm, pose.nearForearm);
    const farElbow = fromDown(farShoulder, m.upperArm, pose.farUpperArm);
    const farWrist = fromDown(farElbow, m.forearm, pose.farForearm);

    const nearKnee = fromDown(nearHip, m.thigh, pose.nearThigh);
    const nearAnkle = fromDown(nearKnee, m.shin, pose.nearShin);
    const farKnee = fromDown(farHip, m.thigh, pose.farThigh);
    const farAnkle = fromDown(farKnee, m.shin, pose.farShin);

    return {
      pelvis, shoulder, neck, head,
      nearShoulder, farShoulder, nearHip, farHip,
      nearElbow, nearWrist, farElbow, farWrist,
      nearKnee, nearAnkle, farKnee, farAnkle,
      nearToe: footTip(nearAnkle, m.foot, pose.nearFoot),
      farToe: footTip(farAnkle, m.foot, pose.farFoot)
    };
  }

  function drawCrop(ctx, image, rect, dx, dy, dw, dh) {
    ctx.drawImage(
      image,
      rect.x, rect.y, rect.w, rect.h,
      dx, dy, dw, dh
    );
  }

  function withDepth(ctx, far, callback) {
    ctx.save();
    if (far) {
      ctx.globalAlpha = 0.74;
      ctx.filter = 'brightness(0.78) saturate(0.88)';
    }
    callback();
    ctx.restore();
  }

  function drawSegmentPart(ctx, image, rect, a, b, width, far = false) {
    const length = segmentLength(a, b);
    const angle = segmentAngle(a, b) - Math.PI / 2;
    const overlap = 3;

    withDepth(ctx, far, () => {
      ctx.translate(a.x, a.y);
      ctx.rotate(angle);
      drawCrop(
        ctx,
        image,
        rect,
        -width / 2,
        -overlap,
        width,
        length + overlap * 2
      );
    });
  }

  function drawFootPart(ctx, image, rect, ankle, toe, spec, far = false) {
    const angle = segmentAngle(ankle, toe);
    withDepth(ctx, far, () => {
      ctx.translate(ankle.x, ankle.y);
      ctx.rotate(angle);
      drawCrop(ctx, image, rect, spec.x, spec.y, spec.w, spec.h);
    });
  }

  function drawTorsoPart(ctx, image, rect, points, spec) {
    const angle = segmentAngle(points.shoulder, points.pelvis) - Math.PI / 2;
    ctx.save();
    ctx.translate(points.shoulder.x, points.shoulder.y);
    ctx.rotate(angle);
    drawCrop(ctx, image, rect, spec.x, spec.y, spec.w, spec.h);
    ctx.restore();
  }

  function drawHeadPart(ctx, image, rect, points, spec) {
    ctx.save();
    ctx.translate(points.head.x, points.head.y);
    drawCrop(ctx, image, rect, spec.x, spec.y, spec.w, spec.h);
    ctx.restore();
  }

  function drawArmParts(ctx, image, rects, points, side, spec, far) {
    const shoulder = points[`${side}Shoulder`];
    const elbow = points[`${side}Elbow`];
    const wrist = points[`${side}Wrist`];
    drawSegmentPart(ctx, image, rects.upperArm, shoulder, elbow, spec.upperArmWidth, far);
    drawSegmentPart(ctx, image, rects.forearm, elbow, wrist, spec.forearmWidth, far);
  }

  function drawLegParts(ctx, image, rects, points, side, spec, far) {
    const hip = points[`${side}Hip`];
    const knee = points[`${side}Knee`];
    const ankle = points[`${side}Ankle`];
    const toe = points[`${side}Toe`];
    drawSegmentPart(ctx, image, rects.thigh, hip, knee, spec.thighWidth, far);
    drawSegmentPart(ctx, image, rects.shin, knee, ankle, spec.shinWidth, far);
    drawFootPart(ctx, image, rects.foot, ankle, toe, spec.foot, far);
  }

  function drawBodyFrame(ctx, pose, body, partAtlas) {
    const normalized = body === 'female' ? 'female' : 'male';
    const spec = DISPLAY[normalized];
    const { image, def } = partAtlas;
    const rects = def.rects;
    const points = buildSkeleton(pose);

    ctx.clearRect(0, 0, FRAME_W, FRAME_H);
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // Painter's order preserves depth while every visible surface comes from PNG artwork.
    drawLegParts(ctx, image, rects, points, 'far', spec, true);
    drawArmParts(ctx, image, rects, points, 'far', spec, true);
    drawTorsoPart(ctx, image, rects.torso, points, spec.torso);
    drawHeadPart(ctx, image, rects.head, points, spec.head);
    drawLegParts(ctx, image, rects, points, 'near', spec, false);
    drawArmParts(ctx, image, rects, points, 'near', spec, false);

    ctx.restore();
  }

  function renderAtlases(candidate, body, partAtlas) {
    const idle = document.createElement('canvas');
    idle.width = FRAME_W;
    idle.height = FRAME_H;
    const idleCtx = idle.getContext('2d');
    idleCtx.imageSmoothingEnabled = false;
    drawBodyFrame(idleCtx, candidate.poses.idle, body, partAtlas);

    const walk = document.createElement('canvas');
    walk.width = FRAME_W * WALK_FRAMES;
    walk.height = FRAME_H;
    const walkCtx = walk.getContext('2d');
    walkCtx.imageSmoothingEnabled = false;

    for (let index = 0; index < WALK_FRAMES; index += 1) {
      const frameCanvas = document.createElement('canvas');
      frameCanvas.width = FRAME_W;
      frameCanvas.height = FRAME_H;
      const frameCtx = frameCanvas.getContext('2d');
      frameCtx.imageSmoothingEnabled = false;
      drawBodyFrame(frameCtx, candidate.poses[`walk${index + 1}`], body, partAtlas);
      walkCtx.drawImage(frameCanvas, index * FRAME_W, 0);
    }

    return { idle, walk };
  }

  class CombatHeroSprite {
    constructor(canvas, options = {}) {
      if (!(canvas instanceof HTMLCanvasElement)) {
        throw new TypeError('CombatHeroSprite requires a canvas element.');
      }

      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.ctx.imageSmoothingEnabled = false;
      this.body = options.body === 'female' ? 'female' : 'male';
      this.state = 'idle';
      this.frame = 0;
      this.lastFrameAt = performance.now();
      this.ready = false;
      this.atlases = null;
      this.loadToken = 0;
    }

    async setBody(body) {
      const normalized = body === 'female' ? 'female' : 'male';
      const token = ++this.loadToken;
      this.ready = false;

      const [candidate, partAtlas] = await Promise.all([
        loadCandidate(),
        loadPartAtlas(normalized)
      ]);

      if (token !== this.loadToken) return;

      this.body = normalized;
      this.atlases = renderAtlases(candidate, normalized, partAtlas);
      this.frame = 0;
      this.lastFrameAt = performance.now();
      this.ready = true;
      this.draw();
    }

    setMotion(state) {
      const next = state === 'walk' ? 'walk' : 'idle';
      if (next === this.state) return;
      this.state = next;
      this.frame = 0;
      this.lastFrameAt = performance.now();
      if (this.ready) this.draw();
    }

    update(now) {
      if (!this.ready) return;

      if (this.state !== 'walk') {
        if (this.frame !== 0) {
          this.frame = 0;
          this.draw();
        }
        return;
      }

      const elapsed = now - this.lastFrameAt;
      if (elapsed < WALK_POSE_MS) return;

      const steps = Math.floor(elapsed / WALK_POSE_MS);
      this.frame = (this.frame + steps) % WALK_FRAMES;
      this.lastFrameAt += steps * WALK_POSE_MS;
      this.draw();
    }

    draw() {
      this.ctx.clearRect(0, 0, FRAME_W, FRAME_H);
      if (!this.ready || !this.atlases) return;

      if (this.state === 'walk') {
        this.ctx.drawImage(
          this.atlases.walk,
          this.frame * FRAME_W, 0, FRAME_W, FRAME_H,
          0, 0, FRAME_W, FRAME_H
        );
      } else {
        this.ctx.drawImage(this.atlases.idle, 0, 0);
      }
    }

    getStatus() {
      return {
        body: this.body,
        state: this.state,
        frame: this.frame,
        ready: this.ready,
        frameWidth: FRAME_W,
        frameHeight: FRAME_H,
        walkFrames: WALK_FRAMES,
        walkPoseMs: WALK_POSE_MS,
        candidateUrl: CANDIDATE_URL,
        partAtlas: PART_ATLASES[this.body].src,
        version: VERSION
      };
    }
  }

  window.AvendorCombatProductionSprite = Object.freeze({
    VERSION,
    FRAME_W,
    FRAME_H,
    WALK_FRAMES,
    WALK_POSE_MS,
    CANDIDATE_URL,
    PART_ATLASES,
    CombatHeroSprite
  });
})();
