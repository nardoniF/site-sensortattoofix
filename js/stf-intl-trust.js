/**
 * Slim trust bar for English pages — international shipping & secure payment.
 * Factual tone; no popups. Analytics: .site-trust-bar → faixa_compra
 */
(function () {
  if (!/\/en(\/|$)/i.test(location.pathname)) return;

  const EMAIL = 'contato@sensortattoofix.com.br';
  const WA = '5511913394665';
  const WA_MSG = encodeURIComponent('Hi — I have a question about international shipping to ');

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
          '<span class="site-trust-bar-item"><i class="fab fa-paypal" aria-hidden="true"></i> PayPal</span>' +
          '<span class="site-trust-bar-sep" aria-hidden="true">·</span>' +
          '<span class="site-trust-bar-item"><i class="fas fa-globe-americas" aria-hidden="true"></i> Tracked shipping · US &amp; EU</span>' +
          '<span class="site-trust-bar-sep" aria-hidden="true">·</span>' +
          '<span class="site-trust-bar-item"><i class="fas fa-certificate" aria-hidden="true"></i> Patented</span>' +
          '<span class="site-trust-bar-sep" aria-hidden="true">·</span>' +
          '<span class="site-trust-bar-item site-trust-bar-contact">' +
            'Questions: <a href="mailto:' + EMAIL + '">Email</a> · ' +
            '<a href="https://wa.me/' + WA + '?text=' + WA_MSG + '" target="_blank" rel="noopener" data-evento="clique_whatsapp" data-rotulo="Trust bar WhatsApp EN">WhatsApp</a>' +
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
