/**
 * Aplica canais (redes + lojas) do store-config: esconde/mostra sem buracos no layout.
 * Depende de StoreConfig (stf-config-ready) quando disponível.
 */
window.STF_CHANNELS = (function () {
  const DEFAULTS = {
    socials: {
      instagram: true,
      tiktok: true,
      youtube: true,
      facebook: true
    },
    stores: {
      oficial: true,
      mercadolivre: true,
      shopee: true,
      tiktok_shop: true,
      amazon: true
    }
  };

  function entryEnabled(group, id, channels) {
    const entry = channels?.[group]?.[id];
    if (entry && typeof entry.enabled === 'boolean') return entry.enabled;
    return DEFAULTS[group]?.[id] !== false;
  }

  function setVisible(el, on) {
    if (!el) return;
    el.hidden = !on;
    if (on) el.removeAttribute('hidden');
    else el.setAttribute('hidden', '');
  }

  function applyChannels(channels) {
    document.querySelectorAll('[data-channel]').forEach((el) => {
      const raw = String(el.getAttribute('data-channel') || '');
      const [group, id] = raw.split(':');
      if (!group || !id) return;
      const mapGroup = group === 'social' ? 'socials' : group === 'store' ? 'stores' : group;
      const on = entryEnabled(mapGroup, id, channels);
      setVisible(el, on);
      const url = channels?.[mapGroup]?.[id]?.url;
      if (on && url) {
        const links = el.tagName === 'A' ? [el] : [...el.querySelectorAll(':scope > a[href]')];
        links.forEach((link) => {
          try {
            const next = new URL(url, location.href);
            const cur = new URL(link.href, location.href);
            // Sempre aplica a URL do Admin; preserva utm_* já no link da página.
            const utm = cur.searchParams;
            utm.forEach((v, k) => {
              if (k.startsWith('utm_') && !next.searchParams.has(k)) next.searchParams.set(k, v);
            });
            link.href = next.toString();
          } catch (_) { /* keep existing href */ }
        });
      }
    });

    document.querySelectorAll('[data-channel-group="marketplaces"]').forEach((groupEl) => {
      const scope = groupEl.closest('.stores-layout, .onde-comprar-content, section, main, aside') || document;
      const storeEls = scope.querySelectorAll('[data-channel^="store:"]');
      const anyStore = [...storeEls].some((el) => {
        const id = String(el.getAttribute('data-channel') || '').split(':')[1];
        return id && id !== 'oficial' && entryEnabled('stores', id, channels);
      });
      setVisible(groupEl, anyStore);
    });

    document.querySelectorAll('.site-social, .social-header').forEach((ul) => {
      const items = ul.querySelectorAll(':scope > li');
      const any = [...items].some((li) => !li.hidden);
      setVisible(ul, any);
    });

    document.querySelectorAll('.loja-marketplaces').forEach((aside) => {
      const badges = aside.querySelectorAll('[data-channel^="store:"]');
      const any = [...badges].some((el) => !el.hidden);
      setVisible(aside, any);
    });

    patchSeoSameAs(channels);
  }

  function patchSeoSameAs(channels) {
    const script = document.getElementById('stf-seo-schema');
    if (!script) return;
    try {
      const data = JSON.parse(script.textContent);
      const org = (data['@graph'] || []).find((n) => n['@type'] === 'Organization');
      if (!org) return;
      const socials = channels?.socials || {};
      const urls = [];
      ['instagram', 'tiktok', 'youtube', 'facebook'].forEach((id) => {
        if (!entryEnabled('socials', id, channels)) return;
        const url = socials[id]?.url;
        if (url) urls.push(url);
      });
      if (urls.length) org.sameAs = urls;
      else delete org.sameAs;
      script.textContent = JSON.stringify(data);
    } catch (_) { /* ignore */ }
  }

  async function boot() {
    let channels = null;
    try {
      if (window.CHECKOUT_CONFIG?.channels) {
        channels = window.CHECKOUT_CONFIG.channels;
      } else if (window.StoreConfig?.load) {
        const cfg = await window.StoreConfig.load();
        channels = cfg?.channels || null;
      }
    } catch (_) {
      channels = null;
    }
    applyChannels(channels);
  }

  function onReady(cfg) {
    applyChannels(cfg?.channels || cfg?.detail?.channels || null);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { boot(); });
  } else {
    boot();
  }
  window.addEventListener('stf-config-ready', (ev) => onReady(ev.detail));

  return { applyChannels, entryEnabled, DEFAULTS };
})();
