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
        { body: 'Em casos assim, o que costuma mudar é a forma como o sensor recebe a luz de volta. Quando a tinta muda esse retorno, o relógio interpreta o contato como instável — e a detecção de pulso/Apple Pay começa a falhar.', author: { ...A['seed-chris'] }, createdAt: iso(60 * 22) },
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
        { body: 'Kai, quando a tinta altera a reflexão da pele, a leitura do pulso fica menos estável em movimento. O que costuma ajudar é deixar a interface óptica do sensor mais consistente do que tentar “forçar” a pulseira com fita ou ajuste manual.', author: { ...A['seed-chris'] }, createdAt: iso(60 * 52) },
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
        { body: 'Marcinha, em watches Samsung esse tipo de alerta geralmente aparece quando o algoritmo não recebe um sinal estável. O ponto é a leitura óptica na área do sensor, não só o aperto da pulseira.', author: { ...A['seed-chris'] }, createdAt: iso(60 * 10) },
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
        { body: 'Dudu: quando a tinta é densa, o algoritmo costuma perder a curva do pulso e passar a inventar leituras. O que costuma estabilizar a FC não é a pulseira em si, mas a forma como a luz retorna ao sensor.', author: { ...A['seed-chris'] }, createdAt: iso(60 * 41) },
        { body: 'Depois do kit Tattoo Fix ficou usável no dia a dia. Parou o delírio dos batimentos malucos.', author: { ...A['seed-rick'] }, createdAt: iso(60 * 33) },
        { body: 'Alguém comparou com oxímetro de dedo depois de instalar?', author: { ...A['seed-bela'] }, createdAt: iso(60 * 18) },
        officialReply('Dudu, boa pergunta.\n\nA tinta escura/sólida impede o sensor de chegar aos vasos sanguíneos: o algoritmo “perde” o pulso, pede senha e às vezes fica louco e marca errado. O kit cria uma interface óptica entre LED/fotodiodo e a pele e amplifica o sinal, corrigindo isso.\n\nQualquer coisa, @sensortattoofix no suporte. 🖤', iso(60 * 4))
      ]
    },
    {
      title: 'Garmin Forerunner 255 — frequência cardíaca pulando na corrida',
      body: 'No meu Forerunner 255 a frequência sobe e desce sem parar, principalmente quando a pulseira fica mais alta no braço. Eu já usei no outro pulso e lá a leitura fica estável. Parece que a tattoo “confunde” o sensor quando a luz entra de um jeito diferente.',
      tags: ['garmin', 'frequencia-cardiaca', 'corrida', 'ppg'],
      author: { ...A['seed-juliana'] },
      createdAt: iso(60 * 130),
      replies: [
        { body: 'Eu tive isso no 265. O relógio marcava 145 em repouso e depois voltava. Não era o suor, era a leitura mesmo.', author: { ...A['seed-raf'] }, createdAt: iso(60 * 122) },
        { body: 'Garmin é bem sensível a esse tipo de variação no pulso. O sensor de PPG fica com o sinal instável quando a tinta muda a reflexão da pele, então o algoritmo tende a ler o pulso de forma inconsistente.', author: { ...A['seed-edu'] }, createdAt: iso(60 * 116) },
        officialReply('Isso é bem comum em relógios com sensor óptico. Quando o pulso está tatuado, a luz do LED e o fotodiodo recebem um sinal diferente, então o algoritmo interpreta como pulso irregular. O kit tenta estabilizar essa interface óptica e melhorar a leitura do sensor. Se quiser, me diga o modelo do seu Garmin e eu verifico compatibilidade. 🖤', iso(60 * 108))
      ]
    },
    {
      title: 'Galaxy Watch 6/7 — oxigenação e sono ficam zerados',
      body: 'Eu uso o Galaxy Watch 6 e, quando durmo de lado, o relógio começa a marcar oxigenação em 0 ou dá um monte de “sem dado” na noite. O problema piora quando o pulso está mais escuro e a pulseira fica mais apertada.',
      tags: ['galaxy-watch', 'oxigenacao', 'sono', 'samsung'],
      author: { ...A['seed-ana'] },
      createdAt: iso(60 * 150),
      replies: [
        { body: 'No meu o sleep tracking também piora quando a leitura de O2 entra em colapso. Daí a análise do sono fica toda errada.', author: { ...A['seed-diego'] }, createdAt: iso(60 * 142) },
        { body: 'Esse tipo de leitura depende de muita luz e de um contato estável. Se a tinta muda a reflexão, o algoritmo pode “perder” a curva e falhar na análise do sono.', author: { ...A['seed-chris'] }, createdAt: iso(60 * 134) },
        officialReply('Entendo. Em muitos casos isso não é só uma questão de ajuste na pulseira — a tinta muda a forma como a luz chega à pele, e a rotina de monitoramento do sono/oxigenação fica comprometida. A solução mais natural é melhorar a interface óptica no ponto do sensor. Se você quiser, me mande o modelo do seu Galaxy Watch para avaliarmos. 🖤', iso(60 * 128))
      ]
    },
    {
      title: 'Huawei Watch GT 3 — o relógio acha que eu tirei o pulso',
      body: 'Tenho uma Huawei Watch GT 3 e o relógio começa a me falar que “não detecta o pulso” ou que eu tirei o braço. Isso acontece principalmente quando eu faço treino e a pulseira fica mais alta no braço. Parece o mesmo problema do Apple Watch, mas em outro sistema.',
      tags: ['huawei', 'treino', 'detecao', 'watch'],
      author: { ...A['seed-malu'] },
      createdAt: iso(60 * 170),
      replies: [
        { body: 'Eu tinha o mesmo comportamento no GT 2. O relógio “perdia” o pulso e o treino parava sem motivo. No outro braço, tudo normal.', author: { ...A['seed-camila'] }, createdAt: iso(60 * 160) },
        { body: 'Não é só o software. Em muitas marcas, o sensor precisa de uma leitura limpa; se a tinta alterou a reflexão, a detecção fica instável e o watch entra em modo de falha.', author: { ...A['seed-chris'] }, createdAt: iso(60 * 154) },
        officialReply('Isso é um sintoma clássico de leitura óptica instável. O relógio confunde o pulso com falta de contato e entra em modo de “não detectado”, principalmente em treino e movimento. O ajuste da interface do sensor é o que costuma ajudar. Se quiser, me diga o modelo exato para verificarmos a compatibilidade. 🖤', iso(60 * 148))
      ]
    },
    {
      title: 'Amazfit T-Rex 3 — 0 bpm e treino travado',
      body: 'No Amazfit T-Rex 3 eu fico vendo 0 bpm durante o treino e o rastreamento fica meio travado. O ruim é que nem sempre dá pra ajustar a pulseira de novo; parece que o sensor entra em “modo de erro” e fica ali.',
      tags: ['amazfit', 'treino', 'bpm', 'sensor'],
      author: { ...A['seed-diego'] },
      createdAt: iso(60 * 190),
      replies: [
        { body: 'No meu T-Rex 2 era igual. O relógio marcava 0 bpm e eu pensava que a bateria estava acabando, mas era só a leitura mesmo.', author: { ...A['seed-ana'] }, createdAt: iso(60 * 182) },
        { body: 'Quando a tinta muda o retorno de luz, o algoritmo acaba interpretando o sinal como “sem pulso” ou “falta de contato”.', author: { ...A['seed-chris'] }, createdAt: iso(60 * 176) },
        officialReply('Esse comportamento costuma aparecer quando a área do sensor recebe menos luz de volta do que o algoritmo espera. A solução é justamente melhorar a leitura do ponto onde a luz entra e volta à pele. Se quiser, eu posso te orientar pelo modelo do seu Amazfit. 🖤', iso(60 * 168))
      ]
    },
    {
      title: 'Xiaomi Band 8 — FC e sono ficam ruins no pulso tatuado',
      body: 'A Xiaomi Band 8 é bem simples, mas o problema é que ela lê muito mal o pulso quando a tattoo é escura. Numa madrugada eu vi a frequência cair em 40 e depois pular para 140 sem motivo. No outro pulso a coisa já fica melhor.',
      tags: ['xiaomi', 'frequencia-cardiaca', 'sono', 'band'],
      author: { ...A['seed-camila'] },
      createdAt: iso(60 * 210),
      replies: [
        { body: 'Eu uso Band 7 e fico na mesma. O sensor faz uma leitura horrível quando a tinta é mais fechada.', author: { ...A['seed-raf'] }, createdAt: iso(60 * 202) },
        { body: 'Bandas mais básicas tendem a depender bastante da estabilidade do sinal. Com tatuagem escura a leitura fica bem mais inconsistente.', author: { ...A['seed-chris'] }, createdAt: iso(60 * 196) },
        officialReply('Em modelos mais simples o problema costuma aparecer de forma mais evidente porque a rotina de leitura é menos robusta. Mesmo assim, a causa costuma ser a mesma: a tinta altera a reflexão e o algoritmo não reconhece bem o pulso. Se você quiser, me diga qual modelo e eu te ajudo a checar. 🖤', iso(60 * 188))
      ]
    },
    {
      title: 'Apple Pay e Google Wallet pararam no mesmo pulso',
      body: 'Fiquei uns meses sem usar o pagamento por aproximação porque o relógio simplesmente não reconhecia o pulso. O problema apareceu quando a tattoo ficou mais fechada na região do sensor. Parece que o watch “desconfia” demais da leitura e trava tudo.',
      tags: ['apple-pay', 'google-wallet', 'pagamento', 'tattoo'],
      author: { ...A['seed-malu'] },
      createdAt: iso(60 * 230),
      replies: [
        { body: 'Opa, eu passei pelo mesmo. O Apple Pay começou a falhar e o Google Wallet também. Não era a carteira, era a leitura.', author: { ...A['seed-bela'] }, createdAt: iso(60 * 222) },
        { body: 'Isso costuma acontecer quando a leitura de pulso e o reconhecimento de contato ficam instáveis — o sistema acaba interpretando como se o dispositivo não estivesse bem posicionado.', author: { ...A['seed-chris'] }, createdAt: iso(60 * 214) },
        officialReply('Quando o sensor perde estabilidade, o pagamento por aproximação costuma ser o primeiro a dar errado. Isso também é muito comum em quem tem tatuagem escura ou muito densa na região do sensor. Se você quiser, me diga o modelo do seu wearable e a condição da tattoo para avaliarmos a compatibilidade. 🖤', iso(60 * 208))
      ]
    },
    {
      title: 'LED verde, infravermelho e fotodiodo: o que muda mesmo na leitura?',
      body: 'Eu queria entender de um jeito menos “manual de aparelho” o que muda de verdade entre LEDs verdes, vermelho e infravermelho. Parece que alguns relógios usam um conjunto e outros usam outro, e isso muda muito na interpretação do pulso.',
      tags: ['tecnologia', 'ppg', 'led', 'fotodiodo'],
      author: { ...A['seed-juliana'] },
      createdAt: iso(60 * 250),
      replies: [
        { body: 'Em termos práticos, o que muda é a profundidade e a forma como a luz penetra na pele. Verde e infravermelho não são equivalentes para o algoritmo, e isso faz diferença quando a tatuagem altera a reflexão.', author: { ...A['seed-edu'] }, createdAt: iso(60 * 242) },
        { body: 'Na prática, se a tinta muda a reflexão, a combinação que funciona bem num pulso limpo pode falhar num pulso tatuado.', author: { ...A['seed-ana'] }, createdAt: iso(60 * 236) },
        officialReply('Exato. O sensor óptico depende de um equilíbrio entre LED, fotodiodo e algoritmo. Quando a tatuagem altera a reflexão, a leitura fica mais frágil. O ponto importante é acompanhar como a luz volta à pele e como o chip interpreta esse sinal. 🖤', iso(60 * 228))
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
        { body: 'In cases like this, what usually changes is how the sensor gets light back. When the tattoo alters that return, the watch reads contact as unstable and Apple Pay / wrist detection starts to fail.', author: { ...A['seed-chris'] }, createdAt: iso(60 * 22) },
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
        { body: 'Kai, when the tattoo changes skin reflection, pulse reading becomes less stable during motion. What usually helps is making the optical interface more consistent rather than trying to force the band with tape or manual adjustment.', author: { ...A['seed-chris'] }, createdAt: iso(60 * 52) },
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
        { body: 'Marcinha, in Samsung watches this kind of alert usually appears when the algorithm is not getting a stable signal. The issue is the optical reading at the sensor area, not just how tight the band is.', author: { ...A['seed-chris'] }, createdAt: iso(60 * 10) },
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
        { body: 'Dudu: when the ink is dense, the algorithm often loses the pulse curve and starts inventing readings. What usually stabilizes HR is not the band itself, but the way light returns to the sensor.', author: { ...A['seed-chris'] }, createdAt: iso(60 * 41) },
        { body: 'After Tattoo Fix it became usable day to day. The crazy HR readings stopped.', author: { ...A['seed-rick'] }, createdAt: iso(60 * 33) },
        { body: 'Anyone compare with a finger pulse ox after installing?', author: { ...A['seed-bela'] }, createdAt: iso(60 * 18) },
        officialReply('Dudu, good question.\n\nDark/solid ink blocks the sensor from reaching blood vessels: the algorithm “loses” the pulse, asks for a passcode, and sometimes goes wild with bad readings. The kit adds an optical interface between the LED/photodiode and skin and boosts the signal.\n\nAnything else, @sensortattoofix on support. 🖤', iso(60 * 4))
      ]
    },
    {
      title: 'Garmin Forerunner 255 — heart rate jumping during runs',
      body: 'On my Forerunner 255 the heart rate jumps up and down for no reason, especially when the band sits a bit higher on the arm. I tried the other wrist and the reading is stable there. It feels like the tattoo changes how the light hits the sensor.',
      tags: ['garmin', 'heart-rate', 'running', 'ppg'],
      author: { ...A['seed-juliana'] },
      createdAt: iso(60 * 130),
      replies: [
        { body: 'I had the same thing on a 265. The watch was reading 145 at rest and then dropping back down. It was the sensor, not the sweat.', author: { ...A['seed-raf'] }, createdAt: iso(60 * 122) },
        { body: 'Garmin tends to be very sensitive to this kind of variation. The PPG signal gets unstable when the tattoo changes the skin reflection, so the algorithm tends to read the pulse inconsistently.', author: { ...A['seed-edu'] }, createdAt: iso(60 * 116) },
        officialReply('That is pretty common in optical watches. When the wrist is tattooed, the LED light and photodiode see a different signal, so the algorithm reads pulse irregularities. The kit helps stabilize that optical interface and improve sensor reading. If you want, send the exact Garmin model and we can check compatibility. 🖤', iso(60 * 108))
      ]
    },
    {
      title: 'Galaxy Watch 6/7 — SpO2 and sleep data go flat',
      body: 'I use a Galaxy Watch 6 and, when I sleep on one side, the watch starts showing oxygen at 0 or throws a bunch of “no data” messages overnight. The problem gets worse when the wrist is darker and the band is a bit tighter.',
      tags: ['galaxy-watch', 'spo2', 'sleep', 'samsung'],
      author: { ...A['seed-ana'] },
      createdAt: iso(60 * 150),
      replies: [
        { body: 'Same here — the sleep tracking also gets messy when the O2 reading falls apart. The whole night analysis becomes noisy.', author: { ...A['seed-diego'] }, createdAt: iso(60 * 142) },
        { body: 'This kind of readout depends on a lot of light and stable contact. If the ink shifts the reflection, the algorithm can lose the curve and fail the sleep analysis.', author: { ...A['seed-chris'] }, createdAt: iso(60 * 134) },
        officialReply('I get that. In many cases this is not just a band adjustment issue — the tattoo changes how light reaches the skin, and sleep/SpO2 tracking becomes unreliable. The more natural fix is to improve the optical interface at the sensor area. If you want, send the exact Galaxy Watch model and we can take a look. 🖤', iso(60 * 128))
      ]
    },
    {
      title: 'Huawei Watch GT 3 — the watch thinks I took it off',
      body: 'I have a Huawei Watch GT 3 and the watch keeps saying it can’t detect my pulse or that I took it off. It tends to happen more during workouts when the band sits higher on the arm. It feels like the same problem as Apple Watch, just on another system.',
      tags: ['huawei', 'workout', 'detection', 'watch'],
      author: { ...A['seed-malu'] },
      createdAt: iso(60 * 170),
      replies: [
        { body: 'I had the same behavior on a GT 2. The watch would lose the pulse and stop the workout for no reason. On the other wrist, everything was normal.', author: { ...A['seed-camila'] }, createdAt: iso(60 * 160) },
        { body: 'It isn’t just the software. In many brands, the sensor needs a clean read; if the ink changes the reflection, detection becomes unstable and the watch drops into failure mode.', author: { ...A['seed-chris'] }, createdAt: iso(60 * 154) },
        officialReply('That is a classic symptom of unstable optical reading. The watch confuses the pulse with a lack of contact and drops into “not detected” mode, especially during movement. Improving the sensor interface is what usually helps. If you want, send the exact model and we can check compatibility. 🖤', iso(60 * 148))
      ]
    },
    {
      title: 'Amazfit T-Rex 3 — 0 bpm and the workout freezes',
      body: 'On my Amazfit T-Rex 3 I keep seeing 0 bpm during workouts and the tracking feels stuck. The annoying part is that I can’t always re-seat the band; it feels like the sensor drops into error mode and stays there.',
      tags: ['amazfit', 'workout', 'bpm', 'sensor'],
      author: { ...A['seed-diego'] },
      createdAt: iso(60 * 190),
      replies: [
        { body: 'I had the same thing on a T-Rex 2. The watch was reading 0 bpm and I thought the battery was dying, but it was just the readout.', author: { ...A['seed-ana'] }, createdAt: iso(60 * 182) },
        { body: 'When the tattoo changes the light return, the algorithm can interpret the signal as “no pulse” or “poor contact”.', author: { ...A['seed-chris'] }, createdAt: iso(60 * 176) },
        officialReply('This behavior shows up when the sensor area gets less light back than the algorithm expects. The fix is to improve the reading right where the light enters and returns to the skin. If you want, I can help you check the Amazfit model. 🖤', iso(60 * 168))
      ]
    },
    {
      title: 'Xiaomi Band 8 — HR and sleep are bad on a tattooed wrist',
      body: 'The Xiaomi Band 8 is pretty simple, but it reads the wrist badly when the tattoo is dark. One night I saw the heart rate drop to 40 and then jump to 140 for no reason. On the other wrist it is much better.',
      tags: ['xiaomi', 'heart-rate', 'sleep', 'band'],
      author: { ...A['seed-camila'] },
      createdAt: iso(60 * 210),
      replies: [
        { body: 'I use a Band 7 and have the same issue. The sensor reads terribly when the ink is dense.', author: { ...A['seed-raf'] }, createdAt: iso(60 * 202) },
        { body: 'More basic bands rely heavily on signal stability. With a dark tattoo, the readout becomes much less consistent.', author: { ...A['seed-chris'] }, createdAt: iso(60 * 196) },
        officialReply('On more basic models the problem can show up more clearly because the reading routine is less robust. Even so, the cause is usually the same: the ink changes the reflection and the algorithm does not read the pulse well. If you want, send the model and I can help check it. 🖤', iso(60 * 188))
      ]
    },
    {
      title: 'Apple Pay and Google Wallet stopped working on the same wrist',
      body: 'I went a while without using contactless payments because the watch simply would not recognize the wrist. The problem appeared when the tattoo got darker around the sensor area. It feels like the watch gets too suspicious of the reading and blocks everything.',
      tags: ['apple-pay', 'google-wallet', 'payment', 'tattoo'],
      author: { ...A['seed-malu'] },
      createdAt: iso(60 * 230),
      replies: [
        { body: 'Same here. Apple Pay started failing and Google Wallet did too. It was not the wallet — it was the reading.', author: { ...A['seed-bela'] }, createdAt: iso(60 * 222) },
        { body: 'That usually happens when pulse detection and contact recognition become unstable — the system ends up treating the device as badly positioned.', author: { ...A['seed-chris'] }, createdAt: iso(60 * 214) },
        officialReply('When the sensor loses stability, contactless payment is often the first thing to break. That is also very common for people with dense dark tattooing around the sensor area. If you want, send the wearable model and the tattoo condition and we can assess compatibility. 🖤', iso(60 * 208))
      ]
    },
    {
      title: 'Green LED, infrared, and photodiode: what actually changes the reading?',
      body: 'I wanted to understand in a less “user manual” way what really changes between green, red, and infrared LEDs. It seems some watches use one set and others use another, and that changes a lot in how pulse is interpreted.',
      tags: ['technology', 'ppg', 'led', 'photodiode'],
      author: { ...A['seed-juliana'] },
      createdAt: iso(60 * 250),
      replies: [
        { body: 'In practical terms, what changes is how deep the light goes and how it interacts with the skin. Green and infrared are not equivalent for the algorithm, and that matters when the tattoo changes reflection.', author: { ...A['seed-edu'] }, createdAt: iso(60 * 242) },
        { body: 'In practice, if the tattoo changes the reflection, the combination that works on a clean wrist can fail on a tattooed one.', author: { ...A['seed-ana'] }, createdAt: iso(60 * 236) },
        officialReply('Exactly. The optical sensor depends on a balance between LED, photodiode, and algorithm. When the tattoo changes the reflection, the reading becomes more fragile. The key is to look at how light returns to the skin and how the chip interprets that signal. 🖤', iso(60 * 228))
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
        { body: 'In questi casi, quello che cambia di solito è il modo in cui il sensore riceve la luce di ritorno. Quando il tatuaggio altera quel ritorno, l’orologio interpreta il contatto come instabile e il rilevamento/Apple Pay comincia a sbagliare.', author: { ...A['seed-chris'] }, createdAt: iso(60 * 22) },
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
        { body: 'Kai, quando il tatuaggio cambia la riflessione della pelle, la lettura del polso diventa meno stabile in movimento. Quello che di solito aiuta è rendere più coerente l’interfaccia ottica del sensore, più che forzare il cinturino con nastro o aggiustamenti manuali.', author: { ...A['seed-chris'] }, createdAt: iso(60 * 52) },
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
        { body: 'Marcinha, negli smartwatch Samsung questo tipo di alert di solito appare quando l’algoritmo non riceve un segnale stabile. Il punto è la lettura ottica nell’area del sensore, non solo la tensione del cinturino.', author: { ...A['seed-chris'] }, createdAt: iso(60 * 10) },
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
        { body: 'Dudu: quando l’inchiostro è denso, l’algoritmo spesso perde la curva del polso e comincia a inventare letture. Quello che di solito stabilizza la FC non è il cinturino in sé, ma il modo in cui la luce ritorna al sensore.', author: { ...A['seed-chris'] }, createdAt: iso(60 * 41) },
        { body: 'Dopo Tattoo Fix è diventato usabile ogni giorno. Le FC folli sono finite.', author: { ...A['seed-rick'] }, createdAt: iso(60 * 33) },
        { body: 'Qualcuno ha confrontato con un saturimetro a dito dopo l’installazione?', author: { ...A['seed-bela'] }, createdAt: iso(60 * 18) },
        officialReply('Dudu, bella domanda.\n\nL’inchiostro scuro/pieno impedisce al sensore di raggiungere i vasi: l’algoritmo “perde” il polso, chiede il codice e a volte inventa letture sbagliate. Il kit crea un’interfaccia ottica tra LED/fotodiodo e pelle e amplifica il segnale.\n\nAltro? @sensortattoofix sul supporto. 🖤', iso(60 * 4))
      ]
    },
    {
      title: 'Garmin Forerunner 255 — frequenza cardiaca che salta in corsa',
      body: 'Sul mio Forerunner 255 la frequenza cardiaca sale e scende senza senso, soprattutto quando il cinturino si appoggia più in alto sul braccio. L’ho provato sull’altro polso e lì la lettura è stabile. Sembra che il tatuaggio cambi il modo in cui la luce colpisce il sensore.',
      tags: ['garmin', 'frequenza-cardiaca', 'corsa', 'ppg'],
      author: { ...A['seed-juliana'] },
      createdAt: iso(60 * 130),
      replies: [
        { body: 'Ho avuto la stessa cosa su un 265. L’orologio leggeva 145 a riposo e poi tornava giù. Era il sensore, non il sudore.', author: { ...A['seed-raf'] }, createdAt: iso(60 * 122) },
        { body: 'Garmin è molto sensibile a questo tipo di variazione. Il segnale PPG diventa instabile quando il tatuaggio cambia la riflessione della pelle, quindi l’algoritmo tende a leggere il polso in modo incoerente.', author: { ...A['seed-edu'] }, createdAt: iso(60 * 116) },
        officialReply('È abbastanza comune negli orologi ottici. Quando il polso è tatuato, la luce dei LED e il fotodiodo ricevono un segnale diverso, quindi l’algoritmo legge irregolarità nel polso. Il kit aiuta a stabilizzare questa interfaccia ottica e a migliorare la lettura del sensore. Se vuoi, mandami il modello esatto del Garmin e verifico la compatibilità. 🖤', iso(60 * 108))
      ]
    },
    {
      title: 'Galaxy Watch 6/7 — SpO2 e sonno vanno a zero',
      body: 'Uso un Galaxy Watch 6 e, quando dormo di lato, l’orologio inizia a mostrare ossigenazione a 0 o a buttare un sacco di messaggi “nessun dato” durante la notte. Il problema peggiora quando il polso è più scuro e il cinturino è un po’ più stretto.',
      tags: ['galaxy-watch', 'spo2', 'sonno', 'samsung'],
      author: { ...A['seed-ana'] },
      createdAt: iso(60 * 150),
      replies: [
        { body: 'Anche io — il tracciamento del sonno si rovina quando la lettura di O2 crolla. L’analisi della notte diventa tutta rumorosa.', author: { ...A['seed-diego'] }, createdAt: iso(60 * 142) },
        { body: 'Questa tipologia di lettura dipende da tanto livello di luce e da un contatto stabile. Se l’inchiostro cambia la riflessione, l’algoritmo può perdere la curva e mandare in tilt l’analisi del sonno.', author: { ...A['seed-chris'] }, createdAt: iso(60 * 134) },
        officialReply('Capisco. In molti casi non è solo un problema di regolazione del cinturino — il tatuaggio cambia il modo in cui la luce raggiunge la pelle, e il monitoraggio del sonno/SpO2 diventa poco affidabile. La soluzione più naturale è migliorare l’interfaccia ottica nella zona del sensore. Se vuoi, mandami il modello esatto del Galaxy Watch e ci guardiamo. 🖤', iso(60 * 128))
      ]
    },
    {
      title: 'Huawei Watch GT 3 — l’orologio pensa che io l’abbia tolto',
      body: 'Ho una Huawei Watch GT 3 e l’orologio continua a dire che non rileva il polso oppure che l’ho tolto. Succede soprattutto durante gli allenamenti quando il cinturino si alza sul braccio. Sembra lo stesso problema dell’Apple Watch, ma su un altro sistema.',
      tags: ['huawei', 'allenamento', 'rilevamento', 'watch'],
      author: { ...A['seed-malu'] },
      createdAt: iso(60 * 170),
      replies: [
        { body: 'Ho avuto lo stesso comportamento su un GT 2. L’orologio perdeva il polso e fermava l’allenamento senza motivo. Sull’altro polso andava tutto bene.', author: { ...A['seed-camila'] }, createdAt: iso(60 * 160) },
        { body: 'Non è solo il software. In molte marche, il sensore ha bisogno di una lettura pulita; se l’inchiostro cambia la riflessione, il rilevamento diventa instabile e l’orologio va in modalità errore.', author: { ...A['seed-chris'] }, createdAt: iso(60 * 154) },
        officialReply('È un sintomo classico di lettura ottica instabile. L’orologio confonde il polso con una mancanza di contatto e entra in modalità “non rilevato”, soprattutto in movimento. Migliorare l’interfaccia del sensore è quello che di solito aiuta. Se vuoi, mandami il modello esatto e verifichiamo la compatibilità. 🖤', iso(60 * 148))
      ]
    },
    {
      title: 'Amazfit T-Rex 3 — 0 bpm e allenamento bloccato',
      body: 'Sul mio Amazfit T-Rex 3 continuo a vedere 0 bpm durante gli allenamenti e il tracciamento sembra bloccato. Il fastidio è che non sempre riesco a riaggiustare il cinturino; sembra che il sensore entri in modalità errore e resti lì.',
      tags: ['amazfit', 'allenamento', 'bpm', 'sensore'],
      author: { ...A['seed-diego'] },
      createdAt: iso(60 * 190),
      replies: [
        { body: 'Ho avuto la stessa cosa su un T-Rex 2. L’orologio leggeva 0 bpm e pensavo che la batteria fosse finita, ma era solo la lettura.', author: { ...A['seed-ana'] }, createdAt: iso(60 * 182) },
        { body: 'Quando il tatuaggio cambia il ritorno di luce, l’algoritmo interpreta il segnale come “nessun polso” o “scarso contatto”.', author: { ...A['seed-chris'] }, createdAt: iso(60 * 176) },
        officialReply('Questo comportamento si presenta quando l’area del sensore riceve meno luce di ritorno di quella che l’algoritmo si aspetta. La soluzione è proprio migliorare la lettura proprio dove la luce entra e torna alla pelle. Se vuoi, ti aiuto a controllare il modello Amazfit. 🖤', iso(60 * 168))
      ]
    },
    {
      title: 'Xiaomi Band 8 — FC e sonno vanno male sul polso tatuato',
      body: 'La Xiaomi Band 8 è abbastanza semplice, ma legge malissimo il polso quando il tatuaggio è scuro. Una notte ho visto la frequenza scendere a 40 e poi saltare a 140 senza motivo. Sull’altro polso va molto meglio.',
      tags: ['xiaomi', 'frequenza-cardiaca', 'sonno', 'band'],
      author: { ...A['seed-camila'] },
      createdAt: iso(60 * 210),
      replies: [
        { body: 'Io uso una Band 7 e ho lo stesso problema. Il sensore legge davvero male quando l’inchiostro è denso.', author: { ...A['seed-raf'] }, createdAt: iso(60 * 202) },
        { body: 'Le bande più basilari dipendono tantissimo dalla stabilità del segnale. Con un tatuaggio scuro la lettura diventa molto meno consistente.', author: { ...A['seed-chris'] }, createdAt: iso(60 * 196) },
        officialReply('Sui modelli più semplici il problema può apparire in modo più evidente perché la routine di lettura è meno robusta. Anche così, la causa è di solito la stessa: l’inchiostro cambia la riflessione e l’algoritmo non legge bene il polso. Se vuoi, mandami il modello e ti aiuto a verificarlo. 🖤', iso(60 * 188))
      ]
    },
    {
      title: 'Apple Pay e Google Wallet hanno smesso di funzionare sullo stesso polso',
      body: 'Ho fatto un po’ di mesi senza usare i pagamenti contactless perché l’orologio semplicemente non riconosceva il polso. Il problema è comparso quando il tatuaggio si è fatto più scuro intorno all’area del sensore. Sembra che l’orologio si fidi troppo poco della lettura e blocchi tutto.',
      tags: ['apple-pay', 'google-wallet', 'pagamento', 'tattoo'],
      author: { ...A['seed-malu'] },
      createdAt: iso(60 * 230),
      replies: [
        { body: 'Anche io. Apple Pay ha cominciato a sbagliare e Google Wallet pure. Non era il portafoglio, era la lettura.', author: { ...A['seed-bela'] }, createdAt: iso(60 * 222) },
        { body: 'Di solito succede quando il rilevamento del polso e il riconoscimento del contatto diventano instabili — il sistema finisce per interpretarlo come dispositivo mal posizionato.', author: { ...A['seed-chris'] }, createdAt: iso(60 * 214) },
        officialReply('Quando il sensore perde stabilità, il pagamento contactless è spesso la prima cosa a rompersi. Succede molto anche a chi ha tatuaggi scuri e densi intorno all’area del sensore. Se vuoi, mandami il modello del wearable e la condizione del tatuaggio per valutare la compatibilità. 🖤', iso(60 * 208))
      ]
    },
    {
      title: 'LED verde, infrarosso e fotodiodo: cosa cambia davvero nella lettura?',
      body: 'Volevo capire in modo meno “manuale” cosa cambia davvero tra LED verdi, rossi e infrarossi. Sembra che alcuni orologi usino una combinazione e altri un’altra, e questo cambia molto nella interpretazione del polso.',
      tags: ['tecnologia', 'ppg', 'led', 'fotodiodo'],
      author: { ...A['seed-juliana'] },
      createdAt: iso(60 * 250),
      replies: [
        { body: 'In pratica, ciò che cambia è quanto in profondità la luce entra e come interagisce con la pelle. Verde e infrarosso non sono equivalenti per l’algoritmo, e questo conta quando il tatuaggio cambia la riflessione.', author: { ...A['seed-edu'] }, createdAt: iso(60 * 242) },
        { body: 'In pratica, se il tatuaggio cambia la riflessione, la combinazione che funziona su un polso pulito può fallire su un polso tatuato.', author: { ...A['seed-ana'] }, createdAt: iso(60 * 236) },
        officialReply('Esatto. Il sensore ottico dipende da un equilibrio tra LED, fotodiodo e algoritmo. Quando il tatuaggio cambia la riflessione, la lettura diventa più fragile. Il punto è guardare come la luce torna alla pelle e come il chip interpreta quel segnale. 🖤', iso(60 * 228))
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

const SEED_AUTHORS_VERSION = 5;
const SEED_CONTENT_VERSION = 12;

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
      const lang = normalizeForumLang(t.lang || 'pt');
      const lastmod = (t.updatedAt || t.createdAt || '').slice(0, 10);
      let loc;
      if (lang === 'en') loc = `https://www.sensortattoofix.com/comunidade.html?t=${slug}`;
      else if (lang === 'it') loc = `https://www.sensortattoofix.com/it/comunidade.html?t=${slug}`;
      else loc = `https://www.sensortattoofix.com.br/comunidade.html?t=${slug}`;
      urls.push(`  <url>\n    <loc>${loc}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}\n    <changefreq>weekly</changefreq>\n    <priority>0.65</priority>\n  </url>`);
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
    const lang = normalizeForumLang(thread.lang || 'pt');
    const pageUrl = lang === 'en'
      ? `https://www.sensortattoofix.com/comunidade.html?t=${encodeURIComponent(thread.slug || thread.id)}`
      : lang === 'it'
        ? `https://www.sensortattoofix.com/it/comunidade.html?t=${encodeURIComponent(thread.slug || thread.id)}`
        : `https://www.sensortattoofix.com.br/comunidade.html?t=${encodeURIComponent(thread.slug || thread.id)}`;
    const esc = (s) => String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
    const desc = esc(String(thread.body || '').replace(/\s+/g, ' ').trim().slice(0, 160));
    const replyHtml = replies.map((r) => `
      <article>
        <h2>@${esc(r.author?.username || 'anon')}</h2>
        <time datetime="${esc(r.createdAt || '')}">${esc(r.createdAt || '')}</time>
        <p>${esc(r.body).replace(/\n/g, '<br>')}</p>
      </article>`).join('\n');
    const html = `<!DOCTYPE html>
<html lang="${lang === 'pt' ? 'pt-BR' : lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="index, follow">
  <title>${esc(thread.title)} | Comunidade | Sensor Tattoo Fix</title>
  <meta name="description" content="${desc}">
  <link rel="canonical" href="${esc(pageUrl)}">
  <meta property="og:title" content="${esc(thread.title)}">
  <meta property="og:description" content="${desc}">
  <meta property="og:url" content="${esc(pageUrl)}">
  <link rel="stylesheet" href="https://www.sensortattoofix.com.br/style.css">
</head>
<body class="checkout-page forum-page">
  <main class="container forum-container">
    <p><a href="${esc(pageUrl)}">Sensor Tattoo Fix — Comunidade</a></p>
    <article>
      <h1>${esc(thread.title)}</h1>
      <p class="admin-meta">@${esc(thread.author?.username || 'anon')} · <time datetime="${esc(thread.createdAt || '')}">${esc(thread.createdAt || '')}</time></p>
      <div>${esc(thread.body).replace(/\n/g, '<br>')}</div>
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
