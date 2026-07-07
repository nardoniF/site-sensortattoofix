(function () {
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

  fetch(apiBase() + '/tracking/' + encodeURIComponent(code))
    .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
    .then(({ ok, data }) => {
      if (loadingEl) loadingEl.hidden = true;
      if (!ok) {
        if (errorEl) {
          errorEl.hidden = false;
          errorEl.textContent = data.error || 'Não foi possível consultar o rastreio.';
        }
        return;
      }

      if (statusEl && data.status) {
        statusEl.hidden = false;
        statusEl.textContent = data.status;
      }

      const events = Array.isArray(data.events) ? data.events : [];
      if (timelineEl && events.length) {
        timelineEl.hidden = false;
        timelineEl.innerHTML = events.map((ev) => `
          <li class="rastreio-event">
            <div class="rastreio-event-date">${escHtml(formatDate(ev.date))}</div>
            <div class="rastreio-event-desc">${escHtml(ev.description || '—')}</div>
            ${ev.detail ? `<div class="rastreio-event-detail">${escHtml(ev.detail)}</div>` : ''}
          </li>`).join('');
      } else if (errorEl && !events.length) {
        errorEl.hidden = false;
        errorEl.textContent = 'Nenhum evento de rastreio disponível ainda.';
      }

      if (footerEl && data.officialUrl) {
        footerEl.hidden = false;
        footerEl.innerHTML = `Também pode consultar no site dos <a href="${escHtml(data.officialUrl)}" target="_blank" rel="noopener">Correios</a> (exige captcha).`;
      }
    })
    .catch(() => {
      if (loadingEl) loadingEl.hidden = true;
      if (errorEl) {
        errorEl.hidden = false;
        errorEl.textContent = 'Erro de conexão ao consultar rastreio.';
      }
    });
})();
