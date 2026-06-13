#!/usr/bin/env node
/**
 * Baixa fotos limpas de anúncios (Shopify/CDN) para produtos/peliculas/{id}.png
 * Películas = imagem de vitrine na internet por modelo/tamanho.
 * Pulseiras = usar import-pulseira-photos.js (fotos do usuário).
 */
const fs = require('fs');
const https = require('https');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const outDir = path.join(ROOT, 'produtos/peliculas');
const configPath = path.join(ROOT, 'data/store-config.json');

const WOWBAND_CERAMIC =
  'https://cdn.shopify.com/s/files/1/0652/9335/3178/files/2_00541d2a-5420-493d-a4f4-70ce22dfa893.jpg?v=1764732658';
const NERDCASE_38 =
  'https://cdn.shopify.com/s/files/1/0595/1199/6502/files/7275a6a379f875d2584f6fd65a2319f0.png?v=1742253228';
const AMAZFIT_ROUND =
  'https://cdn.shopify.com/s/files/1/0879/7120/1300/files/amazfit-gtr-2-screenprotector.jpg?v=1725254618';
const ROUND_TPU = AMAZFIT_ROUND;

/** productId -> URL de anúncio (referência em comentário no log) */
const MAP = {
  'pelicula-apple-38mm': NERDCASE_38,
  'pelicula-apple-40mm': WOWBAND_CERAMIC,
  'pelicula-apple-41mm': WOWBAND_CERAMIC,
  'pelicula-apple-42mm': WOWBAND_CERAMIC,
  'pelicula-apple-44mm': WOWBAND_CERAMIC,
  'pelicula-apple-45mm': WOWBAND_CERAMIC,
  'pelicula-apple-46mm': WOWBAND_CERAMIC,
  'pelicula-amazfit-bip-2': WOWBAND_CERAMIC,
  'pelicula-amazfit-gtr-3': AMAZFIT_ROUND,
  'pelicula-amazfit-gtr-mini': AMAZFIT_ROUND,
  'pelicula-amazfit-gts-2-mini': WOWBAND_CERAMIC,
  'pelicula-amazfit-gts-squircle-44mm': WOWBAND_CERAMIC,
  'pelicula-huawei-gt-2': ROUND_TPU,
  'pelicula-samsung-gw3-45mm': ROUND_TPU,
  'pelicula-round-33mm': ROUND_TPU
};

function download(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'SensorTattooFix/1.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return download(res.headers.location).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} ${url}`));
        res.resume();
        return;
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

async function main() {
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  let ok = 0;
  const miss = [];

  for (const [productId, url] of Object.entries(MAP)) {
    const dest = path.join(outDir, `${productId}.png`);
    const webPath = `/produtos/peliculas/${productId}.png?v=2`;
    try {
      const buf = await download(url);
      fs.writeFileSync(dest, buf);
      const p = config.products.find((x) => x.id === productId);
      if (p) p.image = `/produtos/peliculas/${productId}.png`;
      console.log('OK', productId, '←', url.split('/').pop().split('?')[0]);
      ok += 1;
    } catch (e) {
      miss.push(productId);
      console.warn('FAIL', productId, e.message);
    }
  }

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
  console.log(`\n${ok} películas (anúncios).`);
  if (miss.length) console.warn('Sem foto:', miss.join(', '));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
