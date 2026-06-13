#!/usr/bin/env node
/**
 * Baixa placeholders royalty-free (Pexels) até você importar as fotos reais.
 * node scripts/fetch-band-placeholders.js
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.join(__dirname, '..');
const outDir = path.join(ROOT, 'produtos/pulseiras');
const styles = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/band-styles.json'), 'utf8'));

/** Pexels — licença gratuita https://www.pexels.com/license/ */
const PLACEHOLDERS = {
  ocean: 'https://images.pexels.com/photos/13991170/pexels-photo-13991170.jpeg?auto=compress&cs=tinysrgb&w=900',
  milanese: 'https://images.pexels.com/photos/437037/pexels-photo-437037.jpeg?auto=compress&cs=tinysrgb&w=900',
  'sport-air': 'https://images.pexels.com/photos/393047/pexels-photo-393047.jpeg?auto=compress&cs=tinysrgb&w=900',
  'link-luxo': 'https://images.pexels.com/photos/876466/pexels-photo-876466.jpeg?auto=compress&cs=tinysrgb&w=900',
  trail: 'https://images.pexels.com/photos/437037/pexels-photo-437037.jpeg?auto=compress&cs=tinysrgb&w=900',
  alpine: 'https://images.pexels.com/photos/13991170/pexels-photo-13991170.jpeg?auto=compress&cs=tinysrgb&w=900',
  'sport-soft': 'https://images.pexels.com/photos/437037/pexels-photo-437037.jpeg?auto=compress&cs=tinysrgb&w=900'
};

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, { headers: { 'User-Agent': 'SensorTattooFix/1.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        return download(res.headers.location, dest).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        return reject(new Error(`${url} → HTTP ${res.statusCode}`));
      }
      res.pipe(file);
      file.on('finish', () => file.close(() => resolve(dest)));
    }).on('error', reject);
  });
}

async function main() {
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  for (const [key, meta] of Object.entries(styles)) {
    const url = PLACEHOLDERS[key];
    const dest = path.join(ROOT, meta.image.replace(/^\//, ''));
    if (fs.existsSync(dest) && fs.statSync(dest).size > 5000) {
      console.log('skip', path.basename(dest));
      continue;
    }
    try {
      await download(url, dest);
      console.log('ok', path.basename(dest));
    } catch (e) {
      console.warn('fail', key, e.message);
    }
  }
}

main();
