(function () {
  const VENDA_KEY = 'stf_venda_registrada';

  function canTrack() {
    return typeof window.gtag === 'function';
  }

  function track(evento, dados) {
    if (!canTrack()) return;
    window.gtag('event', evento, dados || {});
  }

  function trackVenda(orderId, total, pagamento) {
    if (!orderId || !canTrack()) return;
    const key = VENDA_KEY + ':' + orderId;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');

    const valor = Number(total) || 0;
    const forma = pagamento === 'credit_card' || pagamento === 'cartao' ? 'cartao' : 'pix';

    track('venda_confirmada', {
      pedido: orderId,
      valor,
      moeda: 'BRL',
      pagamento: forma
    });
  }

  function detectarCliqueCompra(href) {
    if (!href) return null;
    if (href.includes('mercadolivre')) return 'clique_mercado_livre';
    if (href.includes('amazon.')) return 'clique_amazon';
    if (href.includes('shopee')) return 'clique_shopee';
    if (href.includes('comprar.html')) return 'clique_loja_oficial';
    if (href.includes('#onde-comprar')) return 'clique_onde_comprar';
    if (href.includes('wa.me') || href.includes('whatsapp')) return 'clique_whatsapp';
    return null;
  }

  function iniciarRastreamentoSite() {
    document.addEventListener('click', function (e) {
      const alvo = e.target.closest('[data-evento], a[href]');
      if (!alvo) return;

      const eventoFixo = alvo.getAttribute('data-evento');
      const evento = eventoFixo || detectarCliqueCompra(alvo.href || alvo.getAttribute('href') || '');
      if (!evento) return;

      const texto = (alvo.getAttribute('data-rotulo') || alvo.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80);
      track(evento, {
        texto_botao: texto,
        pagina: document.title || location.pathname
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciarRastreamentoSite);
  } else {
    iniciarRastreamentoSite();
  }

  window.STF_ANALYTICS = { track, trackVenda, trackPurchase: trackVenda };
})();
