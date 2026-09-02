#!/usr/bin/env node
/**
 * Preenche nameDe/nameEs/namePl (e descrições curtas) em produtos com nameEn.
 * Idempotente: não sobrescreve campos já definidos.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cfgPath = path.join(ROOT, 'data/store-config.json');
const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));

const NAME_PREFIX = {
  de: [
    ['Screen protector — ', 'Schutzfolie — '],
    ['Alpine Loop Braided Nylon Band — ', 'Alpine Loop Nylon-Armband — '],
    ['Luxury Stainless Steel Link Band — ', 'Edelstahl-Gliederarmband — '],
    ['Magnetic Milanese Steel Band — ', 'Magnetisches Mailänder-Armband — '],
    ['Ocean Sport Silicone Band — ', 'Ocean Sport Silikonarmband — '],
    ['Breathable Sport Silicone Band — ', 'Atmungsaktives Sport-Silikonarmband — '],
    ['Classic Soft Smooth Silicone Band — ', 'Klassisches weiches Silikonarmband — '],
    ['Sport Silicone Band — ', 'Sport-Silikonarmband — '],
    ['Trail Loop Nylon Comfort Band — ', 'Trail Loop Nylon-Komfortarmband — '],
  ],
  es: [
    ['Screen protector — ', 'Protector de pantalla — '],
    ['Alpine Loop Braided Nylon Band — ', 'Correa Alpine Loop de nailon trenzado — '],
    ['Luxury Stainless Steel Link Band — ', 'Correa de acero inoxidable — '],
    ['Magnetic Milanese Steel Band — ', 'Correa milanesa magnética de acero — '],
    ['Ocean Sport Silicone Band — ', 'Correa Ocean Sport de silicona — '],
    ['Breathable Sport Silicone Band — ', 'Correa deportiva de silicona transpirable — '],
    ['Classic Soft Smooth Silicone Band — ', 'Correa clásica de silicona suave — '],
    ['Sport Silicone Band — ', 'Correa deportiva de silicona — '],
    ['Trail Loop Nylon Comfort Band — ', 'Correa Trail Loop de nailon — '],
  ],
  pl: [
    ['Screen protector — ', 'Folia ochronna — '],
    ['Alpine Loop Braided Nylon Band — ', 'Pasek Alpine Loop z plecionego nylonu — '],
    ['Luxury Stainless Steel Link Band — ', 'Luksusowa stalowa bransoleta — '],
    ['Magnetic Milanese Steel Band — ', 'Magnetyczna bransoleta mediolańska — '],
    ['Ocean Sport Silicone Band — ', 'Silikonowy pasek Ocean Sport — '],
    ['Breathable Sport Silicone Band — ', 'Oddychający sportowy pasek silikonowy — '],
    ['Classic Soft Smooth Silicone Band — ', 'Klasyczny miękki pasek silikonowy — '],
    ['Sport Silicone Band — ', 'Sportowy pasek silikonowy — '],
    ['Trail Loop Nylon Comfort Band — ', 'Pasek Trail Loop z nylonu — '],
  ],
  sl: [
    ['Screen protector — ', 'Zaščitna folija — '],
    ['Alpine Loop Braided Nylon Band — ', 'Trak Alpine Loop iz pletenega najlona — '],
    ['Luxury Stainless Steel Link Band — ', 'Luksuzna jeklena zapestnica — '],
    ['Magnetic Milanese Steel Band — ', 'Magnetna milanska jeklena zapestnica — '],
    ['Ocean Sport Silicone Band — ', 'Silikonski trak Ocean Sport — '],
    ['Breathable Sport Silicone Band — ', 'Dišeči športni silikonski trak — '],
    ['Classic Soft Smooth Silicone Band — ', 'Klasičen mehak silikonski trak — '],
    ['Sport Silicone Band — ', 'Športni silikonski trak — '],
    ['Trail Loop Nylon Comfort Band — ', 'Udoben najlonski trak Trail Loop — '],
  ],
};

const DESC_BY_TYPE = {
  pelicula: {
    de: 'Schützt das Smartwatch-Display — dünner Film, einfache Montage, gleiche Lieferung.',
    es: 'Protege la pantalla del smartwatch — lámina fina, fácil instalación, mismo envío.',
    pl: 'Chroni ekran smartwatcha — cienka folia, łatwy montaż, ta sama przesyłka.',
    sl: 'Ščiti zaslon pametne ure — tanek film, enostavna namestitev, ista pošiljka.',
  },
  pulseira: {
    de: 'Komfort und Stil in einer Lieferung — passend zu Ihrer Smartwatch.',
    es: 'Comodidad y estilo en el mismo envío — compatible con tu smartwatch.',
    pl: 'Komfort i styl w jednej przesyłce — pasuje do Twojego smartwatcha.',
    sl: 'Udobje in stil v eni pošiljki — primerno za vašo pametno uro.',
  },
  default: {
    de: 'Offizielles Zubehör von Sensor Tattoo Fix.',
    es: 'Accesorio oficial de Sensor Tattoo Fix.',
    pl: 'Oficjalne akcesorium Sensor Tattoo Fix.',
    sl: 'Uradna oprema Sensor Tattoo Fix.',
    intlLens: 'Zasnovana za optične senzorje pametnih ur na tetovirani koži.',
  },
};

const FILM_TYPE = {
  de: { ceramic: 'Keramik', 'flexible membrane': 'flexible Membran' },
  es: { ceramic: 'cerámica', 'flexible membrane': 'membrana flexible' },
  pl: { ceramic: 'ceramika', 'flexible membrane': 'elastyczna membrana' },
  sl: { ceramic: 'keramika', 'flexible membrane': 'prožna membrana' },
};

function translateName(nameEn, lang) {
  if (!nameEn) return '';
  let out = nameEn;
  for (const [from, to] of NAME_PREFIX[lang]) {
    if (out.startsWith(from)) return to + out.slice(from.length);
  }
  return out;
}

function productKind(p) {
  const id = String(p.id || '');
  if (id.startsWith('pelicula-')) return 'pelicula';
  if (id.startsWith('pulseira-')) return 'pulseira';
  return 'default';
}

let touched = 0;
for (const p of cfg.products || []) {
  if (!p.nameEn) continue;
  const kind = productKind(p);
  for (const lang of ['de', 'es', 'pl', 'sl']) {
    const nameKey = `name${lang.charAt(0).toUpperCase()}${lang.slice(1)}`;
    const descKey = `description${lang.charAt(0).toUpperCase()}${lang.slice(1)}`;
    if (!p[nameKey]) {
      p[nameKey] = translateName(p.nameEn, lang);
      touched++;
    }
    if (!p[descKey] && (p.aggregated || kind !== 'default' || (Array.isArray(p.markets) && p.markets.includes('INT')))) {
      const intlLens = /lens|linse|lente|soczewka|leča/i.test(String(p.nameEn || ''));
      p[descKey] = (lang === 'sl' && intlLens && kind === 'default')
        ? DESC_BY_TYPE.default.intlLens
        : (DESC_BY_TYPE[kind][lang] || DESC_BY_TYPE.default[lang]);
      touched++;
    }
    if (p.filmTypeEn && !p[`filmType${lang.charAt(0).toUpperCase()}${lang.slice(1)}`]) {
      const ft = FILM_TYPE[lang][p.filmTypeEn.toLowerCase()];
      if (ft) {
        p[`filmType${lang.charAt(0).toUpperCase()}${lang.slice(1)}`] = ft;
        touched++;
      }
    }
  }
}

fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + '\n');
console.log(`enrich-catalog: ${touched} campo(s) adicionado(s) em store-config.json`);
