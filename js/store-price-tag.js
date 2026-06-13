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

  function buildLine(config, el) {
    const product = primaryProduct(config);
    const price = product?.price ?? config.product?.price ?? 59.9;
    const en = window.STF_I18N?.isEn?.();
    const freteLine = el?.getAttribute('data-store-price-frete-line')
      || (window.STF_I18N?.t ? window.STF_I18N.t('store.freteLine') : null)
      || '+ Frete: Mini Envios todo Brasil e Uber até 5 km';
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

  return { apply, buildLine, formatBRL, primaryProduct };
})();
