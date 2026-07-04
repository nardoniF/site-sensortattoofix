/** Embeds do Instagram no FAQ — compactos (~50%) e sem legenda. */
(function () {
  var SCALE = 0.5;

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

  function fitCompact(box) {
    var inner = box.querySelector('.faq-instagram-embed-scale');
    if (!inner) return;
    var iframe = inner.querySelector('iframe');
    var target = iframe || inner.querySelector('.instagram-media');
    if (!target) return;
    var w = target.offsetWidth || 326;
    var h = target.offsetHeight || 480;
    inner.style.width = Math.round(w * SCALE) + 'px';
    inner.style.height = Math.round(h * SCALE) + 'px';
    target.style.width = w + 'px';
    target.style.maxWidth = w + 'px';
    target.style.transform = 'scale(' + SCALE + ')';
    target.style.transformOrigin = 'top left';
  }

  function wrapForCompact(box) {
    if (box.dataset.compactWrapped) return;
    box.dataset.compactWrapped = '1';
    var inner = document.createElement('div');
    inner.className = 'faq-instagram-embed-scale';
    while (box.firstChild) inner.appendChild(box.firstChild);
    box.appendChild(inner);
  }

  function compactAll() {
    document.querySelectorAll('.faq-instagram-embed').forEach(function (box) {
      wrapForCompact(box);
      fitCompact(box);
    });
  }

  function scheduleCompact() {
    compactAll();
    [200, 600, 1500, 3000].forEach(function (ms) {
      setTimeout(compactAll, ms);
    });
  }

  function init() {
    if (!document.querySelector('.faq-instagram-embed')) return;
    document.querySelectorAll('.faq-instagram-embed').forEach(wrapForCompact);
    ensureScript().then(function () {
      processEmbeds();
      scheduleCompact();
    });
    document.querySelectorAll('.faq-item').forEach(function (details) {
      details.addEventListener('toggle', function () {
        if (details.open && details.querySelector('.faq-instagram-embed')) {
          ensureScript().then(function () {
            setTimeout(function () {
              processEmbeds();
              scheduleCompact();
            }, 100);
          });
        }
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
