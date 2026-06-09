(function () {
  const SESSION_KEY = 'stf_customer_token';
  const USER_KEY = 'stf_customer_user';

  const els = {
    loginBox: document.getElementById('conta-login'),
    panelBox: document.getElementById('conta-panel'),
    loginForm: document.getElementById('conta-login-form'),
    registerForm: document.getElementById('conta-register-form'),
    ordersList: document.getElementById('conta-orders'),
    userName: document.getElementById('conta-user-name'),
    logoutBtn: document.getElementById('conta-logout'),
    status: document.getElementById('conta-status'),
    tabs: document.querySelectorAll('[data-conta-tab]')
  };

  function apiBase() {
    return ((window.CONFIG_BOOTSTRAP?.configApiUrl) || '').replace(/\/$/, '');
  }

  function token() {
    return localStorage.getItem(SESSION_KEY) || '';
  }

  function formatBRL(v) {
    return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('pt-BR');
  }

  function statusLabel(status) {
    if (status === 'paid') return 'Pago';
    if (status === 'pending_payment') return 'Aguardando pagamento';
    return status || '—';
  }

  function showStatus(text, type) {
    if (!els.status) return;
    els.status.textContent = text;
    els.status.className = 'admin-status ' + (type || '');
    els.status.hidden = !text;
  }

  function showPanel(user) {
    if (els.loginBox) els.loginBox.hidden = true;
    if (els.panelBox) els.panelBox.hidden = false;
    if (els.userName) els.userName.textContent = user?.nome || user?.email || 'Cliente';
  }

  function showLogin() {
    if (els.loginBox) els.loginBox.hidden = false;
    if (els.panelBox) els.panelBox.hidden = true;
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(USER_KEY);
  }

  async function api(path, options) {
    const base = apiBase();
    if (!base) throw new Error('API não configurada.');
    const headers = { ...(options?.headers || {}) };
    if (token()) headers.Authorization = 'Bearer ' + token();
    if (options?.json) {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.json);
      delete options.json;
    }
    const res = await fetch(base + path, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Erro na requisição.');
    return data;
  }

  async function loadOrders() {
    const data = await api('/me/orders');
    const orders = data.orders || [];
    if (!els.ordersList) return;
    if (!orders.length) {
      els.ordersList.innerHTML = '<p class="conta-empty">Nenhum pedido ainda. <a href="loja.html">Ir à loja</a></p>';
      return;
    }
    els.ordersList.innerHTML = orders.map((o) => `
      <article class="conta-order-card">
        <div class="conta-order-head">
          <strong>${o.orderId}</strong>
          <span class="conta-order-status status-${o.status}">${statusLabel(o.status)}</span>
        </div>
        <p>Total: <strong>${formatBRL(o.total)}</strong></p>
        <p class="conta-order-meta">${formatDate(o.paidAt || o.createdAt)} · ${o.pagamento || ''}</p>
        ${o.status === 'pending_payment' ? `<a class="btn-secondary conta-order-link" href="comprar.html?pedido=${encodeURIComponent(o.orderId)}&token=${encodeURIComponent(o.accessToken || '')}">Continuar pagamento</a>` : ''}
      </article>
    `).join('');
  }

  async function validateSession() {
    if (!token()) return null;
    try {
      const data = await api('/auth/session');
      if (data.user) localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      return data.user;
    } catch {
      showLogin();
      return null;
    }
  }

  function bindTabs() {
    els.tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const target = tab.getAttribute('data-conta-tab');
        document.querySelectorAll('[data-conta-panel]').forEach((p) => {
          p.hidden = p.getAttribute('data-conta-panel') !== target;
        });
        els.tabs.forEach((t) => t.classList.toggle('active', t === tab));
      });
    });
  }

  function bindForms() {
    els.loginForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      showStatus('Entrando...', '');
      try {
        const f = e.target;
        const data = await api('/auth/login', {
          method: 'POST',
          json: { email: f.email.value.trim(), senha: f.password.value }
        });
        localStorage.setItem(SESSION_KEY, data.token);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        showStatus('', '');
        showPanel(data.user);
        await loadOrders();
      } catch (err) {
        showStatus(err.message, 'error');
      }
    });

    els.registerForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      showStatus('Criando conta...', '');
      try {
        const f = e.target;
        if (f.password.value.length < 6) throw new Error('Senha mínima: 6 caracteres.');
        const data = await api('/auth/register', {
          method: 'POST',
          json: {
            nome: f.nome.value.trim(),
            email: f.email.value.trim(),
            telefone: f.telefone.value.trim(),
            cpf: f.cpf.value.trim(),
            senha: f.password.value
          }
        });
        localStorage.setItem(SESSION_KEY, data.token);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        showStatus('Conta criada!', 'success');
        showPanel(data.user);
        await loadOrders();
      } catch (err) {
        showStatus(err.message, 'error');
      }
    });

    els.logoutBtn?.addEventListener('click', async () => {
      try { await api('/auth/logout', { method: 'POST' }); } catch (_) { /* ok */ }
      showLogin();
    });
  }

  async function boot() {
    bindTabs();
    bindForms();
    const user = await validateSession();
    if (user) {
      showPanel(user);
      await loadOrders();
    } else {
      showLogin();
    }
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
