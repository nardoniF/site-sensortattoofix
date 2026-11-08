const OTHER_MODEL_RE = /outro modelo|other model|altro modello/i;
const SMARTBAND_MODEL_RE = /\b((smart\s*)?band|mi\s*band|honor\s*band|huawei\s*band|amazfit\s*band|galaxy\s*fit|vivosmart|v[ií]vofit|fitbit\s*(charge|inspire|ace|luxe|air))\b/i;

function normalizeKind(value) {
  const kind = String(value || '').toLowerCase();
  if (kind === 'band' || kind === 'smartband') return 'smartband';
  if (kind === 'watch' || kind === 'smartwatch') return 'smartwatch';
  return '';
}

function modelKind(label) {
  return SMARTBAND_MODEL_RE.test(String(label || '')) ? 'smartband' : 'smartwatch';
}

function productKind(product) {
  const explicit = normalizeKind(product?.deviceType || product?.watchKind);
  if (explicit) return explicit;
  const label = [product?.id, product?.slug, product?.name].filter(Boolean).join(' ');
  return /smartband/i.test(label) ? 'smartband' : 'smartwatch';
}

function catalogModelKinds(row, label) {
  const kinds = Array.isArray(row?.kinds)
    ? row.kinds.map(normalizeKind).filter(Boolean)
    : [];
  if (kinds.length) return kinds;
  const explicit = normalizeKind(row?.kind || row?.deviceType);
  return [explicit || modelKind(label)];
}

function catalogModels(config) {
  const models = new Map();
  const catalogLabels = new Set();
  const add = (row, label) => {
    const name = String(label || '').trim();
    if (!name || row?._brandPlaceholder) return;
    const kinds = catalogModelKinds(row, name);
    models.set(name, new Set([...(models.get(name) || []), ...kinds]));
  };

  const catalog = config?.smartwatchCatalog;
  if (catalog && typeof catalog === 'object') {
    Object.values(catalog).forEach((rows) => {
      if (!Array.isArray(rows)) return;
      rows.forEach((row) => {
        const label = typeof row === 'string' ? row : row?.label || row?.model;
        if (label) catalogLabels.add(String(label).trim());
        add(typeof row === 'string' ? null : row, label);
      });
    });
  }
  (Array.isArray(config?.smartwatchModels) ? config.smartwatchModels : [])
    .forEach((row) => {
      const label = typeof row === 'string' ? row : row?.label || row?.model;
      if (label && !catalogLabels.has(String(label).trim())) add(typeof row === 'string' ? null : row, label);
    });
  return models;
}

export function resolveOrderItemModels(product, qty, suppliedModels, legacyModel, config) {
  if (product?.requiresSmartwatch === false) return [];

  const count = Math.max(1, Math.min(10, Number(qty) || 1));
  const models = Array.isArray(suppliedModels)
    ? suppliedModels.map((model) => String(model || '').trim())
    : (count === 1 && String(legacyModel || '').trim()
      ? [String(legacyModel).trim()]
      : []);
  if (models.length !== count || models.some((model) => !model)) {
    throw new Error('Informe o modelo compatível de cada unidade da lente.');
  }

  const kind = productKind(product);
  const available = catalogModels(config);
  for (const model of models) {
    if (OTHER_MODEL_RE.test(model)) continue;
    if (!available.get(model)?.has(kind)) {
      throw new Error(`O modelo "${model}" não é compatível com ${kind === 'smartband' ? 'smartband' : 'smartwatch'}.`);
    }
  }
  return models;
}

export function orderDeviceModelsText(items) {
  return (Array.isArray(items) ? items : [])
    .filter((item) => Array.isArray(item?.models) && item.models.some(Boolean))
    .map((item) => {
      const counts = new Map();
      item.models.forEach((model) => {
        const name = String(model || '').trim();
        if (name) counts.set(name, (counts.get(name) || 0) + 1);
      });
      const models = [...counts]
        .map(([model, quantity]) => `${quantity}× ${model}`)
        .join('\n');
      return `${item.name || item.productId || 'Produto'} (${item.qty || item.models.length}): ${models}`;
    })
    .join('\n');
}
