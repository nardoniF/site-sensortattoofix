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

  function fallbackTrackLinks(code) {
    const c = normalizeCode(code);
    if (!c) return [];
    const q = encodeURIComponent(c);
    return [
      {
        id: 'correios',
        label: 'Correios (oficial)',
        url: `https://rastreamento.correios.com.br/app/index.php?objeto=${q}`,
        hint: 'Captcha; objeto já na URL'
      },
      {
        id: '17track',
        label: '17TRACK',
        url: `https://www.17track.net/pt/track?nums=${q}`,
        hint: 'Bom para exportação / exterior'
      },
      {
        id: 'parcelsapp',
        label: 'ParcelsApp',
        url: `https://parcelsapp.com/en/tracking/${q}`,
        hint: 'Rastreio global'
      }
    ];
  }

  const params = new URLSearchParams(window.location.search);
  const code = normalizeCode(params.get('codigo') || params.get('objeto') || '');
  const codeEl = document.getElementById('rastreio-code');
  const statusEl = document.getElementById('rastreio-status');
  const sourceEl = document.getElementById('rastreio-source');
  const metaEl = document.getElementById('rastreio-meta');
  const loadingEl = document.getElementById('rastreio-loading');
  const errorEl = document.getElementById('rastreio-error');
  const bannerEl = document.getElementById('rastreio-banner');
  const linksEl = document.getElementById('rastreio-links');
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

  function isLiveCorreios(data) {
    return data && data.source === 'correios' && data.apiHadEvents !== false;
  }

  function renderTrackLinks(links) {
    if (!linksEl) return;
    const list = Array.isArray(links) && links.length ? links : fallbackTrackLinks(code);
    if (!list.length) {
      linksEl.hidden = true;
      linksEl.innerHTML = '';
      return;
    }
    linksEl.hidden = false;
    linksEl.innerHTML = `
      <p class="rastreio-links-title">Acompanhar o caminho do objeto</p>
      <div class="rastreio-links-grid">
        ${list.map((link) => `
          <a class="rastreio-link-card" href="${escHtml(link.url)}" target="_blank" rel="noopener">
            <strong>${escHtml(link.label)}</strong>
            ${link.hint ? `<span>${escHtml(link.hint)}</span>` : ''}
          </a>`).join('')}
      </div>`;
  }

  function renderTracking(data, ok) {
    if (!ok) {
      if (errorEl) {
        errorEl.hidden = false;
        errorEl.textContent = data.error || 'Não foi possível consultar o rastreio.';
      }
      renderTrackLinks(fallbackTrackLinks(code));
      return;
    }

    if (errorEl) errorEl.hidden = true;

    const live = isLiveCorreios(data);
    const officialUrl = data.officialUrl || fallbackTrackLinks(code)[0]?.url || '';
    renderTrackLinks(data.trackLinks || fallbackTrackLinks(code));

    if (bannerEl) {
      if (!live) {
        bannerEl.hidden = false;
        bannerEl.innerHTML = `
          <strong>A API do contrato não devolveu eventos deste objeto.</strong>
          Use os links abaixo — já abrem com o código <code>${escHtml(code)}</code> preenchido.
          O status da loja pode estar desatualizado em relação ao site oficial.`;
      } else {
        bannerEl.hidden = true;
        bannerEl.innerHTML = '';
      }
    }

    if (statusEl && data.status) {
      statusEl.hidden = false;
      statusEl.textContent = data.status;
      statusEl.classList.toggle('rastreio-status--manual', !live);
    }

    if (sourceEl) {
      sourceEl.hidden = false;
      if (live) sourceEl.textContent = 'Fonte: API Correios (ao vivo)';
      else if (data.source === 'order') sourceEl.textContent = 'Fonte: status lançado pela loja (API sem eventos)';
      else sourceEl.textContent = 'Fonte: sem eventos na API Correios';
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
      if (live) bits.push('<small>Atualiza automaticamente a cada 5 min.</small>');
      else bits.push('<small>A API do contrato é consultada a cada 5 min; o caminho atual está nos links oficiais acima.</small>');
      if (officialUrl) {
        bits.push(`Atalho Correios: <a href="${escHtml(officialUrl)}" target="_blank" rel="noopener">${escHtml(code)}</a>.`);
      }
      footerEl.hidden = false;
      footerEl.innerHTML = bits.join(' ');
    }
  }

  async function loadTracking(silent) {
    if (!silent && loadingEl) {
      loadingEl.hidden = false;
      loadingEl.textContent = 'Consultando API Correios (contrato)…';
    }
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
      renderTrackLinks(fallbackTrackLinks(code));
      return null;
    }
  }

  // Links já na tela enquanto a API responde
  renderTrackLinks(fallbackTrackLinks(code));
  loadTracking(false);

  setInterval(() => {
    if (document.visibilityState === 'visible') loadTracking(true);
  }, REFRESH_MS);
})();
