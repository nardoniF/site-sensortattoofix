(function () {
  const VENDA_KEY = 'stf_venda_registrada';
  const FORMSUBMIT_EMAIL = 'sensortattoofix@gmail.com';
  const LOJAS_COMPRA = new Set(['mercado_livre', 'shopee', 'tiktok_shop', 'amazon', 'loja_oficial']);
  const EVENTO_COMPRA = /onde_comprar|loja_oficial|mercado_livre|shopee|tiktok_shop|amazon/;

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
    const forma = pagamento === 'paypal' ? 'paypal'
      : (pagamento === 'credit_card' || pagamento === 'cartao' ? 'cartao' : 'pix');

    track('purchase', {
      transaction_id: orderId,
      value: valor,
      currency: 'BRL',
      pagamento: forma
    });
    track('venda_confirmada', {
      pedido: orderId,
      valor,
      moeda: 'BRL',
      pagamento: forma
    });
  }

  function normalizarTexto(s) {
    return String(s || '').trim().replace(/\s+/g, ' ').slice(0, 100);
  }

  function hrefAbsoluto(href) {
    if (!href) return '';
    try {
      return new URL(href, location.href).href;
    } catch {
      return href;
    }
  }

  function detectarSecao(el) {
    const wrap = el.closest('[data-secao]');
    if (wrap) return wrap.getAttribute('data-secao');

    const section = el.closest('section[id]');
    if (section?.id) return section.id;

    if (el.closest('header')) return 'header';
    if (el.closest('footer, .site-footer')) return 'footer';
    if (el.closest('.site-trust-bar')) return 'faixa_compra';
    if (el.closest('.hero')) return 'hero';
    if (el.closest('.whatsapp-float')) return 'whatsapp_flutuante';
    if (el.closest('.checkout-main')) return 'checkout';
    if (el.closest('.loja-main, .loja-page')) return 'loja';
    if (el.closest('#conta-login, #conta-panel')) return 'minha_conta';
    if (el.closest('.contact-box')) return 'contato';
    if (el.closest('.nav-panel')) return 'menu';
    if (el.closest('.stores-layout')) return 'onde-comprar';
    if (el.closest('.loja-hero')) return 'loja_intro';
    if (el.closest('.loja-card')) return 'loja_produto';

    return 'pagina';
  }

  function classificarDestino(href, el) {
    if (!href || href === '#') {
      if (el?.classList?.contains('logo-img-link')) return 'logo';
      return 'ancora';
    }
    const h = href.toLowerCase();
    if (h.includes('mercadolivre')) return 'mercado_livre';
    if (h.includes('amazon.')) return 'amazon';
    if (h.includes('shopee')) return 'shopee';
    if (h.includes('tiktok_shop') || h.includes('vt.tiktok.com')) return 'tiktok_shop';
    if (h.includes('tiktok.com')) return 'tiktok';
    if (h.includes('instagram.com')) return 'instagram';
    if (h.includes('youtube.com') || h.includes('youtu.be')) return 'youtube';
    if (h.includes('facebook.com')) return 'facebook';
    if (h.includes('wa.me') || h.includes('whatsapp')) return 'whatsapp';
    if (h.includes('loja.html')) return 'loja_oficial';
    if (h.includes('comprar.html')) return 'checkout';
    if (h.includes('minha-conta')) return 'minha_conta';
    if (h.includes('index.html') || h.endsWith('/en/') || h.endsWith('/')) return 'home';
    if (h.startsWith('#') || h.includes('#')) return 'ancora';
    if (h.includes('formsubmit.co') || h.startsWith('mailto:') || h.startsWith('tel:')) return 'contato';
    try {
      const url = new URL(href, location.href);
      if (url.origin !== location.origin) return 'externo';
      return 'interno';
    } catch {
      return 'outro';
    }
  }

  function rotuloElemento(el) {
    const fixo = el.getAttribute('data-rotulo');
    if (fixo) return normalizarTexto(fixo);

    const aria = el.getAttribute('aria-label');
    if (aria) return normalizarTexto(aria);

    const title = el.getAttribute('title');
    if (title) return normalizarTexto(title);

    if (el.classList.contains('nav-lang')) return 'Troca idioma';
    if (el.classList.contains('logo-img-link')) return 'Logo';
    if (el.classList.contains('whatsapp-float')) return 'WhatsApp flutuante';
    if (el.classList.contains('cart-nav-link')) return 'Carrinho';
    if (el.classList.contains('loja-btn-buy')) return 'Comprar produto';
    if (el.classList.contains('loja-btn-add')) return 'Adicionar ao carrinho';
    if (el.classList.contains('store-link')) return normalizarTexto(el.querySelector('h3')?.textContent || el.textContent);
    if (el.classList.contains('store-official-bar')) return 'Loja oficial';
    if (el.classList.contains('social-link')) return normalizarTexto(el.textContent);

    const slug = el.getAttribute('data-slug');
    if (slug) return normalizarTexto(slug);

    return normalizarTexto(el.textContent);
  }

  function payloadBase(el, extras) {
    return Object.assign({
      secao: detectarSecao(el),
      rotulo: rotuloElemento(el),
      pagina: location.pathname + location.search,
      titulo_pagina: document.title || '',
      idioma: document.documentElement.lang || 'pt-br',
      evento_legado: el.getAttribute('data-evento') || ''
    }, extras || {});
  }

  function deveNotificarCliqueCompra(data) {
    if (LOJAS_COMPRA.has(data.destino)) return true;
    if (data.secao === 'onde-comprar' || data.secao === 'faixa_compra') return true;
    if ((data.href || '').includes('#onde-comprar')) return true;
    if ((data.href || '').includes('utm_campaign=onde_comprar')) return true;
    if (EVENTO_COMPRA.test(data.evento_legado || '')) return true;
    return false;
  }

  function notificarCliqueCompraEmail(data) {
    if (!deveNotificarCliqueCompra(data)) return;

    const dedupe = `stf_click_mail:${data.secao}:${data.destino}:${data.href}:${data.rotulo}`;
    if (sessionStorage.getItem(dedupe)) return;
    sessionStorage.setItem(dedupe, '1');
    setTimeout(() => sessionStorage.removeItem(dedupe), 4000);

    const body = new FormData();
    body.append('_subject', `Clique Onde Comprar — ${data.rotulo || data.destino || 'link'}`);
    body.append('_captcha', 'false');
    body.append('_template', 'table');
    body.append('Seção', data.secao || '');
    body.append('Rótulo', data.rotulo || '');
    body.append('Destino', data.destino || '');
    body.append('Link', data.href || '');
    body.append('Página', data.pagina || '');
    body.append('Idioma', data.idioma || '');
    body.append('Data', new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }));

    fetch(`https://formsubmit.co/ajax/${FORMSUBMIT_EMAIL}`, {
      method: 'POST',
      body,
      headers: { Accept: 'application/json' },
      keepalive: true
    }).catch(() => {});
  }

  function trackSecaoLink(link) {
    const href = link.getAttribute('href');
    if (href === null) return;

    const payload = payloadBase(link, {
      elemento: 'link',
      href: hrefAbsoluto(href),
      destino: classificarDestino(href, link)
    });
    track('secao_link', payload);
    notificarCliqueCompraEmail(payload);
  }

  function trackSecaoBotao(btn) {
    if (btn.closest('summary')) return;

    track('secao_link', payloadBase(btn, {
      elemento: 'botao',
      href: '',
      destino: 'botao',
      tipo_botao: btn.type || 'button'
    }));
  }

  function iniciarRastreamentoSite() {
    document.addEventListener('click', function (e) {
      const link = e.target.closest('a[href]');
      if (link) {
        trackSecaoLink(link);
        return;
      }

      const btn = e.target.closest('button');
      if (btn) trackSecaoBotao(btn);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciarRastreamentoSite);
  } else {
    iniciarRastreamentoSite();
  }

  window.STF_ANALYTICS = { track, trackVenda, trackPurchase: trackVenda };
})();
