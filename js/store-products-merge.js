/**
 * Mescla produtos do store-config local (películas agregadas) com a lista da API.
 */
window.STF_PRODUCT_MERGE = (function () {
  function keyOf(p) {
    return String(p?.id || p?.slug || '').trim();
  }

  function mergeProductLists(apiList, localList) {
    const byId = new Map();
    (apiList || []).forEach((p) => {
      const k = keyOf(p);
      if (k) byId.set(k, { ...p });
    });
    (localList || []).forEach((lp) => {
      const k = keyOf(lp);
      if (!k) return;
      if (!byId.has(k)) {
        byId.set(k, { ...lp });
        return;
      }
      if (lp.aggregated === true) {
        byId.set(k, { ...byId.get(k), ...lp });
      }
    });
    return [...byId.values()].sort((a, b) => {
      if (a.aggregated && !b.aggregated) return 1;
      if (!a.aggregated && b.aggregated) return -1;
      return 0;
    });
  }

  function mergeConfig(apiConfig, localConfig) {
    if (!localConfig) return apiConfig;
    const next = { ...apiConfig };
    if (localConfig.products?.length) {
      next.products = mergeProductLists(apiConfig.products, localConfig.products);
    }
    if (localConfig.smartwatchModelMeta) {
      next.smartwatchModelMeta = {
        ...localConfig.smartwatchModelMeta,
        ...(apiConfig.smartwatchModelMeta || {})
      };
    }
    if (localConfig.smartwatchModels?.length) {
      next.smartwatchModels = localConfig.smartwatchModels;
    }
    return next;
  }

  return { mergeProductLists, mergeConfig, keyOf };
})();
