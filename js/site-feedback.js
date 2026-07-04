/**
 * Pesquisa rápida: o que faltou no site / sugestões.
 */
(function () {
  const STORAGE_SENT = 'stf_feedback_sent_v1';

  const I18N = {
    pt: {
      fab: 'Sugestões',
      fabAria: 'Dizer o que faltou no site',
      title: 'Ajude-nos a melhorar',
      intro: 'Não encontrou o que procurava? Conte em poucas palavras — lemos todas as respostas.',
      buscava: 'O que você estava procurando?',
      buscavaPh: 'Ex.: preço do kit, compatibilidade com Garmin, prazo de entrega…',
      sugestao: 'O que faltou ou sugestão (opcional)',
      sugestaoPh: 'Ex.: vídeo de instalação, comparativo de modelos, frete internacional…',
      email: 'Seu e-mail (opcional)',
      emailPh: 'Só se quiser resposta',
      send: 'Enviar',
      sending: 'Enviando…',
      close: 'Fechar',
      thanks: 'Obrigado! Sua resposta nos ajuda a melhorar o site.',
      err: 'Não foi possível enviar. Tente de novo ou use contato@sensortattoofix.com.br.',
      errShort: 'Descreva em pelo menos 8 caracteres o que procurava.'
    },
    en: {
      fab: 'Feedback',
      fabAria: 'Tell us what was missing on the site',
      title: 'Help us improve',
      intro: "Didn't find what you needed? A few words help — we read every reply.",
      buscava: 'What were you looking for?',
      buscavaPh: 'E.g. kit price, Garmin compatibility, delivery time…',
      sugestao: 'What was missing or a suggestion (optional)',
      sugestaoPh: 'E.g. install video, model comparison, international shipping…',
      email: 'Your email (optional)',
      emailPh: 'Only if you want a reply',
      send: 'Send',
      sending: 'Sending…',
      close: 'Close',
      thanks: 'Thank you! Your feedback helps us improve the site.',
      err: 'Could not send. Try again or email contato@sensortattoofix.com.br.',
      errShort: 'Please describe what you were looking for (at least 8 characters).'
    },
    it: {
      fab: 'Suggerimenti',
      fabAria: 'Dicci cosa mancava sul sito',
      title: 'Aiutaci a migliorare',
      intro: 'Non hai trovato quello che cercavi? Poche parole bastano — leggiamo ogni risposta.',
      buscava: 'Cosa stavi cercando?',
      buscavaPh: 'Es.: prezzo del kit, compatibilità Garmin, tempi di consegna…',
      sugestao: 'Cosa mancava o un suggerimento (opzionale)',
      sugestaoPh: 'Es.: video installazione, confronto modelli, spedizione internazionale…',
      email: 'La tua e-mail (opzionale)',
      emailPh: 'Solo se vuoi una risposta',
      send: 'Invia',
      sending: 'Invio…',
      close: 'Chiudi',
      thanks: 'Grazie! Il tuo feedback ci aiuta a migliorare il sito.',
      err: 'Invio non riuscito. Riprova o scrivi a contato@sensortattoofix.com.br.',
      errShort: 'Descrivi cosa cercavi (almeno 8 caratteri).'
    }
  };

  function lang() {
    if (location.pathname.includes('/it/')) return 'it';
    if (location.pathname.includes('/en/')) return 'en';
    return 'pt';
  }

  function t(key) {
    return (I18N[lang()] || I18N.pt)[key] || key;
  }

  function apiBase() {
    return String(window.CONFIG_BOOTSTRAP?.configApiUrl || 'https://api.sensortattoofix.com.br').replace(/\/$/, '');
  }

  function shouldShow() {
    if (/admin\.html|pedidos\.html|documentacao\.html|imprimir-etiqueta/i.test(location.pathname)) return false;
    return true;
  }

  function buildDom() {
    if (document.getElementById('stf-feedback-root')) return;

    const root = document.createElement('div');
    root.id = 'stf-feedback-root';
    root.innerHTML = `
      <button type="button" class="stf-feedback-fab" id="stf-feedback-open" aria-haspopup="dialog" aria-controls="stf-feedback-dialog">
        <i class="fas fa-comment-dots" aria-hidden="true"></i>
        <span class="stf-feedback-fab-label">${t('fab')}</span>
      </button>
      <div class="stf-feedback-overlay" id="stf-feedback-overlay" hidden></div>
      <div class="stf-feedback-dialog" id="stf-feedback-dialog" role="dialog" aria-modal="true" aria-labelledby="stf-feedback-title" hidden>
        <button type="button" class="stf-feedback-close" id="stf-feedback-close" aria-label="${t('close')}"><i class="fas fa-times"></i></button>
        <h2 id="stf-feedback-title">${t('title')}</h2>
        <p class="stf-feedback-intro">${t('intro')}</p>
        <form id="stf-feedback-form" class="stf-feedback-form" novalidate>
          <label class="stf-feedback-field">
            <span>${t('buscava')}</span>
            <textarea name="buscava" rows="3" required minlength="8" maxlength="800" placeholder="${t('buscavaPh')}"></textarea>
          </label>
          <label class="stf-feedback-field">
            <span>${t('sugestao')}</span>
            <textarea name="sugestao" rows="3" maxlength="800" placeholder="${t('sugestaoPh')}"></textarea>
          </label>
          <label class="stf-feedback-field">
            <span>${t('email')}</span>
            <input type="email" name="email" maxlength="120" placeholder="${t('emailPh')}" autocomplete="email">
          </label>
          <p class="stf-feedback-status" id="stf-feedback-status" hidden></p>
          <button type="submit" class="btn-primary stf-feedback-submit">${t('send')}</button>
        </form>
      </div>
    `;
    document.body.appendChild(root);

    const openBtn = document.getElementById('stf-feedback-open');
    const overlay = document.getElementById('stf-feedback-overlay');
    const dialog = document.getElementById('stf-feedback-dialog');
    const closeBtn = document.getElementById('stf-feedback-close');
    const form = document.getElementById('stf-feedback-form');
    const statusEl = document.getElementById('stf-feedback-status');
    const titleEl = document.getElementById('stf-feedback-title');
    const introEl = dialog.querySelector('.stf-feedback-intro');
    const submitBtn = form.querySelector('.stf-feedback-submit');

    function setStatus(text, ok) {
      statusEl.textContent = text || '';
      statusEl.hidden = !text;
      statusEl.className = 'stf-feedback-status' + (ok ? ' stf-feedback-status--ok' : text ? ' stf-feedback-status--err' : '');
    }

    function openDialog() {
      overlay.hidden = false;
      dialog.hidden = false;
      document.body.classList.add('stf-feedback-open');
      const first = form.querySelector('textarea[name="buscava"]');
      if (first) setTimeout(() => first.focus(), 50);
    }

    function resetDialogForm() {
      form.hidden = false;
      if (titleEl) titleEl.hidden = false;
      if (introEl) introEl.hidden = false;
      form.reset();
      setStatus('', false);
      submitBtn.disabled = false;
      submitBtn.textContent = t('send');
    }

    function closeDialog() {
      overlay.hidden = true;
      dialog.hidden = true;
      document.body.classList.remove('stf-feedback-open');
      openBtn.focus();
    }

    openBtn.addEventListener('click', openDialog);
    closeBtn.addEventListener('click', closeDialog);
    overlay.addEventListener('click', closeDialog);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !dialog.hidden) closeDialog();
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const buscava = form.buscava.value.trim();
      const sugestao = form.sugestao.value.trim();
      const email = form.email.value.trim();
      if (buscava.length < 8) {
        setStatus(t('errShort'), false);
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = t('sending');
      setStatus('', false);

      const payload = {
        buscava,
        sugestao,
        email,
        pagina: location.pathname + location.search,
        idioma: document.documentElement.lang || lang(),
        referrer: document.referrer || '',
        titulo_pagina: document.title || ''
      };

      try {
        const res = await fetch(apiBase() + '/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Falha');

        try { localStorage.setItem(STORAGE_SENT, String(Date.now())); } catch (_) { /* ignore */ }
        window.STF_ANALYTICS?.track?.('feedback_enviado', { pagina: payload.pagina });
        setStatus(t('thanks'), true);
        setTimeout(() => {
          closeDialog();
          resetDialogForm();
        }, 1200);
      } catch (_) {
        setStatus(t('err'), false);
        submitBtn.disabled = false;
        submitBtn.textContent = t('send');
      }
    });
  }

  function init() {
    if (!shouldShow()) return;
    buildDom();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.STF_FEEDBACK = { open: () => document.getElementById('stf-feedback-open')?.click() };
})();
