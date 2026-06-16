window.StoreConfig = (function () {
  const FALLBACK_PATH = '/data/store-config.json';

  const PIX_FALLBACK = {
    key: '29321223000132',
    keyType: 'cnpj',
    merchantName: '3N20 SOLUCOES TEC',
    merchantCity: 'SAO PAULO'
  };

  function isPixConfigValid(pix) {
    if (!pix) return false;
    const key = String(pix.key || '').trim();
    if (!key) return false;
    const type = pix.keyType || 'cnpj';
    const digits = key.replace(/\D/g, '');
    if (key.includes('@')) return type === 'email';
    if (type === 'cnpj') return digits.length === 14;
    if (type === 'cpf') return digits.length === 11;
    if (type === 'phone') return digits.length >= 10;
    if (type === 'email') return key.includes('@');
    return true;
  }

  function resolvePixConfig(pix, fallback) {
    const fb = fallback || PIX_FALLBACK;
    const merged = {
      key: String(pix?.key || '').trim() || fb.key,
      keyType: pix?.keyType || fb.keyType,
      merchantName: String(pix?.merchantName || '').trim() || fb.merchantName,
      merchantCity: String(pix?.merchantCity || '').trim() || fb.merchantCity
    };
    return isPixConfigValid(merged) ? merged : { ...fb };
  }

  function resolveApiUrl(config) {
    const bootstrap = window.CONFIG_BOOTSTRAP || {};
    return (config.api && config.api.baseUrl) || bootstrap.configApiUrl || '';
  }

  function applyDerivedFields(config, localFallback) {
    const pixFb = localFallback?.pix || PIX_FALLBACK;
    return {
      ...config,
      pix: resolvePixConfig(config.pix, pixFb)
    };
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
      const raw = await res.json();
      return applyDerivedFields(raw, raw);
    }

    if (apiUrl) {
      try {
        const res = await fetch(apiUrl.replace(/\/$/, '') + '/config', { cache: 'no-store' });
        if (res.ok) {
          const apiConfig = await res.json();
          let local = null;
          try {
            local = await loadLocalConfig();
          } catch (e) {
            console.warn('Cadastro local indisponível para fallback.', e);
          }
          let merged = local && window.STF_PRODUCT_MERGE
            ? window.STF_PRODUCT_MERGE.mergeConfig(apiConfig, local)
            : { ...apiConfig };
          const config = applyDerivedFields(
            {
              ...merged,
              ...(local ? {
                internationalShipping: Object.keys(apiConfig.internationalShipping || {}).length < 4 && local.internationalShipping
                  ? { ...local.internationalShipping, ...apiConfig.internationalShipping }
                  : apiConfig.internationalShipping,
                internationalProduct: local.internationalProduct
                  ? { ...local.internationalProduct, ...apiConfig.internationalProduct }
                  : apiConfig.internationalProduct,
                internationalSurcharge: apiConfig.internationalSurcharge ?? local.internationalSurcharge,
                shippingMethods: apiConfig.shippingMethods?.length
                  ? apiConfig.shippingMethods
                  : local.shippingMethods,
                payments: local.payments
                  ? {
                    ...apiConfig.payments,
                    ...(local.payments.paypal
                      ? { paypal: { ...local.payments.paypal, ...apiConfig.payments?.paypal } }
                      : {}),
                    ...(local.payments.cardBr
                      ? { cardBr: { ...local.payments.cardBr, ...apiConfig.payments?.cardBr } }
                      : {})
                  }
                  : apiConfig.payments
              } : {})
            },
            local
          );
          config._loaded = true;
          window.CHECKOUT_CONFIG = config;
          window.dispatchEvent(new CustomEvent('stf-config-ready', { detail: config }));
          return config;
        }
      } catch (e) {
        console.warn('API indisponível, usando arquivo local.', e);
      }
    }

    const config = await loadLocalConfig();
    config._loaded = true;
    window.CHECKOUT_CONFIG = config;
    window.dispatchEvent(new CustomEvent('stf-config-ready', { detail: config }));
    return config;
  }

  return { load, resolveApiUrl, applyDerivedFields, resolvePixConfig };
})();
