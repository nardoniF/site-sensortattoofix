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

    if (apiUrl) {
      try {
        const res = await fetch(apiUrl.replace(/\/$/, '') + '/config', { cache: 'no-store' });
        if (res.ok) {
          const config = applyDerivedFields(await res.json());
          config._loaded = true;
          window.CHECKOUT_CONFIG = config;
          return config;
        }
      } catch (e) {
        console.warn('API indisponível, usando arquivo local.', e);
      }
    }

    const res = await fetch(FALLBACK_PATH + '?v=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) throw new Error('Não foi possível carregar a configuração da loja.');
    const config = applyDerivedFields(await res.json());
    config._loaded = true;
    window.CHECKOUT_CONFIG = config;
    return config;
  }

  return { load, resolveApiUrl, applyDerivedFields };
})();
