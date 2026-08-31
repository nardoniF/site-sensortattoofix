/**
 * Cartas thank-you internacionais — uma folha por lente.
 * Usado em Pedidos (contagem) e docs/cartas/carta-agradecimento-intl.html (render).
 */
window.STF_ORDER_LETTERS = (function () {
  const SMARTBAND_LENS = { shape: 'rect', widthMm: 17, heightMm: 0.8 };
  const SMARTWATCH_LENS = { shape: 'circle', widthMm: 25, heightMm: 25 };
  const BAND_HINT_RE = /whoop|mi band|honor band|galaxy fit|amazfit band|smartband|vivosmart|vivo fit|fitbit charge/i;
  const ACCESSORY_SLUG_RE = /pel[ií]cula|pulseira|strap|film|potencializador|bracelet/i;

  function normModelLabel(s) {
    return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
  }

  function findCatalogRow(catalog, modelLabel) {
    const needle = normModelLabel(modelLabel);
    if (!needle) return null;
    for (const rows of Object.values(catalog || {})) {
      if (!Array.isArray(rows)) continue;
      for (const row of rows) {
        if (row?._brandPlaceholder) continue;
        const labels = [row.label, row.model].filter(Boolean).map(normModelLabel);
        if (labels.some((l) => l === needle || needle.includes(l) || l.includes(needle))) return row;
      }
    }
    return null;
  }

  function inferDeviceKind(row, modelLabel) {
    if (row?.kind === 'smartband') return 'smartband';
    if (Array.isArray(row?.kinds) && row.kinds.includes('smartband')) return 'smartband';
    if (BAND_HINT_RE.test(String(modelLabel || ''))) return 'smartband';
    return 'smartwatch';
  }

  function lensProfileFor(row, kind) {
    if (kind === 'smartband') {
      const w = Number(row?.lensWmm) > 0 ? Number(row.lensWmm) : SMARTBAND_LENS.widthMm;
      const h = Number(row?.lensHmm) > 0 ? Number(row.lensHmm) : SMARTBAND_LENS.heightMm;
      return { kind, shape: 'rect', widthMm: w, heightMm: h };
    }
    return {
      kind: 'smartwatch',
      shape: SMARTWATCH_LENS.shape,
      widthMm: SMARTWATCH_LENS.widthMm,
      heightMm: SMARTWATCH_LENS.heightMm
    };
  }

  function resolveProduct(item, products) {
    const id = item?.productId || item?.slug;
    if (!id) return null;
    return (products || []).find((p) => p.id === id || p.slug === id) || null;
  }

  function deviceTypeForProduct(product, item) {
    const raw = String(product?.deviceType || item?.deviceType || '').toLowerCase();
    if (raw === 'smartband' || raw === 'band') return 'smartband';
    if (raw === 'smartwatch' || raw === 'watch') return 'smartwatch';
    const slug = String(product?.slug || item?.slug || product?.id || '').toLowerCase();
    if (/smartband|whoop/.test(slug)) return 'smartband';
    return 'smartwatch';
  }

  function isLetterItem(item, product) {
    if (item?.aggregated === true || product?.aggregated === true) return false;
    const slug = String(product?.slug || item?.slug || product?.id || '').toLowerCase();
    if (ACCESSORY_SLUG_RE.test(slug)) return false;
    if (product?.deviceType) return true;
    if (/lens|kit|tattoofix|smartband/.test(slug)) return true;
    return item?.requiresSmartwatch !== false;
  }

  function isPlaceholderWatch(s) {
    const t = String(s || '').trim();
    if (!t || t === '—' || t === 'N/A') return true;
    return /outro modelo|other model|altro modello/i.test(t);
  }

  function watchModelFromOrder(order) {
    const obs = String(order?.observacoes || order?.notes || '').trim();
    const raw = String(order?.modeloRelogio || order?.smartwatch || '').trim();
    if (isPlaceholderWatch(raw)) return obs || raw || '—';
    return raw || obs || '—';
  }

  function extractBandModelsFromObs(obs) {
    const text = String(obs || '');
    const found = [];
    const re = /\bwhoop(?:\s*[\d.]+\s*)?(?:mg|peak|one|4\.0|5\.0|5)?\b/gi;
    let m;
    while ((m = re.exec(text))) {
      const label = m[0].replace(/\s+/g, ' ').trim();
      if (!found.some((f) => f.toLowerCase() === label.toLowerCase())) found.push(label);
    }
    return found;
  }

  function modelForSmartband(order, catalog, bandIndex) {
    const primary = watchModelFromOrder(order);
    const row = findCatalogRow(catalog, primary);
    if (inferDeviceKind(row, primary) === 'smartband') return primary;
    const bands = extractBandModelsFromObs(order?.observacoes || order?.notes);
    if (bands[bandIndex]) return bands[bandIndex];
    if (bands[0]) return bands[0];
    return primary || 'Smartband';
  }

  function itemQty(item) {
    const q = Number(item?.qty ?? item?.quantity);
    if (Number.isFinite(q) && q > 0) return Math.max(1, Math.min(10, Math.floor(q)));
    return 1;
  }

  function lensQtyFromProduto(produto) {
    const text = String(produto || '');
    let sum = 0;
    const re = /(\d+)\s*[x×]\s*/gi;
    let m;
    while ((m = re.exec(text))) {
      sum += Math.max(1, Math.min(10, parseInt(m[1], 10)));
    }
    return sum > 0 ? Math.min(10, sum) : null;
  }

  function expandSlotsToQty(slots, targetQty) {
    if (!targetQty || targetQty <= slots.length || !slots.length) return slots;
    const base = slots[0];
    const out = [];
    for (let i = 0; i < targetQty; i++) {
      out.push({ ...base, model: base.model, kind: base.kind, productSlug: base.productSlug, productName: base.productName });
    }
    return out;
  }

  function buildOrderLetterSlots(order, config) {
    const products = config?.products || [];
    const catalog = config?.smartwatchCatalog || {};
    const slots = [];
    const items = Array.isArray(order?.items) && order.items.length ? order.items : null;

    if (items) {
      let bandModelIdx = 0;
      for (const item of items) {
        const product = resolveProduct(item, products);
        if (!isLetterItem(item, product)) continue;
        const kind = deviceTypeForProduct(product, item);
        const qty = itemQty(item);
        for (let q = 0; q < qty; q++) {
          const model = kind === 'smartband'
            ? modelForSmartband(order, catalog, bandModelIdx++)
            : watchModelFromOrder(order);
          slots.push({
            kind,
            model,
            productSlug: product?.slug || item.slug || '',
            productName: item.name || product?.name || ''
          });
        }
      }
    }

    if (!slots.length) {
      const model = watchModelFromOrder(order);
      const row = findCatalogRow(catalog, model);
      const kind = inferDeviceKind(row, model);
      const fromProduto = lensQtyFromProduto(order?.produto);
      const qty = fromProduto || Math.max(1, Math.min(10, Number(order?.qty) || 1));
      for (let q = 0; q < qty; q++) {
        slots.push({ kind, model });
      }
    } else {
      const fromProduto = lensQtyFromProduto(order?.produto);
      if (fromProduto && fromProduto > slots.length && slots.every((s) => s.kind === 'smartwatch')) {
        slots = expandSlotsToQty(slots, fromProduto);
      }
    }

    const obs = String(order?.observacoes || order?.notes || '');
    const hasWatch = slots.some((s) => s.kind === 'smartwatch');
    const hasBand = slots.some((s) => s.kind === 'smartband');
    if (hasWatch && !hasBand && BAND_HINT_RE.test(obs)) {
      slots.push({
        kind: 'smartband',
        model: extractBandModelsFromObs(obs)[0] || 'Smartband',
        addon: true
      });
    }

    const hasWatchInShipment = slots.some((s) => s.kind === 'smartwatch');
    return slots.map((slot, index) => ({
      ...slot,
      index,
      total: slots.length,
      addon: !!slot.addon || (
        slot.kind === 'smartband'
        && hasWatchInShipment
        && slots.slice(0, index).some((s) => s.kind === 'smartwatch')
      )
    }));
  }

  function countSlots(order, config) {
    return buildOrderLetterSlots(order, config).length;
  }

  function summarizeSlots(slots) {
    const parts = [];
    const watchN = slots.filter((s) => s.kind === 'smartwatch').length;
    const bandN = slots.filter((s) => s.kind === 'smartband').length;
    if (watchN) parts.push(`${watchN}× smartwatch`);
    if (bandN) parts.push(`${bandN}× smartband`);
    return parts.join(' · ') || `${slots.length} lente(s)`;
  }

  return {
    SMARTBAND_LENS,
    SMARTWATCH_LENS,
    findCatalogRow,
    inferDeviceKind,
    lensProfileFor,
    watchModelFromOrder,
    buildOrderLetterSlots,
    countSlots,
    summarizeSlots
  };
})();
