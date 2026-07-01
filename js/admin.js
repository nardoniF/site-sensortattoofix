(function () {
  const SESSION_KEY = 'stf_admin_token';
  const bootstrap = window.CONFIG_BOOTSTRAP || {};

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
    statusApi: document.getElementById('admin-status-api'),
    modeBadge: document.getElementById('admin-mode'),
    btnDownload: document.getElementById('btn-download-config'),
    updatedAt: document.getElementById('config-updated-at'),
  };

  let currentConfig = null;

  function apiBase() {
    const loggedIn = !!sessionStorage.getItem(SESSION_KEY);
    const url = (
      (loggedIn && els.configForm?.apiBaseUrl?.value) ||
      bootstrap.configApiUrl ||
      ''
    ).trim();
    return url.replace(/\/$/, '');
  }

  function escapeHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  }

  function statusEl(target) {
    if (target === 'panel' || target === 'save') return els.statusPanel;
    if (target === 'top') return els.statusTop;
    if (target === 'frete') return els.statusFrete;
    if (target === 'api') return els.statusApi;
    if (target === 'cliques') return document.getElementById('admin-status-cliques');
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
          if (local && window.STF_PRODUCT_MERGE?.mergeMissingAggregated) {
            apiConfig = window.STF_PRODUCT_MERGE.mergeMissingAggregated(apiConfig, local);
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
      ? `   (+ R$ ${Number(opt.intlSurcharge).toFixed(2).replace('.', ',')} acréscimo internacional)`
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
      { id: 'br-carta-registrada', enabled: true, scope: 'BR', label: 'Carta Registrada', correiosCode: '8010', provider: 'correios' },
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
      list.innerHTML = '<p class="admin-meta">Nenhum cupom cadastrado. Adicione código, desconto, comissão e e-mail do comissionado.</p>';
      return;
    }
    list.innerHTML = rows.map((c, i) => `
      <div class="admin-coupon-row" data-coupon-index="${i}">
        <div class="admin-coupon-grid">
          <label class="label-check admin-coupon-active">
            <input type="checkbox" data-field="active" ${c.active !== false ? 'checked' : ''}>
            <span>Ativo</span>
          </label>
          <label>Código
            <input type="text" data-field="code" value="${escAttr(c.code || '')}" placeholder="MARIA10" maxlength="32" autocapitalize="characters">
          </label>
          <label>Nome do comissionado
            <input type="text" data-field="name" value="${escAttr(c.name || '')}" placeholder="Maria">
          </label>
          <label>E-mail do comissionado
            <input type="email" data-field="email" value="${escAttr(c.email || '')}" placeholder="maria@email.com">
          </label>
          <label>Desconto ao cliente (%)
            <input type="number" data-field="percent" min="0" max="100" step="0.01" value="${escAttr(c.percent ?? 10)}">
          </label>
          <label>Comissão do comissionado (%)
            <input type="number" data-field="commissionPercent" min="0" max="100" step="0.01" value="${escAttr(c.commissionPercent ?? 10)}">
          </label>
          <input type="hidden" data-field="id" value="${escAttr(c.id || `coupon-${i + 1}`)}">
        </div>
        <button type="button" class="btn-secondary btn-remove-coupon" data-index="${i}"><i class="fas fa-trash"></i> Remover</button>
      </div>
    `).join('');

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
      const commissionPercent = Math.min(100, Math.max(0, parseFloat(val('commissionPercent')) || 0));
      return {
        id: String(val('id') || `coupon-${i + 1}`).trim(),
        active: val('active') !== false,
        code,
        name: String(val('name') || '').trim(),
        email: String(val('email') || '').trim().toLowerCase(),
        percent,
        commissionPercent
      };
    }).filter((c) => c.code || c.email || c.name);
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
          <label data-correios-code-wrap ${m.provider === 'uber' || m.provider === 'motoboy' ? 'hidden' : ''}>Código Correios
            <input type="text" data-field="correiosCode" value="${escAttr(m.correiosCode || '')}" placeholder="04227 ou *">
          </label>
          <label data-provider-wrap ${m.scope === 'BR' ? '' : 'hidden'}>Provedor
            <select data-field="provider">
              <option value="correios" ${(m.provider || 'correios') === 'correios' ? 'selected' : ''}>Correios</option>
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
        const providerWrap = row?.querySelector('[data-provider-wrap]');
        const provider = row?.querySelector('[data-field="provider"]')?.value || 'correios';
        if (providerWrap) providerWrap.hidden = sel.value !== 'BR';
        if (correiosWrap) correiosWrap.hidden = provider === 'uber' || provider === 'motoboy' || sel.value !== 'BR';
      });
    });

    list.querySelectorAll('[data-field="provider"]').forEach((sel) => {
      sel.addEventListener('change', () => {
        const row = sel.closest('.admin-ship-method-row');
        const correiosWrap = row?.querySelector('[data-correios-code-wrap]');
        if (correiosWrap) correiosWrap.hidden = sel.value === 'uber' || sel.value === 'motoboy';
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
      if (provider !== 'uber' && provider !== 'motoboy') entry.correiosCode = val('correiosCode');
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
      const cls = integrationStatusClass(row.status);
      const icon = integrationStatusIcon(row.status);
      return `<tr>
        <td><strong>${escAttr(row.label)}</strong></td>
        <td>${escAttr(row.description)}</td>
        <td class="admin-api-status-cell"><span class="${cls}">${icon} ${escAttr(row.detail)}</span></td>
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
  let clicksCache = [];

  const CLICKS_EXPORT_PERIOD_LABELS = {
    day: 'dia',
    week: 'semana',
    month: 'mes',
    year: 'ano'
  };

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

  function csvEscapeCell(value) {
    const s = String(value ?? '');
    if (/[;"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  }

  function buildClicksExportCsv(clicks, period) {
    const { rows, destinos } = aggregateClicksForExport(clicks, period);
    const headers = ['Período', 'Visitantes únicos', 'Total de eventos'];
    destinos.forEach((d) => headers.push(clickDestinoLabel(d)));

    const lines = [headers.map(csvEscapeCell).join(';')];
    const totals = { visitors: new Set(), total: 0, byDestino: {} };

    rows.forEach((row) => {
      const line = [
        row.label,
        row.visitors.size,
        row.total,
        ...destinos.map((d) => row.byDestino[d] || 0)
      ];
      lines.push(line.map(csvEscapeCell).join(';'));
      row.visitors.forEach((v) => totals.visitors.add(v));
      totals.total += row.total;
      destinos.forEach((d) => {
        totals.byDestino[d] = (totals.byDestino[d] || 0) + (row.byDestino[d] || 0);
      });
    });

    if (rows.length > 1) {
      const totalLine = [
        'TOTAL GERAL',
        totals.visitors.size,
        totals.total,
        ...destinos.map((d) => totals.byDestino[d] || 0)
      ];
      lines.push(totalLine.map(csvEscapeCell).join(';'));
    }

    return '\ufeff' + lines.join('\r\n');
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
    const res = await fetch(`${base.replace(/\/$/, '')}/admin/clicks?limit=400`, {
      headers: { Authorization: 'Bearer ' + token },
      cache: 'no-store'
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Falha ao carregar cliques');
    return data.clicks || [];
  }

  async function exportClicksExcel() {
    const period = document.getElementById('clicks-export-period')?.value || 'day';
    const btn = document.getElementById('btn-clicks-export');
    if (btn) btn.disabled = true;
    showStatus('Preparando exportação…', '', 'cliques');
    try {
      const clicks = await fetchAllClicksForExport();
      if (!clicks.length) {
        showStatus('Nenhum evento no log para exportar.', 'error', 'cliques');
        return;
      }
      const csv = buildClicksExportCsv(clicks, period);
      const stamp = new Date().toISOString().slice(0, 10);
      const suffix = CLICKS_EXPORT_PERIOD_LABELS[period] || period;
      downloadTextFile(csv, `cliques-por-${suffix}-${stamp}.csv`, 'text/csv;charset=utf-8');
      showStatus(`Exportado: ${clicks.length} eventos agrupados por ${suffix}. Abra no Excel.`, 'success', 'cliques');
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
    const topList = topEntries.length
      ? `<ul class="clicks-stats-top">${topEntries.map(([k, n]) =>
        `<li><span>${escapeHtml(clickDestinoLabel(k))}</span><strong>${n}</strong></li>`
      ).join('')}</ul>`
      : '<p class="clicks-stats-empty">—</p>';
    el.innerHTML = `<details class="clicks-stats-details">
      <summary class="clicks-stats-summary"><i class="fas fa-chevron-right clicks-stats-chevron" aria-hidden="true"></i> Resumo</summary>
      <dl class="clicks-stats-dl">
        <div class="clicks-stats-row"><dt>Hoje</dt><dd>${data?.todayCount ?? 0} eventos</dd></div>
        <div class="clicks-stats-row"><dt>Total no log</dt><dd>${data?.total ?? 0}</dd></div>
        <div class="clicks-stats-row"><dt>Último gravado</dt><dd>${escapeHtml(ultimo)}</dd></div>
        <div class="clicks-stats-row clicks-stats-row-top"><dt>Mais frequentes</dt><dd>${topList}</dd></div>
      </dl>
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

  function visitorKey(c) {
    if (c.visitante_id) return `vid:${c.visitante_id}`;
    if (c.cliente_email) return `email:${String(c.cliente_email).toLowerCase()}`;
    if (c.ip) return `ip:${c.ip}`;
    if (c.ip_prefix) return `ipp:${c.ip_prefix}`;
    return `unk:${c.sessao_visita || c.id || 'x'}`;
  }

  function visitorLabel(meta) {
    if (meta.cliente_email) {
      return meta.cliente_nome
        ? `${meta.cliente_nome} · ${meta.cliente_email}`
        : meta.cliente_email;
    }
    if (meta.visitante_id) {
      const ip = meta.ip_prefix || maskIp(meta.ip);
      return ip
        ? `Visitante ${meta.visitante_id.slice(0, 12)}… · ${ip}`
        : `Visitante ${meta.visitante_id.slice(0, 16)}…`;
    }
    if (meta.ip) return `IP ${maskIp(meta.ip)}`;
    return 'Visitante sem identificação';
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
      if (c.cliente_email || c.cliente_nome) {
        v.meta = {
          ...v.meta,
          ...c,
          cliente_email: c.cliente_email || v.meta.cliente_email,
          cliente_nome: c.cliente_nome || v.meta.cliente_nome,
          visitante_id: c.visitante_id || v.meta.visitante_id
        };
      }
      const sKey = c.sessao_visita || 'sem_sessao';
      if (!v.sessions[sKey]) v.sessions[sKey] = [];
      v.sessions[sKey].push(c);
      v.count++;
      d.count++;
      m.count++;
      y.count++;
    });

    Object.values(tree).forEach((y) => {
      Object.values(y.months).forEach((m) => {
        Object.values(m.days).forEach((d) => {
          Object.values(d.visitors).forEach((v) => {
            Object.values(v.sessions).forEach((events) => {
              events.sort((a, b) => {
                const sa = a.sequencia || 0;
                const sb = b.sequencia || 0;
                if (sa && sb && sa !== sb) return sa - sb;
                return (a.ts || 0) - (b.ts || 0);
              });
            });
          });
        });
      });
    });
    return tree;
  }

  function clicksTreeSummary(label, count, extra) {
    const meta = count != null ? `<span class="clicks-tree-meta">${count} evento${count === 1 ? '' : 's'}${extra ? ' · ' + extra : ''}</span>` : '';
    return `<i class="fas fa-chevron-right clicks-tree-chevron" aria-hidden="true"></i><span class="clicks-tree-label">${escapeHtml(label)}</span>${meta}`;
  }

  function inferirOrigemDeUrl(pagina) {
    const raw = String(pagina || '');
    if (!raw.includes('?')) return '';
    try {
      const qs = raw.startsWith('?') ? raw : raw.slice(raw.indexOf('?'));
      const params = new URLSearchParams(qs);
      if (
        params.has('gclid') || params.has('gbraid') || params.has('wbraid') ||
        params.has('gad_source') || params.has('gad_campaignid')
      ) return 'Google Ads';
      if (params.has('fbclid')) return 'Facebook Ads';
      if (params.has('msclkid')) return 'Microsoft Ads';
      const src = (params.get('utm_source') || '').toLowerCase();
      const med = (params.get('utm_medium') || '').toLowerCase();
      if (src === 'instagram' || med === 'instagram') return 'Instagram';
      if (src === 'facebook' || src === 'fb') return 'Facebook';
      if (src === 'tiktok') return 'TikTok';
      if (src === 'google' || med === 'cpc') return 'Google Ads';
      if (src) return src.replace(/_/g, ' ');
    } catch {
      return '';
    }
    return '';
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

  function clickOrigemLegivel(c) {
    if (c.origem_trafego_label) {
      const slug = c.origem_trafego
        || (c.origem_trafego_label === 'Acesso direto' ? 'direto' : 'outro');
      return { label: c.origem_trafego_label, slug };
    }
    const inferred = inferirOrigemDeUrl(c.pagina);
    if (inferred) {
      const slug = inferred.toLowerCase().replace(/\s+/g, '_');
      return { label: inferred, slug };
    }
    const ref = String(c.referrer || '').trim();
    const refLower = ref.toLowerCase();
    if (ref && ref !== '(direto)' && ref !== '—' && refLower !== 'acesso direto') {
      return { label: ref, slug: 'referral' };
    }
    return { label: 'Acesso direto', slug: 'direto' };
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
    const seq = c.sequencia || idx + 1;
    const tipParts = [
      isEntrada ? `Origem: ${origem.label}` : null,
      c.utm_campaign && `Campanha: ${c.utm_campaign}`,
      c.utm_source && `utm_source: ${c.utm_source}`,
      c.utm_medium && `utm_medium: ${c.utm_medium}`,
      c.pagina && humanizarPaginaLog(c.pagina) !== c.pagina ? `Página: ${humanizarPaginaLog(c.pagina)}` : null,
      c.secao_label,
      c.dispositivo,
      c.referrer && c.referrer !== origem.label ? `Referrer: ${c.referrer}` : null
    ].filter(Boolean);
    const origemClass = isEntrada ? ` clicks-tree-step-origem clicks-origem--${escapeHtml(origem.slug || 'outro')}` : '';
    return `<li class="clicks-tree-step" title="${escapeHtml(tipParts.join(' · '))}">
      <span class="clicks-tree-step-num">${seq}</span>
      <span class="clicks-tree-step-time">${escapeHtml(hora)}</span>
      <span class="admin-click-dest admin-click-dest--${escapeHtml(c.destino || 'outro')}">${escapeHtml(dest)}</span>
      <span class="clicks-tree-step-label${origemClass}">${escapeHtml(detalhe || '—')}</span>
    </li>`;
  }

  function renderClicksTree(clicks, checkedAt, total, openPaths) {
    const root = document.getElementById('clicks-tree-root');
    const checkedEl = document.getElementById('clicks-checked-at');
    if (!root) return;

    if (!clicks?.length) {
      root.innerHTML = '<p class="admin-meta">Nenhum evento encontrado com esses filtros.</p>';
    } else {
      const tree = buildClicksTree(clicks);
      const years = Object.keys(tree).sort((a, b) => Number(b) - Number(a));
      let html = '<div class="clicks-tree">';

      years.forEach((year, yi) => {
        const y = tree[year];
        const yearPath = String(year);
        html += `<details class="clicks-tree-node clicks-tree-year" data-tree-path="${escapeHtml(yearPath)}"><summary>${clicksTreeSummary(year, y.count)}</summary><div class="clicks-tree-children">`;

        const months = Object.keys(y.months).sort((a, b) => Number(b) - Number(a));
        months.forEach((monthNum, mi) => {
          const m = y.months[monthNum];
          const monthPath = `${yearPath}|${monthNum}`;
          html += `<details class="clicks-tree-node clicks-tree-month" data-tree-path="${escapeHtml(monthPath)}"><summary>${clicksTreeSummary(m.name, m.count)}</summary><div class="clicks-tree-children">`;

          const days = Object.keys(m.days).sort((a, b) => b.localeCompare(a));
          days.forEach((dateKey, di) => {
            const d = m.days[dateKey];
            const visitorCount = Object.keys(d.visitors).length;
            const dayPath = `${monthPath}|${dateKey}`;
            html += `<details class="clicks-tree-node clicks-tree-day" data-tree-path="${escapeHtml(dayPath)}"><summary>${clicksTreeSummary(d.label, d.count, visitorCount + ' visitante' + (visitorCount === 1 ? '' : 's'))}</summary><div class="clicks-tree-children">`;

            const visitors = Object.entries(d.visitors).sort((a, b) => {
              const ta = Math.min(...Object.values(a[1].sessions).flat().map((e) => e.ts || 0));
              const tb = Math.min(...Object.values(b[1].sessions).flat().map((e) => e.ts || 0));
              return tb - ta;
            });

            visitors.forEach(([vKey, v], vi) => {
              const sessionCount = Object.keys(v.sessions).length;
              const visitorPath = `${dayPath}|${escapeHtml(vKey)}`;
              html += `<details class="clicks-tree-node clicks-tree-visitor" data-tree-path="${visitorPath}"><summary>${clicksTreeSummary(visitorLabel(v.meta), v.count, sessionCount + ' visita' + (sessionCount === 1 ? '' : 's'))}</summary><div class="clicks-tree-children">`;

              const sessions = Object.entries(v.sessions).sort((a, b) => {
                const ta = (a[1][0]?.ts) || 0;
                const tb = (b[1][0]?.ts) || 0;
                return ta - tb;
              });

              sessions.forEach(([sKey, events], si) => {
                const start = formatClickTime(events[0]?.ts);
                const pathLabel = sessionCount > 1 ? `Visita ${si + 1} · ${start}` : `Caminho · ${start}`;
                const origemLabel = events.find((e) => e.origem_trafego_label)?.origem_trafego_label || '';
                const passosMeta = origemLabel ? `${origemLabel} · passos` : 'passos';
                const sessionPath = `${visitorPath}|${escapeHtml(sKey)}`;
                html += `<details class="clicks-tree-node clicks-tree-path" data-tree-path="${sessionPath}"><summary>${clicksTreeSummary(pathLabel, events.length, passosMeta)}</summary>`;
                html += '<ol class="clicks-tree-steps">';
                events.forEach((c, idx) => { html += renderClickStep(c, idx); });
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
      restoreClicksTreeOpenPaths(openPaths);
    }

    if (checkedEl) {
      checkedEl.textContent = `Atualizado em ${formatClickDate(checkedAt ? Date.parse(checkedAt) : Date.now())} · ${clicks?.length || 0} eventos carregados de ${total || 0} no log`;
      checkedEl.hidden = false;
    }
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
      : 'Remover só eventos de teste (diagnóstico, curl, etc.)?\n\nVisitas reais são mantidas.';
    if (!confirm(msg)) return;

    showStatus(isAll ? 'Limpando histórico…' : 'Removendo testes…', '', 'cliques');
    try {
      const res = await fetch(`${base.replace(/\/$/, '')}/admin/clicks`, {
        method: 'DELETE',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ mode: isAll ? 'all' : 'tests' })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Falha ao limpar log');
      clicksCache = [];
      await loadClicks();
      showStatus(
        isAll
          ? `Histórico apagado (${data.removed || 0} evento${data.removed === 1 ? '' : 's'}).`
          : `${data.removed || 0} teste(s) removido(s). Restam ${data.remaining ?? '—'} eventos.`,
        'success',
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
      await loadClicks(true);
    } catch (err) {
      showStatus(err.message || 'Erro no teste.', 'error', 'cliques');
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  async function loadClicks(preserveOpen) {
    const root = document.getElementById('clicks-tree-root');
    if (!root || clicksLoading) return;
    const token = sessionStorage.getItem(SESSION_KEY);
    const base = apiBase();
    if (!token || !base) {
      root.innerHTML = '<p class="admin-meta">Faça login no admin.</p>';
      return;
    }

    const q = document.getElementById('clicks-search')?.value?.trim() || '';
    const destino = document.getElementById('clicks-filter-destino')?.value || '';

    clicksLoading = true;
    const openPaths = preserveOpen ? captureClicksTreeOpenPaths() : [];
    root.innerHTML = '<p class="admin-meta"><i class="fas fa-spinner fa-spin"></i> Carregando histórico…</p>';

    try {
      const params = new URLSearchParams({ limit: '400' });
      if (q) params.set('q', q);
      if (destino === 'pageview') params.set('tipo', 'pageview');
      else if (destino) params.set('destino', destino);
      const res = await fetch(`${base.replace(/\/$/, '')}/admin/clicks?${params}`, {
        headers: { Authorization: 'Bearer ' + token },
        cache: 'no-store'
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar cliques');
      clicksCache = data.clicks || [];
      renderClicksStats(data);
      renderClicksTree(clicksCache, data.checkedAt, data.total, openPaths);
    } catch (err) {
      root.innerHTML = `<p class="admin-status-bad">${escapeHtml(err.message)}</p>`;
    } finally {
      clicksLoading = false;
    }
  }

  function scheduleClicksReload() {
    clearTimeout(clicksSearchTimer);
    clicksSearchTimer = setTimeout(() => loadClicks(), 350);
  }

  function formatCustomerDate(iso) {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString('pt-BR');
    } catch {
      return iso;
    }
  }

  function renderCustomersTable(customers, checkedAt) {
    const tbody = document.getElementById('admin-customers-tbody');
    const checkedEl = document.getElementById('customers-checked-at');
    if (!tbody) return;

    if (!customers?.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="admin-meta">Nenhum cliente cadastrado ainda.</td></tr>';
    } else {
      tbody.innerHTML = customers.map((c) => `
        <tr>
          <td>${escapeHtml(c.nome || '—')}</td>
          <td>${escapeHtml(c.email || '—')}</td>
          <td>${escapeHtml(c.telefone || '—')}</td>
          <td>${escapeHtml(c.cpf || '—')}</td>
          <td>${Number(c.orderCount) || 0}</td>
          <td>${escapeHtml(formatCustomerDate(c.createdAt))}</td>
        </tr>
      `).join('');
    }

    if (checkedEl && checkedAt) {
      checkedEl.textContent = `Atualizado em ${formatCustomerDate(checkedAt)} · ${customers?.length || 0} cliente(s)`;
      checkedEl.hidden = false;
    }
  }

  async function loadCustomers() {
    const tbody = document.getElementById('admin-customers-tbody');
    if (!tbody || customersLoading) return;
    const token = sessionStorage.getItem(SESSION_KEY);
    const base = apiBase();
    if (!token || !base) {
      tbody.innerHTML = '<tr><td colspan="6" class="admin-meta">Faça login no admin.</td></tr>';
      return;
    }

    customersLoading = true;
    tbody.innerHTML = '<tr><td colspan="6" class="admin-meta"><i class="fas fa-spinner fa-spin"></i> Carregando clientes...</td></tr>';

    try {
      const res = await fetch(base.replace(/\/$/, '') + '/admin/customers', {
        headers: { Authorization: 'Bearer ' + token },
        cache: 'no-store'
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar clientes');
      renderCustomersTable(data.customers, data.checkedAt);
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="6" class="admin-status-bad">${escapeHtml(err.message)}</td></tr>`;
    } finally {
      customersLoading = false;
    }
  }

  function integrationUsable(row) {
    return row && (row.status === 'ok' || row.status === 'warn');
  }

  function resolveActivePixProvider(integrations) {
    const mp = (integrations || []).find((r) => r.id === 'mercadopago');
    const asaas = (integrations || []).find((r) => r.id === 'asaas');
    if (integrationUsable(mp)) {
      return {
        label: 'Mercado Pago',
        cls: mp.status === 'warn' ? 'warn' : 'ok',
        hint: mp.detail || ''
      };
    }
    if (integrationUsable(asaas)) {
      return {
        label: 'Asaas',
        cls: asaas.status === 'warn' ? 'warn' : 'ok',
        hint: asaas.detail || ''
      };
    }
    return {
      label: 'PIX reserva (QR estático)',
      cls: 'warn',
      hint: 'Mercado Pago e Asaas indisponíveis no Worker'
    };
  }

  function renderPixActiveProvider(integrations) {
    const el = document.getElementById('pix-active-provider');
    if (!el) return;
    if (!integrations?.length) {
      el.hidden = true;
      el.textContent = '';
      return;
    }
    const active = resolveActivePixProvider(integrations);
    el.className = `admin-pix-active admin-pix-active--${active.cls}`;
    el.innerHTML = `<span class="admin-pix-active-label">Ativo:</span> <strong>${escapeHtml(active.label)}</strong>${active.hint ? `<span class="admin-pix-active-hint">${escapeHtml(active.hint)}</span>` : ''}`;
    el.hidden = false;
  }

  async function refreshIntegrationsCache() {
    const token = sessionStorage.getItem(SESSION_KEY);
    const base = apiBase();
    if (!base || !token) {
      lastIntegrations = null;
      renderPixActiveProvider(null);
      return null;
    }
    const res = await fetch(base.replace(/\/$/, '') + '/admin/integrations-status', {
      headers: { Authorization: 'Bearer ' + token },
      cache: 'no-store'
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Não autorizado');
    lastIntegrations = data.integrations || [];
    renderPixActiveProvider(lastIntegrations);
    return data;
  }

  async function loadPixProviderStatus() {
    const el = document.getElementById('pix-active-provider');
    if (!el) return;
    const token = sessionStorage.getItem(SESSION_KEY);
    const base = apiBase();
    if (!base || !token) {
      el.className = 'admin-pix-active admin-pix-active--off';
      el.innerHTML = '<span class="admin-pix-active-label">Ativo:</span> <span class="admin-pix-active-hint">Faça login na API para verificar</span>';
      el.hidden = false;
      return;
    }
    if (lastIntegrations) {
      renderPixActiveProvider(lastIntegrations);
      return;
    }
    el.className = 'admin-pix-active admin-pix-active--off';
    el.innerHTML = '<span class="admin-pix-active-label">Ativo:</span> <span class="admin-pix-active-hint"><i class="fas fa-spinner fa-spin"></i> Verificando…</span>';
    el.hidden = false;
    try {
      await refreshIntegrationsCache();
    } catch (err) {
      el.className = 'admin-pix-active admin-pix-active--error';
      el.innerHTML = `<span class="admin-pix-active-label">Ativo:</span> <span class="admin-pix-active-hint">${escapeHtml(err.message || 'Erro ao verificar')}</span>`;
    }
  }

  async function loadIntegrationsStatus() {
    const tbody = document.getElementById('api-integrations-tbody');
    if (!tbody || integrationsLoading) return;

    const token = sessionStorage.getItem(SESSION_KEY);
    const base = apiBase();
    if (!base || !token) {
      lastIntegrations = null;
      renderIntegrationsTable([], null);
      renderPixActiveProvider(null);
      tbody.innerHTML = '<tr><td colspan="3" class="admin-meta">Faça login com a API para testar as integrações.</td></tr>';
      return;
    }

    integrationsLoading = true;
    tbody.innerHTML = '<tr><td colspan="3" class="admin-meta"><i class="fas fa-spinner fa-spin"></i> Verificando integrações…</td></tr>';

    try {
      const data = await refreshIntegrationsCache();
      renderIntegrationsTable(data?.integrations, data?.checkedAt);
    } catch (err) {
      lastIntegrations = null;
      renderPixActiveProvider(null);
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

  function renderProductRow(p, i, isAggregated) {
    const badge = isAggregated
      ? '<span class="admin-badge-aggregated">Agregado</span> '
      : '<span class="admin-badge-main">Lente</span> ';
    const title = p.name ? `${badge}Produto ${i + 1}: ${escAttr(p.name)}` : `${badge}Produto ${i + 1}`;
    const sensorField = !isAggregated ? `
          <label>Sensor da lente (mm)
            <span class="stf-help-tip" tabindex="0" aria-label="Como medir o sensor">
              <i class="fas fa-circle-question"></i>
              <span class="stf-help-tip-pop">
                <img src="site/relogio_sensor.jpg" alt="Medir o sensor com régua no relógio">
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
    return `
      <div class="admin-product-row${isAggregated ? ' admin-product-row--aggregated' : ' admin-product-row--main'}" data-product-index="${i}" data-aggregated="${isAggregated ? '1' : '0'}">
        <h4>${title}</h4>
        <div class="form-grid">
          <label class="full">Nome<input type="text" data-field="name" value="${escAttr(p.name)}" required></label>
          <label class="full">Descrição<textarea data-field="description" rows="2">${escTextarea(p.description)}</textarea></label>
          ${aggregatedFields}
          <label>Preço (R$)<input type="number" data-field="price" step="0.01" min="0" value="${p.price ?? 0}"></label>
          <label>Estoque <small class="admin-field-hint">vazio = ilimitado · 0 = esgotado (some da loja)</small>
            <input type="number" data-field="stock" min="0" step="1" value="${p.stock != null ? p.stock : ''}" placeholder="ilimitado">
          </label>
          <label>Slug (URL)<input type="text" data-field="slug" value="${p.slug || p.id || ''}" placeholder="kit-sensor-tattoofix"></label>
          <label class="full">URL da imagem<input type="text" data-field="image" value="${escAttr(p.image || '')}" placeholder="/produtos/pulseira-sport-preta.svg ou /site/…" spellcheck="false" autocomplete="off"></label>
          ${sensorField}
          <label>Peso (g)<input type="number" data-field="weightGrams" min="0.1" step="0.1" value="${p.weightGrams ?? 3}"></label>
          <div class="admin-product-flags">
            <label class="label-check"><input type="checkbox" data-field="active" ${p.active !== false ? 'checked' : ''}><span>Ativo</span></label>
            <label class="label-check"><input type="checkbox" data-field="requiresSmartwatch" ${p.requiresSmartwatch !== false ? 'checked' : ''}><span>Pede modelo do relógio</span></label>
          </div>
        </div>
        <button type="button" class="btn-secondary btn-remove-product" data-index="${i}" data-aggregated="${isAggregated ? '1' : '0'}" style="margin-top:8px"><i class="fas fa-trash"></i> Remover</button>
      </div>`;
  }

  function renderProductList(products, listId, isAggregated) {
    const list = document.getElementById(listId);
    if (!list) return;
    list.innerHTML = products.length
      ? products.map((p, i) => renderProductRow(p, i, isAggregated)).join('')
      : `<p class="admin-meta">${isAggregated ? 'Nenhum produto agregado cadastrado.' : 'Nenhuma lente cadastrada.'}</p>`;

    list.querySelectorAll('.btn-remove-product').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-index'));
        const agg = btn.getAttribute('data-aggregated') === '1';
        const all = collectProductsFromDom();
        const main = all.filter((p) => !p.aggregated);
        const aggregated = all.filter((p) => p.aggregated);
        if (agg) aggregated.splice(idx, 1);
        else main.splice(idx, 1);
        const next = [...main, ...aggregated];
        renderProducts(next.length ? next : [{
          id: 'kit-sensor-tattoofix', slug: 'kit-sensor-tattoofix', name: 'Kit Sensor Tattoo Fix',
          description: '', price: 62.9, image: '/site/sensortattoofix.jpg', active: true,
          requiresSmartwatch: true, weightGrams: 3, sensorMm: 25
        }]);
      });
    });
  }

  function renderProducts(products) {
    const main = products.filter((p) => !p.aggregated);
    const aggregated = products.filter((p) => p.aggregated);
    const summary = document.getElementById('admin-products-summary');
    if (summary) {
      summary.textContent = `${main.length} lente(s) · ${aggregated.length} agregado(s)`;
    }
    renderProductList(main, 'admin-products-main', false);
    renderProductList(aggregated, 'admin-products-aggregated', true);
  }

  function collectFromList(listEl, isAggregated) {
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
        weightGrams: Number(val('weightGrams')) || 3
      };
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
      ...collectFromList(document.getElementById('admin-products-main'), false),
      ...collectFromList(document.getElementById('admin-products-aggregated'), true)
    ];
  }

  let productSubtabsWired = false;

  function showProductSubtab(subtabId) {
    const container = document.getElementById('admin-tab-produtos');
    if (!container) return;
    const id = subtabId || 'main';
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
    let saved = 'main';
    try { saved = localStorage.getItem('stf_admin_product_subtab') || 'main'; } catch (e) { /* ignore */ }
    showProductSubtab(saved);
  }

  function fillForm(config) {
    const f = els.configForm;
    if (!f || !config) return;
    renderProducts(getProductsFromConfig(config));
    initProductSubtabs();
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
    renderIntlShipping(config.internationalShipping || {});
    if (f.intlSurcharge) f.intlSurcharge.value = config.internationalSurcharge ?? 40;
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
    if (f.formsubmitEmail) f.formsubmitEmail.value = formsubmit.email || '';
    if (f.formsubmitSubject) f.formsubmitSubject.value = formsubmit.subject || '';
    if (f.apiBaseUrl) f.apiBaseUrl.value = (config.api && config.api.baseUrl) || bootstrap.configApiUrl || '';
    const paypalCfg = config.payments?.paypal || {};
    if (f.paypalIntlEnabled) f.paypalIntlEnabled.checked = paypalCfg.internationalEnabled !== false;
    if (f.paypalAppLabel) f.paypalAppLabel.value = paypalCfg.appLabel || '';
    const cardBrCfg = config.payments?.cardBr || {};
    if (f.cardBrProvider) {
      f.cardBrProvider.value = cardBrCfg.provider === 'mercadopago' ? 'mercadopago' : 'asaas';
    }
    if (f.cardBrFallbackMp) {
      f.cardBrFallbackMp.checked = cardBrCfg.fallbackToMercadoPago !== false;
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
    const primary = products.find((p) => p.active !== false && !p.aggregated)
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
      whatsapp: f.whatsapp.value.replace(/\D/g, ''),
      siteUrl: currentConfig?.siteUrl || 'https://www.sensortattoofix.com.br',
      api: {
        baseUrl: f.apiBaseUrl.value.trim()
      },
      payments: {
        paypal: {
          internationalEnabled: f.paypalIntlEnabled?.checked !== false,
          appLabel: f.paypalAppLabel?.value.trim().slice(0, 120) || ''
        },
        cardBr: {
          provider: f.cardBrProvider?.value === 'mercadopago' ? 'mercadopago' : 'asaas',
          fallbackToMercadoPago: f.cardBrFallbackMp?.checked !== false
        }
      },
      smartwatchModels: currentConfig?.smartwatchModels || [],
      internationalShipping: collectIntlShipping(),
      internationalSurcharge: Math.max(0, parseFloat(f.intlSurcharge?.value) || 0),
      internationalProduct: {
        title: f.intlProductTitle?.value.trim() || 'Envio internacional',
        hint: f.intlProductHint?.value.trim() || '',
        encomendaNotice: f.intlProductEncomendaNotice?.value.trim() || '',
        documentNotice: f.intlProductDocumentNotice?.value.trim() || ''
      },
      shippingMethods: syncMotoboyShippingMethods(collectShippingMethods(), collectMotoboyShipping()),
      motoboyShipping: collectMotoboyShipping(),
      coupons: collectCoupons(),
      updatedAt: new Date().toISOString()
    };
  }

  const ADMIN_SAVE_TABS = new Set(['produtos', 'frete', 'pix', 'contato', 'cupons', 'api']);

  function loadDocFrame(forceReload) {
    const frame = document.getElementById('admin-doc-frame');
    if (!frame) return;
    const src = 'documentacao.html?embed=1';
    const current = frame.getAttribute('src') || frame.src || '';
    if (!current.includes('documentacao.html') || forceReload) {
      frame.src = forceReload ? `${src}&_=${Date.now()}` : src;
    }
  }

  let adminTabsWired = false;

  function initAdminTabs() {
    if (adminTabsWired) return;
    adminTabsWired = true;
    const tabs = Array.from(document.querySelectorAll('.admin-tab[data-admin-tab]'));
    const panels = Array.from(document.querySelectorAll('.admin-tab-panel'));
    const saveActions = document.getElementById('admin-save-actions');
    if (!tabs.length || !panels.length) return;

    function showTab(tabId) {
      const id = tabId || 'pedidos';
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
      if (id === 'api') loadIntegrationsStatus();
      if (id === 'pix') loadPixProviderStatus();
      if (id === 'clientes') loadCustomers();
      if (id === 'cliques') loadClicks();
      if (id === 'pedidos') {
        window.STF_PEDIDOS?.refresh?.().catch((err) => {
          const st = document.getElementById('pedidos-orders-status');
          if (st) {
            st.textContent = err.message || 'Erro ao carregar pedidos.';
            st.className = 'admin-status form-status error';
            st.hidden = false;
          }
        });
      }
      if (id === 'documentacao') loadDocFrame(true);
      if (id === 'frete') initFreteSubtabs();
    }

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => showTab(tab.dataset.adminTab));
    });

    let saved = 'pedidos';
    try { saved = localStorage.getItem('stf_admin_tab') || 'pedidos'; } catch (e) { /* ignore */ }
    if (!panels.some((p) => p.id === 'admin-tab-' + saved)) saved = 'pedidos';
    showTab(saved);
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
      wireSenderCepLookup();
      wireShippingUi();
      await loadShippingStatus();
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
    showStatus('', '', 'api');
  });

  document.getElementById('btn-clicks-test')?.addEventListener('click', () => testClickLog());
  document.getElementById('btn-clicks-refresh')?.addEventListener('click', () => loadClicks(true));
  document.getElementById('btn-clicks-export')?.addEventListener('click', () => exportClicksExcel());
  document.getElementById('btn-clicks-clear-tests')?.addEventListener('click', () => clearClicksLog('tests'));
  document.getElementById('btn-clicks-clear-all')?.addEventListener('click', () => clearClicksLog('all'));
  document.getElementById('clicks-search')?.addEventListener('input', scheduleClicksReload);
  document.getElementById('clicks-filter-destino')?.addEventListener('change', () => loadClicks());

  async function sendTestEmail(type, label) {
    const token = sessionStorage.getItem(SESSION_KEY);
    const base = apiBase();
    if (!base || !token) {
      showStatus('Faça login com a API para testar e-mail.', 'error', 'api');
      return;
    }
    showStatus(`Enviando ${label}...`, '', 'api');
    try {
      const email = els.configForm?.formsubmitEmail?.value?.trim();
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
        showStatus(`${label} enviado via ${data.provider || 'resend'}! Confira a caixa de entrada (e spam).`, 'success', 'api');
        loadIntegrationsStatus();
      } else {
        const err = data.resend?.error || data.error || data.formsubmit?.data?.message || 'Falha no envio';
        showStatus('Erro: ' + err, 'error', 'api');
      }
    } catch (err) {
      showStatus(err.message, 'error', 'api');
    }
  }

  document.getElementById('btn-test-email')?.addEventListener('click', () => sendTestEmail('generic', 'E-mail de teste'));
  document.getElementById('btn-test-email-order')?.addEventListener('click', () => sendTestEmail('order', 'E-mail de novo pedido'));
  document.getElementById('btn-test-email-paid')?.addEventListener('click', () => sendTestEmail('paid', 'E-mail PAGO'));

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
      commissionPercent: 10
    });
    renderCoupons(coupons);
  });

  document.getElementById('btn-add-main-product')?.addEventListener('click', () => {
    const all = collectProductsFromDom();
    const main = all.filter((p) => !p.aggregated);
    const aggregated = all.filter((p) => p.aggregated);
    main.push({
      id: 'lente-' + Date.now(),
      slug: 'lente-' + Date.now(),
      name: 'Nova lente Sensor Tattoo Fix',
      description: '',
      price: 62.9,
      image: '/site/sensortattoofix.jpg',
      active: true,
      requiresSmartwatch: true,
      weightGrams: 3,
      sensorMm: 25
    });
    renderProducts([...main, ...aggregated]);
    showProductSubtab('main');
  });

  document.getElementById('btn-add-aggregated-product')?.addEventListener('click', () => {
    const all = collectProductsFromDom();
    const main = all.filter((p) => !p.aggregated);
    const aggregated = all.filter((p) => p.aggregated);
    aggregated.push({
      id: 'agregado-' + Date.now(),
      slug: 'agregado-' + Date.now(),
      name: 'Novo produto agregado',
      description: '',
      price: 20,
      image: '/produtos/pelicula-redonda.svg',
      active: true,
      aggregated: true,
      requiresSmartwatch: false,
      weightGrams: 1
    });
    renderProducts([...main, ...aggregated]);
    showProductSubtab('aggregated');
  });

  document.addEventListener('DOMContentLoaded', async () => {
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
