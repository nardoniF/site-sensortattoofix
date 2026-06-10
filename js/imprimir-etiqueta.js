(function () {
  const SESSION_KEY = 'stf_admin_token';
  const bootstrap = window.CONFIG_BOOTSTRAP || {};

  const els = {
    form: document.getElementById('label-form'),
    orderId: document.getElementById('label-order-id'),
    apiUrl: document.getElementById('label-api-url'),
    username: document.getElementById('label-username'),
    password: document.getElementById('label-password'),
    status: document.getElementById('label-status')
  };

  function apiBase() {
    return (els.apiUrl?.value || bootstrap.configApiUrl || '').replace(/\/$/, '');
  }

  function showStatus(msg, type) {
    if (!els.status) return;
    els.status.textContent = msg;
    els.status.className = 'admin-status ' + (type || '');
    els.status.hidden = !msg;
  }

  async function ensureLogin() {
    const base = apiBase();
    if (!base) throw new Error('Informe a URL da API.');

    let token = sessionStorage.getItem(SESSION_KEY);
    if (token) {
      const res = await fetch(base + '/admin/session', {
        headers: { Authorization: 'Bearer ' + token },
        cache: 'no-store'
      });
      if (res.ok) return token;
      sessionStorage.removeItem(SESSION_KEY);
    }

    const password = els.password?.value;
    if (!password) throw new Error('Informe a senha do admin.');

    const res = await fetch(base + '/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: els.username?.value || 'admin',
        password
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Login inválido.');
    }
    const data = await res.json();
    token = data.token;
    sessionStorage.setItem(SESSION_KEY, token);
    return token;
  }

  async function loadShippingConfig() {
    const base = apiBase();
    try {
      const res = await fetch(base + '/config', { cache: 'no-store' });
      if (res.ok) {
        const cfg = await res.json();
        window.STF_ORDER_LABEL?.configure(cfg.shipping);
      }
    } catch (e) {
      console.warn(e);
    }
  }

  async function fetchOrder(orderId, token) {
    const base = apiBase();
    const res = await fetch(base + '/orders/' + encodeURIComponent(orderId), {
      headers: { Authorization: 'Bearer ' + token },
      cache: 'no-store'
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Pedido não encontrado.');
    }
    return res.json();
  }

  async function printOrder(orderId) {
    showStatus('Carregando pedido…', '');
    const token = await ensureLogin();
    await loadShippingConfig();
    const order = await fetchOrder(orderId, token);

    if (order.status !== 'paid') {
      throw new Error('Só é possível imprimir etiqueta de pedido PAGO.');
    }
    if (!window.STF_ORDER_LABEL) {
      throw new Error('Módulo de etiqueta não carregou.');
    }

    window.STF_ORDER_LABEL.print(order);
    showStatus('Etiqueta aberta — use Ctrl+P se não imprimir sozinha.', 'success');
  }

  els.form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const orderId = (els.orderId?.value || '').trim();
    if (!orderId) {
      showStatus('Informe o número do pedido.', 'error');
      return;
    }
    try {
      await printOrder(orderId);
    } catch (err) {
      showStatus(err.message, 'error');
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    if (bootstrap.configApiUrl && els.apiUrl) {
      els.apiUrl.value = bootstrap.configApiUrl;
    }

    const params = new URLSearchParams(location.search);
    const orderFromUrl = params.get('order');
    if (orderFromUrl && els.orderId) {
      els.orderId.value = orderFromUrl;
    }

    const token = sessionStorage.getItem(SESSION_KEY);
    if (orderFromUrl && token && apiBase()) {
      printOrder(orderFromUrl).catch((err) => showStatus(err.message, 'error'));
    }
  });
})();
