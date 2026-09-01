/**
 * Renderiza FAQ e elogios da home a partir de store-config (PT / EN / IT / DE / ES / PL).
 */
(function () {
  let l10nCache = null;

  function pageLang() {
    if (window.STF_PAGE_LANG?.get) return window.STF_PAGE_LANG.get();
    if (window.STF_I18N?.getLang) return window.STF_I18N.getLang();
    const lang = (document.documentElement.lang || 'pt').slice(0, 2).toLowerCase();
    if (['pt', 'en', 'it', 'de', 'es', 'pl'].includes(lang)) return lang;
    return 'pt';
  }

  function pick(row, base, lang) {
    const suffixMap = { en: 'En', it: 'It', de: 'De', es: 'Es', pl: 'Pl' };
    const suffix = suffixMap[lang];
    if (suffix) {
      const localized = row[base + suffix];
      if (localized) return localized;
      if (lang === 'it') return row[base + 'En'] || row[base] || '';
      if (lang === 'de' || lang === 'es' || lang === 'pl') return row[base + 'En'] || '';
    }
    return row[base] || '';
  }

  function pickL10n(kind, id, field, lang) {
    if (!l10nCache || !['de', 'es', 'pl'].includes(lang)) return '';
    const bucket = l10nCache[lang]?.[kind]?.[id];
    return bucket?.[field] || '';
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
      const q = pickL10n('faq', row.id, 'question', lang) || pick(row, 'question', lang);
      const a = pickL10n('faq', row.id, 'answer', lang) || pick(row, 'answer', lang);
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

    const summaryEl = section.querySelector('.reviews-summary');
    if (summaryEl && l10nCache?.[lang]?.reviewsSummary) {
      summaryEl.innerHTML = `<i class="fas fa-star" aria-hidden="true"></i> ${l10nCache[lang].reviewsSummary}`;
    }

    grid.innerHTML = rows.map((row) => {
      const body = pickL10n('reviews', row.id, 'body', lang) || pick(row, 'body', lang);
      const author = pickL10n('reviews', row.id, 'author', lang) || pick(row, 'author', lang);
      const source = pickL10n('reviews', row.id, 'source', lang) || pick(row, 'source', lang);
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

  async function loadL10n() {
    if (l10nCache) return l10nCache;
    try {
      const res = await fetch('/data/home-content-l10n.json?v=1', { cache: 'no-store' });
      if (res.ok) l10nCache = await res.json();
    } catch (e) {
      console.warn('home-content: falha ao carregar l10n', e);
    }
    l10nCache = l10nCache || {};
    return l10nCache;
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

  async function renderAll() {
    const root = document.getElementById('home-faq-root');
    const reviews = document.getElementById('home-reviews-root');
    if (!root && !reviews) return;
    const lang = pageLang();
    if (['de', 'es', 'pl'].includes(lang)) await loadL10n();
    const cfg = await loadConfig();
    renderFaq(cfg.homeFaq, lang);
    renderReviews(cfg.homeReviews, lang);
    if (typeof window.STF_FAQ_EMBEDS?.refresh === 'function') {
      window.STF_FAQ_EMBEDS.refresh(document.getElementById('faq') || document);
    }
    document.dispatchEvent(new CustomEvent('stf-home-content-ready', { detail: { lang, config: cfg } }));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderAll);
  } else {
    renderAll();
  }

  document.addEventListener('stf-config-ready', renderAll);
})();
