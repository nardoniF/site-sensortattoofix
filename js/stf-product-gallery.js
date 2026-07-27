/**
 * Product photo album — ←/→ on the image.
 * BR (PT): full kit gallery.
 * .com / EN / IT (gringa): lens-only gallery (application + before/after).
 * Extra lens photos can be appended to LENS_* arrays when ready.
 */
(function () {
  const KIT_IDS = new Set(['kit-sensor-tattoofix', 'kit', 'optical-lens-intl']);

  const PT_GALLERY = [
    '/site/kit-gallery/kit-03-aplicacao.jpg',
    '/site/kit-gallery/kit-01-embalagem.jpg',
    '/site/kit-gallery/kit-02-conteudo.jpg',
    '/site/kit-gallery/kit-05-acompanha.jpg',
    '/site/kit-gallery/kit-06-antes-depois.jpg',
    '/site/kit-gallery/kit-07-beneficios.jpg'
  ];

  /** Shared photo (little/no copy) reused across locales. */
  const SHARED_APLICACAO = '/site/kit-gallery/kit-03-aplicacao.jpg';

  const EN_KIT_GALLERY = [
    '/site/kit-gallery/en/kit-03-aplicacao.jpg',
    '/site/kit-gallery/en/kit-01-embalagem.jpg',
    '/site/kit-gallery/en/kit-02-conteudo.jpg',
    '/site/kit-gallery/en/kit-05-acompanha.jpg',
    '/site/kit-gallery/en/kit-06-antes-depois.jpg',
    '/site/kit-gallery/en/kit-07-beneficios.jpg'
  ];

  const IT_KIT_GALLERY = [
    SHARED_APLICACAO,
    '/site/kit-gallery/it/kit-01-embalagem.jpg',
    '/site/kit-gallery/it/kit-02-conteudo.jpg',
    '/site/kit-gallery/it/kit-05-acompanha.jpg',
    '/site/kit-gallery/it/kit-06-antes-depois.jpg',
    '/site/kit-gallery/it/kit-07-beneficios.jpg'
  ];

  /** .com / EN / IT — lens only (more photos can be pushed later). */
  const LENS_GALLERY_EN = [
    '/site/kit-gallery/en/kit-03-aplicacao.jpg',
    '/site/kit-gallery/en/kit-06-antes-depois.jpg'
    // pending: lens pack + side view (user will provide)
  ];

  const LENS_GALLERY_IT = [
    SHARED_APLICACAO,
    '/site/kit-gallery/it/kit-06-antes-depois.jpg'
    // pending: lens pack + side view (user will provide)
  ];

  const LENS_GALLERY_SHARED = [
    SHARED_APLICACAO,
    '/site/kit-gallery/kit-06-antes-depois.jpg'
  ];

  /** @deprecated alias */
  const KIT_ALBUM = PT_GALLERY;
  const KIT_GALLERY = PT_GALLERY;
  const EN_GALLERY = EN_KIT_GALLERY;
  const IT_GALLERY = IT_KIT_GALLERY;

  function detectLang() {
    try {
      if (window.STF_I18N?.getLang) return window.STF_I18N.getLang();
    } catch (_) { /* ignore */ }
    const path = String(location.pathname || '');
    if (path.includes('/it/')) return 'it';
    if (path.includes('/en/')) return 'en';
    const host = String(location.hostname || '').toLowerCase();
    if (host === 'sensortattoofix.com' || host === 'www.sensortattoofix.com') return 'en';
    return 'pt';
  }

  /** International storefront: lens-only product presentation. */
  function isLensOnlyMarket() {
    try {
      if (window.STF_SITE?.isIntlHost?.()) return true;
    } catch (_) { /* ignore */ }
    const host = String(location.hostname || '').toLowerCase();
    if (host === 'sensortattoofix.com' || host === 'www.sensortattoofix.com') return true;
    const lang = detectLang();
    return lang === 'en' || lang === 'it';
  }

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

  function lensAlbum(lang) {
    const l = lang || detectLang();
    if (l === 'en') return LENS_GALLERY_EN.slice();
    if (l === 'it') return LENS_GALLERY_IT.slice();
    return LENS_GALLERY_SHARED.slice();
  }

  function kitAlbum(lang) {
    if (isLensOnlyMarket()) return lensAlbum(lang);
    const l = lang || detectLang();
    if (l === 'en') return EN_KIT_GALLERY.slice();
    if (l === 'it') return IT_KIT_GALLERY.slice();
    return PT_GALLERY.slice();
  }

  function resolveImages(product) {
    const fromAlbum = Array.isArray(product?.images) ? product.images : [];
    const primary = product?.image || '';
    let list = uniqueUrls([primary, ...fromAlbum].filter((u) => u && !isLegacyKitHero(u)));
    if (list.length) return list;
    if (isKitProduct(product)) {
      return kitAlbum();
    }
    if (!list.length) list = kitAlbum();
    return list;
  }

  function renderMarkup(images, alt, extraClass) {
    const imgs = uniqueUrls(images);
    if (!imgs.length) imgs.push(kitAlbum()[0]);
    const multi = imgs.length > 1;
    const cls = ['stf-album', extraClass || ''].filter(Boolean).join(' ');
    const nav = multi
      ? `<button type="button" class="stf-album-btn stf-album-prev" aria-label="Previous photo"><span aria-hidden="true">‹</span></button>
         <button type="button" class="stf-album-btn stf-album-next" aria-label="Next photo"><span aria-hidden="true">›</span></button>`
      : '';
    const fallback = escapeAttr(kitAlbum()[0]);
    return `<div class="${cls}" data-stf-album data-index="0" data-images="${escapeAttr(JSON.stringify(imgs))}">
      <img src="${escapeAttr(imgs[0])}" alt="${escapeAttr(alt || '')}" loading="lazy"
           onerror="this.onerror=null;this.src='${fallback}'">
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

  /** Enhance product section — never the kit packaging block (BR only). */
  function enhanceExisting(selector, images, alt) {
    document.querySelectorAll(selector).forEach((wrap) => {
      if (wrap.closest('.kit-box-media') || wrap.classList.contains('kit-box-media')) return;
      const imgs = uniqueUrls(images && images.length ? images : kitAlbum());
      const existing = wrap.querySelector('img');
      const label = alt || existing?.alt || '';
      wrap.innerHTML = renderMarkup(imgs, label, 'stf-album--fill');
      bind(wrap);
    });
  }

  /** Square album = height of the benefit icons grid (contain, never crop). */
  function syncProductAlbumToBenefits() {
    const benefits = document.querySelector('#produtos .product-benefits-grid');
    const wraps = document.querySelectorAll('#produtos .product-image-wrap');
    if (!benefits || !wraps.length) return;
    const mediaCol = document.querySelector('#produtos .product-solution-media');
    const mediaW = mediaCol ? mediaCol.getBoundingClientRect().width : 0;
    const h = Math.round(benefits.getBoundingClientRect().height);
    if (h < 120) return;
    const side = Math.min(h, mediaW > 40 ? Math.floor(mediaW) : h);
    wraps.forEach((wrap) => {
      wrap.style.width = side + 'px';
      wrap.style.height = side + 'px';
      wrap.style.maxWidth = '100%';
      wrap.style.aspectRatio = '1 / 1';
    });
  }

  function watchProductAlbumSize() {
    syncProductAlbumToBenefits();
    const benefits = document.querySelector('#produtos .product-benefits-grid');
    if (!benefits || typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', syncProductAlbumToBenefits);
      return;
    }
    const ro = new ResizeObserver(() => syncProductAlbumToBenefits());
    ro.observe(benefits);
    const media = document.querySelector('#produtos .product-solution-media');
    if (media) ro.observe(media);
  }

  /** Hide kit packaging block on lens-only markets. */
  function hideKitBoxIfNeeded() {
    if (!isLensOnlyMarket()) return;
    document.querySelectorAll('.kit-box').forEach((el) => {
      el.hidden = true;
      el.setAttribute('aria-hidden', 'true');
    });
    document.documentElement.classList.add('stf-lens-only');
    document.body?.classList.add('stf-lens-only');
  }

  window.STF_PRODUCT_GALLERY = {
    KIT_ALBUM,
    KIT_GALLERY,
    PT_GALLERY,
    EN_GALLERY,
    IT_GALLERY,
    LENS_GALLERY_EN,
    LENS_GALLERY_IT,
    kitAlbum,
    lensAlbum,
    isLensOnlyMarket,
    resolveImages,
    isKitProduct,
    renderMarkup,
    bind,
    enhanceExisting,
    showIndex,
    detectLang,
    syncProductAlbumToBenefits
  };

  function boot() {
    hideKitBoxIfNeeded();
    const run = async () => {
      let product = null;
      try {
        if (window.StoreConfig?.load) {
          const cfg = await window.StoreConfig.load();
          const market = window.STF_SITE?.catalogMarket?.() || (isLensOnlyMarket() ? 'INT' : 'BR');
          const all = cfg.products?.length ? cfg.products : (cfg.product ? [cfg.product] : []);
          const filtered = window.STF_SITE?.filterProductsForMarket?.(all, market) || all;
          product = filtered.find((p) => p.active !== false && !p.aggregated) || filtered[0] || null;
        }
      } catch (err) {
        console.warn('STF_PRODUCT_GALLERY config:', err);
      }
      const imgs = product ? resolveImages(product) : kitAlbum();
      const alt = product
        ? (window.STF_PELICULA?.productLabel?.(product) || product.nameEn || product.name || 'Sensor Tattoo Fix')
        : (isLensOnlyMarket() ? 'SensorTattooFix Optical Lens' : 'Sensor Tattoo Fix');
      enhanceExisting('.product-image-wrap', imgs, alt);
      watchProductAlbumSize();
    };
    run();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
