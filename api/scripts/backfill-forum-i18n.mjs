#!/usr/bin/env node
/**
 * Backfill DE/ES/PL/SL on forum threads (+ replies) via Workers AI + KV.
 * Usage: node api/scripts/backfill-forum-i18n.mjs [--limit=28]
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');
const NS = '4184c034aab941e58ce5cc1e3abaecdc';
const ACCOUNT = '80ab4f6ff1553d2ee530c0880edce594';
const MODEL = '@cf/meta/llama-3.1-8b-instruct';
const SITE_LANGS = ['pt', 'en', 'it', 'de', 'es', 'pl', 'sl'];
const LANG_NATIVE = {
  pt: 'português brasileiro',
  en: 'English',
  it: 'italiano',
  de: 'Deutsch',
  es: 'español de España',
  pl: 'polski',
  sl: 'slovenščina'
};

const limitArg = process.argv.find((a) => a.startsWith('--limit='));
const LIMIT = limitArg ? Number(limitArg.split('=')[1]) : 50;

function wranglerKvGet(key) {
  const out = execFileSync(
    'npx',
    ['wrangler', 'kv', 'key', 'get', key, '--namespace-id=' + NS, '--remote'],
    { cwd: path.join(ROOT, 'api'), encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 }
  );
  return out;
}

function wranglerKvPut(key, filePath) {
  execFileSync(
    'npx',
    ['wrangler', 'kv', 'key', 'put', key, '--namespace-id=' + NS, '--remote', '--path=' + filePath],
    { cwd: path.join(ROOT, 'api'), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
  );
}

function oauthToken() {
  const toml = fs.readFileSync(path.join(process.env.HOME, '.wrangler/config/default.toml'), 'utf8');
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

async function localizeFields(token, { sourceLang, fields, targetLang }) {
  const keys = Object.keys(fields).filter((k) => String(fields[k] || '').trim());
  if (!keys.length) return null;
  const payload = {};
  keys.forEach((k) => { payload[k] = String(fields[k] || ''); });
  const raw = await runAi(token, [
    {
      role: 'system',
      content: `You are a native ${LANG_NATIVE[targetLang] || targetLang} copywriter for Sensor Tattoo Fix community forum.
Return ONLY a JSON object with the same keys as the input. No markdown, no commentary.
Keep product/model names. Write how a native would write a forum post.`
    },
    {
      role: 'user',
      content: `Source language: ${LANG_NATIVE[sourceLang] || sourceLang}\nJSON:\n${JSON.stringify(payload)}`
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

function otherLangs(src) {
  return SITE_LANGS.filter((l) => l !== src);
}

async function fillThread(token, thread) {
  const sourceLang = SITE_LANGS.includes(thread.sourceLang) ? thread.sourceLang : (SITE_LANGS.includes(thread.lang) ? thread.lang : 'pt');
  const fields = { title: String(thread.title || ''), body: String(thread.body || '') };
  const hash = hashSource(`${sourceLang}\n${fieldsFingerprint(fields)}`);
  const i18n = { ...(thread.i18n || {}) };
  const missing = otherLangs(sourceLang).filter((lang) => !(i18n[lang] && String(i18n[lang].title || i18n[lang].body || '').trim()));
  for (const lang of missing) {
    process.stdout.write(`  thread ${thread.id.slice(0, 8)} → ${lang}… `);
    const pack = await localizeFields(token, { sourceLang, fields, targetLang: lang });
    if (pack) {
      i18n[lang] = pack;
      console.log('ok');
    } else console.log('FAIL');
  }
  return { ...thread, sourceLang, lang: sourceLang, i18n, i18nHash: hash };
}

async function fillReply(token, reply) {
  const sourceLang = SITE_LANGS.includes(reply.sourceLang) ? reply.sourceLang : (SITE_LANGS.includes(reply.lang) ? reply.lang : 'pt');
  const fields = { body: String(reply.body || '') };
  if (!fields.body.trim()) return reply;
  const hash = hashSource(`${sourceLang}\n${fieldsFingerprint(fields)}`);
  const i18n = { ...(reply.i18n || {}) };
  const missing = otherLangs(sourceLang).filter((lang) => {
    const pack = i18n[lang];
    const body = typeof pack === 'string' ? pack : pack?.body;
    return !String(body || '').trim();
  });
  for (const lang of missing) {
    process.stdout.write(`  reply ${String(reply.id).slice(0, 8)} → ${lang}… `);
    const pack = await localizeFields(token, { sourceLang, fields, targetLang: lang });
    if (pack) {
      i18n[lang] = pack;
      console.log('ok');
    } else console.log('FAIL');
  }
  return { ...reply, sourceLang, lang: sourceLang, i18n, i18nHash: hash };
}

async function main() {
  const token = oauthToken();
  const ids = JSON.parse(wranglerKvGet('forum:index'));
  const slice = ids.slice(0, LIMIT);
  console.log(`Backfilling ${slice.length}/${ids.length} threads…`);
  const tmp = path.join('/tmp', 'forum-i18n-item.json');

  for (const id of slice) {
    console.log(`\n=== ${id} ===`);
    let thread;
    try {
      thread = JSON.parse(wranglerKvGet('forum:thread:' + id));
    } catch (e) {
      console.warn('skip thread', id, e.message);
      continue;
    }
    const next = await fillThread(token, thread);
    fs.writeFileSync(tmp, JSON.stringify(next));
    wranglerKvPut('forum:thread:' + id, tmp);

    let replies = [];
    try {
      replies = JSON.parse(wranglerKvGet('forum:replies:' + id) || '[]');
    } catch {
      replies = [];
    }
    if (!Array.isArray(replies) || !replies.length) continue;
    const updated = [];
    for (const r of replies) {
      updated.push(await fillReply(token, r));
    }
    fs.writeFileSync(tmp, JSON.stringify(updated));
    wranglerKvPut('forum:replies:' + id, tmp);
  }
  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
