window.STF_ACCOUNT = (function () {
  const SESSION_KEY = 'stf_customer_token';
  const USER_KEY = 'stf_customer_user';

  function apiBase() {
    return ((window.CONFIG_BOOTSTRAP?.configApiUrl) || '').replace(/\/$/, '');
  }

  function pathPrefix() {
    if (location.pathname.includes('/en/')) return '';
    return window.STF_I18N?.isEn?.() ? 'en/' : '';
  }

  function accountLink() {
    return window.STF_I18N?.accountHref?.() || (pathPrefix() + 'minha-conta.html');
  }

  function getToken() {
    return localStorage.getItem(SESSION_KEY) || '';
  }

  function getUser() {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function setSession(token, user) {
    if (token) localStorage.setItem(SESSION_KEY, token);
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    notifyChange(user);
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(USER_KEY);
    notifyChange(null);
  }

  function notifyChange(user) {
    window.dispatchEvent(new CustomEvent('stf-account-changed', { detail: { user } }));
  }

  function navT(key, fallback) {
    return window.STF_I18N?.t?.(key) || fallback;
  }

  function displayName(user) {
    if (!user) return '';
    const nome = (user.nome || '').trim();
    if (nome) return nome.split(/\s+/)[0];
    return (user.email || '').split('@')[0] || navT('nav.guest', 'Cliente');
  }

  function escapeHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  }

  async function api(path, options = {}) {
    const base = apiBase();
    if (!base) throw new Error('API não configurada.');
    const headers = { ...(options.headers || {}) };
    const token = getToken();
    if (token) headers.Authorization = 'Bearer ' + token;
    if (options.json) {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.json);
      delete options.json;
    }
    const res = await fetch(base + path, { ...options, headers, cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Erro na requisição.');
    return data;
  }

  async function refreshSession() {
    if (!getToken()) {
      clearSession();
      return null;
    }
    try {
      const data = await api('/auth/session');
      if (data.user) {
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        notifyChange(data.user);
        return data.user;
      }
    } catch (_) { /* invalid */ }
    clearSession();
    return null;
  }

  async function logout() {
    try {
      if (getToken()) await api('/auth/logout', { method: 'POST' });
    } catch (_) { /* ok */ }
    clearSession();
    initNav();
  }

  async function login(email, senha) {
    const data = await api('/auth/login', {
      method: 'POST',
      json: { email: email.trim(), senha }
    });
    setSession(data.token, data.user);
    initNav();
    return data;
  }

  async function register(payload) {
    const data = await api('/auth/register', { method: 'POST', json: payload });
    setSession(data.token, data.user);
    initNav();
    return data;
  }

  function bindLogoutButtons(root) {
    root.querySelectorAll('[data-account-logout]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        logout();
      });
    });
  }

  function renderNavSlot(slot, user) {
    const prefix = pathPrefix();
    slot.innerHTML = '';
    slot.classList.add('account-nav-slot');

    if (user) {
      const nome = displayName(user);
      slot.innerHTML = `
        <details class="account-nav-details">
          <summary class="account-nav-summary" aria-label="${escapeHtml(navT('nav.accountMenu', 'Menu da conta'))}">
            <i class="fas fa-user-circle" aria-hidden="true"></i>
            <span class="account-nav-name">${escapeHtml(nome)}</span>
            <i class="fas fa-chevron-down account-nav-chevron" aria-hidden="true"></i>
          </summary>
          <div class="account-nav-menu">
            <span class="account-nav-menu-label">${escapeHtml(user.email || '')}</span>
            <a href="${accountLink()}"><i class="fas fa-box"></i> ${escapeHtml(navT('nav.myOrders', 'Meus pedidos'))}</a>
            <button type="button" data-account-logout><i class="fas fa-sign-out-alt"></i> ${escapeHtml(navT('nav.logout', 'Sair'))}</button>
          </div>
        </details>
      `;
    } else {
      slot.innerHTML = `
        <a href="${accountLink()}" class="account-nav-login">
          <i class="fas fa-user" aria-hidden="true"></i>
          <span>${escapeHtml(navT('nav.login', 'Entrar'))}</span>
        </a>
      `;
    }
    bindLogoutButtons(slot);
  }

  function initNav() {
    const user = getUser();
    document.querySelectorAll('[data-account-nav]').forEach((slot) => renderNavSlot(slot, user));
  }

  document.addEventListener('DOMContentLoaded', async () => {
    await refreshSession();
    initNav();
  });

  return {
    SESSION_KEY,
    USER_KEY,
    getToken,
    getUser,
    setSession,
    clearSession,
    displayName,
    refreshSession,
    logout,
    login,
    register,
    initNav,
    api
  };
})();
