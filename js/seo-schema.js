(function () {
  const SITE = 'https://sensortattoofix.com.br';
  const isEn = document.documentElement.lang?.toLowerCase().startsWith('en');
  const pageUrl = isEn ? SITE + '/en/' : SITE + '/';

  function faqFromDom() {
    return [...document.querySelectorAll('.faq-item')].map((el) => {
      const name = el.querySelector('summary')?.textContent?.trim();
      const text = el.querySelector('p')?.textContent?.trim();
      if (!name || !text) return null;
      return {
        '@type': 'Question',
        name,
        acceptedAnswer: { '@type': 'Answer', text }
      };
    }).filter(Boolean);
  }

  function inject(graph) {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph });
    document.head.appendChild(script);
  }

  document.addEventListener('DOMContentLoaded', () => {
    const graph = [
      {
        '@type': 'Organization',
        '@id': SITE + '/#organization',
        name: 'Sensor Tattoo Fix',
        legalName: '3N20 Soluções Tecnológicas',
        url: SITE,
        logo: SITE + '/logo.jpg',
        sameAs: [
          'https://www.instagram.com/sensortattoofix',
          'https://www.tiktok.com/@sensortattoofixofc',
          'https://youtube.com/@sensortattoofix-ofc',
          'https://www.facebook.com/profile.php?id=61588858629597'
        ]
      },
      {
        '@type': 'WebSite',
        '@id': SITE + '/#website',
        url: SITE,
        name: 'Sensor Tattoo Fix',
        inLanguage: isEn ? 'en' : 'pt-BR',
        publisher: { '@id': SITE + '/#organization' }
      },
      {
        '@type': 'WebPage',
        '@id': pageUrl + '#webpage',
        url: pageUrl,
        name: document.title,
        description: document.querySelector('meta[name="description"]')?.content || '',
        isPartOf: { '@id': SITE + '/#website' },
        inLanguage: isEn ? 'en' : 'pt-BR'
      },
      {
        '@type': 'Product',
        '@id': SITE + '/#product',
        name: 'Kit Sensor Tattoo Fix',
        description: isEn
          ? 'Optical lens kit that restores smartwatch sensors on tattooed skin — wrist detection, heart rate and workouts.'
          : 'Kit com lente ótica que restaura sensores de smartwatch em pele tatuada — pulso, batimentos e treinos.',
        brand: { '@type': 'Brand', name: 'Sensor Tattoo Fix' },
        image: SITE + '/sensortattoofix.jpg',
        offers: {
          '@type': 'Offer',
          url: SITE + '/loja.html',
          priceCurrency: 'BRL',
          price: '59.90',
          availability: 'https://schema.org/InStock'
        }
      }
    ];

    const faq = faqFromDom();
    if (faq.length) {
      graph.push({
        '@type': 'FAQPage',
        '@id': pageUrl + '#faq',
        mainEntity: faq
      });
    }

    inject(graph);
  });
})();
