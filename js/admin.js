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
    statusPedidos: document.getElementById('admin-status-pedidos'),
    modeBadge: document.getElementById('admin-mode'),
    btnDownload: document.getElementById('btn-download-config'),
    updatedAt: document.getElementById('config-updated-at'),
    loginApiUrl: document.getElementById('login-api-url')
  };

  let currentConfig = null;

  function apiBase() {
    const loggedIn = !!sessionStorage.getItem(SESSION_KEY);
    const url = (
      (loggedIn && els.configForm?.apiBaseUrl?.value) ||
      els.loginApiUrl?.value ||
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
    if (target === 'pedidos') return els.statusPedidos;
    return els.statusMsg;
  }

  function showStatus(text, type, target) {
    const el = statusEl(target);
    if (!el) return;
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
  let customersLoading = false;

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

  async function loadIntegrationsStatus() {
    const tbody = document.getElementById('api-integrations-tbody');
    if (!tbody || integrationsLoading) return;

    const token = sessionStorage.getItem(SESSION_KEY);
    const base = apiBase();
    if (!base || !token) {
      renderIntegrationsTable([], null);
      tbody.innerHTML = '<tr><td colspan="3" class="admin-meta">Faça login com a API para testar as integrações.</td></tr>';
      return;
    }

    integrationsLoading = true;
    tbody.innerHTML = '<tr><td colspan="3" class="admin-meta"><i class="fas fa-spinner fa-spin"></i> Verificando integrações…</td></tr>';

    try {
      const res = await fetch(base.replace(/\/$/, '') + '/admin/integrations-status', {
        headers: { Authorization: 'Bearer ' + token },
        cache: 'no-store'
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Não autorizado');
      renderIntegrationsTable(data.integrations, data.checkedAt);
    } catch (err) {
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
        ? '<span class="admin-status-ok">✓ API 34 (Preço) OK</span> — ' + escAttr(br.precoApiDetail || '')
        : (br.precoApiDetail
          ? '<span class="admin-status-warn">⚠ API 34 (Preço): ' + escAttr(br.precoApiDetail) + '</span>'
          : '<span class="admin-status-bad">✗ API 34 (Preço) não testada</span>');

      const api35Line = br.prazoApiOk
        ? '<span class="admin-status-ok">✓ API 35 (Prazo) OK</span> — ' + escAttr(br.prazoApiDetail || '')
        : (br.prazoApiDetail
          ? '<span class="admin-status-warn">⚠ API 35 (Prazo): ' + escAttr(br.prazoApiDetail) + '</span>'
          : '<span class="admin-status-bad">✗ API 35 (Prazo) não testada</span>');

      const brLine = brTokenLine
        + ' · Mini Envios ' + escAttr(br.serviceCode || '04227')
        + '<br>' + api34Line
        + '<br>' + api35Line;

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
          id: 'kit-sensor-tattoofix', slug: 'kit-sensor-tattoofix', name: 'Kit Sensor TattooFix',
          description: '', price: 59.9, image: '/site/sensortattoofix.jpg', active: true,
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
    if (f.paypalShowAfter && paypalCfg.showAfter) {
      const d = new Date(paypalCfg.showAfter);
      if (!Number.isNaN(d.getTime())) {
        const pad = (n) => String(n).padStart(2, '0');
        f.paypalShowAfter.value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      }
    }
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
          showAfter: f.paypalShowAfter?.value
            ? new Date(f.paypalShowAfter.value).toISOString()
            : (currentConfig?.payments?.paypal?.showAfter || null)
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
      updatedAt: new Date().toISOString()
    };
  }

  const ADMIN_SAVE_TABS = new Set(['produtos', 'frete', 'pix', 'contato', 'api']);

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
      const id = tabId || 'produtos';
      tabs.forEach((tab) => {
        const active = tab.dataset.adminTab === id;
        tab.classList.toggle('active', active);
        tab.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      panels.forEach((panel) => {
        panel.hidden = panel.id !== 'admin-tab-' + id;
      });
      if (saveActions) saveActions.hidden = !ADMIN_SAVE_TABS.has(id);
      try { localStorage.setItem('stf_admin_tab', id); } catch (e) { /* ignore */ }
      if (id === 'api') loadIntegrationsStatus();
      if (id === 'clientes') loadCustomers();
      if (id === 'documentacao') loadDocFrame(true);
      if (id === 'frete') initFreteSubtabs();
    }

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => showTab(tab.dataset.adminTab));
    });

    let saved = 'produtos';
    try { saved = localStorage.getItem('stf_admin_tab') || 'produtos'; } catch (e) { /* ignore */ }
    if (!panels.some((p) => p.id === 'admin-tab-' + saved)) saved = 'produtos';
    showTab(saved);
  }

  function showPanel() {
    els.loginScreen.hidden = true;
    els.panelScreen.hidden = false;
    initAdminTabs();
  }

  function showLogin() {
    els.loginScreen.hidden = false;
    els.panelScreen.hidden = true;
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
      showStatus('Configure a URL da API para fazer login.', 'error');
      return false;
    }

    const user = String(username || '').trim();
    const pwd = String(password || '');
    if (!pwd) {
      throw new Error('Digite a senha no campo Senha (não é o texto cinza de dica).');
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
    showStatus('', '', 'pedidos');
  });

  document.getElementById('btn-offline-mode')?.addEventListener('click', () => {
    enterOfflineMode();
  });

  async function exportOrders(format) {
    const token = sessionStorage.getItem(SESSION_KEY);
    const base = apiBase();
    if (!base || !token) {
      showStatus('Faça login com a API para exportar pedidos.', 'error', 'pedidos');
      return;
    }
    const res = await fetch(`${base}/orders?format=${format}`, {
      headers: { Authorization: 'Bearer ' + token }
    });
    if (!res.ok) {
      showStatus('Erro ao exportar pedidos.', 'error', 'pedidos');
      return;
    }
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = format === 'csv' ? 'pedidos.csv' : 'pedidos.json';
    a.click();
    URL.revokeObjectURL(a.href);
    showStatus('Pedidos exportados!', 'success', 'pedidos');
  }

  document.getElementById('btn-export-json')?.addEventListener('click', () => exportOrders('json'));
  document.getElementById('btn-export-csv')?.addEventListener('click', () => exportOrders('csv'));

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

  document.getElementById('btn-add-main-product')?.addEventListener('click', () => {
    const all = collectProductsFromDom();
    const main = all.filter((p) => !p.aggregated);
    const aggregated = all.filter((p) => p.aggregated);
    main.push({
      id: 'lente-' + Date.now(),
      slug: 'lente-' + Date.now(),
      name: 'Nova lente Sensor TattooFix',
      description: '',
      price: 59.9,
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
    if (els.loginApiUrl && bootstrap.configApiUrl) {
      els.loginApiUrl.value = bootstrap.configApiUrl;
    }

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
    }
  });
})();
