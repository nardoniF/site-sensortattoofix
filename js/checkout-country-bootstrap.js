/**
 * Preenche #pais-code a partir de /config — lista completa de países (ISO),
 * independente do checkout.js (evita cache stale no .com).
 * Default do país = idioma da página (IT→IT, FR→FR, SV→SE, …).
 */
(function () {
  const LANG_COUNTRY = {
    en: 'US', it: 'IT', de: 'DE', es: 'ES', pl: 'PL', sl: 'SI',
    fr: 'FR', nl: 'NL', sv: 'SE', no: 'NO', fi: 'FI'
  };

  function pageLang() {
    if (window.STF_PAGE_LANG?.get) return window.STF_PAGE_LANG.get();
    if (window.STF_I18N?.getLang) return window.STF_I18N.getLang();
    const lang = String(document.documentElement.lang || 'en').toLowerCase().slice(0, 2);
    return lang || 'en';
  }

  function locale() {
    const lang = pageLang();
    const map = {
      en: 'en', it: 'it', de: 'de', es: 'es', pl: 'pl', sl: 'sl',
      fr: 'fr', nl: 'nl', sv: 'sv', no: 'nb', fi: 'fi'
    };
    return map[lang] || 'en';
  }

  function defaultCountry() {
    return LANG_COUNTRY[pageLang()] || 'US';
  }

  function labelFor(code, fallback) {
    try {
      return new Intl.DisplayNames([locale()], { type: 'region' }).of(code) || fallback || code;
    } catch {
      return fallback || code;
    }
  }

  function otherCountryLabel() {
    const labels = {
      it: 'Altro paese', de: 'Anderes Land', es: 'Otro país', pl: 'Inny kraj',
      sl: 'Druga država', fr: 'Autre pays', nl: 'Ander land', sv: 'Annat land',
      no: 'Annet land', fi: 'Muu maa', en: 'Other country'
    };
    return labels[pageLang()] || labels.en;
  }

  async function fillCountries() {
    const sel = document.getElementById('pais-code');
    if (!sel || sel.options.length > 1) return;
    const base = String(window.CONFIG_BOOTSTRAP?.configApiUrl || 'https://api.sensortattoofix.com.br').replace(/\/$/, '');
    const res = await fetch(base + '/config', { cache: 'no-store' });
    if (!res.ok) return;
    const cfg = await res.json();
    const intl = cfg.internationalShipping || {};
    const fromApi = Array.isArray(cfg.internationalCountries) ? cfg.internationalCountries : null;
    while (sel.options.length > 1) sel.remove(1);
    const entries = fromApi && fromApi.length
      ? fromApi.map((row) => ({
        code: String(row.code || '').toUpperCase(),
        label: labelFor(row.code, row.label || intl[row.code]?.label)
      }))
      : Object.entries(intl)
        .filter(([code]) => code !== 'OTHER')
        .map(([code, z]) => ({ code, label: labelFor(code, z.label) }));
    entries
      .filter((e) => e.code && e.code !== 'BR' && e.code !== 'OTHER')
      .sort((a, b) => a.label.localeCompare(b.label, locale()))
      .forEach(({ code, label }) => {
        const o = document.createElement('option');
        o.value = code;
        o.textContent = label;
        sel.appendChild(o);
      });
    const other = document.createElement('option');
    other.value = 'OTHER';
    other.textContent = otherCountryLabel();
    sel.appendChild(other);
    if (!sel.value) {
      const def = defaultCountry();
      if ([...sel.options].some((o) => o.value === def)) sel.value = def;
    }
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { fillCountries().catch(console.warn); });
  } else {
    fillCountries().catch(console.warn);
  }
})();
