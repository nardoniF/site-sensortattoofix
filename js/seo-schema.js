(function () {
  const isIntlHost = !!(window.STF_SITE?.isIntlHost?.() || /\.sensortattoofix\.com$/i.test(location.hostname));
  const SITE = isIntlHost ? 'https://www.sensortattoofix.com' : 'https://www.sensortattoofix.com.br';
  const pathLang = (() => {
    const p = location.pathname;
    if (/\/it\//i.test(p)) return 'it';
    if (/\/de\//i.test(p)) return 'de';
    if (/\/es\//i.test(p)) return 'es';
    if (/\/pl\//i.test(p)) return 'pl';
    if (/\/sl\//i.test(p)) return 'sl';
    if (/\/en\//i.test(p)) return 'en';
    if (isIntlHost) return 'en';
    return 'pt';
  })();
  const isIt = pathLang === 'it';
  const isDe = pathLang === 'de';
  const isEs = pathLang === 'es';
  const isPl = pathLang === 'pl';
  const isSl = pathLang === 'sl';
  const isEn = pathLang === 'en';
  const isIntlCopy = isEn || isIt || isDe || isEs || isPl || isSl;
  const langPrefix = isIt ? '/it/' : isDe ? '/de/' : isEs ? '/es/' : isPl ? '/pl/' : isSl ? '/sl/' : isEn ? '/en/' : '/';
  const pageUrl = isIntlHost
    ? (pathLang === 'en' ? SITE + '/' : SITE + langPrefix)
    : (pathLang === 'pt' ? SITE + '/' : SITE + langPrefix);
  const inLanguage = isIt ? 'it' : isDe ? 'de' : isEs ? 'es' : isPl ? 'pl' : isSl ? 'sl' : isEn ? 'en' : 'pt-BR';

  /** Fallback if DOM/config still empty when Googlebot runs (real customer quotes). */
  const FALLBACK_REVIEWS = {
    pt: [
      { author: 'Caroline Moreira', body: 'Produto excelente! Qualidade impecável, fácil aplicação e resultado surpreendente.', rating: 5 },
      { author: 'MANOEL Ricardo', body: 'Produto top, resolveu meu problema!', rating: 5 },
      { author: 'Cliente', body: 'Achei no TikTok, comprei, e está funcionando perfeitamente. Muito obrigado!', rating: 5 }
    ],
    en: [
      { author: 'Caroline Moreira', body: 'Excellent product! Impeccable quality, easy to apply and amazing results.', rating: 5 },
      { author: 'MANOEL Ricardo', body: 'Top product, it solved my problem!', rating: 5 },
      { author: 'Customer', body: "I found you on TikTok, bought it, and it's working perfectly. Thank you!", rating: 5 }
    ]
  };

  function pickReviewField(row, field) {
    if (!row) return '';
    const fromI18n = row.i18n?.[pathLang]?.[field];
    if (fromI18n) return String(fromI18n);
    const suffix = { en: 'En', it: 'It', de: 'De', es: 'Es', pl: 'Pl', sl: 'Sl' }[pathLang];
    if (suffix && row[field + suffix]) return String(row[field + suffix]);
    if (isIntlCopy && row[field + 'En']) return String(row[field + 'En']);
    return String(row[field] || '');
  }

  function toSchemaReview(author, body, rating) {
    if (!author || !body) return null;
    return {
      '@type': 'Review',
      author: { '@type': 'Person', name: author },
      reviewRating: {
        '@type': 'Rating',
        ratingValue: String(rating || 5),
        bestRating: '5'
      },
      reviewBody: body
    };
  }

  function reviewsFromDom() {
    const section = document.querySelector('.reviews-section');
    if (!section) return { reviews: [], aggregateRating: null, ratingValue: 5, reviewCount: 0 };

    const reviews = [...section.querySelectorAll('.review-card')].map((card) => {
      const author = card.querySelector('[data-review-author]')?.textContent?.trim()
        || card.querySelector('.review-author')?.textContent?.trim();
      const body = card.querySelector('[data-review-body]')?.textContent?.trim()
        || card.querySelector('.review-body')?.textContent?.trim();
      const rating = Number(card.getAttribute('data-review-rating') || card.dataset.reviewRating || 5);
      return toSchemaReview(author, body, rating);
    }).filter(Boolean);

    const ratingValue = Number(section.getAttribute('data-aggregate-rating') || 5);
    const reviewCount = Number(section.getAttribute('data-review-count') || reviews.length);
    return { reviews, ratingValue, reviewCount };
  }

  function reviewsFromConfig(cfg) {
    const rows = (cfg?.homeReviews || [])
      .filter((r) => r && r.active !== false)
      .slice()
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    const reviews = rows.map((row) => toSchemaReview(
      pickReviewField(row, 'author'),
      pickReviewField(row, 'body'),
      Number(row.rating) || 5
    )).filter(Boolean);
    const ratingValue = reviews.length
      ? Math.round((reviews.reduce((s, r) => s + Number(r.reviewRating.ratingValue || 5), 0) / reviews.length) * 10) / 10
      : 5;
    return { reviews, ratingValue, reviewCount: reviews.length };
  }

  function resolveReviews(cfg) {
    const fromDom = reviewsFromDom();
    if (fromDom.reviews.length) {
      return {
        reviews: fromDom.reviews,
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: String(fromDom.ratingValue || 5),
          reviewCount: String(Math.max(fromDom.reviewCount, fromDom.reviews.length)),
          bestRating: '5'
        }
      };
    }
    const fromCfg = reviewsFromConfig(cfg);
    if (fromCfg.reviews.length) {
      return {
        reviews: fromCfg.reviews.slice(0, 12),
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: String(fromCfg.ratingValue || 5),
          reviewCount: String(fromCfg.reviewCount),
          bestRating: '5'
        }
      };
    }
    const fallback = (isIntlCopy ? FALLBACK_REVIEWS.en : FALLBACK_REVIEWS.pt)
      .map((r) => toSchemaReview(r.author, r.body, r.rating))
      .filter(Boolean);
    return {
      reviews: fallback,
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '5',
        reviewCount: String(fallback.length),
        bestRating: '5'
      }
    };
  }

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
        addressCountry: ['PT', 'US', 'ES', 'GB', 'DE', 'FR', 'IT', 'CA', 'AR', 'MX', 'SI', 'PL']
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
    const year = new Date().getFullYear();
    return {
      '@type': 'MerchantReturnPolicy',
      applicableCountry: isIntlHost ? ['US', 'GB', 'DE', 'ES', 'IT', 'FR', 'PT', 'PL', 'SI', 'CA'] : 'BR',
      returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
      merchantReturnDays: 7,
      returnMethod: 'https://schema.org/ReturnByMail',
      returnFees: 'https://schema.org/ReturnShippingFees',
      returnShippingFeesAmount: {
        '@type': 'MonetaryAmount',
        value: isIntlHost ? '8.00' : '15.00',
        currency: isIntlHost ? 'USD' : 'BRL'
      },
      returnPolicyUrl: pageUrl.replace(/\/$/, '/') + '#faq'
    };
  }

  function buildOffer(productPrice, productId) {
    const year = new Date().getFullYear();
    const validFrom = `${year}-01-01`;
    const priceValidUntil = `${year}-12-31`;
    return {
      '@type': 'Offer',
      url: isIntlHost
        ? (pathLang === 'en' ? SITE + '/comprar.html' : SITE + langPrefix + 'comprar.html')
        : SITE + '/comprar.html',
      priceCurrency: 'BRL',
      price: Number(productPrice).toFixed(2),
      validFrom,
      priceValidUntil,
      availability: 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@id': SITE + '/#organization' },
      shippingDetails: isIntlHost
        ? [shippingDetailsInternational()]
        : [shippingDetailsBR(), shippingDetailsInternational()],
      hasMerchantReturnPolicy: merchantReturnPolicy(),
      sku: productId || 'kit-sensor-tattoofix'
    };
  }

  function inject(graph) {
    const prev = document.getElementById('stf-seo-schema');
    if (prev) prev.remove();
    const script = document.createElement('script');
    script.id = 'stf-seo-schema';
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph });
    document.head.appendChild(script);
  }

  async function run() {
    let productName = isIt ? 'Lente ottica SensorTattooFix'
      : isIntlCopy ? 'SensorTattooFix Optical Lens'
        : 'Kit Sensor Tattoo Fix';
    let productPrice = 62.9;
    let productImage = SITE + '/images/brand/sensortattoofix.jpg';
    let productId = isIntlCopy ? 'optical-lens-intl' : 'kit-sensor-tattoofix';
    let productDescription = isIt
      ? 'Kit con lente ottica per smartwatch che chiede codice, non misura il battito o interrompe l\'allenamento — spesso per tatuaggio al polso. Ripristina rilevamento al polso, frequenza cardiaca e allenamenti.'
      : isIntlCopy
        ? 'Optical lens kit for smartwatch passcode loops, heart rate failures and paused workouts — often caused by wrist tattoo ink. Restores wrist detection, heart rate and training.'
        : 'Kit com lente ótica para smartwatch que pede senha, não mede batimentos ou pausa treino — muitas vezes por tatuagem no pulso. Restaura pulso, batimentos e treinos.';

    let cfg = null;
    if (window.CHECKOUT_CONFIG) cfg = window.CHECKOUT_CONFIG;
    if (window.StoreConfig) {
      try {
        cfg = await StoreConfig.load();
        const p = window.STF_STORE_PRICE?.primaryProduct(cfg) || cfg.product;
        if (p) {
          productName = window.STF_PELICULA?.productLabel?.(p)
            || (isIt ? (p.nameIt || p.nameEn) : isIntlCopy ? (p.nameEn || p.name) : null)
            || p.name
            || productName;
          productDescription = window.STF_PELICULA?.productDescription?.(p)
            || (isIt ? (p.descriptionIt || p.descriptionEn) : isIntlCopy ? (p.descriptionEn || p.description) : null)
            || (isIntlCopy ? productDescription : p.description)
            || productDescription;
          if (p.price != null) productPrice = Number(p.price);
          if (p.image) productImage = p.image.startsWith('http') ? p.image : SITE + '/' + p.image.replace(/^\//, '');
          if (p.id) productId = p.id;
        }
      } catch (e) {
        console.warn('Schema: config unavailable.', e);
      }
    }

    const { reviews, aggregateRating } = resolveReviews(cfg);

    const productNode = {
      '@type': 'Product',
      '@id': SITE + '/#product',
      name: productName,
      description: productDescription,
      sku: productId,
      brand: { '@type': 'Brand', name: 'Sensor Tattoo Fix' },
      image: productImage,
      offers: buildOffer(productPrice, productId),
      aggregateRating,
      review: reviews
    };

    const graph = [
      {
        '@type': 'Organization',
        '@id': SITE + '/#organization',
        name: 'Sensor Tattoo Fix',
        legalName: '3N20 Soluções Tecnológicas',
        url: SITE,
        logo: SITE + '/images/brand/logo.jpg',
        sameAs: [
          'https://www.instagram.com/sensortattoofix',
          'https://www.tiktok.com/@sensortattoofixofc',
          'https://www.youtube.com/@Sensortattoofix-ofc',
          'https://www.facebook.com/profile.php?id=61588858629597'
        ]
      },
      {
        '@type': 'WebSite',
        '@id': SITE + '/#website',
        url: SITE,
        name: 'Sensor Tattoo Fix',
        inLanguage,
        publisher: { '@id': SITE + '/#organization' }
      },
      {
        '@type': 'WebPage',
        '@id': pageUrl + '#webpage',
        url: pageUrl,
        name: document.title,
        description: document.querySelector('meta[name="description"]')?.content || '',
        isPartOf: { '@id': SITE + '/#website' },
        inLanguage
      },
      productNode
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
  }

  if (document.getElementById('home-faq-root') || document.getElementById('home-reviews-root')) {
    document.addEventListener('stf-home-content-ready', run);
    // Fallback if home-content never fires (slow/blocked) — still emit Product with reviews
    setTimeout(() => {
      if (!document.getElementById('stf-seo-schema')) run();
    }, 2500);
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
