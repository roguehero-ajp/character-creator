(() => {
  'use strict';

  const SOURCE = 'assets/sprites/creatures/kobolds/kobold-painted-ew.avif';
  const COLUMNS = 6;
  const ROWS = 4;
  const MAX_BACKGROUND_DISTANCE = 72;
  const SPRITE_SELECTOR = '.kobold-runtime-sprite';

  let cleanedSheetUrl = null;
  let ready = false;

  const hideStyle = document.createElement('style');
  hideStyle.textContent = `
    body:not(.kobold-alpha-ready) ${SPRITE_SELECTOR} { visibility: hidden !important; }
  `;
  document.head.appendChild(hideStyle);

  function colourDistanceSquared(data, offset, target) {
    const dr = data[offset] - target[0];
    const dg = data[offset + 1] - target[1];
    const db = data[offset + 2] - target[2];
    return (dr * dr) + (dg * dg) + (db * db);
  }

  function clearFrameBackground(imageData, frameX, frameY, frameWidth, frameHeight) {
    const { data, width: canvasWidth } = imageData;
    const threshold = MAX_BACKGROUND_DISTANCE * MAX_BACKGROUND_DISTANCE;
    const x0 = frameX;
    const y0 = frameY;
    const x1 = frameX + frameWidth - 1;
    const y1 = frameY + frameHeight - 1;

    const cornerOffsets = [
      ((y0 * canvasWidth) + x0) * 4,
      ((y0 * canvasWidth) + x1) * 4,
      ((y1 * canvasWidth) + x0) * 4,
      ((y1 * canvasWidth) + x1) * 4
    ];
    const opaqueCorners = cornerOffsets.filter((offset) => data[offset + 3] > 16);
    if (!opaqueCorners.length) return;

    const target = [0, 1, 2].map((channel) => {
      const values = opaqueCorners.map((offset) => data[offset + channel]).sort((a, b) => a - b);
      return values[Math.floor(values.length / 2)];
    });

    const queue = new Int32Array(frameWidth * frameHeight);
    const visited = new Uint8Array(frameWidth * frameHeight);
    let read = 0;
    let write = 0;

    function enqueue(localX, localY) {
      if (localX < 0 || localX >= frameWidth || localY < 0 || localY >= frameHeight) return;
      const localIndex = (localY * frameWidth) + localX;
      if (visited[localIndex]) return;
      visited[localIndex] = 1;

      const pixelOffset = (((frameY + localY) * canvasWidth) + frameX + localX) * 4;
      if (data[pixelOffset + 3] <= 16) return;
      if (colourDistanceSquared(data, pixelOffset, target) > threshold) return;
      queue[write++] = localIndex;
    }

    for (let x = 0; x < frameWidth; x += 1) {
      enqueue(x, 0);
      enqueue(x, frameHeight - 1);
    }
    for (let y = 1; y < frameHeight - 1; y += 1) {
      enqueue(0, y);
      enqueue(frameWidth - 1, y);
    }

    while (read < write) {
      const localIndex = queue[read++];
      const localX = localIndex % frameWidth;
      const localY = Math.floor(localIndex / frameWidth);
      const pixelOffset = (((frameY + localY) * canvasWidth) + frameX + localX) * 4;
      data[pixelOffset + 3] = 0;

      enqueue(localX - 1, localY);
      enqueue(localX + 1, localY);
      enqueue(localX, localY - 1);
      enqueue(localX, localY + 1);
    }
  }

  function applyCleanSheet(root = document) {
    if (!cleanedSheetUrl) return;
    root.querySelectorAll?.(SPRITE_SELECTOR).forEach((element) => {
      element.style.backgroundImage = `url("${cleanedSheetUrl}")`;
    });
  }

  function finish(url) {
    cleanedSheetUrl = url;
    ready = true;
    applyCleanSheet();
    document.body.classList.add('kobold-alpha-ready');
  }

  function failOpen() {
    ready = true;
    document.body.classList.add('kobold-alpha-ready');
  }

  const observer = new MutationObserver((mutations) => {
    if (!ready || !cleanedSheetUrl) return;
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (!(node instanceof Element)) return;
        if (node.matches?.(SPRITE_SELECTOR)) {
          node.style.backgroundImage = `url("${cleanedSheetUrl}")`;
        }
        applyCleanSheet(node);
      });
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });

  const image = new Image();
  image.decoding = 'async';
  image.onload = () => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error('Canvas 2D context unavailable');
      context.drawImage(image, 0, 0);

      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const frameWidth = Math.floor(canvas.width / COLUMNS);
      const frameHeight = Math.floor(canvas.height / ROWS);

      for (let row = 0; row < ROWS; row += 1) {
        for (let column = 0; column < COLUMNS; column += 1) {
          clearFrameBackground(
            imageData,
            column * frameWidth,
            row * frameHeight,
            frameWidth,
            frameHeight
          );
        }
      }

      context.putImageData(imageData, 0, 0);
      canvas.toBlob((blob) => {
        if (!blob) {
          failOpen();
          return;
        }
        finish(URL.createObjectURL(blob));
      }, 'image/png');
    } catch (error) {
      console.warn('[Avendor] Kobold transparency cleanup failed; using source atlas.', error);
      failOpen();
    }
  };
  image.onerror = failOpen;
  image.src = SOURCE;
})();
