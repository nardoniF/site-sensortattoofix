/**
 * Trust bar for international storefront (.com and /en/ /it/ paths).
 * Factual tone; no popups. Analytics: .site-trust-bar → faixa_compra
 */
(function () {
  function isIntlPage() {
    if (window.STF_SITE?.isIntlHost?.()) return true;
    if (/\.sensortattoofix\.com$/i.test(location.hostname)) return true;
    return /\/(en|it)(\/|$)/i.test(location.pathname);
  }
  if (!isIntlPage()) return;

  const EMAIL = window.STF_SITE?.supportEmail?.() || 'support@sensortattoofix.com';

  function injectTrustBar() {
    const header = document.querySelector('header');
    if (!header || document.querySelector('.site-trust-bar')) return;

    const aside = document.createElement('aside');
    aside.className = 'site-trust-bar';
    aside.setAttribute('role', 'note');
    aside.setAttribute('aria-label', 'International orders — secure payment and shipping');
    aside.innerHTML =
      '<div class="container site-trust-bar-inner">' +
        '<p class="site-trust-bar-main site-trust-bar-compact">' +
          '<span class="site-trust-bar-item"><i class="fas fa-lock" aria-hidden="true"></i> SSL secure checkout</span>' +
          '<span class="site-trust-bar-sep" aria-hidden="true">·</span>' +
          '<span class="site-trust-bar-item"><i class="fab fa-paypal" aria-hidden="true"></i> PayPal</span>' +
          '<span class="site-trust-bar-sep" aria-hidden="true">·</span>' +
          '<span class="site-trust-bar-item"><i class="fab fa-stripe" aria-hidden="true"></i> Stripe</span>' +
          '<span class="site-trust-bar-sep" aria-hidden="true">·</span>' +
          '<span class="site-trust-bar-item"><i class="fas fa-globe-americas" aria-hidden="true"></i> Tracked shipping · US &amp; EU</span>' +
          '<span class="site-trust-bar-sep" aria-hidden="true">·</span>' +
          '<span class="site-trust-bar-item"><i class="fas fa-certificate" aria-hidden="true"></i> Patented 3N20</span>' +
          '<span class="site-trust-bar-sep" aria-hidden="true">·</span>' +
          '<span class="site-trust-bar-item site-trust-bar-contact">' +
            'Questions: <a href="mailto:' + EMAIL + '">Email</a>' +
          '</span>' +
        '</p>' +
      '</div>';

    header.insertAdjacentElement('afterend', aside);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectTrustBar);
  } else {
    injectTrustBar();
  }
})();
