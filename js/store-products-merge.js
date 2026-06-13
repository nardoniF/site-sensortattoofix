/**
 * Mescla produtos do store-config local (películas agregadas) com a lista da API.
 */
window.STF_PRODUCT_MERGE = (function () {
  function keyOf(p) {
    return String(p?.id || p?.slug || '').trim();
  }

  function isKitOrMissingImage(url) {
    const u = String(url || '').trim();
    return !u || /sensortattoofix/i.test(u) || !u.includes('/produtos/');
  }

  function inferAggregatedImage(product) {
    const id = String(product?.id || product?.slug || '').trim();
    if (id) return `/produtos/${id}.svg`;
    return '/produtos/pelicula-squircle.svg';
  }

  function isGenericSharedImage(url, productId) {
    const u = String(url || '').trim();
    const id = String(productId || '').trim();
    if (!u.includes('/produtos/')) return true;
    if (id && (u === `/produtos/${id}.svg` || u.endsWith(`/${id}.svg`))) return false;
    return /\/produtos\/(pelicula-(squircle|redonda|retangular)|pulseira-)/i.test(u);
  }

  function resolveProductImage(image, product) {
    const id = String(product?.id || product?.slug || '').trim();
    let raw = String(image || product?.image || '').trim();
    if (product?.aggregated) {
      const perProduct = id ? `/produtos/${id}.svg` : '';
      if (isKitOrMissingImage(raw) || isGenericSharedImage(raw, id)) {
        raw = perProduct || inferAggregatedImage(product);
      }
    }
    if (!raw) raw = product?.aggregated ? inferAggregatedImage(product) : 'site/sensortattoofix.jpg';
    if (/^https?:\/\//i.test(raw)) return raw;
    return raw.startsWith('/') ? raw : '/' + raw.replace(/^\.\//, '');
  }

  function patchAggregatedImages(products) {
    return (products || []).map((p) => {
      if (p?.aggregated !== true) return p;
      const image = resolveProductImage(p.image, p);
      return image === p.image ? p : { ...p, image };
    });
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
        const prev = byId.get(k);
        const merged = { ...prev, ...lp };
        if (lp.image && (isKitOrMissingImage(prev?.image) || isGenericSharedImage(prev?.image, k))) {
          merged.image = lp.image;
        }
        byId.set(k, merged);
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
      next.products = patchAggregatedImages(
        mergeProductLists(apiConfig.products, localConfig.products)
      );
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

  /** Admin: só adiciona agregados que ainda não existem no KV — não sobrescreve imagens salvas. */
  function mergeMissingAggregated(apiConfig, localConfig) {
    if (!localConfig?.products?.length) return apiConfig;
    const byId = new Map();
    (apiConfig.products || []).forEach((p) => {
      const k = keyOf(p);
      if (k) byId.set(k, { ...p });
    });
    localConfig.products.forEach((lp) => {
      const k = keyOf(lp);
      if (!k || lp.aggregated !== true || byId.has(k)) return;
      byId.set(k, { ...lp });
    });
    const products = [...byId.values()].sort((a, b) => {
      if (a.aggregated && !b.aggregated) return 1;
      if (!a.aggregated && b.aggregated) return -1;
      return 0;
    });
    return {
      ...apiConfig,
      products,
      smartwatchModelMeta: {
        ...(localConfig.smartwatchModelMeta || {}),
        ...(apiConfig.smartwatchModelMeta || {})
      },
      smartwatchModels: localConfig.smartwatchModels?.length
        ? localConfig.smartwatchModels
        : apiConfig.smartwatchModels
    };
  }

  return {
    mergeProductLists,
    mergeConfig,
    mergeMissingAggregated,
    keyOf,
    isKitOrMissingImage,
    isGenericSharedImage,
    inferAggregatedImage,
    resolveProductImage,
    patchAggregatedImages
  };
})();
