/**
 * Tráfego Google (Ads ou referrer) que cair na loja/checkout → seção #onde-comprar na home.
 * Não redireciona retorno de pagamento (pedido, PayPal, Mercado Pago).
 * Incluir no <head> de index, loja e comprar (PT + EN).
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
      // Direct Buy / product deep-link — never hijack to #onde-comprar
      params.has('produto') ||
      params.has('comprar') ||
      params.has('cupom') ||
      params.has('coupon')
    );
  }

  if (isCheckoutResume()) return;

  var fromAds =
    params.has('gclid') ||
    params.has('gbraid') ||
    params.has('wbraid') ||
    params.has('gad_source') ||
    src === 'google' ||
    src === 'google_ads' ||
    src === 'adwords' ||
    med === 'cpc' ||
    med === 'ppc' ||
    med === 'paid' ||
    med === 'paidsearch';

  var fromGoogleReferrer = false;
  try {
    fromGoogleReferrer = /google\./i.test(document.referrer || '');
  } catch (e) { /* ignore */ }

  if (!fromAds && !fromGoogleReferrer) return;

  var path = window.location.pathname || '/';
  var langPrefix = '';
  var m = path.match(/^\/(en|it|de|es|pl|sl)(?=\/|$)/);
  if (m) langPrefix = '/' + m[1];
  var parts = path.replace(/\/+$/, '').split('/');
  var leaf = parts[parts.length - 1] || '';
  var isIndex = !leaf || leaf === 'index.html' || leaf === 'en' || leaf === 'it' || leaf === 'de' || leaf === 'es' || leaf === 'pl' || leaf === 'sl';
  var isStore = leaf === 'loja.html' || leaf === 'comprar.html' || leaf === 'onde-comprar.html';

  if (!isIndex && !isStore) return;
  if (isIndex && window.location.hash === '#onde-comprar') return;

  var target = langPrefix ? (langPrefix + '/') : '/';
  window.location.replace(target + window.location.search + '#onde-comprar');
})();
