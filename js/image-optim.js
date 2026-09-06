/* =====================================================
   CasaShoes — Image Optimization Helper
   Builds <picture> markup with AVIF -> WebP -> JPG/PNG
   fallback, correct width/height (from image-manifest.json)
   to prevent CLS, native lazy loading, and a shimmer
   placeholder that fades out once the image finishes
   loading.
   ===================================================== */

(function () {
  'use strict';

  const EXT_RE = /\.(jpe?g|png)$/i;

  function withExt(src, ext) {
    return src.replace(EXT_RE, `.${ext}`);
  }

  /**
   * Build a shimmer-wrapped, format-negotiated <picture> element as an
   * HTML string.
   *
   * @param {string} src        Original image path (jpg/png), e.g. "images/foo.JPG"
   * @param {string} alt        Alt text
   * @param {object} opts
   * @param {string} [opts.imgClass]      Class(es) applied to the <img>
   * @param {string} [opts.wrapperClass]  Class(es) applied to the shimmer wrapper div
   * @param {boolean} [opts.eager]        If true, skips lazy loading (use for above-the-fold hero images)
   * @param {string} [opts.id]            Optional id for the <img>
   */
  function buildPicture(src, alt, opts = {}) {
    const {
      imgClass = '',
      wrapperClass = '',
      eager = false,
      id = ''
    } = opts;

    const manifest = window.IMAGE_MANIFEST || {};
    const dims = manifest[src];
    const widthAttr = dims ? `width="${dims.width}"` : '';
    const heightAttr = dims ? `height="${dims.height}"` : '';

    const webp = withExt(src, 'webp');
    const avif = withExt(src, 'avif');

    const loadingAttr = eager ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"';
    const idAttr = id ? `id="${id}"` : '';

    return `
      <div class="img-shimmer ${wrapperClass}">
        <picture>
          <source type="image/avif" srcset="${avif}">
          <source type="image/webp" srcset="${webp}">
          <img
            ${idAttr}
            class="shimmer-img ${imgClass}"
            src="${src}"
            alt="${alt}"
            ${widthAttr} ${heightAttr}
            ${loadingAttr}
            decoding="async"
            onload="this.classList.add('loaded'); this.closest('.img-shimmer')?.classList.add('loaded');"
            onerror="this.closest('.img-shimmer')?.classList.add('loaded');">
        </picture>
      </div>
    `;
  }

  /**
   * Re-scan the DOM and mark any already-loaded images (from cache) so
   * their shimmer wrapper doesn't get stuck if the load event already
   * fired before listeners attached (common with cached images).
   */
  function syncCachedImages(root = document) {
    root.querySelectorAll('.shimmer-img').forEach(img => {
      if (img.complete && img.naturalWidth > 0) {
        img.classList.add('loaded');
        img.closest('.img-shimmer')?.classList.add('loaded');
      }
    });
  }

  // --- One-time browser format support detection (for JS-driven src swaps,
  // e.g. the modal main image / lightbox, which aren't <picture> elements) ---
  const FORMAT_TEST_IMAGES = {
    avif: 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQAMAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgABogQEDQgMgkQAAAAB8dSLfI=',
    webp: 'data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA=='
  };

  const support = { avif: null, webp: null };
  let preferredExt = 'original';

  function testFormat(name) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => { support[name] = img.width > 0; resolve(); };
      img.onerror = () => { support[name] = false; resolve(); };
      img.src = FORMAT_TEST_IMAGES[name];
    });
  }

  Promise.all([testFormat('avif'), testFormat('webp')]).then(() => {
    if (support.avif) preferredExt = 'avif';
    else if (support.webp) preferredExt = 'webp';
    else preferredExt = 'original';
  });

  /**
   * Returns the best-supported version of an original jpg/png path for
   * direct (non-<picture>) use, e.g. programmatic src swaps.
   * Falls back to the original path until detection resolves or if
   * neither modern format is supported.
   */
  function bestSrc(src) {
    if (preferredExt === 'avif') return withExt(src, 'avif');
    if (preferredExt === 'webp') return withExt(src, 'webp');
    return src;
  }

  window.NEXSOLE = window.NEXSOLE || {};
  window.NEXSOLE.imageOptim = { buildPicture, syncCachedImages, withExt, bestSrc };
})();
