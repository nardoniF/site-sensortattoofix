#!/usr/bin/env node
/**
 * Copia fotos REAIS do usuário (pasta assets do Cursor) para produtos/pulseiras/{product-id}.png
 * — fotos que você tirou ou salvou dos seus anúncios. Nunca baixa da internet.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ASSETS = path.join(ROOT, '..', '.cursor/projects/Users-fabionardoni-Projetos-3N20-site-sensortattoofix/assets');
const altAssets = '/Users/fabionardoni/.cursor/projects/Users-fabionardoni-Projetos-3N20-site-sensortattoofix/assets';
const assetsDir = fs.existsSync(ASSETS) ? ASSETS : altAssets;
const outDir = path.join(ROOT, 'produtos/pulseiras');
const configPath = path.join(ROOT, 'data/store-config.json');

/**
 * productId -> substring do nome do arquivo em assets (primeiro match).
 * Prioridade: IMG_* (fotos no estoque) e arquivos Pulseira_* dos seus anúncios.
 */
const MAP = {
  'pulseira-mesh-preta-42-49': 'IMG_3083',
  'pulseira-mesh-rose-38-41': 'Pulseira_Apple_Watch_-_Metal_Rose',
  'pulseira-ocean-branca-42-49': 'Pulseira_Silicone_Branca_escuro',
  'pulseira-ocean-verde-42-49': 'Pulseira_Silicone_Verde_escuro',
  'pulseira-sport-air-preta-42-49': 'IMG_3084',
  'pulseira-sport-azul-38-41': 'IMG_3082',
  'pulseira-sport-azul-40-45': 'IMG_3092',
  'pulseira-sport-branca-42-49': 'IMG_3090',
  'pulseira-sport-cinza-38-41': 'Pulseira_para_AppleWatch_Silicone_CINZA',
  'pulseira-sport-creme-41-45': 'Pulseira_De_Silicone_Para_Samsung_Galaxy_Watch_8',
  'pulseira-sport-preta-42-49': 'IMG_3091',
  'pulseira-sport-preta-ultra-49': 'IMG_3091',
  'pulseira-alpine-verde-49': 'IMG_3088',
  'pulseira-link-grafite-42-49': 'IMG_3085',
  'pulseira-trail-preta-ultra-49': 'IMG_3086'
};

function findAsset(match) {
  const files = fs.readdirSync(assetsDir);
  const hit = files.find((f) => f.includes(match));
  if (!hit) return null;
  return path.join(assetsDir, hit);
}

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
let ok = 0;
const miss = [];

Object.entries(MAP).forEach(([productId, needle]) => {
  const src = findAsset(needle);
  const dest = path.join(outDir, `${productId}.png`);
  const webPath = `/produtos/pulseiras/${productId}.png`;
  if (!src) {
    miss.push({ productId, needle });
    return;
  }
  fs.copyFileSync(src, dest);
  const p = config.products.find((x) => x.id === productId);
  if (p) p.image = webPath;
  console.log('OK', productId, '←', path.basename(src));
  ok += 1;
});

fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
console.log(`\n${ok} fotos importadas (somente assets locais).`);
if (miss.length) {
  console.warn('Sem arquivo:', miss.map((m) => `${m.productId} (${m.needle})`).join(', '));
}
