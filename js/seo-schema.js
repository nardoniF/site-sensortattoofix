(function () {
  const SITE = 'https://www.sensortattoofix.com.br';
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

  function deliveryTime(minDays, maxDays) {
    return {
      '@type': 'ShippingDeliveryTime',
      handlingTime: {
        '@type': 'QuantitativeValue',
        minValue: 1,
        maxValue: 2,
        unitCode: 'DAY'
      },
      transitTime: {
        '@type': 'QuantitativeValue',
        minValue: minDays,
        maxValue: maxDays,
        unitCode: 'DAY'
      }
    };
  }

  function shippingDetailsBR() {
    return {
      '@type': 'OfferShippingDetails',
      shippingDestination: {
        '@type': 'DefinedRegion',
        addressCountry: 'BR'
      },
      shippingRate: {
        '@type': 'MonetaryAmount',
        value: '11.90',
        currency: 'BRL'
      },
      deliveryTime: deliveryTime(8, 14)
    };
  }

  function shippingDetailsInternational() {
    return {
      '@type': 'OfferShippingDetails',
      shippingDestination: {
        '@type': 'DefinedRegion',
        addressCountry: ['PT', 'US', 'ES', 'GB', 'DE', 'FR', 'IT', 'CA', 'AR', 'MX']
      },
      shippingRate: {
        '@type': 'MonetaryAmount',
        value: '27.55',
        currency: 'BRL'
      },
      deliveryTime: deliveryTime(10, 25)
    };
  }

  function merchantReturnPolicy() {
    return {
      '@type': 'MerchantReturnPolicy',
      applicableCountry: 'BR',
      returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
      merchantReturnDays: 7,
      returnMethod: 'https://schema.org/ReturnByMail',
      returnFees: 'https://schema.org/ReturnShippingFees',
      returnPolicyUrl: SITE + '/index.html#faq'
    };
  }

  function buildOffer(productPrice, productId) {
    const yearEnd = `${new Date().getFullYear()}-12-31`;
    return {
      '@type': 'Offer',
      url: SITE + '/comprar.html',
      priceCurrency: 'BRL',
      price: Number(productPrice).toFixed(2),
      priceValidUntil: yearEnd,
      availability: 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@id': SITE + '/#organization' },
      shippingDetails: [shippingDetailsBR(), shippingDetailsInternational()],
      hasMerchantReturnPolicy: merchantReturnPolicy(),
      sku: productId || 'kit-sensor-tattoofix'
    };
  }

  function inject(graph) {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph });
    document.head.appendChild(script);
  }

  document.addEventListener('DOMContentLoaded', async () => {
    let productName = 'Kit Sensor Tattoo Fix';
    let productPrice = 59.9;
    let productImage = SITE + '/sensortattoofix.jpg';
    let productId = 'kit-sensor-tattoofix';
    let productDescription = isEn
      ? 'Optical lens kit that restores smartwatch sensors on tattooed skin — wrist detection, heart rate and workouts.'
      : 'Kit com lente ótica que restaura sensores de smartwatch em pele tatuada — pulso, batimentos e treinos.';

    if (window.StoreConfig) {
      try {
        const cfg = await StoreConfig.load();
        const p = window.STF_STORE_PRICE?.primaryProduct(cfg) || cfg.product;
        if (p?.name) productName = p.name;
        if (p?.price != null) productPrice = Number(p.price);
        if (p?.image) productImage = p.image.startsWith('http') ? p.image : SITE + '/' + p.image.replace(/^\//, '');
        if (p?.id) productId = p.id;
        if (p?.description) productDescription = p.description;
      } catch (e) {
        console.warn('Schema: config indisponível.', e);
      }
    }

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
          'https://youtube.com/@sensortattoofixofc',
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
        name: productName,
        description: productDescription,
        sku: productId,
        brand: { '@type': 'Brand', name: 'Sensor Tattoo Fix' },
        image: productImage,
        offers: buildOffer(productPrice, productId)
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
