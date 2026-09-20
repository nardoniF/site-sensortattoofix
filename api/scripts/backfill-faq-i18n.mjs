#!/usr/bin/env node
/**
 * Backfill FAQ home i18n (PT → all SITE_LANGS) via Workers AI + KV.
 * Usage: node api/scripts/backfill-faq-i18n.mjs [--limit=10]
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import os from 'node:os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');
const NS = '4184c034aab941e58ce5cc1e3abaecdc';
const ACCOUNT = '80ab4f6ff1553d2ee530c0880edce594';
const MODEL = '@cf/meta/llama-3.1-8b-instruct';
const CONFIG_KEY = 'store-config';
const SITE_LANGS = ['pt', 'en', 'it', 'de', 'es', 'pl', 'sl', 'fr', 'nl', 'sv', 'no', 'fi'];
const LANG_NATIVE = {
  pt: 'português brasileiro',
  en: 'English',
  it: 'italiano',
  de: 'Deutsch',
  es: 'español de España',
  pl: 'polski',
  sl: 'slovenščina',
  fr: 'français',
  nl: 'Nederlands',
  sv: 'svenska',
  no: 'norsk bokmål',
  fi: 'suomi'
};

const limitArg = process.argv.find((a) => a.startsWith('--limit='));
const LIMIT = limitArg ? Number(limitArg.split('=')[1]) : 10;

function wranglerKvGet(key) {
  return execFileSync(
    'npx',
    ['wrangler', 'kv', 'key', 'get', key, '--namespace-id=' + NS, '--remote'],
    { cwd: path.join(ROOT, 'api'), encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 }
  );
}

function wranglerKvPut(key, filePath) {
  execFileSync(
    'npx',
    ['wrangler', 'kv', 'key', 'put', key, '--namespace-id=' + NS, '--remote', '--path=' + filePath],
    { cwd: path.join(ROOT, 'api'), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
  );
}

function oauthToken() {
  const toml = fs.readFileSync(path.join(os.homedir(), '.wrangler/config/default.toml'), 'utf8');
  const m = toml.match(/oauth_token\s*=\s*"([^"]+)"/);
  if (!m) throw new Error('wrangler oauth_token missing');
  return m[1];
}

function parseModelJson(raw) {
  const text = String(raw || '').trim();
  if (!text) return null;
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fence ? fence[1].trim() : text;
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    const obj = JSON.parse(body.slice(start, end + 1));
    return obj && typeof obj === 'object' && !Array.isArray(obj) ? obj : null;
  } catch {
    return null;
  }
}

function extractAiText(out) {
  if (typeof out === 'string') return out;
  if (out?.response) return out.response;
  if (typeof out?.result === 'string') return out.result;
  return (
    out?.result?.choices?.[0]?.message?.content
    || out?.choices?.[0]?.message?.content
    || out?.result?.response
    || null
  );
}

async function runAi(token, messages) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/ai/run/${MODEL}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, max_tokens: 1200 })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data).slice(0, 300));
  return extractAiText(data);
}

async function localizeFields(token, { fields, targetLang }) {
  const keys = Object.keys(fields).filter((k) => String(fields[k] || '').trim());
  if (!keys.length) return null;
  const payload = {};
  keys.forEach((k) => { payload[k] = String(fields[k] || ''); });
  const raw = await runAi(token, [
    {
      role: 'system',
      content: `You are a native ${LANG_NATIVE[targetLang] || targetLang} copywriter for Sensor Tattoo Fix product FAQ (optical lens for smartwatches on tattooed skin).
Return ONLY a JSON object with the same keys as the input. No markdown, no commentary.
Keep HTML tags and brand/model names. Adapt naturally — not word-for-word.`
    },
    {
      role: 'user',
      content: `Source language: português brasileiro\nJSON:\n${JSON.stringify(payload)}`
    }
  ]);
  const parsed = parseModelJson(raw);
  if (!parsed) return null;
  const out = {};
  keys.forEach((k) => {
    const v = parsed[k];
    out[k] = v != null && String(v).trim() ? String(v) : payload[k];
  });
  return out;
}

function hashSource(text) {
  return crypto.createHash('sha256').update(String(text || ''), 'utf8').digest('hex');
}

function fieldsFingerprint(fields) {
  return Object.keys(fields || {}).sort().map((k) => `${k}:${String(fields[k] || '').trim()}`).join('\n');
}

function syncLegacy(item) {
  const i18n = item.i18n || {};
  const map = [
    ['en', 'En'], ['it', 'It'], ['de', 'De'], ['es', 'Es'], ['pl', 'Pl'], ['sl', 'Sl'],
    ['fr', 'Fr'], ['nl', 'Nl'], ['sv', 'Sv'], ['no', 'No'], ['fi', 'Fi']
  ];
  map.forEach(([lang, suf]) => {
    const q = String(i18n[lang]?.question || '').trim();
    const a = String(i18n[lang]?.answer || '').trim();
    if (q) item['question' + suf] = q;
    if (a) item['answer' + suf] = a;
  });
  return item;
}

async function fillFaq(token, item) {
  const question = String(item.question || '').trim();
  const answer = String(item.answer || '').trim();
  if (!question && !answer) return { item, changed: false };
  const fields = { question, answer };
  const hash = hashSource(fieldsFingerprint(fields));
  const i18n = { ...(item.i18n || {}) };
  const missing = SITE_LANGS.filter((l) => l !== 'pt' && !String(i18n[l]?.question || '').trim());
  if (!missing.length) {
    item.i18n = i18n;
    item.i18nHash = hash;
    item.sourceLang = 'pt';
    return { item: syncLegacy(item), changed: false };
  }
  console.log(`FAQ ${item.id}: missing [${missing.join(',')}]`);
  for (const lang of missing) {
    process.stdout.write(`  → ${lang}… `);
    try {
      const pack = await localizeFields(token, { fields, targetLang: lang });
      if (pack && String(pack.question || '').trim()) {
        i18n[lang] = { question: pack.question, answer: pack.answer || '' };
        console.log('ok');
      } else console.log('FAIL');
    } catch (err) {
      console.log('ERR', err.message?.slice(0, 80));
    }
  }
  item.i18n = i18n;
  item.i18nHash = String(i18n.en?.question || '').trim() ? hash : item.i18nHash;
  item.sourceLang = 'pt';
  return { item: syncLegacy(item), changed: true };
}

async function main() {
  const token = oauthToken();
  const raw = wranglerKvGet(CONFIG_KEY);
  const config = JSON.parse(raw);
  const faqs = Array.isArray(config.homeFaq) ? config.homeFaq : [];
  const pending = faqs
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => {
      const i18n = item?.i18n || {};
      return SITE_LANGS.some((l) => l !== 'pt' && !String(i18n[l]?.question || '').trim());
    })
    .slice(0, LIMIT);

  console.log(`Pending FAQs: ${pending.length} (limit ${LIMIT})`);
  let changed = 0;
  for (const { item, index } of pending) {
    const out = await fillFaq(token, { ...item });
    config.homeFaq[index] = out.item;
    if (out.changed) changed += 1;
  }

  if (!changed) {
    console.log('Nothing to write.');
    return;
  }
  const tmp = path.join(os.tmpdir(), `stf-store-config-faq-${Date.now()}.json`);
  fs.writeFileSync(tmp, JSON.stringify(config));
  wranglerKvPut(CONFIG_KEY, tmp);
  fs.unlinkSync(tmp);
  console.log(`Saved ${changed} FAQ(s) to KV.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
