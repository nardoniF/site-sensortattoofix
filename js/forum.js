/**
 * Comunidade (fórum) — UI PT / EN / IT; postar redireciona ao login se necessário.
 */
(function () {
  const state = {
    threads: [],
    avatars: [],
    user: null,
    role: null,
    thread: null,
    replies: [],
    view: 'list'
  };

  const STRINGS = {
    pt: {
      title: 'Comunidade',
      loading: 'Carregando comunidade…',
      apiMissing: 'API não configurada.',
      requestFail: 'Falha na requisição',
      gateFail: 'Não foi possível carregar a comunidade.',
      retry: 'Tentar de novo',
      signIn: 'Entrar',
      profileTitle: 'Seu perfil na comunidade',
      profileHint: 'Escolha username e avatar para postar. Posts passam por aprovação.',
      usernameLabel: 'Username (3–20: a-z, 0-9, _)',
      usernamePh: 'ex: guga97',
      saveProfile: 'Salvar perfil',
      profileSaved: 'Perfil salvo.',
      newTopic: 'Novo assunto',
      newHint: 'Checamos se já existe um tópico parecido.',
      subject: 'Assunto / título',
      subjectPh: 'Sobre o que você quer falar?',
      message: 'Mensagem',
      messagePh: 'Conte sua experiência…',
      mediaSummary: 'Foto ou vídeo (opcional)',
      photo: 'Foto (URL https)',
      video: 'Vídeo YouTube',
      post: 'Postar',
      reply: 'Responder',
      replies: 'respostas',
      noTopics: 'Nenhum tópico publicado ainda.',
      noReplies: 'Nenhuma resposta ainda.',
      pending: 'aguardando aprovação',
      back: 'Voltar',
      relatedAsk: 'Quer colocar este assunto em algum tópico existente?',
      relatedFound: 'Encontramos tópicos parecidos',
      relatedPick: 'Escolha um tópico abaixo para responder nele, ou crie um tópico novo.',
      relatedHint: 'Se o seu assunto já está em um destes, responda lá em vez de abrir outro.',
      createNew: 'Criar tópico novo',
      needProfilePost: 'Complete username e avatar acima para postar.',
      needProfileReply: 'Complete username e avatar acima para responder.',
      topicSent: 'Tópico enviado — aparece após aprovação no admin.',
      replySent: 'Resposta enviada — aparece após aprovação.',
      searchingRelated: 'Procurando tópicos relacionados…',
      relatedStatus: 'Há tópicos parecidos abaixo — escolha um ou clique Postar de novo para criar o seu.',
      badgeOfficial: 'oficial',
      badgeOfficialTitle: 'Conta oficial',
      badgeSuper: 'supercolaborador',
      badgeSuperTitle: 'Supercolaborador',
      badgeTester: 'teste',
      badgeTesterTitle: 'Usuário de teste',
      videoTitle: 'Vídeo'
    },
    en: {
      title: 'Community',
      loading: 'Loading community…',
      apiMissing: 'API not configured.',
      requestFail: 'Request failed',
      gateFail: 'Could not load the community.',
      retry: 'Try again',
      signIn: 'Sign in',
      profileTitle: 'Your community profile',
      profileHint: 'Choose a username and avatar to post. Posts are moderated.',
      usernameLabel: 'Username (3–20: a-z, 0-9, _)',
      usernamePh: 'e.g. guga97',
      saveProfile: 'Save profile',
      profileSaved: 'Profile saved.',
      newTopic: 'New topic',
      newHint: 'We check if a similar topic already exists.',
      subject: 'Subject / title',
      subjectPh: 'What do you want to talk about?',
      message: 'Message',
      messagePh: 'Share your experience…',
      mediaSummary: 'Photo or video (optional)',
      photo: 'Photo (https URL)',
      video: 'YouTube video',
      post: 'Post',
      reply: 'Reply',
      replies: 'replies',
      noTopics: 'No published topics yet.',
      noReplies: 'No replies yet.',
      pending: 'awaiting approval',
      back: 'Back',
      relatedAsk: 'Want to add this to an existing topic?',
      relatedFound: 'We found similar topics',
      relatedPick: 'Pick a topic below to reply there, or create a new one.',
      relatedHint: 'If your issue is already covered, reply there instead of opening another topic.',
      createNew: 'Create new topic',
      needProfilePost: 'Set username and avatar above to post.',
      needProfileReply: 'Set username and avatar above to reply.',
      topicSent: 'Topic submitted — it appears after admin approval.',
      replySent: 'Reply submitted — it appears after approval.',
      searchingRelated: 'Looking for related topics…',
      relatedStatus: 'Similar topics below — pick one or click Post again to create yours.',
      badgeOfficial: 'official',
      badgeOfficialTitle: 'Official account',
      badgeSuper: 'super contributor',
      badgeSuperTitle: 'Super contributor',
      badgeTester: 'tester',
      badgeTesterTitle: 'Test user',
      videoTitle: 'Video'
    },
    it: {
      title: 'Community',
      loading: 'Caricamento community…',
      apiMissing: 'API non configurata.',
      requestFail: 'Richiesta non riuscita',
      gateFail: 'Impossibile caricare la community.',
      retry: 'Riprova',
      signIn: 'Accedi',
      profileTitle: 'Il tuo profilo nella community',
      profileHint: 'Scegli username e avatar per pubblicare. I post sono moderati.',
      usernameLabel: 'Username (3–20: a-z, 0-9, _)',
      usernamePh: 'es. guga97',
      saveProfile: 'Salva profilo',
      profileSaved: 'Profilo salvato.',
      newTopic: 'Nuovo argomento',
      newHint: 'Controlliamo se esiste già un argomento simile.',
      subject: 'Oggetto / titolo',
      subjectPh: 'Di cosa vuoi parlare?',
      message: 'Messaggio',
      messagePh: 'Racconta la tua esperienza…',
      mediaSummary: 'Foto o video (opzionale)',
      photo: 'Foto (URL https)',
      video: 'Video YouTube',
      post: 'Pubblica',
      reply: 'Rispondi',
      replies: 'risposte',
      noTopics: 'Nessun argomento pubblicato ancora.',
      noReplies: 'Nessuna risposta ancora.',
      pending: 'in attesa di approvazione',
      back: 'Indietro',
      relatedAsk: 'Vuoi aggiungere questo a un argomento esistente?',
      relatedFound: 'Abbiamo trovato argomenti simili',
      relatedPick: 'Scegli un argomento qui sotto per rispondere lì, oppure creane uno nuovo.',
      relatedHint: 'Se il tuo caso è già trattato, rispondi lì invece di aprirne un altro.',
      createNew: 'Crea nuovo argomento',
      needProfilePost: 'Completa username e avatar sopra per pubblicare.',
      needProfileReply: 'Completa username e avatar sopra per rispondere.',
      topicSent: 'Argomento inviato — compare dopo l’approvazione.',
      replySent: 'Risposta inviata — compare dopo l’approvazione.',
      searchingRelated: 'Cerco argomenti correlati…',
      relatedStatus: 'Argomenti simili sotto — scegline uno o clicca di nuovo Pubblica per crearne uno tuo.',
      badgeOfficial: 'ufficiale',
      badgeOfficialTitle: 'Account ufficiale',
      badgeSuper: 'super collaboratore',
      badgeSuperTitle: 'Super collaboratore',
      badgeTester: 'test',
      badgeTesterTitle: 'Utente di test',
      videoTitle: 'Video'
    }
  };

  function lang() {
    return window.STF_I18N?.getLang?.() || 'pt';
  }

  function ft(key) {
    const L = STRINGS[lang()] || STRINGS.pt;
    return L[key] || STRINGS.pt[key] || key;
  }

  function localeTag() {
    const l = lang();
    if (l === 'it') return 'it-IT';
    if (l === 'en') return 'en-US';
    return 'pt-BR';
  }

  function apiBase() {
    return ((window.CONFIG_BOOTSTRAP?.configApiUrl) || '').replace(/\/$/, '');
  }

  function token() {
    return window.STF_ACCOUNT?.getToken?.() || localStorage.getItem('stf_customer_token') || '';
  }

  function accountHref(opts) {
    const base = window.STF_I18N?.accountHref?.() || 'minha-conta.html';
    const parts = String(base).split('?');
    const path = parts[0];
    const params = new URLSearchParams(parts[1] || '');
    if (opts?.register) params.set('tab', 'register');
    if (opts?.next) params.set('next', opts.next);
    const q = params.toString();
    return path + (q ? '?' + q : '');
  }

  function forumReturnPath() {
    const file = location.pathname.split('/').pop() || 'comunidade.html';
    const q = location.search || '';
    if (location.pathname.includes('/it/')) return 'it/' + file + q;
    if (location.pathname.includes('/en/')) return 'en/' + file + q;
    return file + q;
  }

  function loginRedirect(nextPath) {
    const next = nextPath || forumReturnPath();
    try { sessionStorage.setItem('stf_forum_return', next); } catch (e) {}
    location.href = accountHref({ next });
  }

  function hydrateUserFromSession() {
    const sessionUser = window.STF_ACCOUNT?.getUser?.();
    if (!sessionUser) return;
    const avatarId = sessionUser.avatarId || state.user?.avatarId || '';
    state.user = {
      ...(state.user || {}),
      userId: sessionUser.userId || state.user?.userId,
      nome: sessionUser.nome || state.user?.nome || '',
      username: sessionUser.username || state.user?.username || '',
      avatarId,
      avatarEmoji: (state.avatars.find((a) => a.id === avatarId) || {}).emoji
        || state.user?.avatarEmoji
        || '⌚',
      isTester: !!(sessionUser.isTester || state.user?.isTester)
    };
  }

  function requireLoginForPost() {
    if (!token()) {
      loginRedirect();
      return false;
    }
    if (!state.user) hydrateUserFromSession();
    if (!state.user) {
      state.user = { username: '', avatarId: '', nome: '', avatarEmoji: '⌚' };
    }
    return true;
  }

  function canPost() {
    return !!(state.user && state.user.username && state.user.avatarId);
  }

  function composeNewThreadHtml() {
    return `<section class="forum-compose forum-compose--new admin-card">
      <h2>${escapeHtml(ft('newTopic'))}</h2>
      <p class="admin-meta forum-compose-hint">${escapeHtml(ft('newHint'))}</p>
      <form id="forum-new-thread" class="admin-form forum-compose-form">
        <label>${escapeHtml(ft('subject'))}<input name="title" required minlength="8" maxlength="120" placeholder="${escapeHtml(ft('subjectPh'))}" id="forum-compose-title"></label>
        <label>${escapeHtml(ft('message'))}<textarea name="body" required minlength="20" rows="3" placeholder="${escapeHtml(ft('messagePh'))}" id="forum-compose-body"></textarea></label>
        <details class="forum-compose-media">
          <summary>${escapeHtml(ft('mediaSummary'))}</summary>
          <label>${escapeHtml(ft('photo'))}<input name="imageUrl" type="url" placeholder="https://…"></label>
          <label>${escapeHtml(ft('video'))}<input name="videoUrl" type="url" placeholder="https://www.youtube.com/watch?v=…"></label>
        </details>
        <div id="forum-related-box" class="forum-related-box" hidden></div>
        <button type="submit" class="btn-primary">${escapeHtml(ft('post'))}</button>
        <p id="forum-compose-status" class="form-status" hidden></p>
      </form>
    </section>`;
  }

  function composeReplyHtml() {
    return `<section class="forum-compose admin-card">
      <h2>${escapeHtml(ft('reply'))}</h2>
      <form id="forum-reply-form" class="admin-form">
        <label>${escapeHtml(ft('message'))}<textarea name="body" required minlength="2" rows="4"></textarea></label>
        <button type="submit" class="btn-primary">${escapeHtml(ft('post'))}</button>
        <p id="forum-reply-status" class="form-status" hidden></p>
      </form>
    </section>`;
  }

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatDate(iso) {
    try {
      return new Date(iso).toLocaleString(localeTag(), { dateStyle: 'short', timeStyle: 'short' });
    } catch {
      return iso || '';
    }
  }

  function youtubeId(url) {
    const m = String(url || '').match(/(?:youtu\.be\/|v=|embed\/)([A-Za-z0-9_-]{6,})/);
    return m ? m[1] : '';
  }

  function mediaHtml(media) {
    if (!media?.length) return '';
    return `<div class="forum-media">${media.map((m) => {
      if (m.type === 'image') {
        return `<a class="forum-media-img" href="${escapeHtml(m.url)}" target="_blank" rel="noopener"><img src="${escapeHtml(m.url)}" alt="" loading="lazy"></a>`;
      }
      const id = youtubeId(m.url);
      if (id) {
        return `<div class="forum-media-video"><iframe src="https://www.youtube.com/embed/${escapeHtml(id)}" title="${escapeHtml(ft('videoTitle'))}" loading="lazy" allowfullscreen></iframe></div>`;
      }
      return `<a href="${escapeHtml(m.url)}" target="_blank" rel="noopener">${escapeHtml(m.url)}</a>`;
    }).join('')}</div>`;
  }

  function authorHtml(a) {
    if (!a) return '';
    const isOfficial = !!(a.isOfficial || a.username === 'sensortattoofix');
    const badges = [];
    if (isOfficial) badges.push(`<span class="forum-badge-official" title="${escapeHtml(ft('badgeOfficialTitle'))}">${escapeHtml(ft('badgeOfficial'))}</span>`);
    else if (a.isSuperCollaborator) badges.push(`<span class="forum-badge-super" title="${escapeHtml(ft('badgeSuperTitle'))}">${escapeHtml(ft('badgeSuper'))}</span>`);
    else if (a.isTester) badges.push(`<span class="forum-badge-tester" title="${escapeHtml(ft('badgeTesterTitle'))}">${escapeHtml(ft('badgeTester'))}</span>`);
    return `<span class="forum-author${isOfficial ? ' is-official' : ''}${a.isSuperCollaborator ? ' is-super' : ''}"><span class="forum-avatar" aria-hidden="true">${escapeHtml(a.avatarEmoji || '⌚')}</span><span class="forum-author-meta"><strong>@${escapeHtml(a.username || 'anon')}</strong>${badges.join('')}<small>${escapeHtml(a.nome || '')}</small></span></span>`;
  }

  async function api(path, options = {}) {
    const base = apiBase();
    if (!base) throw new Error(ft('apiMissing'));
    const headers = { ...(options.headers || {}) };
    const tok = token();
    if (tok) headers.Authorization = 'Bearer ' + tok;
    if (options.json) {
      headers['Content-Type'] = 'application/json';
      if (options.json && typeof options.json === 'object' && !Array.isArray(options.json) && options.json.lang == null) {
        options.json = { ...options.json, lang: lang() };
      }
      options.body = JSON.stringify(options.json);
      delete options.json;
    }
    let url = base + path;
    if (!options.method || options.method === 'GET') {
      const sep = path.includes('?') ? '&' : '?';
      if (!/[?&]lang=/.test(path)) url += sep + 'lang=' + encodeURIComponent(lang());
    }
    const res = await fetch(url, { ...options, headers, cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error || data.message || ft('requestFail'));
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  function el(id) {
    return document.getElementById(id);
  }

  function showGate(message) {
    state.view = 'gate';
    const root = el('forum-root');
    if (!root) return;
    root.innerHTML = `<section class="forum-gate admin-card">
      <h1><i class="fas fa-comments"></i> ${escapeHtml(ft('title'))}</h1>
      <p>${escapeHtml(message || ft('gateFail'))}</p>
      <p class="forum-compose-actions">
        <button type="button" class="btn-primary" id="forum-retry">${escapeHtml(ft('retry'))}</button>
        <a class="btn-secondary" href="${escapeHtml(accountHref())}">${escapeHtml(ft('signIn'))}</a>
      </p>
    </section>`;
    el('forum-retry')?.addEventListener('click', () => loadList());
  }

  function renderProfileSetup() {
    const need = !state.user?.username || !state.user?.avatarId;
    if (!need) return '';
    const avatars = state.avatars.map((a) => `
      <button type="button" class="forum-avatar-pick" data-avatar="${escapeHtml(a.id)}" title="${escapeHtml(a.label)}">${escapeHtml(a.emoji)}</button>
    `).join('');
    return `<section class="forum-profile-setup admin-card">
      <h2>${escapeHtml(ft('profileTitle'))}</h2>
      <p class="admin-meta">${escapeHtml(ft('profileHint'))}</p>
      <form id="forum-profile-form" class="admin-form">
        <label>${escapeHtml(ft('usernameLabel'))}<input name="username" required minlength="3" maxlength="20" pattern="[a-zA-Z0-9_]{3,20}" value="${escapeHtml(state.user?.username || '')}" placeholder="${escapeHtml(ft('usernamePh'))}"></label>
        <div class="forum-avatar-grid" id="forum-avatar-grid">${avatars}</div>
        <input type="hidden" name="avatarId" id="forum-avatar-id" value="${escapeHtml(state.user?.avatarId || '')}">
        <button type="submit" class="btn-primary">${escapeHtml(ft('saveProfile'))}</button>
        <p id="forum-profile-status" class="form-status" hidden></p>
      </form>
    </section>`;
  }

  function bindProfileEvents() {
    el('forum-profile-form')?.addEventListener('submit', onProfileSubmit);
    document.querySelectorAll('.forum-avatar-pick').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.forum-avatar-pick').forEach((b) => b.classList.remove('is-selected'));
        btn.classList.add('is-selected');
        const hidden = el('forum-avatar-id');
        if (hidden) hidden.value = btn.getAttribute('data-avatar') || '';
      });
    });
    const current = el('forum-avatar-id')?.value;
    if (current) {
      document.querySelector(`.forum-avatar-pick[data-avatar="${CSS.escape(current)}"]`)?.classList.add('is-selected');
    }
  }

  function restoreComposeDraft() {
    try {
      const raw = sessionStorage.getItem('stf_forum_compose_draft');
      if (!raw) return;
      const draft = JSON.parse(raw);
      const title = el('forum-compose-title');
      const body = el('forum-compose-body');
      if (title && draft.title) title.value = draft.title;
      if (body && draft.body) body.value = draft.body;
      sessionStorage.removeItem('stf_forum_compose_draft');
    } catch (e) {}
  }

  function renderList() {
    state.view = 'list';
    const root = el('forum-root');
    if (!root) return;
    const threads = state.threads.map((t) => `
      <article class="forum-thread-card" data-thread="${escapeHtml(t.slug || t.id)}">
        <button type="button" class="forum-thread-open">
          <h2>${escapeHtml(t.title)}</h2>
          <p>${escapeHtml(t.excerpt || '')}</p>
          <div class="forum-thread-meta">
            ${authorHtml(t.author)}
            <span>${Number(t.publishedReplyCount || t.replyCount || 0)} ${escapeHtml(ft('replies'))}</span>
            <time datetime="${escapeHtml(t.createdAt || '')}">${escapeHtml(formatDate(t.createdAt))}</time>
          </div>
        </button>
      </article>
    `).join('') || `<p class="admin-meta">${escapeHtml(ft('noTopics'))}</p>`;

    root.innerHTML = `
      <div class="forum-header">
        <div><h1><i class="fas fa-comments"></i> ${escapeHtml(ft('title'))}</h1></div>
        ${state.user ? `<div class="forum-you">${authorHtml(state.user)}</div>` : ''}
      </div>
      ${state.user && !canPost() ? renderProfileSetup() : ''}
      <section class="forum-list">${threads}</section>
      ${composeNewThreadHtml()}
    `;
    bindListEvents();
    bindProfileEvents();
    restoreComposeDraft();
  }

  function renderThread() {
    state.view = 'thread';
    const root = el('forum-root');
    const t = state.thread;
    if (!root || !t) return;
    const replies = state.replies.map((r) => `
      <article class="forum-reply ${r.status === 'pending' ? 'is-pending' : ''}">
        <div class="forum-reply-head">${authorHtml(r.author)} <time>${escapeHtml(formatDate(r.createdAt))}</time>
          ${r.status === 'pending' ? `<span class="forum-pending">${escapeHtml(ft('pending'))}</span>` : ''}
        </div>
        <div class="forum-body">${escapeHtml(r.body).replace(/\n/g, '<br>')}</div>
        ${mediaHtml(r.media)}
      </article>
    `).join('') || `<p class="admin-meta">${escapeHtml(ft('noReplies'))}</p>`;

    root.innerHTML = `
      <p><button type="button" class="btn-secondary" id="forum-back"><i class="fas fa-arrow-left"></i> ${escapeHtml(ft('back'))}</button></p>
      <article class="forum-thread-detail admin-card">
        <h1>${escapeHtml(t.title)}</h1>
        <div class="forum-thread-meta">${authorHtml(t.author)} <time>${escapeHtml(formatDate(t.createdAt))}</time></div>
        <div class="forum-body">${escapeHtml(t.body).replace(/\n/g, '<br>')}</div>
        ${mediaHtml(t.media)}
      </article>
      <section class="forum-replies">${replies}</section>
      ${state.user && !canPost() ? renderProfileSetup() : ''}
      ${composeReplyHtml()}
    `;
    el('forum-back')?.addEventListener('click', () => { history.replaceState({}, '', location.pathname); loadList(); });
    el('forum-reply-form')?.addEventListener('submit', onReplySubmit);
    bindProfileEvents();
    try {
      const draft = sessionStorage.getItem('stf_forum_reply_draft');
      const ta = el('forum-reply-form')?.querySelector('textarea[name="body"]');
      if (draft && ta && !ta.value) { ta.value = draft; ta.focus(); }
    } catch (e) {}
  }

  function setStatus(id, msg, ok) {
    const s = el(id);
    if (!s) return;
    s.hidden = !msg;
    s.textContent = msg || '';
    s.className = 'form-status ' + (ok ? 'admin-status-ok' : 'admin-status-bad');
  }

  function bindListEvents() {
    el('forum-new-thread')?.addEventListener('submit', onNewThread);
    el('forum-compose-title')?.addEventListener('blur', () => {
      const title = el('forum-compose-title')?.value || '';
      const body = el('forum-compose-body')?.value || '';
      if (String(title).trim().length >= 8) previewRelated(title, body);
    });
    document.querySelectorAll('.forum-thread-card').forEach((card) => {
      card.querySelector('.forum-thread-open')?.addEventListener('click', () => {
        const id = card.getAttribute('data-thread');
        history.replaceState({}, '', '?t=' + encodeURIComponent(id));
        loadThread(id);
      });
    });
  }

  function renderRelatedBox(matches, { deciding = false } = {}) {
    const box = el('forum-related-box');
    if (!box) return;
    if (!matches.length) { box.hidden = true; box.innerHTML = ''; return; }
    box.hidden = false;
    const list = matches.map((m) => `
      <li>
        <button type="button" class="forum-related-pick" data-thread="${escapeHtml(m.slug || m.id)}">
          <strong>${escapeHtml(m.title)}</strong>
          <span>${escapeHtml(m.excerpt || '')}</span>
          <small>@${escapeHtml(m.author?.username || '')} · ${Number(m.publishedReplyCount || m.replyCount || 0)} ${escapeHtml(ft('replies'))}</small>
        </button>
      </li>
    `).join('');
    box.innerHTML = `
      <div class="forum-related-prompt">
        <p><strong>${escapeHtml(deciding ? ft('relatedAsk') : ft('relatedFound'))}</strong></p>
        <p class="admin-meta">${escapeHtml(deciding ? ft('relatedPick') : ft('relatedHint'))}</p>
        <ul class="forum-related-list">${list}</ul>
        ${deciding ? `<div class="forum-related-actions">
          <button type="button" class="btn-secondary" id="forum-create-new-topic">${escapeHtml(ft('createNew'))}</button>
        </div>` : ''}
      </div>
    `;
    box.querySelectorAll('.forum-related-pick').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-thread');
        const draft = el('forum-compose-body')?.value || '';
        try { if (draft.trim()) sessionStorage.setItem('stf_forum_reply_draft', draft.trim()); } catch (e) {}
        history.replaceState({}, '', '?t=' + encodeURIComponent(id));
        loadThread(id);
      });
    });
    el('forum-create-new-topic')?.addEventListener('click', () => {
      createNewThreadFromForm(el('forum-new-thread'));
    });
  }

  async function previewRelated(title, body) {
    try {
      const q = [title, body].filter(Boolean).join(' ');
      const data = await api('/forum/related?q=' + encodeURIComponent(q));
      renderRelatedBox(data.matches || [], { deciding: false });
    } catch (e) {}
  }

  async function onProfileSubmit(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      const data = await api('/forum/profile', {
        method: 'PATCH',
        json: { username: String(fd.get('username') || ''), avatarId: String(fd.get('avatarId') || '') }
      });
      if (data.user && window.STF_ACCOUNT?.setSession) window.STF_ACCOUNT.setSession(token(), data.user);
      state.user = {
        ...(state.user || {}),
        username: data.user?.username,
        avatarId: data.user?.avatarId,
        avatarEmoji: state.avatars.find((a) => a.id === data.user?.avatarId)?.emoji || '⌚',
        isTester: !!data.user?.isTester,
        nome: data.user?.nome
      };
      setStatus('forum-profile-status', ft('profileSaved'), true);
      if (state.view === 'thread') renderThread();
      else renderList();
    } catch (err) {
      setStatus('forum-profile-status', err.message, false);
    }
  }

  async function createNewThreadFromForm(form) {
    if (!form) return;
    if (!requireLoginForPost()) return;
    if (!canPost()) {
      setStatus('forum-compose-status', ft('needProfilePost'), false);
      el('forum-profile-form')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }
    const fd = new FormData(form);
    const media = [];
    const imageUrl = String(fd.get('imageUrl') || '').trim();
    const videoUrl = String(fd.get('videoUrl') || '').trim();
    if (imageUrl) media.push({ type: 'image', url: imageUrl });
    if (videoUrl) media.push({ type: 'video', url: videoUrl });
    try {
      const data = await api('/forum/threads', {
        method: 'POST',
        json: { title: fd.get('title'), body: fd.get('body'), media }
      });
      setStatus('forum-compose-status', data.message || ft('topicSent'), true);
      form.reset();
      form.removeAttribute('data-related-decided');
      const box = el('forum-related-box');
      if (box) { box.hidden = true; box.innerHTML = ''; }
    } catch (err) {
      if (err.status === 401 || err.data?.needRegister) { loginRedirect(); return; }
      setStatus('forum-compose-status', err.message, false);
    }
  }

  async function onNewThread(e) {
    e.preventDefault();
    if (!requireLoginForPost()) {
      try {
        const fd = new FormData(e.target);
        sessionStorage.setItem('stf_forum_compose_draft', JSON.stringify({
          title: String(fd.get('title') || ''),
          body: String(fd.get('body') || '')
        }));
      } catch (err) {}
      return;
    }
    const fd = new FormData(e.target);
    const title = String(fd.get('title') || '').trim();
    const body = String(fd.get('body') || '').trim();
    const form = e.target;
    const skipRelated = form.getAttribute('data-related-decided') === '1';
    if (!skipRelated) {
      setStatus('forum-compose-status', ft('searchingRelated'), true);
      try {
        const data = await api('/forum/related?q=' + encodeURIComponent(title + ' ' + body));
        const matches = data.matches || [];
        if (matches.length) {
          form.setAttribute('data-related-decided', '1');
          setStatus('forum-compose-status', ft('relatedStatus'), true);
          renderRelatedBox(matches, { deciding: true });
          el('forum-related-box')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          return;
        }
      } catch (err) {
        if (err.status === 401 || err.data?.needRegister) { loginRedirect(); return; }
      }
    }
    form.setAttribute('data-related-decided', '1');
    await createNewThreadFromForm(form);
  }

  async function onReplySubmit(e) {
    e.preventDefault();
    if (!requireLoginForPost()) {
      try {
        const fd = new FormData(e.target);
        const draft = String(fd.get('body') || '').trim();
        if (draft) sessionStorage.setItem('stf_forum_reply_draft', draft);
      } catch (err) {}
      return;
    }
    if (!canPost()) {
      setStatus('forum-reply-status', ft('needProfileReply'), false);
      el('forum-profile-form')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }
    const fd = new FormData(e.target);
    const bodyText = String(fd.get('body') || '').trim();
    const btn = e.target.querySelector('button[type="submit"]');
    if (btn) btn.disabled = true;
    try {
      const data = await api('/forum/threads/' + encodeURIComponent(state.thread.id) + '/replies', {
        method: 'POST',
        json: { body: bodyText }
      });
      const pending = data.reply || {
        id: 'local-' + Date.now(),
        body: bodyText,
        status: 'pending',
        createdAt: new Date().toISOString(),
        author: state.user
      };
      state.replies = [...state.replies, pending];
      e.target.reset();
      try { sessionStorage.removeItem('stf_forum_reply_draft'); } catch (err) {}
      renderThread();
      setStatus('forum-reply-status', data.message || ft('replySent'), true);
    } catch (err) {
      if (err.status === 401 || err.data?.needRegister) { loginRedirect(); return; }
      setStatus('forum-reply-status', err.message, false);
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  async function loadList() {
    try {
      const data = await api('/forum');
      state.threads = data.threads || [];
      state.avatars = data.avatars || [];
      state.user = data.user || null;
      state.role = data.role;
      if (!state.user && token()) hydrateUserFromSession();
      renderList();
    } catch (err) {
      showGate(err.data?.message || err.message);
    }
  }

  async function loadThread(id) {
    try {
      if (!state.user) {
        const sessionUser = window.STF_ACCOUNT?.getUser?.();
        if (sessionUser) {
          state.user = {
            userId: sessionUser.userId,
            nome: sessionUser.nome,
            username: sessionUser.username || '',
            avatarId: sessionUser.avatarId || '',
            avatarEmoji: (state.avatars.find((a) => a.id === sessionUser.avatarId) || {}).emoji || '⌚',
            isTester: !!sessionUser.isTester
          };
        }
      }
      const data = await api('/forum/threads/' + encodeURIComponent(id));
      state.thread = data.thread;
      state.replies = data.replies || [];
      renderThread();
    } catch (err) {
      showGate(err.message);
    }
  }

  async function boot() {
    const loading = el('forum-root');
    if (loading && loading.querySelector('.fa-spinner')) {
      loading.innerHTML = `<p class="admin-meta"><i class="fas fa-spinner fa-spin"></i> ${escapeHtml(ft('loading'))}</p>`;
    }
    await window.STF_ACCOUNT?.refreshSession?.().catch(() => {});
    const params = new URLSearchParams(location.search);
    const t = params.get('t');
    if (t) await loadThread(t);
    else await loadList();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
