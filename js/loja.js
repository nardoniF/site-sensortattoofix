(function () {
  let products = [];

  function L(key, vars) {
    return window.STF_I18N?.t(key, vars) || key;
  }

  function isEn() {
    return window.STF_I18N?.isEn?.() || false;
  }

  function cartHasItems() {
    return !window.STF_CART?.isEmpty?.();
  }

  function comprarHref(slug) {
    const base = window.STF_I18N?.comprarPageHref?.() || 'comprar.html';
    // Cart already has items: add this SKU, never replace the cart.
    const flag = cartHasItems() ? '0' : '1';
    return `${base}?produto=${encodeURIComponent(slug)}&comprar=${flag}`;
  }

  function formatBRL(v) {
    return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  /** store.frete already includes "+" ("+ frete") — never prefix another "+". */
  function freteSuffix() {
    const frete = String(L('store.frete') || '+ frete').trim();
    if (!frete) return '+ frete';
    return /^\+/.test(frete) ? frete : `+ ${frete}`;
  }

  function priceWithFrete(priceText) {
    return `${priceText} ${freteSuffix()}`;
  }

  async function localizedPriceLine(productOrPrice) {
    const product = productOrPrice && typeof productOrPrice === 'object' ? productOrPrice : null;
    const price = product ? (Number(product.price) || 0) : Number(productOrPrice) || 0;
    // .com.br is always BRL catalog — even with ?lang=en (hop to .com handles EN storefront).
    if (!window.STF_I18N?.isLocalized?.() || !window.STF_MONEY || window.STF_SITE?.isBrHost?.()) {
      return priceWithFrete(formatBRL(price));
    }
    try {
      const cfg = await StoreConfig.load();
      const text = product && window.STF_MONEY.formatProductForVisitor
        ? await window.STF_MONEY.formatProductForVisitor(product, cfg)
        : await window.STF_MONEY.formatForVisitor(price, cfg);
      return priceWithFrete(text);
    } catch {
      return priceWithFrete(formatBRL(price));
    }
  }

  async function applyLocalizedPrices(catalog) {
    const list = catalog || products;
    const nodes = document.querySelectorAll('.loja-price[data-product-id], .loja-price[data-price-brl]');
    if (!nodes.length) return;
    await Promise.all([...nodes].map(async (el) => {
      const pid = el.getAttribute('data-product-id');
      const p = pid ? list.find((x) => x.id === pid || x.slug === pid) : null;
      const price = Number(el.getAttribute('data-price-brl'));
      el.textContent = await localizedPriceLine(p || price);
    }));
  }

  function escapeHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  }

  function findProduct(slug) {
    return products.find((p) => p.slug === slug || p.id === slug);
  }

  function flash(msg) {
    let el = document.getElementById('loja-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'loja-toast';
      el.className = 'loja-toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(flash._t);
    flash._t = setTimeout(() => el.classList.remove('show'), 2200);
  }

  function ensureStickyCart() {
    let el = document.getElementById('lojaStickyCart');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'lojaStickyCart';
    el.className = 'loja-sticky-cart';
    el.setAttribute('role', 'region');
    el.setAttribute('aria-label', L('store.stickyCart', { n: 0 }));
    el.hidden = true;
    el.innerHTML =
      '<div class="loja-sticky-cart-inner">' +
        '<span class="loja-sticky-cart-label" data-sticky-label></span>' +
        '<a class="loja-sticky-cart-cta btn-primary" data-sticky-cta href="comprar.html"></a>' +
      '</div>';
    document.body.appendChild(el);
    return el;
  }

  function refreshStickyCart() {
    const n = window.STF_CART?.count?.() || 0;
    const el = ensureStickyCart();
    const label = el.querySelector('[data-sticky-label]');
    const cta = el.querySelector('[data-sticky-cta]');
    const text = L('store.stickyCart', { n });
    if (label) label.textContent = text;
    if (cta) {
      cta.textContent = L('store.stickyCheckout');
      cta.setAttribute('href', window.STF_I18N?.comprarPageHref?.() || 'comprar.html');
    }
    el.setAttribute('aria-label', `${text} · ${L('store.stickyCheckout')}`);
    el.hidden = n < 1;
    document.body.classList.toggle('loja-has-sticky-cart', n > 0);
  }

  function renderGrid() {
    const grid = document.getElementById('loja-grid');
    if (!grid) return;
    if (!products.length) {
      grid.innerHTML = `<p class="conta-empty">${escapeHtml(L('store.empty'))}</p>`;
      return;
    }
    grid.innerHTML = products.map((p) => {
      const slug = p.slug || p.id || 'kit-sensor-tattoofix';
      const label = window.STF_PELICULA?.productLabel?.(p)
        || (window.STF_I18N?.isLocalized?.() ? (p.nameEn || p.name) : p.name);
      const desc = window.STF_PELICULA?.productDescription?.(p)
        || (window.STF_I18N?.isLocalized?.() && !window.STF_I18N?.isIt?.() ? (p.descriptionEn || p.description) : p.description)
        || '';
      const rawImg = p.image || 'images/brand/sensortattoofix.jpg';
      const img = window.STF_PRODUCT_MERGE?.resolveProductImage
        ? window.STF_PRODUCT_MERGE.resolveProductImage(rawImg, p)
        : (/^https?:\/\//i.test(rawImg) ? rawImg : (rawImg.startsWith('/') ? rawImg : '/' + rawImg.replace(/^\.\//, '')));
      const albumImgs = window.STF_PRODUCT_GALLERY?.resolveImages?.(p) || [img];
      const media = window.STF_PRODUCT_GALLERY?.renderMarkup
        ? window.STF_PRODUCT_GALLERY.renderMarkup(albumImgs, label, 'loja-card-album')
        : `<img src="${escapeHtml(img)}" alt="${escapeHtml(label)}" loading="lazy" onerror="this.onerror=null;this.src='/images/brand/sensortattoofix.jpg'">`;
      return `
        <article class="loja-card" data-product-slug="${escapeHtml(slug)}" id="loja-produto-${escapeHtml(slug)}">
          ${media}
          <div class="loja-card-body">
            <h3>${escapeHtml(label)}</h3>
            <p>${escapeHtml(desc)}</p>
            <strong class="loja-price" data-product-id="${escapeHtml(slug)}" data-price-brl="${p.price}">${escapeHtml(priceWithFrete(formatBRL(p.price)))}</strong>
            <span class="store-rating" aria-label="${escapeHtml(L('store.ratingAria'))}">
              <span class="store-rating-stars" aria-hidden="true">★★★★★</span>
              <strong class="store-rating-score">${escapeHtml(L('store.ratingScore'))}</strong>
              <span class="store-rating-count">${escapeHtml(L('store.ratingCount'))}</span>
            </span>
            <div class="loja-card-actions">
              <button type="button" class="btn-secondary loja-btn-add" data-slug="${escapeHtml(slug)}">
                <i class="fas fa-cart-plus"></i> ${escapeHtml(L('store.add'))}
              </button>
              <a href="${comprarHref(slug)}" class="btn-primary loja-btn-buy" data-slug="${escapeHtml(slug)}" ${cartHasItems() ? 'hidden' : ''}>
                ${escapeHtml(L('store.buy'))} <i class="fas fa-arrow-right"></i>
              </a>
            </div>
          </div>
        </article>
      `;
    }).join('');

    window.STF_PRODUCT_GALLERY?.bind?.(grid);

    grid.querySelectorAll('.loja-btn-add').forEach((btn) => {
      btn.addEventListener('click', () => {
        const p = findProduct(btn.getAttribute('data-slug'));
        if (!p) return;
        if (p.inStock === false) {
          flash(L('store.outOfStock'));
          return;
        }
        window.STF_CART.add(p, 1);
        const prev = btn.innerHTML;
        btn.classList.add('is-added');
        btn.disabled = true;
        btn.innerHTML = `<i class="fas fa-check" aria-hidden="true"></i> ${escapeHtml(L('store.addedBtn'))}`;
        clearTimeout(btn._addedT);
        btn._addedT = setTimeout(() => {
          btn.classList.remove('is-added');
          btn.disabled = false;
          btn.innerHTML = prev;
        }, 1600);
        refreshBuyButtons();
      });
    });

    // Put the product in the cart before navigating — checkout used to bounce
    // empty carts back to loja when URL seed ran too late / boot threw early.
    grid.querySelectorAll('.loja-btn-buy').forEach((link) => {
      link.addEventListener('click', () => {
        try {
          const slug = link.getAttribute('data-slug')
            || new URL(link.getAttribute('href') || '', location.href).searchParams.get('produto');
          const p = findProduct(slug);
          if (p && p.inStock !== false && !window.STF_CART?.hasProduct?.(p)) {
            window.STF_CART.add(p, 1);
          }
        } catch (e) {
          console.warn('Buy cart seed', e);
        }
      });
    });
  }

  function refreshBuyButtons() {
    document.querySelectorAll('.loja-btn-buy').forEach((link) => {
      const slug = link.getAttribute('data-slug');
      if (!slug) return;
      link.setAttribute('href', comprarHref(slug));
      link.hidden = cartHasItems();
    });
    refreshStickyCart();
  }

  function isSmartbandProduct(p) {
    if (window.STF_PRODUCT_GALLERY?.isSmartbandProduct) {
      return window.STF_PRODUCT_GALLERY.isSmartbandProduct(p);
    }
    const id = String(p?.id || p?.slug || '');
    return /smartband/i.test(id + ' ' + (p?.name || ''));
  }

  function isFlagshipProduct(p) {
    const id = String(p?.id || p?.slug || '');
    if (isSmartbandProduct(p)) return false;
    return id === 'kit-sensor-tattoofix' || id === 'kit' || id === 'optical-lens-intl'
      || /optical.?lens/i.test(id);
  }

  /** Hero CTA price = Optical Lens / kit smartwatch — keep that card first in the grid. */
  function sortFlagshipFirst(list) {
    return [...(list || [])].sort((a, b) => {
      const af = isFlagshipProduct(a) ? 0 : (isSmartbandProduct(a) ? 2 : 1);
      const bf = isFlagshipProduct(b) ? 0 : (isSmartbandProduct(b) ? 2 : 1);
      return af - bf;
    });
  }

  /** Never mix INT (.com) products into BR (.com.br) — and vice versa. */
  function filterStorefront(all) {
    let list;
    if (window.STF_PELICULA?.listStorefront) {
      list = window.STF_PELICULA.listStorefront(all);
    } else {
      const market = window.STF_SITE?.catalogMarket?.() || window.STF_PAGE_LANG?.catalogMarket?.() || 'BR';
      if (window.STF_SITE?.filterProductsForMarket) {
        list = window.STF_SITE.filterProductsForMarket(all, market)
          .filter((p) => p.active !== false && p.inStock !== false && p.aggregated !== true);
      } else {
        const isIntl = market === 'INT';
        list = (all || []).filter((p) => {
          if (p.active === false || p.inStock === false || p.aggregated === true) return false;
          const markets = Array.isArray(p.markets)
            ? p.markets.map((m) => String(m || '').toUpperCase()).filter(Boolean)
            : [];
          const id = String(p.id || p.slug || '');
          if (markets.length) return isIntl ? markets.includes('INT') : markets.includes('BR');
          if (/optical.?lens|lens-intl/i.test(id)) return isIntl;
          if (id === 'kit-sensor-tattoofix' || id === 'kit') return !isIntl;
          return !isIntl;
        });
      }
    }
    return sortFlagshipFirst(list);
  }

  function featuredSlugFromUrl() {
    try {
      return String(new URLSearchParams(location.search).get('produto') || '').trim();
    } catch {
      return '';
    }
  }

  function highlightFeaturedProduct() {
    const slug = featuredSlugFromUrl();
    if (!slug) return;
    const card = document.getElementById(`loja-produto-${slug}`)
      || document.querySelector(`[data-product-slug="${CSS.escape(slug)}"]`);
    if (!card) return;
    card.classList.add('loja-card--featured');
    requestAnimationFrame(() => {
      try {
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } catch (_) { /* ignore */ }
    });
  }

  async function boot() {
    try {
      window.STF_I18N?.applyLojaDom?.();
      const cfg = await StoreConfig.load();
      const all = cfg.products?.length ? cfg.products : (cfg.product ? [cfg.product] : []);
      products = filterStorefront(all);
      window.STF_CART?.syncPrices?.(all);
      window.STF_CART?.initBadges();
      window.STF_STORE_PRICE?.apply(cfg);
      renderGrid();
      highlightFeaturedProduct();
      refreshStickyCart();
      window.addEventListener('stf-cart-updated', refreshBuyButtons);
      applyLocalizedPrices(products);
    } catch (e) {
      const grid = document.getElementById('loja-grid');
      if (grid) grid.innerHTML = `<p class="conta-empty">${escapeHtml(L('store.errorLoad'))}</p>`;
      console.error(e);
    }
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
