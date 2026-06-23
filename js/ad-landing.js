/**
 * Tráfego pago (Google Ads) que cair na loja ou checkout → onde-comprar (marketplaces).
 * A home (site) não redireciona — URL final do Google pode ser o site normalmente.
 * Incluir no <head> de loja e comprar.
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

  if (leaf !== 'loja.html' && leaf !== 'comprar.html') return;

  var targetPath = (inEn ? '/en/onde-comprar.html' : '/onde-comprar.html') + window.location.search;
  if (window.location.pathname + window.location.search !== targetPath) {
    window.location.replace(targetPath);
  }
})();
