/**
 * Película / pulseira compatibility — aggregated checkout upsell only.
 * Regra principal: lista explícita compatibleWatchModels (1 produto → N modelos do select).
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

  function productType(product) {
    if (product?.productType === 'pulseira') return 'pulseira';
    return 'pelicula';
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

  /** Título curto no upsell — sem repetir modelo/mm (já escolhido no checkout). */
  function upsellShortLabel(product) {
    let name = productLabel(product);
    name = name.replace(/\s*\([^)]*\d+\s*mm[^)]*\)/gi, '');
    name = name.replace(/\s*—\s*Apple Watch.*$/i, '');
    name = name.replace(/\s+/g, ' ').trim();
    return name || productLabel(product);
  }

  function compatibleModels(product) {
    const list = product?.compatibleWatchModels;
    return Array.isArray(list) ? list.filter(Boolean) : [];
  }

  function isCompatible(product, watchModel) {
    if (!product || !watchModel) return false;
    const model = String(watchModel).trim();
    if (!model || model.includes('Outro modelo') || model.includes('Other model')) return false;
    return compatibleModels(product).includes(model);
  }

  function findCompatible(watchModel, products) {
    const model = String(watchModel || '').trim();
    if (!model || model.includes('Outro modelo') || model.includes('Other model')) return [];

    const aggregated = listAggregated(products);
    const peliculas = [];
    const pulseiras = [];
    let genericPelicula = null;

    aggregated.forEach((p) => {
      if (!isCompatible(p, model)) return;
      if (productType(p) === 'pulseira') {
        pulseiras.push(p);
        return;
      }
      const id = p.id || p.slug || '';
      if (String(id).includes('round-33mm')) {
        genericPelicula = p;
      } else {
        peliculas.push(p);
      }
    });

    const result = [...peliculas];
    if (!peliculas.length && genericPelicula) result.push(genericPelicula);
    result.push(...pulseiras);
    return result;
  }

  return {
    parseCaseMm,
    resolveModelMeta,
    productType,
    isAggregated,
    listAggregated,
    listStorefront,
    productLabel,
    productDescription,
    upsellShortLabel,
    compatibleModels,
    isCompatible,
    findCompatible
  };
})();
