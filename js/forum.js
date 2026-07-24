/**
 * Comunidade (fórum) — leitura pública; postar redireciona ao login se necessário.
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

  function loginRedirect(nextPath) {
    const next = nextPath || (location.pathname.split('/').pop() + location.search);
    try { sessionStorage.setItem('stf_forum_return', next); } catch (e) {}
    location.href = accountHref({ next });
  }

  function requireLoginForPost() {
    if (token() && state.user) return true;
    loginRedirect();
    return false;
  }

  function canPost() {
    return !!(state.user && state.user.username && state.user.avatarId);
  }

  function composeNewThreadHtml() {
    return `<section class="forum-compose admin-card">
      <h2>Novo assunto</h2>
      <p class="admin-meta">Antes de publicar, checamos se já existe um tópico parecido.</p>
      <form id="forum-new-thread" class="admin-form">
        <label>Assunto / título<input name="title" required minlength="8" maxlength="120" placeholder="Sobre o que você quer falar?" id="forum-compose-title"></label>
        <label>Mensagem<textarea name="body" required minlength="20" rows="5" placeholder="Conte sua experiência…" id="forum-compose-body"></textarea></label>
        <label>Foto (URL https, opcional)<input name="imageUrl" type="url" placeholder="https://…"></label>
        <label>Vídeo YouTube (URL, opcional)<input name="videoUrl" type="url" placeholder="https://www.youtube.com/watch?v=…"></label>
        <div id="forum-related-box" class="forum-related-box" hidden></div>
        <button type="submit" class="btn-primary">Postar</button>
        <p id="forum-compose-status" class="form-status" hidden></p>
      </form>
    </section>`;
  }

  function composeReplyHtml() {
    return `<section class="forum-compose admin-card">
      <h2>Responder</h2>
      <form id="forum-reply-form" class="admin-form">
        <label>Mensagem<textarea name="body" required minlength="2" rows="4"></textarea></label>
        <button type="submit" class="btn-primary">Postar</button>
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
      return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
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
        return `<div class="forum-media-video"><iframe src="https://www.youtube.com/embed/${escapeHtml(id)}" title="Vídeo" loading="lazy" allowfullscreen></iframe></div>`;
      }
      return `<a href="${escapeHtml(m.url)}" target="_blank" rel="noopener">${escapeHtml(m.url)}</a>`;
    }).join('')}</div>`;
  }

  function authorHtml(a) {
    if (!a) return '';
    const isOfficial = !!(a.isOfficial || a.username === 'sensortattoofix');
    const badges = [];
    if (isOfficial) badges.push('<span class="forum-badge-official" title="Conta oficial">oficial</span>');
    else if (a.isTester) badges.push('<span class="forum-badge-tester" title="Usuário de teste">teste</span>');
    return `<span class="forum-author${isOfficial ? ' is-official' : ''}"><span class="forum-avatar" aria-hidden="true">${escapeHtml(a.avatarEmoji || '⌚')}</span><span class="forum-author-meta"><strong>@${escapeHtml(a.username || 'anon')}</strong>${badges.join('')}<small>${escapeHtml(a.nome || '')}</small></span></span>`;
  }

  async function api(path, options = {}) {
    const base = apiBase();
    if (!base) throw new Error('API não configurada.');
    const headers = { ...(options.headers || {}) };
    const t = token();
    if (t) headers.Authorization = 'Bearer ' + t;
    if (options.json) {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.json);
      delete options.json;
    }
    const res = await fetch(base + path, { ...options, headers, cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error || data.message || 'Falha na requisição');
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
      <h1><i class="fas fa-comments"></i> Comunidade</h1>
      <p>${escapeHtml(message || 'Não foi possível carregar a comunidade.')}</p>
      <p class="forum-compose-actions">
        <button type="button" class="btn-primary" id="forum-retry">Tentar de novo</button>
        <a class="btn-secondary" href="${escapeHtml(accountHref())}">Entrar</a>
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
      <h2>Seu perfil na comunidade</h2>
      <p class="admin-meta">Escolha username e avatar para postar. Posts passam por aprovação.</p>
      <form id="forum-profile-form" class="admin-form">
        <label>Username (3–20: a-z, 0-9, _)<input name="username" required minlength="3" maxlength="20" pattern="[a-zA-Z0-9_]{3,20}" value="${escapeHtml(state.user?.username || '')}" placeholder="ex: guga97"></label>
        <div class="forum-avatar-grid" id="forum-avatar-grid">${avatars}</div>
        <input type="hidden" name="avatarId" id="forum-avatar-id" value="${escapeHtml(state.user?.avatarId || '')}">
        <button type="submit" class="btn-primary">Salvar perfil</button>
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
            <span>${Number(t.publishedReplyCount || t.replyCount || 0)} respostas</span>
            <time datetime="${escapeHtml(t.createdAt || '')}">${escapeHtml(formatDate(t.createdAt))}</time>
          </div>
        </button>
      </article>
    `).join('') || '<p class="admin-meta">Nenhum tópico publicado ainda.</p>';

    root.innerHTML = `
      <header class="forum-header">
        <div><h1><i class="fas fa-comments"></i> Comunidade</h1></div>
        ${state.user ? `<div class="forum-you">${authorHtml(state.user)}</div>` : ''}
      </header>
      ${state.user && !canPost() ? renderProfileSetup() : ''}
      ${composeNewThreadHtml()}
      <section class="forum-list">${threads}</section>
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
        <header>${authorHtml(r.author)} <time>${escapeHtml(formatDate(r.createdAt))}</time>
          ${r.status === 'pending' ? '<span class="forum-pending">aguardando aprovação</span>' : ''}
        </header>
        <div class="forum-body">${escapeHtml(r.body).replace(/\n/g, '<br>')}</div>
        ${mediaHtml(r.media)}
      </article>
    `).join('') || '<p class="admin-meta">Nenhuma resposta ainda.</p>';

    root.innerHTML = `
      <p><button type="button" class="btn-secondary" id="forum-back"><i class="fas fa-arrow-left"></i> Voltar</button></p>
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
          <small>@${escapeHtml(m.author?.username || '')} · ${Number(m.publishedReplyCount || m.replyCount || 0)} respostas</small>
        </button>
      </li>
    `).join('');
    box.innerHTML = `
      <div class="forum-related-prompt">
        <p><strong>${deciding ? 'Quer colocar este assunto em algum tópico existente?' : 'Encontramos tópicos parecidos'}</strong></p>
        <p class="admin-meta">${deciding
          ? 'Escolha um tópico abaixo para responder nele, ou crie um tópico novo.'
          : 'Se o seu assunto já está em um destes, responda lá em vez de abrir outro.'}</p>
        <ul class="forum-related-list">${list}</ul>
        ${deciding ? `<div class="forum-related-actions">
          <button type="button" class="btn-secondary" id="forum-create-new-topic">Criar tópico novo</button>
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
      setStatus('forum-profile-status', 'Perfil salvo.', true);
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
      setStatus('forum-compose-status', 'Complete username e avatar acima para postar.', false);
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
      setStatus('forum-compose-status', data.message || 'Enviado para aprovação.', true);
      form.reset();
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
    setStatus('forum-compose-status', 'Procurando tópicos relacionados…', true);
    try {
      const data = await api('/forum/related?q=' + encodeURIComponent(title + ' ' + body));
      const matches = data.matches || [];
      if (matches.length) {
        setStatus('forum-compose-status', '', true);
        renderRelatedBox(matches, { deciding: true });
        el('forum-related-box')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return;
      }
      await createNewThreadFromForm(e.target);
    } catch (err) {
      if (err.status === 401 || err.data?.needRegister) { loginRedirect(); return; }
      await createNewThreadFromForm(e.target);
    }
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
      setStatus('forum-reply-status', 'Complete username e avatar acima para responder.', false);
      el('forum-profile-form')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }
    const fd = new FormData(e.target);
    try {
      const data = await api('/forum/threads/' + encodeURIComponent(state.thread.id) + '/replies', {
        method: 'POST',
        json: { body: fd.get('body') }
      });
      setStatus('forum-reply-status', data.message || 'Enviado.', true);
      e.target.reset();
      try { sessionStorage.removeItem('stf_forum_reply_draft'); } catch (err) {}
    } catch (err) {
      if (err.status === 401 || err.data?.needRegister) { loginRedirect(); return; }
      setStatus('forum-reply-status', err.message, false);
    }
  }

  async function loadList() {
    try {
      const data = await api('/forum');
      state.threads = data.threads || [];
      state.avatars = data.avatars || [];
      state.user = data.user;
      state.role = data.role;
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
    await window.STF_ACCOUNT?.refreshSession?.().catch(() => {});
    const params = new URLSearchParams(location.search);
    const t = params.get('t');
    if (t) await loadThread(t);
    else await loadList();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
