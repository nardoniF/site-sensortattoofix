/**
 * Pure helpers from store-products-merge.js — testable without DOM.
 */

export function keyOf(p) {
  return String(p?.id || p?.slug || '').trim();
}

export function isEmptyValue(value) {
  if (value == null) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'string') return value.trim() === '';
  return false;
}

/** Old KV/bookmarks: /site/*, /produtos/*, /img/* → /images/... */
export function normalizeLegacyImagePath(url) {
  let s = String(url || '').trim();
  if (!s) return s;
  const mapExact = {
    '/site/logo.jpg': '/images/brand/logo.jpg',
    '/site/sensortattoofix.jpg': '/images/brand/sensortattoofix.jpg',
    '/site/relogio_home.jpg': '/images/home/relogio_home.jpg',
    '/site/relogio_home2.jpg': '/images/home/relogio_home2.jpg',
    '/site/relogio_sensor.jpg': '/images/home/relogio_sensor.jpg',
    '/site/kit-profissional.png': '/images/home/kit-profissional.png',
    '/site/fundador-fabio.jpg': '/images/home/fundador-fabio.jpg'
  };
  const pathOnly = s.replace(/^https?:\/\/[^/]+/i, '');
  if (mapExact[pathOnly]) {
    return /^https?:\/\//i.test(s) ? s.replace(pathOnly, mapExact[pathOnly]) : mapExact[pathOnly];
  }
  s = s.replace(/\/site\/(kit-gallery|lens-gallery|smartband|comissionado)\//g, '/images/$1/');
  if (s.includes('/produtos/') && !s.includes('/images/produtos/')) {
    s = s.replace('/produtos/', '/images/produtos/');
  }
  if (s.includes('/img/') && !s.includes('/images/')) {
    s = s.replace('/img/', '/images/depoimentos/');
  }
  return s;
}

export function isLegacyBrokenKitImage(url) {
  const u = String(url || '').trim();
  if (!u) return true;
  if (/\/(?:images|site|produtos|img)\//i.test(u)) return false;
  return /sensortattoofix/i.test(u);
}

export function mergeSmartwatchLists(primary, supplement) {
  const primaryList = Array.isArray(primary) && primary.length ? primary : [];
  const supplementList = Array.isArray(supplement) ? supplement : [];
  if (supplementList.length > primaryList.length + 20) return [...supplementList];
  if (!primaryList.length) return [...supplementList];
  const seen = new Set(primaryList);
  const out = [...primaryList];
  supplementList.forEach((model) => {
    if (!seen.has(model)) {
      out.push(model);
      seen.add(model);
    }
  });
  return out;
}

export function normalizeBandColor(color) {
  const c = String(color || '').toLowerCase().trim();
  if (!c || c.includes('cinza') || c === 'gray' || c === 'grey') return 'cinza';
  if (c.includes('preta') || c === 'black') return 'preta';
  if (c.includes('azul')) return 'azul';
  if (c.includes('branca') || c === 'white') return 'branca';
  if (c.includes('creme') || c.includes('cream')) return 'creme';
  if (c.includes('rose')) return 'rose';
  if (c.includes('verde') || c.includes('oliva')) return 'verde';
  if (c.includes('grafite')) return 'grafite';
  return 'cinza';
}
