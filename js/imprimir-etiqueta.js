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

  function openPdfBase64(b64, filename) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener';
    if (filename) a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  async function printOrder(orderId) {
    showStatus('Carregando pedido…', '');
    const token = await ensureLogin();
    await loadShippingConfig();
    const order = await fetchOrder(orderId, token);

    if (order.status !== 'paid') {
      throw new Error('Só é possível imprimir etiqueta de pedido PAGO.');
    }

    showStatus('Gerando etiqueta…', '');
    const res = await fetch(apiBase() + '/orders/' + encodeURIComponent(orderId) + '/shipping-label', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token }
    });
    const data = await res.json().catch(() => ({}));

    if (data.mode === 'pdf' && data.pdfBase64) {
      openPdfBase64(data.pdfBase64, 'etiqueta-' + orderId + '.pdf');
      const track = data.trackingCode ? ' — rastreio ' + data.trackingCode : '';
      showStatus('Etiqueta Correios aberta' + track, 'success');
      return;
    }

    if (data.useClient && window.STF_ORDER_LABEL) {
      window.STF_ORDER_LABEL.print(order);
      showStatus((data.error || data.message || 'Etiqueta local') + ' (fallback HTML)', data.error ? 'warn' : 'success');
      return;
    }

    if (!window.STF_ORDER_LABEL) {
      throw new Error(data.error || data.detail || 'Módulo de etiqueta não carregou.');
    }
    window.STF_ORDER_LABEL.print(order);
    showStatus('Etiqueta local aberta — use Ctrl+P se não imprimir sozinha.', 'success');
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
