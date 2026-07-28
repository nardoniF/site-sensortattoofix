/**
 * Trust line for international storefront (.com and /en/ /it/).
 * One horizontal line beside the hero "3N20 Technology • Patented" badge —
 * never a top bar (that pushed Discover / Where to Buy off the first screen).
 */
(function () {
  function isIntlPage() {
    if (window.STF_SITE?.isIntlHost?.()) return true;
    if (/\.sensortattoofix\.com$/i.test(location.hostname)) return true;
    return /\/(en|it)(\/|$)/i.test(location.pathname);
  }
  if (!isIntlPage()) return;

  const EMAIL = window.STF_SITE?.supportEmail?.() || 'support@sensortattoofix.com';
  const isIt = /\/it(\/|$)/i.test(location.pathname)
    || (document.documentElement.lang || '').toLowerCase().startsWith('it');
  const copy = isIt
    ? { secure: 'Checkout sicuro', shipping: 'Spedizione tracciata', label: 'Checkout sicuro e spedizione tracciata' }
    : { secure: 'Secure checkout', shipping: 'Tracked shipping', label: 'Secure checkout and tracked shipping' };

  function injectTrustLine() {
    if (document.querySelector('.site-trust-inline, .site-trust-bar')) return;

    const badge = document.querySelector('.hero-text > .badge, .hero-text .badge');
    if (!badge || !badge.parentElement) return;

    const row = document.createElement('div');
    row.className = 'hero-trust-row site-trust-inline';
    row.setAttribute('role', 'note');
    row.setAttribute('aria-label', copy.label);

    badge.replaceWith(row);
    row.appendChild(badge);

    const line = document.createElement('p');
    line.className = 'site-trust-inline-main';
    line.innerHTML =
      '<span class="site-trust-bar-item"><i class="fas fa-lock" aria-hidden="true"></i> ' + copy.secure + '</span>' +
      '<span class="site-trust-bar-sep" aria-hidden="true">·</span>' +
      '<span class="site-trust-bar-item"><i class="fas fa-truck" aria-hidden="true"></i> ' + copy.shipping + '</span>' +
      '<span class="site-trust-bar-sep" aria-hidden="true">·</span>' +
      '<span class="site-trust-bar-item site-trust-bar-contact">' +
        '<a href="mailto:' + EMAIL + '">' + EMAIL + '</a>' +
      '</span>';
    row.appendChild(line);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectTrustLine);
  } else {
    injectTrustLine();
  }
})();
