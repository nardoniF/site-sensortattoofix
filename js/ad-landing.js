/**
 * Tráfego pago → página Onde comprar (loja + ML + Shopee + Amazon + …).
 * Meta/IG (fbclid, utm_source=ig, medium=paid): vai para onde-comprar.html
 * (página só de escolha — mais confiável que scroll na home no app do IG).
 * Google Ads: home #onde-comprar (comportamento anterior).
 * Não redireciona retorno de pagamento / deep-link de produto.
 */
(function () {
  var params = new URLSearchParams(window.location.search || '');
  var src = (params.get('utm_source') || '').toLowerCase();
  var med = (params.get('utm_medium') || '').toLowerCase();

  function isCheckoutResume() {
    return (
      params.has('pedido') ||
      params.has('token') ||
      params.has('paypal') ||
      params.has('mp') ||
      params.has('orderId') ||
      params.has('accessToken') ||
      params.has('collection_id') ||
      params.has('payment_id') ||
      params.has('external_reference') ||
      params.has('collection_status') ||
      params.has('status') ||
      params.has('produto') ||
      params.has('comprar') ||
      params.has('cupom') ||
      params.has('coupon')
    );
  }

  if (isCheckoutResume()) return;

  var fromMeta =
    params.has('fbclid') ||
    src === 'ig' ||
    src === 'instagram' ||
    src === 'facebook' ||
    src === 'fb' ||
    src === 'meta' ||
    src === 'an' ||
    (med === 'paid' && (src === 'ig' || src === 'instagram' || src === 'facebook' || src === 'fb' || src === 'meta' || src === ''));

  var fromGoogleAds =
    params.has('gclid') ||
    params.has('gbraid') ||
    params.has('wbraid') ||
    params.has('gad_source') ||
    src === 'google' ||
    src === 'google_ads' ||
    src === 'adwords' ||
    med === 'cpc' ||
    med === 'ppc' ||
    med === 'paidsearch';

  var fromGoogleReferrer = false;
  try {
    fromGoogleReferrer = /google\./i.test(document.referrer || '');
  } catch (e) { /* ignore */ }

  if (!fromMeta && !fromGoogleAds && !fromGoogleReferrer) return;

  var path = window.location.pathname || '/';
  var langPrefix = '';
  var m = path.match(/^\/(en|it|de|es|pl|sl|fr|nl|sv|no|fi)(?=\/|$)/);
  if (m) langPrefix = '/' + m[1];
  var parts = path.replace(/\/+$/, '').split('/');
  var leaf = parts[parts.length - 1] || '';
  var isIndex = !leaf || leaf === 'index.html' || leaf === 'en' || leaf === 'it' || leaf === 'de' || leaf === 'es' || leaf === 'pl' || leaf === 'sl' || leaf === 'fr' || leaf === 'nl' || leaf === 'sv' || leaf === 'no' || leaf === 'fi';
  var isOndeComprar = leaf === 'onde-comprar.html';
  var isStore = leaf === 'loja.html' || leaf === 'comprar.html';

  // Já está na página de escolha — não puxar de volta para a home.
  if (isOndeComprar) return;

  if (!isIndex && !isStore) return;

  var search = window.location.search || '';

  // Meta / Instagram pago → página dedicada (loja + marketplaces).
  if (fromMeta && !fromGoogleAds) {
    var dest = (langPrefix ? langPrefix + '/' : '/') + 'onde-comprar.html';
    window.location.replace(dest + search);
    return;
  }

  // Google: âncora na home (como antes).
  if (isIndex && window.location.hash === '#onde-comprar') return;
  var home = langPrefix ? (langPrefix + '/') : '/';
  window.location.replace(home + search + '#onde-comprar');
})();
