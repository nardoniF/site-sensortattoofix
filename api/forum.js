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

function publicThread(thread, { includeBody = true, replyCounts = null } = {}) {
  const base = {
    id: thread.id,
    slug: thread.slug,
    title: thread.title,
    status: thread.status,
    createdAt: thread.createdAt,
    updatedAt: thread.updatedAt,
    replyCount: thread.replyCount || 0,
    publishedReplyCount: thread.publishedReplyCount || 0,
    tags: thread.tags || [],
    lang: normalizeForumLang(thread.lang || 'pt'),
    author: decorateAuthorSuper(thread.author, replyCounts),
    media: thread.media || [],
    seeded: !!thread.seeded
  };
  if (includeBody) base.body = thread.body;
  else base.excerpt = String(thread.body || '').slice(0, 180);
  return base;
}

function publicReply(reply, replyCounts = null) {
  return {
    id: reply.id,
    body: reply.body,
    status: reply.status,
    createdAt: reply.createdAt,
    author: decorateAuthorSuper(reply.author, replyCounts),
    media: reply.media || [],
    seeded: !!reply.seeded,
    official: !!(reply.official || reply.author?.isOfficial)
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
  'seed-chris': {
    userId: 'seed-chris',
    nome: 'Chris',
    username: 'chris_ink',
    avatarId: 'rocket',
    avatarEmoji: '🚀',
    isSuperCollaborator: true
  }
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
  const have = normalizeForumLang(thread?.lang || 'pt');
  return have === want;
}

/** Tópicos baseados em dores reais — PT / EN / IT (mesmo fórum, filtrado por idioma). */
function seedPayload() {
  const now = Date.now();
  const iso = (minsAgo) => new Date(now - minsAgo * 60000).toISOString();
  const A = SEED_AUTHORS;

  const pt = [
    {
      title: 'Apple Watch pedindo senha o tempo todo — sleeve no pulso',
      body: 'Braço esquerdo fechado de tattoo bem preta onde fica o relógio. Series 10.\n\nO negócio trava a tela, pede senha de novo, some notificação… parece que não “enxerga” que estou usando. No Reddit o povo fala de detecção + tinta escura.\n\nAlguém aqui usou o Sensor Tattoo Fix e conseguiu manter a Detecção de Pulso ligada (sem perder Apple Pay)?',
      tags: ['apple-watch', 'deteccao', 'senha', 'tattoo'],
      author: { ...A['seed-guga'] },
      createdAt: iso(60 * 52),
      replies: [
        { body: 'Mesma merda aqui. Desligar a detecção “resolve” a senha, mas Apple Pay e algumas automações vão embora. Trocar de pulso não rola — os 2 têm tattoo.', author: { ...A['seed-pri'] }, createdAt: iso(60 * 41) },
        { body: 'Eu também. Às vezes acorda e já pede senha de novo. Odeio.', author: { ...A['seed-bela'] }, createdAt: iso(60 * 33) },
        { body: 'Guga, tive exatamente isso com sleeve escura. Sensor Tattoo Fix + detecção ligada = Apple Pay voltou a funcionar sem drama.', author: { ...A['seed-chris'] }, createdAt: iso(60 * 22) },
        officialReply('Oi, Guga! 👋 Aqui é a equipe @sensortattoofix.\n\nIsso é clássico: tinta escura no pulso atrapalha o sensor óptico e o relógio acha que saiu do braço — pede senha de novo e some notificação.\n\nO kit zera essa situação. Você instala e mantém a detecção — e o pagamento por aproximação continua funcionando.\n\nQualquer dúvida, manda no suporte. 🖤', iso(60 * 9))
      ]
    },
    {
      title: 'Corrida pausando sozinha no meio do treino (Apple Watch)',
      body: 'Ultra / Series — tanto faz. Começo o treino Outdoor Run, 2–3 km depois o cronômetro PAUSA sozinho. Relógio acha que saí do pulso.\n\nTattoo escura sob o sensor. Já apertei a pulseira, limpei, teste no outro pulso (sem tinta) e aí funciona perfeito.\n\nSerá que esse kit funciona? Alguém já usou e iniciou os treinos? Se sim, parou de pausar?',
      tags: ['apple-watch', 'treino', 'pausa', 'corrida'],
      author: { ...A['seed-kai'] },
      createdAt: iso(60 * 78),
      replies: [
        { body: 'Isso me deixava maluco. No Reddit a galera manda fita micropore — mas sai e às vezes não funciona. Usei o Tattoo Fix e acabou o problema.', author: { ...A['seed-dudu'] }, createdAt: iso(60 * 61) },
        { body: 'Kai, micropore é gambiarra. Eu corro 4–5x na semana com o kit — zero pausa fantasma depois que chegou o Tattoo Fix. Suor forte não tirou o meu.', author: { ...A['seed-chris'] }, createdAt: iso(60 * 52) },
        officialReply('Kai, isso é o mesmo fenômeno da detecção de pulso falhando no movimento — suor + tinta escura = reflexão instável, e o watch pausa o treino.\n\nSensor Tattoo Fix atua exatamente para resolver isso.\n\nMuitos corredores relatam fim das pausas fantasmas em poucos dias. Qualquer dúvida, suporte. 🏃‍♂️', iso(60 * 44)),
        { body: 'Fechou — vou instalar e testar na próxima corrida.', author: { ...A['seed-kai'] }, createdAt: iso(60 * 11) },
        { body: 'o meu parou de dar erro logo que instalei. Esperei 48 horas e fui correr — mediu tudo certinho.', author: { ...A['seed-nati'] }, createdAt: iso(60 * 7) }
      ]
    },
    {
      title: 'Galaxy Watch 6 — Samsung Health diz que o relógio está “solto”',
      body: 'Calibrar pressão / frequência cardíaca no Samsung Health: fica pedindo pra ajustar porque “o relógio está solto”, sendo que tá apertado.\n\nSuporte da Samsung falou de tatuagem. Testei no braço da minha mãe (sem ink) e calibraram de primeira.\n\nQuem tem GW5/GW6 + tattoo no pulso e usou o kit — a mensagem de “solto” sumiu pra vocês?',
      tags: ['galaxy-watch', 'samsung-health', 'pressao', 'fc'],
      author: { ...A['seed-marcinha'] },
      createdAt: iso(60 * 19),
      replies: [
        { body: 'GW5 Classic aqui. Mesma mensagem. Sem kit não calibrava nunca.', author: { ...A['seed-leo'] }, createdAt: iso(60 * 14) },
        { body: 'Marcinha, no meu GW6 a mensagem de “solto” sumiu depois do kit. Espera 2–3 dias firme no pulso e aí recalibra no Samsung Health — na primeira tentativa ainda pode reclamar.', author: { ...A['seed-chris'] }, createdAt: iso(60 * 10) },
        officialReply('Marcinha, obrigado por trazer o caso Samsung — é o mesmo princípio óptico do Apple Watch.\n\nQuando a tinta bloqueia a luz, o algoritmo interpreta como “relógio solto / sem contato”. O kit melhora o retorno de luz na área do sensor.\n\nDepois de instalar, use firme por alguns dias antes de recalibrar no Samsung Health. Qualquer dúvida, suporte. 🖤', iso(60 * 6))
      ]
    },
    {
      title: 'FC inventando 180–190 bpm parado, braço esquerdo fechado ⌚',
      body: 'Relógio mostra batimento absurdo em repouso (tipo 180+) ou “—” — no outro braço sem tattoo lê normal.\n\nQuem já instalou o Sensor Tattoo Fix nesse cenário — a FC estabilizou de verdade, ou o kit só ajuda quando o relógio “não detecta pulso”?',
      tags: ['fc', 'tattoo', 'ppg', 'apple-watch'],
      author: { ...A['seed-dudu'] },
      createdAt: iso(60 * 110),
      replies: [
        { body: 'No meu acontece o mesmo.', author: { ...A['seed-guga'] }, createdAt: iso(60 * 97) },
        { body: '2 braços tatuados — no meu não lê em nenhum dos 2.', author: { ...A['seed-nati'] }, createdAt: iso(60 * 73) },
        { body: 'No meu shading claro quase não dá problema.', author: { ...A['seed-leo'] }, createdAt: iso(60 * 58) },
        { body: 'Dudu: no meu (fechado escuro) a FC parou de inventar depois do kit. Não fica perfeito tipo hospital, mas deixou de marcar 180 parado. Valeu demais pro dia a dia.', author: { ...A['seed-chris'] }, createdAt: iso(60 * 41) },
        { body: 'Depois do kit Tattoo Fix ficou usável no dia a dia. Parou o delírio dos batimentos malucos.', author: { ...A['seed-rick'] }, createdAt: iso(60 * 33) },
        { body: 'Alguém comparou com oxímetro de dedo depois de instalar?', author: { ...A['seed-bela'] }, createdAt: iso(60 * 18) },
        officialReply('Dudu, boa pergunta.\n\nA tinta escura/sólida impede o sensor de chegar aos vasos sanguíneos: o algoritmo “perde” o pulso, pede senha e às vezes fica louco e marca errado. O kit cria uma interface óptica entre LED/fotodiodo e a pele e amplifica o sinal, corrigindo isso.\n\nQualquer coisa, @sensortattoofix no suporte. 🖤', iso(60 * 4))
      ]
    }
  ].map((t) => ({ ...t, lang: 'pt' }));

  const en = [
    {
      title: 'Apple Watch keeps asking for my passcode — sleeve on the wrist',
      body: 'Full black sleeve where the watch sits. Series 10.\n\nScreen locks, passcode again, notifications vanish… like it doesn’t “see” I’m wearing it. Reddit people talk about wrist detection + dark ink.\n\nAnyone here used Sensor Tattoo Fix and kept Wrist Detection on (without losing Apple Pay)?',
      tags: ['apple-watch', 'detection', 'passcode', 'tattoo'],
      author: { ...A['seed-guga'] },
      createdAt: iso(60 * 52),
      replies: [
        { body: 'Same crap here. Turning detection off “fixes” the passcode, but Apple Pay and some automations go away. Switching wrists isn’t an option — both are tattooed.', author: { ...A['seed-pri'] }, createdAt: iso(60 * 41) },
        { body: 'Same. Sometimes I wake up and it already wants the passcode again. Hate it.', author: { ...A['seed-bela'] }, createdAt: iso(60 * 33) },
        { body: 'Guga, exact same with a dark sleeve. Sensor Tattoo Fix + detection on = Apple Pay worked again, no drama.', author: { ...A['seed-chris'] }, createdAt: iso(60 * 22) },
        officialReply('Hey Guga! 👋 This is the @sensortattoofix team.\n\nClassic case: dark ink on the wrist messes with the optical sensor and the watch thinks it left your arm — passcode loops and missing notifications.\n\nThe kit fixes that. You install it, keep detection on, and tap-to-pay still works.\n\nAny questions, hit support. 🖤', iso(60 * 9))
      ]
    },
    {
      title: 'Run pausing by itself mid-workout (Apple Watch)',
      body: 'Ultra / Series — doesn’t matter. I start Outdoor Run, 2–3 km later the timer PAUSES on its own. Watch thinks I took it off.\n\nDark tattoo under the sensor. Tightened the band, cleaned it, tried the other wrist (no ink) and it works fine there.\n\nDoes this kit actually work? Anyone used it and kept workouts going? Did the phantom pauses stop?',
      tags: ['apple-watch', 'workout', 'pause', 'running'],
      author: { ...A['seed-kai'] },
      createdAt: iso(60 * 78),
      replies: [
        { body: 'Drove me crazy. Reddit suggests micropore tape — it peels off and sometimes fails anyway. Used Tattoo Fix and the problem stopped.', author: { ...A['seed-dudu'] }, createdAt: iso(60 * 61) },
        { body: 'Kai, micropore is a hack. I run 4–5x a week with the kit — zero phantom pauses after the Tattoo Fix arrived. Heavy sweat didn’t rip mine off.', author: { ...A['seed-chris'] }, createdAt: iso(60 * 52) },
        officialReply('Kai, same wrist-detection failure while moving — sweat + dark ink = unstable reflection, so the watch pauses the workout.\n\nSensor Tattoo Fix is built for exactly that.\n\nLots of runners report phantom pauses gone in a few days. Questions? Support. 🏃‍♂️', iso(60 * 44)),
        { body: 'Got it — I’ll install and test on the next run.', author: { ...A['seed-kai'] }, createdAt: iso(60 * 11) },
        { body: 'Mine stopped erroring right after I installed. Waited 48 hours, went for a run — everything tracked fine.', author: { ...A['seed-nati'] }, createdAt: iso(60 * 7) }
      ]
    },
    {
      title: 'Galaxy Watch 6 — Samsung Health says the watch is “loose”',
      body: 'Calibrating BP / heart rate in Samsung Health: it keeps asking me to adjust because “the watch is loose”, but it’s snug.\n\nSamsung support blamed the tattoo. Tried my mom’s arm (no ink) and it calibrated first try.\n\nAnyone with GW5/GW6 + wrist tattoo who used the kit — did the “loose” message go away?',
      tags: ['galaxy-watch', 'samsung-health', 'bp', 'hr'],
      author: { ...A['seed-marcinha'] },
      createdAt: iso(60 * 19),
      replies: [
        { body: 'GW5 Classic here. Same message. Without the kit it never calibrated.', author: { ...A['seed-leo'] }, createdAt: iso(60 * 14) },
        { body: 'Marcinha, on my GW6 the “loose” message went away after the kit. Wear it snug 2–3 days, then recalibrate in Samsung Health — first try can still complain.', author: { ...A['seed-chris'] }, createdAt: iso(60 * 10) },
        officialReply('Marcinha, thanks for the Samsung case — same optical principle as Apple Watch.\n\nWhen ink blocks the light, the algorithm reads “loose / no contact”. The kit improves light return at the sensor area.\n\nAfter install, wear it snug a few days before recalibrating in Samsung Health. Questions? Support. 🖤', iso(60 * 6))
      ]
    },
    {
      title: 'HR inventing 180–190 bpm at rest, full left arm ink ⌚',
      body: 'Watch shows crazy resting HR (like 180+) or “—” — other arm without tattoo reads normal.\n\nAnyone who installed Sensor Tattoo Fix for this — did HR actually stabilize, or does the kit only help when the watch “can’t detect wrist”?',
      tags: ['hr', 'tattoo', 'ppg', 'apple-watch'],
      author: { ...A['seed-dudu'] },
      createdAt: iso(60 * 110),
      replies: [
        { body: 'Same thing happens to me.', author: { ...A['seed-guga'] }, createdAt: iso(60 * 97) },
        { body: 'Both arms tattooed — mine won’t read on either.', author: { ...A['seed-nati'] }, createdAt: iso(60 * 73) },
        { body: 'With light shading I barely have issues.', author: { ...A['seed-leo'] }, createdAt: iso(60 * 58) },
        { body: 'Dudu: with a dark solid sleeve my HR stopped inventing numbers after the kit. Not hospital-perfect, but no more 180 at rest. Huge for daily use.', author: { ...A['seed-chris'] }, createdAt: iso(60 * 41) },
        { body: 'After Tattoo Fix it became usable day to day. The crazy HR readings stopped.', author: { ...A['seed-rick'] }, createdAt: iso(60 * 33) },
        { body: 'Anyone compare with a finger pulse ox after installing?', author: { ...A['seed-bela'] }, createdAt: iso(60 * 18) },
        officialReply('Dudu, good question.\n\nDark/solid ink blocks the sensor from reaching blood vessels: the algorithm “loses” the pulse, asks for a passcode, and sometimes goes wild with bad readings. The kit adds an optical interface between the LED/photodiode and skin and boosts the signal.\n\nAnything else, @sensortattoofix on support. 🖤', iso(60 * 4))
      ]
    }
  ].map((t) => ({ ...t, lang: 'en' }));

  const it = [
    {
      title: 'Apple Watch chiede continuamente il codice — sleeve sul polso',
      body: 'Braccio sinistro pieno di tattoo nera dove sta l’orologio. Series 10.\n\nSi blocca lo schermo, di nuovo il codice, spariscono le notifiche… come se non “vedesse” che lo indosso. Su Reddit parlano di rilevamento polso + inchiostro scuro.\n\nQualcuno ha usato Sensor Tattoo Fix e ha tenuto il Rilevamento polso attivo (senza perdere Apple Pay)?',
      tags: ['apple-watch', 'rilevamento', 'codice', 'tattoo'],
      author: { ...A['seed-guga'] },
      createdAt: iso(60 * 52),
      replies: [
        { body: 'Stessa merda qui. Spegnere il rilevamento “risolve” il codice, ma Apple Pay e alcune automazioni spariscono. Cambiare polso non si può — entrambi tatuati.', author: { ...A['seed-pri'] }, createdAt: iso(60 * 41) },
        { body: 'Anche io. A volte mi sveglio e vuole già di nuovo il codice. Odio.', author: { ...A['seed-bela'] }, createdAt: iso(60 * 33) },
        { body: 'Guga, stesso identico con sleeve scura. Sensor Tattoo Fix + rilevamento attivo = Apple Pay di nuovo ok, senza drammi.', author: { ...A['seed-chris'] }, createdAt: iso(60 * 22) },
        officialReply('Ciao Guga! 👋 Qui è il team @sensortattoofix.\n\nCaso classico: l’inchiostro scuro sul polso confonde il sensore ottico e l’orologio crede di essere stato tolto — loop di codice e notifiche che spariscono.\n\nIl kit risolve. Lo installi, tieni il rilevamento e i pagamenti contactless continuano a funzionare.\n\nDubbi? Scrivi al supporto. 🖤', iso(60 * 9))
      ]
    },
    {
      title: 'Corsa che si mette in pausa da sola (Apple Watch)',
      body: 'Ultra / Series — non importa. Avvio Outdoor Run, dopo 2–3 km il timer va in PAUSA da solo. L’orologio pensa che l’abbia tolto.\n\nTattoo scura sotto il sensore. Ho stretto il cinturino, pulito, provato l’altro polso (senza inchiostro) e lì funziona.\n\nQuesto kit funziona davvero? Qualcuno l’ha usato e i workout restano attivi? Le pause fantasma sono sparite?',
      tags: ['apple-watch', 'allenamento', 'pausa', 'corsa'],
      author: { ...A['seed-kai'] },
      createdAt: iso(60 * 78),
      replies: [
        { body: 'Mi faceva impazzire. Su Reddit consigliano nastro micropore — si stacca e a volte non funziona. Ho usato Tattoo Fix e il problema è finito.', author: { ...A['seed-dudu'] }, createdAt: iso(60 * 61) },
        { body: 'Kai, il micropore è una pezza. Corro 4–5 volte a settimana con il kit — zero pause fantasma da quando è arrivato il Tattoo Fix. Il sudore forte non me l’ha tolto.', author: { ...A['seed-chris'] }, createdAt: iso(60 * 52) },
        officialReply('Kai, stesso fallimento del rilevamento polso in movimento — sudore + inchiostro scuro = riflessione instabile, e l’orologio mette in pausa.\n\nSensor Tattoo Fix serve proprio a questo.\n\nMolti runner dicono che le pause fantasma spariscono in pochi giorni. Domande? Supporto. 🏃‍♂️', iso(60 * 44)),
        { body: 'Ok — installo e provo nella prossima corsa.', author: { ...A['seed-kai'] }, createdAt: iso(60 * 11) },
        { body: 'Il mio ha smesso di dare errore subito dopo l’installazione. Ho aspettato 48 ore, sono andato a correre — ha misurato tutto bene.', author: { ...A['seed-nati'] }, createdAt: iso(60 * 7) }
      ]
    },
    {
      title: 'Galaxy Watch 6 — Samsung Health dice che l’orologio è “allentato”',
      body: 'Calibrazione pressione / FC in Samsung Health: continua a chiedere di regolare perché “l’orologio è allentato”, ma è stretto.\n\nIl supporto Samsung ha parlato del tatuaggio. Provato sul braccio di mia madre (senza ink) e ha calibrato al primo colpo.\n\nChi ha GW5/GW6 + tattoo al polso e ha usato il kit — il messaggio “allentato” è sparito?',
      tags: ['galaxy-watch', 'samsung-health', 'pressione', 'fc'],
      author: { ...A['seed-marcinha'] },
      createdAt: iso(60 * 19),
      replies: [
        { body: 'GW5 Classic qui. Stesso messaggio. Senza kit non calibrava mai.', author: { ...A['seed-leo'] }, createdAt: iso(60 * 14) },
        { body: 'Marcinha, sul mio GW6 il messaggio “allentato” è sparito dopo il kit. Tienilo stretto 2–3 giorni e poi ricalibra in Samsung Health — al primo tentativo può ancora lamentarsi.', author: { ...A['seed-chris'] }, createdAt: iso(60 * 10) },
        officialReply('Marcinha, grazie per il caso Samsung — stesso principio ottico dell’Apple Watch.\n\nQuando l’inchiostro blocca la luce, l’algoritmo legge “allentato / senza contatto”. Il kit migliora il ritorno di luce sull’area del sensore.\n\nDopo l’installazione, indossalo stretto qualche giorno prima di ricalibrare in Samsung Health. Dubbi? Supporto. 🖤', iso(60 * 6))
      ]
    },
    {
      title: 'FC inventa 180–190 bpm a riposo, braccio sinistro pieno ⌚',
      body: 'L’orologio mostra FC assurda a riposo (tipo 180+) oppure “—” — sull’altro braccio senza tattoo legge normale.\n\nChi ha installato Sensor Tattoo Fix in questo caso — la FC si è stabilizzata davvero, o il kit aiuta solo quando l’orologio “non rileva il polso”?',
      tags: ['fc', 'tattoo', 'ppg', 'apple-watch'],
      author: { ...A['seed-dudu'] },
      createdAt: iso(60 * 110),
      replies: [
        { body: 'A me succede lo stesso.', author: { ...A['seed-guga'] }, createdAt: iso(60 * 97) },
        { body: 'Entrambi i bracci tatuati — sul mio non legge su nessuno dei due.', author: { ...A['seed-nati'] }, createdAt: iso(60 * 73) },
        { body: 'Con shading chiaro quasi non ho problemi.', author: { ...A['seed-leo'] }, createdAt: iso(60 * 58) },
        { body: 'Dudu: con sleeve scura piena la FC ha smesso di inventare numeri dopo il kit. Non è da ospedale, ma niente più 180 a riposo. Utilissimo ogni giorno.', author: { ...A['seed-chris'] }, createdAt: iso(60 * 41) },
        { body: 'Dopo Tattoo Fix è diventato usabile ogni giorno. Le FC folli sono finite.', author: { ...A['seed-rick'] }, createdAt: iso(60 * 33) },
        { body: 'Qualcuno ha confrontato con un saturimetro a dito dopo l’installazione?', author: { ...A['seed-bela'] }, createdAt: iso(60 * 18) },
        officialReply('Dudu, bella domanda.\n\nL’inchiostro scuro/pieno impedisce al sensore di raggiungere i vasi: l’algoritmo “perde” il polso, chiede il codice e a volte inventa letture sbagliate. Il kit crea un’interfaccia ottica tra LED/fotodiodo e pelle e amplifica il segnale.\n\nAltro? @sensortattoofix sul supporto. 🖤', iso(60 * 4))
      ]
    }
  ].map((t) => ({ ...t, lang: 'it' }));

  return [...pt, ...en, ...it];
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
    const score = scoreRelatedThread(thread, tokens);
    if (score < 4) continue;
    scored.push({ score, thread });
  }
  scored.sort((a, b) => b.score - a.score || String(b.thread.updatedAt || '').localeCompare(String(a.thread.updatedAt || '')));
  return {
    tokens,
    matches: scored.slice(0, limit).map(({ score, thread }) => ({
      score,
      ...publicThread(thread, { includeBody: false })
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

const SEED_AUTHORS_VERSION = 4;
const SEED_CONTENT_VERSION = 11;

async function insertSeedThreads(env, existingIndex) {
  const seeds = seedPayload();
  const newIds = [];
  for (const s of seeds) {
    const id = crypto.randomUUID();
    const lang = normalizeForumLang(s.lang || 'pt');
    let slug = slugify(s.title);
    if (lang !== 'pt') slug = `${slug}-${lang}`;
    if (await env.STORE_KV.get('forum:slug:' + slug)) slug = `${slug}-${id.slice(0, 6)}`;
    const replies = (s.replies || []).map((r) => ({
      id: crypto.randomUUID(),
      body: r.body,
      status: 'published',
      createdAt: r.createdAt,
      author: r.author,
      media: [],
      seeded: true,
      lang,
      official: !!(r.official || r.author?.isOfficial)
    }));
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
      lang
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
      threads.push(publicThread(t, { includeBody: false, replyCounts }));
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
    return deps.json({
      ok: true,
      thread: publicThread(thread, { replyCounts }),
      replies: visibleReplies.map((r) => publicReply(r, replyCounts))
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
    const replyLang = normalizeForumLang(body.lang || thread.lang || 'pt');
    const reply = {
      id: crypto.randomUUID(),
      body: text,
      status: 'pending',
      createdAt: new Date().toISOString(),
      author: publicAuthor(gate.user),
      media: sanitizeMediaList(body.media),
      lang: replyLang
    };
    const replies = await getReplies(env, thread.id);
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
