/**
 * Slim trust bar for international storefront (.com and /en/ /it/).
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
    aside.setAttribute('aria-label', 'Secure checkout and tracked shipping');
    aside.innerHTML =
      '<div class="container site-trust-bar-inner">' +
        '<p class="site-trust-bar-main site-trust-bar-compact">' +
          '<span class="site-trust-bar-item"><i class="fas fa-lock" aria-hidden="true"></i> Secure checkout</span>' +
          '<span class="site-trust-bar-sep" aria-hidden="true">·</span>' +
          '<span class="site-trust-bar-item"><i class="fas fa-truck" aria-hidden="true"></i> Tracked shipping</span>' +
          '<span class="site-trust-bar-sep" aria-hidden="true">·</span>' +
          '<span class="site-trust-bar-item site-trust-bar-contact">' +
            '<a href="mailto:' + EMAIL + '">' + EMAIL + '</a>' +
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
