/**
 * Mescla produtos do store-config local (películas agregadas) com a lista da API.
 */
window.STF_PRODUCT_MERGE = (function () {
  function keyOf(p) {
    return String(p?.id || p?.slug || '').trim();
  }

  function isLegacyBrokenKitImage(url) {
    const u = String(url || '').trim();
    if (!u) return true;
    return /sensortattoofix/i.test(u) && !/\/site\//i.test(u);
  }

  function resolveKitImage(image, fallback) {
    const fb = String(fallback || '/site/sensortattoofix.jpg').trim();
    let raw = String(image || '').trim();
    if (isLegacyBrokenKitImage(raw)) raw = fb;
    if (!raw) raw = fb;
    if (/^https?:\/\//i.test(raw)) return raw;
    return raw.startsWith('/') ? raw : '/' + raw.replace(/^\.\//, '');
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
    const isPulseira = product?.aggregated && (
      product.productType === 'pulseira' || id.startsWith('pulseira-')
    );
    const isPelicula = product?.aggregated && (
      product.productType === 'pelicula' || id.startsWith('pelicula-')
    );
    if (isPulseira && id) {
      const svgOnly = /^(pulseira-link|pulseira-trail|pulseira-alpine)/.test(id);
      if (svgOnly) {
        raw = `/produtos/${id}.svg`;
      } else {
        const perId = `/produtos/pulseiras/${id}.png?v=6`;
        if (!raw || raw.endsWith('.svg') || isGenericSharedImage(raw, id)) {
          raw = perId;
        } else if (raw.includes('/produtos/pulseiras/') && !raw.includes('?v=')) {
          raw = `${raw.split('?')[0]}?v=6`;
        }
      }
    }
    if (isPelicula && id) {
      const perId = `/produtos/peliculas/${id}.png?v=2`;
      if (!raw || raw.endsWith('.svg') || isGenericSharedImage(raw, id)) {
        raw = perId;
      } else if (raw.includes('/produtos/peliculas/') && !raw.includes('?v=')) {
        raw = `${raw.split('?')[0]}?v=2`;
      }
    }
    if (product?.aggregated && !isPulseira && !isPelicula) {
      const perProduct = id ? `/produtos/${id}.svg` : '';
      if (isKitOrMissingImage(raw) || isGenericSharedImage(raw, id)) {
        raw = perProduct || inferAggregatedImage(product);
      }
    } else if (!isPulseira && !isPelicula) {
      raw = resolveKitImage(raw);
    }
    if (/^https?:\/\//i.test(raw)) return raw;
    return raw.startsWith('/') ? raw : '/' + raw.replace(/^\.\//, '');
  }

  function normalizeBandColor(color) {
    const c = String(color || '').toLowerCase().trim();
    if (!c || c.includes('cinza') || c === 'gray' || c === 'grey') return 'cinza';
    if (c.includes('preta') || c === 'black') return 'preta';
    if (c.includes('azul')) return 'azul';
    if (c.includes('branca') || c === 'white') return 'branca';
    if (c.includes('creme') || c.includes('cream')) return 'creme';
    if (c.includes('rose')) return 'rose';
    if (c.includes('verde') || c.includes('oliva')) return 'verde';
    if (c.includes('grafite')) return 'grafite';
    return 'cinza';
  }

  /** Ícone legível em miniatura (upsell/carrinho); lightbox usa resolveProductImage. */
  function resolveProductThumb(image, product) {
    if (!product?.aggregated) return resolveProductImage(image, product);

    const id = String(product?.id || product?.slug || '');
    const isPulseira = product.productType === 'pulseira' || id.startsWith('pulseira-');

    if (!isPulseira) {
      const shape = product.compatibility?.shape || '';
      if (shape === 'round' || /round|gtr|gw3|huawei-gt/i.test(id)) return '/produtos/pelicula-redonda.svg';
      if (shape === 'rect' || /rect|bip|gts|fit/i.test(id)) return '/produtos/pelicula-retangular.svg';
      return '/produtos/pelicula-squircle.svg';
    }

    const style = product.bandStyle || 'sport';
    const color = normalizeBandColor(product.color);
    if (style === 'milanese') {
      return color === 'rose' ? '/produtos/pulseira-mesh-rose.svg' : '/produtos/pulseira-mesh-preta.svg';
    }
    if (style === 'ocean') {
      return color === 'branca' ? '/produtos/pulseira-ocean-branca.svg' : '/produtos/pulseira-ocean-verde.svg';
    }
    const sportColor = ['cinza', 'preta', 'azul', 'branca', 'creme'].includes(color) ? color : 'cinza';
    return `/produtos/pulseira-sport-${sportColor}.svg`;
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
        if (Array.isArray(lp.compatibleWatchModels)) {
          merged.compatibleWatchModels = lp.compatibleWatchModels;
        }
        if (lp.active === false) merged.active = false;
        if (lp.image && String(lp.image).includes('/produtos/pulseiras/')) {
          merged.image = lp.image;
        } else if (lp.image && (isKitOrMissingImage(prev?.image) || isGenericSharedImage(prev?.image, k))) {
          merged.image = lp.image;
        }
        byId.set(k, merged);
        return;
      }
      const prev = byId.get(k);
      const merged = { ...prev };
      if (lp.image && isLegacyBrokenKitImage(prev?.image)) merged.image = lp.image;
      if (lp.name && prev?.name && /tattoo friendly/i.test(prev.name)) merged.name = lp.name;
      if (lp.description && prev?.description && /tattoo friendly/i.test(prev.description)) {
        merged.description = lp.description;
      }
      byId.set(k, merged);
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
    if (localConfig.product?.image && isLegacyBrokenKitImage(next.product?.image)) {
      next.product = { ...next.product, image: localConfig.product.image };
    }
    if (localConfig.smartwatchModelMeta) {
      next.smartwatchModelMeta = {
        ...(apiConfig.smartwatchModelMeta || {}),
        ...localConfig.smartwatchModelMeta
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
        ...(apiConfig.smartwatchModelMeta || {}),
        ...(localConfig.smartwatchModelMeta || {})
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
    isLegacyBrokenKitImage,
    isGenericSharedImage,
    inferAggregatedImage,
    resolveKitImage,
    resolveProductImage,
    resolveProductThumb,
    patchAggregatedImages
  };
})();
