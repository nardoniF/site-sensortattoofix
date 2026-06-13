#!/usr/bin/env node
/**
 * Copia fotos reais para produtos/pulseiras/
 *
 * 1) Coloque IMG_3082.jpg … IMG_3091.jpg em produtos/pulseiras/incoming/
 * 2) node scripts/import-band-photos.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const styles = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/band-styles.json'), 'utf8'));
const incoming = path.join(ROOT, 'produtos/pulseiras/incoming');
const outDir = path.join(ROOT, 'produtos/pulseiras');

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const fileToStyle = new Map();
Object.entries(styles).forEach(([key, meta]) => {
  (meta.importFiles || []).forEach((file, idx) => {
    if (!fileToStyle.has(file) || idx === 0) fileToStyle.set(file, { key, image: meta.image });
  });
});

let copied = 0;
if (!fs.existsSync(incoming)) {
  console.log('Crie a pasta produtos/pulseiras/incoming/ e coloque as fotos IMG_*.jpg');
  process.exit(0);
}

for (const [file, { image }] of fileToStyle) {
  const src = path.join(incoming, file);
  if (!fs.existsSync(src)) continue;
  const dest = path.join(ROOT, image.replace(/^\//, ''));
  fs.copyFileSync(src, dest);
  console.log('OK', file, '→', path.relative(ROOT, dest));
  copied += 1;
}

console.log(copied ? `Importadas ${copied} foto(s).` : 'Nenhuma foto encontrada em incoming/.');
