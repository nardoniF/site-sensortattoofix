(function () {
  const REFRESH_MS = 5 * 60 * 1000;

  function apiBase() {
    return (window.CONFIG_BOOTSTRAP && window.CONFIG_BOOTSTRAP.configApiUrl) || 'https://api.sensortattoofix.com.br';
  }

  function normalizeCode(raw) {
    return String(raw || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  }

  function formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  }

  function escHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  const params = new URLSearchParams(window.location.search);
  const code = normalizeCode(params.get('codigo') || params.get('objeto') || '');
  const codeEl = document.getElementById('rastreio-code');
  const statusEl = document.getElementById('rastreio-status');
  const metaEl = document.getElementById('rastreio-meta');
  const loadingEl = document.getElementById('rastreio-loading');
  const errorEl = document.getElementById('rastreio-error');
  const timelineEl = document.getElementById('rastreio-timeline');
  const footerEl = document.getElementById('rastreio-footer');

  if (!code) {
    if (codeEl) codeEl.textContent = '—';
    if (loadingEl) loadingEl.hidden = true;
    if (errorEl) {
      errorEl.hidden = false;
      errorEl.textContent = 'Informe o código na URL: rastreio.html?codigo=AP170797068BR';
    }
    return;
  }

  if (codeEl) codeEl.textContent = code;

  function renderTracking(data, ok) {
    if (!ok) {
      if (errorEl) {
        errorEl.hidden = false;
        errorEl.textContent = data.error || 'Não foi possível consultar o rastreio.';
      }
      return;
    }

    if (errorEl) errorEl.hidden = true;

    if (statusEl && data.status) {
      statusEl.hidden = false;
      statusEl.textContent = data.status;
    }

    if (metaEl) {
      const parts = [];
      if (data.service) parts.push(data.service);
      if (Number(data.shippingDays) > 0) {
        parts.push(Number(data.shippingDays) === 1 ? '1 dia' : `${data.shippingDays} dias`);
      }
      metaEl.hidden = !parts.length;
      metaEl.textContent = parts.join(' · ');
    }

    const events = Array.isArray(data.events) ? data.events : [];
    if (timelineEl) {
      if (events.length) {
        timelineEl.hidden = false;
        timelineEl.innerHTML = events.map((ev) => `
          <li class="rastreio-event">
            <div class="rastreio-event-date">${escHtml(formatDate(ev.date))}</div>
            <div class="rastreio-event-desc">${escHtml(ev.description || '—')}</div>
            ${ev.detail ? `<div class="rastreio-event-detail">${escHtml(ev.detail)}</div>` : ''}
          </li>`).join('');
      } else {
        timelineEl.hidden = true;
        timelineEl.innerHTML = '';
      }
    }

    if (footerEl) {
      const bits = [];
      if (data.note) bits.push(escHtml(data.note));
      bits.push('<small>Atualiza automaticamente a cada 5 min.</small>');
      if (data.officialUrl) {
        bits.push(`Consulte também no site dos <a href="${escHtml(data.officialUrl)}" target="_blank" rel="noopener">Correios</a> (exige captcha).`);
      }
      footerEl.hidden = false;
      footerEl.innerHTML = bits.join(' ');
    }
  }

  async function loadTracking(silent) {
    if (!silent && loadingEl) loadingEl.hidden = false;
    try {
      const res = await fetch(apiBase() + '/tracking/' + encodeURIComponent(code));
      const data = await res.json().catch(() => ({}));
      if (loadingEl) loadingEl.hidden = true;
      renderTracking(data, res.ok);
      return data;
    } catch {
      if (loadingEl) loadingEl.hidden = true;
      if (errorEl) {
        errorEl.hidden = false;
        errorEl.textContent = 'Erro de conexão ao consultar rastreio.';
      }
      return null;
    }
  }

  loadTracking(false);

  setInterval(() => {
    if (document.visibilityState === 'visible') loadTracking(true);
  }, REFRESH_MS);
})();
