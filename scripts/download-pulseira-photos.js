#!/usr/bin/env node
/**
 * Baixa fotos limpas de produto (Apple Store CDN) para produtos/pulseiras/{id}.png
 * e atualiza image em data/store-config.json.
 *
 * Fontes: páginas oficiais apple.com/shop/product (render 4000×4000, fundo neutro).
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const https = require('https');

const ROOT = path.join(__dirname, '..');
const outDir = path.join(ROOT, 'produtos/pulseiras');
const configPath = path.join(ROOT, 'data/store-config.json');

/** productId -> { url, note } — mesma imagem pode servir a vários SKUs */
const SOURCES = {
  'pulseira-sport-preta-42-49': {
    url: 'https://www.apple.com/shop/product/MXM23AM/A/46mm-black-sport-band-s-m',
    note: 'Apple Sport Band black 46mm (MXM23AM/A)'
  },
  'pulseira-sport-preta-ultra-49': {
    share: 'pulseira-sport-preta-42-49',
    note: 'Same as pulseira-sport-preta-42-49 (black sport band)'
  },
  'pulseira-sport-azul-38-41': {
    url: 'https://www.apple.com/shop/product/MFGX4AM/A/46mm-anchor-blue-sport-band-s-m',
    note: 'Apple Sport Band anchor blue 46mm (MFGX4AM/A)'
  },
  'pulseira-sport-azul-40-45': {
    share: 'pulseira-sport-azul-38-41',
    note: 'Same as pulseira-sport-azul-38-41 (anchor blue sport band)'
  },
  'pulseira-sport-branca-42-49': {
    url: 'https://www.apple.com/shop/product/MXLL3AM/A/42mm-starlight-sport-band-s-m',
    note: 'Apple Sport Band starlight 42mm (MXLL3AM/A) — closest to branca/creme claro'
  },
  'pulseira-sport-cinza-38-41': {
    url: 'https://www.apple.com/shop/product/MXLG3AM/A/42mm-stone-gray-sport-band-s-m',
    note: 'Apple Sport Band stone gray 42mm (MXLG3AM/A)'
  },
  'pulseira-sport-creme-41-45': {
    url: 'https://www.apple.com/shop/product/MXLL3AM/A/42mm-starlight-sport-band-s-m',
    note: 'Apple Sport Band starlight 42mm (MXLL3AM/A)'
  },
  'pulseira-sport-air-preta-42-49': {
    url: 'https://www.apple.com/shop/product/MT4D3AM/A/41mm-black-nike-sport-band-s-m',
    note: 'Apple Nike Sport Band black 41mm (MT4D3AM/A) — perforated/breathable'
  },
  'pulseira-ocean-branca-42-49': {
    url: 'https://www.apple.com/shop/product/MQE93AM/A/49mm-white-ocean-band',
    note: 'Apple Ocean Band white 49mm (MQE93AM/A)'
  },
  'pulseira-ocean-verde-42-49': {
    url: 'https://www.apple.com/shop/product/MT633AM/A/49mm-green-ocean-band',
    note: 'Apple Ocean Band green 49mm (MT633AM/A)'
  },
  'pulseira-mesh-preta-42-49': {
    url: 'https://www.apple.com/shop/product/MTJM3ZM/A/41mm-graphite-milanese-loop',
    note: 'Apple Milanese Loop graphite 41mm (MTJM3ZM/A)'
  },
  'pulseira-mesh-rose-38-41': {
    url: 'https://www.apple.com/shop/product/MTJP3AM/A/41mm-rose-gold-milanese-loop',
    note: 'Apple Milanese Loop rose gold 41mm (MTJP3AM/A)'
  },
  'pulseira-link-grafite-42-49': {
    url: 'https://www.apple.com/shop/product/MTJT3AM/A/41mm-graphite-link-bracelet',
    note: 'Apple Link Bracelet graphite 41mm (MTJT3AM/A)'
  },
  'pulseira-trail-preta-ultra-49': {
    url: 'https://www.apple.com/shop/product/MTJ83AM/A/49mm-black-trail-loop-m-l',
    note: 'Apple Trail Loop black 49mm (MTJ83AM/A)'
  },
  'pulseira-alpine-verde-49': {
    url: 'https://www.apple.com/shop/product/MTJ73AM/A/49mm-green-alpine-loop-large',
    note: 'Apple Alpine Loop green 49mm (MTJ73AM/A)'
  }
};

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchText(res.headers.location).then(resolve).catch(reject);
        return;
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchBuffer(res.headers.location).then(resolve).catch(reject);
        return;
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function extractImageUrl(html) {
  const m = html.match(/"image":"(https:\/\/store\.storeimages\.cdn-apple\.com[^"]+)"/);
  if (m) return m[1].replace(/\\u0026/g, '&');
  const m2 = html.match(/https:\/\/store\.storeimages\.cdn-apple\.com\/1\/as-images\.apple\.com\/is\/[A-Z0-9]+ref\?wid=4000[^"'\s]+/);
  return m2 ? m2[0].replace(/&amp;/g, '&') : null;
}

async function main() {
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const cache = new Map();
  const failed = [];
  let ok = 0;

  for (const [productId, meta] of Object.entries(SOURCES)) {
    const dest = path.join(outDir, `${productId}.png`);
    const webPath = `/produtos/pulseiras/${productId}.png`;

    if (meta.share) {
      const srcPath = path.join(outDir, `${meta.share}.png`);
      if (!fs.existsSync(srcPath)) {
        failed.push({ productId, reason: `shared source missing: ${meta.share}` });
        continue;
      }
      fs.copyFileSync(srcPath, dest);
      const p = config.products.find((x) => x.id === productId);
      if (p) p.image = webPath;
      console.log('OK (shared)', productId, '←', meta.share);
      ok += 1;
      continue;
    }

    let imageUrl = cache.get(meta.url);
    if (!imageUrl) {
      try {
        const html = await fetchText(meta.url);
        imageUrl = extractImageUrl(html);
        if (imageUrl) cache.set(meta.url, imageUrl);
      } catch (e) {
        failed.push({ productId, reason: `fetch page: ${e.message}`, url: meta.url });
        continue;
      }
    }

    if (!imageUrl) {
      failed.push({ productId, reason: 'no image in page', url: meta.url });
      continue;
    }

    try {
      const jpeg = await fetchBuffer(imageUrl);
      const tmpJpg = path.join(outDir, `${productId}.jpg`);
      fs.writeFileSync(tmpJpg, jpeg);
      execSync(`sips -s format png "${tmpJpg}" --out "${dest}"`, { stdio: 'pipe' });
      fs.unlinkSync(tmpJpg);
      const p = config.products.find((x) => x.id === productId);
      if (p) p.image = webPath;
      console.log('OK', productId);
      console.log('   source:', meta.note);
      console.log('   url:', imageUrl);
      ok += 1;
    } catch (e) {
      failed.push({ productId, reason: `download: ${e.message}`, url: imageUrl });
    }
  }

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
  console.log(`\n${ok} fotos baixadas/atualizadas.`);
  if (failed.length) {
    console.warn('\nFalhas:');
    failed.forEach((f) => console.warn(` - ${f.productId}: ${f.reason}`));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
