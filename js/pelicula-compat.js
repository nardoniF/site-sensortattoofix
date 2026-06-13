/**
 * Película (screen protector) compatibility — aggregated checkout upsell only.
 */
window.STF_PELICULA = (function () {
  const CASE_RE = /\((\d+(?:\.\d+)?)\s*mm\)/i;

  function parseCaseMm(model) {
    const m = String(model || '').match(CASE_RE);
    return m ? Number(m[1]) : null;
  }

  function resolveModelMeta(model, configMeta) {
    const key = String(model || '').trim();
    if (!key) return null;
    const fromConfig = configMeta?.[key];
    if (fromConfig) return { ...fromConfig };
    const caseMm = parseCaseMm(key);
    let shape = null;
    if (key.startsWith('Apple Watch')) shape = 'squircle';
    else if (key.startsWith('Samsung Galaxy Watch')) shape = 'round';
    else if (key.startsWith('Garmin')) shape = 'round';
    else if (key.startsWith('Huawei Watch Fit')) shape = 'rect';
    else if (key.startsWith('Huawei')) shape = 'round';
    else if (key.includes('Amazfit Bip')) shape = 'rect';
    else if (key.includes('GTS')) shape = 'rect';
    else if (key.includes('GTR')) shape = 'round';
    else if (key.startsWith('Fitbit') || key.startsWith('Polar')) shape = 'rect';
    return { shape, caseMm, screenMm: null };
  }

  function isAggregated(product) {
    return product?.aggregated === true;
  }

  function listAggregated(products) {
    return (products || []).filter((p) => p.active !== false && isAggregated(p));
  }

  function listStorefront(products) {
    return (products || []).filter((p) => p.active !== false && !isAggregated(p));
  }

  function productLabel(product) {
    const en = window.STF_I18N?.isEn?.();
    if (en && product.nameEn) return product.nameEn;
    return product.name || product.id;
  }

  function productDescription(product) {
    const en = window.STF_I18N?.isEn?.();
    if (en && product.descriptionEn) return product.descriptionEn;
    return product.description || '';
  }

  function matchesRules(pelicula, meta) {
    const rules = pelicula.compatibility;
    if (!rules || !meta) return false;

    const hasDimensional = rules.caseMm != null || rules.screenMm != null;
    if (!hasDimensional) return false;

    if (rules.shape && meta.shape && rules.shape !== meta.shape) return false;

    if (rules.caseMm != null) {
      const cases = Array.isArray(rules.caseMm) ? rules.caseMm : [rules.caseMm];
      if (meta.caseMm == null || !cases.includes(meta.caseMm)) return false;
    }

    if (rules.screenMm != null) {
      const tol = Number(rules.screenMmTolerance ?? 2);
      if (meta.screenMm == null) return false;
      if (Math.abs(meta.screenMm - rules.screenMm) > tol) return false;
    }

    const dimTol = Number(rules.screenMmTolerance ?? 2);
    if (rules.screenWidthMm != null) {
      if (meta.screenWidthMm == null) return false;
      if (Math.abs(meta.screenWidthMm - rules.screenWidthMm) > dimTol) return false;
    }
    if (rules.screenHeightMm != null) {
      if (meta.screenHeightMm == null) return false;
      if (Math.abs(meta.screenHeightMm - rules.screenHeightMm) > dimTol) return false;
    }

    return true;
  }

  function matchesExplicitModels(pelicula, watchModel) {
    const list = pelicula.compatibleWatchModels;
    if (!Array.isArray(list) || !list.length) return false;
    return list.includes(watchModel);
  }

  function matchesAmbiguousAmazfit(pelicula, watchModel) {
    if (watchModel !== 'Amazfit GTR / GTS') return false;
    const id = pelicula.id || pelicula.slug || '';
    return id.includes('gtr-3') || id.includes('gts-2-mini') || id.includes('gts-squircle-44');
  }

  function matchesPartialName(pelicula, watchModel) {
    const id = pelicula.id || pelicula.slug || '';
    const model = String(watchModel || '');
    if (id.includes('bip') && model.includes('Bip')) return true;
    if (id.includes('gts-2-mini') && model.includes('GTS')) return true;
    if (id.includes('gtr-mini') && model.includes('GTR Mini')) return true;
    if (id.includes('gtr-3') && model.includes('GTR') && !model.includes('Mini')) return true;
    if (id.includes('huawei-gt') && model.includes('Huawei Watch GT')) return true;
    if (id.includes('samsung-gw3') && model.includes('Galaxy Watch 3')) return true;
    return false;
  }

  function isCompatible(pelicula, watchModel, configMeta) {
    if (!pelicula || !watchModel) return false;
    const meta = resolveModelMeta(watchModel, configMeta);
    if (matchesExplicitModels(pelicula, watchModel)) return true;
    if (matchesAmbiguousAmazfit(pelicula, watchModel)) return true;
    if (matchesPartialName(pelicula, watchModel)) return true;
    return matchesRules(pelicula, meta);
  }

  function findCompatible(watchModel, products, configMeta) {
    const model = String(watchModel || '').trim();
    if (!model || model.includes('Outro modelo') || model.includes('Other model')) return [];
    const aggregated = listAggregated(products);
    const seen = new Set();
    const specific = [];
    let generic = null;
    aggregated.forEach((p) => {
      const id = p.id || p.slug;
      if (!id || seen.has(id)) return;
      if (!isCompatible(p, model, configMeta)) return;
      seen.add(id);
      if (String(id).includes('round-33mm')) generic = p;
      else specific.push(p);
    });
    if (specific.length) return specific;
    return generic ? [generic] : [];
  }

  return {
    parseCaseMm,
    resolveModelMeta,
    isAggregated,
    listAggregated,
    listStorefront,
    productLabel,
    productDescription,
    isCompatible,
    findCompatible
  };
})();
