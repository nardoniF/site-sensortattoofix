#!/usr/bin/env node
/**
 * Bootstrap /fr|/nl|/sv|/no|/fi from /en, inject overrides, set lang attrs,
 * apply shell string replacements, empty nav-lang-stack (runtime rebuilds flags).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PAGES = ['index.html', 'comprar.html', 'loja.html', 'minha-conta.html', 'onde-comprar.html', 'comunidade.html'];
const LANGS = [
  { code: 'fr', htmlLang: 'fr', ogLocale: 'fr_FR', override: 'stf-i18n-fr-overrides.js' },
  { code: 'nl', htmlLang: 'nl', ogLocale: 'nl_NL', override: 'stf-i18n-nl-overrides.js' },
  { code: 'sv', htmlLang: 'sv', ogLocale: 'sv_SE', override: 'stf-i18n-sv-overrides.js' },
  { code: 'no', htmlLang: 'no', ogLocale: 'nb_NO', override: 'stf-i18n-no-overrides.js' },
  { code: 'fi', htmlLang: 'fi', ogLocale: 'fi_FI', override: 'stf-i18n-fi-overrides.js' },
];

const shell = JSON.parse(fs.readFileSync(path.join(ROOT, 'js/_new-lang-shell-strings.json'), 'utf8'));

function ensureOverrideScript(html, lang) {
  if (html.includes(lang.override)) return html;
  // After stf-page-lang or before stf-i18n.js
  if (html.includes('stf-i18n-it-overrides') || html.includes('stf-i18n-de-overrides')) {
    return html.replace(
      /<script src="\.\.\/js\/stf-i18n-(?:it|de|es|pl|sl)-overrides\.js[^"]*"><\/script>/,
      `<script src="../js/${lang.override}?v=1"></script>`
    );
  }
  return html.replace(
    /<script src="\.\.\/js\/stf-i18n\.js[^"]*"><\/script>/,
    `<script src="../js/${lang.override}?v=1"></script>\n    <script src="../js/stf-i18n.js?v=41"></script>`
  );
}

function patchHtml(html, lang, page) {
  let out = html;
  out = out.replace(/<html lang="en">/i, `<html lang="${lang.htmlLang}">`);
  out = out.replace(/lang="en"/g, `lang="${lang.htmlLang}"`);
  out = ensureOverrideScript(out, lang);
  out = out.replace(/sessionStorage\.setItem\('stf_lang','en'\)/g, `sessionStorage.setItem('stf_lang','${lang.code}')`);
  out = out.replace(/data-lang="en"/g, `data-lang="${lang.code}"`);
  out = out.replace(/og:locale" content="en_[^"]+"/g, `og:locale" content="${lang.ogLocale}"`);
  // Prefer same-folder relative links under /xx/
  out = out.replace(/href="\.\.\/en\//g, 'href="');
  // Canonical will be fixed by sync-hreflang; still set a sane default
  out = out.replace(
    /rel="canonical" href="https:\/\/www\.sensortattoofix\.com\/[^"]*"/g,
    (m) => {
      const file = page === 'index.html' ? '' : page;
      return `rel="canonical" href="https://www.sensortattoofix.com/${lang.code}/${file}"`;
    }
  );
  // Empty lang stack — stf-lang-nav rebuilds with all flags
  out = out.replace(
    /<li class="nav-lang-stack">[\s\S]*?<\/li>/,
    '<li class="nav-lang-stack" aria-label="Language"></li>'
  );
  if (page === 'minha-conta.html') {
    out = out.replace(/<body class="checkout-page conta-page">/g, '<body class="conta-page">');
    out = out.replace(/class="checkout-page conta-page"/g, 'class="conta-page"');
  }

  const map = shell[lang.code] || {};
  // Longer keys first
  const pairs = Object.entries(map).sort((a, b) => b[0].length - a[0].length);
  for (const [en, tr] of pairs) {
    if (!en || en === tr) continue;
    // Only replace plain text occurrences cautiously
    out = out.split(en).join(tr);
  }
  return out;
}

for (const lang of LANGS) {
  const dir = path.join(ROOT, lang.code);
  fs.mkdirSync(dir, { recursive: true });
  for (const page of PAGES) {
    const src = path.join(ROOT, 'en', page);
    if (!fs.existsSync(src)) {
      console.warn('missing', src);
      continue;
    }
    const dest = path.join(dir, page);
    const html = patchHtml(fs.readFileSync(src, 'utf8'), lang, page);
    fs.writeFileSync(dest, html);
    console.log('wrote', path.relative(ROOT, dest));
  }
}
console.log('bootstrap-new-langs done');
