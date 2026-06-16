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

  const GEO_CACHE_KEY = 'stf_geo_cache';
  const GEO_CACHE_MS = 30 * 60 * 1000;

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

  function parseCfTrace(text) {
    const map = {};
    String(text || '').trim().split('\n').forEach((line) => {
      const idx = line.indexOf('=');
      if (idx > 0) map[line.slice(0, idx)] = line.slice(idx + 1);
    });
    return {
      ip: map.ip || '',
      pais: map.loc || '',
      colo_cf: map.colo || ''
    };
  }

  function lerGeoCache() {
    try {
      const raw = sessionStorage.getItem(GEO_CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (Date.now() - parsed.t < GEO_CACHE_MS) return parsed.data;
    } catch (_) { /* ignore */ }
    return null;
  }

  function salvarGeoCache(data) {
    try {
      sessionStorage.setItem(GEO_CACHE_KEY, JSON.stringify({ t: Date.now(), data }));
    } catch (_) { /* ignore */ }
  }

  async function obterGeoIp() {
    const cached = lerGeoCache();
    if (cached) return cached;

    let geo = { ip: '', pais: '', pais_nome: '', cidade: '', regiao: '', colo_cf: '' };
    const traceUrls = ['/cdn-cgi/trace', 'https://www.cloudflare.com/cdn-cgi/trace'];
    for (const url of traceUrls) {
      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) continue;
        geo = { ...geo, ...parseCfTrace(await res.text()) };
        break;
      } catch (_) { /* tenta próximo */ }
    }

    try {
      const res = await fetch('https://ipapi.co/json/', { cache: 'no-store' });
      if (res.ok) {
        const j = await res.json();
        geo.ip = geo.ip || j.ip || '';
        geo.pais = geo.pais || j.country_code || '';
        geo.pais_nome = j.country_name || '';
        geo.cidade = j.city || '';
        geo.regiao = j.region || '';
      }
    } catch (_) { /* ip opcional */ }

    salvarGeoCache(geo);
    return geo;
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
      mercado_livre: 'Mercado Livre',
      shopee: 'Shopee',
      tiktok_shop: 'TikTok Shop',
      amazon: 'Amazon',
      loja_oficial: 'Loja Oficial (site)',
      ancora: 'Âncora na página',
      checkout: 'Checkout',
      whatsapp: 'WhatsApp',
      home: 'Página inicial',
      interno: 'Link interno',
      externo: 'Link externo'
    };
    return map[destino] || (destino || '—').replace(/_/g, ' ');
  }

  function humanizarSecao(secao) {
    const map = {
      'onde-comprar': 'Onde Comprar',
      faixa_compra: 'Faixa do topo (envio/pagamento)',
      hero: 'Banner principal',
      header: 'Menu do site',
      footer: 'Rodapé',
      produtos: 'Seção Produtos',
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
    if (!r || r === '(direto)') return 'Acesso direto (digitou o endereço ou favorito)';
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

  function humanizarIdioma(idioma) {
    const l = (idioma || '').toLowerCase();
    if (l.startsWith('en')) return 'Inglês';
    if (l.startsWith('pt')) return 'Português';
    return idioma || '—';
  }

  function notificarCliqueCompraEmail(data) {
    if (!deveNotificarCliqueCompra(data)) return;

    const dedupe = `stf_click_mail:${data.secao}:${data.destino}:${data.href}:${data.rotulo}`;
    if (sessionStorage.getItem(dedupe)) return;
    sessionStorage.setItem(dedupe, '1');
    setTimeout(() => sessionStorage.removeItem(dedupe), 4000);

    Promise.resolve()
      .then(() => obterGeoIp())
      .then((geo) => {
        const visitante = contextoVisitante();
        const quando = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        const loja = humanizarDestino(data.destino);
        const local = [geo.cidade, geo.regiao].filter(Boolean).join(' — ') || '—';
        const pais = geo.pais_nome
          ? `${geo.pais_nome}${geo.pais ? ' (' + geo.pais + ')' : ''}`
          : (geo.pais || '—');

        const body = new FormData();
        body.append('_subject', `Clique: ${loja} · ${pais !== '—' ? pais : 'local desconhecido'} · ${quando}`);
        body.append('_captcha', 'false');
        body.append('_template', 'table');
        body.append('O que clicou', data.rotulo || loja);
        body.append('Loja / destino', loja);
        body.append('Onde no site', humanizarSecao(data.secao));
        body.append('Link clicado', data.href || '—');
        body.append('Página', data.pagina || '—');
        body.append('Idioma do site', humanizarIdioma(data.idioma));
        body.append('Data e hora (SP)', quando);
        body.append('País', pais);
        body.append('Cidade / região', local);
        body.append('IP (aproximado)', geo.ip || '—');
        body.append('Veio de', humanizarReferrer(visitante.referrer));
        body.append('Aparelho', humanizarDispositivo(visitante.dispositivo));
        body.append('Fuso do visitante', visitante.fuso || '—');
        body.append('ID visitante', visitante.visitante_id || '—');
        body.append('Nota ID', 'Mesmo código = mesma pessoa no mesmo navegador');
        if (visitante.cliente_nome) body.append('Nome (conta logada)', visitante.cliente_nome);
        if (visitante.cliente_email) body.append('E-mail (conta logada)', visitante.cliente_email);
        if (!visitante.cliente_nome) body.append('Visitante', 'Não estava logado — só localização aproximada');

        return fetch(`https://formsubmit.co/ajax/${FORMSUBMIT_EMAIL}`, {
          method: 'POST',
          body,
          headers: { Accept: 'application/json' },
          keepalive: true
        });
      })
      .catch(() => {});
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
