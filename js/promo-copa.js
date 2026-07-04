/**
 * Banner promo Copa — 20% OFF jogo do Brasil (cupom BRASIL20).
 * Só em páginas PT; ocultável por sessão.
 */
(function () {
  const PROMO = {
    code: 'BRASIL20',
    endAt: '2026-07-31T23:59:59-03:00',
    dismissKey: 'stf_promo_copa_dismiss'
  };

  function langPrefix() {
    if (location.pathname.includes('/en/') || location.pathname.includes('/it/')) return null;
    return location.pathname.includes('/it/') || location.pathname.includes('/en/') ? '../' : '';
  }

  function isActive() {
    if (!langPrefix() && (location.pathname.includes('/en/') || location.pathname.includes('/it/'))) {
      return false;
    }
    if (location.pathname.includes('/en/') || location.pathname.includes('/it/')) return false;
    if (/admin\.html|pedidos\.html|documentacao\.html|imprimir-etiqueta/i.test(location.pathname)) {
      return false;
    }
    try {
      if (sessionStorage.getItem(PROMO.dismissKey) === '1') return false;
    } catch (_) { /* ignore */ }
    return Date.now() < new Date(PROMO.endAt).getTime();
  }

  function checkoutHref() {
    const p = langPrefix();
    return `${p}comprar.html?cupom=${encodeURIComponent(PROMO.code)}`;
  }

  function buildBanner() {
    const bar = document.createElement('div');
    bar.className = 'stf-promo-copa';
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', 'Promoção Copa do Mundo');
    bar.innerHTML = `
      <div class="stf-promo-copa-inner container">
        <div class="stf-promo-copa-text">
          <span class="stf-promo-copa-emoji" aria-hidden="true">🇧🇷</span>
          <p class="stf-promo-copa-title">Jogo do Brasil — <strong>20% OFF</strong> na loja oficial</p>
          <p class="stf-promo-copa-sub">Use o cupom <code>${PROMO.code}</code> no checkout</p>
        </div>
        <div class="stf-promo-copa-actions">
          <a href="${checkoutHref()}" class="stf-promo-copa-cta btn-primary">Aproveitar desconto</a>
          <button type="button" class="stf-promo-copa-close" aria-label="Fechar promoção"><i class="fas fa-times"></i></button>
        </div>
      </div>
    `;

    bar.querySelector('.stf-promo-copa-close')?.addEventListener('click', () => {
      try { sessionStorage.setItem(PROMO.dismissKey, '1'); } catch (_) { /* ignore */ }
      bar.remove();
      document.body.classList.remove('stf-promo-copa-visible');
    });

    bar.querySelector('.stf-promo-copa-cta')?.addEventListener('click', () => {
      window.STF_ANALYTICS?.track?.('promo_copa_clique', { cupom: PROMO.code });
    });

    return bar;
  }

  function init() {
    if (!isActive()) return;
    if (document.getElementById('stf-promo-copa')) return;
    const bar = buildBanner();
    bar.id = 'stf-promo-copa';
    document.body.prepend(bar);
    document.body.classList.add('stf-promo-copa-visible');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.STF_PROMO_COPA = { code: PROMO.code, checkoutHref };
})();
