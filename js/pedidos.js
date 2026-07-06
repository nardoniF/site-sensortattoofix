(function () {
  const SESSION_KEY = 'stf_admin_token';
  const bootstrap = window.CONFIG_BOOTSTRAP || {};
  const embedded = !!document.getElementById('admin-tab-pedidos');
  let allOrders = [];
  let wired = false;

  function $(id) {
    return document.getElementById(id);
  }

  const els = {
    login: $('pedidos-login'),
    panel: embedded ? $('admin-tab-pedidos') : $('pedidos-panel'),
    loginForm: $('pedidos-login-form'),
    status: $('pedidos-orders-status') || $('pedidos-status'),
    tbody: $('pedidos-tbody'),
    count: $('pedidos-count'),
    empty: $('pedidos-empty'),
    filterSearch: $('filter-search'),
    filterStatus: $('filter-status')
  };

  function apiBase() {
    const token = sessionStorage.getItem(SESSION_KEY);
    const fromForm = document.querySelector('#admin-config-form [name="apiBaseUrl"]')?.value?.trim();
    if (token && fromForm) return fromForm.replace(/\/$/, '');
    return (bootstrap.configApiUrl || '').replace(/\/$/, '');
  }

  function showLoginView() {
    if (embedded) return;
    if (els.login) els.login.hidden = false;
    if (els.panel) els.panel.hidden = true;
    document.body.classList.add('pedidos-login-only');
  }

  function showPanelView() {
    if (els.login) els.login.hidden = true;
    if (els.panel) els.panel.hidden = false;
    document.body.classList.remove('pedidos-login-only');
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
    if (!els.status) return;
    els.status.textContent = msg;
    els.status.className = 'admin-status form-status ' + (type || '');
    els.status.hidden = !msg;
  }

  function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  }

  function formatDateCell(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    const date = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return `${date}<br><small>${time}</small>`;
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

  function commissionerCell(o) {
    if (!o.couponCode) return '—';
    const name = o.couponCommissionerName || o.couponCode;
    const parts = [];
    if (o.couponCommissionAmount != null) {
      parts.push(formatBRL(o.couponCommissionAmount));
      if (o.couponCommissionPercent != null) parts.push(`${o.couponCommissionPercent}%`);
    } else if (o.couponDiscount) {
      parts.push(`desc. −${formatBRL(o.couponDiscount)}`);
    }
    const extra = parts.length ? ` (${parts.join(' · ')})` : '';
    return `${name}${extra}`;
  }

  function escHtml(text) {
    return String(text ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function isUberOrder(o) {
    const provider = String(o.shippingProvider || '').toLowerCase();
    if (provider === 'uber') return true;
    return String(o.shippingMethodId || '').toLowerCase().includes('uber');
  }

  function isMotoboyOrder(o) {
    const provider = String(o.shippingProvider || '').toLowerCase();
    if (provider === 'motoboy') return true;
    return String(o.shippingMethodId || '').toLowerCase().includes('motoboy');
  }

  function isCorreiosBrOrder(o) {
    if (o.internationalLensOnly) return false;
    const provider = String(o.shippingProvider || '').toLowerCase();
    if (provider === 'uber' || provider === 'motoboy') return false;
    const method = String(o.shippingMethodId || '').toLowerCase();
    if (method.includes('uber') || method.includes('motoboy')) return false;
    const pais = String(o.paisCode || o.pais || '').toUpperCase();
    if (pais && pais !== 'BR' && !pais.includes('BRASIL')) return false;
    return true;
  }

  function shippingKindLabel(o) {
    const provider = String(o.shippingProvider || '').toLowerCase();
    if (provider === 'uber') return 'Uber';
    if (provider === 'motoboy') return 'Motoboy';
    const method = String(o.shippingMethodId || '').toLowerCase();
    if (method.includes('uber')) return 'Uber';
    if (method.includes('motoboy')) return 'Motoboy';
    if (isCorreiosBrOrder(o)) return 'Correios';
    const svc = String(o.shippingService || '').trim();
    if (svc) return svc;
    return 'Frete';
  }

  function freteCell(o) {
    const kind = escHtml(shippingKindLabel(o));
    const paid = Number(o.frete);
    const hasPaid = Number.isFinite(paid) && paid >= 0;
    const est = Number(o.correiosFreteEstimado);
    const hasEst = isCorreiosBrOrder(o) && Number.isFinite(est) && est > 0;

    let html = '';
    if (hasEst) {
      html += `<strong class="pedidos-frete-correios">${formatBRL(est)}</strong>`;
      if (hasPaid) html += `<br><small class="pedidos-frete-paid">Cliente: ${formatBRL(paid)}</small>`;
    } else if (hasPaid) {
      html += `<strong>${formatBRL(paid)}</strong>`;
    } else {
      html += '<small class="pedidos-track-muted">—</small>';
    }
    html += `<br><small class="pedidos-frete-kind">${kind}</small>`;
    return html;
  }

  function entregaCell(o) {
    if (o.status !== 'paid') return '<small class="pedidos-track-muted">—</small>';

    if (isUberOrder(o)) {
      const status = escHtml(o.uberDeliveryStatus || 'Solicitado');
      if (o.uberTrackingUrl) {
        return `<a href="${escHtml(o.uberTrackingUrl)}" target="_blank" rel="noopener" class="pedidos-track-link" onclick="event.stopPropagation()">Uber</a><br><small class="pedidos-track-status">${status}</small>`;
      }
      return `<small class="pedidos-track-status">Uber</small><br><small>${status}</small>`;
    }

    if (isMotoboyOrder(o)) {
      const notified = o.motoboyNotifiedAt ? 'Motoboy avisado' : 'Aguardando aviso';
      return `<small class="pedidos-track-status">Motoboy</small><br><small>${notified}</small>`;
    }

    if (isCorreiosBrOrder(o)) {
      if (o.correiosPrePostagemError && !o.correiosTrackingCode) {
        return `<small class="pedidos-track-warn">${escHtml(o.correiosPrePostagemError)}</small>`;
      }
      if (!o.correiosTrackingCode) {
        if (o.correiosPrePostagemId || o.correiosPrePostagemAt) {
          return '<small class="pedidos-track-status">Pré-postado</small>';
        }
        return '<small class="pedidos-track-muted">Aguardando pré-postagem</small>';
      }
      const code = escHtml(o.correiosTrackingCode);
      const url = `https://rastreamento.correios.com.br/app/index.php?objeto=${encodeURIComponent(o.correiosTrackingCode)}`;
      const status = escHtml(o.correiosTrackingStatus || 'Pré-postado');
      const last = o.correiosTrackingLastEvent?.description
        ? `<br><small>${escHtml(o.correiosTrackingLastEvent.description)}</small>`
        : '';
      return `<a href="${url}" target="_blank" rel="noopener" class="pedidos-track-link" onclick="event.stopPropagation()">${code}</a><br><small class="pedidos-track-status">${status}</small>${last}`;
    }

    return '<small class="pedidos-track-muted">—</small>';
  }

  function detailRow(label, valueHtml) {
    return `<div class="pedidos-detail-row"><span class="pedidos-detail-label">${label}</span><span class="pedidos-detail-value">${valueHtml}</span></div>`;
  }

  function deliveryDetailBlock(o) {
    if (o.status !== 'paid') {
      return '<p class="pedidos-detail-muted">Pagamento ainda não confirmado.</p>';
    }
    if (isUberOrder(o)) {
      const parts = [`<strong>Uber Direct</strong>`];
      if (o.uberDeliveryStatus) parts.push(`Status: ${escHtml(o.uberDeliveryStatus)}`);
      if (o.uberTrackingUrl) {
        parts.push(`<a href="${escHtml(o.uberTrackingUrl)}" target="_blank" rel="noopener" class="pedidos-track-link">Abrir rastreio Uber</a>`);
      }
      if (o.uberDispatchError) parts.push(`<span class="pedidos-track-warn">${escHtml(o.uberDispatchError)}</span>`);
      if (o.uberDispatchSkipped) parts.push(`<span class="pedidos-track-muted">${escHtml(o.uberDispatchSkipped)}</span>`);
      return parts.join('<br>');
    }
    if (isMotoboyOrder(o)) {
      const parts = ['<strong>Motoboy</strong>'];
      if (o.motoboyNotifiedAt) parts.push(`Avisado em ${formatDate(o.motoboyNotifiedAt)}`);
      if (o.motoboyCourierEmails?.length) parts.push(`E-mails: ${escHtml(o.motoboyCourierEmails.join(', '))}`);
      if (o.motoboyNotifyError) parts.push(`<span class="pedidos-track-warn">${escHtml(o.motoboyNotifyError)}</span>`);
      return parts.join('<br>');
    }
    if (isCorreiosBrOrder(o)) {
      const parts = [];
      if (o.correiosTrackingCode) {
        const url = `https://rastreamento.correios.com.br/app/index.php?objeto=${encodeURIComponent(o.correiosTrackingCode)}`;
        parts.push(`<strong><a href="${url}" target="_blank" rel="noopener" class="pedidos-track-link">${escHtml(o.correiosTrackingCode)}</a></strong>`);
        parts.push(`Status: <span class="pedidos-track-status">${escHtml(o.correiosTrackingStatus || 'Pré-postado')}</span>`);
        if (o.correiosTrackingLastEvent?.description) {
          parts.push(`Último evento: ${escHtml(o.correiosTrackingLastEvent.description)}`);
          if (o.correiosTrackingLastEvent.date) {
            parts.push(`<small class="pedidos-detail-muted">${formatDate(o.correiosTrackingLastEvent.date)}</small>`);
          }
        }
      } else if (o.correiosPrePostagemId || o.correiosPrePostagemAt) {
        parts.push('<strong class="pedidos-track-status">Pré-postado</strong> — aguardando código AV');
      } else {
        parts.push('<span class="pedidos-track-muted">Aguardando pré-postagem</span>');
      }
      if (o.correiosPrePostagemError) parts.push(`<span class="pedidos-track-warn">${escHtml(o.correiosPrePostagemError)}</span>`);
      return parts.join('<br>') || '<span class="pedidos-track-muted">—</span>';
    }
    return '<span class="pedidos-track-muted">—</span>';
  }

  function freteDetailBlock(o) {
    const kind = escHtml(shippingKindLabel(o));
    const paid = Number(o.frete);
    const hasPaid = Number.isFinite(paid) && paid >= 0;
    const est = Number(o.correiosFreteEstimado);
    const hasEst = isCorreiosBrOrder(o) && Number.isFinite(est) && est > 0;
    const parts = [];
    if (hasEst) {
      parts.push(`<div class="pedidos-detail-frete-main">${formatBRL(est)}</div>`);
      parts.push(`<div class="pedidos-detail-frete-sub">Correios cobrou (est. contrato)</div>`);
    }
    if (hasPaid) {
      parts.push(`<div class="pedidos-detail-frete-client">Cliente pagou: ${formatBRL(paid)}</div>`);
    }
    parts.push(`<div class="pedidos-detail-frete-kind">Tipo: ${kind}</div>`);
    return parts.join('');
  }

  let orderModalEl = null;

  function ensureOrderModal() {
    if (orderModalEl) return orderModalEl;
    const wrap = document.createElement('div');
    wrap.id = 'pedidos-order-modal';
    wrap.className = 'pedidos-order-modal';
    wrap.hidden = true;
    wrap.innerHTML = `
      <div class="pedidos-order-modal-backdrop" data-close-modal></div>
      <div class="pedidos-order-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="pedidos-order-modal-title">
        <button type="button" class="pedidos-order-modal-close" data-close-modal aria-label="Fechar">&times;</button>
        <h2 id="pedidos-order-modal-title" class="pedidos-order-modal-title"></h2>
        <div id="pedidos-order-modal-body" class="pedidos-order-modal-body"></div>
      </div>`;
    document.body.appendChild(wrap);
    wrap.querySelectorAll('[data-close-modal]').forEach((el) => {
      el.addEventListener('click', () => { wrap.hidden = true; });
    });
    document.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape' && !wrap.hidden) wrap.hidden = true;
    });
    orderModalEl = wrap;
    return wrap;
  }

  function showOrderDetails(o) {
    const modal = ensureOrderModal();
    const title = document.getElementById('pedidos-order-modal-title');
    const body = document.getElementById('pedidos-order-modal-body');
    if (!title || !body) return;

    title.textContent = o.orderId;

    const watch = escHtml(watchModel(o));
    const commissioner = o.couponCode
      ? escHtml(o.couponCommissionerName || o.couponCode) +
        (o.couponCommissionAmount != null
          ? ` — ${formatBRL(o.couponCommissionAmount)}${o.couponCommissionPercent != null ? ` (${o.couponCommissionPercent}%)` : ''}`
          : o.couponDiscount ? ` — desc. −${formatBRL(o.couponDiscount)}` : '')
      : '—';

    const secondary = [];
    if (o.cpf) secondary.push(detailRow('CPF', escHtml(o.cpf)));
    if (o.endereco) secondary.push(detailRow('Endereço', escHtml(o.endereco)));
    if (o.couponCode) secondary.push(detailRow('Cupom', escHtml(o.couponCode)));

    body.innerHTML = `
      <div class="pedidos-detail-grid">
        ${detailRow('Data', escHtml(formatDate(o.createdAt)))}
        ${detailRow('Cliente', `${escHtml(o.nome)}<br><small>${escHtml(o.email || '—')}</small><br><small>${escHtml(o.telefone || '—')}</small>`)}
        ${detailRow('Smartwatch', watch)}
        ${detailRow('País', escHtml(o.pais || '—'))}
        ${detailRow('Pagamento', escHtml(o.pagamento || '—'))}
        ${detailRow('Comissionado', commissioner)}
        ${detailRow('Total', `<strong>${formatBRL(o.total)}</strong>`)}
      </div>
      <section class="pedidos-detail-section pedidos-detail-section--frete">
        <h3 class="pedidos-detail-heading">Frete</h3>
        ${freteDetailBlock(o)}
      </section>
      <section class="pedidos-detail-section pedidos-detail-section--entrega">
        <h3 class="pedidos-detail-heading">Entrega / Rastreio</h3>
        ${deliveryDetailBlock(o)}
      </section>
      ${secondary.length ? `<div class="pedidos-detail-secondary">${secondary.join('')}</div>` : ''}
    `;

    modal.hidden = false;
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

  async function printOrderLabel(order) {
    try {
      showStatus('Gerando etiqueta…', '');
      const res = await fetch(apiBase() + '/orders/' + encodeURIComponent(order.orderId) + '/shipping-label', {
        method: 'POST',
        headers: adminAuthHeaders()
      });
      const data = await res.json().catch(() => ({}));
      if (data.mode === 'pdf' && data.pdfBase64) {
        openPdfBase64(data.pdfBase64, 'etiqueta-' + order.orderId + '.pdf');
        const track = data.trackingCode ? ' — rastreio ' + data.trackingCode : '';
        if (data.trackingCode) {
          order.correiosTrackingCode = data.trackingCode;
          const idx = allOrders.findIndex((x) => x.orderId === order.orderId);
          if (idx >= 0) {
            allOrders[idx].correiosTrackingCode = data.trackingCode;
            allOrders[idx].correiosTrackingStatus = allOrders[idx].correiosTrackingStatus || 'Pré-postado';
          }
          applyFilters();
        }
        showStatus('Etiqueta Correios aberta' + track, 'success');
        return;
      }
      if (data.useClient && window.STF_ORDER_LABEL) {
        window.STF_ORDER_LABEL.print(order);
        showStatus((data.error || data.message || 'Etiqueta local') + ' (fallback HTML)', data.error ? 'warn' : 'success');
        return;
      }
      throw new Error(data.error || data.detail || 'Falha ao gerar etiqueta');
    } catch (err) {
      if (window.STF_ORDER_LABEL) {
        window.STF_ORDER_LABEL.print(order);
        showStatus((err.message || 'Erro') + ' — etiqueta local aberta.', 'warn');
      } else {
        showStatus(err.message || 'Erro ao gerar etiqueta', 'error');
      }
    }
  }

  function renderTable(orders) {
    if (!els.tbody) return;
    els.tbody.innerHTML = '';
    if (!orders.length) {
      if (els.empty) els.empty.hidden = false;
      return;
    }
    if (els.empty) els.empty.hidden = true;

    orders.forEach((o) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="pedidos-data">${formatDateCell(o.createdAt)}</td>
        <td>${escHtml(o.nome)}<br><small>${escHtml(o.email || '')}</small><br><small>${escHtml(o.telefone || '')}</small></td>
        <td>${escHtml(watchModel(o))}</td>
        <td>${escHtml(o.pais || '—')}</td>
        <td>${escHtml(o.pagamento || '—')}</td>
        <td>${commissionerCell(o)}</td>
        <td>${formatBRL(o.total)}</td>
        <td class="pedidos-frete">${freteCell(o)}</td>
        <td class="pedidos-entrega">${entregaCell(o)}</td>
        <td class="pedidos-actions">
          <div class="pedidos-actions-inner">
          ${statusBadgeHtml(o.status)}
          ${o.status === 'paid' ? `<button type="button" class="btn-print-label" title="Imprimir etiqueta térmica"><i class="fas fa-print"></i> Etiqueta</button>` : ''}
          ${o.status !== 'paid' ? `<button type="button" class="btn-confirm-pay" data-order-id="${o.orderId}">Confirmar PIX</button>` : ''}
          <button type="button" class="btn-delete-order" data-order-id="${o.orderId}" data-paid="${o.status === 'paid' ? '1' : '0'}" title="Excluir pedido"><i class="fas fa-trash-alt"></i> Excluir</button>
          </div>
        </td>
      `;

      tr.querySelector('.btn-print-label')?.addEventListener('click', (ev) => {
        ev.stopPropagation();
        printOrderLabel(o);
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
        const isPaid = ev.currentTarget.dataset.paid === '1';
        const hasCorreios = isCorreiosBrOrder(o) && (o.correiosPrePostagemId || o.correiosTrackingCode);
        const msg = isPaid
          ? `Excluir o pedido PAGO ${orderId}?` +
            (hasCorreios
              ? `\n\nA pré-postagem Correios (${o.correiosTrackingCode || 'AV'}) será cancelada automaticamente.`
              : '') +
            `\n\nRemove da lista do site. Não estorna PIX/cartão no Mercado Pago ou Asaas.`
          : `Excluir o pedido ${orderId}?\n\nIsso remove da base do site e do perfil do cliente. Não cancela cobrança no Asaas/MP.`;
        if (!confirm(msg)) return;
        try {
          const data = await apiDelete(`/orders/${encodeURIComponent(orderId)}`);
          if (data.correiosCancel?.ok) {
            showStatus(`Pedido ${orderId} excluído — ${data.correiosCancel.detail || 'pré-postagem cancelada'}.`, 'success');
          } else if (data.correiosCancel?.detail || data.correiosCancel?.error) {
            showStatus(
              `Pedido ${orderId} excluído, mas pré-postagem Correios não cancelada: ${data.correiosCancel.detail || data.correiosCancel.error}`,
              'warn'
            );
          } else {
            showStatus(`Pedido ${orderId} excluído.`, 'success');
          }
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
      const matchQ = !q || [o.orderId, o.nome, o.email, o.smartwatch, o.observacoes, o.modeloRelogio, o.pais, o.couponCode, o.couponCommissionerName].join(' ').toLowerCase().includes(q);
      const matchS = !st || o.status === st;
      return matchQ && matchS;
    });
    if (els.count) els.count.textContent = `${filtered.length} pedido(s)`;
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

  async function loadStoreConfig() {
    const base = apiBase();
    if (base) {
      try {
        const res = await fetch(base + '/config', { cache: 'no-store' });
        if (res.ok) {
          const cfg = await res.json();
          window.STF_ORDER_LABEL?.configure(cfg.shipping);
          return;
        }
      } catch (e) {
        console.warn(e);
      }
    }
    try {
      const res = await fetch('/data/store-config.json?v=' + Date.now());
      if (res.ok) {
        const cfg = await res.json();
        window.STF_ORDER_LABEL?.configure(cfg.shipping);
      }
    } catch (e) {
      console.warn(e);
    }
  }

  async function refreshCorreiosTracking(orders) {
    const staleMs = 20 * 60 * 1000;
    const now = Date.now();
    const ids = orders
      .filter((o) => o.status === 'paid')
      .filter((o) => {
        const needsCorreios = isCorreiosBrOrder(o) && (
          o.correiosTrackingCode || o.correiosPrePostagemId || o.correiosFreteEstimado == null
        );
        return needsCorreios;
      })
      .filter((o) => {
        if (!o.correiosTrackingUpdatedAt) return true;
        return now - new Date(o.correiosTrackingUpdatedAt).getTime() > staleMs;
      })
      .map((o) => o.orderId)
      .slice(0, 20);
    if (!ids.length) return;
    try {
      const res = await fetch(apiBase() + '/admin/correios-tracking', {
        method: 'POST',
        headers: { ...adminAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: ids })
      });
      if (!res.ok) return;
      const data = await res.json().catch(() => ({}));
      for (const order of allOrders) {
        const summary = data.orders?.[order.orderId];
        if (!summary) continue;
        order.correiosTrackingStatus = summary.status;
        order.correiosTrackingLastEvent = summary.lastEvent;
        order.correiosTrackingEvents = summary.events;
        order.correiosTrackingUpdatedAt = new Date().toISOString();
        if (summary.correiosFreteEstimado != null) {
          order.correiosFreteEstimado = summary.correiosFreteEstimado;
        }
        if (summary.trackingCode) {
          order.correiosTrackingCode = summary.trackingCode;
        }
        if (summary.status && !order.correiosTrackingCode) {
          order.correiosTrackingStatus = summary.status;
        }
      }
    } catch (err) {
      console.warn('Rastreio Correios:', err);
    }
  }

  async function loadOrders() {
    const token = sessionStorage.getItem(SESSION_KEY);
    const base = apiBase();
    if (!token || !base) throw new Error('Faça login na API primeiro.');

    await loadStoreConfig();

    const res = await fetch(base + '/orders', {
      headers: { Authorization: 'Bearer ' + token },
      cache: 'no-store'
    });
    if (!res.ok) throw new Error('Erro ao carregar pedidos.');
    const data = await res.json();
    if (!Array.isArray(data)) {
      throw new Error(data?.error || 'Resposta inválida da API de pedidos.');
    }
    allOrders = data;
    await refreshCorreiosTracking(allOrders);
    applyFilters();
  }

  function wireControls() {
    if (wired) return;
    wired = true;

    els.loginForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      showStatus('Entrando...', '');
      const base = apiBase();
      if (!base) { showStatus('API não configurada. Verifique js/config-bootstrap.js.', 'error'); return; }

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
        showPanelView();
        await loadOrders();
        showStatus('', '');
      } catch (err) {
        showStatus(err.message, 'error');
      }
    });

    $('btn-refresh')?.addEventListener('click', () => loadOrders().catch((e) => showStatus(e.message, 'error')));
    $('btn-cleanup-pending')?.addEventListener('click', async () => {
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
    $('btn-export-csv')?.addEventListener('click', async () => {
      const token = sessionStorage.getItem(SESSION_KEY);
      const res = await fetch(apiBase() + '/orders?format=csv', { headers: { Authorization: 'Bearer ' + token } });
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'pedidos-sensortattoofix.csv';
      a.click();
    });
    $('btn-export-json')?.addEventListener('click', async () => {
      const token = sessionStorage.getItem(SESSION_KEY);
      const res = await fetch(apiBase() + '/orders?format=json', { headers: { Authorization: 'Bearer ' + token } });
      if (!res.ok) {
        showStatus('Erro ao exportar JSON.', 'error');
        return;
      }
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'pedidos-sensortattoofix.json';
      a.click();
    });
    $('btn-logout-pedidos')?.addEventListener('click', () => {
      sessionStorage.removeItem(SESSION_KEY);
      showLoginView();
    });
    els.filterSearch?.addEventListener('input', applyFilters);
    els.filterStatus?.addEventListener('change', applyFilters);
  }

  function initStandalone() {
    wireControls();
    if (sessionStorage.getItem(SESSION_KEY) && apiBase()) {
      validateSession().then((ok) => {
        if (!ok) {
          sessionStorage.removeItem(SESSION_KEY);
          showLoginView();
          return;
        }
        showPanelView();
        loadOrders().catch(() => {
          sessionStorage.removeItem(SESSION_KEY);
          showLoginView();
        });
      });
    } else {
      showLoginView();
    }
  }

  window.STF_PEDIDOS = {
    loadOrders,
    refresh: () => loadOrders()
  };

  if (embedded) {
    wireControls();
  } else {
    document.addEventListener('DOMContentLoaded', initStandalone);
  }
})();
