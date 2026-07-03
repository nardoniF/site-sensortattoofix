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
    { href: 'https://www.instagram.com/sensortattoofix', icon: 'fab fa-instagram', label: 'Instagram' },
    { href: 'https://www.tiktok.com/@sensortattoofixofc', icon: 'fab fa-tiktok', label: 'TikTok' },
    { href: 'https://youtube.com/@sensortattoofix-ofc?si=_h4gAZXia1fZP_U1', icon: 'fab fa-youtube', label: 'YouTube' },
    { href: 'https://www.facebook.com/profile.php?id=61588858629597', icon: 'fab fa-facebook', label: 'Facebook' }
  ];

  const I18N = {
    pt: {
      socialTitle: 'Siga nossas redes oficiais',
      faq: 'FAQ',
      feedback: 'O que faltou no site?',
      patentLinePrefix: 'Patente Nacional',
      patentLineJoin: 'Internacional',
      rights: 'Todos os direitos reservados.'
    },
    en: {
      socialTitle: 'Follow our official channels',
      faq: 'FAQ',
      feedback: 'What was missing?',
      patentLinePrefix: 'National Patent',
      patentLineJoin: 'International',
      rights: 'All rights reserved.'
    },
    it: {
      socialTitle: 'Segui i nostri canali ufficiali',
      faq: 'FAQ',
      feedback: 'Cosa mancava sul sito?',
      patentLinePrefix: 'Brevetto nazionale',
      patentLineJoin: 'Internazionale',
      rights: 'Tutti i diritti riservati.'
    }
  };

  function t(lang) {
    if (lang === 'it') return I18N.it;
    if (lang === 'en') return I18N.en;
    return I18N.pt;
  }

  function detectLang() {
    if (location.pathname.includes('/it/')) return 'it';
    if (location.pathname.includes('/en/')) return 'en';
    return 'pt';
  }

  function prefixFrom(el) {
    if (el.dataset.prefix) return el.dataset.prefix;
    return location.pathname.includes('/en/') || location.pathname.includes('/it/') ? '../' : '';
  }

  function patentLine(lang) {
    const s = t(lang);
    return `${s.patentLinePrefix} ${INFO.patentNational} / ${s.patentLineJoin} ${INFO.patentInternational}`;
  }

  function legalBlock(lang) {
    const s = t(lang);
    const year = new Date().getFullYear();
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
    const links = SOCIAL.map((item) => {
      const rotulo = `Footer ${item.label}${lang === 'en' ? ' EN' : lang === 'it' ? ' IT' : ''}`;
      return `<a href="${item.href}" target="_blank" rel="noopener" class="social-link" data-rotulo="${rotulo}"><i class="${item.icon}"></i> ${item.label}</a>`;
    }).join('');
    const faqHref = lang === 'en' ? '#faq' : '#faq';
    return `
      <div class="footer-social">
        <h4>${s.socialTitle}</h4>
        <div class="social-icons-footer">${links}</div>
        <div class="footer-faq-link"><a href="${faqHref}">${s.faq}</a></div>
        <div class="footer-feedback-link"><button type="button" class="stf-feedback-trigger">${s.feedback}</button></div>
      </div>
    `;
  }

  function render(el) {
    const mode = el.dataset.siteFooter || 'compact';
    const lang = el.dataset.lang || detectLang();
    const prefix = prefixFrom(el);
    const social = mode === 'full' ? socialBlock(lang, prefix) : '';
    el.innerHTML = social + legalBlock(lang);
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-site-footer]').forEach(render);
    document.querySelectorAll('.stf-feedback-trigger').forEach((btn) => {
      btn.addEventListener('click', () => window.STF_FEEDBACK?.open?.());
    });
  });

  return { INFO, render };
})();
