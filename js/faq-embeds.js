/** FAQ — YouTube, Instagram e TikTok; TikTok só carrega ao clicar (evita overload-protect). */
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

  function posterLabel(el) {
    var lang = (document.documentElement.lang || 'pt').slice(0, 2).toLowerCase();
    if (lang === 'en') return 'Watch video';
    if (lang === 'it') return 'Guarda il video';
    return 'Assistir vídeo';
  }

  function openLabel(el) {
    var lang = (document.documentElement.lang || 'pt').slice(0, 2).toLowerCase();
    if (lang === 'en') return 'Open on TikTok';
    if (lang === 'it') return 'Apri su TikTok';
    return 'Abrir no TikTok';
  }

  function unloadOtherTikToks(keep) {
    document.querySelectorAll('.faq-media-embed--tiktok.is-playing').forEach(function (box) {
      if (box === keep) return;
      var id = box.getAttribute('data-tiktok-id');
      var href = box.getAttribute('data-tiktok-href') || (id ? 'https://www.tiktok.com/video/' + id : '#');
      var title = box.getAttribute('data-tiktok-title') || 'TikTok';
      box.classList.remove('is-playing');
      box.innerHTML = '';
      box.appendChild(buildPoster(box, id, href, title));
      box.appendChild(buildFallback(href));
    });
  }

  function buildPoster(box, id, href, title) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'stf-tiktok-poster';
    btn.setAttribute('aria-label', posterLabel(box) + ' — ' + title);
    btn.innerHTML =
      '<span class="stf-tiktok-poster-play" aria-hidden="true">▶</span>' +
      '<span class="stf-tiktok-poster-label">' + posterLabel(box) + '</span>';
    btn.addEventListener('click', function () {
      loadTikTok(box, id, href, title);
    });
    return btn;
  }

  function buildFallback(href) {
    var a = document.createElement('a');
    a.className = 'stf-tiktok-fallback';
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = openLabel();
    return a;
  }

  function loadTikTok(box, id, href, title) {
    if (!id || box.classList.contains('is-playing')) return;
    unloadOtherTikToks(box);
    box.classList.add('is-playing');
    var iframe = document.createElement('iframe');
    iframe.src = 'https://www.tiktok.com/embed/v2/' + id + '?lang=pt-BR';
    iframe.title = title || 'TikTok';
    iframe.allow = 'fullscreen; encrypted-media; accelerometer; autoplay; clipboard-write; gyroscope; picture-in-picture';
    iframe.allowFullscreen = true;
    iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    box.innerHTML = '';
    box.appendChild(iframe);
    box.appendChild(buildFallback(href || ('https://www.tiktok.com/video/' + id)));
  }

  function hydrateTikTok(box) {
    if (box.dataset.tiktokReady === '1') return;
    var id = box.getAttribute('data-tiktok-id');
    if (!id) {
      var existing = box.querySelector('iframe[src*="tiktok.com/embed"]');
      if (existing) {
        var m = existing.src.match(/embed\/v2\/(\d+)/);
        if (m) id = m[1];
        var title = existing.getAttribute('title') || 'TikTok';
        box.setAttribute('data-tiktok-id', id);
        box.setAttribute('data-tiktok-title', title);
        if (!box.getAttribute('data-tiktok-href')) {
          box.setAttribute('data-tiktok-href', 'https://www.tiktok.com/video/' + id);
        }
      }
    }
    if (!id) return;
    var href = box.getAttribute('data-tiktok-href') || ('https://www.tiktok.com/video/' + id);
    var title = box.getAttribute('data-tiktok-title') || 'TikTok';
    box.dataset.tiktokReady = '1';
    box.innerHTML = '';
    box.appendChild(buildPoster(box, id, href, title));
    box.appendChild(buildFallback(href));
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

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
