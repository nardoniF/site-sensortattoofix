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
  'seed-marcinha': { userId: 'seed-marcinha', nome: 'Marcinha', username: 'marcinha', avatarId: 'heart', avatarEmoji: '❤️' },
  'seed-dudu': { userId: 'seed-dudu', nome: 'Dudu', username: 'dudutattoo', avatarId: 'watch', avatarEmoji: '⌚' },
  'seed-bela': { userId: 'seed-bela', nome: 'Bela', username: 'bela_sp', avatarId: 'star', avatarEmoji: '⭐' },
  'seed-rick': { userId: 'seed-rick', nome: 'Rick Souza', username: 'ricksouza', avatarId: 'sensor', avatarEmoji: '📡' },
  'seed-nati': { userId: 'seed-nati', nome: 'Nati', username: 'natiink', avatarId: 'gem', avatarEmoji: '💎' },
  'seed-leo': { userId: 'seed-leo', nome: 'Léo', username: 'leozinho88', avatarId: 'moon', avatarEmoji: '🌙' },
  'seed-pri': { userId: 'seed-pri', nome: 'Pri', username: 'pri_sleeve', avatarId: 'leaf', avatarEmoji: '🍃' },
  'seed-juliana': { userId: 'seed-juliana', nome: 'Júlia', username: 'julia_ink', avatarId: 'sun', avatarEmoji: '☀️' },
  'seed-raf': { userId: 'seed-raf', nome: 'Rafael', username: 'raf_monkey', avatarId: 'leaf', avatarEmoji: '🍃' },
  'seed-ana': { userId: 'seed-ana', nome: 'Ana', username: 'aninha_w', avatarId: 'moon', avatarEmoji: '🌙' },
  'seed-edu': {
    userId: 'seed-edu',
    nome: 'Edu',
    username: 'edu_sensor',
    avatarId: 'sensor',
    avatarEmoji: '📡',
    isSuperCollaborator: true
  },
  'seed-diego': { userId: 'seed-diego', nome: 'Diego', username: 'diego_runs', avatarId: 'bolt', avatarEmoji: '⚡' },
  'seed-malu': { userId: 'seed-malu', nome: 'Malu', username: 'malu_tat', avatarId: 'star', avatarEmoji: '⭐' },
  'seed-camila': { userId: 'seed-camila', nome: 'Camila', username: 'camila_fit', avatarId: 'heart', avatarEmoji: '❤️' },
  'seed-chris': {
    userId: 'seed-chris',
    nome: 'Chris',
    username: 'chris_ink',
    avatarId: 'rocket',
    avatarEmoji: '🚀',
    isSuperCollaborator: true
  },
  'seed-lu': { userId: 'seed-lu', nome: 'Lu', username: 'lu_tatto', avatarId: 'leaf', avatarEmoji: '🍃' },
  'seed-joao': { userId: 'seed-joao', nome: 'João', username: 'joaotattoo', avatarId: 'rocket', avatarEmoji: '🚀' },
  'seed-rita': { userId: 'seed-rita', nome: 'Rita', username: 'rita_fit', avatarId: 'heart', avatarEmoji: '❤️' },
  'seed-simo': { userId: 'seed-simo', nome: 'Simone', username: 'simo_run', avatarId: 'moon', avatarEmoji: '🌙' }
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
  const A = SEED_AUTHORS;

  const pt = [
    {
      title: 'Apple Watch pedindo senha no pulso tatuado',
      body: 'Tenho uma tattoo escura na região do sensor. O relógio trava a tela, pede senha de novo e some as notificações. Já tentei adesivo, esmalte transparente, pulseira mais apertada e trocar de pulso, mas o problema volta.',
      tags: ['apple-watch', 'senha', 'detecao', 'tattoo'],
      author: { ...A['seed-guga'] },
      createdAt: iso(60 * 52),
      replies: [
        { body: 'Eu passei pelo mesmo. O watch “não enxerga” que estou usando, e o Apple Pay começa a falhar. Não é só o ajuste da pulseira.', author: { ...A['seed-pri'] }, createdAt: iso(60 * 41) },
        { body: 'No meu caso, o problema piora com suor e tinta mais densa. Qualquer solução improvisada ajuda só por pouco tempo.', author: { ...A['seed-bela'] }, createdAt: iso(60 * 33) },
        { body: 'Às vezes o sensor perde estabilidade quando o tatuagem está muito escuro. Não adianta só apertar o relógio.', author: { ...A['seed-lu'] }, createdAt: iso(60 * 28) },
        officialReply('Essa é uma situação bem clássica: a tinta escura muda a reflexão da luz e o sensor deixa de ler o pulso com estabilidade. Quando isso acontece, o relógio passa a agir como se tivesse perdido contato e pede senha/Apple Pay. A solução mais consistente aqui é o Sensor Tattoo Fix, que melhora a interface óptica na área do sensor e restaura a leitura. Se quiser, me diga o modelo do seu Apple Watch e eu te ajudo a avaliar a compatibilidade. 🖤', iso(60 * 9))
      ]
    },
    {
      title: 'Treino parando sozinho na corrida',
      body: 'Começo a corrida e o Apple Watch pausa sozinho depois de alguns minutos. O comportamento aparece principalmente quando a tattoo fica bem escura sob o sensor. Eu já tentei fita, pulseira mais apertada e usar no outro braço, mas nada resolveu de verdade.',
      tags: ['apple-watch', 'treino', 'corrida', 'autopause'],
      author: { ...A['seed-kai'] },
      createdAt: iso(60 * 86),
      replies: [
        { body: 'Eu fiquei meses assim. O watch achava que eu tinha tirado o pulso e fingia que a corrida tinha parado.', author: { ...A['seed-dudu'] }, createdAt: iso(60 * 73) },
        { body: 'O problema é mais de leitura do sensor do que de pulseira. Quando a tinta muda o retorno da luz, a detecção de pulso fica instável em movimento.', author: { ...A['seed-chris'] }, createdAt: iso(60 * 64) },
        officialReply('Isso é exatamente o tipo de caso em que o Sensor Tattoo Fix faz sentido. A solução improvisada (adesivo, fita, ajuste de pulseira) pode aliviar por pouco tempo, mas a forma mais consistente de parar as pausas fantasma é melhorar a leitura do sensor na região do pulso. Se quiser, me manda o modelo do relógio e eu te digo se a compatibilidade é boa. 🏃‍♂️', iso(60 * 54))
      ]
    },
    {
      title: 'FC inventando 180 bpm em repouso',
      body: 'O relógio marca 180+ bpm em repouso ou fica mostrando “—”, mesmo quando eu estou sentado. No outro pulso, sem tattoo, a leitura volta ao normal. Eu queria saber se isso é só um problema de sensor ou se existe uma correção real.',
      tags: ['apple-watch', 'fc', 'bpm', 'tattoo'],
      author: { ...A['seed-dudu'] },
      createdAt: iso(60 * 120),
      replies: [
        { body: 'No meu também. Eu achei que era o suor, mas o problema foi a leitura mesmo.', author: { ...A['seed-guga'] }, createdAt: iso(60 * 106) },
        { body: 'O que costuma acontecer é a curva do pulso virar inconsistente e o algoritmo começar a inventar valores.', author: { ...A['seed-chris'] }, createdAt: iso(60 * 92) },
        officialReply('Quando a tinta é densa, o sensor recebe um sinal mais confuso e o algoritmo pode “inventar” frequências erradas. O Sensor Tattoo Fix cria uma interface mais estável entre o sensor e a pele, e isso é o que costuma corrigir esse tipo de leitura. Se quiser, eu posso te ajudar a olhar o modelo do seu relógio e a compatibilidade. 🖤', iso(60 * 78))
      ]
    },
    {
      title: 'Apple Pay e Google Wallet pararam no mesmo pulso',
      body: 'Eu estava usando Apple Pay e Google Wallet sem problema, mas de um tempo pra cá o relógio deixou de reconhecer o pulso direito. Não era a carteira e nem a pulseira; parecia que o contato estava instável o tempo todo.',
      tags: ['apple-pay', 'google-wallet', 'pagamento', 'tattoo'],
      author: { ...A['seed-malu'] },
      createdAt: iso(60 * 150),
      replies: [
        { body: 'Isso costuma acontecer quando a leitura do pulso fica errada. O watch pensa que o contato não está bom e trava tudo.', author: { ...A['seed-bela'] }, createdAt: iso(60 * 138) },
        officialReply('Exato. Quando o sensor perde estabilidade, o pagamento por aproximação costuma ser o primeiro a dar problema. O Sensor Tattoo Fix é a solução que mais faz sentido nesse cenário porque melhora a leitura na área do sensor e restaura a confiança do watch no contato. Se quiser, me diga o modelo do seu wearable. 🖤', iso(60 * 126))
      ]
    },
    {
      title: 'Samsung/Garmin/Huawei: “relógio solto” ou “não detectado”',
      body: 'Estou usando um Samsung, um Garmin e até um Huawei no mesmo pulso tatuado. Em todos eles o problema é parecido: o relógio diz que está solto ou que não detectou o pulso, mesmo com a pulseira apertada.',
      tags: ['samsung', 'garmin', 'huawei', 'detecao'],
      author: { ...A['seed-marcinha'] },
      createdAt: iso(60 * 178),
      replies: [
        { body: 'Eu também passei por isso. A leitura parecia instável mesmo quando o relógio estava bem no lugar.', author: { ...A['seed-leo'] }, createdAt: iso(60 * 166) },
        officialReply('Esse é um sintoma clássico de leitura óptica instável. A tinta muda como a luz volta para o sensor, e diferentes marcas acabam interpretando isso como “solto”, “sem contato” ou “não detectado”. O Sensor Tattoo Fix é a solução mais consistente para estabilizar essa leitura. Se você quiser, eu posso te orientar pelo modelo exato do seu relógio. 🖤', iso(60 * 154))
      ]
    },
    {
      title: 'Monitor de sono falhando no pulso tatuado',
      body: 'Meu relógio não registra o sono direito no pulso tatuado, ou marca só 1–2 horas. No outro braço funciona normalmente. Já limpei o sensor e tentei mudar de posição, mas não adianta.',
      tags: ['sono', 'monitoramento', 'tattoo', 'sleep'],
      author: { ...A['seed-rita'] },
      createdAt: iso(60 * 202),
      replies: [
        { body: 'Também passei por isso. O sensor perdia contato durante a noite e perdia todas as horas.', author: { ...A['seed-joao'] }, createdAt: iso(60 * 190) },
        { body: 'Pode ser que a luz esteja voltando errado na tinta. Apertar o relógio não resolve.', author: { ...A['seed-malu'] }, createdAt: iso(60 * 182) },
        officialReply('O monitoramento do sono depende de um sinal estável do sensor por várias horas. Se o pulso tatuado gera um retorno irregular, o relógio perde horas ou registra mal. Sensor Tattoo Fix ajuda a estabilizar essa leitura e torna o tracking mais confiável. 🖤', iso(60 * 170))
      ]
    },
    {
      title: 'Avisos cardíacos falsos em repouso',
      body: 'Meu relógio avisa de ritmo irregular ou batimento alto enquanto estou sentado e tranquilo. No outro pulso sem tattoo isso não acontece. Será que é problema de sensor?',
      tags: ['cardio', 'avisos', 'ritmo', 'tattoo'],
      author: { ...A['seed-simo'] },
      createdAt: iso(60 * 232),
      replies: [
        { body: 'Também recebi esses avisos falsos. Parecia começar com leituras erradas do sensor.', author: { ...A['seed-chris'] }, createdAt: iso(60 * 220) },
        { body: 'O software interpreta o sinal barulhento como um coração irregular.', author: { ...A['seed-dudu'] }, createdAt: iso(60 * 208) },
        officialReply('Os avisos falsos são comuns quando o sensor recebe um sinal distorcido do tatuagem. Sensor Tattoo Fix torna o retorno da luz mais consistente e diminui os falsos alarmes. Se quiser, posso ajudar a ver como melhorar a leitura no seu modelo. 🖤', iso(60 * 196))
      ]
    },
    {
      title: 'Notificações e chamadas desaparecem no pulso tatuado',
      body: 'Às vezes meu relógio para de mostrar notificações e parece que as chamadas não chegam. Parece que o dispositivo perde contato com meu pulso.',
      tags: ['notificacoes', 'chamadas', 'tattoo', 'contato'],
      author: { ...A['seed-lu'] },
      createdAt: iso(60 * 256),
      replies: [
        { body: 'É como se o relógio pensasse que foi tirado. Só resolve quando a leitura do sensor melhora.', author: { ...A['seed-ana'] }, createdAt: iso(60 * 244) },
        { body: 'Tenta não usar um pulso muito folgado, mas o problema real está na leitura óptica.', author: { ...A['seed-joao'] }, createdAt: iso(60 * 232) },
        officialReply('Quando o sensor perde estabilidade, as notificações e chamadas podem parecer ausentes porque o relógio não reconhece o pulso corretamente. Sensor Tattoo Fix ajuda a restaurar o contato óptico e estabiliza as notificações. 🖤', iso(60 * 220))
      ]
    },
    {
      title: 'App de treino não inicia no pulso tatuado',
      body: 'Quando vou iniciar um treino, o relógio pede para posicionar melhor ou diz que o sensor não está em contato. No outro braço funciona, mas no tatuado não.',
      tags: ['treino', 'app', 'sensor', 'tattoo'],
      author: { ...A['seed-diego'] },
      createdAt: iso(60 * 280),
      replies: [
        { body: 'Também acontece comigo quando o tatuagem é muito escuro. O relógio bloqueia antes de começar.', author: { ...A['seed-malu'] }, createdAt: iso(60 * 268) },
        { body: 'É um problema de leitura antes de ser um problema do app: se o sensor não vê o pulso, o treino não começa.', author: { ...A['seed-pri'] }, createdAt: iso(60 * 256) },
        officialReply('Se o relógio não inicia o treino no pulso tatuado, o problema é a estabilidade do sinal óptico. Sensor Tattoo Fix torna o contato mais confiável e ajuda o app a reconhecer corretamente o movimento. 🖤', iso(60 * 244))
      ]
    }
  ].map((t) => ({ ...t, lang: 'pt' }));

  const en = [
    {
      title: 'Apple Watch keeps asking for my passcode on a tattooed wrist',
      body: 'I have dark ink right where the sensor sits. The watch locks, asks for my passcode again, and notifications disappear. I tried stickers, clear nail polish, a tighter band, and switching wrists, but the problem keeps coming back.',
      tags: ['apple-watch', 'passcode', 'detection', 'tattoo'],
      author: { ...A['seed-guga'] },
      createdAt: iso(60 * 52),
      replies: [
        { body: 'Same here. The watch stops “seeing” that I am wearing it, and Apple Pay starts failing. It is not just a band issue.', author: { ...A['seed-pri'] }, createdAt: iso(60 * 41) },
        { body: 'For me it gets worse with sweat and denser ink. Any workaround helps only for a while.', author: { ...A['seed-bela'] }, createdAt: iso(60 * 33) },
        { body: 'Sometimes the problem is that the sensor loses stability when the tattoo is really dark. It is not enough to just tighten the band.', author: { ...A['seed-lu'] }, createdAt: iso(60 * 28) },
        officialReply('This is a classic case: dark ink changes how light reflects back to the sensor, so the watch reads the wrist as unstable and starts asking for a passcode or blocking Apple Pay. The most consistent fix is Sensor Tattoo Fix, which improves the optical interface at the sensor area and restores reliable reading. If you want, send the Apple Watch model and I can help check compatibility. 🖤', iso(60 * 9))
      ]
    },
    {
      title: 'Workout pausing by itself during a run',
      body: 'I start a run and the Apple Watch pauses on its own after a few minutes. It happens most when the tattoo is very dark under the sensor. I tried tape, a tighter band, and using the other wrist, but nothing really solved it.',
      tags: ['apple-watch', 'workout', 'running', 'pause'],
      author: { ...A['seed-kai'] },
      createdAt: iso(60 * 86),
      replies: [
        { body: 'I had this for months. The watch acted like I had taken it off and paused the workout for no reason.', author: { ...A['seed-dudu'] }, createdAt: iso(60 * 73) },
        { body: 'It is more a sensor-read issue than a band issue. When the ink changes the light return, pulse detection becomes unstable while moving.', author: { ...A['seed-chris'] }, createdAt: iso(60 * 64) },
        officialReply('That is exactly the kind of case where Sensor Tattoo Fix makes sense. Quick fixes like tape, stickers, or band adjustments can help temporarily, but the most consistent way to stop the phantom pauses is to improve the sensor reading at the wrist. If you want, send the model and I can help check compatibility. 🏃‍♂️', iso(60 * 54))
      ]
    },
    {
      title: 'Heart rate inventing 180 bpm at rest',
      body: 'The watch shows 180+ bpm at rest or just “—”, even when I am sitting still. On the other wrist with no tattoo, the reading goes back to normal. I wanted to know if this is just a sensor problem or if there is a real fix.',
      tags: ['apple-watch', 'heart-rate', 'bpm', 'tattoo'],
      author: { ...A['seed-dudu'] },
      createdAt: iso(60 * 120),
      replies: [
        { body: 'Same thing happens to me. I thought it was sweat, but the issue was the reading itself.', author: { ...A['seed-guga'] }, createdAt: iso(60 * 106) },
        { body: 'What usually happens is the pulse curve becomes inconsistent and the algorithm starts inventing values.', author: { ...A['seed-chris'] }, createdAt: iso(60 * 92) },
        officialReply('When the ink is dense, the sensor gets a more confusing signal and the algorithm may invent bad readings. Sensor Tattoo Fix creates a more stable optical interface between the sensor and the skin, and that is what usually corrects this. If you want, I can help you check the watch model and compatibility. 🖤', iso(60 * 78))
      ]
    },
    {
      title: 'Apple Pay and Google Wallet stopped working on the same wrist',
      body: 'I was using Apple Pay and Google Wallet fine, but over time the watch stopped recognizing the wrist properly. It was not the wallet or the band; it felt like the contact was unstable all the time.',
      tags: ['apple-pay', 'google-wallet', 'payment', 'tattoo'],
      author: { ...A['seed-malu'] },
      createdAt: iso(60 * 150),
      replies: [
        { body: 'That is what usually happens when the pulse reading is off. The watch thinks the contact is not good and blocks everything.', author: { ...A['seed-bela'] }, createdAt: iso(60 * 138) },
        officialReply('Exactly. When the sensor loses stability, contactless payment is often the first thing to break. Sensor Tattoo Fix is the most sensible solution here because it improves the readout at the sensor area and restores confidence in the contact. If you want, tell me the wearable model. 🖤', iso(60 * 126))
      ]
    },
    {
      title: 'Samsung/Garmin/Huawei: “watch is loose” or “not detected”',
      body: 'I am using a Samsung, a Garmin, and even a Huawei on the same tattooed wrist. All of them show the same thing: the watch says it is loose or not detected, even when the band is snug.',
      tags: ['samsung', 'garmin', 'huawei', 'detection'],
      author: { ...A['seed-marcinha'] },
      createdAt: iso(60 * 178),
      replies: [
        { body: 'I had the same story. The reading felt unstable even when the watch was sitting in the right place.', author: { ...A['seed-leo'] }, createdAt: iso(60 * 166) },
        officialReply('That is a classic symptom of unstable optical reading. The tattoo changes how light comes back to the sensor, and different brands interpret that as “loose”, “no contact”, or “not detected”. Sensor Tattoo Fix is the most consistent way to stabilize that reading. If you want, I can guide you by the exact watch model. 🖤', iso(60 * 154))
      ]
    },
    {
      title: 'Sleep tracking fails on a tattooed wrist',
      body: 'My watch either does not record sleep at all or shows only 1–2 hours when I sleep with my tattooed wrist. The other wrist records normally. I cleaned the sensor and changed bands, but nothing fixed it.',
      tags: ['sleep', 'tracking', 'tattoo', 'watch'],
      author: { ...A['seed-rita'] },
      createdAt: iso(60 * 202),
      replies: [
        { body: 'Same here. It lost the signal during the night and missed all the sleep time.', author: { ...A['seed-joao'] }, createdAt: iso(60 * 190) },
        { body: 'It can be the light bouncing wrong off the ink. Tightening the band is not enough.', author: { ...A['seed-malu'] }, createdAt: iso(60 * 182) },
        officialReply('Sleep tracking depends on a stable signal from the sensor for many hours. If the tattoo creates an irregular return, the watch drops hours or records poorly. Sensor Tattoo Fix helps stabilize that reading and makes sleep tracking more reliable. 🖤', iso(60 * 170))
      ]
    },
    {
      title: 'False heart alerts while resting',
      body: 'My watch warns me of irregular rhythm or high heart rate while I am sitting still and calm. The other wrist without a tattoo does not do this. Is this a real problem or a sensor issue?',
      tags: ['heart-rate', 'alerts', 'tattoo', 'rest'],
      author: { ...A['seed-simo'] },
      createdAt: iso(60 * 232),
      replies: [
        { body: 'I get the same false alerts. It seemed to start with wrong readings from the sensor.', author: { ...A['seed-chris'] }, createdAt: iso(60 * 220) },
        { body: 'The software interprets the noisy signal as an irregular heartbeat.', author: { ...A['seed-dudu'] }, createdAt: iso(60 * 208) },
        officialReply('False alerts are common when the sensor receives a disturbed signal from a tattooed wrist. Sensor Tattoo Fix makes return light more consistent and reduces false alarms. If you want, I can help you understand how to improve the reading on your model. 🖤', iso(60 * 196))
      ]
    },
    {
      title: 'Notifications and calls disappear on the tattooed wrist',
      body: 'Sometimes my watch stops showing notifications and calls appear to be missing. It feels like the device loses contact with my wrist.',
      tags: ['notifications', 'calls', 'tattoo', 'contact'],
      author: { ...A['seed-lu'] },
      createdAt: iso(60 * 256),
      replies: [
        { body: 'It is like the watch thinks it was taken off. I only fixed it when the sensor reading improved.', author: { ...A['seed-ana'] }, createdAt: iso(60 * 244) },
        { body: 'Try not to use a too loose band, but the real issue is optical reading.', author: { ...A['seed-joao'] }, createdAt: iso(60 * 232) },
        officialReply('When the sensor loses stability, notifications and calls can seem absent because the watch does not recognize the wrist correctly. Sensor Tattoo Fix helps restore optical contact and stabilizes notifications. 🖤', iso(60 * 220))
      ]
    },
    {
      title: 'Workout app does not start on tattooed wrist',
      body: 'When I want to start a workout, the watch tells me to position it better or that the sensor is not in contact. It works on the other arm, but not with the tattoo.',
      tags: ['workout', 'app', 'sensor', 'tattoo'],
      author: { ...A['seed-diego'] },
      createdAt: iso(60 * 280),
      replies: [
        { body: 'It happens to me too when the tattoo is very dark. The watch blocks before starting.', author: { ...A['seed-malu'] }, createdAt: iso(60 * 268) },
        { body: 'It is a reading problem before it is an app problem: if the sensor does not see the wrist, the workout will not start.', author: { ...A['seed-pri'] }, createdAt: iso(60 * 256) },
        officialReply('If the watch refuses to start the workout on your tattooed wrist, the issue is the stability of the optical signal. Sensor Tattoo Fix makes the contact more reliable and helps the app recognize the motion correctly. 🖤', iso(60 * 244))
      ]
    }
  ].map((t) => ({ ...t, lang: 'en' }));

  const it = [
    {
      title: 'Apple Watch che chiede il codice sul polso tatuato',
      body: 'Ho un tatuaggio scuro proprio dove sta il sensore. L’orologio si blocca, chiede di nuovo il codice e le notifiche spariscono. Ho provato adesivi, smalto trasparente, cinturino più stretto e anche cambiare polso, ma il problema torna.',
      tags: ['apple-watch', 'codice', 'rilevamento', 'tattoo'],
      author: { ...A['seed-guga'] },
      createdAt: iso(60 * 52),
      replies: [
        { body: 'Anche io. L’orologio smette di “vedere” che lo indosso e Apple Pay comincia a sbagliare. Non è solo un problema di cinturino.', author: { ...A['seed-pri'] }, createdAt: iso(60 * 41) },
        { body: 'Per me peggiora con sudore e tatuaggi più densi. Ogni workaround aiuta solo per poco.', author: { ...A['seed-bela'] }, createdAt: iso(60 * 33) },
        { body: 'A volte il problema è che il sensore perde stabilità quando il tatuaggio è molto nero. Non serve solo stringere il cinturino.', author: { ...A['seed-lu'] }, createdAt: iso(60 * 28) },
        officialReply('È un caso classico: l’inchiostro scuro cambia la riflessione della luce e il sensore smette di leggere il polso in modo stabile. Quando succede, l’orologio inizia a chiedere il codice o a bloccare Apple Pay. La soluzione più coerente qui è Sensor Tattoo Fix, che migliora l’interfaccia ottica nell’area del sensore e ripristina la lettura. Se vuoi, dimmi il modello del tuo Apple Watch e ti aiuto a valutare la compatibilità. 🖤', iso(60 * 9))
      ]
    },
    {
      title: 'Allenamento che si ferma da solo in corsa',
      body: 'Inizio la corsa e l’Apple Watch si mette in pausa da solo dopo pochi minuti. Succede soprattutto quando il tatuaggio è molto scuro sotto il sensore. Ho provato nastro, cinturino più stretto e l’altro polso, ma niente ha risolto davvero.',
      tags: ['apple-watch', 'allenamento', 'corsa', 'pausa'],
      author: { ...A['seed-kai'] },
      createdAt: iso(60 * 86),
      replies: [
        { body: 'L’ho avuto per mesi. L’orologio faceva finta che l’avessi tolto e fermava l’allenamento senza motivo.', author: { ...A['seed-dudu'] }, createdAt: iso(60 * 73) },
        { body: 'È più un problema di lettura del sensore che di cinturino. Quando l’inchiostro cambia il ritorno della luce, il rilevamento del polso diventa instabile in movimento.', author: { ...A['seed-chris'] }, createdAt: iso(60 * 64) },
        officialReply('È proprio il tipo di caso in cui Sensor Tattoo Fix ha senso. Le soluzioni rapide come nastro, adesivi o aggiustamenti del cinturino possono aiutare temporaneamente, ma il modo più coerente per fermare le pause fantasma è migliorare la lettura del sensore nella zona del polso. Se vuoi, mandami il modello e ti aiuto a verificare la compatibilità. 🏃‍♂️', iso(60 * 54))
      ]
    },
    {
      title: 'FC che inventa 180 bpm a riposo',
      body: 'L’orologio mostra 180+ bpm a riposo oppure “—”, anche quando sono seduto. Sull’altro polso, senza tatuaggio, la lettura torna normale. Volevo capire se è solo un problema di sensore oppure se c’è una soluzione reale.',
      tags: ['apple-watch', 'fc', 'bpm', 'tattoo'],
      author: { ...A['seed-dudu'] },
      createdAt: iso(60 * 120),
      replies: [
        { body: 'A me succede la stessa cosa. Ho pensato che fosse il sudore, ma il problema era la lettura.', author: { ...A['seed-guga'] }, createdAt: iso(60 * 106) },
        { body: 'Quello che di solito succede è che la curva del polso diventa incoerente e l’algoritmo inizia a inventare valori.', author: { ...A['seed-chris'] }, createdAt: iso(60 * 92) },
        officialReply('Quando l’inchiostro è denso, il sensore riceve un segnale più confuso e l’algoritmo può inventare letture sbagliate. Sensor Tattoo Fix crea un’interfaccia ottica più stabile tra sensore e pelle, e questo è quello che di solito corregge il problema. Se vuoi, ti aiuto a guardare il modello dell’orologio e la compatibilità. 🖤', iso(60 * 78))
      ]
    },
    {
      title: 'Apple Pay e Google Wallet hanno smesso di funzionare sullo stesso polso',
      body: 'Usavo Apple Pay e Google Wallet senza problemi, ma col tempo l’orologio ha smesso di riconoscere bene il polso. Non era il portafoglio né il cinturino; sembrava che il contatto fosse instabile tutto il tempo.',
      tags: ['apple-pay', 'google-wallet', 'pagamento', 'tattoo'],
      author: { ...A['seed-malu'] },
      createdAt: iso(60 * 150),
      replies: [
        { body: 'Succede spesso quando la lettura del polso è sbagliata. L’orologio pensa che il contatto non sia buono e blocca tutto.', author: { ...A['seed-bela'] }, createdAt: iso(60 * 138) },
        officialReply('Esatto. Quando il sensore perde stabilità, il pagamento contactless è spesso la prima cosa a rompersi. Sensor Tattoo Fix è la soluzione più sensata qui perché migliora la lettura nell’area del sensore e ripristina il contatto. Se vuoi, dimmi il modello del wearable. 🖤', iso(60 * 126))
      ]
    },
    {
      title: 'Samsung/Garmin/Huawei: “orologio allentato” o “non rilevato”',
      body: 'Sto usando un Samsung, un Garmin e perfino un Huawei sullo stesso polso tatuato. Tutti mostrano la stessa cosa: l’orologio dice che è allentato o non rilevato, anche con il cinturino ben stretto.',
      tags: ['samsung', 'garmin', 'huawei', 'rilevamento'],
      author: { ...A['seed-marcinha'] },
      createdAt: iso(60 * 178),
      replies: [
        { body: 'Ho avuto la stessa storia. La lettura sembrava instabile anche quando l’orologio era ben posizionato.', author: { ...A['seed-leo'] }, createdAt: iso(60 * 166) },
        officialReply('È un sintomo classico di lettura ottica instabile. Il tatuaggio cambia il modo in cui la luce torna al sensore, e marchi diversi interpretano questo come “allentato”, “senza contatto” o “non rilevato”. Sensor Tattoo Fix è il modo più coerente per stabilizzare quella lettura. Se vuoi, ti guido io con il modello esatto. 🖤', iso(60 * 154))
      ]
    },
    {
      title: 'Monitoraggio del sonno non funziona sul polso tatuato',
      body: 'Il mio orologio non registra il sonno sul polso tatuato, oppure segna solo 1–2 ore. Sull’altro polso senza tattoo funziona normalmente. Ho provato a cambiare posizione e fascia, ma niente cambia.',
      tags: ['sonno', 'monitoraggio', 'tattoo', 'sleep'],
      author: { ...A['seed-rita'] },
      createdAt: iso(60 * 202),
      replies: [
        { body: 'A me succedeva lo stesso. Il sensore perdeva il contatto durante la notte e perdeva tutte le ore.', author: { ...A['seed-joao'] }, createdAt: iso(60 * 190) },
        { body: 'A volte il problema è la luce che rimbalza male sulla pelle tinta. Non basta stringere il cinturino.', author: { ...A['seed-malu'] }, createdAt: iso(60 * 182) },
        officialReply('Il monitoraggio del sonno dipende muito da leitura estável do sensor durante horas. Se o pulso tatuado gera um sinal irregular, o relógio perde horas ou registra mal. Sensor Tattoo Fix ajuda a estabilizar essa leitura e a tornar o tracking mais confiável. 🖤', iso(60 * 170))
      ]
    },
    {
      title: 'Avvisi cardiaci falsi durante il riposo',
      body: 'Il mio orologio segnala ritmo cardiaco irregolare o battito veloce mentre sto seduto e rilassato. Sull’altro polso senza tattoo non succede. Cosa può essere?',
      tags: ['cardio', 'avvisi', 'ritmo', 'tattoo'],
      author: { ...A['seed-simo'] },
      createdAt: iso(60 * 232),
      replies: [
        { body: 'Mi è successo anche a me. Il problema sembrava partire dalle letture sbagliate del sensor.', author: { ...A['seed-chris'] }, createdAt: iso(60 * 220) },
        { body: 'Il software interpreta il segnale nervoso come un battito irregolare quando la luce torna male.', author: { ...A['seed-dudu'] }, createdAt: iso(60 * 208) },
        officialReply('Gli avvisi falsi sono frequenti quando il sensore riceve un segnale disturbato dal tatuaggio. Sensor Tattoo Fix rende il ritorno della luce più consistente e diminuisce i falsi allarmi. Se vuoi, ti aiuto a capire come migliorare la lettura sul tuo modello. 🖤', iso(60 * 196))
      ]
    },
    {
      title: 'Notifiche e chiamate spariscono sul polso tatuato',
      body: 'A volte il mio orologio non mostra più le notifiche e le chiamate sembrano non arrivare. Sembra quasi che il dispositivo perda il contatto col polso.',
      tags: ['notifiche', 'chiamate', 'tattoo', 'contatto'],
      author: { ...A['seed-lu'] },
      createdAt: iso(60 * 256),
      replies: [
        { body: 'È come se il watch pensasse che fosse stato tolto. Io ho risolto só quando migliorou a leitura do sensor.', author: { ...A['seed-ana'] }, createdAt: iso(60 * 244) },
        { body: 'Prova a non usare cinturino troppo largo, ma o problema real está na leitura ótica.', author: { ...A['seed-joao'] }, createdAt: iso(60 * 232) },
        officialReply('Quando o sensor perde estabilidade, as notificações e chamadas podem parecer ausentes porque o relógio não reconhece o pulso corretamente. Sensor Tattoo Fix ajuda a restaurar o contato óptico e estabiliza as notifiche. 🖤', iso(60 * 220))
      ]
    },
    {
      title: 'L’app allenamento non parte sul polso tatuato',
      body: 'Quando voglio iniziare un allenamento, l’orologio mi dice che devo posizionarlo meglio o che il sensore non è a contatto. Col braccio libero funziona, ma col tatuaggio no.',
      tags: ['allenamento', 'app', 'sensore', 'tattoo'],
      author: { ...A['seed-diego'] },
      createdAt: iso(60 * 280),
      replies: [
        { body: 'Succede anche a me quando il tatuaggio è davvero scuro. L’orologio si blocca prima di partire.', author: { ...A['seed-malu'] }, createdAt: iso(60 * 268) },
        { body: 'È un problema di lettura prima che di app: se il sensore non vede il polso, l’allenamento non parte.', author: { ...A['seed-pri'] }, createdAt: iso(60 * 256) },
        officialReply('Se il watch non avvia l’allenamento sul polso tatuato, il problema è la stabilità del segnale ottico. Sensor Tattoo Fix rende il contatto più affidabile e aiuta l’app a riconoscere correttamente il gesto. 🖤', iso(60 * 244))
      ]
    }
  ].map((t) => ({ ...t, lang: 'it' }));

  // One topic × translations — never publish 3 clone threads.
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

const SEED_AUTHORS_VERSION = 6;
const SEED_CONTENT_VERSION = 15;

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
