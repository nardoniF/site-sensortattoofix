#!/usr/bin/env node
/**
 * Wire fr/nl/sv/no/fi into central registries (path, geo, nav, SEO helpers).
 * Idempotent: safe to re-run.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NEW = ['fr', 'nl', 'sv', 'no', 'fi'];
const OLD_INTL = ['it', 'de', 'es', 'pl', 'sl'];
const ALL_INTL = [...OLD_INTL, ...NEW];
const PATH_LANGS = ['en', ...ALL_INTL];
const SITE_LANGS = ['pt', ...PATH_LANGS];

const altRe = (langs) => langs.join('|');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}
function write(rel, s) {
  fs.writeFileSync(path.join(ROOT, rel), s);
  console.log('updated', rel);
}

function expandLangArrays(src) {
  let out = src;
  // Common array literals
  const replacements = [
    [
      /\[\s*'pt'\s*,\s*'en'\s*,\s*'it'\s*,\s*'de'\s*,\s*'es'\s*,\s*'pl'\s*,\s*'sl'\s*\]/g,
      JSON.stringify(SITE_LANGS).replace(/"/g, "'")
    ],
    [
      /\[\s*'en'\s*,\s*'it'\s*,\s*'de'\s*,\s*'es'\s*,\s*'pl'\s*,\s*'sl'\s*\]/g,
      JSON.stringify(PATH_LANGS).replace(/"/g, "'")
    ],
    [
      /\[\s*'it'\s*,\s*'de'\s*,\s*'es'\s*,\s*'pl'\s*,\s*'sl'\s*\]/g,
      JSON.stringify(ALL_INTL).replace(/"/g, "'")
    ],
    [
      /\[\s*'de'\s*,\s*'es'\s*,\s*'pl'\s*,\s*'sl'\s*\]/g,
      JSON.stringify(['de', 'es', 'pl', 'sl', ...NEW]).replace(/"/g, "'")
    ],
  ];
  for (const [re, rep] of replacements) out = out.replace(re, rep);

  // Regex path groups (en|it|de|es|pl|sl) → include new
  out = out.replace(/\(en\|it\|de\|es\|pl\|sl\)/g, `(${altRe(PATH_LANGS)})`);
  out = out.replace(/\(it\|de\|es\|pl\|sl\)/g, `(${altRe(ALL_INTL)})`);
  out = out.replace(/\(de\|es\|pl\|sl\|it\|en\)/g, `(${altRe([...ALL_INTL, 'en'].filter((v, i, a) => a.indexOf(v) === i))})`);
  out = out.replace(/\(de\|es\|pl\|sl\|it\)/g, `(${altRe(ALL_INTL)})`);
  out = out.replace(/\(de\|es\|pl\|sl\)/g, `(${altRe(['de', 'es', 'pl', 'sl', ...NEW])})`);

  return out;
}

// --- geo-lang.js: new langs + fix cross-domain loop ---
{
  let s = read('cloudflare/geo-lang.js');
  s = s.replace(
    /export const SITE_LANGS = \[[^\]]+\];/,
    `export const SITE_LANGS = ${JSON.stringify(SITE_LANGS).replace(/"/g, "'")};`
  );
  // Add country maps (do not remap SV El Salvador)
  if (!s.includes("FR: 'fr'")) {
    s = s.replace(
      "CA: 'en'\n};",
      `CA: 'en',\n  FR: 'fr',\n  MC: 'fr',\n  NL: 'nl',\n  SE: 'sv',\n  NO: 'no',\n  FI: 'fi'\n};`
    );
  }
  // Accept-Language
  if (!s.includes("tag.startsWith('fr')")) {
    s = s.replace(
      "if (tag.startsWith('en')) return 'en';",
      `if (tag.startsWith('fr')) return 'fr';
    if (tag.startsWith('nl')) return 'nl';
    if (tag.startsWith('sv')) return 'sv';
    if (tag.startsWith('nb') || tag.startsWith('nn') || tag.startsWith('no')) return 'no';
    if (tag.startsWith('fi')) return 'fi';
    if (tag.startsWith('en')) return 'en';`
    );
  }
  s = s.replace(/\(en\|it\|de\|es\|pl\|sl\)/g, `(${altRe(PATH_LANGS)})`);

  // Fix redirect loop: same-host only
  s = s.replace(
    /\/\*\*\n \* @returns \{string\|null\} absolute URL to redirect to, or null\n \*\/\nexport function localeRedirectTarget\([\s\S]*?\n\}\n\n\/\*\* Lang implied/,
    `/**
 * Same-host only: never bounce .com ↔ .com.br (cookies not shared → redirect loop).
 * @returns {string|null} absolute URL to redirect to, or null
 */
export function localeRedirectTarget({ hostOrigin, pathname, search, br, preferred }) {
  const lang = normalizeSiteLang(preferred) || 'en';
  const COM = 'https://www.sensortattoofix.com';
  const path = pathname || '/';
  const q = search || '';

  if (br) return null;

  if (!isComEnglishEntryPath(path)) return null;
  if (lang === 'en' || lang === 'pt') return null;

  const isHome = path === '/' || path === '' || path === '/index.html';
  const file = isHome ? '' : path.replace(/^\\//, '');
  const base = String(hostOrigin || COM).replace(/\\/$/, '');

  if (isHome) return q ? \`\${base}/\${lang}/\${q}\` : \`\${base}/\${lang}/\`;
  return \`\${base}/\${lang}/\${file}\${q}\`;
}

/** Lang implied`
  );
  write('cloudflare/geo-lang.js', s);
}

// --- hreflang-config ---
{
  let s = read('scripts/hreflang-config.mjs');
  s = s.replace(
    /export const HREFLANG_ORDER = \[[^\]]+\];/,
    `export const HREFLANG_ORDER = ['pt-BR', ${PATH_LANGS.map((l) => `'${l}'`).join(', ')}, 'x-default'];`
  );
  s = s.replace(
    /export const LANG_DIRS = \[[^\]]+\];/,
    `export const LANG_DIRS = ${JSON.stringify(PATH_LANGS).replace(/"/g, "'")};`
  );
  s = s.replace(
    /export const COM_SITEMAP_LANGS = \[[^\]]+\];/,
    `export const COM_SITEMAP_LANGS = ${JSON.stringify(PATH_LANGS).replace(/"/g, "'")};`
  );
  // hreflangUrl cases
  for (const lang of NEW) {
    if (!s.includes(`if (lang === '${lang}')`)) {
      s = s.replace(
        "if (lang === 'x-default')",
        `if (lang === '${lang}') return file ? \`\${COM}/${lang}/\${file}\` : \`\${COM}/${lang}/\`;\n  if (lang === 'x-default')`
      );
    }
  }
  s = s.replace(
    /\(\?:\(en\|it\|de\|es\|pl\|sl\)\\\/\)\?/,
    `(?:(${altRe(PATH_LANGS)})\\/)?`
  );
  // JSDoc union
  s = s.replace(
    /@param \{'pt-BR'\|'en'\|'it'\|'de'\|'es'\|'pl'\|'sl'\|'x-default'\}/,
    `@param {'pt-BR'|${PATH_LANGS.map((l) => `'${l}'`).join('|')}|'x-default'}`
  );
  write('scripts/hreflang-config.mjs', s);
}

// --- stf-lang-nav ---
{
  let s = read('js/stf-lang-nav.js');
  s = s.replace(
    /const INTL_LANGS = \[[^\]]+\];/,
    `const INTL_LANGS = ${JSON.stringify(ALL_INTL).replace(/"/g, "'")};`
  );
  s = s.replace(
    /const ALL_LANGS = \[[^\]]+\];/,
    `const ALL_LANGS = ${JSON.stringify(SITE_LANGS).replace(/"/g, "'")};`
  );
  if (!s.includes("fr: { code: 'FR'")) {
    s = s.replace(
      /sl: \{ code: 'SL', flag: 'si', label: 'Slovenščina' \},/,
      `sl: { code: 'SL', flag: 'si', label: 'Slovenščina' },
    fr: { code: 'FR', flag: 'fr', label: 'Français' },
    nl: { code: 'NL', flag: 'nl', label: 'Nederlands' },
    sv: { code: 'SV', flag: 'se', label: 'Svenska' },
    no: { code: 'NO', flag: 'no', label: 'Norsk' },
    fi: { code: 'FI', flag: 'fi', label: 'Suomi' },`
    );
  }
  s = s.replace(/\(en\|it\|de\|es\|pl\|sl\)/g, `(${altRe(PATH_LANGS)})`);
  s = s.replace(
    /\* Navegação entre mercados \+ seletor compacto de idiomas \(PT, EN, IT, DE, ES, PL, SL\)\./,
    '* Navegação entre mercados + seletor compacto de idiomas (PT, EN, IT, DE, ES, PL, SL, FR, NL, SV, NO, FI).'
  );
  s = s.replace(
    /\.com = EN \(\/\) \+ IT\/DE\/ES\/PL\/SL \(\/it\/, \/de\/, \/es\/, \/pl\/, \/sl\/\)/,
    '.com = EN (/) + IT/DE/ES/PL/SL/FR/NL/SV/NO/FI (/it/, /de/, …)'
  );
  write('js/stf-lang-nav.js', s);
}

// --- stf-page-lang ---
{
  let s = read('js/stf-page-lang.js');
  s = expandLangArrays(s);
  write('js/stf-page-lang.js', s);
}

// Files that mostly need array/regex expansion
const EXPAND_FILES = [
  'js/stf-i18n.js',
  'js/ad-landing.js',
  'js/account-nav.js',
  'js/analytics.js',
  'js/stf-site.js',
  'js/stf-money.js',
  'js/store-price-tag.js',
  'js/stf-product-gallery.js',
  'js/seo-schema.js',
  'js/checkout.js',
  'js/home-content.js',
  'js/forum.js',
  'js/site-feedback.js',
  'js/site-footer.js',
  'js/pelicula-compat.js',
  'js/admin.js',
  'js/checkout-intl-pay.js',
  'js/conta.js',
  'api/site-l10n.js',
  'api/scripts/backfill-forum-i18n.mjs',
  'cloudflare/stf-com-proxy.js',
];

for (const rel of EXPAND_FILES) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) {
    console.warn('skip missing', rel);
    continue;
  }
  let s = expandLangArrays(read(rel));
  write(rel, s);
}

console.log('wire-new-langs done');
