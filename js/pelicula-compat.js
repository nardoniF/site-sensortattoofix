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

  /** Uma linha curta para o card de upsell (benefício, sem repetir modelo). */
  function upsellShortDescription(product) {
    const full = productDescription(product).trim();
    if (full) {
      const parts = full.split(/\s*[—–]\s+/);
      let line = (parts.length > 1 ? parts[parts.length - 1] : parts[0]).trim();
      line = line
        .replace(/\bApple Watch\b/gi, 'smartwatch')
        .replace(/\bno dia a dia\.?$/i, '')
        .replace(/\be ideal para[^.!?]*[.!?]?$/i, '')
        .replace(/\bno mesmo envio\.?$/i, '')
        .replace(/\s+/g, ' ')
        .trim();
      line = line.replace(/^mantém a tela do seu /i, 'Protege a tela do seu ');
      line = line.replace(/^proteja (o visor|a tela) do /i, 'Protege a tela do ');
      line = line.replace(/^tela do /i, 'Protege a tela do ');
      line = line.replace(/\blivre de riscos\b/gi, 'dos riscos');
      if (line.length > 58) {
        line = line.slice(0, 55).replace(/\s+\S*$/, '').trim() + '…';
      }
      if (line.length >= 16) {
        return line.charAt(0).toUpperCase() + line.slice(1);
      }
    }
    const type = productType(product);
    const key = type === 'pulseira' ? 'agregados.descPulseira' : 'agregados.descPelicula';
    return window.STF_I18N?.t?.(key) || (type === 'pulseira'
      ? 'Conforto e estilo no mesmo envio'
      : 'Protege a tela do seu smartwatch dos riscos');
  }

  function filmTypeLabel(product) {
    const en = window.STF_I18N?.isEn?.();
    if (en && product.filmTypeEn) return product.filmTypeEn;
    if (product.filmType) return product.filmType;
    if (product.packaging === 'box') return en ? 'ceramic' : 'cerâmica';
    if (product.packaging === 'saquinho') return en ? 'flexible membrane' : 'membrana flexível';
    return '';
  }

  /** Título curto no upsell — modelo de pulseira + cor. */
  function upsellShortLabel(product) {
    if (productType(product) === 'pulseira') {
      const en = window.STF_I18N?.isEn?.();
      const style = product.bandStyle || 'sport-soft';
      const color = en ? (product.colorEn || product.color) : (product.color || '');
      const titles = en
        ? {
            ocean: 'Ocean Sport Silicone Band',
            milanese: 'Magnetic Milanese Steel Band',
            'sport-air': 'Breathable Sport Silicone Band',
            'link-luxo': 'Luxury Stainless Link Band',
            trail: 'Trail Loop Nylon Comfort Band',
            alpine: 'Alpine Loop Braided Nylon Band',
            'sport-soft': 'Classic Soft Silicone Band',
            sport: 'Classic Soft Silicone Band'
          }
        : {
            ocean: 'Pulseira Ocean Esportiva',
            milanese: 'Pulseira Milanese Magnética',
            'sport-air': 'Pulseira Sport Respirável',
            'link-luxo': 'Pulseira de Luxo em Aço',
            trail: 'Pulseira Trail Loop',
            alpine: 'Pulseira Alpine Loop',
            'sport-soft': 'Pulseira Soft Lisa',
            sport: 'Pulseira Soft Lisa'
          };
      let label = titles[style] || titles['sport-soft'];
      if (String(product.id || '').includes('ultra')) {
        label += en ? ' · Ultra' : ' · Ultra';
      }
      if (color) label += ` · ${color}`;
      return label;
    }
    const en = window.STF_I18N?.isEn?.();
    const filmType = filmTypeLabel(product);
    let label = en ? 'Screen protector' : 'Película de tela';
    if (filmType) label += ` · ${filmType}`;
    return label;
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
    upsellShortDescription,
    upsellShortLabel,
    filmTypeLabel,
    compatibleModels,
    isCompatible,
    findCompatible
  };
})();
