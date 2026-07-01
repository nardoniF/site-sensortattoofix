/** EN/IT: oculta avaliações ligadas a marketplaces BR (conteúdo permanece no HTML PT). */
(function () {
  var lang = (document.documentElement.lang || '').toLowerCase();
  if (!lang.startsWith('en') && !lang.startsWith('it')) return;

  function hideEl(el) {
    if (!el) return;
    el.hidden = true;
    el.setAttribute('aria-hidden', 'true');
  }

  function apply() {
    document.querySelectorAll('[data-br-review]').forEach(hideEl);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply);
  } else {
    apply();
  }
})();
