#!/usr/bin/env node
/**
 * Padroniza scripts i18n em /de/, /es/, /pl/ (loja, comprar, conta, comunidade, onde-comprar).
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '..');
const LANGS = [
  { code: 'de', override: 'stf-i18n-de-overrides.js' },
  { code: 'es', override: 'stf-i18n-es-overrides.js' },
  { code: 'pl', override: 'stf-i18n-pl-overrides.js' }
];
const PAGES = ['loja.html', 'comprar.html', 'minha-conta.html', 'comunidade.html', 'onde-comprar.html'];

function dedupePageLang(html) {
  return html.replace(
    /(<script src="\.\.\/js\/stf-page-lang\.js[^"]*"><\/script>\s*)+/g,
    '<script src="../js/stf-page-lang.js?v=2"></script>\n    '
  );
}

function ensureI18nBundle(html, lang) {
  let out = dedupePageLang(html);
  const bundle = `<script src="../js/stf-page-lang.js?v=2"></script>
    <script src="../js/${lang.override}?v=2"></script>
    <script src="../js/stf-i18n.js?v=48"></script>
    <script>try{sessionStorage.setItem('stf_lang','${lang.code}');}catch(e){}</script>`;

  if (!out.includes('stf-i18n.js')) {
    out = out.replace(
      /(<script src="\.\.\/js\/config-bootstrap\.js[^"]*"><\/script>)/,
      `$1\n    ${bundle}`
    );
  } else {
    out = out.replace(
      /<script src="\.\.\/js\/stf-page-lang\.js[^"]*"><\/script>\s*<script src="\.\.\/js\/stf-i18n-[^"]+-overrides\.js[^"]*"><\/script>\s*<script src="\.\.\/js\/stf-i18n\.js[^"]*"><\/script>/,
      bundle
    );
    if (!out.includes(`stf_lang','${lang.code}`)) {
      out = out.replace(
        /<script src="\.\.\/js\/stf-i18n\.js[^"]*"><\/script>/,
        `<script src="../js/stf-i18n.js?v=48"></script>\n    <script>try{sessionStorage.setItem('stf_lang','${lang.code}');}catch(e){}</script>`
      );
    }
  }

  if (!out.includes('stf-lang-nav.js') && out.includes('checkout-nav')) {
    out = out.replace(
      /<script src="\.\.\/js\/stf-i18n\.js[^"]*"><\/script>/,
      `<script src="../js/stf-i18n.js?v=48"></script>\n    <script src="../js/stf-lang-nav.js?v=4"></script>`
    );
  }

  out = out.replace(/data-lang="en"/g, `data-lang="${lang.code}"`);
  out = out.replace(/site-footer\.js\?v=\d+/g, 'site-footer.js?v=15');
  out = out.replace(/site-feedback\.js\?v=\d+/g, 'site-feedback.js?v=7');
  out = out.replace(/loja\.js\?v=\d+/g, 'loja.js?v=20');
  out = out.replace(/stf-site\.js\?v=\d+/g, 'stf-site.js?v=7');

  if (out.includes('forum-page') && !out.includes('site-feedback.js')) {
    out = out.replace(
      /<script src="\.\.\/js\/site-footer\.js[^"]*"><\/script>/,
      `<script src="../js/site-footer.js?v=15"></script>\n    <script src="../js/site-feedback.js?v=7"></script>`
    );
  }

  out = out.replace(
    /<li class="nav-lang-stack">[\s\S]*?<\/li>/,
    '<li class="nav-lang-stack" aria-label="Language"></li>'
  );

  return out;
}

for (const lang of LANGS) {
  for (const page of PAGES) {
    const file = path.join(ROOT, lang.code, page);
    if (!fs.existsSync(file)) continue;
    const html = ensureI18nBundle(fs.readFileSync(file, 'utf8'), lang);
    fs.writeFileSync(file, html);
    console.log('patched', `${lang.code}/${page}`);
  }
}

console.log('done');
