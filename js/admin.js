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
    modeBadge: document.getElementById('admin-mode'),
    btnDownload: document.getElementById('btn-download-config'),
    updatedAt: document.getElementById('config-updated-at'),
    loginApiUrl: document.getElementById('login-api-url')
  };

  let currentConfig = null;

  function apiBase() {
    const url = (
      els.configForm?.apiBaseUrl?.value ||
      els.loginApiUrl?.value ||
      bootstrap.configApiUrl ||
      ''
    ).trim();
    return url.replace(/\/$/, '');
  }

  function showStatus(text, type, target) {
    const el = target === 'panel' ? els.statusPanel : els.statusMsg;
    if (!el) return;
    el.textContent = text;
    el.className = 'admin-status ' + (type || '');
    el.hidden = !text;
  }

  function setModeBadge(online) {
    if (!els.modeBadge) return;
    els.modeBadge.textContent = online ? 'API conectada' : 'Modo arquivo local';
    els.modeBadge.className = 'admin-mode-badge ' + (online ? 'online' : 'offline');
  }

  async function loadConfig() {
    const base = apiBase();
    if (base) {
      try {
        const res = await fetch(base + '/config', { cache: 'no-store' });
        if (res.ok) {
          currentConfig = await res.json();
          setModeBadge(true);
          return currentConfig;
        }
      } catch (e) {
        console.warn(e);
      }
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
    estimate: 'Estimativa fixa no código — configure CORREIOS_USER no Worker'
  };

  function renderIntlShipping(zones) {
    const list = document.getElementById('admin-intl-zones');
    if (!list) return;
    const entries = Object.entries(zones || {}).sort((a, b) => a[0].localeCompare(b[0]));
    list.innerHTML = entries.map(([code, z]) => `
      <div class="admin-intl-row" data-code="${escAttr(code)}">
        <div class="form-grid">
          <div class="admin-intl-code">${escAttr(code)}</div>
          <label>País<input type="text" data-field="label" value="${escAttr(z.label || code)}"></label>
          <label>Fallback R$<input type="number" data-field="price" step="0.01" min="0" value="${z.price ?? 0}"></label>
          <label>Dias<input type="number" data-field="days" min="1" step="1" value="${z.days ?? 15}"></label>
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
    return [
      `${i + 1}. ${opt.service || '—'}`,
      `   R$ ${price} · ${opt.days ?? '—'} dias · ${QUOTE_SOURCE_LABELS[opt.source] || opt.source || '—'}`,
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
      { id: 'br-mini-envios', enabled: true, scope: 'BR', label: 'Mini Envios', correiosCode: '04227' },
      { id: 'br-carta-registrada', enabled: true, scope: 'BR', label: 'Carta Registrada', correiosCode: '8010' },
      { id: 'int-todos', enabled: true, scope: 'INT', label: 'Todos do simulador Correios', correiosCode: '*' }
    ];
  }

  function renderShippingMethods(methods) {
    const list = document.getElementById('admin-shipping-methods');
    if (!list) return;
    const rows = (methods?.length ? methods : defaultShippingMethods());
    list.innerHTML = rows.map((m, i) => `
      <div class="admin-ship-method-row" data-method-index="${i}">
        <div class="form-grid">
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
          <label>Nome exibido<input type="text" data-field="label" value="${escAttr(m.label || '')}"></label>
          <label>Código Correios<input type="text" data-field="correiosCode" value="${escAttr(m.correiosCode || '')}" placeholder="04227 ou *"></label>
          <input type="hidden" data-field="id" value="${escAttr(m.id || `method-${i}`)}">
        </div>
        <button type="button" class="btn-secondary btn-remove-ship-method" data-index="${i}" style="margin-top:6px"><i class="fas fa-trash"></i> Remover</button>
      </div>
    `).join('');

    list.querySelectorAll('.btn-remove-ship-method').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-index'));
        const next = collectShippingMethods().filter((_, j) => j !== idx);
        renderShippingMethods(next.length ? next : defaultShippingMethods());
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
      return {
        id,
        enabled: val('enabled'),
        scope: val('scope') || 'BR',
        label: val('label') || id,
        correiosCode: val('correiosCode')
      };
    });
  }

  function showQuoteResult(text) {
    const el = document.getElementById('shipping-quote-result');
    if (!el) return;
    el.textContent = text;
    el.hidden = !text;
  }

  async function runShippingQuote(mode) {
    const base = apiBase();
    if (!base) {
      showStatus('Configure a URL da API para testar frete.', 'error', 'panel');
      return;
    }
    const f = els.configForm;
    const weight = parseFloat(f.shippingWeight?.value) || 3;
    let url;
    if (mode === 'br') {
      const cep = (document.getElementById('test-ship-cep')?.value || '').replace(/\D/g, '');
      if (cep.length !== 8) {
        showStatus('Informe um CEP brasileiro válido para testar.', 'error', 'panel');
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
        showStatus('Atenção: o cliente veria estimativa/fallback, não a API dos Correios.', 'warning', 'panel');
      } else {
        showStatus('Cotação obtida da API dos Correios.', 'success', 'panel');
      }
    } catch (err) {
      showQuoteResult('Erro: ' + (err.message || 'falha na cotação'));
      showStatus(err.message, 'error', 'panel');
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
      const brLine = br.credentialsConfigured
        ? (br.apiConnected
          ? '<span class="admin-status-ok">✓ API Correios BR conectada</span> (Mini Envios ' + escAttr(br.serviceCode) + ')'
          : '<span class="admin-status-warn">⚠ Credenciais BR configuradas, mas token não obtido — confira usuário/senha/contrato</span>')
        : '<span class="admin-status-bad">✗ API Correios BR não configurada — frete nacional usa estimativa fixa</span>';

      const expLine = exp.simulatorReachable && exp.sampleQuotePT
        ? `<span class="admin-status-ok">✓ Exporta Fácil OK</span> — Portugal agora: <strong>R$ ${Number(exp.sampleQuotePT.price).toFixed(2).replace('.', ',')}</strong> (${exp.sampleQuotePT.weightGrams} g)`
        : '<span class="admin-status-bad">✗ Simulador internacional indisponível — checkout usaria tabela fallback abaixo</span>';

      const mismatch = data.weightMismatch
        ? `<br><span class="admin-status-warn">⚠ ${escAttr(data.weightMismatchHint || 'Peso do produto diferente do pacote')}</span>`
        : '';

      el.innerHTML = brLine + '<br>' + expLine + mismatch;

      if (exp.sampleQuotesPT?.length) {
        showQuoteResult(formatQuoteResult({ options: exp.sampleQuotesPT, weightGrams: data.package?.weightGrams }));
      } else if (exp.sampleQuotePT) {
        showQuoteResult(formatQuoteResult(exp.sampleQuotePT));
      }
    } catch (err) {
      el.innerHTML = '<span class="admin-status-warn">' + escAttr(err.message || 'Erro ao carregar status') + '</span>';
    }
  }

  function renderProducts(products) {
    const list = document.getElementById('admin-products-list');
    if (!list) return;
    list.innerHTML = products.map((p, i) => `
      <div class="admin-product-row" data-product-index="${i}">
        <h4>Produto ${i + 1}</h4>
        <div class="form-grid">
          <label class="full">Nome<input type="text" data-field="name" value="${escAttr(p.name)}" required></label>
          <label class="full">Descrição<textarea data-field="description" rows="2">${escTextarea(p.description)}</textarea></label>
          <label>Preço (R$)<input type="number" data-field="price" step="0.01" min="0" value="${p.price ?? 0}"></label>
          <label>Slug (URL)<input type="text" data-field="slug" value="${p.slug || p.id || ''}" placeholder="kit-sensor-tattoofix"></label>
          <label class="full">URL da imagem<input type="url" data-field="image" value="${p.image || ''}"></label>
          <label>Peso (g)<input type="number" data-field="weightGrams" min="0.1" step="0.1" value="${p.weightGrams ?? 3}"></label>
          <div class="admin-product-flags">
            <label class="label-check"><input type="checkbox" data-field="active" ${p.active !== false ? 'checked' : ''}><span>Ativo na loja</span></label>
            <label class="label-check"><input type="checkbox" data-field="requiresSmartwatch" ${p.requiresSmartwatch !== false ? 'checked' : ''}><span>Pede modelo do relógio</span></label>
          </div>
        </div>
        <button type="button" class="btn-secondary btn-remove-product" data-index="${i}" style="margin-top:8px"><i class="fas fa-trash"></i> Remover</button>
      </div>
    `).join('');

    list.querySelectorAll('.btn-remove-product').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-index'));
        const next = collectProductsFromDom().filter((_, j) => j !== idx);
        renderProducts(next.length ? next : [{
          id: 'novo-produto', slug: 'novo-produto', name: 'Novo produto', description: '', price: 0,
          image: '', active: true, requiresSmartwatch: false, weightGrams: 3
        }]);
      });
    });
  }

  function collectProductsFromDom() {
    const list = document.getElementById('admin-products-list');
    if (!list) return [];
    return [...list.querySelectorAll('.admin-product-row')].map((row, i) => {
      const val = (field) => {
        const el = row.querySelector(`[data-field="${field}"]`);
        if (!el) return '';
        if (el.type === 'checkbox') return el.checked;
        return el.type === 'number' ? Number(el.value) : el.value.trim();
      };
      const name = val('name');
      const slug = val('slug') || slugify(name) || `produto-${i + 1}`;
      return {
        id: slug,
        slug,
        name,
        description: val('description'),
        price: Number(val('price')) || 0,
        image: val('image'),
        active: val('active'),
        requiresSmartwatch: val('requiresSmartwatch'),
        weightGrams: Number(val('weightGrams')) || 3
      };
    });
  }

  function fillForm(config) {
    const f = els.configForm;
    if (!f || !config) return;
    renderProducts(getProductsFromConfig(config));
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
    renderIntlShipping(config.internationalShipping || {});
    if (f.shippingWeight) f.shippingWeight.value = ship.weightGrams ?? 3;
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
    if (els.updatedAt) {
      els.updatedAt.textContent = config.updatedAt
        ? 'Última atualização: ' + new Date(config.updatedAt).toLocaleString('pt-BR')
        : '';
    }
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
      showStatus('Informe um CEP válido com 8 dígitos.', 'error', 'panel');
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
      showStatus('Endereço preenchido pelo CEP.', 'success', 'panel');
    } catch (err) {
      showStatus(err.message || 'Erro ao buscar CEP.', 'error', 'panel');
    }
  }

  function collectForm() {
    const f = els.configForm;
    const products = collectProductsFromDom();
    const primary = products.find((p) => p.active !== false) || products[0] || {};
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
        weightGrams: parseFloat(f.shippingWeight?.value) || 3,
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
        key: f.pixKey.value.trim(),
        keyType: f.pixKeyType?.value || 'cnpj',
        merchantName: f.pixMerchantName.value.trim(),
        merchantCity: f.pixMerchantCity.value.trim()
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
      smartwatchModels: currentConfig?.smartwatchModels || [],
      internationalShipping: collectIntlShipping(),
      shippingMethods: collectShippingMethods(),
      updatedAt: new Date().toISOString()
    };
  }

  function showPanel() {
    els.loginScreen.hidden = true;
    els.panelScreen.hidden = false;
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

    const res = await fetch(base.replace(/\/$/, '') + '/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

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
      showStatus(err.message || 'Erro ao carregar configuração.', 'error', 'panel');
      throw err;
    }
  }

  async function enterOfflineMode() {
    showStatus('Carregando modo offline...', '');
    try {
      showPanel();
      await initPanel();
      showStatus('Modo offline: alterações são salvas como download do JSON.', 'warning', 'panel');
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
      showStatus('Login realizado com sucesso.', 'success', 'panel');
    } catch (err) {
      showStatus(err.message, 'error');
    }
  });

  els.configForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    showStatus('Salvando...', '');
    try {
      const config = collectForm();
      const base = apiBase() || bootstrap.configApiUrl;

      if (base && sessionStorage.getItem(SESSION_KEY)) {
        const saved = await saveConfig(config);
        currentConfig = saved;
        fillForm(saved);
        await loadShippingStatus();
        showStatus('Configuração salva! O site já usa os novos valores.', 'success', 'panel');
      } else {
        downloadConfig(config);
        showStatus(
          'Arquivo baixado. Substitua data/store-config.json no GitHub e faça deploy, ou configure a API para salvar online.',
          'warning',
          'panel'
        );
      }
    } catch (err) {
      showStatus(err.message, 'error', 'panel');
    }
  });

  els.btnDownload?.addEventListener('click', () => {
    downloadConfig(collectForm());
    showStatus('Backup JSON baixado.', 'success', 'panel');
  });

  els.logoutBtn?.addEventListener('click', () => {
    showLogin();
    showStatus('', '');
    showStatus('', '', 'panel');
  });

  document.getElementById('btn-offline-mode')?.addEventListener('click', () => {
    enterOfflineMode();
  });

  async function exportOrders(format) {
    const token = sessionStorage.getItem(SESSION_KEY);
    const base = apiBase();
    if (!base || !token) {
      showStatus('Faça login com a API para exportar pedidos.', 'error', 'panel');
      return;
    }
    const res = await fetch(`${base}/orders?format=${format}`, {
      headers: { Authorization: 'Bearer ' + token }
    });
    if (!res.ok) {
      showStatus('Erro ao exportar pedidos.', 'error', 'panel');
      return;
    }
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = format === 'csv' ? 'pedidos.csv' : 'pedidos.json';
    a.click();
    URL.revokeObjectURL(a.href);
    showStatus('Pedidos exportados!', 'success', 'panel');
  }

  document.getElementById('btn-export-json')?.addEventListener('click', () => exportOrders('json'));
  document.getElementById('btn-export-csv')?.addEventListener('click', () => exportOrders('csv'));

  async function sendTestEmail(type, label) {
    const token = sessionStorage.getItem(SESSION_KEY);
    const base = apiBase();
    if (!base || !token) {
      showStatus('Faça login com a API para testar e-mail.', 'error', 'panel');
      return;
    }
    showStatus(`Enviando ${label}...`, '', 'panel');
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
        showStatus(`${label} enviado via ${data.provider || 'resend'}! Confira a caixa de entrada (e spam).`, 'success', 'panel');
      } else {
        const err = data.resend?.error || data.error || data.formsubmit?.data?.message || 'Falha no envio';
        showStatus('Erro: ' + err, 'error', 'panel');
      }
    } catch (err) {
      showStatus(err.message, 'error', 'panel');
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

  document.getElementById('btn-add-product')?.addEventListener('click', () => {
    const products = collectProductsFromDom();
    products.push({
      id: 'produto-' + Date.now(),
      slug: 'produto-' + Date.now(),
      name: 'Novo produto',
      description: '',
      price: 0,
      image: '',
      active: true,
      requiresSmartwatch: false,
      weightGrams: 3
    });
    renderProducts(products);
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
