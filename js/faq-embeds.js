/** FAQ — Instagram; TikTok abre no app/site oficial (embed bloqueia com overload-protect). */
(function () {
  function processInstagram() {
    window.instgrm?.Embeds?.process();
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

  function refreshInstagram(root) {
    var scope = root || document;
    if (!hasInstagram(scope)) return Promise.resolve();
    return ensureScript('instagram-embed-js', 'https://www.instagram.com/embed.js').then(processInstagram);
  }

  function scheduleInstagram(root) {
    refreshInstagram(root);
    [400, 1200, 2500].forEach(function (ms) {
      setTimeout(function () { refreshInstagram(root); }, ms);
    });
  }

  function labelWatch() {
    var lang = (document.documentElement.lang || 'pt').slice(0, 2).toLowerCase();
    if (lang === 'en') return 'Watch on TikTok';
    if (lang === 'it') return 'Guarda su TikTok';
    return 'Assistir no TikTok';
  }

  function hydrateTikTok(box) {
    if (box.dataset.tiktokReady === '1') return;
    if (box.matches('a.stf-tiktok-card')) {
      box.dataset.tiktokReady = '1';
      return;
    }
    var id = box.getAttribute('data-tiktok-id');
    var href = box.getAttribute('data-tiktok-href') || (id ? 'https://www.tiktok.com/video/' + id : '');
    var title = box.getAttribute('data-tiktok-title') || 'TikTok';
    var handle = box.getAttribute('data-tiktok-handle') || '';
    if (!href) return;
    box.dataset.tiktokReady = '1';
    var a = document.createElement('a');
    a.className = 'stf-tiktok-card';
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.setAttribute('aria-label', labelWatch() + ' — ' + title);
    a.innerHTML =
      '<span class="stf-tiktok-poster-play" aria-hidden="true">▶</span>' +
      '<strong class="stf-tiktok-poster-label">' + labelWatch() + '</strong>' +
      (handle ? '<span class="stf-tiktok-poster-sub">' + handle + '</span>' : '');
    box.innerHTML = '';
    box.appendChild(a);
  }

  function initTikToks() {
    document.querySelectorAll('.faq-media-embed--tiktok').forEach(hydrateTikTok);
  }

  function init() {
    if (!document.querySelector('.faq-media-embed, .faq-instagram-embed')) return;
    initTikToks();
    scheduleInstagram(document);
    document.querySelectorAll('.faq-item').forEach(function (details) {
      details.addEventListener('toggle', function () {
        if (!details.open) return;
        if (details.querySelector('.faq-media-embed--instagram, .faq-instagram-embed')) {
          setTimeout(function () { scheduleInstagram(details); }, 80);
        }
      });
    });
  }

  window.STF_FAQ_EMBEDS = {
    refresh: function (root) {
      initTikToks();
      scheduleInstagram(root || document);
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
