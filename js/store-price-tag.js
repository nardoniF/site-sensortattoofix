/**
 * Atualiza preço exibido no site conforme config do admin (API ou store-config.json).
 */
window.STF_STORE_PRICE = (function () {
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

  function isLocalized() {
    const lang = window.STF_I18N?.getLang?.() || 'pt';
    return lang !== 'pt';
  }

  function buildPriceFreteLine(config) {
    const product = primaryProduct(config);
    const price = product?.price ?? config.product?.price ?? 62.9;
    const frete = isLocalized()
      ? (window.STF_I18N?.t?.('store.frete') || '+ Shipping')
      : '+ Frete';
    return `${formatBRLAmount(price)} ${frete}`;
  }

  function cheapestIntlLabel(config) {
    const methods = Array.isArray(config.shippingMethods) ? config.shippingMethods : [];
    const intl = methods.filter((m) => m.enabled !== false && m.scope === 'INT');
    const doc = intl.find((m) => m.simTipo === 'D' || /documento|carta/i.test(m.label || ''));
    if (doc?.label) return doc.label;
    return intl[0]?.label || (isLocalized()
      ? 'International letter / document'
      : 'Documento / carta internacional');
  }

  function brMiniLabel(config) {
    const methods = Array.isArray(config.shippingMethods) ? config.shippingMethods : [];
    const mini = methods.find((m) => m.id === 'br-mini-envios' && m.enabled !== false);
    return mini?.label || 'Mini Envios';
  }

  function buildShippingChannelsLine(config) {
    const mini = brMiniLabel(config);
    if (isLocalized()) {
      return `Nationwide (${mini}) · São Paulo, SP (Own Transport) · Other Countries (Exporta Fácil)`;
    }
    return `Todo Brasil (${mini}) · São Paulo, SP (Entrega Própria) · Outros Países (Exporta Fácil)`;
  }

  function buildLine(config, el) {
    if (el?.getAttribute('data-store-price-layout') === 'split-price') {
      return buildPriceFreteLine(config);
    }
    const product = primaryProduct(config);
    const price = product?.price ?? config.product?.price ?? 62.9;
    const freteLine = el?.getAttribute('data-store-price-frete-line')
      || (window.STF_I18N?.t ? window.STF_I18N.t('store.freteLine') : null)
      || '+ Frete: Mini Envios no Brasil · entrega rápida até 5 km da Zona Norte (SP)';
    let suffix = el?.getAttribute('data-store-price-suffix');
    if (isLocalized() && suffix === 'PIX e cartão') {
      suffix = window.STF_I18N.t('store.intlSuffix');
    } else if (isLocalized() && !suffix) {
      suffix = window.STF_I18N.t('store.priceSuffix');
    }
    let line = `${formatBRL(price)} ${freteLine}`;
    if (suffix) line += ` · ${suffix}`;
    return line;
  }

  function applyToElement(el, config) {
    el.textContent = buildLine(config, el);
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
