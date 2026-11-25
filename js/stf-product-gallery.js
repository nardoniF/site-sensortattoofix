/**
 * Product photo album — ←/→ on the image.
 * BR (PT): full kit gallery.
 * .com / EN / IT (gringa): mesmo álbum de fotos na home, loja e checkout.
 */
(function () {
  const KIT_IDS = new Set(['kit-sensor-tattoofix', 'kit', 'optical-lens-intl', 'kit-smartband-tattoofix', 'optical-lens-smartband-intl']);
  const SMARTBAND_IDS = new Set(['kit-smartband-tattoofix', 'optical-lens-smartband-intl']);

  const PT_GALLERY = [
    '/images/kit-gallery/kit-03-aplicacao.jpg',
    '/images/kit-gallery/kit-01-embalagem.jpg',
    '/images/kit-gallery/kit-02-conteudo.jpg',
    '/images/kit-gallery/kit-05-acompanha.jpg',
    '/images/kit-gallery/kit-06-antes-depois.jpg',
    '/images/kit-gallery/kit-07-beneficios.jpg'
  ];

  /** Shared photo (little/no copy) reused across locales. */
  const SHARED_APLICACAO = '/images/kit-gallery/kit-03-aplicacao.jpg';

  const EN_KIT_GALLERY = [
    '/images/kit-gallery/en/kit-03-aplicacao.jpg',
    '/images/kit-gallery/en/kit-01-embalagem.jpg',
    '/images/kit-gallery/en/kit-02-conteudo.jpg',
    '/images/kit-gallery/en/kit-05-acompanha.jpg',
    '/images/kit-gallery/en/kit-06-antes-depois.jpg',
    '/images/kit-gallery/en/kit-07-beneficios.jpg'
  ];

  const IT_KIT_GALLERY = [
    SHARED_APLICACAO,
    '/images/kit-gallery/it/kit-01-embalagem.jpg',
    '/images/kit-gallery/it/kit-02-conteudo.jpg',
    '/images/kit-gallery/it/kit-05-acompanha.jpg',
    '/images/kit-gallery/it/kit-06-antes-depois.jpg',
    '/images/kit-gallery/it/kit-07-beneficios.jpg'
  ];

  /**
   * .com / EN / IT — mesmo álbum na home, loja e checkout:
   * 5 fotos da lente + aplicação + antes/depois.
   */
  const LENS_GALLERY_EN = [
    '/images/lens-gallery/01-optical-correction-lens.png',
    '/images/lens-gallery/02-ultra-thin.png',
    '/images/lens-gallery/03-high-optical-transparency.png',
    '/images/lens-gallery/04-engineered-refraction.png',
    '/images/lens-gallery/05-whats-included.png',
    '/images/kit-gallery/en/kit-03-aplicacao.jpg',
    '/images/kit-gallery/en/kit-06-antes-depois.jpg'
  ];

  const LENS_GALLERY_IT = [
    '/images/lens-gallery/it/01-optical-correction-lens.png',
    '/images/lens-gallery/it/02-ultra-thin.png',
    '/images/lens-gallery/it/03-high-optical-transparency.png',
    '/images/lens-gallery/it/04-engineered-refraction.png',
    '/images/lens-gallery/it/05-whats-included.png',
    SHARED_APLICACAO,
    '/images/kit-gallery/it/kit-06-antes-depois.jpg'
  ];

  const LENS_GALLERY_SHARED = [
    '/images/lens-gallery/01-optical-correction-lens.png',
    '/images/lens-gallery/02-ultra-thin.png',
    '/images/lens-gallery/03-high-optical-transparency.png',
    '/images/lens-gallery/04-engineered-refraction.png',
    '/images/lens-gallery/05-whats-included.png',
    SHARED_APLICACAO,
    '/images/kit-gallery/kit-06-antes-depois.jpg'
  ];

  /** @deprecated alias */
  const KIT_ALBUM = PT_GALLERY;
  const KIT_GALLERY = PT_GALLERY;
  const EN_GALLERY = EN_KIT_GALLERY;
  const IT_GALLERY = IT_KIT_GALLERY;

  function detectLang() {
    try {
      if (window.STF_PAGE_LANG?.get) return window.STF_PAGE_LANG.get();
      if (window.STF_I18N?.getLang) return window.STF_I18N.getLang();
    } catch (_) { /* ignore */ }
    const path = String(location.pathname || '');
    if (path.includes('/it/')) return 'it';
    if (path.includes('/de/')) return 'de';
    if (path.includes('/es/')) return 'es';
    if (path.includes('/pl/')) return 'pl';
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
    return lang === 'en' || lang === 'it' || lang === 'de' || lang === 'es' || lang === 'pl';
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
    return /\/(?:site|images\/brand)\/sensortattoofix\.jpg(\?|$)/i.test(n);
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

  function isSmartbandProduct(product) {
    const id = String(product?.id || product?.slug || '').trim();
    return SMARTBAND_IDS.has(id) || /smartband/i.test(id + ' ' + (product?.name || ''));
  }

  const SMARTBAND_GALLERY_BR = [
    '/images/smartband/kit-br/01-embalagem.jpg',
    '/images/smartband/kit-br/02-conteudo.jpg',
    '/images/smartband/kit-br/03-aplicacao.jpg',
    '/images/smartband/kit-br/04-antes-depois.jpg',
    '/images/smartband/kit-br/05-lente.jpg'
  ];

  const SMARTBAND_GALLERY_EN = [
    '/images/smartband/lens-en/01-embalagem.jpg',
    '/images/smartband/lens-en/02-conteudo.jpg',
    '/images/smartband/lens-en/03-aplicacao.jpg',
    '/images/smartband/lens-en/04-antes-depois.jpg'
  ];

  const SMARTBAND_GALLERY_IT = [
    '/images/smartband/lens-it/01-embalagem.jpg',
    '/images/smartband/lens-it/02-conteudo.jpg',
    '/images/smartband/lens-it/03-aplicacao.jpg',
    '/images/smartband/lens-it/04-antes-depois.jpg'
  ];

  function smartbandAlbum(lang) {
    const l = lang || detectLang();
    if (l === 'en') return SMARTBAND_GALLERY_EN.slice();
    if (l === 'it') return SMARTBAND_GALLERY_IT.slice();
    return SMARTBAND_GALLERY_BR.slice();
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

  function localizeLensUrls(urls, lang) {
    const l = lang || detectLang();
    if (l !== 'it') return urls;
    return (urls || []).map((u) => {
      const n = normalizeUrl(u);
      // EN lens pack → IT pack
      if (/^\/(?:site|images)\/lens-gallery\/(?!it\/)/.test(n)) {
        return n.replace(/\/(?:site|images)\/lens-gallery\//, '/images/lens-gallery/it/');
      }
      return n;
    });
  }

  function resolveImages(product) {
    const fromAlbum = Array.isArray(product?.images) ? product.images : [];
    const primary = product?.image || '';
    let list = uniqueUrls([primary, ...fromAlbum].filter((u) => u && !isLegacyKitHero(u)));
    const lang = detectLang();
    // Smartband: serve própria galeria por idioma/market
    if (isSmartbandProduct(product)) {
      return uniqueUrls([...list, ...smartbandAlbum(lang)]);
    }
    // .com / EN / IT: álbum completo por idioma (IT usa fotos em italiano)
    if (isLensOnlyMarket() && (isKitProduct(product) || !list.length)) {
      return uniqueUrls(localizeLensUrls([...list, ...lensAlbum(lang)], lang));
    }
    if (list.length) return list;
    if (isKitProduct(product)) return kitAlbum();
    return kitAlbum();
  }

  function albumUiCopy() {
    const lang = detectLang();
    if (lang === 'pt') {
      return {
        prev: 'Foto anterior',
        next: 'Próxima foto',
        open: 'Ampliar foto',
        close: 'Fechar',
        photo: (n, total) => `Foto ${n} de ${total}`
      };
    }
    if (lang === 'it') {
      return {
        prev: 'Foto precedente',
        next: 'Foto successiva',
        open: 'Ingrandisci foto',
        close: 'Chiudi',
        photo: (n, total) => `Foto ${n} di ${total}`
      };
    }
    return {
      prev: 'Previous photo',
      next: 'Next photo',
      open: 'Enlarge photo',
      close: 'Close',
      photo: (n, total) => `Photo ${n} of ${total}`
    };
  }

  function renderMarkup(images, alt, extraClass) {
    const imgs = uniqueUrls(images);
    if (!imgs.length) imgs.push(kitAlbum()[0]);
    const multi = imgs.length > 1;
    const copy = albumUiCopy();
    const cls = ['stf-album', extraClass || ''].filter(Boolean).join(' ');
    const nav = multi
      ? `<button type="button" class="stf-album-btn stf-album-prev" aria-label="${escapeAttr(copy.prev)}"><span aria-hidden="true">‹</span></button>
         <button type="button" class="stf-album-btn stf-album-next" aria-label="${escapeAttr(copy.next)}"><span aria-hidden="true">›</span></button>`
      : '';
    const dots = multi
      ? `<div class="stf-album-dots" role="tablist" aria-label="${escapeAttr(copy.photo(1, imgs.length))}">${
          imgs.map((_, i) =>
            `<button type="button" class="stf-album-dot${i === 0 ? ' is-active' : ''}" role="tab" aria-selected="${i === 0 ? 'true' : 'false'}" aria-label="${escapeAttr(copy.photo(i + 1, imgs.length))}" data-index="${i}"></button>`
          ).join('')
        }</div>`
      : '';
    const fallback = escapeAttr(kitAlbum()[0]);
    return `<div class="${cls}" data-stf-album data-index="0" data-images="${escapeAttr(JSON.stringify(imgs))}">
      <img src="${escapeAttr(imgs[0])}" alt="${escapeAttr(alt || '')}" loading="lazy" decoding="async"
           class="stf-album-img" role="button" tabindex="0" aria-label="${escapeAttr(copy.open)}"
           onerror="this.onerror=null;this.src='${fallback}'">
      ${nav}
      ${dots}
    </div>`;
  }

  function escapeAttr(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;');
  }

  function parseAlbumImages(album) {
    try {
      return JSON.parse(album.getAttribute('data-images') || '[]');
    } catch (_) {
      return [];
    }
  }

  function showIndex(album, index) {
    const images = parseAlbumImages(album);
    if (!images.length) return;
    const i = ((index % images.length) + images.length) % images.length;
    album.setAttribute('data-index', String(i));
    const img = album.querySelector('img.stf-album-img, img');
    if (img) img.src = images[i];
    album.querySelectorAll('.stf-album-dot').forEach((dot, di) => {
      const on = di === i;
      dot.classList.toggle('is-active', on);
      dot.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    if (lbState.album === album) syncLightboxToIndex(i);
  }

  let lbEls = null;
  let lbState = { album: null, images: [], index: 0 };

  function ensureLightbox() {
    if (lbEls) return lbEls;
    let root = document.getElementById('stf-product-lightbox');
    const copy = albumUiCopy();
    if (!root) {
      root = document.createElement('div');
      root.id = 'stf-product-lightbox';
      root.className = 'stf-product-lightbox';
      root.hidden = true;
      root.setAttribute('aria-hidden', 'true');
      root.setAttribute('role', 'dialog');
      root.setAttribute('aria-modal', 'true');
      root.setAttribute('aria-labelledby', 'stf-lightbox-caption');
      root.innerHTML = `
        <button type="button" class="stf-lightbox-close" aria-label="${escapeAttr(copy.close)}">&times;</button>
        <button type="button" class="stf-lightbox-nav stf-lightbox-prev" aria-label="${escapeAttr(copy.prev)}"><span aria-hidden="true">‹</span></button>
        <button type="button" class="stf-lightbox-nav stf-lightbox-next" aria-label="${escapeAttr(copy.next)}"><span aria-hidden="true">›</span></button>
        <figure class="stf-lightbox-figure">
          <img id="stf-lightbox-img" src="" alt="">
          <figcaption id="stf-lightbox-caption"></figcaption>
        </figure>`;
      document.body.appendChild(root);
    } else {
      if (!root.querySelector('.stf-lightbox-prev')) {
        const prev = document.createElement('button');
        prev.type = 'button';
        prev.className = 'stf-lightbox-nav stf-lightbox-prev';
        prev.setAttribute('aria-label', copy.prev);
        prev.innerHTML = '<span aria-hidden="true">‹</span>';
        const next = document.createElement('button');
        next.type = 'button';
        next.className = 'stf-lightbox-nav stf-lightbox-next';
        next.setAttribute('aria-label', copy.next);
        next.innerHTML = '<span aria-hidden="true">›</span>';
        root.insertBefore(prev, root.querySelector('.stf-lightbox-figure') || null);
        root.insertBefore(next, root.querySelector('.stf-lightbox-figure') || null);
      }
    }
    lbEls = {
      root,
      img: root.querySelector('#stf-lightbox-img') || document.getElementById('stf-lightbox-img'),
      caption: root.querySelector('#stf-lightbox-caption') || document.getElementById('stf-lightbox-caption'),
      close: root.querySelector('.stf-lightbox-close'),
      prev: root.querySelector('.stf-lightbox-prev'),
      next: root.querySelector('.stf-lightbox-next')
    };
    lbEls.close?.addEventListener('click', (e) => {
      e.preventDefault();
      closeLightbox();
    });
    lbEls.prev?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      stepLightbox(-1);
    });
    lbEls.next?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      stepLightbox(1);
    });
    root.addEventListener('click', (e) => {
      if (e.target === root) closeLightbox();
    });
    document.addEventListener('keydown', (e) => {
      if (!root || root.hidden) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') stepLightbox(-1);
      if (e.key === 'ArrowRight') stepLightbox(1);
    });
    let ltx = 0;
    root.addEventListener('touchstart', (e) => {
      ltx = e.changedTouches?.[0]?.clientX || 0;
    }, { passive: true });
    root.addEventListener('touchend', (e) => {
      const x = e.changedTouches?.[0]?.clientX || 0;
      const d = x - ltx;
      if (Math.abs(d) < 40) return;
      stepLightbox(d < 0 ? 1 : -1);
    }, { passive: true });
    return lbEls;
  }

  function syncLightboxToIndex(i) {
    if (!lbEls || !lbState.images.length) return;
    const idx = ((i % lbState.images.length) + lbState.images.length) % lbState.images.length;
    lbState.index = idx;
    const src = lbState.images[idx];
    const copy = albumUiCopy();
    if (lbEls.img) {
      lbEls.img.src = src;
      lbEls.img.alt = copy.photo(idx + 1, lbState.images.length);
    }
    if (lbEls.caption) lbEls.caption.textContent = copy.photo(idx + 1, lbState.images.length);
    const multi = lbState.images.length > 1;
    if (lbEls.prev) lbEls.prev.hidden = !multi;
    if (lbEls.next) lbEls.next.hidden = !multi;
  }

  let lastLightboxOpenAt = 0;

  function openLightbox(album) {
    const now = Date.now();
    if (now - lastLightboxOpenAt < 450) return;
    lastLightboxOpenAt = now;
    const lb = ensureLightbox();
    if (!lb || !album) return;
    const images = parseAlbumImages(album);
    if (!images.length) return;
    const index = Number(album.getAttribute('data-index') || 0);
    lbState = { album, images, index };
    syncLightboxToIndex(index);
    lb.root.hidden = false;
    lb.root.setAttribute('aria-hidden', 'false');
    document.body.classList.add('stf-lightbox-open');
    lb.close?.focus();
  }

  function closeLightbox() {
    const lb = ensureLightbox();
    if (!lb) return;
    lb.root.hidden = true;
    lb.root.setAttribute('aria-hidden', 'true');
    if (lb.img) lb.img.removeAttribute('src');
    if (lb.caption) lb.caption.textContent = '';
    document.body.classList.remove('stf-lightbox-open');
    lbState = { album: null, images: [], index: 0 };
  }

  function stepLightbox(delta) {
    if (!lbState.album || !lbState.images.length) return;
    showIndex(lbState.album, lbState.index + delta);
  }

  function bind(root) {
    const scope = root || document;
    scope.querySelectorAll('[data-stf-album]').forEach((album) => {
      if (album.dataset.stfAlbumBound === '1') return;
      album.dataset.stfAlbumBound = '1';
      const prev = album.querySelector('.stf-album-prev');
      const next = album.querySelector('.stf-album-next');
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
      album.querySelectorAll('.stf-album-dot').forEach((dot) => {
        dot.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          showIndex(album, Number(dot.getAttribute('data-index') || 0));
        });
      });
      const img = album.querySelector('img.stf-album-img, img');
      const openFromImg = (e) => {
        if (e.target.closest?.('.stf-album-btn, .stf-album-dot')) return;
        e.preventDefault();
        e.stopPropagation();
        openLightbox(album);
      };
      img?.addEventListener('click', openFromImg);
      img?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openLightbox(album);
        }
      });
      let tx = 0;
      let moved = false;
      album.addEventListener('touchstart', (e) => {
        tx = e.changedTouches?.[0]?.clientX || 0;
        moved = false;
      }, { passive: true });
      album.addEventListener('touchmove', (e) => {
        const x = e.changedTouches?.[0]?.clientX || 0;
        if (Math.abs(x - tx) > 12) moved = true;
      }, { passive: true });
      album.addEventListener('touchend', (e) => {
        if (e.target.closest?.('.stf-album-btn, .stf-album-dot')) return;
        const x = e.changedTouches?.[0]?.clientX || 0;
        const d = x - tx;
        if (Math.abs(d) >= 40) {
          showIndex(album, Number(album.getAttribute('data-index') || 0) + (d < 0 ? 1 : -1));
          return;
        }
        if (!moved) openLightbox(album);
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

  /** SEO landings: same ←/→ album as loja, starting with the cropped application photo. */
  function seoGuideAlbum(lang) {
    const l = lang || detectLang();
    const aplicacao = '/images/kit-gallery/kit-03-aplicacao-crop.jpg';
    if (l === 'en') {
      return [
        aplicacao,
        '/images/kit-gallery/en/kit-01-embalagem.jpg',
        '/images/kit-gallery/en/kit-02-conteudo.jpg',
        '/images/kit-gallery/en/kit-05-acompanha.jpg',
        '/images/kit-gallery/en/kit-06-antes-depois.jpg',
        '/images/kit-gallery/en/kit-07-beneficios.jpg'
      ];
    }
    if (l === 'it') {
      return [
        aplicacao,
        '/images/kit-gallery/it/kit-01-embalagem.jpg',
        '/images/kit-gallery/it/kit-02-conteudo.jpg',
        '/images/kit-gallery/it/kit-05-acompanha.jpg',
        '/images/kit-gallery/it/kit-06-antes-depois.jpg',
        '/images/kit-gallery/it/kit-07-beneficios.jpg'
      ];
    }
    return [
      aplicacao,
      '/images/kit-gallery/kit-01-embalagem.jpg',
      '/images/kit-gallery/kit-02-conteudo.jpg',
      '/images/kit-gallery/kit-05-acompanha.jpg',
      '/images/kit-gallery/kit-06-antes-depois.jpg',
      '/images/kit-gallery/kit-07-beneficios.jpg'
    ];
  }

  function enhanceSeoFigures() {
    document.querySelectorAll('.seo-guide-page .seo-figure').forEach((fig) => {
      if (fig.dataset.stfSeoAlbum === '1') return;
      const existing = fig.querySelector('img');
      const label = existing?.alt || '';
      const imgs = seoGuideAlbum();
      fig.dataset.stfSeoAlbum = '1';
      fig.innerHTML = renderMarkup(imgs, label, 'stf-album--fill seo-figure-album');
      const img = fig.querySelector('img');
      if (img) {
        img.setAttribute('width', '720');
        img.setAttribute('height', '818');
      }
      const prev = fig.querySelector('.stf-album-prev');
      const next = fig.querySelector('.stf-album-next');
      if (prev) prev.setAttribute('aria-label', detectLang() === 'pt' ? 'Foto anterior' : 'Previous photo');
      if (next) next.setAttribute('aria-label', detectLang() === 'pt' ? 'Próxima foto' : 'Next photo');
      bind(fig);
    });
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
    seoGuideAlbum,
    isLensOnlyMarket,
    resolveImages,
    isKitProduct,
    renderMarkup,
    bind,
    enhanceExisting,
    enhanceSeoFigures,
    showIndex,
    openLightbox,
    closeLightbox,
    detectLang,
    syncProductAlbumToBenefits
  };

  function boot() {
    hideKitBoxIfNeeded();
    enhanceSeoFigures();
    const run = async () => {
      let product = null;
      try {
        if (window.StoreConfig?.load) {
          const cfg = await window.StoreConfig.load();
          const market = window.STF_SITE?.catalogMarket?.() || (isLensOnlyMarket() ? 'INT' : 'BR');
          const all = cfg.products?.length ? cfg.products : (cfg.product ? [cfg.product] : []);
          const filtered = window.STF_SITE?.filterProductsForMarket?.(all, market) || all;
          const active = filtered.filter((p) => p.active !== false && !p.aggregated);
          // Home/#produtos: sempre o kit smartwatch (nunca smartband, mesmo se vier primeiro no catálogo).
          product = active.find((p) => isKitProduct(p) && !isSmartbandProduct(p))
            || active.find((p) => isKitProduct(p))
            || active[0]
            || filtered[0]
            || null;
        }
      } catch (err) {
        console.warn('STF_PRODUCT_GALLERY config:', err);
      }
      const imgs = product ? resolveImages(product) : kitAlbum();
      const alt = product
        ? (window.STF_PELICULA?.productLabel?.(product) || product.nameEn || product.name || 'Sensor TattooFix')
        : (isLensOnlyMarket() ? 'SensorTattooFix Optical Lens' : 'Sensor TattooFix');
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
