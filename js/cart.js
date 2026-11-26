window.STF_CART = (function () {
  const KEY = 'stf_cart';
  const MAX_QTY = 10;
  const HOP_PARAM = 'stf_cart';

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      const items = raw ? JSON.parse(raw) : [];
      return Array.isArray(items) ? items : [];
    } catch {
      return [];
    }
  }

  function save(items) {
    localStorage.setItem(KEY, JSON.stringify(items));
    notify();
  }

  /** Compact cart payload for .com.br → .com hop (localStorage does not cross hosts). */
  function encodeHopPayload(items) {
    const list = (items || load())
      .map((i) => ({
        id: String(i.productId || i.slug || '').trim(),
        q: Math.max(1, Math.min(MAX_QTY, Math.floor(Number(i.qty) || 1)))
      }))
      .filter((i) => i.id);
    if (!list.length) return '';
    try {
      const json = JSON.stringify(list);
      return btoa(unescape(encodeURIComponent(json)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, '');
    } catch {
      return '';
    }
  }

  function decodeHopPayload(raw) {
    const s = String(raw || '').trim();
    if (!s) return [];
    try {
      const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
      const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
      const json = decodeURIComponent(escape(atob(b64 + pad)));
      const list = JSON.parse(json);
      if (!Array.isArray(list)) return [];
      return list
        .map((row) => ({
          id: String(row.id || row.productId || row.slug || '').trim(),
          q: Math.max(1, Math.min(MAX_QTY, Math.floor(Number(row.q || row.qty) || 1)))
        }))
        .filter((row) => row.id);
    } catch {
      return [];
    }
  }

  function consumeHopFromUrl() {
    let params;
    try { params = new URLSearchParams(location.search); } catch { return false; }
    const raw = params.get(HOP_PARAM);
    if (!raw) return false;
    const hopped = decodeHopPayload(raw);
    if (hopped.length) {
      const items = load();
      hopped.forEach((row) => {
        const existing = items.find((i) => i.productId === row.id || i.slug === row.id);
        if (existing) {
          existing.qty = Math.min(MAX_QTY, Math.max(existing.qty, row.q));
        } else {
          items.push({
            productId: row.id,
            slug: row.id,
            name: row.id,
            price: 0,
            image: 'images/brand/sensortattoofix.jpg',
            qty: row.q,
            models: Array.from({ length: row.q }, () => ''),
            requiresSmartwatch: true,
            deviceType: 'smartwatch'
          });
        }
      });
      save(items);
    }
    params.delete(HOP_PARAM);
    const q = params.toString();
    try {
      history.replaceState({}, '', location.pathname + (q ? '?' + q : '') + (location.hash || ''));
    } catch (_) { /* ignore */ }
    return hopped.length > 0;
  }

  /**
   * .com.br?lang=en|it|… → hop to .com with cart, avoiding mixed BRL/USD and lost cart.
   */
  function maybeHopBrLocalizedToCom() {
    try {
      if (!window.STF_SITE?.isBrHost?.()) return false;
      const lang = String(window.STF_I18N?.getLang?.() || 'pt').toLowerCase().slice(0, 2);
      if (!lang || lang === 'pt') return false;
      const leaf = String(location.pathname.split('/').pop() || '');
      if (!/^(loja|comprar)\.html$/i.test(leaf)) return false;
      const com = window.STF_SITE.COM_ORIGIN || 'https://www.sensortattoofix.com';
      const path = lang === 'en' ? `/${leaf}` : `/${lang}/${leaf}`;
      const u = new URL(path, com);
      const cur = new URLSearchParams(location.search);
      ['produto', 'comprar'].forEach((k) => {
        const v = cur.get(k);
        if (v) u.searchParams.set(k, v);
      });
      const payload = encodeHopPayload();
      if (payload) u.searchParams.set(HOP_PARAM, payload);
      location.replace(u.toString());
      return true;
    } catch {
      return false;
    }
  }

  function bootCrossHostCart() {
    if (maybeHopBrLocalizedToCom()) return;
    consumeHopFromUrl();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootCrossHostCart);
  } else {
    bootCrossHostCart();
  }

  function assetUrl(image, product) {
    if (window.STF_PRODUCT_MERGE?.resolveProductImage) {
      return window.STF_PRODUCT_MERGE.resolveProductImage(image, product);
    }
    const raw = String(image || '').trim() || 'images/brand/sensortattoofix.jpg';
    if (/^https?:\/\//i.test(raw)) return raw;
    return raw.startsWith('/') ? raw : '/' + raw.replace(/^\.\//, '');
  }

  function maxQtyFor(product) {
    if (product?.stock == null || product.stock === '') return MAX_QTY;
    const n = Number(product.stock);
    if (!Number.isFinite(n)) return MAX_QTY;
    return Math.min(MAX_QTY, Math.max(0, Math.floor(n)));
  }

  function localizedName(product) {
    return window.STF_PELICULA?.productLabel?.(product)
      || product.name
      || (window.STF_I18N?.isLocalized?.() ? 'Product' : 'Produto');
  }

  function modelsForQty(models, qty) {
    const saved = Array.isArray(models) ? models : [];
    return Array.from({ length: qty }, (_, index) => String(saved[index] || '').trim());
  }

  function normalize(product, qty) {
    const id = product.id || product.slug || 'produto';
    const cap = maxQtyFor(product);
    const stock = product.stock != null && product.stock !== '' ? Math.max(0, Math.floor(Number(product.stock) || 0)) : null;
    const normalizedQty = Math.max(1, Math.min(cap, Math.floor(Number(qty) || 1)));
    return {
      productId: id,
      slug: product.slug || id,
      name: localizedName(product),
      price: Number(product.price) || 0,
      image: assetUrl(product.image, product),
      qty: normalizedQty,
      models: modelsForQty(product.models, normalizedQty),
      stock,
      requiresSmartwatch: product.requiresSmartwatch !== false,
      deviceType: product.deviceType
        || (/smartband/i.test([product.id, product.slug, product.name, product.nameEn, product.nameIt].join(' ')) ? 'smartband' : 'smartwatch'),
      aggregated: product.aggregated === true,
      productType: product.productType,
      bandStyle: product.bandStyle,
      color: product.color,
      compatibility: product.compatibility,
      weightGrams: Number(product.weightGrams) || 0
    };
  }

  function hasProduct(product) {
    const id = product?.id || product?.slug || product?.productId || product;
    const slug = product?.slug || product?.id;
    return load().some((i) => i.productId === id || i.slug === id || (slug && (i.productId === slug || i.slug === slug)));
  }

  function add(product, qty) {
    if (!product || product.inStock === false) return load();
    const items = load();
    const line = normalize(product, qty);
    const idx = items.findIndex((i) => i.productId === line.productId);
    const cap = maxQtyFor(product);
    if (idx >= 0) {
      const current = items[idx];
      const currentModels = modelsForQty(current.models, current.qty);
      const currentQty = Math.min(cap, current.qty);
      const addedQty = Math.min(line.qty, Math.max(0, cap - currentQty));
      current.qty = currentQty + addedQty;
      current.models = modelsForQty([...currentModels.slice(0, currentQty), ...line.models.slice(0, addedQty)], current.qty);
    } else {
      items.push(line);
    }
    save(items);
    return items;
  }

  function setQty(productId, qty, product) {
    let items = load();
    const n = Math.floor(Number(qty) || 0);
    const cap = product ? maxQtyFor(product) : MAX_QTY;
    if (n <= 0) {
      items = items.filter((i) => i.productId !== productId);
    } else {
      items = items.map((i) => (
        i.productId === productId
          ? { ...i, qty: Math.min(cap, n), models: modelsForQty(i.models, Math.min(cap, n)) }
          : i
      ));
    }
    save(items);
    return items;
  }

  function setModels(productId, models) {
    const items = load().map((item) => (
      item.productId === productId
        ? { ...item, models: modelsForQty(models, item.qty) }
        : item
    ));
    save(items);
    return items;
  }

  function remove(productId) {
    const items = load().filter((i) => i.productId !== productId);
    save(items);
    return items;
  }

  function clear() {
    localStorage.removeItem(KEY);
    notify();
  }

  function isEmpty() {
    return load().length === 0;
  }

  function count() {
    return load().reduce((sum, i) => sum + i.qty, 0);
  }

  function subtotal() {
    return load().reduce((sum, i) => sum + i.price * i.qty, 0);
  }

  function totalWeight() {
    return load().reduce((sum, i) => sum + (Number(i.weightGrams) || 0) * i.qty, 0);
  }

  function requiresSmartwatch() {
    return load().some((i) => i.requiresSmartwatch !== false);
  }

  function syncPrices(catalog) {
    const list = Array.isArray(catalog) ? catalog : [];
    if (!list.length) return load();
    const byId = new Map();
    list.forEach((p) => {
      const k = String(p.id || p.slug || '').trim();
      if (k) byId.set(k, p);
    });
    let changed = false;
    const items = load().map((item) => {
      const p = byId.get(item.productId) || byId.get(item.slug);
      if (!p) return item;
      const price = Number(p.price) || 0;
      const name = localizedName(p) || item.name;
      if (price === item.price && name === item.name) return item;
      changed = true;
      return { ...item, price, name };
    });
    if (changed) save(items);
    return items;
  }

  function syncHomeCartNav() {
    const n = count();
    document.querySelectorAll('[data-home-cart-nav]').forEach((link) => {
      const lojaHref = link.getAttribute('data-loja-href') || 'loja.html';
      const cartHref = link.getAttribute('data-cart-href') || 'comprar.html';
      link.setAttribute('href', n > 0 ? cartHref : lojaHref);
      const label = link.querySelector('.btn-nav-label');
      const emptyLabel = link.getAttribute('data-label-empty');
      const filledLabel = link.getAttribute('data-label-cart');
      if (label && emptyLabel && filledLabel) {
        label.textContent = n > 0 ? filledLabel : emptyLabel;
      }
      const title = n > 0
        ? (link.getAttribute('data-title-cart') || filledLabel || 'Carrinho')
        : (link.getAttribute('data-title-empty') || emptyLabel || 'Loja');
      link.setAttribute('title', title);
      link.setAttribute('aria-label', title);
    });
  }

  function notify() {
    window.dispatchEvent(new CustomEvent('stf-cart-updated', { detail: { count: count() } }));
    const n = count();
    document.querySelectorAll('[data-cart-badge]').forEach((el) => {
      el.textContent = String(n);
      el.hidden = n === 0;
    });
    syncHomeCartNav();
  }

  function initBadges() {
    notify();
  }

  return {
    load,
    add,
    setQty,
    setModels,
    remove,
    hasProduct,
    clear,
    isEmpty,
    count,
    subtotal,
    totalWeight,
    requiresSmartwatch,
    syncPrices,
    initBadges,
    encodeHopPayload,
    decodeHopPayload,
    consumeHopFromUrl,
    maybeHopBrLocalizedToCom
  };
})();
