/**
 * Renderiza FAQ e elogios da home a partir de store-config (PT / EN / IT).
 */
(function () {
  function pageLang() {
    const lang = (document.documentElement.lang || 'pt').slice(0, 2).toLowerCase();
    if (lang === 'it' || /\/it\//i.test(location.pathname)) return 'it';
    if (lang === 'en' || /\/en\//i.test(location.pathname)) return 'en';
    return 'pt';
  }

  function pick(row, base, lang) {
    if (lang === 'en') return row[base + 'En'] || row[base] || '';
    if (lang === 'it') return row[base + 'It'] || row[base + 'En'] || row[base] || '';
    return row[base] || '';
  }

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function stars(rating) {
    const n = Math.max(1, Math.min(5, Math.round(Number(rating) || 5)));
    return '★'.repeat(n) + (n < 5 ? '☆'.repeat(5 - n) : '');
  }

  function renderMedia(media) {
    if (!media || !media.type) return '';
    if (media.type === 'instagram' && media.instagramPermalink) {
      return `<div class="faq-media-embed faq-media-embed--instagram">
        <blockquote class="instagram-media" data-instgrm-permalink="${escapeHtml(media.instagramPermalink)}" data-instgrm-version="14"></blockquote>
      </div>`;
    }
    if (media.type === 'tiktok' && (media.tiktokHref || media.tiktokId)) {
      return `<div class="faq-media-embed faq-media-embed--tiktok"
        data-tiktok-id="${escapeHtml(media.tiktokId || '')}"
        data-tiktok-href="${escapeHtml(media.tiktokHref || '')}"
        data-tiktok-handle="${escapeHtml(media.tiktokHandle || '')}"
        data-tiktok-title="${escapeHtml(media.tiktokTitle || '')}"></div>`;
    }
    return '';
  }

  function renderFaq(items, lang) {
    const root = document.getElementById('home-faq-root');
    if (!root) return;
    const rows = (items || [])
      .filter((r) => r && r.active !== false)
      .slice()
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    root.innerHTML = rows.map((row) => {
      const q = pick(row, 'question', lang);
      const a = pick(row, 'answer', lang);
      if (!q) return '';
      return `<details class="faq-item">
        <summary>${q}</summary>
        ${a ? `<p>${a}</p>` : ''}
        ${renderMedia(row.media)}
      </details>`;
    }).join('');
  }

  function renderReviews(items, lang) {
    const grid = document.getElementById('home-reviews-root');
    const section = document.getElementById('avaliacoes');
    if (!grid || !section) return;
    const rows = (items || [])
      .filter((r) => r && r.active !== false)
      .slice()
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    section.setAttribute('data-review-count', String(rows.length));
    const avg = rows.length
      ? rows.reduce((s, r) => s + (Number(r.rating) || 5), 0) / rows.length
      : 5;
    section.setAttribute('data-aggregate-rating', String(Math.round(avg * 10) / 10));
    grid.innerHTML = rows.map((row) => {
      const body = pick(row, 'body', lang);
      const author = pick(row, 'author', lang);
      const source = pick(row, 'source', lang);
      const rating = Number(row.rating) || 5;
      if (!body) return '';
      return `<article class="review-card review-quote" data-review-rating="${rating}">
        <div class="review-stars" aria-hidden="true">${stars(rating)}</div>
        <blockquote>
          <p class="review-body" data-review-body>${body}</p>
          <cite class="review-author">
            <span class="review-sign-name" data-review-author>${escapeHtml(author)}</span>
            <span class="review-sign-source review-source">${escapeHtml(source)}</span>
          </cite>
        </blockquote>
      </article>`;
    }).join('');
  }

  function resolveConfig() {
    if (window.CHECKOUT_CONFIG?.homeFaq || window.CHECKOUT_CONFIG?.homeReviews) {
      return window.CHECKOUT_CONFIG;
    }
    return null;
  }

  async function loadConfig() {
    const fromStore = resolveConfig();
    if (fromStore) return fromStore;
    try {
      const res = await fetch('/data/store-config.json?v=' + Date.now(), { cache: 'no-store' });
      if (res.ok) return res.json();
    } catch (e) {
      console.warn('home-content: falha ao carregar store-config', e);
    }
    return { homeFaq: [], homeReviews: [] };
  }

  async function init() {
    const root = document.getElementById('home-faq-root');
    const reviews = document.getElementById('home-reviews-root');
    if (!root && !reviews) return;
    const cfg = await loadConfig();
    const lang = pageLang();
    renderFaq(cfg.homeFaq, lang);
    renderReviews(cfg.homeReviews, lang);
    if (typeof window.STF_FAQ_EMBEDS?.refresh === 'function') {
      window.STF_FAQ_EMBEDS.refresh(document.getElementById('faq') || document);
    }
    document.dispatchEvent(new CustomEvent('stf-home-content-ready', { detail: { lang, config: cfg } }));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  document.addEventListener('stf-config-ready', () => {
    const cfg = resolveConfig();
    if (!cfg) return;
    const lang = pageLang();
    renderFaq(cfg.homeFaq, lang);
    renderReviews(cfg.homeReviews, lang);
    if (typeof window.STF_FAQ_EMBEDS?.refresh === 'function') {
      window.STF_FAQ_EMBEDS.refresh(document.getElementById('faq') || document);
    }
    document.dispatchEvent(new CustomEvent('stf-home-content-ready', { detail: { lang, config: cfg } }));
  });
})();
