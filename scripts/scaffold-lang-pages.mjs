#!/usr/bin/env node
/**
 * Scaffold /de/, /es/, /pl/ from /en/ (checkout/loja pages).
 * index.html must be translated separately (SEO content).
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '..');
const LANGS = [
  { code: 'de', label: 'Deutsch', flag: 'de', override: 'stf-i18n-de-overrides.js', htmlLang: 'de', ogLocale: 'de_DE' },
  { code: 'es', label: 'Español', flag: 'es', override: 'stf-i18n-es-overrides.js', htmlLang: 'es', ogLocale: 'es_ES' },
  { code: 'pl', label: 'Polski', flag: 'pl', override: 'stf-i18n-pl-overrides.js', htmlLang: 'pl', ogLocale: 'pl_PL' }
];
const PAGES = ['comprar.html', 'loja.html', 'minha-conta.html', 'onde-comprar.html', 'comunidade.html'];

function patchHtml(html, lang) {
  let out = html;
  out = out.replace(/<html lang="en">/i, `<html lang="${lang.htmlLang}">`);
  out = out.replace(
    /<script src="\.\.\/js\/stf-i18n\.js/g,
    `<script src="../js/${lang.override}?v=1"></script>\n    <script src="../js/stf-i18n.js`
  );
  out = out.replace(
    /<script src="\.\.\/js\/stf-i18n-it-overrides\.js[^"]*"><\/script>\s*/g,
    `<script src="../js/${lang.override}?v=1"></script>\n    `
  );
  const base = `https://www.sensortattoofix.com.br/${lang.code}`;
  out = out.replace(/https:\/\/www\.sensortattoofix\.com(\/[^"']*)?/g, (m) => {
    if (m.includes('.com.br')) return m;
    return base + (m.replace('https://www.sensortattoofix.com', '') || '/');
  });
  out = out.replace(/hreflang="en"/g, `hreflang="${lang.htmlLang}"`);
  out = out.replace(/<link rel="alternate" hreflang="it"/g,
    `<link rel="alternate" hreflang="de" href="https://www.sensortattoofix.com.br/de/"\n    />\n    <link rel="alternate" hreflang="es" href="https://www.sensortattoofix.com.br/es/"\n    />\n    <link rel="alternate" hreflang="pl" href="https://www.sensortattoofix.com.br/pl/"\n    />\n    <link rel="alternate" hreflang="it"`);
  if (!out.includes(`hreflang="${lang.htmlLang}"`)) {
    out = out.replace('</head>', `    <link rel="alternate" hreflang="${lang.htmlLang}" href="${base}/">\n</head>`);
  }
  out = out.replace(/og:locale" content="en_[^"]+"/, `og:locale" content="${lang.ogLocale}"`);
  out = out.replace(
    /<li class="nav-lang-stack">[\s\S]*?<\/li>/,
    `<li class="nav-lang-stack">
                    <a href="../index.html" class="nav-lang" title="Português (Brasil)" aria-label="Português (Brasil)"><img src="https://flagcdn.com/w20/br.png" width="20" height="15" alt=""> <span>PT</span></a>
                    <a href="../en/index.html" class="nav-lang" title="English" aria-label="English"><img src="https://flagcdn.com/w20/us.png" width="20" height="15" alt=""> <span>EN</span></a>
                    <a href="../it/index.html" class="nav-lang" title="Italiano" aria-label="Italiano"><img src="https://flagcdn.com/w20/it.png" width="20" height="15" alt=""> <span>IT</span></a>
                    <a href="index.html" class="nav-lang nav-lang--active" title="${lang.label}" aria-label="${lang.label}"><img src="https://flagcdn.com/w20/${lang.flag}.png" width="20" height="15" alt=""> <span>${lang.code.toUpperCase()}</span></a>
                </li>`
  );
  return out;
}

for (const lang of LANGS) {
  const dir = path.join(ROOT, lang.code);
  fs.mkdirSync(dir, { recursive: true });
  for (const page of PAGES) {
    const src = path.join(ROOT, 'en', page);
    const dest = path.join(dir, page);
    if (!fs.existsSync(src)) {
      console.warn('skip missing', src);
      continue;
    }
    const html = patchHtml(fs.readFileSync(src, 'utf8'), lang);
    fs.writeFileSync(dest, html);
    console.log('wrote', dest);
  }
}

console.log('Done. Add translated index.html per language manually.');
