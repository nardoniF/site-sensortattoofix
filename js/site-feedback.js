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
      err: 'Could not send. Try again or email support@sensortattoofix.com.',
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
      err: 'Invio non riuscito. Riprova o scrivi a support@sensortattoofix.com.',
      errShort: 'Descrivi cosa cercavi (almeno 8 caratteri).'
    },
    de: {
      fab: 'Feedback',
      fabAria: 'Sagen Sie uns, was auf der Website gefehlt hat',
      title: 'Helfen Sie uns, besser zu werden',
      intro: 'Nicht gefunden, was Sie brauchen? Ein paar Worte reichen — wir lesen jede Antwort.',
      buscava: 'Wonach haben Sie gesucht?',
      buscavaPh: 'Z. B. Kit-Preis, Garmin-Kompatibilität, Lieferzeit…',
      sugestao: 'Was hat gefehlt oder ein Vorschlag (optional)',
      sugestaoPh: 'Z. B. Installationsvideo, Modellvergleich, internationaler Versand…',
      email: 'Ihre E-Mail (optional)',
      emailPh: 'Nur wenn Sie eine Antwort möchten',
      send: 'Senden',
      sending: 'Wird gesendet…',
      close: 'Schließen',
      thanks: 'Danke! Ihr Feedback hilft uns, die Website zu verbessern.',
      err: 'Senden fehlgeschlagen. Versuchen Sie es erneut oder schreiben Sie an support@sensortattoofix.com.',
      errShort: 'Beschreiben Sie, wonach Sie gesucht haben (mindestens 8 Zeichen).'
    },
    es: {
      fab: 'Comentarios',
      fabAria: 'Cuéntanos qué faltaba en el sitio',
      title: 'Ayúdanos a mejorar',
      intro: '¿No encontraste lo que buscabas? Unas palabras bastan — leemos cada respuesta.',
      buscava: '¿Qué estabas buscando?',
      buscavaPh: 'Ej.: precio del kit, compatibilidad Garmin, plazo de entrega…',
      sugestao: 'Qué faltaba o una sugerencia (opcional)',
      sugestaoPh: 'Ej.: video de instalación, comparativa de modelos, envío internacional…',
      email: 'Tu correo (opcional)',
      emailPh: 'Solo si quieres respuesta',
      send: 'Enviar',
      sending: 'Enviando…',
      close: 'Cerrar',
      thanks: '¡Gracias! Tu comentario nos ayuda a mejorar el sitio.',
      err: 'No se pudo enviar. Inténtalo de nuevo o escribe a support@sensortattoofix.com.',
      errShort: 'Describe qué buscabas (al menos 8 caracteres).'
    },
    pl: {
      fab: 'Opinie',
      fabAria: 'Powiedz, czego brakowało na stronie',
      title: 'Pomóż nam się poprawić',
      intro: 'Nie znalazłeś tego, czego szukasz? Kilka słów wystarczy — czytamy każdą odpowiedź.',
      buscava: 'Czego szukałeś?',
      buscavaPh: 'Np. cena zestawu, kompatybilność Garmin, czas dostawy…',
      sugestao: 'Czego brakowało lub sugestia (opcjonalnie)',
      sugestaoPh: 'Np. film instalacji, porównanie modeli, wysyłka międzynarodowa…',
      email: 'Twój e-mail (opcjonalnie)',
      emailPh: 'Tylko jeśli chcesz odpowiedź',
      send: 'Wyślij',
      sending: 'Wysyłanie…',
      close: 'Zamknij',
      thanks: 'Dziękujemy! Twoja opinia pomaga nam ulepszać stronę.',
      err: 'Nie udało się wysłać. Spróbuj ponownie lub napisz na support@sensortattoofix.com.',
      errShort: 'Opisz, czego szukałeś (co najmniej 8 znaków).'
    },
    sl: {
      fab: 'Predlogi',
      fabAria: 'Povejte, kaj je manjkalo na spletni strani',
      title: 'Pomagajte nam izboljšati',
      intro: 'Niste našli, kar ste iskali? Nekaj besed zadošča — preberemo vsak odgovor.',
      buscava: 'Kaj ste iskali?',
      buscavaPh: 'Npr. cena kompleta, združljivost z Garmin, rok dostave…',
      sugestao: 'Kaj je manjkalo ali predlog (neobvezno)',
      sugestaoPh: 'Npr. video namestitve, primerjava modelov, mednarodna dostava…',
      email: 'Vaš e-poštni naslov (neobvezno)',
      emailPh: 'Samo če želite odgovor',
      send: 'Pošlji',
      sending: 'Pošiljanje…',
      close: 'Zapri',
      thanks: 'Hvala! Vaše mnenje nam pomaga izboljšati stran.',
      err: 'Pošiljanje ni uspelo. Poskusite znova ali pišite na support@sensortattoofix.com.',
      errShort: 'Opišite, kaj ste iskali (vsaj 8 znakov).'
    },
    fr: {
      fab: 'Suggestions',
      fabAria: "Dites-nous ce qui manquait sur le site",
      title: 'Aidez-nous à nous améliorer',
      intro: "Vous n'avez pas trouvé ce que vous cherchiez ? Quelques mots suffisent — nous lisons chaque réponse.",
      buscava: 'Que cherchiez-vous ?',
      buscavaPh: 'Ex. : prix du kit, compatibilité Garmin, délai de livraison…',
      sugestao: 'Ce qui manquait ou une suggestion (facultatif)',
      sugestaoPh: "Ex. : vidéo d'installation, comparatif des modèles, livraison internationale…",
      email: 'Votre e-mail (facultatif)',
      emailPh: 'Seulement si vous souhaitez une réponse',
      send: 'Envoyer',
      sending: 'Envoi…',
      close: 'Fermer',
      thanks: 'Merci ! Votre retour nous aide à améliorer le site.',
      err: "Envoi impossible. Réessayez ou écrivez à support@sensortattoofix.com.",
      errShort: 'Décrivez ce que vous cherchiez (au moins 8 caractères).'
    },
    nl: {
      fab: 'Feedback',
      fabAria: 'Laat ons weten wat er op de site ontbrak',
      title: 'Help ons verbeteren',
      intro: 'Niet gevonden wat u zocht? Een paar woorden zijn genoeg — we lezen elke reactie.',
      buscava: 'Wat zocht u?',
      buscavaPh: 'Bijv.: prijs van de kit, Garmin-compatibiliteit, levertijd…',
      sugestao: 'Wat ontbrak of een suggestie (optioneel)',
      sugestaoPh: 'Bijv.: installatievideo, modelvergelijking, internationale verzending…',
      email: 'Uw e-mail (optioneel)',
      emailPh: 'Alleen als u een antwoord wilt',
      send: 'Versturen',
      sending: 'Versturen…',
      close: 'Sluiten',
      thanks: 'Dank u! Uw feedback helpt ons de site te verbeteren.',
      err: 'Verzenden mislukt. Probeer het opnieuw of mail support@sensortattoofix.com.',
      errShort: 'Beschrijf wat u zocht (minstens 8 tekens).'
    },
    sv: {
      fab: 'Feedback',
      fabAria: 'Berätta vad som saknades på sajten',
      title: 'Hjälp oss att bli bättre',
      intro: 'Hittade du inte det du sökte? Några ord räcker — vi läser alla svar.',
      buscava: 'Vad letade du efter?',
      buscavaPh: 'T.ex.: pris på kit, Garmin-kompatibilitet, leveranstid…',
      sugestao: 'Vad saknades eller ett förslag (valfritt)',
      sugestaoPh: 'T.ex.: installationsvideo, modelljämförelse, internationell frakt…',
      email: 'Din e-post (valfritt)',
      emailPh: 'Endast om du vill ha ett svar',
      send: 'Skicka',
      sending: 'Skickar…',
      close: 'Stäng',
      thanks: 'Tack! Din feedback hjälper oss att förbättra sajten.',
      err: 'Kunde inte skicka. Försök igen eller skriv till support@sensortattoofix.com.',
      errShort: 'Beskriv vad du letade efter (minst 8 tecken).'
    },
    no: {
      fab: 'Tilbakemelding',
      fabAria: 'Fortell oss hva som manglet på siden',
      title: 'Hjelp oss å bli bedre',
      intro: 'Fant du ikke det du søkte etter? Noen ord er nok — vi leser alle svar.',
      buscava: 'Hva lette du etter?',
      buscavaPh: 'F.eks.: pris på kit, Garmin-kompatibilitet, leveringstid…',
      sugestao: 'Hva manglet eller et forslag (valgfritt)',
      sugestaoPh: 'F.eks.: installasjonsvideo, modellsammenligning, internasjonal frakt…',
      email: 'Din e-post (valgfritt)',
      emailPh: 'Bare hvis du vil ha svar',
      send: 'Send',
      sending: 'Sender…',
      close: 'Lukk',
      thanks: 'Takk! Din tilbakemelding hjelper oss å forbedre siden.',
      err: 'Kunne ikke sende. Prøv igjen eller skriv til support@sensortattoofix.com.',
      errShort: 'Beskriv hva du lette etter (minst 8 tegn).'
    },
    fi: {
      fab: 'Palaute',
      fabAria: 'Kerro, mitä sivustolta puuttui',
      title: 'Auta meitä parantamaan',
      intro: 'Etkö löytänyt etsimääsi? Muutama sana riittää — luemme kaikki vastaukset.',
      buscava: 'Mitä etsit?',
      buscavaPh: 'Esim.: sarjan hinta, Garmin-yhteensopivuus, toimitusaika…',
      sugestao: 'Mitä puuttui tai ehdotus (valinnainen)',
      sugestaoPh: 'Esim.: asennusvideo, mallivertailu, kansainvälinen toimitus…',
      email: 'Sähköpostisi (valinnainen)',
      emailPh: 'Vain jos haluat vastauksen',
      send: 'Lähetä',
      sending: 'Lähetetään…',
      close: 'Sulje',
      thanks: 'Kiitos! Palautteesi auttaa meitä parantamaan sivustoa.',
      err: 'Lähetys epäonnistui. Yritä uudelleen tai kirjoita support@sensortattoofix.com.',
      errShort: 'Kuvaile, mitä etsit (vähintään 8 merkkiä).'
    }
  };

  function lang() {
    if (window.STF_PAGE_LANG?.get) return window.STF_PAGE_LANG.get();
    const htmlLang = String(document.documentElement.lang || '').toLowerCase();
    if (htmlLang.startsWith('it') || location.pathname.includes('/it/')) return 'it';
    if (htmlLang.startsWith('de') || location.pathname.includes('/de/')) return 'de';
    if (htmlLang.startsWith('es') || location.pathname.includes('/es/')) return 'es';
    if (htmlLang.startsWith('pl') || location.pathname.includes('/pl/')) return 'pl';
    if (htmlLang.startsWith('sl') || location.pathname.includes('/sl/')) return 'sl';
    if (htmlLang.startsWith('fr') || location.pathname.includes('/fr/')) return 'fr';
    if (htmlLang.startsWith('nl') || location.pathname.includes('/nl/')) return 'nl';
    if (htmlLang.startsWith('sv') || location.pathname.includes('/sv/')) return 'sv';
    if (htmlLang.startsWith('no') || htmlLang.startsWith('nb') || location.pathname.includes('/no/')) return 'no';
    if (htmlLang.startsWith('fi') || location.pathname.includes('/fi/')) return 'fi';
    if (
      htmlLang.startsWith('en') ||
      location.pathname.includes('/en/') ||
      window.STF_SITE?.isIntlHost?.() ||
      /\.sensortattoofix\.com$/i.test(location.hostname)
    ) {
      return 'en';
    }
    return 'pt';
  }

  function t(key) {
    const code = lang();
    return (I18N[code] || I18N.pt)[key] || key;
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
