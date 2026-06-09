(function () {
  let products = [];

  function formatBRL(v) {
    return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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
      grid.innerHTML = '<p class="conta-empty">Nenhum produto disponível no momento.</p>';
      return;
    }
    grid.innerHTML = products.map((p) => {
      const slug = p.slug || p.id || 'kit-sensor-tattoofix';
      const img = p.image || 'sensortattoofix.jpg';
      return `
        <article class="loja-card">
          <img src="${escapeHtml(img)}" alt="${escapeHtml(p.name)}" loading="lazy">
          <div class="loja-card-body">
            <h3>${escapeHtml(p.name)}</h3>
            <p>${escapeHtml(p.description || '')}</p>
            <strong class="loja-price">${formatBRL(p.price)} + frete</strong>
            <div class="loja-card-actions">
              <button type="button" class="btn-secondary loja-btn-add" data-slug="${escapeHtml(slug)}">
                <i class="fas fa-cart-plus"></i> Adicionar
              </button>
              <a href="comprar.html?produto=${encodeURIComponent(slug)}&comprar=1" class="btn-primary loja-btn-buy">
                Comprar <i class="fas fa-arrow-right"></i>
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
        window.STF_CART.add(p, 1);
        flash(p.name + ' adicionado ao carrinho');
      });
    });
  }

  async function boot() {
    try {
      const cfg = await StoreConfig.load();
      products = cfg.products?.length ? cfg.products : (cfg.product ? [cfg.product] : []);
      window.STF_CART?.initBadges();
      renderGrid();
    } catch (e) {
      const grid = document.getElementById('loja-grid');
      if (grid) grid.innerHTML = '<p class="conta-empty">Erro ao carregar a loja.</p>';
      console.error(e);
    }
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
