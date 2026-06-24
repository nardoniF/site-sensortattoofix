#!/usr/bin/env node
/**
 * Gera SVG customizado por produto agregado (película / pulseira).
 * Uso: node scripts/generate-product-images.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/store-config.json'), 'utf8'));
const outDir = path.join(ROOT, 'produtos');

const BAND_COLORS = {
  cinza: ['#6b7280', '#4b5563', '#374151'],
  'azul escuro': ['#1e40af', '#1e3a8a', '#172554'],
  preta: ['#2a2a2a', '#111111', '#000000'],
  branca: ['#f8fafc', '#e2e8f0', '#cbd5e1'],
  creme: ['#f5f0e6', '#e8dcc8', '#d4c4a8'],
  'rose gold': ['#e8b4a0', '#d4a574', '#b8860b'],
  verde: ['#059669', '#047857', '#065f46'],
  'verde oliva': ['#65a30d', '#4d7c0f', '#365314'],
  grafite: ['#9ca3af', '#6b7280', '#374151']
};

const MESH_METAL = ['#d1d5db', '#9ca3af', '#4b5563'];

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function wrapLines(text, maxLen) {
  const words = String(text || '').split(/\s+/);
  const lines = [];
  let line = '';
  words.forEach((w) => {
    const next = line ? `${line} ${w}` : w;
    if (next.length > maxLen && line) {
      lines.push(line);
      line = w;
    } else {
      line = next;
    }
  });
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

function peliculaShape(product) {
  const shape = product.compatibility?.shape || '';
  const id = product.id || '';
  if (shape === 'round' || id.includes('round') || id.includes('gtr') || id.includes('gw3') || id.includes('huawei')) {
    return 'round';
  }
  if (shape === 'squircle' || id.includes('apple')) return 'squircle';
  return 'rect';
}

function peliculaCaption(product) {
  const filmType = product.filmType || (product.packaging === 'box' ? 'cerâmica' : 'membrana flexível');
  const sizeMatch = String(product.name || '').match(/\(([^)]+)\)/);
  const size = sizeMatch ? sizeMatch[1].trim() : '';
  return {
    header: `PELÍCULA · ${String(filmType).toUpperCase()}`,
    line1: `Película · ${filmType}`,
    line2: size
  };
}

function peliculaSvg(product) {
  const shape = peliculaShape(product);
  const { header, line1, line2 } = peliculaCaption(product);
  const uid = product.id.replace(/[^a-z0-9]/gi, '');
  const isCeramic = /cer[aâ]m/i.test(product.filmType || '') || product.packaging === 'box';

  let screen = '';
  if (shape === 'round') {
    screen = `
      <circle cx="160" cy="138" r="58" fill="#0f172a" stroke="#334155" stroke-width="3"/>
      <circle cx="160" cy="138" r="52" fill="url(#screen${uid})"/>
      <circle cx="160" cy="138" r="52" fill="none" stroke="url(#glass${uid})" stroke-width="4" opacity="0.85"/>
      <ellipse cx="145" cy="120" rx="18" ry="10" fill="#fff" opacity="0.12"/>`;
  } else if (shape === 'squircle') {
    screen = `
      <rect x="102" y="80" width="116" height="116" rx="28" fill="#0f172a" stroke="#334155" stroke-width="3"/>
      <rect x="108" y="86" width="104" height="104" rx="24" fill="url(#screen${uid})"/>
      <rect x="108" y="86" width="104" height="104" rx="24" fill="none" stroke="url(#glass${uid})" stroke-width="4" opacity="0.85"/>
      <ellipse cx="130" cy="108" rx="22" ry="12" fill="#fff" opacity="0.12"/>`;
  } else {
    screen = `
      <rect x="98" y="88" width="124" height="100" rx="14" fill="#0f172a" stroke="#334155" stroke-width="3"/>
      <rect x="104" y="94" width="112" height="88" rx="10" fill="url(#screen${uid})"/>
      <rect x="104" y="94" width="112" height="88" rx="10" fill="none" stroke="url(#glass${uid})" stroke-width="4" opacity="0.85"/>
      <ellipse cx="128" cy="112" rx="20" ry="10" fill="#fff" opacity="0.12"/>`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" role="img" aria-label="${esc(product.name)}">
  <defs>
    <linearGradient id="bg${uid}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
    <linearGradient id="screen${uid}" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1e3a5f"/>
      <stop offset="100%" stop-color="#0c4a6e"/>
    </linearGradient>
    <linearGradient id="glass${uid}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${isCeramic ? '#fde68a' : '#a5f3fc'}" stop-opacity="0.9"/>
      <stop offset="50%" stop-color="${isCeramic ? '#fbbf24' : '#67e8f9'}" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="${isCeramic ? '#f59e0b' : '#22d3ee'}" stop-opacity="0.8"/>
    </linearGradient>
  </defs>
  <rect width="320" height="320" rx="20" fill="url(#bg${uid})"/>
  <text x="160" y="36" text-anchor="middle" fill="#2dd4bf" font-family="system-ui,sans-serif" font-size="10" font-weight="700" letter-spacing="0.8">${esc(header)}</text>
  ${screen}
  <rect x="24" y="218" width="272" height="82" rx="12" fill="#000" fill-opacity="0.25"/>
  <text x="160" y="246" text-anchor="middle" fill="#e2e8f0" font-family="system-ui,sans-serif" font-size="12" font-weight="700">${esc(line1)}</text>
  ${line2 ? `<text x="160" y="266" text-anchor="middle" fill="#94a3b8" font-family="system-ui,sans-serif" font-size="11" font-weight="600">${esc(line2)}</text>` : ''}
  <text x="160" y="302" text-anchor="middle" fill="#64748b" font-family="system-ui,sans-serif" font-size="10">R$ 20,00 · Sensor Tattoo Fix</text>
</svg>`;
}

function bandGradient(colorKey, uid, style) {
  const stops = style === 'milanese'
    ? MESH_METAL
    : (BAND_COLORS[colorKey] || BAND_COLORS.cinza);
  return `
    <linearGradient id="band${uid}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${stops[0]}"/>
      <stop offset="50%" stop-color="${stops[1]}"/>
      <stop offset="100%" stop-color="${stops[2]}"/>
    </linearGradient>`;
}

function pulseiraCaption(product) {
  const style = product.bandStyle || 'sport';
  const color = product.color || '';
  const materials = {
    'sport-soft': 'Soft Lisa · silicone',
    'sport-air': 'Sport respirável · silicone',
    milanese: 'Milanese Loop · aço',
    ocean: 'Ocean Band · silicone',
    'link-luxo': 'Link de luxo · aço',
    trail: 'Trail Loop · nylon',
    alpine: 'Alpine Loop · nylon'
  };
  const sizeMatch = String(product.name || '').match(/\(([^)]+)\)/);
  const size = sizeMatch ? sizeMatch[1].replace(/\s*mm/g, ' mm') : '';
  const line1 = materials[style] || materials['sport-soft'];
  const line2 = [color, size].filter(Boolean).join(' · ');
  return { line1, line2 };
}

function pulseiraSvg(product) {
  const uid = product.id.replace(/[^a-z0-9]/gi, '');
  const style = product.bandStyle || 'sport';
  const colorKey = product.color || 'cinza';
  const isUltra = String(product.id || '').includes('ultra');
  const { line1, line2 } = pulseiraCaption(product);
  const watchR = isUltra ? 40 : 34;
  const watchInner = isUltra ? 33 : 28;

  let bandExtra = '';
  if (style === 'milanese') {
    bandExtra = `
      <path d="M108 118 Q108 200 160 228 Q212 200 212 118" fill="none" stroke="url(#band${uid})" stroke-width="18" stroke-linecap="round" stroke-dasharray="2 4" opacity="0.95"/>
      <path d="M114 130 Q160 145 206 130" fill="none" stroke="#fff" stroke-width="1.2" opacity="0.35"/>
      <circle cx="198" cy="210" r="7" fill="url(#band${uid})" stroke="#e5e7eb" stroke-width="1"/>`;
  } else if (style === 'ocean') {
    bandExtra = `
      <path d="M108 118 Q108 200 160 228 Q212 200 212 118" fill="none" stroke="url(#band${uid})" stroke-width="22" stroke-linecap="round"/>
      <path d="M115 140 Q160 155 205 140" fill="none" stroke="#fff" stroke-width="1.2" opacity="0.18"/>
      <path d="M112 165 Q160 180 208 165" fill="none" stroke="#fff" stroke-width="1" opacity="0.14"/>
      <path d="M110 190 Q160 205 210 190" fill="none" stroke="#fff" stroke-width="1" opacity="0.12"/>`;
  } else if (style === 'link-luxo') {
    bandExtra = `
      <path d="M108 118 Q108 200 160 228 Q212 200 212 118" fill="none" stroke="url(#band${uid})" stroke-width="16" stroke-linecap="round"/>
      <rect x="152" y="112" width="16" height="12" rx="2" fill="url(#band${uid})"/>
      <rect x="152" y="200" width="16" height="12" rx="2" fill="url(#band${uid})"/>`;
  } else if (style === 'trail' || style === 'alpine') {
    bandExtra = `
      <path d="M108 118 Q108 200 160 228 Q212 200 212 118" fill="none" stroke="url(#band${uid})" stroke-width="20" stroke-linecap="round" stroke-dasharray="6 3"/>`;
  } else {
    bandExtra = `
      <ellipse cx="160" cy="118" rx="52" ry="18" fill="url(#band${uid})" opacity="0.95"/>
      <path d="M108 118 Q108 200 160 228 Q212 200 212 118" fill="none" stroke="url(#band${uid})" stroke-width="22" stroke-linecap="round"/>
      <rect x="198" y="198" width="14" height="22" rx="4" fill="url(#band${uid})" opacity="0.9"/>`;
  }

  const styleLabels = {
    milanese: 'MILANESE LOOP',
    ocean: 'OCEAN BAND',
    'link-luxo': 'LINK DE LUXO',
    trail: 'TRAIL LOOP',
    alpine: 'ALPINE LOOP',
    'sport-air': 'SPORT RESPIRÁVEL'
  };
  const styleLabel = styleLabels[style] || (isUltra ? 'SOFT LISA ULTRA' : 'SOFT LISA');
  const ultraBadge = isUltra
    ? '<rect x="118" y="44" width="84" height="18" rx="9" fill="#f97316" opacity="0.9"/><text x="160" y="57" text-anchor="middle" fill="#111" font-family="system-ui,sans-serif" font-size="9" font-weight="800">ULTRA 49mm</text>'
    : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" role="img" aria-label="${esc(product.name)}">
  <defs>
    <linearGradient id="bg${uid}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1a1d24"/>
      <stop offset="100%" stop-color="#0d0f14"/>
    </linearGradient>
    ${bandGradient(colorKey, uid, style)}
    <linearGradient id="accent${uid}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#5eead4"/>
      <stop offset="100%" stop-color="#2dd4bf"/>
    </linearGradient>
  </defs>
  <rect width="320" height="320" rx="20" fill="url(#bg${uid})"/>
  <text x="160" y="36" text-anchor="middle" fill="#2dd4bf" font-family="system-ui,sans-serif" font-size="10" font-weight="700" letter-spacing="1">${styleLabel}</text>
  ${ultraBadge}
  <rect x="148" y="108" width="24" height="20" rx="6" fill="#1e293b" stroke="url(#accent${uid})" stroke-width="1.5"/>
  <circle cx="160" cy="138" r="${watchR}" fill="#0f172a" stroke="${isUltra ? '#f97316' : '#334155'}" stroke-width="${isUltra ? 3 : 2}"/>
  <circle cx="160" cy="138" r="${watchInner}" fill="url(#accent${uid})" opacity="0.08"/>
  ${bandExtra}
  <rect x="24" y="218" width="272" height="82" rx="12" fill="#000" fill-opacity="0.25"/>
  <text x="160" y="246" text-anchor="middle" fill="#e2e8f0" font-family="system-ui,sans-serif" font-size="12" font-weight="700">${esc(line1)}</text>
  <text x="160" y="266" text-anchor="middle" fill="#94a3b8" font-family="system-ui,sans-serif" font-size="11" font-weight="600">${esc(line2)}</text>
  <text x="160" y="302" text-anchor="middle" fill="#64748b" font-family="system-ui,sans-serif" font-size="10">R$ 20,00 · Sensor Tattoo Fix</text>
</svg>`;
}

function ensureFilmTypes(products) {
  (products || []).forEach((p) => {
    if (!String(p.id || '').startsWith('pelicula-')) return;
    p.productType = 'pelicula';
    if (p.packaging === 'box') {
      if (!p.filmType) p.filmType = 'cerâmica';
      if (!p.filmTypeEn) p.filmTypeEn = 'ceramic';
    } else if (p.packaging === 'saquinho' || !p.packaging) {
      if (!p.filmType) p.filmType = 'membrana flexível';
      if (!p.filmTypeEn) p.filmTypeEn = 'flexible membrane';
    }
  });
}

function main() {
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  ensureFilmTypes(config.products);
  const aggregated = (config.products || []).filter((p) => p.aggregated === true);
  let count = 0;
  aggregated.forEach((p) => {
    const isPulseira = p.productType === 'pulseira' || String(p.id || '').startsWith('pulseira-');
    const pngPulseira = path.join(ROOT, `produtos/pulseiras/${p.id}.png`);
    if (isPulseira && fs.existsSync(pngPulseira)) {
      return;
    }
    const svg = isPulseira ? pulseiraSvg(p) : peliculaSvg(p);
    const file = path.join(outDir, `${p.id}.svg`);
    fs.writeFileSync(file, svg, 'utf8');
    if (isPulseira) {
      if (!String(p.image || '').includes('/produtos/pulseiras/')) {
        p.image = `/produtos/${p.id}.svg`;
      }
    } else if (!String(p.image || '').includes('/produtos/peliculas/')) {
      p.image = `/produtos/${p.id}.svg`;
    }
    count += 1;
  });
  fs.writeFileSync(path.join(ROOT, 'data/store-config.json'), JSON.stringify(config, null, 2) + '\n', 'utf8');
  console.log(`Geradas ${count} imagens em produtos/ e store-config.json atualizado.`);
}

main();
