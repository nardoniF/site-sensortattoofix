(function () {
  const VENDA_KEY = 'stf_venda_registrada';
  const LOG_QUEUE_KEY = 'stf_log_queue';
  const LOG_QUEUE_MAX = 40;

  const ANCORA_DESTINOS = {
    'onde-comprar': 'menu_comprar',
    problema: 'secao_problema',
    paliativos: 'secao_paliativos',
    produtos: 'secao_produtos',
    'quem-somos': 'secao_quem_somos',
    faq: 'faq',
    contato: 'secao_contato'
  };

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
    if (el.closest('.faq-item, #faq, [id*="faq"]')) return 'faq';

    return 'pagina';
  }

  function classificarDestino(href, el) {
    if (!href || href === '#') {
      if (el?.classList?.contains('logo-img-link')) return 'logo';
      if (el?.closest('.faq-item, #faq')) return 'faq';
      return 'ancora';
    }
    const h = href.toLowerCase();
    if (h.startsWith('#') || (h.includes('#') && !h.includes('://'))) {
      const frag = h.replace(/^[^#]*#/, '').split('?')[0];
      if (ANCORA_DESTINOS[frag]) return ANCORA_DESTINOS[frag];
      if (frag.includes('faq') || frag.includes('duvida')) return 'faq';
      return frag ? 'ancora_' + frag.replace(/[^a-z0-9_-]/gi, '') : 'ancora';
    }
    if (h.includes('mercadolivre')) return 'mercado_livre';
    if (h.includes('amazon.')) return 'amazon';
    if (h.includes('shopee')) return 'shopee';
    if (h.includes('tiktok_shop') || h.includes('utm_content=tiktok_shop')) return 'tiktok_shop';
    if (h.includes('vt.tiktok.com')) return 'tiktok_shop';
    if (h.includes('tiktok.com')) return 'tiktok';
    if (h.includes('instagram.com')) return 'instagram';
    if (h.includes('youtube.com') || h.includes('youtu.be')) return 'youtube';
    if (h.includes('facebook.com')) return 'facebook';
    if (h.includes('wa.me') || h.includes('whatsapp')) return 'whatsapp';
    if (h.includes('loja.html')) return 'loja_oficial';
    if (h.includes('comprar.html')) return 'checkout';
    if (h.includes('minha-conta')) return 'minha_conta';
    if (h.includes('index.html') || h.endsWith('/en/') || h.endsWith('/')) return 'home';
    if (h.includes('formsubmit.co') || h.startsWith('mailto:') || h.startsWith('tel:')) return 'contato';
    try {
      const url = new URL(href, location.href);
      if (url.hash) {
        const frag = url.hash.replace(/^#/, '');
        if (ANCORA_DESTINOS[frag]) return ANCORA_DESTINOS[frag];
        if (frag.includes('faq')) return 'faq';
        if (frag) return 'ancora_' + frag.replace(/[^a-z0-9_-]/gi, '');
      }
      if (url.origin !== location.origin) return 'externo';
      return 'interno';
    } catch {
      return 'outro';
    }
  }

  function linkRastreavel(link) {
    const href = (link.getAttribute('href') || '').trim();
    if (!href || href === '#' || /^javascript:/i.test(href)) return false;
    return true;
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
    if (el.closest('summary')) return normalizarTexto(el.closest('summary')?.textContent);

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

  function visitanteId() {
    let id = localStorage.getItem('stf_visitor_id');
    if (!id) {
      id = 'v_' + (crypto.randomUUID?.() || String(Date.now()));
      localStorage.setItem('stf_visitor_id', id);
    }
    return id;
  }

  function resumirUserAgent() {
    const ua = navigator.userAgent || '';
    const mobile = /Mobile|Android|iPhone|iPad/i.test(ua);
    let browser = 'outro';
    if (/Edg\//i.test(ua)) browser = 'Edge';
    else if (/Chrome\//i.test(ua)) browser = 'Chrome';
    else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
    else if (/Firefox\//i.test(ua)) browser = 'Firefox';
    return (mobile ? 'mobile' : 'desktop') + ' / ' + browser;
  }

  function contextoVisitante() {
    const ctx = {
      visitante_id: visitanteId(),
      referrer: normalizarTexto(document.referrer || '(direto)'),
      dispositivo: resumirUserAgent(),
      fuso: Intl.DateTimeFormat().resolvedOptions().timeZone || ''
    };
    const user = window.STF_ACCOUNT?.getUser?.();
    if (user) {
      ctx.cliente_nome = normalizarTexto(user.nome || '');
      ctx.cliente_email = normalizarTexto(user.email || '');
    }
    return ctx;
  }

  function humanizarDestino(destino) {
    const map = {
      pageview: 'Entrada na página',
      mercado_livre: 'Mercado Livre',
      shopee: 'Shopee',
      tiktok_shop: 'TikTok Shop',
      tiktok: 'TikTok',
      instagram: 'Instagram',
      youtube: 'YouTube',
      facebook: 'Facebook',
      amazon: 'Amazon',
      loja_oficial: 'Loja Oficial (site)',
      menu_comprar: 'Menu — Onde comprar',
      secao_problema: 'Menu — O problema',
      secao_paliativos: 'Menu — Paliativos',
      secao_produtos: 'Menu — Produtos',
      secao_quem_somos: 'Menu — Quem somos',
      secao_contato: 'Menu — Contato',
      ancora: 'Âncora na página',
      checkout: 'Checkout',
      whatsapp: 'WhatsApp',
      home: 'Página inicial',
      interno: 'Link interno',
      externo: 'Link externo',
      faq: 'FAQ',
      logo: 'Logo',
      botao: 'Botão',
      contato: 'Contato',
      minha_conta: 'Minha conta'
    };
    if (map[destino]) return map[destino];
    if (destino && destino.startsWith('ancora_')) {
      return 'Âncora — ' + destino.replace(/^ancora_/, '').replace(/_/g, ' ');
    }
    return (destino || '—').replace(/_/g, ' ');
  }

  function humanizarSecao(secao) {
    const map = {
      'onde-comprar': 'Onde Comprar',
      faixa_compra: 'Faixa do topo (envio/pagamento)',
      hero: 'Banner principal',
      header: 'Menu do site',
      footer: 'Rodapé',
      produtos: 'Seção Produtos',
      faq: 'FAQ',
      loja: 'Loja',
      loja_intro: 'Intro da loja',
      loja_produto: 'Card de produto na loja',
      checkout: 'Checkout',
      minha_conta: 'Minha Conta',
      contato: 'Fale Conosco',
      whatsapp_flutuante: 'Botão WhatsApp flutuante',
      menu: 'Menu mobile'
    };
    return map[secao] || (secao || '—').replace(/_/g, ' ').replace(/-/g, ' ');
  }

  function humanizarReferrer(ref) {
    const r = (ref || '').toLowerCase();
    if (!r || r === '(direto)') return 'Acesso direto';
    if (r.includes('google.')) return 'Google';
    if (r.includes('instagram.')) return 'Instagram';
    if (r.includes('facebook.')) return 'Facebook';
    if (r.includes('tiktok.')) return 'TikTok';
    if (r.includes('youtube.')) return 'YouTube';
    if (r.includes('mercadolivre')) return 'Mercado Livre';
    if (r.includes('amazon.')) return 'Amazon';
    if (r.includes('shopee')) return 'Shopee';
    try {
      return new URL(ref).hostname.replace(/^www\./, '');
    } catch {
      return ref;
    }
  }

  function humanizarDispositivo(dispositivo) {
    if (!dispositivo) return '—';
    return dispositivo
      .replace(/^mobile\b/i, 'Celular')
      .replace(/^desktop\b/i, 'Computador')
      .replace(/\s*\/\s*/, ' · ');
  }

  function sessaoVisitaId() {
    let id = sessionStorage.getItem('stf_sessao_visita');
    if (!id) {
      id = 's_' + (crypto.randomUUID?.() || String(Date.now()));
      sessionStorage.setItem('stf_sessao_visita', id);
      sessionStorage.setItem('stf_sessao_seq', '0');
    }
    return id;
  }

  function proximaSequencia() {
    const n = (parseInt(sessionStorage.getItem('stf_sessao_seq') || '0', 10) || 0) + 1;
    sessionStorage.setItem('stf_sessao_seq', String(n));
    return n;
  }

  function apiBaseUrl() {
    const raw = window.CONFIG_BOOTSTRAP?.configApiUrl || '';
    return String(raw).replace(/\/$/, '');
  }

  function montarCorpoLog(data) {
    const visitante = contextoVisitante();
    const tipo = data.tipo || (data.elemento === 'pageview' ? 'pageview' : 'clique');
    return {
      tipo,
      destino: data.destino || '',
      destino_label: humanizarDestino(data.destino),
      rotulo: data.rotulo || '',
      secao: data.secao || '',
      secao_label: humanizarSecao(data.secao),
      elemento: data.elemento || tipo,
      href: data.href || '',
      pagina: data.pagina || location.pathname + location.search,
      titulo_pagina: data.titulo_pagina || document.title || '',
      idioma: data.idioma || document.documentElement.lang || 'pt-br',
      referrer: humanizarReferrer(visitante.referrer),
      dispositivo: humanizarDispositivo(visitante.dispositivo),
      fuso: visitante.fuso,
      visitante_id: visitante.visitante_id,
      sessao_visita: sessaoVisitaId(),
      sequencia: proximaSequencia(),
      cliente_nome: visitante.cliente_nome || '',
      cliente_email: visitante.cliente_email || '',
      client_ts: Date.now()
    };
  }

  function enfileirarLog(body) {
    try {
      const q = JSON.parse(sessionStorage.getItem(LOG_QUEUE_KEY) || '[]');
      q.push(body);
      while (q.length > LOG_QUEUE_MAX) q.shift();
      sessionStorage.setItem(LOG_QUEUE_KEY, JSON.stringify(q));
    } catch (_) { /* ignore */ }
  }

  function enviarLogPayload(body, urgente) {
    const base = apiBaseUrl();
    if (!base) return false;
    const url = base + '/analytics/click';
    const json = JSON.stringify(body);

    if (typeof navigator.sendBeacon === 'function') {
      try {
        const blob = new Blob([json], { type: 'application/json' });
        if (navigator.sendBeacon(url, blob)) return true;
      } catch (_) { /* fallback fetch */ }
    }

    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: json,
      keepalive: true,
      priority: urgente ? 'high' : 'low'
    }).catch(() => enfileirarLog(body));
    return true;
  }

  function flushLogQueue() {
    let q;
    try {
      q = JSON.parse(sessionStorage.getItem(LOG_QUEUE_KEY) || '[]');
    } catch {
      return;
    }
    if (!q.length) return;
    sessionStorage.removeItem(LOG_QUEUE_KEY);
    q.forEach((body) => enviarLogPayload(body, true));
  }

  function registrarLog(data) {
    if (!apiBaseUrl()) return;

    const tipo = data.tipo || (data.elemento === 'pageview' ? 'pageview' : 'clique');
    if (tipo !== 'pageview') {
      const dedupe = `stf_log:${tipo}:${data.destino}:${data.href}:${data.rotulo}`;
      if (sessionStorage.getItem(dedupe)) return;
      sessionStorage.setItem(dedupe, '1');
      setTimeout(() => sessionStorage.removeItem(dedupe), 1500);
    }

    const body = montarCorpoLog(data);
    const saiDaPagina = tipo !== 'pageview' && data.href && !data.href.startsWith('#') && !data.href.includes(location.pathname + '#');
    enviarLogPayload(body, !!saiDaPagina || data.urgente);
  }

  function registrarPageview() {
    const key = 'stf_pv:' + location.pathname + location.search;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
    registrarLog({
      tipo: 'pageview',
      elemento: 'pageview',
      destino: 'pageview',
      secao: 'pagina',
      rotulo: document.title || location.pathname,
      href: location.href,
      pagina: location.pathname + location.search,
      titulo_pagina: document.title || ''
    });
  }

  function trackSecaoLink(link) {
    if (!linkRastreavel(link)) return;
    const href = link.getAttribute('href');
    const abs = hrefAbsoluto(href);
    const payload = payloadBase(link, {
      elemento: 'link',
      href: abs,
      destino: classificarDestino(href, link),
      urgente: link.target === '_blank' || !href.startsWith('#')
    });
    track('secao_link', payload);
    registrarLog(payload);
  }

  function trackFaqAbertura(details) {
    const summary = details.querySelector('summary');
    if (!summary) return;
    const payload = payloadBase(summary, {
      elemento: 'faq',
      href: '',
      destino: 'faq',
      rotulo: normalizarTexto(summary.textContent) || 'Pergunta FAQ'
    });
    track('secao_link', payload);
    registrarLog(payload);
  }

  function trackSecaoBotao(btn) {
    const summary = btn.closest('summary');
    if (summary) {
      const payload = payloadBase(summary, {
        elemento: 'faq',
        href: '',
        destino: 'faq',
        rotulo: normalizarTexto(summary.textContent) || 'Pergunta FAQ'
      });
      track('secao_link', payload);
      registrarLog(payload);
      return;
    }

    const payload = payloadBase(btn, {
      elemento: 'botao',
      href: '',
      destino: classificarDestino('', btn),
      tipo_botao: btn.type || 'button'
    });
    if (payload.destino === 'ancora' && payload.secao === 'faq') payload.destino = 'faq';
    track('secao_link', payload);
    registrarLog(payload);
  }

  function onClickCapture(e) {
    const link = e.target.closest('a[href]');
    if (link) {
      trackSecaoLink(link);
      return;
    }

    const btn = e.target.closest('button');
    if (btn && !btn.closest('summary')) trackSecaoBotao(btn);
  }

  function iniciarRastreamentoSite() {
    flushLogQueue();
    registrarPageview();

    document.addEventListener('click', onClickCapture, true);

    document.addEventListener('toggle', (e) => {
      const details = e.target;
      if (details?.tagName === 'DETAILS' && details.open) trackFaqAbertura(details);
    }, true);

    window.addEventListener('pagehide', flushLogQueue);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flushLogQueue();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciarRastreamentoSite);
  } else {
    iniciarRastreamentoSite();
  }

  window.STF_ANALYTICS = { track, trackVenda, trackPurchase: trackVenda };
})();
