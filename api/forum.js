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

function publicAuthor(user) {
  const avatarId = AVATAR_IDS.has(user.avatarId) ? user.avatarId : 'watch';
  const avatar = FORUM_AVATARS.find((a) => a.id === avatarId) || FORUM_AVATARS[0];
  return {
    userId: user.userId,
    nome: user.nome || '',
    username: user.username || '',
    avatarId,
    avatarEmoji: avatar.emoji,
    isTester: !!user.isTester
  };
}

function publicThread(thread, { includeBody = true } = {}) {
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
    author: remapSeedAuthor(thread.author),
    media: thread.media || [],
    seeded: !!thread.seeded
  };
  if (includeBody) base.body = thread.body;
  else base.excerpt = String(thread.body || '').slice(0, 180);
  return base;
}

function publicReply(reply) {
  return {
    id: reply.id,
    body: reply.body,
    status: reply.status,
    createdAt: reply.createdAt,
    author: remapSeedAuthor(reply.author),
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
  if (meta.public) return { ok: true, meta, role: 'public' };
  const adminOk = await deps.isValidSession(env, deps.bearerToken(request));
  if (adminOk) return { ok: true, meta, role: 'admin' };
  const userId = await deps.getCustomerUserId(env, deps.bearerToken(request));
  if (!userId) return { ok: false, meta, role: null, reason: 'login' };
  const user = await deps.getUserById(env, userId);
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
  'seed-pri': { userId: 'seed-pri', nome: 'Pri', username: 'pri_sleeve', avatarId: 'leaf', avatarEmoji: '🍃' }
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

/** Tópicos baseados em dores reais de fóruns (Apple/Samsung + tatuagem no pulso). */
function seedPayload() {
  const now = Date.now();
  const iso = (minsAgo) => new Date(now - minsAgo * 60000).toISOString();
  const A = SEED_AUTHORS;
  return [
    {
      title: 'Apple Watch pedindo senha o tempo todo — sleeve no pulso',
      body: 'Braço esquerdo fechado de tinta preta onde fica o relógio. Series 10.\n\nO negócio trava a tela, pede senha de novo, some notificação… parece que não “enxerga” que estou usando. No Reddit o povo fala de wrist detection + tinta escura.\n\nAlguém aqui usou o Sensor Tattoo Fix e conseguiu manter a Detecção de Pulso ligada (sem perder Apple Pay)?',
      tags: ['apple-watch', 'wrist-detection', 'senha', 'tinta-preta'],
      author: { ...A['seed-guga'] },
      createdAt: iso(60 * 40),
      replies: [
        {
          body: 'Mesma merda aqui. Desligar wrist detection “resolve” a senha, mas Apple Pay e algumas automações vão embora. Trocar de pulso não rola — os dois têm ink.',
          author: { ...A['seed-pri'] },
          createdAt: iso(60 * 34)
        },
        {
          body: 'No meu caso o kit da STF estabilizou a detecção em uns 2 dias. Ainda peço senha às vezes se a pulseira fica frouxa, mas parou aquele loop eterno.',
          author: { ...A['seed-nati'] },
          createdAt: iso(60 * 22)
        },
        officialReply(
          'Oi, Guga! 👋 Aqui é a equipe @sensortattoofix.\n\nIsso que você descreveu é clássico: o sensor óptico usa luz verde/infravermelha e tinta escura/sólida no pulso absorve essa luz — o relógio acha que saiu do braço e pede senha de novo (o mesmo “Tattoogate” que viralizou no Reddit/Apple Support).\n\nO kit melhora o contato óptico entre sensor e pele. Dicas rápidas:\n• meça o diâmetro do sensor na traseira e escolha o tamanho certo\n• pulseira justa (não frouxa)\n• alinhamento do recorte no círculo do sensor\n\nSe depois de instalar ainda oscilar, manda foto do encaixe no suporte que a gente olha com você. 🖤',
          iso(60 * 10)
        )
      ]
    },
    {
      title: 'Corrida pausando sozinha no meio do treino (Apple Watch)',
      body: 'Ultra / Series — tanto faz. Começo o treino Outdoor Run, 2–3 km depois o cronômetro PAUSA sozinho. Relógio acha que saí do pulso.\n\nTatuagem escura sob o sensor. Já apertei a pulseira, limpei, teste no outro pulso (sem tinta) e aí funciona perfeito.\n\nEstou de olho no kit da Sensor Tattoo Fix — alguém que corre com tinta no pulso já instalou e parou essas pausas fantasmas?',
      tags: ['apple-watch', 'treino', 'pausa', 'corrida'],
      author: { ...A['seed-kai'] },
      createdAt: iso(60 * 55),
      replies: [
        {
          body: 'Isso me deixava maluco. No Reddit a galera manda fita micropore / adesivo transparente — eu odiei o cheiro e a sujeira. Fui de kit e o treino parou de pausar no km 2.',
          author: { ...A['seed-dudu'] },
          createdAt: iso(60 * 48)
        },
        {
          body: 'Cinta peitoral até ajuda na FC, mas não resolve o “sumiu do pulso”. O que me tirou as pausas foi o kit mesmo.',
          author: { ...A['seed-bela'] },
          createdAt: iso(60 * 41)
        },
        officialReply(
          'Kai, isso é o mesmo fenômeno da detecção de pulso falhando no movimento — suor + tinta escura = reflexão instável, e o watch pausa o treino.\n\nSensor Tattoo Fix atua exatamente nessa camada: contato óptico mais uniforme sob o sensor. Depois de colar:\n1) limpeza seca da área\n2) pressionar as bordas 20–30s\n3) pulseira firme no treino\n\nMuitos corredores relatam fim das pausas fantasmas em poucos dias. Se quiser, conta modelo + mm do sensor que a gente confirma o tamanho. 🏃‍♂️',
          iso(60 * 12)
        )
      ]
    },
    {
      title: 'Galaxy Watch 6 — Samsung Health diz que o relógio está “solto”',
      body: 'Calibrar pressão / frequência cardíaca no Samsung Health: fica pedindo pra ajustar porque “o relógio está solto”, sendo que tá apertado.\n\nSuporte da Samsung falou de tatuagem. Testei no braço da minha mãe (sem ink) e calibraram de primeira.\n\nQuem tem GW5/GW6 + tinta no pulso e usou o kit — a mensagem de “solto” sumiu pra vocês?',
      tags: ['galaxy-watch', 'samsung-health', 'pressao', 'fc'],
      author: { ...A['seed-marcinha'] },
      createdAt: iso(60 * 70),
      replies: [
        {
          body: 'GW5 Classic aqui. Mesma mensagem. Não é “solto” — é o PPG não lendo a tinta. Samsung até admitiu melhoria de wrist detection em 2023, mas tinta preta continua quebrando.',
          author: { ...A['seed-leo'] },
          createdAt: iso(60 * 60)
        },
        {
          body: 'Depois do kit as medições de FC voltaram. Pressão ainda é chata de calibrar, mas o “solto” sumiu.',
          author: { ...A['seed-rick'] },
          createdAt: iso(60 * 28)
        },
        officialReply(
          'Marcinha, obrigado por trazer o caso Samsung — é o mesmo princípio óptico do Apple Watch (PPG).\n\nQuando a tinta bloqueia a luz, o algoritmo interpreta como “relógio solto / sem contato”. O kit não “engana” o software: ele melhora o retorno de luz na área do sensor.\n\nPasso a passo que costuma funcionar no Galaxy:\n• medir o sensor (mm) e usar o recorte certo\n• limpar sensor + pele\n• instalar e usar firme por alguns dias antes de recalibrar no Samsung Health\n\nQualquer dúvida de tamanho, estamos no suporte. 🖤',
          iso(60 * 8)
        )
      ]
    },
    {
      title: 'FC inventando 180–190 bpm parado — tinta preta sólida',
      body: 'Relógio mostra batimento absurdo em repouso (tipo 180+) ou “—” em cima da rose preta no pulso. Linha fina / shading claro no outro braço lê normal.\n\nConfirma a vibe dos testes antigos (iMore etc.): preto sólido destrói, padrão claro menos.\n\nQuem já instalou o Sensor Tattoo Fix nesse cenário — a FC estabilizou de verdade, ou o kit só ajuda quando o relógio “não detecta pulso”?',
      tags: ['fc', 'tinta-preta', 'ppg', 'apple-watch'],
      author: { ...A['seed-dudu'] },
      createdAt: iso(60 * 90),
      replies: [
        {
          body: 'No meu solid black também. Antes: FC louca + lock. Depois do kit: bem mais estável no dia a dia — não é lab, mas parou o delírio.',
          author: { ...A['seed-guga'] },
          createdAt: iso(60 * 75)
        },
        {
          body: 'Importante medir o sensor. Recorte folgado = leitura pior ainda.',
          author: { ...A['seed-nati'] },
          createdAt: iso(60 * 50)
        },
        officialReply(
          'Dudu, boa pergunta — ajuda nos dois cenários.\n\nA tinta escura/sólida mexe na reflexão: o algoritmo pode “perder” o pulso (vira lock / —) ou interpretar ruído como FC altíssima. O kit cria uma interface óptica mais previsível entre LED/fotodiodo e a pele.\n\nExpectativa realista: melhora forte de estabilidade na maioria dos casos com tinta no ponto do sensor. Para treino de elite muita gente ainda usa cinta, mas no uso diário o kit costuma tirar aquele comportamento maluco.\n\nMeça o diâmetro do sensor (borda a borda) e escolha o mm na loja — encaixe certo pesa muito. Qualquer coisa, @sensortattoofix no suporte. 🖤',
          iso(60 * 6)
        )
      ]
    }
  ];
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

async function findRelatedThreads(env, query, { limit = 8, includePending = false } = {}) {
  const tokens = tokenizeRelated(query);
  if (!tokens.length) return { tokens: [], matches: [] };
  const index = await getThreadIndex(env);
  const scored = [];
  for (const id of index) {
    const thread = await getThread(env, id);
    if (!thread) continue;
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
      if (cur.username !== seedAuthor.username || cur.avatarId !== seedAuthor.avatarId || cur.isTester) {
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
        if (cur.username !== mapped.username || cur.avatarId !== mapped.avatarId || cur.isTester) {
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

const SEED_AUTHORS_VERSION = 3;
const SEED_CONTENT_VERSION = 4;

async function insertSeedThreads(env, existingIndex) {
  const seeds = seedPayload();
  const newIds = [];
  for (const s of seeds) {
    const id = crypto.randomUUID();
    let slug = slugify(s.title);
    if (await env.STORE_KV.get('forum:slug:' + slug)) slug = `${slug}-${id.slice(0, 6)}`;
    const replies = (s.replies || []).map((r) => ({
      id: crypto.randomUUID(),
      body: r.body,
      status: 'published',
      createdAt: r.createdAt,
      author: r.author,
      media: [],
      seeded: true,
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
      seeded: true
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
    const result = await findRelatedThreads(env, q, { limit: 8, includePending: false });
    return deps.json({ ok: true, query: q, ...result }, 200, origin);
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
    const threads = [];
    for (const id of index.slice(0, 100)) {
      const t = await getThread(env, id);
      if (!t) continue;
      if (!isAdmin && t.status !== 'published') continue;
      threads.push(publicThread(t, { includeBody: false }));
    }
    return deps.json({
      ok: true,
      public: !!access.meta.public,
      role: access.role,
      avatars: FORUM_AVATARS,
      threads,
      user: access.user ? publicAuthor(access.user) : null
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
    return deps.json({ ok: true, thread: publicThread(thread), replies: visibleReplies.map(publicReply) }, 200, origin);
  }

  if (path === '/forum/threads' && method === 'POST') {
    const gate = await requireForumWriter(env, deps, request);
    if (gate.error) {
      return deps.json({ error: gate.error, needUsername: gate.needUsername, needAvatar: gate.needAvatar, needRegister: gate.needRegister }, gate.status, origin);
    }
    const body = await request.json();
    const title = String(body.title || '').trim().slice(0, FORUM_TITLE_MAX);
    const text = String(body.body || '').trim().slice(0, FORUM_BODY_MAX);
    if (title.length < 8) return deps.json({ error: 'Título muito curto (mín. 8).' }, 400, origin);
    if (text.length < 20) return deps.json({ error: 'Texto muito curto (mín. 20).' }, 400, origin);
    const id = crypto.randomUUID();
    let slug = slugify(title);
    if (await env.STORE_KV.get('forum:slug:' + slug)) slug = `${slug}-${id.slice(0, 6)}`;
    const now = new Date().toISOString();
    const thread = {
      id, slug, title, body: text, status: 'pending', createdAt: now, updatedAt: now,
      replyCount: 0, publishedReplyCount: 0,
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
    return deps.json({ ok: true, thread: publicThread(thread), message: 'Tópico enviado. Aparece após aprovação do administrador.' }, 201, origin);
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
    const reply = {
      id: crypto.randomUUID(),
      body: text,
      status: 'pending',
      createdAt: new Date().toISOString(),
      author: publicAuthor(gate.user),
      media: sanitizeMediaList(body.media)
    };
    const replies = await getReplies(env, thread.id);
    replies.push(reply);
    await saveReplies(env, thread.id, replies);
    thread.replyCount = replies.length;
    thread.updatedAt = reply.createdAt;
    await saveThread(env, thread);
    return deps.json({ ok: true, reply: publicReply(reply), message: 'Resposta enviada. Aparece após aprovação do administrador.' }, 201, origin);
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
    const threads = [];
    let pendingCount = 0;
    for (const id of index.slice(0, 150)) {
      const t = await getThread(env, id);
      if (!t) continue;
      if (t.status === 'pending') pendingCount += 1;
      const replies = await getReplies(env, id);
      const pendingReplies = replies.filter((r) => r.status === 'pending').length;
      pendingCount += pendingReplies;
      threads.push({ ...publicThread(t, { includeBody: true }), pendingReplies, replies: replies.map(publicReply) });
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
    const result = await findRelatedThreads(env, q, { limit: 12, includePending: true });
    return deps.json({ ok: true, query: q, ...result }, 200, origin);
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

  return null;
}
