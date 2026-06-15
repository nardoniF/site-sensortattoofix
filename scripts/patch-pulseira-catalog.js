#!/usr/bin/env node
/**
 * Atualiza pulseiras no store-config: bandStyle, títulos limpos e fotos JPG.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const configPath = path.join(ROOT, 'data/store-config.json');
const styles = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/band-styles.json'), 'utf8'));
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const STYLE_MIGRATE = { sport: 'sport-soft', ocean: 'ocean', milanese: 'milanese' };

function sizeFromName(name) {
  const m = String(name || '').match(/\(([^)]+)\)/);
  return m ? m[1].trim() : '';
}

function patchPulseira(p) {
  if (p.productType !== 'pulseira' && !String(p.id || '').startsWith('pulseira-')) return p;
  let style = p.bandStyle || 'sport-soft';
  if (STYLE_MIGRATE[style]) style = STYLE_MIGRATE[style];
  const meta = styles[style];
  if (!meta) return { ...p, bandStyle: style };

  const size = sizeFromName(p.name);
  const color = p.color || '';
  const colorEn = p.colorEn || color;
  const ultra = String(p.id || '').includes('ultra');

  const name = size
    ? `${meta.titlePt} — ${color} (${size})`
  : `${meta.titlePt} — ${color}`;
  const nameEn = size
    ? `${meta.titleEn} — ${colorEn} (${size})`
    : `${meta.titleEn} — ${colorEn}`;

  let desc = meta.subtitlePt;
  if (ultra) desc += ' — tamanho Apple Watch Ultra.';
  let descEn = meta.subtitleEn;
  if (ultra) descEn += ' — Apple Watch Ultra size.';

  return {
    ...p,
    bandStyle: style,
    name,
    nameEn,
    description: desc,
    descriptionEn: descEn,
    image: meta.image
  };
}

const appleLargeCompat = [
  'Apple Watch Series 10 (42mm)',
  'Apple Watch SE (44mm)',
  'Apple Watch SE 2 (44mm)',
  'Apple Watch Series 6 (44mm)',
  'Apple Watch Series 7 (45mm)',
  'Apple Watch Series 8 (45mm)',
  'Apple Watch Series 9 (45mm)',
  'Apple Watch Ultra (49mm)',
  'Apple Watch Ultra 2 (49mm)',
  'Apple Watch Ultra 3 (49mm)'
];

const newProducts = [
  {
    id: 'pulseira-sport-air-preta-42-49',
    slug: 'pulseira-sport-air-preta-42-49',
    color: 'preta',
    colorEn: 'black',
    caseMm: [42, 44, 45, 49],
    compatibleWatchModels: appleLargeCompat
  },
  {
    id: 'pulseira-link-grafite-42-49',
    slug: 'pulseira-link-grafite-42-49',
    bandStyle: 'link-luxo',
    color: 'grafite',
    colorEn: 'graphite',
    caseMm: [42, 44, 45, 49],
    compatibleWatchModels: appleLargeCompat
  },
  {
    id: 'pulseira-trail-preta-ultra-49',
    slug: 'pulseira-trail-preta-ultra-49',
    bandStyle: 'trail',
    color: 'preta',
    colorEn: 'black',
    caseMm: [49],
    compatibleWatchModels: [
      'Apple Watch Ultra (49mm)',
      'Apple Watch Ultra 2 (49mm)',
      'Apple Watch Ultra 3 (49mm)'
    ]
  },
  {
    id: 'pulseira-alpine-verde-49',
    slug: 'pulseira-alpine-verde-49',
    bandStyle: 'alpine',
    color: 'verde oliva',
    colorEn: 'olive green',
    caseMm: [49],
    compatibleWatchModels: [
      'Apple Watch Ultra (49mm)',
      'Apple Watch Ultra 2 (49mm)',
      'Apple Watch Ultra 3 (49mm)'
    ]
  }
].map((tpl) => {
  const style = tpl.bandStyle || 'sport-air';
  const meta = styles[style];
  const sizeLabel = Array.isArray(tpl.caseMm) ? tpl.caseMm.join('/') + 'mm' : `${tpl.caseMm}mm`;
  return patchPulseira({
    id: tpl.id,
    slug: tpl.slug,
    name: `${meta.titlePt} — ${tpl.color} (${sizeLabel})`,
    nameEn: `${meta.titleEn} — ${tpl.colorEn} (${sizeLabel})`,
    description: meta.subtitlePt,
    descriptionEn: meta.subtitleEn,
    price: 40,
    image: meta.image,
    active: true,
    aggregated: true,
    productType: 'pulseira',
    bandStyle: style,
    color: tpl.color,
    colorEn: tpl.colorEn,
    requiresSmartwatch: false,
    weightGrams: 12,
    packaging: 'box',
    compatibility: { brand: 'apple', shape: 'squircle', caseMm: tpl.caseMm },
    compatibleWatchModels: tpl.compatibleWatchModels
  });
});

const byId = new Map((config.products || []).map((p) => [p.id, p]));
(config.products || []).forEach((p) => {
  const next = patchPulseira(p);
  byId.set(next.id, next);
});
newProducts.forEach((p) => {
  if (!byId.has(p.id)) byId.set(p.id, p);
});

config.products = [...byId.values()].sort((a, b) => {
  if (a.aggregated && !b.aggregated) return 1;
  if (!a.aggregated && b.aggregated) return -1;
  return String(a.id).localeCompare(String(b.id));
});

fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
console.log('store-config.json atualizado:', config.products.filter((p) => p.productType === 'pulseira').length, 'pulseiras');
