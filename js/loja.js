(function () {
  function formatBRL(v) {
    return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  async function boot() {
    const grid = document.getElementById('loja-grid');
    if (!grid) return;
    try {
      const cfg = await StoreConfig.load();
      const products = cfg.products?.length ? cfg.products : (cfg.product ? [cfg.product] : []);
      if (!products.length) {
        grid.innerHTML = '<p class="conta-empty">Nenhum produto disponível no momento.</p>';
        return;
      }
      grid.innerHTML = products.map((p) => {
        const slug = p.slug || p.id || 'kit-sensor-tattoofix';
        const img = p.image || 'sensortattoofix.jpg';
        return `
          <a href="comprar.html?produto=${encodeURIComponent(slug)}" class="loja-card">
            <img src="${img}" alt="${p.name}" loading="lazy">
            <div class="loja-card-body">
              <h3>${p.name}</h3>
              <p>${p.description || ''}</p>
              <strong class="loja-price">${formatBRL(p.price)} + frete</strong>
              <span class="loja-cta">Comprar <i class="fas fa-arrow-right"></i></span>
            </div>
          </a>
        `;
      }).join('');
    } catch (e) {
      grid.innerHTML = '<p class="conta-empty">Erro ao carregar a loja.</p>';
      console.error(e);
    }
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
