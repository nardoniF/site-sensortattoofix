import { buildForumSeedLangPacks } from './forum-seeds.js';

/**
 * Community forum — gated to testers until publicly enabled.
 * Storage: KV. Media: https image URLs + YouTube/Vimeo embeds (R2 later).
 */

const FORUM_META_KEY = 'forum:meta';
const FORUM_INDEX_KEY = 'forum:index';
const FORUM_INDEX_MAX = 400;
const FORUM_REPLIES_MAX = 200;
const FORUM_BODY_MAX = 8000;
const FORUM_TITLE_MAX = 120;

export const FORUM_AVATARS = [
  { id: 'watch', label: 'Relógio', emoji: '⌚' },
  { id: 'ink', label: 'Tinta', emoji: '🖋️' },
  { id: 'sensor', label: 'Sensor', emoji: '📡' },
  { id: 'heart', label: 'Coração', emoji: '❤️' },
  { id: 'star', label: 'Estrela', emoji: '⭐' },
  { id: 'bolt', label: 'Raio', emoji: '⚡' },
  { id: 'moon', label: 'Lua', emoji: '🌙' },
  { id: 'sun', label: 'Sol', emoji: '☀️' },
  { id: 'leaf', label: 'Folha', emoji: '🍃' },
  { id: 'rocket', label: 'Foguete', emoji: '🚀' },
  { id: 'shield', label: 'Escudo', emoji: '🛡️' },
  { id: 'gem', label: 'Gema', emoji: '💎' }
];

const AVATAR_IDS = new Set(FORUM_AVATARS.map((a) => a.id));

function slugify(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'topico';
}

function normalizeUsername(raw) {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 20);
}

function isValidUsername(u) {
  return /^[a-z0-9_]{3,20}$/.test(u);
}

function sanitizeMediaList(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const item of raw.slice(0, 6)) {
    const type = String(item?.type || '').toLowerCase();
    const url = String(item?.url || '').trim();
    if (!/^https:\/\//i.test(url) || url.length > 500) continue;
    if (type === 'image') out.push({ type: 'image', url });
    else if (type === 'video' && /youtube\.com|youtu\.be|vimeo\.com/i.test(url)) {
      out.push({ type: 'video', url });
    }
  }
  return out;
}

function publicAuthor(user, replyCounts) {
  const avatarId = AVATAR_IDS.has(user.avatarId) ? user.avatarId : 'watch';
  const avatar = FORUM_AVATARS.find((a) => a.id === avatarId) || FORUM_AVATARS[0];
  const base = {
    userId: user.userId,
    nome: user.nome || '',
    username: user.username || '',
    avatarId,
    avatarEmoji: avatar.emoji,
    isTester: !!user.isTester
  };
  return decorateAuthorSuper(base, replyCounts);
}

const SUPER_COLLAB_MIN_REPLIES = 6; // mais de 5 respostas publicadas

async function getPublishedReplyCounts(env) {
  const index = await getThreadIndex(env);
  const counts = new Map();
  for (const id of index.slice(0, 150)) {
    const replies = await getReplies(env, id);
    for (const r of replies) {
      if (r.status !== 'published') continue;
      if (r.official || r.author?.isOfficial || r.author?.username === 'sensortattoofix') continue;
      const author = remapSeedAuthor(r.author) || r.author;
      if (author?.userId) counts.set(author.userId, (counts.get(author.userId) || 0) + 1);
      if (author?.username) counts.set(author.username, (counts.get(author.username) || 0) + 1);
    }
  }
  return counts;
}

function authorReplyCount(author, replyCounts) {
  if (!author || !replyCounts) return 0;
  return Math.max(
    replyCounts.get(author.userId) || 0,
    replyCounts.get(author.username) || 0
  );
}

function decorateAuthorSuper(author, replyCounts) {
  if (!author) return author;
  const a = remapSeedAuthor(author);
  if (a.isOfficial || a.username === 'sensortattoofix') return a;
  const n = authorReplyCount(a, replyCounts);
  const isSuper = !!(a.isSuperCollaborator || n >= SUPER_COLLAB_MIN_REPLIES);
  return { ...a, isSuperCollaborator: isSuper, publishedReplyTotal: n };
}

function publicThread(thread, { includeBody = true, replyCounts = null, lang = 'pt' } = {}) {
  const loc = localizedThreadFields(thread, lang);
  const base = {
    id: thread.id,
    slug: thread.slug,
    title: loc.title,
    status: thread.status,
    createdAt: thread.createdAt,
    updatedAt: thread.updatedAt,
    replyCount: thread.replyCount || 0,
    publishedReplyCount: thread.publishedReplyCount || 0,
    tags: thread.tags || [],
    lang: normalizeForumLang(lang),
    sourceLang: loc.sourceLang,
    author: decorateAuthorSuper(thread.author, replyCounts),
    media: thread.media || [],
    seeded: !!thread.seeded,
    hasI18n: !!(thread.i18n && Object.keys(thread.i18n).length)
  };
  if (includeBody) base.body = loc.body;
  else base.excerpt = String(loc.body || '').slice(0, 180);
  return base;
}

function publicReply(reply, replyCounts = null, lang = 'pt') {
  return {
    id: reply.id,
    body: localizedReplyBody(reply, lang),
    status: reply.status,
    createdAt: reply.createdAt,
    author: decorateAuthorSuper(reply.author, replyCounts),
    media: reply.media || [],
    seeded: !!reply.seeded,
    official: !!(reply.official || reply.author?.isOfficial),
    parentId: reply.parentId || null,
    sourceLang: normalizeForumLang(reply.sourceLang || reply.lang || 'pt')
  };
}

async function getForumMeta(env) {
  try {
    const raw = await env.STORE_KV.get(FORUM_META_KEY);
    if (!raw) return { public: false, seeded: false };
    return { public: false, seeded: false, ...JSON.parse(raw) };
  } catch {
    return { public: false, seeded: false };
  }
}

async function saveForumMeta(env, meta) {
  await env.STORE_KV.put(FORUM_META_KEY, JSON.stringify(meta));
}

async function getThreadIndex(env) {
  try {
    return JSON.parse((await env.STORE_KV.get(FORUM_INDEX_KEY)) || '[]');
  } catch {
    return [];
  }
}

async function saveThreadIndex(env, ids) {
  await env.STORE_KV.put(FORUM_INDEX_KEY, JSON.stringify(ids.slice(0, FORUM_INDEX_MAX)));
}

async function getThread(env, id) {
  const raw = await env.STORE_KV.get('forum:thread:' + id);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

async function saveThread(env, thread) {
  await env.STORE_KV.put('forum:thread:' + thread.id, JSON.stringify(thread));
  if (thread.slug) await env.STORE_KV.put('forum:slug:' + thread.slug, thread.id);
}

async function deleteThreadCompletely(env, threadId) {
  const thread = await getThread(env, threadId);
  if (!thread) return false;
  if (thread.slug) {
    try { await env.STORE_KV.delete('forum:slug:' + thread.slug); } catch (e) { /* ignore */ }
  }
  try { await env.STORE_KV.delete('forum:thread:' + threadId); } catch (e) { /* ignore */ }
  try { await env.STORE_KV.delete('forum:replies:' + threadId); } catch (e) { /* ignore */ }
  const index = await getThreadIndex(env);
  await saveThreadIndex(env, index.filter((id) => id !== threadId));
  return true;
}

async function getReplies(env, threadId) {
  try {
    return JSON.parse((await env.STORE_KV.get('forum:replies:' + threadId)) || '[]');
  } catch {
    return [];
  }
}

async function saveReplies(env, threadId, replies) {
  await env.STORE_KV.put('forum:replies:' + threadId, JSON.stringify(replies.slice(-FORUM_REPLIES_MAX)));
}

async function resolveThreadByParam(env, param) {
  const key = String(param || '').trim();
  if (!key) return null;
  let thread = await getThread(env, key);
  if (thread) return thread;
  const id = await env.STORE_KV.get('forum:slug:' + key);
  if (id) return getThread(env, id);
  return null;
}

async function canAccessForum(env, deps, request) {
  const meta = await getForumMeta(env);
  const adminOk = await deps.isValidSession(env, deps.bearerToken(request));
  const userId = await deps.getCustomerUserId(env, deps.bearerToken(request));
  const user = userId ? await deps.getUserById(env, userId) : null;

  // Mesmo com fórum público, anexar o cliente logado (senão o front não reconhece a sessão ao postar).
  if (meta.public) {
    if (adminOk) return { ok: true, meta, role: 'admin', user: user || null };
    return { ok: true, meta, role: user ? 'user' : 'public', user: user || null };
  }
  if (adminOk) return { ok: true, meta, role: 'admin', user: user || null };
  if (!user) return { ok: false, meta, role: null, reason: 'login' };
  if (user.isTester) return { ok: true, meta, role: 'tester', user };
  return { ok: false, meta, role: 'user', user, reason: 'tester' };
}

async function requireForumWriter(env, deps, request) {
  // Postar / responder exige conta cadastrada (cliente logado) — nunca anônimo.
  const userId = await deps.getCustomerUserId(env, deps.bearerToken(request));
  if (!userId) {
    return {
      error: 'Para postar, crie uma conta e faça login em Minha Conta.',
      status: 401,
      access: null,
      needRegister: true
    };
  }
  const user = await deps.getUserById(env, userId);
  if (!user) {
    return {
      error: 'Conta não encontrada. Cadastre-se em Minha Conta para participar.',
      status: 401,
      access: null,
      needRegister: true
    };
  }
  const access = await canAccessForum(env, deps, request);
  if (!access.ok) {
    return {
      error: access.reason === 'tester'
        ? 'Comunidade em desenvolvimento — disponível para usuários de teste.'
        : 'Para postar, crie uma conta e faça login em Minha Conta.',
      status: 403,
      access,
      needRegister: access.reason === 'login'
    };
  }
  if (!access.meta.public && !user.isTester) {
    return {
      error: 'Somente usuários de teste podem postar enquanto a comunidade está em desenvolvimento.',
      status: 403,
      access
    };
  }
  if (!user.username || !isValidUsername(user.username)) {
    return { error: 'Escolha um nome de usuário na comunidade antes de postar.', status: 400, access, needUsername: true };
  }
  if (!AVATAR_IDS.has(user.avatarId)) {
    return { error: 'Escolha um avatar antes de postar.', status: 400, access, needAvatar: true };
  }
  return { access, user, isAdmin: false };
}


const OFFICIAL_AUTHOR = {
  userId: 'seed-official-stf',
  nome: 'Sensor Tattoo Fix',
  username: 'sensortattoofix',
  avatarId: 'shield',
  avatarEmoji: '🛡️',
  isOfficial: true
};

/**
 * Personas orgânicas — misturam apelido, número e (às vezes) nome composto.
 * Sem padrão fixo tipo primeiro+sobrenome em todos.
 */
const SEED_AUTHORS = {
  'seed-guga': { userId: 'seed-guga', nome: 'Guga', username: 'guga97', avatarId: 'ink', avatarEmoji: '🖋️' },
  'seed-kai': { userId: 'seed-kai', nome: 'Kai', username: 'inkedrunner', avatarId: 'bolt', avatarEmoji: '⚡' },
  'seed-dudu': { userId: 'seed-dudu', nome: 'Dudu', username: 'dudutattoo', avatarId: 'watch', avatarEmoji: '⌚' },
  'seed-bruno': { userId: 'seed-bruno', nome: 'Bruno', username: 'brn_move', avatarId: 'bolt', avatarEmoji: '⚡' },
  'seed-felipe': { userId: 'seed-felipe', nome: 'Felipe', username: 'felipecardio', avatarId: 'heart', avatarEmoji: '❤️' },
  'seed-diego': { userId: 'seed-diego', nome: 'Diego', username: 'diego_runs', avatarId: 'bolt', avatarEmoji: '⚡' },
  'seed-andre': { userId: 'seed-andre', nome: 'André', username: 'andre_74', avatarId: 'watch', avatarEmoji: '⌚' },
  'seed-marcelo': { userId: 'seed-marcelo', nome: 'Marcelo', username: 'celomove', avatarId: 'rocket', avatarEmoji: '🚀' },
  'seed-fernanda': { userId: 'seed-fernanda', nome: 'Fernanda', username: 'fe_noite', avatarId: 'moon', avatarEmoji: '🌙' },
  'seed-camila': { userId: 'seed-camila', nome: 'Camila', username: 'camila_fit', avatarId: 'heart', avatarEmoji: '❤️' },
  'seed-pedro': { userId: 'seed-pedro', nome: 'Pedro', username: 'pedro_ink', avatarId: 'ink', avatarEmoji: '🖋️' },
  'seed-rafa': { userId: 'seed-rafa', nome: 'Rafa', username: 'rafarun', avatarId: 'leaf', avatarEmoji: '🍃' },
  'seed-henrique': { userId: 'seed-henrique', nome: 'Henrique', username: 'rickpace', avatarId: 'bolt', avatarEmoji: '⚡' },
  'seed-carlos': { userId: 'seed-carlos', nome: 'Carlos', username: 'carloscwb', avatarId: 'watch', avatarEmoji: '⌚' },
  'seed-rodrigo': { userId: 'seed-rodrigo', nome: 'Rodrigo', username: 'rodri_85', avatarId: 'sensor', avatarEmoji: '📡' },
  'seed-daniel': { userId: 'seed-daniel', nome: 'Daniel', username: 'dan_ontrack', avatarId: 'rocket', avatarEmoji: '🚀' },
  'seed-marina': { userId: 'seed-marina', nome: 'Marina', username: 'marina_lua', avatarId: 'moon', avatarEmoji: '🌙' },
  'seed-ricardo': { userId: 'seed-ricardo', nome: 'Ricardo', username: 'ricao_sp', avatarId: 'watch', avatarEmoji: '⌚' },
  'seed-leandro': { userId: 'seed-leandro', nome: 'Leandro', username: 'leo_tri', avatarId: 'bolt', avatarEmoji: '⚡' },
  'seed-gustavo': { userId: 'seed-gustavo', nome: 'Gustavo', username: 'gustavo77', avatarId: 'star', avatarEmoji: '⭐' },
  'seed-joao': { userId: 'seed-joao', nome: 'João', username: 'joaotattoo', avatarId: 'rocket', avatarEmoji: '🚀' },
  'seed-thiago': { userId: 'seed-thiago', nome: 'Thiago', username: 'tgsport', avatarId: 'heart', avatarEmoji: '❤️' },
  'seed-lucas': { userId: 'seed-lucas', nome: 'Lucas', username: 'lucas_amz', avatarId: 'moon', avatarEmoji: '🌙' },
  'seed-eduardo': { userId: 'seed-eduardo', nome: 'Eduardo', username: 'dudu_clock', avatarId: 'watch', avatarEmoji: '⌚' },
  'seed-alex': { userId: 'seed-alex', nome: 'Alex', username: 'alex_rn', avatarId: 'leaf', avatarEmoji: '🍃' },
  'seed-vini': { userId: 'seed-vini', nome: 'Vini', username: 'vinilabs', avatarId: 'sensor', avatarEmoji: '📡' },
  'seed-gabriel': { userId: 'seed-gabriel', nome: 'Gabriel', username: 'gab_works', avatarId: 'rocket', avatarEmoji: '🚀' },
  'seed-ana': { userId: 'seed-ana', nome: 'Ana', username: 'aninha_w', avatarId: 'moon', avatarEmoji: '🌙' },
  'seed-marcos': { userId: 'seed-marcos', nome: 'Marcos', username: 'mk_run', avatarId: 'bolt', avatarEmoji: '⚡' },
  'seed-juliana': { userId: 'seed-juliana', nome: 'Júlia', username: 'julia_ink', avatarId: 'sun', avatarEmoji: '☀️' },
  'seed-leo': { userId: 'seed-leo', nome: 'Léo', username: 'leozinho88', avatarId: 'moon', avatarEmoji: '🌙' },
  'seed-renato': { userId: 'seed-renato', nome: 'Renato', username: 'renatozero', avatarId: 'watch', avatarEmoji: '⌚' },
  'seed-patricia': { userId: 'seed-patricia', nome: 'Patrícia', username: 'pat_track', avatarId: 'heart', avatarEmoji: '❤️' },
  'seed-fernando': { userId: 'seed-fernando', nome: 'Fernando', username: 'nando_22', avatarId: 'rocket', avatarEmoji: '🚀' },
  'seed-jordan': { userId: 'seed-jordan', nome: 'Jordan', username: 'jord_watch', avatarId: 'watch', avatarEmoji: '⌚' },
  'seed-jeff': { userId: 'seed-jeff', nome: 'Jeff', username: 'jeff_runs', avatarId: 'bolt', avatarEmoji: '⚡' },
  'seed-hunt': { userId: 'seed-hunt', nome: 'Hunt', username: 'huntmetrics', avatarId: 'sensor', avatarEmoji: '📡' },
  'seed-writer': { userId: 'seed-writer', nome: 'Writer', username: 'nightwriter', avatarId: 'moon', avatarEmoji: '🌙' },
  'seed-huck': { userId: 'seed-huck', nome: 'Huck', username: 'huckfit', avatarId: 'heart', avatarEmoji: '❤️' },
  'seed-moth': { userId: 'seed-moth', nome: 'Moth', username: 'mothsignal', avatarId: 'moon', avatarEmoji: '🌙' },
  'seed-omens': { userId: 'seed-omens', nome: 'Omens', username: 'omens_90', avatarId: 'star', avatarEmoji: '⭐' },
  'seed-syrup': { userId: 'seed-syrup', nome: 'Syrup', username: 'syrupwatch', avatarId: 'watch', avatarEmoji: '⌚' },
  'seed-edurunner': { userId: 'seed-edurunner', nome: 'Edu Runner', username: 'edurunner', avatarId: 'bolt', avatarEmoji: '⚡' },
  'seed-malu': { userId: 'seed-malu', nome: 'Malu', username: 'malu_tat', avatarId: 'star', avatarEmoji: '⭐' },
  'seed-pri': { userId: 'seed-pri', nome: 'Pri', username: 'pri_ink', avatarId: 'leaf', avatarEmoji: '🍃' },
  'seed-bela': { userId: 'seed-bela', nome: 'Bela', username: 'bela_sp', avatarId: 'star', avatarEmoji: '⭐' },
  'seed-marcinha': { userId: 'seed-marcinha', nome: 'Marcinha', username: 'marcinha', avatarId: 'heart', avatarEmoji: '❤️' },
  'seed-rick': { userId: 'seed-rick', nome: 'Rick Souza', username: 'ricksouza', avatarId: 'sensor', avatarEmoji: '📡' },
  'seed-nati': { userId: 'seed-nati', nome: 'Nati', username: 'natiink', avatarId: 'gem', avatarEmoji: '💎' },
  'seed-raf': { userId: 'seed-raf', nome: 'Rafael', username: 'raf_monkey', avatarId: 'leaf', avatarEmoji: '🍃' },
  'seed-lu': { userId: 'seed-lu', nome: 'Lu', username: 'lu_tatto', avatarId: 'leaf', avatarEmoji: '🍃' },
  'seed-rita': { userId: 'seed-rita', nome: 'Rita', username: 'rita_fit', avatarId: 'heart', avatarEmoji: '❤️' },
  'seed-simo': { userId: 'seed-simo', nome: 'Simone', username: 'simo_run', avatarId: 'moon', avatarEmoji: '🌙' },
  'seed-chris': { userId: 'seed-chris', nome: 'TechRunner', username: 'techrunner', avatarId: 'rocket', avatarEmoji: '🚀', isSuperCollaborator: true },
  'seed-edu': { userId: 'seed-edu', nome: 'SensorGuru', username: 'sensorguru', avatarId: 'sensor', avatarEmoji: '📡', isSuperCollaborator: true }
};

function remapSeedAuthor(author) {
  if (!author) return author;
  const mapped = SEED_AUTHORS[author.userId];
  if (mapped) return { ...mapped };
  if (author.isOfficial || author.username === 'sensortattoofix' || author.userId === OFFICIAL_AUTHOR.userId) {
    return { ...OFFICIAL_AUTHOR };
  }
  if (author.isTester && String(author.userId || '').startsWith('seed-')) {
    const next = { ...author };
    delete next.isTester;
    return next;
  }
  return author;
}

function officialReply(body, createdAt) {
  return {
    body,
    author: { ...OFFICIAL_AUTHOR },
    createdAt,
    official: true
  };
}

function normalizeForumLang(raw) {
  const l = String(raw || '').trim().toLowerCase().slice(0, 2);
  if (l === 'en' || l === 'it') return l;
  return 'pt';
}

function threadMatchesLang(thread, lang) {
  const want = normalizeForumLang(lang);
  // Unified i18n threads are visible in every locale.
  if (thread?.i18n && typeof thread.i18n === 'object') return true;
  const have = normalizeForumLang(thread?.lang || thread?.sourceLang || 'pt');
  return have === want;
}

function pickLocalized(map, lang, fallback) {
  const want = normalizeForumLang(lang);
  if (map && typeof map === 'object') {
    const hit = map[want];
    if (hit != null && String(hit).trim()) return String(hit);
  }
  return fallback == null ? '' : String(fallback);
}

function localizedThreadFields(thread, lang) {
  const sourceLang = normalizeForumLang(thread?.sourceLang || thread?.lang || 'pt');
  const want = normalizeForumLang(lang);
  const i18n = thread?.i18n || {};
  const pack = i18n[want] || {};
  return {
    sourceLang,
    title: want === sourceLang
      ? String(thread?.title || '')
      : pickLocalized(pack, want, thread?.title),
    body: want === sourceLang
      ? String(thread?.body || '')
      : pickLocalized(pack, want, thread?.body)
  };
}

function localizedReplyBody(reply, lang) {
  const sourceLang = normalizeForumLang(reply?.sourceLang || reply?.lang || 'pt');
  const want = normalizeForumLang(lang);
  if (want === sourceLang) return String(reply?.body || '');
  const pack = reply?.i18n?.[want];
  if (pack && typeof pack === 'object' && pack.body) return String(pack.body);
  if (typeof pack === 'string' && pack.trim()) return pack;
  return String(reply?.body || '');
}

/** Merge PT/EN/IT packs into one topic with translations (same slug, not 3 clones). */
function mergeSeedLangPacks(pt, en, it) {
  const n = Math.max(pt.length, en.length, it.length);
  const out = [];
  for (let i = 0; i < n; i += 1) {
    const p = pt[i];
    const e = en[i];
    const t = it[i];
    const base = p || e || t;
    if (!base) continue;
    const sourceLang = p ? 'pt' : (e ? 'en' : 'it');
    const source = p || e || t;
    const replyCount = Math.max(
      (p?.replies || []).length,
      (e?.replies || []).length,
      (t?.replies || []).length
    );
    const replies = [];
    for (let r = 0; r < replyCount; r += 1) {
      const rp = p?.replies?.[r];
      const re = e?.replies?.[r];
      const rt = t?.replies?.[r];
      const rb = rp || re || rt;
      if (!rb) continue;
      const rSourceLang = rp ? 'pt' : (re ? 'en' : 'it');
      const rSource = rp || re || rt;
      replies.push({
        body: rSource.body,
        author: rSource.author,
        createdAt: rSource.createdAt,
        official: !!(rSource.official || rSource.author?.isOfficial),
        ref: rSource.ref,
        parentRef: rSource.parentRef,
        sourceLang: rSourceLang,
        i18n: {
          ...(re && rSourceLang !== 'en' ? { en: { body: re.body } } : {}),
          ...(rt && rSourceLang !== 'it' ? { it: { body: rt.body } } : {}),
          ...(rp && rSourceLang !== 'pt' ? { pt: { body: rp.body } } : {})
        }
      });
    }
    out.push({
      title: source.title,
      body: source.body,
      tags: source.tags || base.tags || [],
      author: source.author || base.author,
      createdAt: source.createdAt || base.createdAt,
      media: source.media || [],
      sourceLang,
      lang: sourceLang,
      replies,
      i18n: {
        ...(e && sourceLang !== 'en' ? { en: { title: e.title, body: e.body } } : {}),
        ...(t && sourceLang !== 'it' ? { it: { title: t.title, body: t.body } } : {}),
        ...(p && sourceLang !== 'pt' ? { pt: { title: p.title, body: p.body } } : {})
      }
    });
  }
  return out;
}

/** Tópicos baseados em dores reais — PT / EN / IT (mesmo fórum, filtrado por idioma). */
function seedPayload() {
  const baseDate = new Date('2025-12-25T12:00:00-03:00');
  const iso = (minsAgo) => new Date(baseDate.getTime() - minsAgo * 60000 * 7).toISOString();
  const { pt, en, it } = buildForumSeedLangPacks({ A: SEED_AUTHORS, officialReply, iso });
  return mergeSeedLangPacks(pt, en, it);
}

const RELATED_STOP = new Set([
  'de', 'da', 'do', 'das', 'dos', 'a', 'o', 'e', 'em', 'um', 'uma', 'uns', 'umas',
  'para', 'pra', 'com', 'que', 'no', 'na', 'nos', 'nas', 'por', 'pelo', 'pela',
  'seu', 'sua', 'meu', 'minha', 'ele', 'ela', 'eles', 'elas', 'voce', 'voces',
  'the', 'and', 'or', 'is', 'to', 'of', 'in', 'on', 'for', 'with', 'this', 'that',
  'alguem', 'passou', 'isso', 'aqui', 'como', 'mais', 'muito', 'sobre', 'apos',
  'quero', 'queria', 'fazer', 'tem', 'ter', 'foi', 'ser', 'sao', 'já', 'ja'
]);

function tokenizeRelated(q) {
  return String(q || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3 && !RELATED_STOP.has(t));
}

function scoreRelatedThread(thread, tokens) {
  if (!tokens.length) return 0;
  const title = String(thread.title || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const body = String(thread.body || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const tags = (thread.tags || []).join(' ').toLowerCase();
  let score = 0;
  for (const t of tokens) {
    if (title.includes(t)) score += 6;
    else if (tags.includes(t)) score += 4;
    else if (body.includes(t)) score += 2;
  }
  return score;
}

async function findRelatedThreads(env, query, { limit = 8, includePending = false, lang = 'pt' } = {}) {
  const tokens = tokenizeRelated(query);
  if (!tokens.length) return { tokens: [], matches: [] };
  const want = normalizeForumLang(lang);
  const index = await getThreadIndex(env);
  const scored = [];
  for (const id of index) {
    const thread = await getThread(env, id);
    if (!thread) continue;
    if (!threadMatchesLang(thread, want)) continue;
    if (!includePending && thread.status !== 'published') continue;
    if (includePending && thread.status === 'rejected') continue;
    const loc = localizedThreadFields(thread, want);
    const score = scoreRelatedThread({ title: loc.title, body: loc.body }, tokens);
    if (score < 4) continue;
    scored.push({ score, thread });
  }
  scored.sort((a, b) => b.score - a.score || String(b.thread.updatedAt || '').localeCompare(String(a.thread.updatedAt || '')));
  return {
    tokens,
    matches: scored.slice(0, limit).map(({ score, thread }) => ({
      score,
      ...publicThread(thread, { includeBody: false, lang: want })
    }))
  };
}

/** Atualiza usernames/avatars das personas seed já gravadas no KV. */
async function refreshSeedAuthors(env) {
  const index = await getThreadIndex(env);
  let threadsTouched = 0;
  let repliesTouched = 0;
  for (const id of index) {
    const thread = await getThread(env, id);
    if (!thread || !thread.seeded) continue;
    let changed = false;
    const seedAuthor = SEED_AUTHORS[thread.author?.userId];
    if (seedAuthor) {
      const cur = thread.author || {};
      if (
        cur.username !== seedAuthor.username
        || cur.avatarId !== seedAuthor.avatarId
        || cur.isTester
        || !!cur.isSuperCollaborator !== !!seedAuthor.isSuperCollaborator
      ) {
        thread.author = { ...seedAuthor };
        changed = true;
      }
    } else if (thread.author?.userId === OFFICIAL_AUTHOR.userId || thread.author?.username === 'sensortattoofix') {
      thread.author = { ...OFFICIAL_AUTHOR };
      changed = true;
    } else if (thread.author && thread.author.isTester) {
      const next = { ...thread.author };
      delete next.isTester;
      thread.author = next;
      changed = true;
    }
    const replies = await getReplies(env, id);
    let repliesChanged = false;
    for (const r of replies) {
      if (!r.seeded && !r.official && !r.author?.isOfficial) continue;
      const mapped = SEED_AUTHORS[r.author?.userId];
      if (mapped) {
        const cur = r.author || {};
        if (
          cur.username !== mapped.username
          || cur.avatarId !== mapped.avatarId
          || cur.isTester
          || !!cur.isSuperCollaborator !== !!mapped.isSuperCollaborator
        ) {
          r.author = { ...mapped };
          repliesChanged = true;
          repliesTouched += 1;
        }
      } else if (r.official || r.author?.isOfficial || r.author?.username === 'sensortattoofix') {
        const cur = r.author || {};
        if (cur.username !== OFFICIAL_AUTHOR.username || cur.isTester) {
          r.author = { ...OFFICIAL_AUTHOR };
          r.official = true;
          repliesChanged = true;
          repliesTouched += 1;
        }
      } else if (r.author && r.author.isTester) {
        const next = { ...r.author };
        delete next.isTester;
        r.author = next;
        repliesChanged = true;
        repliesTouched += 1;
      }
    }
    if (repliesChanged) await saveReplies(env, id, replies);
    if (changed || repliesChanged) {
      if (changed) thread.updatedAt = thread.updatedAt || new Date().toISOString();
      await saveThread(env, thread);
      threadsTouched += 1;
    }
  }
  const meta = await getForumMeta(env);
  const next = {
    ...meta,
    seedAuthorsVersion: SEED_AUTHORS_VERSION,
    seedAuthorsRefreshedAt: new Date().toISOString(),
    seedAuthorsRefresh: { threadsTouched, repliesTouched }
  };
  await saveForumMeta(env, next);
  return next;
}


/** Injeta respostas @sensortattoofix em threads seed que ainda não as têm. */
async function ensureOfficialReplies(env) {
  const meta = await getForumMeta(env);
  if (meta.officialRepliesAt) return meta;
  const index = await getThreadIndex(env);
  let added = 0;
  for (const id of index) {
    const thread = await getThread(env, id);
    if (!thread || !thread.seeded) continue;
    const replies = await getReplies(env, id);
    if (replies.some((r) => r.author?.username === 'sensortattoofix' || r.official || r.author?.isOfficial)) continue;
    const reply = {
      id: crypto.randomUUID(),
      body: 'Olá! Aqui é a equipe @sensortattoofix. Obrigado por participar da comunidade — estamos acompanhando e ajudamos no que precisar. 🖤',
      status: 'published',
      createdAt: new Date().toISOString(),
      author: { ...OFFICIAL_AUTHOR },
      media: [],
      seeded: true,
      official: true
    };
    replies.push(reply);
    await saveReplies(env, id, replies);
    thread.replyCount = replies.length;
    thread.publishedReplyCount = replies.filter((r) => r.status === 'published').length;
    thread.updatedAt = reply.createdAt;
    await saveThread(env, thread);
    added += 1;
  }
  const next = { ...meta, officialRepliesAt: new Date().toISOString(), officialRepliesAdded: added };
  await saveForumMeta(env, next);
  return next;
}


/** Libera leitura pública em produção (postar ainda exige cadastro). */
async function ensureForumPublic(env) {
  const meta = await getForumMeta(env);
  if (meta.public) return meta;
  const next = {
    ...meta,
    public: true,
    releasedAt: new Date().toISOString()
  };
  await saveForumMeta(env, next);
  return next;
}

const SEED_AUTHORS_VERSION = 7;
const SEED_CONTENT_VERSION = 17;

async function insertSeedThreads(env, existingIndex) {
  const seeds = seedPayload();
  const newIds = [];
  for (const s of seeds) {
    const id = crypto.randomUUID();
    const sourceLang = normalizeForumLang(s.sourceLang || s.lang || 'pt');
    let slug = slugify(s.title);
    if (await env.STORE_KV.get('forum:slug:' + slug)) slug = `${slug}-${id.slice(0, 6)}`;
    const replyItems = [];
    const refs = new Map();
    for (const r of (s.replies || [])) {
      const replyId = crypto.randomUUID();
      const reply = {
        id: replyId,
        body: r.body,
        status: 'published',
        createdAt: r.createdAt,
        author: r.author,
        media: [],
        seeded: true,
        lang: normalizeForumLang(r.sourceLang || sourceLang),
        sourceLang: normalizeForumLang(r.sourceLang || sourceLang),
        i18n: r.i18n || undefined,
        official: !!(r.official || r.author?.isOfficial)
      };
      if (r.ref) refs.set(r.ref, replyId);
      if (r.parentRef) reply.parentRef = r.parentRef;
      replyItems.push(reply);
    }
    for (const reply of replyItems) {
      if (reply.parentRef && refs.has(reply.parentRef)) {
        reply.parentId = refs.get(reply.parentRef);
      }
      delete reply.parentRef;
    }
    const replies = replyItems;
    const thread = {
      id,
      slug,
      title: s.title,
      body: s.body,
      status: 'published',
      createdAt: s.createdAt,
      updatedAt: replies.length ? replies[replies.length - 1].createdAt : s.createdAt,
      replyCount: replies.length,
      publishedReplyCount: replies.length,
      tags: s.tags || [],
      author: s.author,
      media: s.media || [],
      seeded: true,
      lang: sourceLang,
      sourceLang,
      i18n: s.i18n || undefined
    };
    await saveThread(env, thread);
    await saveReplies(env, id, replies);
    newIds.push(id);
  }
  await saveThreadIndex(env, [...newIds, ...existingIndex]);
  return newIds;
}

/** Remove tópicos seed antigos e grava o pacote atual (dores reais + nomes orgânicos). */
async function replaceSeededThreads(env) {
  const index = await getThreadIndex(env);
  const kept = [];
  let removed = 0;
  for (const id of index) {
    const thread = await getThread(env, id);
    if (!thread) continue;
    if (thread.seeded) {
      if (thread.slug) {
        try { await env.STORE_KV.delete('forum:slug:' + thread.slug); } catch (e) { /* ignore */ }
      }
      try { await env.STORE_KV.delete('forum:thread:' + id); } catch (e) { /* ignore */ }
      try { await env.STORE_KV.delete('forum:replies:' + id); } catch (e) { /* ignore */ }
      removed += 1;
    } else {
      kept.push(id);
    }
  }
  const newIds = await insertSeedThreads(env, kept);
  const meta = await getForumMeta(env);
  const next = {
    ...meta,
    seeded: true,
    seedAuthorsVersion: SEED_AUTHORS_VERSION,
    seedContentVersion: SEED_CONTENT_VERSION,
    seedAuthorsRefreshedAt: new Date().toISOString(),
    officialRepliesAt: new Date().toISOString(),
    seedReplace: { removed, added: newIds.length }
  };
  await saveForumMeta(env, next);
  return next;
}

async function ensureSeed(env) {
  const meta = await getForumMeta(env);
  if (!meta.seeded) {
    await insertSeedThreads(env, await getThreadIndex(env));
    const next = {
      ...meta,
      seeded: true,
      seedAuthorsVersion: SEED_AUTHORS_VERSION,
      seedContentVersion: SEED_CONTENT_VERSION,
      seedAuthorsRefreshedAt: new Date().toISOString(),
      officialRepliesAt: new Date().toISOString()
    };
    await saveForumMeta(env, next);
    return next;
  }
  return meta;
}

export async function handleForumRoute(request, env, origin, deps) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, '') || '/';
  const method = request.method;

  if (path === '/forum/sitemap.xml' && method === 'GET') {
    try {
      await ensureSeed(env);
      await ensureForumPublic(env);
      const metaNow = await getForumMeta(env);
      if (Number(metaNow.seedContentVersion || 0) < SEED_CONTENT_VERSION) {
        await replaceSeededThreads(env);
      }
    } catch (err) {
      console.warn('forum sitemap bootstrap:', err.message);
    }
    const index = await getThreadIndex(env);
    const urls = [];
    const hub = [
      { loc: 'https://www.sensortattoofix.com.br/comunidade.html', lang: 'pt' },
      { loc: 'https://www.sensortattoofix.com/comunidade.html', lang: 'en' },
      { loc: 'https://www.sensortattoofix.com/it/comunidade.html', lang: 'it' }
    ];
    for (const h of hub) {
      urls.push(`  <url>\n    <loc>${h.loc}</loc>\n    <changefreq>daily</changefreq>\n    <priority>0.75</priority>\n  </url>`);
    }
    for (const id of index.slice(0, 300)) {
      const t = await getThread(env, id);
      if (!t || t.status !== 'published') continue;
      const slug = encodeURIComponent(t.slug || t.id);
      const lastmod = (t.updatedAt || t.createdAt || '').slice(0, 10);
      // Same topic in every locale — one slug, three public URLs.
      const locs = [
        `https://www.sensortattoofix.com.br/comunidade.html?t=${slug}`,
        `https://www.sensortattoofix.com/comunidade.html?t=${slug}`,
        `https://www.sensortattoofix.com/it/comunidade.html?t=${slug}`
      ];
      for (const loc of locs) {
        urls.push(`  <url>\n    <loc>${loc}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}\n    <changefreq>weekly</changefreq>\n    <priority>0.65</priority>\n  </url>`);
      }
    }
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
    return new Response(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=900',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  const seoMatch = path.match(/^\/forum\/seo\/([^/]+)$/);
  if (seoMatch && method === 'GET') {
    try {
      await ensureSeed(env);
      await ensureForumPublic(env);
    } catch (err) {
      console.warn('forum seo bootstrap:', err.message);
    }
    const thread = await resolveThreadByParam(env, decodeURIComponent(seoMatch[1]));
    if (!thread || thread.status !== 'published') {
      return new Response('Not found', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
    const replies = (await getReplies(env, thread.id)).filter((r) => r.status === 'published');
    const reqLang = normalizeForumLang(url.searchParams.get('lang') || 'pt');
    const loc = localizedThreadFields(thread, reqLang);
    const pageUrl = reqLang === 'en'
      ? `https://www.sensortattoofix.com/comunidade.html?t=${encodeURIComponent(thread.slug || thread.id)}`
      : reqLang === 'it'
        ? `https://www.sensortattoofix.com/it/comunidade.html?t=${encodeURIComponent(thread.slug || thread.id)}`
        : `https://www.sensortattoofix.com.br/comunidade.html?t=${encodeURIComponent(thread.slug || thread.id)}`;
    const esc = (s) => String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
    const desc = esc(String(loc.body || '').replace(/\s+/g, ' ').trim().slice(0, 160));
    const replyHtml = replies.map((r) => `
      <article>
        <h2>@${esc(r.author?.username || 'anon')}</h2>
        <time datetime="${esc(r.createdAt || '')}">${esc(r.createdAt || '')}</time>
        <p>${esc(localizedReplyBody(r, reqLang)).replace(/\n/g, '<br>')}</p>
      </article>`).join('\n');
    const html = `<!DOCTYPE html>
<html lang="${reqLang === 'pt' ? 'pt-BR' : reqLang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="index, follow">
  <title>${esc(loc.title)} | Comunidade | Sensor Tattoo Fix</title>
  <meta name="description" content="${desc}">
  <link rel="canonical" href="${esc(pageUrl)}">
  <meta property="og:title" content="${esc(loc.title)}">
  <meta property="og:description" content="${desc}">
  <meta property="og:url" content="${esc(pageUrl)}">
  <link rel="stylesheet" href="https://www.sensortattoofix.com.br/style.css">
</head>
<body class="checkout-page forum-page">
  <main class="container forum-container">
    <p><a href="${esc(pageUrl)}">Sensor Tattoo Fix — Comunidade</a></p>
    <article>
      <h1>${esc(loc.title)}</h1>
      <p class="admin-meta">@${esc(thread.author?.username || 'anon')} · <time datetime="${esc(thread.createdAt || '')}">${esc(thread.createdAt || '')}</time></p>
      <div>${esc(loc.body).replace(/\n/g, '<br>')}</div>
    </article>
    <section>
      <h2>Respostas</h2>
      ${replyHtml || '<p>Nenhuma resposta ainda.</p>'}
    </section>
    <p><a href="${esc(pageUrl)}">Ver na comunidade</a></p>
  </main>
</body>
</html>`;
    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=600'
      }
    });
  }

  if (path === '/forum/related' && method === 'GET') {
    try {
      await ensureSeed(env);
      await ensureForumPublic(env);
    } catch (err) {
      console.warn('forum related bootstrap:', err.message);
    }
    const access = await canAccessForum(env, deps, request);
    if (!access.ok) {
      return deps.json({ ok: false, reason: access.reason, matches: [] }, 403, origin);
    }
    const q = url.searchParams.get('q') || '';
    const lang = normalizeForumLang(url.searchParams.get('lang') || 'pt');
    const result = await findRelatedThreads(env, q, { limit: 8, includePending: false, lang });
    return deps.json({ ok: true, query: q, lang, ...result }, 200, origin);
  }

  if (path === '/forum' && method === 'GET') {
    try {
      await ensureSeed(env);
      await ensureForumPublic(env);
      const metaNow = await getForumMeta(env);
      if (Number(metaNow.seedContentVersion || 0) < SEED_CONTENT_VERSION) {
        await replaceSeededThreads(env);
      } else {
        await ensureOfficialReplies(env);
      }
    } catch (err) {
      // Não derruba a listagem se KV estiver no limite diário de writes.
      console.warn('forum list bootstrap:', err.message);
    }
    const access = await canAccessForum(env, deps, request);
    if (!access.ok) {
      return deps.json({
        ok: false,
        reason: access.reason,
        public: !!access.meta.public,
        message: access.reason === 'login'
          ? 'Faça login com uma conta de teste para ver a comunidade.'
          : 'Comunidade em desenvolvimento. Peça acesso de testador ao suporte.'
      }, 403, origin);
    }
    const isAdmin = access.role === 'admin';
    const index = await getThreadIndex(env);
    const replyCounts = await getPublishedReplyCounts(env);
    const lang = normalizeForumLang(url.searchParams.get('lang') || 'pt');
    const threads = [];
    for (const id of index.slice(0, 200)) {
      const t = await getThread(env, id);
      if (!t) continue;
      if (!isAdmin && t.status !== 'published') continue;
      if (!threadMatchesLang(t, lang)) continue;
      threads.push(publicThread(t, { includeBody: false, replyCounts, lang }));
      if (threads.length >= 100) break;
    }
    return deps.json({
      ok: true,
      public: !!access.meta.public,
      role: access.role,
      lang,
      avatars: FORUM_AVATARS,
      threads,
      user: access.user ? publicAuthor(access.user, replyCounts) : null
    }, 200, origin);
  }

  if (path === '/forum/meta' && method === 'GET') {
    const meta = await getForumMeta(env);
    const access = await canAccessForum(env, deps, request);
    return deps.json({
      ok: true,
      public: !!meta.public,
      canAccess: !!access.ok,
      reason: access.reason || null,
      avatars: FORUM_AVATARS
    }, 200, origin);
  }

  if (path === '/forum/profile' && method === 'PATCH') {
    const userId = await deps.getCustomerUserId(env, deps.bearerToken(request));
    if (!userId) return deps.json({ error: 'Faça login.' }, 401, origin);
    const user = await deps.getUserById(env, userId);
    if (!user) return deps.json({ error: 'Conta não encontrada.' }, 404, origin);
    const meta = await getForumMeta(env);
    if (!meta.public && !user.isTester) {
      return deps.json({ error: 'Somente testadores podem configurar o perfil da comunidade agora.' }, 403, origin);
    }
    const body = await request.json();
    if (body.username !== undefined) {
      const username = normalizeUsername(body.username);
      if (!isValidUsername(username)) {
        return deps.json({ error: 'Username: 3–20 caracteres (a-z, 0-9, _).' }, 400, origin);
      }
      const existingId = await env.STORE_KV.get('user:username:' + username);
      if (existingId && existingId !== user.userId) {
        return deps.json({ error: 'Este nome de usuário já está em uso.' }, 409, origin);
      }
      if (user.username && user.username !== username) {
        await env.STORE_KV.delete('user:username:' + user.username);
      }
      user.username = username;
      await env.STORE_KV.put('user:username:' + username, user.userId);
    }
    if (body.avatarId !== undefined) {
      const avatarId = String(body.avatarId || '');
      if (!AVATAR_IDS.has(avatarId)) return deps.json({ error: 'Avatar inválido.' }, 400, origin);
      user.avatarId = avatarId;
    }
    user.updatedAt = new Date().toISOString();
    await deps.saveUser(env, user);
    return deps.json({ ok: true, user: deps.publicUserView(user) }, 200, origin);
  }

  const threadMatch = path.match(/^\/forum\/threads\/([^/]+)$/);
  if (threadMatch && method === 'GET') {
    try {
      const metaNow = await getForumMeta(env);
      if (Number(metaNow.seedContentVersion || 0) < SEED_CONTENT_VERSION) {
        await replaceSeededThreads(env);
      }
    } catch (err) {
      console.warn('forum thread bootstrap:', err.message);
    }
    await ensureSeed(env);
    await ensureForumPublic(env);
    await ensureOfficialReplies(env);
    const access = await canAccessForum(env, deps, request);
    if (!access.ok) return deps.json({ error: 'Acesso restrito.', reason: access.reason }, 403, origin);
    const thread = await resolveThreadByParam(env, decodeURIComponent(threadMatch[1]));
    if (!thread) return deps.json({ error: 'Tópico não encontrado.' }, 404, origin);
    const isAdmin = access.role === 'admin';
    if (!isAdmin && thread.status !== 'published') {
      return deps.json({ error: 'Tópico aguardando aprovação.' }, 404, origin);
    }
    const replies = await getReplies(env, thread.id);
    const visibleReplies = isAdmin ? replies : replies.filter((r) => r.status === 'published');
    const replyCounts = await getPublishedReplyCounts(env);
    const lang = normalizeForumLang(url.searchParams.get('lang') || thread.sourceLang || thread.lang || 'pt');
    return deps.json({
      ok: true,
      thread: publicThread(thread, { replyCounts, lang }),
      replies: visibleReplies.map((r) => publicReply(r, replyCounts, lang))
    }, 200, origin);
  }

  if (path === '/forum/threads' && method === 'POST') {
    const gate = await requireForumWriter(env, deps, request);
    if (gate.error) {
      return deps.json({ error: gate.error, needUsername: gate.needUsername, needAvatar: gate.needAvatar, needRegister: gate.needRegister }, gate.status, origin);
    }
    const body = await request.json();
    const title = String(body.title || '').trim().slice(0, FORUM_TITLE_MAX);
    const text = String(body.body || '').trim().slice(0, FORUM_BODY_MAX);
    const lang = normalizeForumLang(body.lang);
    if (title.length < 8) return deps.json({ error: 'Título muito curto (mín. 8).' }, 400, origin);
    if (text.length < 20) return deps.json({ error: 'Texto muito curto (mín. 20).' }, 400, origin);
    const id = crypto.randomUUID();
    let slug = slugify(title);
    if (await env.STORE_KV.get('forum:slug:' + slug)) slug = `${slug}-${id.slice(0, 6)}`;
    const now = new Date().toISOString();
    const thread = {
      id, slug, title, body: text, status: 'pending', createdAt: now, updatedAt: now,
      replyCount: 0, publishedReplyCount: 0,
      lang,
      tags: Array.isArray(body.tags)
        ? body.tags.map((t) => String(t).toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 24)).filter(Boolean).slice(0, 5)
        : [],
      author: publicAuthor(gate.user),
      media: sanitizeMediaList(body.media)
    };
    await saveThread(env, thread);
    const index = await getThreadIndex(env);
    index.unshift(id);
    await saveThreadIndex(env, index);
    await saveReplies(env, id, []);
    const msg = lang === 'en'
      ? 'Topic submitted. It appears after admin approval.'
      : lang === 'it'
        ? 'Argomento inviato. Compare dopo l’approvazione.'
        : 'Tópico enviado. Aparece após aprovação do administrador.';
    return deps.json({ ok: true, thread: publicThread(thread), message: msg }, 201, origin);
  }

  const replyMatch = path.match(/^\/forum\/threads\/([^/]+)\/replies$/);
  if (replyMatch && method === 'POST') {
    const gate = await requireForumWriter(env, deps, request);
    if (gate.error) {
      return deps.json({ error: gate.error, needUsername: gate.needUsername, needAvatar: gate.needAvatar, needRegister: gate.needRegister }, gate.status, origin);
    }
    const thread = await resolveThreadByParam(env, decodeURIComponent(replyMatch[1]));
    if (!thread) return deps.json({ error: 'Tópico não encontrado.' }, 404, origin);
    if (thread.status !== 'published') return deps.json({ error: 'Este tópico ainda não está publicado.' }, 400, origin);
    const body = await request.json();
    const text = String(body.body || '').trim().slice(0, FORUM_BODY_MAX);
    if (text.length < 2) return deps.json({ error: 'Resposta vazia.' }, 400, origin);
    const parentId = String(body.parentId || '').trim();
    const replies = await getReplies(env, thread.id);
    if (parentId && !replies.some((r) => r.id === parentId)) {
      return deps.json({ error: 'Resposta pai não encontrada.' }, 400, origin);
    }
    const replyLang = normalizeForumLang(body.lang || thread.lang || 'pt');
    const reply = {
      id: crypto.randomUUID(),
      body: text,
      status: 'pending',
      createdAt: new Date().toISOString(),
      author: publicAuthor(gate.user),
      media: sanitizeMediaList(body.media),
      lang: replyLang,
      parentId: parentId || undefined
    };
    replies.push(reply);
    await saveReplies(env, thread.id, replies);
    thread.replyCount = replies.length;
    thread.updatedAt = reply.createdAt;
    await saveThread(env, thread);
    const replyMsg = replyLang === 'en'
      ? 'Reply submitted. It appears after admin approval.'
      : replyLang === 'it'
        ? 'Risposta inviata. Compare dopo l’approvazione.'
        : 'Resposta enviada. Aparece após aprovação do administrador.';
    return deps.json({ ok: true, reply: publicReply(reply), message: replyMsg }, 201, origin);
  }

  if (path === '/admin/forum' && method === 'GET') {
    if (!(await deps.isValidSession(env, deps.bearerToken(request)))) {
      return deps.json({ error: 'Não autorizado.' }, 401, origin);
    }
    await ensureSeed(env);
    await ensureForumPublic(env);
    await ensureOfficialReplies(env);
    const meta = await getForumMeta(env);
    const index = await getThreadIndex(env);
    const replyCounts = await getPublishedReplyCounts(env);
    const threads = [];
    let pendingCount = 0;
    for (const id of index.slice(0, 150)) {
      const t = await getThread(env, id);
      if (!t) continue;
      if (t.status === 'pending') pendingCount += 1;
      const replies = await getReplies(env, id);
      const pendingReplies = replies.filter((r) => r.status === 'pending').length;
      pendingCount += pendingReplies;
      threads.push({
        ...publicThread(t, { includeBody: true, replyCounts }),
        pendingReplies,
        replies: replies.map((r) => publicReply(r, replyCounts))
      });
    }
    return deps.json({ ok: true, meta, pendingCount, threads }, 200, origin);
  }

  if (path === '/admin/forum/meta' && method === 'PATCH') {
    if (!(await deps.isValidSession(env, deps.bearerToken(request)))) {
      return deps.json({ error: 'Não autorizado.' }, 401, origin);
    }
    const body = await request.json();
    const meta = await getForumMeta(env);
    if (body.public !== undefined) meta.public = !!body.public;
    await saveForumMeta(env, meta);
    return deps.json({ ok: true, meta }, 200, origin);
  }

  if (path === '/admin/forum/related' && method === 'GET') {
    if (!(await deps.isValidSession(env, deps.bearerToken(request)))) {
      return deps.json({ error: 'Não autorizado.' }, 401, origin);
    }
    const q = url.searchParams.get('q') || '';
    const lang = normalizeForumLang(url.searchParams.get('lang') || 'pt');
    const result = await findRelatedThreads(env, q, { limit: 12, includePending: true, lang });
    return deps.json({ ok: true, query: q, lang, ...result }, 200, origin);
  }

  if (path === '/admin/forum/seed' && method === 'POST') {
    if (!(await deps.isValidSession(env, deps.bearerToken(request)))) {
      return deps.json({ error: 'Não autorizado.' }, 401, origin);
    }
    const body = await request.json().catch(() => ({}));
    let meta = await getForumMeta(env);
    const parts = [];
    const needsContentRefresh = body.refreshContent !== false
      && Number(meta.seedContentVersion || 0) < SEED_CONTENT_VERSION;
    if (body.refreshContent === true || needsContentRefresh || !meta.seeded) {
      try {
        meta = await replaceSeededThreads(env);
        const touch = meta.seedReplace || {};
        parts.push(`Tópicos exemplo atualizados (removeu ${touch.removed || 0}, criou ${touch.added || 0}).`);
      } catch (err) {
        parts.push(`Falha ao trocar tópicos: ${err.message}`);
      }
    } else if (body.refreshAuthors !== false) {
      try {
        meta = await refreshSeedAuthors(env);
        const touch = meta.seedAuthorsRefresh || {};
        parts.push(`Nomes atualizados (${touch.threadsTouched || 0} tópicos, ${touch.repliesTouched || 0} respostas).`);
      } catch (err) {
        parts.push(`Falha ao atualizar nomes: ${err.message}`);
      }
    }
    if (body.forceOfficial && meta.officialRepliesAt) {
      // já vêm no replaceSeededThreads; só força se pedirem e não tiver
    }
    if (body.forceOfficial || !meta.officialRepliesAt) {
      try {
        meta = { ...meta };
        delete meta.officialRepliesAt;
        await saveForumMeta(env, meta);
        meta = await ensureOfficialReplies(env);
        parts.push(`Respostas @sensortattoofix checadas (${meta.officialRepliesAdded || 0} tópico(s)).`);
      } catch (err) {
        parts.push(`Falha nas respostas oficiais: ${err.message}`);
      }
    }
    return deps.json({
      ok: true,
      meta,
      message: parts.length ? parts.join(' ') : 'Seed já estava atualizado.'
    }, 200, origin);
  }

  const editThreadMatch = path.match(/^\/admin\/forum\/threads\/([^/]+)$/);
  if (editThreadMatch && method === 'PATCH') {
    if (!(await deps.isValidSession(env, deps.bearerToken(request)))) {
      return deps.json({ error: 'Não autorizado.' }, 401, origin);
    }
    const thread = await getThread(env, editThreadMatch[1]);
    if (!thread) return deps.json({ error: 'Tópico não encontrado.' }, 404, origin);
    const body = await request.json().catch(() => ({}));
    const title = String(body.title || '').trim().slice(0, FORUM_TITLE_MAX);
    const text = String(body.body || '').trim().slice(0, FORUM_BODY_MAX);
    if (!title) return deps.json({ error: 'Título obrigatório.' }, 400, origin);
    if (!text) return deps.json({ error: 'Texto obrigatório.' }, 400, origin);
    thread.title = title;
    thread.body = text;
    thread.updatedAt = new Date().toISOString();
    await saveThread(env, thread);
    return deps.json({ ok: true, thread: publicThread(thread) }, 200, origin);
  }

  const editReplyMatch = path.match(/^\/admin\/forum\/threads\/([^/]+)\/replies\/([^/]+)$/);
  if (editReplyMatch && method === 'PATCH') {
    if (!(await deps.isValidSession(env, deps.bearerToken(request)))) {
      return deps.json({ error: 'Não autorizado.' }, 401, origin);
    }
    const threadId = editReplyMatch[1];
    const replyId = editReplyMatch[2];
    const thread = await getThread(env, threadId);
    if (!thread) return deps.json({ error: 'Tópico não encontrado.' }, 404, origin);
    const replies = await getReplies(env, threadId);
    const reply = replies.find((r) => r.id === replyId);
    if (!reply) return deps.json({ error: 'Resposta não encontrada.' }, 404, origin);
    const body = await request.json().catch(() => ({}));
    const text = String(body.body || '').trim().slice(0, FORUM_BODY_MAX);
    if (!text) return deps.json({ error: 'Texto obrigatório.' }, 400, origin);
    reply.body = text;
    await saveReplies(env, threadId, replies);
    thread.updatedAt = new Date().toISOString();
    await saveThread(env, thread);
    return deps.json({ ok: true, reply: publicReply(reply) }, 200, origin);
  }

  const moderateThread = path.match(/^\/admin\/forum\/threads\/([^/]+)\/(approve|reject)$/);
  if (moderateThread && method === 'POST') {
    if (!(await deps.isValidSession(env, deps.bearerToken(request)))) {
      return deps.json({ error: 'Não autorizado.' }, 401, origin);
    }
    const thread = await getThread(env, moderateThread[1]);
    if (!thread) return deps.json({ error: 'Tópico não encontrado.' }, 404, origin);
    thread.status = moderateThread[2] === 'approve' ? 'published' : 'rejected';
    thread.updatedAt = new Date().toISOString();
    await saveThread(env, thread);
    return deps.json({ ok: true, thread: publicThread(thread) }, 200, origin);
  }

  const moderateReply = path.match(/^\/admin\/forum\/threads\/([^/]+)\/replies\/([^/]+)\/(approve|reject)$/);
  if (moderateReply && method === 'POST') {
    if (!(await deps.isValidSession(env, deps.bearerToken(request)))) {
      return deps.json({ error: 'Não autorizado.' }, 401, origin);
    }
    const threadId = moderateReply[1];
    const replyId = moderateReply[2];
    const action = moderateReply[3];
    const thread = await getThread(env, threadId);
    if (!thread) return deps.json({ error: 'Tópico não encontrado.' }, 404, origin);
    const replies = await getReplies(env, threadId);
    const reply = replies.find((r) => r.id === replyId);
    if (!reply) return deps.json({ error: 'Resposta não encontrada.' }, 404, origin);
    reply.status = action === 'approve' ? 'published' : 'rejected';
    await saveReplies(env, threadId, replies);
    thread.publishedReplyCount = replies.filter((r) => r.status === 'published').length;
    thread.replyCount = replies.length;
    thread.updatedAt = new Date().toISOString();
    await saveThread(env, thread);
    return deps.json({ ok: true, reply: publicReply(reply) }, 200, origin);
  }

  const deleteThreadMatch = path.match(/^\/admin\/forum\/threads\/([^/]+)$/);
  if (deleteThreadMatch && method === 'DELETE') {
    if (!(await deps.isValidSession(env, deps.bearerToken(request)))) {
      return deps.json({ error: 'Não autorizado.' }, 401, origin);
    }
    const ok = await deleteThreadCompletely(env, deleteThreadMatch[1]);
    if (!ok) return deps.json({ error: 'Tópico não encontrado.' }, 404, origin);
    return deps.json({ ok: true, deleted: 'thread' }, 200, origin);
  }

  const deleteReplyMatch = path.match(/^\/admin\/forum\/threads\/([^/]+)\/replies\/([^/]+)$/);
  if (deleteReplyMatch && method === 'DELETE') {
    if (!(await deps.isValidSession(env, deps.bearerToken(request)))) {
      return deps.json({ error: 'Não autorizado.' }, 401, origin);
    }
    const threadId = deleteReplyMatch[1];
    const replyId = deleteReplyMatch[2];
    const thread = await getThread(env, threadId);
    if (!thread) return deps.json({ error: 'Tópico não encontrado.' }, 404, origin);
    const replies = await getReplies(env, threadId);
    const next = replies.filter((r) => r.id !== replyId);
    if (next.length === replies.length) return deps.json({ error: 'Resposta não encontrada.' }, 404, origin);
    await saveReplies(env, threadId, next);
    thread.publishedReplyCount = next.filter((r) => r.status === 'published').length;
    thread.replyCount = next.length;
    thread.updatedAt = new Date().toISOString();
    await saveThread(env, thread);
    return deps.json({ ok: true, deleted: 'reply' }, 200, origin);
  }

  return null;
}
