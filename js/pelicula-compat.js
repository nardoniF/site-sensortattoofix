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

  function pulseiraVariantKey(product) {
    const style = product.bandStyle || 'sport-soft';
    const color = String(product.color || '').toLowerCase().trim();
    const brand = String(product.compatibility?.brand || 'apple').toLowerCase();
    return `${style}|${brand}|${color}`;
  }

  function pulseiraSizeFitScore(product, caseMm) {
    const raw = product.compatibility?.caseMm;
    const sizes = Array.isArray(raw) ? raw : (raw != null ? [Number(raw)] : []);
    if (!sizes.length) return 100;
    if (caseMm != null && !sizes.includes(caseMm)) return 1000;
    return sizes.length;
  }

  /** Um card por cor/estilo — escolhe o SKU cujo tamanho encaixa no relógio. */
  function dedupePulseiras(pulseiras, watchModel) {
    const caseMm = parseCaseMm(watchModel);
    const byVariant = new Map();
    pulseiras.forEach((p) => {
      const key = pulseiraVariantKey(p);
      const prev = byVariant.get(key);
      if (!prev) {
        byVariant.set(key, p);
        return;
      }
      const scoreNew = pulseiraSizeFitScore(p, caseMm);
      const scorePrev = pulseiraSizeFitScore(prev, caseMm);
      if (scoreNew < scorePrev) byVariant.set(key, p);
    });
    return [...byVariant.values()];
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
    else if (key.includes('Amazfit Bip') || key.includes('Amazfit Active')) shape = 'rect';
    else if (key.includes('Amazfit GTS')) shape = 'rect';
    else if (key.includes('Amazfit GTR')) shape = 'round';
    else if (key.startsWith('Fitbit') || key.startsWith('Polar')) shape = 'rect';
    return { shape, caseMm, screenMm: null };
  }

  function productShape(product) {
    const explicit = product?.compatibility?.shape;
    if (explicit) return explicit;
    const id = String(product?.id || product?.slug || '');
    if (/apple/i.test(id)) return 'squircle';
    if (/round|gtr|garmin|huawei-gt|samsung|galaxy|gw\d|t-rex/i.test(id)) return 'round';
    if (/gts|bip|rect|fit|versa|active/i.test(id)) return 'rect';
    return null;
  }

  /** squircle só combina com squircle (Apple); rect/round não cruzam. */
  function shapeMatches(watchMeta, product) {
    const watchShape = watchMeta?.shape;
    const pShape = productShape(product);
    if (!watchShape || !pShape) return true;
    return watchShape === pShape;
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
    return (products || []).filter((p) => p.active !== false && p.inStock !== false && !isAggregated(p));
  }

  const KIT_COPY = {
    en: {
      name: 'Sensor Tattoo Fix Kit',
      description: 'Optical lens for smartwatches on tattooed skin — full kit'
    },
    it: {
      name: 'Kit Sensor Tattoo Fix',
      description: 'Lente ottica per smartwatch su pelle tatuata — kit completo'
    }
  };

  function isIt() {
    return !!(window.STF_I18N?.isIt?.() || /\/it\//i.test(location.pathname));
  }

  function isEn() {
    if (isIt()) return false;
    return !!(
      window.STF_I18N?.isEn?.() ||
      window.STF_SITE?.isIntlHost?.() ||
      /\.sensortattoofix\.com$/i.test(location.hostname) ||
      /\/en\//i.test(location.pathname)
    );
  }

  function isLocalized() {
    return isEn() || isIt() || !!(window.STF_I18N?.isLocalized?.());
  }

  function isKitProduct(product) {
    const id = String(product?.id || product?.slug || '');
    if (id === 'kit-sensor-tattoofix') return true;
    if (product?.aggregated === true) return false;
    if (product?.productType || id.startsWith('pelicula-') || id.startsWith('pulseira-')) return false;
    return !id || id.includes('sensor') || id.includes('tattoo');
  }

  function productLabel(product) {
    if (!product) return '';
    if (isIt()) {
      if (product.nameIt) return product.nameIt;
      if (product.nameEn) return product.nameEn;
      if (isKitProduct(product)) return KIT_COPY.it.name;
    }
    if (isEn()) {
      if (product.nameEn) return product.nameEn;
      if (isKitProduct(product)) return KIT_COPY.en.name;
    }
    return product.name || product.id;
  }

  function productDescription(product) {
    if (!product) return '';
    if (isIt()) {
      if (product.descriptionIt) return product.descriptionIt;
      if (product.descriptionEn) return product.descriptionEn;
      if (isKitProduct(product)) return KIT_COPY.it.description;
    }
    if (isEn()) {
      if (product.descriptionEn) return product.descriptionEn;
      if (isKitProduct(product)) return KIT_COPY.en.description;
    }
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
    const fallback = type === 'pulseira'
      ? (isIt() ? 'Comfort e stile nella stessa spedizione' : isEn() ? 'Comfort and style in the same shipment' : 'Conforto e estilo no mesmo envio')
      : (isIt() ? 'Protegge lo schermo dello smartwatch dai graffi' : isEn() ? 'Protects your smartwatch screen from scratches' : 'Protege a tela do seu smartwatch dos riscos');
    return window.STF_I18N?.t?.(key) || fallback;
  }

  function filmTypeLabel(product) {
    if (isLocalized() && product.filmTypeEn) return product.filmTypeEn;
    if (product.filmType && !isLocalized()) return product.filmType;
    if (product.packaging === 'box') {
      if (isIt()) return 'ceramica';
      if (isEn()) return 'ceramic';
      return 'cerâmica';
    }
    if (product.packaging === 'saquinho') {
      if (isIt()) return 'membrana flessibile';
      if (isEn()) return 'flexible membrane';
      return 'membrana flexível';
    }
    return isLocalized() ? '' : (product.filmType || '');
  }

  /** Título curto no upsell — modelo de pulseira + cor. */
  function upsellShortLabel(product) {
    if (productType(product) === 'pulseira') {
      const loc = isLocalized();
      const id = String(product.id || '');
      if (id === 'pulseira-sport-samsung-gw4-7') {
        if (isIt()) return 'Cinturino Sport · blu scuro (Galaxy Watch 4/5/6/7)';
        return loc
          ? 'Sport Silicone Band · dark blue (Galaxy Watch 4/5/6/7)'
          : 'Pulseira Sport · azul escuro (Galaxy Watch 4/5/6/7)';
      }
      if (id === 'pulseira-sport-creme-41-45') {
        if (isIt()) return 'Cinturino Sport · crema (Galaxy Watch 8 — 40 / 44 / Classic 46 mm)';
        return loc
          ? 'Sport Silicone Band · cream (Galaxy Watch 8 — 40 / 44 / Classic 46 mm)'
          : 'Pulseira Sport · creme (Galaxy Watch 8 — 40 / 44 / Classic 46 mm)';
      }
      const style = product.bandStyle || 'sport-soft';
      const color = loc ? (product.colorEn || product.color) : (product.color || '');
      const titles = loc
        ? (isIt()
          ? {
              ocean: 'Cinturino Ocean Sport',
              milanese: 'Cinturino Milanese magnetico',
              'sport-air': 'Cinturino Sport traspirante',
              'link-luxo': 'Cinturino link in acciaio',
              trail: 'Cinturino Trail Loop',
              alpine: 'Cinturino Alpine Loop',
              'sport-soft': 'Cinturino silicone classico',
              sport: 'Cinturino silicone classico'
            }
          : {
              ocean: 'Ocean Sport Silicone Band',
              milanese: 'Magnetic Milanese Steel Band',
              'sport-air': 'Breathable Sport Silicone Band',
              'link-luxo': 'Luxury Stainless Link Band',
              trail: 'Trail Loop Nylon Comfort Band',
              alpine: 'Alpine Loop Braided Nylon Band',
              'sport-soft': 'Classic Soft Silicone Band',
              sport: 'Classic Soft Silicone Band'
            })
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
      if (String(product.id || '').includes('ultra')) label += ' · Ultra';
      if (color) label += ` · ${color}`;
      return label;
    }
    const filmType = filmTypeLabel(product);
    let label = isIt() ? 'Pellicola schermo' : isEn() ? 'Screen protector' : 'Película de tela';
    if (filmType) label += ` · ${filmType}`;
    return label;
  }

  function compatibleModels(product) {
    const list = product?.compatibleWatchModels;
    return Array.isArray(list) ? list.filter(Boolean) : [];
  }

  function isCompatible(product, watchModel, configMeta) {
    if (!product || !watchModel) return false;
    const model = String(watchModel).trim();
    if (!model || model.includes('Outro modelo') || model.includes('Other model')) return false;
    if (!compatibleModels(product).includes(model)) return false;
    const meta = resolveModelMeta(model, configMeta);
    return shapeMatches(meta, product);
  }

  function findCompatible(watchModel, products, configMeta) {
    const model = String(watchModel || '').trim();
    if (!model || model.includes('Outro modelo') || model.includes('Other model')) return [];

    const aggregated = listAggregated(products);
    const peliculas = [];
    const pulseiras = [];
    let genericPelicula = null;

    aggregated.forEach((p) => {
      if (!isCompatible(p, model, configMeta)) return;
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
    result.push(...dedupePulseiras(pulseiras, model));
    return result;
  }

  return {
    parseCaseMm,
    resolveModelMeta,
    productShape,
    shapeMatches,
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
