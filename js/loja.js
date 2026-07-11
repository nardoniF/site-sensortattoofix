(function () {
  let products = [];

  function L(key, vars) {
    return window.STF_I18N?.t(key, vars) || key;
  }

  function isEn() {
    return window.STF_I18N?.isEn?.() || false;
  }

  function comprarHref(slug) {
    const base = window.STF_I18N?.comprarPageHref?.() || 'comprar.html';
    return `${base}?produto=${encodeURIComponent(slug)}&comprar=1`;
  }

  function formatBRL(v) {
    return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  async function localizedPriceLine(price) {
    const frete = L('store.frete');
    if (!window.STF_I18N?.isLocalized?.() || !window.STF_MONEY) {
      return `${formatBRL(price)} + ${frete}`;
    }
    try {
      const cfg = await StoreConfig.load();
      const text = await window.STF_MONEY.formatForVisitor(price, cfg);
      return `${text} + ${frete}`;
    } catch {
      return `${formatBRL(price)} + ${frete}`;
    }
  }

  async function applyLocalizedPrices() {
    const nodes = document.querySelectorAll('.loja-price[data-price-brl]');
    if (!nodes.length) return;
    await Promise.all([...nodes].map(async (el) => {
      const price = Number(el.getAttribute('data-price-brl'));
      el.textContent = await localizedPriceLine(price);
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

  function renderGrid() {
    const grid = document.getElementById('loja-grid');
    if (!grid) return;
    if (!products.length) {
      grid.innerHTML = `<p class="conta-empty">${escapeHtml(L('store.empty'))}</p>`;
      return;
    }
    grid.innerHTML = products.map((p) => {
      const slug = p.slug || p.id || 'kit-sensor-tattoofix';
      const rawImg = p.image || 'site/sensortattoofix.jpg';
      const img = window.STF_PRODUCT_MERGE?.resolveProductImage
        ? window.STF_PRODUCT_MERGE.resolveProductImage(rawImg, p)
        : (/^https?:\/\//i.test(rawImg) ? rawImg : (rawImg.startsWith('/') ? rawImg : '/' + rawImg.replace(/^\.\//, '')));
      const frete = L('store.frete');
      return `
        <article class="loja-card">
          <img src="${escapeHtml(img)}" alt="${escapeHtml(p.name)}" loading="lazy" onerror="this.onerror=null;this.src='/site/sensortattoofix.jpg'">
          <div class="loja-card-body">
            <h3>${escapeHtml(p.name)}</h3>
            <p>${escapeHtml(p.description || '')}</p>
            <strong class="loja-price" data-price-brl="${p.price}">${formatBRL(p.price)} + ${frete}</strong>
            <div class="loja-card-actions">
              <button type="button" class="btn-secondary loja-btn-add" data-slug="${escapeHtml(slug)}">
                <i class="fas fa-cart-plus"></i> ${escapeHtml(L('store.add'))}
              </button>
              <a href="${comprarHref(slug)}" class="btn-primary loja-btn-buy">
                ${escapeHtml(L('store.buy'))} <i class="fas fa-arrow-right"></i>
              </a>
            </div>
          </div>
        </article>
      `;
    }).join('');

    grid.querySelectorAll('.loja-btn-add').forEach((btn) => {
      btn.addEventListener('click', () => {
        const p = findProduct(btn.getAttribute('data-slug'));
        if (!p) return;
        if (p.inStock === false) {
          flash(L('store.outOfStock'));
          return;
        }
        window.STF_CART.add(p, 1);
        flash(L('store.addedName', { name: p.name }));
      });
    });
  }

  async function boot() {
    try {
      window.STF_I18N?.applyLojaDom?.();
      const cfg = await StoreConfig.load();
      const all = cfg.products?.length ? cfg.products : (cfg.product ? [cfg.product] : []);
      products = window.STF_PELICULA?.listStorefront(all)
        ?? all.filter((p) => p.active !== false && p.inStock !== false && p.aggregated !== true);
      window.STF_CART?.syncPrices?.(all);
      window.STF_CART?.initBadges();
      window.STF_STORE_PRICE?.apply(cfg);
      renderGrid();
      applyLocalizedPrices();
    } catch (e) {
      const grid = document.getElementById('loja-grid');
      if (grid) grid.innerHTML = `<p class="conta-empty">${escapeHtml(L('store.errorLoad'))}</p>`;
      console.error(e);
    }
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
