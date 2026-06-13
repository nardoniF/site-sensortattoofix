#!/usr/bin/env node
/**
 * Copia fotos reais de películas (embalagens IMG_*) para produtos/peliculas/{id}.png
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const assetsDir = '/Users/fabionardoni/.cursor/projects/Users-fabionardoni-Projetos-3N20-site-sensortattoofix/assets';
const outDir = path.join(ROOT, 'produtos/peliculas');
const configPath = path.join(ROOT, 'data/store-config.json');

/** productId -> prefixo do arquivo em assets (IMG_xxxx) */
const MAP = {
  'pelicula-apple-38mm': 'IMG_3061',
  'pelicula-apple-40mm': 'IMG_3062',
  'pelicula-apple-41mm': 'IMG_3063',
  'pelicula-apple-42mm': 'IMG_3059',
  'pelicula-apple-44mm': 'IMG_3060',
  'pelicula-apple-45mm': 'IMG_3065',
  'pelicula-apple-46mm': 'IMG_3058',
  'pelicula-amazfit-bip-2': 'IMG_3074',
  'pelicula-amazfit-gtr-3': 'IMG_3072',
  'pelicula-amazfit-gtr-mini': 'IMG_3078',
  'pelicula-amazfit-gts-2-mini': 'IMG_3067',
  'pelicula-amazfit-gts-squircle-44mm': 'IMG_3080',
  'pelicula-huawei-gt-2': 'IMG_3075',
  'pelicula-samsung-gw3-45mm': 'IMG_3071',
  'pelicula-round-33mm': 'IMG_3079'
};

function findAsset(prefix) {
  const files = fs.readdirSync(assetsDir);
  const hit = files.find((f) => f.startsWith(prefix));
  if (!hit) return null;
  return path.join(assetsDir, hit);
}

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
let ok = 0;
const miss = [];

Object.entries(MAP).forEach(([productId, prefix]) => {
  const src = findAsset(prefix);
  const dest = path.join(outDir, `${productId}.png`);
  const webPath = `/produtos/peliculas/${productId}.png`;
  if (!src) {
    miss.push(productId);
    return;
  }
  fs.copyFileSync(src, dest);
  const p = config.products.find((x) => x.id === productId);
  if (p) p.image = webPath;
  console.log('OK', productId, '←', path.basename(src));
  ok += 1;
});

fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
console.log(`\n${ok} películas importadas.`);
if (miss.length) console.warn('Sem foto:', miss.join(', '));
