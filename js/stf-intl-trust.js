/**
 * Trust line for international storefront (.com and /en/ /it/).
 * One discreet line under the hero CTA — no email in the hero (support stays in Contato/checkout).
 */
(function () {
  function isIntlPage() {
    if (window.STF_SITE?.isIntlHost?.()) return true;
    if (/\.sensortattoofix\.com$/i.test(location.hostname)) return true;
    return /\/(en|it)(\/|$)/i.test(location.pathname);
  }
  if (!isIntlPage()) return;

  const isIt = /\/it(\/|$)/i.test(location.pathname)
    || (document.documentElement.lang || '').toLowerCase().startsWith('it');
  const copy = isIt
    ? { secure: 'Checkout sicuro', shipping: 'Spedizione tracciata', label: 'Checkout sicuro · Spedizione tracciata' }
    : { secure: 'Secure checkout', shipping: 'Tracked shipping', label: 'Secure checkout · Tracked shipping' };

  function injectTrustLine() {
    if (document.querySelector('.site-trust-inline, .site-trust-bar')) return;

    const heroText = document.querySelector('.hero-text');
    if (!heroText) return;

    const row = document.createElement('div');
    row.className = 'hero-trust-row site-trust-inline hero-trust-row--below-cta hero-trust-row--compact';
    row.setAttribute('role', 'note');
    row.setAttribute('aria-label', copy.label);

    const line = document.createElement('p');
    line.className = 'site-trust-inline-main';
    line.innerHTML =
      '<span class="site-trust-bar-item"><i class="fas fa-lock" aria-hidden="true"></i> ' + copy.secure + '</span>' +
      '<span class="site-trust-bar-sep" aria-hidden="true">·</span>' +
      '<span class="site-trust-bar-item"><i class="fas fa-truck" aria-hidden="true"></i> ' + copy.shipping + '</span>';
    row.appendChild(line);

    const btns = heroText.querySelector('.hero-btns');
    if (btns) {
      btns.insertAdjacentElement('afterend', row);
    } else {
      heroText.appendChild(row);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectTrustLine);
  } else {
    injectTrustLine();
  }
})();
