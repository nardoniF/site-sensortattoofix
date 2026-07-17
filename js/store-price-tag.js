/**
 * Atualiza preço exibido no site conforme config do admin (API ou store-config.json).
 * Em EN/IT converte BRL → USD/EUR via mesma API de câmbio do checkout.
 */
window.STF_STORE_PRICE = (function () {
  const PT_FALLBACK = {
    'store.frete': '+ frete',
    'store.freteLine': '+ Frete: Mini Envios no Brasil · entrega rápida até 5 km da Zona Norte (SP)',
    'store.shippingChannelsIntl': 'Todo Brasil (Mini Envios) · São Paulo, SP (Entrega Própria) · Outros Países (Exporta Fácil)',
    'shipping.intlDefault': 'Documento / carta internacional'
  };

  const EN_FALLBACK = {
    'store.frete': '+ shipping',
    'store.freteLine': '+ Shipping: calculated at checkout',
    'store.shippingChannelsIntl': 'International tracked shipping · calculated at checkout',
    'shipping.intlDefault': 'International tracked mail'
  };

  function pathLang() {
    if (location.pathname.includes('/it/')) return 'it';
    if (location.pathname.includes('/en/')) return 'en';
    return 'pt';
  }

  function isLocalized() {
    return pathLang() !== 'pt';
  }

  function t(key) {
    if (window.STF_I18N?.t) return window.STF_I18N.t(key);
    const lang = pathLang();
    const pack = lang === 'en' || lang === 'it' ? EN_FALLBACK : PT_FALLBACK;
    return pack[key] || PT_FALLBACK[key] || key;
  }

  function formatBRL(n) {
    return Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function formatBRLAmount(n) {
    return Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function primaryProduct(config) {
    if (config.products?.length) {
      const active = config.products.find((p) => p.active !== false);
      return active || config.products[0];
    }
    return config.product || null;
  }

  function productPrice(config) {
    return primaryProduct(config)?.price ?? config.product?.price ?? 62.9;
  }

  function buildPriceFreteLineSync(config) {
    const price = productPrice(config);
    return `${formatBRLAmount(price)} ${t('store.frete')}`;
  }

  async function buildPriceFreteLine(config) {
    const price = productPrice(config);
    const frete = t('store.frete');
    if (!isLocalized() || !window.STF_MONEY) {
      return buildPriceFreteLineSync(config);
    }
    try {
      const text = await window.STF_MONEY.formatForVisitor(price, config);
      return `${text} ${frete}`;
    } catch {
      return buildPriceFreteLineSync(config);
    }
  }

  function cheapestIntlLabel(config) {
    const methods = Array.isArray(config.shippingMethods) ? config.shippingMethods : [];
    const intl = methods.filter((m) => m.enabled !== false && m.scope === 'INT');
    const doc = intl.find((m) => m.simTipo === 'D' || /documento|carta/i.test(m.label || ''));
    if (doc?.label) return doc.label;
    return intl[0]?.label || t('shipping.intlDefault');
  }

  function brMiniLabel(config) {
    const methods = Array.isArray(config.shippingMethods) ? config.shippingMethods : [];
    const mini = methods.find((m) => m.id === 'br-mini-envios' && m.enabled !== false);
    return mini?.label || 'Mini Envios';
  }

  function buildShippingChannelsLine(config) {
    if (isLocalized()) return t('store.shippingChannelsIntl');
    const mini = brMiniLabel(config);
    return `Todo Brasil (${mini}) · São Paulo, SP (Entrega Própria) · Outros Países (Exporta Fácil)`;
  }

  function buildLine(config, el) {
    if (el?.getAttribute('data-store-price-layout') === 'split-price') {
      return buildPriceFreteLineSync(config);
    }
    const price = productPrice(config);
    const freteLine = el?.getAttribute('data-store-price-frete-line') || t('store.freteLine');
    let suffix = el?.getAttribute('data-store-price-suffix');
    if (isLocalized() && (suffix === 'PIX e cartão' || suffix === 'Mini Envios · PIX e cartão')) {
      suffix = window.STF_I18N?.t?.('store.intlSuffix') || suffix;
    } else if (isLocalized() && !suffix) {
      suffix = window.STF_I18N?.t?.('store.priceSuffix') || suffix;
    }
    let line = `${formatBRL(price)} ${freteLine}`;
    if (suffix) line += ` · ${suffix}`;
    return line;
  }

  function buildLocalizedLine(config, el, priceText) {
    if (el?.getAttribute('data-store-price-layout') === 'split-price') {
      const frete = t('store.frete');
      const primary = priceText.includes(' (') ? priceText.split(' (')[0] : priceText;
      return `${primary} ${frete}`;
    }
    const freteLine = el?.getAttribute('data-store-price-frete-line') || t('store.freteLine');
    let suffix = el?.getAttribute('data-store-price-suffix');
    if (isLocalized() && !suffix) suffix = window.STF_I18N?.t?.('store.priceSuffix') || '';
    let line = `${priceText} ${freteLine}`;
    if (suffix) line += ` · ${suffix}`;
    return line;
  }

  function applyToElement(el, config) {
    const price = productPrice(config);
    const linePromise = isLocalized() && window.STF_MONEY
      ? (el?.getAttribute('data-store-price-layout') === 'split-price'
          ? buildPriceFreteLine(config)
          : window.STF_MONEY.formatForVisitor(price, config)
              .then((priceText) => buildLocalizedLine(config, el, priceText)))
      : Promise.resolve(buildLine(config, el));

    Promise.resolve(linePromise).then((line) => {
      el.textContent = line;
    }).catch(() => {
      el.textContent = buildLine(config, el);
    });

    if (el.getAttribute('data-store-price-layout') === 'split-price') {
      const shippingEl = el.closest('.store-official-info')?.querySelector('[data-store-shipping-line]');
      if (shippingEl) shippingEl.textContent = buildShippingChannelsLine(config);
    }
  }

  async function apply(config) {
    if (!window.StoreConfig && !config) return null;
    const cfg = config || await StoreConfig.load();
    document.querySelectorAll('[data-store-price-tag]').forEach((el) => applyToElement(el, cfg));
    return cfg;
  }

  function start() {
    apply().catch((e) => console.warn('Preço da loja:', e));
  }

  window.addEventListener('stf-config-ready', (ev) => {
    if (ev.detail) apply(ev.detail).catch(() => {});
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  return { apply, buildLine, buildPriceFreteLine, buildShippingChannelsLine, formatBRL, primaryProduct };
})();
