(function () {
  const SESSION_KEY = 'stf_admin_token';
  const bootstrap = window.CONFIG_BOOTSTRAP || {};

  const DEFAULT_EMAILS = {
    from: 'Sensor Tattoo Fix <pedidos@sensortattoofix.com.br>',
    shopPaidSubject: 'PAGO — {orderId}',
    customerOrderSubject: 'Pedido {orderId} registrado — Sensor Tattoo Fix',
    customerPixSubject: 'PIX do pedido {orderId} — Sensor Tattoo Fix',
    customerPaidSubject: 'Pagamento confirmado — {orderId}',
    motoboySubject: 'Entrega motoboy — {orderId}',
    couponSubject: 'Você vendeu com seu cupom — comissão {amount} — Sensor Tattoo Fix',
    testSubject: 'Teste — Sensor Tattoo Fix',
    testTo: '',
    pendingPaypal: 'Finalize o pagamento no PayPal. Você receberá outro e-mail quando o pagamento for confirmado.',
    pendingCard: 'Finalize o pagamento no link enviado. Você receberá outro e-mail quando o pagamento for confirmado.',
    pendingMpCheckout: 'Finalize o pagamento com cartão no Mercado Pago (Visa/Mastercard). Seu banco pode converter de USD/EUR para reais.',
    paidDefault: 'Seu kit será postado em até 2 dias úteis. Você receberá o rastreio por e-mail.',
    paidMotoboy: 'Seu pedido será entregue por motoboy em até {hours} horas. O entregador entrará em contato se necessário.',
    paidUberTracking: 'Entrega Uber confirmada. Acompanhe em: {url}',
    paidUberPending: 'Entrega Uber solicitada. Você receberá o link de rastreio por e-mail em breve.',
    paidIntlLens: 'Sua lente internacional será postada em até 2 dias úteis. Você receberá o rastreio por e-mail.',
    paidIntlKit: 'Seu kit Prime será postado em até 2 dias úteis. Você receberá o rastreio por e-mail.',
    customerTrackingSubject: 'Rastreio disponível — {orderId}',
    trackingAvailable: 'Seu pedido foi postado. Código de rastreio: {code}. Acompanhe em: {url}',
    abandonedSubject: 'Seu pedido {orderId} ainda está reservado — finalize quando quiser',
    abandonedWeeklySubject: 'Lembrete semanal — pedido {orderId} aguardando pagamento',
    abandonedIntro: 'Notamos que seu pedido ficou pendente. Seus itens ainda estão reservados — finalize o pagamento pelo link abaixo.',
    abandonedWeeklyIntro: 'Passou uma semana e seu pedido ainda aguarda pagamento. Se ainda quiser o Sensor Tattoo Fix, é só concluir pelo link.',
    abandonedCta: 'Finalizar meu pedido',
    pixGreeting: 'Olá, {nome}!',
    pixIntro: 'Seu pedido {orderId} foi registrado. Para concluir a compra, pague o PIX abaixo:',
    pixFooter: 'Guarde este e-mail — se fechar a página, use o link acima para voltar ao QR Code.'
  };

  const els = {
    loginScreen: document.getElementById('admin-login'),
    panelScreen: document.getElementById('admin-panel'),
    loginForm: document.getElementById('admin-login-form'),
    configForm: document.getElementById('admin-config-form'),
    logoutBtn: document.getElementById('admin-logout'),
    statusMsg: document.getElementById('admin-status'),
    statusPanel: document.getElementById('admin-status-panel'),
    statusTop: document.getElementById('admin-status-top'),
    statusFrete: document.getElementById('admin-status-frete'),
    statusContato: document.getElementById('admin-status-contato'),
    modeBadge: document.getElementById('admin-mode'),
    btnDownload: document.getElementById('btn-download-config'),
    updatedAt: document.getElementById('config-updated-at'),
  };

  let currentConfig = null;

  function sm() {
    return globalThis.STFSalesMoney || {};
  }

  function salesMoneyReady() {
    return typeof sm().saleMoneyParts === 'function';
  }

  async function waitSalesMoney(ms = 8000) {
    if (salesMoneyReady()) return true;
    const start = Date.now();
    while (Date.now() - start < ms) {
      await new Promise((r) => setTimeout(r, 40));
      if (salesMoneyReady()) return true;
    }
    return salesMoneyReady();
  }

  function roundMoneyLocal(n) {
    return Math.round(Number(n || 0) * 100) / 100;
  }

  const DEFAULT_KIT_COST_COMPONENTS = sm().DEFAULT_KIT_COST_COMPONENTS || [
    { id: 'shipping-label', name: 'Etiqueta de envio', buyQty: 1000, buyPrice: 52.75, yieldQty: 1, useQty: 2, notes: '2 etiquetas por envio' },
    { id: 'shipping-bag', name: 'Sacola de envio', buyQty: 500, buyPrice: 32.9, yieldQty: 1, useQty: 1, notes: '' },
    { id: 'shipping-bag-sticker', name: 'Adesivo da sacola / envelope', buyQty: 1000, buyPrice: 60, yieldQty: 1, useQty: 1, notes: '1 por sacola ou envelope (1 por lente)' },
    { id: 'kit-bag', name: 'Sacola zip do kit', buyQty: 100, buyPrice: 52, yieldQty: 1, useQty: 1, notes: 'Zip que vai dentro' },
    { id: 'kit-bag-sticker', name: 'Adesivo da sacola do kit', buyQty: 1000, buyPrice: 60, yieldQty: 1, useQty: 1, notes: '1 por sacola zip' },
    { id: 'manual-sofit', name: 'Manual (sulfite)', buyQty: 1000, buyPrice: 59, yieldQty: 10, useQty: 1, notes: '10 manuais por folha sulfite' },
    { id: 'promo-print', name: 'Impresso promocional (sulfite)', buyQty: 1000, buyPrice: 59, yieldQty: 10, useQty: 1, notes: '10 impressos por folha sulfite' },
    { id: 'applicator', name: 'Haste aplicadora', buyQty: 200, buyPrice: 26.35, yieldQty: 1, useQty: 0.5, notes: 'Meia haste por kit' },
    { id: 'potentiator', name: 'Potencializador (primer)', buyQty: 100, buyPrice: 188, yieldQty: 1, useQty: 0.2, notes: '1/5 ml por kit' },
    { id: 'potentiator-glass', name: 'Vidro do potencializador', buyQty: 100, buyPrice: 149.8, yieldQty: 1, useQty: 1, notes: 'Frasco 1 ml' },
    { id: 'alcohol-wipe', name: 'Lenço com álcool isopropílico', buyQty: 500, buyPrice: 35.92, yieldQty: 1, useQty: 1, notes: '' },
    { id: 'film', name: 'Película / lente', buyQty: 10, buyPrice: 49, yieldQty: 30, useQty: 1, notes: '10 folhas a R$ 49; 30 lentes por folha' },
    { id: 'sticker-cut', name: 'Adesivo + recorte das lentes', buyQty: 10, buyPrice: 271, yieldQty: 30, useQty: 1, notes: 'Adesivo e recorte juntos; 10×30 = 300 lentes' }
  ];

  const DEFAULT_KIT_COST_INTL_COMPONENTS = sm().DEFAULT_KIT_COST_INTL_COMPONENTS || [
    { id: 'intl-envelope', name: 'Envelope internacional', buyQty: 100, buyPrice: 23, yieldQty: 1, useQty: 1, notes: 'Não é sacola — envelope' },
    { id: 'intl-envelope-sticker', name: 'Adesivo do envelope', buyQty: 1000, buyPrice: 60, yieldQty: 1, useQty: 1, notes: 'Mesmo adesivo 1000×R$ 60; 1 por lente' },
    { id: 'intl-sulfite', name: 'Carta sulfite', buyQty: 1000, buyPrice: 59, yieldQty: 1, useQty: 1, notes: '1 folha sulfite impressa por envio' },
    { id: 'film', name: 'Película / lente', buyQty: 10, buyPrice: 49, yieldQty: 30, useQty: 1, notes: '10 folhas a R$ 49; 30 lentes por folha' },
    { id: 'sticker-cut', name: 'Adesivo + recorte das lentes', buyQty: 10, buyPrice: 271, yieldQty: 30, useQty: 1, notes: 'Adesivo e recorte juntos; 300 lentes' }
  ];

  const LEGACY_API_BASE = 'https://sensortattoofix-payments.sensortattoofix.workers.dev';

  function resolveApiBaseUrl(raw) {
    const canonical = (bootstrap.configApiUrl || 'https://api.sensortattoofix.com.br').replace(/\/$/, '');
    const url = String(raw || '').trim().replace(/\/$/, '');
    if (!url || url === LEGACY_API_BASE) return canonical;
    return url;
  }

  function apiBase() {
    const loggedIn = !!sessionStorage.getItem(SESSION_KEY);
    const raw = (loggedIn && els.configForm?.apiBaseUrl?.value) || bootstrap.configApiUrl || '';
    return resolveApiBaseUrl(raw);
  }

  function escapeHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  }

  function statusEl(target) {
    if (target === 'panel' || target === 'save') return els.statusPanel;
    if (target === 'top') return els.statusTop;
    if (target === 'frete') return els.statusFrete;
    if (target === 'contato') return els.statusContato;
    if (target === 'cliques') return document.getElementById('admin-status-cliques');
    if (target === 'vendas') return document.getElementById('admin-status-vendas');
    if (target === 'pesquisa') return document.getElementById('admin-status-pesquisa');
    return els.statusMsg;
  }

  function showStatus(text, type, target) {
    const el = statusEl(target);
    if (!el) return;
    if (el._statusTimer) {
      clearTimeout(el._statusTimer);
      el._statusTimer = null;
    }
    el.textContent = text;
    el.className = 'admin-status form-status ' + (type || '');
    if (target === 'save' || target === 'panel') {
      el.classList.add('admin-status-sticky');
    }
    el.hidden = !text;
    const sticky = target === 'save' || target === 'panel';
    if (text && !sticky) {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
    if (text && !sticky && (type === 'success' || type === 'error' || type === 'warning')) {
      el._statusTimer = setTimeout(() => {
        el.hidden = true;
        el.textContent = '';
        el.className = 'admin-status form-status';
        el._statusTimer = null;
      }, 5000);
    }
  }

  function setModeBadge(online) {
    if (!els.modeBadge) return;
    els.modeBadge.textContent = online ? 'API conectada' : 'Modo arquivo local';
    els.modeBadge.className = 'admin-mode-badge ' + (online ? 'online' : 'offline');
  }

  async function loadConfig() {
    const base = apiBase();
    const token = sessionStorage.getItem(SESSION_KEY);
    let local = null;
    try {
      const localRes = await fetch('/data/store-config.json?v=' + Date.now());
      if (localRes.ok) local = await localRes.json();
    } catch (e) {
      console.warn(e);
    }

    if (base && token) {
      try {
        const res = await fetch(base.replace(/\/$/, '') + '/admin/config', {
          headers: { Authorization: 'Bearer ' + token },
          cache: 'no-store'
        });
        if (res.ok) {
          let apiConfig = await res.json();
          if (local && window.STF_PRODUCT_MERGE) {
            const mergeFn = window.STF_PRODUCT_MERGE.mergeMissingCatalogProducts
              || window.STF_PRODUCT_MERGE.mergeMissingAggregated;
            if (mergeFn) apiConfig = mergeFn(apiConfig, local);
          }
          currentConfig = apiConfig;
          setModeBadge(true);
          return currentConfig;
        }
      } catch (e) {
        console.warn(e);
      }
    }

    if (base) {
      try {
        const res = await fetch(base.replace(/\/$/, '') + '/config', { cache: 'no-store' });
        if (res.ok) {
          let apiConfig = await res.json();
          if (local && window.STF_PRODUCT_MERGE) {
            apiConfig = window.STF_PRODUCT_MERGE.mergeConfig(apiConfig, local);
          }
          currentConfig = apiConfig;
          setModeBadge(true);
          return currentConfig;
        }
      } catch (e) {
        console.warn(e);
      }
    }

    if (local) {
      currentConfig = local;
      setModeBadge(false);
      return currentConfig;
    }

    const res = await fetch('/data/store-config.json?v=' + Date.now());
    currentConfig = await res.json();
    setModeBadge(false);
    return currentConfig;
  }

  function escAttr(text) {
    return String(text || '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;');
  }

  function escTextarea(text) {
    return String(text || '').replace(/<\/textarea/gi, '&lt;/textarea');
  }

  function slugify(text) {
    return String(text || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || 'produto';
  }

  function getProductsFromConfig(config) {
    if (config.products?.length) return config.products;
    if (config.product) {
      return [{
        id: 'kit-sensor-tattoofix',
        slug: 'kit-sensor-tattoofix',
        name: config.product.name,
        description: config.product.description,
        price: config.product.price,
        image: config.product.image,
        active: true,
        requiresSmartwatch: true,
        weightGrams: 3
      }];
    }
    return [];
  }

  const QUOTE_SOURCE_LABELS = {
    correios: 'API Correios (Mini Envios)',
    'correios-export': 'Simulador Exporta Fácil (Correios)',
    config: 'Tabela fallback do admin — API falhou!',
    estimate: 'Estimativa máxima (teto) — API Correios indisponível ou sem preço válido'
  };

  function renderIntlShipping(zones) {
    const list = document.getElementById('admin-intl-zones');
    if (!list) return;
    const entries = Object.entries(zones || {}).sort((a, b) => a[0].localeCompare(b[0]));
    list.innerHTML = entries.map(([code, z]) => `
      <div class="admin-intl-row" data-code="${escAttr(code)}">
        <div class="admin-intl-grid">
          <label>Código
            <span class="admin-intl-code-field">${escAttr(code)}</span>
          </label>
          <label>País
            <input type="text" data-field="label" value="${escAttr(z.label || code)}">
          </label>
          <label>Fallback (R$)
            <input type="number" data-field="price" step="0.01" min="0" value="${z.price ?? 0}">
          </label>
          <label>Prazo (dias)
            <input type="number" data-field="days" min="1" step="1" value="${z.days ?? 15}">
          </label>
        </div>
      </div>
    `).join('');
  }

  function collectIntlShipping() {
    const list = document.getElementById('admin-intl-zones');
    if (!list) return currentConfig?.internationalShipping || {};
    const zones = {};
    list.querySelectorAll('.admin-intl-row').forEach((row) => {
      const code = row.getAttribute('data-code') || '';
      if (!code) return;
      zones[code] = {
        label: row.querySelector('[data-field="label"]')?.value.trim() || code,
        price: parseFloat(row.querySelector('[data-field="price"]')?.value) || 0,
        days: parseInt(row.querySelector('[data-field="days"]')?.value, 10) || 15,
        currency: 'BRL'
      };
    });
    return zones;
  }

  function formatQuoteOption(opt, i) {
    const price = Number(opt.price || 0).toFixed(2).replace('.', ',');
    const surchargeLine = opt.intlSurcharge > 0
      ? `   (+ R$ ${Number(opt.intlSurcharge).toFixed(2).replace('.', ',')}${opt.intlMultiplier ? ` · ×${opt.intlMultiplier}` : ''}${opt.intlFlatSurcharge ? ` + R$ ${Number(opt.intlFlatSurcharge).toFixed(2).replace('.', ',')}` : ''} sobre R$ ${Number(opt.intlBasePrice || 0).toFixed(2).replace('.', ',')})`
      : '';
    return [
      `${i + 1}. ${opt.service || '—'}`,
      `   R$ ${price} · ${opt.days ?? '—'} dias · ${QUOTE_SOURCE_LABELS[opt.source] || opt.source || '—'}`,
      surchargeLine,
      opt.serviceCode ? `   Código: ${opt.serviceCode}` : ''
    ].filter(Boolean).join('\n');
  }

  function formatQuoteResult(data) {
    if (!data || data.error) return 'Erro: ' + (data?.error || 'cotação indisponível');
    if (Array.isArray(data.options) && data.options.length) {
      const header = `Peso: ${data.weightGrams || '—'} g · ${data.options.length} opção(ões) para o cliente:\n`;
      return header + data.options.map((opt, i) => formatQuoteOption(opt, i)).join('\n');
    }
    return formatQuoteOption(data, 0);
  }

  function defaultShippingMethods() {
    return [
      { id: 'br-mini-envios', enabled: true, scope: 'BR', label: 'Mini Envios', correiosCode: '04227', provider: 'correios' },
      { id: 'br-carta-registrada', enabled: false, scope: 'BR', label: 'Carta Registrada', correiosCode: '8010', provider: 'correios' },
      { id: 'br-sf-pac', enabled: false, scope: 'BR', label: 'PAC', provider: 'superfrete', superfreteService: 1 },
      { id: 'br-sf-sedex', enabled: false, scope: 'BR', label: 'SEDEX', provider: 'superfrete', superfreteService: 2 },
      { id: 'br-sf-mini', enabled: false, scope: 'BR', label: 'Mini Envios', provider: 'superfrete', superfreteService: 17 },
      { id: 'br-sf-jadlog', enabled: true, scope: 'BR', label: 'Jadlog', provider: 'superfrete', superfreteService: 3 },
      { id: 'br-sf-loggi', enabled: true, scope: 'BR', label: 'Loggi', provider: 'superfrete', superfreteService: 31 },
      { id: 'br-motoboy', enabled: false, scope: 'BR', label: 'Envio particular (motoboy — até 24h)', provider: 'motoboy' },
      { id: 'br-uber-direct', enabled: false, scope: 'BR', label: 'Entrega Uber (rápida)', provider: 'uber' },
      { id: 'int-encomenda', enabled: true, scope: 'INT', label: 'Encomenda internacional (Exporta Fácil)', correiosCode: '*', simTipo: 'M' },
      { id: 'int-documento', enabled: true, scope: 'INT', label: 'Documento / carta internacional', correiosCode: '*', simTipo: 'D' }
    ];
  }

  function defaultMotoboyShipping() {
    return {
      enabled: true,
      basePrice: 12,
      pricePerKm: 2.8,
      minPrice: 18,
      maxRadiusKm: 35,
      roadFactor: 1.25,
      deliveryHours: 24,
      couriers: []
    };
  }

  function renderCoupons(coupons) {
    const list = document.getElementById('admin-coupons');
    if (!list) return;
    const rows = Array.isArray(coupons) ? coupons : [];
    if (!rows.length) {
      list.innerHTML = '<p class="admin-meta">Nenhum cupom. Só código + desconto = cupom da loja. Com e-mail = comissionado (recebe e-mail na venda).</p>';
      return;
    }
    list.innerHTML = rows.map((c, i) => {
      const hasCommissioner = String(c.email || '').includes('@');
      const defaultComm = hasCommissioner ? (c.commissionPercent ?? 20) : 0;
      return `
      <div class="admin-coupon-row" data-coupon-index="${i}">
        <div class="admin-coupon-grid">
          <label class="label-check admin-coupon-active">
            <input type="checkbox" data-field="active" ${c.active !== false ? 'checked' : ''}>
            <span>Ativo</span>
          </label>
          <label>Código
            <input type="text" data-field="code" value="${escAttr(c.code || '')}" placeholder="MEUKIT10" maxlength="32" autocapitalize="characters">
          </label>
          <label>Nome do comissionado <span class="admin-field-hint">(opcional)</span>
            <input type="text" data-field="name" value="${escAttr(c.name || '')}" placeholder="Deixe vazio se for cupom só seu">
          </label>
          <label>E-mail do comissionado <span class="admin-field-hint">(opcional)</span>
            <input type="email" data-field="email" value="${escAttr(c.email || '')}" placeholder="Vazio = sem e-mail de comissão">
          </label>
          <label>Desconto ao cliente (%)
            <input type="number" data-field="percent" min="0" max="100" step="0.01" value="${escAttr(c.percent ?? 10)}">
          </label>
          <label>Comissão do comissionado (%)
            <input type="number" data-field="commissionPercent" min="0" max="100" step="0.01" value="${escAttr(defaultComm)}" title="Use 0 se não houver comissionado">
          </label>
          <input type="hidden" data-field="id" value="${escAttr(c.id || `coupon-${i + 1}`)}">
        </div>
        <p class="admin-meta admin-coupon-kind">${hasCommissioner ? 'Comissionado — e-mail na venda paga' : 'Só desconto (loja) — sem e-mail de comissão'}</p>
        <button type="button" class="btn-secondary btn-remove-coupon" data-index="${i}"><i class="fas fa-trash"></i> Remover</button>
      </div>
    `;
    }).join('');

    list.querySelectorAll('.btn-remove-coupon').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-index'));
        const next = collectCoupons().filter((_, j) => j !== idx);
        renderCoupons(next);
      });
    });
  }

  function collectCoupons() {
    const list = document.getElementById('admin-coupons');
    if (!list) return currentConfig?.coupons || [];
    return [...list.querySelectorAll('.admin-coupon-row')].map((row, i) => {
      const val = (field) => {
        const el = row.querySelector(`[data-field="${field}"]`);
        if (!el) return '';
        if (el.type === 'checkbox') return el.checked;
        return el.value;
      };
      const code = String(val('code') || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      const percent = Math.min(100, Math.max(0, parseFloat(val('percent')) || 0));
      const email = String(val('email') || '').trim().toLowerCase();
      const hasCommissioner = email.includes('@');
      let commissionPercent = Math.min(100, Math.max(0, parseFloat(val('commissionPercent')) || 0));
      if (!hasCommissioner) commissionPercent = 0;
      return {
        id: String(val('id') || `coupon-${i + 1}`).trim(),
        active: val('active') !== false,
        code,
        name: hasCommissioner ? String(val('name') || '').trim() : '',
        email: hasCommissioner ? email : '',
        percent,
        commissionPercent
      };
    }).filter((c) => c.code || c.email || c.name);
  }

  function renderHomeFaq(rows) {
    const list = document.getElementById('admin-home-faq');
    if (!list) return;
    const items = Array.isArray(rows) ? rows.slice().sort((a, b) => (a.order || 0) - (b.order || 0)) : [];
    if (!items.length) {
      list.innerHTML = '<p class="admin-meta">Nenhuma pergunta. Clique em Adicionar pergunta.</p>';
      return;
    }
    list.innerHTML = items.map((row, i) => {
      const media = row.media || {};
      return `
      <div class="admin-coupon-row admin-home-faq-row" data-faq-index="${i}">
        <div class="admin-coupon-grid">
          <label class="label-check admin-coupon-active">
            <input type="checkbox" data-field="active" ${row.active !== false ? 'checked' : ''}>
            <span>Ativo</span>
          </label>
          <label>Ordem
            <input type="number" data-field="order" min="1" step="1" value="${escAttr(row.order ?? i + 1)}">
          </label>
          <label class="full">Pergunta (PT)
            <input type="text" data-field="question" value="${escAttr(row.question || '')}">
          </label>
          <label class="full">Pergunta (EN)
            <input type="text" data-field="questionEn" value="${escAttr(row.questionEn || '')}">
          </label>
          <label class="full">Pergunta (IT)
            <input type="text" data-field="questionIt" value="${escAttr(row.questionIt || '')}">
          </label>
          <label class="full">Resposta (PT) — HTML ok
            <textarea data-field="answer" rows="3">${escTextarea(row.answer || '')}</textarea>
          </label>
          <label class="full">Resposta (EN)
            <textarea data-field="answerEn" rows="3">${escTextarea(row.answerEn || '')}</textarea>
          </label>
          <label class="full">Resposta (IT)
            <textarea data-field="answerIt" rows="3">${escTextarea(row.answerIt || '')}</textarea>
          </label>
          <label>Mídia
            <select data-field="mediaType">
              <option value="" ${!media.type ? 'selected' : ''}>Nenhuma</option>
              <option value="instagram" ${media.type === 'instagram' ? 'selected' : ''}>Instagram</option>
              <option value="tiktok" ${media.type === 'tiktok' ? 'selected' : ''}>TikTok</option>
            </select>
          </label>
          <label class="full">URL Instagram (permalink)
            <input type="url" data-field="instagramPermalink" value="${escAttr(media.instagramPermalink || '')}" placeholder="https://www.instagram.com/reel/...">
          </label>
          <label>ID TikTok
            <input type="text" data-field="tiktokId" value="${escAttr(media.tiktokId || '')}">
          </label>
          <label class="full">URL TikTok
            <input type="url" data-field="tiktokHref" value="${escAttr(media.tiktokHref || '')}">
          </label>
          <label>Handle TikTok
            <input type="text" data-field="tiktokHandle" value="${escAttr(media.tiktokHandle || '')}" placeholder="@usuario">
          </label>
          <label class="full">Título TikTok (acessibilidade)
            <input type="text" data-field="tiktokTitle" value="${escAttr(media.tiktokTitle || '')}">
          </label>
          <input type="hidden" data-field="id" value="${escAttr(row.id || `faq-${i + 1}`)}">
        </div>
        <button type="button" class="btn-secondary btn-remove-home-faq" data-index="${i}"><i class="fas fa-trash"></i> Remover</button>
      </div>`;
    }).join('');
    list.querySelectorAll('.btn-remove-home-faq').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-index'));
        renderHomeFaq(collectHomeFaq().filter((_, j) => j !== idx));
      });
    });
  }

  function collectHomeFaq() {
    const list = document.getElementById('admin-home-faq');
    if (!list) return currentConfig?.homeFaq || [];
    return [...list.querySelectorAll('.admin-home-faq-row')].map((row, i) => {
      const val = (field) => {
        const el = row.querySelector(`[data-field="${field}"]`);
        if (!el) return '';
        if (el.type === 'checkbox') return el.checked;
        return el.value;
      };
      const mediaType = String(val('mediaType') || '').trim();
      let media = null;
      if (mediaType === 'instagram') {
        const url = String(val('instagramPermalink') || '').trim();
        if (url) media = { type: 'instagram', instagramPermalink: url };
      } else if (mediaType === 'tiktok') {
        media = {
          type: 'tiktok',
          tiktokId: String(val('tiktokId') || '').trim(),
          tiktokHref: String(val('tiktokHref') || '').trim(),
          tiktokHandle: String(val('tiktokHandle') || '').trim(),
          tiktokTitle: String(val('tiktokTitle') || '').trim()
        };
      }
      return {
        id: String(val('id') || `faq-${i + 1}`).trim(),
        active: val('active') !== false,
        order: Math.max(1, parseInt(val('order'), 10) || i + 1),
        question: String(val('question') || '').trim(),
        questionEn: String(val('questionEn') || '').trim(),
        questionIt: String(val('questionIt') || '').trim(),
        answer: String(val('answer') || '').trim(),
        answerEn: String(val('answerEn') || '').trim(),
        answerIt: String(val('answerIt') || '').trim(),
        media
      };
    }).filter((r) => r.question || r.questionEn);
  }

  function renderHomeReviews(rows) {
    const list = document.getElementById('admin-home-reviews');
    if (!list) return;
    const items = Array.isArray(rows) ? rows.slice().sort((a, b) => (a.order || 0) - (b.order || 0)) : [];
    if (!items.length) {
      list.innerHTML = '<p class="admin-meta">Nenhum elogio. Clique em Adicionar elogio.</p>';
      return;
    }
    list.innerHTML = items.map((row, i) => `
      <div class="admin-coupon-row admin-home-review-row" data-review-index="${i}">
        <div class="admin-coupon-grid">
          <label class="label-check admin-coupon-active">
            <input type="checkbox" data-field="active" ${row.active !== false ? 'checked' : ''}>
            <span>Ativo</span>
          </label>
          <label>Ordem
            <input type="number" data-field="order" min="1" step="1" value="${escAttr(row.order ?? i + 1)}">
          </label>
          <label>Estrelas
            <input type="number" data-field="rating" min="1" max="5" step="1" value="${escAttr(row.rating ?? 5)}">
          </label>
          <label class="full">Texto (PT)
            <textarea data-field="body" rows="2">${escTextarea(row.body || '')}</textarea>
          </label>
          <label class="full">Texto (EN)
            <textarea data-field="bodyEn" rows="2">${escTextarea(row.bodyEn || '')}</textarea>
          </label>
          <label class="full">Texto (IT)
            <textarea data-field="bodyIt" rows="2">${escTextarea(row.bodyIt || '')}</textarea>
          </label>
          <label>Nome (PT)
            <input type="text" data-field="author" value="${escAttr(row.author || '')}">
          </label>
          <label>Nome (EN)
            <input type="text" data-field="authorEn" value="${escAttr(row.authorEn || '')}">
          </label>
          <label>Nome (IT)
            <input type="text" data-field="authorIt" value="${escAttr(row.authorIt || '')}">
          </label>
          <label>Fonte (PT)
            <input type="text" data-field="source" value="${escAttr(row.source || '')}" placeholder="Google, Mercado Livre…">
          </label>
          <label>Fonte (EN)
            <input type="text" data-field="sourceEn" value="${escAttr(row.sourceEn || '')}">
          </label>
          <label>Fonte (IT)
            <input type="text" data-field="sourceIt" value="${escAttr(row.sourceIt || '')}">
          </label>
          <input type="hidden" data-field="id" value="${escAttr(row.id || `review-${i + 1}`)}">
        </div>
        <button type="button" class="btn-secondary btn-remove-home-review" data-index="${i}"><i class="fas fa-trash"></i> Remover</button>
      </div>
    `).join('');
    list.querySelectorAll('.btn-remove-home-review').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-index'));
        renderHomeReviews(collectHomeReviews().filter((_, j) => j !== idx));
      });
    });
  }

  function collectHomeReviews() {
    const list = document.getElementById('admin-home-reviews');
    if (!list) return currentConfig?.homeReviews || [];
    return [...list.querySelectorAll('.admin-home-review-row')].map((row, i) => {
      const val = (field) => {
        const el = row.querySelector(`[data-field="${field}"]`);
        if (!el) return '';
        if (el.type === 'checkbox') return el.checked;
        return el.value;
      };
      return {
        id: String(val('id') || `review-${i + 1}`).trim(),
        active: val('active') !== false,
        order: Math.max(1, parseInt(val('order'), 10) || i + 1),
        rating: Math.min(5, Math.max(1, parseInt(val('rating'), 10) || 5)),
        body: String(val('body') || '').trim(),
        bodyEn: String(val('bodyEn') || '').trim(),
        bodyIt: String(val('bodyIt') || '').trim(),
        author: String(val('author') || '').trim(),
        authorEn: String(val('authorEn') || '').trim(),
        authorIt: String(val('authorIt') || '').trim(),
        source: String(val('source') || '').trim(),
        sourceEn: String(val('sourceEn') || '').trim(),
        sourceIt: String(val('sourceIt') || '').trim()
      };
    }).filter((r) => r.body || r.bodyEn);
  }

  function wireHomeContentAdmin() {
    if (wireHomeContentAdmin._wired) return;
    wireHomeContentAdmin._wired = true;
    document.getElementById('btn-add-home-faq')?.addEventListener('click', () => {
      const rows = collectHomeFaq();
      const n = rows.length + 1;
      rows.push({
        id: `faq-${Date.now()}`,
        active: true,
        order: n,
        question: '',
        questionEn: '',
        questionIt: '',
        answer: '',
        answerEn: '',
        answerIt: '',
        media: null
      });
      renderHomeFaq(rows);
    });
    document.getElementById('btn-add-home-review')?.addEventListener('click', () => {
      const rows = collectHomeReviews();
      const n = rows.length + 1;
      rows.push({
        id: `review-${Date.now()}`,
        active: true,
        order: n,
        rating: 5,
        body: '',
        bodyEn: '',
        bodyIt: '',
        author: '',
        authorEn: '',
        authorIt: '',
        source: '',
        sourceEn: '',
        sourceIt: ''
      });
      renderHomeReviews(rows);
    });
  }

  function renderMotoboyCouriers(couriers) {
    const list = document.getElementById('admin-motoboy-couriers');
    if (!list) return;
    const rows = Array.isArray(couriers) ? couriers : [];
    if (!rows.length) {
      list.innerHTML = '<p class="admin-meta">Nenhum motoboy cadastrado. Adicione nome e e-mail para receber pedidos pagos.</p>';
      return;
    }
    list.innerHTML = rows.map((c, i) => `
      <div class="admin-motoboy-row" data-courier-index="${i}">
        <div class="admin-motoboy-grid">
          <label class="label-check admin-motoboy-active">
            <input type="checkbox" data-field="active" ${c.active !== false ? 'checked' : ''}>
            <span>Ativo</span>
          </label>
          <label>Nome
            <input type="text" data-field="name" value="${escAttr(c.name || '')}" placeholder="João Silva">
          </label>
          <label>E-mail
            <input type="email" data-field="email" value="${escAttr(c.email || '')}" placeholder="motoboy@email.com">
          </label>
          <label>WhatsApp
            <input type="text" data-field="phone" value="${escAttr(c.phone || '')}" placeholder="11999999999">
          </label>
          <input type="hidden" data-field="id" value="${escAttr(c.id || `courier-${i + 1}`)}">
        </div>
        <button type="button" class="btn-secondary btn-remove-motoboy" data-index="${i}"><i class="fas fa-trash"></i> Remover</button>
      </div>
    `).join('');

    list.querySelectorAll('.btn-remove-motoboy').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-index'));
        const next = collectMotoboyCouriers().filter((_, j) => j !== idx);
        renderMotoboyCouriers(next);
      });
    });
  }

  function collectMotoboyCouriers() {
    const list = document.getElementById('admin-motoboy-couriers');
    if (!list) return currentConfig?.motoboyShipping?.couriers || [];
    return [...list.querySelectorAll('.admin-motoboy-row')].map((row, i) => {
      const val = (field) => {
        const el = row.querySelector(`[data-field="${field}"]`);
        if (!el) return '';
        if (el.type === 'checkbox') return el.checked;
        return el.value.trim();
      };
      return {
        id: val('id') || `courier-${i + 1}`,
        active: val('active'),
        name: val('name'),
        email: val('email'),
        phone: val('phone')
      };
    });
  }

  function syncMotoboyShippingMethods(methods, motoboy) {
    const list = Array.isArray(methods) ? [...methods] : [];
    const hasActiveCourier = (motoboy.couriers || []).some(
      (c) => c?.active !== false && String(c.email || '').includes('@')
    );
    const shouldEnable = motoboy.enabled !== false && hasActiveCourier;
    let idx = list.findIndex((m) => m.provider === 'motoboy' || String(m.id || '').includes('motoboy'));
    if (idx === -1) {
      list.push({
        id: 'br-motoboy',
        enabled: shouldEnable,
        scope: 'BR',
        label: 'Envio particular (motoboy — até 24h)',
        provider: 'motoboy'
      });
    } else {
      list[idx] = { ...list[idx], enabled: shouldEnable, provider: 'motoboy' };
    }
    return list;
  }

  function collectMotoboyShipping() {
    const f = els.configForm;
    return {
      enabled: f?.motoboyEnabled?.checked !== false,
      basePrice: parseFloat(f?.motoboyBasePrice?.value) || 12,
      pricePerKm: parseFloat(f?.motoboyPricePerKm?.value) || 2.8,
      minPrice: parseFloat(f?.motoboyMinPrice?.value) || 18,
      maxRadiusKm: parseFloat(f?.motoboyMaxRadiusKm?.value) || 35,
      roadFactor: parseFloat(f?.motoboyRoadFactor?.value) || 1.25,
      deliveryHours: parseInt(f?.motoboyDeliveryHours?.value, 10) || 24,
      couriers: collectMotoboyCouriers()
    };
  }

  function renderShippingMethods(methods) {
    const list = document.getElementById('admin-shipping-methods');
    if (!list) return;
    const rows = (methods?.length ? methods : defaultShippingMethods());
    list.innerHTML = rows.map((m, i) => `
      <div class="admin-ship-method-row" data-method-index="${i}">
        <div class="admin-ship-method-grid">
          <label class="label-check admin-ship-enabled">
            <input type="checkbox" data-field="enabled" ${m.enabled !== false ? 'checked' : ''}>
            <span>Ativo</span>
          </label>
          <label>Escopo
            <select data-field="scope">
              <option value="BR" ${m.scope === 'BR' ? 'selected' : ''}>Brasil</option>
              <option value="INT" ${m.scope === 'INT' ? 'selected' : ''}>Internacional</option>
            </select>
          </label>
          <label data-correios-code-wrap ${m.provider === 'uber' || m.provider === 'motoboy' || m.provider === 'superfrete' ? 'hidden' : ''}>Código Correios
            <input type="text" data-field="correiosCode" value="${escAttr(m.correiosCode || '')}" placeholder="04227 ou *">
          </label>
          <label data-sf-service-wrap ${m.provider === 'superfrete' ? '' : 'hidden'}>Serviço Super Frete
            <select data-field="superfreteService">
              <option value="1" ${Number(m.superfreteService) === 1 ? 'selected' : ''}>1 — PAC</option>
              <option value="2" ${Number(m.superfreteService) === 2 ? 'selected' : ''}>2 — SEDEX</option>
              <option value="17" ${Number(m.superfreteService) === 17 ? 'selected' : ''}>17 — Mini Envios</option>
              <option value="3" ${Number(m.superfreteService) === 3 ? 'selected' : ''}>3 — Jadlog</option>
              <option value="31" ${Number(m.superfreteService) === 31 ? 'selected' : ''}>31 — Loggi</option>
              <option value="33" ${Number(m.superfreteService) === 33 ? 'selected' : ''}>33 — J&amp;T</option>
            </select>
          </label>
          <label data-provider-wrap ${m.scope === 'BR' ? '' : 'hidden'}>Provedor
            <select data-field="provider">
              <option value="correios" ${(m.provider || 'correios') === 'correios' ? 'selected' : ''}>Correios</option>
              <option value="superfrete" ${m.provider === 'superfrete' ? 'selected' : ''}>Super Frete</option>
              <option value="motoboy" ${m.provider === 'motoboy' ? 'selected' : ''}>Motoboy (particular)</option>
              <option value="uber" ${m.provider === 'uber' ? 'selected' : ''}>Uber Direct</option>
            </select>
          </label>
          <label data-sim-tipo-wrap ${m.scope === 'INT' ? '' : 'hidden'}>Tipo simulador
            <select data-field="simTipo">
              <option value="M" ${(m.simTipo || 'M') === 'M' ? 'selected' : ''}>M — Encomenda</option>
              <option value="D" ${m.simTipo === 'D' ? 'selected' : ''}>D — Documento</option>
            </select>
          </label>
          <label class="admin-ship-label-wide">Nome exibido no checkout
            <input type="text" data-field="label" value="${escAttr(m.label || '')}">
          </label>
          <input type="hidden" data-field="id" value="${escAttr(m.id || `method-${i}`)}">
        </div>
        <button type="button" class="btn-secondary btn-remove-ship-method" data-index="${i}"><i class="fas fa-trash"></i> Remover</button>
      </div>
    `).join('');

    list.querySelectorAll('.btn-remove-ship-method').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-index'));
        const next = collectShippingMethods().filter((_, j) => j !== idx);
        renderShippingMethods(next.length ? next : defaultShippingMethods());
      });
    });

    list.querySelectorAll('[data-field="scope"]').forEach((sel) => {
      sel.addEventListener('change', () => {
        const row = sel.closest('.admin-ship-method-row');
        const wrap = row?.querySelector('[data-sim-tipo-wrap]');
        if (wrap) wrap.hidden = sel.value !== 'INT';
        const correiosWrap = row?.querySelector('[data-correios-code-wrap]');
        const sfWrap = row?.querySelector('[data-sf-service-wrap]');
        const providerWrap = row?.querySelector('[data-provider-wrap]');
        const provider = row?.querySelector('[data-field="provider"]')?.value || 'correios';
        if (providerWrap) providerWrap.hidden = sel.value !== 'BR';
        if (correiosWrap) {
          correiosWrap.hidden = provider === 'uber' || provider === 'motoboy'
            || provider === 'superfrete' || sel.value !== 'BR';
        }
        if (sfWrap) sfWrap.hidden = provider !== 'superfrete' || sel.value !== 'BR';
      });
    });

    list.querySelectorAll('[data-field="provider"]').forEach((sel) => {
      sel.addEventListener('change', () => {
        const row = sel.closest('.admin-ship-method-row');
        const correiosWrap = row?.querySelector('[data-correios-code-wrap]');
        const sfWrap = row?.querySelector('[data-sf-service-wrap]');
        if (correiosWrap) {
          correiosWrap.hidden = sel.value === 'uber' || sel.value === 'motoboy'
            || sel.value === 'superfrete';
        }
        if (sfWrap) sfWrap.hidden = sel.value !== 'superfrete';
      });
    });
  }

  function collectShippingMethods() {
    const list = document.getElementById('admin-shipping-methods');
    if (!list) return currentConfig?.shippingMethods || defaultShippingMethods();
    return [...list.querySelectorAll('.admin-ship-method-row')].map((row, i) => {
      const val = (field) => {
        const el = row.querySelector(`[data-field="${field}"]`);
        if (!el) return '';
        if (el.type === 'checkbox') return el.checked;
        return el.value.trim();
      };
      const id = val('id') || `method-${i + 1}`;
      const scope = val('scope') || 'BR';
      const provider = val('provider') || 'correios';
      const entry = {
        id,
        enabled: val('enabled'),
        scope,
        label: val('label') || id,
        provider
      };
      if (provider === 'superfrete') {
        entry.superfreteService = Number(val('superfreteService')) || 1;
      } else if (provider !== 'uber' && provider !== 'motoboy') {
        entry.correiosCode = val('correiosCode');
      }
      if (scope === 'INT') entry.simTipo = val('simTipo') || 'M';
      return entry;
    });
  }

  function showQuoteResult(text) {
    document.querySelectorAll('#admin-tab-frete .admin-quote-result').forEach((el) => {
      el.textContent = text;
      el.hidden = !text;
    });
  }

  function showFreteSubtab(subtabId) {
    const container = document.getElementById('admin-tab-frete');
    if (!container) return;
    const id = subtabId || 'origem';
    container.querySelectorAll('[data-frete-subtab]').forEach((tab) => {
      const active = tab.dataset.freteSubtab === id;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    container.querySelectorAll('.admin-frete-subpanel').forEach((panel) => {
      panel.hidden = panel.id !== 'admin-frete-' + id;
    });
    try { localStorage.setItem('stf_admin_frete_subtab', id); } catch (e) { /* ignore */ }
    if (id === 'correios') loadShippingStatus();
  }

  let freteSubtabsWired = false;

  function initFreteSubtabs() {
    if (freteSubtabsWired) return;
    const container = document.getElementById('admin-tab-frete');
    if (!container) return;
    const tabs = container.querySelectorAll('[data-frete-subtab]');
    if (!tabs.length) return;
    freteSubtabsWired = true;
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => showFreteSubtab(tab.dataset.freteSubtab));
    });
    let saved = 'origem';
    try { saved = localStorage.getItem('stf_admin_frete_subtab') || 'origem'; } catch (e) { /* ignore */ }
    if (!container.querySelector('#admin-frete-' + saved)) saved = 'origem';
    showFreteSubtab(saved);
  }

  function formatSalesBRL(n) {
    return Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function salesMoneyCell(kind, value, label, title, op, unresolved) {
    if (unresolved) {
      const shown = op ? `${op}\u00a0—` : '—';
      const hint = `${label} — não identificado ainda (aguardando Envios do ML)`;
      return `<span class="sales-tree-money sales-tree-${kind} sales-tree-unresolved" data-label="Frete não id." title="${escapeHtml(hint)}">${escapeHtml(shown)}</span>`;
    }
    const amount = formatSalesBRL(value);
    const shown = op ? `${op}\u00a0${amount}` : amount;
    const hint = `${label} — ${title}`;
    return `<span class="sales-tree-money sales-tree-${kind}" data-label="${escapeHtml(label)}" title="${escapeHtml(hint)}">${escapeHtml(shown)}</span>`;
  }

  function mlShippingUnresolved(sale) {
    return sm().mlShippingUnresolved ? sm().mlShippingUnresolved(sale) : false;
  }

  function renderSaleMoneyCols(sale, channelHint) {
    const tagged = sale?.channel ? sale : { ...sale, channel: channelHint };
    const other = (tagged._refunds || 0) + (tagged._otherFees || 0);
    const feesShown = (tagged._fees || 0) + other;
    const shipUnresolved = mlShippingUnresolved(tagged);
    return [
      salesMoneyCell('paid', tagged._gross, 'Preço', 'Preço do produto (anúncio / recibo)', ''),
      salesMoneyCell('fee', feesShown, saleFeeHoverLabel(tagged), saleFeeHoverHint(tagged), '−'),
      salesMoneyCell('ship', tagged._shipping || 0, 'Frete', shipUnresolved ? 'Frete ainda não identificado no ML' : saleShipHoverHint(tagged), '−', shipUnresolved),
      salesMoneyCell('kit', Number(tagged._cogs) || 0, 'Kit', 'Custo do kit (BOM em Produtos)', '−'),
      salesMoneyCell('net', tagged._net, 'Líquido', shipUnresolved ? 'Líquido provisório (frete não identificado)' : 'Líquido: Preço − Tarifa − Frete − Kit', '=')
    ].join('');
  }

  function saleChannelKey(sale) {
    const ch = String(sale?.channel || '').toLowerCase();
    if (ch === 'ml' || ch === 'mercadolivre') return 'mercadolivre';
    if (ch === 'amz' || ch === 'amazon') return 'amazon';
    if (ch === 'shp' || ch === 'shopee') return 'shopee';
    if (ch === 'loja' || ch === 'store') return 'loja';
    return ch;
  }

  function saleFeeHoverLabel(sale) {
    switch (saleChannelKey(sale)) {
      case 'mercadolivre': return 'Tarifa ML';
      case 'shopee': return 'Tarifa Shopee';
      case 'amazon': return 'Tarifa Amazon';
      default: return 'Tarifa';
    }
  }

  function saleFeeHoverHint(sale) {
    switch (saleChannelKey(sale)) {
      case 'mercadolivre': return 'Comissão do Mercado Livre';
      case 'shopee': return 'Taxas e encargos da Shopee';
      case 'amazon': return 'Comissão e taxas da Amazon';
      case 'loja': return 'Taxas de pagamento';
      default: return 'Comissão / taxas do canal';
    }
  }

  function saleShipHoverHint(sale) {
    switch (saleChannelKey(sale)) {
      case 'mercadolivre': return 'Frete Envios ou Flex (custo do vendedor)';
      case 'shopee': return 'Frete do vendedor no recibo (Shopee)';
      case 'amazon': return 'Frete do vendedor (Amazon)';
      default: return 'Frete (custo do vendedor)';
    }
  }

  function renderSaleMoneyCols(sale, channelHint) {
    const tagged = sale?.channel ? sale : { ...sale, channel: channelHint };
    const other = (tagged._refunds || 0) + (tagged._otherFees || 0);
    const feesShown = (tagged._fees || 0) + other;
    return [
      salesMoneyCell('paid', tagged._gross, 'Preço', 'Preço do produto (anúncio / recibo)', ''),
      salesMoneyCell('fee', feesShown, saleFeeHoverLabel(tagged), saleFeeHoverHint(tagged), '−'),
      salesMoneyCell('ship', tagged._shipping || 0, 'Frete', saleShipHoverHint(tagged), '−'),
      salesMoneyCell('kit', Number(tagged._cogs) || 0, 'Kit', 'Custo do kit (BOM em Produtos)', '−'),
      salesMoneyCell('net', tagged._net, 'Líquido', 'Líquido: Preço − Tarifa − Frete − Kit', '=')
    ].join('');
  }

  function isDroppedMarketplaceSale(sale) {
    const st = String(sale?.status || '').toLowerCase();
    return /cancel|invalid|refund/.test(st);
  }

  function saleListedGross(sale) {
    const fn = sm().saleListedGross;
    if (typeof fn === 'function') return fn(sale);
    const ch = String(sale?.channel || '').toLowerCase();
    if (ch === 'mercadolivre' || ch === 'ml') {
      const items = sale?.items;
      if (Array.isArray(items) && items.length) {
        const sum = items.reduce((n, i) => {
          const qty = Number(i.quantity || i.qty || 0);
          const unit = Number(i.unitPrice || i.unit_price || 0);
          return n + unit * (qty > 0 ? qty : 0);
        }, 0);
        if (sum > 0) return roundMoneyLocal(sum);
      }
    }
    return roundMoneyLocal(sale?.gross || 0);
  }

  function saleShippingCost(sale) {
    const fn = sm().saleShippingCost;
    if (typeof fn === 'function') return fn(sale, currentConfig);
    if (mlShippingUnresolved(sale)) return 0;
    const s = roundMoneyLocal(sale?.shippingCost || 0);
    const ch = String(sale?.channel || '').toLowerCase();
    const isMl = ch === 'mercadolivre' || ch === 'ml';
    const flexList = Number(sale?.mlFlexListCost || currentConfig?.mlFlexShippingCost || 0);
    const estorno = Number(sale?.mlEstorno || 0);
    const isFlex = sale?.mlFlex
      || /flex|self_service/i.test(String(sale?.logisticType || ''))
      || (isMl && flexList > 0 && Math.abs(s - flexList) <= 0.06);
    if (isMl && isFlex && flexList > 0) return roundMoneyLocal(Math.max(0, flexList - estorno));
    if (ch === 'shopee') return s;
    if (isMl && (Math.abs(s - 0.36) <= 0.02 || Math.abs(s - 9.36) <= 0.02)) return 0;
    return s;
  }

  function marketplaceSaleNet(sale) {
    const fn = sm().marketplaceSaleNet;
    if (typeof fn === 'function') return fn(sale, currentConfig);
    return roundMoneyLocal(
      saleListedGross(sale)
      - Number(sale?.fees || 0)
      - saleShippingCost(sale)
      - Number(sale?.refunds || 0)
      - Number(sale?.otherFees || 0)
    );
  }

  function saleKitQty(sale) {
    const fn = sm().saleKitQty;
    if (typeof fn === 'function') return fn(sale);
    if (Array.isArray(sale?.items) && sale.items.length) {
      const q = sale.items.reduce((n, i) => n + (Number(i.quantity || i.qty || 0) || 0), 0);
      if (q > 0) return q;
    }
    return Math.max(1, Number(sale?.qty || sale?.quantity || 1) || 1);
  }

  function kitComponentUnitCost(c) {
    const fn = sm().kitComponentUnitCost;
    if (typeof fn === 'function') return fn(c);
    const buyQty = Number(c?.buyQty);
    const buyPrice = Number(c?.buyPrice) || 0;
    const yieldQty = Number(c?.yieldQty) > 0 ? Number(c.yieldQty) : 1;
    const useQty = Number(c?.useQty) || 0;
    if (!(buyQty > 0)) return 0;
    return (buyPrice / buyQty / yieldQty) * useQty;
  }

  function kitUnitCostFromComponents(comps) {
    const fn = sm().kitUnitCostFromComponents;
    if (typeof fn === 'function') return fn(comps);
    if (!Array.isArray(comps) || !comps.length) return 0;
    return comps.reduce((sum, c) => sum + kitComponentUnitCost(c), 0);
  }

  function storeOrderIsIntl(o) {
    const code = String(o?.paisCode || '').trim().toUpperCase();
    if (code && code !== 'BR' && code !== 'OTHER' && code !== 'XX' && code !== 'T1') return true;
    const loc = String(o?.checkoutLocale || o?.locale || '').toLowerCase();
    if (loc === 'en' || loc === 'it') return true;
    if (o?.internationalLensOnly) return true;
    if (o?.shipmentType === 'documento' || o?.shipmentType === 'encomenda') return true;
    if (String(o?.shippingMethodId || '').startsWith('int-')) return true;
    const cur = String(o?.currency || '').toUpperCase();
    if (cur === 'USD' || cur === 'EUR') return true;
    if (/internacional|international/i.test(String(o?.pais || ''))) return true;
    return false;
  }

  function isIntlSale(sale) {
    const fn = sm().isIntlSale;
    if (typeof fn === 'function') return fn(sale);
    if (sale?.market === 'INT' || sale?._market === 'INT') return true;
    const cur = String(sale?.currency || '').toUpperCase();
    return cur === 'USD' || cur === 'EUR';
  }

  function kitUnitCostFromConfig(config, sale) {
    const fn = sm().kitUnitCostFromConfig;
    if (typeof fn === 'function') return fn(config || currentConfig, sale);
    const cfg = config || currentConfig;
    const intl = isIntlSale(sale);
    const comps = kitCostComponentsFrom(intl ? cfg?.kitCostIntl : cfg?.kitCost, intl ? 'intl' : 'br');
    return kitUnitCostFromComponents(comps);
  }

  function saleProductCost(sale, config) {
    const fn = sm().saleProductCost;
    if (typeof fn === 'function') return fn(sale, config || currentConfig);
    return roundMoneyLocal(kitUnitCostFromConfig(config || currentConfig, sale) * saleKitQty(sale));
  }

  function effectiveSaleNet(sale) {
    const fn = sm().effectiveSaleNet;
    if (typeof fn === 'function') return fn(sale, currentConfig);
    return roundMoneyLocal(marketplaceSaleNet(sale) - saleProductCost(sale));
  }

  function saleMoneyParts(sale) {
    const fn = sm().saleMoneyParts;
    if (typeof fn === 'function') return fn(sale, currentConfig);
    const marketplace = marketplaceSaleNet(sale);
    const cogs = saleProductCost(sale);
    return {
      gross: saleListedGross(sale),
      fees: Number(sale?.fees || 0),
      shipping: saleShippingCost(sale),
      refunds: Number(sale?.refunds || 0),
      otherFees: Number(sale?.otherFees || 0),
      cogs,
      marketplace,
      net: roundMoneyLocal(marketplace - cogs)
    };
  }

  function renderSalesMoneyStats(list, meta, extraRowsHtml) {
    const parts = (list || []).reduce((acc, x) => {
      const p = saleMoneyParts(x);
      acc.gross += p.gross;
      acc.fees += p.fees;
      acc.shipping += p.shipping;
      acc.refunds += p.refunds;
      acc.otherFees += p.otherFees;
      acc.cogs += p.cogs;
      acc.marketplace += p.marketplace;
      acc.net += p.net;
      return acc;
    }, { gross: 0, fees: 0, shipping: 0, refunds: 0, otherFees: 0, cogs: 0, marketplace: 0, net: 0 });
    const synced = meta?.lastSyncedAt
      ? new Date(meta.lastSyncedAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
      : '—';
    const indexed = meta?.indexed != null && meta.indexed !== (list || []).length
      ? ` / ${Number(meta.indexed).toLocaleString('pt-BR')} indexadas`
      : '';
    return `
      <div class="clicks-stats-row"><dt>Vendas (lista)</dt><dd>${(list || []).length.toLocaleString('pt-BR')}${indexed}</dd></div>
      <div class="clicks-stats-row"><dt>Preço</dt><dd>${formatSalesBRL(parts.gross)}</dd></div>
      <div class="clicks-stats-row"><dt>(−) ${escapeHtml(meta?.feeLabel || 'Tarifa')}</dt><dd>${formatSalesBRL(parts.fees)}</dd></div>
      <div class="clicks-stats-row"><dt>(−) Frete</dt><dd>${formatSalesBRL(parts.shipping)}</dd></div>
      <div class="clicks-stats-row"><dt>(−) Estornos / outras</dt><dd>${formatSalesBRL(parts.refunds + parts.otherFees)}</dd></div>
      <div class="clicks-stats-row"><dt>(−) Kit</dt><dd>${formatSalesBRL(parts.cogs)}</dd></div>
      <div class="clicks-stats-row clicks-stats-row--net"><dt>(=) Líquido</dt><dd>${formatSalesBRL(parts.net)}</dd></div>
      ${extraRowsHtml || ''}
      <div class="clicks-stats-row"><dt>Último sync</dt><dd>${escapeHtml(synced)}</dd></div>`;
  }

  function saleSoldTs(sale) {
    const raw = sale?.soldAt || sale?.dateCreated;
    if (!raw) return 0;
    const t = Date.parse(raw);
    return Number.isFinite(t) ? t : 0;
  }

  function formatSaleTime(ts) {
    if (!ts) return '—';
    return new Date(ts).toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function buildSalesTree(sales) {
    const tree = {};
    (sales || []).forEach((sale) => {
      const ts = saleSoldTs(sale);
      if (!ts) return;
      const { year, monthNum, monthName, dateKey, dayLabel } = brDateParts(ts);
      const gross = saleListedGross(sale);
      const fees = Number(sale.fees || 0);
      const shipping = saleShippingCost(sale);
      const refunds = Number(sale.refunds || 0);
      const otherFees = Number(sale.otherFees || 0);
      const cogs = saleProductCost(sale);
      const net = effectiveSaleNet(sale);
      const marketplace = Math.round((gross - fees - shipping - refunds - otherFees) * 100) / 100;
      if (!tree[year]) tree[year] = { count: 0, gross: 0, fees: 0, shipping: 0, refunds: 0, otherFees: 0, cogs: 0, marketplace: 0, net: 0, months: {} };
      const y = tree[year];
      if (!y.months[monthNum]) y.months[monthNum] = { name: monthName, count: 0, gross: 0, fees: 0, shipping: 0, refunds: 0, otherFees: 0, cogs: 0, marketplace: 0, net: 0, days: {} };
      const m = y.months[monthNum];
      if (!m.days[dateKey]) m.days[dateKey] = { label: dayLabel, count: 0, gross: 0, fees: 0, shipping: 0, refunds: 0, otherFees: 0, cogs: 0, marketplace: 0, net: 0, sales: [] };
      const d = m.days[dateKey];
      d.sales.push({ ...sale, _ts: ts, _gross: gross, _fees: fees, _shipping: shipping, _refunds: refunds, _otherFees: otherFees, _cogs: cogs, _marketplace: marketplace, _net: net });
      d.count += 1;
      d.gross += gross;
      d.fees += fees;
      d.shipping += shipping;
      d.refunds += refunds;
      d.otherFees += otherFees;
      d.cogs += cogs;
      d.marketplace += marketplace;
      d.net += net;
      m.count += 1;
      m.gross += gross;
      m.fees += fees;
      m.shipping += shipping;
      m.refunds += refunds;
      m.otherFees += otherFees;
      m.cogs += cogs;
      m.marketplace += marketplace;
      m.net += net;
      y.count += 1;
      y.gross += gross;
      y.fees += fees;
      y.shipping += shipping;
      y.refunds += refunds;
      y.otherFees += otherFees;
      y.cogs += cogs;
      y.marketplace += marketplace;
      y.net += net;
    });
    Object.values(tree).forEach((y) => {
      Object.values(y.months).forEach((m) => {
        Object.values(m.days).forEach((d) => {
          d.sales.sort((a, b) => (b._ts || 0) - (a._ts || 0));
        });
      });
    });
    return tree;
  }

  function salesTreeSummary(label, node) {
    const count = node?.count || 0;
    const meta = `<span class="clicks-tree-meta">${count} venda${count === 1 ? '' : 's'} · líquido ${formatSalesBRL(node?.net || 0)}</span>`;
    return `<i class="fas fa-chevron-right clicks-tree-chevron" aria-hidden="true"></i><span class="clicks-tree-label">${escapeHtml(label)}</span>${meta}`;
  }

  const SALES_CHANNEL_LABELS = {
    loja: 'Loja oficial',
    mercadolivre: 'Mercado Livre',
    shopee: 'Shopee',
    amazon: 'Amazon'
  };

  function salesChannelLabel(channel) {
    return SALES_CHANNEL_LABELS[channel] || channel || '—';
  }

  function storeOrderToSale(o) {
    const listed = sm().storeOrderListedGross;
    const gross = listed
      ? listed(o)
      : Math.round(Number(o.total || 0) * 100) / 100;
    const shippingCost = Math.round(Number(o.frete || o.shippingCost || 0) * 100) / 100;
    const paypalFee = Math.round(Number(o.paypalFee || 0) * 100) / 100;
    const watch = o.smartwatch || o.watchModel || o.modelo || '';
    let qty = Number(o.qty || o.quantity || 0) || 0;
    if (!qty && Array.isArray(o.items) && o.items.length) {
      qty = o.items.reduce((n, i) => n + (Number(i.qty || i.quantity || 0) || 0), 0);
    }
    qty = Math.max(1, qty || 1);
    const title = watch
      ? String(watch)
      : (o.productName || o.produto || 'Pedido loja');
    return {
      channel: 'loja',
      market: storeOrderIsIntl(o) ? 'INT' : 'BR',
      externalId: String(o.orderId || ''),
      soldAt: o.paidAt || o.createdAt || null,
      status: o.status || null,
      currency: o.currency || 'BRL',
      gross,
      fees: paypalFee,
      shippingCost,
      refunds: 0,
      otherFees: 0,
      // líquido calculado na UI: bruto − frete (− comissão/estornos se houver)
      buyer: {
        id: o.userId || null,
        nickname: o.nome || o.email || '—'
      },
      items: [{
        title,
        quantity: qty,
        unitPrice: gross,
        saleFee: 0
      }],
      payments: o.paymentMethod || o.meioPagamento
        ? [{ status: o.status || 'paid', method: o.paymentMethod || o.meioPagamento }]
        : []
    };
  }

  function isStoreSaleOrder(o) {
    if (!o) return false;
    const st = String(o.status || '').toLowerCase();
    if (st === 'cancelled' || st === 'canceled' || st === 'refunded' || st === 'abandoned') return false;
    return st === 'paid' || st === 'shipped' || st === 'delivered' || st === 'fulfilled';
  }

  async function fetchStoreSales() {
    const token = sessionStorage.getItem(SESSION_KEY);
    const base = apiBase();
    if (!token || !base) throw new Error('Faça login no admin.');
    const res = await fetch(`${base.replace(/\/$/, '')}/orders`, {
      headers: { Authorization: 'Bearer ' + token },
      cache: 'no-store'
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
    const orders = Array.isArray(data) ? data : [];
    return orders
      .filter(isStoreSaleOrder)
      .map((o) => annotateSale(storeOrderToSale(o)))
      .filter((s) => s._ts)
      .sort((a, b) => b._ts - a._ts);
  }

  function captureLojaSalesTreeOpenPaths() {
    const root = document.getElementById('vendas-loja-tree-root');
    if (!root) return [];
    return [...root.querySelectorAll('details[open][data-tree-path]')]
      .map((el) => el.getAttribute('data-tree-path'))
      .filter(Boolean);
  }

  function restoreLojaSalesTreeOpenPaths(paths) {
    const root = document.getElementById('vendas-loja-tree-root');
    if (!root || !paths?.length) return;
    const want = new Set(paths);
    root.querySelectorAll('details[data-tree-path]').forEach((el) => {
      if (want.has(el.getAttribute('data-tree-path'))) el.open = true;
    });
  }

  function renderLojaSalesStats(sales) {
    const el = document.getElementById('vendas-loja-stats');
    if (!el) return;
    el.innerHTML = renderSalesMoneyStats(sales, { lastSyncedAt: new Date().toISOString(), feeLabel: 'Tarifa' });
  }

  async function loadLojaSales(preserveOpen) {
    const root = document.getElementById('vendas-loja-tree-root');
    const checked = document.getElementById('vendas-loja-checked-at');
    if (!root) return;
    await ensureSalesConfig();
    const openPaths = preserveOpen ? captureLojaSalesTreeOpenPaths() : [];
    root.innerHTML = '<p class="admin-meta">Carregando vendas da loja oficial…</p>';
    try {
      const sales = await fetchStoreSales();
      renderLojaSalesStats(sales);
      root.innerHTML = sales.length
        ? renderSalesTree(buildSalesTree(sales), { channel: 'loja' })
        : '<p class="admin-meta">Nenhuma venda paga na loja oficial.</p>';
      if (preserveOpen) restoreLojaSalesTreeOpenPaths(openPaths);
      if (checked) {
        checked.hidden = false;
        checked.textContent = 'Atualizado em ' + new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      }
      showStatus('', '', 'vendas');
    } catch (err) {
      root.innerHTML = `<p class="admin-meta">${escapeHtml(err.message || 'Erro ao carregar.')}</p>`;
      showStatus(err.message || 'Erro ao carregar vendas da loja.', 'error', 'vendas');
    }
  }

  function annotateSale(sale) {
    const ts = saleSoldTs(sale);
    const p = saleMoneyParts(sale);
    return {
      ...sale,
      _ts: ts,
      _gross: p.gross,
      _fees: p.fees,
      _shipping: p.shipping,
      _refunds: p.refunds,
      _otherFees: p.otherFees,
      _cogs: p.cogs,
      _marketplace: p.marketplace,
      _net: p.net
    };
  }

  function sumAnnotated(list) {
    return (list || []).reduce((acc, s) => {
      acc.count += 1;
      acc.gross += Number(s._gross || 0);
      acc.fees += Number(s._fees || 0);
      acc.shipping += Number(s._shipping || 0);
      acc.refunds += Number(s._refunds || 0);
      acc.otherFees += Number(s._otherFees || 0);
      acc.cogs += Number(s._cogs || 0);
      acc.marketplace += Number(s._marketplace || 0);
      acc.net += Number(s._net || 0);
      return acc;
    }, { count: 0, gross: 0, fees: 0, shipping: 0, refunds: 0, otherFees: 0, cogs: 0, marketplace: 0, net: 0 });
  }

  function salesInCurrentPeriod(sales, period) {
    const nowKey = clicksPeriodBucket(Date.now(), period).key;
    return (sales || []).filter((s) => s._ts && clicksPeriodBucket(s._ts, period).key === nowKey);
  }

  function buildConsolidatedSalesTree(sales) {
    return buildSalesTree(sales);
  }

  function renderConsolidatedSaleRow(sale) {
    const title = sale.items?.[0]?.title || 'Venda';
    const buyer = sale.buyer?.nickname || '—';
    const channel = salesChannelLabel(sale.channel);
    return `<li class="sales-tree-row sales-tree-row--consol">
      <span class="sales-tree-time">${escapeHtml(formatSaleTime(sale._ts))}</span>
      <span class="sales-tree-channel">${escapeHtml(channel)}</span>
      <span class="sales-tree-id">#${escapeHtml(String(sale.externalId || ''))}</span>
      <span class="sales-tree-buyer">${escapeHtml(buyer)}</span>
      <span class="sales-tree-title" title="${escapeHtml(title)}">${escapeHtml(title)}</span>
      ${renderSaleMoneyCols(sale)}
    </li>`;
  }

  function renderConsolidatedTree(tree) {
    const years = Object.keys(tree || {}).sort((a, b) => Number(b) - Number(a));
    if (!years.length) {
      return '<p class="admin-meta">Nenhuma venda paga encontrada (loja + ML + Amazon + Shopee).</p>';
    }
    let html = '<div class="clicks-tree sales-tree">';
    years.forEach((year) => {
      const y = tree[year];
      const yearPath = `c|${year}`;
      html += `<details class="clicks-tree-node clicks-tree-year" data-tree-path="${escapeHtml(yearPath)}"><summary>${salesTreeSummary(year, y)}</summary><div class="clicks-tree-children">`;
      const months = Object.keys(y.months).sort((a, b) => Number(b) - Number(a));
      months.forEach((monthNum) => {
        const m = y.months[monthNum];
        const monthPath = `${yearPath}|${monthNum}`;
        html += `<details class="clicks-tree-node clicks-tree-month" data-tree-path="${escapeHtml(monthPath)}"><summary>${salesTreeSummary(m.name, m)}</summary><div class="clicks-tree-children">`;
        const days = Object.keys(m.days).sort((a, b) => b.localeCompare(a));
        days.forEach((dateKey) => {
          const d = m.days[dateKey];
          const dayPath = `${monthPath}|${dateKey}`;
          html += `<details class="clicks-tree-node clicks-tree-day" data-tree-path="${escapeHtml(dayPath)}"><summary>${salesTreeSummary(d.label, d)}</summary><div class="clicks-tree-children">`;
          html += '<ul class="sales-tree-list">';
          d.sales.forEach((sale) => {
            html += renderConsolidatedSaleRow(sale);
          });
          html += '</ul></div></details>';
        });
        html += '</div></details>';
      });
      html += '</div></details>';
    });
    html += '</div>';
    return html;
  }

  function shiftYearMonth(year, monthNum, deltaMonths) {
    let y = Number(year);
    let m = Number(monthNum) + Number(deltaMonths || 0);
    while (m < 1) {
      m += 12;
      y -= 1;
    }
    while (m > 12) {
      m -= 12;
      y += 1;
    }
    return { year: String(y), monthNum: String(m).padStart(2, '0') };
  }

  /** Vendas do mês até o dia N (mesmo dia do calendário; corta no último dia do mês se for menor). */
  function salesMonthToDate(sales, year, monthNum, throughDay) {
    const ym = String(monthNum).padStart(2, '0');
    const y = String(year);
    const lastDay = Math.min(Number(throughDay) || 1, daysInCalendarMonth(y, ym));
    return (sales || []).filter((s) => {
      if (!s._ts) return false;
      const p = brDateParts(s._ts);
      if (p.year !== y || p.monthNum !== ym) return false;
      return Number(p.day) <= lastDay;
    });
  }

  function formatMtdDelta(current, previous) {
    const cur = Number(current || 0);
    const prev = Number(previous || 0);
    if (!prev && !cur) return 'igual';
    if (!prev) return 'novo';
    const pct = Math.round(((cur - prev) / Math.abs(prev)) * 1000) / 10;
    const sign = pct > 0 ? '+' : '';
    return `${sign}${pct.toLocaleString('pt-BR')}%`;
  }

  function renderConsolidadoMtdCompare(sales) {
    const now = brDateParts(Date.now());
    const dayNum = Number(now.day);
    const months = [0, -1, -2].map((delta) => {
      const ym = shiftYearMonth(now.year, now.monthNum, delta);
      const through = Math.min(dayNum, daysInCalendarMonth(ym.year, ym.monthNum));
      const subset = salesMonthToDate(sales, ym.year, ym.monthNum, through);
      const name = MONTH_LABELS[ym.monthNum] || ym.monthNum;
      return {
        delta,
        year: ym.year,
        monthNum: ym.monthNum,
        through,
        name,
        tot: sumAnnotated(subset)
      };
    });
    // Ordem visual: retrasado → passado → atual
    const ordered = [months[2], months[1], months[0]];
    const rows = ordered.map((row, i) => {
      const prev = i > 0 ? ordered[i - 1] : null;
      const netDelta = prev ? formatMtdDelta(row.tot.net, prev.tot.net) : '';
      const netClass = prev
        ? (row.tot.net > prev.tot.net ? ' is-up' : (row.tot.net < prev.tot.net ? ' is-down' : ' is-same'))
        : '';
      const countDelta = prev ? formatMtdDelta(row.tot.count, prev.tot.count) : '';
      const countClass = prev
        ? (row.tot.count > prev.tot.count ? ' is-up' : (row.tot.count < prev.tot.count ? ' is-down' : ' is-same'))
        : '';
      const isCurrent = row.delta === 0;
      const yearNote = row.year !== now.year
        ? `<p class="vendas-consol-mtd-title">${escapeHtml(row.year)}</p>`
        : '';
      const netPct = netDelta
        ? ` <span class="vendas-consol-mtd-pct${netClass}">(${escapeHtml(netDelta)})</span>`
        : '';
      const countPct = countDelta
        ? ` <span class="vendas-consol-mtd-pct${countClass}">(${escapeHtml(countDelta)})</span>`
        : '';
      return `<article class="vendas-consol-mtd-card${isCurrent ? ' is-current' : ''}">
        <h4>${escapeHtml(row.name)}</h4>
        ${yearNote}
        <p class="vendas-consol-mtd-net">${formatSalesBRL(row.tot.net)}${netPct}</p>
        <p class="vendas-consol-mtd-count">${row.tot.count} venda${row.tot.count === 1 ? '' : 's'}${countPct}</p>
      </article>`;
    }).join('');
    return `<section class="vendas-consol-mtd" aria-label="Comparação dias 1–${dayNum}">
      <header class="vendas-consol-mtd-head">
        <h3>Dias 1–${dayNum}</h3>
      </header>
      <div class="vendas-consol-mtd-grid">${rows}</div>
    </section>`;
  }

  function renderConsolidadoPeriods(sales) {
    const el = document.getElementById('vendas-consol-periods');
    if (!el) return;
    const periods = [
      { key: 'day', label: 'Hoje' },
      { key: 'week', label: 'Esta semana' },
      { key: 'month', label: 'Este mês' },
      { key: 'year', label: 'Este ano' }
    ];
    const cards = periods.map(({ key, label }) => {
      const subset = salesInCurrentPeriod(sales, key);
      const tot = sumAnnotated(subset);
      const byCh = {};
      subset.forEach((s) => {
        const ch = s.channel || 'outro';
        if (!byCh[ch]) byCh[ch] = { count: 0, net: 0 };
        byCh[ch].count += 1;
        byCh[ch].net += Number(s._net || 0);
      });
      const ranked = Object.entries(byCh).sort((a, b) => b[1].net - a[1].net);
      const chLines = ranked.length
        ? ranked.map(([ch, row], i) => {
          const top = i === 0 ? ' is-top' : '';
          return `<li class="vendas-consol-rank${top}">
            <span class="vendas-consol-rank-n">${i + 1}º</span>
            <span>${escapeHtml(salesChannelLabel(ch))}</span>
            <strong>${formatSalesBRL(row.net)}</strong>
          </li>`;
        }).join('')
        : '<li><span>—</span><strong>R$ 0,00</strong></li>';
      return `<article class="vendas-consol-card vendas-consol-card--${escapeHtml(key)}">
        <h3>${escapeHtml(label)}</h3>
        <p class="vendas-consol-card-kicker">Líquido real</p>
        <p class="vendas-consol-card-net">${formatSalesBRL(tot.net)}</p>
        <p class="vendas-consol-card-meta">${tot.count} venda${tot.count === 1 ? '' : 's'} · bruto ${formatSalesBRL(tot.gross)}</p>
        <ul class="vendas-consol-card-channels">${chLines}</ul>
      </article>`;
    }).join('');
    el.innerHTML = `<div class="vendas-consol-periods-grid">${cards}</div>${renderConsolidadoMtdCompare(sales)}${renderConsolidadoFlexOwed(sales)}`;
    wireOneAdminFold(document.getElementById('vendas-consol-flex-fold'));
  }

  function isMlFlexSale(sale) {
    const fn = sm().isMlFlexSale;
    if (typeof fn === 'function') return fn(sale);
    const ch = String(sale?.channel || '').toLowerCase();
    if (ch !== 'mercadolivre' && ch !== 'ml') return false;
    if (sale?.mlFlex || sale?.shippingSource === 'flex') return true;
    return /flex|self_service/i.test(String(sale?.logisticType || ''));
  }

  function flexCompanyOwed(sale) {
    const fn = sm().flexCompanyOwed;
    if (typeof fn === 'function') return fn(sale, currentConfig);
    const list = Number(sale?.mlFlexListCost || currentConfig?.mlFlexShippingCost || 0);
    if (list > 0) return roundMoneyLocal(list);
    const ship = Number(sale?.shippingCost || sale?._shipping || 0);
    const bonus = Number(sale?.mlEstorno || 0);
    return roundMoneyLocal(ship + bonus);
  }

  function aggregateFlexOwedByMonth(sales) {
    const fn = sm().aggregateFlexOwedByMonth;
    if (typeof fn === 'function') return fn(sales, currentConfig);
    const map = new Map();
    (sales || []).forEach((s) => {
      if (!isMlFlexSale(s) || !s._ts) return;
      const p = brDateParts(s._ts);
      const key = `${p.year}-${p.monthNum}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          year: p.year,
          monthNum: p.monthNum,
          name: (sm().MONTH_LABELS || {})[p.monthNum] || p.monthName,
          count: 0,
          owed: 0,
          bonus: 0,
          net: 0
        });
      }
      const row = map.get(key);
      const owed = flexCompanyOwed(s);
      const bonus = roundMoneyLocal(Number(s.mlEstorno || 0));
      row.count += 1;
      row.owed += owed;
      row.bonus += bonus;
      row.net += roundMoneyLocal(owed - bonus);
    });
    return Array.from(map.values()).sort((a, b) => String(b.key).localeCompare(String(a.key)));
  }

  function renderConsolidadoFlexOwed(sales) {
    const months = aggregateFlexOwedByMonth(sales);
    const now = brDateParts(Date.now());
    const currentKey = `${now.year}-${now.monthNum}`;
    const thisMonth = months.find((m) => m.key === currentKey);
    const hint = thisMonth
      ? `${thisMonth.name} · ${thisMonth.count} · ${formatSalesBRL(thisMonth.owed)}`
      : (months.length ? `${months[0].name} · ${months[0].count} · ${formatSalesBRL(months[0].owed)}` : '—');
    const body = months.length
      ? `<div class="vendas-consol-mtd-grid">${months.map((m) => {
        const isCurrent = m.key === currentKey ? ' is-current' : '';
        const yearNote = m.year !== now.year ? ` ${m.year}` : '';
        return `<article class="vendas-consol-mtd-card vendas-consol-flex-card${isCurrent}">
        <h4>${escapeHtml(m.name)}${escapeHtml(yearNote)}</h4>
        <p class="vendas-consol-mtd-count">${m.count}</p>
        <p class="vendas-consol-mtd-net">${formatSalesBRL(m.owed)}</p>
        <p class="vendas-consol-flex-bonus">bônus ML ${formatSalesBRL(m.bonus)} · líquido ${formatSalesBRL(m.net)}</p>
      </article>`;
      }).join('')}</div>`
      : '<p class="admin-meta">Nenhum envio Flex no recorte carregado.</p>';
    return `<details class="admin-fold vendas-consol-flex-fold" id="vendas-consol-flex-fold" data-fold-key="vendas-flex">
      <summary class="admin-fold-summary">
        <i class="fas fa-chevron-right admin-fold-chevron" aria-hidden="true"></i>
        <span class="admin-fold-title">Flex</span>
        <span class="admin-fold-hint">${escapeHtml(hint)}</span>
      </summary>
      <div class="admin-fold-body">${body}</div>
    </details>`;
  }

  function buildFlexOwedExportRows(sales) {
    const rows = [['Mês', 'Envios Flex', 'A pagar (empresa)', 'Bônus ML', 'Custo líquido']];
    aggregateFlexOwedByMonth(sales).forEach((m) => {
      rows.push([`${m.name} ${m.year}`, m.count, m.owed, m.bonus, m.net]);
    });
    return rows;
  }

  function renderConsolidadoStats(sales) {
    const el = document.getElementById('vendas-consol-stats');
    if (!el) return;
    const tot = sumAnnotated(sales);
    const byCh = {};
    (sales || []).forEach((s) => {
      const ch = s.channel || 'outro';
      if (!byCh[ch]) byCh[ch] = { count: 0, net: 0, gross: 0, fees: 0, shipping: 0 };
      byCh[ch].count += 1;
      byCh[ch].net += Number(s._net || 0);
      byCh[ch].gross += Number(s._gross || 0);
      byCh[ch].fees += Number(s._fees || 0);
      byCh[ch].shipping += Number(s._shipping || 0);
    });
    const chRows = Object.entries(byCh)
      .sort((a, b) => b[1].net - a[1].net)
      .map(([ch, row], i) =>
        `<div class="clicks-stats-row"><dt>${i + 1}º ${escapeHtml(salesChannelLabel(ch))}</dt><dd>${row.count} · ${formatSalesBRL(row.net)}</dd></div>`
      ).join('');
    el.innerHTML = `
      <div class="clicks-stats-row"><dt>Total consolidado</dt><dd>${(sales || []).length} vendas</dd></div>
      <div class="clicks-stats-row"><dt>Bruto</dt><dd>${formatSalesBRL(tot.gross)}</dd></div>
      <div class="clicks-stats-row"><dt>(−) Comissão</dt><dd>${formatSalesBRL(tot.fees)}</dd></div>
      <div class="clicks-stats-row"><dt>(−) Frete</dt><dd>${formatSalesBRL(tot.shipping || 0)}</dd></div>
      <div class="clicks-stats-row"><dt>(−) Estornos</dt><dd>${formatSalesBRL(tot.refunds || 0)}</dd></div>
      <div class="clicks-stats-row"><dt>(−) Outras taxas</dt><dd>${formatSalesBRL(tot.otherFees || 0)}</dd></div>
      <div class="clicks-stats-row"><dt>(=) Líquido marketplace</dt><dd>${formatSalesBRL(tot.marketplace || 0)}</dd></div>
      <div class="clicks-stats-row"><dt>(−) Custo do kit</dt><dd>${formatSalesBRL(tot.cogs || 0)}</dd></div>
      <div class="clicks-stats-row clicks-stats-row--net"><dt>(=) Líquido real</dt><dd>${formatSalesBRL(tot.net)}</dd></div>
      ${chRows}`;
  }

  async function fetchConsolidatedSales() {
    const token = sessionStorage.getItem(SESSION_KEY);
    const base = apiBase();
    if (!token || !base) throw new Error('Faça login no admin.');
    const root = base.replace(/\/$/, '');
    const headers = { Authorization: 'Bearer ' + token };
    const [mlRes, amzRes, shopeeRes, ordersRes] = await Promise.all([
      fetch(`${root}/admin/ml/sales?limit=400`, { headers, cache: 'no-store' }),
      fetch(`${root}/admin/amz/sales?limit=5000`, { headers, cache: 'no-store' }),
      fetch(`${root}/admin/shopee/sales?limit=5000`, { headers, cache: 'no-store' }),
      fetch(`${root}/orders`, { headers, cache: 'no-store' })
    ]);
    const mlData = await mlRes.json().catch(() => ({}));
    if (!mlRes.ok) throw new Error(mlData.error || 'Falha ao carregar vendas ML');
    const amzData = await amzRes.json().catch(() => ({}));
    if (!amzRes.ok) throw new Error(amzData.error || 'Falha ao carregar vendas Amazon');
    const shopeeData = await shopeeRes.json().catch(() => ({}));
    if (!shopeeRes.ok) throw new Error(shopeeData.error || 'Falha ao carregar vendas Shopee');
    const ordersData = await ordersRes.json().catch(() => ({}));
    if (!ordersRes.ok) throw new Error(ordersData?.error || 'Falha ao carregar pedidos da loja');
    const mlSales = (Array.isArray(mlData.sales) ? mlData.sales : []).filter((s) => !isDroppedMarketplaceSale(s)).map(annotateSale);
    const amzSales = (Array.isArray(amzData.sales) ? amzData.sales : []).filter((s) => !isDroppedMarketplaceSale(s)).map(annotateSale);
    const shopeeSales = (Array.isArray(shopeeData.sales) ? shopeeData.sales : []).filter((s) => !isDroppedMarketplaceSale(s)).map(annotateSale);
    const storeSales = (Array.isArray(ordersData) ? ordersData : [])
      .filter(isStoreSaleOrder)
      .map((o) => annotateSale(storeOrderToSale(o)));
    return [...storeSales, ...mlSales, ...amzSales, ...shopeeSales]
      .filter((s) => s._ts)
      .sort((a, b) => b._ts - a._ts);
  }

  function aggregateSalesForExport(sales, period) {
    const buckets = new Map();
    (sales || []).forEach((s) => {
      if (!s._ts) return;
      const bucket = clicksPeriodBucket(s._ts, period);
      if (!buckets.has(bucket.key)) {
        buckets.set(bucket.key, {
          label: bucket.label,
          sortKey: bucket.sortKey,
          count: 0,
          gross: 0,
          fees: 0,
          net: 0,
          byChannel: {}
        });
      }
      const row = buckets.get(bucket.key);
      const ch = s.channel || 'outro';
      if (!row.byChannel[ch]) row.byChannel[ch] = { count: 0, gross: 0, fees: 0, net: 0 };
      row.count += 1;
      row.gross += s._gross;
      row.fees += s._fees;
      row.net += s._net;
      row.byChannel[ch].count += 1;
      row.byChannel[ch].gross += s._gross;
      row.byChannel[ch].fees += s._fees;
      row.byChannel[ch].net += s._net;
    });
    return [...buckets.values()].sort((a, b) => b.sortKey.localeCompare(a.sortKey));
  }

  function buildSalesExportPeriodRows(sales, period) {
    const channels = ['loja', 'mercadolivre', 'amazon', 'shopee'];
    const headers = ['Período', 'Qtd', 'Bruto', 'Taxas', 'Líquido'];
    channels.forEach((ch) => {
      headers.push(`${salesChannelLabel(ch)} qtd`);
      headers.push(`${salesChannelLabel(ch)} líquido`);
    });
    const rows = [headers];
    const totals = { count: 0, gross: 0, fees: 0, net: 0, byChannel: {} };
    channels.forEach((ch) => { totals.byChannel[ch] = { count: 0, net: 0 }; });
    aggregateSalesForExport(sales, period).forEach((row) => {
      rows.push([
        row.label,
        row.count,
        Math.round(row.gross * 100) / 100,
        Math.round(row.fees * 100) / 100,
        Math.round(row.net * 100) / 100,
        ...channels.flatMap((ch) => {
          const c = row.byChannel[ch] || { count: 0, net: 0 };
          return [c.count, Math.round(c.net * 100) / 100];
        })
      ]);
      totals.count += row.count;
      totals.gross += row.gross;
      totals.fees += row.fees;
      totals.net += row.net;
      channels.forEach((ch) => {
        const c = row.byChannel[ch] || { count: 0, net: 0 };
        totals.byChannel[ch].count += c.count;
        totals.byChannel[ch].net += c.net;
      });
    });
    if (rows.length > 2) {
      rows.push([
        'TOTAL GERAL',
        totals.count,
        Math.round(totals.gross * 100) / 100,
        Math.round(totals.fees * 100) / 100,
        Math.round(totals.net * 100) / 100,
        ...channels.flatMap((ch) => [
          totals.byChannel[ch].count,
          Math.round(totals.byChannel[ch].net * 100) / 100
        ])
      ]);
    }
    return rows;
  }

  function buildSalesExportDetailRows(sales) {
    const rows = [[
      'Data', 'Hora', 'Canal', 'ID', 'Cliente', 'Bruto', 'Comissão', 'Frete', 'Estornos', 'Outras taxas', 'Custo kit', 'Líquido real', 'Status', 'Item'
    ]];
    (sales || []).forEach((s) => {
      const parts = s._ts ? brDateParts(s._ts) : null;
      rows.push([
        parts ? `${parts.day}/${parts.monthNum}/${parts.year}` : '',
        formatSaleTime(s._ts),
        salesChannelLabel(s.channel),
        String(s.externalId || ''),
        s.buyer?.nickname || '',
        Math.round(s._gross * 100) / 100,
        Math.round(s._fees * 100) / 100,
        Math.round(Number(s._shipping || 0) * 100) / 100,
        Math.round(Number(s._refunds || 0) * 100) / 100,
        Math.round(Number(s._otherFees || 0) * 100) / 100,
        Math.round(Number(s._cogs || 0) * 100) / 100,
        Math.round(s._net * 100) / 100,
        s.status || '',
        s.items?.[0]?.title || ''
      ]);
    });
    return rows;
  }

  function buildSpreadsheetWorkbook(sheets) {
    const worksheets = sheets.map(({ name, rows }) => {
      const rowsXml = rows.map((row) => {
        const cells = row.map((cell) => {
          const type = typeof cell === 'number' && Number.isFinite(cell) ? 'Number' : 'String';
          const value = type === 'Number' ? cell : xmlEscape(cell);
          return `<Cell><Data ss:Type="${type}">${value}</Data></Cell>`;
        }).join('');
        return `<Row>${cells}</Row>`;
      }).join('');
      return `<Worksheet ss:Name="${xmlEscape(name.slice(0, 31))}"><Table>${rowsXml}</Table></Worksheet>`;
    }).join('');
    return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
${worksheets}
</Workbook>`;
  }

  function buildSalesExportWorkbook(sales) {
    return buildSpreadsheetWorkbook([
      { name: 'Detalhe', rows: buildSalesExportDetailRows(sales) },
      { name: 'Por dia', rows: buildSalesExportPeriodRows(sales, 'day') },
      { name: 'Por semana', rows: buildSalesExportPeriodRows(sales, 'week') },
      { name: 'Por mês', rows: buildSalesExportPeriodRows(sales, 'month') },
      { name: 'Por ano', rows: buildSalesExportPeriodRows(sales, 'year') },
      { name: 'Por hora', rows: buildSalesWhenExportRows(sales, 'hour') },
      { name: 'Por dia sem', rows: buildSalesWhenExportRows(sales, 'weekday') },
      { name: 'Por dia mes', rows: buildSalesWhenExportRows(sales, 'monthday') },
      { name: 'Por mes ano', rows: buildSalesWhenExportRows(sales, 'month') },
      { name: 'Flex a pagar', rows: buildFlexOwedExportRows(sales) }
    ]);
  }

  const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // seg…dom (getDay: 0=dom)
  const WEEKDAY_LABELS = {
    0: 'Domingo',
    1: 'Segunda',
    2: 'Terça',
    3: 'Quarta',
    4: 'Quinta',
    5: 'Sexta',
    6: 'Sábado'
  };
  const MONTH_LABELS = {
    '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março', '04': 'Abril',
    '05': 'Maio', '06': 'Junho', '07': 'Julho', '08': 'Agosto',
    '09': 'Setembro', '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro'
  };

  function brSaleClockParts(ts) {
    const d = new Date(ts || Date.now());
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Sao_Paulo',
      hour: 'numeric',
      hour12: false,
      weekday: 'short'
    });
    const parts = Object.create(null);
    fmt.formatToParts(d).forEach((p) => {
      if (p.type !== 'literal') parts[p.type] = p.value;
    });
    let hour = Number(parts.hour);
    if (hour === 24) hour = 0;
    const weekdayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const weekday = weekdayMap[parts.weekday] != null ? weekdayMap[parts.weekday] : d.getDay();
    const dateParts = brDateParts(ts);
    return {
      hour: Number.isFinite(hour) ? hour : 0,
      weekday,
      monthDay: Number(dateParts.day),
      monthNum: dateParts.monthNum,
      year: dateParts.year
    };
  }

  function filterSalesForWhenCharts(sales) {
    const channelEl = document.getElementById('vendas-when-channel');
    const rangeEl = document.getElementById('vendas-when-range');
    const channel = channelEl ? channelEl.value : '';
    const range = rangeEl ? rangeEl.value : 'all';
    let list = Array.isArray(sales) ? sales.slice() : [];
    if (channel) list = list.filter((s) => s.channel === channel);
    if (range === '90' || range === '365') {
      const days = Number(range);
      const cut = Date.now() - days * 86400000;
      list = list.filter((s) => Number(s._ts || 0) >= cut);
    }
    return list;
  }

  function aggregateSalesWhen(sales, mode) {
    const buckets = new Map();
    const ensure = (key, label, sortKey) => {
      if (!buckets.has(key)) buckets.set(key, { key, label, sortKey, count: 0, net: 0, gross: 0 });
      return buckets.get(key);
    };
    (sales || []).forEach((s) => {
      if (!s._ts) return;
      const clock = brSaleClockParts(s._ts);
      let key;
      let label;
      let sortKey;
      if (mode === 'hour') {
        key = String(clock.hour);
        label = `${String(clock.hour).padStart(2, '0')}h`;
        sortKey = clock.hour;
      } else if (mode === 'weekday') {
        key = String(clock.weekday);
        label = WEEKDAY_LABELS[clock.weekday] || key;
        sortKey = WEEKDAY_ORDER.indexOf(clock.weekday);
      } else if (mode === 'monthday') {
        key = String(clock.monthDay);
        label = `Dia ${clock.monthDay}`;
        sortKey = clock.monthDay;
      } else {
        key = clock.monthNum;
        label = MONTH_LABELS[clock.monthNum] || clock.monthNum;
        sortKey = Number(clock.monthNum);
      }
      const b = ensure(key, label, sortKey);
      b.count += 1;
      b.net += Number(s._net || 0);
      b.gross += Number(s._gross || 0);
    });
    return [...buckets.values()].sort((a, b) => a.sortKey - b.sortKey);
  }

  function buildSalesWhenExportRows(sales, mode) {
    const rows = [['Faixa', 'Qtd', 'Bruto', 'Líquido']];
    aggregateSalesWhen(sales, mode).forEach((b) => {
      rows.push([
        b.label,
        b.count,
        Math.round(b.gross * 100) / 100,
        Math.round(b.net * 100) / 100
      ]);
    });
    return rows;
  }

  function metricValue(bucket, metric) {
    if (metric === 'count' || metric === 'events') return bucket.count;
    if (metric === 'visitors') return Number(bucket.visitors || 0);
    if (metric === 'gross') return bucket.gross;
    return bucket.net;
  }

  function formatWhenMetric(value, metric) {
    if (metric === 'count' || metric === 'events' || metric === 'visitors') {
      const n = Number(value || 0);
      return n.toLocaleString('pt-BR', {
        maximumFractionDigits: Number.isInteger(n) ? 0 : 1,
        minimumFractionDigits: Number.isInteger(n) ? 0 : 1
      });
    }
    return formatSalesBRL(value);
  }

  /** Week-of-month 1–5 from calendar day (1–7 → 1ª … 29–31 → 5ª). */
  function clickWeekOfMonth(day) {
    const d = Math.max(1, Number(day) || 1);
    return Math.min(5, Math.ceil(d / 7));
  }

  /**
   * Average events/visitors per week-of-month across months we have
   * (1ª–5ª semana do mês).
   */
  function aggregateClicksWeekOfMonthAverage(clicks) {
    const perMonth = new Map();
    (clicks || []).forEach((c) => {
      const ts = Number(c.ts || c.client_ts || 0);
      if (!ts) return;
      const clock = brSaleClockParts(ts);
      const monthKey = `${clock.year}-${String(clock.monthNum).padStart(2, '0')}`;
      const w = clickWeekOfMonth(clock.monthDay);
      if (!perMonth.has(monthKey)) perMonth.set(monthKey, new Map());
      const weeks = perMonth.get(monthKey);
      if (!weeks.has(w)) weeks.set(w, { count: 0, vids: new Set() });
      const cell = weeks.get(w);
      cell.count += 1;
      cell.vids.add(visitorKey(c));
    });
    const monthKeys = [...perMonth.keys()];
    const nMonths = Math.max(1, monthKeys.length);
    const labels = { 1: '1ª', 2: '2ª', 3: '3ª', 4: '4ª', 5: '5ª' };
    return [1, 2, 3, 4, 5].map((w) => {
      let sumCount = 0;
      let sumVisitors = 0;
      monthKeys.forEach((mk) => {
        const cell = perMonth.get(mk)?.get(w);
        sumCount += cell?.count || 0;
        sumVisitors += cell?.vids.size || 0;
      });
      const avgCount = sumCount / nMonths;
      const avgVisitors = sumVisitors / nMonths;
      return {
        key: String(w),
        label: `${labels[w]}`,
        sortKey: w,
        count: Math.round(avgCount * 10) / 10,
        visitors: Math.round(avgVisitors * 10) / 10,
        monthsAveraged: nMonths,
        net: 0,
        gross: 0
      };
    });
  }

  function renderWhenBarChart(title, rows, metric, opts = {}) {
    const unitOne = opts.unitOne || 'venda';
    const unitMany = opts.unitMany || `${unitOne}s`;
    const sideLabel = opts.sideLabel || ((r) => `${r.count} ${r.count === 1 ? unitOne : unitMany}`);
    const cardClass = opts.cardClass ? ` ${opts.cardClass}` : '';
    const max = Math.max(0, ...rows.map((r) => metricValue(r, metric)));
    const bars = rows.map((r) => {
      const val = metricValue(r, metric);
      const pct = max > 0 ? Math.max(2, Math.round((val / max) * 100)) : 0;
      const top = max > 0 && val === max ? ' is-top' : '';
      return `<div class="vendas-when-row${top}">
        <span class="vendas-when-label">${escapeHtml(r.label)}</span>
        <span class="vendas-when-track"><span class="vendas-when-bar" style="width:${pct}%"></span></span>
        <span class="vendas-when-value">${escapeHtml(formatWhenMetric(val, metric))}</span>
        <span class="vendas-when-count">${escapeHtml(sideLabel(r))}</span>
      </div>`;
    }).join('') || '<p class="admin-meta">Sem dados neste recorte.</p>';
    return `<article class="vendas-when-card${cardClass}">
      <h4>${escapeHtml(title)}</h4>
      <div class="vendas-when-bars">${bars}</div>
    </article>`;
  }

  function renderConsolidadoWhenCharts(sales) {
    const root = document.getElementById('vendas-when-charts');
    if (!root) return;
    const metricEl = document.getElementById('vendas-when-metric');
    const metric = metricEl ? metricEl.value : 'count';
    const filtered = filterSalesForWhenCharts(sales);
    if (!filtered.length) {
      root.innerHTML = '<p class="admin-meta">Sem vendas para este filtro.</p>';
      return;
    }
    const empty = (key, label, sortKey) => ({ key, label, sortKey, count: 0, net: 0, gross: 0 });
    const byHourMap = new Map(aggregateSalesWhen(filtered, 'hour').map((b) => [b.key, b]));
    const hours = Array.from({ length: 24 }, (_, h) => (
      byHourMap.get(String(h)) || empty(String(h), `${String(h).padStart(2, '0')}h`, h)
    ));
    const byWeekMap = new Map(aggregateSalesWhen(filtered, 'weekday').map((b) => [b.key, b]));
    const weekdays = WEEKDAY_ORDER.map((d) => (
      byWeekMap.get(String(d)) || empty(String(d), WEEKDAY_LABELS[d], WEEKDAY_ORDER.indexOf(d))
    ));
    const byDayMap = new Map(aggregateSalesWhen(filtered, 'monthday').map((b) => [b.key, b]));
    const monthdays = Array.from({ length: 31 }, (_, i) => {
      const day = i + 1;
      return byDayMap.get(String(day)) || empty(String(day), `Dia ${day}`, day);
    });
    const byMonthMap = new Map(aggregateSalesWhen(filtered, 'month').map((b) => [b.key, b]));
    const months = Object.keys(MONTH_LABELS).map((num) => (
      byMonthMap.get(num) || empty(num, MONTH_LABELS[num], Number(num))
    ));
    root.innerHTML = [
      renderWhenBarChart('Hora do dia', hours, metric),
      renderWhenBarChart('Dia da semana', weekdays, metric),
      renderWhenBarChart('Dia do mês', monthdays, metric),
      renderWhenBarChart('Mês do ano', months, metric)
    ].join('');
  }

  let consolidatedSalesCache = null;
  let vendasWhenFiltersWired = false;

  function wireVendasWhenFilters() {
    if (vendasWhenFiltersWired) return;
    const ids = ['vendas-when-channel', 'vendas-when-metric', 'vendas-when-range'];
    ids.forEach((id) => {
      document.getElementById(id)?.addEventListener('change', () => {
        if (consolidatedSalesCache) renderConsolidadoWhenCharts(consolidatedSalesCache);
      });
    });
    vendasWhenFiltersWired = true;
  }

  async function loadConsolidatedSales(preserveOpen) {
    const root = document.getElementById('vendas-consol-tree-root');
    const checked = document.getElementById('vendas-consol-checked-at');
    if (!root) return;
    wireVendasWhenFilters();
    const openPaths = preserveOpen
      ? [...root.querySelectorAll('details[open][data-tree-path]')].map((el) => el.getAttribute('data-tree-path')).filter(Boolean)
      : [];
    root.innerHTML = '<p class="admin-meta">Carregando consolidado…</p>';
    try {
      await ensureSalesConfig();
      const sales = await fetchConsolidatedSales();
      consolidatedSalesCache = sales;
      renderConsolidadoPeriods(sales);
      renderConsolidadoStats(sales);
      renderConsolidadoWhenCharts(sales);
      root.innerHTML = renderConsolidatedTree(buildConsolidatedSalesTree(sales));
      if (preserveOpen && openPaths.length) {
        const want = new Set(openPaths);
        root.querySelectorAll('details[data-tree-path]').forEach((el) => {
          if (want.has(el.getAttribute('data-tree-path'))) el.open = true;
        });
      }
      if (checked) {
        checked.hidden = false;
        checked.textContent = 'Atualizado em ' + new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      }
      showStatus('', '', 'vendas');
    } catch (err) {
      root.innerHTML = `<p class="admin-meta">${escapeHtml(err.message || 'Erro ao carregar.')}</p>`;
      showStatus(err.message || 'Erro ao carregar consolidado.', 'error', 'vendas');
    }
  }

  async function exportConsolidatedSales() {
    const btn = document.getElementById('btn-vendas-consol-export');
    if (btn) btn.disabled = true;
    showStatus('Preparando exportação…', '', 'vendas');
    try {
      const sales = consolidatedSalesCache || await fetchConsolidatedSales();
      consolidatedSalesCache = sales;
      if (!sales.length) {
        showStatus('Nenhuma venda para exportar.', 'error', 'vendas');
        return;
      }
      const workbook = buildSalesExportWorkbook(sales);
      const stamp = new Date().toISOString().slice(0, 10);
      downloadTextFile(workbook, `vendas-consolidado-${stamp}.xls`, 'application/vnd.ms-excel;charset=utf-8');
      showStatus(`Exportado: ${sales.length} vendas (detalhe + dia/semana/mês/ano).`, 'success', 'vendas');
    } catch (err) {
      showStatus(err.message || 'Erro ao exportar.', 'error', 'vendas');
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  function renderSalesTree(tree, options = {}) {
    const channel = options.channel || 'mercadolivre';
    const emptyHint = channel === 'amazon'
      ? 'Nenhuma venda Amazon indexada. Use <strong>Atualizar Amazon</strong>.'
      : channel === 'shopee'
        ? 'Nenhuma venda Shopee indexada. Autorize a loja e use <strong>Atualizar Shopee</strong>.'
        : channel === 'loja'
          ? 'Nenhuma venda paga na loja oficial.'
          : 'Nenhuma venda ML indexada. Use <strong>Atualizar ML</strong>.';
    const fallbackTitle = channel === 'amazon'
      ? 'Pedido Amazon'
      : channel === 'shopee'
        ? 'Pedido Shopee'
        : channel === 'loja'
          ? 'Pedido loja'
          : 'Pedido ML';
    const years = Object.keys(tree || {}).sort((a, b) => Number(b) - Number(a));
    if (!years.length) {
      return `<p class="admin-meta">${emptyHint}</p>`;
    }
    let html = '<div class="clicks-tree sales-tree">';
    years.forEach((year) => {
      const y = tree[year];
      const yearPath = String(year);
      html += `<details class="clicks-tree-node clicks-tree-year" data-tree-path="${escapeHtml(yearPath)}"><summary>${salesTreeSummary(year, y)}</summary><div class="clicks-tree-children">`;
      const months = Object.keys(y.months).sort((a, b) => Number(b) - Number(a));
      months.forEach((monthNum) => {
        const m = y.months[monthNum];
        const monthPath = `${yearPath}|${monthNum}`;
        html += `<details class="clicks-tree-node clicks-tree-month" data-tree-path="${escapeHtml(monthPath)}"><summary>${salesTreeSummary(m.name, m)}</summary><div class="clicks-tree-children">`;
        const days = Object.keys(m.days).sort((a, b) => b.localeCompare(a));
        days.forEach((dateKey) => {
          const d = m.days[dateKey];
          const dayPath = `${monthPath}|${dateKey}`;
          html += `<details class="clicks-tree-node clicks-tree-day" data-tree-path="${escapeHtml(dayPath)}"><summary>${salesTreeSummary(d.label, d)}</summary><div class="clicks-tree-children">`;
          html += '<ul class="sales-tree-list">';
          d.sales.forEach((sale) => {
            const title = sale.items?.[0]?.title || fallbackTitle;
            const buyer = sale.buyer?.nickname || '—';
            html += `<li class="sales-tree-row">
              <span class="sales-tree-time">${escapeHtml(formatSaleTime(sale._ts))}</span>
              <span class="sales-tree-id">#${escapeHtml(String(sale.externalId || ''))}</span>
              <span class="sales-tree-buyer">${escapeHtml(buyer)}</span>
              <span class="sales-tree-title" title="${escapeHtml(title)}">${escapeHtml(title)}</span>
              ${renderSaleMoneyCols(sale, channel)}
            </li>`;
          });
          html += '</ul></div></details>';
        });
        html += '</div></details>';
      });
      html += '</div></details>';
    });
    html += '</div>';
    return html;
  }

  function captureSalesTreeOpenPaths() {
    const root = document.getElementById('vendas-ml-tree-root');
    if (!root) return [];
    return [...root.querySelectorAll('details[open][data-tree-path]')]
      .map((el) => el.getAttribute('data-tree-path'))
      .filter(Boolean);
  }

  function restoreSalesTreeOpenPaths(paths) {
    const root = document.getElementById('vendas-ml-tree-root');
    if (!root || !paths?.length) return;
    const want = new Set(paths);
    root.querySelectorAll('details[data-tree-path]').forEach((el) => {
      if (want.has(el.getAttribute('data-tree-path'))) el.open = true;
    });
  }

  function renderMlSalesStats(sales, meta) {
    const el = document.getElementById('vendas-ml-stats');
    if (!el) return;
    el.innerHTML = renderSalesMoneyStats(sales, { ...meta, feeLabel: 'Tarifa ML' });
  }

  async function ensureSalesConfig() {
    if (currentConfig?.kitCost?.components?.length) return;
    try { await loadConfig(); } catch (_) { /* BOM padrão no fallback */ }
  }

  async function loadMlSales(preserveOpen) {
    const root = document.getElementById('vendas-ml-tree-root');
    const checked = document.getElementById('vendas-ml-checked-at');
    const token = sessionStorage.getItem(SESSION_KEY);
    const base = apiBase();
    if (!root) return;
    if (!token || !base) {
      showStatus('Faça login no admin.', 'error', 'vendas');
      return;
    }
    await ensureSalesConfig();
    const openPaths = preserveOpen ? captureSalesTreeOpenPaths() : [];
    root.innerHTML = '<p class="admin-meta">Carregando vendas ML…</p>';
    try {
      const res = await fetch(`${base.replace(/\/$/, '')}/admin/ml/sales?limit=400`, {
        headers: { Authorization: 'Bearer ' + token },
        cache: 'no-store'
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      const sales = (Array.isArray(data.sales) ? data.sales : []).filter((s) => !isDroppedMarketplaceSale(s));
      const meta = { ...(data.meta || {}), indexed: data.totalIndexed };
      renderMlSalesStats(sales, meta);
      root.innerHTML = renderSalesTree(buildSalesTree(sales), { channel: 'mercadolivre' });
      if (preserveOpen) restoreSalesTreeOpenPaths(openPaths);
      if (checked) {
        checked.hidden = false;
        checked.textContent = 'Atualizado em ' + new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      }
      showStatus('', '', 'vendas');
    } catch (err) {
      root.innerHTML = `<p class="admin-meta">${escapeHtml(err.message || 'Erro ao carregar.')}</p>`;
      showStatus(err.message || 'Erro ao carregar vendas ML.', 'error', 'vendas');
    }
  }

  function captureAmzSalesTreeOpenPaths() {
    const root = document.getElementById('vendas-amz-tree-root');
    if (!root) return [];
    return [...root.querySelectorAll('details[open][data-tree-path]')]
      .map((el) => el.getAttribute('data-tree-path'))
      .filter(Boolean);
  }

  function restoreAmzSalesTreeOpenPaths(paths) {
    const root = document.getElementById('vendas-amz-tree-root');
    if (!root || !paths?.length) return;
    const want = new Set(paths);
    root.querySelectorAll('details[data-tree-path]').forEach((el) => {
      if (want.has(el.getAttribute('data-tree-path'))) el.open = true;
    });
  }

  function renderAmzSalesStats(sales, meta) {
    const el = document.getElementById('vendas-amz-stats');
    if (!el) return;
    el.innerHTML = renderSalesMoneyStats(sales, { ...meta, feeLabel: 'Tarifa Amazon' });
  }

  async function loadAmzSales(preserveOpen) {
    const root = document.getElementById('vendas-amz-tree-root');
    const checked = document.getElementById('vendas-amz-checked-at');
    const token = sessionStorage.getItem(SESSION_KEY);
    const base = apiBase();
    if (!root) return;
    if (!token || !base) {
      showStatus('Faça login no admin.', 'error', 'vendas');
      return;
    }
    await ensureSalesConfig();
    const openPaths = preserveOpen ? captureAmzSalesTreeOpenPaths() : [];
    root.innerHTML = '<p class="admin-meta">Carregando vendas Amazon…</p>';
    try {
      const res = await fetch(`${base.replace(/\/$/, '')}/admin/amz/sales?limit=5000`, {
        headers: { Authorization: 'Bearer ' + token },
        cache: 'no-store'
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      const sales = (Array.isArray(data.sales) ? data.sales : []).filter((s) => !isDroppedMarketplaceSale(s));
      const meta = { ...(data.meta || {}), indexed: data.totalIndexed };
      renderAmzSalesStats(sales, meta);
      root.innerHTML = renderSalesTree(buildSalesTree(sales), { channel: 'amazon' });
      if (preserveOpen) restoreAmzSalesTreeOpenPaths(openPaths);
      if (checked) {
        checked.hidden = false;
        checked.textContent = 'Atualizado em ' + new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      }
      showStatus('', '', 'vendas');
    } catch (err) {
      root.innerHTML = `<p class="admin-meta">${escapeHtml(err.message || 'Erro ao carregar.')}</p>`;
      showStatus(err.message || 'Erro ao carregar vendas Amazon.', 'error', 'vendas');
    }
  }

  async function syncAmzSalesFromAdmin() {
    const token = sessionStorage.getItem(SESSION_KEY);
    const base = apiBase();
    if (!token || !base) {
      showStatus('Faça login no admin.', 'error', 'vendas');
      return;
    }
    showStatus('Sincronizando Amazon…', '', 'vendas');
    try {
      const res = await fetch(`${base.replace(/\/$/, '')}/admin/amz/sync?full=1`, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token },
        cache: 'no-store'
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      showStatus(
        `Atualizar Amazon: ${data.imported || 0} novas, ${data.updated || 0} alteradas, ${data.unchanged || 0} iguais (${data.indexed || 0} no índice).`,
        'success',
        'vendas'
      );
      await loadAmzSales(true);
    } catch (err) {
      showStatus(err.message || 'Falha no sync Amazon.', 'error', 'vendas');
    }
  }

  async function loadShopeeSales(preserveOpen) {
    const root = document.getElementById('vendas-shopee-tree-root');
    const checked = document.getElementById('vendas-shopee-checked-at');
    const token = sessionStorage.getItem(SESSION_KEY);
    const base = apiBase();
    if (!root) return;
    if (!token || !base) {
      showStatus('Faça login no admin.', 'error', 'vendas');
      return;
    }
    await ensureSalesConfig();
    const openPaths = preserveOpen
      ? [...root.querySelectorAll('details[open][data-tree-path]')].map((el) => el.getAttribute('data-tree-path')).filter(Boolean)
      : [];
    root.innerHTML = '<p class="admin-meta">Carregando vendas Shopee…</p>';
    try {
      const res = await fetch(`${base.replace(/\/$/, '')}/admin/shopee/sales?limit=5000`, {
        headers: { Authorization: 'Bearer ' + token },
        cache: 'no-store'
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      const sales = (Array.isArray(data.sales) ? data.sales : []).filter((s) => !isDroppedMarketplaceSale(s));
      const meta = { ...(data.meta || {}), indexed: data.totalIndexed };
      const statsEl = document.getElementById('vendas-shopee-stats');
      if (statsEl) statsEl.innerHTML = renderSalesMoneyStats(sales, { ...meta, feeLabel: 'Tarifa Shopee' });
      root.innerHTML = renderSalesTree(buildSalesTree(sales), { channel: 'shopee' });
      if (preserveOpen && openPaths.length) {
        const want = new Set(openPaths);
        root.querySelectorAll('details[data-tree-path]').forEach((el) => {
          if (want.has(el.getAttribute('data-tree-path'))) el.open = true;
        });
      }
      if (checked) {
        checked.hidden = false;
        checked.textContent = 'Atualizado em ' + new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      }
      showStatus('', '', 'vendas');
    } catch (err) {
      root.innerHTML = `<p class="admin-meta">${escapeHtml(err.message || 'Erro ao carregar.')}</p>`;
      showStatus(err.message || 'Erro ao carregar vendas Shopee.', 'error', 'vendas');
    }
  }

  async function authorizeMlFromAdmin() {
    const token = sessionStorage.getItem(SESSION_KEY);
    const base = apiBase();
    if (!token || !base) {
      showStatus('Faça login no admin.', 'error', 'vendas');
      return;
    }
    showStatus('Abrindo autorização Mercado Livre (só precisa se a renovação automática tiver quebrado)…', '', 'vendas');
    try {
      const res = await fetch(`${base.replace(/\/$/, '')}/admin/ml/auth-url`, {
        headers: { Authorization: 'Bearer ' + token },
        cache: 'no-store'
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      if (!data.url) throw new Error('URL de autorização não veio da API.');
      window.open(data.url, '_blank', 'noopener');
      showStatus('Autorize no Mercado Livre e volte. Depois disso o Worker renova sozinho.', 'success', 'vendas');
    } catch (err) {
      showStatus(err.message || 'Falha ao gerar link ML.', 'error', 'vendas');
    }
  }

  async function authorizeShopeeFromAdmin() {
    const token = sessionStorage.getItem(SESSION_KEY);
    const base = apiBase();
    if (!token || !base) {
      showStatus('Faça login no admin.', 'error', 'vendas');
      return;
    }
    showStatus('Abrindo autorização Shopee…', '', 'vendas');
    try {
      const res = await fetch(`${base.replace(/\/$/, '')}/admin/shopee/auth-url`, {
        headers: { Authorization: 'Bearer ' + token },
        cache: 'no-store'
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      if (!data.url) throw new Error('URL de autorização não veio da API.');
      window.open(data.url, '_blank', 'noopener');
      showStatus(
        `Confira o Redirect URL no app Shopee: ${data.redirectUri || ''}`,
        'success',
        'vendas'
      );
    } catch (err) {
      showStatus(err.message || 'Falha ao gerar link Shopee.', 'error', 'vendas');
    }
  }

  async function syncShopeeSalesFromAdmin() {
    const token = sessionStorage.getItem(SESSION_KEY);
    const base = apiBase();
    if (!token || !base) {
      showStatus('Faça login no admin.', 'error', 'vendas');
      return;
    }
    showStatus('Sincronizando Shopee…', '', 'vendas');
    try {
      const res = await fetch(`${base.replace(/\/$/, '')}/admin/shopee/sync?full=1`, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token },
        cache: 'no-store'
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      showStatus(
        `Atualizar Shopee: ${data.imported || 0} novas, ${data.updated || 0} alteradas, ${data.unchanged || 0} iguais (${data.indexed || 0} no índice).`,
        'success',
        'vendas'
      );
      await loadShopeeSales(true);
    } catch (err) {
      showStatus(err.message || 'Falha no sync Shopee.', 'error', 'vendas');
    }
  }

  async function syncMlSalesFromAdmin() {
    const token = sessionStorage.getItem(SESSION_KEY);
    const base = apiBase();
    const btn = document.getElementById('btn-vendas-ml-sync');
    if (!token || !base) {
      showStatus('Faça login no admin.', 'error', 'vendas');
      return;
    }
    if (btn?.dataset.busy === '1') return;
    const btnHtml = btn ? btn.innerHTML : '';
    if (btn) {
      btn.dataset.busy = '1';
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sincronizando ML…';
    }
    showStatus('Sincronizando Mercado Livre (pode levar até 1 minuto)…', '', 'vendas');
    const ac = new AbortController();
    const abortTimer = setTimeout(() => ac.abort(), 120000);
    try {
      const res = await fetch(`${base.replace(/\/$/, '')}/admin/ml/sync?full=1&days=400`, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token },
        cache: 'no-store',
        signal: ac.signal
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      if (data.truncated) {
        showStatus(data.error || 'Corta no meio — clica Atualizar ML de novo.', '', 'vendas');
      } else {
        const more = data.hasMore ? ' Ainda tem pedido antigo na fila; clica de novo se a lista não completar.' : '';
        showStatus(
          `Atualizar ML: ${data.imported || 0} novas, ${data.updated || 0} alteradas, ${data.unchanged || 0} iguais (${data.indexed || 0} no índice).${more}`,
          more ? '' : 'success',
          'vendas'
        );
      }
      await loadMlSales(true);
    } catch (err) {
      const msg = err?.name === 'AbortError'
        ? 'O Atualizar ML passou de 2 minutos. Clica de novo — continua.'
        : /subrequest|cortou no meio/i.test(String(err.message || ''))
          ? 'O Cloudflare cortou no meio. Clica Atualizar ML de novo.'
          : (err.message || 'Falha no Atualizar ML.');
      showStatus(msg, 'error', 'vendas');
    } finally {
      clearTimeout(abortTimer);
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = btnHtml || '<i class="fas fa-cloud-download-alt"></i> Atualizar ML';
        delete btn.dataset.busy;
      }
    }
  }

  function showVendasSubtab(subtabId) {
    const container = document.getElementById('admin-tab-vendas');
    if (!container) return;
    const id = subtabId || 'mercadolivre';
    container.querySelectorAll('[data-vendas-subtab]').forEach((tab) => {
      const active = tab.dataset.vendasSubtab === id;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    container.querySelectorAll('.admin-vendas-subpanel').forEach((panel) => {
      panel.hidden = panel.id !== 'admin-vendas-' + id;
    });
    try { localStorage.setItem('stf_admin_vendas_subtab', id); } catch (e) { /* ignore */ }
    if (id === 'loja') loadLojaSales();
    if (id === 'mercadolivre') loadMlSales();
    if (id === 'amazon') loadAmzSales();
    if (id === 'shopee') loadShopeeSales();
    if (id === 'consolidado') loadConsolidatedSales();
  }

  let vendasSubtabsWired = false;

  function initVendasSubtabs() {
    if (vendasSubtabsWired) return;
    const container = document.getElementById('admin-tab-vendas');
    if (!container) return;
    const tabs = container.querySelectorAll('[data-vendas-subtab]');
    if (!tabs.length) return;
    vendasSubtabsWired = true;
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => showVendasSubtab(tab.dataset.vendasSubtab));
    });
    document.getElementById('btn-vendas-loja-refresh')?.addEventListener('click', () => loadLojaSales(true));
    document.getElementById('btn-vendas-ml-refresh')?.addEventListener('click', () => loadMlSales(true));
    document.getElementById('btn-vendas-ml-sync')?.addEventListener('click', () => syncMlSalesFromAdmin());
    document.getElementById('btn-vendas-ml-auth')?.addEventListener('click', () => authorizeMlFromAdmin());
    document.getElementById('btn-vendas-amz-refresh')?.addEventListener('click', () => loadAmzSales(true));
    document.getElementById('btn-vendas-amz-sync')?.addEventListener('click', () => syncAmzSalesFromAdmin());
    document.getElementById('btn-vendas-shopee-refresh')?.addEventListener('click', () => loadShopeeSales(true));
    document.getElementById('btn-vendas-shopee-sync')?.addEventListener('click', () => syncShopeeSalesFromAdmin());
    document.getElementById('btn-vendas-shopee-auth')?.addEventListener('click', () => authorizeShopeeFromAdmin());
    document.getElementById('btn-vendas-consol-refresh')?.addEventListener('click', () => loadConsolidatedSales(true));
    document.getElementById('btn-vendas-consol-export')?.addEventListener('click', () => exportConsolidatedSales());
    document.getElementById('btn-vendas-goto-pedidos')?.addEventListener('click', () => {
      document.querySelector('.admin-tab[data-admin-tab="pedidos"]')?.click();
    });
    let saved = 'mercadolivre';
    try { saved = localStorage.getItem('stf_admin_vendas_subtab') || 'mercadolivre'; } catch (e) { /* ignore */ }
    if (!container.querySelector('#admin-vendas-' + saved)) saved = 'mercadolivre';
    showVendasSubtab(saved);
  }

  async function runShippingQuote(mode) {
    const base = apiBase();
    if (!base) {
      showStatus('Configure a URL da API para testar frete.', 'error', 'frete');
      return;
    }
    showFreteSubtab(mode === 'br' ? 'correios' : 'internacional');
    const f = els.configForm;
    const weight = parseFloat(f.shippingWeight?.value) || 5;
    let url;
    if (mode === 'br') {
      const cep = (document.getElementById('test-ship-cep')?.value || '').replace(/\D/g, '');
      if (cep.length !== 8) {
        showStatus('Informe um CEP brasileiro válido para testar.', 'error', 'frete');
        return;
      }
      url = `${base}/shipping/quote?cep=${encodeURIComponent(cep)}&weightGrams=${weight}`;
    } else {
      const country = document.getElementById('test-ship-country')?.value || 'PT';
      url = `${base}/shipping/quote?country=${encodeURIComponent(country)}&weightGrams=${weight}`;
    }
    showQuoteResult('Consultando...');
    try {
      const res = await fetch(url, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Falha na cotação');
      showQuoteResult(formatQuoteResult(data));
      if (data.source === 'config' || data.source === 'estimate') {
        showStatus('Atenção: o cliente veria estimativa/fallback, não a API dos Correios.', 'warning', 'frete');
      } else {
        showStatus('Cotação obtida da API dos Correios.', 'success', 'frete');
      }
    } catch (err) {
      showQuoteResult('Erro: ' + (err.message || 'falha na cotação'));
      showStatus(err.message, 'error', 'frete');
    }
  }

  function integrationStatusClass(status) {
    if (status === 'ok') return 'admin-status-ok';
    if (status === 'warn') return 'admin-status-warn';
    if (status === 'off') return 'admin-status-off';
    return 'admin-status-bad';
  }

  function integrationStatusIcon(status) {
    if (status === 'ok') return '✓';
    if (status === 'warn') return '⚠';
    if (status === 'off') return '—';
    return '✗';
  }

  function renderIntegrationDetailCell(row) {
    const cls = integrationStatusClass(row.status);
    const icon = integrationStatusIcon(row.status);
    const lines = Array.isArray(row.detailLines)
      ? row.detailLines.map((l) => String(l || '').trim()).filter(Boolean)
      : [];
    if (lines.length) {
      const head = String(row.detail || '').trim() || `${lines.length} itens`;
      return `<div class="admin-api-detail-stack ${cls}">
        <div class="admin-api-detail-head">${icon} ${escAttr(head)}</div>
        <ul class="admin-api-detail-list">${lines.map((l) => `<li>${escAttr(l)}</li>`).join('')}</ul>
      </div>`;
    }
    const single = String(row.detail || '').trim();
    return `<span class="${cls}">${icon} ${escAttr(single)}</span>`;
  }

  function renderPaymentBalancesGrid(balances, checkedAt, summary) {
    const grid = document.getElementById('payment-balances-grid');
    const summaryEl = document.getElementById('payment-balances-summary');
    const checkedEl = document.getElementById('payment-balances-checked-at');
    if (!grid) return;
    const cards = ['mercadopago', 'paypal', 'stripe']
      .map((id) => balances?.[id])
      .filter(Boolean);
    if (!cards.length) {
      grid.innerHTML = '<p class="admin-meta">Nenhum saldo retornado.</p>';
      if (summaryEl) {
        summaryEl.hidden = true;
        summaryEl.innerHTML = '';
      }
      if (checkedEl) checkedEl.hidden = true;
      return;
    }
    grid.innerHTML = cards.map((card) => {
      const cls = integrationStatusClass(card.status);
      const lines = (card.lines || []).map((l) => {
        const isFix = String(l).startsWith('Como resolver:');
        return `<li${isFix ? ' class="admin-payment-balance-fix"' : ''}>${escAttr(l)}</li>`;
      }).join('');
      const asOf = card.asOf
        ? `<p class="admin-payment-balance-asof">Atualizado: ${escAttr(new Date(card.asOf).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }))}</p>`
        : '';
      return `<article class="admin-payment-balance-card">
        <h3>${escAttr(card.label)} <span class="admin-payment-balance-status ${cls}">${escAttr(card.statusLabel || card.status)}</span></h3>
        <ul class="admin-payment-balance-lines">${lines || '<li>—</li>'}</ul>
        ${asOf}
      </article>`;
    }).join('');

    if (summaryEl) {
      const rows = summary?.rows || [];
      if (!rows.length) {
        summaryEl.hidden = true;
        summaryEl.innerHTML = '';
      } else {
        summaryEl.hidden = false;
        summaryEl.innerHTML = `
          <h3 class="admin-payment-summary-title"><i class="fas fa-calculator"></i> Consolidado por moeda</h3>
          <p class="admin-meta admin-payment-summary-note">Soma Mercado Pago + PayPal + Stripe. MP: disponível = relatório MP; A liberar = estimativa se não for API oficial. BRL e USD/EUR não são convertidos.</p>
          <div class="admin-payment-summary-grid">
            ${rows.map((row) => `
              <article class="admin-payment-summary-card">
                <h4>${escAttr(row.currency)}</h4>
                <ul class="admin-payment-summary-lines">
                  ${(row.lines || []).map((l) => `<li>${escAttr(l)}</li>`).join('')}
                </ul>
                ${row.gateways?.length ? `<p class="admin-payment-summary-gateways">Fontes: ${escAttr(row.gateways.join(', '))}</p>` : ''}
              </article>
            `).join('')}
          </div>`;
      }
    }

    if (checkedEl) {
      if (checkedAt) {
        checkedEl.textContent = 'Consulta: ' + new Date(checkedAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        checkedEl.hidden = false;
      } else {
        checkedEl.hidden = true;
      }
    }
  }

  function formatAuditMoney(n) {
    const v = Number(n);
    if (!Number.isFinite(v)) return '—';
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  async function runMpReleaseAudit() {
    const statusEl = document.getElementById('mp-audit-status');
    const summaryEl = document.getElementById('mp-audit-summary');
    const excessEl = document.getElementById('mp-audit-excess');
    const wrap = document.getElementById('mp-audit-table-wrap');
    const tbody = document.getElementById('mp-audit-tbody');
    const btn = document.getElementById('btn-mp-release-audit');
    const token = sessionStorage.getItem(SESSION_KEY);
    const base = apiBase();
    if (!base || !token) {
      if (statusEl) {
        statusEl.textContent = 'Faça login na API.';
        statusEl.className = 'admin-status form-status error';
        statusEl.hidden = false;
      }
      return;
    }
    const target = Number(document.getElementById('mp-audit-target')?.value || '766.6');
    if (btn) btn.disabled = true;
    if (statusEl) {
      statusEl.textContent = 'Buscando pagamentos na API MP (pode levar 1–2 min)…';
      statusEl.className = 'admin-status form-status';
      statusEl.hidden = false;
    }
    if (summaryEl) summaryEl.innerHTML = '';
    if (excessEl) excessEl.innerHTML = '';
    if (wrap) wrap.hidden = true;
    if (tbody) tbody.innerHTML = '';

    try {
      const qs = new URLSearchParams({
        target: String(target),
        maxDetail: '300',
        maxPages: '5',
        includePayments: '1'
      });
      const res = await fetch(`${base.replace(/\/$/, '')}/admin/mp/release-audit?${qs}`, {
        headers: { Authorization: 'Bearer ' + token },
        cache: 'no-store'
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Falha na auditoria');

      const b = data.buckets || {};
      const a = data.analysis || {};
      const prod = b.F_production_current_algorithm || {};
      const best = a.bestRule || {};
      const official = data.officialBalance || {};

      if (summaryEl) {
        summaryEl.innerHTML = `
          <p><strong>Alvo app:</strong> ${formatAuditMoney(data.targetAppOficial)} ·
          <strong>Produção atual:</strong> ${formatAuditMoney(prod.total)} (${prod.count || 0} pag.) ·
          <strong>Δ:</strong> ${formatAuditMoney(a.productionDeltaVsTarget)}</p>
          <p><strong>API /balance unavailable:</strong> ${official.ok ? formatAuditMoney(official.unavailable_balance) : escAttr(official.error || 'indisponível')}</p>
          <p><strong>Regra mais próxima:</strong> ${escAttr(best.label || '—')} → ${formatAuditMoney(best.total)} (Δ ${formatAuditMoney(best.deltaVsTarget)})</p>
          <ul>${Object.entries(b).map(([k, v]) => `<li><code>${escAttr(k)}</code>: ${formatAuditMoney(v.total)} (${v.count || 0})</li>`).join('')}</ul>`;
      }

      const excess = a.excessInProduction || [];
      if (excessEl) {
        if (!excess.length) {
          excessEl.innerHTML = '<p><strong>Excesso vs melhor regra:</strong> nenhum pagamento identificado (ou amostra truncada).</p>';
        } else {
          excessEl.innerHTML = `<p><strong>Entram na produção (${formatAuditMoney(a.productionTotal)}) mas NÃO na regra ${escAttr(best.id || '')} — soma ${formatAuditMoney(a.excessInProductionSum)}:</strong></p>
            <ul>${excess.map((r) => `<li>#${escAttr(r.id)} · líq. ${formatAuditMoney(r.net_received_amount)} · release ${escAttr(r.money_release_date || '—')} · ${escAttr(r.money_release_status || '—')}${r.money_release_future ? ' · futuro' : ' · passado'}</li>`).join('')}</ul>`;
        }
      }

      const rows = (data.payments || []).slice().sort((x, y) => {
        if (x.inProductionPendingSum !== y.inProductionPendingSum) return x.inProductionPendingSum ? -1 : 1;
        return Number(y.net_received_amount || 0) - Number(x.net_received_amount || 0);
      });
      if (tbody && wrap) {
        tbody.innerHTML = rows.map((r) => `<tr class="${r.inProductionPendingSum ? 'mp-audit-prod' : ''}">
          <td><code>${escAttr(r.id)}</code></td>
          <td>${escAttr(r.status)}</td>
          <td>${escAttr(r.money_release_status || '—')}</td>
          <td>${escAttr(r.money_release_date ? new Date(r.money_release_date).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '—')}</td>
          <td>${formatAuditMoney(r.transaction_amount)}</td>
          <td>${formatAuditMoney(r.net_received_amount)}</td>
          <td>${r.inProductionPendingSum ? 'sim' : '—'}</td>
          <td>${Number(r.transaction_amount_refunded) > 0 ? formatAuditMoney(r.transaction_amount_refunded) : '—'}</td>
        </tr>`).join('');
        wrap.hidden = !rows.length;
      }

      if (data.coverage?.truncated && statusEl) {
        statusEl.textContent = `Amostra truncada: ${data.coverage.paymentsFetchedFull}/${data.coverage.uniqueIdsFromSearch} pagamentos (aumente maxDetail no endpoint).`;
        statusEl.className = 'admin-status form-status warning';
      } else if (statusEl) {
        statusEl.textContent = `Auditoria concluída · ${data.coverage?.paymentsFetchedFull || 0} pagamentos · ${data.auditAt || ''}`;
        statusEl.className = 'admin-status form-status success';
      }
    } catch (err) {
      if (statusEl) {
        statusEl.textContent = err.message || 'Erro na auditoria';
        statusEl.className = 'admin-status form-status error';
      }
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  let paymentBalancesLoading = false;

  async function loadPaymentBalances(force) {
    const grid = document.getElementById('payment-balances-grid');
    if (!grid || paymentBalancesLoading) return;
    const token = sessionStorage.getItem(SESSION_KEY);
    const base = apiBase();
    if (!base || !token) {
      grid.innerHTML = '<p class="admin-meta">Faça login na API para carregar os saldos.</p>';
      return;
    }
    paymentBalancesLoading = true;
    if (force !== false) {
      grid.innerHTML = '<p class="admin-meta"><i class="fas fa-spinner fa-spin"></i> Consultando Mercado Pago, PayPal e Stripe…</p>';
    }
    try {
      const data = await refreshIntegrationsCache(force === true);
      saveBalancesSnapshot(data);
      renderPaymentBalancesGrid(data?.paymentBalances, data?.checkedAt, data?.paymentBalancesSummary);
      if (data?.integrations) renderIntegrationsTable(data.integrations, data.checkedAt);
    } catch (err) {
      grid.innerHTML = `<p class="admin-status-bad">✗ ${escAttr(err.message || 'Erro ao consultar saldos')}</p>`;
    } finally {
      paymentBalancesLoading = false;
    }
  }

  function renderIntegrationsTable(integrations, checkedAt) {
    const tbody = document.getElementById('api-integrations-tbody');
    const checkedEl = document.getElementById('api-integrations-checked-at');
    if (!tbody) return;

    if (!integrations?.length) {
      tbody.innerHTML = '<tr><td colspan="3" class="admin-meta">Nenhuma integração retornada.</td></tr>';
      if (checkedEl) checkedEl.hidden = true;
      return;
    }

    tbody.innerHTML = integrations.map((row) => {
      return `<tr>
        <td><strong>${escAttr(row.label)}</strong></td>
        <td>${escAttr(row.description)}</td>
        <td class="admin-api-status-cell">${renderIntegrationDetailCell(row)}</td>
      </tr>`;
    }).join('');

    if (checkedEl) {
      if (checkedAt) {
        const when = new Date(checkedAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        checkedEl.textContent = 'Última verificação: ' + when;
        checkedEl.hidden = false;
      } else {
        checkedEl.hidden = true;
      }
    }
  }

  let integrationsLoading = false;
  let lastIntegrations = null;
  let customersLoading = false;
  let clicksLoading = false;
  let clicksSearchTimer = null;
  let clicksBgStarted = false;
  let clicksLoadPromise = null;
  let clicksMetaCache = null;
  let feedbackLoading = false;
  let feedbackSearchTimer = null;
  let clicksCache = [];
  let clicksWhenCache = [];
  let clicksWhenWindow = null;

  const CLICKS_SNAPSHOT_KEY = 'stf_admin_clicks_snapshot_v1';
  const BALANCES_SNAPSHOT_KEY = 'stf_admin_balances_snapshot_v1';
  const ADMIN_TAB_IDS = new Set(['vendas', 'pedidos', 'cliques', 'saldos', 'api', 'clientes', 'pesquisa', 'comunidade', 'documentacao']);
  let lastBalancesSnapshot = null;

  function resolveDefaultAdminTab() {
    try {
      const saved = localStorage.getItem('stf_admin_tab');
      if (saved && ADMIN_TAB_IDS.has(saved)) return saved;
    } catch (_) { /* ignore */ }
    return 'pedidos';
  }

  function restoreAdminSnapshots() {
    restoreClicksSnapshot();
    restoreBalancesSnapshot();
  }

  function saveClicksSnapshot(data) {
    if (!data?.clicks?.length) return;
    try {
      localStorage.setItem(CLICKS_SNAPSHOT_KEY, JSON.stringify({
        savedAt: Date.now(),
        meta: {
          checkedAt: data.checkedAt,
          total: data.total,
          capacity: data.capacity,
          byDestino: data.byDestino,
          lastClickAt: data.lastClickAt,
          oldestClickAt: data.oldestClickAt,
          dailyD1: data.dailyD1,
          withNav: data.withNav,
          navSessions: data.navSessions
        },
        clicks: data.clicks,
        whenClicks: data.whenClicks?.length ? data.whenClicks : data.clicks,
        whenWindow: data.capacity || null
      }));
    } catch (_) { /* quota */ }
  }

  function restoreClicksSnapshot() {
    try {
      const raw = localStorage.getItem(CLICKS_SNAPSHOT_KEY);
      if (!raw) return false;
      const snap = JSON.parse(raw);
      if (!snap?.clicks?.length) return false;
      clicksCache = snap.clicks;
      clicksWhenCache = snap.whenClicks?.length ? snap.whenClicks : clicksCache;
      clicksWhenWindow = snap.whenWindow || null;
      clicksMetaCache = {
        ...snap.meta,
        clicks: clicksCache,
        whenClicks: clicksWhenCache,
        capacity: snap.meta?.capacity || snap.whenWindow
      };
      return true;
    } catch (_) {
      return false;
    }
  }

  function mergeBalancesSnapshot(prevSnap, nextData) {
    if (!nextData?.paymentBalances) return nextData;
    const prevMp = prevSnap?.paymentBalances?.mercadopago;
    const nextMp = nextData.paymentBalances.mercadopago;
    const prevHasAvail = (prevMp?.amounts || []).some((a) => a.kind === 'available');
    const nextHasAvail = (nextMp?.amounts || []).some((a) => a.kind === 'available');
    if (prevHasAvail && !nextHasAvail && prevMp) {
      nextData.paymentBalances.mercadopago = {
        ...nextMp,
        lines: prevMp.lines?.length ? prevMp.lines : nextMp.lines,
        amounts: prevMp.amounts?.length ? prevMp.amounts : nextMp.amounts,
        asOf: nextMp.asOf || prevMp.asOf
      };
    }
    return nextData;
  }

  function saveBalancesSnapshot(data) {
    if (!data?.paymentBalances) return;
    try {
      const merged = mergeBalancesSnapshot(lastBalancesSnapshot, data);
      const snap = {
        savedAt: Date.now(),
        checkedAt: merged.checkedAt,
        paymentBalances: merged.paymentBalances,
        paymentBalancesSummary: merged.paymentBalancesSummary,
        integrations: merged.integrations
      };
      localStorage.setItem(BALANCES_SNAPSHOT_KEY, JSON.stringify(snap));
      lastBalancesSnapshot = snap;
    } catch (_) { /* quota */ }
  }

  function restoreBalancesSnapshot() {
    try {
      const raw = localStorage.getItem(BALANCES_SNAPSHOT_KEY);
      if (!raw) return false;
      lastBalancesSnapshot = JSON.parse(raw);
      return !!lastBalancesSnapshot?.paymentBalances;
    } catch (_) {
      return false;
    }
  }

  function showClicksCacheHint() {
    const checkedEl = document.getElementById('clicks-checked-at');
    if (!checkedEl) return;
    const when = clicksMetaCache?.checkedAt
      ? formatFeedbackDate(clicksMetaCache.checkedAt)
      : '—';
    checkedEl.textContent = `Última atualização: ${when} · cache local (clique Atualizar para buscar na API)`;
    checkedEl.hidden = false;
  }

  function showClicksEmptyState() {
    const root = document.getElementById('clicks-tree-root');
    if (root) {
      root.innerHTML = '<p class="admin-meta">Nenhum clique em cache. Clique <strong>Atualizar</strong> para carregar o histórico.</p>';
    }
    const stats = document.getElementById('clicks-stats');
    if (stats) stats.innerHTML = '';
    const charts = document.getElementById('clicks-when-charts');
    if (charts) charts.innerHTML = '';
    const noise = document.getElementById('clicks-noise-charts');
    if (noise) noise.innerHTML = '';
    const checkedEl = document.getElementById('clicks-checked-at');
    if (checkedEl) checkedEl.hidden = true;
  }

  function filterClicksLocally(clicks, q, destino) {
    let out = clicks || [];
    if (destino === 'pageview') out = out.filter((c) => c.tipo === 'pageview');
    else if (destino) out = out.filter((c) => c.destino === destino);
    if (q) {
      const ql = q.toLowerCase();
      out = out.filter((c) => {
        const hay = [c.destino, c.rotulo, c.pagina, c.visitante_id, c.secao, c.elemento, c.tipo]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hay.includes(ql);
      });
    }
    return out;
  }

  function reapplyClicksLocalFilters(openPaths) {
    if (!clicksCache.length || !clicksMetaCache) {
      showClicksEmptyState();
      return;
    }
    wireClicksWhenFilters();
    const q = document.getElementById('clicks-search')?.value?.trim() || '';
    const destino = document.getElementById('clicks-filter-destino')?.value || '';
    const withNav = !!document.getElementById('clicks-filter-nav')?.checked;
    const navEl = document.getElementById('clicks-filter-nav');
    if (navEl) {
      navEl.disabled = !destino;
      navEl.closest('label')?.classList.toggle('is-disabled', !destino);
    }
    renderClicksStats(clicksMetaCache);
    renderClicksWhenCharts(clicksWhenCache);
    renderClicksNoiseStats(clicksWhenCache);
    const display = filterClicksLocally(clicksCache, q, destino);
    renderClicksTree(
      display,
      clicksMetaCache.checkedAt,
      clicksMetaCache.total,
      openPaths || captureClicksTreeOpenPaths()
    );
    showClicksCacheHint();
    if (destino && withNav) {
      setClicksLoadStatus('Navegação completa por visita exige Atualizar (busca na API).', 'warning');
      window.setTimeout(() => setClicksLoadStatus(''), 4000);
    }
  }

  function showPaymentBalancesFromCache() {
    const grid = document.getElementById('payment-balances-grid');
    if (!grid) return;
    if (lastBalancesSnapshot?.paymentBalances) {
      renderPaymentBalancesGrid(
        lastBalancesSnapshot.paymentBalances,
        lastBalancesSnapshot.checkedAt,
        lastBalancesSnapshot.paymentBalancesSummary
      );
      const checkedEl = document.getElementById('payment-balances-checked-at');
      if (checkedEl && lastBalancesSnapshot.checkedAt) {
        const when = new Date(lastBalancesSnapshot.checkedAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        checkedEl.textContent = `Cache local: ${when} · clique Atualizar saldos (gera consulta nova; MP pode levar 1–3 min)`;
        checkedEl.hidden = false;
      }
      return;
    }
    grid.innerHTML = '<p class="admin-meta">Nenhum saldo em cache. Clique <strong>Atualizar saldos</strong> para consultar Mercado Pago, PayPal e Stripe.</p>';
    const summaryEl = document.getElementById('payment-balances-summary');
    if (summaryEl) {
      summaryEl.hidden = true;
      summaryEl.innerHTML = '';
    }
    const checkedEl = document.getElementById('payment-balances-checked-at');
    if (checkedEl) checkedEl.hidden = true;
  }

  const CLICK_DESTINO_LABELS = {
    pageview: 'Entrada',
    entrada_home: 'Entrada — Home',
    entrada_home_en: 'Entrada — Home EN',
    entrada_loja: 'Entrada — Loja',
    entrada_checkout: 'Entrada — Checkout',
    entrada_onde_comprar: 'Entrada — Onde comprar',
    entrada_minha_conta: 'Entrada — Minha conta',
    mercado_livre: 'Mercado Livre',
    shopee: 'Shopee',
    amazon: 'Amazon',
    tiktok_shop: 'TikTok Shop',
    loja_oficial: 'Loja oficial',
    tiktok: 'TikTok',
    instagram: 'Instagram',
    youtube: 'YouTube',
    facebook: 'Facebook',
    whatsapp: 'WhatsApp',
    faq: 'FAQ',
    menu_comprar: 'Menu comprar',
    secao_problema: 'Menu — Problema',
    secao_paliativos: 'Menu — Paliativos',
    secao_produtos: 'Menu — Produtos',
    secao_quem_somos: 'Menu — Quem somos',
    secao_contato: 'Menu — Contato',
    checkout: 'Checkout',
    ancora: 'Âncora',
    logo: 'Logo',
    interno: 'Interno',
    externo: 'Externo'
  };

  function brLocalYmd(ts) {
    return new Date(ts || Date.now()).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  }

  function brWeekBucket(ts) {
    const ymd = brLocalYmd(ts);
    const [y, m, d] = ymd.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    const dow = date.getUTCDay();
    const mondayOffset = dow === 0 ? -6 : 1 - dow;
    const mon = new Date(date);
    mon.setUTCDate(date.getUTCDate() + mondayOffset);
    const sun = new Date(mon);
    sun.setUTCDate(mon.getUTCDate() + 6);
    const fmtBr = (dt) => {
      const dd = String(dt.getUTCDate()).padStart(2, '0');
      const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
      return `${dd}/${mm}/${dt.getUTCFullYear()}`;
    };
    const key = `${mon.getUTCFullYear()}-${String(mon.getUTCMonth() + 1).padStart(2, '0')}-${String(mon.getUTCDate()).padStart(2, '0')}`;
    return { key, label: `Semana ${fmtBr(mon)} – ${fmtBr(sun)}` };
  }

  function clickDestinoKey(c) {
    if (c.tipo === 'pageview' || String(c.destino || '').startsWith('entrada_')) {
      return c.destino || 'pageview';
    }
    return c.destino || 'outro';
  }

  function clicksPeriodBucket(ts, period) {
    const parts = brDateParts(ts);
    if (period === 'day') {
      return { key: parts.dateKey, label: parts.dayLabel, sortKey: parts.dateKey };
    }
    if (period === 'month') {
      const key = `${parts.year}-${parts.monthNum}`;
      return { key, label: `${parts.monthName} ${parts.year}`, sortKey: key };
    }
    if (period === 'year') {
      return { key: parts.year, label: parts.year, sortKey: parts.year };
    }
    const wk = brWeekBucket(ts);
    return { key: wk.key, label: wk.label, sortKey: wk.key };
  }

  function orderDestinosForExport(destinos, clicks) {
    const totals = {};
    (clicks || []).forEach((c) => {
      const d = clickDestinoKey(c);
      totals[d] = (totals[d] || 0) + 1;
    });
    const isEntrada = (d) => d === 'pageview' || String(d).startsWith('entrada_');
    return [...destinos].sort((a, b) => {
      if (isEntrada(a) && !isEntrada(b)) return -1;
      if (!isEntrada(a) && isEntrada(b)) return 1;
      return (totals[b] || 0) - (totals[a] || 0);
    });
  }

  function aggregateClicksForExport(clicks, period) {
    const destinoSet = new Set();
    const buckets = new Map();

    (clicks || []).forEach((c) => {
      const ts = c.ts || c.client_ts;
      if (!ts) return;
      const dest = clickDestinoKey(c);
      destinoSet.add(dest);
      const bucket = clicksPeriodBucket(ts, period);
      if (!buckets.has(bucket.key)) {
        buckets.set(bucket.key, {
          label: bucket.label,
          sortKey: bucket.sortKey,
          visitors: new Set(),
          total: 0,
          byDestino: {}
        });
      }
      const row = buckets.get(bucket.key);
      row.visitors.add(visitorKey(c));
      row.total++;
      row.byDestino[dest] = (row.byDestino[dest] || 0) + 1;
    });

    const destinos = orderDestinosForExport(destinoSet, clicks);
    const rows = [...buckets.values()].sort((a, b) => b.sortKey.localeCompare(a.sortKey));
    return { rows, destinos };
  }

  function buildClicksExportSheetRows(clicks, period) {
    const { rows, destinos } = aggregateClicksForExport(clicks, period);
    const headers = ['Período', 'Visitantes únicos', 'Total de eventos'];
    destinos.forEach((d) => headers.push(clickDestinoLabel(d)));

    const sheetRows = [headers];
    const totals = { visitors: new Set(), total: 0, byDestino: {} };

    rows.forEach((row) => {
      sheetRows.push([
        row.label,
        row.visitors.size,
        row.total,
        ...destinos.map((d) => row.byDestino[d] || 0)
      ]);
      row.visitors.forEach((v) => totals.visitors.add(v));
      totals.total += row.total;
      destinos.forEach((d) => {
        totals.byDestino[d] = (totals.byDestino[d] || 0) + (row.byDestino[d] || 0);
      });
    });

    if (rows.length > 1) {
      sheetRows.push([
        'TOTAL GERAL',
        totals.visitors.size,
        totals.total,
        ...destinos.map((d) => totals.byDestino[d] || 0)
      ]);
    }

    return sheetRows;
  }

  function xmlEscape(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function buildClicksNoiseBreakdownRows(sessions, field, labelKey) {
    const rows = [['Faixa', 'Únicas', 'Repetidas', 'Visitas', 'Eventos']];
    const buckets = new Map();
    (sessions || []).forEach((s) => {
      const key = s[field] || 'outro';
      const label = s[labelKey] || key;
      if (!buckets.has(key)) buckets.set(key, { label, unique: 0, repeat: 0, events: 0 });
      const row = buckets.get(key);
      if (s.kind === 'repeat') row.repeat += 1;
      else row.unique += 1;
      row.events += s.count;
    });
    [...buckets.values()]
      .sort((a, b) => (b.unique + b.repeat) - (a.unique + a.repeat))
      .forEach((row) => {
        rows.push([row.label, row.unique, row.repeat, row.unique + row.repeat, row.events]);
      });
    return rows;
  }

  function buildClicksNoiseHourRows(sessions) {
    const rows = [['Hora', 'Únicas', 'Repetidas', 'Visitas', 'Eventos']];
    const buckets = new Map();
    (sessions || []).forEach((s) => {
      if (!s.ts) return;
      const hour = brSaleClockParts(s.ts).hour;
      const key = String(hour);
      if (!buckets.has(key)) {
        buckets.set(key, {
          label: `${String(hour).padStart(2, '0')}h`,
          sortKey: hour,
          unique: 0,
          repeat: 0,
          events: 0
        });
      }
      const row = buckets.get(key);
      if (s.kind === 'repeat') row.repeat += 1;
      else row.unique += 1;
      row.events += s.count;
    });
    Array.from({ length: 24 }, (_, h) => {
      const key = String(h);
      return buckets.get(key) || {
        label: `${String(h).padStart(2, '0')}h`,
        sortKey: h,
        unique: 0,
        repeat: 0,
        events: 0
      };
    }).forEach((row) => {
      rows.push([row.label, row.unique, row.repeat, row.unique + row.repeat, row.events]);
    });
    return rows;
  }

  function buildClicksNoiseSiteRows(sessions) {
    const rows = [['Site', 'Únicas', 'Repetidas', 'Visitas', 'Eventos']];
    const order = ['com.br', 'com'];
    const buckets = new Map();
    (sessions || []).forEach((s) => {
      const key = s.site === 'com' ? 'com' : 'com.br';
      if (!buckets.has(key)) buckets.set(key, { unique: 0, repeat: 0, events: 0 });
      const row = buckets.get(key);
      if (s.kind === 'repeat') row.repeat += 1;
      else row.unique += 1;
      row.events += s.count;
    });
    order.forEach((key) => {
      const row = buckets.get(key) || { unique: 0, repeat: 0, events: 0 };
      rows.push([key === 'com' ? '.com' : '.com.br', row.unique, row.repeat, row.unique + row.repeat, row.events]);
    });
    return rows;
  }

  function buildClicksExportWorkbook(clicks) {
    const withoutTests = (clicks || []).filter((c) => !(c.teste === true || c.is_test === true));
    const official = filterClicksExcludingUniqueOrRepeat(withoutTests);
    const noise = listNoiseSessions(withoutTests);
    const periods = [
      { key: 'day', name: 'Por dia' },
      { key: 'week', name: 'Por semana' },
      { key: 'month', name: 'Por mês' },
      { key: 'year', name: 'Por ano' }
    ];
    const sheets = [
      ...periods.map(({ key, name }) => ({
        name,
        rows: buildClicksExportSheetRows(official, key)
      })),
      { name: 'Unicos hora', rows: buildClicksNoiseHourRows(noise) },
      { name: 'Unicos estado', rows: buildClicksNoiseBreakdownRows(noise, 'estadoKey', 'estadoLabel') },
      { name: 'Unicos cidade', rows: buildClicksNoiseBreakdownRows(noise, 'cidadeKey', 'cidadeLabel') },
      { name: 'Unicos local', rows: buildClicksNoiseBreakdownRows(noise, 'destKey', 'destLabel') },
      { name: 'Unicos site', rows: buildClicksNoiseSiteRows(noise) }
    ];
    const worksheets = sheets.map(({ name, rows }) => {
      const rowsXml = rows.map((row) => {
        const cells = row.map((cell) => {
          const type = typeof cell === 'number' && Number.isFinite(cell) ? 'Number' : 'String';
          const value = type === 'Number' ? cell : xmlEscape(cell);
          return `<Cell><Data ss:Type="${type}">${value}</Data></Cell>`;
        }).join('');
        return `<Row>${cells}</Row>`;
      }).join('');
      return `<Worksheet ss:Name="${xmlEscape(name.slice(0, 31))}"><Table>${rowsXml}</Table></Worksheet>`;
    }).join('');
    return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
${worksheets}
</Workbook>`;
  }

  function downloadTextFile(content, filename, mime) {
    const blob = new Blob([content], { type: mime || 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function fetchAllClicksForExport() {
    const token = sessionStorage.getItem(SESSION_KEY);
    const base = apiBase();
    if (!token || !base) throw new Error('Faça login no admin.');
    const res = await fetch(`${base.replace(/\/$/, '')}/admin/clicks?limit=4000`, {
      headers: { Authorization: 'Bearer ' + token },
      cache: 'no-store'
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Falha ao carregar cliques');
    return data.whenClicks?.length ? data.whenClicks : (data.clicks || []);
  }

  async function exportClicksExcel() {
    const btn = document.getElementById('btn-clicks-export');
    if (btn) btn.disabled = true;
    showStatus('Preparando exportação…', '', 'cliques');
    try {
      const clicks = await fetchAllClicksForExport();
      if (!clicks.length) {
        showStatus('Nenhum evento no log para exportar.', 'error', 'cliques');
        return;
      }
      const workbook = buildClicksExportWorkbook(clicks);
      const stamp = new Date().toISOString().slice(0, 10);
      downloadTextFile(workbook, `cliques-${stamp}.xls`, 'application/vnd.ms-excel;charset=utf-8');
      const noiseN = listNoiseSessions(clicks).length;
      showStatus(`Exportado: oficiais + ${noiseN} únicos/repetidos (abas Unicos). Abra no Excel.`, 'success', 'cliques');
    } catch (err) {
      showStatus(err.message || 'Erro ao exportar.', 'error', 'cliques');
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  function formatClickDate(ts) {
    if (!ts) return '—';
    try {
      return new Date(ts).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    } catch {
      return '—';
    }
  }

  function clickDestinoLabel(destino, fallback) {
    return CLICK_DESTINO_LABELS[destino] || fallback || destino || '—';
  }

  function renderClicksStats(data) {
    const el = document.getElementById('clicks-stats');
    if (!el) return;
    const topEntries = Object.entries(data?.byDestino || {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
    const ultimo = data?.lastClickAt ? formatClickDate(data.lastClickAt) : '—';
    const maisAntigo = data?.oldestClickAt ? formatClickDate(data.oldestClickAt) : '—';
    const topList = topEntries.length
      ? `<ul class="clicks-stats-top">${topEntries.map(([k, n]) =>
        `<li><span>${escapeHtml(clickDestinoLabel(k))}</span><strong>${n}</strong></li>`
      ).join('')}</ul>`
      : '<p class="clicks-stats-empty">—</p>';

    const dw = data?.dailyD1 || {};
    const wUsed = Number(dw.rowsWritten ?? dw.writesToday) || 0;
    const wMax = Number(dw.writeLimit ?? dw.limit) > 0 ? Number(dw.writeLimit ?? dw.limit) : 100000;
    const wPct = Number.isFinite(Number(dw.percent))
      ? Number(dw.percent)
      : (wMax > 0 ? Math.min(100, Math.round((wUsed / wMax) * 100)) : 0);
    const rUsed = Number(dw.rowsRead ?? dw.readsToday);
    const rMax = Number(dw.readLimit) > 0 ? Number(dw.readLimit) : 5000000;
    const rPct = Number.isFinite(Number(dw.readPercent))
      ? Number(dw.readPercent)
      : (Number.isFinite(rUsed) ? Math.min(100, Math.round((rUsed / rMax) * 100)) : null);
    const wExhausted = !!dw.exhausted;
    const wOver = !!dw.overFreeLimit || wPct >= 100;
    const wCritical = !!dw.critical || wPct >= 85;
    const wNear = !!dw.near || wPct >= 70;
    const fromCf = dw.source === 'cloudflare';
    const resetBr = dw.resetsAtBr || dw.resetsHintBr || '21:00 Brasília (00:00 UTC)';

    const cap = data?.capacity || {};
    const used = Number(cap.used ?? data?.total ?? 0) || 0;
    const max = Number(cap.max) > 0 ? Number(cap.max) : 50000;
    const closedMonths = Number(cap.closedMonths) > 0 ? Number(cap.closedMonths) : 5;
    const totalMonths = Number(cap.totalMonths) > 0 ? Number(cap.totalMonths) : closedMonths + 1;
    const retentionLabel = `${totalMonths} meses`;

    let outerHtml;
    if (wExhausted || wOver) {
      outerHtml = `<div class="clicks-kv-flag clicks-kv--full" role="status">
        <i class="fas fa-ban" aria-hidden="true"></i>
        <span>D1 rows escritas hoje: ${wUsed.toLocaleString('pt-BR')} / ${wMax.toLocaleString('pt-BR')} (${wPct}%) — cota free. Log de cliques pode falhar. Renova às ${escapeHtml(String(resetBr))}.</span>
      </div>`;
    } else if (wCritical) {
      outerHtml = `<div class="clicks-kv-flag clicks-kv--full" role="status">
        <i class="fas fa-exclamation-triangle" aria-hidden="true"></i>
        <span>D1 rows escritas (Cloudflare): ${wUsed.toLocaleString('pt-BR')} / ${wMax.toLocaleString('pt-BR')} (${wPct}%) — crítico. Renova às ${escapeHtml(String(resetBr))}.</span>
      </div>`;
    } else if (wNear) {
      outerHtml = `<div class="clicks-kv-flag clicks-kv--warn" role="status">
        <i class="fas fa-exclamation-circle" aria-hidden="true"></i>
        <span>D1 rows escritas (Cloudflare): ${wUsed.toLocaleString('pt-BR')} / ${wMax.toLocaleString('pt-BR')} (${wPct}%). Renova às ${escapeHtml(String(resetBr))}.</span>
      </div>`;
    } else if (fromCf) {
      outerHtml = `<div class="clicks-kv-flag clicks-kv--ok" role="status">
        <i class="fas fa-check-circle" aria-hidden="true"></i>
        <span>D1 rows escritas hoje: ${wUsed.toLocaleString('pt-BR')} / ${wMax.toLocaleString('pt-BR')} (${wPct}%). Renova às ${escapeHtml(String(resetBr))}.</span>
      </div>`;
    } else {
      outerHtml = `<div class="clicks-kv-flag clicks-kv--warn" role="status">
        <i class="fas fa-exclamation-circle" aria-hidden="true"></i>
        <span>Cota D1 indisponível — configure CF_API_TOKEN. Renova às ${escapeHtml(String(resetBr))}.</span>
      </div>`;
    }

    const readsRow = Number.isFinite(rUsed)
      ? `<div class="clicks-stats-row"><dt>D1 rows lidas (UTC)</dt><dd>${rUsed.toLocaleString('pt-BR')} / ${rMax.toLocaleString('pt-BR')} (${rPct}%)</dd></div>`
      : '';
    const refreshed = dw.refreshedAt
      ? (() => {
        try {
          return new Date(dw.refreshedAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        } catch {
          return String(dw.refreshedAt);
        }
      })()
      : '—';
    const note = fromCf
      ? `Fonte: <strong>Cloudflare D1 Analytics</strong> (dashboard D1 → Metrics). Free: 100 mil rows escritas/dia · 5 mi lidas/dia. Cache ~10 min.`
      : `Cliques gravam em <strong>D1</strong> (não no KV). Sem token Analytics o % não aparece.${dw.cfError ? ` Erro: ${escapeHtml(String(dw.cfError))}` : ''}`;

    el.innerHTML = `${outerHtml}
      <details class="clicks-stats-details">
      <summary class="clicks-stats-summary"><i class="fas fa-chevron-right clicks-stats-chevron" aria-hidden="true"></i> Resumo</summary>
      <dl class="clicks-stats-dl">
        <div class="clicks-stats-row"><dt>Hoje (eventos clique)</dt><dd>${data?.todayCount ?? 0}</dd></div>
        <div class="clicks-stats-row"><dt>D1 rows escritas (UTC)</dt><dd>${wUsed.toLocaleString('pt-BR')} / ${wMax.toLocaleString('pt-BR')} (${wPct}%)</dd></div>
        ${readsRow}
        <div class="clicks-stats-row"><dt>Fonte da cota</dt><dd>D1 Analytics</dd></div>
        <div class="clicks-stats-row"><dt>Atualizado</dt><dd>${escapeHtml(refreshed)}</dd></div>
        <div class="clicks-stats-row"><dt>Total no log cliques</dt><dd>${used.toLocaleString('pt-BR')} / ${max.toLocaleString('pt-BR')} · retenção ${escapeHtml(retentionLabel)}</dd></div>
        <div class="clicks-stats-row"><dt>Último gravado</dt><dd>${escapeHtml(ultimo)}</dd></div>
        <div class="clicks-stats-row"><dt>Mais antigo no log</dt><dd>${escapeHtml(maisAntigo)}</dd></div>
        <div class="clicks-stats-row"><dt>Renova cota</dt><dd>${escapeHtml(String(resetBr))}</dd></div>
        <div class="clicks-stats-row clicks-stats-row-top"><dt>Mais frequentes</dt><dd>${topList}</dd></div>
      </dl>
      <p class="clicks-kv-note">${note}</p>
    </details>`;
  }

  function formatClickTime(ts) {
    if (!ts) return '—';
    try {
      return new Date(ts).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return '—';
    }
  }

  function brDateParts(ts) {
    const d = new Date(ts || Date.now());
    const tz = { timeZone: 'America/Sao_Paulo' };
    const year = d.toLocaleString('pt-BR', { ...tz, year: 'numeric' });
    const monthNum = d.toLocaleString('pt-BR', { ...tz, month: '2-digit' });
    let monthName = d.toLocaleString('pt-BR', { ...tz, month: 'long' });
    monthName = monthName.charAt(0).toUpperCase() + monthName.slice(1);
    const day = d.toLocaleString('pt-BR', { ...tz, day: '2-digit' });
    const dateKey = `${year}-${monthNum}-${day}`;
    const dayLabel = d.toLocaleString('pt-BR', { ...tz, weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    const dayLabelCap = dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1);
    return { year, monthNum, monthName, day, dateKey, dayLabel: dayLabelCap };
  }

  function maskIp(ip) {
    if (!ip) return '';
    const p = String(ip).split('.');
    if (p.length === 4) return `${p[0]}.${p[1]}.x.x`;
    return String(ip).slice(0, 14) + '…';
  }

  const LOGICAL_VISIT_GAP_MS = 30 * 60 * 1000;

  function visitorKey(c) {
    if (c.visitante_id) return `vid:${c.visitante_id}`;
    if (c.cliente_email) return `email:${String(c.cliente_email).toLowerCase()}`;
    if (c.ip) return `ip:${c.ip}`;
    if (c.ip_prefix) return `ipp:${c.ip_prefix}`;
    return `unk:${c.sessao_visita || c.id || 'x'}`;
  }

  function placeDeviceKey(c) {
    const city = String(c?.cidade || '').trim().toLowerCase();
    const st = String(c?.estado || '').trim().toLowerCase();
    const dev = dispositivoLegivel(c?.dispositivo, c?.user_agent)?.slug || '';
    if (!city || !st || !dev) return '';
    return `${city}|${st}|${dev}`;
  }

  function eventsTimeRange(events) {
    const ts = (events || []).map((e) => Number(e.ts || e.client_ts || 0)).filter((n) => n > 0);
    if (!ts.length) return { min: 0, max: 0 };
    return { min: Math.min.apply(null, ts), max: Math.max.apply(null, ts) };
  }

  /** Junta visitas com visitante_id diferente se forem o mesmo lugar+aparelho e ≤ 30 min. */
  function mergeAdjacentVisitClusters(clusters, gapMs) {
    const gap = Number(gapMs) || LOGICAL_VISIT_GAP_MS;
    const sorted = [...clusters].sort((a, b) => a.min - b.min);
    const used = new Set();
    const out = [];
    for (let i = 0; i < sorted.length; i++) {
      if (used.has(i)) continue;
      const acc = {
        events: [...(sorted[i].events || [])],
        min: sorted[i].min,
        max: sorted[i].max,
        place: sorted[i].place,
        key: sorted[i].key
      };
      for (let j = i + 1; j < sorted.length; j++) {
        if (used.has(j)) continue;
        const b = sorted[j];
        if (!acc.place || acc.place !== b.place) continue;
        if (b.min - acc.max > gap) continue;
        acc.events = acc.events.concat(b.events || []);
        acc.max = Math.max(acc.max, b.max);
        acc.min = Math.min(acc.min, b.min);
        used.add(j);
      }
      out.push(acc);
    }
    return out;
  }

  function formatClickGeo(c) {
    const parts = [];
    if (c.cidade) parts.push(c.cidade);
    if (c.estado) parts.push(c.estado);
    const pais = c.pais_nome || c.pais || '';
    if (pais) parts.push(pais);
    return parts.join(', ');
  }

  function inferDispositivoFromUa(ua) {
    return /Mobile|Android|iPhone|iPad/i.test(String(ua || '')) ? 'Celular' : 'Computador';
  }

  function dispositivoLegivel(raw, userAgent) {
    const s = String(raw || '').trim();
    if (s && s !== '—') {
      if (/^celular\b|^mobile\b/i.test(s)) {
        const browser = s.replace(/^celular\b|^mobile\b/i, '').replace(/^[·/\s]+/, '').trim();
        return { slug: 'mobile', label: 'Celular', browser };
      }
      if (/^computador\b|^desktop\b/i.test(s)) {
        const browser = s.replace(/^computador\b|^desktop\b/i, '').replace(/^[·/\s]+/, '').trim();
        return { slug: 'desktop', label: 'Computador', browser };
      }
      return { slug: 'outro', label: s.split(/[·/]/)[0].trim() || s, browser: '' };
    }
    const ua = String(userAgent || '').trim();
    if (!ua) return null;
    const mobile = /Mobile|Android|iPhone|iPad/i.test(ua);
    return { slug: mobile ? 'mobile' : 'desktop', label: mobile ? 'Celular' : 'Computador', browser: '' };
  }

  function dispositivoBadgeHtml(c) {
    const info = dispositivoLegivel(c.dispositivo, c.user_agent);
    if (!info) return '';
    const tip = info.browser ? `${info.label} · ${info.browser}` : info.label;
    return `<span class="clicks-device-badge clicks-device--${escapeHtml(info.slug)}" title="${escapeHtml(tip)}">${escapeHtml(info.label)}</span>`;
  }

  function visitorLabel(meta) {
    if (meta.cliente_email) {
      return meta.cliente_nome
        ? `${meta.cliente_nome} · ${meta.cliente_email}`
        : meta.cliente_email;
    }
    if (meta.visitante_id) {
      const ip = meta.ip_prefix || maskIp(meta.ip);
      const geo = formatClickGeo(meta);
      const suffix = [geo, ip].filter(Boolean).join(' · ');
      return suffix
        ? `Visitante ${meta.visitante_id.slice(0, 12)}… · ${suffix}`
        : `Visitante ${meta.visitante_id.slice(0, 16)}…`;
    }
    if (meta.ip) return `IP ${maskIp(meta.ip)}`;
    return 'Visitante sem identificação';
  }

  /** Home landing event (BR/EN/IT), including legacy destino "home". */
  function isHomeEntradaEvent(c) {
    const dest = String(c?.destino || '').toLowerCase();
    if (dest === 'entrada_home' || dest === 'entrada_home_en' || dest === 'entrada_home_it' || dest === 'home') {
      return true;
    }
    if (dest.startsWith('entrada_home')) return true;
    const label = String(c?.rotulo || c?.destino_label || '');
    if (/entrada\s*[—\-–]\s*home\b/i.test(label)) return true;
    const pagina = String(c?.pagina || '');
    if (/^home(\s+(br|en|it))?$/i.test(pagina.trim())) {
      return c?.tipo === 'pageview' || dest.startsWith('entrada_') || dest === 'home';
    }
    return false;
  }

  /** Normalize a step so 3× home (or 3× loja) count as the same destination. */
  function clickSessionStepKey(c) {
    if (isHomeEntradaEvent(c)) return 'home';
    const dest = String(c?.destino || '').toLowerCase().trim();
    if (dest) return dest;
    const pagina = String(c?.pagina || '').toLowerCase().split('?')[0].replace(/\/+$/, '') || '';
    if (pagina) return `p:${pagina}`;
    return String(c?.tipo || 'outro').toLowerCase();
  }

  /**
   * Unique / bot noise: 1 event OR several repeats of the same dest
   * (só home, 3 homes seguidas, só loja, etc.). Navigation = 2+ destinos distintos.
   */
  function isUniqueOrRepeatOnlySession(events) {
    if (!Array.isArray(events) || !events.length) return false;
    const keys = new Set(events.map(clickSessionStepKey));
    return keys.size < 2;
  }

  /** @deprecated alias — same as unique/repeat-only. */
  function isHomeOnlyBounceSession(events) {
    return isUniqueOrRepeatOnlySession(events);
  }

  /**
   * Agrupa uma lista ordenada de eventos em visitas lógicas usando uma janela temporal.
   * Retorna um array de arrays de eventos (cada sub-array é uma visita lógica).
   * Não altera os eventos originais (mantém `sessao_visita` intacta).
   */
  function buildLogicalVisits(events, windowMs) {
    const win = Number(windowMs) || 30 * 60 * 1000; // default 30 minutos
    if (!Array.isArray(events) || !events.length) return [];
    const sorted = [...events].sort((a, b) => (Number(a.ts || a.client_ts) || 0) - (Number(b.ts || b.client_ts) || 0));
    const visits = [];
    let cur = null;
    for (let i = 0; i < sorted.length; i++) {
      const e = sorted[i];
      const ts = Number(e.ts || e.client_ts || 0) || 0;
      if (!cur) {
        cur = [e];
        continue;
      }
      const last = cur[cur.length - 1];
      const lastTs = Number(last.ts || last.client_ts || 0) || 0;
      if (ts - lastTs <= win) {
        cur.push(e);
      } else {
        visits.push(cur);
        cur = [e];
      }
    }
    if (cur) visits.push(cur);
    return visits;
  }

  /** Infer .com vs .com.br from stored site_host or idioma/página/destino. */
  function clickSiteHost(c) {
    const explicit = String(c?.site_host || '').toLowerCase().trim();
    if (explicit === 'com' || explicit === 'com.br') return explicit;
    const host = String(c?.host || c?.hostname || '').toLowerCase();
    if (/sensortattoofix\.com\.br/.test(host)) return 'com.br';
    if (/sensortattoofix\.com(?!\.br)/.test(host)) return 'com';
    const idioma = String(c?.idioma || '').toLowerCase();
    if (idioma.startsWith('en') || idioma.startsWith('it')) return 'com';
    if (idioma.startsWith('pt')) return 'com.br';
    const pagina = String(c?.pagina || '');
    if (/\b(EN|IT)\b/.test(pagina)) return 'com';
    if (/\bBR\b/.test(pagina)) return 'com.br';
    const dest = String(c?.destino || '');
    if (/_(en|it)(_|$)/.test(dest) || /_(en|it)$/.test(dest)) return 'com';
    return 'com.br';
  }

  function clickSessionKey(c) {
    const vid = visitorKey(c);
    const sess = String(c?.sessao_visita || '').trim();
    if (sess) return `${vid}|${sess}`;
    return `${vid}|evt:${c?.id || c?.client_event_id || c?.ts || 'x'}`;
  }

  function groupClicksByLogicalVisit(clicks) {
    const byVisitor = new Map();
    const orphans = [];
    (clicks || []).forEach((c) => {
      const vid = String(c.visitante_id || '').trim();
      if (!vid) {
        orphans.push(c);
        return;
      }
      if (!byVisitor.has(vid)) byVisitor.set(vid, []);
      byVisitor.get(vid).push(c);
    });
    const clusters = [];
    byVisitor.forEach((events, vid) => {
      buildLogicalVisits(events, LOGICAL_VISIT_GAP_MS).forEach((evs) => {
        const range = eventsTimeRange(evs);
        const place = evs.map(placeDeviceKey).find(Boolean) || '';
        clusters.push({ events: evs, min: range.min, max: range.max, place, key: vid });
      });
    });
    orphans.forEach((c) => {
      const range = eventsTimeRange([c]);
      clusters.push({
        events: [c],
        min: range.min,
        max: range.max,
        place: placeDeviceKey(c),
        key: clickSessionKey(c)
      });
    });
    const map = new Map();
    mergeAdjacentVisitClusters(clusters).forEach((cl, i) => {
      const ts = cl.min || Number(cl.events[0]?.ts || cl.events[0]?.client_ts || 0);
      map.set(`logical:${cl.key || 'x'}:${ts}:${i}`, cl.events);
    });
    return map;
  }

  function isCrawlerClickRow(c) {
    const ua = `${c?.user_agent || ''} ${c?.dispositivo || ''}`;
    if (/googlebot|bingbot|yandexbot|baiduspider|duckduckbot|facebookexternalhit|bytespider|semrush|ahrefs|petalbot|gptbot|claudebot|applebot|slurp|dotbot|mj12bot|ia_archiver|pingdom|uptimerobot/i.test(ua)) {
      return true;
    }
    const ip = String(c?.ip || '');
    if (/^66\.249\./.test(ip) || /^66\.102\./.test(ip)) return true;
    if (/^207\.46\./.test(ip) || /^40\.77\./.test(ip)) return true;
    return false;
  }

  function filterClicksExcludingUniqueOrRepeat(clicks) {
    const drop = new Set();
    groupClicksByLogicalVisit(clicks).forEach((evs) => {
      if (!isUniqueOrRepeatOnlySession(evs)) return;
      evs.forEach((c) => drop.add(c));
    });
    return (clicks || []).filter((c) => !drop.has(c) && !isCrawlerClickRow(c));
  }

  function filterClicksExcludingHomeOnly(clicks) {
    return filterClicksExcludingUniqueOrRepeat(clicks);
  }

  function groupClicksBySession(clicks) {
    return groupClicksByLogicalVisit(clicks);
  }

  /** Unique = 1 event; repeat = 2+ of the same dest. Official nav stays out. */
  function pickClickGeo(events) {
    const list = Array.isArray(events) ? events : [events];
    for (const c of list) {
      if (!c) continue;
      const cidade = String(c.cidade || '').trim();
      const estado = String(c.estado || '').trim();
      const pais = String(c.pais_nome || c.pais || '').trim();
      if (cidade || estado || pais) return { cidade, estado, pais };
    }
    return { cidade: '', estado: '', pais: '' };
  }

  function listNoiseSessions(clicks) {
    const withoutTests = (clicks || []).filter((c) => !(c.teste === true || c.is_test === true));
    const sessions = [];
    groupClicksBySession(withoutTests).forEach((events, key) => {
      if (!isUniqueOrRepeatOnlySession(events)) return;
      const ordered = [...events].sort((a, b) => (Number(a.ts || a.client_ts) || 0) - (Number(b.ts || b.client_ts) || 0));
      const first = ordered[0] || {};
      const ts = Number(first.ts || first.client_ts || 0);
      const destKey = clickSessionStepKey(first);
      const origem = clickOrigemLegivel(first);
      const geo = pickClickGeo(ordered);
      const estadoRaw = geo.estado;
      const cidadeRaw = geo.cidade;
      const paisRaw = geo.pais;
      const estadoKey = estadoRaw
        ? `${estadoRaw}|${paisRaw || ''}`.toLowerCase()
        : (paisRaw ? `pais:${paisRaw}`.toLowerCase() : 'sem-geo');
      const estadoLabel = estadoRaw
        ? (paisRaw && !/brasil|brazil|br/i.test(paisRaw) ? `${estadoRaw} · ${paisRaw}` : estadoRaw)
        : (paisRaw || 'Sem localização');
      const cidadeKey = cidadeRaw
        ? `${cidadeRaw}|${estadoRaw}|${paisRaw}`.toLowerCase()
        : 'sem-cidade';
      const cidadeLabel = cidadeRaw
        ? [cidadeRaw, estadoRaw || paisRaw].filter(Boolean).join(', ')
        : 'Sem cidade';
      sessions.push({
        key,
        kind: ordered.length <= 1 ? 'unique' : 'repeat',
        events: ordered,
        count: ordered.length,
        ts,
        destKey,
        destLabel: destKey === 'home'
          ? 'Home'
          : (clickDestinoLabel(first.destino || destKey, first.destino_label) || destKey),
        origemKey: origem?.slug || 'direto',
        origemLabel: origem?.label || 'Acesso direto',
        site: clickSiteHost(first),
        visitor: visitorKey(first),
        estadoKey,
        estadoLabel,
        cidadeKey,
        cidadeLabel
      });
    });
    return sessions;
  }

  function summarizeClicksForCharts(clicks) {
    const raw = Array.isArray(clicks) ? clicks : [];
    const withoutTests = raw.filter((c) => !(c.teste === true || c.is_test === true));
    const testsDropped = raw.length - withoutTests.length;
    const cleaned = filterClicksExcludingHomeOnly(withoutTests);
    const botsDropped = withoutTests.length - cleaned.length;
    return { raw, cleaned, testsDropped, botsDropped };
  }

  function filterClicksForWhenCharts(clicks) {
    const siteEl = document.getElementById('clicks-when-site');
    const site = siteEl ? siteEl.value : '';
    const { cleaned } = summarizeClicksForCharts(clicks);
    if (!site) return cleaned;
    return cleaned.filter((c) => clickSiteHost(c) === site);
  }

  function daysInCalendarMonth(year, monthNum) {
    return new Date(Date.UTC(Number(year), Number(monthNum), 0)).getUTCDate();
  }

  function isPartialMonthInRecord(year, monthNum, minTs, maxTs) {
    if (!minTs || !maxTs) return true;
    const start = brDateParts(minTs);
    const end = brDateParts(maxTs);
    const ym = `${year}-${String(monthNum).padStart(2, '0')}`;
    const startYm = `${start.year}-${start.monthNum}`;
    const endYm = `${end.year}-${end.monthNum}`;
    if (ym === startYm && Number(start.day) > 1) return true;
    if (ym === endYm) {
      const last = daysInCalendarMonth(year, monthNum);
      if (Number(end.day) < last) return true;
    }
    return false;
  }

  function clicksRecordMonthKeys(clicks) {
    const stamps = (clicks || [])
      .map((c) => Number(c.ts || c.client_ts || 0))
      .filter((ts) => ts > 0);
    const min = stamps.length ? Math.min(...stamps) : 0;
    const max = stamps.length ? Math.max(...stamps) : Date.now();
    const windowMonths = Array.isArray(clicksWhenWindow?.months) ? clicksWhenWindow.months : [];
    if (windowMonths.length) {
      return windowMonths.map((slot) => {
        const monthNum = String(slot.month).padStart(2, '0');
        const base = `${MONTH_LABELS[monthNum] || monthNum} ${slot.year}`;
        const partial = slot.isCurrent || isPartialMonthInRecord(slot.year, monthNum, min || max, max);
        return {
          key: slot.key,
          label: partial ? `${base} (parcial)` : base,
          sortKey: slot.year * 100 + slot.month,
          partial,
          isCurrent: !!slot.isCurrent
        };
      });
    }
    if (!stamps.length) return [];
    const start = brDateParts(min);
    const end = brDateParts(max);
    let y = Number(start.year);
    let m = Number(start.monthNum);
    const endY = Number(end.year);
    const endM = Number(end.monthNum);
    const keys = [];
    while (y < endY || (y === endY && m <= endM)) {
      const monthNum = String(m).padStart(2, '0');
      const partial = isPartialMonthInRecord(y, monthNum, min, max);
      const base = `${MONTH_LABELS[monthNum] || monthNum} ${y}`;
      keys.push({
        key: `${y}-${monthNum}`,
        label: partial ? `${base} (parcial)` : base,
        sortKey: y * 100 + m,
        partial
      });
      m += 1;
      if (m > 12) {
        m = 1;
        y += 1;
      }
    }
    return keys;
  }

  function aggregateClicksWhen(clicks, mode) {
    const buckets = new Map();
    const ensure = (key, label, sortKey) => {
      if (!buckets.has(key)) {
        buckets.set(key, { key, label, sortKey, count: 0, visitors: 0, _vids: new Set(), net: 0, gross: 0 });
      }
      return buckets.get(key);
    };
    (clicks || []).forEach((c) => {
      const ts = Number(c.ts || c.client_ts || 0);
      if (!ts) return;
      const clock = brSaleClockParts(ts);
      let key;
      let label;
      let sortKey;
      if (mode === 'hour') {
        key = String(clock.hour);
        label = `${String(clock.hour).padStart(2, '0')}h`;
        sortKey = clock.hour;
      } else if (mode === 'weekday') {
        key = String(clock.weekday);
        label = WEEKDAY_LABELS[clock.weekday] || key;
        sortKey = WEEKDAY_ORDER.indexOf(clock.weekday);
      } else if (mode === 'monthday') {
        key = String(clock.monthDay);
        label = `Dia ${clock.monthDay}`;
        sortKey = clock.monthDay;
      } else if (mode === 'site') {
        const host = clickSiteHost(c);
        key = host;
        label = host === 'com' ? '.com' : '.com.br';
        sortKey = host === 'com.br' ? 0 : 1;
      } else {
        // Chronological month in the log (YYYY-MM), not empty Jan–Dec padding.
        const monthNum = clock.monthNum;
        key = `${clock.year}-${monthNum}`;
        label = `${MONTH_LABELS[monthNum] || monthNum} ${clock.year}`;
        sortKey = Number(clock.year) * 100 + Number(monthNum);
      }
      const b = ensure(key, label, sortKey);
      b.count += 1;
      b._vids.add(visitorKey(c));
      b.visitors = b._vids.size;
    });
    return [...buckets.values()].map((b) => {
      const { _vids, ...rest } = b;
      return { ...rest, visitors: _vids.size };
    }).sort((a, b) => a.sortKey - b.sortKey);
  }

  function renderClicksWhenCharts(clicks) {
    const root = document.getElementById('clicks-when-charts');
    if (!root) return;
    const metricEl = document.getElementById('clicks-when-metric');
    const metric = metricEl ? metricEl.value : 'events';
    const summary = summarizeClicksForCharts(clicks);
    const filtered = filterClicksForWhenCharts(clicks);
    const exclNote = `<p class="admin-meta clicks-when-clean">Carregados: <strong>${summary.raw.length.toLocaleString('pt-BR')}</strong> · únicos/bots fora: <strong>${summary.botsDropped.toLocaleString('pt-BR')}</strong>${summary.testsDropped ? ` · testes fora: <strong>${summary.testsDropped}</strong>` : ''} · na estatística: <strong>${filtered.length.toLocaleString('pt-BR')}</strong></p>`;
    if (!filtered.length) {
      root.innerHTML = `${exclNote}<p class="admin-meta">Sem acessos reais neste recorte.</p>`;
      return;
    }
    const empty = (key, label, sortKey) => ({ key, label, sortKey, count: 0, visitors: 0, net: 0, gross: 0 });
    const sideLabel = (r) => (metric === 'visitors'
      ? `${r.count} evento${r.count === 1 ? '' : 's'}`
      : `${r.visitors} visitante${r.visitors === 1 ? '' : 's'}`);
    const chartOpts = { sideLabel };

    const todayKey = brDateParts(Date.now()).dateKey;
    const todayClicks = filtered.filter((c) => {
      const t = Number(c.ts || c.client_ts || 0);
      return t > 0 && brDateParts(t).dateKey === todayKey;
    });
    const byHourTodayMap = new Map(aggregateClicksWhen(todayClicks, 'hour').map((b) => [b.key, b]));
    const hoursToday = Array.from({ length: 24 }, (_, h) => (
      byHourTodayMap.get(String(h)) || empty(String(h), `${String(h).padStart(2, '0')}h`, h)
    ));

    const byHourMap = new Map(aggregateClicksWhen(filtered, 'hour').map((b) => [b.key, b]));
    const hours = Array.from({ length: 24 }, (_, h) => (
      byHourMap.get(String(h)) || empty(String(h), `${String(h).padStart(2, '0')}h`, h)
    ));
    const byWeekdayMap = new Map(aggregateClicksWhen(filtered, 'weekday').map((b) => [b.key, b]));
    const weekdays = WEEKDAY_ORDER.map((d) => (
      byWeekdayMap.get(String(d)) || empty(String(d), WEEKDAY_LABELS[d], WEEKDAY_ORDER.indexOf(d))
    ));

    const byDayMap = new Map(aggregateClicksWhen(filtered, 'monthday').map((b) => [b.key, b]));
    const monthdays = Array.from({ length: 31 }, (_, i) => {
      const day = i + 1;
      return byDayMap.get(String(day)) || empty(String(day), `Dia ${day}`, day);
    });

    const byMonthMap = new Map(aggregateClicksWhen(filtered, 'month').map((b) => [b.key, b]));
    const months = clicksRecordMonthKeys(filtered)
      .map((slot) => {
        const b = byMonthMap.get(slot.key) || empty(slot.key, slot.label, slot.sortKey);
        return { ...b, label: slot.label };
      })
      .sort((a, b) => b.sortKey - a.sortKey);

    // 1ª–5ª semana do mês: média entre os meses que temos.
    const weeks = aggregateClicksWeekOfMonthAverage(filtered);
    const weekOpts = {
      ...chartOpts,
      sideLabel: (r) => `média · ${r.monthsAveraged} mês${r.monthsAveraged === 1 ? '' : 'es'}`
    };

    const bySiteMap = new Map(aggregateClicksWhen(filtered, 'site').map((b) => [b.key, b]));
    const sites = ['com.br', 'com']
      .map((host, i) => bySiteMap.get(host) || empty(host, host === 'com' ? '.com' : '.com.br', i))
      .filter((b) => b.count > 0);

    const cleanLine = `<p class="admin-meta clicks-when-clean">Na janela: <strong>${summary.raw.length.toLocaleString('pt-BR')}</strong> · únicos/bots fora: <strong>${summary.botsDropped.toLocaleString('pt-BR')}</strong>${summary.testsDropped ? ` · testes fora: <strong>${summary.testsDropped}</strong>` : ''} · na estatística: <strong>${filtered.length.toLocaleString('pt-BR')}</strong></p>`;

    root.innerHTML = cleanLine + [
      renderWhenBarChart('Site', sites, metric, { ...chartOpts, cardClass: 'vendas-when-card--site' }),
      renderWhenBarChart('Hoje — por hora (Brasília)', hoursToday, metric, chartOpts),
      renderWhenBarChart('Por mês', months, metric, chartOpts),
      renderWhenBarChart('Por semana', weeks, metric, weekOpts),
      renderWhenBarChart('Dia da semana', weekdays, metric, chartOpts),
      renderWhenBarChart('Dia do mês', monthdays, metric, chartOpts),
      renderWhenBarChart('Hora do dia (todos os dias somados)', hours, metric, chartOpts)
    ].join('');
  }

  let clicksWhenFiltersWired = false;

  function wireClicksWhenFilters() {
    if (clicksWhenFiltersWired) return;
    ['clicks-when-site', 'clicks-when-metric'].forEach((id) => {
      document.getElementById(id)?.addEventListener('change', () => {
        if (clicksWhenCache.length) renderClicksWhenCharts(clicksWhenCache);
      });
    });
    ['clicks-noise-site', 'clicks-noise-metric', 'clicks-noise-kind'].forEach((id) => {
      document.getElementById(id)?.addEventListener('change', () => {
        if (clicksWhenCache.length) renderClicksNoiseStats(clicksWhenCache);
      });
    });
    clicksWhenFiltersWired = true;
  }

  function aggregateNoiseSessions(sessions, field, labelField) {
    const buckets = new Map();
    (sessions || []).forEach((s) => {
      const key = String(s[field] || 'outro');
      const label = s[labelField] || key;
      if (!buckets.has(key)) {
        buckets.set(key, { key, label, sortKey: 0, count: 0, visitors: 0, unique: 0, repeat: 0, events: 0, _vids: new Set() });
      }
      const b = buckets.get(key);
      b.count += 1;
      b.events += s.count;
      if (s.kind === 'repeat') b.repeat += 1;
      else b.unique += 1;
      b._vids.add(s.visitor);
      b.visitors = b._vids.size;
    });
    return [...buckets.values()].map((b) => {
      const { _vids, ...rest } = b;
      return { ...rest, visitors: _vids.size };
    }).sort((a, b) => b.count - a.count);
  }

  function aggregateNoiseByHour(sessions) {
    const buckets = new Map();
    (sessions || []).forEach((s) => {
      if (!s.ts) return;
      const hour = brSaleClockParts(s.ts).hour;
      const key = String(hour);
      if (!buckets.has(key)) {
        buckets.set(key, {
          key,
          label: `${String(hour).padStart(2, '0')}h`,
          sortKey: hour,
          count: 0,
          visitors: 0,
          unique: 0,
          repeat: 0,
          events: 0,
          _vids: new Set()
        });
      }
      const b = buckets.get(key);
      b.count += 1;
      b.events += s.count;
      if (s.kind === 'repeat') b.repeat += 1;
      else b.unique += 1;
      b._vids.add(s.visitor);
      b.visitors = b._vids.size;
    });
    const map = new Map([...buckets.values()].map((b) => {
      const { _vids, ...rest } = b;
      return [rest.key, { ...rest, visitors: _vids.size }];
    }));
    return Array.from({ length: 24 }, (_, h) => {
      const key = String(h);
      return map.get(key) || {
        key,
        label: `${String(h).padStart(2, '0')}h`,
        sortKey: h,
        count: 0,
        visitors: 0,
        unique: 0,
        repeat: 0,
        events: 0
      };
    });
  }

  function renderClicksNoiseStats(clicks) {
    const root = document.getElementById('clicks-noise-charts');
    if (!root) return;
    const siteEl = document.getElementById('clicks-noise-site');
    const metricEl = document.getElementById('clicks-noise-metric');
    const kindEl = document.getElementById('clicks-noise-kind');
    const site = siteEl ? siteEl.value : '';
    const metric = metricEl ? metricEl.value : 'visits';
    const kind = kindEl ? kindEl.value : '';
    let sessions = listNoiseSessions(clicks);
    if (site) sessions = sessions.filter((s) => s.site === site);
    if (kind === 'unique' || kind === 'repeat') sessions = sessions.filter((s) => s.kind === kind);

    const uniqueN = sessions.filter((s) => s.kind === 'unique').length;
    const repeatN = sessions.filter((s) => s.kind === 'repeat').length;
    const eventsN = sessions.reduce((n, s) => n + s.count, 0);
    const visitorsN = new Set(sessions.map((s) => s.visitor)).size;
    const summary = `<p class="admin-meta clicks-when-clean">Fora do oficial (bots / ruído): <strong>${uniqueN.toLocaleString('pt-BR')}</strong> única${uniqueN === 1 ? '' : 's'} · <strong>${repeatN.toLocaleString('pt-BR')}</strong> repetida${repeatN === 1 ? '' : 's'} · <strong>${eventsN.toLocaleString('pt-BR')}</strong> evento${eventsN === 1 ? '' : 's'} · <strong>${visitorsN.toLocaleString('pt-BR')}</strong> visitante${visitorsN === 1 ? '' : 's'}</p>`;

    if (!sessions.length) {
      root.innerHTML = `${summary}<p class="admin-meta">Nenhuma visita única/repetida neste recorte.</p>`;
      return;
    }

    const useEvents = metric === 'events';
    const sideLabel = (r) => {
      const visits = Number(r.visits != null ? r.visits : r.count) || 0;
      const ev = Number(r.events || 0);
      return useEvents
        ? `${visits} visita${visits === 1 ? '' : 's'} · ${r.unique}ú / ${r.repeat}r`
        : `${ev} evento${ev === 1 ? '' : 's'} · ${r.unique}ú / ${r.repeat}r`;
    };
    const chartOpts = { sideLabel, cardClass: 'vendas-when-card--noise' };
    const toChart = (rows) => (useEvents
      ? rows.map((r) => ({ ...r, visits: r.count, count: r.events }))
      : rows.map((r) => ({ ...r, visits: r.count })));

    const hours = toChart(aggregateNoiseByHour(sessions));
    const places = toChart(aggregateNoiseSessions(sessions, 'destKey', 'destLabel'));
    const states = toChart(aggregateNoiseSessions(sessions, 'estadoKey', 'estadoLabel'));
    const cities = toChart(aggregateNoiseSessions(sessions, 'cidadeKey', 'cidadeLabel').slice(0, 40));
    const sites = toChart(aggregateNoiseSessions(sessions, 'site', 'site').map((b) => ({
      ...b,
      label: b.key === 'com' ? '.com' : '.com.br'
    })).sort((a, b) => (a.key === 'com.br' ? 0 : 1) - (b.key === 'com.br' ? 0 : 1)));

    root.innerHTML = summary + [
      renderWhenBarChart('Hora do dia (Brasília)', hours, 'count', chartOpts),
      renderWhenBarChart('Estado (ranking)', states, 'count', chartOpts),
      renderWhenBarChart('Cidade (top 40)', cities, 'count', chartOpts),
      renderWhenBarChart('Local no site', places, 'count', chartOpts),
      renderWhenBarChart('Site', sites, 'count', { ...chartOpts, cardClass: 'vendas-when-card--noise vendas-when-card--site' })
    ].join('');
  }

  function pruneUniqueOrRepeatSessions(tree) {
    Object.keys(tree).forEach((year) => {
      const y = tree[year];
      Object.keys(y.months).forEach((monthNum) => {
        const m = y.months[monthNum];
        Object.keys(m.days).forEach((dateKey) => {
          const d = m.days[dateKey];
          Object.keys(d.visitors).forEach((vKey) => {
            const v = d.visitors[vKey];
            Object.keys(v.sessions).forEach((sKey) => {
              const events = v.sessions[sKey];
              if (!isUniqueOrRepeatOnlySession(events)) return;
              const n = events.length;
              delete v.sessions[sKey];
              v.count -= n;
              d.count -= n;
              m.count -= n;
              y.count -= n;
            });
            if (!Object.keys(v.sessions).length) delete d.visitors[vKey];
          });
          if (!Object.keys(d.visitors).length) delete m.days[dateKey];
        });
        if (!Object.keys(m.days).length) delete y.months[monthNum];
      });
      if (!Object.keys(y.months).length) delete tree[year];
    });
    return tree;
  }

  function buildClicksTree(clicks) {
    const tree = {};
    (clicks || []).forEach((c) => {
      const ts = c.ts || c.client_ts || 0;
      if (!ts) return;
      const { year, monthNum, monthName, dateKey, dayLabel } = brDateParts(ts);
      const vKey = visitorKey(c);
      if (!tree[year]) tree[year] = { count: 0, months: {} };
      const y = tree[year];
      if (!y.months[monthNum]) y.months[monthNum] = { name: monthName, count: 0, days: {} };
      const m = y.months[monthNum];
      if (!m.days[dateKey]) m.days[dateKey] = { label: dayLabel, count: 0, visitors: {} };
      const d = m.days[dateKey];
      if (!d.visitors[vKey]) d.visitors[vKey] = { meta: c, count: 0, sessions: {} };
      const v = d.visitors[vKey];
      if (c.dispositivo && (!v.meta.dispositivo || c.tipo === 'pageview')) {
        v.meta = { ...v.meta, dispositivo: c.dispositivo };
      }
      if (c.user_agent && !v.meta.user_agent) {
        v.meta = { ...v.meta, user_agent: c.user_agent };
      }
      if (c.cliente_email || c.cliente_nome) {
        v.meta = {
          ...v.meta,
          ...c,
          cliente_email: c.cliente_email || v.meta.cliente_email,
          cliente_nome: c.cliente_nome || v.meta.cliente_nome,
          visitante_id: c.visitante_id || v.meta.visitante_id
        };
      }
      // Acumula todos os eventos do visitante numa lista temporária.
      // Vamos criar as "visitas lógicas" depois, usando uma janela temporal.
      if (!v._events) v._events = [];
      v._events.push(c);
      v.count++;
      d.count++;
      m.count++;
      y.count++;
    });

    // Após agregar por visitante, convertemos os eventos acumulados em visitas lógicas
    Object.values(tree).forEach((y) => {
      Object.values(y.months).forEach((m) => {
        Object.values(m.days).forEach((d) => {
          Object.values(d.visitors).forEach((v) => {
            // Se existirem eventos acumulados, gerar visitas lógicas (janela: 30 minutos)
            const tmp = Array.isArray(v._events) ? v._events : [];
            const visits = buildLogicalVisits(tmp, LOGICAL_VISIT_GAP_MS);
            v.sessions = {};
            visits.forEach((events, idx) => {
              // Ordena cada visita e propaga dispositivo inferido
              events.sort((a, b) => {
                const sa = a.sequencia || 0;
                const sb = b.sequencia || 0;
                if (sa && sb && sa !== sb) return sa - sb;
                return (a.ts || 0) - (b.ts || 0);
              });
              const dev = events.find((e) => (e.dispositivo && e.dispositivo !== '—') || e.user_agent)?.dispositivo
                || (events.find((e) => e.user_agent)?.user_agent
                  ? inferDispositivoFromUa(events.find((e) => e.user_agent).user_agent)
                  : '');
              if (dev) {
                events.forEach((e) => {
                  if (!e.dispositivo || e.dispositivo === '—') e.dispositivo = dev;
                });
              }
              const key = `visit:${idx + 1}`;
              v.sessions[key] = events;
            });
            // Limpamos o array temporário para não poluir a árvore final
            delete v._events;
          });
          const clusters = [];
          Object.entries(d.visitors).forEach(([vKey, v]) => {
            Object.values(v.sessions || {}).forEach((events) => {
              const range = eventsTimeRange(events);
              const place = (events || []).map(placeDeviceKey).find(Boolean) || '';
              clusters.push({
                events,
                min: range.min,
                max: range.max,
                place,
                key: vKey,
                meta: v.meta
              });
            });
          });
          const next = {};
          mergeAdjacentVisitClusters(clusters).forEach((cl) => {
            const vKey = cl.key || visitorKey(cl.events[0] || {});
            if (!next[vKey]) {
              next[vKey] = { meta: cl.meta || cl.events[0], count: 0, sessions: {} };
            }
            const v = next[vKey];
            v.count += (cl.events || []).length;
            const n = Object.keys(v.sessions).length + 1;
            v.sessions[`visit:${n}`] = cl.events;
          });
          d.visitors = next;
        });
      });
    });
    return tree;
  }

  function clicksTreeSummary(label, count, extra) {
    const meta = count != null ? `<span class="clicks-tree-meta">${count} evento${count === 1 ? '' : 's'}${extra ? ' · ' + extra : ''}</span>` : '';
    return `<i class="fas fa-chevron-right clicks-tree-chevron" aria-hidden="true"></i><span class="clicks-tree-label">${escapeHtml(label)}</span>${meta}`;
  }

  function humanizarReferrerAdmin(ref) {
    const r = String(ref || '').trim();
    if (!r || r === '(direto)') return 'Acesso direto';
    if (isInstagramRef(r)) return 'Instagram';
    if (isFacebookRef(r)) return 'Facebook';
    if (r.toLowerCase().includes('google.')) return 'Google';
    if (r.toLowerCase().includes('tiktok.')) return 'TikTok';
    try {
      return new URL(r).hostname.replace(/^www\./, '');
    } catch {
      return r;
    }
  }

  function inferirOrigemDeUrl(pagina, referrer) {
    if (typeof stfClassificarOrigemDeUrl === 'function') {
      const r = stfClassificarOrigemDeUrl(pagina, referrer);
      return r && r.origem_trafego_label ? r : null;
    }
    return null;
  }

  function humanizarPaginaLog(raw) {
    const s = String(raw || '').trim();
    if (!s) return '';
    const pathOnly = s.split('?')[0].split('#')[0] || '/';
    const norm = pathOnly.replace(/\\/g, '/').toLowerCase();
    if (norm === '/' || norm.endsWith('/index.html') || norm === '/en' || norm.endsWith('/en/')) {
      return norm.includes('/en') ? 'Home EN' : 'Home';
    }
    const file = norm.split('/').filter(Boolean).pop()?.replace(/\.html$/i, '') || '';
    const map = {
      loja: 'Loja',
      comprar: 'Checkout',
      'onde-comprar': 'Onde comprar',
      'minha-conta': 'Minha conta'
    };
    if (map[file]) return map[file];
    return file.replace(/[-_]/g, ' ') || pathOnly;
  }

  function isInstagramRef(text) {
    const t = String(text || '').toLowerCase();
    return t.includes('instagram') || t === 'ig';
  }

  function isFacebookRef(text) {
    const t = String(text || '').toLowerCase();
    return t.includes('facebook') || t === 'fb' || t.includes('fb.com');
  }

  function canonicalOrigemSlug(slug, label, referrer) {
    const ref = String(referrer || '').toLowerCase();
    const lbl = String(label || '').toLowerCase();
    const s = String(slug || '').toLowerCase();

    if (s && s !== 'referral' && s !== 'outro') return s;

    if (isInstagramRef(ref) || isInstagramRef(lbl)) {
      if (lbl.includes('reels')) return 'instagram_reels';
      if (lbl.includes('stories')) return 'instagram_stories';
      return 'instagram';
    }
    if (isFacebookRef(ref) || isFacebookRef(lbl)) {
      if (lbl.includes('reels')) return 'facebook_reels';
      if (lbl.includes('stories')) return 'facebook_stories';
      return 'facebook';
    }
    if (lbl.includes('meta ads')) return 'meta_ads';
    if (lbl.includes('meta')) return 'meta_organico';
    if (lbl.includes('google ads') || ref.includes('googleads.')) return 'google_ads';
    if (lbl.includes('google')) return 'google_organico';
    if (lbl.includes('tiktok') || ref.includes('tiktok.')) return 'tiktok';
    if (lbl.includes('youtube') || ref.includes('youtube.') || ref.includes('youtu.be')) return 'youtube';
    if (lbl.includes('whatsapp') || ref.includes('whatsapp') || ref.includes('wa.me')) return 'whatsapp';
    if (lbl.includes('microsoft') || lbl.includes('bing')) return 'bing_ads';
    if (lbl === 'acesso direto') return 'direto';
    if (lbl === 'site') return 'site';
    if (s === 'referral') return 'referral';
    return s || 'outro';
  }

  function normalizeOrigem(label, slug, referrer) {
    const canonical = canonicalOrigemSlug(slug, label, referrer);
    return { label: label || 'Acesso direto', slug: canonical };
  }

  function origemBadgeHtml(origem) {
    if (!origem || !origem.label) return '';
    const slug = escapeHtml(origem.slug || 'outro');
    return `<span class="clicks-origem-badge clicks-origem--${slug}">${escapeHtml(origem.label)}</span>`;
  }

  function clickOrigemLegivel(c) {
    const legacyPaid = c.origem_trafego === 'facebook_ads' || c.origem_trafego_label === 'Facebook Ads';
    const reinfer = inferirOrigemDeUrl(c.pagina, c.referrer);
    if (reinfer && (!c.origem_trafego_label || legacyPaid)) {
      return normalizeOrigem(reinfer.origem_trafego_label, reinfer.origem_trafego, c.referrer);
    }
    if (legacyPaid) {
      const ref = String(c.referrer || '').toLowerCase();
      if (ref.includes('instagram.')) return normalizeOrigem('Instagram', 'instagram', c.referrer);
      if (ref.includes('facebook.') || ref.includes('fb.')) return normalizeOrigem('Facebook', 'facebook', c.referrer);
      return normalizeOrigem('Meta (Instagram/Facebook)', 'meta_organico', c.referrer);
    }
    if (c.origem_trafego_label) {
      return normalizeOrigem(c.origem_trafego_label, c.origem_trafego, c.referrer);
    }
    if (reinfer) {
      return normalizeOrigem(reinfer.origem_trafego_label, reinfer.origem_trafego, c.referrer);
    }
    const ref = String(c.referrer || '').trim();
    const refLower = ref.toLowerCase();
    if (ref && ref !== '(direto)' && ref !== '—' && refLower !== 'acesso direto') {
      if (isInstagramRef(ref)) return normalizeOrigem('Instagram', 'instagram', ref);
      if (isFacebookRef(ref)) return normalizeOrigem('Facebook', 'facebook', ref);
      if (refLower.includes('google.')) return normalizeOrigem('Google orgânico', 'google_organico', ref);
      if (refLower.includes('tiktok.')) return normalizeOrigem('TikTok', 'tiktok', ref);
      return normalizeOrigem(humanizarReferrerAdmin(ref), 'referral', ref);
    }
    return normalizeOrigem('Acesso direto', 'direto', c.referrer);
  }

  function renderClickStep(c, idx) {
    const destKey = c.destino || 'outro';
    const destFallback = c.destino_label || clickDestinoLabel(destKey);
    const isEntrada = c.tipo === 'pageview' || String(destKey).startsWith('entrada_');
    const dest = (c.rotulo && !isEntrada) ? c.rotulo : destFallback;
    const origem = clickOrigemLegivel(c);
    let detalhe = '';
    if (isEntrada) {
      detalhe = origem.label;
    } else if (c.rotulo && c.rotulo !== destFallback) {
      detalhe = c.secao_label || humanizarPaginaLog(c.pagina) || c.pagina || '—';
    } else {
      detalhe = c.secao_label || humanizarPaginaLog(c.pagina) || '—';
    }
    const hora = formatClickTime(c.ts);
    // Step index only within this visit path (1, 2, 3…) — never c.sequencia
    // (that field mixes across visitors and broke the live feed).
    const seq = idx + 1;
    const tipParts = [
      isEntrada ? `Origem: ${origem.label}` : null,
      formatClickGeo(c) && `Local: ${formatClickGeo(c)}`,
      c.utm_campaign && `Campanha: ${c.utm_campaign}`,
      c.utm_source && `utm_source: ${c.utm_source}`,
      c.utm_medium && `utm_medium: ${c.utm_medium}`,
      c.pagina && humanizarPaginaLog(c.pagina) !== c.pagina ? `Página: ${humanizarPaginaLog(c.pagina)}` : null,
      c.href && String(c.href).includes('fbclid=') ? 'Clique via app Meta (fbclid)' : null,
      c.secao_label,
      c.dispositivo,
      c.referrer && c.referrer !== origem.label ? `Referrer: ${humanizarReferrerAdmin(c.referrer)}` : null
    ].filter(Boolean);
    const origemClass = isEntrada ? ` clicks-tree-step-origem clicks-origem--${escapeHtml(origem.slug || 'outro')}` : '';
    const geo = formatClickGeo(c);
    return `<li class="clicks-tree-step" title="${escapeHtml(tipParts.join(' · '))}">
      <span class="clicks-tree-step-num">${seq}</span>
      <span class="clicks-tree-step-time">${escapeHtml(hora)}</span>
      <span class="admin-click-dest admin-click-dest--${escapeHtml(c.destino || 'outro')}">${escapeHtml(dest)}</span>
      <span class="clicks-tree-step-label${origemClass}">${escapeHtml(detalhe || '—')}</span>
      ${dispositivoBadgeHtml(c)}
      ${geo ? `<span class="clicks-tree-step-geo">${escapeHtml(geo)}</span>` : ''}
    </li>`;
  }

  function renderClicksTree(clicks, checkedAt, total, openPaths) {
    const root = document.getElementById('clicks-tree-root');
    const checkedEl = document.getElementById('clicks-checked-at');
    if (!root) return;

    if (!clicks?.length) {
      root.innerHTML = '<p class="admin-meta">Nenhum evento encontrado com esses filtros.</p>';
    } else {
      // Only day → visitor → visit path → steps (by time). No flat “ao vivo” list —
      // that reused session sequencia across visitors and looked broken.
      const tree = buildClicksTree(clicks);
      const navOnly = isClicksNavOnlyFilterOn();
      if (navOnly) pruneUniqueOrRepeatSessions(tree);
      const years = Object.keys(tree).sort((a, b) => Number(b) - Number(a));
      if (!years.length) {
        root.innerHTML = navOnly
          ? '<p class="admin-meta">Nenhuma visita com navegação (2 destinos distintos). Desmarque <strong>Somente navegação</strong> para ver únicos/repetidos.</p>'
          : '<p class="admin-meta">Nenhum evento encontrado com esses filtros.</p>';
        if (checkedEl) {
          checkedEl.textContent = `Atualizado em ${formatClickDate(checkedAt ? Date.parse(checkedAt) : Date.now())} · ${clicks?.length || 0} eventos carregados de ${total || 0} no log`;
          checkedEl.hidden = false;
        }
        return;
      }
      let html = '<div class="clicks-tree">';

      years.forEach((year) => {
        const y = tree[year];
        const yearPath = String(year);
        html += `<details class="clicks-tree-node clicks-tree-year" data-tree-path="${escapeHtml(yearPath)}"><summary>${clicksTreeSummary(year, y.count)}</summary><div class="clicks-tree-children">`;

        const months = Object.keys(y.months).sort((a, b) => Number(b) - Number(a));
        months.forEach((monthNum) => {
          const m = y.months[monthNum];
          const monthPath = `${yearPath}|${monthNum}`;
          html += `<details class="clicks-tree-node clicks-tree-month" data-tree-path="${escapeHtml(monthPath)}"><summary>${clicksTreeSummary(m.name, m.count)}</summary><div class="clicks-tree-children">`;

          const days = Object.keys(m.days).sort((a, b) => b.localeCompare(a));
          days.forEach((dateKey) => {
            const d = m.days[dateKey];
            const visitorCount = Object.keys(d.visitors).length;
            const dayPath = `${monthPath}|${dateKey}`;
            const lastTs = Math.max(0, ...Object.values(d.visitors).flatMap((v) =>
              Object.values(v.sessions).flat().map((e) => Number(e.ts) || 0)
            ));
            const lastHint = lastTs ? ('último ' + formatClickTime(lastTs)) : '';
            html += `<details class="clicks-tree-node clicks-tree-day" data-tree-path="${escapeHtml(dayPath)}"><summary>${clicksTreeSummary(d.label, d.count, visitorCount + ' visitante' + (visitorCount === 1 ? '' : 's') + (lastHint ? ' · ' + lastHint : ''))}</summary><div class="clicks-tree-children">`;

            const visitors = Object.entries(d.visitors).sort((a, b) => {
              const ta = Math.max(0, ...Object.values(a[1].sessions).flat().map((e) => Number(e.ts) || 0));
              const tb = Math.max(0, ...Object.values(b[1].sessions).flat().map((e) => Number(e.ts) || 0));
              return tb - ta;
            });

            visitors.forEach(([vKey, v]) => {
              const sessionCount = Object.keys(v.sessions).length;
              const visitorPath = `${dayPath}|${escapeHtml(vKey)}`;
              html += `<details class="clicks-tree-node clicks-tree-visitor" data-tree-path="${visitorPath}"><summary>${clicksTreeSummary(visitorLabel(v.meta), v.count, sessionCount + ' visita' + (sessionCount === 1 ? '' : 's'))}</summary><div class="clicks-tree-children">`;

              const sessions = Object.entries(v.sessions).sort((a, b) => {
                const ta = Math.max(0, ...a[1].map((e) => Number(e.ts) || 0));
                const tb = Math.max(0, ...b[1].map((e) => Number(e.ts) || 0));
                return tb - ta;
              });

              sessions.forEach(([sKey, events], si) => {
                const ordered = [...events].sort((a, b) => (Number(a.ts) || 0) - (Number(b.ts) || 0));
                const start = formatClickTime(ordered[0]?.ts);
                const pathLabel = sessionCount > 1 ? `Visita ${si + 1} · ${start}` : `Caminho · ${start}`;
                const entradaEv = ordered.find((e) => e.tipo === 'pageview' || String(e.destino || '').startsWith('entrada_')) || ordered[0];
                const origem = entradaEv ? clickOrigemLegivel(entradaEv) : null;
                const passosMeta = origem && origem.label ? `${origemBadgeHtml(origem)} · passos` : 'passos';
                const sessionPath = `${visitorPath}|${escapeHtml(sKey)}`;
                html += `<details class="clicks-tree-node clicks-tree-path" data-tree-path="${sessionPath}"><summary>${clicksTreeSummary(pathLabel, ordered.length, passosMeta)}</summary>`;
                html += '<ol class="clicks-tree-steps">';
                ordered.forEach((c, idx) => { html += renderClickStep(c, idx); });
                html += '</ol></details>';
              });

              html += '</div></details>';
            });

            html += '</div></details>';
          });

          html += '</div></details>';
        });

        html += '</div></details>';
      });

      html += '</div>';
      root.innerHTML = html;
      if (openPaths?.length) restoreClicksTreeOpenPaths(openPaths);
      else openLatestClicksTreeDay(root);
    }

    if (checkedEl) {
      checkedEl.textContent = `Atualizado em ${formatClickDate(checkedAt ? Date.parse(checkedAt) : Date.now())} · ${clicks?.length || 0} eventos carregados de ${total || 0} no log`;
      checkedEl.hidden = false;
    }
  }

  /** Abre ano → mês → dia mais recente para ir direto ao log atual. */
  function openLatestClicksTreeDay(root) {
    const year = root?.querySelector('details.clicks-tree-year');
    if (!year) return;
    year.open = true;
    const month = year.querySelector('details.clicks-tree-month');
    if (!month) return;
    month.open = true;
    const day = month.querySelector('details.clicks-tree-day');
    if (day) day.open = true;
  }

  const CLICKS_NAV_ONLY_KEY = 'stf_clicks_nav_only_v2';
  const CLICKS_HIDE_HOME_KEY = 'stf_clicks_hide_home_only';

  function readClicksNavOnlyPref() {
    try {
      const saved = localStorage.getItem(CLICKS_NAV_ONLY_KEY);
      if (saved === '0') return false;
      if (saved === '1') return true;
    } catch { /* ignore */ }
    return true;
  }

  function writeClicksNavOnlyPref(on) {
    try {
      localStorage.setItem(CLICKS_NAV_ONLY_KEY, on ? '1' : '0');
    } catch { /* ignore */ }
  }

  function isClicksNavOnlyFilterOn() {
    const el = document.getElementById('clicks-filter-nav-only');
    if (el) return !!el.checked;
    return readClicksNavOnlyPref();
  }

  function syncClicksNavOnlyCheckbox() {
    const el = document.getElementById('clicks-filter-nav-only');
    if (!el) return;
    el.checked = readClicksNavOnlyPref();
  }

  function applyClicksNavOnlyFilter() {
    const el = document.getElementById('clicks-filter-nav-only');
    if (el) writeClicksNavOnlyPref(!!el.checked);
    if (!clicksCache.length) {
      showClicksEmptyState();
      return;
    }
    reapplyClicksLocalFilters(captureClicksTreeOpenPaths());
    document.getElementById('clicks-fold-log')?.setAttribute('open', '');
  }

  function wireOneAdminFold(el) {
    if (!el || el.dataset.foldWired) return;
    const key = el.getAttribute('data-fold-key');
    if (!key) return;
    el.dataset.foldWired = '1';
    const storageKey = `stf_admin_fold_${key}`;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved === '1') el.open = true;
      else if (saved === '0') el.open = false;
    } catch { /* ignore */ }
    el.addEventListener('toggle', () => {
      try {
        localStorage.setItem(storageKey, el.open ? '1' : '0');
      } catch { /* ignore */ }
    });
  }

  function wireAdminFolds() {
    document.querySelectorAll('details.admin-fold[data-fold-key]').forEach((el) => wireOneAdminFold(el));
  }

  async function clearClicksLog(mode) {
    const token = sessionStorage.getItem(SESSION_KEY);
    const base = apiBase();
    if (!token || !base) {
      showStatus('Faça login no admin.', 'error', 'cliques');
      return;
    }
    const isAll = mode === 'all';
    const msg = isAll
      ? 'Apagar TODO o histórico de cliques e visitas?\n\nNão dá para desfazer.'
      : 'Remover tudo que não for visita real do site (testes, curl, admin, diagnósticos)?\n\nSó ficam cliques de visitantes reais com ID do navegador.';
    if (!confirm(msg)) return;

    showStatus(isAll ? 'Limpando histórico…' : 'Removendo eventos não reais…', '', 'cliques');
    try {
      const res = await fetch(`${base.replace(/\/$/, '')}/admin/clicks/clear`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ mode: isAll ? 'all' : 'tests' })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Falha ao limpar log');
      clicksCache = [];
      await startClicksBackgroundLoad({ preserveOpen: true, force: true });
      const removed = data.removed || 0;
      showStatus(
        isAll
          ? `Histórico apagado (${removed} evento${removed === 1 ? '' : 's'}).`
          : removed
            ? `${removed} evento(s) não real(is) removido(s). Restam ${data.remaining ?? '—'} visitas reais.`
            : 'Nenhum evento artificial encontrado — o log já contém só visitas reais.',
        removed || isAll ? 'success' : '',
        'cliques'
      );
    } catch (err) {
      showStatus(err.message || 'Erro ao limpar.', 'error', 'cliques');
    }
  }

  function captureClicksTreeOpenPaths() {
    const root = document.getElementById('clicks-tree-root');
    if (!root) return [];
    return [...root.querySelectorAll('details[open][data-tree-path]')]
      .map((el) => el.getAttribute('data-tree-path'))
      .filter(Boolean);
  }

  function restoreClicksTreeOpenPaths(paths) {
    if (!paths?.length) return;
    const root = document.getElementById('clicks-tree-root');
    if (!root) return;
    const set = new Set(paths);
    root.querySelectorAll('details[data-tree-path]').forEach((el) => {
      if (set.has(el.getAttribute('data-tree-path'))) el.open = true;
    });
  }

  async function testClickLog() {
    const token = sessionStorage.getItem(SESSION_KEY);
    const base = apiBase();
    if (!token || !base) {
      showStatus('Faça login no admin.', 'error', 'cliques');
      return;
    }
    const btn = document.getElementById('btn-clicks-test');
    if (btn) btn.disabled = true;
    showStatus('Gravando clique de teste…', '', 'cliques');
    try {
      const body = {
        log_key: bootstrap.clickLogKey || '',
        teste: true,
        tipo: 'clique',
        destino: 'admin_teste',
        rotulo: 'Teste do admin',
        secao: 'admin',
        elemento: 'botao',
        pagina: '/admin.html',
        visitante_id: 'admin_panel',
        sessao_visita: 'admin_' + Date.now(),
        sequencia: 1,
        client_ts: Date.now()
      };
      const res = await fetch(base.replace(/\/$/, '') + '/analytics/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: location.origin, Referer: location.href },
        body: JSON.stringify(body)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok && !data.ok) throw new Error(data.error || 'Falha ao gravar (' + res.status + ')');
      showStatus('Clique de teste gravado. Atualizando lista…', 'success', 'cliques');
      await startClicksBackgroundLoad({ preserveOpen: true, force: true });
    } catch (err) {
      showStatus(err.message || 'Erro no teste.', 'error', 'cliques');
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  function isClicksPanelVisible() {
    const panel = document.getElementById('admin-tab-cliques');
    return !!(panel && !panel.hidden);
  }

  function setClicksLoadStatus(msg, type) {
    const el = document.getElementById('admin-status-cliques');
    if (!el) return;
    if (!msg) {
      el.hidden = true;
      el.textContent = '';
      return;
    }
    el.textContent = msg;
    el.className = 'admin-status form-status ' + (type || '');
    el.hidden = false;
  }

  function renderClicksFromCache(openPaths) {
    if (!clicksCache.length || !clicksMetaCache) return;
    renderClicksStats(clicksMetaCache);
    renderClicksWhenCharts(clicksWhenCache);
    renderClicksNoiseStats(clicksWhenCache);
    renderClicksTree(
      clicksCache,
      clicksMetaCache.checkedAt,
      clicksMetaCache.total,
      openPaths || []
    );
  }

  function startClicksBackgroundLoad(opts = {}) {
    const preserveOpen = !!opts.preserveOpen;
    const force = !!opts.force;
    if (clicksLoadPromise && !force) return clicksLoadPromise;
    clicksBgStarted = true;
    clicksLoadPromise = loadClicks(preserveOpen).finally(() => {
      clicksLoadPromise = null;
    });
    return clicksLoadPromise;
  }

  async function loadClicks(preserveOpen) {
    const root = document.getElementById('clicks-tree-root');
    if (!root) return;
    if (clicksLoading) {
      if (clicksLoadPromise) return clicksLoadPromise;
      return;
    }
    const token = sessionStorage.getItem(SESSION_KEY);
    const base = apiBase();
    if (!token || !base) {
      root.innerHTML = '<p class="admin-meta">Faça login no admin.</p>';
      return;
    }

    wireClicksWhenFilters();

    const q = document.getElementById('clicks-search')?.value?.trim() || '';
    const destino = document.getElementById('clicks-filter-destino')?.value || '';
    const navEl = document.getElementById('clicks-filter-nav');
    const withNav = !!navEl?.checked;
    if (navEl) {
      navEl.disabled = !destino;
      navEl.closest('label')?.classList.toggle('is-disabled', !destino);
    }

    clicksLoading = true;
    const openPaths = preserveOpen ? captureClicksTreeOpenPaths() : [];
    const panelVisible = isClicksPanelVisible();
    setClicksLoadStatus(
      panelVisible
        ? 'Carregando histórico de cliques…'
        : 'Carregando cliques em segundo plano — você pode usar outras abas.'
    );
    if (panelVisible && !clicksCache.length) {
      root.innerHTML = '<p class="admin-meta"><i class="fas fa-spinner fa-spin"></i> Carregando histórico…</p>';
    }

    try {
      const params = new URLSearchParams({ limit: '4000' });
      if (q) params.set('q', q);
      if (destino === 'pageview') params.set('tipo', 'pageview');
      else if (destino) params.set('destino', destino);
      if (destino && withNav) params.set('nav', '1');
      const res = await fetch(`${base.replace(/\/$/, '')}/admin/clicks?${params}`, {
        headers: { Authorization: 'Bearer ' + token },
        cache: 'no-store'
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar cliques');
      clicksCache = data.clicks || [];
      clicksWhenCache = data.whenClicks?.length ? data.whenClicks : clicksCache;
      clicksWhenWindow = data.capacity || null;
      clicksMetaCache = data;
      saveClicksSnapshot(data);
      renderClicksStats(data);
      renderClicksWhenCharts(clicksWhenCache);
      renderClicksNoiseStats(clicksWhenCache);
      renderClicksTree(clicksCache, data.checkedAt, data.total, openPaths);
      const checkedEl = document.getElementById('clicks-checked-at');
      if (checkedEl && data.withNav && destino) {
        const baseTxt = checkedEl.textContent || '';
        checkedEl.textContent = `${baseTxt} · navegação completa (${data.navSessions || 0} visita${(data.navSessions || 0) === 1 ? '' : 's'})`;
      }
      setClicksLoadStatus('Cliques atualizados.', 'success');
      window.setTimeout(() => setClicksLoadStatus(''), 2500);
    } catch (err) {
      if (isClicksPanelVisible()) {
        root.innerHTML = `<p class="admin-status-bad">${escapeHtml(err.message)}</p>`;
      }
      setClicksLoadStatus(err.message || 'Erro ao carregar cliques.', 'error');
      const charts = document.getElementById('clicks-when-charts');
      if (charts) charts.innerHTML = '';
      const noise = document.getElementById('clicks-noise-charts');
      if (noise) noise.innerHTML = '';
    } finally {
      clicksLoading = false;
    }
  }

  function scheduleClicksReload() {
    clearTimeout(clicksSearchTimer);
    clicksSearchTimer = setTimeout(() => reapplyClicksLocalFilters(captureClicksTreeOpenPaths()), 200);
  }

  function formatFeedbackDate(ts) {
    if (!ts) return '—';
    try {
      return new Date(ts).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    } catch {
      return '—';
    }
  }

  function renderFeedbackList(items, total, checkedAt) {
    const root = document.getElementById('feedback-list-root');
    const checkedEl = document.getElementById('feedback-checked-at');
    if (!root) return;

    if (!items?.length) {
      root.innerHTML = '<div class="feedback-empty"><i class="fas fa-inbox" aria-hidden="true"></i><p>Nenhuma resposta ainda.</p><span>Quando visitantes usarem <strong>Sugestões</strong> no site, aparecem aqui.</span></div>';
    } else {
      const statsHtml = `<div class="feedback-stats-bar">
        <div class="feedback-stat"><span class="feedback-stat-num">${total}</span><span class="feedback-stat-label">resposta${total === 1 ? '' : 's'} no total</span></div>
        <div class="feedback-stat"><span class="feedback-stat-num">${items.length}</span><span class="feedback-stat-label">exibida${items.length === 1 ? '' : 's'}</span></div>
      </div>`;

      const cardsHtml = items.map((row) => {
        const paginaLabel = humanizarPaginaLog(row.pagina) || row.pagina || '—';
        const paginaRaw = row.pagina ? `<span class="feedback-card-path" title="${escapeHtml(row.pagina)}">${escapeHtml(row.pagina)}</span>` : '';
        const sug = row.sugestao
          ? `<div class="feedback-card-block feedback-card-block--sug">
              <span class="feedback-card-label"><i class="fas fa-lightbulb" aria-hidden="true"></i> Sugestão</span>
              <p>${escapeHtml(row.sugestao)}</p>
            </div>`
          : '';
        const email = row.email
          ? `<a class="feedback-card-email" href="mailto:${escapeHtml(row.email)}"><i class="fas fa-envelope" aria-hidden="true"></i> ${escapeHtml(row.email)}</a>`
          : '<span class="feedback-card-anon"><i class="fas fa-user-secret" aria-hidden="true"></i> Anônimo</span>';
        const pills = [
          row.idioma ? `<span class="feedback-pill">${escapeHtml(String(row.idioma).toUpperCase())}</span>` : '',
          row.pais ? `<span class="feedback-pill feedback-pill--geo">${escapeHtml(row.pais)}</span>` : ''
        ].filter(Boolean).join('');

        return `<article class="feedback-card">
          <header class="feedback-card-top">
            <div class="feedback-card-top-main">
              <span class="feedback-card-badge"><i class="fas fa-map-marker-alt" aria-hidden="true"></i> ${escapeHtml(paginaLabel)}</span>
              ${paginaRaw}
            </div>
            <time class="feedback-card-time" datetime="${row.ts}">${escapeHtml(formatFeedbackDate(row.ts))}</time>
          </header>
          <div class="feedback-card-block feedback-card-block--primary">
            <span class="feedback-card-label"><i class="fas fa-search" aria-hidden="true"></i> Procurava</span>
            <p>${escapeHtml(row.buscava || '')}</p>
          </div>
          ${sug}
          <footer class="feedback-card-foot">
            ${email}
            <div class="feedback-card-pills">${pills}</div>
          </footer>
        </article>`;
      }).join('');

      root.innerHTML = statsHtml + `<div class="feedback-cards">${cardsHtml}</div>`;
    }

    if (checkedEl) {
      checkedEl.textContent = `Atualizado em ${formatFeedbackDate(checkedAt ? Date.parse(checkedAt) : Date.now())} · ${items.length} de ${total} resposta(s)`;
      checkedEl.hidden = false;
    }
  }

  async function loadFeedback() {
    const root = document.getElementById('feedback-list-root');
    if (!root || feedbackLoading) return;
    const token = sessionStorage.getItem(SESSION_KEY);
    const base = apiBase();
    if (!token || !base) {
      root.innerHTML = '<p class="admin-meta">Faça login no admin.</p>';
      return;
    }
    const q = document.getElementById('feedback-search')?.value?.trim() || '';
    feedbackLoading = true;
    root.innerHTML = '<p class="admin-meta"><i class="fas fa-spinner fa-spin"></i> Carregando…</p>';
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (q) params.set('q', q);
      const res = await fetch(`${base}/admin/feedback?${params}`, {
        headers: { Authorization: 'Bearer ' + token },
        cache: 'no-store'
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar pesquisa');
      renderFeedbackList(data.feedback || [], data.total || 0, data.checkedAt);
    } catch (err) {
      root.innerHTML = `<p class="admin-status-bad">${escapeHtml(err.message)}</p>`;
    } finally {
      feedbackLoading = false;
    }
  }

  function scheduleFeedbackReload() {
    clearTimeout(feedbackSearchTimer);
    feedbackSearchTimer = setTimeout(() => loadFeedback(), 350);
  }

  async function clearFeedback() {
    const token = sessionStorage.getItem(SESSION_KEY);
    const base = apiBase();
    if (!token || !base) {
      showStatus('Faça login no admin.', 'error', 'pesquisa');
      return;
    }
    if (!confirm('Apagar TODAS as respostas da pesquisa?\n\nNão dá para desfazer.')) return;
    showStatus('Limpando…', '', 'pesquisa');
    try {
      const res = await fetch(`${base}/admin/feedback`, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer ' + token }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Falha ao limpar');
      await loadFeedback();
      showStatus(`${data.removed || 0} resposta(s) removida(s).`, 'success', 'pesquisa');
    } catch (err) {
      showStatus(err.message || 'Erro ao limpar.', 'error', 'pesquisa');
    }
  }

  function formatCustomerDate(iso) {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString('pt-BR');
    } catch {
      return iso;
    }
  }

  let customersCache = { customers: [], adminPanel: null, checkedAt: null };
  let customersSubtab = 'clientes';
  let customersSubtabsWired = false;

  function customerRowHtml(c) {
    return `
      <tr data-user-id="${escapeHtml(c.userId || '')}">
        <td>${escapeHtml(c.nome || '—')}</td>
        <td>${escapeHtml(c.email || '—')}</td>
        <td>${escapeHtml(c.telefone || '—')}</td>
        <td>
          <label class="admin-check" title="Testador: R$ 0,01 + comunidade beta">
              <input type="checkbox" data-tester-toggle ${c.isTester ? 'checked' : ''} aria-label="Usuário de teste">
            </label>
        </td>
        <td>${Number(c.orderCount) || 0}</td>
        <td>${escapeHtml(formatCustomerDate(c.createdAt))}</td>
        <td>
          <button type="button" class="btn-danger-outline" data-customer-delete title="Excluir cadastro">
            <i class="fas fa-trash-alt"></i>
          </button>
        </td>
      </tr>`;
  }

  function bindCustomerRowActions(tbody) {
    if (!tbody) return;
    tbody.querySelectorAll('[data-tester-toggle]').forEach((input) => {
      input.addEventListener('change', () => toggleCustomerTester(input));
    });
    tbody.querySelectorAll('[data-customer-delete]').forEach((btn) => {
      btn.addEventListener('click', () => deleteCustomer(btn));
    });
  }

  function renderCustomersTables() {
    const all = customersCache.customers || [];
    const clients = all.filter((c) => !c.isTester);
    const testers = all.filter((c) => c.isTester);
    const checkedEl = document.getElementById('customers-checked-at');
    const countClientes = document.getElementById('customers-count-clientes');
    const countTeste = document.getElementById('customers-count-teste');
    if (countClientes) countClientes.textContent = `(${clients.length})`;
    if (countTeste) countTeste.textContent = `(${testers.length})`;

    const tbodyClients = document.getElementById('admin-customers-tbody-clientes');
    const tbodyTesters = document.getElementById('admin-customers-tbody-teste');
    if (tbodyClients) {
      tbodyClients.innerHTML = clients.length
        ? clients.map(customerRowHtml).join('')
        : '<tr><td colspan="7" class="admin-meta">Nenhum cliente (não-teste) cadastrado.</td></tr>';
      bindCustomerRowActions(tbodyClients);
    }
    if (tbodyTesters) {
      tbodyTesters.innerHTML = testers.length
        ? testers.map(customerRowHtml).join('')
        : '<tr><td colspan="7" class="admin-meta">Nenhum usuário de teste. Marque a flag Teste em um cliente.</td></tr>';
      bindCustomerRowActions(tbodyTesters);
    }

    const admRoot = document.getElementById('admin-panel-account-root');
    if (admRoot) {
      const adm = customersCache.adminPanel || {};
      admRoot.innerHTML = `
        <h3 style="margin:0 0 .5rem"><i class="fas fa-user-shield"></i> Administrador do painel</h3>
        <p><strong>Usuário:</strong> ${escapeHtml(adm.username || 'admin')}</p>
        <p class="admin-meta">${escapeHtml(adm.note || 'Login de /admin.html — não aparece na lista de clientes.')}</p>
        <p class="admin-meta">Senha: definida no Worker (secret <code>ADMIN_PASSWORD</code>). Não é possível excluir por aqui.</p>
      `;
    }

    if (checkedEl && customersCache.checkedAt) {
      checkedEl.textContent = `Atualizado em ${formatCustomerDate(customersCache.checkedAt)} · ${clients.length} cliente(s) · ${testers.length} teste(s)`;
      checkedEl.hidden = false;
    }
  }

  function showCustomersSubtab(id) {
    customersSubtab = id || 'clientes';
    document.querySelectorAll('[data-customers-subtab]').forEach((tab) => {
      const active = tab.getAttribute('data-customers-subtab') === customersSubtab;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    document.querySelectorAll('[data-customers-panel]').forEach((panel) => {
      panel.hidden = panel.getAttribute('data-customers-panel') !== customersSubtab;
    });
  }

  function wireCustomersSubtabs() {
    if (customersSubtabsWired) return;
    customersSubtabsWired = true;
    document.querySelectorAll('[data-customers-subtab]').forEach((tab) => {
      tab.addEventListener('click', () => showCustomersSubtab(tab.getAttribute('data-customers-subtab')));
    });
  }

  async function toggleCustomerTester(input) {
    const row = input.closest('tr');
    const userId = row?.getAttribute('data-user-id');
    const token = sessionStorage.getItem(SESSION_KEY);
    const base = apiBase();
    if (!userId || !token || !base) return;
    input.disabled = true;
    try {
      const res = await fetch(`${base.replace(/\/$/, '')}/admin/customers/${encodeURIComponent(userId)}`, {
        method: 'PATCH',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ isTester: !!input.checked })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Falha ao atualizar');
      const cached = customersCache.customers.find((c) => c.userId === userId);
      if (cached) cached.isTester = !!input.checked;
      renderCustomersTables();
      if (input.checked) showCustomersSubtab('teste');
      else showCustomersSubtab('clientes');
    } catch (err) {
      input.checked = !input.checked;
      alert(err.message || 'Erro');
    } finally {
      input.disabled = false;
    }
  }

  async function deleteCustomer(btn) {
    const row = btn.closest('tr');
    const userId = row?.getAttribute('data-user-id');
    const email = row?.children?.[1]?.textContent || '';
    const token = sessionStorage.getItem(SESSION_KEY);
    const base = apiBase();
    if (!userId || !token || !base) return;
    if (!confirm(`Excluir o cadastro de ${email || 'este usuário'}?\n\nPedidos antigos permanecem; a conta deixa de existir.`)) return;
    btn.disabled = true;
    try {
      const res = await fetch(`${base.replace(/\/$/, '')}/admin/customers/${encodeURIComponent(userId)}`, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer ' + token }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Falha ao excluir');
      customersCache.customers = (customersCache.customers || []).filter((c) => c.userId !== userId);
      renderCustomersTables();
    } catch (err) {
      alert(err.message || 'Erro');
      btn.disabled = false;
    }
  }

  async function loadCustomers() {
    wireCustomersSubtabs();
    const tbodyClients = document.getElementById('admin-customers-tbody-clientes');
    if (!tbodyClients || customersLoading) return;
    const token = sessionStorage.getItem(SESSION_KEY);
    const base = apiBase();
    if (!token || !base) {
      tbodyClients.innerHTML = '<tr><td colspan="7" class="admin-meta">Faça login no admin.</td></tr>';
      return;
    }

    customersLoading = true;
    tbodyClients.innerHTML = '<tr><td colspan="7" class="admin-meta"><i class="fas fa-spinner fa-spin"></i> Carregando…</td></tr>';
    const tbodyTesters = document.getElementById('admin-customers-tbody-teste');
    if (tbodyTesters) tbodyTesters.innerHTML = tbodyClients.innerHTML;

    try {
      const res = await fetch(base.replace(/\/$/, '') + '/admin/customers', {
        headers: { Authorization: 'Bearer ' + token },
        cache: 'no-store'
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar cadastros');
      customersCache = {
        customers: data.customers || [],
        adminPanel: data.adminPanel || null,
        checkedAt: data.checkedAt
      };
      renderCustomersTables();
      showCustomersSubtab(customersSubtab || 'clientes');
    } catch (err) {
      tbodyClients.innerHTML = `<tr><td colspan="7" class="admin-status-bad">${escapeHtml(err.message)}</td></tr>`;
    } finally {
      customersLoading = false;
    }
  }

  async function refreshIntegrationsCache(refreshBalances) {
    const token = sessionStorage.getItem(SESSION_KEY);
    const base = apiBase();
    if (!base || !token) {
      lastIntegrations = null;
      return null;
    }
    const qs = refreshBalances ? '?refreshBalances=1' : '';
    const res = await fetch(base.replace(/\/$/, '') + '/admin/integrations-status' + qs, {
      headers: { Authorization: 'Bearer ' + token },
      cache: 'no-store'
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Não autorizado');
    lastIntegrations = data.integrations || [];
    return data;
  }

  async function loadIntegrationsStatus() {
    const tbody = document.getElementById('api-integrations-tbody');
    if (!tbody || integrationsLoading) return;

    const token = sessionStorage.getItem(SESSION_KEY);
    const base = apiBase();
    if (!base || !token) {
      lastIntegrations = null;
      renderIntegrationsTable([], null);
      tbody.innerHTML = '<tr><td colspan="3" class="admin-meta">Faça login com a API para testar as integrações.</td></tr>';
      return;
    }

    integrationsLoading = true;
    tbody.innerHTML = '<tr><td colspan="3" class="admin-meta"><i class="fas fa-spinner fa-spin"></i> Verificando integrações…</td></tr>';

    try {
      const data = await refreshIntegrationsCache(false);
      saveBalancesSnapshot(data);
      renderIntegrationsTable(data?.integrations, data?.checkedAt);
      renderPaymentBalancesGrid(data?.paymentBalances, data?.checkedAt, data?.paymentBalancesSummary);
    } catch (err) {
      lastIntegrations = null;
      tbody.innerHTML = '<tr><td colspan="3"><span class="admin-status-bad">✗ ' + escAttr(err.message || 'Erro ao verificar') + '</span></td></tr>';
      const checkedEl = document.getElementById('api-integrations-checked-at');
      if (checkedEl) checkedEl.hidden = true;
    } finally {
      integrationsLoading = false;
    }
  }

  async function loadShippingStatus() {
    const el = document.getElementById('correios-br-status');
    if (!el) return;
    const token = sessionStorage.getItem(SESSION_KEY);
    const base = apiBase();
    if (!base || !token) {
      el.innerHTML = '<span class="admin-status-warn">Faça login com a API para ver status das integrações Correios.</span>';
      return;
    }
    el.textContent = 'Verificando integrações de frete...';
    try {
      const res = await fetch(base.replace(/\/$/, '') + '/admin/shipping-status', {
        headers: { Authorization: 'Bearer ' + token },
        cache: 'no-store'
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Não autorizado');

      const br = data.correiosBr || {};
      const exp = data.correiosExport || {};
      const brTokenLine = !br.credentialsConfigured
        ? '<span class="admin-status-bad">✗ Credenciais Correios não configuradas — frete nacional usa estimativa fixa</span>'
        : (br.apiConnected
          ? '<span class="admin-status-ok">✓ Token Correios OK</span>'
          : '<span class="admin-status-warn">⚠ Credenciais configuradas, mas token não obtido</span>');

      const api34Line = br.precoApiOk
        ? '<span class="admin-status-ok">✓ Correios API 34 (Preço) OK</span> — ' + escAttr(br.precoApiDetail || '')
        : (br.precoApiDetail
          ? '<span class="admin-status-warn">⚠ Correios API 34 (Preço): ' + escAttr(br.precoApiDetail) + '</span>'
          : '<span class="admin-status-bad">✗ Correios API 34 (Preço) não testada</span>');

      const api35Line = br.prazoApiOk
        ? '<span class="admin-status-ok">✓ Correios API 35 (Prazo) OK</span> — ' + escAttr(br.prazoApiDetail || '')
        : (br.prazoApiDetail
          ? '<span class="admin-status-warn">⚠ Correios API 35 (Prazo): ' + escAttr(br.prazoApiDetail) + '</span>'
          : '<span class="admin-status-bad">✗ Correios API 35 (Prazo) não testada</span>');

      const api36Line = br.prePostagemApiOk
        ? '<span class="admin-status-ok">✓ Correios API 36 (Pré-Postagem) OK</span> — ' + escAttr(br.prePostagemApiDetail || '')
        : (br.prePostagemApiDetail
          ? '<span class="admin-status-warn">⚠ Correios API 36 (Pré-Postagem): ' + escAttr(br.prePostagemApiDetail) + '</span>'
          : '<span class="admin-status-bad">✗ Correios API 36 (Pré-Postagem) não testada</span>');

      const svc04227Line = br.servico04227OnCard
        ? '<span class="admin-status-ok">✓ Correios Serviço 04227 (Mini Envios) no cartão</span> — ' + escAttr(br.servico04227Detail || '')
        : (br.servico04227Detail
          ? '<span class="admin-status-warn">⚠ Correios Serviço 04227: ' + escAttr(br.servico04227Detail) + '</span>'
          : '<span class="admin-status-bad">✗ Correios Serviço 04227 não verificado</span>');

      const svc86720Line = br.servico86720OnCard
        ? '<span class="admin-status-ok">✓ Correios Serviço 86720 (Pré-Postagem) no cartão</span> — ' + escAttr(br.servico86720Detail || '')
        : (br.servico86720Detail
          ? '<span class="admin-status-warn">⚠ Correios Serviço 86720: ' + escAttr(br.servico86720Detail) + '</span>'
          : '<span class="admin-status-bad">✗ Correios Serviço 86720 não verificado</span>');

      const brLine = brTokenLine
        + ' · contrato ' + escAttr(br.commercialContract || '9912752041')
        + ' · Mini Envios ' + escAttr(br.serviceCode || '04227')
        + '<br>' + api34Line
        + '<br>' + api35Line
        + '<br>' + api36Line
        + '<br>' + svc04227Line
        + '<br>' + svc86720Line;

      const expLine = exp.simulatorReachable && exp.sampleQuotePT
        ? `<span class="admin-status-ok">✓ Exporta Fácil OK</span> — Portugal agora: <strong>R$ ${Number(exp.sampleQuotePT.price).toFixed(2).replace('.', ',')}</strong> (${exp.sampleQuotePT.weightGrams} g)`
        : '<span class="admin-status-bad">✗ Simulador internacional indisponível — checkout usaria tabela fallback abaixo</span>';

      const mismatch = data.weightMismatch
        ? `<br><span class="admin-status-warn">⚠ ${escAttr(data.weightMismatchHint || 'Peso do produto diferente do pacote')}</span>`
        : '';

      const syncResults = data.intlFallbackSync || {};
      const syncedCount = Object.values(syncResults).filter((r) => r?.ok).length;
      const syncFailed = Object.entries(syncResults).filter(([, r]) => r && !r.ok).map(([c]) => c);
      let syncLine = '';
      if (data.intlFallbackUpdated && syncedCount) {
        syncLine = `<br><span class="admin-status-ok">✓ Tabela fallback internacional atualizada da API (${syncedCount} país${syncedCount === 1 ? '' : 'es'})</span>`;
      } else if (syncFailed.length) {
        syncLine = `<br><span class="admin-status-warn">⚠ Fallback não atualizado para: ${escAttr(syncFailed.join(', '))}</span>`;
      }

      el.innerHTML = brLine + '<br>' + expLine + mismatch + syncLine;

      if (data.internationalShipping) {
        currentConfig = { ...currentConfig, internationalShipping: data.internationalShipping };
        renderIntlShipping(data.internationalShipping);
      }
      if (exp.sampleQuotesPT?.length) {
        showQuoteResult(formatQuoteResult({ options: exp.sampleQuotesPT, weightGrams: data.package?.weightGrams }));
      } else if (exp.sampleQuotePT) {
        showQuoteResult(formatQuoteResult(exp.sampleQuotePT));
      }
    } catch (err) {
      el.innerHTML = '<span class="admin-status-warn">' + escAttr(err.message || 'Erro ao carregar status') + '</span>';
    }
  }

  const LENS_INTL_IMAGES = [
    '/images/lens-gallery/01-optical-correction-lens.png',
    '/images/lens-gallery/02-ultra-thin.png',
    '/images/lens-gallery/03-high-optical-transparency.png',
    '/images/lens-gallery/04-engineered-refraction.png',
    '/images/lens-gallery/05-whats-included.png',
    '/images/kit-gallery/en/kit-03-aplicacao.jpg',
    '/images/kit-gallery/en/kit-06-antes-depois.jpg'
  ];

  function productMarketsOf(p) {
    if (window.STF_SITE?.normalizeProductMarkets) {
      return window.STF_SITE.normalizeProductMarkets(p);
    }
    if (Array.isArray(p?.markets) && p.markets.length) {
      return [...new Set(p.markets.map((m) => String(m || '').trim().toUpperCase()).filter(Boolean))];
    }
    if (p?.aggregated) return ['BR'];
    const id = String(p?.id || p?.slug || '');
    if (id === 'kit-sensor-tattoofix' || id === 'kit') return ['BR'];
    if (/optical.?lens|lens-intl|sensortattoofix-optical/i.test(id)) return ['INT'];
    return ['BR', 'INT'];
  }

  function isIntlMarketProduct(p) {
    const m = productMarketsOf(p);
    return m.includes('INT') && !m.includes('BR');
  }

  function renderProductRow(p, i, opts) {
    const isAggregated = !!opts?.aggregated;
    const market = opts?.market || 'BR';
    const badge = isAggregated
      ? '<span class="admin-badge-aggregated">Agregado BR</span> '
      : (market === 'INT'
        ? '<span class="admin-badge-main">.com</span> '
        : '<span class="admin-badge-main">Brasil</span> ');
    const title = p.name ? `${badge}Produto ${i + 1}: ${escAttr(p.name)}` : `${badge}Produto ${i + 1}`;
    const sensorField = !isAggregated ? `
          <label>Sensor da lente (mm)
            <span class="stf-help-tip" tabindex="0" aria-label="Como medir o sensor">
              <i class="fas fa-circle-question"></i>
              <span class="stf-help-tip-pop">
                <img src="images/home/relogio_sensor.jpg" alt="Medir o sensor com régua no relógio">
                <small>Meça o diâmetro do círculo do sensor no fundo do relógio (em mm).</small>
              </span>
            </span>
            <input type="number" data-field="sensorMm" step="0.5" min="0" value="${p.sensorMm != null ? p.sensorMm : ''}" placeholder="ex.: 25">
          </label>` : '';
    const aggregatedFields = isAggregated ? `
          <label class="full">Modelos compatíveis <small class="admin-field-hint">um por linha — mesmos nomes do select do checkout</small>
            <textarea data-field="compatibleWatchModels" rows="4" placeholder="Apple Watch Series 9 (45mm)">${escTextarea((p.compatibleWatchModels || []).join('\n'))}</textarea>
          </label>
          <label>Tipo da película (PT) <small class="admin-field-hint">ex.: cerâmica, membrana flexível</small>
            <input type="text" data-field="filmType" value="${escAttr(p.filmType || '')}" placeholder="cerâmica">
          </label>
          <label>Tipo da película (EN) <small class="admin-field-hint">ex.: ceramic, flexible membrane</small>
            <input type="text" data-field="filmTypeEn" value="${escAttr(p.filmTypeEn || '')}" placeholder="ceramic">
          </label>
          <p class="admin-meta admin-aggregated-compat-hint"><i class="fas fa-link"></i> <strong>Regra do upsell:</strong> o produto só aparece se o modelo escolhido pelo cliente estiver nesta lista (1 agregado → vários modelos).</p>` : '';
    const i18nFields = !isAggregated ? `
          <label class="full">Nome EN <small class="admin-field-hint">título na loja .com / EN</small>
            <input type="text" data-field="nameEn" value="${escAttr(p.nameEn || '')}" placeholder="SensorTattooFix Optical Lens">
          </label>
          <label class="full">Nome IT
            <input type="text" data-field="nameIt" value="${escAttr(p.nameIt || '')}" placeholder="Lente ottica SensorTattooFix">
          </label>
          <label class="full">Descrição EN<textarea data-field="descriptionEn" rows="2">${escTextarea(p.descriptionEn || '')}</textarea></label>
          <label class="full">Descrição IT<textarea data-field="descriptionIt" rows="2">${escTextarea(p.descriptionIt || '')}</textarea></label>
          <label class="full">Álbum de fotos <small class="admin-field-hint">uma URL por linha — ordem do carrossel na loja</small>
            <textarea data-field="images" rows="5" placeholder="/images/lens-gallery/01-….png">${escTextarea((Array.isArray(p.images) ? p.images : []).join('\n'))}</textarea>
          </label>` : '';
    return `
      <div class="admin-product-row${isAggregated ? ' admin-product-row--aggregated' : ' admin-product-row--main'}" data-product-index="${i}" data-aggregated="${isAggregated ? '1' : '0'}" data-market="${escAttr(market)}">
        <h4>${title}</h4>
        <div class="form-grid">
          <label class="full">Nome (PT / cadastro)<input type="text" data-field="name" value="${escAttr(p.name)}" required></label>
          <label class="full">Descrição (PT)<textarea data-field="description" rows="2">${escTextarea(p.description)}</textarea></label>
          ${i18nFields}
          ${aggregatedFields}
          <label>Preço (R$)<input type="number" data-field="price" step="0.01" min="0" value="${p.price ?? 0}"></label>
          ${market === 'INT' && !isAggregated ? `
          <label>Preço USD (.com EN)<input type="number" data-field="priceUsd" step="0.01" min="0" value="${p.priceUsd != null ? p.priceUsd : ''}" placeholder="ex.: 12.99"></label>
          <label>Preço EUR (.com IT)<input type="number" data-field="priceEur" step="0.01" min="0" value="${p.priceEur != null ? p.priceEur : ''}" placeholder="ex.: 11.99"></label>
          <p class="admin-meta admin-field-hint full">Referência em R$ acima. USD/EUR são exibidos no .com (cobrança em USD). Atualizados automaticamente todo dia; você pode ajustar manualmente.</p>` : ''}
          <label>Estoque <small class="admin-field-hint">vazio = ilimitado · 0 = esgotado (some da loja)</small>
            <input type="number" data-field="stock" min="0" step="1" value="${p.stock != null ? p.stock : ''}" placeholder="ilimitado">
          </label>
          <label>Slug (URL)<input type="text" data-field="slug" value="${p.slug || p.id || ''}" placeholder="${market === 'INT' ? 'optical-lens-intl' : 'kit-sensor-tattoofix'}"></label>
          <label class="full">URL da imagem principal<input type="text" data-field="image" value="${escAttr(p.image || '')}" placeholder="/images/lens-gallery/01-optical-correction-lens.png" spellcheck="false" autocomplete="off"></label>
          ${sensorField}
          <label>Peso (g)<input type="number" data-field="weightGrams" min="0.1" step="0.1" value="${p.weightGrams ?? 3}"></label>
          <div class="admin-product-flags">
            <label class="label-check"><input type="checkbox" data-field="active" ${p.active !== false ? 'checked' : ''}><span>Ativo</span></label>
            <label class="label-check"><input type="checkbox" data-field="requiresSmartwatch" ${p.requiresSmartwatch !== false ? 'checked' : ''}><span>Pede modelo do relógio</span></label>
          </div>
        </div>
        <button type="button" class="btn-secondary btn-remove-product" data-index="${i}" data-aggregated="${isAggregated ? '1' : '0'}" data-market="${escAttr(market)}" style="margin-top:8px"><i class="fas fa-trash"></i> Remover</button>
      </div>`;
  }

  function renderProductList(products, listId, opts) {
    const list = document.getElementById(listId);
    if (!list) return;
    const isAggregated = !!opts?.aggregated;
    const market = opts?.market || 'BR';
    list.innerHTML = products.length
      ? products.map((p, i) => renderProductRow(p, i, { aggregated: isAggregated, market })).join('')
      : `<p class="admin-meta">${isAggregated ? 'Nenhum agregado BR cadastrado.' : (market === 'INT' ? 'Nenhum produto .com cadastrado.' : 'Nenhum produto BR cadastrado.')}</p>`;

    list.querySelectorAll('.btn-remove-product').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-index'));
        const agg = btn.getAttribute('data-aggregated') === '1';
        const mkt = btn.getAttribute('data-market') || 'BR';
        const all = collectProductsFromDom();
        const next = all.filter((p, i) => {
          // rebuild by collecting again after splice of matching bucket
          return true;
        });
        const brMain = all.filter((p) => !p.aggregated && productMarketsOf(p).includes('BR') && !isIntlMarketProduct(p));
        const brAgg = all.filter((p) => p.aggregated);
        const intlMain = all.filter((p) => !p.aggregated && isIntlMarketProduct(p));
        if (agg) brAgg.splice(idx, 1);
        else if (mkt === 'INT') intlMain.splice(idx, 1);
        else brMain.splice(idx, 1);
        const rebuilt = [
          ...brMain.map((p) => ({ ...p, markets: ['BR'], aggregated: false })),
          ...brAgg.map((p) => ({ ...p, markets: ['BR'], aggregated: true })),
          ...intlMain.map((p) => ({ ...p, markets: ['INT'], aggregated: false }))
        ];
        renderProducts(rebuilt.length ? rebuilt : [{
          id: 'kit-sensor-tattoofix', slug: 'kit-sensor-tattoofix', name: 'Kit Sensor Tattoo Fix',
          description: '', price: 62.9, image: '/images/brand/sensortattoofix.jpg', active: true,
          requiresSmartwatch: true, weightGrams: 3, sensorMm: 25, markets: ['BR']
        }]);
      });
    });
  }

  function renderProducts(products) {
    const list = products || [];
    const brMain = list.filter((p) => !p.aggregated && productMarketsOf(p).includes('BR') && !isIntlMarketProduct(p));
    const brAgg = list.filter((p) => p.aggregated);
    const intlMain = list.filter((p) => !p.aggregated && (isIntlMarketProduct(p) || (productMarketsOf(p).includes('INT') && !productMarketsOf(p).includes('BR'))));
    // Products tagged BOTH appear in BR main only (edit once); INT-only in intl panel.
    const summary = document.getElementById('admin-products-summary');
    if (summary) {
      summary.textContent = `BR ${brMain.length} principal(is) · ${brAgg.length} agregado(s) · .com ${intlMain.length} lente(s)`;
    }
    renderProductList(brMain, 'admin-products-br-main', { market: 'BR', aggregated: false });
    renderProductList(brAgg, 'admin-products-br-aggregated', { market: 'BR', aggregated: true });
    renderProductList(intlMain, 'admin-products-intl-main', { market: 'INT', aggregated: false });
  }

  function collectFromList(listEl, isAggregated, market) {
    if (!listEl) return [];
    return [...listEl.querySelectorAll('.admin-product-row')].map((row, i) => {
      const val = (field) => {
        const el = row.querySelector(`[data-field="${field}"]`);
        if (!el) return '';
        if (el.type === 'checkbox') return el.checked;
        return el.type === 'number' ? Number(el.value) : el.value.trim();
      };
      const name = val('name');
      const slug = val('slug') || slugify(name) || `produto-${i + 1}`;
      const prev = (currentConfig?.products || []).find((p) => p.id === slug || p.slug === slug) || {};
      const product = {
        ...prev,
        id: slug,
        slug,
        name,
        description: val('description'),
        price: Number(val('price')) || 0,
        image: val('image') || prev.image || '',
        active: val('active'),
        aggregated: isAggregated,
        requiresSmartwatch: val('requiresSmartwatch'),
        weightGrams: Number(val('weightGrams')) || 3,
        markets: isAggregated ? ['BR'] : (market === 'INT' ? ['INT'] : ['BR'])
      };
      if (!isAggregated && !product.deviceType) {
        const hay = [product.id, product.slug, product.name, product.nameEn].join(' ');
        product.deviceType = /smartband/i.test(hay) ? 'smartband' : 'smartwatch';
      }
      if (!isAggregated) {
        const nameEn = val('nameEn');
        const nameIt = val('nameIt');
        const descriptionEn = val('descriptionEn');
        const descriptionIt = val('descriptionIt');
        if (nameEn) product.nameEn = nameEn; else delete product.nameEn;
        if (nameIt) product.nameIt = nameIt; else delete product.nameIt;
        if (descriptionEn) product.descriptionEn = descriptionEn; else delete product.descriptionEn;
        if (descriptionIt) product.descriptionIt = descriptionIt; else delete product.descriptionIt;
        if (market === 'INT') {
          const usd = val('priceUsd');
          const eur = val('priceEur');
          if (usd) product.priceUsd = Number(usd); else delete product.priceUsd;
          if (eur) product.priceEur = Number(eur); else delete product.priceEur;
        } else {
          delete product.priceUsd;
          delete product.priceEur;
        }
        const imagesEl = row.querySelector('[data-field="images"]');
        if (imagesEl) {
          const imgs = imagesEl.value.split('\n').map((s) => s.trim()).filter(Boolean);
          if (imgs.length) product.images = imgs;
          else delete product.images;
        }
      }
      const stockEl = row.querySelector('[data-field="stock"]');
      if (stockEl && stockEl.value.trim() !== '') {
        product.stock = Math.max(0, Math.floor(Number(stockEl.value) || 0));
      } else {
        delete product.stock;
      }
      if (!isAggregated) {
        const sm = val('sensorMm');
        if (sm) product.sensorMm = Number(sm);
        else delete product.sensorMm;
      } else {
        delete product.sensorMm;
        const modelsEl = row.querySelector('[data-field="compatibleWatchModels"]');
        if (modelsEl) {
          const lines = modelsEl.value.split('\n').map((s) => s.trim()).filter(Boolean);
          if (lines.length) product.compatibleWatchModels = lines;
          else delete product.compatibleWatchModels;
        }
        const filmType = val('filmType');
        const filmTypeEn = val('filmTypeEn');
        if (filmType) product.filmType = filmType;
        else delete product.filmType;
        if (filmTypeEn) product.filmTypeEn = filmTypeEn;
        else delete product.filmTypeEn;
      }
      return product;
    });
  }

  function collectProductsFromDom() {
    return [
      ...collectFromList(document.getElementById('admin-products-br-main'), false, 'BR'),
      ...collectFromList(document.getElementById('admin-products-br-aggregated'), true, 'BR'),
      ...collectFromList(document.getElementById('admin-products-intl-main'), false, 'INT')
    ];
  }

  function formatKitUnitBRL(n) {
    return Number(n || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    });
  }

  function defaultKitCostComponents(kind) {
    const fn = sm().defaultKitCostComponents;
    if (typeof fn === 'function') return fn(kind);
    const src = kind === 'intl' ? DEFAULT_KIT_COST_INTL_COMPONENTS : DEFAULT_KIT_COST_COMPONENTS;
    return src.map((c) => ({ ...c }));
  }

  function kitCostComponentsFrom(raw, kind = 'br') {
    const fn = sm().kitCostComponentsFrom;
    if (typeof fn === 'function') return fn(raw, kind);
    const fallback = defaultKitCostComponents(kind);
    if (raw == null) return fallback;
    const list = Array.isArray(raw?.components) ? raw.components : (Array.isArray(raw) ? raw : null);
    if (!Array.isArray(list) || !list.length) return fallback;
    const mapped = list.map((c, i) => ({
      id: String(c?.id || `kit-comp-${i + 1}`).trim() || `kit-comp-${i + 1}`,
      name: String(c?.name || '').trim(),
      buyQty: Number(c?.buyQty) > 0 ? Number(c.buyQty) : 0,
      buyPrice: Number(c?.buyPrice) >= 0 ? Number(c.buyPrice) : 0,
      yieldQty: Number(c?.yieldQty) > 0 ? Number(c.yieldQty) : 1,
      useQty: Number(c?.useQty) >= 0 ? Number(c.useQty) : 0,
      notes: String(c?.notes || '').trim()
    }));
    return mapped.some((c) => c.buyPrice > 0) ? mapped : fallback;
  }

  function updateKitCostTotals(kind) {
    const rootId = kind === 'intl' ? 'admin-kit-cost-intl-rows' : 'admin-kit-cost-rows';
    const totalId = kind === 'intl' ? 'admin-kit-cost-intl-total' : 'admin-kit-cost-total';
    const totalEl = document.getElementById(totalId);
    const rows = document.querySelectorAll(`#${rootId} .admin-kit-cost-row`);
    let total = 0;
    rows.forEach((row) => {
      const unit = kitComponentUnitCost({
        buyQty: Number(row.querySelector('[data-kit-buy-qty]')?.value) || 0,
        buyPrice: Number(row.querySelector('[data-kit-buy-price]')?.value) || 0,
        yieldQty: Number(row.querySelector('[data-kit-yield-qty]')?.value) || 1,
        useQty: Number(row.querySelector('[data-kit-use-qty]')?.value) || 0
      });
      total += unit;
      const unitEl = row.querySelector('[data-kit-unit-cost]');
      if (unitEl) unitEl.textContent = formatKitUnitBRL(unit);
    });
    if (totalEl) {
      const label = kind === 'intl' ? 'Custo do kit internacional' : 'Custo do kit Brasil';
      totalEl.innerHTML = `${label}: <strong>${formatKitUnitBRL(total)}</strong> por unidade vendida`;
    }
  }

  function renderKitCostList(rootId, kitCost, kind) {
    const root = document.getElementById(rootId);
    if (!root) return;
    const comps = kitCostComponentsFrom(kitCost, kind);
    root.innerHTML = comps.map((c, i) => {
      const unit = kitComponentUnitCost(c);
      return `<div class="admin-kit-cost-row" data-kit-id="${escapeHtml(c.id || `kit-comp-${i + 1}`)}">
        <label>Item
          <input type="text" data-kit-name value="${escapeHtml(c.name)}" placeholder="Ex.: Aplicador">
        </label>
        <label>Qtd comprada
          <input type="number" data-kit-buy-qty min="0" step="any" value="${c.buyQty || ''}" placeholder="10">
        </label>
        <label>Preço da compra (R$)
          <input type="number" data-kit-buy-price min="0" step="0.01" value="${c.buyPrice || ''}" placeholder="49">
        </label>
        <label>Rende / un.
          <input type="number" data-kit-yield-qty min="0" step="any" value="${c.yieldQty > 0 ? c.yieldQty : 1}" placeholder="30">
        </label>
        <label>Uso por kit
          <input type="number" data-kit-use-qty min="0" step="any" value="${c.useQty || ''}" placeholder="1">
        </label>
        <div class="admin-kit-cost-unit-wrap">
          <span class="admin-kit-cost-unit-label">Custo no kit</span>
          <span class="admin-kit-cost-unit" data-kit-unit-cost>${formatKitUnitBRL(unit)}</span>
        </div>
        <label>Nota
          <input type="text" data-kit-notes value="${escapeHtml(c.notes || '')}" placeholder="Opcional">
        </label>
        <button type="button" class="btn-secondary admin-kit-cost-remove" data-kit-remove title="Remover item"><i class="fas fa-trash"></i></button>
      </div>`;
    }).join('');
    updateKitCostTotals(kind);
  }

  function renderKitCost(config) {
    renderKitCostList('admin-kit-cost-rows', config?.kitCost, 'br');
    renderKitCostList('admin-kit-cost-intl-rows', config?.kitCostIntl, 'intl');
  }

  function collectKitCostFromDom(kind) {
    const rootId = kind === 'intl' ? 'admin-kit-cost-intl-rows' : 'admin-kit-cost-rows';
    const root = document.getElementById(rootId);
    if (!root) {
      const stored = kind === 'intl' ? currentConfig?.kitCostIntl : currentConfig?.kitCost;
      return { components: kitCostComponentsFrom(stored, kind) };
    }
    const components = [...root.querySelectorAll('.admin-kit-cost-row')].map((row, i) => ({
      id: row.getAttribute('data-kit-id') || `kit-comp-${i + 1}`,
      name: (row.querySelector('[data-kit-name]')?.value || '').trim(),
      buyQty: Number(row.querySelector('[data-kit-buy-qty]')?.value) || 0,
      buyPrice: Number(row.querySelector('[data-kit-buy-price]')?.value) || 0,
      yieldQty: Number(row.querySelector('[data-kit-yield-qty]')?.value) > 0
        ? Number(row.querySelector('[data-kit-yield-qty]')?.value)
        : 1,
      useQty: Number(row.querySelector('[data-kit-use-qty]')?.value) || 0,
      notes: (row.querySelector('[data-kit-notes]')?.value || '').trim()
    })).filter((c) => c.name);
    return { components };
  }

  let productSubtabsWired = false;

  function showProductSubtab(subtabId) {
    const container = document.getElementById('admin-tab-produtos');
    if (!container) return;
    const id = subtabId || 'br-main';
    container.querySelectorAll('[data-product-subtab]').forEach((tab) => {
      const active = tab.dataset.productSubtab === id;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    container.querySelectorAll('.admin-product-subpanel').forEach((panel) => {
      panel.hidden = panel.id !== `admin-products-${id}-panel`;
    });
    try { localStorage.setItem('stf_admin_product_subtab', id); } catch (e) { /* ignore */ }
  }

  function initProductSubtabs() {
    if (productSubtabsWired) return;
    const container = document.getElementById('admin-tab-produtos');
    if (!container) return;
    const tabs = container.querySelectorAll('[data-product-subtab]');
    if (!tabs.length) return;
    productSubtabsWired = true;
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => showProductSubtab(tab.dataset.productSubtab));
    });
    let saved = 'br-main';
    try { saved = localStorage.getItem('stf_admin_product_subtab') || 'br-main'; } catch (e) { /* ignore */ }
    if (saved === 'main') saved = 'br-main';
    if (saved === 'aggregated') saved = 'br-aggregated';
    showProductSubtab(saved);
  }

  const CHANNEL_SOCIAL_DEFAULTS = {
    instagram: 'https://www.instagram.com/sensortattoofix',
    tiktok: 'https://www.tiktok.com/@sensortattoofixofc',
    youtube: 'https://www.youtube.com/@Sensortattoofix-ofc',
    facebook: 'https://www.facebook.com/profile.php?id=61588858629597'
  };

  function fillChannelsForm(channels) {
    const f = els.configForm;
    if (!f) return;
    const socials = channels?.socials || {};
    const stores = channels?.stores || {};
    const set = (name, enabled, fallback) => {
      if (!f[name]) return;
      f[name].checked = enabled !== undefined ? enabled !== false : fallback;
    };
    const setUrl = (name, stored, fallback) => {
      if (!f[name]) return;
      f[name].value = String(stored || fallback || '').trim();
    };
    set('channelSocialInstagram', socials.instagram?.enabled, true);
    set('channelSocialTiktok', socials.tiktok?.enabled, true);
    set('channelSocialYoutube', socials.youtube?.enabled, true);
    set('channelSocialFacebook', socials.facebook?.enabled, true);
    setUrl('channelSocialInstagramUrl', socials.instagram?.url, CHANNEL_SOCIAL_DEFAULTS.instagram);
    setUrl('channelSocialTiktokUrl', socials.tiktok?.url, CHANNEL_SOCIAL_DEFAULTS.tiktok);
    setUrl('channelSocialYoutubeUrl', socials.youtube?.url, CHANNEL_SOCIAL_DEFAULTS.youtube);
    setUrl('channelSocialFacebookUrl', socials.facebook?.url, CHANNEL_SOCIAL_DEFAULTS.facebook);
    set('channelStoreOficial', stores.oficial?.enabled, true);
    set('channelStoreMercadolivre', stores.mercadolivre?.enabled, true);
    set('channelStoreShopee', stores.shopee?.enabled, true);
    set('channelStoreTiktokShop', stores.tiktok_shop?.enabled, true);
    set('channelStoreAmazon', stores.amazon?.enabled, true);
  }

  function collectChannelsForm(f, current) {
    const prev = current?.channels || {};
    const prevStore = prev.stores || {};
    const social = (id, checked, urlField, fallbackUrl) => {
      const typed = String(f[urlField]?.value || '').trim();
      const url = typed || fallbackUrl || '';
      return {
        enabled: !!checked,
        ...(url ? { url } : {})
      };
    };
    const store = (id, checked, fallbackUrl) => {
      const out = { enabled: !!checked };
      const url = String(prevStore[id]?.url || fallbackUrl || '').trim();
      if (url) out.url = url;
      return out;
    };
    return {
      socials: {
        instagram: social('instagram', f.channelSocialInstagram?.checked, 'channelSocialInstagramUrl', CHANNEL_SOCIAL_DEFAULTS.instagram),
        tiktok: social('tiktok', f.channelSocialTiktok?.checked, 'channelSocialTiktokUrl', CHANNEL_SOCIAL_DEFAULTS.tiktok),
        youtube: social('youtube', f.channelSocialYoutube?.checked, 'channelSocialYoutubeUrl', CHANNEL_SOCIAL_DEFAULTS.youtube),
        facebook: social('facebook', f.channelSocialFacebook?.checked, 'channelSocialFacebookUrl', CHANNEL_SOCIAL_DEFAULTS.facebook)
      },
      stores: {
        oficial: store('oficial', f.channelStoreOficial?.checked),
        mercadolivre: store('mercadolivre', f.channelStoreMercadolivre?.checked, 'https://produto.mercadolivre.com.br/MLB-6831525504-smartwatch-x-tatuagem-sensor-nao-funciona-lentes-reparadoras-_JM'),
        shopee: store('shopee', f.channelStoreShopee?.checked, 'https://shopee.com.br/product/479290797/58259628035/'),
        tiktok_shop: store('tiktok_shop', f.channelStoreTiktokShop?.checked, 'https://vt.tiktok.com/ZS9juMxSmKGjN-mns6O/'),
        amazon: store('amazon', f.channelStoreAmazon?.checked, 'https://www.amazon.com.br/dp/B0GYVBRGZS')
      }
    };
  }

  function fillForm(config) {
    const f = els.configForm;
    if (!f || !config) return;
    renderProducts(getProductsFromConfig(config));
    renderKitCost(config);
    if (f.mlFlexShippingCost) {
      f.mlFlexShippingCost.value = Number(config.mlFlexShippingCost) > 0
        ? Number(config.mlFlexShippingCost).toFixed(2)
        : '11.90';
    }
    initProductSubtabs();
    if (f.smartwatchModels) {
      f.smartwatchModels.value = (config.smartwatchModels || []).join('\n');
    }
    fillSmartwatchCatalog(config);
    const ship = config.shipping || {};
    const sender = ship.sender || {};
    const pix = config.pix || {};
    const formsubmit = config.formsubmit || {};
    if (f.shippingSenderBrand) f.shippingSenderBrand.value = sender.brand || '';
    if (f.shippingSenderCompany) f.shippingSenderCompany.value = sender.company || '';
    if (f.shippingSenderCnpj) f.shippingSenderCnpj.value = sender.cnpj || '';
    if (f.shippingOriginCep) f.shippingOriginCep.value = formatCepDisplay(ship.originCep || '');
    if (f.shippingSenderRua) f.shippingSenderRua.value = sender.rua || '';
    if (f.shippingSenderNumero) f.shippingSenderNumero.value = sender.numero || '';
    if (f.shippingSenderComplemento) f.shippingSenderComplemento.value = sender.complemento || '';
    if (f.shippingSenderBairro) f.shippingSenderBairro.value = sender.bairro || '';
    if (f.shippingSenderCidade) f.shippingSenderCidade.value = sender.cidade || '';
    if (f.shippingSenderUf) f.shippingSenderUf.value = sender.uf || '';
    renderShippingMethods(config.shippingMethods || defaultShippingMethods());
    const motoboy = { ...defaultMotoboyShipping(), ...(config.motoboyShipping || {}) };
    if (f.motoboyEnabled) f.motoboyEnabled.checked = motoboy.enabled !== false;
    if (f.motoboyBasePrice) f.motoboyBasePrice.value = motoboy.basePrice ?? 12;
    if (f.motoboyPricePerKm) f.motoboyPricePerKm.value = motoboy.pricePerKm ?? 2.8;
    if (f.motoboyMinPrice) f.motoboyMinPrice.value = motoboy.minPrice ?? 18;
    if (f.motoboyMaxRadiusKm) f.motoboyMaxRadiusKm.value = motoboy.maxRadiusKm ?? 35;
    if (f.motoboyRoadFactor) f.motoboyRoadFactor.value = motoboy.roadFactor ?? 1.25;
    if (f.motoboyDeliveryHours) f.motoboyDeliveryHours.value = motoboy.deliveryHours ?? 24;
    renderMotoboyCouriers(motoboy.couriers || []);
    renderCoupons(config.coupons || []);
    renderHomeFaq(config.homeFaq || []);
    renderHomeReviews(config.homeReviews || []);
    renderIntlShipping(config.internationalShipping || {});
    if (f.intlSurcharge) f.intlSurcharge.value = config.internationalSurcharge ?? 40;
    if (f.intlShippingMultiplier) f.intlShippingMultiplier.value = config.internationalShippingMultiplier ?? 1;
    const intlProd = config.internationalProduct || {};
    if (f.intlProductTitle) f.intlProductTitle.value = intlProd.title || '';
    if (f.intlProductHint) f.intlProductHint.value = intlProd.hint || intlProd.notice || '';
    if (f.intlProductEncomendaNotice) f.intlProductEncomendaNotice.value = intlProd.encomendaNotice || '';
    if (f.intlProductDocumentNotice) f.intlProductDocumentNotice.value = intlProd.documentNotice || '';
    if (f.shippingWeight) f.shippingWeight.value = ship.weightGrams ?? 5;
    if (f.shippingServiceCode) f.shippingServiceCode.value = ship.serviceCode || '04227';
    if (f.intlServiceCode) f.intlServiceCode.value = ship.intlServiceCode || '45128';
    if (f.shippingLength) f.shippingLength.value = ship.lengthCm || 16;
    if (f.shippingWidth) f.shippingWidth.value = ship.widthCm || 12;
    if (f.shippingHeight) f.shippingHeight.value = ship.heightCm || 3;
    if (f.pixKey) f.pixKey.value = pix.key || '';
    if (f.pixKeyType) f.pixKeyType.value = pix.keyType || 'cnpj';
    if (f.pixMerchantName) f.pixMerchantName.value = pix.merchantName || '';
    if (f.pixMerchantCity) f.pixMerchantCity.value = pix.merchantCity || '';
    if (f.whatsapp) f.whatsapp.value = config.whatsapp || '';
    fillChannelsForm(config.channels);
    if (f.formsubmitEmail) f.formsubmitEmail.value = formsubmit.email || '';
    if (f.formsubmitSubject) f.formsubmitSubject.value = formsubmit.subject || '';
    const emails = { ...DEFAULT_EMAILS, ...(config.emails || {}) };
    if (f.emailFrom) f.emailFrom.value = emails.from || '';
    if (f.emailShopPaidSubject) f.emailShopPaidSubject.value = emails.shopPaidSubject || '';
    if (f.emailCustomerOrderSubject) f.emailCustomerOrderSubject.value = emails.customerOrderSubject || '';
    if (f.emailCustomerPixSubject) f.emailCustomerPixSubject.value = emails.customerPixSubject || '';
    if (f.emailCustomerPaidSubject) f.emailCustomerPaidSubject.value = emails.customerPaidSubject || '';
    if (f.emailMotoboySubject) f.emailMotoboySubject.value = emails.motoboySubject || '';
    if (f.emailCouponSubject) f.emailCouponSubject.value = emails.couponSubject || '';
    if (f.emailTestSubject) f.emailTestSubject.value = emails.testSubject || '';
    if (f.emailTestTo) f.emailTestTo.value = emails.testTo || '';
    if (f.emailPendingPaypal) f.emailPendingPaypal.value = emails.pendingPaypal || '';
    if (f.emailPendingCard) f.emailPendingCard.value = emails.pendingCard || '';
    if (f.emailPendingMpCheckout) f.emailPendingMpCheckout.value = emails.pendingMpCheckout || '';
    if (f.emailPaidDefault) f.emailPaidDefault.value = emails.paidDefault || '';
    if (f.emailPaidMotoboy) f.emailPaidMotoboy.value = emails.paidMotoboy || '';
    if (f.emailPaidUberTracking) f.emailPaidUberTracking.value = emails.paidUberTracking || '';
    if (f.emailPaidUberPending) f.emailPaidUberPending.value = emails.paidUberPending || '';
    if (f.emailPaidIntlLens) f.emailPaidIntlLens.value = emails.paidIntlLens || '';
    if (f.emailPaidIntlKit) f.emailPaidIntlKit.value = emails.paidIntlKit || '';
    if (f.emailCustomerTrackingSubject) {
      f.emailCustomerTrackingSubject.value = emails.customerTrackingSubject || DEFAULT_EMAILS.customerTrackingSubject;
    }
    if (f.emailTrackingAvailable) {
      f.emailTrackingAvailable.value = emails.trackingAvailable || DEFAULT_EMAILS.trackingAvailable;
    }
    if (f.emailAbandonedSubject) {
      f.emailAbandonedSubject.value = emails.abandonedSubject || DEFAULT_EMAILS.abandonedSubject;
    }
    if (f.emailAbandonedWeeklySubject) {
      f.emailAbandonedWeeklySubject.value = emails.abandonedWeeklySubject || DEFAULT_EMAILS.abandonedWeeklySubject;
    }
    if (f.emailAbandonedIntro) {
      f.emailAbandonedIntro.value = emails.abandonedIntro || DEFAULT_EMAILS.abandonedIntro;
    }
    if (f.emailAbandonedWeeklyIntro) {
      f.emailAbandonedWeeklyIntro.value = emails.abandonedWeeklyIntro || DEFAULT_EMAILS.abandonedWeeklyIntro;
    }
    if (f.emailAbandonedCta) {
      f.emailAbandonedCta.value = emails.abandonedCta || DEFAULT_EMAILS.abandonedCta;
    }
    if (f.emailPixGreeting) f.emailPixGreeting.value = emails.pixGreeting || '';
    if (f.emailPixIntro) f.emailPixIntro.value = emails.pixIntro || '';
    if (f.emailPixFooter) f.emailPixFooter.value = emails.pixFooter || '';
    if (f.apiBaseUrl) {
      f.apiBaseUrl.value = resolveApiBaseUrl((config.api && config.api.baseUrl) || bootstrap.configApiUrl || '');
    }
    const paypalCfg = config.payments?.paypal || {};
    if (f.paypalIntlEnabled) f.paypalIntlEnabled.checked = paypalCfg.internationalEnabled !== false;
    if (f.paypalBrEnabled) f.paypalBrEnabled.checked = paypalCfg.brazilEnabled !== false;
    if (f.paypalAppLabel) f.paypalAppLabel.value = paypalCfg.appLabel || '';
    const cardBrCfg = config.payments?.cardBr || {};
    if (f.cardBrProvider) {
      f.cardBrProvider.value = cardBrCfg.provider === 'mercadopago' ? 'mercadopago' : 'asaas';
    }
    if (f.cardBrFallbackAlt) {
      const fb = cardBrCfg.fallbackToAlternate ?? cardBrCfg.fallbackToMercadoPago;
      f.cardBrFallbackAlt.checked = fb !== false;
    }
    const pixBrCfg = config.payments?.pixBr || {};
    if (f.pixBrProvider) {
      f.pixBrProvider.value = pixBrCfg.provider === 'asaas' ? 'asaas' : 'mercadopago';
    }
    if (f.pixBrFallbackAlt) {
      f.pixBrFallbackAlt.checked = pixBrCfg.fallbackToAlternate !== false;
    }
    if (els.updatedAt) {
      els.updatedAt.textContent = config.updatedAt
        ? 'Última atualização: ' + new Date(config.updatedAt).toLocaleString('pt-BR')
        : '';
    }
    showPixConfigWarning(pix);
  }

  function showPixConfigWarning(pix) {
    const el = document.getElementById('pix-config-warn');
    if (!el) return;
    const key = String(pix?.key || '').trim();
    const type = pix?.keyType || 'cnpj';
    const digits = key.replace(/\D/g, '');
    let msg = '';
    if (key.includes('@') && type !== 'email') {
      msg = 'A chave parece e-mail, mas o tipo não é E-mail. No checkout normal (Mercado Pago) isso não afeta; se cair no PIX reserva, o site usa o CNPJ do cadastro (data/store-config.json).';
    } else if (type === 'cnpj' && key && digits.length !== 14) {
      msg = 'Tipo CNPJ exige 14 dígitos na chave (ex.: 29321223000132).';
    } else if (type === 'email' && key && !key.includes('@')) {
      msg = 'Tipo E-mail exige um endereço de e-mail válido na chave.';
    }
    el.textContent = msg;
    el.hidden = !msg;
  }

  function validatePixConfig(pix) {
    showPixConfigWarning(pix);
  }

  function formatCepDisplay(cep) {
    const d = String(cep || '').replace(/\D/g, '');
    if (d.length !== 8) return cep || '';
    return `${d.slice(0, 5)}-${d.slice(5)}`;
  }

  function maskCep(value) {
    const d = String(value || '').replace(/\D/g, '').slice(0, 8);
    if (d.length <= 5) return d;
    return `${d.slice(0, 5)}-${d.slice(5)}`;
  }

  async function lookupOriginCep() {
    const f = els.configForm;
    const cep = (f.shippingOriginCep?.value || '').replace(/\D/g, '');
    if (cep.length !== 8) {
      showStatus('Informe um CEP válido com 8 dígitos.', 'error', 'frete');
      return;
    }
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (data.erro) throw new Error('CEP não encontrado.');
      if (f.shippingSenderRua) f.shippingSenderRua.value = data.logradouro || f.shippingSenderRua.value;
      if (f.shippingSenderBairro) f.shippingSenderBairro.value = data.bairro || f.shippingSenderBairro.value;
      if (f.shippingSenderCidade) f.shippingSenderCidade.value = data.localidade || '';
      if (f.shippingSenderUf) f.shippingSenderUf.value = data.uf || '';
      showStatus('Endereço preenchido pelo CEP.', 'success', 'frete');
    } catch (err) {
      showStatus(err.message || 'Erro ao buscar CEP.', 'error', 'frete');
    }
  }

  function collectForm() {
    const f = els.configForm;
    const products = collectProductsFromDom();
    const primary = products.find((p) => p.active !== false && !p.aggregated && productMarketsOf(p).includes('BR'))
      || products.find((p) => p.active !== false && !p.aggregated)
      || products.find((p) => !p.aggregated)
      || products[0]
      || {};
    return {
      product: {
        name: primary.name || '',
        description: primary.description || '',
        price: parseFloat(primary.price) || 0,
        image: primary.image || ''
      },
      products,
      shipping: {
        originCep: (f.shippingOriginCep?.value || '').replace(/\D/g, ''),
        weightGrams: parseFloat(f.shippingWeight?.value) || 5,
        lengthCm: parseFloat(f.shippingLength?.value) || 16,
        widthCm: parseFloat(f.shippingWidth?.value) || 12,
        heightCm: parseFloat(f.shippingHeight?.value) || 3,
        serviceCode: f.shippingServiceCode?.value.trim() || '04227',
        intlServiceCode: f.intlServiceCode?.value.trim() || '45128',
        serviceName: 'Mini Envios',
        sender: {
          brand: f.shippingSenderBrand?.value.trim() || '',
          company: f.shippingSenderCompany?.value.trim() || '',
          cnpj: f.shippingSenderCnpj?.value.trim() || '',
          rua: f.shippingSenderRua?.value.trim() || '',
          numero: f.shippingSenderNumero?.value.trim() || '',
          complemento: f.shippingSenderComplemento?.value.trim() || '',
          bairro: f.shippingSenderBairro?.value.trim() || '',
          cidade: f.shippingSenderCidade?.value.trim() || '',
          uf: (f.shippingSenderUf?.value || '').trim().toUpperCase(),
          pais: 'Brasil'
        }
      },
      pix: {
        key: f.pixKey?.value.trim() || '',
        keyType: f.pixKeyType?.value || 'cnpj',
        merchantName: f.pixMerchantName?.value.trim() || '',
        merchantCity: f.pixMerchantCity?.value.trim() || ''
      },
      formsubmit: {
        email: f.formsubmitEmail.value.trim(),
        subject: f.formsubmitSubject.value.trim()
      },
      emails: {
        from: f.emailFrom?.value.trim() || DEFAULT_EMAILS.from,
        shopPaidSubject: f.emailShopPaidSubject?.value.trim() || DEFAULT_EMAILS.shopPaidSubject,
        customerOrderSubject: f.emailCustomerOrderSubject?.value.trim() || DEFAULT_EMAILS.customerOrderSubject,
        customerPixSubject: f.emailCustomerPixSubject?.value.trim() || DEFAULT_EMAILS.customerPixSubject,
        customerPaidSubject: f.emailCustomerPaidSubject?.value.trim() || DEFAULT_EMAILS.customerPaidSubject,
        motoboySubject: f.emailMotoboySubject?.value.trim() || DEFAULT_EMAILS.motoboySubject,
        couponSubject: f.emailCouponSubject?.value.trim() || DEFAULT_EMAILS.couponSubject,
        testSubject: f.emailTestSubject?.value.trim() || DEFAULT_EMAILS.testSubject,
        testTo: f.emailTestTo?.value.trim() || '',
        pendingPaypal: f.emailPendingPaypal?.value.trim() || DEFAULT_EMAILS.pendingPaypal,
        pendingCard: f.emailPendingCard?.value.trim() || DEFAULT_EMAILS.pendingCard,
        pendingMpCheckout: f.emailPendingMpCheckout?.value.trim() || DEFAULT_EMAILS.pendingMpCheckout,
        paidDefault: f.emailPaidDefault?.value.trim() || DEFAULT_EMAILS.paidDefault,
        paidMotoboy: f.emailPaidMotoboy?.value.trim() || DEFAULT_EMAILS.paidMotoboy,
        paidUberTracking: f.emailPaidUberTracking?.value.trim() || DEFAULT_EMAILS.paidUberTracking,
        paidUberPending: f.emailPaidUberPending?.value.trim() || DEFAULT_EMAILS.paidUberPending,
        paidIntlLens: f.emailPaidIntlLens?.value.trim() || DEFAULT_EMAILS.paidIntlLens,
        paidIntlKit: f.emailPaidIntlKit?.value.trim() || DEFAULT_EMAILS.paidIntlKit,
        customerTrackingSubject: f.emailCustomerTrackingSubject?.value.trim()
          || DEFAULT_EMAILS.customerTrackingSubject,
        trackingAvailable: f.emailTrackingAvailable?.value.trim() || DEFAULT_EMAILS.trackingAvailable,
        abandonedSubject: f.emailAbandonedSubject?.value.trim() || DEFAULT_EMAILS.abandonedSubject,
        abandonedWeeklySubject: f.emailAbandonedWeeklySubject?.value.trim()
          || DEFAULT_EMAILS.abandonedWeeklySubject,
        abandonedIntro: f.emailAbandonedIntro?.value.trim() || DEFAULT_EMAILS.abandonedIntro,
        abandonedWeeklyIntro: f.emailAbandonedWeeklyIntro?.value.trim()
          || DEFAULT_EMAILS.abandonedWeeklyIntro,
        abandonedCta: f.emailAbandonedCta?.value.trim() || DEFAULT_EMAILS.abandonedCta,
        pixGreeting: f.emailPixGreeting?.value.trim() || DEFAULT_EMAILS.pixGreeting,
        pixIntro: f.emailPixIntro?.value.trim() || DEFAULT_EMAILS.pixIntro,
        pixFooter: f.emailPixFooter?.value.trim() || DEFAULT_EMAILS.pixFooter
      },
      whatsapp: f.whatsapp.value.replace(/\D/g, ''),
      channels: collectChannelsForm(f, currentConfig),
      siteUrl: currentConfig?.siteUrl || 'https://www.sensortattoofix.com.br',
      api: {
        baseUrl: f.apiBaseUrl.value.trim()
      },
      payments: {
        paypal: {
          internationalEnabled: f.paypalIntlEnabled?.checked !== false,
          brazilEnabled: f.paypalBrEnabled?.checked !== false,
          appLabel: f.paypalAppLabel?.value.trim().slice(0, 120) || ''
        },
        cardBr: {
          provider: f.cardBrProvider?.value === 'mercadopago' ? 'mercadopago' : 'asaas',
          fallbackToAlternate: f.cardBrFallbackAlt?.checked !== false
        },
        pixBr: {
          provider: f.pixBrProvider?.value === 'asaas' ? 'asaas' : 'mercadopago',
          fallbackToAlternate: f.pixBrFallbackAlt?.checked !== false
        }
      },
      smartwatchModels: flatModelsFromAdminCatalog(smartwatchCatalogState),
      smartwatchCatalog: collectSmartwatchCatalog(),
      internationalShipping: collectIntlShipping(),
      internationalSurcharge: Math.max(0, parseFloat(f.intlSurcharge?.value) || 0),
      internationalShippingMultiplier: Math.max(1, parseFloat(f.intlShippingMultiplier?.value) || 1),
      internationalProduct: {
        title: f.intlProductTitle?.value.trim() || 'Envio internacional',
        hint: f.intlProductHint?.value.trim() || '',
        encomendaNotice: f.intlProductEncomendaNotice?.value.trim() || '',
        documentNotice: f.intlProductDocumentNotice?.value.trim() || ''
      },
      shippingMethods: syncMotoboyShippingMethods(collectShippingMethods(), collectMotoboyShipping()),
      motoboyShipping: collectMotoboyShipping(),
      coupons: collectCoupons(),
      kitCost: collectKitCostFromDom('br'),
      kitCostIntl: collectKitCostFromDom('intl'),
      kitCostVersion: 3,
      mlFlexShippingCost: Math.max(0, parseFloat(f.mlFlexShippingCost?.value) || (currentConfig?.mlFlexShippingCost || 0)),
      homeFaq: collectHomeFaq(),
      homeReviews: collectHomeReviews(),
      updatedAt: new Date().toISOString()
    };
  }

  const ADMIN_SAVE_TABS = new Set(['produtos', 'frete', 'pagamento', 'contato', 'cupons', 'api', 'smartwatches', 'clientes', 'faq', 'elogios']);
  const CADASTROS_SECTIONS = new Set(['pessoas', 'produtos', 'smartwatches', 'kit', 'pagamento', 'frete', 'cupons', 'faq', 'elogios', 'contato']);
  const CADASTROS_PANEL_BY_SECTION = {
    pessoas: 'clientes',
    produtos: 'produtos',
    smartwatches: 'smartwatches',
    kit: 'produtos',
    pagamento: 'pagamento',
    frete: 'frete',
    cupons: 'cupons',
    faq: 'faq',
    elogios: 'elogios',
    contato: 'contato'
  };
  const OUTRO_MODELO_LABEL = 'Outro modelo (informar nas observações)';
  const SW_SMARTBAND_RE = /\b((smart\s*)?band|mi\s*band|honor\s*band|huawei\s*band|amazfit\s*band|galaxy\s*fit|vivosmart|v[ií]vofit|fitbit\s*(charge|inspire|ace|luxe|air))\b/i;
  let smartwatchCatalogState = {};
  let swCatalogWired = false;

  function isSwBrandPlaceholder(row) {
    return !!(row && row._brandPlaceholder);
  }

  function swRealCatalogRows(brand) {
    return (smartwatchCatalogState[brand] || []).filter((r) => !isSwBrandPlaceholder(r));
  }

  function swBrandHasKind(brand, kind) {
    const rows = smartwatchCatalogState[brand] || [];
    if (rows.some((r) => !isSwBrandPlaceholder(r) && swRowMatchesKind(r, kind))) return true;
    return rows.some((r) => isSwBrandPlaceholder(r) && r.kind === kind);
  }

  function normalizeSwBrandName(raw) {
    return String(raw || '').trim().replace(/\s+/g, ' ');
  }

  function createSwBrand(rawBrand, kind) {
    const brand = normalizeSwBrandName(rawBrand);
    if (!brand) {
      alert('Informe o nome da marca.');
      return '';
    }
    if (brand === OUTRO_MODELO_LABEL || brand === 'Outros') {
      alert('“Outros” é reservado. Escolha outro nome para a marca.');
      return '';
    }
    if (smartwatchCatalogState[brand] && swRealCatalogRows(brand).length) {
      alert(`A marca “${brand}” já existe. Selecione-a na lista e adicione modelos.`);
      return '';
    }
    smartwatchCatalogState[brand] = [{ label: '', kind, _brandPlaceholder: true }];
    syncSmartwatchModelsTextarea();
    return brand;
  }

  function stripSwBrandPlaceholders(brand) {
    if (!smartwatchCatalogState[brand]) return;
    smartwatchCatalogState[brand] = (smartwatchCatalogState[brand] || []).filter((r) => !isSwBrandPlaceholder(r));
    if (!smartwatchCatalogState[brand].length) delete smartwatchCatalogState[brand];
  }

  function swInferKind(label, explicit) {
    const raw = String(explicit || '').toLowerCase();
    if (raw === 'band' || raw === 'smartband') return 'smartband';
    if (raw === 'watch' || raw === 'smartwatch') return 'smartwatch';
    return SW_SMARTBAND_RE.test(String(label || '')) ? 'smartband' : 'smartwatch';
  }

  function swBrandOf(label) {
    const m = String(label || '');
    if (m.startsWith('Apple')) return 'Apple';
    if (m.startsWith('Samsung')) return 'Samsung';
    if (m.startsWith('Garmin')) return 'Garmin';
    if (m.startsWith('Amazfit')) return 'Amazfit';
    if (m.startsWith('Zepp')) return 'Zepp';
    if (m.startsWith('Xiaomi') || m.startsWith('Redmi')) return 'Xiaomi';
    if (m.startsWith('Huawei')) return 'Huawei';
    if (m.startsWith('Google') || m.startsWith('Pixel')) return 'Google';
    if (m.startsWith('Mobvoi') || m.startsWith('TicWatch')) return 'Mobvoi';
    if (m.startsWith('Fitbit')) return 'Fitbit';
    if (m.startsWith('Polar')) return 'Polar';
    if (m.startsWith('Honor')) return 'Honor';
    if (m.startsWith('Whoop')) return 'Whoop';
    if (m.startsWith('Oura')) return 'Oura';
    if (m.startsWith('Realme')) return 'Realme';
    if (m.startsWith('Oppo')) return 'Oppo';
    if (m.startsWith('OnePlus')) return 'OnePlus';
    if (m.startsWith('Misfit')) return 'Misfit';
    if (m.startsWith('Jawbone')) return 'Jawbone';
    if (m.startsWith('Withings')) return 'Withings';
    if (m.startsWith('Suunto')) return 'Suunto';
    if (m.startsWith('Coros')) return 'Coros';
    return 'Outros';
  }

  function swRowMatchesKind(row, kind) {
    if (!row) return false;
    if (Array.isArray(row.kinds) && row.kinds.length) return row.kinds.includes(kind);
    return swInferKind(row.label, row.kind) === kind;
  }

  function normalizeAdminCatalog(catalog, models) {
    const out = {};
    const push = (brand, row) => {
      if (row?._brandPlaceholder) {
        const b = brand || 'Outros';
        const kind = swInferKind('', row?.kind || row?.deviceType);
        if (!out[b]) out[b] = [];
        const existing = out[b].find((r) => isSwBrandPlaceholder(r) && r.kind === kind);
        if (!existing) out[b].push({ label: '', kind, _brandPlaceholder: true });
        return;
      }
      const label = String(row?.label || row || '').trim();
      if (!label || label === OUTRO_MODELO_LABEL) return;
      const b = brand || swBrandOf(label);
      const kind = swInferKind(label, row?.kind || row?.deviceType);
      const sensor = row?.sensorMm != null && row?.sensorMm !== '' ? Number(row.sensorMm) : null;
      const size = row?.sizeMm != null && row?.sizeMm !== '' ? Number(row.sizeMm) : null;
      const lensW = row?.lensWmm != null && row?.lensWmm !== '' ? Number(row.lensWmm) : null;
      const lensH = row?.lensHmm != null && row?.lensHmm !== '' ? Number(row.lensHmm) : null;
      if (!out[b]) out[b] = [];
      const existing = out[b].find((r) => r.label === label);
      const next = {
        label,
        model: String(row?.model || label).trim() || label,
        sizeMm: Number.isFinite(size) && size > 0 ? size : null,
        kind,
        sensorMm: Number.isFinite(sensor) && sensor > 0 ? sensor : null
      };
      if (Number.isFinite(lensW) && lensW > 0) next.lensWmm = lensW;
      if (Number.isFinite(lensH) && lensH > 0) next.lensHmm = lensH;
      if (Array.isArray(row?.kinds) && row.kinds.length) next.kinds = [...row.kinds];
      if (existing) Object.assign(existing, next);
      else out[b].push(next);
    };
    Object.entries(catalog || {}).forEach(([brand, rows]) => {
      if (!rows?.length) {
        if (!out[brand]) out[brand] = [];
        return;
      }
      (rows || []).forEach((row) => push(brand, row));
    });
    (models || []).forEach((label) => {
      const b = swBrandOf(label);
      if (!out[b]?.some((r) => r.label === label)) push(b, { label, model: label });
    });
    return out;
  }

  function flatModelsFromAdminCatalog(catalog) {
    const labels = [];
    const seen = new Set();
    Object.keys(catalog || {}).sort().forEach((brand) => {
      (catalog[brand] || []).forEach((row) => {
        if (!row?.label || isSwBrandPlaceholder(row) || seen.has(row.label)) return;
        seen.add(row.label);
        labels.push(row.label);
      });
    });
    if (!seen.has(OUTRO_MODELO_LABEL)) labels.push(OUTRO_MODELO_LABEL);
    return labels;
  }

  function syncSmartwatchModelsTextarea() {
    const ta = document.getElementById('admin-smartwatch-models');
    if (ta) ta.value = flatModelsFromAdminCatalog(smartwatchCatalogState).join('\n');
  }

  function syncSwDimensionUi(kind) {
    const isBand = kind === 'smartband';
    document.querySelectorAll('.admin-sw-bulk-watch').forEach((el) => { el.hidden = isBand; });
    document.querySelectorAll('.admin-sw-bulk-band').forEach((el) => { el.hidden = !isBand; });
    document.querySelectorAll('.admin-sw-new-watch').forEach((el) => { el.hidden = isBand; });
    document.querySelectorAll('.admin-sw-new-band').forEach((el) => { el.hidden = !isBand; });
    const applyBtn = document.getElementById('admin-sw-apply-sensor');
    if (applyBtn) {
      applyBtn.title = isBand
        ? 'Aplica largura × altura a todos os modelos smartband da marca filtrada'
        : 'Aplica o diâmetro (mm) a todos os modelos smartwatch da marca filtrada';
    }
  }

  function renderSmartwatchCatalogTable() {
    const kindEl = document.getElementById('admin-sw-kind');
    const brandEl = document.getElementById('admin-sw-brand');
    const tbody = document.getElementById('admin-sw-tbody');
    const summary = document.getElementById('admin-sw-summary');
    const thead = document.getElementById('admin-sw-thead');
    if (!kindEl || !brandEl || !tbody) return;
    const kind = kindEl.value || 'smartwatch';
    syncSwDimensionUi(kind);
    const isBand = kind === 'smartband';
    if (thead) {
      thead.innerHTML = isBand
        ? '<th>Modelo (checkout)</th><th style="width:96px">Largura (mm)</th><th style="width:96px">Altura (mm)</th><th style="width:70px"></th>'
        : '<th>Modelo (checkout)</th><th style="width:110px">Sensor Ø (mm)</th><th style="width:70px"></th>';
    }
    const brands = Object.keys(smartwatchCatalogState)
      .filter((b) => swBrandHasKind(b, kind))
      .sort();
    const prevBrand = brandEl.value;
    brandEl.innerHTML = brands.map((b) => `<option value="${escapeHtml(b)}">${escapeHtml(b)}</option>`).join('')
      || '<option value="">—</option>';
    if (prevBrand && brands.includes(prevBrand)) brandEl.value = prevBrand;
    else if (brands.length) brandEl.value = brands[0];
    const brand = brandEl.value;
    const rows = swRealCatalogRows(brand)
      .filter((r) => swRowMatchesKind(r, kind))
      .sort((a, b) => String(a.label).localeCompare(String(b.label), 'pt'));
    if (summary) {
      summary.textContent = brand
        ? `${rows.length} modelo(s) · ${kind === 'smartband' ? 'Smartband' : 'Smartwatch'} · ${brand}`
        : 'Nenhum modelo neste filtro.';
    }
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="${isBand ? 4 : 3}" class="admin-meta">Nenhum modelo nesta marca/tipo. Adicione abaixo.</td></tr>`;
      return;
    }
    tbody.innerHTML = rows.map((row, idx) => {
      if (isBand) {
        return `
      <tr data-sw-label="${escapeHtml(row.label)}">
        <td><input type="text" class="admin-sw-label" value="${escapeHtml(row.label)}" data-idx="${idx}"></td>
        <td><input type="number" class="admin-sw-lensw" min="0" step="0.1" inputmode="decimal"
          value="${row.lensWmm != null ? escapeHtml(String(row.lensWmm)) : ''}" placeholder="—" data-idx="${idx}"></td>
        <td><input type="number" class="admin-sw-lensh" min="0" step="0.01" inputmode="decimal"
          value="${row.lensHmm != null ? escapeHtml(String(row.lensHmm)) : ''}" placeholder="—" data-idx="${idx}"></td>
        <td><button type="button" class="btn-secondary admin-sw-remove" data-label="${escapeHtml(row.label)}" title="Remover">×</button></td>
      </tr>`;
      }
      return `
      <tr data-sw-label="${escapeHtml(row.label)}">
        <td><input type="text" class="admin-sw-label" value="${escapeHtml(row.label)}" data-idx="${idx}"></td>
        <td><input type="number" class="admin-sw-sensor" min="0" step="0.1" inputmode="decimal"
          value="${row.sensorMm != null ? escapeHtml(String(row.sensorMm)) : ''}" placeholder="—" data-idx="${idx}"></td>
        <td><button type="button" class="btn-secondary admin-sw-remove" data-label="${escapeHtml(row.label)}" title="Remover">×</button></td>
      </tr>`;
    }).join('');
  }

  function findCatalogRow(label) {
    for (const brand of Object.keys(smartwatchCatalogState)) {
      const hit = (smartwatchCatalogState[brand] || []).find((r) => r.label === label);
      if (hit) return { brand, row: hit };
    }
    return null;
  }

  function buildSmartwatchCatalogExportWorkbook() {
    const rows = [['Tipo', 'Marca', 'Modelo', 'Sensor Ø (mm)', 'Largura (mm)', 'Altura (mm)']];
    Object.keys(smartwatchCatalogState || {})
      .sort((a, b) => a.localeCompare(b, 'pt'))
      .forEach((brand) => {
        (smartwatchCatalogState[brand] || [])
          .filter((row) => !isSwBrandPlaceholder(row))
          .slice()
          .sort((a, b) => String(a.label).localeCompare(String(b.label), 'pt'))
          .forEach((row) => {
            const kind = swInferKind(row.label, row.kind);
            const sensor = row.sensorMm != null && Number.isFinite(Number(row.sensorMm)) && Number(row.sensorMm) > 0
              ? Number(row.sensorMm)
              : '';
            const lensW = row.lensWmm != null && Number.isFinite(Number(row.lensWmm)) && Number(row.lensWmm) > 0
              ? Number(row.lensWmm)
              : '';
            const lensH = row.lensHmm != null && Number.isFinite(Number(row.lensHmm)) && Number(row.lensHmm) > 0
              ? Number(row.lensHmm)
              : '';
            rows.push([
              kind === 'smartband' ? 'Smartband' : 'Smartwatch',
              brand,
              String(row.label || ''),
              sensor,
              lensW,
              lensH
            ]);
          });
      });
    const cellsXml = rows.map((row) => {
      const cells = row.map((cell) => {
        const type = typeof cell === 'number' && Number.isFinite(cell) ? 'Number' : 'String';
        const value = type === 'Number' ? cell : xmlEscape(cell);
        return `<Cell><Data ss:Type="${type}">${value}</Data></Cell>`;
      }).join('');
      return `<Row>${cells}</Row>`;
    }).join('');
    return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Worksheet ss:Name="Modelos"><Table>${cellsXml}</Table></Worksheet>
</Workbook>`;
  }

  function exportSmartwatchCatalogExcel() {
    const btn = document.getElementById('admin-sw-export');
    if (btn) btn.disabled = true;
    try {
      syncSmartwatchModelsTextarea();
      const count = Object.values(smartwatchCatalogState || {}).reduce(
        (n, rows) => n + (rows || []).filter((r) => !isSwBrandPlaceholder(r)).length,
        0
      );
      if (!count) {
        alert('Nenhum modelo para exportar.');
        return;
      }
      const workbook = buildSmartwatchCatalogExportWorkbook();
      const stamp = new Date().toISOString().slice(0, 10);
      downloadTextFile(workbook, `smartwatches-${stamp}.xls`, 'application/vnd.ms-excel;charset=utf-8');
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  function wireSmartwatchCatalogUi() {
    if (swCatalogWired) return;
    swCatalogWired = true;
    const kindEl = document.getElementById('admin-sw-kind');
    const brandEl = document.getElementById('admin-sw-brand');
    const tbody = document.getElementById('admin-sw-tbody');
    kindEl?.addEventListener('change', () => renderSmartwatchCatalogTable());
    brandEl?.addEventListener('change', () => renderSmartwatchCatalogTable());
    document.getElementById('admin-sw-export')?.addEventListener('click', () => exportSmartwatchCatalogExcel());
    document.getElementById('admin-sw-add-brand')?.addEventListener('click', () => {
      const kind = kindEl?.value || 'smartwatch';
      const brand = createSwBrand(document.getElementById('admin-sw-new-brand')?.value, kind);
      if (!brand) return;
      const newBrandInput = document.getElementById('admin-sw-new-brand');
      if (newBrandInput) newBrandInput.value = '';
      renderSmartwatchCatalogTable();
      if (brandEl) brandEl.value = brand;
      renderSmartwatchCatalogTable();
    });
    document.getElementById('admin-sw-apply-sensor')?.addEventListener('click', () => {
      const kind = kindEl?.value || 'smartwatch';
      const brand = brandEl?.value;
      if (!brand || !smartwatchCatalogState[brand]) return;
      if (kind === 'smartband') {
        const bulkW = Number(document.getElementById('admin-sw-lensw-bulk')?.value);
        const bulkH = Number(document.getElementById('admin-sw-lensh-bulk')?.value);
        if (!(bulkW > 0) || !(bulkH > 0)) {
          alert('Informe largura e altura (mm) para aplicar na lista smartband.');
          return;
        }
        smartwatchCatalogState[brand].forEach((row) => {
          if (isSwBrandPlaceholder(row)) return;
          if (swRowMatchesKind(row, kind)) {
            row.lensWmm = bulkW;
            row.lensHmm = bulkH;
            delete row.sensorMm;
          }
        });
      } else {
        const bulk = Number(document.getElementById('admin-sw-sensor-bulk')?.value);
        if (!(bulk > 0)) {
          alert('Informe o diâmetro do sensor (mm) para aplicar na lista.');
          return;
        }
        smartwatchCatalogState[brand].forEach((row) => {
          if (isSwBrandPlaceholder(row)) return;
          if (swRowMatchesKind(row, kind)) row.sensorMm = bulk;
        });
      }
      syncSmartwatchModelsTextarea();
      renderSmartwatchCatalogTable();
    });
    document.getElementById('admin-sw-add')?.addEventListener('click', () => {
      const label = String(document.getElementById('admin-sw-new-label')?.value || '').trim();
      if (!label) {
        alert('Informe o nome do modelo.');
        return;
      }
      if (label === OUTRO_MODELO_LABEL) {
        alert('“Outro modelo…” já é gerado automaticamente.');
        return;
      }
      if (findCatalogRow(label)) {
        alert('Esse modelo já está cadastrado.');
        return;
      }
      const kind = kindEl?.value || swInferKind(label);
      const newBrandRaw = normalizeSwBrandName(document.getElementById('admin-sw-new-brand')?.value);
      let brand = newBrandRaw || brandEl?.value || swBrandOf(label);
      if (newBrandRaw) {
        if (!smartwatchCatalogState[newBrandRaw]) {
          createSwBrand(newBrandRaw, kind);
        } else if (!swBrandHasKind(newBrandRaw, kind)) {
          smartwatchCatalogState[newBrandRaw].push({ label: '', kind, _brandPlaceholder: true });
        }
        brand = newBrandRaw;
      }
      if (!brand) {
        alert('Selecione ou crie uma marca antes de adicionar o modelo.');
        return;
      }
      const sensorRaw = document.getElementById('admin-sw-new-sensor')?.value;
      const sensor = sensorRaw !== '' && sensorRaw != null ? Number(sensorRaw) : null;
      const lensWRaw = document.getElementById('admin-sw-new-lensw')?.value;
      const lensHRaw = document.getElementById('admin-sw-new-lensh')?.value;
      const lensW = lensWRaw !== '' && lensWRaw != null ? Number(lensWRaw) : null;
      const lensH = lensHRaw !== '' && lensHRaw != null ? Number(lensHRaw) : null;
      if (!smartwatchCatalogState[brand]) smartwatchCatalogState[brand] = [];
      stripSwBrandPlaceholders(brand);
      if (!smartwatchCatalogState[brand]) smartwatchCatalogState[brand] = [];
      const entry = {
        label,
        model: label,
        sizeMm: null,
        kind
      };
      if (kind === 'smartband') {
        if (Number.isFinite(lensW) && lensW > 0) entry.lensWmm = lensW;
        if (Number.isFinite(lensH) && lensH > 0) entry.lensHmm = lensH;
      } else if (Number.isFinite(sensor) && sensor > 0) {
        entry.sensorMm = sensor;
      }
      smartwatchCatalogState[brand].push(entry);
      if (kindEl) kindEl.value = kind;
      if (brandEl) {
        renderSmartwatchCatalogTable();
        brandEl.value = brand;
      }
      const newLabel = document.getElementById('admin-sw-new-label');
      const newSensor = document.getElementById('admin-sw-new-sensor');
      const newLensW = document.getElementById('admin-sw-new-lensw');
      const newLensH = document.getElementById('admin-sw-new-lensh');
      const newBrandInput = document.getElementById('admin-sw-new-brand');
      if (newLabel) newLabel.value = '';
      if (newSensor) newSensor.value = '';
      if (newLensW) newLensW.value = '';
      if (newLensH) newLensH.value = '';
      if (newBrandInput) newBrandInput.value = '';
      syncSmartwatchModelsTextarea();
      renderSmartwatchCatalogTable();
    });
    tbody?.addEventListener('change', (e) => {
      const sensorInp = e.target.closest('.admin-sw-sensor');
      const lensWInp = e.target.closest('.admin-sw-lensw');
      const lensHInp = e.target.closest('.admin-sw-lensh');
      const labelInp = e.target.closest('.admin-sw-label');
      if (sensorInp) {
        const tr = sensorInp.closest('tr');
        const oldLabel = tr?.getAttribute('data-sw-label');
        const hit = oldLabel ? findCatalogRow(oldLabel) : null;
        if (!hit) return;
        const n = sensorInp.value === '' ? null : Number(sensorInp.value);
        hit.row.sensorMm = Number.isFinite(n) && n > 0 ? n : null;
        syncSmartwatchModelsTextarea();
        return;
      }
      if (lensWInp || lensHInp) {
        const tr = (lensWInp || lensHInp).closest('tr');
        const oldLabel = tr?.getAttribute('data-sw-label');
        const hit = oldLabel ? findCatalogRow(oldLabel) : null;
        if (!hit) return;
        const wInp = tr.querySelector('.admin-sw-lensw');
        const hInp = tr.querySelector('.admin-sw-lensh');
        const w = wInp?.value === '' ? null : Number(wInp?.value);
        const h = hInp?.value === '' ? null : Number(hInp?.value);
        hit.row.lensWmm = Number.isFinite(w) && w > 0 ? w : null;
        hit.row.lensHmm = Number.isFinite(h) && h > 0 ? h : null;
        if (hit.row.lensWmm == null) delete hit.row.lensWmm;
        if (hit.row.lensHmm == null) delete hit.row.lensHmm;
        syncSmartwatchModelsTextarea();
        return;
      }
      if (labelInp) {
        const tr = labelInp.closest('tr');
        const oldLabel = tr?.getAttribute('data-sw-label');
        const hit = oldLabel ? findCatalogRow(oldLabel) : null;
        if (!hit) return;
        const next = String(labelInp.value || '').trim();
        if (!next) {
          labelInp.value = hit.row.label;
          return;
        }
        if (next !== oldLabel && findCatalogRow(next)) {
          alert('Já existe um modelo com esse nome.');
          labelInp.value = hit.row.label;
          return;
        }
        hit.row.label = next;
        hit.row.model = next;
        tr.setAttribute('data-sw-label', next);
        syncSmartwatchModelsTextarea();
      }
    });
    tbody?.addEventListener('click', (e) => {
      const btn = e.target.closest('.admin-sw-remove');
      if (!btn) return;
      const label = btn.getAttribute('data-label');
      const hit = label ? findCatalogRow(label) : null;
      if (!hit) return;
      if (!confirm(`Remover “${label}” do cadastro?`)) return;
      smartwatchCatalogState[hit.brand] = (smartwatchCatalogState[hit.brand] || []).filter((r) => r.label !== label);
      if (!swRealCatalogRows(hit.brand).length) delete smartwatchCatalogState[hit.brand];
      syncSmartwatchModelsTextarea();
      renderSmartwatchCatalogTable();
    });
  }

  function fillSmartwatchCatalog(config) {
    smartwatchCatalogState = normalizeAdminCatalog(config?.smartwatchCatalog, config?.smartwatchModels);
    syncSmartwatchModelsTextarea();
    wireSmartwatchCatalogUi();
    renderSmartwatchCatalogTable();
  }

  function collectSmartwatchCatalog() {
    return JSON.parse(JSON.stringify(smartwatchCatalogState || {}));
  }

  function loadDocFrame(forceReload) {
    const frame = document.getElementById('admin-doc-frame');
    if (!frame) return;
    const src = 'documentacao.html?embed=1';
    const current = frame.getAttribute('src') || frame.src || '';
    if (!current.includes('documentacao.html') || forceReload) {
      frame.src = forceReload ? `${src}&_=${Date.now()}` : src;
    }
  }


  let forumAdminLoading = false;
  let forumAdminCache = [];

  function renderForumAdmin(data) {
    const root = document.getElementById('forum-admin-root');
    const metaEl = document.getElementById('forum-admin-meta');
    const toggle = document.getElementById('forum-public-toggle');
    if (!root) return;
    if (toggle) toggle.checked = !!data.meta?.public;
    if (metaEl) {
      metaEl.hidden = false;
      metaEl.textContent = `Pendências: ${data.pendingCount || 0} · tópicos: ${(data.threads || []).length} · público: ${data.meta?.public ? 'sim' : 'não'}`;
    }
    const threads = data.threads || [];
    forumAdminCache = threads;
    if (!threads.length) {
      root.innerHTML = '<p class="admin-meta">Nenhum tópico ainda.</p>';
      return;
    }

    const totalReplies = threads.reduce((sum, th) => sum + ((th.replies || []).length), 0);
    const pendingThreads = threads.filter((th) => th.status === 'pending').length;
    const approvedThreads = threads.filter((th) => th.status === 'approved' || th.status === 'published').length;
    const rejectedThreads = threads.filter((th) => th.status === 'rejected').length;
    const pendingReplies = threads.reduce((sum, th) => sum + ((th.replies || []).filter((r) => r.status === 'pending').length), 0);

    root.innerHTML = `
      <div class="forum-admin-dashboard">
        <div class="forum-admin-summary">
          <div class="forum-admin-summary-card">
            <span class="forum-admin-summary-label">Tópicos</span>
            <strong>${threads.length}</strong>
          </div>
          <div class="forum-admin-summary-card">
            <span class="forum-admin-summary-label">Pendentes</span>
            <strong>${pendingThreads}</strong>
          </div>
          <div class="forum-admin-summary-card">
            <span class="forum-admin-summary-label">Aprovados</span>
            <strong>${approvedThreads}</strong>
          </div>
          <div class="forum-admin-summary-card">
            <span class="forum-admin-summary-label">Respostas</span>
            <strong>${totalReplies}</strong>
          </div>
          <div class="forum-admin-summary-card">
            <span class="forum-admin-summary-label">Respostas pendentes</span>
            <strong>${pendingReplies}</strong>
          </div>
          <div class="forum-admin-summary-card">
            <span class="forum-admin-summary-label">Rejeitados</span>
            <strong>${rejectedThreads}</strong>
          </div>
        </div>
        <div class="forum-admin-thread-list">
          ${threads.map((th) => {
            const replyBlocks = (th.replies || []).map((r) => `
              <div class="forum-admin-reply" data-forum-reply-wrap="${escapeHtml(th.id)}" data-reply-id="${escapeHtml(r.id)}">
                <div class="forum-admin-reply-meta"><strong>@${escapeHtml(r.author?.username || '')}</strong> · ${escapeHtml(r.status)} · ${escapeHtml(formatCustomerDate(r.createdAt))}</div>
                <div class="forum-admin-reply-body">${escapeHtml(r.body || '')}</div>
                <div class="forum-admin-actions forum-admin-actions--inline">
                  ${r.status === 'pending' ? `
                    <button type="button" class="btn-secondary" data-forum-reply-approve="${escapeHtml(th.id)}" data-reply="${escapeHtml(r.id)}">Aprovar resposta</button>
                    <button type="button" class="btn-danger-outline" data-forum-reply-reject="${escapeHtml(th.id)}" data-reply="${escapeHtml(r.id)}">Rejeitar</button>
                  ` : r.status === 'rejected' ? `
                    <button type="button" class="btn-secondary" data-forum-reply-approve="${escapeHtml(th.id)}" data-reply="${escapeHtml(r.id)}">Aprovar resposta</button>
                  ` : `
                    <button type="button" class="btn-danger-outline" data-forum-reply-reject="${escapeHtml(th.id)}" data-reply="${escapeHtml(r.id)}">Rejeitar</button>
                  `}
                  <button type="button" class="btn-danger-outline" data-forum-reply-delete="${escapeHtml(th.id)}" data-reply="${escapeHtml(r.id)}"><i class="fas fa-trash-alt"></i> Excluir</button>
                </div>
              </div>
            `).join('');
            const editReplyBlocks = (th.replies || []).map((r) => `
              <div class="forum-admin-edit-reply" data-edit-reply-id="${escapeHtml(r.id)}">
                <div class="forum-admin-edit-reply-meta"><strong>@${escapeHtml(r.author?.username || '')}</strong> · ${escapeHtml(r.status)}</div>
                <label>Resposta
                  <textarea data-edit-reply-body rows="5">${escapeHtml(r.body || '')}</textarea>
                </label>
              </div>
            `).join('');
            const pendingReplyCount = (th.replies || []).filter((r) => r.status === 'pending').length;
            return `
              <details class="admin-card forum-admin-thread-card" data-thread-id="${escapeHtml(th.id)}" ${th.status === 'pending' ? 'open' : ''}>
                <summary class="forum-admin-thread-summary">
                  <div class="forum-admin-thread-summary-head">
                    <div>
                      <div class="forum-admin-thread-title-row">
                        <h3 data-forum-thread-title>${escapeHtml(th.title || '')}</h3>
                        <span class="forum-admin-thread-chip forum-admin-thread-chip--${escapeHtml(th.status || 'pending')}">${escapeHtml(th.status || 'pending')}</span>
                      </div>
                      <p class="forum-admin-thread-meta">@${escapeHtml(th.author?.username || '')} · ${escapeHtml(formatCustomerDate(th.createdAt))}</p>
                    </div>
                    <div class="forum-admin-thread-stats">
                      <span>${(th.replies || []).length} respostas</span>
                      ${pendingReplyCount ? `<span class="forum-admin-thread-chip forum-admin-thread-chip--warning">${pendingReplyCount} pendentes</span>` : ''}
                    </div>
                  </div>
                </summary>
                <div class="forum-admin-thread-body">
                  <div class="forum-admin-thread-view" data-forum-thread-view>
                    <p class="forum-admin-excerpt" data-forum-thread-body>${escapeHtml(th.body || '')}</p>
                    <div class="forum-admin-actions">
                      ${th.status === 'pending' ? `
                        <button type="button" class="btn-primary" data-forum-approve="${escapeHtml(th.id)}">Aprovar tópico</button>
                        <button type="button" class="btn-danger-outline" data-forum-reject="${escapeHtml(th.id)}">Rejeitar tópico</button>
                      ` : th.status === 'rejected' ? `
                        <button type="button" class="btn-primary" data-forum-approve="${escapeHtml(th.id)}">Aprovar tópico</button>
                      ` : `
                        <button type="button" class="btn-danger-outline" data-forum-reject="${escapeHtml(th.id)}">Rejeitar tópico</button>
                      `}
                      <button type="button" class="btn-secondary" data-forum-edit-thread="${escapeHtml(th.id)}">Editar tópico inteiro</button>
                      <button type="button" class="btn-danger-outline" data-forum-delete="${escapeHtml(th.id)}"><i class="fas fa-trash-alt"></i> Excluir tópico</button>
                    </div>
                    ${replyBlocks
                      ? `<div class="forum-admin-replies" data-forum-replies-view><div class="forum-admin-replies-title">Respostas</div>${replyBlocks}</div>`
                      : '<div class="forum-admin-empty" data-forum-replies-view>Sem respostas ainda.</div>'}
                  </div>
                  <div class="forum-admin-inline-edit" data-forum-thread-edit hidden>
                    <p class="admin-meta" style="margin:0">Edite título, texto e todas as respostas abaixo. Um único Salvar grava o tópico inteiro.</p>
                    <label>Título
                      <input data-edit-title type="text" maxlength="120" value="${escapeHtml(th.title || '')}">
                    </label>
                    <label>Texto do tópico
                      <textarea data-edit-body rows="8">${escapeHtml(th.body || '')}</textarea>
                    </label>
                    ${(th.replies || []).length
                      ? `<div class="forum-admin-edit-replies"><div class="forum-admin-replies-title">Respostas (${(th.replies || []).length})</div>${editReplyBlocks}</div>`
                      : ''}
                    <div class="forum-admin-actions forum-admin-edit-actions-sticky">
                      <button type="button" class="btn-primary" data-forum-save-thread>Salvar tópico inteiro</button>
                      <button type="button" class="btn-secondary" data-forum-cancel-thread>Cancelar</button>
                    </div>
                  </div>
                </div>
              </details>`;
          }).join('')}
        </div>
      </div>`;

    root.querySelectorAll('[data-forum-approve]').forEach((btn) => {
      btn.addEventListener('click', () => moderateForumThread(btn.getAttribute('data-forum-approve'), 'approve'));
    });
    root.querySelectorAll('[data-forum-reject]').forEach((btn) => {
      btn.addEventListener('click', () => moderateForumThread(btn.getAttribute('data-forum-reject'), 'reject'));
    });
    root.querySelectorAll('[data-forum-delete]').forEach((btn) => {
      btn.addEventListener('click', () => deleteForumThread(btn.getAttribute('data-forum-delete')));
    });
    root.querySelectorAll('[data-forum-edit-thread]').forEach((btn) => {
      btn.addEventListener('click', () => startForumThreadEdit(btn.getAttribute('data-forum-edit-thread')));
    });
    root.querySelectorAll('[data-forum-cancel-thread]').forEach((btn) => {
      btn.addEventListener('click', () => cancelForumThreadEdit(btn.closest('[data-thread-id]')));
    });
    root.querySelectorAll('[data-forum-save-thread]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const card = btn.closest('[data-thread-id]');
        const panel = card?.querySelector('[data-forum-thread-edit]');
        saveForumThreadEdit(card?.getAttribute('data-thread-id'), panel);
      });
    });
    root.querySelectorAll('[data-forum-reply-approve]').forEach((btn) => {
      btn.addEventListener('click', () => moderateForumReply(btn.getAttribute('data-forum-reply-approve'), btn.getAttribute('data-reply'), 'approve'));
    });
    root.querySelectorAll('[data-forum-reply-reject]').forEach((btn) => {
      btn.addEventListener('click', () => moderateForumReply(btn.getAttribute('data-forum-reply-reject'), btn.getAttribute('data-reply'), 'reject'));
    });
    root.querySelectorAll('[data-forum-reply-delete]').forEach((btn) => {
      btn.addEventListener('click', () => deleteForumReply(btn.getAttribute('data-forum-reply-delete'), btn.getAttribute('data-reply')));
    });
  }

  function startForumThreadEdit(id) {
    const card = document.querySelector(`#forum-admin-root [data-thread-id="${CSS.escape(id)}"]`);
    if (!card) return;
    card.open = true;
    const view = card.querySelector('[data-forum-thread-view]');
    const panel = card.querySelector('[data-forum-thread-edit]');
    if (!view || !panel) return;
    const th = forumAdminCache.find((t) => t.id === id);
    if (th) {
      const titleInput = panel.querySelector('[data-edit-title]');
      const bodyInput = panel.querySelector('[data-edit-body]');
      if (titleInput) titleInput.value = th.title || '';
      if (bodyInput) bodyInput.value = th.body || '';
      (th.replies || []).forEach((r) => {
        const box = panel.querySelector(`[data-edit-reply-id="${CSS.escape(r.id)}"] [data-edit-reply-body]`);
        if (box) box.value = r.body || '';
      });
    }
    view.hidden = true;
    panel.hidden = false;
    panel.querySelector('[data-edit-title]')?.focus();
  }

  function cancelForumThreadEdit(card) {
    if (!card) return;
    const view = card.querySelector('[data-forum-thread-view]');
    const panel = card.querySelector('[data-forum-thread-edit]');
    if (view) view.hidden = false;
    if (panel) panel.hidden = true;
  }

  async function saveForumThreadEdit(id, panel) {
    const token = sessionStorage.getItem(SESSION_KEY);
    const base = apiBase();
    if (!token || !base || !id || !panel) return;
    const title = String(panel.querySelector('[data-edit-title]')?.value || '').trim();
    const body = String(panel.querySelector('[data-edit-body]')?.value || '').trim();
    if (!title || !body) {
      alert('Título e texto são obrigatórios.');
      return;
    }
    const replies = [];
    panel.querySelectorAll('[data-edit-reply-id]').forEach((box) => {
      const replyId = box.getAttribute('data-edit-reply-id');
      const replyBody = String(box.querySelector('[data-edit-reply-body]')?.value || '').trim();
      if (!replyId || !replyBody) return;
      replies.push({ id: replyId, body: replyBody });
    });
    const emptyReply = Array.from(panel.querySelectorAll('[data-edit-reply-id]')).find((box) => {
      return !String(box.querySelector('[data-edit-reply-body]')?.value || '').trim();
    });
    if (emptyReply) {
      alert('Nenhuma resposta pode ficar vazia. Apague a resposta se não quiser manter.');
      emptyReply.querySelector('[data-edit-reply-body]')?.focus();
      return;
    }
    const submitBtn = panel.querySelector('[data-forum-save-thread]');
    if (submitBtn) submitBtn.disabled = true;
    try {
      const res = await fetch(`${base.replace(/\/$/, '')}/admin/forum/threads/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, replies })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || 'Erro ao editar tópico');
        return;
      }
      await loadForumAdmin();
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  }

  async function loadForumAdmin() {
    const root = document.getElementById('forum-admin-root');
    if (!root || forumAdminLoading) return;
    const token = sessionStorage.getItem(SESSION_KEY);
    const base = apiBase();
    if (!token || !base) {
      root.innerHTML = '<p class="admin-meta">Faça login no admin.</p>';
      return;
    }
    forumAdminLoading = true;
    root.innerHTML = '<p class="admin-meta"><i class="fas fa-spinner fa-spin"></i> Carregando…</p>';
    try {
      const res = await fetch(base.replace(/\/$/, '') + '/admin/forum', {
        headers: { Authorization: 'Bearer ' + token },
        cache: 'no-store'
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar fórum');
      renderForumAdmin(data);
    } catch (err) {
      root.innerHTML = `<p class="admin-status-bad">${escapeHtml(err.message)}</p>`;
    } finally {
      forumAdminLoading = false;
    }
  }

  async function moderateForumThread(id, action) {
    const token = sessionStorage.getItem(SESSION_KEY);
    const base = apiBase();
    if (!token || !base || !id) return;
    const res = await fetch(`${base.replace(/\/$/, '')}/admin/forum/threads/${encodeURIComponent(id)}/${action}`, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { alert(data.error || 'Erro'); return; }
    loadForumAdmin();
  }

  async function moderateForumReply(threadId, replyId, action) {
    const token = sessionStorage.getItem(SESSION_KEY);
    const base = apiBase();
    if (!token || !base || !threadId || !replyId) return;
    const res = await fetch(`${base.replace(/\/$/, '')}/admin/forum/threads/${encodeURIComponent(threadId)}/replies/${encodeURIComponent(replyId)}/${action}`, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { alert(data.error || 'Erro'); return; }
    loadForumAdmin();
  }

  async function deleteForumThread(id) {
    const token = sessionStorage.getItem(SESSION_KEY);
    const base = apiBase();
    if (!token || !base || !id) return;
    if (!confirm('Excluir este tópico e todas as respostas? Isso não tem volta.')) return;
    const res = await fetch(`${base.replace(/\/$/, '')}/admin/forum/threads/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer ' + token }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { alert(data.error || 'Erro ao excluir tópico'); return; }
    loadForumAdmin();
  }

  async function deleteForumReply(threadId, replyId) {
    const token = sessionStorage.getItem(SESSION_KEY);
    const base = apiBase();
    if (!token || !base || !threadId || !replyId) return;
    if (!confirm('Excluir esta resposta definitivamente?')) return;
    const res = await fetch(`${base.replace(/\/$/, '')}/admin/forum/threads/${encodeURIComponent(threadId)}/replies/${encodeURIComponent(replyId)}`, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer ' + token }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { alert(data.error || 'Erro ao excluir resposta'); return; }
    loadForumAdmin();
  }

  function wireForumAdminControls() {
    document.getElementById('btn-forum-refresh')?.addEventListener('click', () => loadForumAdmin());
    document.getElementById('btn-forum-seed')?.addEventListener('click', async () => {
      const token = sessionStorage.getItem(SESSION_KEY);
      const base = apiBase();
      if (!token || !base) return;
      const res = await fetch(base.replace(/\/$/, '') + '/admin/forum/seed', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceOfficial: true, refreshContent: true, refreshAuthors: true })
      });
      const data = await res.json().catch(() => ({}));
      alert(data.message || data.error || (res.ok ? 'OK' : 'Erro'));
      loadForumAdmin();
    });
    async function runForumRelatedSearch() {
      const token = sessionStorage.getItem(SESSION_KEY);
      const base = apiBase();
      const out = document.getElementById('forum-related-results');
      const q = document.getElementById('forum-related-q')?.value || '';
      if (!token || !base || !out) return;
      if (String(q).trim().length < 3) {
        out.innerHTML = '<span class="admin-status-bad">Digite pelo menos 3 caracteres.</span>';
        document.getElementById('forum-related-q')?.focus();
        return;
      }
      out.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Buscando…';
      try {
        const res = await fetch(base.replace(/\/$/, '') + '/admin/forum/related?q=' + encodeURIComponent(q), {
          headers: { Authorization: 'Bearer ' + token },
          cache: 'no-store'
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Falha na busca');
        const matches = data.matches || [];
        if (!matches.length) {
          out.innerHTML = '<span class="admin-status-ok">Nenhum tópico parecido — pode criar um novo sem duplicar.</span>';
          return;
        }
        out.innerHTML = `<p style="margin:0 0 .5rem"><strong>${matches.length} tópico(s) relacionado(s)</strong> — peça para responder nestes em vez de abrir outro:</p>` +
          '<ul style="margin:0;padding-left:1.1rem">' + matches.map((m) =>
            `<li style="margin:.35rem 0"><strong>${escapeHtml(m.title)}</strong><br><span class="admin-meta">@${escapeHtml(m.author?.username || '')} · ${escapeHtml(m.status)} · score ${escapeHtml(String(m.score))} · <a href="comunidade.html?t=${encodeURIComponent(m.slug || m.id)}" target="_blank" rel="noopener">abrir</a></span></li>`
          ).join('') + '</ul>';
      } catch (err) {
        out.innerHTML = `<span class="admin-status-bad">${escapeHtml(err.message)}</span>`;
      }
    }
    document.getElementById('btn-forum-related-search')?.addEventListener('click', () => {
      runForumRelatedSearch();
    });
    document.getElementById('forum-related-q')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        runForumRelatedSearch();
      }
    });
    document.getElementById('forum-public-toggle')?.addEventListener('change', async (e) => {
      const token = sessionStorage.getItem(SESSION_KEY);
      const base = apiBase();
      if (!token || !base) return;
      const res = await fetch(base.replace(/\/$/, '') + '/admin/forum/meta', {
        method: 'PATCH',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ public: !!e.target.checked })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        e.target.checked = !e.target.checked;
        alert(data.error || 'Erro');
        return;
      }
      loadForumAdmin();
    });
  }

  let adminTabsWired = false;
  let cadastrosSection = 'pessoas';

  function initAdminTabs() {
    if (adminTabsWired) return;
    adminTabsWired = true;
    const tabs = Array.from(document.querySelectorAll('.admin-tab[data-admin-tab]'));
    const panels = Array.from(document.querySelectorAll('.admin-tab-panel'));
    const saveActions = document.getElementById('admin-save-actions');
    const hubNav = document.getElementById('cadastros-hub-nav');
    if (!tabs.length || !panels.length) return;

    function setHubSectionButtons(section) {
      if (!hubNav) return;
      hubNav.querySelectorAll('[data-cadastros-section]').forEach((btn) => {
        const active = btn.dataset.cadastrosSection === section;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-selected', active ? 'true' : 'false');
      });
    }

    function showCadastrosSection(section) {
      const sec = CADASTROS_SECTIONS.has(section) ? section : 'pessoas';
      cadastrosSection = sec;
      setHubSectionButtons(sec);
      if (hubNav) hubNav.hidden = false;
      tabs.forEach((tab) => {
        const active = tab.dataset.adminTab === 'clientes';
        tab.classList.toggle('active', active);
        tab.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      const panelId = CADASTROS_PANEL_BY_SECTION[sec] || 'clientes';
      panels.forEach((panel) => {
        const active = panel.id === 'admin-tab-' + panelId;
        panel.hidden = !active;
        panel.classList.toggle('active', active);
      });
      const kitBtn = document.getElementById('admin-product-subtab-kit-cost');
      const marketTabs = document.getElementById('admin-product-market-subtabs');
      if (sec === 'kit') {
        if (kitBtn) kitBtn.hidden = false;
        if (marketTabs) {
          marketTabs.querySelectorAll('[data-product-subtab]').forEach((btn) => {
            btn.hidden = btn.dataset.productSubtab !== 'kit-cost';
          });
        }
        showProductSubtab('kit-cost');
      } else if (sec === 'produtos') {
        if (kitBtn) kitBtn.hidden = true;
        if (marketTabs) {
          marketTabs.querySelectorAll('[data-product-subtab]').forEach((btn) => {
            btn.hidden = btn.dataset.productSubtab === 'kit-cost';
          });
        }
        const cur = (() => {
          try { return localStorage.getItem('stf_admin_product_subtab') || 'br-main'; } catch (_) { return 'br-main'; }
        })();
        showProductSubtab(cur === 'kit-cost' ? 'br-main' : cur);
      }
      if (saveActions) {
        saveActions.hidden = !ADMIN_SAVE_TABS.has(panelId) && panelId !== 'clientes';
        if (sec === 'pessoas') saveActions.hidden = true;
        else saveActions.hidden = false;
      }
      try {
        localStorage.setItem('stf_admin_tab', 'clientes');
        localStorage.setItem('stf_admin_cadastros_section', sec);
      } catch (e) { /* ignore */ }
      if (sec === 'pessoas') loadCustomers();
      if (sec === 'frete') initFreteSubtabs();
      if (sec === 'produtos' || sec === 'kit') initProductSubtabs();
      if (sec === 'smartwatches') {
        wireSmartwatchCatalogUi();
        renderSmartwatchCatalogTable();
      }
    }

    function showTab(tabId) {
      let id = tabId || resolveDefaultAdminTab();
      const legacyCadastros = {
        produtos: 'produtos',
        smartwatches: 'smartwatches',
        pagamento: 'pagamento',
        frete: 'frete',
        cupons: 'cupons',
        faq: 'faq',
        elogios: 'elogios',
        contato: 'contato',
        pix: 'pagamento'
      };
      if (legacyCadastros[id]) {
        showCadastrosSection(legacyCadastros[id]);
        return;
      }
      if (id === 'clientes') {
        let sec = 'pessoas';
        try { sec = localStorage.getItem('stf_admin_cadastros_section') || 'pessoas'; } catch (_) { /* ignore */ }
        showCadastrosSection(sec);
        return;
      }
      if (hubNav) hubNav.hidden = true;
      tabs.forEach((tab) => {
        const active = tab.dataset.adminTab === id;
        tab.classList.toggle('active', active);
        tab.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      panels.forEach((panel) => {
        const active = panel.id === 'admin-tab-' + id;
        panel.hidden = !active;
        panel.classList.toggle('active', active);
      });
      if (saveActions) saveActions.hidden = !ADMIN_SAVE_TABS.has(id);
      try { localStorage.setItem('stf_admin_tab', id); } catch (e) { /* ignore */ }
      if (id === 'cliques') {
        syncClicksNavOnlyCheckbox();
        if (clicksCache.length && clicksMetaCache) {
          reapplyClicksLocalFilters(captureClicksTreeOpenPaths());
        } else if (clicksLoading) {
          setClicksLoadStatus('Carregando cliques…');
        } else {
          showClicksEmptyState();
        }
      } else if (id === 'saldos') {
        showPaymentBalancesFromCache();
        loadPaymentBalances(false).catch(() => {});
      }
      else if (id === 'api') loadIntegrationsStatus();
      else if (id === 'comunidade') loadForumAdmin();
      else if (id === 'vendas') initVendasSubtabs();
      else if (id === 'pesquisa') loadFeedback();
      else if (id === 'pedidos') {
        window.STF_PEDIDOS?.refresh?.().catch((err) => {
          const st = document.getElementById('pedidos-orders-status');
          if (st) {
            st.textContent = err.message || 'Erro ao carregar pedidos.';
            st.className = 'admin-status form-status error';
            st.hidden = false;
          }
        });
      } else if (id === 'documentacao') loadDocFrame(true);
    }

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => showTab(tab.dataset.adminTab));
    });
    hubNav?.querySelectorAll('[data-cadastros-section]').forEach((btn) => {
      btn.addEventListener('click', () => showCadastrosSection(btn.dataset.cadastrosSection));
    });

    restoreAdminSnapshots();
    showTab(resolveDefaultAdminTab());
  }

  function showPanel() {
    els.loginScreen.hidden = true;
    els.panelScreen.hidden = false;
    document.body.classList.remove('admin-login-only');
    initAdminTabs();
  }

  function showLogin() {
    els.loginScreen.hidden = false;
    els.panelScreen.hidden = true;
    document.body.classList.add('admin-login-only');
    sessionStorage.removeItem(SESSION_KEY);
  }

  async function validateSession() {
    const token = sessionStorage.getItem(SESSION_KEY);
    const base = apiBase();
    if (!token || !base) return false;
    const res = await fetch(base + '/admin/session', {
      headers: { Authorization: 'Bearer ' + token },
      cache: 'no-store'
    });
    return res.ok;
  }

  async function tryLogin(username, password) {
    const base = apiBase();
    if (!base) {
      showStatus('API não configurada. Verifique js/config-bootstrap.js.', 'error');
      return false;
    }

    const user = String(username || '').trim();
    const pwd = String(password || '');
    if (!pwd) {
      throw new Error('Digite a senha.');
    }

    const res = await fetch(base.replace(/\/$/, '') + '/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user, password: pwd })
    });

    if (res.status === 429) {
      const retry = Number(res.headers.get('Retry-After') || 0);
      const err = await res.json().catch(() => ({}));
      const mins = retry > 0 ? Math.ceil(retry / 60) : 30;
      throw new Error(err.error ? `${err.error} (~${mins} min)` : `Muitas tentativas. Aguarde ~${mins} min.`);
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Usuário ou senha incorretos.');
    }

    const data = await res.json();
    sessionStorage.setItem(SESSION_KEY, data.token);
    try {
      // Keep owner/admin browsing off the public click log (saves KV puts too).
      localStorage.setItem('stf_skip_analytics', '1');
    } catch (_) { /* ignore */ }
    return true;
  }

  async function saveConfig(config) {
    const token = sessionStorage.getItem(SESSION_KEY);
    const base = apiBase() || bootstrap.configApiUrl;
    if (!base || !token) {
      throw new Error('Faça login com a API configurada para salvar online.');
    }

    const res = await fetch(base.replace(/\/$/, '') + '/config', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token
      },
      body: JSON.stringify(config)
    });

    if (!res.ok) {
      if (res.status === 401) {
        showLogin();
        throw new Error('Sessão expirada. Faça login novamente.');
      }
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Erro ao salvar configuração.');
    }

    return await res.json();
  }

  function downloadConfig(config) {
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'store-config.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  let senderCepWired = false;

  function wireSenderCepLookup() {
    if (senderCepWired) return;
    senderCepWired = true;
    const f = els.configForm;
    f?.shippingOriginCep?.addEventListener('input', (e) => {
      e.target.value = maskCep(e.target.value);
    });
    f?.shippingOriginCep?.addEventListener('blur', () => {
      const cep = (f.shippingOriginCep?.value || '').replace(/\D/g, '');
      if (cep.length === 8) lookupOriginCep();
    });
    document.getElementById('btn-lookup-origin-cep')?.addEventListener('click', lookupOriginCep);
  }

  let shippingUiWired = false;

  function wireShippingUi() {
    if (shippingUiWired) return;
    shippingUiWired = true;
    document.getElementById('btn-test-ship-br')?.addEventListener('click', () => runShippingQuote('br'));
    document.getElementById('btn-test-ship-intl')?.addEventListener('click', () => runShippingQuote('intl'));
    els.configForm?.shippingWeight?.addEventListener('change', () => {
      if (sessionStorage.getItem(SESSION_KEY)) loadShippingStatus();
    });
  }

  async function initPanel() {
    try {
      await loadConfig();
      fillForm(currentConfig);
      wireHomeContentAdmin();
      wireSenderCepLookup();
      wireShippingUi();
      await loadShippingStatus();
      const vendasPanel = document.getElementById('admin-tab-vendas');
      if (vendasPanel && !vendasPanel.hidden) {
        loadMlSales(true).catch(() => {});
      }
    } catch (err) {
      showStatus(err.message || 'Erro ao carregar configuração.', 'error', 'top');
      throw err;
    }
  }

  async function enterOfflineMode() {
    showStatus('Carregando modo offline...', '');
    try {
      showPanel();
      await initPanel();
      loadDocFrame(true);
      showStatus('Modo offline: alterações são salvas como download do JSON.', 'warning', 'save');
    } catch (err) {
      showLogin();
      showStatus(err.message || 'Não foi possível carregar a configuração.', 'error');
    }
  }

  els.loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    showStatus('Entrando...', '');
    try {
      const fd = new FormData(els.loginForm);
      await tryLogin(fd.get('username'), fd.get('password'));
      showPanel();
      await initPanel();
      loadDocFrame(true);
      showStatus('Login realizado com sucesso.', 'success', 'top');
    } catch (err) {
      const msg = err?.message || 'Erro de rede';
      if (msg === 'Failed to fetch' || msg.includes('NetworkError')) {
        showStatus('Não conectou na API. Confira a URL do Worker e use https://www.sensortattoofix.com.br/admin.html', 'error');
      } else {
        showStatus(msg, 'error');
      }
    }
  });

  els.configForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    showStatus('Salvando...', '', 'save');
    try {
      const config = collectForm();
      validatePixConfig(config.pix);
      const base = apiBase() || bootstrap.configApiUrl;

      if (base && sessionStorage.getItem(SESSION_KEY)) {
        const saved = await saveConfig(config);
        currentConfig = saved;
        fillForm(saved);
        await loadShippingStatus();
        showStatus('Configuração salva! O site já usa os novos valores.', 'success', 'save');
      } else {
        downloadConfig(config);
        showStatus(
          'Arquivo baixado. Substitua data/store-config.json no GitHub e faça deploy, ou configure a API para salvar online.',
          'warning',
          'save'
        );
      }
    } catch (err) {
      showStatus(err.message, 'error', 'save');
    }
  });

  els.btnDownload?.addEventListener('click', () => {
    downloadConfig(collectForm());
    showStatus('Backup JSON baixado.', 'success', 'save');
  });

  els.logoutBtn?.addEventListener('click', () => {
    showLogin();
    showStatus('', '');
    showStatus('', '', 'save');
    showStatus('', '', 'top');
    showStatus('', '', 'frete');
    showStatus('', '', 'contato');
  });

  document.getElementById('btn-clicks-test')?.addEventListener('click', () => testClickLog());
  document.getElementById('btn-clicks-refresh')?.addEventListener('click', () => {
    startClicksBackgroundLoad({ preserveOpen: true, force: true });
  });
  document.getElementById('btn-clicks-export')?.addEventListener('click', () => exportClicksExcel());
  document.getElementById('btn-clicks-clear-tests')?.addEventListener('click', () => clearClicksLog('tests'));
  document.getElementById('btn-clicks-clear-all')?.addEventListener('click', () => clearClicksLog('all'));
  document.getElementById('clicks-search')?.addEventListener('input', scheduleClicksReload);
  document.getElementById('clicks-filter-destino')?.addEventListener('change', () => {
    reapplyClicksLocalFilters(captureClicksTreeOpenPaths());
  });
  document.getElementById('clicks-filter-nav')?.addEventListener('change', () => {
    reapplyClicksLocalFilters(captureClicksTreeOpenPaths());
  });
  syncClicksNavOnlyCheckbox();
  wireAdminFolds();
  document.getElementById('clicks-filter-nav-only')?.addEventListener('change', applyClicksNavOnlyFilter);
  document.getElementById('clicks-filter-nav-only')?.addEventListener('click', (e) => {
    e.stopPropagation();
  });
  document.getElementById('btn-feedback-refresh')?.addEventListener('click', () => loadFeedback());
  document.getElementById('btn-feedback-clear')?.addEventListener('click', () => clearFeedback());
  document.getElementById('feedback-search')?.addEventListener('input', scheduleFeedbackReload);

  const EMAIL_TEST_LABELS = {
    generic: 'Simples',
    shop_order: 'Loja — novo pedido',
    shop_paid: 'Loja — PAGO',
    customer_order: 'Cliente — pedido registrado',
    customer_order_paypal: 'Cliente — PayPal',
    customer_order_mp: 'Cliente — Mercado Pago',
    customer_pix: 'Cliente — PIX',
    customer_paid: 'Cliente — pagamento confirmado',
    motoboy: 'Motoboy',
    coupon: 'Comissionado — cupom'
  };

  async function sendTestEmail(type, label) {
    const token = sessionStorage.getItem(SESSION_KEY);
    const base = apiBase();
    if (!base || !token) {
      showStatus('Faça login com a API para testar e-mail.', 'error', 'contato');
      return;
    }
    showStatus(`Enviando ${label}...`, '', 'contato');
    try {
      const email = els.configForm?.emailTestTo?.value?.trim()
        || els.configForm?.formsubmitEmail?.value?.trim();
      const res = await fetch(base.replace(/\/$/, '') + '/admin/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token
        },
        body: JSON.stringify({ type, ...(email ? { email } : {}) })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        if (type === 'all') {
          showStatus(`${data.sent} e-mail(s) de teste enviado(s) para ${data.to || email}. Confira a caixa de entrada (e spam).`, 'success', 'contato');
        } else {
          showStatus(`${label} enviado para ${data.to || email} via ${data.provider || data.results?.[0]?.provider || 'resend'}!`, 'success', 'contato');
        }
        loadIntegrationsStatus();
      } else if (type === 'all' && data.sent > 0) {
        showStatus(`${data.sent} enviado(s), ${data.failed} falhou(aram). Verifique spam e Resend.`, 'warning', 'contato');
      } else {
        const err = data.error || data.results?.find((r) => !r.ok)?.error || data.resend?.error || 'Falha no envio';
        showStatus('Erro: ' + err, 'error', 'contato');
      }
    } catch (err) {
      showStatus(err.message, 'error', 'contato');
    }
  }

  document.getElementById('btn-test-email-send')?.addEventListener('click', () => {
    const type = document.getElementById('email-test-type')?.value || 'generic';
    sendTestEmail(type, EMAIL_TEST_LABELS[type] || 'E-mail de teste');
  });

  document.getElementById('btn-test-email-all')?.addEventListener('click', () => {
    sendTestEmail('all', 'Todos os e-mails de teste');
  });

  document.getElementById('btn-add-ship-method')?.addEventListener('click', () => {
    const methods = collectShippingMethods();
    methods.push({
      id: 'method-' + Date.now(),
      enabled: true,
      scope: 'BR',
      label: 'Nova modalidade',
      correiosCode: ''
    });
    renderShippingMethods(methods);
  });

  document.getElementById('btn-add-motoboy-courier')?.addEventListener('click', () => {
    const couriers = collectMotoboyCouriers();
    couriers.push({
      id: 'courier-' + Date.now(),
      active: true,
      name: '',
      email: '',
      phone: ''
    });
    renderMotoboyCouriers(couriers);
  });

  document.getElementById('btn-add-coupon')?.addEventListener('click', () => {
    const coupons = collectCoupons();
    coupons.push({
      id: 'coupon-' + Date.now(),
      active: true,
      code: '',
      name: '',
      email: '',
      percent: 10,
      commissionPercent: 0
    });
    renderCoupons(coupons);
  });

  document.getElementById('btn-add-br-main-product')?.addEventListener('click', () => {
    const all = collectProductsFromDom();
    all.push({
      id: 'lente-br-' + Date.now(),
      slug: 'lente-br-' + Date.now(),
      name: 'Nova lente Sensor Tattoo Fix',
      description: '',
      price: 62.9,
      image: '/images/brand/sensortattoofix.jpg',
      active: true,
      requiresSmartwatch: true,
      weightGrams: 3,
      sensorMm: 25,
      markets: ['BR']
    });
    renderProducts(all);
    showProductSubtab('br-main');
  });

  document.getElementById('btn-add-br-aggregated-product')?.addEventListener('click', () => {
    const all = collectProductsFromDom();
    all.push({
      id: 'agregado-' + Date.now(),
      slug: 'agregado-' + Date.now(),
      name: 'Novo produto agregado',
      description: '',
      price: 20,
      image: '/images/produtos/pelicula-redonda.svg',
      active: true,
      aggregated: true,
      requiresSmartwatch: false,
      weightGrams: 1,
      markets: ['BR']
    });
    renderProducts(all);
    showProductSubtab('br-aggregated');
  });

  function addKitCostRow(kind) {
    const kitCost = collectKitCostFromDom(kind);
    kitCost.components.push({
      id: 'kit-comp-' + Date.now(),
      name: '',
      buyQty: 1,
      buyPrice: 0,
      yieldQty: 1,
      useQty: 1,
      notes: ''
    });
    if (kind === 'intl') renderKitCostList('admin-kit-cost-intl-rows', kitCost, 'intl');
    else renderKitCostList('admin-kit-cost-rows', kitCost, 'br');
    showProductSubtab('kit-cost');
  }

  document.getElementById('btn-add-kit-cost')?.addEventListener('click', () => addKitCostRow('br'));
  document.getElementById('btn-add-kit-cost-intl')?.addEventListener('click', () => addKitCostRow('intl'));

  function wireKitCostRoot(rootId, kind) {
    const root = document.getElementById(rootId);
    if (!root) return;
    root.addEventListener('input', (e) => {
      if (e.target?.closest?.('.admin-kit-cost-row')) updateKitCostTotals(kind);
    });
    root.addEventListener('click', (e) => {
      const btn = e.target?.closest?.('[data-kit-remove]');
      if (!btn) return;
      btn.closest('.admin-kit-cost-row')?.remove();
      updateKitCostTotals(kind);
    });
  }
  wireKitCostRoot('admin-kit-cost-rows', 'br');
  wireKitCostRoot('admin-kit-cost-intl-rows', 'intl');

  document.getElementById('btn-add-intl-main-product')?.addEventListener('click', () => {
    const all = collectProductsFromDom();
    const stamp = Date.now();
    const slug = `optical-lens-intl-${stamp}`;
    all.push({
      id: slug,
      slug,
      name: 'SensorTattooFix Optical Lens',
      nameEn: 'SensorTattooFix Optical Lens',
      nameIt: 'Lente ottica SensorTattooFix',
      description: 'Lente de correção óptica para smartwatch em pele tatuada.',
      descriptionEn: 'Designed for smartwatch optical sensors on tattooed skin.',
      descriptionIt: 'Progettata per i sensori ottici degli smartwatch su pelle tatuada.',
      price: 62.9,
      priceUsd: 12.99,
      priceEur: 11.99,
      image: LENS_INTL_IMAGES[0],
      images: LENS_INTL_IMAGES.slice(),
      active: true,
      requiresSmartwatch: true,
      weightGrams: 3,
      sensorMm: 25,
      markets: ['INT']
    });
    renderProducts(all);
    showProductSubtab('intl-main');
    showStatus('Produto .com adicionado. Preencha os campos e clique em Salvar.', 'success', 'save');
    const panel = document.getElementById('admin-products-intl-main');
    panel?.lastElementChild?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  });

  document.getElementById('btn-refresh-payment-balances')?.addEventListener('click', () => loadPaymentBalances(true));
  document.getElementById('btn-mp-release-audit')?.addEventListener('click', () => runMpReleaseAudit());

  document.addEventListener('DOMContentLoaded', async () => {
    await waitSalesMoney();
    const token = sessionStorage.getItem(SESSION_KEY);
    if (token && apiBase()) {
      try {
        if (await validateSession()) {
          showPanel();
          await initPanel();
        } else {
          sessionStorage.removeItem(SESSION_KEY);
          showLogin();
        }
      } catch (err) {
        sessionStorage.removeItem(SESSION_KEY);
        showLogin();
        showStatus(err.message, 'error');
      }
    } else {
      showLogin();
    }
  });
})();
