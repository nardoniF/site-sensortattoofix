(function () {
  function normalizeCode(raw) {
    return String(raw || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  }

  function escHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /** Exportação / EMS / Packet — fora do cartão nacional da loja. */
  function isIntlTrackingCode(code) {
    const c = normalizeCode(code);
    return /^(RN|RR|CP|CD|CK|CL|CM|CN|CO|CR|CS|CT|CU|CV|CW|CX|CY|CZ|LK|LM|LP|LV|LY|UA|UB|UC|UD|UE|UF|UG|UH|UI|UJ|UK|UL|UM|UN|UP|UQ|UR|US|UT|UU|UV|UW|UX|UY|UZ)/.test(c);
  }

  function trackLinksForCode(code) {
    const c = normalizeCode(code);
    if (!c) return [];
    const q = encodeURIComponent(c);
    if (isIntlTrackingCode(c)) {
      return [
        { id: '17track', label: '17TRACK', url: `https://www.17track.net/pt/track?nums=${q}` },
        { id: 'parcelsapp', label: 'ParcelsApp', url: `https://parcelsapp.com/en/tracking/${q}` }
      ];
    }
    return [
      {
        id: 'correios',
        label: 'Correios',
        url: `https://rastreamento.correios.com.br/app/index.php?objeto=${q}`
      }
    ];
  }

  const params = new URLSearchParams(window.location.search);
  const code = normalizeCode(params.get('codigo') || params.get('objeto') || '');
  const codeEl = document.getElementById('rastreio-code');
  const linksEl = document.getElementById('rastreio-links');
  const errorEl = document.getElementById('rastreio-error');

  if (!code) {
    if (codeEl) codeEl.textContent = '—';
    if (errorEl) {
      errorEl.hidden = false;
      errorEl.textContent = 'Informe o código na URL: rastreio.html?codigo=AP170797068BR';
    }
    return;
  }

  if (codeEl) codeEl.textContent = code;

  const links = trackLinksForCode(code);
  if (!linksEl || !links.length) return;

  const gridClass = links.length >= 2 ? 'rastreio-links-grid rastreio-links-grid--2' : 'rastreio-links-grid';
  linksEl.hidden = false;
  linksEl.innerHTML = `
    <p class="rastreio-links-title">Acompanhar o caminho do objeto</p>
    <div class="${gridClass}">
      ${links.map((link) => `
        <a class="rastreio-link-card" href="${escHtml(link.url)}" target="_blank" rel="noopener">
          ${escHtml(link.label)}
        </a>`).join('')}
    </div>`;
})();
