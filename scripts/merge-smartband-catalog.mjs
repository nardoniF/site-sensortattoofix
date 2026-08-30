#!/usr/bin/env node
/**
 * Importa smartbands faltantes no smartwatchCatalog, evitando duplicatas por nome normalizado.
 * Uso: node scripts/merge-smartband-catalog.mjs [--dry-run]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const configPath = path.join(ROOT, 'data/store-config.json');
const dryRun = process.argv.includes('--dry-run');

const OUTRO = 'Outro modelo…';

function normLabel(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\w+\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function baseLabel(s) {
  return normLabel(s).replace(/\b\d+(?:\.\d+)?\s*mm\b/g, '').replace(/\s+/g, ' ').trim();
}

function parseSizeMm(label, explicit) {
  if (explicit != null && Number.isFinite(Number(explicit)) && Number(explicit) > 0) return Number(explicit);
  const m = String(label || '').match(/\((\d+(?:\.\d+)?)\s*mm\)/i);
  return m ? Number(m[1]) : null;
}

function makeRow(label, kind, sizeMm = null, kinds = null) {
  const size = parseSizeMm(label, sizeMm);
  const row = {
    label,
    model: label,
    sizeMm: size,
    kind: kind || 'smartband',
    sensorMm: null
  };
  if (Array.isArray(kinds) && kinds.length) row.kinds = kinds;
  return row;
}

/** @type {{ brand: string, label: string, kind?: string, sizeMm?: number|null, kinds?: string[] }[]} */
const ADDITIONS = [
  // —— Xiaomi / Redmi ——
  { brand: 'Xiaomi', label: 'Xiaomi Mi Band 1 (25mm)', sizeMm: 25 },
  { brand: 'Xiaomi', label: 'Xiaomi Mi Band 1S (25mm)', sizeMm: 25 },
  { brand: 'Xiaomi', label: 'Xiaomi Mi Band 2 (25mm)', sizeMm: 25 },
  { brand: 'Xiaomi', label: 'Xiaomi Mi Band 3 (39mm)', sizeMm: 39 },
  { brand: 'Xiaomi', label: 'Xiaomi Mi Band 4 (36mm)', sizeMm: 36 },
  { brand: 'Xiaomi', label: 'Xiaomi Smart Band 10 (25mm)', sizeMm: 25 },
  { brand: 'Xiaomi', label: 'Xiaomi Smart Band 10 Pro (25mm)', sizeMm: 25 },
  { brand: 'Xiaomi', label: 'Redmi Smart Band (23mm)', sizeMm: 23 },
  { brand: 'Xiaomi', label: 'Redmi Smart Band 2 (24mm)', sizeMm: 24 },
  { brand: 'Xiaomi', label: 'Redmi Smart Band Pro (33mm)', sizeMm: 33 },

  // —— Samsung ——
  { brand: 'Samsung', label: 'Samsung Gear Fit 2 Pro (24mm)', sizeMm: 24 },
  { brand: 'Samsung', label: 'Samsung Galaxy Fit (24mm)', sizeMm: 24 },

  // —— Garmin ——
  { brand: 'Garmin', label: 'Garmin vivosmart (21mm)', sizeMm: 21 },
  { brand: 'Garmin', label: 'Garmin vivosmart HR (21mm)', sizeMm: 21 },
  { brand: 'Garmin', label: 'Garmin vivosmart HR+ (21mm)', sizeMm: 21 },
  { brand: 'Garmin', label: 'Garmin vivosmart 3 (21mm)', sizeMm: 21 },
  { brand: 'Garmin', label: 'Garmin vivosmart 4 (21mm)', sizeMm: 21 },
  { brand: 'Garmin', label: 'Garmin vivosport (19mm)', sizeMm: 19 },
  { brand: 'Garmin', label: 'Garmin vivofit (25mm)', sizeMm: 25 },
  { brand: 'Garmin', label: 'Garmin vivofit 2 (25mm)', sizeMm: 25 },
  { brand: 'Garmin', label: 'Garmin vivofit 3 (23mm)', sizeMm: 23 },
  { brand: 'Garmin', label: 'Garmin vivofit Jr. (25mm)', sizeMm: 25 },
  { brand: 'Garmin', label: 'Garmin vivofit Jr. 2 (25mm)', sizeMm: 25 },
  { brand: 'Garmin', label: 'Garmin vivofit Jr. 3 (25mm)', sizeMm: 25 },
  { brand: 'Garmin', label: 'Garmin ciRQA (22mm)', sizeMm: 22 },

  // —— Fitbit (pulseiras; Versa/Sense ficam só em smartwatch) ——
  { brand: 'Fitbit', label: 'Fitbit Flex (15mm)', sizeMm: 15 },
  { brand: 'Fitbit', label: 'Fitbit Flex 2 (15mm)', sizeMm: 15 },
  { brand: 'Fitbit', label: 'Fitbit Alta (15mm)', sizeMm: 15 },
  { brand: 'Fitbit', label: 'Fitbit Alta HR (15mm)', sizeMm: 15 },
  { brand: 'Fitbit', label: 'Fitbit Charge (21mm)', sizeMm: 21 },
  { brand: 'Fitbit', label: 'Fitbit Charge HR (21mm)', sizeMm: 21 },
  { brand: 'Fitbit', label: 'Fitbit Charge 2 (21mm)', sizeMm: 21 },
  { brand: 'Fitbit', label: 'Fitbit Charge 3 (21mm)', sizeMm: 21 },
  { brand: 'Fitbit', label: 'Fitbit Inspire (20mm)', sizeMm: 20 },
  { brand: 'Fitbit', label: 'Fitbit Inspire HR (20mm)', sizeMm: 20 },
  { brand: 'Fitbit', label: 'Fitbit Inspire 2 (20mm)', sizeMm: 20 },
  { brand: 'Fitbit', label: 'Fitbit Ace (20mm)', sizeMm: 20 },
  { brand: 'Fitbit', label: 'Fitbit Ace 2 (20mm)', sizeMm: 20 },
  { brand: 'Fitbit', label: 'Fitbit Force (21mm)', sizeMm: 21 },

  // —— Huawei ——
  { brand: 'Huawei', label: 'Huawei Band 2 (20mm)', sizeMm: 20 },
  { brand: 'Huawei', label: 'Huawei Band 2 Pro (20mm)', sizeMm: 20 },
  { brand: 'Huawei', label: 'Huawei Band 3 (20mm)', sizeMm: 20 },
  { brand: 'Huawei', label: 'Huawei Band 3 Pro (20mm)', sizeMm: 20 },
  { brand: 'Huawei', label: 'Huawei Band 3e (20mm)', sizeMm: 20 },
  { brand: 'Huawei', label: 'Huawei Band 4 (20mm)', sizeMm: 20 },
  { brand: 'Huawei', label: 'Huawei Band 4 Pro (20mm)', sizeMm: 20 },
  { brand: 'Huawei', label: 'Huawei Band 6 Pro (25mm)', sizeMm: 25 },
  { brand: 'Huawei', label: 'Huawei TalkBand B1 (20mm)', sizeMm: 20 },
  { brand: 'Huawei', label: 'Huawei TalkBand B2 (20mm)', sizeMm: 20 },
  { brand: 'Huawei', label: 'Huawei TalkBand B3 (20mm)', sizeMm: 20 },
  { brand: 'Huawei', label: 'Huawei TalkBand B3 Lite (20mm)', sizeMm: 20 },
  { brand: 'Huawei', label: 'Huawei TalkBand B5 (20mm)', sizeMm: 20 },
  { brand: 'Huawei', label: 'Huawei Color Band A1 (20mm)', sizeMm: 20 },
  { brand: 'Huawei', label: 'Huawei Color Band A2 (20mm)', sizeMm: 20 },

  // —— Honor ——
  { brand: 'Honor', label: 'Honor Band 3 (20mm)', sizeMm: 20 },
  { brand: 'Honor', label: 'Honor Band 4 (20mm)', sizeMm: 20 },
  { brand: 'Honor', label: 'Honor Band 4 Running Version (20mm)', sizeMm: 20 },
  { brand: 'Honor', label: 'Honor Band 5 (20mm)', sizeMm: 20 },
  { brand: 'Honor', label: 'Honor Band 5i (20mm)', sizeMm: 20 },
  { brand: 'Honor', label: 'Honor Band 5 Sport (20mm)', sizeMm: 20 },
  { brand: 'Honor', label: 'Honor Band 10 (25mm)', sizeMm: 25 },
  { brand: 'Honor', label: 'Honor Band A1 (20mm)', sizeMm: 20 },
  { brand: 'Honor', label: 'Honor Band A2 (20mm)', sizeMm: 20 },

  // —— Amazfit ——
  { brand: 'Amazfit', label: 'Amazfit Band 2 (20mm)', sizeMm: 20 },
  { brand: 'Amazfit', label: 'Amazfit Cor (31mm)', sizeMm: 31 },
  { brand: 'Amazfit', label: 'Amazfit Health Band 1S (20mm)', sizeMm: 20 },
  { brand: 'Amazfit', label: 'Amazfit Helio Strap (34mm)', sizeMm: 34 },
  { brand: 'Amazfit', label: 'Amazfit Helio Strap Pro (34mm)', sizeMm: 34 },
  { brand: 'Amazfit', label: 'Amazfit UP (20mm)', sizeMm: 20 },

  // —— Whoop (sem tela) ——
  { brand: 'Whoop', label: 'Whoop 1.0 (33mm)', sizeMm: 33 },
  { brand: 'Whoop', label: 'Whoop 2.0 (33mm)', sizeMm: 33 },
  { brand: 'Whoop', label: 'Whoop 3.0 (33mm)', sizeMm: 33 },
  { brand: 'Whoop', label: 'Whoop 4.0 (33mm)', sizeMm: 33 },
  { brand: 'Whoop', label: 'Whoop 5.0 (33mm)', sizeMm: 33 },
  { brand: 'Whoop', label: 'Whoop MG (33mm)', sizeMm: 33 },

  // —— Oura (anel) ——
  { brand: 'Oura', label: 'Oura Ring Gen 1 (13mm)', sizeMm: 13 },
  { brand: 'Oura', label: 'Oura Ring Gen 2 (13mm)', sizeMm: 13 },
  { brand: 'Oura', label: 'Oura Ring Gen 3 Heritage (13mm)', sizeMm: 13 },
  { brand: 'Oura', label: 'Oura Ring Gen 3 Horizon (13mm)', sizeMm: 13 },
  { brand: 'Oura', label: 'Oura Ring 4 (13mm)', sizeMm: 13 },
  { brand: 'Oura', label: 'Oura Ring 5 (13mm)', sizeMm: 13 },

  // —— Realme / Oppo / OnePlus ——
  { brand: 'Realme', label: 'Realme Band (16mm)', sizeMm: 16 },
  { brand: 'Realme', label: 'Realme Band 2 (24mm)', sizeMm: 24 },
  { brand: 'Oppo', label: 'Oppo Band (23mm)', sizeMm: 23 },
  { brand: 'Oppo', label: 'Oppo Band Style (23mm)', sizeMm: 23 },
  { brand: 'Oppo', label: 'Oppo Band 2 (23mm)', sizeMm: 23 },
  { brand: 'OnePlus', label: 'OnePlus Band (23mm)', sizeMm: 23 },

  // —— Polar ——
  { brand: 'Polar', label: 'Polar Loop (20mm)', sizeMm: 20 },
  { brand: 'Polar', label: 'Polar Loop 2 (20mm)', sizeMm: 20 },
  { brand: 'Polar', label: 'Polar A360 (33mm)', sizeMm: 33 },
  { brand: 'Polar', label: 'Polar A370 (33mm)', sizeMm: 33 },
  { brand: 'Polar', label: 'Polar Ignite (43mm)', sizeMm: 43 },
  { brand: 'Polar', label: 'Polar Ignite 2 (43mm)', sizeMm: 43 },
  { brand: 'Polar', label: 'Polar Ignite 3 (43mm)', sizeMm: 43 },

  // —— Legado ——
  { brand: 'Misfit', label: 'Misfit Shine (30mm)', sizeMm: 30 },
  { brand: 'Misfit', label: 'Misfit Shine 2 (30mm)', sizeMm: 30 },
  { brand: 'Misfit', label: 'Misfit Ray (12mm)', sizeMm: 12 },
  { brand: 'Misfit', label: 'Misfit Flash (30mm)', sizeMm: 30 },
  { brand: 'Misfit', label: 'Misfit Speedo Shine (30mm)', sizeMm: 30 },
  { brand: 'Jawbone', label: 'Jawbone UP (14mm)', sizeMm: 14 },
  { brand: 'Jawbone', label: 'Jawbone UP2 (14mm)', sizeMm: 14 },
  { brand: 'Jawbone', label: 'Jawbone UP3 (14mm)', sizeMm: 14 },
  { brand: 'Jawbone', label: 'Jawbone UP4 (14mm)', sizeMm: 14 },
  { brand: 'Jawbone', label: 'Jawbone UP Move (30mm)', sizeMm: 30 },
  { brand: 'Withings', label: 'Withings Pulse (18mm)', sizeMm: 18 },
  { brand: 'Withings', label: 'Withings Move (38mm)', sizeMm: 38 },
  { brand: 'Withings', label: 'Withings ScanWatch (42mm)', sizeMm: 42 },
  { brand: 'Suunto', label: 'Suunto 3 Fitness (41mm)', sizeMm: 41 },
  { brand: 'Coros', label: 'Coros Pace (47mm)', sizeMm: 47 }
];

/** Modelos já cadastrados como smartwatch na fronteira — aparecem também em smartband */
const BORDERLINE_LABELS = [
  'Huawei Watch Fit (30mm)',
  'Huawei Watch Fit 2 (33mm)',
  'Huawei Watch Fit 3 (36mm)'
];

function flatModelsFromCatalog(catalog) {
  const labels = [];
  const seen = new Set();
  Object.keys(catalog || {}).sort().forEach((brand) => {
    (catalog[brand] || []).forEach((row) => {
      if (!row?.label || row._brandPlaceholder || seen.has(row.label)) return;
      seen.add(row.label);
      labels.push(row.label);
    });
  });
  if (!seen.has(OUTRO)) labels.push(OUTRO);
  return labels;
}

function indexCatalog(catalog) {
  const byLabel = new Map();
  const byBase = new Map();
  for (const [brand, rows] of Object.entries(catalog || {})) {
    for (const row of rows || []) {
      if (!row?.label || row._brandPlaceholder) continue;
      byLabel.set(normLabel(row.label), { brand, row });
      const b = baseLabel(row.label);
      if (!byBase.has(b)) byBase.set(b, []);
      byBase.get(b).push({ brand, row });
    }
  }
  return { byLabel, byBase };
}

function existsDuplicate(byLabel, byBase, label) {
  const n = normLabel(label);
  if (byLabel.has(n)) return { reason: 'label equivalente', hit: byLabel.get(n) };
  const b = baseLabel(label);
  for (const hit of byBase.get(b) || []) {
    if (normLabel(hit.row.label) === n) return { reason: 'label equivalente', hit };
  }
  return null;
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const catalog = config.smartwatchCatalog || {};
const { byLabel, byBase } = indexCatalog(catalog);

let added = 0;
let skipped = 0;
let borderline = 0;
const skipLog = [];

for (const item of ADDITIONS) {
  const dup = existsDuplicate(byLabel, byBase, item.label);
  if (dup) {
    skipped++;
    skipLog.push(`SKIP ${item.label} (${dup.reason}: ${dup.hit.row.label})`);
    continue;
  }
  const kind = item.kind || 'smartband';
  const row = makeRow(item.label, kind, item.sizeMm, item.kinds);
  if (!catalog[item.brand]) catalog[item.brand] = [];
  catalog[item.brand].push(row);
  byLabel.set(normLabel(item.label), { brand: item.brand, row });
  const b = baseLabel(item.label);
  if (!byBase.has(b)) byBase.set(b, []);
  byBase.get(b).push({ brand: item.brand, row });
  added++;
}

for (const label of BORDERLINE_LABELS) {
  const hit = byLabel.get(normLabel(label));
  if (!hit) continue;
  const row = hit.row;
  const kinds = Array.isArray(row.kinds) ? [...row.kinds] : [row.kind || 'smartwatch'];
  if (!kinds.includes('smartwatch')) kinds.push('smartwatch');
  if (!kinds.includes('smartband')) kinds.push('smartband');
  row.kinds = [...new Set(kinds)];
  row.kind = row.kind || 'smartwatch';
  borderline++;
}

config.smartwatchCatalog = catalog;
config.smartwatchModels = flatModelsFromCatalog(catalog);

const counts = { smartband: 0, smartwatch: 0, dual: 0 };
for (const rows of Object.values(catalog)) {
  for (const row of rows || []) {
    if (!row?.label || row._brandPlaceholder) continue;
    if (Array.isArray(row.kinds) && row.kinds.includes('smartwatch') && row.kinds.includes('smartband')) counts.dual++;
    else if (row.kind === 'smartband') counts.smartband++;
    else counts.smartwatch++;
  }
}

console.log(JSON.stringify({
  dryRun,
  added,
  skipped,
  borderlineDualKind: borderline,
  totals: counts,
  smartwatchModels: config.smartwatchModels.length
}, null, 2));

if (skipLog.length) {
  console.log('\n--- Pulados (duplicata) ---');
  skipLog.forEach((l) => console.log(l));
}

if (!dryRun) {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
  console.log('\nGravado:', configPath);
}
