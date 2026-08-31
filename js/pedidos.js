(function () {
  const SESSION_KEY = 'stf_admin_token';
  const bootstrap = window.CONFIG_BOOTSTRAP || {};
  const embedded = !!document.getElementById('admin-tab-pedidos');
  let allOrders = [];
  let wired = false;
  const selectedOrderIds = new Set();
  let lastRenderedOrders = [];

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

  function escapeHtml(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderKvQuotaBanner(dw) {
    const el = $('pedidos-kv-quota');
    if (!el) return;
    if (!dw || typeof dw !== 'object') {
      el.innerHTML = '';
      return;
    }
    const wUsed = Number(dw.writesToday ?? dw.clickWritesToday) || 0;
    const wMax = Number(dw.writeLimit ?? dw.limit) > 0 ? Number(dw.writeLimit ?? dw.limit) : 1000;
    const wPct = Number.isFinite(Number(dw.percent))
      ? Number(dw.percent)
      : (wMax > 0 ? Math.min(100, Math.round((wUsed / wMax) * 100)) : 0);
    const rUsed = Number(dw.readsToday);
    const rMax = Number(dw.readLimit) > 0 ? Number(dw.readLimit) : 100000;
    const rPct = Number.isFinite(Number(dw.readPercent))
      ? Number(dw.readPercent)
      : (Number.isFinite(rUsed) ? Math.min(100, Math.round((rUsed / rMax) * 100)) : null);
    const exhausted = !!dw.exhausted;
    const over = !!dw.overFreeLimit || wPct >= 100;
    const critical = !!dw.critical || wPct >= 85;
    const near = !!dw.near || wPct >= 70;
    const fromCf = dw.source === 'cloudflare';
    const resetBr = dw.resetsAtBr || dw.resetsHintBr || '21:00 Brasília (00:00 UTC)';
    const sourceLabel = fromCf ? 'Cloudflare' : 'estimativa';

    let flagClass = 'clicks-kv--ok';
    let icon = 'fa-check-circle';
    let text = `Writes KV hoje (${sourceLabel}): ${wUsed.toLocaleString('pt-BR')} / ${wMax.toLocaleString('pt-BR')} (${wPct}%). Renova às ${resetBr}.`;
    if (exhausted) {
      flagClass = 'clicks-kv--full';
      icon = 'fa-ban';
      text = `KV recusou write — ${wUsed.toLocaleString('pt-BR')} / ${wMax.toLocaleString('pt-BR')}. Pedido da loja vai no D1; só criar conta ainda usa KV. Renova às ${resetBr}.`;
    } else if (over || critical) {
      flagClass = over ? 'clicks-kv--warn' : 'clicks-kv--full';
      icon = 'fa-exclamation-triangle';
      text = `Writes KV (${sourceLabel}): ${wUsed.toLocaleString('pt-BR')} / ${wMax.toLocaleString('pt-BR')} (${wPct}%)${over ? ' — acima do free' : ' — crítico'}. Renova às ${resetBr}.`;
    } else if (near) {
      flagClass = 'clicks-kv--warn';
      icon = 'fa-exclamation-circle';
    } else if (!fromCf) {
      flagClass = 'clicks-kv--warn';
      icon = 'fa-exclamation-circle';
      text = `Writes KV (estimativa): ${wUsed.toLocaleString('pt-BR')} / ${wMax.toLocaleString('pt-BR')} (${wPct}%). Renova às ${resetBr}.`;
    }

    const readsLine = Number.isFinite(rUsed)
      ? `<div class="clicks-stats-row"><dt>Reads KV</dt><dd>${rUsed.toLocaleString('pt-BR')} / ${rMax.toLocaleString('pt-BR')} (${rPct}%)</dd></div>`
      : '';

    el.innerHTML = `<div class="clicks-kv-flag ${flagClass}" role="status">
        <i class="fas ${icon}" aria-hidden="true"></i>
        <span>${escapeHtml(text)}</span>
      </div>
      <details class="clicks-stats-details">
        <summary class="clicks-stats-summary"><i class="fas fa-chevron-right clicks-stats-chevron" aria-hidden="true"></i> Cota KV (pedidos)</summary>
        <dl class="clicks-stats-dl">
          <div class="clicks-stats-row"><dt>Writes (UTC)</dt><dd>${wUsed.toLocaleString('pt-BR')} / ${wMax.toLocaleString('pt-BR')} (${wPct}%)</dd></div>
          ${readsLine}
          <div class="clicks-stats-row"><dt>Fonte</dt><dd>${escapeHtml(fromCf ? 'Cloudflare KV Analytics' : 'Estimativa local')}</dd></div>
        </dl>
        <p class="clicks-kv-note">Conta, sessão e tokens usam <strong>STORE_KV</strong>. Pedido da loja e vendas ML/Shopee/Amazon vão no D1. Cliques também D1.</p>
      </details>`;
  }

  async function loadKvQuota() {
    const token = sessionStorage.getItem(SESSION_KEY);
    const base = apiBase();
    if (!token || !base || !$('pedidos-kv-quota')) return;
    try {
      const res = await fetch(base.replace(/\/$/, '') + '/admin/kv-usage', {
        headers: { Authorization: 'Bearer ' + token },
        cache: 'no-store'
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Falha cota KV');
      renderKvQuotaBanner(data.dailyWrites || {});
    } catch (err) {
      const el = $('pedidos-kv-quota');
      if (el) {
        el.innerHTML = `<div class="clicks-kv-flag clicks-kv--warn" role="status">
          <i class="fas fa-exclamation-circle" aria-hidden="true"></i>
          <span>Cota KV indisponível: ${escapeHtml(err.message || err)}</span>
        </div>`;
      }
    }
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

  function orderShortLabel(o) {
    if (!o) return '';
    const who = (o.nome || '').trim() || o.orderId || '';
    return o.orderId && who && who !== o.orderId ? `${o.orderId} (${who})` : String(o.orderId || who);
  }

  /** Traduz erro bruto dos Correios para algo legível no Admin. */
  function humanizeCorreiosMsg(raw, order) {
    const msg = String(raw || '').trim();
    if (!msg) return '';
    const where = order ? ` Pedido ${orderShortLabel(order)}.` : '';
    if (/PRZ-101|cepDestino|CEP destinat/i.test(msg)) {
      if (order && (isCorreiosIntlOrder(order) || String(order.pais || '').toLowerCase() !== 'brasil')) {
        return `Correios (API nacional) não aceitam CEP/código postal estrangeiro para prazo/pré-postagem.${where} Use Etiqueta local ou Minhas Exportações (MEXPO). Detalhe técnico: ${msg}`;
      }
      return `Correios recusaram o CEP de destino (inválido ou incompleto).${where} Confira o CEP no pedido. Detalhe técnico: ${msg}`;
    }
    if (/PPN-201|API Prazo/i.test(msg)) {
      return `Falha ao consultar prazo nos Correios.${where} ${msg}`;
    }
    if (/GTW-012|86720|CON-011/i.test(msg)) {
      return `Aguardando liberação de serviço no cartão Correios.${where} ${msg}`;
    }
    return msg + (where && !msg.includes(String(order?.orderId || '')) ? where : '');
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

  function escAttr(text) {
    return escHtml(text).replace(/'/g, '&#39;');
  }

  function watchModelOnly(o) {
    const model = String(o?.modeloRelogio || o?.smartwatch || '').trim();
    const obs = String(o?.observacoes ?? '').trim();
    if (o?.modeloRelogio) return o.modeloRelogio;
    if (!model || model === 'N/A') return obs ? 'Outro / sob medida' : '—';
    if (model.includes('Outro modelo')) return obs ? 'Outro modelo' : model;
    return model || '—';
  }

  function watchCellHtml(o) {
    const model = watchModelOnly(o);
    const obs = String(o?.observacoes ?? '').trim();
    const full = watchModel(o);
    const tip = full && full !== model ? full : (obs ? `${model} — ${obs}` : model);
    let inner = `<span class="pedidos-watch-model">${escHtml(model)}</span>`;
    if (obs) {
      inner += `<br><small class="pedidos-watch-obs">${escHtml(obs)}</small>`;
    }
    return `<div class="pedidos-clamp-3" title="${escAttr(tip)}">${inner}</div>`;
  }

  function paymentCellHtml(o) {
    const pay = String(o.pagamento || '—').trim() || '—';
    const html = escHtml(pay).replace(/ \/ /g, '<br>');
    return `<div class="pedidos-clamp-3 pedidos-cell-pay" title="${escAttr(pay)}">${html}</div>`;
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

  function isSuperfreteOrder(o) {
    const provider = String(o.shippingProvider || '').toLowerCase();
    if (provider === 'superfrete') return true;
    const method = String(o.shippingMethodId || '').toLowerCase();
    return method.includes('superfrete') || method.startsWith('br-sf-');
  }

  function isCorreiosBrOrder(o) {
    if (o.internationalLensOnly) return false;
    const provider = String(o.shippingProvider || '').toLowerCase();
    if (provider === 'uber' || provider === 'motoboy' || provider === 'superfrete') return false;
    const method = String(o.shippingMethodId || '').toLowerCase();
    if (method.includes('uber') || method.includes('motoboy') || method.includes('superfrete') || method.startsWith('br-sf-')) return false;
    const pais = String(o.paisCode || o.pais || '').toUpperCase();
    if (pais && pais !== 'BR' && !pais.includes('BRASIL')) return false;
    if (String(o.shipmentType || '') === 'documento' || String(o.shipmentType || '') === 'encomenda') return false;
    if (method.startsWith('int-')) return false;
    return true;
  }

  function isCorreiosIntlOrder(o) {
    if (isUberOrder(o) || isMotoboyOrder(o)) return false;
    const method = String(o.shippingMethodId || '').toLowerCase();
    if (method.startsWith('int-')) return true;
    const st = String(o.shipmentType || '');
    if (st === 'documento' || st === 'encomenda') return true;
    if (o.internationalLensOnly) return true;
    if (/internacional|international|exporta\s*f[aá]cil|documento\s+intern/i.test(String(o.shippingService || ''))) {
      return true;
    }
    const pais = String(o.paisCode || o.pais || '').toUpperCase();
    if (pais && pais !== 'BR' && !pais.includes('BRASIL')) return true;
    const cepDigits = String(o.cep || '').replace(/\D/g, '');
    if (cepDigits && cepDigits.length !== 8) return true;
    return false;
  }

  function isCorreiosLabelOrder(o) {
    return isCorreiosBrOrder(o) || isCorreiosIntlOrder(o);
  }

  function superfreteServiceLabel(sid) {
    const n = Number(sid);
    const map = { 1: 'PAC', 2: 'SEDEX', 17: 'Mini Envios', 3: 'Jadlog', 31: 'Loggi', 33: 'J&T' };
    return map[n] || null;
  }

  function shippingKindLabel(o) {
    const provider = String(o.shippingProvider || '').toLowerCase();
    if (provider === 'uber') return 'Uber';
    if (provider === 'motoboy') return 'Motoboy';
    const method = String(o.shippingMethodId || '').toLowerCase();
    if (method.includes('uber')) return 'Uber';
    if (method.includes('motoboy')) return 'Motoboy';
    const fromSf = superfreteServiceLabel(o.superfreteService);
    if (fromSf) return fromSf;
    if (method.includes('sf-pac') || method.includes('pac')) return 'PAC';
    if (method.includes('sf-sedex') || method.includes('sedex')) return 'SEDEX';
    const svc = String(o.shippingService || '').trim();
    if (svc) return svc;
    if (isCorreiosBrOrder(o)) return 'Correios';
    return 'Frete';
  }

  function shippingDaysLabel(o) {
    const days = Number(o.shippingDays);
    if (!Number.isFinite(days) || days <= 0) return null;
    return days === 1 ? '1 dia' : `${days} dias`;
  }

  function correiosTrackingPageUrl(code) {
    const c = String(code || '').trim();
    if (!c) return '';
    return `/rastreio.html?codigo=${encodeURIComponent(c)}`;
  }

  function correiosEntregaStatusLabel(o) {
    const last = String(o.correiosTrackingLastEvent?.description || '').trim();
    const st = String(o.correiosTrackingStatus || '').trim();
    const prePostOnly = new Set(['', 'Pré-postado', 'Sem eventos', 'Aguardando postagem na agência', 'Indisponível']);
    if (last) return last.length > 48 ? `${last.slice(0, 48)}…` : last;
    if (st && !prePostOnly.has(st)) return st;
    if (o.correiosTrackingCode || o.correiosPrePostagemId || o.correiosPrePostagemAt) return 'Pré-postado';
    return 'Aguardando pré-postagem';
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
    const prazo = shippingDaysLabel(o);
    if (prazo) html += `<br><small class="pedidos-frete-prazo">${escHtml(prazo)}</small>`;
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

    if (isSuperfreteOrder(o)) {
      if (o.superfreteSkipped) {
        return `<small class="pedidos-track-muted" title="${escAttr(o.superfreteSkipped)}">Teste — sem etiqueta SF</small>`;
      }
      const track = o.superfreteTrackingCode || o.correiosTrackingCode;
      if (track) {
        return `<small class="pedidos-track-status">${escHtml(o.shippingService || 'Super Frete')}</small><br><small>${escHtml(track)}</small>`;
      }
      if (o.superfreteCartError || o.superfreteCheckoutError) {
        const tip = o.superfreteCheckoutError || o.superfreteCartError;
        return `<small class="pedidos-track-warn" title="${escAttr(tip)}">SF: pague saldo/cartão — passe o mouse</small>`;
      }
      if (o.superfreteCartId) {
        const st = o.superfreteCartStatus === 'released' ? 'Liberada' : 'No carrinho SF — pague lá';
        return `<small class="pedidos-track-status">${escHtml(o.shippingService || 'Super Frete')}</small><br><small>${st}</small>`;
      }
      return `<small class="pedidos-track-muted">${escHtml(o.shippingService || 'Super Frete')} — etiqueta pendente</small>`;
    }

    if (isCorreiosBrOrder(o)) {
      if (o.correiosPrePostagemError && !o.correiosTrackingCode) {
        const tip = humanizeCorreiosMsg(o.correiosPrePostagemError, o);
        return `<small class="pedidos-track-warn" title="${escAttr(tip)}">Falha na etiqueta Correios — passe o mouse</small>`;
      }
      if (!o.correiosTrackingCode) {
        if (o.correiosPrePostagemId || o.correiosPrePostagemAt) {
          const prazo = shippingDaysLabel(o);
          return '<small class="pedidos-track-status">Pré-postado</small>'
            + (prazo ? `<br><small class="pedidos-frete-prazo">${escHtml(prazo)}</small>` : '');
        }
        return '<small class="pedidos-track-muted">Aguardando pré-postagem</small>';
      }
      const code = escHtml(o.correiosTrackingCode);
      const url = correiosTrackingPageUrl(o.correiosTrackingCode);
      const status = escHtml(correiosEntregaStatusLabel(o));
      const prazo = shippingDaysLabel(o);
      return `<a href="${url}" target="_blank" rel="noopener" class="pedidos-track-link" onclick="event.stopPropagation()">${code}</a><br><small class="pedidos-track-status">${status}</small>`
        + (prazo ? `<br><small class="pedidos-frete-prazo">${escHtml(prazo)}</small>` : '');
    }

    if (isCorreiosIntlOrder(o)) {
      if (o.correiosTrackingCode) {
        const code = escHtml(o.correiosTrackingCode);
        const url = correiosTrackingPageUrl(o.correiosTrackingCode);
        const status = escHtml(o.correiosTrackingStatus || 'Rastreio');
        return `<a href="${url}" target="_blank" rel="noopener" class="pedidos-track-link" onclick="event.stopPropagation()">${code}</a><br><small class="pedidos-track-status">${status}</small>`;
      }
      return '<small class="pedidos-track-warn">Sem rastreio</small>';
    }

    return '<small class="pedidos-track-muted">—</small>';
  }

  const CORREIOS_STATUS_OPTIONS = [
    { value: '', label: '(não alterar)' },
    { value: 'Pré-postado', label: 'Pré-postado' },
    { value: 'Aguardando postagem na agência', label: 'Aguardando postagem na agência' },
    { value: 'Postado', label: 'Postado' },
    { value: 'Em trânsito', label: 'Em trânsito' },
    { value: 'Saiu para entrega', label: 'Saiu para entrega' },
    { value: 'Entregue', label: 'Entregue' }
  ];

  const MANUAL_SHIPPING_METHODS = [
    { id: '', label: '(manter atual)' },
    { id: 'br-mini-envios', label: 'Mini Envios (contrato/API)' },
    { id: 'br-carta-registrada', label: 'Carta Registrada (contrato)' },
    { id: 'correios-manual-pac', label: 'PAC (balcão manual)' },
    { id: 'correios-manual-sedex', label: 'SEDEX (balcão manual)' },
    { id: 'correios-manual-outro', label: 'Outro (ver observação)' }
  ];

  function detailRow(label, valueHtml) {
    return `<div class="pedidos-detail-row"><span class="pedidos-detail-label">${label}</span><span class="pedidos-detail-value">${valueHtml}</span></div>`;
  }

  function manualShippingSection(o) {
    if (o.status !== 'paid') return '';
    const isBr = isCorreiosBrOrder(o);
    const isIntl = isCorreiosIntlOrder(o);
    if (!isBr && !isIntl) return '';
    const currentStatus = String(o.correiosTrackingStatus || '').trim();
    const statusOpts = CORREIOS_STATUS_OPTIONS.map((opt) => {
      const selected = opt.value && opt.value === currentStatus ? ' selected' : '';
      return `<option value="${escHtml(opt.value)}"${selected}>${escHtml(opt.label)}</option>`;
    }).join('');
    const methodId = String(o.shippingMethodId || '');
    const methodOpts = MANUAL_SHIPPING_METHODS.map((m) => {
      const selected = m.id && m.id === methodId ? ' selected' : '';
      return `<option value="${escHtml(m.id)}"${selected}>${escHtml(m.label)}</option>`;
    }).join('');
    const trackingVal = escHtml(o.correiosTrackingCode || '');
    const noteVal = escHtml(o.correiosShippingManualNote || '');
    const freteVal = formatFreteInput(o.correiosFreteEstimado);
    const daysVal = Number(o.shippingDays) > 0 ? String(Math.round(Number(o.shippingDays))) : '';
    const manualAt = o.correiosManualUpdatedAt
      ? `<p class="pedidos-detail-muted">Última atualização manual: ${formatDate(o.correiosManualUpdatedAt)}</p>`
      : '';
    const heading = isIntl ? 'Rastreio internacional' : 'Atualização manual';
    const hint = isIntl
      ? 'Cole o código completo dos Correios (13 caracteres, ex.: RN000689771BR). O e-mail de rastreio só é enviado na primeira vez que um código válido é salvo — cliques repetidos não reenviam.'
      : 'Use quando a API Correios falhar ou o envio foi feito fora do contrato (ex.: PAC no balcão). O e-mail de rastreio só sai na primeira vez que o código é salvo.';
    const trackPlaceholder = isIntl ? 'Ex.: RN000689771BR' : 'Ex.: AP170797068BR';
    const brOnlyFields = isBr ? `
          <label class="pedidos-shipping-field">
            <span class="pedidos-shipping-label">Tipo envio</span>
            <select class="pedidos-shipping-method">${methodOpts}</select>
          </label>
          <label class="pedidos-shipping-field">
            <span class="pedidos-shipping-label">Valor frete (R$)</span>
            <input type="text" class="pedidos-shipping-price" value="${escHtml(freteVal)}" placeholder="Ex.: 20,07" inputmode="decimal" />
          </label>
          <label class="pedidos-shipping-field">
            <span class="pedidos-shipping-label">Prazo (dias)</span>
            <input type="number" class="pedidos-shipping-days" value="${escHtml(daysVal)}" min="1" max="60" placeholder="Ex.: 7" />
          </label>
          <p class="pedidos-shipping-quote-hint pedidos-detail-muted"></p>` : '';
    return `
      <section class="pedidos-detail-section pedidos-detail-section--manual">
        <h3 class="pedidos-detail-heading">${heading}</h3>
        <p class="pedidos-detail-muted">${hint}</p>
        <div class="pedidos-shipping-manual">
          <label class="pedidos-shipping-field">
            <span class="pedidos-shipping-label">Código rastreio</span>
            <input type="text" class="pedidos-shipping-tracking" value="${trackingVal}" placeholder="${trackPlaceholder}" maxlength="13" />
          </label>
          <label class="pedidos-shipping-field">
            <span class="pedidos-shipping-label">Status entrega</span>
            <select class="pedidos-shipping-status">${statusOpts}</select>
          </label>
          ${brOnlyFields}
          <label class="pedidos-shipping-field pedidos-shipping-field--wide">
            <span class="pedidos-shipping-label">Observação</span>
            <input type="text" class="pedidos-shipping-note" value="${noteVal}" placeholder="${isIntl ? 'Ex.: postado documento intl' : 'Ex.: postado PAC balcão SP'}" maxlength="200" />
          </label>
          <button type="button" class="btn-save-shipping">Salvar envio</button>
          <p class="pedidos-shipping-feedback" hidden></p>
        </div>
        ${manualAt}
      </section>`;
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
        const url = correiosTrackingPageUrl(o.correiosTrackingCode);
        parts.push(`<strong class="pedidos-detail-av"><a href="${url}" target="_blank" rel="noopener" class="pedidos-track-link">${escHtml(o.correiosTrackingCode)}</a></strong>`);
        parts.push(`<span class="pedidos-track-status">${escHtml(correiosEntregaStatusLabel(o))}</span>`);
        if (o.correiosTrackingLastEvent?.description && o.correiosTrackingStatus && o.correiosTrackingStatus !== o.correiosTrackingLastEvent.description) {
          parts.push(`<small class="pedidos-detail-muted">${escHtml(o.correiosTrackingStatus)}</small>`);
        }
        if (o.correiosTrackingLastEvent?.date) {
          parts.push(`<small class="pedidos-detail-muted">${formatDate(o.correiosTrackingLastEvent.date)}</small>`);
        }
      } else if (o.correiosPrePostagemId || o.correiosPrePostagemAt) {
        parts.push('<span class="pedidos-track-status">Pré-postado</span> — aguardando código de rastreio');
      } else {
        parts.push('<span class="pedidos-track-muted">Aguardando pré-postagem</span>');
      }
      if (o.correiosPrePostagemError) {
        parts.push(`<span class="pedidos-track-warn">${escHtml(humanizeCorreiosMsg(o.correiosPrePostagemError, o))}</span>`);
      }
      if (o.correiosShippingManualNote) {
        parts.push(`<small class="pedidos-detail-muted">Obs.: ${escHtml(o.correiosShippingManualNote)}</small>`);
      }
      const prazo = shippingDaysLabel(o);
      if (prazo) parts.push(`<small class="pedidos-frete-prazo">Prazo: ${escHtml(prazo)}</small>`);
      return parts.join('<br>') || '<span class="pedidos-track-muted">—</span>';
    }
    if (isCorreiosIntlOrder(o)) {
      const parts = [`<strong>${escHtml(String(o.shippingService || 'International mail'))}</strong>`];
      if (o.correiosTrackingCode) {
        const url = correiosTrackingPageUrl(o.correiosTrackingCode);
        parts.push(`<strong class="pedidos-detail-av"><a href="${url}" target="_blank" rel="noopener" class="pedidos-track-link">${escHtml(o.correiosTrackingCode)}</a></strong>`);
        if (o.correiosTrackingStatus) parts.push(`<span class="pedidos-track-status">${escHtml(o.correiosTrackingStatus)}</span>`);
        if (o.trackingEmailSentAt) {
          parts.push(`<small class="pedidos-detail-muted">E-mail de rastreio enviado em ${formatDate(o.trackingEmailSentAt)}</small>`);
        }
      } else {
        parts.push('<span class="pedidos-track-muted">Sem código — cole em Rastreio internacional abaixo</span>');
      }
      if (o.correiosShippingManualNote) {
        parts.push(`<small class="pedidos-detail-muted">Obs.: ${escHtml(o.correiosShippingManualNote)}</small>`);
      }
      return parts.join('<br>');
    }
    return '<span class="pedidos-track-muted">—</span>';
  }

  function orderFreteEditSection(o) {
    if (o.status !== 'paid') return '';
    const freteVal = formatFreteInput(o.frete);
    const productVal = formatFreteInput(o.valorProduto);
    const origNote = o.freteOriginal != null && Number(o.freteOriginal) !== Number(o.frete)
      ? `<p class="pedidos-detail-muted">Frete cobrado no checkout: ${formatBRL(o.freteOriginal)}</p>`
      : '';
    const checkoutProduct = o.valorProdutoAtCheckout != null
      ? `<p class="pedidos-detail-muted">Produto no checkout: ${formatBRL(o.valorProdutoAtCheckout)}</p>`
      : '';
    return `
      <section class="pedidos-detail-section pedidos-detail-section--frete">
        <h3 class="pedidos-detail-heading">Frete e acerto do pedido</h3>
        <p class="pedidos-detail-muted">Checkout: cliente pagou <strong>${formatBRL(o.totalPaid != null ? o.totalPaid : o.total)}</strong>. Se baixar o frete, a diferença vai para o produto. Se você baixar o produto (taxa PayPal, etc.), o <strong>total que entrou</strong> vira produto + frete.</p>
        ${origNote}
        ${checkoutProduct}
        <div class="pedidos-shipping-manual">
          <label class="pedidos-shipping-field">
            <span class="pedidos-shipping-label">Frete real (R$)</span>
            <input type="text" class="pedidos-order-frete" value="${escHtml(freteVal)}" placeholder="Ex.: 28,00" inputmode="decimal" />
          </label>
          <label class="pedidos-shipping-field">
            <span class="pedidos-shipping-label">Produto / acerto (R$)</span>
            <input type="text" class="pedidos-order-produto" value="${escHtml(productVal)}" placeholder="Ex.: 472,00" inputmode="decimal" />
          </label>
          <p class="pedidos-detail-muted">Checkout (cliente): <strong>${formatBRL(o.totalPaid != null ? o.totalPaid : o.total)}</strong>${o.paypalFee ? ` · Taxa PayPal: ${formatBRL(o.paypalFee)}` : ''}</p>
          <p class="pedidos-detail-muted">Entrou na conta: <strong class="pedidos-order-total">${formatBRL(o.total != null ? o.total : (Number(o.valorProduto || 0) + Number(o.frete || 0)))}</strong></p>
          <button type="button" class="btn-save-order-frete">Salvar acerto</button>
          <p class="pedidos-frete-feedback" hidden></p>
        </div>
      </section>`;
  }

  function orderAuditRows(o) {
    const bruto = Number(o.valorProdutoAtCheckout ?? o.valorProdutoOriginal ?? o.valorProduto);
    const pago = Number(o.valorProduto);
    const frete = Number(o.frete);
    const total = Number(o.total);
    const rows = [];
    if (Number.isFinite(bruto) && bruto > 0) {
      rows.push(detailRow('Lente (tabela)', formatBRL(bruto)));
    }
    if (o.couponCode) {
      let cupom = escHtml(o.couponCode);
      if (o.couponPercent != null) cupom += ` (${o.couponPercent}%)`;
      if (o.couponDiscount) cupom += ` — desc. ${formatBRL(o.couponDiscount)}`;
      rows.push(detailRow('Cupom', cupom));
    }
    if (Number.isFinite(pago) && pago >= 0) {
      rows.push(detailRow('Lente / produto', `<strong>${formatBRL(pago)}</strong>`));
    }
    if (o.productAdjust != null && Number(o.productAdjust) !== 0) {
      rows.push(detailRow('Acerto extra', formatBRL(o.productAdjust)));
    }
    if (Number.isFinite(frete) && frete >= 0) {
      rows.push(detailRow('Frete pago', `<strong>${formatBRL(frete)}</strong>`));
    }
    const sfLabel = superfreteServiceLabel(o.superfreteService);
    const escolhido = sfLabel || shippingKindLabel(o);
    rows.push(detailRow('Frete escolhido', escHtml(escolhido)));
    if (o.shippingMethodId) {
      rows.push(detailRow('ID método', `<code>${escHtml(o.shippingMethodId)}</code>`));
    }
    if (o.superfreteService != null) {
      rows.push(detailRow('SF serviço', `<code>${escHtml(String(o.superfreteService))}</code>${sfLabel ? ` (${escHtml(sfLabel)})` : ''}`));
    }
    if (o.shippingService && sfLabel && String(o.shippingService).toUpperCase() !== sfLabel) {
      rows.push(detailRow('Rótulo salvo', `<span class="pedidos-track-warn">${escHtml(o.shippingService)} (diverge)</span>`));
    }
    if (o.paypalFee != null && Number(o.paypalFee) > 0) {
      rows.push(detailRow('Taxa PayPal', `− ${formatBRL(o.paypalFee)}`));
    }
    if (o.totalPaid != null && Number.isFinite(Number(o.totalPaid))) {
      rows.push(detailRow('Checkout (cliente)', formatBRL(o.totalPaid)));
    }
    if (Number.isFinite(total) && total >= 0) {
      rows.push(detailRow('Entrou na conta', `<strong>${formatBRL(total)}</strong>`));
    }
    if (!rows.length) return '';
    return `<section class="pedidos-detail-section pedidos-detail-section--audit">
      <h3 class="pedidos-detail-heading">Auditoria do pedido</h3>
      <div class="pedidos-detail-grid">${rows.join('')}</div>
    </section>`;
  }

  function freteDetailRows(o) {
    const kind = escHtml(shippingKindLabel(o));
    const paid = Number(o.frete);
    const hasPaid = Number.isFinite(paid) && paid >= 0;
    const est = Number(o.correiosFreteEstimado);
    const hasEst = isCorreiosBrOrder(o) && Number.isFinite(est) && est > 0;
    const rows = [];
    if (hasEst) rows.push(detailRow('Correios (est.)', `<strong>${formatBRL(est)}</strong>`));
    if (hasPaid) rows.push(detailRow('Cliente pagou', formatBRL(paid)));
    rows.push(detailRow('Tipo envio', kind));
    const prazo = shippingDaysLabel(o);
    if (prazo) rows.push(detailRow('Prazo entrega', prazo));
    return rows.join('');
  }

  let orderModalEl = null;

  function closeOrderModal() {
    if (orderModalEl) orderModalEl.hidden = true;
  }

  function normalizeTrackingCode(raw) {
    return String(raw || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  }

  function inferMethodFromTracking(code) {
    const c = normalizeTrackingCode(code);
    if (c.startsWith('AP')) return 'correios-manual-pac';
    if (c.startsWith('AV')) return 'br-mini-envios';
    if (c.startsWith('AD') || c.startsWith('AB')) return 'correios-manual-sedex';
    return null;
  }

  function formatFreteInput(n) {
    const v = Number(n);
    if (!Number.isFinite(v) || v <= 0) return '';
    return v.toFixed(2).replace('.', ',');
  }

  function parseFreteInput(raw) {
    return parseFloat(String(raw || '').replace(/\./g, '').replace(',', '.')) || 0;
  }

  async function fetchShippingMethodQuote(orderId, methodId) {
    if (!methodId || methodId === 'correios-manual-outro') return null;
    const res = await fetch(
      apiBase() + '/orders/' + encodeURIComponent(orderId) + '/shipping-method-quote?methodId=' + encodeURIComponent(methodId),
      { headers: adminAuthHeaders() }
    );
    if (!res.ok) return null;
    return res.json().catch(() => null);
  }

  function wireManualShippingForm(body, o) {
    const methodSelect = body.querySelector('.pedidos-shipping-method');
    const trackingInput = body.querySelector('.pedidos-shipping-tracking');
    const priceInput = body.querySelector('.pedidos-shipping-price');
    const daysInput = body.querySelector('.pedidos-shipping-days');
    const quoteHint = body.querySelector('.pedidos-shipping-quote-hint');

    const applyQuote = async (methodId, opts = {}) => {
      if (!methodId || methodId === 'correios-manual-outro') {
        if (quoteHint) quoteHint.textContent = '';
        return;
      }
      if (quoteHint) quoteHint.textContent = 'Consultando Correios…';
      const quote = await fetchShippingMethodQuote(o.orderId, methodId);
      if (!quote?.price) {
        if (quoteHint) quoteHint.textContent = 'Cotação indisponível — informe valor e prazo manualmente.';
        return;
      }
      if (priceInput && opts.fillPrice !== false) priceInput.value = formatFreteInput(quote.price);
      if (daysInput && opts.fillDays !== false) daysInput.value = String(quote.days);
      if (quoteHint) {
        quoteHint.textContent = quote.source === 'correios'
          ? 'Valor e prazo preenchidos via API Correios.'
          : 'Estimativa — ajuste se pagou outro valor no balcão.';
      }
    };

    methodSelect?.addEventListener('change', () => applyQuote(methodSelect.value));
    trackingInput?.addEventListener('blur', () => {
      const inferred = inferMethodFromTracking(trackingInput.value);
      if (!inferred || !methodSelect) return;
      const current = String(methodSelect.value || '');
      if (!current || current === 'br-mini-envios' || current === '(manter atual)') {
        methodSelect.value = inferred;
        applyQuote(inferred);
      }
    });

    const code = normalizeTrackingCode(o.correiosTrackingCode || trackingInput?.value);
    let methodId = String(methodSelect?.value || o.shippingMethodId || '').trim();
    if (!methodId && code) methodId = inferMethodFromTracking(code) || '';
    if (methodId && methodSelect && !methodSelect.value) methodSelect.value = methodId;
    const needsQuote = methodId && methodId !== 'correios-manual-outro'
      && (!Number(o.correiosFreteEstimado) || !Number(o.shippingDays));
    if (needsQuote) applyQuote(methodId);
  }

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
      el.addEventListener('click', closeOrderModal);
    });
    document.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape' && !wrap.hidden) closeOrderModal();
    });
    orderModalEl = wrap;
    return wrap;
  }

  function renderOrderModal(o) {
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
        ${detailRow('Data', formatDateCell(o.createdAt))}
        ${detailRow('Cliente', `${escHtml(o.nome)}<br><small>${escHtml(o.email || '—')}</small><br><small>${escHtml(o.telefone || '—')}</small>`)}
        ${detailRow('Smartwatch', watch)}
        ${detailRow('País', escHtml(o.pais || '—'))}
        ${detailRow('Pagamento', escHtml(o.pagamento || '—'))}
        ${detailRow('Comissionado', commissioner)}
        ${detailRow('Total', `<strong>${formatBRL(o.total)}</strong>`)}
        ${freteDetailRows(o)}
      </div>
      ${orderAuditRows(o)}
      ${orderFreteEditSection(o)}
      ${secondary.length ? `<div class="pedidos-detail-secondary">${secondary.join('')}</div>` : ''}
      <section class="pedidos-detail-section pedidos-detail-section--entrega">
        <h3 class="pedidos-detail-heading">Entrega / Rastreio</h3>
        ${deliveryDetailBlock(o)}
      </section>
      ${manualShippingSection(o)}
    `;

    wireManualShippingForm(body, o);
    wireOrderFreteForm(body, o);

    body.querySelector('.btn-save-shipping')?.addEventListener('click', async () => {
      const trackingInput = body.querySelector('.pedidos-shipping-tracking');
      const statusSelect = body.querySelector('.pedidos-shipping-status');
      const methodSelect = body.querySelector('.pedidos-shipping-method');
      const priceInput = body.querySelector('.pedidos-shipping-price');
      const daysInput = body.querySelector('.pedidos-shipping-days');
      const noteInput = body.querySelector('.pedidos-shipping-note');
      const feedbackEl = body.querySelector('.pedidos-shipping-feedback');
      const saveBtn = body.querySelector('.btn-save-shipping');
      const showFeedback = (msg, type) => {
        if (!feedbackEl) return;
        feedbackEl.textContent = msg;
        feedbackEl.className = 'pedidos-shipping-feedback form-status ' + (type || '');
        feedbackEl.hidden = !msg;
      };

      const code = normalizeTrackingCode(trackingInput?.value);
      if (trackingInput && code !== trackingInput.value) trackingInput.value = code;
      const payload = {};
      const existingCode = normalizeTrackingCode(o.correiosTrackingCode);
      if (code !== existingCode) {
        if (!code) {
          showFeedback('Informe o código de rastreio.', 'error');
          return;
        }
        if (!/^[A-Z]{2}\d{9}[A-Z]{2}$/.test(code)) {
          const need = 13 - code.length;
          const hint = need > 0
            ? `Incompleto (${code.length}/13). Faltam ${need} caractere(s) — ex.: RN000689771BR`
            : 'Formato: 2 letras + 9 números + 2 letras — ex.: RN000689771BR';
          showFeedback(hint, 'error');
          return;
        }
        payload.trackingCode = code;
      }
      const statusVal = String(statusSelect?.value || '').trim();
      if (statusVal && statusVal !== String(o.correiosTrackingStatus || '').trim()) {
        payload.correiosTrackingStatus = statusVal;
      } else if (payload.trackingCode && !statusVal && !o.correiosTrackingStatus) {
        payload.correiosTrackingStatus = 'Postado';
      }
      const methodVal = String(methodSelect?.value || '').trim();
      if (methodVal && methodVal !== String(o.shippingMethodId || '').trim()) {
        payload.shippingMethodId = methodVal;
      }
      const noteVal = String(noteInput?.value || '').trim();
      if (noteVal !== String(o.correiosShippingManualNote || '').trim()) {
        payload.correiosShippingManualNote = noteVal;
      }
      const orderFreteInput = body.querySelector('.pedidos-order-frete');
      const orderFreteVal = parseFreteInput(orderFreteInput?.value);
      const existingOrderFrete = Number(o.frete);
      if (Number.isFinite(orderFreteVal) && orderFreteVal >= 0 && orderFreteVal !== existingOrderFrete) {
        payload.frete = orderFreteVal;
      }
      const orderProductInput = body.querySelector('.pedidos-order-produto');
      const orderProductVal = parseFreteInput(orderProductInput?.value);
      const existingProduct = Number(o.valorProduto);
      if (Number.isFinite(orderProductVal) && orderProductVal >= 0 && orderProductVal !== existingProduct) {
        payload.valorProduto = orderProductVal;
      }
      const priceVal = parseFreteInput(priceInput?.value);
      const existingPrice = Number(o.correiosFreteEstimado);
      if (priceVal > 0 && priceVal !== existingPrice) {
        payload.correiosFreteEstimado = priceVal;
      }
      const daysVal = parseInt(String(daysInput?.value || ''), 10);
      const existingDays = Number(o.shippingDays);
      if (Number.isFinite(daysVal) && daysVal > 0 && daysVal !== existingDays) {
        payload.shippingDays = daysVal;
      }
      if (!Object.keys(payload).length) {
        showFeedback('Nenhuma alteração para salvar.', 'warn');
        return;
      }

      showFeedback('', '');
      const prevLabel = saveBtn?.textContent || '';
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Salvando…';
      }
      try {
        const saved = await saveShippingOverride(o.orderId, payload);
        if (!saved || saved.error) {
          showFeedback(saved?.error || 'Não foi possível salvar. Verifique o código e tente de novo.', 'error');
          return;
        }
        applyShippingOverrideToOrder(o, saved);
        const idx = allOrders.findIndex((x) => x.orderId === o.orderId);
        if (idx >= 0) applyShippingOverrideToOrder(allOrders[idx], saved);
        applyFilters();
        closeOrderModal();
        let emailed = '';
        if (payload.trackingCode) {
          if (saved.trackingEmailSent) emailed = ' — e-mail de rastreio enviado (só desta vez)';
          else if (saved.trackingEmailSentAt || saved.trackingEmailSkipped) {
            emailed = ' — e-mail de rastreio já tinha sido enviado antes (não reenviado)';
          }
        }
        showStatus('Envio atualizado' + (saved.trackingCode ? ': ' + saved.trackingCode : '') + emailed, 'success');
      } finally {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.textContent = prevLabel;
        }
      }
    });
  }

  function wireOrderFreteForm(body, o) {
    const freteInput = body.querySelector('.pedidos-order-frete');
    const saveBtn = body.querySelector('.btn-save-order-frete');
    const feedbackEl = body.querySelector('.pedidos-frete-feedback');
    if (!freteInput || !saveBtn) return;

    const showFeedback = (msg, type) => {
      if (!feedbackEl) return;
      feedbackEl.textContent = msg;
      feedbackEl.className = 'pedidos-frete-feedback form-status ' + (type || '');
      feedbackEl.hidden = !msg;
    };

    saveBtn.addEventListener('click', async () => {
      const productInput = body.querySelector('.pedidos-order-produto');
      const freteVal = parseFreteInput(freteInput.value);
      const productVal = parseFreteInput(productInput?.value);
      const existingFrete = Number(o.frete);
      const existingProduct = Number(o.valorProduto);
      if (!Number.isFinite(freteVal) || freteVal < 0) {
        showFeedback('Informe um valor de frete válido.', 'error');
        return;
      }
      const payload = {};
      if (freteVal !== existingFrete) payload.frete = freteVal;
      if (Number.isFinite(productVal) && productVal >= 0 && productVal !== existingProduct) {
        payload.valorProduto = productVal;
      }
      if (!Object.keys(payload).length) {
        showFeedback('Nenhuma alteração para salvar.', 'warn');
        return;
      }
      saveBtn.disabled = true;
      const prevLabel = saveBtn.textContent;
      saveBtn.textContent = 'Salvando…';
      showFeedback('', '');
      try {
        const saved = await saveShippingOverride(o.orderId, payload);
        if (!saved || saved.error) {
          showFeedback(saved?.error || 'Não foi possível salvar.', 'error');
          return;
        }
        applyShippingOverrideToOrder(o, saved);
        const idx = allOrders.findIndex((x) => x.orderId === o.orderId);
        if (idx >= 0) applyShippingOverrideToOrder(allOrders[idx], saved);
        applyFilters();
        const totalEl = body.querySelector('.pedidos-order-total');
        if (totalEl && (saved.totalPaid != null || saved.total != null)) {
          totalEl.textContent = formatBRL(saved.totalPaid != null ? saved.totalPaid : saved.total);
        }
        if (productInput && saved.valorProduto != null) {
          productInput.value = formatFreteInput(saved.valorProduto);
        }
        showFeedback(
          `Acerto salvo — produto ${formatBRL(saved.valorProduto)} · frete ${formatBRL(saved.frete)} · total pago ${formatBRL(saved.totalPaid != null ? saved.totalPaid : saved.total)}`,
          'success'
        );
        showStatus(`Pedido ${o.orderId}: produto ${formatBRL(saved.valorProduto)}, frete ${formatBRL(saved.frete)}`, 'success');
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = prevLabel;
      }
    });
  }

  function applyShippingOverrideToOrder(order, data) {
    if (!order || !data) return;
    if (data.trackingCode) {
      order.correiosTrackingCode = data.trackingCode;
      order.correiosPrePostagemError = null;
    }
    if (data.correiosTrackingStatus) order.correiosTrackingStatus = data.correiosTrackingStatus;
    if (data.shippingMethodId) order.shippingMethodId = data.shippingMethodId;
    if (data.shippingService) order.shippingService = data.shippingService;
    if (data.correiosShippingManualNote != null) {
      order.correiosShippingManualNote = data.correiosShippingManualNote;
    }
    if (data.correiosFreteEstimado != null) order.correiosFreteEstimado = data.correiosFreteEstimado;
    if (data.frete != null) order.frete = data.frete;
    if (data.freteOriginal != null) order.freteOriginal = data.freteOriginal;
    if (data.total != null) order.total = data.total;
    if (data.totalPaid != null) order.totalPaid = data.totalPaid;
    if (data.valorProduto != null) order.valorProduto = data.valorProduto;
    if (data.productAdjust != null) order.productAdjust = data.productAdjust;
    if (data.valorProdutoAtCheckout != null) order.valorProdutoAtCheckout = data.valorProdutoAtCheckout;
    if (data.paypalFee != null) order.paypalFee = data.paypalFee;
    if (data.shippingDays != null) order.shippingDays = data.shippingDays;
    if (data.shippingServiceCode != null) order.shippingServiceCode = data.shippingServiceCode;
    if (data.trackingEmailSentAt) order.trackingEmailSentAt = data.trackingEmailSentAt;
    order.correiosManualUpdatedAt = new Date().toISOString();
  }

  function applyCorreiosSyncResults(data) {
    for (const order of allOrders) {
      const summary = data.orders?.[order.orderId];
      if (!summary) continue;
      if (summary.trackingCode) order.correiosTrackingCode = summary.trackingCode;
      if (summary.status) order.correiosTrackingStatus = summary.status;
      if (summary.lastEvent) order.correiosTrackingLastEvent = summary.lastEvent;
      if (summary.events) order.correiosTrackingEvents = summary.events;
      if (summary.correiosFreteEstimado != null) order.correiosFreteEstimado = summary.correiosFreteEstimado;
      if (summary.correiosFreteEstimado != null || summary.trackingCode || summary.status) {
        order.correiosTrackingUpdatedAt = new Date().toISOString();
      }
    }
  }

  async function syncCorreiosOrders(orderIds, forceAvSync = false) {
    if (!orderIds.length) return null;
    const res = await fetch(apiBase() + '/admin/correios-tracking', {
      method: 'POST',
      headers: { ...adminAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderIds, forceAvSync })
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => ({}));
    applyCorreiosSyncResults(data);
    return data;
  }

  async function showOrderDetails(o) {
    ensureOrderModal();
    renderOrderModal(o);
    if (orderModalEl) orderModalEl.hidden = false;

    const body = document.getElementById('pedidos-order-modal-body');
    let fresh = o;

    // Não gera pré-postagem ao abrir — só no botão Etiqueta.
    if (
      o.status === 'paid'
      && isCorreiosIntlOrder(o)
      && o.correiosPrePostagemError
      && !o.correiosTrackingCode
      && body
      && !body.querySelector('.pedidos-intl-label-note')
    ) {
      body.insertAdjacentHTML(
        'beforeend',
        '<p class="pedidos-intl-label-note admin-meta">'
          + escHtml(humanizeCorreiosMsg(o.correiosPrePostagemError, o))
          + '</p>'
      );
    }

    // Super Frete liberada sem AV → tenta agora e continua tentando (SF às vezes demora o código).
    if (
      fresh.status === 'paid'
      && isSuperfreteOrder(fresh)
      && fresh.superfreteCartId
      && String(fresh.superfreteCartStatus || '').toLowerCase() === 'released'
      && !fresh.superfreteTrackingCode
      && !fresh.correiosTrackingCode
    ) {
      pollSuperfreteTracking(fresh, body);
    }

    // Se a pré-postagem já existe e falta o AV, só consulta rastreio (sem criar nada novo).
    const needsAv = fresh.status === 'paid' && isCorreiosLabelOrder(fresh) && !fresh.correiosTrackingCode
      && (fresh.correiosPrePostagemId || fresh.correiosPrePostagemAt);
    if (!needsAv) return;

    if (body && !body.querySelector('.pedidos-detail-sync-av')) {
      body.insertAdjacentHTML('beforeend', '<p class="pedidos-detail-sync pedidos-detail-sync-av">Buscando código AV nos Correios…</p>');
    }
    await syncCorreiosOrders([fresh.orderId], true);
    fresh = allOrders.find((x) => x.orderId === fresh.orderId) || fresh;
    renderOrderModal(fresh);
    applyFilters();
  }

  async function pollSuperfreteTracking(order, body) {
    const orderId = order.orderId;
    if (body && !body.querySelector('.pedidos-detail-sync-sf')) {
      body.insertAdjacentHTML(
        'beforeend',
        '<p class="pedidos-detail-sync pedidos-detail-sync-sf">Buscando rastreio no Super Frete (pode demorar alguns minutos)…</p>'
      );
    }
    const maxAttempts = 36; // ~6 min a cada 10s
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const res = await fetch(
          apiBase() + '/orders/' + encodeURIComponent(orderId) + '/superfrete-tracking',
          { method: 'POST', headers: adminAuthHeaders() }
        );
        const data = await res.json().catch(() => ({}));
        if (data.trackingCode) {
          const live = allOrders.find((x) => x.orderId === orderId) || order;
          live.superfreteTrackingCode = data.trackingCode;
          live.correiosTrackingCode = data.trackingCode;
          live.correiosTrackingStatus = live.correiosTrackingStatus || 'Pré-postado';
          if (data.status) live.superfreteCartStatus = data.status;
          const idx = allOrders.findIndex((x) => x.orderId === orderId);
          if (idx >= 0) Object.assign(allOrders[idx], {
            superfreteTrackingCode: live.superfreteTrackingCode,
            correiosTrackingCode: live.correiosTrackingCode,
            correiosTrackingStatus: live.correiosTrackingStatus,
            superfreteCartStatus: live.superfreteCartStatus
          });
          if (orderModalEl && !orderModalEl.hidden
            && document.getElementById('pedidos-order-modal-title')?.textContent === orderId) {
            renderOrderModal(live);
          }
          applyFilters();
          showStatus('Rastreio Super Frete: ' + data.trackingCode, 'success');
          break;
        }
      } catch (_) { /* keep trying */ }
      if (i < maxAttempts - 1) await new Promise((r) => setTimeout(r, 10000));
    }
    document.querySelector('.pedidos-detail-sync-sf')?.remove();
  }

  function openPdfBase64(b64, filename) {
    if (window.STF_CORREIOS_LABEL_PRINT?.openPdfBase64(b64, filename)) return;
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

  const AV_SCAN_PATTERNS = [/AV\d{9}[A-Z]{2}/g, /[A-Z]{2}\d{9}[A-Z]{2}/g];

  function pickAvFromMatches(matches) {
    if (!matches?.length) return null;
    const av = matches.find((m) => m.startsWith('AV'));
    return av || matches[0];
  }

  function scanAvInString(text) {
    if (!text) return null;
    const upper = String(text).toUpperCase();
    for (const re of AV_SCAN_PATTERNS) {
      re.lastIndex = 0;
      const found = pickAvFromMatches(upper.match(re));
      if (found) return found;
    }
    return null;
  }

  function decodePdfLiteral(str) {
    return str.replace(/\\([0-7]{1,3}|.)/g, (_, seq) => {
      if (seq.length <= 3 && /^[0-7]+$/.test(seq)) return String.fromCharCode(parseInt(seq, 8));
      if (seq === 'n') return '\n';
      if (seq === 'r') return '\r';
      if (seq === 't') return '\t';
      return seq;
    });
  }

  function scanAvInPdfRaw(raw) {
    let code = scanAvInString(raw);
    if (code) return code;
    const literalRe = /\(([^()\\]*(?:\\.[^()\\]*)*)\)/g;
    let m;
    while ((m = literalRe.exec(raw)) !== null) {
      code = scanAvInString(decodePdfLiteral(m[1]));
      if (code) return code;
    }
    const hexRe = /<([0-9A-Fa-f\s]+)>/g;
    while ((m = hexRe.exec(raw)) !== null) {
      const hex = m[1].replace(/\s/g, '');
      if (hex.length < 26 || hex.length % 2) continue;
      let decoded = '';
      for (let i = 0; i < hex.length; i += 2) {
        decoded += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16));
      }
      code = scanAvInString(decoded);
      if (code) return code;
    }
    return null;
  }

  async function inflatePdfChunk(bytes) {
    for (const format of ['deflate', 'deflate-raw']) {
      try {
        const buf = await new Response(
          new Blob([bytes]).stream().pipeThrough(new DecompressionStream(format))
        ).arrayBuffer();
        return new Uint8Array(buf);
      } catch {
        /* try next */
      }
    }
    return null;
  }

  async function scanAvInFlateStreams(raw) {
    const streamRe = /stream\r?\n/g;
    let match;
    while ((match = streamRe.exec(raw)) !== null) {
      const ctx = raw.slice(Math.max(0, match.index - 400), match.index);
      if (!/\/FlateDecode|\/Fl[^a-zA-Z]/i.test(ctx)) continue;
      const dataStart = match.index + match[0].length;
      const endIdx = raw.indexOf('endstream', dataStart);
      if (endIdx < 0) continue;
      const chunk = raw.slice(dataStart, endIdx).replace(/\r?\n$/, '');
      const bytes = Uint8Array.from(chunk, (c) => c.charCodeAt(0) & 0xff);
      const inflated = await inflatePdfChunk(bytes);
      if (!inflated?.length) continue;
      let code = scanAvInBytes(inflated);
      if (code) return code;
      code = scanAvInPdfRaw(String.fromCharCode.apply(null, inflated.subarray(0, Math.min(inflated.length, 500000))));
      if (code) return code;
    }
    return null;
  }

  function scanAvInBytes(bytes) {
    if (!bytes?.length || bytes.length < 13) return null;
    let fallback = null;
    for (let i = 0; i <= bytes.length - 13; i += 1) {
      const b0 = bytes[i];
      const b1 = bytes[i + 1];
      if (b0 < 65 || b0 > 90 || b1 < 65 || b1 > 90) continue;
      let digitsOk = true;
      for (let j = 2; j <= 10; j += 1) {
        const c = bytes[i + j];
        if (c < 48 || c > 57) { digitsOk = false; break; }
      }
      if (!digitsOk) continue;
      const b11 = bytes[i + 11];
      const b12 = bytes[i + 12];
      if (b11 < 65 || b11 > 90 || b12 < 65 || b12 > 90) continue;
      const code = String.fromCharCode(b0, b1, ...bytes.slice(i + 2, i + 13));
      if (code.startsWith('AV')) return code;
      if (!fallback) fallback = code;
    }
    return fallback;
  }

  async function extractAvFromPdfBase64(b64) {
    if (!b64) return null;
    try {
      const raw = atob(String(b64));
      const bytes = Uint8Array.from(raw, (c) => c.charCodeAt(0) & 0xff);
      let code = scanAvInBytes(bytes);
      if (code) return code;
      code = scanAvInPdfRaw(raw);
      if (code) return code;
      return await scanAvInFlateStreams(raw);
    } catch {
      return null;
    }
  }

  async function saveCorreiosAv(orderId, trackingCode) {
    const res = await fetch(apiBase() + '/orders/' + encodeURIComponent(orderId) + '/correios-av', {
      method: 'PATCH',
      headers: { ...adminAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackingCode })
    });
    if (!res.ok) return null;
    return res.json().catch(() => null);
  }

  async function saveShippingOverride(orderId, payload) {
    const res = await fetch(apiBase() + '/orders/' + encodeURIComponent(orderId) + '/shipping', {
      method: 'PATCH',
      headers: { ...adminAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { error: data.error || 'Não foi possível salvar o envio.' };
    }
    return data;
  }

  async function printOrderLabel(order) {
    try {
      showStatus('Gerando etiqueta…', '');
      const forceSf = !!(order.superfreteCheckoutError || order.superfreteCartError
        || /cancel|reject|fail|expir/i.test(String(order.superfreteCartStatus || '')));
      // Após cancelar no painel SF o status local ainda pode ser "released" — o Worker
      // consulta a API e recria; force=1 só quando já sabemos que a etiqueta morreu.
      const labelUrl = apiBase() + '/orders/' + encodeURIComponent(order.orderId) + '/shipping-label'
        + (forceSf ? '?force=1' : '');
      const res = await fetch(labelUrl, {
        method: 'POST',
        headers: adminAuthHeaders()
      });
      const data = await res.json().catch(() => ({}));
      if (data.mode === 'pdf' && data.pdfBase64) {
        openPdfBase64(data.pdfBase64, 'etiqueta-' + order.orderId + '.pdf');
        let trackingCode = data.trackingCode ? String(data.trackingCode).trim().toUpperCase() : null;
        if (!trackingCode) {
          trackingCode = await extractAvFromPdfBase64(data.pdfBase64);
          if (trackingCode) await saveCorreiosAv(order.orderId, trackingCode);
        }
        if (trackingCode) {
          order.correiosTrackingCode = trackingCode;
          const idx = allOrders.findIndex((x) => x.orderId === order.orderId);
          if (idx >= 0) {
            allOrders[idx].correiosTrackingCode = trackingCode;
            allOrders[idx].correiosTrackingStatus = allOrders[idx].correiosTrackingStatus || 'Pré-postado';
          }
        }
        await syncCorreiosOrders([order.orderId], true);
        const fresh = allOrders.find((x) => x.orderId === order.orderId) || order;
        if (orderModalEl && !orderModalEl.hidden
          && document.getElementById('pedidos-order-modal-title')?.textContent === order.orderId) {
          renderOrderModal(fresh);
        }
        applyFilters();
        const track = fresh.correiosTrackingCode ? ' — rastreio ' + fresh.correiosTrackingCode : '';
        if (fresh.correiosTrackingCode) {
          showStatus('Etiqueta Correios aberta' + track, 'success');
        } else {
          showStatus('Etiqueta aberta, mas AV não detectado. Abra o pedido e cole o AV da etiqueta.', 'warn');
        }
        return;
      }
      if (data.mode === 'superfrete') {
        if (data.cartId) {
          order.superfreteCartId = data.cartId;
          order.superfreteCartStatus = data.status || order.superfreteCartStatus;
          if (data.price != null) order.superfreteCartPrice = data.price;
        }
        if (data.trackingCode) {
          order.superfreteTrackingCode = data.trackingCode;
          order.correiosTrackingCode = data.trackingCode;
          order.correiosTrackingStatus = order.correiosTrackingStatus || 'Pré-postado';
        }
        if (data.checkoutError) order.superfreteCheckoutError = data.checkoutError;
        if (data.cartError) order.superfreteCartError = data.cartError;
        if (data.skipped) order.superfreteSkipped = data.message;
        const idx = allOrders.findIndex((x) => x.orderId === order.orderId);
        if (idx >= 0) Object.assign(allOrders[idx], {
          superfreteCartId: order.superfreteCartId,
          superfreteCartStatus: order.superfreteCartStatus,
          superfreteCartPrice: order.superfreteCartPrice,
          superfreteTrackingCode: order.superfreteTrackingCode,
          correiosTrackingCode: order.correiosTrackingCode,
          correiosTrackingStatus: order.correiosTrackingStatus,
          superfreteCheckoutError: order.superfreteCheckoutError,
          superfreteCartError: order.superfreteCartError,
          superfreteSkipped: order.superfreteSkipped
        });
        applyFilters();
        const panel = data.panelUrl || 'https://web.superfrete.com/#/minhas-etiquetas';
        const wallet = data.walletUrl || 'https://web.superfrete.com/#/carteira';
        const msg = data.message || data.error || 'Super Frete';
        const needsPay = !!(data.checkoutError || data.cartError
          || (data.cartId && data.status && data.status !== 'released'));
        showStatus(msg, data.skipped ? 'warn' : (data.checkoutError || data.cartError || data.error ? 'error' : (needsPay ? 'warn' : 'success')));
        if (!data.skipped) {
          window.open(needsPay && (data.checkoutError || data.cartError) ? wallet : panel, '_blank', 'noopener');
        }
        if (!data.skipped && data.status === 'released' && !data.trackingCode && !order.correiosTrackingCode) {
          pollSuperfreteTracking(order, document.getElementById('pedidos-order-modal-body'));
        }
        return;
      }
      if (data.useClient && window.STF_ORDER_LABEL) {
        window.STF_ORDER_LABEL.print(order);
        const why = humanizeCorreiosMsg(data.error || data.detail || data.message || 'Etiqueta local', order);
        showStatus('Correios oficial falhou — abri etiqueta local. ' + why, 'warn');
        if (data.mexpoUrl) {
          console.warn('Pré-postagem internacional: use', data.mexpoUrl);
        }
        return;
      }
      throw new Error(data.error || data.detail || 'Falha ao gerar etiqueta');
    } catch (err) {
      if (window.STF_ORDER_LABEL) {
        window.STF_ORDER_LABEL.print(order);
        showStatus('Correios oficial falhou — abri etiqueta local. ' + humanizeCorreiosMsg(err.message || 'Erro', order), 'warn');
      } else {
        showStatus(humanizeCorreiosMsg(err.message || 'Erro ao gerar etiqueta', order), 'error');
      }
    }
  }

  function renderTable(orders) {
    if (!els.tbody) return;
    els.tbody.innerHTML = '';
    lastRenderedOrders = orders.slice();
    const visibleIds = new Set(orders.map((o) => o.orderId));
    [...selectedOrderIds].forEach((id) => {
      if (!visibleIds.has(id) && !allOrders.some((o) => o.orderId === id)) {
        selectedOrderIds.delete(id);
      }
    });
    if (!orders.length) {
      if (els.empty) els.empty.hidden = false;
      syncSelectAllCheckbox();
      return;
    }
    if (els.empty) els.empty.hidden = true;

    orders.forEach((o) => {
      const tr = document.createElement('tr');
      const checked = selectedOrderIds.has(o.orderId);
      if (checked) tr.classList.add('is-selected');
      tr.innerHTML = `
        <td class="pedidos-col-select" onclick="event.stopPropagation()">
          <input type="checkbox" class="pedidos-row-select" data-order-id="${escHtml(o.orderId)}" ${checked ? 'checked' : ''} aria-label="Selecionar pedido ${escHtml(o.orderId)}">
        </td>
        <td class="pedidos-data">${formatDateCell(o.createdAt)}</td>
        <td class="pedidos-cliente">${escHtml(o.nome)}<br><small>${escHtml(o.email || '')}</small><br><small>${escHtml(o.telefone || '')}</small></td>
        <td class="pedidos-watch">${watchCellHtml(o)}</td>
        <td>${escHtml(o.pais || '—')}</td>
        <td class="pedidos-pay">${paymentCellHtml(o)}</td>
        <td>${commissionerCell(o)}</td>
        <td>${formatBRL(o.total)}</td>
        <td class="pedidos-frete">${freteCell(o)}</td>
        <td class="pedidos-entrega">${entregaCell(o)}</td>
        <td class="pedidos-actions">
          <div class="pedidos-actions-inner">
          ${statusBadgeHtml(o.status)}
          ${o.status === 'paid' ? `<button type="button" class="btn-print-label" title="Imprimir etiqueta térmica"><i class="fas fa-print"></i> Etiqueta</button>` : ''}
          ${o.status === 'paid' && isCorreiosIntlOrder(o) ? (() => {
            const n = letterCountForOrder(o);
            const label = n > 1 ? `Cartas (${n})` : 'Carta';
            return `<button type="button" class="btn-print-letter" title="Cartas thank-you internacionais — ${n} folha(s)"><i class="fas fa-envelope-open-text"></i> ${label}</button>`;
          })() : ''}
          ${o.status !== 'paid' ? `<button type="button" class="btn-confirm-pay" data-order-id="${o.orderId}">Confirmar PIX</button>` : ''}
          </div>
        </td>
      `;

      tr.querySelector('.pedidos-row-select')?.addEventListener('change', (ev) => {
        const id = ev.currentTarget.dataset.orderId;
        if (ev.currentTarget.checked) selectedOrderIds.add(id);
        else selectedOrderIds.delete(id);
        tr.classList.toggle('is-selected', ev.currentTarget.checked);
        syncSelectAllCheckbox();
      });

      tr.querySelector('.btn-print-label')?.addEventListener('click', (ev) => {
        ev.stopPropagation();
        printOrderLabel(o);
      });

      tr.querySelector('.btn-print-letter')?.addEventListener('click', (ev) => {
        ev.stopPropagation();
        openOrderLetters(o);
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

      tr.addEventListener('click', () => showOrderDetails(o));
      els.tbody.appendChild(tr);
    });
    syncSelectAllCheckbox();
  }

  function syncSelectAllCheckbox() {
    const master = $('pedidos-select-all');
    if (!master) return;
    const n = lastRenderedOrders.length;
    const selectedVisible = lastRenderedOrders.filter((o) => selectedOrderIds.has(o.orderId)).length;
    master.checked = n > 0 && selectedVisible === n;
    master.indeterminate = selectedVisible > 0 && selectedVisible < n;
  }

  function selectedOrders() {
    return allOrders.filter((o) => selectedOrderIds.has(o.orderId));
  }

  function buildDeleteConfirmMessage(orders) {
    const names = orders.map((o) => (o.nome || '').trim() || o.orderId);
    const paidCount = orders.filter((o) => o.status === 'paid').length;
    const correiosCount = orders.filter((o) => isCorreiosBrOrder(o) && (o.correiosPrePostagemId || o.correiosTrackingCode)).length;
    let head;
    if (orders.length === 1) {
      head = `Tem certeza que deseja excluir o registro de compra de ${names[0]}?`;
    } else if (orders.length <= 5) {
      head = `Tem certeza que deseja excluir os registros de compra de ${names.join(', ')}?`;
    } else {
      head = `Tem certeza que deseja excluir ${orders.length} registros de compra?\n\nInclui: ${names.slice(0, 5).join(', ')}…`;
    }
    const notes = [
      '',
      'Remove da lista do site e do perfil do cliente.',
      'Não estorna PIX/cartão no Mercado Pago ou Asaas.'
    ];
    if (paidCount) notes.push(`${paidCount} pedido(s) pago(s) na seleção.`);
    if (correiosCount) {
      notes.push(`${correiosCount} com pré-postagem Correios — será cancelada automaticamente quando possível.`);
    }
    return head + notes.join('\n');
  }

  async function deleteSelectedOrders() {
    const orders = selectedOrders();
    if (!orders.length) {
      showStatus('Selecione pelo menos um pedido para excluir.', 'warn');
      return;
    }
    if (!confirm(buildDeleteConfirmMessage(orders))) return;
    let ok = 0;
    let fail = 0;
    const warnParts = [];
    for (const o of orders) {
      try {
        const data = await apiDelete(`/orders/${encodeURIComponent(o.orderId)}`);
        selectedOrderIds.delete(o.orderId);
        ok += 1;
        if (data.correiosCancel && !data.correiosCancel.ok && (data.correiosCancel.detail || data.correiosCancel.error)) {
          warnParts.push(`${o.orderId}: ${data.correiosCancel.detail || data.correiosCancel.error}`);
        }
      } catch (err) {
        fail += 1;
        warnParts.push(`${o.orderId}: ${err.message || 'erro'}`);
      }
    }
    if (fail && !ok) {
      showStatus(`Falha ao excluir: ${warnParts.join(' · ')}`, 'error');
    } else if (warnParts.length) {
      showStatus(`${ok} excluído(s). Atenção: ${warnParts.join(' · ')}`, 'warn');
    } else {
      showStatus(ok === 1 ? 'Pedido excluído.' : `${ok} pedidos excluídos.`, 'success');
    }
    await loadOrders();
  }

  function applyFilters() {
    const q = (els.filterSearch?.value || '').toLowerCase();
    const st = els.filterStatus?.value || '';
    const filtered = allOrders.filter((o) => {
      const matchQ = !q || [o.orderId, o.nome, o.email, o.smartwatch, o.observacoes, o.modeloRelogio, o.pais, o.couponCode, o.couponCommissionerName].join(' ').toLowerCase().includes(q);
      const matchS = !st || o.status === st;
      return matchQ && matchS;
    });
    filtered.sort((a, b) => String(b?.createdAt || '').localeCompare(String(a?.createdAt || '')));
    if (els.count) els.count.textContent = `${filtered.length} pedido(s)`;
    renderTable(filtered);
  }

  let storeConfigCache = null;

  function letterCountForOrder(o) {
    if (!window.STF_ORDER_LETTERS) return 1;
    return window.STF_ORDER_LETTERS.countSlots(o, storeConfigCache || {});
  }

  function openOrderLetters(o) {
    const url = `docs/cartas/carta-agradecimento-intl.html?order=${encodeURIComponent(o.orderId)}`;
    try {
      const token = sessionStorage.getItem('stf_admin_token');
      if (token) {
        localStorage.setItem('stf_letter_handoff', JSON.stringify({ token, at: Date.now() }));
      }
    } catch (_) { /* ignore */ }
    window.open(url, '_blank');
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
          storeConfigCache = cfg;
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
        storeConfigCache = cfg;
        window.STF_ORDER_LABEL?.configure(cfg.shipping);
      }
    } catch (e) {
      console.warn(e);
    }
  }

  async function refreshCorreiosTracking(orders) {
    const staleMs = 30 * 60 * 1000;
    const now = Date.now();
    const ids = orders
      .filter((o) => o.status === 'paid')
      .filter((o) => {
        if (!isCorreiosBrOrder(o)) return false;
        return o.correiosTrackingCode || o.correiosPrePostagemId || o.correiosPrePostagemAt || o.correiosFreteEstimado == null;
      })
      .filter((o) => {
        if (isCorreiosBrOrder(o) && !o.correiosTrackingCode && (o.correiosPrePostagemId || o.correiosPrePostagemAt)) return true;
        const st = String(o.correiosTrackingStatus || '').toLowerCase();
        if (st === 'entregue' || st.includes('entregue ao destinat')) return false;
        if (!o.correiosTrackingUpdatedAt) return true;
        return now - new Date(o.correiosTrackingUpdatedAt).getTime() > staleMs;
      })
      .map((o) => o.orderId)
      .slice(0, 20);
    if (!ids.length) return;
    try {
      await syncCorreiosOrders(ids, false);
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
    loadKvQuota().catch(() => {});
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
    $('btn-delete-selected')?.addEventListener('click', () => {
      deleteSelectedOrders().catch((e) => showStatus(e.message, 'error'));
    });
    $('pedidos-select-all')?.addEventListener('change', (ev) => {
      const on = !!ev.currentTarget.checked;
      lastRenderedOrders.forEach((o) => {
        if (on) selectedOrderIds.add(o.orderId);
        else selectedOrderIds.delete(o.orderId);
      });
      els.tbody?.querySelectorAll('.pedidos-row-select').forEach((cb) => {
        cb.checked = on;
        cb.closest('tr')?.classList.toggle('is-selected', on);
      });
      syncSelectAllCheckbox();
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
