/**
 * Comunidade (fórum) — visível a testadores enquanto em desenvolvimento.
 */
(function () {
  const state = {
    threads: [],
    avatars: [],
    user: null,
    role: null,
    thread: null,
    replies: [],
    view: 'list' // list | thread | gate
  };

  function apiBase() {
    return ((window.CONFIG_BOOTSTRAP?.configApiUrl) || '').replace(/\/$/, '');
  }

  function token() {
    return window.STF_ACCOUNT?.getToken?.() || localStorage.getItem('stf_customer_token') || '';
  }

  function accountHref(opts) {
    const base = window.STF_I18N?.accountHref?.() || 'minha-conta.html';
    if (opts?.register) {
      const sep = base.includes('?') ? '&' : '?';
      return base + sep + 'tab=register';
    }
    return base;
  }

  function canPost() {
    return !!(state.user && state.user.username && state.user.avatarId);
  }

  function renderRegisterToPost() {
    const reg = accountHref({ register: true });
    const login = accountHref();
    return `<section class="forum-compose admin-card forum-compose-locked">
      <h2>Quer postar?</h2>
      <p>Para criar tópicos ou responder, você precisa de uma <strong>conta cadastrada</strong>.</p>
      <p class="forum-compose-actions">
        <a class="btn-primary" href="${escapeHtml(reg)}"><i class="fas fa-user-plus"></i> Criar conta</a>
        <a class="btn-secondary" href="${escapeHtml(login)}"><i class="fas fa-sign-in-alt"></i> Já tenho conta</a>
      </p>
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

  function showGate(message, reason) {
    state.view = 'gate';
    const root = el('forum-root');
    if (!root) return;
    const loginHref = accountHref();
    const regHref = accountHref({ register: true });
    root.innerHTML = `<section class="forum-gate admin-card">
      <h1><i class="fas fa-comments"></i> Comunidade</h1>
      <p class="forum-dev-banner"><i class="fas fa-flask"></i> Comunidade oficial Sensor Tattoo Fix</p>
      <p>${escapeHtml(message || 'Acesso restrito.')}</p>
      ${reason === 'login' || reason === 'register' ? `
        <p>Para participar e postar, <strong>cadastre-se</strong> (é grátis) e faça login.</p>
        <p class="forum-compose-actions">
          <a class="btn-primary" href="${escapeHtml(regHref)}"><i class="fas fa-user-plus"></i> Criar conta</a>
          <a class="btn-secondary" href="${escapeHtml(loginHref)}"><i class="fas fa-sign-in-alt"></i> Entrar</a>
        </p>` : ''}
      ${reason === 'tester' ? '<p class="admin-meta">Sua conta ainda não é de teste. Peça ao admin para marcar você como testador.</p>' : ''}
    </section>`;
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
        <label>Username (3–20: a-z, 0-9, _)<input name="username" required minlength="3" maxlength="20" pattern="[a-zA-Z0-9_]{3,20}" value="${escapeHtml(state.user?.username || '')}" placeholder="ex: marina_ink"></label>
        <div class="forum-avatar-grid" id="forum-avatar-grid">${avatars}</div>
        <input type="hidden" name="avatarId" id="forum-avatar-id" value="${escapeHtml(state.user?.avatarId || '')}">
        <button type="submit" class="btn-primary">Salvar perfil</button>
        <p id="forum-profile-status" class="form-status" hidden></p>
      </form>
    </section>`;
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
        <div>
          <h1><i class="fas fa-comments"></i> Comunidade</h1>
          <p class="forum-dev-banner"><i class="fas fa-flask"></i> Para postar, crie uma conta</p>
        </div>
        ${state.user ? `<div class="forum-you">${authorHtml(state.user)}</div>` : ''}
      </header>
      ${!state.user ? renderRegisterToPost() : renderProfileSetup()}
      ${canPost() ? `<section class="forum-compose admin-card">
        <h2>Novo tópico</h2>
        <p class="admin-meta">Posts passam por aprovação do administrador.</p>
        <form id="forum-new-thread" class="admin-form">
          <label>Título<input name="title" required minlength="8" maxlength="120" placeholder="Sobre o que você quer falar?"></label>
          <label>Mensagem<textarea name="body" required minlength="20" rows="5" placeholder="Conte sua experiência…"></textarea></label>
          <label>Foto (URL https, opcional)<input name="imageUrl" type="url" placeholder="https://…"></label>
          <label>Vídeo YouTube (URL, opcional)<input name="videoUrl" type="url" placeholder="https://www.youtube.com/watch?v=…"></label>
          <button type="submit" class="btn-primary">Enviar para aprovação</button>
          <p id="forum-compose-status" class="form-status" hidden></p>
        </form>
      </section>` : (state.user ? '<p class="admin-meta">Complete username e avatar acima para poder postar.</p>' : '')}
      <section class="forum-list">${threads}</section>
    `;
    bindListEvents();
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
      ${!state.user ? renderRegisterToPost() : (canPost() ? `<section class="forum-compose admin-card">
        <h2>Responder</h2>
        <form id="forum-reply-form" class="admin-form">
          <label>Mensagem<textarea name="body" required minlength="2" rows="4"></textarea></label>
          <button type="submit" class="btn-primary">Enviar resposta</button>
          <p id="forum-reply-status" class="form-status" hidden></p>
        </form>
      </section>` : `<section class="forum-compose admin-card"><p>Complete seu perfil na lista de tópicos (username + avatar) para responder.</p><p><a class="btn-secondary" href="comunidade.html">Voltar à comunidade</a></p></section>`)}
    `;
    el('forum-back')?.addEventListener('click', () => { history.replaceState({}, '', location.pathname); loadList(); });
    el('forum-reply-form')?.addEventListener('submit', onReplySubmit);
  }

  function setStatus(id, msg, ok) {
    const s = el(id);
    if (!s) return;
    s.hidden = !msg;
    s.textContent = msg || '';
    s.className = 'form-status ' + (ok ? 'admin-status-ok' : 'admin-status-bad');
  }

  function bindListEvents() {
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
    el('forum-profile-form')?.addEventListener('submit', onProfileSubmit);
    el('forum-new-thread')?.addEventListener('submit', onNewThread);
    document.querySelectorAll('.forum-thread-card').forEach((card) => {
      card.querySelector('.forum-thread-open')?.addEventListener('click', () => {
        const id = card.getAttribute('data-thread');
        history.replaceState({}, '', '?t=' + encodeURIComponent(id));
        loadThread(id);
      });
    });
  }

  async function onProfileSubmit(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const username = String(fd.get('username') || '');
    const avatarId = String(fd.get('avatarId') || '');
    try {
      const data = await api('/forum/profile', { method: 'PATCH', json: { username, avatarId } });
      if (data.user && window.STF_ACCOUNT?.setSession) {
        window.STF_ACCOUNT.setSession(token(), data.user);
      }
      state.user = {
        ...(state.user || {}),
        username: data.user?.username,
        avatarId: data.user?.avatarId,
        avatarEmoji: state.avatars.find((a) => a.id === data.user?.avatarId)?.emoji || '⌚',
        isTester: !!data.user?.isTester,
        nome: data.user?.nome
      };
      setStatus('forum-profile-status', 'Perfil salvo.', true);
      renderList();
    } catch (err) {
      setStatus('forum-profile-status', err.message, false);
    }
  }

  async function onNewThread(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
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
      e.target.reset();
    } catch (err) {
      setStatus('forum-compose-status', err.message, false);
      if (err.data?.needRegister) {
        setStatus('forum-compose-status', err.message + ' — use Criar conta em Minha Conta.', false);
      }
    }
  }

  async function onReplySubmit(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      const data = await api('/forum/threads/' + encodeURIComponent(state.thread.id) + '/replies', {
        method: 'POST',
        json: { body: fd.get('body') }
      });
      setStatus('forum-reply-status', data.message || 'Enviado.', true);
      e.target.reset();
    } catch (err) {
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
      showGate(err.data?.message || err.message, err.data?.reason || (err.status === 403 ? 'tester' : 'login'));
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
      showGate(err.message, err.data?.reason || (err.data?.needRegister ? 'register' : 'login'));
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
