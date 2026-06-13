(function () {
  const A = () => window.STF_ACCOUNT;

  function L(key, vars) {
    return window.STF_I18N?.t(key, vars) || key;
  }

  function isEn() {
    return window.STF_I18N?.isEn?.() || false;
  }

  function lojaHref() {
    return window.STF_I18N?.lojaHref?.() || 'loja.html';
  }

  function comprarHref(orderId, token) {
    const base = window.STF_I18N?.comprarPageHref?.() || 'comprar.html';
    const params = new URLSearchParams({ pedido: orderId, token: token || '' });
    return `${base}?${params.toString()}`;
  }

  const els = {
    loginBox: document.getElementById('conta-login'),
    panelBox: document.getElementById('conta-panel'),
    loginForm: document.getElementById('conta-login-form'),
    registerForm: document.getElementById('conta-register-form'),
    ordersList: document.getElementById('conta-orders'),
    userName: document.getElementById('conta-user-name'),
    logoutBtn: document.getElementById('conta-logout'),
    loginStatus: document.getElementById('conta-login-status'),
    registerStatus: document.getElementById('conta-register-status'),
    tabs: document.querySelectorAll('[data-conta-tab]')
  };

  function formatBRL(v) {
    const loc = isEn() ? 'en-US' : 'pt-BR';
    return Number(v || 0).toLocaleString(loc, { style: 'currency', currency: 'BRL' });
  }

  function formatDate(iso) {
    if (!iso) return '—';
    const loc = isEn() ? 'en-US' : 'pt-BR';
    return new Date(iso).toLocaleString(loc);
  }

  function statusLabel(status) {
    if (status === 'paid') return L('conta.statusPaid');
    if (status === 'pending_payment') return L('conta.statusPending');
    return status || '—';
  }

  function activeStatusEl() {
    const loginPanel = document.querySelector('[data-conta-panel="login"]');
    if (loginPanel && !loginPanel.hidden) return els.loginStatus;
    return els.registerStatus;
  }

  function showStatus(text, type) {
    const el = activeStatusEl();
    if (!el) return;
    if (els.loginStatus && els.loginStatus !== el) {
      els.loginStatus.hidden = true;
      els.loginStatus.textContent = '';
    }
    if (els.registerStatus && els.registerStatus !== el) {
      els.registerStatus.hidden = true;
      els.registerStatus.textContent = '';
    }
    el.textContent = text;
    el.className = 'admin-status form-status ' + (type || '');
    el.hidden = !text;
    if (text) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function showPanel(user) {
    if (els.loginBox) els.loginBox.hidden = true;
    if (els.panelBox) els.panelBox.hidden = false;
    const name = user?.nome || user?.email || L('nav.guest');
    if (els.userName) els.userName.textContent = name;
    const h1 = document.querySelector('#conta-panel h1');
    if (h1) {
      h1.innerHTML = `${L('conta.hello', { name: `<span id="conta-user-name">${escapeHtml(name)}</span>` })}`;
      els.userName = document.getElementById('conta-user-name');
    }
    A()?.initNav();
  }

  function showLogin() {
    if (els.loginBox) els.loginBox.hidden = false;
    if (els.panelBox) els.panelBox.hidden = true;
    A()?.clearSession();
    A()?.initNav();
  }

  function escapeHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  }

  async function loadOrders() {
    const data = await A().api('/me/orders');
    const orders = data.orders || [];
    if (!els.ordersList) return;
    if (!orders.length) {
      els.ordersList.innerHTML = `<p class="conta-empty">${L('conta.noOrders')} <a href="${lojaHref()}">${L('conta.goShop')}</a></p>`;
      return;
    }
    els.ordersList.innerHTML = orders.map((o) => `
      <article class="conta-order-card">
        <div class="conta-order-head">
          <strong>${escapeHtml(o.orderId)}</strong>
          <span class="conta-order-status status-${escapeHtml(o.status)}">${escapeHtml(statusLabel(o.status))}</span>
        </div>
        <p>${L('conta.total')}: <strong>${formatBRL(o.total)}</strong></p>
        ${(o.modeloRelogio || o.smartwatch || o.observacoes) ? `<p class="conta-order-meta">${L('conta.watch')}: ${escapeHtml(window.STF_ORDER_WATCH?.formatModel(o) || o.smartwatch || '—')}</p>` : ''}
        <p class="conta-order-meta">${formatDate(o.paidAt || o.createdAt)} · ${escapeHtml(o.pagamento || '')}</p>
        ${o.status === 'pending_payment' ? `<a class="btn-secondary conta-order-link" href="${comprarHref(o.orderId, o.accessToken)}">${L('conta.continuePay')}</a>` : ''}
      </article>
    `).join('');
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
      showStatus(L('conta.entering'), '');
      try {
        const f = e.target;
        const data = await A().login(f.email.value, f.password.value);
        showStatus('', '');
        showPanel(data.user);
        await loadOrders();
      } catch (err) {
        showStatus(err.message, 'error');
      }
    });

    els.registerForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      showStatus(L('conta.creating'), '');
      try {
        const f = e.target;
        if (f.password.value.length < 6) throw new Error(L('conta.passwordMinErr'));
        const data = await A().register({
          nome: f.nome.value.trim(),
          email: f.email.value.trim(),
          telefone: f.telefone.value.trim(),
          cpf: f.cpf.value.trim(),
          senha: f.password.value
        });
        showStatus(L('conta.created'), 'success');
        showPanel(data.user);
        await loadOrders();
      } catch (err) {
        showStatus(err.message, 'error');
      }
    });

    els.logoutBtn?.addEventListener('click', async () => {
      await A().logout();
      showLogin();
    });
  }

  async function boot() {
    bindTabs();
    bindForms();
    const user = await A().refreshSession();
    A().initNav();
    if (user) {
      showPanel(user);
      await loadOrders();
    } else {
      showLogin();
    }
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
