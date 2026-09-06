/* ===================================================
   Dark-mode product photo treatment
   Product photos are shot on a plain light studio
   backdrop. In dark mode we flood-fill that flat
   backdrop to transparent (starting from the image
   corners/edges) so the dark theme's card background
   shows through behind the shoe instead of a light box.
   Result is cached per source image so it only runs once.
   =================================================== */
(function () {
  'use strict';

  const MAX_DIM = 460;      // cap canvas size for performance
  const TOLERANCE = 10;     // per-channel color match tolerance (kept tight so
                             // pale/white shoe leather isn't mistaken for backdrop)
  const cache = new Map();  // originalSrc -> processed dataURL ('' if processing failed)

  function averageCorners(data, w, h) {
    const pts = [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]];
    let r = 0, g = 0, b = 0;
    pts.forEach(([x, y]) => {
      const i = (y * w + x) * 4;
      r += data[i]; g += data[i + 1]; b += data[i + 2];
    });
    return [r / 4, g / 4, b / 4];
  }

  function clearBackdrop(ctx, w, h) {
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    const [refR, refG, refB] = averageCorners(data, w, h);
    const visited = new Uint8Array(w * h);
    const stack = [];

    function matches(i) {
      return Math.abs(data[i] - refR) <= TOLERANCE &&
             Math.abs(data[i + 1] - refG) <= TOLERANCE &&
             Math.abs(data[i + 2] - refB) <= TOLERANCE;
    }

    function seed(x, y) {
      const idx = y * w + x;
      if (visited[idx]) return;
      if (matches(idx * 4)) {
        visited[idx] = 1;
        stack.push(idx);
      }
    }

    for (let x = 0; x < w; x++) { seed(x, 0); seed(x, h - 1); }
    for (let y = 0; y < h; y++) { seed(0, y); seed(w - 1, y); }

    while (stack.length) {
      const idx = stack.pop();
      const x = idx % w, y = (idx / w) | 0;
      data[idx * 4 + 3] = 0; // clear alpha

      const neighbors = [];
      if (x > 0) neighbors.push(idx - 1);
      if (x < w - 1) neighbors.push(idx + 1);
      if (y > 0) neighbors.push(idx - w);
      if (y < h - 1) neighbors.push(idx + w);

      for (const n of neighbors) {
        if (visited[n]) continue;
        if (matches(n * 4)) {
          visited[n] = 1;
          stack.push(n);
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }

  function processSrc(src) {
    if (cache.has(src)) return Promise.resolve(cache.get(src));

    return new Promise((resolve) => {
      const loader = new Image();
      loader.onload = () => {
        try {
          let w = loader.naturalWidth, h = loader.naturalHeight;
          const scale = Math.min(1, MAX_DIM / Math.max(w, h));
          w = Math.max(1, Math.round(w * scale));
          h = Math.max(1, Math.round(h * scale));

          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          ctx.drawImage(loader, 0, 0, w, h);
          clearBackdrop(ctx, w, h);

          const dataUrl = canvas.toDataURL('image/png');
          cache.set(src, dataUrl);
          resolve(dataUrl);
        } catch (e) {
          cache.set(src, '');
          resolve('');
        }
      };
      loader.onerror = () => { cache.set(src, ''); resolve(''); };
      loader.src = src;
    });
  }

  async function applyToImg(img) {
    const original = img.dataset.origSrc || img.currentSrc || img.src;
    if (!original) return;
    img.dataset.origSrc = original;
    const dataUrl = await processSrc(original);
    if (dataUrl) img.src = dataUrl;
  }

  function restoreImg(img) {
    if (img.dataset.origSrc) img.src = img.dataset.origSrc;
  }

  function targetImages() {
    return document.querySelectorAll(
      '.product-card-img, .product-modal-img, .modal-thumb-btn img'
    );
  }

  function applyPhotoTheme(isDark) {
    targetImages().forEach((img) => {
      if (isDark) {
        if (img.complete) applyToImg(img);
        else img.addEventListener('load', () => applyToImg(img), { once: true });
      } else {
        restoreImg(img);
      }
    });
  }

  // Product cards and the quick-view modal render their <img> tags
  // dynamically (category filters, "open product"). Watch for new ones
  // and treat them automatically whenever dark mode is active.
  const observer = new MutationObserver((mutations) => {
    if (document.body.getAttribute('data-theme') !== 'dark') return;
    for (const m of mutations) {
      m.addedNodes.forEach((node) => {
        if (node.nodeType !== 1) return;
        if (node.matches && node.matches('.product-card-img, .product-modal-img, .modal-thumb-btn img')) {
          applyToImg(node);
        }
        node.querySelectorAll && node.querySelectorAll(
          '.product-card-img, .product-modal-img, .modal-thumb-btn img'
        ).forEach(applyToImg);
      });
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    observer.observe(document.body, { childList: true, subtree: true });
  });

  window.NEXSOLE = window.NEXSOLE || {};
  window.NEXSOLE.darkPhotos = { applyPhotoTheme };
})();
