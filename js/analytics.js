(function () {
  const VENDA_KEY = 'stf_venda_registrada';
  const LOG_QUEUE_KEY = 'stf_log_queue';
  const LOG_QUEUE_MAX = 40;
  const LOG_DEDUP_MS = 1200;
  let ultimoCliqueLink = { href: '', ts: 0 };

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
    if (el.closest('.loja-marketplaces')) return 'loja_marketplaces';
    if (el.closest('.loja-hero')) return 'loja_intro';
    if (el.closest('.loja-card')) return 'loja_produto';
    if (el.closest('.faq-item, #faq, [id*="faq"]')) return 'faq';

    return 'pagina';
  }

  function classificarDestino(href, el) {
    if (el?.classList?.contains('logo-img-link')) return 'logo';
    if (!href || href === '#') {
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

    const evento = el.getAttribute('data-evento');
    if (evento) return normalizarTexto(evento.replace(/^clique_/, '').replace(/_/g, ' '));

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

  function lerUsuarioContaLog() {
    try {
      const viaApi = window.STF_ACCOUNT?.getUser?.();
      if (viaApi?.email) return viaApi;
      const raw = localStorage.getItem('stf_customer_user');
      if (raw) {
        const u = JSON.parse(raw);
        if (u?.email) return u;
      }
    } catch (_) { /* ignore */ }
    return null;
  }

  function contextoVisitante() {
    const ctx = {
      visitante_id: visitanteId(),
      referrer: normalizarTexto(document.referrer || '(direto)'),
      dispositivo: resumirUserAgent(),
      fuso: Intl.DateTimeFormat().resolvedOptions().timeZone || ''
    };
    const user = lerUsuarioContaLog();
    if (user) {
      ctx.cliente_nome = normalizarTexto(user.nome || '');
      ctx.cliente_email = normalizarTexto(user.email || '');
    }
    return ctx;
  }

  function capturarOrigemSessao() {
    const key = 'stf_origem_sessao';
    try {
      const saved = sessionStorage.getItem(key);
      if (saved) return JSON.parse(saved);
    } catch (_) { /* ignore */ }

    const params = new URLSearchParams(location.search || '');
    const src = (params.get('utm_source') || '').toLowerCase();
    const med = (params.get('utm_medium') || '').toLowerCase();
    const ref = (document.referrer || '').toLowerCase();
    let origem = 'direto';
    let label = 'Acesso direto';

    if (
      params.has('gclid') || params.has('gbraid') || params.has('wbraid') ||
      src === 'google' || src === 'google_ads' || src === 'adwords' ||
      med === 'cpc' || med === 'ppc' || med === 'paid' || med === 'paidsearch'
    ) {
      origem = 'google_ads';
      label = 'Google Ads';
    } else if (src === 'sensortattoofix' || med === 'site') {
      origem = 'site';
      label = 'Site';
    } else if (ref.includes('google.')) {
      origem = 'google_organico';
      label = 'Google orgânico';
    } else if (ref.includes('instagram.')) {
      origem = 'instagram';
      label = 'Instagram';
    } else if (ref.includes('facebook.') || ref.includes('fb.')) {
      origem = 'facebook';
      label = 'Facebook';
    } else if (ref.includes('tiktok.')) {
      origem = 'tiktok';
      label = 'TikTok';
    } else if (ref && ref !== '(direto)') {
      origem = 'referral';
      label = humanizarReferrer(document.referrer);
    }

    const data = {
      origem_trafego: origem,
      origem_trafego_label: label,
      utm_source: normalizarTexto(params.get('utm_source') || ''),
      utm_medium: normalizarTexto(params.get('utm_medium') || ''),
      utm_campaign: normalizarTexto(params.get('utm_campaign') || '')
    };
    try { sessionStorage.setItem(key, JSON.stringify(data)); } catch (_) { /* ignore */ }
    return data;
  }

  function humanizarDestino(destino) {
    if (destino && destino.startsWith('entrada_')) {
      const slug = destino.replace(/^entrada_/, '').replace(/_/g, ' ');
      const map = {
        home: 'Entrada — Home',
        'home en': 'Entrada — Home EN',
        loja: 'Entrada — Loja',
        checkout: 'Entrada — Checkout',
        'onde comprar': 'Entrada — Onde comprar',
        'minha conta': 'Entrada — Minha conta'
      };
      return map[slug] || ('Entrada — ' + slug.replace(/\b\w/g, (c) => c.toUpperCase()));
    }
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
    const raw = window.CONFIG_BOOTSTRAP?.configApiUrl ||
      'https://api.sensortattoofix.com.br';
    return String(raw).replace(/\/$/, '');
  }

  function sameOriginBase() {
    return String(location.origin || '').replace(/\/$/, '');
  }

  function registrarServiceWorkerLog() {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/stf-log-sw.js', { scope: '/' }).catch(() => {});
  }

  function logClickEndpoints() {
    const urls = [];
    const base = apiBaseUrl();
    if (base) urls.push(base + '/analytics/click');
    const host = (location.hostname || '').toLowerCase();
    if (/^(www\.)?sensortattoofix\.com\.br$/.test(host)) {
      urls.push(sameOriginBase() + '/stf-log');
    }
    return urls;
  }

  function logPixelEndpoints() {
    const urls = [];
    const base = apiBaseUrl();
    if (base) urls.push(base + '/analytics/pixel.gif');
    const host = (location.hostname || '').toLowerCase();
    if (/^(www\.)?sensortattoofix\.com\.br$/.test(host)) {
      urls.push(sameOriginBase() + '/stf-log/pixel.gif');
    }
    return urls;
  }

  function logApiBases() {
    const base = apiBaseUrl();
    return base ? [base] : [];
  }

  function lerFilaLog() {
    try {
      const ls = localStorage.getItem(LOG_QUEUE_KEY);
      if (ls) return JSON.parse(ls);
      return JSON.parse(sessionStorage.getItem(LOG_QUEUE_KEY) || '[]');
    } catch {
      return [];
    }
  }

  function salvarFilaLog(q) {
    const s = JSON.stringify(q);
    try { localStorage.setItem(LOG_QUEUE_KEY, s); } catch (_) { /* ignore */ }
    try { sessionStorage.setItem(LOG_QUEUE_KEY, s); } catch (_) { /* ignore */ }
  }

  function postLogJson(url, json, urgente) {
    const opts = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: json,
      keepalive: true,
      credentials: 'omit'
    };
    return fetch(url, opts);
  }

  function respostaLogOk(res, data) {
    if (!res || !res.ok) return false;
    if (data && data.deduped) return true;
    if (data && (data.dropped || data.retry || data.error === 'storage')) return false;
    return res.status === 202 || !!(data && data.ok);
  }

  function enviarLogFetchSequencial(urls, json, payload, idx) {
    if (!urls[idx]) {
      enfileirarLog(payload);
      return;
    }
    postLogJson(urls[idx], json, true)
      .then((res) => res.json().catch(() => null).then((data) => {
        if (respostaLogOk(res, data)) return;
        enviarLogFetchSequencial(urls, json, payload, idx + 1);
      }))
      .catch(() => enviarLogFetchSequencial(urls, json, payload, idx + 1));
  }

  function enviarLogPayload(body, urgente) {
    const urls = logClickEndpoints();
    if (!urls.length) return false;
    const payload = Object.assign({}, body, {
      log_key: window.CONFIG_BOOTSTRAP?.clickLogKey || '',
      client_event_id: body.client_event_id || ('e_' + (crypto.randomUUID?.() || String(Date.now() + '_' + Math.random().toString(36).slice(2, 8))))
    });
    const json = JSON.stringify(payload);
    const primary = urls[0];

    if (urgente) {
      if (primary && typeof navigator.sendBeacon === 'function') {
        try {
          navigator.sendBeacon(primary, new Blob([json], { type: 'application/json' }));
        } catch (_) { /* ignore */ }
      }
      enviarLogPixel(payload);
    }

    enviarLogFetchSequencial(urls, json, payload, 0);
    return true;
  }

  function enviarLogPixel(payload) {
    const key = payload.log_key || window.CONFIG_BOOTSTRAP?.clickLogKey || '';
    if (!key) return;
    const q = new URLSearchParams({
      log_key: key,
      tipo: payload.tipo || 'clique',
      destino: payload.destino || '',
      destino_label: (payload.destino_label || '').slice(0, 48),
      rotulo: (payload.rotulo || '').slice(0, 100),
      secao: (payload.secao || '').slice(0, 48),
      elemento: (payload.elemento || '').slice(0, 24),
      href: (payload.href || '').slice(0, 180),
      visitante_id: payload.visitante_id || '',
      sessao_visita: payload.sessao_visita || '',
      sequencia: String(payload.sequencia || 0),
      pagina: (payload.pagina || '').slice(0, 120),
      origem_trafego: (payload.origem_trafego || '').slice(0, 32),
      origem_trafego_label: (payload.origem_trafego_label || '').slice(0, 48),
      utm_source: (payload.utm_source || '').slice(0, 48),
      utm_medium: (payload.utm_medium || '').slice(0, 32),
      client_event_id: (payload.client_event_id || '').slice(0, 48),
      client_ts: String(payload.client_ts || Date.now())
    }).toString();
    logPixelEndpoints().forEach((base) => {
      const img = new Image();
      img.decoding = 'async';
      img.src = base + '?' + q;
    });
  }

  function enfileirarLog(body) {
    try {
      const q = lerFilaLog();
      q.push(body);
      while (q.length > LOG_QUEUE_MAX) q.shift();
      salvarFilaLog(q);
    } catch (_) { /* ignore */ }
  }

  function montarCorpoLog(data) {
    const visitante = contextoVisitante();
    const origem = capturarOrigemSessao();
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
      origem_trafego: origem.origem_trafego || '',
      origem_trafego_label: origem.origem_trafego_label || '',
      utm_source: origem.utm_source || '',
      utm_medium: origem.utm_medium || '',
      utm_campaign: origem.utm_campaign || '',
      client_ts: Date.now()
    };
  }

  function flushLogQueue() {
    if (!logClickEndpoints().length) return;
    let q;
    try {
      q = lerFilaLog();
    } catch {
      return;
    }
    if (!q.length) return;
    salvarFilaLog([]);
    q.forEach((body) => {
      enviarLogPayload(Object.assign({}, body, {
        client_event_id: 'q_' + (crypto.randomUUID?.() || String(Date.now() + '_' + Math.random().toString(36).slice(2, 8)))
      }), true);
    });
  }

  function linkSaiDaPagina(href) {
    const h = (href || '').trim();
    if (!h || h === '#') return false;
    try {
      const dest = new URL(h, location.href);
      if (dest.hash && dest.pathname === location.pathname && dest.search === location.search) return false;
      if (dest.origin !== location.origin) return true;
      return (dest.pathname + dest.search) !== (location.pathname + location.search);
    } catch {
      return true;
    }
  }

  function registrarLog(data) {
    if (!logClickEndpoints().length) return;

    try {
      const body = montarCorpoLog(data);
      const tipo = body.tipo || 'clique';
      const saiDaPagina = tipo !== 'pageview' && linkSaiDaPagina(data.href);
      enviarLogPayload(body, !!saiDaPagina || !!data.urgente || tipo === 'pageview');
    } catch (err) {
      console.warn('stf log:', err);
    }
  }

  function classificarEntradaPagina() {
    const path = location.pathname.replace(/\\/g, '/').toLowerCase();
    const parts = path.split('/').filter(Boolean);
    const file = parts[parts.length - 1] || 'index.html';
    const isEn = parts.includes('en');

    if (isEn && (file === 'index.html' || parts[parts.length - 1] === 'en')) {
      return { slug: 'home_en', rotulo: 'Entrada — Home EN' };
    }
    if (file === 'index.html' || path.endsWith('/') || !file.includes('.')) {
      return { slug: 'home', rotulo: 'Entrada — Home' };
    }
    if (file.includes('loja')) return { slug: 'loja', rotulo: 'Entrada — Loja' };
    if (file.includes('comprar')) return { slug: 'checkout', rotulo: 'Entrada — Checkout' };
    if (file.includes('onde-comprar')) return { slug: 'onde_comprar', rotulo: 'Entrada — Onde comprar' };
    if (file.includes('minha-conta')) return { slug: 'minha_conta', rotulo: 'Entrada — Minha conta' };
    const base = file.replace(/\.html$/i, '').replace(/[^a-z0-9_-]/gi, '_') || 'pagina';
    return { slug: base, rotulo: 'Entrada — ' + base.replace(/_/g, ' ') };
  }

  function registrarPageview() {
    const pathKey = location.pathname + location.search;
    const storageKey = 'stf_entrada:' + pathKey;
    try {
      if (sessionStorage.getItem(storageKey)) return;
      sessionStorage.setItem(storageKey, '1');
    } catch (_) { /* ignore */ }

    const { slug, rotulo } = classificarEntradaPagina();
    registrarLog({
      tipo: 'pageview',
      elemento: 'entrada',
      destino: 'entrada_' + slug,
      secao: slug,
      rotulo,
      href: location.href,
      pagina: pathKey,
      titulo_pagina: document.title || ''
    });
  }

  function linkUrgenteParaLog(link, href) {
    if (link.target === '_blank') return true;
    const h = (href || '').trim();
    if (!h || h === '#' || h.startsWith('#')) return false;
    try {
      const dest = new URL(h, location.href);
      if (dest.origin !== location.origin) return true;
      return (dest.pathname + dest.search) !== (location.pathname + location.search);
    } catch {
      return true;
    }
  }

  function trackSecaoLink(link) {
    if (!linkRastreavel(link)) return;
    const href = link.getAttribute('href');
    const abs = hrefAbsoluto(href);
    const now = Date.now();
    if (ultimoCliqueLink.href === abs && now - ultimoCliqueLink.ts < LOG_DEDUP_MS) return;
    ultimoCliqueLink = { href: abs, ts: now };
    const payload = payloadBase(link, {
      elemento: 'link',
      href: abs,
      destino: classificarDestino(href, link),
      urgente: linkUrgenteParaLog(link, href)
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

  function onLinkPointer(e) {
    if (e.button !== 0) return;
    const link = e.target.closest('a[href]');
    if (link) trackSecaoLink(link);
  }

  function onLinkClick(e) {
    if (e.button !== 0 || e.defaultPrevented) return;
    const link = e.target.closest('a[href]');
    if (!link || !linkRastreavel(link)) return;
    const href = link.getAttribute('href');
    if (!linkUrgenteParaLog(link, href)) return;
    trackSecaoLink(link);
  }

  function onClickCapture(e) {
    const link = e.target.closest('a[href]');
    if (link) return;

    const btn = e.target.closest('button');
    if (btn && !btn.closest('summary')) trackSecaoBotao(btn);
  }

  function iniciarRastreamentoSite() {
    registrarServiceWorkerLog();
    capturarOrigemSessao();
    flushLogQueue();
    registrarPageview();

    document.addEventListener('pointerdown', onLinkPointer, true);
    document.addEventListener('click', onLinkClick, true);
    document.addEventListener('click', onClickCapture, true);

    document.addEventListener('toggle', (e) => {
      const details = e.target;
      if (details?.tagName === 'DETAILS' && details.open) trackFaqAbertura(details);
    }, true);

    window.addEventListener('pagehide', flushLogQueue);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flushLogQueue();
    });
    setInterval(flushLogQueue, 8000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciarRastreamentoSite);
  } else {
    iniciarRastreamentoSite();
  }

  window.STF_ANALYTICS = { track, trackVenda, trackPurchase: trackVenda };
})();
