/** FAQ — YouTube, Instagram e TikTok; reprocessa ao abrir <details>. */
(function () {
  function processInstagram() {
    window.instgrm?.Embeds?.process();
  }

  function processTikTok() {
    if (window.tiktok?.Embed?.lib?.render) {
      window.tiktok.Embed.lib.render();
      return;
    }
    if (window.tiktokEmbed?.lib?.render) {
      window.tiktokEmbed.lib.render();
    }
  }

  function ensureScript(id, src) {
    if (document.getElementById(id)) return Promise.resolve();
    return new Promise(function (resolve) {
      var s = document.createElement('script');
      s.id = id;
      s.async = true;
      s.src = src;
      s.onload = resolve;
      document.body.appendChild(s);
    });
  }

  function hasInstagram(root) {
    return root.querySelector('.faq-media-embed--instagram, .faq-instagram-embed');
  }

  function hasTikTok(root) {
    return root.querySelector('.faq-media-embed--tiktok');
  }

  function refresh(root) {
    var scope = root || document;
    var jobs = [];
    if (hasInstagram(scope)) {
      jobs.push(ensureScript('instagram-embed-js', 'https://www.instagram.com/embed.js').then(processInstagram));
    }
    if (hasTikTok(scope)) {
      jobs.push(ensureScript('tiktok-embed-js', 'https://www.tiktok.com/embed.js').then(processTikTok));
    }
    return Promise.all(jobs);
  }

  function scheduleRefresh(root) {
    refresh(root);
    [400, 1200, 2500].forEach(function (ms) {
      setTimeout(function () { refresh(root); }, ms);
    });
  }

  function init() {
    if (!document.querySelector('.faq-media-embed, .faq-instagram-embed')) return;
    scheduleRefresh(document);
    document.querySelectorAll('.faq-item').forEach(function (details) {
      details.addEventListener('toggle', function () {
        if (!details.open) return;
        if (details.querySelector('.faq-media-embed, .faq-instagram-embed')) {
          setTimeout(function () { scheduleRefresh(details); }, 80);
        }
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
