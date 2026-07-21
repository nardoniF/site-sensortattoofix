window.STF_CART = (function () {
  const KEY = 'stf_cart';
  const MAX_QTY = 10;

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

  function assetUrl(image, product) {
    if (window.STF_PRODUCT_MERGE?.resolveProductImage) {
      return window.STF_PRODUCT_MERGE.resolveProductImage(image, product);
    }
    const raw = String(image || '').trim() || 'site/sensortattoofix.jpg';
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

  function normalize(product, qty) {
    const id = product.id || product.slug || 'produto';
    const cap = maxQtyFor(product);
    const stock = product.stock != null && product.stock !== '' ? Math.max(0, Math.floor(Number(product.stock) || 0)) : null;
    return {
      productId: id,
      slug: product.slug || id,
      name: localizedName(product),
      price: Number(product.price) || 0,
      image: assetUrl(product.image, product),
      qty: Math.max(1, Math.min(cap, Number(qty) || 1)),
      stock,
      requiresSmartwatch: product.requiresSmartwatch !== false,
      aggregated: product.aggregated === true,
      productType: product.productType,
      bandStyle: product.bandStyle,
      color: product.color,
      compatibility: product.compatibility,
      weightGrams: Number(product.weightGrams) || 0
    };
  }

  function add(product, qty) {
    if (!product || product.inStock === false) return load();
    const items = load();
    const line = normalize(product, qty);
    const idx = items.findIndex((i) => i.productId === line.productId);
    const cap = maxQtyFor(product);
    if (idx >= 0) {
      items[idx].qty = Math.min(cap, items[idx].qty + line.qty);
    } else {
      items.push(line);
    }
    save(items);
    return items;
  }

  function setQty(productId, qty, product) {
    let items = load();
    const n = Number(qty) || 0;
    const cap = product ? maxQtyFor(product) : MAX_QTY;
    if (n <= 0) {
      items = items.filter((i) => i.productId !== productId);
    } else {
      items = items.map((i) => (
        i.productId === productId ? { ...i, qty: Math.min(cap, n) } : i
      ));
    }
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

  function notify() {
    window.dispatchEvent(new CustomEvent('stf-cart-updated', { detail: { count: count() } }));
    document.querySelectorAll('[data-cart-badge]').forEach((el) => {
      const n = count();
      el.textContent = String(n);
      el.hidden = n === 0;
    });
  }

  function initBadges() {
    notify();
  }

  return {
    load,
    add,
    setQty,
    remove,
    clear,
    isEmpty,
    count,
    subtotal,
    totalWeight,
    requiresSmartwatch,
    syncPrices,
    initBadges
  };
})();
