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
        '<div class="site-trust-bar-main">' +
          '<span class="site-trust-bar-item"><i class="fab fa-paypal" aria-hidden="true"></i> Secure checkout via PayPal</span>' +
          '<span class="site-trust-bar-sep" aria-hidden="true">·</span>' +
          '<span class="site-trust-bar-item"><i class="fas fa-globe-americas" aria-hidden="true"></i> Tracked shipping to the US, UK, EU &amp; more</span>' +
          '<span class="site-trust-bar-sep" aria-hidden="true">·</span>' +
          '<span class="site-trust-bar-item"><i class="fas fa-building" aria-hidden="true"></i> Official store · 3N20 · patented technology</span>' +
        '</div>' +
        '<p class="site-trust-bar-sub">' +
          'We have shipped real orders to Portugal, Italy, France, Germany, the United States and other countries. ' +
          'Questions before you buy? ' +
          '<a href="mailto:' + EMAIL + '">' + EMAIL + '</a> ' +
          'or ' +
          '<a href="https://wa.me/' + WA + '?text=' + WA_MSG + '" target="_blank" rel="noopener" data-evento="clique_whatsapp" data-rotulo="Trust bar WhatsApp EN">WhatsApp</a> — we reply in English.' +
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
