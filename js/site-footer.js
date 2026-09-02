window.STF_FOOTER = (function () {
  const INFO = {
    brandPlain: 'Sensor Tattoo Fix',
    brandTitle: 'Sensor <span class="logo-accent">Tattoo Fix</span>',
    company: '3N20 Soluções Tecnológicas',
    cnpj: '29.321.223/0001-32',
    patentNational: 'BR 20 2026 010875 3',
    patentInternational: 'PCT BR 2026 050304',
    city: 'São Paulo, SP'
  };

  const SOCIAL = [
    { id: 'instagram', href: 'https://www.instagram.com/sensortattoofix', icon: 'fab fa-instagram', label: 'Instagram' },
    { id: 'tiktok', href: 'https://www.tiktok.com/@sensortattoofixofc', icon: 'fab fa-tiktok', label: 'TikTok' },
    { id: 'youtube', href: 'https://www.youtube.com/@Sensortattoofix-ofc', icon: 'fab fa-youtube', label: 'YouTube' },
    { id: 'facebook', href: 'https://www.facebook.com/profile.php?id=61588858629597', icon: 'fab fa-facebook', label: 'Facebook' }
  ];

  const I18N = {
    pt: {
      socialTitle: 'Siga nossas redes oficiais',
      faq: 'FAQ',
      community: 'Comunidade',
      feedback: 'O que faltou no site?',
      commissioner: 'Seja comissionado',
      patentLinePrefix: 'Patente Nacional',
      patentLineJoin: 'Internacional',
      rights: 'Todos os direitos reservados.'
    },
    en: {
      socialTitle: 'Follow our official channels',
      faq: 'FAQ',
      community: 'Community',
      feedback: 'What was missing?',
      commissioner: 'Become an affiliate',
      patentLinePrefix: 'National Patent',
      patentLineJoin: 'International',
      rights: 'All rights reserved.'
    },
    it: {
      socialTitle: 'Segui i nostri canali ufficiali',
      faq: 'FAQ',
      community: 'Comunità',
      feedback: 'Cosa mancava sul sito?',
      commissioner: 'Diventa affiliato',
      patentLinePrefix: 'Brevetto nazionale',
      patentLineJoin: 'Internazionale',
      rights: 'Tutti i diritti riservati.'
    },
    de: {
      socialTitle: 'Folgen Sie unseren offiziellen Kanälen',
      faq: 'FAQ',
      community: 'Community',
      feedback: 'Was hat auf der Website gefehlt?',
      commissioner: 'Partner werden',
      patentLinePrefix: 'Nationales Patent',
      patentLineJoin: 'International',
      rights: 'Alle Rechte vorbehalten.'
    },
    es: {
      socialTitle: 'Sigue nuestras redes oficiales',
      faq: 'FAQ',
      community: 'Comunidad',
      feedback: '¿Qué faltaba en el sitio?',
      commissioner: 'Sé afiliado',
      patentLinePrefix: 'Patente nacional',
      patentLineJoin: 'Internacional',
      rights: 'Todos los derechos reservados.'
    },
    pl: {
      socialTitle: 'Obserwuj nasze oficjalne kanały',
      faq: 'FAQ',
      community: 'Społeczność',
      feedback: 'Czego brakowało na stronie?',
      commissioner: 'Zostań partnerem',
      patentLinePrefix: 'Patent krajowy',
      patentLineJoin: 'Międzynarodowy',
      rights: 'Wszelkie prawa zastrzeżone.'
    },
    sl: {
      socialTitle: 'Sledite našim uradnim kanalom',
      faq: 'FAQ',
      community: 'Skupnost',
      feedback: 'Kaj je manjkalo na spletni strani?',
      commissioner: 'Postanite partner',
      patentLinePrefix: 'Nacionalni patent',
      patentLineJoin: 'Mednarodni',
      rights: 'Vse pravice pridržane.'
    }
  };

  function t(lang) {
    return I18N[lang] || I18N.pt;
  }

  function isIntlHost() {
    return !!(window.STF_SITE?.isIntlHost?.() || /\.sensortattoofix\.com$/i.test(location.hostname));
  }

  function detectLang() {
    if (window.STF_PAGE_LANG?.get) return window.STF_PAGE_LANG.get();
    if (window.STF_I18N?.getLang) return window.STF_I18N.getLang();
    if (isIntlHost()) {
      if (location.pathname.includes('/it/')) return 'it';
      if (location.pathname.includes('/de/')) return 'de';
      if (location.pathname.includes('/es/')) return 'es';
      if (location.pathname.includes('/pl/')) return 'pl';
      if (location.pathname.includes('/sl/')) return 'sl';
      return 'en';
    }
    if (location.pathname.includes('/it/')) return 'it';
    if (location.pathname.includes('/de/')) return 'de';
    if (location.pathname.includes('/es/')) return 'es';
    if (location.pathname.includes('/pl/')) return 'pl';
    if (location.pathname.includes('/sl/')) return 'sl';
    if (location.pathname.includes('/en/')) return 'en';
    return 'pt';
  }

  function prefixFrom(el) {
    if (el.dataset.prefix) return el.dataset.prefix;
    const lang = detectLang();
    if (isIntlHost() && lang === 'en') return '';
    if (lang !== 'pt') return '../';
    return '';
  }

  function socialEnabled(id) {
    if (window.STF_CHANNELS?.entryEnabled) {
      return window.STF_CHANNELS.entryEnabled('socials', id, window.CHECKOUT_CONFIG?.channels || null);
    }
    return true;
  }

  function socialHref(item) {
    const url = window.CHECKOUT_CONFIG?.channels?.socials?.[item.id]?.url;
    return (url && String(url).trim()) || item.href;
  }

  function patentLine(lang) {
    const s = t(lang);
    if (isIntlHost()) {
      const intl = {
        de: `Patentierte Technologie · ${INFO.patentInternational}`,
        es: `Tecnología patentada · ${INFO.patentInternational}`,
        pl: `Opatentowana technologia · ${INFO.patentInternational}`,
        sl: `Patentirana tehnologija · ${INFO.patentInternational}`,
        it: `Tecnologia brevettata · ${INFO.patentInternational}`,
        en: `Patented technology · ${INFO.patentInternational}`
      };
      return intl[lang] || intl.en;
    }
    return `${s.patentLinePrefix} ${INFO.patentNational} / ${s.patentLineJoin} ${INFO.patentInternational}`;
  }

  function legalBlock(lang) {
    const s = t(lang);
    const year = new Date().getFullYear();
    if (isIntlHost()) {
      return `
      <div class="footer-legal">
        <p class="footer-legal-brand">${INFO.brandTitle}</p>
        <p class="footer-legal-meta">3N20</p>
        <p class="footer-legal-meta footer-legal-meta--muted">${patentLine(lang)}</p>
        <p class="footer-legal-copy">&copy; ${year} ${INFO.brandPlain}. ${s.rights}</p>
      </div>
    `;
    }
    return `
      <div class="footer-legal">
        <p class="footer-legal-brand">${INFO.brandTitle}</p>
        <p class="footer-legal-meta">${INFO.company} · CNPJ ${INFO.cnpj}</p>
        <p class="footer-legal-meta footer-legal-meta--muted">${patentLine(lang)}</p>
        <p class="footer-legal-copy">&copy; ${year} ${INFO.brandPlain} · ${INFO.company}. ${s.rights}</p>
      </div>
    `;
  }

  function socialBlock(lang, prefix) {
    const s = t(lang);
    const enabled = SOCIAL.filter((item) => socialEnabled(item.id));
    if (!enabled.length) {
      return `
      <div class="footer-social">
        <div class="footer-faq-link"><a href="#faq">${s.faq}</a> · <a href="${prefix}comunidade.html"><i class="fas fa-comments" aria-hidden="true"></i> ${s.community}</a></div>
        <div class="footer-action-links">
          <button type="button" class="footer-action-btn footer-action-btn--feedback stf-feedback-trigger">
            <i class="fas fa-comment-dots" aria-hidden="true"></i>
            <span>${s.feedback}</span>
          </button>
          ${isIntlHost() ? '' : `
          <a class="footer-action-btn footer-action-btn--affiliate" href="${prefix}comissionado.html">
            <i class="fas fa-handshake" aria-hidden="true"></i>
            <span>${s.commissioner}</span>
          </a>`}
        </div>
      </div>
    `;
    }
    const links = enabled.map((item) => {
      const rotulo = `Footer ${item.label}${lang !== 'pt' ? ' ' + lang.toUpperCase() : ''}`;
      return `<a href="${socialHref(item)}" target="_blank" rel="noopener" class="social-link" data-channel="social:${item.id}" data-rotulo="${rotulo}"><i class="${item.icon}"></i> ${item.label}</a>`;
    }).join('');
    return `
      <div class="footer-social">
        <h4>${s.socialTitle}</h4>
        <div class="social-icons-footer">${links}</div>
        <div class="footer-faq-link"><a href="#faq">${s.faq}</a> · <a href="${prefix}comunidade.html"><i class="fas fa-comments" aria-hidden="true"></i> ${s.community}</a></div>
        <div class="footer-action-links">
          <button type="button" class="footer-action-btn footer-action-btn--feedback stf-feedback-trigger">
            <i class="fas fa-comment-dots" aria-hidden="true"></i>
            <span>${s.feedback}</span>
          </button>
          ${isIntlHost() ? '' : `
          <a class="footer-action-btn footer-action-btn--affiliate" href="${prefix}comissionado.html">
            <i class="fas fa-handshake" aria-hidden="true"></i>
            <span>${s.commissioner}</span>
          </a>`}
        </div>
      </div>
    `;
  }

  function render(el) {
    const mode = el.dataset.siteFooter || 'compact';
    const lang = detectLang();
    const prefix = prefixFrom(el);
    const social = mode === 'full' ? socialBlock(lang, prefix) : '';
    el.innerHTML = social + legalBlock(lang);
  }

  function refreshAll() {
    document.querySelectorAll('[data-site-footer]').forEach(render);
    document.querySelectorAll('.stf-feedback-trigger').forEach((btn) => {
      btn.addEventListener('click', () => window.STF_FEEDBACK?.open?.());
    });
  }

  document.addEventListener('DOMContentLoaded', refreshAll);
  window.addEventListener('stf-config-ready', refreshAll);

  return { render, refreshAll, INFO, SOCIAL };
})();
