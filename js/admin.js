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
        weightGrams: 120
      }];
    }
    return [];
  }

  function renderProducts(products) {
    const list = document.getElementById('admin-products-list');
    if (!list) return;
    list.innerHTML = products.map((p, i) => `
      <div class="admin-product-row" data-product-index="${i}">
        <h4>Produto ${i + 1}</h4>
        <div class="form-grid">
          <label class="full">Nome<input type="text" data-field="name" value="${(p.name || '').replace(/"/g, '&quot;')}" required></label>
          <label class="full">Descrição<textarea data-field="description" rows="2">${p.description || ''}</textarea></label>
          <label>Preço (R$)<input type="number" data-field="price" step="0.01" min="0" value="${p.price ?? 0}"></label>
          <label>Slug (URL)<input type="text" data-field="slug" value="${p.slug || p.id || ''}" placeholder="kit-sensor-tattoofix"></label>
          <label class="full">URL da imagem<input type="url" data-field="image" value="${p.image || ''}"></label>
          <label>Peso (g)<input type="number" data-field="weightGrams" min="1" value="${p.weightGrams || 120}"></label>
          <label><input type="checkbox" data-field="active" ${p.active !== false ? 'checked' : ''}> Ativo na loja</label>
          <label><input type="checkbox" data-field="requiresSmartwatch" ${p.requiresSmartwatch !== false ? 'checked' : ''}> Pede modelo do relógio</label>
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
          image: '', active: true, requiresSmartwatch: false, weightGrams: 120
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
        weightGrams: Number(val('weightGrams')) || 120
      };
    });
  }

  function fillForm(config) {
    const f = els.configForm;
    renderProducts(getProductsFromConfig(config));
    const ship = config.shipping || {};
    if (f.shippingOriginCep) f.shippingOriginCep.value = ship.originCep || '';
    if (f.shippingWeight) f.shippingWeight.value = ship.weightGrams || 120;
    if (f.shippingServiceCode) f.shippingServiceCode.value = ship.serviceCode || '04227';
    if (f.shippingLength) f.shippingLength.value = ship.lengthCm || 16;
    if (f.shippingWidth) f.shippingWidth.value = ship.widthCm || 12;
    if (f.shippingHeight) f.shippingHeight.value = ship.heightCm || 3;
    f.pixKey.value = config.pix.key;
    if (f.pixKeyType) f.pixKeyType.value = config.pix.keyType || 'cnpj';
    f.pixMerchantName.value = config.pix.merchantName;
    f.pixMerchantCity.value = config.pix.merchantCity;
    f.whatsapp.value = config.whatsapp;
    f.formsubmitEmail.value = config.formsubmit.email;
    f.formsubmitSubject.value = config.formsubmit.subject;
    f.apiBaseUrl.value = (config.api && config.api.baseUrl) || bootstrap.configApiUrl || '';
    if (els.updatedAt) {
      els.updatedAt.textContent = config.updatedAt
        ? 'Última atualização: ' + new Date(config.updatedAt).toLocaleString('pt-BR')
        : '';
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
        weightGrams: parseInt(f.shippingWeight?.value, 10) || 120,
        lengthCm: parseFloat(f.shippingLength?.value) || 16,
        widthCm: parseFloat(f.shippingWidth?.value) || 12,
        heightCm: parseFloat(f.shippingHeight?.value) || 3,
        serviceCode: f.shippingServiceCode?.value.trim() || '04227',
        serviceName: 'Mini Envios'
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
      siteUrl: currentConfig.siteUrl,
      api: {
        baseUrl: f.apiBaseUrl.value.trim()
      },
      smartwatchModels: currentConfig?.smartwatchModels || [],
      internationalShipping: currentConfig?.internationalShipping || {},
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

  async function initPanel() {
    await loadConfig();
    fillForm(currentConfig);
  }

  els.loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    showStatus('Entrando...', '');
    try {
      const fd = new FormData(els.loginForm);
      await tryLogin(fd.get('username'), fd.get('password'));
      showPanel();
      await initPanel();
      showStatus('Login realizado com sucesso.', 'success');
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
      weightGrams: 120
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
