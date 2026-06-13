#!/usr/bin/env node
/**
 * Pulseiras: usa SOMENTE os 12 arquivos Pulseira_* aprovados em produtos/pulseiras/fontes/
 * (copiados dos assets do Cursor). Nunca IMG_* nem outras versões antigas.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ASSETS = '/Users/fabionardoni/.cursor/projects/Users-fabionardoni-Projetos-3N20-site-sensortattoofix/assets';
const sourcesDir = path.join(ROOT, 'produtos/pulseiras/fontes');
const outDir = path.join(ROOT, 'produtos/pulseiras');
const configPath = path.join(ROOT, 'data/store-config.json');

/** Únicos arquivos-fonte permitidos (12 imagens limpas do usuário) */
const ALLOWED_FILES = [
  'Pulseira_Apple_Watch_-_Metal_Preta_-_42_44_45_49_2mm-333c5fe8-df99-45f8-802c-8562a787824f.png',
  'Pulseira_Apple_Watch_-_Metal_Rose_-_42_44_45_49_2mm-524b4374-89ba-4f80-9917-7e22a0c98b36.png',
  'Pulseira_Apple_Watch_-_Metal_Rose_-_42_44_45_49mm-d378fe02-107e-4db8-9da4-202bc9c4fda4.png',
  'Pulseira_De_Silicone_Para_Samsung_Galaxy_Watch_8_Sport__Tamanhos_40mm__44mm__46mm_-24ab37c2-b8c7-4510-b37e-78c5fe32d40a.png',
  'Pulseira_para_AppleWatch__BRANCA_Silicone_42_44_45_49-657140d3-8d4d-4640-a850-f0dfce9acd4b.png',
  'Pulseira_para_AppleWatch__AZUL_Silicone_42_44_45_49-21505f9a-e0ef-4355-8bc6-43f82057b476.png',
  'Pulseira_para_AppleWatch__PRETA_Silicone_42_44_45_49-4ebb2500-6b74-484d-b720-9559b0f277e9.png',
  'Pulseira_para_AppleWatch_Silicone_CINZA__42_44_45_49-d64202df-128f-4527-b52b-e8a55cec0415.png',
  'Pulseira_Silicone_Verde_escuro_para_Apple_Watch_42_44_45_49_-4d4cb622-da0c-4196-8074-2a2756f03a88.png',
  'Pulseira_de_Silicone_para_Galaxy_Watch_4_5_6_7-99625e55-ec29-4ce3-8814-4668f9d82e74.png',
  'Pulseira_Fecho_Silicone_Respira_vel_Sport_Compati_vel_Com_Galaxy_Watch_7_Ultra_47mm_Cor_Preto-e395d643-bc16-4e77-8b0a-f7ddc0836a43.png',
  'Pulseira_Silicone_Branca_escuro_para_Apple_Watch_42_44_45_49_-f7409e4e-440e-415c-9b31-00c5ffb5f907.png'
];

/** SKU → arquivo exato em ALLOWED_FILES */
const MAP = {
  'pulseira-mesh-preta-42-49': 'Pulseira_Apple_Watch_-_Metal_Preta_-_42_44_45_49_2mm-333c5fe8-df99-45f8-802c-8562a787824f.png',
  'pulseira-mesh-rose-38-41': 'Pulseira_Apple_Watch_-_Metal_Rose_-_42_44_45_49_2mm-524b4374-89ba-4f80-9917-7e22a0c98b36.png',
  'pulseira-ocean-branca-42-49': 'Pulseira_Silicone_Branca_escuro_para_Apple_Watch_42_44_45_49_-f7409e4e-440e-415c-9b31-00c5ffb5f907.png',
  'pulseira-ocean-verde-42-49': 'Pulseira_Silicone_Verde_escuro_para_Apple_Watch_42_44_45_49_-4d4cb622-da0c-4196-8074-2a2756f03a88.png',
  'pulseira-sport-air-preta-42-49': 'Pulseira_Fecho_Silicone_Respira_vel_Sport_Compati_vel_Com_Galaxy_Watch_7_Ultra_47mm_Cor_Preto-e395d643-bc16-4e77-8b0a-f7ddc0836a43.png',
  'pulseira-sport-azul-40-45': 'Pulseira_para_AppleWatch__AZUL_Silicone_42_44_45_49-21505f9a-e0ef-4355-8bc6-43f82057b476.png',
  'pulseira-sport-branca-42-49': 'Pulseira_para_AppleWatch__BRANCA_Silicone_42_44_45_49-657140d3-8d4d-4640-a850-f0dfce9acd4b.png',
  'pulseira-sport-cinza-38-41': 'Pulseira_para_AppleWatch_Silicone_CINZA__42_44_45_49-d64202df-128f-4527-b52b-e8a55cec0415.png',
  'pulseira-sport-creme-41-45': 'Pulseira_De_Silicone_Para_Samsung_Galaxy_Watch_8_Sport__Tamanhos_40mm__44mm__46mm_-24ab37c2-b8c7-4510-b37e-78c5fe32d40a.png',
  'pulseira-sport-preta-42-49': 'Pulseira_para_AppleWatch__PRETA_Silicone_42_44_45_49-4ebb2500-6b74-484d-b720-9559b0f277e9.png',
  'pulseira-sport-samsung-gw4-7': 'Pulseira_de_Silicone_para_Galaxy_Watch_4_5_6_7-99625e55-ec29-4ce3-8814-4668f9d82e74.png'
};

const SVG_ONLY = [
  'pulseira-link-grafite-42-49',
  'pulseira-trail-preta-ultra-49',
  'pulseira-alpine-verde-49'
];

function resolveSrc(filename) {
  const inRepo = path.join(sourcesDir, filename);
  if (fs.existsSync(inRepo)) return inRepo;
  const inAssets = path.join(ASSETS, filename);
  if (fs.existsSync(inAssets)) return inAssets;
  return null;
}

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(sourcesDir, { recursive: true });

// Limpa fontes antigas
fs.readdirSync(sourcesDir).forEach((f) => {
  if (f === '.gitkeep') return;
  fs.unlinkSync(path.join(sourcesDir, f));
});

// Copia só os 12 permitidos para fontes/
ALLOWED_FILES.forEach((filename) => {
  const src = resolveSrc(filename);
  if (!src) {
    console.warn('FALTA na pasta assets:', filename);
    return;
  }
  fs.copyFileSync(src, path.join(sourcesDir, filename));
});

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
let ok = 0;
const miss = [];

Object.entries(MAP).forEach(([productId, filename]) => {
  const src = path.join(sourcesDir, filename);
  const dest = path.join(outDir, `${productId}.png`);
  if (!fs.existsSync(src)) {
    miss.push(productId);
    return;
  }
  fs.copyFileSync(src, dest);
  const p = config.products.find((x) => x.id === productId);
  if (p) p.image = `/produtos/pulseiras/${productId}.png`;
  console.log('OK', productId, '←', filename);
  ok += 1;
});

SVG_ONLY.forEach((productId) => {
  const png = path.join(outDir, `${productId}.png`);
  if (fs.existsSync(png)) fs.unlinkSync(png);
  const p = config.products.find((x) => x.id === productId);
  if (p) p.image = `/produtos/${productId}.svg`;
  console.log('SVG', productId);
});

fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
console.log(`\n${ok} pulseiras publicadas (${ALLOWED_FILES.length} fontes únicas).`);
if (miss.length) console.warn('Sem foto:', miss.join(', '));
