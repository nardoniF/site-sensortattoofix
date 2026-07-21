/**
 * Preenche #pais-code a partir de /config — independente do checkout.js (evita cache stale no .com).
 */
(function () {
  function locale() {
    const lang = (document.documentElement.lang || 'en').toLowerCase();
    return lang.startsWith('it') ? 'it' : 'en';
  }

  function labelFor(code, fallback) {
    try {
      return new Intl.DisplayNames([locale()], { type: 'region' }).of(code) || fallback || code;
    } catch {
      return fallback || code;
    }
  }

  async function fillCountries() {
    const sel = document.getElementById('pais-code');
    if (!sel || sel.options.length > 1) return;
    const base = String(window.CONFIG_BOOTSTRAP?.configApiUrl || 'https://api.sensortattoofix.com.br').replace(/\/$/, '');
    const res = await fetch(base + '/config', { cache: 'no-store' });
    if (!res.ok) return;
    const cfg = await res.json();
    const intl = cfg.internationalShipping || {};
    while (sel.options.length > 1) sel.remove(1);
    Object.entries(intl)
      .filter(([code]) => code !== 'OTHER')
      .map(([code, z]) => ({ code, label: labelFor(code, z.label) }))
      .sort((a, b) => a.label.localeCompare(b.label, locale()))
      .forEach(({ code, label }) => {
        const o = document.createElement('option');
        o.value = code;
        o.textContent = label;
        sel.appendChild(o);
      });
    const other = document.createElement('option');
    other.value = 'OTHER';
    other.textContent = locale() === 'it' ? 'Altro paese' : 'Other country';
    sel.appendChild(other);
    if (!sel.value) {
      const def = locale() === 'it' ? 'IT' : 'US';
      if ([...sel.options].some((o) => o.value === def)) sel.value = def;
    }
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { fillCountries().catch(console.warn); });
  } else {
    fillCountries().catch(console.warn);
  }
  window.addEventListener('stf-config-ready', () => { fillCountries().catch(console.warn); });
})();
