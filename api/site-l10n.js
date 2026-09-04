/**
 * Localização automática (FAQ, comunidade, elogios).
 * Fonte = idioma em que a pessoa escreveu; as outras línguas do site
 * saem de um rewrite nativo (não tradução palavra a palavra).
 */

export const SITE_LANGS = ['pt', 'en', 'it', 'de', 'es', 'pl', 'sl'];

export const LANG_NATIVE = {
  pt: { name: 'português brasileiro', region: 'Brasil' },
  en: { name: 'English', region: 'the US and UK' },
  it: { name: 'italiano', region: 'Italia' },
  de: { name: 'Deutsch', region: 'Deutschland und Österreich' },
  es: { name: 'español de España', region: 'España' },
  pl: { name: 'polski', region: 'Polska' },
  sl: { name: 'slovenščina', region: 'Slovenija' }
};

const L10N_MODEL = '@cf/meta/llama-3.1-8b-instruct';

export function normalizeSiteLang(raw) {
  const l = String(raw || '').trim().toLowerCase().slice(0, 2);
  return SITE_LANGS.includes(l) ? l : 'pt';
}

export function otherSiteLangs(sourceLang) {
  const src = normalizeSiteLang(sourceLang);
  return SITE_LANGS.filter((l) => l !== src);
}

export async function hashSource(text) {
  const data = new TextEncoder().encode(String(text || ''));
  const buf = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function fieldsFingerprint(fields) {
  const keys = Object.keys(fields || {}).sort();
  return keys.map((k) => `${k}:${String(fields[k] || '').trim()}`).join('\n');
}

export function parseModelJson(raw) {
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

function systemPrompt(targetLang, kind) {
  const meta = LANG_NATIVE[targetLang] || LANG_NATIVE.en;
  const kindHint = kind === 'faq'
    ? 'This is a product FAQ for an optical lens that restores smartwatch sensors on tattooed skin. Keep HTML tags (<strong>, <a href="...">) intact. Keep brand names (Sensor Tattoo Fix, Apple Watch, Garmin, Samsung, PayPal). Adapt how locals talk about watches, tattoos, payments and shipping — not a literal translation.'
    : kind === 'review'
      ? 'This is a short customer testimonial. Keep the person\'s name as-is. Sound like a real local review, not marketing copy.'
      : 'This is a community forum post or reply written by a customer. Keep the original meaning, tone and any product/model names. Write how a native in that country would write a forum comment — informal if the source is informal.';
  return `You are a native ${meta.name} copywriter for Sensor Tattoo Fix (${meta.region}).
${kindHint}
Return ONLY a JSON object with the same keys as the input. No markdown, no commentary.
Do not invent facts. Do not drop links or @handles.`;
}

async function runLlama(env, messages) {
  if (!env?.AI || typeof env.AI.run !== 'function') return null;
  const out = await env.AI.run(L10N_MODEL, { messages, max_tokens: 1200 });
  if (typeof out === 'string') return out;
  if (out && typeof out.response === 'string') return out.response;
  if (out && typeof out.result === 'string') return out.result;
  return null;
}

/**
 * @param {object} env Cloudflare env (AI binding)
 * @param {{ sourceLang: string, fields: Record<string,string>, targetLang: string, kind: string }} opts
 * @returns {Promise<Record<string,string>|null>}
 */
export async function localizeFields(env, { sourceLang, fields, targetLang, kind }) {
  const src = normalizeSiteLang(sourceLang);
  const tgt = normalizeSiteLang(targetLang);
  if (src === tgt) return { ...fields };
  const keys = Object.keys(fields || {}).filter((k) => String(fields[k] || '').trim());
  if (!keys.length) return {};
  const payload = {};
  keys.forEach((k) => { payload[k] = String(fields[k] || ''); });
  try {
    const raw = await runLlama(env, [
      { role: 'system', content: systemPrompt(tgt, kind) },
      { role: 'user', content: `Source language: ${LANG_NATIVE[src]?.name || src}\nJSON:\n${JSON.stringify(payload)}` }
    ]);
    const parsed = parseModelJson(raw);
    if (!parsed) return null;
    const out = {};
    keys.forEach((k) => {
      const v = parsed[k];
      out[k] = v != null && String(v).trim() ? String(v) : payload[k];
    });
    return out;
  } catch (err) {
    console.warn('site-l10n: AI failed', tgt, err?.message || err);
    return null;
  }
}

export async function localizeToAllLangs(env, { sourceLang, fields, kind, targets }) {
  const src = normalizeSiteLang(sourceLang);
  const langs = Array.isArray(targets) && targets.length
    ? targets.map(normalizeSiteLang).filter((l) => l !== src)
    : otherSiteLangs(src);
  const i18n = {};
  for (const lang of langs) {
    const pack = await localizeFields(env, { sourceLang: src, fields, targetLang: lang, kind });
    if (pack && Object.keys(pack).length) i18n[lang] = pack;
  }
  return i18n;
}

export function seedFaqI18nFromLegacy(item) {
  const i18n = { ...(item?.i18n && typeof item.i18n === 'object' ? item.i18n : {}) };
  const pairs = [
    ['en', 'questionEn', 'answerEn'],
    ['it', 'questionIt', 'answerIt'],
    ['de', 'questionDe', 'answerDe'],
    ['es', 'questionEs', 'answerEs'],
    ['pl', 'questionPl', 'answerPl'],
    ['sl', 'questionSl', 'answerSl']
  ];
  pairs.forEach(([lang, qk, ak]) => {
    const q = String(item?.[qk] || '').trim();
    const a = String(item?.[ak] || '').trim();
    if (!q && !a) return;
    i18n[lang] = {
      question: String(i18n[lang]?.question || q || ''),
      answer: String(i18n[lang]?.answer || a || '')
    };
  });
  return i18n;
}

export function pickLocalizedField(row, field, lang, fallbackField) {
  const want = normalizeSiteLang(lang);
  if (want === 'pt') return String(row?.[fallbackField || field] || row?.[field] || '');
  const fromI18n = row?.i18n?.[want]?.[field];
  if (fromI18n) return String(fromI18n);
  const suffix = { en: 'En', it: 'It', de: 'De', es: 'Es', pl: 'Pl', sl: 'Sl' }[want];
  if (suffix && row?.[field + suffix]) return String(row[field + suffix]);
  return String(row?.[fallbackField || field] || row?.[field] || '');
}

export async function refreshFaqItemI18n(env, item) {
  const question = String(item?.question || '').trim();
  const answer = String(item?.answer || '').trim();
  if (!question && !answer) return item;
  const fp = fieldsFingerprint({ question, answer });
  const hash = await hashSource(fp);
  const ptChanged = Boolean(item.i18nHash) && item.i18nHash !== hash;
  // PT mudou → descarta i18n antigo (mantém só campos legado EN/IT no seed).
  const seeded = seedFaqI18nFromLegacy(ptChanged ? { ...item, i18n: {} } : item);
  const missing = otherSiteLangs('pt').filter((lang) => {
    const pack = seeded[lang];
    return !pack || !String(pack.question || '').trim();
  });
  if (item.i18nHash === hash && !missing.length) {
    return { ...item, i18n: seeded, i18nHash: hash, sourceLang: 'pt' };
  }
  const targets = ptChanged ? otherSiteLangs('pt') : missing;
  const generated = targets.length
    ? await localizeToAllLangs(env, {
      sourceLang: 'pt',
      fields: { question, answer },
      kind: 'faq',
      targets
    })
    : {};
  const i18n = ptChanged
    ? { ...seedFaqI18nFromLegacy({ ...item, i18n: {} }), ...generated }
    : { ...seeded, ...generated };
  return { ...item, i18n, i18nHash: hash, sourceLang: 'pt' };
}

function seedReviewI18nFromLegacy(item) {
  const i18n = { ...(item?.i18n && typeof item.i18n === 'object' ? item.i18n : {}) };
  if (item?.bodyEn || item?.authorEn || item?.sourceEn) {
    i18n.en = {
      body: item.bodyEn || i18n.en?.body || '',
      author: item.authorEn || i18n.en?.author || '',
      source: item.sourceEn || i18n.en?.source || ''
    };
  }
  if (item?.bodyIt || item?.authorIt || item?.sourceIt) {
    i18n.it = {
      body: item.bodyIt || i18n.it?.body || '',
      author: item.authorIt || i18n.it?.author || '',
      source: item.sourceIt || i18n.it?.source || ''
    };
  }
  return i18n;
}

export async function refreshReviewItemI18n(env, item) {
  const body = String(item?.body || '').trim();
  if (!body) return item;
  const fp = fieldsFingerprint({
    body,
    author: String(item?.author || ''),
    source: String(item?.source || '')
  });
  const hash = await hashSource(fp);
  const ptChanged = Boolean(item.i18nHash) && item.i18nHash !== hash;
  const i18n = seedReviewI18nFromLegacy(ptChanged ? { ...item, i18n: {} } : item);
  const missing = otherSiteLangs('pt').filter((lang) => !String(i18n[lang]?.body || '').trim());
  if (item.i18nHash === hash && !missing.length) {
    return { ...item, i18n, i18nHash: hash, sourceLang: 'pt' };
  }
  const targets = ptChanged ? otherSiteLangs('pt') : missing;
  const generated = targets.length
    ? await localizeToAllLangs(env, {
      sourceLang: 'pt',
      fields: {
        body,
        author: String(item?.author || ''),
        source: String(item?.source || '')
      },
      kind: 'review',
      targets
    })
    : {};
  otherSiteLangs('pt').forEach((lang) => {
    if (generated[lang]) i18n[lang] = generated[lang];
  });
  return { ...item, i18n, i18nHash: hash, sourceLang: 'pt' };
}

export function mergePreservedI18n(incoming, previous) {
  const prevById = new Map((previous || []).filter((p) => p && p.id).map((p) => [p.id, p]));
  return (incoming || []).map((item) => {
    if (!item || !item.id) return item;
    const prev = prevById.get(item.id);
    if (!prev) return item;
    const hasIncoming = item.i18n && typeof item.i18n === 'object' && Object.keys(item.i18n).length;
    return {
      ...item,
      i18n: hasIncoming ? item.i18n : (prev.i18n || item.i18n),
      i18nHash: item.i18nHash || prev.i18nHash,
      questionEn: item.questionEn || prev.questionEn,
      questionIt: item.questionIt || prev.questionIt,
      answerEn: item.answerEn || prev.answerEn,
      answerIt: item.answerIt || prev.answerIt,
      bodyEn: item.bodyEn || prev.bodyEn,
      bodyIt: item.bodyIt || prev.bodyIt,
      authorEn: item.authorEn || prev.authorEn,
      authorIt: item.authorIt || prev.authorIt,
      sourceEn: item.sourceEn || prev.sourceEn,
      sourceIt: item.sourceIt || prev.sourceIt
    };
  });
}

/**
 * Gera i18n faltante de FAQ/elogios.
 * onProgress(partialConfig) — chamado após cada item (para save incremental no KV).
 */
export async function refreshHomeContentI18n(env, config, { onProgress } = {}) {
  const homeFaq = Array.isArray(config?.homeFaq) ? [...config.homeFaq] : [];
  const homeReviews = Array.isArray(config?.homeReviews) ? [...config.homeReviews] : [];

  const emit = async () => {
    if (typeof onProgress !== 'function') return;
    await onProgress({ ...config, homeFaq: [...homeFaq], homeReviews: [...homeReviews] });
  };

  for (let i = 0; i < homeFaq.length; i += 1) {
    homeFaq[i] = await refreshFaqItemI18n(env, homeFaq[i]);
    await emit();
  }
  for (let i = 0; i < homeReviews.length; i += 1) {
    homeReviews[i] = await refreshReviewItemI18n(env, homeReviews[i]);
    await emit();
  }
  return { ...config, homeFaq, homeReviews };
}

/** Conta itens ainda sem i18n completo (todas as línguas intl). */
export function homeContentI18nStatus(config) {
  const faq = Array.isArray(config?.homeFaq) ? config.homeFaq : [];
  const reviews = Array.isArray(config?.homeReviews) ? config.homeReviews : [];
  const faqReady = faq.filter((item) => {
    const i18n = item?.i18n || {};
    return otherSiteLangs('pt').every((lang) => String(i18n[lang]?.question || '').trim());
  }).length;
  const reviewsReady = reviews.filter((item) => {
    const i18n = item?.i18n || {};
    return otherSiteLangs('pt').every((lang) => String(i18n[lang]?.body || '').trim());
  }).length;
  return {
    faqTotal: faq.length,
    faqReady,
    faqPending: Math.max(0, faq.length - faqReady),
    reviewsTotal: reviews.length,
    reviewsReady,
    reviewsPending: Math.max(0, reviews.length - reviewsReady)
  };
}

export async function localizeForumThreadFields(env, thread) {
  const sourceLang = normalizeSiteLang(thread?.sourceLang || thread?.lang || 'pt');
  const fields = {
    title: String(thread?.title || ''),
    body: String(thread?.body || '')
  };
  const fp = fieldsFingerprint(fields);
  const hash = await hashSource(`${sourceLang}\n${fp}`);
  if (thread.i18nHash === hash && thread.i18n && Object.keys(thread.i18n).length) {
    return thread;
  }
  const i18n = { ...(thread.i18n || {}) };
  const generated = await localizeToAllLangs(env, { sourceLang, fields, kind: 'forum' });
  Object.assign(i18n, generated);
  return { ...thread, sourceLang, lang: sourceLang, i18n, i18nHash: hash };
}

export async function localizeForumReplyFields(env, reply) {
  const sourceLang = normalizeSiteLang(reply?.sourceLang || reply?.lang || 'pt');
  const fields = { body: String(reply?.body || '') };
  const fp = fieldsFingerprint(fields);
  const hash = await hashSource(`${sourceLang}\n${fp}`);
  if (reply.i18nHash === hash && reply.i18n && Object.keys(reply.i18n).length) {
    return reply;
  }
  const i18n = { ...(reply.i18n || {}) };
  const generated = await localizeToAllLangs(env, { sourceLang, fields, kind: 'forum' });
  Object.assign(i18n, generated);
  return { ...reply, sourceLang, lang: sourceLang, i18n, i18nHash: hash };
}
