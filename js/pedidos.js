(function () {
  const SESSION_KEY = 'stf_admin_token';
  const bootstrap = window.CONFIG_BOOTSTRAP || {};
  let allOrders = [];

  const els = {
    login: document.getElementById('pedidos-login'),
    panel: document.getElementById('pedidos-panel'),
    loginForm: document.getElementById('pedidos-login-form'),
    apiUrl: document.getElementById('pedidos-api-url'),
    status: document.getElementById('pedidos-status'),
    tbody: document.getElementById('pedidos-tbody'),
    count: document.getElementById('pedidos-count'),
    empty: document.getElementById('pedidos-empty'),
    filterSearch: document.getElementById('filter-search'),
    filterStatus: document.getElementById('filter-status')
  };

  function apiBase() {
    return (els.apiUrl?.value || bootstrap.configApiUrl || '').replace(/\/$/, '');
  }

  function adminAuthHeaders() {
    const token = sessionStorage.getItem(SESSION_KEY);
    if (!token) throw new Error('Faça login primeiro.');
    return { Authorization: 'Bearer ' + token };
  }

  async function apiPost(path) {
    const res = await fetch(apiBase() + path, {
      method: 'POST',
      headers: adminAuthHeaders()
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Erro na requisição.');
    }
    return res.json().catch(() => ({}));
  }

  async function apiDelete(path) {
    const res = await fetch(apiBase() + path, {
      method: 'DELETE',
      headers: adminAuthHeaders()
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Erro na requisição.');
    }
    return res.json().catch(() => ({}));
  }

  function showStatus(msg, type) {
    els.status.textContent = msg;
    els.status.className = 'admin-status ' + (type || '');
    els.status.hidden = !msg;
  }

  function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  }

  function formatBRL(n) {
    return Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function statusBadgeHtml(status) {
    if (status === 'paid') {
      return '<span class="status-badge status-paid"><i class="fas fa-check-circle" aria-hidden="true"></i> Pago</span>';
    }
    return '<span class="status-badge status-pending"><i class="fas fa-clock" aria-hidden="true"></i> Aguardando</span>';
  }

  function watchModel(o) {
    return window.STF_ORDER_WATCH?.formatModel(o) || o.smartwatch || '—';
  }

  function showOrderDetails(o) {
    const watchLines = (window.STF_ORDER_WATCH?.detailLines(o) || [`Smartwatch: ${o.smartwatch}`]).join('\n');
    alert(
      `Pedido: ${o.orderId}\n` +
      `Status: ${o.status}\n` +
      `Cliente: ${o.nome}\n` +
      `${watchLines}\n` +
      `Endereço: ${o.endereco}\n` +
      `Total: ${formatBRL(o.total)} (${formatBRL(o.frete)} frete)`
    );
  }

  function renderTable(orders) {
    els.tbody.innerHTML = '';
    if (!orders.length) {
      els.empty.hidden = false;
      return;
    }
    els.empty.hidden = true;

    orders.forEach((o) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${o.orderId}</strong></td>
        <td>${formatDate(o.createdAt)}</td>
        <td>${o.nome}<br><small>${o.email}</small><br><small>${o.telefone || ''}</small></td>
        <td>${watchModel(o)}</td>
        <td>${o.pais || '—'}</td>
        <td>${o.pagamento || '—'}</td>
        <td>${formatBRL(o.total)}</td>
        <td class="pedidos-actions">
          ${statusBadgeHtml(o.status)}
          ${o.status === 'paid' ? `<button type="button" class="btn-print-label" title="Imprimir etiqueta térmica"><i class="fas fa-print"></i> Etiqueta</button>` : ''}
          ${o.status !== 'paid' ? `<button type="button" class="btn-confirm-pay" data-order-id="${o.orderId}">Confirmar PIX</button>` : ''}
          ${o.status !== 'paid' ? `<button type="button" class="btn-delete-order" data-order-id="${o.orderId}" title="Excluir pedido"><i class="fas fa-trash-alt"></i> Excluir</button>` : ''}
        </td>
      `;

      tr.querySelector('.btn-print-label')?.addEventListener('click', (ev) => {
        ev.stopPropagation();
        if (window.STF_ORDER_LABEL) {
          window.STF_ORDER_LABEL.print(o);
        } else {
          alert('Módulo de etiqueta não carregado.');
        }
      });

      tr.querySelector('.btn-confirm-pay')?.addEventListener('click', async (ev) => {
        ev.stopPropagation();
        const orderId = ev.currentTarget.dataset.orderId;
        if (!confirm(`Confirmar pagamento do pedido ${orderId}?`)) return;
        try {
          await apiPost(`/orders/${encodeURIComponent(orderId)}/confirm`);
          showStatus(`Pedido ${orderId} marcado como pago.`, 'success');
          await loadOrders();
        } catch (err) {
          showStatus(err.message, 'error');
        }
      });

      tr.querySelector('.btn-delete-order')?.addEventListener('click', async (ev) => {
        ev.stopPropagation();
        const orderId = ev.currentTarget.dataset.orderId;
        if (!confirm(`Excluir o pedido ${orderId}?\n\nIsso remove da base do site e do perfil do cliente. Não cancela cobrança no Asaas/MP.`)) return;
        try {
          await apiDelete(`/orders/${encodeURIComponent(orderId)}`);
          showStatus(`Pedido ${orderId} excluído.`, 'success');
          await loadOrders();
        } catch (err) {
          showStatus(err.message, 'error');
        }
      });

      tr.addEventListener('click', () => showOrderDetails(o));
      els.tbody.appendChild(tr);
    });
  }

  function applyFilters() {
    const q = (els.filterSearch?.value || '').toLowerCase();
    const st = els.filterStatus?.value || '';
    const filtered = allOrders.filter((o) => {
      const matchQ = !q || [o.orderId, o.nome, o.email, o.smartwatch, o.observacoes, o.modeloRelogio, o.pais].join(' ').toLowerCase().includes(q);
      const matchS = !st || o.status === st;
      return matchQ && matchS;
    });
    els.count.textContent = `${filtered.length} pedido(s)`;
    renderTable(filtered);
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

  async function loadOrders() {
    const token = sessionStorage.getItem(SESSION_KEY);
    const base = apiBase();
    if (!token || !base) throw new Error('Faça login primeiro.');

    const res = await fetch(base + '/orders', {
      headers: { Authorization: 'Bearer ' + token },
      cache: 'no-store'
    });
    if (!res.ok) throw new Error('Erro ao carregar pedidos.');
    allOrders = await res.json();
    applyFilters();
  }

  els.loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    showStatus('Entrando...', '');
    const base = apiBase();
    if (!base) { showStatus('Informe a URL da API.', 'error'); return; }

    try {
      const fd = new FormData(els.loginForm);
      const res = await fetch(base + '/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: fd.get('username'), password: fd.get('password') })
      });
      if (!res.ok) throw new Error('Login inválido.');
      const data = await res.json();
      sessionStorage.setItem(SESSION_KEY, data.token);
      els.login.hidden = true;
      els.panel.hidden = false;
      await loadOrders();
      showStatus('', '');
    } catch (err) {
      showStatus(err.message, 'error');
    }
  });

  document.getElementById('btn-refresh')?.addEventListener('click', () => loadOrders().catch((e) => showStatus(e.message, 'error')));
  document.getElementById('btn-cleanup-pending')?.addEventListener('click', async () => {
    const pending = allOrders.filter((o) => o.status !== 'paid').length;
    if (!pending) {
      showStatus('Nenhum pedido pendente para excluir.', '');
      return;
    }
    if (!confirm(`Excluir ${pending} pedido(s) aguardando pagamento?\n\nSó remove da base do site. Pedidos pagos não são afetados.`)) return;
    try {
      const data = await apiDelete('/orders/pending');
      showStatus(`${data.deleted || 0} pedido(s) pendente(s) excluído(s).`, 'success');
      await loadOrders();
    } catch (err) {
      showStatus(err.message, 'error');
    }
  });
  document.getElementById('btn-export-csv')?.addEventListener('click', async () => {
    const token = sessionStorage.getItem(SESSION_KEY);
    const res = await fetch(apiBase() + '/orders?format=csv', { headers: { Authorization: 'Bearer ' + token } });
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'pedidos-sensortattoofix.csv';
    a.click();
  });
  document.getElementById('btn-logout-pedidos')?.addEventListener('click', () => {
    sessionStorage.removeItem(SESSION_KEY);
    els.panel.hidden = true;
    els.login.hidden = false;
  });
  els.filterSearch?.addEventListener('input', applyFilters);
  els.filterStatus?.addEventListener('change', applyFilters);

  document.addEventListener('DOMContentLoaded', () => {
    if (bootstrap.configApiUrl && els.apiUrl) els.apiUrl.value = bootstrap.configApiUrl;
    if (sessionStorage.getItem(SESSION_KEY) && apiBase()) {
      validateSession().then((ok) => {
        if (!ok) {
          sessionStorage.removeItem(SESSION_KEY);
          return;
        }
        els.login.hidden = true;
        els.panel.hidden = false;
        loadOrders().catch(() => {
          sessionStorage.removeItem(SESSION_KEY);
          els.panel.hidden = true;
          els.login.hidden = false;
        });
      });
    }
  });
})();
