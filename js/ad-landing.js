/**
 * Tráfego pago (Google Ads) → marketplaces, não loja/checkout.
 * Incluir no <head> de index, loja e comprar.
 */
(function () {
  var params = new URLSearchParams(window.location.search || '');
  var src = (params.get('utm_source') || '').toLowerCase();
  var med = (params.get('utm_medium') || '').toLowerCase();

  var fromAds =
    params.has('gclid') ||
    params.has('gbraid') ||
    params.has('wbraid') ||
    src === 'google' ||
    src === 'google_ads' ||
    src === 'adwords' ||
    med === 'cpc' ||
    med === 'ppc' ||
    med === 'paid' ||
    med === 'paidsearch';

  if (!fromAds) return;

  var path = window.location.pathname || '/';
  var inEn = /\/en\//.test(path);
  var parts = path.replace(/\/+$/, '').split('/');
  var leaf = parts[parts.length - 1] || '';

  if (leaf === 'onde-comprar.html') return;

  var isHome = !leaf || leaf === 'index.html';
  var isStore = leaf === 'loja.html' || leaf === 'comprar.html';

  if (!isHome && !isStore) return;

  var targetPath = (inEn ? '/en/onde-comprar.html' : '/onde-comprar.html') + window.location.search;
  if (window.location.pathname + window.location.search !== targetPath) {
    window.location.replace(targetPath);
  }
})();
