/**
 * Atualiza preço exibido no site conforme config do admin (API ou store-config.json).
 */
window.STF_STORE_PRICE = (function () {
  function formatBRL(n) {
    return Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function primaryProduct(config) {
    if (config.products?.length) {
      const active = config.products.find((p) => p.active !== false);
      return active || config.products[0];
    }
    return config.product || null;
  }

  function buildPriceFreteLine(config) {
    const product = primaryProduct(config);
    const price = product?.price ?? config.product?.price ?? 59.9;
    const en = window.STF_I18N?.isEn?.();
    const frete = en ? '+ Shipping' : '+ Frete';
    return `${formatBRL(price)} ${frete}`;
  }

  function cheapestIntlLabel(config) {
    const methods = Array.isArray(config.shippingMethods) ? config.shippingMethods : [];
    const intl = methods.filter((m) => m.enabled !== false && m.scope === 'INT');
    const doc = intl.find((m) => m.simTipo === 'D' || /documento|carta/i.test(m.label || ''));
    if (doc?.label) return doc.label;
    return intl[0]?.label || (window.STF_I18N?.isEn?.()
      ? 'International letter / document'
      : 'Documento / carta internacional');
  }

  function brMiniLabel(config) {
    const methods = Array.isArray(config.shippingMethods) ? config.shippingMethods : [];
    const mini = methods.find((m) => m.id === 'br-mini-envios' && m.enabled !== false);
    return mini?.label || 'Mini Envios';
  }

  function buildShippingChannelsLine(config) {
    const en = window.STF_I18N?.isEn?.();
    const mini = brMiniLabel(config);
    const intl = cheapestIntlLabel(config);
    if (en) {
      return `Nationwide (${mini}) - 5 km North Zone SP (local delivery) - International (${intl})`;
    }
    return `Todo Brasil (${mini}) - 5 km da ZN/SP (transporte próprio) - Exterior (${intl})`;
  }

  function buildLine(config, el) {
    if (el?.getAttribute('data-store-price-layout') === 'split-price') {
      return buildPriceFreteLine(config);
    }
    const product = primaryProduct(config);
    const price = product?.price ?? config.product?.price ?? 59.9;
    const en = window.STF_I18N?.isEn?.();
    const freteLine = el?.getAttribute('data-store-price-frete-line')
      || (window.STF_I18N?.t ? window.STF_I18N.t('store.freteLine') : null)
      || '+ Frete: Mini Envios no Brasil · entrega rápida até 5 km da Zona Norte (SP)';
    let suffix = el?.getAttribute('data-store-price-suffix');
    if (en && suffix === 'PIX e cartão') {
      suffix = window.STF_I18N.t('store.intlSuffix');
    } else if (en && !suffix) {
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
