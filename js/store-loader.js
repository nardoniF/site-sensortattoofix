window.StoreConfig = (function () {
  const FALLBACK_PATH = '/data/store-config.json';

  function resolveApiUrl(config) {
    const bootstrap = window.CONFIG_BOOTSTRAP || {};
    return (config.api && config.api.baseUrl) || bootstrap.configApiUrl || '';
  }

  function applyDerivedFields(config) {
    return config;
  }

  async function load() {
    if (window.CHECKOUT_CONFIG && window.CHECKOUT_CONFIG._loaded) {
      return window.CHECKOUT_CONFIG;
    }

    const bootstrap = window.CONFIG_BOOTSTRAP || {};
    const apiUrl = bootstrap.configApiUrl;

    async function loadLocalConfig() {
      const res = await fetch(FALLBACK_PATH + '?v=' + Date.now(), { cache: 'no-store' });
      if (!res.ok) throw new Error('Não foi possível carregar a configuração local.');
      return applyDerivedFields(await res.json());
    }

    if (apiUrl) {
      try {
        const res = await fetch(apiUrl.replace(/\/$/, '') + '/config', { cache: 'no-store' });
        if (res.ok) {
          const config = applyDerivedFields(await res.json());
          try {
            const local = await loadLocalConfig();
            const apiModels = config.smartwatchModels || [];
            const localModels = local.smartwatchModels || [];
            if (!apiModels.length && localModels.length) {
              config.smartwatchModels = localModels;
            } else if (localModels.length) {
              const merged = [...apiModels];
              localModels.forEach((m) => { if (!merged.includes(m)) merged.push(m); });
              config.smartwatchModels = merged;
            }
            if (Object.keys(config.internationalShipping || {}).length < 4 && local.internationalShipping) {
              config.internationalShipping = { ...local.internationalShipping, ...config.internationalShipping };
            }
          } catch (e) {
            console.warn('Fallback local para modelos indisponível.', e);
          }
          config._loaded = true;
          window.CHECKOUT_CONFIG = config;
          return config;
        }
      } catch (e) {
        console.warn('API indisponível, usando arquivo local.', e);
      }
    }

    const config = await loadLocalConfig();
    config._loaded = true;
    window.CHECKOUT_CONFIG = config;
    return config;
  }

  return { load, resolveApiUrl, applyDerivedFields };
})();
