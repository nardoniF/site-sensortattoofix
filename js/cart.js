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

  function assetUrl(image) {
    const raw = String(image || '').trim() || 'site/sensortattoofix.jpg';
    if (/^https?:\/\//i.test(raw)) return raw;
    return raw.startsWith('/') ? raw : '/' + raw.replace(/^\.\//, '');
  }

  function normalize(product, qty) {
    const id = product.id || product.slug || 'produto';
    return {
      productId: id,
      slug: product.slug || id,
      name: product.name || 'Produto',
      price: Number(product.price) || 0,
      image: assetUrl(product.image),
      qty: Math.max(1, Math.min(MAX_QTY, Number(qty) || 1)),
      requiresSmartwatch: product.requiresSmartwatch !== false,
      aggregated: product.aggregated === true,
      weightGrams: Number(product.weightGrams) || 0
    };
  }

  function add(product, qty) {
    if (!product) return load();
    const items = load();
    const line = normalize(product, qty);
    const idx = items.findIndex((i) => i.productId === line.productId);
    if (idx >= 0) {
      items[idx].qty = Math.min(MAX_QTY, items[idx].qty + line.qty);
    } else {
      items.push(line);
    }
    save(items);
    return items;
  }

  function setQty(productId, qty) {
    let items = load();
    const n = Number(qty) || 0;
    if (n <= 0) {
      items = items.filter((i) => i.productId !== productId);
    } else {
      items = items.map((i) => (
        i.productId === productId ? { ...i, qty: Math.min(MAX_QTY, n) } : i
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
    initBadges
  };
})();
