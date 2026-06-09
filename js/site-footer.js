window.STF_FOOTER = (function () {
  const INFO = {
    brandPlain: 'Sensor Tattoo Fix',
    brandTitle: 'Sensor <span class="logo-accent">Tattoo Fix</span>',
    company: '3N20 Soluções Tecnológicas',
    cnpj: '29.321.223/0001-32',
    patent: 'BR 20 2026 010875 3',
    email: 'sensortattoofix@gmail.com',
    whatsapp: '5511913394665',
    whatsappLabel: '(11) 91339-4665',
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
      patentLabel: 'Patente requerida',
      rights: 'Todos os direitos reservados.'
    },
    en: {
      socialTitle: 'Follow our official channels',
      faq: 'FAQ',
      patentLabel: 'Patent pending',
      rights: 'All rights reserved.'
    }
  };

  function t(lang) {
    return I18N[lang === 'en' ? 'en' : 'pt'];
  }

  function prefixFrom(el) {
    if (el.dataset.prefix) return el.dataset.prefix;
    return location.pathname.includes('/en/') ? '../' : '';
  }

  function legalBlock(lang) {
    const s = t(lang);
    const year = new Date().getFullYear();
    return `
      <div class="footer-legal">
        <p class="footer-legal-brand">${INFO.brandTitle}</p>
        <p class="footer-legal-meta">${INFO.company} · CNPJ ${INFO.cnpj}</p>
        <p class="footer-legal-meta footer-legal-meta--muted">${s.patentLabel} ${INFO.patent}</p>
        <p class="footer-legal-copy">&copy; ${year} ${INFO.brandPlain} · ${INFO.company}. ${s.rights}</p>
      </div>
    `;
  }

  function socialBlock(lang, prefix) {
    const s = t(lang);
    const links = SOCIAL.map((item) =>
      `<a href="${item.href}" target="_blank" rel="noopener" class="social-link"><i class="${item.icon}"></i> ${item.label}</a>`
    ).join('');
    const faqHref = lang === 'en' ? '#faq' : '#faq';
    return `
      <div class="footer-social">
        <h4>${s.socialTitle}</h4>
        <div class="social-icons-footer">${links}</div>
        <div class="footer-faq-link"><a href="${faqHref}">${s.faq}</a></div>
      </div>
    `;
  }

  function render(el) {
    const mode = el.dataset.siteFooter || 'compact';
    const lang = el.dataset.lang || (location.pathname.includes('/en/') ? 'en' : 'pt');
    const prefix = prefixFrom(el);
    const social = mode === 'full' ? socialBlock(lang, prefix) : '';
    el.innerHTML = social + legalBlock(lang);
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-site-footer]').forEach(render);
  });

  return { INFO, render };
})();
