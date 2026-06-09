(function () {
  const A = () => window.STF_ACCOUNT;

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
    A()?.initNav();
  }

  function showLogin() {
    if (els.loginBox) els.loginBox.hidden = false;
    if (els.panelBox) els.panelBox.hidden = true;
    A()?.clearSession();
    A()?.initNav();
  }

  async function loadOrders() {
    const data = await A().api('/me/orders');
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
        ${(o.modeloRelogio || o.smartwatch || o.observacoes) ? `<p class="conta-order-meta">Relógio: ${window.STF_ORDER_WATCH?.formatModel(o) || o.smartwatch || '—'}</p>` : ''}
        <p class="conta-order-meta">${formatDate(o.paidAt || o.createdAt)} · ${o.pagamento || ''}</p>
        ${o.status === 'pending_payment' ? `<a class="btn-secondary conta-order-link" href="comprar.html?pedido=${encodeURIComponent(o.orderId)}&token=${encodeURIComponent(o.accessToken || '')}">Continuar pagamento</a>` : ''}
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
      showStatus('Entrando...', '');
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
      showStatus('Criando conta...', '');
      try {
        const f = e.target;
        if (f.password.value.length < 6) throw new Error('Senha mínima: 6 caracteres.');
        const data = await A().register({
          nome: f.nome.value.trim(),
          email: f.email.value.trim(),
          telefone: f.telefone.value.trim(),
          cpf: f.cpf.value.trim(),
          senha: f.password.value
        });
        showStatus('Conta criada!', 'success');
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
