/**
 * Product photo album — ←/→ on the image.
 * Store + product section: rotate kit gallery photos.
 * Kit box on homepage: left alone (static packaging photo).
 */
(function () {
  const KIT_IDS = new Set(['kit-sensor-tattoofix', 'kit']);

  /** Application shot first (replaces redundant sensortattoofix.jpg). */
  const KIT_GALLERY = [
    '/site/kit-gallery/kit-03-aplicacao.jpg',
    '/site/kit-gallery/kit-01-embalagem.jpg',
    '/site/kit-gallery/kit-02-conteudo.jpg',
    '/site/kit-gallery/kit-04-funcionando.jpg',
    '/site/kit-gallery/kit-05-acompanha.jpg',
    '/site/kit-gallery/kit-06-antes-depois.jpg',
    '/site/kit-gallery/kit-07-beneficios.jpg'
  ];

  /** @deprecated alias — same as KIT_GALLERY */
  const KIT_ALBUM = KIT_GALLERY;

  function normalizeUrl(raw) {
    const s = String(raw || '').trim();
    if (!s) return '';
    if (/^https?:\/\//i.test(s)) {
      try {
        const u = new URL(s);
        if (/sensortattoofix\.com(\.br)?$/i.test(u.hostname)) {
          return u.pathname + u.search;
        }
      } catch (_) { /* keep absolute */ }
      return s;
    }
    return s.startsWith('/') ? s : '/' + s.replace(/^\.\//, '');
  }

  function isLegacyKitHero(url) {
    const n = normalizeUrl(url).toLowerCase();
    return /\/site\/sensortattoofix\.jpg(\?|$)/i.test(n);
  }

  function uniqueUrls(list) {
    const out = [];
    const seen = new Set();
    list.forEach((u) => {
      const n = normalizeUrl(u);
      if (!n || seen.has(n)) return;
      seen.add(n);
      out.push(n);
    });
    return out;
  }

  function isKitProduct(product) {
    const id = String(product?.id || product?.slug || '').trim();
    return KIT_IDS.has(id) || /kit.?sensor|sensor.?tattoo/i.test(id + ' ' + (product?.name || ''));
  }

  function kitAlbum() {
    return KIT_GALLERY.slice();
  }

  function resolveImages(product) {
    if (isKitProduct(product)) {
      return kitAlbum();
    }
    const fromConfig = Array.isArray(product?.images) ? product.images : [];
    const primary = product?.image || '';
    let list = uniqueUrls([primary, ...fromConfig].filter((u) => !isLegacyKitHero(u)));
    if (!list.length) list = kitAlbum();
    return list;
  }

  function renderMarkup(images, alt, extraClass) {
    const imgs = uniqueUrls(images);
    if (!imgs.length) imgs.push(KIT_GALLERY[0]);
    const multi = imgs.length > 1;
    const cls = ['stf-album', extraClass || ''].filter(Boolean).join(' ');
    const nav = multi
      ? `<button type="button" class="stf-album-btn stf-album-prev" aria-label="Previous photo"><span aria-hidden="true">‹</span></button>
         <button type="button" class="stf-album-btn stf-album-next" aria-label="Next photo"><span aria-hidden="true">›</span></button>`
      : '';
    return `<div class="${cls}" data-stf-album data-index="0" data-images="${escapeAttr(JSON.stringify(imgs))}">
      <img src="${escapeAttr(imgs[0])}" alt="${escapeAttr(alt || '')}" loading="lazy"
           onerror="this.onerror=null;this.src='${escapeAttr(KIT_GALLERY[0])}'">
      ${nav}
    </div>`;
  }

  function escapeAttr(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;');
  }

  function showIndex(album, index) {
    let images;
    try {
      images = JSON.parse(album.getAttribute('data-images') || '[]');
    } catch (_) {
      images = [];
    }
    if (!images.length) return;
    const i = ((index % images.length) + images.length) % images.length;
    album.setAttribute('data-index', String(i));
    const img = album.querySelector('img');
    if (img) {
      img.src = images[i];
    }
  }

  function bind(root) {
    const scope = root || document;
    scope.querySelectorAll('[data-stf-album]').forEach((album) => {
      if (album.dataset.stfAlbumBound === '1') return;
      album.dataset.stfAlbumBound = '1';
      const prev = album.querySelector('.stf-album-prev');
      const next = album.querySelector('.stf-album-next');
      if (!prev && !next) return;
      prev?.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showIndex(album, Number(album.getAttribute('data-index') || 0) - 1);
      });
      next?.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showIndex(album, Number(album.getAttribute('data-index') || 0) + 1);
      });
      let tx = 0;
      album.addEventListener('touchstart', (e) => {
        tx = e.changedTouches?.[0]?.clientX || 0;
      }, { passive: true });
      album.addEventListener('touchend', (e) => {
        const x = e.changedTouches?.[0]?.clientX || 0;
        const d = x - tx;
        if (Math.abs(d) < 40) return;
        showIndex(album, Number(album.getAttribute('data-index') || 0) + (d < 0 ? 1 : -1));
      }, { passive: true });
    });
  }

  /** Enhance product section only — never the kit packaging block. */
  function enhanceExisting(selector, images, alt) {
    document.querySelectorAll(selector).forEach((wrap) => {
      if (wrap.closest('.kit-box-media') || wrap.classList.contains('kit-box-media')) return;
      const imgs = uniqueUrls(images && images.length ? images : kitAlbum());
      const existing = wrap.querySelector('img');
      const label = alt || existing?.alt || '';
      const style = existing?.getAttribute('style') || '';
      const cls = existing?.className || '';
      wrap.innerHTML = renderMarkup(imgs, label, 'stf-album--fill');
      const img = wrap.querySelector('img');
      if (img) {
        if (style) img.setAttribute('style', style);
        if (cls) img.className = cls;
      }
      bind(wrap);
    });
  }

  window.STF_PRODUCT_GALLERY = {
    KIT_ALBUM,
    KIT_GALLERY,
    kitAlbum,
    resolveImages,
    isKitProduct,
    renderMarkup,
    bind,
    enhanceExisting,
    showIndex
  };

  function boot() {
    // Product block (#produtos): album with visible arrows
    enhanceExisting('.product-image-wrap', kitAlbum(), 'Sensor Tattoo Fix');
    // .kit-box-media keeps site/kit-profissional.png — no album
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
