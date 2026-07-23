(function () {
  const A = () => window.STF_ACCOUNT;

  function L(key, vars) {
    return window.STF_I18N?.t(key, vars) || key;
  }

  function locale() {
    const lang = window.STF_I18N?.getLang?.() || 'pt';
    return lang === 'it' ? 'it-IT' : lang === 'en' ? 'en-US' : 'pt-BR';
  }

  function langCode() {
    const lang = window.STF_I18N?.getLang?.() || 'pt';
    if (lang === 'it' || lang === 'en') return lang;
    return 'pt';
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
    forgotForm: document.getElementById('conta-forgot-form'),
    resetForm: document.getElementById('conta-reset-form'),
    profileForm: document.getElementById('conta-profile-form'),
    ordersList: document.getElementById('conta-orders'),
    userName: document.getElementById('conta-user-name'),
    logoutBtn: document.getElementById('conta-logout'),
    loginStatus: document.getElementById('conta-login-status'),
    registerStatus: document.getElementById('conta-register-status'),
    forgotStatus: document.getElementById('conta-forgot-status'),
    resetStatus: document.getElementById('conta-reset-status'),
    profileStatus: document.getElementById('conta-profile-status'),
    tabs: document.querySelectorAll('[data-conta-tab]'),
    panelTabs: document.querySelectorAll('[data-conta-panel-tab]')
  };

  function formatBRL(v) {
    const loc = locale();
    return Number(v || 0).toLocaleString(loc, { style: 'currency', currency: 'BRL' });
  }

  function formatDate(iso) {
    if (!iso) return '—';
    const loc = locale();
    return new Date(iso).toLocaleString(loc);
  }

  function statusLabel(status) {
    if (status === 'paid') return L('conta.statusPaid');
    if (status === 'pending_payment') return L('conta.statusPending');
    return status || '—';
  }

  function maskCep(value) {
    const d = String(value || '').replace(/\D/g, '').slice(0, 8);
    if (d.length <= 5) return d;
    return `${d.slice(0, 5)}-${d.slice(5)}`;
  }

  function showNamedStatus(el, text, type) {
    if (!el) return;
    el.textContent = text;
    el.className = 'admin-status form-status ' + (type || '');
    el.hidden = !text;
    if (text) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function activeStatusEl() {
    const loginPanel = document.querySelector('[data-conta-panel="login"]');
    const forgotPanel = document.querySelector('[data-conta-panel="forgot"]');
    const resetPanel = document.querySelector('[data-conta-panel="reset"]');
    if (forgotPanel && !forgotPanel.hidden) return els.forgotStatus;
    if (resetPanel && !resetPanel.hidden) return els.resetStatus;
    if (loginPanel && !loginPanel.hidden) return els.loginStatus;
    return els.registerStatus;
  }

  function showStatus(text, type) {
    const el = activeStatusEl();
    [els.loginStatus, els.registerStatus, els.forgotStatus, els.resetStatus].forEach((s) => {
      if (s && s !== el) {
        s.hidden = true;
        s.textContent = '';
      }
    });
    showNamedStatus(el, text, type);
  }

  function showProfileStatus(text, type) {
    showNamedStatus(els.profileStatus, text, type);
  }

  function showAuthPanel(target) {
    document.querySelectorAll('#conta-login [data-conta-panel]').forEach((p) => {
      p.hidden = p.getAttribute('data-conta-panel') !== target;
    });
    const showTabs = target === 'login' || target === 'register';
    document.querySelector('.conta-tabs')?.classList.toggle('is-hidden-auth-extra', !showTabs);
    els.tabs.forEach((t) => {
      t.classList.toggle('active', t.getAttribute('data-conta-tab') === target);
      t.hidden = !showTabs;
    });
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
    fillProfileForm(user);
    A()?.initNav();
  }

  function showLogin() {
    if (els.loginBox) els.loginBox.hidden = false;
    if (els.panelBox) els.panelBox.hidden = true;
    A()?.clearSession();
    A()?.initNav();
    showAuthPanel('login');
  }

  function escapeHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  }

  function fillProfileForm(user) {
    const f = els.profileForm;
    if (!f || !user) return;
    if (f.nome) f.nome.value = user.nome || '';
    if (f.email) f.email.value = user.email || '';
    if (f.telefone) f.telefone.value = user.telefone || '';
    if (f.cpf) f.cpf.value = user.cpf || '';
    const a = user.address || {};
    if (f.cep) f.cep.value = a.cep ? maskCep(a.cep) : '';
    if (f.rua) f.rua.value = a.rua || '';
    if (f.numero) f.numero.value = a.numero || '';
    if (f.complemento) f.complemento.value = a.complemento || '';
    if (f.bairro) f.bairro.value = a.bairro || '';
    if (f.cidade) f.cidade.value = a.cidade || '';
    if (f.uf) f.uf.value = a.uf || '';
    if (f.senhaAtual) f.senhaAtual.value = '';
    if (f.senhaNova) f.senhaNova.value = '';
  }

  async function lookupProfileCep() {
    const f = els.profileForm;
    if (!f?.cep) return;
    const cep = f.cep.value.replace(/\D/g, '');
    if (cep.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (data.erro) return;
      if (f.rua) f.rua.value = data.logradouro || f.rua.value;
      if (f.bairro) f.bairro.value = data.bairro || f.bairro.value;
      if (f.cidade) f.cidade.value = data.localidade || '';
      if (f.uf) f.uf.value = data.uf || '';
    } catch (_) { /* ignore */ }
  }

  function setPanelView(view) {
    document.querySelectorAll('[data-conta-panel-view]').forEach((el) => {
      el.hidden = el.getAttribute('data-conta-panel-view') !== view;
    });
    els.panelTabs.forEach((tab) => {
      tab.classList.toggle('active', tab.getAttribute('data-conta-panel-tab') === view);
    });
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
        showAuthPanel(target);
      });
    });

    document.querySelectorAll('[data-conta-show]').forEach((btn) => {
      btn.addEventListener('click', () => {
        showAuthPanel(btn.getAttribute('data-conta-show'));
        showStatus('', '');
      });
    });

    els.panelTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        setPanelView(tab.getAttribute('data-conta-panel-tab'));
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
        setPanelView('orders');
        await loadOrders();
      } catch (err) {
        showStatus(err.message, 'error');
      }
    });

    let forgotBusy = false;
    els.forgotForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (forgotBusy) return;
      forgotBusy = true;
      const form = e.target;
      const btn = form.querySelector('button[type="submit"]');
      if (btn) btn.disabled = true;
      showNamedStatus(els.forgotStatus, L('conta.forgotSending'), '');
      try {
        const email = form.email.value;
        const data = await A().forgotPassword(email, langCode());
        showNamedStatus(els.forgotStatus, data.message || L('conta.forgotSent'), 'success');
        // Keep button disabled after success — avoids impatient double-send.
      } catch (err) {
        forgotBusy = false;
        if (btn) btn.disabled = false;
        showNamedStatus(els.forgotStatus, err.message, 'error');
      }
    });

    let resetBusy = false;
    els.resetForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (resetBusy) return;
      const f = e.target;
      const senha = f.password.value;
      const confirm = f.passwordConfirm.value;
      if (senha !== confirm) {
        showNamedStatus(els.resetStatus, L('conta.resetMismatch'), 'error');
        return;
      }
      resetBusy = true;
      const btn = f.querySelector('button[type="submit"]');
      if (btn) btn.disabled = true;
      showNamedStatus(els.resetStatus, L('conta.resetSaving'), '');
      try {
        const data = await A().resetPassword(f.token.value, senha, langCode());
        showNamedStatus(els.resetStatus, data.message || L('conta.resetDone'), 'success');
        showPanel(data.user);
        setPanelView('orders');
        await loadOrders();
        const url = new URL(location.href);
        url.searchParams.delete('reset');
        history.replaceState({}, '', url.pathname + url.search + url.hash);
      } catch (err) {
        resetBusy = false;
        if (btn) btn.disabled = false;
        showNamedStatus(els.resetStatus, err.message, 'error');
      }
    });

    els.registerForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      showStatus(L('conta.creating'), '');
      try {
        const f = e.target;
        const data = await A().register({
          nome: f.nome.value.trim(),
          email: f.email.value.trim(),
          telefone: f.telefone.value.trim(),
          cpf: f.cpf?.value?.trim() || '',
          senha: f.password.value
        });
        showStatus('', '');
        showPanel(data.user);
        setPanelView('orders');
        await loadOrders();
      } catch (err) {
        showStatus(err.message, 'error');
      }
    });

    els.profileForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      showProfileStatus(L('conta.saving'), '');
      try {
        const f = e.target;
        const senhaNova = (f.senhaNova?.value || '').trim();
        if (senhaNova && senhaNova.length < 6) {
          showProfileStatus(L('conta.passwordMinErr'), 'error');
          return;
        }
        const payload = {
          nome: f.nome.value.trim(),
          telefone: f.telefone.value.trim(),
          cpf: f.cpf.value.trim(),
          address: {
            cep: f.cep?.value || '',
            rua: f.rua?.value || '',
            numero: f.numero?.value || '',
            complemento: f.complemento?.value || '',
            bairro: f.bairro?.value || '',
            cidade: f.cidade?.value || '',
            uf: f.uf?.value || ''
          }
        };
        if (senhaNova) {
          payload.senhaAtual = f.senhaAtual?.value || '';
          payload.senhaNova = senhaNova;
        }
        const data = await A().updateProfile(payload);
        showPanel(data.user);
        showProfileStatus(L('conta.profileSaved'), 'success');
      } catch (err) {
        showProfileStatus(err.message, 'error');
      }
    });

    const cepEl = document.getElementById('conta-cep');
    cepEl?.addEventListener('input', (e) => {
      e.target.value = maskCep(e.target.value);
    });
    cepEl?.addEventListener('blur', lookupProfileCep);

    els.logoutBtn?.addEventListener('click', async () => {
      await A().logout();
      showLogin();
    });
  }

  function consumeResetTokenFromUrl() {
    const params = new URLSearchParams(location.search);
    const token = String(params.get('reset') || '').trim();
    if (!token) return false;
    const tokenInput = document.getElementById('conta-reset-token');
    if (tokenInput) tokenInput.value = token;
    showAuthPanel('reset');
    return true;
  }

  function consumeForgotFromUrl() {
    const params = new URLSearchParams(location.search);
    if (params.get('forgot') !== '1' && location.hash !== '#forgot') return false;
    showAuthPanel('forgot');
    return true;
  }

  async function boot() {
    bindTabs();
    bindForms();
    const hasReset = consumeResetTokenFromUrl();
    const hasForgot = !hasReset && consumeForgotFromUrl();
    const user = await A().refreshSession();
    A().initNav();
    if (hasReset || hasForgot) {
      if (els.loginBox) els.loginBox.hidden = false;
      if (els.panelBox) els.panelBox.hidden = true;
      return;
    }
    if (user) {
      showPanel(user);
      setPanelView('orders');
      await loadOrders();
    } else {
      showLogin();
    }
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
