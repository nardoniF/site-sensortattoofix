/** Embeds do Instagram no FAQ — reprocessa ao abrir <details>. */
(function () {
  function processEmbeds() {
    window.instgrm?.Embeds?.process();
  }

  function ensureScript() {
    if (document.getElementById('instagram-embed-js')) return Promise.resolve();
    return new Promise(function (resolve) {
      var s = document.createElement('script');
      s.id = 'instagram-embed-js';
      s.async = true;
      s.src = 'https://www.instagram.com/embed.js';
      s.onload = resolve;
      document.body.appendChild(s);
    });
  }

  function refresh() {
    processEmbeds();
    setTimeout(processEmbeds, 400);
    setTimeout(processEmbeds, 1500);
  }

  function init() {
    if (!document.querySelector('.faq-instagram-embed')) return;
    ensureScript().then(refresh);
    document.querySelectorAll('.faq-item').forEach(function (details) {
      details.addEventListener('toggle', function () {
        if (details.open && details.querySelector('.faq-instagram-embed')) {
          ensureScript().then(function () { setTimeout(refresh, 80); });
        }
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
