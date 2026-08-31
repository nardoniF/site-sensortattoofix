/**
 * API Sensor Tattoo Fix — Cloudflare Worker
 * PIX (Mercado Pago) + Cartão (Asaas) + PayPal (intl) · WhatsApp · Correios · Uber Direct · Pedidos
 */

import { generateCommissionerStoryBanners } from './commissioner-banners.js';
import { handleForumRoute } from './forum.js';
import {
  bumpKvWriteCounter,
  buildKvDailyWriteBudget,
  buildD1DailyBudget,
  isKvQuotaError,
  isKvWriteQuotaExhaustedMarked,
  markKvWriteQuotaExhausted
} from './kv-meter.js';
import {
  d1SaveOrder,
  d1GetOrder,
  d1ListOrders,
  d1DeleteOrder,
  d1OrdersForUser,
  d1OrderIdByTracking,
  d1SaveSale,
  d1GetSale,
  d1ListSaleIds,
  d1ListSales,
  d1CountSales,
  d1GetAppKv,
  d1PutAppKv
} from './d1-store.js';
import {
  ML_SETTLEMENT_VERSION,
  mlMoney,
  enviosSellerCost,
  flexSellerCost,
  mlFlexBonusFromCosts,
  impliedEnviosFromReceipt,
  receiptPayout,
  repairEnviosAlreadyNet,
  mlShippingResolved
} from './ml-settlement.js';
import {
  shopeeOrderIncome,
  shopeeReceiptFromEscrow
} from './shopee-settlement.js';
import {
  summarizeAmzFinancialEvents,
  amzRound2
} from './amazon-settlement.js';
import {
  CLICKS_CLOSED_MONTHS,
  clicksRetentionWindow,
  spYmd,
  spMidnightUtcMs
} from './clicks-retention.js';
import {
  COMMISSIONER_COMMISSION_PERCENT,
  COMMISSIONER_DISCOUNT_PERCENT,
  RESERVED_COUPON_CODES,
  calcMotoboyPrice,
  commissionerAttachmentLabel,
  computeCouponCommission,
  computeCouponDiscount,
  correiosOfficialTrackingUrl,
  correiosTrackingUrl,
  findActiveCoupon,
  getCoupons,
  haversineKm,
  isCorreiosImportOnlyServiceCode,
  isIntlDocumentShipment,
  isMotoboyMethod,
  isMotoboyOrder,
  isParticularDeliveryOrder,
  isSuperfreteMethod,
  isSuperfreteOrder,
  isUberMethod,
  isUberOrder,
  normalizeCouponCode,
  slugCouponId
} from './store-rules.js';
import {
  applyOrderFreteAccounting,
  orderNeedsFreteProductRepair
} from './sales-money.js';

const ALLOWED_ORIGINS = [
  'https://sensortattoofix.com.br',
  'https://www.sensortattoofix.com.br',
  'https://sensortattoofix.com',
  'https://www.sensortattoofix.com',
  'https://api.sensortattoofix.com.br',
  'http://localhost:8080',
  'http://127.0.0.1:5500'
];
const CONFIG_KEY = 'store-config';
/** Pin igual ao cloudflare/stf-com-proxy.js — catálogo GitHub servido direto ao Worker (evita cache do proxy). */
const SITE_CATALOG_COMMIT = '71b5cdb39d00a3d94451336822bd6a15e3f1652f';
const SITE_CATALOG_URLS = [
  'https://cdn.jsdelivr.net/gh/nardoniF/site-sensortattoofix@' + SITE_CATALOG_COMMIT + '/data/store-config.json',
  'https://raw.githubusercontent.com/nardoniF/site-sensortattoofix/' + SITE_CATALOG_COMMIT + '/data/store-config.json',
  'https://www.sensortattoofix.com.br/data/store-config.json'
];
const ORDERS_INDEX = 'orders:index';
const CLICKS_INDEX = 'clicks:index';
const CLICKS_BLOB = 'clicks:blob';
/** Safety ceiling if traffic spikes (~250/day × ~200d). Primary trim is calendar months. */
const CLICKS_MAX = 50000;
/** Tree in Admin: recent visits only (full JSON). Charts use slim series for the retention window. */
const CLICKS_TREE_MAX = 4000;
/** Rolling window: 5 closed months + current (= 6 months). Oldest closed month drops when a new month starts. */
const FEEDBACK_BLOB = 'feedback:blob';
const FEEDBACK_MAX = 500;
const CLICK_TTL_SEC = 120 * 86400;
const CLICK_LOG_KEY_FALLBACK = 'stf_ck_7f3a9e2b1c';
const LEGACY_API_BASE = 'https://sensortattoofix-payments.sensortattoofix.workers.dev';
const CANONICAL_API_BASE = 'https://api.sensortattoofix.com.br';
const CUSTOMER_SESSION_TTL = 2592000; // 30 dias

const DEFAULT_CONFIG = {
  product: {
    name: 'Kit Sensor Tattoo Fix',
    nameEn: 'Sensor Tattoo Fix Lens',
    nameIt: 'Lente Sensor Tattoo Fix',
    description: 'Lente ótica para smartwatch em pele tatuada — kit completo',
    descriptionEn: 'Optical lens for smartwatches on tattooed skin',
    descriptionIt: 'Lente ottica per smartwatch su pelle tatuata',
    price: 62.9,
    image: 'https://www.sensortattoofix.com.br/images/brand/sensortattoofix.jpg'
  },
  products: [
    {
      id: 'kit-sensor-tattoofix',
      slug: 'kit-sensor-tattoofix',
      name: 'Kit Sensor Tattoo Fix',
      nameEn: 'SensorTattooFix Optical Lens',
      nameIt: 'Lente ottica SensorTattooFix',
      description: 'Lente ótica para smartwatch em pele tatuada — kit completo',
      descriptionEn: 'Designed for smartwatch optical sensors on tattooed skin.',
      descriptionIt: 'Progettata per i sensori ottici degli smartwatch su pelle tatuata.',
      price: 62.9,
      image: 'https://www.sensortattoofix.com.br/images/brand/sensortattoofix.jpg',
      active: true,
      requiresSmartwatch: true,
      deviceType: 'smartwatch',
      weightGrams: 3,
      markets: ['BR']
    },
    {
      id: 'kit-smartband-tattoofix',
      slug: 'kit-smartband-tattoofix',
      name: 'Kit Smartband Tattoo Friendly',
      nameEn: 'Kit Smartband Tattoo Friendly',
      nameIt: 'Kit Smartband Tattoo Friendly',
      deviceType: 'smartband',
      description: 'Lente ótica para smartband em pele tatuada — kit completo',
      descriptionEn: 'Optical lens for smartbands on tattooed skin — full kit',
      descriptionIt: 'Lente ottica per smartband su pelle tatuata — kit completo',
      price: 62.9,
      image: '/images/smartband/kit-br/01-embalagem.jpg',
      images: [
        '/images/smartband/kit-br/01-embalagem.jpg',
        '/images/smartband/kit-br/02-conteudo.jpg',
        '/images/smartband/kit-br/03-aplicacao.jpg',
        '/images/smartband/kit-br/04-antes-depois.jpg',
        '/images/smartband/kit-br/05-lente.jpg'
      ],
      active: true,
      requiresSmartwatch: true,
      weightGrams: 3,
      sensorMm: 25,
      markets: ['BR']
    },
    {
      id: 'optical-lens-smartband-intl',
      slug: 'optical-lens-smartband-intl',
      name: 'SensorTattooFix Smartband Lens',
      nameEn: 'SensorTattooFix Smartband Lens',
      nameIt: 'Lente Smartband SensorTattooFix',
      deviceType: 'smartband',
      description: 'Lente de correção óptica para smartband em pele tatuada.',
      descriptionEn: 'Designed for smartband optical sensors on tattooed skin.',
      descriptionIt: 'Progettata per i sensori ottici degli smartband su pelle tatuata.',
      price: 62.9,
      priceUsd: 12.99,
      priceEur: 11.99,
      image: '/images/smartband/lens-en/01-embalagem.jpg',
      images: [
        '/images/smartband/lens-en/01-embalagem.jpg',
        '/images/smartband/lens-en/02-conteudo.jpg',
        '/images/smartband/lens-en/03-aplicacao.jpg',
        '/images/smartband/lens-en/04-antes-depois.jpg'
      ],
      active: true,
      requiresSmartwatch: true,
      weightGrams: 3,
      sensorMm: 25,
      markets: ['INT'],
      aggregated: false
    },
    {
      id: 'optical-lens-intl',
      slug: 'optical-lens-intl',
      name: 'SensorTattooFix Optical Lens',
      nameEn: 'SensorTattooFix Optical Lens',
      nameIt: 'Lente ottica SensorTattooFix',
      description: 'Lente de correção óptica para smartwatch em pele tatuada.',
      descriptionEn: 'Designed for smartwatch optical sensors on tattooed skin.',
      descriptionIt: 'Progettata per i sensori ottici degli smartwatch su pelle tatuata.',
      price: 62.9,
      image: '/images/lens-gallery/01-optical-correction-lens.png',
      images: [
        '/images/lens-gallery/01-optical-correction-lens.png',
        '/images/lens-gallery/02-ultra-thin.png',
        '/images/lens-gallery/03-high-optical-transparency.png',
        '/images/lens-gallery/04-engineered-refraction.png',
        '/images/lens-gallery/05-whats-included.png'
      ],
      active: true,
      requiresSmartwatch: true,
      deviceType: 'smartwatch',
      weightGrams: 3,
      sensorMm: 25,
      markets: ['INT']
    }
  ],
  pix: { key: '29321223000132', keyType: 'cnpj', merchantName: '3N20 SOLUCOES TEC', merchantCity: 'SAO PAULO' },
  shipping: {
    originCep: '02537190',
    weightGrams: 5,
    lengthCm: 16,
    widthCm: 12,
    heightCm: 0.5,
    serviceCode: '04227',
    intlServiceCode: '45128',
    serviceName: 'Mini Envios',
    sender: {
      brand: 'Sensor Tattoo Fix',
      company: '3N20 Soluções Tecnológicas LTDA',
      cnpj: '29.321.223/0001-32',
      rua: 'Rua Engenheiro Roberto Dabus Buazar',
      numero: '56',
      complemento: '',
      bairro: 'Imirim',
      cidade: 'São Paulo',
      uf: 'SP',
      pais: 'Brasil'
    }
  },
  internationalShipping: {
    US: { label: 'Estados Unidos', price: 89.9, days: 15, currency: 'BRL' },
    PT: { label: 'Portugal', price: 262.5, days: 12, currency: 'BRL' },
    AR: { label: 'Argentina', price: 69.9, days: 10, currency: 'BRL' },
    MX: { label: 'México', price: 74.9, days: 12, currency: 'BRL' },
    GB: { label: 'Reino Unido', price: 94.9, days: 18, currency: 'BRL' },
    DE: { label: 'Alemanha', price: 94.9, days: 18, currency: 'BRL' },
    FR: { label: 'França', price: 94.9, days: 18, currency: 'BRL' },
    IT: { label: 'Itália', price: 94.9, days: 18, currency: 'BRL' },
    ES: { label: 'Espanha', price: 84.9, days: 14, currency: 'BRL' },
    CA: { label: 'Canadá', price: 89.9, days: 16, currency: 'BRL' },
    CL: { label: 'Chile', price: 64.9, days: 10, currency: 'BRL' },
    CO: { label: 'Colômbia', price: 64.9, days: 10, currency: 'BRL' },
    UY: { label: 'Uruguai', price: 59.9, days: 8, currency: 'BRL' },
    PY: { label: 'Paraguai', price: 54.9, days: 8, currency: 'BRL' },
    AU: { label: 'Austrália', price: 94.9, days: 18, currency: 'BRL' },
    NZ: { label: 'Nova Zelândia', price: 99.9, days: 20, currency: 'BRL' },
    IE: { label: 'Irlanda', price: 94.9, days: 18, currency: 'BRL' },
    NL: { label: 'Países Baixos', price: 94.9, days: 18, currency: 'BRL' },
    BE: { label: 'Bélgica', price: 94.9, days: 18, currency: 'BRL' },
    CH: { label: 'Suíça', price: 99.9, days: 16, currency: 'BRL' },
    AT: { label: 'Áustria', price: 94.9, days: 18, currency: 'BRL' },
    SI: { label: 'Eslovênia', price: 94.9, days: 18, currency: 'BRL' },
    SE: { label: 'Suécia', price: 99.9, days: 20, currency: 'BRL' },
    NO: { label: 'Noruega', price: 99.9, days: 20, currency: 'BRL' },
    DK: { label: 'Dinamarca', price: 99.9, days: 20, currency: 'BRL' },
    PL: { label: 'Polônia', price: 89.9, days: 16, currency: 'BRL' },
    CZ: { label: 'República Tcheca', price: 89.9, days: 16, currency: 'BRL' },
    JP: { label: 'Japão', price: 104.9, days: 20, currency: 'BRL' },
    KR: { label: 'Coreia do Sul', price: 104.9, days: 20, currency: 'BRL' },
    SG: { label: 'Singapura', price: 99.9, days: 18, currency: 'BRL' },
    HK: { label: 'Hong Kong', price: 99.9, days: 18, currency: 'BRL' },
    ZA: { label: 'África do Sul', price: 109.9, days: 22, currency: 'BRL' },
    AE: { label: 'Emirados Árabes Unidos', price: 99.9, days: 18, currency: 'BRL' },
    OTHER: { label: 'Outro país', price: 158.7, days: 18, currency: 'BRL' }
  },
  internationalSurcharge: 0,
  /** Multiplies Correios intl quote. 1 = sem markup (valor real da cotação). */
  internationalShippingMultiplier: 1,
  internationalProduct: {
    title: 'Envio internacional',
    hint: '',
    encomendaNotice: 'Nesse tipo de frete é enviado o kit completo.',
    documentNotice: 'Lente de melhor fixação, sem potencializador (este frete não permite líquidos).\n\nKit completo: escolha outra opção de envio.'
  },
  payments: {
    paypal: {
      internationalEnabled: true,
      brazilEnabled: true,
      appLabel: '',
      feePercent: 5,
      feeFixedBRL: 0.6
    },
    cardBr: {
      provider: 'asaas',
      fallbackToAlternate: true
    },
    pixBr: {
      provider: 'mercadopago',
      fallbackToAlternate: true
    }
  },
  smartwatchModels: [
    'Apple Watch Series 1 (38mm)',
    'Apple Watch Series 2 (38mm)',
    'Apple Watch Series 3 (38mm)',
    'Apple Watch SE (40mm)',
    'Apple Watch SE (44mm)',
    'Apple Watch SE 2 (40mm)',
    'Apple Watch SE 2 (44mm)',
    'Apple Watch Series 6 (40mm)',
    'Apple Watch Series 6 (44mm)',
    'Apple Watch Series 7 (41mm)',
    'Apple Watch Series 7 (45mm)',
    'Apple Watch Series 8 (41mm)',
    'Apple Watch Series 8 (45mm)',
    'Apple Watch Series 9 (41mm)',
    'Apple Watch Series 9 (45mm)',
    'Apple Watch Series 10 (42mm)',
    'Apple Watch Series 10 (46mm)',
    'Apple Watch Ultra 3 (49mm)',
    'Apple Watch Ultra 2 (49mm)',
    'Apple Watch Ultra (49mm)',
    'Samsung Galaxy Watch 4 (40mm)',
    'Samsung Galaxy Watch 4 (44mm)',
    'Samsung Galaxy Watch 5 (40mm)',
    'Samsung Galaxy Watch 5 (44mm)',
    'Samsung Galaxy Watch 5 Pro (45mm)',
    'Samsung Galaxy Watch 6 (40mm)',
    'Samsung Galaxy Watch 6 (44mm)',
    'Samsung Galaxy Watch 6 Classic (43mm)',
    'Samsung Galaxy Watch 6 Classic (47mm)',
    'Samsung Galaxy Watch 7 (40mm)',
    'Samsung Galaxy Watch 7 (44mm)',
    'Samsung Galaxy Watch 8 (40mm)',
    'Samsung Galaxy Watch 8 (44mm)',
    'Samsung Galaxy Watch 8 Classic (46mm)',
    'Samsung Galaxy Watch Ultra (47mm)',
    'Garmin Fenix',
    'Garmin Forerunner',
    'Garmin Instinct',
    'Garmin Venu',
    'Garmin Vivoactive',
    'Huawei Watch Fit',
    'Huawei Watch GT',
    'Xiaomi Watch S1 / S3',
    'Redmi Watch',
    'Amazfit Active',
    'Amazfit Bip',
    'Amazfit GTR Mini',
    'Amazfit GTR',
    'Amazfit GTS',
    'Amazfit T-Rex',
    'Fitbit Versa / Sense',
    'Polar Pacer / Ignite',
    'Outro modelo (informar nas observações)'
  ],
  formsubmit: { email: 'contato@sensortattoofix.com.br', subject: 'Novo pedido — Loja Oficial Sensor Tattoo Fix' },
  emails: {
    from: 'Sensor Tattoo Fix <pedidos@sensortattoofix.com.br>',
    shopPaidSubject: 'PAGO — {orderId}',
    customerOrderSubject: 'Pedido {orderId} registrado — Sensor Tattoo Fix',
    customerPixSubject: 'PIX do pedido {orderId} — Sensor Tattoo Fix',
    customerPaidSubject: 'Pagamento confirmado — {orderId}',
    motoboySubject: 'Entrega motoboy — {orderId}',
    couponSubject: 'Você vendeu com seu cupom — comissão {amount} — Sensor Tattoo Fix',
    commissionerWelcomeSubject: 'Seu cupom {code} está ativo — divulgue Sensor Tattoo Fix',
    testSubject: 'Teste — Sensor Tattoo Fix',
    testTo: '',
    monthlyReportSubject: 'Relatório mensal — {month}/{year} — Sensor Tattoo Fix',
    monthlyReportTo: '',
    pendingPaypal: 'Finalize o pagamento no PayPal. Você receberá outro e-mail quando o pagamento for confirmado.',
    pendingCard: 'Finalize o pagamento no link enviado. Você receberá outro e-mail quando o pagamento for confirmado.',
    pendingMpCheckout: 'Finalize o pagamento com cartão no Mercado Pago (Visa/Mastercard). Seu banco pode converter de USD/EUR para reais.',
    paidDefault: 'Seu kit será postado em até 2 dias úteis. Você receberá o rastreio por e-mail.',
    paidMotoboy: 'Seu pedido será entregue por motoboy em até {hours} horas. O entregador entrará em contato se necessário.',
    paidUberTracking: 'Entrega Uber confirmada. Acompanhe em: {url}',
    paidUberPending: 'Entrega Uber solicitada. Você receberá o link de rastreio por e-mail em breve.',
    paidIntlLens: 'Sua lente internacional será postada em até 2 dias úteis. Você receberá o rastreio por e-mail.',
    paidIntlKit: 'Seu kit Prime será postado em até 2 dias úteis. Você receberá o rastreio por e-mail.',
    customerTrackingSubject: 'Rastreio disponível — {orderId}',
    trackingAvailable: 'Seu pedido foi postado. Código de rastreio: {code}. Acompanhe em: {url}',
    abandonedSubject: 'Seu pedido {orderId} ainda está reservado — finalize quando quiser',
    abandonedWeeklySubject: 'Lembrete semanal — pedido {orderId} aguardando pagamento',
    abandonedIntro: 'Notamos que seu pedido ficou pendente. Seus itens ainda estão reservados — finalize o pagamento pelo link abaixo.',
    abandonedWeeklyIntro: 'Passou uma semana e seu pedido ainda aguarda pagamento. Se ainda quiser o Sensor Tattoo Fix, é só concluir pelo link.',
    abandonedCta: 'Finalizar meu pedido',
    pixGreeting: 'Olá, {nome}!',
    pixIntro: 'Seu pedido {orderId} foi registrado. Para concluir a compra, pague o PIX abaixo:',
    pixFooter: 'Guarde este e-mail — se fechar a página, use o link acima para voltar ao QR Code.'
  },
  whatsapp: '5511913394665',
  siteUrl: 'https://www.sensortattoofix.com.br',
  api: { baseUrl: 'https://api.sensortattoofix.com.br' },
  /** Visibilidade de redes e marketplaces no site (admin liga/desliga). */
  channels: {
    socials: {
      instagram: { enabled: true, url: 'https://www.instagram.com/sensortattoofix' },
      tiktok: { enabled: true, url: 'https://www.tiktok.com/@sensortattoofixofc' },
      youtube: { enabled: true, url: 'https://www.youtube.com/@Sensortattoofix-ofc' },
      facebook: { enabled: true, url: 'https://www.facebook.com/profile.php?id=61588858629597' }
    },
    stores: {
      oficial: { enabled: true },
      mercadolivre: {
        enabled: true,
        url: 'https://produto.mercadolivre.com.br/MLB-6831525504-smartwatch-x-tatuagem-sensor-nao-funciona-lentes-reparadoras-_JM'
      },
      shopee: { enabled: true, url: 'https://shopee.com.br/product/479290797/58259628035/' },
      tiktok_shop: { enabled: true, url: 'https://vt.tiktok.com/ZS9juMxSmKGjN-mns6O/' },
      amazon: { enabled: true, url: 'https://www.amazon.com.br/dp/B0GYVBRGZS' }
    }
  },
  coupons: [],
  mlFlexShippingCost: 0,
  kitCostVersion: 3,
  kitCost: {
    components: [
      { id: 'shipping-label', name: 'Etiqueta de envio', buyQty: 1000, buyPrice: 52.75, yieldQty: 1, useQty: 2, notes: '2 etiquetas por envio' },
      { id: 'shipping-bag', name: 'Sacola de envio', buyQty: 500, buyPrice: 32.9, yieldQty: 1, useQty: 1, notes: '' },
      { id: 'shipping-bag-sticker', name: 'Adesivo da sacola / envelope', buyQty: 1000, buyPrice: 60, yieldQty: 1, useQty: 1, notes: '1 por sacola ou envelope (1 por lente)' },
      { id: 'kit-bag', name: 'Sacola zip do kit', buyQty: 100, buyPrice: 52, yieldQty: 1, useQty: 1, notes: 'Zip que vai dentro' },
      { id: 'kit-bag-sticker', name: 'Adesivo da sacola do kit', buyQty: 1000, buyPrice: 60, yieldQty: 1, useQty: 1, notes: '1 por sacola zip' },
      { id: 'manual-sofit', name: 'Manual (sulfite)', buyQty: 1000, buyPrice: 59, yieldQty: 10, useQty: 1, notes: '10 manuais por folha sulfite' },
      { id: 'promo-print', name: 'Impresso promocional (sulfite)', buyQty: 1000, buyPrice: 59, yieldQty: 10, useQty: 1, notes: '10 impressos por folha sulfite' },
      { id: 'applicator', name: 'Haste aplicadora', buyQty: 200, buyPrice: 26.35, yieldQty: 1, useQty: 0.5, notes: 'Meia haste por kit' },
      { id: 'potentiator', name: 'Potencializador (primer)', buyQty: 100, buyPrice: 188, yieldQty: 1, useQty: 0.2, notes: '1/5 ml por kit' },
      { id: 'potentiator-glass', name: 'Vidro do potencializador', buyQty: 100, buyPrice: 149.8, yieldQty: 1, useQty: 1, notes: 'Frasco 1 ml' },
      { id: 'alcohol-wipe', name: 'Lenço com álcool isopropílico', buyQty: 500, buyPrice: 35.92, yieldQty: 1, useQty: 1, notes: '' },
      { id: 'film', name: 'Película / lente', buyQty: 10, buyPrice: 49, yieldQty: 30, useQty: 1, notes: '10 folhas a R$ 49; 30 lentes por folha' },
      { id: 'sticker-cut', name: 'Adesivo + recorte das lentes', buyQty: 10, buyPrice: 271, yieldQty: 30, useQty: 1, notes: 'Adesivo e recorte juntos; 10×30 = 300 lentes' }
    ]
  },
  kitCostIntl: {
    components: [
      { id: 'intl-envelope', name: 'Envelope internacional', buyQty: 100, buyPrice: 23, yieldQty: 1, useQty: 1, notes: 'Não é sacola — envelope' },
      { id: 'intl-envelope-sticker', name: 'Adesivo do envelope', buyQty: 1000, buyPrice: 60, yieldQty: 1, useQty: 1, notes: 'Mesmo adesivo 1000×R$ 60; 1 por lente' },
      { id: 'intl-sulfite', name: 'Carta sulfite', buyQty: 1000, buyPrice: 59, yieldQty: 1, useQty: 1, notes: '1 folha sulfite impressa por envio' },
      { id: 'film', name: 'Película / lente', buyQty: 10, buyPrice: 49, yieldQty: 30, useQty: 1, notes: '10 folhas a R$ 49; 30 lentes por folha' },
      { id: 'sticker-cut', name: 'Adesivo + recorte das lentes', buyQty: 10, buyPrice: 271, yieldQty: 30, useQty: 1, notes: 'Adesivo e recorte juntos; 300 lentes' }
    ]
  }
};

const DEFAULT_MOTOBOY_SHIPPING = {
  enabled: true,
  basePrice: 12,
  pricePerKm: 2.8,
  minPrice: 18,
  maxRadiusKm: 35,
  roadFactor: 1.25,
  deliveryHours: 24,
  couriers: []
};

const DEFAULT_SHIPPING_METHODS = [
  { id: 'br-mini-envios', enabled: true, scope: 'BR', label: 'Mini Envios', correiosCode: '04227', provider: 'correios' },
  // Carta Registrada não serve para kit/líquido — desligada.
  { id: 'br-carta-registrada', enabled: false, scope: 'BR', label: 'Carta Registrada', correiosCode: '8010', provider: 'correios' },
  { id: 'br-sf-pac', enabled: false, scope: 'BR', label: 'PAC', provider: 'superfrete', superfreteService: 1 },
  { id: 'br-sf-sedex', enabled: false, scope: 'BR', label: 'SEDEX', provider: 'superfrete', superfreteService: 2 },
  { id: 'br-sf-mini', enabled: false, scope: 'BR', label: 'Mini Envios', provider: 'superfrete', superfreteService: 17 },
  { id: 'br-sf-jadlog', enabled: true, scope: 'BR', label: 'Jadlog', provider: 'superfrete', superfreteService: 3 },
  { id: 'br-sf-loggi', enabled: true, scope: 'BR', label: 'Loggi', provider: 'superfrete', superfreteService: 31 },
  { id: 'br-motoboy', enabled: false, scope: 'BR', label: 'Envio particular (motoboy — até 24h)', provider: 'motoboy' },
  { id: 'br-uber-direct', enabled: false, scope: 'BR', label: 'Entrega Uber (rápida)', provider: 'uber' },
  { id: 'int-encomenda', enabled: true, scope: 'INT', label: 'Encomenda internacional (Exporta Fácil)', correiosCode: '*', simTipo: 'M' },
  { id: 'int-documento', enabled: true, scope: 'INT', label: 'Documento / carta internacional', correiosCode: '*', simTipo: 'D' }
];

function resolveIntlSimTipos(method) {
  const tipo = String(method?.simTipo || '').toUpperCase();
  if (tipo === 'M' || tipo === 'D') return [tipo];
  if (method?.id === 'int-todos' || String(method?.correiosCode || '').trim() === '*') return ['M', 'D'];
  if (/documento|carta/i.test(method?.label || '')) return ['D'];
  return ['M'];
}

function mergeShippingMethods(stored) {
  const defaults = structuredClone(DEFAULT_SHIPPING_METHODS);
  if (!Array.isArray(stored) || !stored.length) return defaults;
  const byId = new Map(defaults.map((m) => [m.id, m]));
  stored.forEach((m) => {
    if (!m?.id) return;
    const base = byId.get(m.id) || {};
    byId.set(m.id, { ...base, ...m });
  });
  // Kit/líquido não vai por Carta Registrada — força desligado mesmo se estava ativo no KV.
  const carta = byId.get('br-carta-registrada');
  if (carta) byId.set('br-carta-registrada', { ...carta, enabled: false });
  // Labels limpos no checkout (sem “Super Frete”); provedor continua no admin.
  for (const [id, m] of byId) {
    if (m.provider !== 'superfrete' && !String(id).startsWith('br-sf-')) continue;
    const sid = superfreteServiceId(m);
    byId.set(id, { ...m, label: superfreteCustomerLabel(sid, null, m) });
  }
  return [...byId.values()];
}

function getEnabledShippingMethods(config, scope) {
  const list = config.shippingMethods?.length ? config.shippingMethods : DEFAULT_SHIPPING_METHODS;
  return list.filter((m) => m.enabled !== false && m.scope === scope);
}

function isCorreiosBrOrder(order) {
  if (!order) return false;
  if ((order.paisCode || 'BR') !== 'BR') return false;
  if (order.internationalLensOnly) return false;
  if (orderLooksInternationalDestination(order)) return false;
  if (isSuperfreteOrder(order)) return false;
  return !isParticularDeliveryOrder(order);
}

function isCorreiosIntlOrder(order) {
  if (!order || isParticularDeliveryOrder(order)) return false;
  const abroad = orderLooksInternationalDestination(order) || ((order.paisCode || 'BR') !== 'BR');
  if (!abroad) return false;
  const methodId = String(order.shippingMethodId || '').toLowerCase();
  if (methodId.startsWith('int-')) return true;
  if (order.shipmentType === 'documento' || order.shipmentType === 'encomenda') return true;
  if (order.internationalLensOnly) return true;
  const code = String(order.shippingServiceCode || '').trim();
  if (code && code !== '*' && !isCorreiosImportOnlyServiceCode(code)) return true;
  return abroad;
}

/** Pedidos que devem gerar pré-postagem + rótulo Correios (BR ou exportação). */
function isCorreiosLabelOrder(order) {
  return isCorreiosBrOrder(order) || isCorreiosIntlOrder(order);
}

function getMotoboyConfig(config) {
  const m = { ...DEFAULT_MOTOBOY_SHIPPING, ...(config?.motoboyShipping || {}) };
  return {
    enabled: m.enabled !== false,
    basePrice: Number(m.basePrice) || DEFAULT_MOTOBOY_SHIPPING.basePrice,
    pricePerKm: Number(m.pricePerKm) || DEFAULT_MOTOBOY_SHIPPING.pricePerKm,
    minPrice: Number(m.minPrice) || DEFAULT_MOTOBOY_SHIPPING.minPrice,
    maxRadiusKm: Number(m.maxRadiusKm) || DEFAULT_MOTOBOY_SHIPPING.maxRadiusKm,
    roadFactor: Number(m.roadFactor) || DEFAULT_MOTOBOY_SHIPPING.roadFactor,
    deliveryHours: Number(m.deliveryHours) || DEFAULT_MOTOBOY_SHIPPING.deliveryHours,
    couriers: Array.isArray(m.couriers) ? m.couriers : []
  };
}

function activeMotoboyCouriers(config) {
  return getMotoboyConfig(config).couriers.filter(
    (c) => c?.active !== false && String(c.email || '').includes('@')
  );
}

function motoboyOperational(config) {
  const cfg = getMotoboyConfig(config);
  return cfg.enabled && activeMotoboyCouriers(config).length > 0;
}

/** Modalidades motoboy disponíveis para cotação — se o módulo está operacional, não exige "Ativo" na lista de modalidades. */
function getMotoboyShippingMethods(config) {
  if (!motoboyOperational(config)) return [];
  const fromList = (config.shippingMethods?.length ? config.shippingMethods : DEFAULT_SHIPPING_METHODS)
    .filter((m) => m.scope === 'BR' && isMotoboyMethod(m));
  const enabled = fromList.filter((m) => m.enabled !== false);
  if (enabled.length) return enabled;
  if (fromList.length) return fromList;
  return [{
    id: 'br-motoboy',
    enabled: true,
    scope: 'BR',
    label: 'Envio particular (motoboy — até 24h)',
    provider: 'motoboy'
  }];
}

async function geocodeAddressNominatim(query) {
  const q = String(query || '').trim();
  if (q.length < 8) return null;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?${new URLSearchParams({
        q,
        format: 'json',
        limit: '1',
        countrycodes: 'br'
      })}`,
      { headers: { 'User-Agent': 'SensorTattooFix/1.0 (contato@sensortattoofix.com.br)' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const hit = data?.[0];
    const lat = Number(hit?.lat);
    const lon = Number(hit?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return { lat, lon };
  } catch (err) {
    console.warn('Nominatim:', err.message);
    return null;
  }
}

function addressSuggestItem({ label, street, number, city, state, postal }) {
  return {
    label: String(label || '').trim(),
    street: String(street || '').trim(),
    number: String(number || '').trim(),
    city: String(city || '').trim(),
    state: String(state || '').trim(),
    postal: String(postal || '').trim()
  };
}

function googleAddressComponent(components, type, useShort) {
  const hit = (components || []).find((c) => c.types?.includes(type));
  return String((useShort ? hit?.shortText : hit?.longText) || '').trim();
}

async function googlePlacesAddressSuggest(apiKey, query, country) {
  const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.text'
    },
    body: JSON.stringify({
      input: query,
      includedRegionCodes: [String(country || '').toLowerCase()].filter(Boolean)
    })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error?.message || `Google Places ${res.status}`);

  const suggestions = [];
  for (const row of data.suggestions || []) {
    const pred = row.placePrediction;
    if (!pred?.placeId) continue;
    // Places API (New) resource name is places/{placeId}
    const detailRes = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(pred.placeId)}`, {
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'addressComponents,formattedAddress'
      }
    });
    const detail = await detailRes.json().catch(() => ({}));
    if (!detailRes.ok) continue;
    const comps = detail.addressComponents || [];
    const streetNum = googleAddressComponent(comps, 'street_number', true);
    const route = googleAddressComponent(comps, 'route', false);
    suggestions.push(addressSuggestItem({
      label: pred.text?.text || detail.formattedAddress || [streetNum, route].filter(Boolean).join(' '),
      street: route || pred.text?.text || '',
      number: streetNum,
      city: googleAddressComponent(comps, 'locality', false)
        || googleAddressComponent(comps, 'postal_town', false)
        || googleAddressComponent(comps, 'administrative_area_level_2', false),
      state: googleAddressComponent(comps, 'administrative_area_level_1', true),
      postal: googleAddressComponent(comps, 'postal_code', true)
    }));
    if (suggestions.length >= 6) break;
  }
  return suggestions;
}

async function photonAddressSuggest(query, country) {
  const res = await fetch(`https://photon.komoot.io/api/?${new URLSearchParams({
    q: query,
    limit: '10',
    lang: 'en'
  })}`);
  if (!res.ok) throw new Error(`Photon ${res.status}`);
  const data = await res.json();
  const cc = String(country || '').toUpperCase();
  return (data.features || [])
    .filter((f) => {
      if (!cc || cc === 'OTHER') return true;
      return String(f.properties?.countrycode || '').toUpperCase() === cc;
    })
    .slice(0, 6)
    .map((f) => {
      const p = f.properties || {};
      const streetName = p.street || p.name || '';
      const label = [[p.housenumber, streetName].filter(Boolean).join(' '), p.city || p.locality, p.state, p.country].filter(Boolean).join(', ');
      return addressSuggestItem({
        label,
        street: streetName,
        number: p.housenumber || '',
        city: p.city || p.locality || '',
        state: p.state || '',
        postal: p.postcode || ''
      });
    })
    .filter((item) => item.label);
}

async function handleAddressSuggest(request, env, origin) {
  const url = new URL(request.url);
  const query = String(url.searchParams.get('q') || '').trim();
  const country = String(url.searchParams.get('country') || '').trim().toUpperCase();
  if (query.length < 3) return json({ suggestions: [], source: 'none' }, 200, origin);

  const googleKey = String(env.GOOGLE_PLACES_API_KEY || '').trim();
  if (googleKey && country && country !== 'OTHER') {
    try {
      const suggestions = await googlePlacesAddressSuggest(googleKey, query, country);
      if (suggestions.length) {
        return json({ suggestions, source: 'google' }, 200, origin);
      }
    } catch (err) {
      console.warn('Google Places suggest:', err.message);
    }
  }

  try {
    const suggestions = await photonAddressSuggest(query, country);
    return json({ suggestions, source: 'photon' }, 200, origin);
  } catch (err) {
    console.warn('Photon suggest:', err.message);
    return json({ suggestions: [], source: 'error', error: err.message }, 200, origin);
  }
}

async function fetchCepMetadata(cep) {
  const digits = String(cep || '').replace(/\D/g, '');
  if (digits.length !== 8) return null;
  try {
    const res = await fetch(`https://brasilapi.com.br/api/cep/v2/${digits}`, {
      headers: { Accept: 'application/json' }
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function handleGetCep(request, env, origin, cepDigits) {
  const digits = String(cepDigits || '').replace(/\D/g, '');
  if (digits.length !== 8) return json({ error: 'CEP inválido.' }, 400, origin);
  const meta = await fetchCepMetadata(digits);
  if (!meta?.city) return json({ error: 'CEP não encontrado.' }, 404, origin);
  return json({
    cep: `${digits.slice(0, 5)}-${digits.slice(5)}`,
    logradouro: meta.street || '',
    bairro: meta.neighborhood || '',
    localidade: meta.city || '',
    uf: meta.state || ''
  }, 200, origin);
}

async function fetchCepCoordinates(cep, addressParts = {}) {
  const digits = String(cep || '').replace(/\D/g, '');
  if (digits.length !== 8) return null;

  const meta = await fetchCepMetadata(digits);
  const coords = meta?.location?.coordinates;
  const lat = Number(coords?.latitude);
  const lon = Number(coords?.longitude);
  if (Number.isFinite(lat) && Number.isFinite(lon)) return { lat, lon };

  const street = String(addressParts.rua || meta?.street || '').trim();
  const city = String(addressParts.cidade || meta?.city || '').trim();
  const uf = String(addressParts.uf || meta?.state || '').trim();
  const bairro = String(addressParts.bairro || meta?.neighborhood || '').trim();
  const numero = String(addressParts.numero || '').trim();

  const queries = [];
  if (street && city) {
    queries.push([street, numero, bairro, city, uf, 'Brasil'].filter(Boolean).join(', '));
  }
  if (city && uf) {
    queries.push([bairro, city, uf, 'Brasil'].filter(Boolean).join(', '));
    queries.push(`${digits.slice(0, 5)}-${digits.slice(5)}, ${city}, ${uf}, Brasil`);
  }

  for (const query of queries) {
    const point = await geocodeAddressNominatim(query);
    if (point) return point;
  }
  return null;
}

async function fetchOriginCoordinates(config) {
  const sender = config?.shipping?.sender || DEFAULT_CONFIG.shipping.sender;
  const originCep = config?.shipping?.originCep || DEFAULT_CONFIG.shipping.originCep;
  return fetchCepCoordinates(originCep, {
    rua: sender.rua,
    numero: sender.numero,
    bairro: sender.bairro,
    cidade: sender.cidade,
    uf: sender.uf
  });
}

async function fetchDestCoordinates(cep, addressParts = {}) {
  return fetchCepCoordinates(cep, addressParts);
}

async function computeMotoboyQuote(config, destCep, addressParts = {}) {
  const cfg = getMotoboyConfig(config);
  if (!cfg.enabled) return null;

  const [origin, dest] = await Promise.all([
    fetchOriginCoordinates(config),
    fetchDestCoordinates(destCep, addressParts)
  ]);
  if (!origin || !dest) return null;

  const straightKm = haversineKm(origin.lat, origin.lon, dest.lat, dest.lon);
  const roadKm = straightKm * cfg.roadFactor;
  if (roadKm > cfg.maxRadiusKm) return null;

  const priced = calcMotoboyPrice(cfg, roadKm);
  return {
    ...priced,
    straightKm: Math.round(straightKm * 10) / 10,
    roadKm: Math.round(roadKm * 10) / 10,
    deliveryHours: cfg.deliveryHours
  };
}

async function quoteMotoboyShippingOptions(env, config, addressParams, opts = {}) {
  const methods = getMotoboyShippingMethods(config);
  if (!methods.length) return [];

  const destCep = addressParams?.cep;
  if (!destCep || String(destCep).replace(/\D/g, '').length !== 8) return [];

  try {
    const quote = await computeMotoboyQuote(config, destCep, addressParams);
    if (!quote) return [];
    return methods.map((method) => ({
      id: method.id,
      methodId: method.id,
      serviceCode: null,
      service: method.label || 'Envio particular (motoboy)',
      price: quote.price,
      days: 1,
      deliveryHours: quote.deliveryHours,
      distanceKm: quote.roadKm,
      billableKm: quote.billableKm,
      source: 'motoboy',
      provider: 'motoboy',
      weightGrams: shippingWeightGrams(config, opts.weightGrams)
    }));
  } catch (err) {
    console.warn('Motoboy quote:', err.message);
    return [];
  }
}

async function notifyMotoboyCouriers(env, config, order) {
  const couriers = activeMotoboyCouriers(config);
  if (!couriers.length) return [];

  const cfg = getMotoboyConfig(config);
  const adminUrl = `${(config.siteUrl || DEFAULT_CONFIG.siteUrl).replace(/\/$/, '')}/pedidos.html`;
  const fields = {
    Pedido: order.orderId,
    Cliente: order.nome,
    Telefone: order.telefone,
    'E-mail cliente': order.email,
    Endereço: order.endereco,
    Produto: order.produto,
    'Valor frete': formatBRL(order.frete),
    Distância: order.motoboyDistanceKm ? `~${order.motoboyDistanceKm} km` : '—',
    Prazo: `até ${cfg.deliveryHours}h`,
    'Painel pedidos': adminUrl,
    ...orderWatchEmailFields(order)
  };

  const subject = emailSubject(config, 'motoboySubject', { orderId: order.orderId });
  const results = [];
  for (const courier of couriers) {
    const to = String(courier.email || '').trim().toLowerCase();
    if (!to) continue;
    const courierFields = {
      Motoboy: courier.name || to,
      ...fields
    };
    const res = await notifyEmail(env, config, to, subject, courierFields, config.formsubmit?.email);
    results.push({ email: to, ok: res.ok });
    if (!res.ok) console.error('E-mail motoboy:', to, JSON.stringify(res));
  }
  return results;
}

function orderCouponEmailFields(order) {
  if (!order?.couponCode) return {};
  const fields = {
    Cupom: order.couponCode,
    Comissionado: order.couponCommissionerName || order.couponCommissionerEmail || '—',
    'Desconto cupom': formatBRL(order.couponDiscount || 0)
  };
  if (order.couponCommissionPercent != null) {
    fields['Comissão (%)'] = `${order.couponCommissionPercent}%`;
  }
  if (order.couponCommissionAmount != null) {
    fields['Comissão a pagar'] = formatBRL(order.couponCommissionAmount);
  }
  return fields;
}

async function notifyCouponCommissioner(env, config, order) {
  const to = String(order.couponCommissionerEmail || '').trim().toLowerCase();
  if (!to) return { ok: true, skipped: true };

  const adminUrl = `${(config.siteUrl || DEFAULT_CONFIG.siteUrl).replace(/\/$/, '')}/pedidos.html`;
  const subject = emailSubject(config, 'couponSubject', {
    orderId: order.orderId,
    amount: formatBRL(order.couponCommissionAmount || 0)
  });
  const fields = {
    Comissionado: order.couponCommissionerName || to,
    Cupom: order.couponCode,
    Pedido: order.orderId,
    Cliente: order.nome,
    'E-mail cliente': order.email,
    Produto: order.produto,
    'Valor do produto': formatBRL(order.valorProduto),
    'Desconto aplicado': formatBRL(order.couponDiscount || 0),
    'Total do pedido': formatBRL(order.total),
    Status: 'Pago',
    'Painel pedidos': adminUrl,
    ...orderWatchEmailFields(order)
  };
  if (order.couponCommissionPercent != null) {
    fields['Sua comissão (%)'] = `${order.couponCommissionPercent}%`;
  }
  if (order.couponCommissionAmount != null) {
    fields['Comissão a receber'] = formatBRL(order.couponCommissionAmount);
  }
  fields.Pagamento = 'Comissões somadas até o dia 30 de cada mês.';
  const res = await notifyEmail(env, config, to, subject, fields, config.formsubmit?.email);
  if (!res.ok) console.error('E-mail comissionado cupom:', to, JSON.stringify(res));
  return res;
}

function commissionerWelcomeHtml(config, coupon, name, attachmentCount) {
  const site = (config.siteUrl || DEFAULT_CONFIG.siteUrl).replace(/\/$/, '');
  const code = normalizeCouponCode(coupon.code);
  const buyUrl = `${site}/comprar.html?cupom=${encodeURIComponent(code)}`;
  const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const storiesNote = attachmentCount
    ? `<p><strong>${commissionerAttachmentLabel(attachmentCount)}</strong>.</p>
    <p><strong>Como postar:</strong></p>
    <ol style="margin:8px 0;padding-left:20px;line-height:1.6">
      <li>Salve o PNG anexo no celular.</li>
      <li>Publique nos <strong>Stories</strong> do Instagram ou em qualquer outra rede social ou publicação.</li>
      <li>Use a ferramenta de <strong>texto</strong> e escreva seu cupom <strong>${esc(code)}</strong> no espaço vazio da faixa (“USE O CUPOM”).</li>
      <li>Use fonte clara e grande, centralizada, para ficar legível.</li>
    </ol>`
    : '<p>A arte deve estar em anexo neste e-mail.</p>';
  return `<div style="font-family:Arial,sans-serif;max-width:600px;color:#111;line-height:1.5">
    <p>Olá, <strong>${esc(name)}</strong>!</p>
    <p>Seu cupom de comissionado está ativo. Divulgue o Sensor Tattoo Fix e ganhe comissão a cada venda.</p>
    <p style="font-size:22px;font-weight:800;letter-spacing:1px;color:#c9a227">Seu cupom: ${esc(code)}</p>
    <ul>
      <li><strong>10% de desconto</strong> para quem comprar com seu cupom</li>
      <li><strong>20% de comissão</strong> para você em cada venda paga</li>
      <li>Você recebe <strong>e-mail a cada compra</strong> com o valor da comissão</li>
      <li>Pagamento das comissões no <strong>dia 30 de cada mês</strong></li>
    </ul>
    <p><strong>Link para seus clientes:</strong><br><a href="${esc(buyUrl)}">${esc(buyUrl)}</a></p>
    ${storiesNote}
    <p style="color:#666;font-size:13px">Dúvidas: contato@sensortattoofix.com.br · Sensor Tattoo Fix — sensortattoofix.com.br</p>
  </div>`;
}

function commissionerWelcomeText(coupon, name, attachmentCount) {
  const code = normalizeCouponCode(coupon.code);
  return [
    `Olá, ${name}!`,
    '',
    `Seu cupom ${code} está ativo.`,
    '- 10% de desconto para o cliente',
    '- 20% de comissão para você',
    '- E-mail a cada venda',
    '- Pagamento no dia 30 de cada mês',
    '',
    `Link: comprar.html?cupom=${code}`,
    '',
    attachmentCount
      ? `${commissionerAttachmentLabel(attachmentCount)} — publique no Instagram, em outra rede social ou publicação:`
      : 'Arte em anexo:',
    '1. Salve a imagem no celular',
    '2. Poste nos Stories ou em qualquer outra rede social ou publicação',
    `3. Com a ferramenta de TEXTO, escreva ${code} no espaço vazio da área "USE O CUPOM"`,
    '4. Fonte clara, grande e centralizada'
  ].join('\n');
}

async function notifyCommissionerWelcome(env, config, coupon, name) {
  const site = (config.siteUrl || DEFAULT_CONFIG.siteUrl).replace(/\/$/, '');
  const code = normalizeCouponCode(coupon.code);
  let banners = { attachments: [] };
  try {
    banners = await generateCommissionerStoryBanners(site);
  } catch (err) {
    console.error('Banners comissionado:', err.message);
  }
  const subject = emailSubject(config, 'commissionerWelcomeSubject', { code, name });
  const html = commissionerWelcomeHtml(config, coupon, name, banners.attachments.length);
  const text = commissionerWelcomeText(coupon, name, banners.attachments.length);
  const result = await notifyEmail(env, config, coupon.email, subject, {}, config.formsubmit?.email, {
    html,
    text,
    attachments: banners.attachments
  });
  return { ...result, attachmentCount: banners.attachments.length };
}

async function handleCommissionerRegister(request, env, origin) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'JSON inválido.' }, 400, origin);
  }

  const name = String(body.name || '').trim().slice(0, 80);
  const email = normalizeEmail(body.email);
  const code = normalizeCouponCode(body.code || body.coupon || '');

  if (!name || name.length < 2) return json({ error: 'Informe seu nome.' }, 400, origin);
  if (!email || !email.includes('@')) return json({ error: 'Informe um e-mail válido.' }, 400, origin);
  if (code.length < 4 || code.length > 20) {
    return json({ error: 'O cupom deve ter entre 4 e 20 letras/números (ex.: JOAO10).' }, 400, origin);
  }
  if (RESERVED_COUPON_CODES.has(code)) {
    return json({ error: 'Este código não está disponível. Escolha outro nome para o cupom.' }, 400, origin);
  }

  const ip = clientIp(request);
  const rlKey = `commissioner:rl:${ip}`;
  const rlRaw = await env.STORE_KV.get(rlKey);
  const rlCount = Number(rlRaw) || 0;
  if (rlCount >= 5) {
    return json({ error: 'Muitas tentativas hoje. Tente amanhã ou fale conosco.' }, 429, origin);
  }
  await kvPut(env, rlKey, String(rlCount + 1), { expirationTtl: 86400 });

  const config = await getConfig(env);
  const coupons = getCoupons(config);
  if (coupons.some((c) => normalizeCouponCode(c.code) === code)) {
    return json({ error: 'Este cupom já existe. Escolha outro código.' }, 409, origin);
  }
  if (coupons.some((c) => String(c.email || '').trim().toLowerCase() === email)) {
    return json({ error: 'Este e-mail já possui um cupom cadastrado.' }, 409, origin);
  }

  const coupon = {
    id: slugCouponId(code),
    code,
    name,
    email,
    percent: COMMISSIONER_DISCOUNT_PERCENT,
    commissionPercent: COMMISSIONER_COMMISSION_PERCENT,
    active: true,
    selfRegisteredAt: new Date().toISOString()
  };

  await saveConfig(env, { ...config, coupons: [...coupons, coupon] });

  const mail = await notifyCommissionerWelcome(env, config, coupon, name);
  if (!mail.ok) console.error('E-mail boas-vindas comissionado:', email, JSON.stringify(mail));

  const site = (config.siteUrl || DEFAULT_CONFIG.siteUrl).replace(/\/$/, '');
  return json({
    ok: true,
    code,
    percent: COMMISSIONER_DISCOUNT_PERCENT,
    commissionPercent: COMMISSIONER_COMMISSION_PERCENT,
    buyUrl: `${site}/comprar.html?cupom=${encodeURIComponent(code)}`,
    emailSent: !!mail.ok
  }, 200, origin);
}

async function handleCommissionerResendWelcome(request, env, origin) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'JSON inválido.' }, 400, origin);
  }

  const email = normalizeEmail(body.email);
  const code = normalizeCouponCode(body.code || body.coupon || '');
  if (!email || !email.includes('@')) return json({ error: 'Informe o e-mail do cadastro.' }, 400, origin);
  if (!code) return json({ error: 'Informe o código do cupom.' }, 400, origin);

  const ip = clientIp(request);
  const rlKey = `commissioner:resend:${ip}`;
  const rlRaw = await env.STORE_KV.get(rlKey);
  const rlCount = Number(rlRaw) || 0;
  if (rlCount >= 10) {
    return json({ error: 'Muitas tentativas de reenvio hoje. Tente amanhã.' }, 429, origin);
  }
  await kvPut(env, rlKey, String(rlCount + 1), { expirationTtl: 86400 });

  const config = await getConfig(env);
  const coupon = getCoupons(config).find(
    (c) => normalizeEmail(c.email) === email && normalizeCouponCode(c.code) === code
  );
  if (!coupon) return json({ error: 'Cupom não encontrado para este e-mail.' }, 404, origin);

  const name = String(coupon.name || '').trim() || 'Comissionado';
  const mail = await notifyCommissionerWelcome(env, config, coupon, name);
  if (!mail.ok) console.error('Reenvio boas-vindas comissionado:', email, JSON.stringify(mail));

  return json({
    ok: true,
    code: normalizeCouponCode(coupon.code),
    emailSent: !!mail.ok,
    attachments: mail.ok ? mail.attachmentCount : 0
  }, mail.ok ? 200 : 502, origin);
}

async function handleValidateCoupon(request, env, origin) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'JSON inválido.' }, 400, origin);
  }
  const code = String(body.code || '').trim();
  if (!code) return json({ error: 'Informe o código do cupom.' }, 400, origin);

  const config = await getPublicConfig(env);
  const coupon = findActiveCoupon(config, code);
  if (!coupon) return json({ error: 'Cupom inválido ou inativo.' }, 404, origin);

  let items;
  try {
    items = resolveOrderItems(config, body);
  } catch (err) {
    return json({ error: err.message }, 400, origin);
  }
  const valorProduto = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const { percent, discount } = computeCouponDiscount(valorProduto, coupon.percent);

  return json({
    ok: true,
    code: normalizeCouponCode(coupon.code),
    percent,
    desconto: discount,
    label: String(coupon.name || '').trim() || normalizeCouponCode(coupon.code)
  }, 200, origin);
}

function mergeSmartwatchModelLists(stored, base) {
  const storedList = Array.isArray(stored) && stored.length ? stored : [];
  const baseList = Array.isArray(base) ? base : [];
  if (!storedList.length) return [...baseList];
  const seen = new Set(storedList);
  const out = [...storedList];
  baseList.forEach((m) => {
    if (!seen.has(m)) {
      out.push(m);
      seen.add(m);
    }
  });
  return out;
}

function catalogRowCount(catalog) {
  return Object.values(catalog || {}).reduce((n, arr) => n + (Array.isArray(arr) ? arr.length : 0), 0);
}

function normalizeSmartwatchCatalogRow(row, brand) {
  if (!row) return null;
  if (typeof row === 'string') {
    const label = row.trim();
    if (!label) return null;
    return { label, model: label, sizeMm: null, kind: null, sensorMm: null, brand };
  }
  const label = String(row.label || row.model || '').trim();
  if (!label) return null;
  const kindRaw = String(row.kind || row.deviceType || '').toLowerCase();
  let kind = null;
  if (kindRaw === 'band' || kindRaw === 'smartband') kind = 'smartband';
  else if (kindRaw === 'watch' || kindRaw === 'smartwatch') kind = 'smartwatch';
  const sensor = row.sensorMm != null && row.sensorMm !== '' ? Number(row.sensorMm) : null;
  const size = row.sizeMm != null && row.sizeMm !== '' ? Number(row.sizeMm) : null;
  const lensW = row.lensWmm != null && row.lensWmm !== '' ? Number(row.lensWmm) : null;
  const lensH = row.lensHmm != null && row.lensHmm !== '' ? Number(row.lensHmm) : null;
  const kinds = Array.isArray(row.kinds) ? [...new Set(row.kinds.filter(Boolean))] : null;
  const out = {
    label,
    model: String(row.model || label).trim() || label,
    sizeMm: Number.isFinite(size) && size > 0 ? size : null,
    kind,
    sensorMm: Number.isFinite(sensor) && sensor > 0 ? sensor : null,
    brand: brand || row.brand || null
  };
  if (Number.isFinite(lensW) && lensW > 0) out.lensWmm = lensW;
  if (Number.isFinite(lensH) && lensH > 0) out.lensHmm = lensH;
  if (kinds?.length) out.kinds = kinds;
  return out;
}

function mergeSmartwatchCatalog(stored, base) {
  const storedCount = catalogRowCount(stored);
  const baseCount = catalogRowCount(base);
  const prefer = storedCount >= baseCount ? stored : base;
  const other = prefer === stored ? base : stored;
  const out = {};
  const brands = new Set([
    ...Object.keys(prefer || {}),
    ...Object.keys(other || {})
  ]);
  brands.forEach((brand) => {
    const byLabel = new Map();
    [...(other?.[brand] || []), ...(prefer?.[brand] || [])].forEach((row) => {
      const norm = normalizeSmartwatchCatalogRow(row, brand);
      if (!norm) return;
      const prev = byLabel.get(norm.label) || {};
      byLabel.set(norm.label, {
        label: norm.label,
        model: norm.model || prev.model || norm.label,
        sizeMm: norm.sizeMm != null ? norm.sizeMm : (prev.sizeMm ?? null),
        kind: norm.kind || prev.kind || null,
        sensorMm: norm.sensorMm != null ? norm.sensorMm : (prev.sensorMm ?? null),
        lensWmm: norm.lensWmm != null ? norm.lensWmm : (prev.lensWmm ?? null),
        lensHmm: norm.lensHmm != null ? norm.lensHmm : (prev.lensHmm ?? null),
        ...(norm.kinds?.length ? { kinds: norm.kinds } : prev.kinds?.length ? { kinds: prev.kinds } : {})
      });
    });
    if (byLabel.size) out[brand] = [...byLabel.values()];
  });
  return out;
}

function flatModelsFromCatalog(catalog, fallbackList) {
  const labels = [];
  const seen = new Set();
  Object.keys(catalog || {}).sort().forEach((brand) => {
    (catalog[brand] || []).forEach((row) => {
      const label = typeof row === 'string' ? row : row?.label;
      if (!label || seen.has(label)) return;
      seen.add(label);
      labels.push(label);
    });
  });
  const outro = 'Outro modelo (informar nas observações)';
  (fallbackList || []).forEach((m) => {
    if (!m || seen.has(m)) return;
    seen.add(m);
    labels.push(m);
  });
  if (!seen.has(outro)) labels.push(outro);
  return labels;
}

function isLegacyBrokenKitImage(url) {
  const u = String(url || '').trim();
  if (!u) return true;
  if (/\/(?:images|site|produtos|img)\//i.test(u)) return false;
  return /sensortattoofix/i.test(u);
}

function isKitOrMissingImage(url) {
  const u = String(url || '').trim();
  return !u || /sensortattoofix/i.test(u) || !/\/(?:images\/)?produtos\//.test(u);
}

function isGenericSharedImage(url, productId) {
  const u = String(url || '').trim();
  const id = String(productId || '').trim();
  if (!/\/(?:images\/)?produtos\//.test(u)) return true;
  if (id && (u === `/images/produtos/${id}.svg` || u === `/produtos/${id}.svg` || u.endsWith(`/${id}.svg`))) return false;
  return /\/(?:images\/)?produtos\/(pelicula-(squircle|redonda|retangular)|pulseira-)/i.test(u);
}

function isEmptyCatalogValue(value) {
  if (value == null) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'string') return value.trim() === '';
  return false;
}

function supplementKitFromSite(kvProduct, siteProduct) {
  const merged = { ...kvProduct };
  if (siteProduct?.image && isLegacyBrokenKitImage(kvProduct?.image)) {
    merged.image = siteProduct.image;
  }
  ['nameEn', 'nameIt', 'descriptionEn', 'descriptionIt'].forEach((field) => {
    if (!merged[field] && siteProduct?.[field]) merged[field] = siteProduct[field];
  });
  return merged;
}

function supplementAggregatedFromSite(kvProduct, siteProduct) {
  const productKey = kvProduct?.id || kvProduct?.slug;
  const merged = { ...kvProduct };
  const catalogFields = [
    'compatibleWatchModels',
    'compatibility',
    'productType',
    'filmType',
    'filmTypeEn',
    'bandStyle',
    'color',
    'colorEn',
    'packaging',
    'aggregated',
    'requiresSmartwatch',
    'nameEn',
    'nameIt',
    'descriptionEn',
    'descriptionIt',
    'markets',
    'images',
    'priceUsd',
    'priceEur'
  ];
  catalogFields.forEach((field) => {
    if (!isEmptyCatalogValue(merged[field])) return;
    if (siteProduct[field] != null) merged[field] = siteProduct[field];
  });
  if (
    Array.isArray(siteProduct.compatibleWatchModels) &&
    siteProduct.compatibleWatchModels.length &&
    isEmptyCatalogValue(merged.compatibleWatchModels)
  ) {
    merged.compatibleWatchModels = siteProduct.compatibleWatchModels;
  }
  if (siteProduct.image && String(siteProduct.image).includes('/images/produtos/pulseiras/')) {
    if (!kvProduct?.image || isGenericSharedImage(kvProduct.image, productKey)) {
      merged.image = siteProduct.image;
    }
  } else if (
    siteProduct.image &&
    (isKitOrMissingImage(kvProduct?.image) || isGenericSharedImage(kvProduct?.image, productKey))
  ) {
    merged.image = siteProduct.image;
  }
  return merged;
}

function mergeSiteCatalogProducts(kvProducts, siteProducts) {
  const byId = new Map();
  (kvProducts || []).forEach((p) => {
    const k = p?.id || p?.slug;
    if (k) byId.set(k, { ...p });
  });
  (siteProducts || []).forEach((lp) => {
    const k = lp?.id || lp?.slug;
    if (!k) return;
    if (!byId.has(k)) {
      byId.set(k, { ...lp });
      return;
    }
    const prev = byId.get(k);
    byId.set(
      k,
      lp.aggregated === true ? supplementAggregatedFromSite(prev, lp) : supplementKitFromSite(prev, lp)
    );
  });
  return [...byId.values()];
}

function mergeSiteCatalogSmartwatchMeta(kvMeta, siteMeta) {
  const out = { ...(kvMeta || {}) };
  Object.entries(siteMeta || {}).forEach(([model, meta]) => {
    if (!out[model]) {
      out[model] = { ...meta };
      return;
    }
    out[model] = { ...meta, ...out[model] };
  });
  return out;
}

function mergeSiteCatalog(config, site) {
  if (!site || typeof site !== 'object') return config;
  const next = { ...config };
  next.smartwatchModels = site.smartwatchModels?.length
    ? mergeSmartwatchModelLists(config.smartwatchModels || [], site.smartwatchModels)
    : mergeSmartwatchModelLists(config.smartwatchModels, DEFAULT_CONFIG.smartwatchModels);
  next.smartwatchModelMeta = mergeSiteCatalogSmartwatchMeta(
    config.smartwatchModelMeta,
    site.smartwatchModelMeta
  );
  next.smartwatchCatalog = mergeSmartwatchCatalog(
    config.smartwatchCatalog,
    site.smartwatchCatalog
  );
  if (Array.isArray(site.homeFaq) && site.homeFaq.length) {
    next.homeFaq = Array.isArray(config.homeFaq) && config.homeFaq.length
      ? config.homeFaq
      : site.homeFaq;
  }
  if (Array.isArray(site.homeReviews) && site.homeReviews.length) {
    next.homeReviews = Array.isArray(config.homeReviews) && config.homeReviews.length
      ? config.homeReviews
      : site.homeReviews;
  }
  if (site.products?.length) {
    next.products = mergeSiteCatalogProducts(config.products, site.products);
    const kit = next.products.find((p) => p.aggregated !== true && p.active !== false) || next.products[0];
    if (kit && next.product) {
      next.product = {
        ...next.product,
        name: kit.name,
        nameEn: kit.nameEn || next.product.nameEn,
        nameIt: kit.nameIt || next.product.nameIt,
        description: kit.description,
        descriptionEn: kit.descriptionEn || next.product.descriptionEn,
        descriptionIt: kit.descriptionIt || next.product.descriptionIt,
        price: kit.price,
        image: kit.image
      };
    }
  }
  return next;
}

let siteCatalogCache = null;
let siteCatalogCachedAt = 0;

async function fetchSiteCatalog() {
  if (siteCatalogCache && Date.now() - siteCatalogCachedAt < 60000) {
    return siteCatalogCache;
  }
  for (const baseUrl of SITE_CATALOG_URLS) {
    try {
      const url = baseUrl + (baseUrl.includes('?') ? '&' : '?') + '_=' + Date.now();
      const res = await fetch(url, { cf: { cacheTtl: 0, cacheEverything: false } });
      if (!res.ok) continue;
      siteCatalogCache = await res.json();
      siteCatalogCachedAt = Date.now();
      return siteCatalogCache;
    } catch {
      /* próxima origem */
    }
  }
  return null;
}

async function getPublicConfig(env) {
  const config = await getConfig(env);
  const site = await fetchSiteCatalog();
  return mergeSiteCatalog(config, site);
}

function normalizeApiBaseUrl(api) {
  const merged = { ...(api || {}) };
  const url = String(merged.baseUrl || '').trim().replace(/\/$/, '');
  if (!url || url === LEGACY_API_BASE) merged.baseUrl = CANONICAL_API_BASE;
  return merged;
}

function mergeCoupons(stored, base) {
  const baseList = Array.isArray(base) ? base : [];
  const storedList = Array.isArray(stored) ? stored : [];
  if (!storedList.length) return [...baseList];
  const byCode = new Map(storedList.map((c) => [normalizeCouponCode(c.code), c]));
  baseList.forEach((c) => {
    const k = normalizeCouponCode(c.code);
    if (k && !byCode.has(k)) byCode.set(k, c);
  });
  return [...byCode.values()];
}

function mergeChannelEntry(baseEntry, storedEntry) {
  const base = baseEntry && typeof baseEntry === 'object' ? baseEntry : { enabled: true };
  const stored = storedEntry && typeof storedEntry === 'object' ? storedEntry : {};
  const out = {
    enabled: stored.enabled !== undefined ? stored.enabled !== false : base.enabled !== false
  };
  const url = String(stored.url || base.url || '').trim();
  if (url) out.url = url;
  return out;
}

function mergeChannelsConfig(stored, base) {
  const baseChannels = base?.channels || DEFAULT_CONFIG.channels;
  const raw = stored?.channels && typeof stored.channels === 'object' ? stored.channels : {};
  const mergeGroup = (groupKey) => {
    const baseGroup = baseChannels?.[groupKey] || {};
    const storedGroup = raw[groupKey] && typeof raw[groupKey] === 'object' ? raw[groupKey] : {};
    const keys = new Set([...Object.keys(baseGroup), ...Object.keys(storedGroup)]);
    const out = {};
    keys.forEach((key) => {
      out[key] = mergeChannelEntry(baseGroup[key], storedGroup[key]);
    });
    return out;
  };
  return {
    socials: mergeGroup('socials'),
    stores: mergeGroup('stores')
  };
}

function publicChannelsView(channels) {
  const src = channels || DEFAULT_CONFIG.channels;
  const mapGroup = (group) => {
    const out = {};
    Object.entries(group || {}).forEach(([key, entry]) => {
      out[key] = {
        enabled: entry?.enabled !== false,
        ...(entry?.url ? { url: entry.url } : {})
      };
    });
    return out;
  };
  return {
    socials: mapGroup(src.socials),
    stores: mapGroup(src.stores)
  };
}

function withConfigDefaults(stored) {
  const base = structuredClone(DEFAULT_CONFIG);
  if (!stored || typeof stored !== 'object') return base;

  return {
    ...base,
    ...stored,
    product: {
      ...base.product,
      ...(stored.product || {}),
      image: fixKitImageUrl(stored.product?.image || base.product.image)
    },
    pix: resolvePixConfig({ ...base.pix, ...(stored.pix || {}) }, base.pix),
    shipping: {
      ...base.shipping,
      ...(stored.shipping || {}),
      sender: { ...base.shipping.sender, ...(stored.shipping?.sender || {}) }
    },
    formsubmit: { ...base.formsubmit, ...(stored.formsubmit || {}) },
    emails: { ...base.emails, ...(stored.emails || {}) },
    api: normalizeApiBaseUrl({ ...base.api, ...(stored.api || {}) }),
    internationalShipping: normalizeIntlOtherInZones({
      ...base.internationalShipping,
      ...(stored.internationalShipping || {})
    }),
    internationalSurcharge: Number.isFinite(Number(stored.internationalSurcharge))
      ? Number(stored.internationalSurcharge)
      : base.internationalSurcharge,
    internationalShippingMultiplier: Number.isFinite(Number(stored.internationalShippingMultiplier))
      ? Math.max(1, Number(stored.internationalShippingMultiplier))
      : base.internationalShippingMultiplier,
    internationalProduct: { ...base.internationalProduct, ...(stored.internationalProduct || {}) },
    payments: {
      ...base.payments,
      ...(stored.payments || {}),
      paypal: mergePaypalConfig(base.payments?.paypal, stored.payments?.paypal),
      cardBr: mergeCardBrConfig(base.payments?.cardBr, stored.payments?.cardBr),
      pixBr: mergePixBrConfig(base.payments?.pixBr, stored.payments?.pixBr)
    },
    smartwatchModels: mergeSmartwatchModelLists(stored.smartwatchModels, base.smartwatchModels),
    smartwatchCatalog: mergeSmartwatchCatalog(stored.smartwatchCatalog, base.smartwatchCatalog),
    smartwatchModelMeta: stored.smartwatchModelMeta || base.smartwatchModelMeta || {},
    products: normalizeProducts(stored, base),
    shippingMethods: mergeShippingMethods(stored.shippingMethods),
    motoboyShipping: {
      ...DEFAULT_MOTOBOY_SHIPPING,
      ...(stored.motoboyShipping || {}),
      couriers: Array.isArray(stored.motoboyShipping?.couriers)
        ? stored.motoboyShipping.couriers
        : DEFAULT_MOTOBOY_SHIPPING.couriers
    },
    channels: mergeChannelsConfig(stored, base),
    coupons: mergeCoupons(stored.coupons, base.coupons),
    mlFlexShippingCost: Number(stored.mlFlexShippingCost) > 0
      ? Math.round(Number(stored.mlFlexShippingCost) * 100) / 100
      : base.mlFlexShippingCost,
    ...mergeKitCostConfig(stored, base)
  };
}

function kitCostNeedsSeed(raw) {
  const list = Array.isArray(raw?.components) ? raw.components : null;
  if (!list || !list.length) return true;
  return !list.some((c) => Number(c?.buyPrice) > 0);
}

function cloneKitComponents(list) {
  return (list || []).map((c) => ({ ...c }));
}

function upgradeKitCostV3(existing, seed) {
  const drop = new Set(['cut-service']);
  const byId = new Map((existing || []).filter((c) => c?.id && !drop.has(c.id)).map((c) => [c.id, { ...c }]));
  const overwriteIds = new Set([
    'film', 'sticker-cut', 'shipping-bag-sticker', 'kit-bag-sticker',
    'manual-sofit', 'promo-print', 'intl-envelope', 'intl-envelope-sticker', 'intl-sulfite'
  ]);
  (seed || []).forEach((s) => {
    if (!s?.id || drop.has(s.id)) return;
    if (!byId.has(s.id) || overwriteIds.has(s.id)) byId.set(s.id, { ...s });
  });
  return [...byId.values()];
}

function mergeKitCostConfig(stored, base) {
  const version = Number(stored?.kitCostVersion) || 0;
  const brSeed = base?.kitCost?.components || [];
  const intlSeed = base?.kitCostIntl?.components || [];
  let brComps;
  if (kitCostNeedsSeed(stored?.kitCost)) brComps = cloneKitComponents(brSeed);
  else if (version < 3) brComps = upgradeKitCostV3(normalizeKitCost(stored.kitCost).components, brSeed);
  else brComps = normalizeKitCost(stored.kitCost).components;
  const intlComps = (kitCostNeedsSeed(stored?.kitCostIntl) || version < 3)
    ? cloneKitComponents(intlSeed)
    : normalizeKitCost(stored.kitCostIntl).components;
  return {
    kitCost: { components: brComps },
    kitCostIntl: { components: intlComps },
    kitCostVersion: Math.max(version, 3)
  };
}

function normalizeKitCost(raw) {
  const list = Array.isArray(raw?.components) ? raw.components : (Array.isArray(raw) ? raw : null);
  if (!Array.isArray(list)) return { components: [] };
  return {
    components: list.map((c, i) => ({
      id: String(c?.id || `kit-comp-${i + 1}`).trim() || `kit-comp-${i + 1}`,
      name: String(c?.name || '').trim(),
      buyQty: Number(c?.buyQty) > 0 ? Number(c.buyQty) : 0,
      buyPrice: Number(c?.buyPrice) >= 0 ? Number(c.buyPrice) : 0,
      yieldQty: Number(c?.yieldQty) > 0 ? Number(c.yieldQty) : 1,
      useQty: Number(c?.useQty) >= 0 ? Number(c.useQty) : 0,
      notes: String(c?.notes || '').trim()
    })).filter((c) => c.name)
  };
}

function fixKitImageUrl(url) {
  const u = String(url || '').trim();
  if (!u || (/sensortattoofix/i.test(u) && !/\/site\//i.test(u))) {
    return 'https://www.sensortattoofix.com.br/images/brand/sensortattoofix.jpg';
  }
  return u;
}

function normalizeProducts(stored, base) {
  let products;
  if (stored?.products?.length) products = stored.products;
  else {
    const legacy = stored?.product || base.product;
    if (!legacy) return base.products || [];
    products = [{
      id: 'kit-sensor-tattoofix',
      slug: 'kit-sensor-tattoofix',
      name: legacy.name,
      description: legacy.description,
      price: legacy.price,
      image: legacy.image,
      active: true,
      requiresSmartwatch: true,
      weightGrams: 3
    }];
  }
  return products.map((p) => (p?.aggregated ? p : { ...p, image: fixKitImageUrl(p.image) }));
}

function shippingWeightGrams(config, override) {
  const ship = config?.shipping || DEFAULT_CONFIG.shipping;
  const n = Number(override ?? ship.weightGrams);
  return Number.isFinite(n) && n > 0 ? n : 5;
}

function getActiveProducts(config) {
  const list = config.products?.length ? config.products : normalizeProducts({}, { product: config.product });
  return list.filter((p) => p.active !== false && productInStock(p, 1));
}

function productStockQty(p) {
  if (p?.stock == null || p.stock === '') return null;
  const n = Number(p.stock);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.floor(n));
}

function productInStock(p, qty = 1) {
  const stock = productStockQty(p);
  if (stock == null) return true;
  return stock >= Math.max(1, Number(qty) || 1);
}

function assertOrderStock(config, items) {
  const products = config.products || [];
  for (const item of items) {
    const p = products.find((x) => x.id === item.productId || x.slug === item.productId);
    if (!p) continue;
    const stock = productStockQty(p);
    if (stock == null) continue;
    const qty = Math.max(1, Number(item.qty) || 1);
    if (stock < qty) {
      const name = p.name || item.name || 'Produto';
      throw new Error(
        stock === 0
          ? `${name} está esgotado.`
          : `Estoque insuficiente para ${name}. Disponível: ${stock}.`
      );
    }
  }
}

async function decrementOrderStock(env, order) {
  if (order.stockDecremented) return;
  const items = order.items || [];
  if (!items.length) return;

  const config = await getConfig(env);
  if (!config.products?.length) return;

  let changed = false;
  const products = config.products.map((p) => ({ ...p }));
  const byKey = new Map();
  products.forEach((p) => {
    if (p.id) byKey.set(p.id, p);
    if (p.slug) byKey.set(p.slug, p);
  });

  for (const item of items) {
    const p = byKey.get(item.productId) || byKey.get(item.slug);
    if (!p) continue;
    const stock = productStockQty(p);
    if (stock == null) continue;
    const qty = Math.max(1, Number(item.qty) || 1);
    if (stock < qty) {
      order.stockWarning = order.stockWarning || [];
      order.stockWarning.push(`${p.name || item.name}: pedido ${qty}, estoque ${stock}`);
      console.warn('Stock insufficient at payment:', order.orderId, p.name, stock, qty);
    }
    const deduct = Math.min(qty, stock);
    if (deduct <= 0) continue;
    p.stock = stock - deduct;
    if (p.stock === 0) p.active = false;
    changed = true;
  }

  if (!changed) return;
  await saveConfig(env, { ...config, products });
  order.stockDecremented = true;
}

function resolveOrderItems(config, body) {
  const products = getActiveProducts(config);
  if (!products.length) throw new Error('Nenhum produto disponível na loja.');

  let items;
  if (Array.isArray(body.items) && body.items.length) {
    items = body.items.map((item) => {
      const p = products.find((x) => x.id === item.productId || x.slug === item.productId);
      if (!p) throw new Error('Produto não encontrado ou indisponível.');
      const qty = Math.max(1, Math.min(10, Number(item.qty) || 1));
      return {
        productId: p.id,
        slug: p.slug,
        name: p.name,
        price: Number(p.price) || 0,
        qty,
        aggregated: p.aggregated === true,
        requiresSmartwatch: p.requiresSmartwatch !== false,
        deviceType: p.deviceType || null,
        weightGrams: Number(p.weightGrams) || shippingWeightGrams(config)
      };
    });
  } else {
    const pick = body.productId || body.productSlug || products[0].id;
    const p = products.find((x) => x.id === pick || x.slug === pick) || products[0];
    items = [{
      productId: p.id,
      slug: p.slug,
      name: p.name,
      price: Number(p.price) || 0,
      qty: Math.max(1, Math.min(10, Number(body.qty) || 1)),
      aggregated: p.aggregated === true,
      requiresSmartwatch: p.requiresSmartwatch !== false,
      deviceType: p.deviceType || null,
      weightGrams: Number(p.weightGrams) || shippingWeightGrams(config)
    }];
  }

  assertOrderStock(config, items);

  const isIntl = (body.paisCode || 'BR') !== 'BR';
  const isDocument = body.shipmentType === 'documento' || !!body.internationalLensOnly;
  if (isIntl && isDocument) {
    const hasAggregated = items.some((i) => i.aggregated === true);
    if (hasAggregated) {
      throw new Error('Carta/documento internacional não permite películas ou pulseiras. Remova os acessórios ou escolha envio em encomenda.');
    }
  }

  return items;
}

function orderRequiresSmartwatch(items) {
  return items.some((i) => i.requiresSmartwatch !== false);
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function uint8ToB64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function b64ToUint8(b64) {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const hash = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return { salt: uint8ToB64(salt), hash: uint8ToB64(new Uint8Array(hash)) };
}

async function verifyPassword(password, saltB64, hashB64) {
  const salt = b64ToUint8(saltB64);
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const hash = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  const expected = b64ToUint8(hashB64);
  const actual = new Uint8Array(hash);
  if (expected.length !== actual.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected[i] ^ actual[i];
  return diff === 0;
}

async function getUserById(env, userId) {
  const raw = await env.STORE_KV.get('user:' + userId);
  return raw ? JSON.parse(raw) : null;
}

async function getUserByEmail(env, email) {
  const id = await env.STORE_KV.get('user:email:' + normalizeEmail(email));
  if (!id) return null;
  return getUserById(env, id);
}

async function saveUser(env, user) {
  await kvPut(env, 'user:' + user.userId, JSON.stringify(user));
  await kvPut(env, 'user:email:' + normalizeEmail(user.email), user.userId);
}

async function kvPut(env, key, value, options) {
  try {
    if (options) await env.STORE_KV.put(key, value, options);
    else await env.STORE_KV.put(key, value);
    await bumpKvWriteCounter(1);
    return true;
  } catch (err) {
    if (isKvQuotaError(err)) await markKvWriteQuotaExhausted();
    throw err;
  }
}

async function kvPutSafe(env, key, value, options) {
  try {
    await kvPut(env, key, value, options);
    return true;
  } catch (err) {
    console.error('KV put failed:', key, err?.message || err);
    return false;
  }
}

/** Checkout has absolute priority. Auto marketplace sync pauses when KV writes are tight. */
async function marketplaceKvAllowsSync(env) {
  if (await isKvWriteQuotaExhaustedMarked()) return false;
  try {
    const budget = await buildKvDailyWriteBudget(env);
    if (budget?.exhausted) return false;
    if (budget?.critical) return false;
    if (Number(budget?.percent) >= 80) return false;
  } catch (err) {
    console.warn('KV budget for marketplace sync:', err.message || err);
    return false;
  }
  return true;
}

function marketplaceSaleUnchanged(existing, next) {
  if (!existing || !next) return false;
  const keys = [
    'status', 'gross', 'fees', 'shippingCost', 'refunds', 'otherFees',
    'net', 'payoutNet', 'settlementVersion', 'shopeeIncomeOk', 'financesOk',
    'soldAt', 'hasRefund', 'dateLastUpdated'
  ];
  for (const k of keys) {
    const a = existing[k];
    const b = next[k];
    if (Number.isFinite(Number(a)) && Number.isFinite(Number(b)) && a !== '' && b !== '') {
      if (Math.abs(Number(a) - Number(b)) > 0.009) return false;
      continue;
    }
    if (String(a ?? '') !== String(b ?? '')) return false;
  }
  return true;
}

async function kvDelete(env, key) {
  try {
    await env.STORE_KV.delete(key);
    await bumpKvWriteCounter(1);
    return true;
  } catch (err) {
    if (isKvQuotaError(err)) await markKvWriteQuotaExhausted();
    throw err;
  }
}

async function kvDeleteSafe(env, key) {
  try {
    await kvDelete(env, key);
    return true;
  } catch (err) {
    console.error('KV delete failed:', key, err?.message || err);
    return false;
  }
}


function customerSessionCacheReq(token) {
  return new Request('https://stf-internal/customerSession/' + encodeURIComponent(token));
}

async function putCustomerSessionCache(token, userId) {
  try {
    await caches.default.put(
      customerSessionCacheReq(token),
      new Response(userId, {
        headers: {
          'Content-Type': 'text/plain',
          'Cache-Control': 'max-age=' + CUSTOMER_SESSION_TTL
        }
      })
    );
    return true;
  } catch (err) {
    console.error('session cache put:', err?.message || err);
    return false;
  }
}

async function createCustomerSession(env, userId) {
  const token = crypto.randomUUID();
  const ok = await kvPutSafe(env, 'customerSession:' + token, userId, { expirationTtl: CUSTOMER_SESSION_TTL });
  if (ok) return token;
  // Free-tier KV write quota exhausted: keep login alive via Cache API until midnight UTC reset.
  if (await putCustomerSessionCache(token, userId)) return token;
  const err = new Error('LOGIN_STORAGE_UNAVAILABLE');
  err.code = 'LOGIN_STORAGE_UNAVAILABLE';
  throw err;
}

async function getCustomerUserId(env, token) {
  if (!token) return null;
  const fromKv = await env.STORE_KV.get('customerSession:' + token);
  if (fromKv) return fromKv;
  try {
    const hit = await caches.default.match(customerSessionCacheReq(token));
    if (!hit) return null;
    return (await hit.text()) || null;
  } catch {
    return null;
  }
}

async function linkOrderToUser(env, userId, orderId) {
  const key = 'user:' + userId + ':orders';
  try {
    const list = JSON.parse((await env.STORE_KV.get(key)) || '[]');
    if (!list.includes(orderId)) {
      list.unshift(orderId);
      await kvPutSafe(env, key, JSON.stringify(list.slice(0, 500)));
    }
  } catch (err) {
    console.warn('linkOrderToUser KV:', err.message);
  }
}

function publicUserView(user) {
  return {
    userId: user.userId,
    nome: user.nome,
    email: user.email,
    telefone: user.telefone,
    cpf: user.cpf || '',
    address: user.address || null,
    username: user.username || '',
    avatarId: user.avatarId || '',
    isTester: !!user.isTester
  };
}

function normalizeUserAddress(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const cep = String(raw.cep || '').replace(/\D/g, '');
  const rua = String(raw.rua || '').trim();
  const numero = String(raw.numero || '').trim();
  const complemento = String(raw.complemento || '').trim();
  const bairro = String(raw.bairro || '').trim();
  const cidade = String(raw.cidade || '').trim();
  const uf = String(raw.uf || '').trim().toUpperCase().slice(0, 2);
  if (!rua && !cep && !cidade) return null;
  return { cep, rua, numero, complemento, bairro, cidade, uf };
}

function mergePaypalConfig(basePaypal, storedPaypal) {
  return { ...basePaypal, ...(storedPaypal || {}) };
}

function mergePaymentProviderConfig(baseCfg, storedCfg, defaultProvider) {
  const base = baseCfg || {};
  const stored = storedCfg || {};
  const resolveProvider = (p) => (p === 'mercadopago' ? 'mercadopago' : p === 'asaas' ? 'asaas' : null);
  const provider = resolveProvider(stored.provider) || resolveProvider(base.provider) || defaultProvider;
  const fallback = stored.fallbackToAlternate !== undefined
    ? stored.fallbackToAlternate !== false
    : (stored.fallbackToMercadoPago !== undefined
      ? stored.fallbackToMercadoPago !== false
      : (base.fallbackToAlternate !== undefined
        ? base.fallbackToAlternate !== false
        : base.fallbackToMercadoPago !== false));
  return { provider, fallbackToAlternate: fallback };
}

function mergeCardBrConfig(baseCardBr, storedCardBr) {
  return mergePaymentProviderConfig(
    baseCardBr || DEFAULT_CONFIG.payments.cardBr,
    storedCardBr,
    'asaas'
  );
}

function mergePixBrConfig(basePixBr, storedPixBr) {
  return mergePaymentProviderConfig(
    basePixBr || DEFAULT_CONFIG.payments.pixBr,
    storedPixBr,
    'mercadopago'
  );
}

function getCardBrProvider(config) {
  return config?.payments?.cardBr?.provider === 'mercadopago' ? 'mercadopago' : 'asaas';
}

function getPixBrProvider(config) {
  return config?.payments?.pixBr?.provider === 'asaas' ? 'asaas' : 'mercadopago';
}

function cardBrFallbackEnabled(config) {
  const cfg = config?.payments?.cardBr || {};
  if (cfg.fallbackToAlternate !== undefined) return cfg.fallbackToAlternate !== false;
  return cfg.fallbackToMercadoPago !== false;
}

function pixBrFallbackEnabled(config) {
  return config?.payments?.pixBr?.fallbackToAlternate !== false;
}

function isInternationalPayPalAvailable(config) {
  const paypal = config.payments?.paypal || {};
  return paypal.internationalEnabled !== false;
}

function isBrazilPayPalAvailable(config) {
  const paypal = config.payments?.paypal || {};
  return paypal.brazilEnabled !== false;
}

function isPixConfigValid(pix) {
  if (!pix) return false;
  const key = String(pix.key || '').trim();
  if (!key) return false;
  const type = pix.keyType || 'cnpj';
  const digits = key.replace(/\D/g, '');
  if (key.includes('@')) return type === 'email';
  if (type === 'cnpj') return digits.length === 14;
  if (type === 'cpf') return digits.length === 11;
  if (type === 'phone') return digits.length >= 10;
  if (type === 'email') return key.includes('@');
  return true;
}

/** PIX reserva: se a chave salva for inválida, usa o cadastro padrão (não quebra o checkout). */
function resolvePixConfig(pix, fallback = DEFAULT_CONFIG.pix) {
  const fb = fallback || DEFAULT_CONFIG.pix;
  const merged = {
    key: String(pix?.key || '').trim() || fb.key,
    keyType: pix?.keyType || fb.keyType,
    merchantName: String(pix?.merchantName || '').trim() || fb.merchantName,
    merchantCity: String(pix?.merchantCity || '').trim() || fb.merchantCity
  };
  return isPixConfigValid(merged) ? merged : { ...fb };
}

function publicProductFields(p, config) {
  const row = {
    id: p.id,
    slug: p.slug,
    name: p.name,
    description: p.description,
    price: p.price,
    image: p.image,
    active: p.active !== false,
    requiresSmartwatch: p.requiresSmartwatch !== false,
    weightGrams: Number(p.weightGrams) || shippingWeightGrams(config),
    aggregated: p.aggregated === true
  };
  if (p.nameEn) row.nameEn = p.nameEn;
  if (p.nameIt) row.nameIt = p.nameIt;
  if (p.descriptionEn) row.descriptionEn = p.descriptionEn;
  if (p.descriptionIt) row.descriptionIt = p.descriptionIt;
  if (p.packaging) row.packaging = p.packaging;
  if (p.compatibility) row.compatibility = p.compatibility;
  if (p.compatibleWatchModels?.length) row.compatibleWatchModels = p.compatibleWatchModels;
  if (p.sensorMm != null) row.sensorMm = Number(p.sensorMm);
  if (p.productType) row.productType = p.productType;
  if (p.bandStyle) row.bandStyle = p.bandStyle;
  if (p.color) row.color = p.color;
  if (p.colorEn) row.colorEn = p.colorEn;
  if (Array.isArray(p.markets) && p.markets.length) row.markets = p.markets;
  if (Array.isArray(p.images) && p.images.length) row.images = p.images;
  if (p.priceUsd != null) row.priceUsd = Number(p.priceUsd);
  if (p.priceEur != null) row.priceEur = Number(p.priceEur);
  const stock = productStockQty(p);
  row.inStock = productInStock(p, 1);
  if (stock != null) row.stock = stock;
  return row;
}

function publicConfigView(config, env) {
  const products = getActiveProducts(config).map((p) => publicProductFields(p, config));
  const primary = products.find((p) => !p.aggregated) || products[0] || config.product;
  const paypal = config.payments?.paypal || {};
  const { clientId } = paypalCredentials(env);
  const stripe = stripeCredentials(env);
  return {
    product: primary ? {
      name: primary.name,
      nameEn: primary.nameEn,
      nameIt: primary.nameIt,
      description: primary.description,
      descriptionEn: primary.descriptionEn,
      descriptionIt: primary.descriptionIt,
      price: primary.price,
      image: primary.image
    } : config.product,
    products,
    pix: resolvePixConfig(config.pix, DEFAULT_CONFIG.pix),
    shipping: {
      originCep: config.shipping?.originCep || DEFAULT_CONFIG.shipping.originCep,
      weightGrams: shippingWeightGrams(config)
    },
    internationalShipping: config.internationalShipping || {},
    internationalCountries: publicIntlCountriesList(config.internationalShipping || {}),
    internationalSurcharge: getIntlSurcharge(config),
    internationalShippingMultiplier: getIntlShippingMultiplier(config),
    internationalProduct: config.internationalProduct || DEFAULT_CONFIG.internationalProduct,
    payments: {
      intlEmbedded: true,
      paypal: {
        internationalEnabled: paypal.internationalEnabled !== false,
        brazilEnabled: paypal.brazilEnabled !== false,
        clientId: clientId || null
      },
      stripe: {
        // Hide Stripe on the storefront until live keys are installed.
        enabled: stripeLiveReady(env),
        publishableKey: stripeLiveReady(env) ? (stripe.publishableKey || null) : null
      },
      cardBr: {
        provider: getCardBrProvider(config)
      },
      pixBr: {
        provider: getPixBrProvider(config)
      }
    },
    smartwatchModels: config.smartwatchModels || DEFAULT_CONFIG.smartwatchModels,
    smartwatchCatalog: config.smartwatchCatalog || {},
    smartwatchModelMeta: config.smartwatchModelMeta || {},
    homeFaq: Array.isArray(config.homeFaq) ? config.homeFaq.filter((r) => r && r.active !== false) : [],
    homeReviews: Array.isArray(config.homeReviews) ? config.homeReviews.filter((r) => r && r.active !== false) : [],
    formsubmit: {
      email: config.formsubmit?.email || DEFAULT_CONFIG.formsubmit.email,
      subject: config.formsubmit?.subject || DEFAULT_CONFIG.formsubmit.subject
    },
    whatsapp: config.whatsapp || DEFAULT_CONFIG.whatsapp,
    siteUrl: config.siteUrl || DEFAULT_CONFIG.siteUrl,
    api: { baseUrl: config.api?.baseUrl || DEFAULT_CONFIG.api.baseUrl },
    channels: publicChannelsView(config.channels),
    integrations: {
      addressAutocomplete: true
    },
    updatedAt: config.updatedAt || null
  };
}

const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_LOCKOUT_SEC = 1800;

function corsHeaders(origin) {
  const allowed = isAllowedSiteOrigin(origin);
  const headers = {
    'Access-Control-Allow-Methods': 'GET, PUT, PATCH, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, asaas-access-token',
    'Access-Control-Max-Age': '86400'
  };
  if (allowed) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

function isAllowedSiteOrigin(origin) {
  return !!(origin && ALLOWED_ORIGINS.includes(origin));
}

function isAllowedSiteRequest(request) {
  const origin = request.headers.get('Origin') || '';
  if (isAllowedSiteOrigin(origin)) return true;
  const referer = request.headers.get('Referer') || '';
  if (ALLOWED_ORIGINS.some((o) => referer.startsWith(o))) return true;
  const fwdHost = (request.headers.get('X-Forwarded-Host') || request.headers.get('Host') || '').toLowerCase();
  return fwdHost === 'sensortattoofix.com.br' || fwdHost === 'www.sensortattoofix.com.br'
    || fwdHost === 'sensortattoofix.com' || fwdHost === 'www.sensortattoofix.com';
}

function isComSiteRequest(request) {
  const origin = request.headers.get('Origin') || '';
  const referer = request.headers.get('Referer') || '';
  const hay = origin + ' ' + referer;
  if (/sensortattoofix\.com\.br/i.test(hay)) return false;
  return /sensortattoofix\.com/i.test(hay);
}

function isIntlCheckoutLocale(locale) {
  const l = String(locale || '').toLowerCase();
  return l === 'en' || l === 'it';
}

/** True when the destination is abroad even if paisCode was wrongly saved as BR. */
function orderLooksInternationalDestination(order) {
  const code = String(order?.paisCode || '').trim().toUpperCase();
  if (code && code !== 'BR' && code !== 'OTHER' && code !== 'XX' && code !== 'T1') return true;
  if (isIntlCheckoutLocale(order?.checkoutLocale)) return true;
  if (order?.internationalLensOnly) return true;
  if (order?.shipmentType === 'documento' || order?.shipmentType === 'encomenda') return true;
  if (String(order?.shippingMethodId || '').startsWith('int-')) return true;
  if (/internacional|international/i.test(String(order?.pais || ''))) return true;
  if (/internacional|international|exporta\s*f[aá]cil|documento\s+intern/i.test(String(order?.shippingService || ''))) {
    return true;
  }
  if (inferPaisCodeFromName(order?.pais)) return true;
  const cepDigits = String(order?.cep || '').replace(/\D/g, '');
  // CEP BR tem 8 dígitos; CEP/postal estrangeiro costuma ter outro tamanho.
  if (cepDigits && cepDigits.length !== 8) {
    if (inferPaisCodeFromName(order?.pais) || /austr|eua|usa|united|ital|espan|portug|fran[cç]|german|canad|mexic|japan|new zealand|irland/i.test(String(order?.pais || '') + ' ' + String(order?.endereco || ''))) {
      return true;
    }
    if (cepDigits.length >= 3 && cepDigits.length <= 7) return true;
  }
  return false;
}

const PAIS_NAME_TO_ISO = {
  australia: 'AU',
  'united states': 'US', 'estados unidos': 'US', eua: 'US', usa: 'US', america: 'US',
  canada: 'CA',
  'united kingdom': 'GB', uk: 'GB', england: 'GB', 'reino unido': 'GB',
  italy: 'IT', italia: 'IT',
  portugal: 'PT', spain: 'ES', espanha: 'ES', france: 'FR', franca: 'FR',
  germany: 'DE', alemanha: 'DE', netherlands: 'NL', 'paises baixos': 'NL', belgium: 'BE', belgica: 'BE',
  ireland: 'IE', irlanda: 'IE', 'new zealand': 'NZ', 'nova zelandia': 'NZ',
  japan: 'JP', japao: 'JP', mexico: 'MX', argentina: 'AR', chile: 'CL',
  colombia: 'CO', peru: 'PE', uruguay: 'UY', uruguai: 'UY', paraguay: 'PY', paraguai: 'PY',
  slovenia: 'SI', eslovenia: 'SI'
};

function stripDiacritics(s) {
  return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function inferPaisCodeFromName(pais) {
  const raw = stripDiacritics(String(pais || '').trim().toLowerCase());
  if (!raw || raw === 'brasil' || raw === 'brazil') return null;
  if (PAIS_NAME_TO_ISO[raw]) return PAIS_NAME_TO_ISO[raw];
  for (const [name, iso] of Object.entries(PAIS_NAME_TO_ISO)) {
    const normName = stripDiacritics(name);
    if (raw.includes(normName) || normName.includes(raw)) return iso;
  }
  return null;
}

/** Completa paisCode / shipmentType / endereço estruturado em pedidos antigos. */
function hydrateIntlOrderFields(order) {
  if (!order) return { changed: false };
  let changed = false;
  const code = String(order.paisCode || '').trim().toUpperCase();
  if (!code || code === 'BR' || code === 'OTHER' || code === 'XX' || code === 'T1') {
    const inferred = inferPaisCodeFromName(order.pais)
      || inferPaisCodeFromName(order.endereco)
      || null;
    if (inferred) {
      order.paisCode = inferred;
      changed = true;
    }
  }
  if (!order.shipmentType) {
    const hay = `${order.shippingService || ''} ${order.shippingMethodId || ''}`.toLowerCase();
    if (/documento|carta|lens\s*only|lente/.test(hay) || order.internationalLensOnly) {
      order.shipmentType = 'documento';
      changed = true;
    } else if (/encomenda|exporta|packet|mercadoria/.test(hay)) {
      order.shipmentType = 'encomenda';
      changed = true;
    } else if (String(order.shippingMethodId || '').includes('documento')) {
      order.shipmentType = 'documento';
      changed = true;
    } else if (String(order.shippingMethodId || '').includes('encomenda')) {
      order.shipmentType = 'encomenda';
      changed = true;
    }
  }
  if (!order.shippingMethodId) {
    if (order.shipmentType === 'documento') {
      order.shippingMethodId = 'int-documento';
      changed = true;
    } else if (order.shipmentType === 'encomenda') {
      order.shippingMethodId = 'int-encomenda';
      changed = true;
    }
  }

  const parsed = parseIntlAddressFromOrder(order);
  if (parsed) {
    for (const key of ['rua', 'numero', 'complemento', 'bairro', 'cidade', 'uf', 'cep']) {
      if ((!order[key] || String(order[key]).trim() === '') && parsed[key]) {
        order[key] = parsed[key];
        changed = true;
      }
    }
  }
  return { changed };
}

/**
 * Extrai campos de endereços internacionais salvos só em `endereco` (pedidos antigos).
 * Exemplos:
 * - "8 Davey Street, Brisbane — Queensland, Austrália, CEP 4123"
 * - "8 Davey Street — Brisbane, Queensland — Austrália 4123"
 */
function parseIntlAddressFromOrder(order) {
  const blob = String(order.endereco || '').replace(/\s+/g, ' ').trim();
  if (!blob) return null;
  const out = {};
  const cepMatch = blob.match(/\bCEP[:\s]*([A-Z0-9][A-Z0-9 \-]{2,12})\b/i)
    || blob.match(/\b(\d{4})\s*$/)
    || blob.match(/\b(\d{5}(?:-\d{4})?|[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})\s*$/i);
  if (cepMatch) out.cep = String(cepMatch[1] || cepMatch[0]).replace(/^CEP[:\s]*/i, '').trim();

  const streetNum = blob.match(/^(\d+[A-Za-z]?)\s+([^,—\-]+)/)
    || blob.match(/^([^,]+?),\s*(\d+[A-Za-z]?)\b/);
  if (streetNum) {
    if (/^\d/.test(streetNum[1])) {
      out.numero = streetNum[1].slice(0, 6);
      out.rua = streetNum[2].trim().slice(0, 50);
    } else {
      out.rua = streetNum[1].trim().slice(0, 50);
      out.numero = streetNum[2].slice(0, 6);
    }
  } else {
    const first = blob.split(/[,—\-]/)[0]?.trim();
    if (first) out.rua = first.slice(0, 50);
  }

  // " — Brisbane, Queensland — Austrália 4123"
  const cityState = blob.match(/[—\-]\s*([^,—\-]+),\s*([^,—\-]+)\s*[—\-]/)
    || blob.match(/,\s*([^,—\-]+)\s*[—\-]\s*([^,]+)/)
    || blob.match(/,\s*([A-Za-zÀ-ÿ\s]+),\s*([A-Za-zÀ-ÿ\s]{2,})/);
  if (cityState) {
    out.cidade = cityState[1].trim().slice(0, 30);
    const st = cityState[2].trim();
    out.uf = st.replace(/\b(austr[aá]lia|brasil|italy|it[aá]lia|usa|eua|canada|canad[aá]|portugal|espanha|fran[cç]a)\b/ig, '').trim().slice(0, 30);
  }

  if (!out.cidade) {
    const m = blob.match(/\b(Brisbane|Sydney|Melbourne|London|Rome|Roma|Milan|Milano|New York|Los Angeles|Toronto|Lisbon|Lisboa|Madrid|Paris|Berlin)\b/i);
    if (m) out.cidade = m[1].slice(0, 30);
  }
  if (!out.uf) {
    const m = blob.match(/\b(Queensland|NSW|VIC|QLD|WA|SA|TAS|ACT|NT|California|Texas|Florida|England|Lazio|Lombardia)\b/i);
    if (m) out.uf = m[1].slice(0, 30);
  }
  if (!out.bairro && out.cidade) out.bairro = out.cidade;
  return Object.keys(out).length ? out : null;
}

function productIntlUsd(product) {
  const v = Number(product?.priceUsd);
  return Number.isFinite(v) && v > 0 ? v : null;
}

function productIntlEur(product) {
  const v = Number(product?.priceEur);
  return Number.isFinite(v) && v > 0 ? v : null;
}

function isIntlMarketProductRow(p) {
  const m = Array.isArray(p?.markets) ? p.markets.map((x) => String(x).toUpperCase()) : [];
  return m.includes('INT') && !m.includes('BR');
}

async function syncIntlProductPricesFromFx(env) {
  const config = await getConfig(env);
  const products = config.products || [];
  if (!products.length) return { updated: 0 };
  const fxUsd = await fetchFxRate(env, 'USD');
  const fxEur = await fetchFxRate(env, 'EUR');
  let updated = 0;
  products.forEach((p) => {
    if (!isIntlMarketProductRow(p)) return;
    const brl = Number(p.price) || 0;
    if (!brl) return;
    const usd = Math.round(brl * fxUsd.rate * 100) / 100;
    const eur = Math.round(brl * fxEur.rate * 100) / 100;
    if (p.priceUsd !== usd || p.priceEur !== eur) {
      p.priceUsd = usd;
      p.priceEur = eur;
      updated += 1;
    }
  });
  if (updated) await saveConfig(env, { ...config, products });
  return { updated, usdRate: fxUsd.rate, eurRate: fxEur.rate };
}

async function intlForeignCharge(order, env, config, items, currency) {
  const cur = String(currency || 'USD').toUpperCase();
  const fx = await fetchFxRate(env, cur);
  const itemList = items || order.items || [];
  const products = getActiveProducts(config || await getConfig(env));
  let productForeign = 0;
  let allConfigured = itemList.length > 0;
  for (const item of itemList) {
    const p = products.find((x) => x.id === item.productId || x.slug === item.productId);
    const price = p ? (cur === 'EUR' ? productIntlEur(p) : productIntlUsd(p)) : null;
    if (price == null) { allConfigured = false; break; }
    productForeign += price * (Number(item.qty) || 1);
  }
  let amount;
  if (allConfigured && itemList.length) {
    const brlProducts = itemList.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.qty) || 1), 0);
    const couponDisc = Number(order.couponDiscount) || 0;
    const ratio = brlProducts > 0 ? Math.max(0, (brlProducts - couponDisc) / brlProducts) : 1;
    amount = Math.round(productForeign * ratio * 100) / 100;
    const frete = Number(order.frete) || 0;
    if (frete > 0) amount = Math.round((amount + frete * fx.rate) * 100) / 100;
  } else {
    const brl = Number(order.total) || 0;
    amount = Math.round(brl * fx.rate * 100) / 100;
  }
  if (isSelfTestOrder(order)) {
    const stripe = order.selfTestStripe || order.paymentProvider === 'stripe';
    if (cur === 'EUR') {
      const minEur = stripe ? SELF_TEST_STRIPE_EUR_AMOUNT : SELF_TEST_EUR_AMOUNT;
      if (amount < minEur) amount = minEur;
    } else {
      const minUsd = stripe ? SELF_TEST_STRIPE_USD_AMOUNT : SELF_TEST_USD_AMOUNT;
      if (amount < minUsd) amount = minUsd;
    }
  }
  return { currency: cur, amount, amountCents: Math.round(amount * 100), fxRate: fx.rate };
}

async function intlUsdCharge(order, env, config, items) {
  return intlForeignCharge(order, env, config, items, 'USD');
}

function intlChargeCurrencyForLocale(locale) {
  return String(locale || '').toLowerCase() === 'it' ? 'EUR' : 'USD';
}

function selfTestUsdAmountForOrder(order, billingType) {
  if (billingType === 'STRIPE' || order?.selfTestStripe || order?.paymentProvider === 'stripe') {
    return SELF_TEST_STRIPE_USD_AMOUNT;
  }
  return SELF_TEST_USD_AMOUNT;
}

/** Brazil test → R$ 0.01. Abroad PayPal → US$ 0.01. Abroad Stripe → US$ 0.10. */
function applySelfTestChargeCurrency(order, { intlUsd, billingType }) {
  if (!isSelfTestOrder(order)) return;
  if (intlUsd) {
    const cur = intlChargeCurrencyForLocale(order.checkoutLocale);
    const amount = cur === 'EUR'
      ? ((billingType === 'STRIPE' || order?.selfTestStripe || order?.paymentProvider === 'stripe')
        ? SELF_TEST_STRIPE_EUR_AMOUNT
        : SELF_TEST_EUR_AMOUNT)
      : selfTestUsdAmountForOrder(order, billingType);
    order.chargeCurrency = cur;
    order.chargeAmount = amount;
    order.displayCurrency = cur;
    return;
  }
  if (order.chargeCurrency === 'USD' || order.chargeCurrency === 'EUR') {
    delete order.chargeCurrency;
    delete order.chargeAmount;
    delete order.chargeFxRate;
  }
  order.displayCurrency = 'BRL';
}

function stripeCredentials(env) {
  return {
    secretKey: String(env.STRIPE_SECRET_KEY || '').trim(),
    publishableKey: String(env.STRIPE_PUBLISHABLE_KEY || '').trim(),
    webhookSecret: String(env.STRIPE_WEBHOOK_SECRET || '').trim()
  };
}

function stripeConfigured(env) {
  const { secretKey, publishableKey } = stripeCredentials(env);
  return !!(secretKey && publishableKey);
}

/** Production-ready Stripe only — never expose test keys on the live storefront. */
function stripeLiveReady(env) {
  const { secretKey, publishableKey } = stripeCredentials(env);
  return /^sk_live_/.test(secretKey) && /^pk_live_/.test(publishableKey);
}

function stripeKeyMode(env) {
  const { secretKey, publishableKey } = stripeCredentials(env);
  if (/^sk_test_/.test(secretKey) || /^pk_test_/.test(publishableKey)) return 'test';
  if (/^sk_live_/.test(secretKey) && /^pk_live_/.test(publishableKey)) return 'live';
  if (secretKey || publishableKey) return 'unknown';
  return 'none';
}

function isValidClickLogKey(body, env) {
  const key = String(body?.log_key || '').trim();
  if (!key) return false;
  const expected = String(env?.CLICK_LOG_KEY || CLICK_LOG_KEY_FALLBACK).trim();
  return key === expected;
}

function resolveRequestOrigin(request) {
  const origin = request.headers.get('Origin') || '';
  if (isAllowedSiteOrigin(origin)) return origin;
  const referer = request.headers.get('Referer') || '';
  const fromRef = ALLOWED_ORIGINS.find((o) => referer.startsWith(o));
  return fromRef || ALLOWED_ORIGINS[0];
}

function clientIp(request) {
  return request.headers.get('CF-Connecting-IP') ||
    (request.headers.get('X-Forwarded-For') || '').split(',')[0].trim() ||
    'unknown';
}

function extractClickGeo(request) {
  const cf = request.cf || {};
  const pais = String(cf.country || request.headers.get('CF-IPCountry') || '').trim().toUpperCase().slice(0, 12);
  const regionCode = String(cf.regionCode || '').trim().slice(0, 12);
  const regionName = String(cf.region || '').trim().slice(0, 48);
  const estado = (regionCode || regionName).slice(0, 48);
  const cidade = String(cf.city || '').trim().slice(0, 48);
  let paisNome = '';
  if (pais) {
    try {
      paisNome = new Intl.DisplayNames(['pt-BR'], { type: 'region' }).of(pais) || pais;
    } catch {
      paisNome = pais;
    }
  }
  return { pais, pais_nome: paisNome.slice(0, 48), estado, cidade };
}

function generateOrderId() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  const suffix = crypto.randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase();
  return `STF-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${suffix}`;
}

function orderTrackingCode(order) {
  return String(order?.correiosTrackingCode || order?.superfreteTrackingCode || '').trim().toUpperCase() || null;
}

function publicOrderView(order, { includePayment = false, includeResumeToken = false } = {}) {
  const trackingCode = order.status === 'paid' ? orderTrackingCode(order) : null;
  const view = {
    orderId: order.orderId,
    status: order.status,
    total: order.total,
    frete: order.frete,
    valorProduto: order.valorProduto,
    valorProdutoOriginal: order.valorProdutoOriginal ?? null,
    couponCode: order.couponCode || null,
    couponPercent: order.couponPercent ?? null,
    couponDiscount: order.couponDiscount ?? null,
    freteOriginal: order.freteOriginal ?? null,
    totalOriginal: order.totalOriginal ?? null,
    produto: order.produto || null,
    smartwatch: order.smartwatch || null,
    observacoes: trimObs(order) || null,
    modeloRelogio: formatOrderSmartwatch(order),
    pagamento: order.pagamento,
    paidAt: order.paidAt || null,
    createdAt: order.createdAt || null,
    selfTestPix: !!order.selfTestPix,
    selfTestPayPal: !!order.selfTestPayPal,
    selfTestStripe: !!order.selfTestStripe,
    selfTestTester: !!order.selfTestTester,
    chargeCurrency: order.chargeCurrency || null,
    chargeAmount: order.chargeAmount != null ? Number(order.chargeAmount) : null,
    chargeFxRate: order.chargeFxRate != null ? Number(order.chargeFxRate) : null,
    shippingService: order.status === 'paid' ? (order.shippingService || null) : null,
    trackingCode,
    trackingStatus: order.status === 'paid' ? (order.correiosTrackingStatus || null) : null,
    trackingUrl: trackingCode
      ? correiosTrackingUrl(trackingCode, customerSiteBase(order, DEFAULT_CONFIG))
      : null,
    uberTrackingUrl: order.status === 'paid' ? (order.uberTrackingUrl || null) : null,
    canCancel: customerCanCancelOrder(order),
    cancelReason: order.cancelReason || null,
    cancelledAt: order.cancelledAt || null
  };
  if (includeResumeToken && order.status === 'pending_payment') {
    view.accessToken = order.accessToken;
  }
  if (includePayment && order.status === 'pending_payment') {
    view.payment = {
      billingType: order.paymentBillingType || 'PIX',
      pixCopyPaste: order.pixCopyPaste || null,
      pixQrEncoded: order.pixQrEncoded || null,
      invoiceUrl: order.invoiceUrl || null,
      approveUrl: order.paypalApproveUrl || null,
      autoConfirm: order.autoConfirm !== false
    };
    view.paisCode = order.paisCode || 'BR';
    view.shippingService = order.shippingService || null;
    view.shippingMethodId = order.shippingMethodId || null;
    view.shippingServiceCode = order.shippingServiceCode || null;
    if (Array.isArray(order.items) && order.items.length) {
      view.items = order.items.map((item) => ({
        productId: item.productId,
        slug: item.slug || item.productId,
        name: item.name,
        price: item.price,
        qty: item.qty,
        image: item.image,
        requiresSmartwatch: item.requiresSmartwatch !== false,
        deviceType: item.deviceType || null,
        aggregated: item.aggregated === true,
        productType: item.productType,
        bandStyle: item.bandStyle,
        color: item.color,
        compatibility: item.compatibility,
        weightGrams: item.weightGrams
      }));
    }
  }
  return view;
}

function pixTlv(id, value) {
  return id + String(value.length).padStart(2, '0') + value;
}

function pixCrc16(payload) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
    }
    crc &= 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function pixSanitize(str, max) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .toUpperCase()
    .slice(0, max);
}

function normalizePixKey(key, keyType) {
  const raw = String(key || '').trim();
  if (keyType === 'cpf' || keyType === 'cnpj' || keyType === 'phone') return raw.replace(/\D/g, '');
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 14 || digits.length === 11) return digits;
  return raw;
}

function generateStaticPixPayload(config, order) {
  const pix = resolvePixConfig(config.pix, DEFAULT_CONFIG.pix);
  const name = pixSanitize(pix.merchantName, 25);
  const city = pixSanitize(pix.merchantCity, 15);
  const reference = String(order.orderId || 'STF').replace(/[^a-zA-Z0-9]/g, '').slice(0, 25);
  const pixKey = normalizePixKey(pix.key, pix.keyType);
  const merchantAccount = pixTlv('00', 'br.gov.bcb.pix') + pixTlv('01', pixKey);
  let payload =
    pixTlv('00', '01') +
    pixTlv('26', merchantAccount) +
    pixTlv('52', '0000') +
    pixTlv('53', '986') +
    pixTlv('54', Number(order.total).toFixed(2)) +
    pixTlv('58', 'BR') +
    pixTlv('59', name) +
    pixTlv('60', city) +
    pixTlv('62', pixTlv('05', reference));
  payload += '6304';
  payload += pixCrc16(payload);
  return payload;
}

function attachPaymentToOrder(order, payment, config) {
  if (!payment) return;
  order.paymentBillingType = payment.billingType || 'PIX';
  order.autoConfirm = payment.autoConfirm !== false;
  if (payment.invoiceUrl) order.invoiceUrl = payment.invoiceUrl;
  if (payment.approveUrl) order.paypalApproveUrl = payment.approveUrl;
  if (payment.paypalOrderId) order.paypalOrderId = payment.paypalOrderId;
  if (payment.pixCopyPaste) {
    order.pixCopyPaste = payment.pixCopyPaste;
    order.pixQrEncoded = payment.pixQrEncoded || null;
  } else if (payment.billingType === 'PIX' || payment.provider === 'static_pix') {
    order.pixCopyPaste = generateStaticPixPayload(config, order);
  }
}

function escapeHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function trimObs(order) {
  if (!order) return '';
  return String(order.observacoes ?? '').trim();
}

function isPlaceholderWatchModel(s) {
  const t = String(s || '').trim();
  if (!t || t === 'N/A') return true;
  return /outro modelo|other model|altro modello/i.test(t);
}

/** Modelo final para produção/envio — usa observações quando for "Outro modelo". */
function formatOrderSmartwatch(order) {
  const model = String(order?.smartwatch || '').trim();
  const obs = trimObs(order);
  if (!model || isPlaceholderWatchModel(model)) return obs || model || 'N/A';
  return obs ? `${model} — ${obs}` : model;
}

function orderIntlProductFields(order) {
  if ((order.paisCode || 'BR') === 'BR' || !order.internationalProductNote) return {};
  return { 'Produto internacional': order.internationalProductNote };
}

function orderWatchEmailFields(order) {
  const model = String(order?.smartwatch || '').trim();
  const obs = trimObs(order);
  if (!model && !obs) return {};
  if (!model || model === 'N/A') return obs ? { 'Modelo do relógio': obs } : {};
  return { 'Modelo do relógio': formatOrderSmartwatch(order) };
}

function watchWhatsAppBlock(order) {
  const model = String(order?.smartwatch || '').trim();
  const obs = trimObs(order);
  if (!model || isPlaceholderWatchModel(model)) return obs ? `⌚ ${obs}` : (model ? `⌚ ${model}` : '');
  if (obs) return `⌚ ${model}\n📝 ${obs}`;
  return `⌚ ${model}`;
}

function orderCheckoutLocale(order) {
  const l = String(order?.checkoutLocale || 'pt').toLowerCase();
  if (l === 'en' || l === 'it') return l;
  return 'pt';
}

function customerFirstName(order) {
  const first = String(order?.nome || '').trim().split(/\s+/)[0] || '';
  return first;
}

/** Marca curta para copy humana: "seu Garmin", "your Apple Watch". */
function watchBrandForCopy(order) {
  const model = String(order?.smartwatch || '').trim();
  const obs = trimObs(order);
  // Prefer free-text notes when the select is "Other model" (e.g. "Garmin Tactix 8").
  const haystack = /Outro modelo|Other model|Altro modello/i.test(model)
    ? (obs || model)
    : `${model} ${obs}`.trim();
  if (!haystack || haystack === 'N/A') return '';
  if (/Garmin/i.test(haystack)) return 'Garmin';
  if (/Apple Watch/i.test(haystack)) return 'Apple Watch';
  if (/Samsung/i.test(haystack)) return 'Samsung Galaxy Watch';
  if (/Huawei/i.test(haystack)) return 'Huawei';
  if (/Xiaomi|Redmi/i.test(haystack)) return 'Xiaomi';
  if (/Amazfit/i.test(haystack)) return 'Amazfit';
  if (/Fitbit/i.test(haystack)) return 'Fitbit';
  if (/Polar/i.test(haystack)) return 'Polar';
  if (/Honor/i.test(haystack)) return 'Honor';
  if (/Outro modelo|Other model|Altro modello/i.test(haystack)) return '';
  return haystack.split(/\s+[—\-]\s+/)[0].trim() || haystack;
}

function customerSupportEmail(order, config) {
  const loc = orderCheckoutLocale(order);
  if (loc === 'en' || loc === 'it') return 'support@sensortattoofix.com';
  return String(config?.formsubmit?.email || 'contato@sensortattoofix.com.br').trim();
}

function customerSiteBase(order, config) {
  const loc = orderCheckoutLocale(order);
  if (loc === 'en' || loc === 'it') return 'https://www.sensortattoofix.com';
  return String(config?.siteUrl || 'https://www.sensortattoofix.com.br').replace(/\/$/, '');
}

function shopWhatsAppUrl(config, env, text) {
  const e164 = shopPhoneE164(config, env).replace(/\D/g, '');
  if (!e164) return '';
  const q = text ? `?text=${encodeURIComponent(text)}` : '';
  return `https://wa.me/${e164}${q}`;
}

function resumeOrderUrl(config, order) {
  const loc = orderCheckoutLocale(order);
  const site = customerSiteBase(order, config);
  const path = loc === 'it' ? '/it/comprar.html' : '/comprar.html';
  return `${site}${path}?pedido=${encodeURIComponent(order.orderId)}&token=${encodeURIComponent(order.accessToken)}`;
}

function pendingRecoveryCopy(order, config, env, { paymentKind = 'pix' } = {}) {
  const loc = orderCheckoutLocale(order);
  const first = customerFirstName(order);
  const watch = watchBrandForCopy(order);
  const fullWatch = formatOrderSmartwatch(order);
  const supportEmail = customerSupportEmail(order, config);
  const resumeUrl = resumeOrderUrl(config, order);

  const waPrefill = loc === 'en'
    ? `Hi! I started order ${order.orderId}${watch ? ` for my ${watch}` : ''} and need a little help finishing payment.`
    : loc === 'it'
      ? `Ciao! Ho iniziato l’ordine ${order.orderId}${watch ? ` per il mio ${watch}` : ''} e vorrei un aiuto per completare il pagamento.`
      : `Olá! Comecei o pedido ${order.orderId}${watch ? ` para o meu ${watch}` : ''} e preciso de uma ajuda para concluir o pagamento.`;
  const waUrl = shopWhatsAppUrl(config, env, waPrefill);

  if (loc === 'en') {
    const subject = watch
      ? `Everything OK with your ${watch}${first ? `, ${first}` : ''}?`
      : `Need any help with your Sensor Tattoo Fix order${first ? `, ${first}` : ''}?`;
    const paymentLine = paymentKind === 'pix'
      ? 'We noticed you started checkout for the Sensor Tattoo Fix® optical lens, but payment was not completed.'
      : paymentKind === 'paypal'
        ? 'We noticed you started checkout for the Sensor Tattoo Fix® optical lens, but PayPal payment was not completed.'
        : 'We noticed you started checkout for the Sensor Tattoo Fix® optical lens, but card payment was not completed.';
    return {
      subject,
      greeting: first ? `Hi, ${first}!` : 'Hi!',
      intro: watch
        ? `I saw in our system that you were securing the Sensor Tattoo Fix® optical lens for your ${watch}, but payment was not completed.`
        : paymentLine,
      help: 'Every watch model has a specific sensor size — if you have any doubt about the ideal lens size or how to apply it, I am happy to help.',
      offer: paymentKind === 'pix'
        ? 'If you need a new PIX code, another payment method, or help confirming the exact measurement for your model, just reply here or message us on WhatsApp.'
        : 'If you need a new payment link, another payment method, or help confirming the exact measurement for your model, just reply here or message us on WhatsApp.',
      ctaPay: paymentKind === 'pix' ? 'Open order & pay with PIX' : 'Open order & finish payment',
      contactsTitle: 'We are available for any question:',
      emailLabel: 'Email',
      whatsappLabel: 'WhatsApp',
      signOff: 'Warm regards,',
      signer: 'Fabio | Sensor Tattoo Fix®',
      watchLine: fullWatch && fullWatch !== 'N/A' ? `Watch model: ${fullWatch}` : '',
      supportEmail,
      waUrl,
      resumeUrl,
      pixHint: 'Scan the QR code in your banking app, or copy and paste the PIX code below:',
      totalLabel: 'Total'
    };
  }

  if (loc === 'it') {
    const subject = watch
      ? `Tutto ok con il tuo ${watch}${first ? `, ${first}` : ''}?`
      : `Serve un aiuto con il tuo ordine Sensor Tattoo Fix${first ? `, ${first}` : ''}?`;
    return {
      subject,
      greeting: first ? `Ciao, ${first}!` : 'Ciao!',
      intro: watch
        ? `Ho visto nel sistema che stavi assicurando la lente ottica Sensor Tattoo Fix® per il tuo ${watch}, ma il pagamento non è stato completato.`
        : 'Ho visto che hai iniziato il checkout per la lente ottica Sensor Tattoo Fix®, ma il pagamento non è stato completato.',
      help: 'Ogni modello di orologio ha un diametro del sensore specifico — se hai dubbi sulla misura ideale della lente o sull’applicazione, sono a disposizione.',
      offer: paymentKind === 'pix'
        ? 'Se ti serve un nuovo codice PIX, un altro metodo di pagamento o conferma della misura esatta, rispondi a questa email o scrivici su WhatsApp.'
        : 'Se ti serve un nuovo link di pagamento, un altro metodo o conferma della misura esatta, rispondi a questa email o scrivici su WhatsApp.',
      ctaPay: paymentKind === 'pix' ? 'Apri l’ordine e paga con PIX' : 'Apri l’ordine e completa il pagamento',
      contactsTitle: 'Per qualsiasi dubbio siamo disponibili:',
      emailLabel: 'Email',
      whatsappLabel: 'WhatsApp',
      signOff: 'Un saluto,',
      signer: 'Fabio | Sensor Tattoo Fix®',
      watchLine: fullWatch && fullWatch !== 'N/A' ? `Modello orologio: ${fullWatch}` : '',
      supportEmail,
      waUrl,
      resumeUrl,
      pixHint: 'Inquadra il QR Code nell’app della tua banca oppure copia e incolla il codice PIX qui sotto:',
      totalLabel: 'Totale'
    };
  }

  const subject = watch
    ? `Tudo certo com o seu ${watch}${first ? `, ${first}` : ''}?`
    : `Dúvida sobre a lente Sensor Tattoo Fix${first ? ` — ${first}` : ''}`;
  return {
    subject,
    greeting: first ? `Olá, ${first}! Tudo bem?` : 'Olá! Tudo bem?',
    intro: watch
      ? `Vi aqui no nosso sistema que você tentou garantir a sua Lente Óptica Sensor Tattoo Fix® para o seu ${watch}, mas o pagamento acabou não sendo concluído.`
      : 'Vi aqui no nosso sistema que você iniciou a compra da Lente Óptica Sensor Tattoo Fix®, mas o pagamento acabou não sendo concluído.',
    help: 'Como cada modelo tem um diâmetro de sensor específico, queria saber se você ficou com alguma dúvida sobre o tamanho ideal da lente ou sobre a aplicação no seu relógio.',
    offer: paymentKind === 'pix'
      ? 'Se precisar de ajuda para confirmar a medida exata do seu modelo, quiser um novo código PIX ou preferir outro meio de pagamento, estou à disposição por aqui ou direto pelo WhatsApp.'
      : 'Se precisar de ajuda para confirmar a medida exata do seu modelo, quiser um novo link de pagamento ou preferir outro meio, estou à disposição por aqui ou direto pelo WhatsApp.',
    ctaPay: paymentKind === 'pix' ? 'Abrir pedido e pagar com PIX' : 'Abrir pedido e concluir pagamento',
    contactsTitle: 'Qualquer dúvida, estamos disponíveis:',
    emailLabel: 'E-mail',
    whatsappLabel: 'WhatsApp',
    signOff: 'Um abraço,',
    signer: 'Fabio | Sensor Tattoo Fix®',
    watchLine: fullWatch && fullWatch !== 'N/A' ? `Modelo do relógio: ${fullWatch}` : '',
    supportEmail,
    waUrl,
    resumeUrl,
    pixHint: 'Escaneie o QR Code no app do seu banco ou copie o código PIX:',
    totalLabel: 'Total'
  };
}

function buildPendingConsultativeEmail(order, config, env, {
  paymentKind = 'pix',
  hasQrImage = false,
  includePixCode = false
} = {}) {
  const copy = pendingRecoveryCopy(order, config, env, { paymentKind });
  const total = (order.chargeCurrency === 'USD' || order.chargeCurrency === 'EUR') && order.chargeAmount != null
    ? formatOrderCharge(order)
    : formatBRL(order.total);
  const copyPaste = order.pixCopyPaste || '';
  const qrImg = hasQrImage
    ? `<img src="cid:${PIX_QR_CID}" width="220" height="220" alt="QR Code PIX" style="display:block;margin:16px auto;border:1px solid #eee;border-radius:8px" />`
    : '';
  const pixBlock = includePixCode
    ? `<p style="font-size:18px"><strong>${escapeHtml(copy.totalLabel)}: ${escapeHtml(total)}</strong></p>
    ${qrImg}
    <p style="font-size:13px;color:#555">${escapeHtml(copy.pixHint)}</p>
    <p style="word-break:break-all;font-family:monospace;font-size:11px;background:#f5f5f5;padding:12px;border-radius:8px;border:1px solid #ddd">${escapeHtml(copyPaste)}</p>`
    : `<p style="font-size:18px"><strong>${escapeHtml(copy.totalLabel)}: ${escapeHtml(total)}</strong></p>`;

  const contacts = [
    copy.supportEmail
      ? `<li>${escapeHtml(copy.emailLabel)}: <a href="mailto:${escapeHtml(copy.supportEmail)}">${escapeHtml(copy.supportEmail)}</a></li>`
      : '',
    copy.waUrl
      ? `<li>${escapeHtml(copy.whatsappLabel)}: <a href="${escapeHtml(copy.waUrl)}">${escapeHtml(copy.waUrl.replace(/^https:\/\//, ''))}</a></li>`
      : ''
  ].filter(Boolean).join('');

  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;color:#222;line-height:1.5">
    <p>${escapeHtml(copy.greeting)}</p>
    <p>${escapeHtml(copy.intro)}</p>
    <p>${escapeHtml(copy.help)}</p>
    <p>${escapeHtml(copy.offer)}</p>
    ${pixBlock}
    <p style="margin-top:20px"><a href="${escapeHtml(copy.resumeUrl)}" style="display:inline-block;background:#ffc107;color:#000;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:8px">${escapeHtml(copy.ctaPay)}</a></p>
    <p style="margin-top:24px"><strong>${escapeHtml(copy.contactsTitle)}</strong></p>
    <ul style="padding-left:18px;margin:8px 0 0">${contacts}</ul>
    <p style="margin-top:24px">${escapeHtml(copy.signOff)}<br>${escapeHtml(copy.signer)}</p>
    ${copy.watchLine ? `<p style="font-size:12px;color:#666;margin-top:16px">${escapeHtml(copy.watchLine)}<br>${escapeHtml(orderRefLabel(order))} ${escapeHtml(order.orderId)}</p>` : `<p style="font-size:12px;color:#666;margin-top:16px">${escapeHtml(orderRefLabel(order))} ${escapeHtml(order.orderId)}</p>`}
  </div>`;

  const text = [
    copy.greeting,
    '',
    copy.intro,
    copy.help,
    copy.offer,
    '',
    `${copy.totalLabel}: ${total}`,
    includePixCode && copyPaste ? `\n${copy.pixHint}\n${copyPaste}` : '',
    '',
    `${copy.ctaPay}: ${copy.resumeUrl}`,
    '',
    copy.contactsTitle,
    copy.supportEmail ? `${copy.emailLabel}: ${copy.supportEmail}` : '',
    copy.waUrl ? `${copy.whatsappLabel}: ${copy.waUrl}` : '',
    '',
    copy.signOff,
    copy.signer,
    '',
    copy.watchLine,
    `${orderRefLabel(order)} ${order.orderId}`
  ].filter((line) => line !== '').join('\n');

  return { subject: copy.subject, html, text, resumeUrl: copy.resumeUrl };
}

function labelPrintUrl(config, orderId) {
  const base = (config.siteUrl || 'https://www.sensortattoofix.com.br').replace(/\/$/, '');
  return `${base}/imprimir-etiqueta.html?order=${encodeURIComponent(orderId)}`;
}

function formatOrderCharge(order, value) {
  const cur = String(order?.chargeCurrency || '').toUpperCase();
  const amt = order.chargeAmount != null ? Number(order.chargeAmount) : Number(value ?? order.total);
  if (cur === 'USD') return `US$ ${Number(amt || 0).toFixed(2)}`;
  if (cur === 'EUR') {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(Number(amt || 0));
  }
  return formatBRL(value ?? order?.total);
}

function orderRefLabel(order) {
  const loc = orderCheckoutLocale(order);
  if (loc === 'en') return 'Order';
  if (loc === 'it') return 'Ordine';
  return 'Pedido';
}

/** Paid confirmation copy — respects checkoutLocale (pt/en/it). */
function paidReceiptCopy(order, config, message) {
  const loc = orderCheckoutLocale(order);
  const amount = formatOrderCharge(order, order.total);
  if (loc === 'en') {
    return {
      subject: `Payment confirmed — ${order.orderId}`,
      customerLabel: 'Customer',
      fields: {
        Order: order.orderId,
        Status: 'PAID',
        Amount: amount,
        Message: message,
        ...(order.uberTrackingUrl ? { 'Uber tracking': order.uberTrackingUrl } : {}),
        ...(order.correiosTrackingCode ? {
          'Correios tracking': order.correiosTrackingCode,
          'Track shipment': correiosTrackingUrl(order.correiosTrackingCode, customerSiteBase(order, config))
        } : {})
      },
      footerSite: 'sensortattoofix.com'
    };
  }
  if (loc === 'it') {
    return {
      subject: `Pagamento confermato — ${order.orderId}`,
      customerLabel: 'Cliente',
      fields: {
        Ordine: order.orderId,
        Stato: 'PAGATO',
        Importo: amount,
        Messaggio: message,
        ...(order.uberTrackingUrl ? { 'Tracking Uber': order.uberTrackingUrl } : {}),
        ...(order.correiosTrackingCode ? {
          'Tracking Correios': order.correiosTrackingCode,
          'Segui spedizione': correiosTrackingUrl(order.correiosTrackingCode, customerSiteBase(order, config))
        } : {})
      },
      footerSite: 'sensortattoofix.com'
    };
  }
  return {
    subject: emailSubject(config, 'customerPaidSubject', { orderId: order.orderId }),
    customerLabel: 'Cliente',
    fields: {
      Pedido: order.orderId,
      Status: 'PAGO',
      Valor: amount,
      Mensagem: message,
      ...(order.uberTrackingUrl ? { 'Rastreio Uber': order.uberTrackingUrl } : {}),
      ...(order.correiosTrackingCode ? {
        'Rastreio Correios': order.correiosTrackingCode,
        'Acompanhar envio': correiosTrackingUrl(order.correiosTrackingCode, config.siteUrl)
      } : {})
    },
    footerSite: 'sensortattoofix.com.br'
  };
}

function paidMessageForOrder(order, config) {
  const loc = orderCheckoutLocale(order);
  const hours = getMotoboyConfig(config).deliveryHours;
  if (isUberOrder(order)) {
    if (order.uberTrackingUrl) {
      if (loc === 'en') return `Uber delivery confirmed. Track it here: ${order.uberTrackingUrl}`;
      if (loc === 'it') return `Consegna Uber confermata. Segui qui: ${order.uberTrackingUrl}`;
      return emailMessage(config, 'paidUberTracking', { url: order.uberTrackingUrl });
    }
    if (loc === 'en') return 'Uber delivery requested. You will receive the tracking link by email shortly.';
    if (loc === 'it') return 'Consegna Uber richiesta. Riceverai il link di tracking via email a breve.';
    return emailMessage(config, 'paidUberPending');
  }
  if (isMotoboyOrder(order)) {
    if (loc === 'en') return `Your order will be delivered by courier within about ${hours} hours. The driver may contact you if needed.`;
    if (loc === 'it') return `Il tuo ordine sarà consegnato da un corriere entro circa ${hours} ore. Il fattorino potrà contattarti se necessario.`;
    return emailMessage(config, 'paidMotoboy', { hours });
  }
  if (order.internationalLensOnly) {
    if (loc === 'en') return 'Your international lens will ship within 2 business days. You will receive tracking by email.';
    if (loc === 'it') return 'La tua lente internazionale sarà spedita entro 2 giorni lavorativi. Riceverai il tracking via email.';
    return emailMessage(config, 'paidIntlLens');
  }
  if (order.paisCode && order.paisCode !== 'BR') {
    if (loc === 'en') return 'Your Prime kit will ship within 2 business days. You will receive tracking by email.';
    if (loc === 'it') return 'Il tuo kit Prime sarà spedito entro 2 giorni lavorativi. Riceverai il tracking via email.';
    return emailMessage(config, 'paidIntlKit');
  }
  if (loc === 'en') return 'Your kit will ship within 2 business days. You will receive tracking by email.';
  if (loc === 'it') return 'Il tuo kit sarà spedito entro 2 giorni lavorativi. Riceverai il tracking via email.';
  return emailMessage(config, 'paidDefault');
}

function orderWantsTrackingEmail(order) {
  if (!order || order.status !== 'paid') return false;
  if (isUberOrder(order) || isMotoboyOrder(order)) return false;
  return true;
}

/** Send customer e-mail when tracking first becomes available (idempotent). */
async function maybeNotifyTrackingAvailable(env, config, order) {
  const code = orderTrackingCode(order);
  if (!code || !orderWantsTrackingEmail(order) || order.trackingEmailSentAt) {
    return { skipped: true };
  }
  if (!order.paidEmailsSentAt) return { skipped: true, reason: 'paid_email_pending' };

  order.trackingEmailSentAt = new Date().toISOString();
  await saveOrder(env, order);

  const trackUrl = correiosTrackingUrl(code, customerSiteBase(order, config));
  const loc = orderCheckoutLocale(order);
  let subject;
  let message;
  let fields;
  if (loc === 'en') {
    subject = `Tracking available — ${order.orderId}`;
    message = `Your order has shipped. Tracking code: ${code}. Track here: ${trackUrl}`;
    fields = {
      Order: order.orderId,
      Tracking: code,
      'Track shipment': trackUrl,
      Message: message
    };
  } else if (loc === 'it') {
    subject = `Tracking disponibile — ${order.orderId}`;
    message = `Il tuo ordine è stato spedito. Codice tracking: ${code}. Segui qui: ${trackUrl}`;
    fields = {
      Ordine: order.orderId,
      Tracking: code,
      'Segui spedizione': trackUrl,
      Messaggio: message
    };
  } else {
    subject = emailSubject(config, 'customerTrackingSubject', { orderId: order.orderId });
    message = emailMessage(config, 'trackingAvailable', { code, url: trackUrl });
    fields = {
      Pedido: order.orderId,
      Rastreio: code,
      'Acompanhar envio': trackUrl,
      Mensagem: message
    };
  }

  const shopCopy = String(config.formsubmit?.email || '').trim();
  const result = await notifyCustomer(env, config, order, subject, fields, {
    html: fieldsToHtmlLocalized(
      { [loc === 'en' ? 'Customer' : 'Cliente']: order.nome, ...fields },
      loc === 'pt' ? 'sensortattoofix.com.br' : 'sensortattoofix.com'
    ),
    text: fieldsToText({ [loc === 'en' ? 'Customer' : 'Cliente']: order.nome, ...fields }),
    // Cópia oculta pra loja (não vai pra "Enviados" do Gmail — chega na caixa da loja via BCC).
    bcc: shopCopy || undefined
  });
  if (!result?.ok) {
    order.trackingEmailSentAt = null;
    order.trackingEmailError = result?.error || 'send_failed';
    await saveOrder(env, order);
    console.error('Tracking email:', order.orderId, order.trackingEmailError);
  }
  return result;
}

async function notifyTrackingIfNew(env, config, order, previousCode) {
  const prev = String(previousCode || '').trim().toUpperCase();
  const next = orderTrackingCode(order);
  if (!next || prev === next) return { skipped: true };
  return maybeNotifyTrackingAvailable(env, config || await getConfig(env), order);
}

function fieldsToHtmlLocalized(fields, footerSite) {
  const rows = Object.entries(fields)
    .map(([k, v]) => `<tr><td style="padding:8px;border:1px solid #ddd;font-weight:600">${k}</td><td style="padding:8px;border:1px solid #ddd">${String(v ?? '').replace(/</g, '&lt;')}</td></tr>`)
    .join('');
  const site = footerSite || 'sensortattoofix.com.br';
  return `<div style="font-family:Arial,sans-serif;max-width:560px"><table style="border-collapse:collapse;width:100%">${rows}</table><p style="color:#666;font-size:12px;margin-top:16px">Sensor Tattoo Fix — ${site}</p></div>`;
}

const ABANDONED_CHECKOUT_DELAY_MS = 15 * 60 * 1000;
const ABANDONED_WEEKLY_MS = 7 * 24 * 60 * 60 * 1000;
const ABANDONED_WEEKLY_MAX = 4;
const ABANDONED_CHECKOUT_CRON_MAX = 30;

function orderPendingBillingType(order) {
  const raw = String(order?.pagamento || order?.paymentBillingType || order?.paymentProof?.billingType || '').toUpperCase();
  if (raw.includes('PIX')) return 'PIX';
  if (raw.includes('PAYPAL')) return 'PAYPAL';
  if (raw.includes('MP') || raw.includes('MERCADO')) return 'MP_CHECKOUT';
  if (raw.includes('CARD') || raw.includes('CART') || raw.includes('STRIPE') || raw.includes('ASAAS')) return 'CREDIT_CARD';
  return orderLooksInternationalDestination(order) ? 'PAYPAL' : 'PIX';
}

function buildAbandonedCartEmail(order, config, env, { weekly = false } = {}) {
  const loc = orderCheckoutLocale(order);
  const resumeUrl = resumeOrderUrl(config, order);
  const product = order.produto || 'Sensor Tattoo Fix';
  const total = formatOrderCharge(order, order.total);
  const nome = String(order.nome || '').trim().split(/\s+/)[0] || (loc === 'en' ? 'there' : loc === 'it' ? '' : '');
  let subject;
  let intro;
  let cta;
  let greeting;
  let footer;
  if (loc === 'en') {
    subject = weekly
      ? `Weekly reminder — order ${order.orderId} still awaiting payment`
      : `Your order ${order.orderId} is still reserved — finish when you're ready`;
    greeting = nome ? `Hi ${nome},` : 'Hi,';
    intro = weekly
      ? 'A week has passed and your order is still unpaid. If you still want Sensor Tattoo Fix, finish checkout with the link below.'
      : 'We noticed your order is still pending. Your items are reserved — complete payment with the link below.';
    cta = 'Complete my order';
    footer = 'Sensor Tattoo Fix — sensortattoofix.com';
  } else if (loc === 'it') {
    subject = weekly
      ? `Promemoria settimanale — ordine ${order.orderId} in attesa di pagamento`
      : `Il tuo ordine ${order.orderId} è ancora riservato — completa quando vuoi`;
    greeting = nome ? `Ciao ${nome},` : 'Ciao,';
    intro = weekly
      ? 'È passata una settimana e il tuo ordine è ancora in attesa di pagamento. Se vuoi ancora Sensor Tattoo Fix, completa dal link qui sotto.'
      : 'Abbiamo notato che il tuo ordine è ancora in sospeso. Gli articoli sono riservati — completa il pagamento dal link qui sotto.';
    cta = 'Completa il mio ordine';
    footer = 'Sensor Tattoo Fix — sensortattoofix.com';
  } else {
    subject = emailSubject(config, weekly ? 'abandonedWeeklySubject' : 'abandonedSubject', {
      orderId: order.orderId
    });
    greeting = nome ? `Olá, ${nome}!` : 'Olá!';
    intro = weekly
      ? emailMessage(config, 'abandonedWeeklyIntro')
      : emailMessage(config, 'abandonedIntro');
    cta = emailMessage(config, 'abandonedCta') || 'Finalizar meu pedido';
    footer = 'Sensor Tattoo Fix — sensortattoofix.com.br';
  }

  const support = customerSupportEmail(order, config);
  const wa = shopWhatsAppUrl(config, env, loc === 'en'
    ? `Hi! I want to finish order ${order.orderId}`
    : loc === 'it'
      ? `Ciao! Voglio completare l'ordine ${order.orderId}`
      : `Olá! Quero finalizar o pedido ${order.orderId}`);

  const html = `<div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#1a1a1a;line-height:1.55;background:#faf8f5;padding:28px 24px;border-radius:4px">
    <p style="font-size:13px;letter-spacing:0.12em;text-transform:uppercase;color:#8a6a3a;margin:0 0 8px">Sensor Tattoo Fix</p>
    <h1 style="font-size:22px;font-weight:600;margin:0 0 16px;line-height:1.3">${escapeHtml(weekly ? (loc === 'en' ? 'Still thinking it over?' : loc === 'it' ? 'Ci stai ancora pensando?' : 'Ainda pensando?') : (loc === 'en' ? 'Your order is waiting' : loc === 'it' ? 'Il tuo ordine ti aspetta' : 'Seu pedido está te esperando'))}</h1>
    <p style="margin:0 0 12px">${escapeHtml(greeting)}</p>
    <p style="margin:0 0 16px">${escapeHtml(intro)}</p>
    <div style="background:#fff;border:1px solid #e8e0d4;padding:16px 18px;margin:0 0 20px">
      <p style="margin:0 0 6px;font-size:13px;color:#666">${escapeHtml(loc === 'en' ? 'Order' : loc === 'it' ? 'Ordine' : 'Pedido')} <strong>${escapeHtml(order.orderId)}</strong></p>
      <p style="margin:0 0 6px">${escapeHtml(product)}</p>
      <p style="margin:0;font-size:18px"><strong>${escapeHtml(total)}</strong></p>
    </div>
    <p style="margin:0 0 24px"><a href="${escapeHtml(resumeUrl)}" style="display:inline-block;background:#1a1a1a;color:#faf8f5;text-decoration:none;font-weight:700;padding:14px 22px;font-family:Arial,sans-serif;font-size:14px">${escapeHtml(cta)}</a></p>
    <p style="font-size:13px;color:#555;margin:0 0 8px">${escapeHtml(loc === 'en' ? 'Need help?' : loc === 'it' ? 'Serve aiuto?' : 'Precisa de ajuda?')}
      ${support ? `<a href="mailto:${escapeHtml(support)}">${escapeHtml(support)}</a>` : ''}
      ${wa ? ` · <a href="${escapeHtml(wa)}">WhatsApp</a>` : ''}
    </p>
    <p style="font-size:11px;color:#999;margin:20px 0 0">${escapeHtml(footer)}</p>
  </div>`;

  const text = [
    greeting,
    '',
    intro,
    '',
    `${loc === 'en' ? 'Order' : loc === 'it' ? 'Ordine' : 'Pedido'}: ${order.orderId}`,
    product,
    total,
    '',
    `${cta}: ${resumeUrl}`,
    support ? `E-mail: ${support}` : '',
    wa ? `WhatsApp: ${wa}` : '',
    '',
    footer
  ].filter(Boolean).join('\n');

  return { subject, html, text, resumeUrl };
}

async function notifyAbandonedCart(env, config, order, { weekly = false } = {}) {
  const mail = buildAbandonedCartEmail(order, config, env, { weekly });
  const loc = orderCheckoutLocale(order);
  const fields = loc === 'en'
    ? { Order: order.orderId, Status: weekly ? 'Weekly reminder' : 'Abandoned checkout', Total: formatOrderCharge(order), 'Order link': mail.resumeUrl }
    : loc === 'it'
      ? { Ordine: order.orderId, Stato: weekly ? 'Promemoria settimanale' : 'Checkout abbandonato', Totale: formatOrderCharge(order), 'Link ordine': mail.resumeUrl }
      : { Pedido: order.orderId, Status: weekly ? 'Lembrete semanal' : 'Checkout abandonado', Total: formatOrderCharge(order), 'Link do pedido': mail.resumeUrl };
  return notifyCustomer(env, config, order, mail.subject, fields, {
    html: mail.html,
    text: mail.text
  });
}

async function runAbandonedCheckoutEmails(env) {
  const index = await readOrdersIndex(env);
  const now = Date.now();
  const config = await getConfig(env);
  let sent = 0;
  let weeklySent = 0;
  let skipped = 0;
  for (const item of index) {
    if (sent + weeklySent >= ABANDONED_CHECKOUT_CRON_MAX) break;
    if (!item?.orderId || item.status === 'paid') continue;
    const created = Date.parse(item.createdAt || '');
    if (!Number.isFinite(created) || (now - created) < ABANDONED_CHECKOUT_DELAY_MS) {
      skipped += 1;
      continue;
    }
    const order = await getOrder(env, item.orderId);
    if (!order || order.status === 'paid' || order.paidEmailsSentAt) continue;

    // First recovery e-mail (~15 min after create)
    if (!order.abandonedEmailSentAt) {
      order.abandonedEmailSentAt = new Date().toISOString();
      order.abandonedEmailLastAt = order.abandonedEmailSentAt;
      order.abandonedWeeklyCount = 0;
      await saveOrder(env, order);
      try {
        const result = await notifyAbandonedCart(env, config, order, { weekly: false });
        if (!result?.ok) {
          console.error('Abandoned checkout email failed:', order.orderId, JSON.stringify(result));
        } else {
          sent += 1;
        }
      } catch (err) {
        console.error('Abandoned checkout email:', order.orderId, err.message);
      }
      continue;
    }

    // Weekly reminders (up to ABANDONED_WEEKLY_MAX)
    const lastAt = Date.parse(order.abandonedEmailLastAt || order.abandonedEmailSentAt || '');
    const weeklyCount = Number(order.abandonedWeeklyCount) || 0;
    if (!Number.isFinite(lastAt) || (now - lastAt) < ABANDONED_WEEKLY_MS) continue;
    if (weeklyCount >= ABANDONED_WEEKLY_MAX) continue;

    order.abandonedEmailLastAt = new Date().toISOString();
    order.abandonedWeeklyCount = weeklyCount + 1;
    await saveOrder(env, order);
    try {
      const result = await notifyAbandonedCart(env, config, order, { weekly: true });
      if (!result?.ok) {
        console.error('Abandoned weekly email failed:', order.orderId, JSON.stringify(result));
      } else {
        weeklySent += 1;
      }
    } catch (err) {
      console.error('Abandoned weekly email:', order.orderId, err.message);
    }
  }
  return { ok: true, sent, weeklySent, skipped };
}

async function tryCorreiosLabelPdfAttachment(env, order, config) {
  if (!isCorreiosLabelOrder(order)) return null;
  try {
    let pdfBase64 = await getCachedLabelPdf(env, order.orderId);
    if (!pdfBase64) {
      await ensureCorreiosPrePostagemForOrder(env, order, config);
      const token = await getCorreiosToken(env);
      const preId = order.correiosPrePostagemId;
      if (!token || !preId) return null;
      const label = await fetchCorreiosLabelPdf(token, preId, correiosLabelTipoOpts(order));
      pdfBase64 = label?.pdfBase64 || null;
      if (label?.trackingCode && !order.correiosTrackingCode) {
        order.correiosTrackingCode = String(label.trackingCode).trim().toUpperCase();
        await saveOrder(env, order);
      }
      if (pdfBase64) await saveCachedLabelPdf(env, order.orderId, pdfBase64);
    }
    if (!pdfBase64) return null;
    if (!order.correiosLabelCachedAt) {
      order.correiosLabelCachedAt = new Date().toISOString();
      await saveOrder(env, order);
    }
    return {
      filename: `etiqueta-${order.orderId}.pdf`,
      content: pdfBase64,
      content_type: 'application/pdf'
    };
  } catch (err) {
    console.warn('Auto label PDF:', order.orderId, err.message);
    order.correiosLabelEmailError = err.message;
    try { await saveOrder(env, order); } catch (_) { /* ignore */ }
    return null;
  }
}

function buildIntlPackingSlipAttachment(order) {
  const loc = orderCheckoutLocale(order);
  const title = loc === 'en' ? 'Packing slip' : loc === 'it' ? 'Documento di spedizione' : 'Romaneio / packing slip';
  const lines = [
    `<h1 style="font-family:Arial,sans-serif">${title}</h1>`,
    `<p><strong>Order:</strong> ${escapeHtml(order.orderId)}</p>`,
    `<p><strong>Customer:</strong> ${escapeHtml(order.nome || '')}</p>`,
    `<p><strong>Email:</strong> ${escapeHtml(order.email || '')}</p>`,
    `<p><strong>Phone:</strong> ${escapeHtml(order.telefone || '')}</p>`,
    `<p><strong>Country:</strong> ${escapeHtml(order.pais || order.paisCode || '')}</p>`,
    `<p><strong>Address:</strong><br>${escapeHtml(order.endereco || '').replace(/\n/g, '<br>')}</p>`,
    `<p><strong>Product:</strong> ${escapeHtml(order.produto || '')}</p>`,
    `<p><strong>Watch:</strong> ${escapeHtml(formatOrderSmartwatch(order) || '')}</p>`,
    `<p><strong>Shipping:</strong> ${escapeHtml(order.shippingService || '')}</p>`,
    `<p><strong>Total:</strong> ${escapeHtml(formatOrderCharge(order, order.total))}</p>`
  ].join('\n');
  const html = `<!DOCTYPE html><html><body>${lines}</body></html>`;
  const bytes = new TextEncoder().encode(html);
  return {
    filename: `packing-slip-${order.orderId}.html`,
    content: arrayBufferToBase64(bytes.buffer),
    content_type: 'text/html; charset=utf-8'
  };
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

const PIX_QR_CID = 'pix-qrcode';

async function pixQrInlineAttachment(order) {
  if (order.pixQrEncoded) {
    return {
      filename: 'pix-qrcode.png',
      content: order.pixQrEncoded,
      content_type: 'image/png',
      content_id: PIX_QR_CID
    };
  }
  const payload = order.pixCopyPaste;
  if (!payload) return null;
  try {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&format=png&data=${encodeURIComponent(payload)}`;
    const res = await fetch(qrUrl);
    if (!res.ok) return null;
    return {
      filename: 'pix-qrcode.png',
      content: arrayBufferToBase64(await res.arrayBuffer()),
      content_type: 'image/png',
      content_id: PIX_QR_CID
    };
  } catch (err) {
    console.error('QR PIX e-mail:', err.message);
    return null;
  }
}

async function recordLoginFailure(env, ip, scope = 'admin') {
  const key = `login:${scope}:${ip}`;
  // Prefer Cache API for customer lockouts — avoids burning free KV write quota on failed logins.
  if (scope === 'customer') {
    try {
      const cache = caches.default;
      const req = new Request(`https://stf-internal/login-lock/${scope}/${encodeURIComponent(ip)}`);
      const hit = await cache.match(req);
      const current = hit ? JSON.parse(await hit.text()) : { attempts: 0 };
      if (current.lockedUntil && Date.now() < current.lockedUntil) return current;
      const attempts = (current.attempts || 0) + 1;
      const data = attempts >= LOGIN_MAX_ATTEMPTS
        ? { attempts: 0, lockedUntil: Date.now() + LOGIN_LOCKOUT_SEC * 1000 }
        : { attempts };
      await cache.put(req, new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': `max-age=${LOGIN_LOCKOUT_SEC}` }
      }));
      return data;
    } catch (err) {
      console.warn('login lock cache:', err.message);
      return { attempts: 0 };
    }
  }
  const current = (await getLoginLock(env, ip, scope)) || { attempts: 0 };
  if (current.lockedUntil && Date.now() < current.lockedUntil) return current;
  const attempts = (current.attempts || 0) + 1;
  const data = attempts >= LOGIN_MAX_ATTEMPTS
    ? { attempts: 0, lockedUntil: Date.now() + LOGIN_LOCKOUT_SEC * 1000 }
    : { attempts };
  await kvPutSafe(env, key, JSON.stringify(data), { expirationTtl: LOGIN_LOCKOUT_SEC });
  return data;
}

async function clearLoginFailures(env, ip, scope = 'admin') {
  if (scope === 'customer') {
    try {
      await caches.default.delete(new Request(`https://stf-internal/login-lock/${scope}/${encodeURIComponent(ip)}`));
    } catch (_) { /* ignore */ }
    return;
  }
  await kvDeleteSafe(env, `login:${scope}:${ip}`);
}

async function getLoginLock(env, ip, scope = 'admin') {
  if (scope === 'customer') {
    try {
      const hit = await caches.default.match(
        new Request(`https://stf-internal/login-lock/${scope}/${encodeURIComponent(ip)}`)
      );
      if (!hit) return null;
      const data = JSON.parse(await hit.text());
      if (data.lockedUntil && Date.now() < data.lockedUntil) return data;
      if (data.lockedUntil && Date.now() >= data.lockedUntil) return null;
      return data;
    } catch {
      return null;
    }
  }
  const raw = await env.STORE_KV.get(`login:${scope}:${ip}`);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    if (data.lockedUntil && Date.now() < data.lockedUntil) return data;
    if (data.lockedUntil && Date.now() >= data.lockedUntil) return null;
    return data;
  } catch {
    return null;
  }
}

function loginLockedResponse(lock, origin) {
  const retryAfter = Math.ceil((lock.lockedUntil - Date.now()) / 1000);
  return new Response(JSON.stringify({ error: 'Muitas tentativas. Tente novamente em alguns minutos.' }), {
    status: 429,
    headers: {
      'Content-Type': 'application/json',
      'Retry-After': String(retryAfter),
      ...corsHeaders(origin)
    }
  });
}

function bearerToken(request) {
  return (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
}

function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
  });
}

function onlyDigits(v) { return (v || '').replace(/\D/g, ''); }

function formatBRL(n) {
  return 'R$ ' + Number(n || 0).toFixed(2).replace('.', ',');
}

function asaasBase(env) {
  return env.ASAAS_SANDBOX === 'true'
    ? 'https://api-sandbox.asaas.com/v3'
    : 'https://api.asaas.com/v3';
}

function asaasApiKey(env) {
  return (env.ASAAS_API_KEY || '').trim();
}

function mercadoPagoToken(env) {
  return (env.MP_ACCESS_TOKEN || '').trim();
}

function isMpSandbox(env) {
  return mercadoPagoToken(env).startsWith('TEST-');
}

/** Mercado Livre (pedidos/vendas) — app separado do Mercado Pago (checkout). */
const ML_API_BASE = 'https://api.mercadolibre.com';
const ML_OAUTH_KV_KEY = 'ml:oauth';
const ML_TOKEN_KV_KEY = 'ml:token';
const ML_REDIRECT_URI = 'https://api.sensortattoofix.com.br/admin/ml/oauth/callback';

function mlClientId(env) {
  return String(env.ML_CLIENT_ID || '').trim();
}

function mlClientSecret(env) {
  return String(env.ML_CLIENT_SECRET || '').trim();
}

function mlAppConfigured(env) {
  return !!(mlClientId(env) && mlClientSecret(env));
}

async function readAppJson(env, key) {
  try {
    const fromD1 = await d1GetAppKv(env, key);
    if (fromD1) {
      const data = JSON.parse(fromD1);
      if (data && typeof data === 'object') return data;
    }
  } catch { /* KV fallback */ }
  try {
    const raw = await env.STORE_KV.get(key);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data && typeof data === 'object') {
      await d1PutAppKv(env, key, raw).catch(() => {});
      return data;
    }
  } catch { /* ignore */ }
  return null;
}

async function writeAppJson(env, key, value) {
  const raw = JSON.stringify(value);
  let d1Ok = false;
  try {
    d1Ok = !!(await d1PutAppKv(env, key, raw));
  } catch (err) {
    console.warn('D1 app_kv put', key, err?.message || err);
  }
  const kvOk = await kvPutSafe(env, key, raw);
  if (!d1Ok && !kvOk) throw new Error('Não foi possível gravar ' + key + ' (D1 e KV falharam).');
}

async function getMlOAuthState(env) {
  return readAppJson(env, ML_OAUTH_KV_KEY);
}

async function saveMlOAuthState(env, patch) {
  const prev = (await getMlOAuthState(env)) || {};
  const next = { ...prev, ...patch, updatedAt: new Date().toISOString() };
  await writeAppJson(env, ML_OAUTH_KV_KEY, next);
  return next;
}

async function getMlRefreshToken(env) {
  const state = await getMlOAuthState(env);
  const fromStore = String(state?.refreshToken || '').trim();
  if (fromStore) return fromStore;
  return String(env.ML_REFRESH_TOKEN || '').trim();
}

async function exchangeMlOAuthToken(env, body) {
  const res = await fetch(`${ML_API_BASE}/oauth/token`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams(body)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.message || data.error_description || data.error || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function persistMlTokens(env, data) {
  const accessToken = String(data.access_token || '').trim();
  const refreshToken = String(data.refresh_token || '').trim();
  const userId = data.user_id != null ? String(data.user_id) : null;
  const expiresIn = Math.max(60, Number(data.expires_in || 21600) - 120);
  const oauthPatch = { lastRefreshError: null };
  if (refreshToken) oauthPatch.refreshToken = refreshToken;
  if (userId) oauthPatch.userId = userId;
  if (refreshToken || userId) await saveMlOAuthState(env, oauthPatch);
  if (accessToken) {
    await writeAppJson(env, ML_TOKEN_KV_KEY, {
      token: accessToken,
      expiresAt: Date.now() + expiresIn * 1000,
      userId
    });
  }
  return { accessToken, refreshToken, userId, expiresIn };
}

async function getMlAccessToken(env) {
  if (!mlAppConfigured(env)) return null;
  const cached = await readAppJson(env, ML_TOKEN_KV_KEY);
  if (cached?.token && Number(cached.expiresAt) > Date.now()) return cached.token;

  async function refreshWith(refreshToken) {
    const data = await exchangeMlOAuthToken(env, {
      grant_type: 'refresh_token',
      client_id: mlClientId(env),
      client_secret: mlClientSecret(env),
      refresh_token: refreshToken
    });
    const persisted = await persistMlTokens(env, data);
    return persisted.accessToken || String(data.access_token || '').trim() || null;
  }

  const refreshToken = await getMlRefreshToken(env);
  if (!refreshToken) return null;

  try {
    return await refreshWith(refreshToken);
  } catch (err) {
    const latest = await getMlRefreshToken(env);
    if (latest && latest !== refreshToken) {
      try {
        return await refreshWith(latest);
      } catch (err2) {
        err = err2;
      }
    }
    const raced = await readAppJson(env, ML_TOKEN_KV_KEY);
    if (raced?.token && Number(raced.expiresAt) > Date.now()) return raced.token;
    console.warn('ML OAuth refresh:', err.message || err);
    await saveMlOAuthState(env, {
      lastRefreshError: String(err.message || err),
      lastRefreshErrorAt: new Date().toISOString()
    }).catch(() => {});
    const wrapped = new Error(String(err.message || err));
    wrapped.mlRefreshFailed = true;
    throw wrapped;
  }
}

async function keepMlAccessTokenAlive(env) {
  if (!mlAppConfigured(env)) return { skipped: true, reason: 'not_configured' };
  try {
    const token = await getMlAccessToken(env);
    return { ok: !!token };
  } catch (err) {
    console.warn('ML token keepalive:', err.message || err);
    return { ok: false, error: String(err.message || err) };
  }
}

async function checkMercadoLivreIntegration(env) {
  if (!mlAppConfigured(env)) {
    return {
      configured: false,
      authOk: false,
      error: 'ML_CLIENT_ID / ML_CLIENT_SECRET não configurados.'
    };
  }
  const refreshToken = await getMlRefreshToken(env);
  if (!refreshToken) {
    return {
      configured: true,
      authOk: false,
      needsOAuth: true,
      error: 'Sem refresh token — autorize o app pedidosml.'
    };
  }
  try {
    const token = await getMlAccessToken(env);
    if (!token) {
      return {
        configured: true,
        authOk: false,
        needsOAuth: true,
        error: 'Falha ao renovar token ML — reautorize o app.'
      };
    }
    const res = await fetch(`${ML_API_BASE}/users/me`, {
      headers: { Authorization: 'Bearer ' + token }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        configured: true,
        authOk: false,
        error: data.message || data.error || `HTTP ${res.status}`
      };
    }
    return {
      configured: true,
      authOk: true,
      userId: data.id != null ? String(data.id) : null,
      nickname: data.nickname || null,
      lastSyncedAt: (await getMlSalesMeta(env))?.lastSyncedAt || null
    };
  } catch (err) {
    return { configured: true, authOk: false, error: err.message };
  }
}

function mlOAuthHtmlPage({ title, ok, detail, code }) {
  const color = ok ? '#1a7f37' : '#b42318';
  const codeBlock = code
    ? `<p style="margin:1rem 0 0;font-size:13px;word-break:break-all;background:#f4f4f5;padding:10px 12px;border-radius:6px;font-family:ui-monospace,monospace">${code}</p>`
    : '';
  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title></head>
<body style="font-family:system-ui,-apple-system,sans-serif;max-width:520px;margin:48px auto;padding:0 20px;color:#18181b;line-height:1.5">
  <h1 style="font-size:1.25rem;margin:0 0 8px;color:${color}">${title}</h1>
  <p style="margin:0;color:#3f3f46">${detail}</p>
  ${codeBlock}
  <p style="margin:1.5rem 0 0;font-size:13px;color:#71717a">Sensor Tattoo Fix · Mercado Livre (pedidos)</p>
</body></html>`;
}

async function handleMlOAuthCallback(request, env) {
  const url = new URL(request.url);
  const code = String(url.searchParams.get('code') || '').trim();
  const oauthErr = String(url.searchParams.get('error') || '').trim();
  const htmlHeaders = { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' };

  if (oauthErr) {
    return new Response(mlOAuthHtmlPage({
      title: 'Autorização recusada',
      ok: false,
      detail: oauthErr + (url.searchParams.get('error_description')
        ? ` — ${url.searchParams.get('error_description')}`
        : '')
    }), { status: 400, headers: htmlHeaders });
  }

  if (!code) {
    return new Response(mlOAuthHtmlPage({
      title: 'Código ausente',
      ok: false,
      detail: 'Abra o link de autorização do app pedidosml e aceite o acesso.'
    }), { status: 400, headers: htmlHeaders });
  }

  if (!mlAppConfigured(env)) {
    return new Response(mlOAuthHtmlPage({
      title: 'App não configurado',
      ok: false,
      detail: 'Configure ML_CLIENT_ID e ML_CLIENT_SECRET no Worker e tente de novo.',
      code
    }), { status: 503, headers: htmlHeaders });
  }

  try {
    const data = await exchangeMlOAuthToken(env, {
      grant_type: 'authorization_code',
      client_id: mlClientId(env),
      client_secret: mlClientSecret(env),
      code,
      redirect_uri: ML_REDIRECT_URI
    });
    const persisted = await persistMlTokens(env, data);
    const nick = persisted.userId ? ` · user ${persisted.userId}` : '';
    return new Response(mlOAuthHtmlPage({
      title: 'Mercado Livre conectado',
      ok: true,
      detail: `Tokens salvos${nick}. Pode fechar esta aba e conferir Status das integrações no Admin.`
    }), { status: 200, headers: htmlHeaders });
  } catch (err) {
    return new Response(mlOAuthHtmlPage({
      title: 'Falha ao trocar o código',
      ok: false,
      detail: (err.message || String(err)) + ' — o código expira rápido; autorize de novo se precisar.',
      code
    }), { status: 400, headers: htmlHeaders });
  }
}

const ML_SALE_PREFIX = 'sale:ml:';
const ML_SALES_INDEX_KEY = 'sales:ml:index';
const ML_SALES_META_KEY = 'sales:ml:meta';
const ML_SYNC_LOOKBACK_DAYS = 400;
const ML_SYNC_CRON_MIN_INTERVAL_MS = 60 * 60 * 1000;
const ML_SALES_INDEX_MAX = 5000;
const ML_SYNC_PAGE_LIMIT = 50;
const ML_SYNC_MAX_PAGES = 40;

function healMlStoredShipping(sale, flexCfg) {
  if (!sale) return sale;
  const ch = String(sale.channel || 'mercadolivre').toLowerCase();
  if (ch !== 'mercadolivre' && ch !== 'ml') return sale;
  const flexList = mlMoney(sale.mlFlexListCost) || mlMoney(flexCfg);
  const shipRaw = sale.shippingCost;
  const ship = shipRaw == null || shipRaw === '' ? null : mlMoney(shipRaw);
  const isFlex = sale.mlFlex
    || /flex|self_service/i.test(String(sale.logisticType || ''))
    || (flexList > 0 && ship != null && Math.abs(ship - flexList) <= 0.06);
  if (isFlex && flexList > 0) {
    const est = mlMoney(sale.mlEstorno);
    const nextShip = flexSellerCost(flexList, est);
    if (nextShip === ship && mlMoney(sale.mlFlexListCost) === flexList && sale.shippingSource === 'flex') {
      return sale;
    }
    const payout = receiptPayout(sale.gross, sale.fees, nextShip);
    return {
      ...sale,
      mlFlex: true,
      mlFlexListCost: flexList,
      shippingCost: nextShip,
      shippingSource: 'flex',
      net: payout,
      payoutNet: payout,
      settlementVersion: ML_SETTLEMENT_VERSION
    };
  }
  // Legacy leftovers 0,36 / 9,36 → unresolved (not frete grátis)
  const repaired = repairEnviosAlreadyNet(shipRaw, null);
  if (repaired === null && (shipRaw != null && shipRaw !== '') && mlMoney(shipRaw) > 0) {
    const payout = receiptPayout(sale.gross, sale.fees, 0);
    return {
      ...sale,
      shippingCost: null,
      shippingSource: 'unresolved',
      settlementOk: false,
      shippingCostsOk: false,
      net: payout,
      payoutNet: payout
    };
  }
  // shippingCost 0 with no source = unresolved (missing Envios, not free shipping)
  if (!mlShippingResolved(sale) && (ship == null || !(ship > 0.04))) {
    if (sale.shippingSource === 'unresolved' && sale.shippingCost == null) return sale;
    return {
      ...sale,
      shippingCost: null,
      shippingSource: 'unresolved',
      settlementOk: false,
      shippingCostsOk: false
    };
  }
  return sale;
}

async function getMlSellerId(env) {
  const state = await getMlOAuthState(env);
  if (state?.userId) return String(state.userId);
  try {
    const cached = await env.STORE_KV.get(ML_TOKEN_KV_KEY);
    if (cached) {
      const data = JSON.parse(cached);
      if (data?.userId) return String(data.userId);
    }
  } catch { /* fall through */ }
  return null;
}

async function getMlSalesMeta(env) {
  try {
    const raw = await env.STORE_KV.get(ML_SALES_META_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data && typeof data === 'object' ? data : null;
  } catch {
    return null;
  }
}

async function saveMlSalesMeta(env, patch) {
  const prev = (await getMlSalesMeta(env)) || {};
  const next = { ...prev, ...patch, updatedAt: new Date().toISOString() };
  await kvPutSafe(env, ML_SALES_META_KEY, JSON.stringify(next));
  return next;
}

function marketplaceKvSaleKey(channel, id) {
  const prefixes = {
    mercadolivre: 'sale:ml:',
    amazon: 'sale:amz:',
    shopee: 'sale:shopee:'
  };
  return (prefixes[channel] || 'sale:') + String(id);
}

async function loadMarketplaceSale(env, channel, saleId) {
  const fromD1 = await d1GetSale(env, channel, saleId);
  if (fromD1) return fromD1;
  const fromKv = await env.STORE_KV.get(marketplaceKvSaleKey(channel, saleId), { type: 'json' });
  if (fromKv) {
    if (!fromKv.channel) fromKv.channel = channel;
    if (!fromKv.externalId) fromKv.externalId = String(saleId);
    await d1SaveSale(env, fromKv).catch(() => {});
    return fromKv;
  }
  return null;
}

async function saveMarketplaceSale(env, sale) {
  if (!sale?.externalId) return false;
  sale = healMlStoredShipping(sale);
  // Normalizar e anexar `payload.normalized` sem sobrescrever
  try {
    const [{ normalizeMarketplaceSale }, { calculateOrderFinancials }] = await Promise.all([
      import('./order-normalizer.js'),
      import('./order-financials.js')
    ]);
    const config = await getConfig(env).catch(() => ({}));
    const normalized = normalizeMarketplaceSale(sale, config) || {};
    // enrich with financials
    try {
      const fin = calculateOrderFinancials(sale, config);
      normalized.financials = normalized.financials || fin;
    } catch (e) {
      console.warn('calculateOrderFinancials failed:', e && e.message);
    }

    sale.payload = sale.payload || {};
    // idempotência: se já existir e for igual, evitar regravar
    const existing = await d1GetSale(env, sale.channel, sale.externalId).catch(() => null);
    const newNormalizedStr = JSON.stringify(normalized);
    const existingNormalizedStr = existing?.payload?.normalized ? JSON.stringify(existing.payload.normalized) : null;
    if (existing && existingNormalizedStr === newNormalizedStr) {
      return true;
    }

    sale.payload.normalized = normalized;
  } catch (err) {
    console.warn('normalize/saveMarketplaceSale pipeline failed:', err && err.message);
  }

  return d1SaveSale(env, sale);
}

async function listMarketplaceSales(env, channel, limit) {
  const cap = Math.min(5000, Math.max(1, Number(limit) || 500));
  const fromD1 = await d1ListSales(env, channel, cap);
  if (fromD1.length) {
    return String(channel).toLowerCase() === 'mercadolivre'
      ? fromD1.map(healMlStoredShipping)
      : fromD1;
  }
  const idxKey = channel === 'mercadolivre'
    ? ML_SALES_INDEX_KEY
    : channel === 'amazon'
      ? AMZ_SALES_INDEX_KEY
      : SHOPEE_SALES_INDEX_KEY;
  let index = [];
  try {
    const raw = await env.STORE_KV.get(idxKey);
    index = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(index)) index = [];
  } catch {
    index = [];
  }
  const sales = [];
  for (const id of index.slice(0, cap)) {
    const sale = await env.STORE_KV.get(marketplaceKvSaleKey(channel, id), { type: 'json' });
    if (!sale) continue;
    if (!sale.channel) sale.channel = channel;
    if (!sale.externalId) sale.externalId = String(id);
    sales.push(sale);
    await d1SaveSale(env, sale).catch(() => {});
  }
  return sales;
}

async function getMarketplaceIndex(env, channel, kvKey, max) {
  const fromD1 = await d1ListSaleIds(env, channel, max || 5000);
  if (fromD1.length) return fromD1;
  try {
    const raw = await env.STORE_KV.get(kvKey);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

async function getMlSalesIndex(env) {
  return getMarketplaceIndex(env, 'mercadolivre', ML_SALES_INDEX_KEY, ML_SALES_INDEX_MAX);
}

function mlDateParam(d) {
  return d.toISOString().replace(/\.\d{3}Z$/, '.000-00:00');
}

function normalizeMlOrder(order) {
  const items = (Array.isArray(order.order_items) ? order.order_items : []).map((row) => {
    const item = row.item || {};
    return {
      id: item.id || null,
      title: item.title || null,
      quantity: Number(row.quantity || 0),
      unitPrice: Number(row.unit_price ?? row.gross_price ?? 0),
      saleFee: Number(row.sale_fee || 0),
      currency: row.currency_id || order.currency_id || 'BRL'
    };
  });
  const fees = Math.round(items.reduce((sum, it) => sum + Number(it.saleFee || 0), 0) * 100) / 100;
  const itemsGross = Math.round(items.reduce((sum, it) => {
    const qty = Number(it.quantity || 0) > 0 ? Number(it.quantity) : 1;
    return sum + Number(it.unitPrice || 0) * qty;
  }, 0) * 100) / 100;
  const totalAmount = Math.round(Number(order.total_amount || 0) * 100) / 100;
  const paidAmount = Math.round(Number(order.paid_amount || 0) * 100) / 100;
  // Preço do produto (como no recibo ML). paid_amount inclui juros de parcela e frete do comprador.
  const gross = itemsGross > 0 ? itemsGross : (totalAmount || paidAmount);
  const payments = (Array.isArray(order.payments) ? order.payments : []).map((p) => ({
    id: p.id != null ? String(p.id) : null,
    status: p.status || null,
    totalPaid: Number(p.total_paid_amount ?? p.transaction_amount ?? 0),
    shippingCost: Number(p.shipping_cost || 0),
    marketplaceFee: p.marketplace_fee != null ? Number(p.marketplace_fee) : null
  }));
  const shippingHint = 0;
  const net = Math.round((gross - fees) * 100) / 100;
  const soldAt = order.date_closed || order.date_created || null;
  return {
    channel: 'mercadolivre',
    externalId: String(order.id),
    packId: order.pack_id != null ? String(order.pack_id) : null,
    soldAt,
    status: order.status || null,
    tags: Array.isArray(order.tags) ? order.tags : [],
    currency: order.currency_id || 'BRL',
    gross,
    buyerPaid: paidAmount,
    fees,
    net,
    shippingCost: null,
    shippingSource: 'unresolved',
    refunds: 0,
    otherFees: 0,
    buyer: {
      id: order.buyer?.id != null ? String(order.buyer.id) : null,
      nickname: order.buyer?.nickname || null
    },
    items,
    payments,
    shippingId: order.shipping?.id != null ? String(order.shipping.id) : null,
    logisticType: order.shipping?.logistic_type || order.shipping?.mode || null,
    shippingHint,
    settlementOk: false,
    shippingCostsOk: false,
    dateCreated: order.date_created || null,
    dateLastUpdated: order.date_last_updated || order.last_updated || null,
    syncedAt: new Date().toISOString()
  };
}

function mlHasSettlement(sale) {
  if (sale?.settlementVersion !== ML_SETTLEMENT_VERSION || sale?.settlementOk !== true) return false;
  if (!(mlMoney(sale?.payoutNet) > 0)) return false;
  if (!mlShippingResolved(sale)) return false;
  const gross = mlMoney(sale.gross);
  const fees = mlMoney(sale.fees);
  const shipping = sale.shippingCost == null ? 0 : mlMoney(sale.shippingCost);
  const payout = mlMoney(sale.payoutNet);
  if (gross > 0 && Math.abs(gross - fees - shipping - payout) > 0.06) return false;
  if (gross > 0 && shipping >= gross) return false;
  const logistic = String(sale?.logisticType || '');
  const pickup = /collect|pickup|to_agree/i.test(logistic);
  const src = String(sale.shippingSource || '');
  // Real frete 0 only when source says so (envios/flex with cost 0)
  if (!sale.mlFlex && !pickup && !(shipping > 0.04) && src !== 'envios' && src !== 'flex') return false;
  return true;
}

function mlSellerCostFromCostsPayload(data, sellerId) {
  const senders = Array.isArray(data?.senders) ? data.senders : [];
  let sender = senders[0] || data?.sender || null;
  if (sellerId && senders.length) {
    sender = senders.find((s) => String(s.user_id) === String(sellerId)) || sender;
  }
  if (!sender || sender.cost == null || sender.cost === '') {
    return { found: false, cost: null };
  }
  const n = Number(sender.cost);
  if (!Number.isFinite(n) || n < 0) return { found: false, cost: null };
  return { found: true, cost: mlMoney(n) };
}

function mlBuyerShippingFromCosts(data) {
  return mlMoney(data?.receiver?.cost);
}

function isMlFlexShipment(sale, shipment) {
  const parts = [
    sale?.logisticType,
    sale?.shippingMode,
    shipment?.logistic_type,
    shipment?.mode,
    ...(Array.isArray(sale?.tags) ? sale.tags : []),
    ...(Array.isArray(shipment?.tags) ? shipment.tags : [])
  ];
  return /flex|self_service|self-service/i.test(parts.filter(Boolean).join(' '));
}

function mlEstornoFromPayments(docs, gross, fees) {
  let estorno = 0;
  let netApi = 0;
  for (const p of docs || []) {
    const st = String(p.status || '').toLowerCase();
    if (st && !/approved|accredited/.test(st)) continue;
    // try several fields that may contain the net received / total paid
    const netFromDoc = p.transaction_details?.net_received_amount ?? p.transaction_details?.net_received_amount ?? p.net_received_amount ?? p.total_paid_amount ?? p.total_paid ?? 0;
    netApi += mlMoney(netFromDoc);

    estorno += mlMoney(p.coupon_amount ?? p.couponAmount ?? p.coupon ?? 0);

    // refunds array (various shapes)
    for (const r of p.refunds || []) {
      estorno += mlMoney(r.amount ?? r.total_refunded ?? r.refund_amount ?? 0);
    }

    // charges_details / adjustments
    for (const c of p.charges_details || []) {
      const name = `${c.name || ''} ${c.type || ''} ${c.owner || ''} ${c.concept || ''}`;
      if (/refund|estorno|rebate|discount|compensation|bonus|bônus|bonifica|shipping|envio/i.test(name)) {
        const amt = c.amounts?.original ?? c.amounts?.current ?? c.amount;
        estorno += Math.abs(mlMoney(amt));
      }
    }

    for (const f of p.fee_details || []) {
      const name = `${f.type || ''} ${f.fee_payer || ''} ${f.name || ''}`;
      if (/bonus|bônus|estorno|shipping|envio/i.test(name)) {
        estorno += Math.abs(mlMoney(f.amount));
      }
    }

    if (Array.isArray(p.adjustments)) {
      for (const a of p.adjustments) estorno += mlMoney(a.amount ?? a.value ?? 0);
    }
  }

  estorno = mlMoney(estorno);
  // fallback: infer estorno by comparing net received vs (gross - fees)
  if (estorno < 0.01 && netApi > 0 && gross > 0) {
    const credit = mlMoney(netApi - (gross - fees));
    if (credit > 0.04 && credit < 100) estorno = credit;
  }
  return estorno;
}

function mlEnviosSellerCost(costs, sellerId) {
  if (!costs) return { shipping: null, buyerShip: 0, found: false };
  const seller = mlSellerCostFromCostsPayload(costs, sellerId);
  const buyerShip = mlBuyerShippingFromCosts(costs);
  return { shipping: seller.found ? seller.cost : null, buyerShip, found: seller.found };
}

function applyMlPaymentSettlement(sale, paymentDocs, costs, sellerId, extras = {}) {
  const docs = (paymentDocs || []).filter(Boolean);
  const gross = mlMoney(sale.gross);
  let marketplaceFee = 0;
  for (const p of docs) {
    const st = String(p.status || '').toLowerCase();
    if (st && !/approved|accredited/.test(st)) continue;
    marketplaceFee += mlMoney(p.marketplace_fee);
  }
  const fees = mlMoney(sale.fees) > 0
    ? mlMoney(sale.fees)
    : (marketplaceFee > 0 ? marketplaceFee : 0);

  const flexCost = mlMoney(extras.flexCost) > 0
    ? mlMoney(extras.flexCost)
    : (Number(extras.config?.mlFlexShippingCost) > 0 ? Number(extras.config.mlFlexShippingCost) : 0);
  const fromCosts = mlEnviosSellerCost(costs, sellerId);
  const payBonus = mlEstornoFromPayments(docs, gross, fees);
  const costBonus = mlFlexBonusFromCosts(costs);
  const isFlex = sale.mlFlex
    || isMlFlexShipment(sale, extras.shipment)
    || (!fromCosts.found && (payBonus > 0 || costBonus > 0) && flexCost > 0
      && /flex|self_service/i.test(String(sale.logisticType || extras.shipment?.logistic_type || '')));
  const estorno = isFlex
    ? (costBonus > 0.01 ? costBonus : payBonus)
    : payBonus;

  let shipping = null;
  let source = 'unresolved';
  let buyerShip = fromCosts.buyerShip || mlMoney(sale.buyerShippingCost);

  if (isFlex) {
    shipping = flexSellerCost(flexCost, estorno);
    source = 'flex';
  } else if (fromCosts.found) {
    // Includes real seller cost 0,00 when ML returns cost: 0
    shipping = fromCosts.shipping;
    source = 'envios';
  } else {
    let netApi = 0;
    for (const p of docs) {
      const st = String(p.status || '').toLowerCase();
      if (st && !/approved|accredited/.test(st)) continue;
      netApi += mlMoney(p.transaction_details?.net_received_amount);
    }
    const implied = impliedEnviosFromReceipt(gross, fees, netApi);
    if (implied != null) {
      shipping = implied;
      source = 'payment_fallback';
    } else {
      shipping = null;
      source = 'unresolved';
    }
  }

  if (!(gross > 0)) return sale;

  if (source === 'unresolved') {
    const provisional = receiptPayout(gross, fees, 0);
    return {
      ...sale,
      fees,
      shippingCost: null,
      shippingSource: 'unresolved',
      buyerShippingCost: buyerShip,
      refunds: mlMoney(sale.refunds),
      mlEstorno: estorno,
      mlFlex: false,
      logisticType: extras.shipment?.logistic_type || sale.logisticType || null,
      net: provisional,
      payoutNet: provisional,
      settlementOk: false,
      settlementVersion: ML_SETTLEMENT_VERSION,
      shippingCostsOk: false
    };
  }

  const payout = receiptPayout(gross, fees, shipping);
  if (!(payout > 0) && !(shipping === 0 && source === 'envios')) {
    return {
      ...sale,
      fees,
      shippingCost: null,
      shippingSource: 'unresolved',
      settlementOk: false,
      settlementVersion: ML_SETTLEMENT_VERSION,
      shippingCostsOk: false
    };
  }

  const flexNeedsPayment = isFlex && estorno < 0.01 && !docs.length;
  return {
    ...sale,
    fees,
    shippingCost: shipping,
    buyerShippingCost: buyerShip,
    refunds: mlMoney(sale.refunds),
    mlEstorno: estorno,
    mlFlex: isFlex,
    mlFlexListCost: isFlex ? flexCost : null,
    mlFlexBonusChecked: isFlex && (estorno > 0.01 || costs != null),
    logisticType: extras.shipment?.logistic_type || sale.logisticType || null,
    net: payout,
    payoutNet: payout,
    settlementOk: !flexNeedsPayment,
    settlementVersion: ML_SETTLEMENT_VERSION,
    shippingCostsOk: true,
    shippingSource: source
  };
}

async function fetchMlPaymentDoc(token, paymentId, env) {
  if (!paymentId) return null;
  const attempts = [
    { auth: mercadoPagoToken(env), url: `https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}` },
    { auth: token, url: `${ML_API_BASE}/v1/payments/${encodeURIComponent(paymentId)}` }
  ];
  for (const { auth, url } of attempts) {
    if (!auth) continue;
    const res = await fetch(url, {
      headers: { Authorization: 'Bearer ' + auth, Accept: 'application/json' }
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data && (data.id != null || data.transaction_details)) return data;
  }
  return null;
}

function mlSaleNetFromParts(sale, shippingCost) {
  return Math.round((
    Number(sale.gross || 0)
    - Number(sale.fees || 0)
    - Number(shippingCost || 0)
    - Number(sale.refunds || 0)
    - Number(sale.otherFees || 0)
  ) * 100) / 100;
}

function mergeMlSaleShipping(existing, sale) {
  if (mlHasSettlement(sale)) {
    return {
      ...sale,
      shippingHint: 0,
      shippingSource: sale.shippingSource || 'envios',
      shippingCostsOk: true,
      settlementOk: true
    };
  }
  if (mlHasSettlement(existing) && !mlNeedsPaymentEnrich(sale)) {
    return {
      ...existing,
      ...sale,
      fees: existing.fees,
      shippingCost: existing.shippingCost,
      mlEstorno: existing.mlEstorno,
      mlFlex: existing.mlFlex,
      mlFlexListCost: existing.mlFlexListCost,
      mlFlexBonusChecked: existing.mlFlexBonusChecked,
      net: existing.payoutNet || existing.net,
      payoutNet: existing.payoutNet,
      settlementOk: true,
      settlementVersion: existing.settlementVersion,
      shippingSource: existing.shippingSource || 'envios',
      shippingCostsOk: true,
      shippingHint: 0
    };
  }
  // Prefer newly enriched unresolved/resolved over stale zeros
  if (sale.shippingSource === 'unresolved'
    || sale.shippingSource === 'envios'
    || sale.shippingSource === 'payment_fallback'
    || sale.shippingSource === 'flex') {
    return {
      ...sale,
      shippingHint: 0,
      shippingCostsOk: sale.shippingSource !== 'unresolved',
      settlementOk: !!sale.settlementOk
    };
  }
  const ship = sale.shippingCost != null && sale.shippingCost !== ''
    ? mlMoney(sale.shippingCost)
    : (existing?.shippingCost != null && existing?.shippingCost !== '' ? mlMoney(existing.shippingCost) : null);
  const src = sale.shippingSource || existing?.shippingSource || (ship == null ? 'unresolved' : null);
  return {
    ...sale,
    shippingCost: src === 'unresolved' ? null : ship,
    shippingHint: 0,
    shippingSource: src || (ship != null && ship > 0 ? existing?.shippingSource || null : 'unresolved'),
    shippingCostsOk: ship != null && src !== 'unresolved',
    settlementOk: false
  };
}

async function fetchMlOrderById(token, orderId) {
  const res = await fetch(`${ML_API_BASE}/orders/${encodeURIComponent(orderId)}`, {
    headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return null;
  return data;
}

async function fetchMlShipmentCostsPayload(token, shippingId) {
  if (!token || !shippingId) return null;
  const auth = { Authorization: 'Bearer ' + token, Accept: 'application/json' };
  const url = `${ML_API_BASE}/shipments/${encodeURIComponent(shippingId)}/costs`;
  let res = await fetch(url, { headers: { ...auth, 'x-format-new': 'true' } });
  let data = await res.json().catch(() => ({}));
  if (res.ok) return data;
  res = await fetch(url, { headers: auth });
  data = await res.json().catch(() => ({}));
  return res.ok ? data : null;
}

async function fetchMlShipment(token, shippingId) {
  if (!token || !shippingId) return null;
  const res = await fetch(`${ML_API_BASE}/shipments/${encodeURIComponent(shippingId)}`, {
    headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' }
  });
  const data = await res.json().catch(() => ({}));
  return res.ok ? data : null;
}

async function enrichMlSaleShippingCost(env, token, sale, sellerId) {
  if (!token || !sale) return sale;
  try {
    const config = await getConfig(env);
    const flexCost = Number(config?.mlFlexShippingCost) > 0 ? Number(config.mlFlexShippingCost) : 0;
    let paymentIds = (sale.payments || []).map((p) => p && p.id).filter(Boolean);
    let shippingId = sale.shippingId ? String(sale.shippingId) : '';
    let order = null;
    if (!paymentIds.length || !shippingId || !sale.logisticType) {
      order = await fetchMlOrderById(token, sale.externalId);
      if (!paymentIds.length) {
        paymentIds = (order?.payments || []).map((p) => p && p.id).filter(Boolean);
      }
      if (!shippingId && order?.shipping?.id != null) shippingId = String(order.shipping.id);
      if (order?.shipping?.logistic_type) sale = { ...sale, logisticType: order.shipping.logistic_type };
      if (Array.isArray(order?.tags) && order.tags.length) {
        sale = { ...sale, tags: [...new Set([...(sale.tags || []), ...order.tags])] };
      }
    }
    const docs = [];
    for (const id of paymentIds) {
      const doc = await fetchMlPaymentDoc(token, id, env);
      if (doc) docs.push(doc);
    }
    const shipment = shippingId ? await fetchMlShipment(token, shippingId) : null;
    const costs = shippingId ? await fetchMlShipmentCostsPayload(token, shippingId) : null;
    return applyMlPaymentSettlement(sale, docs, costs, sellerId, { flexCost, shipment });
  } catch {
    return sale;
  }
}

async function upsertMlSale(env, sale, index) {
  await saveMarketplaceSale(env, sale);
  const next = (index || []).filter((id) => id !== sale.externalId);
  next.unshift(sale.externalId);
  return next.slice(0, ML_SALES_INDEX_MAX);
}

function mlLooksFlexSale(sale, flexCost) {
  const list = mlMoney(sale?.mlFlexListCost) || mlMoney(flexCost);
  const ship = mlMoney(sale?.shippingCost);
  return !!(sale?.mlFlex
    || /flex|self_service/i.test(String(sale?.logisticType || ''))
    || (list > 0 && Math.abs(ship - list) <= 0.06));
}

function mlNeedsPaymentEnrich(sale, flexCost) {
  if (!sale) return false;
  if (mlLooksFlexSale(sale, flexCost)) {
    return mlMoney(sale.mlEstorno) < 0.01;
  }
  if (!mlShippingResolved(sale)) return true;
  if (sale.shippingSource === 'unresolved') return true;
  if (sale.shippingCost == null || sale.shippingCost === '') return true;
  const ship = mlMoney(sale.shippingCost);
  if (Math.abs(ship - 0.36) <= 0.02 || Math.abs(ship - 9.36) <= 0.02) return true;
  // Legacy "payment" without settlement version — re-resolve via Envios API
  if (sale.shippingSource === 'payment' || sale.shippingSource == null) return true;
  if (sale.shippingSource !== 'envios' && sale.shippingSource !== 'payment_fallback' && sale.shippingSource !== 'flex') {
    return true;
  }
  if (sale.settlementVersion !== ML_SETTLEMENT_VERSION) return true;
  return false;
}

async function backfillMlZeroShipping(env, token, sellerId, index, limit) {
  const cap = Math.max(0, Math.min(Number(limit) || 25, 40));
  const config = await getConfig(env).catch(() => ({}));
  const flexCost = Number(config?.mlFlexShippingCost) > 0 ? Number(config.mlFlexShippingCost) : 0;
  let filled = 0;
  let remaining = 0;
  let attempted = 0;
  for (const id of index || []) {
    const sale = await loadMarketplaceSale(env, 'mercadolivre', id);
    if (!sale) continue;
    if (!mlNeedsPaymentEnrich(sale, flexCost)) continue;
    if (sale.shippingSource === 'unresolved' && sale.shippingResolvedAt) {
      const age = Date.now() - Date.parse(sale.shippingResolvedAt);
      if (Number.isFinite(age) && age < 6 * 3600 * 1000) continue;
    }
    if (attempted >= cap) {
      remaining += 1;
      continue;
    }
    attempted += 1;
    const next = await enrichMlSaleShippingCost(env, token, sale, sellerId);
    const merged = mergeMlSaleShipping(sale, next);
    await saveMarketplaceSale(env, {
      ...merged,
      shippingResolvedAt: new Date().toISOString()
    });
    if (mlShippingResolved(merged) && merged.shippingSource !== 'unresolved') {
      filled += 1;
    }
  }
  return { filled, remaining };
}

async function fetchMlOrdersPage(env, token, sellerId, { from, to, offset, limit }) {
  const params = new URLSearchParams({
    seller: String(sellerId),
    'order.status': 'paid',
    sort: 'date_desc',
    offset: String(offset || 0),
    limit: String(limit || ML_SYNC_PAGE_LIMIT)
  });
  if (from) params.set('order.date_created.from', mlDateParam(from));
  if (to) params.set('order.date_created.to', mlDateParam(to));
  const res = await fetch(`${ML_API_BASE}/orders/search?${params}`, {
    headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.message || data.error || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return data;
}

/**
 * Sync paid ML orders into KV. Default window: last 90 days (or since last sync − 2d).
 * options: { days, full, force }
 */
async function syncMlOrders(env, options = {}) {
  let token;
  try {
    token = await getMlAccessToken(env);
  } catch (err) {
    throw new Error(
      'Mercado Livre: renovação automática falhou (' + (err.message || err) + ').'
    );
  }
  if (!token) throw new Error('Mercado Livre sem token — o Worker não encontrou refresh token para renovar sozinho.');
  let sellerId = await getMlSellerId(env);
  if (!sellerId) {
    const meRes = await fetch(`${ML_API_BASE}/users/me`, {
      headers: { Authorization: 'Bearer ' + token }
    });
    const me = await meRes.json().catch(() => ({}));
    if (!meRes.ok || me.id == null) throw new Error('Não foi possível obter seller id ML.');
    sellerId = String(me.id);
    await saveMlOAuthState(env, { userId: sellerId, nickname: me.nickname || null });
  }

  const meta = await getMlSalesMeta(env);
  const now = new Date();
  const full = options.full === true || !meta?.lastSyncedAt;
  const days = Math.min(400, Math.max(1, Number(options.days) || ML_SYNC_LOOKBACK_DAYS));
  let from;
  if (full || options.days) {
    from = new Date(now.getTime() - days * 86400000);
  } else {
    const last = new Date(meta.lastSyncedAt);
    from = new Date(last.getTime() - 2 * 86400000);
  }
  const maxPages = Math.min(
    ML_SYNC_MAX_PAGES,
    Math.max(1, Number(options.maxPages) || ML_SYNC_MAX_PAGES)
  );
  const to = now;
  let offset = Math.max(0, Number(options.offset) || 0);
  let pages = 0;
  let imported = 0;
  let updated = 0;
  let unchanged = 0;
  let index = await getMlSalesIndex(env);
  let totalApi = null;

  while (pages < maxPages) {
    const data = await fetchMlOrdersPage(env, token, sellerId, {
      from, to, offset, limit: ML_SYNC_PAGE_LIMIT
    });
    if (totalApi == null) totalApi = Number(data.paging?.total ?? 0);
    const results = Array.isArray(data.results) ? data.results : [];
    if (!results.length) break;

    const config = await getConfig(env).catch(() => ({}));
    const flexCost = Number(config?.mlFlexShippingCost) > 0 ? Number(config.mlFlexShippingCost) : 0;
    let enrichBudget = Math.max(0, Math.min(20, Number(options.enrichBudget != null ? options.enrichBudget : 12)));

    for (const order of results) {
      let sale = normalizeMlOrder(order);
      let existing = null;
      if (options.skipExistingRead !== true) {
        existing = await loadMarketplaceSale(env, 'mercadolivre', sale.externalId);
      }
      const alreadyOk = mlHasSettlement(existing) && !mlNeedsPaymentEnrich(existing, flexCost);
      const needs = !alreadyOk && (
        !existing || mlNeedsPaymentEnrich(existing || sale, flexCost)
      );
      if (needs && enrichBudget > 0 && options.enrichShipping !== false) {
        sale = await enrichMlSaleShippingCost(env, token, sale, sellerId);
        enrichBudget -= 1;
      } else if (existing && alreadyOk) {
        sale = {
          ...sale,
          shippingCost: existing.shippingCost,
          shippingSource: existing.shippingSource,
          fees: existing.fees,
          net: existing.payoutNet || existing.net,
          payoutNet: existing.payoutNet,
          settlementOk: existing.settlementOk,
          settlementVersion: existing.settlementVersion,
          mlFlex: existing.mlFlex,
          mlEstorno: existing.mlEstorno,
          mlFlexListCost: existing.mlFlexListCost
        };
      }
      sale = mergeMlSaleShipping(existing, sale);
      if (existing && marketplaceSaleUnchanged(existing, sale)) {
        unchanged += 1;
        continue;
      }
      if (existing) updated += 1;
      else imported += 1;
      await saveMarketplaceSale(env, sale);
      const next = (index || []).filter((id) => id !== sale.externalId);
      next.unshift(sale.externalId);
      index = next.slice(0, ML_SALES_INDEX_MAX);
    }

    pages += 1;
    offset += results.length;
    const pagingTotal = Number(data.paging?.total ?? 0);
    if (offset >= pagingTotal || results.length < ML_SYNC_PAGE_LIMIT) break;
  }

  const backfillLimit = Math.max(0, Number(
    options.backfillShipping != null ? options.backfillShipping : 25
  ));
  const shippingReport = backfillLimit > 0
    ? await backfillMlZeroShipping(env, token, sellerId, index, backfillLimit)
    : { filled: 0, remaining: 0 };
  const shippingFilled = shippingReport.filled;

  const report = {
    ok: true,
    sellerId,
    full,
    from: from.toISOString(),
    to: to.toISOString(),
    pages,
    apiTotal: totalApi,
    imported,
    updated,
    unchanged,
    indexed: index.length,
    shippingFilled,
    shippingRemaining: shippingReport.remaining,
    nextOffset: offset,
    hasMore: totalApi != null && offset < totalApi,
    lastSyncedAt: now.toISOString(),
    lastError: null
  };
  await saveMlSalesMeta(env, report);
  return report;
}

async function runScheduledMlOrdersSync(env) {
  if (!mlAppConfigured(env)) return { skipped: true, reason: 'not_configured' };
  try {
    const report = await syncMlOrders(env, {
      full: false,
      enrichShipping: false,
      skipExistingRead: false,
      backfillShipping: 0,
      maxPages: 2
    });
    console.log('ML orders sync cron:', JSON.stringify({
      imported: report.imported,
      updated: report.updated,
      indexed: report.indexed
    }));
    return report;
  } catch (err) {
    await saveMlSalesMeta(env, {
      lastError: err.message || String(err),
      lastErrorAt: new Date().toISOString()
    }).catch(() => {});
    throw err;
  }
}

function buildMlAuthUrl(env) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: mlClientId(env),
    redirect_uri: ML_REDIRECT_URI
  });
  return `https://auth.mercadolivre.com.br/authorization?${params}`;
}

async function handleAdminMlAuthUrl(request, env, origin) {
  if (!(await isValidSession(env, bearerToken(request)))) {
    return json({ error: 'Não autorizado.' }, 401, origin);
  }
  if (!mlAppConfigured(env)) {
    return json({ error: 'ML_CLIENT_ID / ML_CLIENT_SECRET não configurados.', redirectUri: ML_REDIRECT_URI }, 400, origin);
  }
  return json({ ok: true, url: buildMlAuthUrl(env), redirectUri: ML_REDIRECT_URI }, 200, origin);
}

async function handleAdminMlSync(request, env, origin, ctx) {
  if (!(await isValidSession(env, bearerToken(request)))) {
    return json({ error: 'Não autorizado.' }, 401, origin);
  }
  const url = new URL(request.url);
  if (request.method === 'GET') {
    const meta = await getMlSalesMeta(env);
    const index = await getMlSalesIndex(env);
    return json({ ok: true, meta, indexed: index.length }, 200, origin);
  }
  const daysParam = url.searchParams.get('days');
  try {
    const report = await syncMlOrders(env, {
      full: true,
      days: daysParam ? Number(daysParam) : 400,
      offset: 0,
      backfillShipping: 30,
      enrichBudget: 12,
      skipExistingRead: false,
      maxPages: 8
    });
    const envios = await refillPendingMlEnvios(env);
    const refill = await refillPendingMlFlex(env);
    report.flexFilled = refill.filled;
    report.flexRemaining = refill.remaining;
    report.enviosFilled = envios.filled;
    report.enviosRemaining = envios.remaining;
    report.shippingFilled = (report.shippingFilled || 0) + refill.filled + envios.filled;
    if (ctx && typeof ctx.waitUntil === 'function') {
      if (report.hasMore) {
        ctx.waitUntil(syncMlOrders(env, {
          full: true,
          days: daysParam ? Number(daysParam) : 400,
          offset: report.nextOffset,
          backfillShipping: 30,
          enrichBudget: 12,
          skipExistingRead: false,
          maxPages: 8
        }).catch(() => {}));
      }
      if (refill.remaining > 0) {
        ctx.waitUntil(refillPendingMlFlex(env).catch(() => {}));
      }
      if (envios.remaining > 0 || report.shippingRemaining > 0) {
        ctx.waitUntil(refillMlEnviosBatches(env, 12).catch(() => {}));
      }
    }
    return json(report, 200, origin);
  } catch (err) {
    const msg = err.message || String(err);
    if (/subrequest|1102|exceeded/i.test(msg)) {
      return json({
        ok: true,
        truncated: true,
        imported: 0,
        updated: 0,
        shippingFilled: 0,
        error: 'O Cloudflare cortou no meio. Clica Atualizar ML de novo — continua de onde parou.'
      }, 200, origin);
    }
    return json({ error: msg }, 502, origin);
  }
}

async function refillMlFlexBonus(env, sales, flexCost) {
  const listCost = mlMoney(flexCost);
  const token = await getMlAccessToken(env).catch(() => null);
  const sellerId = await getMlSellerId(env);
  let filled = 0;
  let remaining = 0;
  const out = [];
  for (const sale of sales || []) {
    let s = healMlStoredShipping(sale, listCost);
    const list = mlMoney(s.mlFlexListCost) || listCost;
    const looksFlex = s.mlFlex
      || /flex|self_service/i.test(String(s.logisticType || ''))
      || (list > 0 && Math.abs(mlMoney(s.shippingCost) - list) <= 0.06)
      || (list > 0 && Math.abs(mlMoney(sale.shippingCost) - list) <= 0.06);
    if (
      looksFlex
      && list > 0
      && token
      && filled < 8
      && mlMoney(s.mlEstorno) < 0.01
    ) {
      try {
        const next = await enrichMlSaleShippingCost(env, token, {
          ...s,
          mlFlex: true,
          mlFlexListCost: list
        }, sellerId);
        if (next) {
          const saved = healMlStoredShipping({ ...next, mlFlex: true, mlFlexListCost: list }, list);
          await saveMarketplaceSale(env, saved).catch(() => {});
          s = saved;
          filled += 1;
        }
      } catch {
        /* keep healed row */
      }
    } else if (looksFlex && list > 0 && mlMoney(s.mlEstorno) < 0.01) {
      remaining += 1;
    }
    out.push(s);
  }
  return { sales: out, filled, remaining };
}

async function refillPendingMlFlex(env) {
  const config = await getConfig(env).catch(() => ({}));
  const flexCost = Number(config?.mlFlexShippingCost) > 0 ? Number(config.mlFlexShippingCost) : 0;
  const sales = await listMarketplaceSales(env, 'mercadolivre', 400);
  return refillMlFlexBonus(env, sales, flexCost);
}

async function refillPendingMlEnvios(env) {
  const token = await getMlAccessToken(env).catch(() => null);
  if (!token) return { filled: 0, remaining: 0 };
  const sellerId = await getMlSellerId(env);
  const index = await getMlSalesIndex(env);
  return backfillMlZeroShipping(env, token, sellerId, index, 30);
}

/** Keep resolving Envios frete in small batches (Cloudflare subrequest budget). */
async function refillMlEnviosBatches(env, maxRounds = 12) {
  let totalFilled = 0;
  let last = { filled: 0, remaining: 0 };
  for (let i = 0; i < maxRounds; i++) {
    last = await refillPendingMlEnvios(env);
    totalFilled += last.filled || 0;
    if (!(last.remaining > 0) || !(last.filled > 0)) break;
  }
  return { filled: totalFilled, remaining: last.remaining || 0 };
}

async function handleAdminMlSales(request, env, origin) {
  const url = new URL(request.url);
  const key = url.searchParams.get('key') || '';
  if (!(await isValidSession(env, bearerToken(request)))) {
    if (!env.BACKFILL_KEY || key !== String(env.BACKFILL_KEY)) {
      return json({ error: 'Não autorizado.' }, 401, origin);
    }
  }
  await refillPendingMlEnvios(env).catch(() => {});
  const limit = Math.min(500, Math.max(1, Number(url.searchParams.get('limit')) || 400));
  const sales = await listMarketplaceSales(env, 'mercadolivre', limit);
  const totalIndexed = await d1CountSales(env, 'mercadolivre');
  const meta = await getMlSalesMeta(env);
  return json({ ok: true, meta, totalIndexed: totalIndexed || sales.length, sales }, 200, origin);
}

/** Amazon SP-API (Brasil) — LWA only, sem AWS SigV4. */
const AMZ_API_HOST = 'https://sellingpartnerapi-na.amazon.com';
const AMZ_LWA_TOKEN_URL = 'https://api.amazon.com/auth/o2/token';
const AMZ_TOKEN_KV_KEY = 'amz:token';
const AMZ_OAUTH_KV_KEY = 'amz:oauth';
const AMZ_SALE_PREFIX = 'sale:amz:';
const AMZ_SALES_INDEX_KEY = 'sales:amz:index';
const AMZ_SALES_META_KEY = 'sales:amz:meta';
const AMZ_SYNC_LOOKBACK_DAYS = 90;
const AMZ_SYNC_CRON_MIN_INTERVAL_MS = 60 * 60 * 1000;
const AMZ_SALES_INDEX_MAX = 5000;
const AMZ_SYNC_MAX_PAGES = 40;
const AMZ_BR_MARKETPLACE = 'A2Q3Y263D00KWC';
const AMZ_USER_AGENT = 'SensorTattooFix/1.0 (Language=JavaScript; Platform=CloudflareWorkers)';

function amzClientId(env) {
  return String(env.AMZ_LWA_CLIENT_ID || '').trim();
}

function amzClientSecret(env) {
  return String(env.AMZ_LWA_CLIENT_SECRET || '').trim();
}

function amzMarketplaceId(env) {
  return String(env.AMZ_MARKETPLACE_ID || AMZ_BR_MARKETPLACE).trim() || AMZ_BR_MARKETPLACE;
}

function amzAppConfigured(env) {
  return !!(amzClientId(env) && amzClientSecret(env));
}

async function getAmzOAuthState(env) {
  try {
    const raw = await env.STORE_KV.get(AMZ_OAUTH_KV_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data && typeof data === 'object' ? data : null;
  } catch {
    return null;
  }
}

async function saveAmzOAuthState(env, patch) {
  const prev = (await getAmzOAuthState(env)) || {};
  const next = { ...prev, ...patch, updatedAt: new Date().toISOString() };
  await kvPut(env, AMZ_OAUTH_KV_KEY, JSON.stringify(next));
  return next;
}

async function getAmzRefreshToken(env) {
  const state = await getAmzOAuthState(env);
  const fromKv = String(state?.refreshToken || '').trim();
  if (fromKv) return fromKv;
  return String(env.AMZ_LWA_REFRESH_TOKEN || '').trim();
}

async function getAmzAccessToken(env) {
  if (!amzAppConfigured(env)) return null;
  try {
    const cached = await env.STORE_KV.get(AMZ_TOKEN_KV_KEY);
    if (cached) {
      const data = JSON.parse(cached);
      if (data?.token && data.expiresAt > Date.now()) return data.token;
    }
  } catch { /* refresh */ }

  const refreshToken = await getAmzRefreshToken(env);
  if (!refreshToken) return null;

  const res = await fetch(AMZ_LWA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: amzClientId(env),
      client_secret: amzClientSecret(env)
    })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.warn('Amazon LWA refresh:', res.status, data.error_description || data.error || '');
    await kvDelete(env, AMZ_TOKEN_KV_KEY).catch(() => {});
    return null;
  }
  const access = String(data.access_token || '').trim();
  if (!access) return null;
  const ttl = Math.max(60, Number(data.expires_in || 3600) - 120);
  await kvPut(env, AMZ_TOKEN_KV_KEY, JSON.stringify({
    token: access,
    expiresAt: Date.now() + ttl * 1000
  }));
  if (data.refresh_token) {
    await saveAmzOAuthState(env, { refreshToken: String(data.refresh_token) });
  }
  return access;
}

async function checkAmazonIntegration(env) {
  if (!amzAppConfigured(env)) {
    return {
      configured: false,
      authOk: false,
      error: 'AMZ_LWA_CLIENT_ID / AMZ_LWA_CLIENT_SECRET não configurados.'
    };
  }
  const refreshToken = await getAmzRefreshToken(env);
  if (!refreshToken) {
    return {
      configured: true,
      authOk: false,
      needsOAuth: true,
      error: 'Sem refresh token — autorize o app no Solution Provider Portal.'
    };
  }
  try {
    const token = await getAmzAccessToken(env);
    if (!token) {
      return {
        configured: true,
        authOk: false,
        needsOAuth: true,
        error: 'Falha ao renovar token Amazon — confira Client Secret / Refresh token.'
      };
    }
    const marketplaceId = amzMarketplaceId(env);
    const createdAfter = new Date(Date.now() - 7 * 86400000).toISOString();
    const qs = new URLSearchParams({
      MarketplaceIds: marketplaceId,
      CreatedAfter: createdAfter,
      MaxResultsPerPage: '1'
    });
    const res = await fetch(`${AMZ_API_HOST}/orders/v0/orders?${qs}`, {
      headers: {
        'x-amz-access-token': token,
        Accept: 'application/json',
        'User-Agent': AMZ_USER_AGENT
      }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data?.errors?.[0]?.message || data.message || `HTTP ${res.status}`;
      return { configured: true, authOk: false, error: msg };
    }
    return {
      configured: true,
      authOk: true,
      marketplaceId,
      lastSyncedAt: (await getAmzSalesMeta(env))?.lastSyncedAt || null
    };
  } catch (err) {
    return { configured: true, authOk: false, error: err.message };
  }
}

async function getAmzSalesMeta(env) {
  try {
    const raw = await env.STORE_KV.get(AMZ_SALES_META_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data && typeof data === 'object' ? data : null;
  } catch {
    return null;
  }
}

async function saveAmzSalesMeta(env, patch) {
  const prev = (await getAmzSalesMeta(env)) || {};
  const next = { ...prev, ...patch, updatedAt: new Date().toISOString() };
  await kvPutSafe(env, AMZ_SALES_META_KEY, JSON.stringify(next));
  return next;
}

async function getAmzSalesIndex(env) {
  return getMarketplaceIndex(env, 'amazon', AMZ_SALES_INDEX_KEY, AMZ_SALES_INDEX_MAX);
}

async function amzFetchOrderFinancials(env, token, orderId) {
  const res = await fetch(
    `${AMZ_API_HOST}/finances/v0/orders/${encodeURIComponent(orderId)}/financialEvents?MaxResultsPerPage=100`,
    {
      headers: {
        'x-amz-access-token': token,
        Accept: 'application/json',
        'User-Agent': AMZ_USER_AGENT
      }
    }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.errors?.[0]?.message || data.message || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return data.payload?.FinancialEvents || data.FinancialEvents || {};
}

function normalizeAmzOrder(order, items, financeSummary, financesFetched) {
  const orderTotal = amzRound2(Number(order.OrderTotal?.Amount || 0));
  const currency = order.OrderTotal?.CurrencyCode || 'BRL';
  const mappedItems = (Array.isArray(items) ? items : []).map((row) => ({
    id: row.ASIN || row.SellerSKU || null,
    title: row.Title || null,
    quantity: Number(row.QuantityOrdered || 0),
    unitPrice: Number(row.ItemPrice?.Amount || 0),
    saleFee: 0,
    currency: row.ItemPrice?.CurrencyCode || currency
  }));
  const fin = financeSummary && typeof financeSummary === 'object' ? financeSummary : null;
  const hasRefund = !!(fin && fin.hasRefund);
  // Bruto = valor original do pedido (não zera com estorno).
  const gross = orderTotal || (fin ? amzRound2(fin.principalSold || 0) : 0);
  const fees = financesFetched && fin ? amzRound2(fin.commission) : 0;
  const shippingCost = financesFetched && fin ? amzRound2(fin.shipping) : 0;
  const refunds = financesFetched && fin ? amzRound2(fin.refunds || 0) : 0;
  const otherFees = financesFetched && fin ? amzRound2(fin.otherFees || 0) : 0;
  // Líquido = bruto − comissão − frete − estornos − outras taxas
  const net = amzRound2(gross - fees - shippingCost - refunds - otherFees);
  return {
    channel: 'amazon',
    externalId: String(order.AmazonOrderId || ''),
    packId: null,
    soldAt: order.PurchaseDate || order.LastUpdateDate || null,
    status: order.OrderStatus || null,
    tags: [order.FulfillmentChannel, order.SalesChannel].filter(Boolean),
    currency,
    gross: amzRound2(gross),
    fees: amzRound2(fees),
    net,
    shippingCost: amzRound2(shippingCost),
    refunds: amzRound2(refunds),
    otherFees: amzRound2(otherFees),
    pocketNet: financesFetched && fin ? amzRound2(fin.net) : null,
    financesOk: !!financesFetched,
    hasRefund,
    buyer: {
      id: null,
      nickname: order.BuyerInfo?.BuyerName || order.BuyerEmail || null
    },
    items: mappedItems,
    payments: [],
    shippingId: null,
    dateCreated: order.PurchaseDate || null,
    dateLastUpdated: order.LastUpdateDate || null,
    syncedAt: new Date().toISOString(),
    feesNote: financesFetched
      ? null
      : 'Financeiro Amazon ainda não disponível para este pedido (pode demorar após a venda).'
  };
}

async function upsertAmzSale(env, sale, index) {
  const existing = await loadMarketplaceSale(env, 'amazon', sale.externalId);
  if (!existing || !marketplaceSaleUnchanged(existing, sale)) {
    await saveMarketplaceSale(env, sale);
  }
  const next = (index || []).filter((id) => id !== sale.externalId);
  next.unshift(sale.externalId);
  return next.slice(0, AMZ_SALES_INDEX_MAX);
}

async function amzFetchOrdersPage(env, token, { createdAfter, createdBefore, nextToken }) {
  const params = new URLSearchParams();
  params.set('MarketplaceIds', amzMarketplaceId(env));
  params.set('MaxResultsPerPage', '50');
  if (nextToken) {
    params.set('NextToken', nextToken);
  } else {
    params.set('CreatedAfter', createdAfter);
    if (createdBefore) params.set('CreatedBefore', createdBefore);
    params.set('OrderStatuses', 'Shipped,Unshipped,PartiallyShipped,InvoiceUnconfirmed');
  }
  const res = await fetch(`${AMZ_API_HOST}/orders/v0/orders?${params}`, {
    headers: {
      'x-amz-access-token': token,
      Accept: 'application/json',
      'User-Agent': AMZ_USER_AGENT
    }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.errors?.[0]?.message || data.message || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return data.payload || data;
}

async function amzFetchOrderItems(env, token, orderId) {
  const res = await fetch(
    `${AMZ_API_HOST}/orders/v0/orders/${encodeURIComponent(orderId)}/orderItems`,
    {
      headers: {
        'x-amz-access-token': token,
        Accept: 'application/json',
        'User-Agent': AMZ_USER_AGENT
      }
    }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return [];
  return data.payload?.OrderItems || data.OrderItems || [];
}

async function syncAmzOrders(env, options = {}) {
  const token = await getAmzAccessToken(env);
  if (!token) throw new Error('Amazon sem access token — confira Client ID/Secret/Refresh token.');

  const meta = await getAmzSalesMeta(env);
  const now = new Date();
  // SP-API exige CreatedBefore ≥ 2 min no passado (atraso sistemático de indexação).
  const queryEnd = new Date(now.getTime() - 3 * 60 * 1000);
  const full = options.full === true || !meta?.lastSyncedAt;
  const days = Math.min(365, Math.max(1, Number(options.days) || AMZ_SYNC_LOOKBACK_DAYS));
  let from;
  if (full || options.days) {
    from = new Date(queryEnd.getTime() - days * 86400000);
  } else {
    const last = new Date(meta.lastSyncedAt);
    from = new Date(last.getTime() - 2 * 86400000);
  }

  let nextToken = null;
  let pages = 0;
  let imported = 0;
  let updated = 0;
  let unchanged = 0;
  let index = await getAmzSalesIndex(env);
  let apiTotal = 0;

  do {
    const payload = await amzFetchOrdersPage(env, token, {
      createdAfter: from.toISOString(),
      createdBefore: queryEnd.toISOString(),
      nextToken
    });
    const orders = Array.isArray(payload.Orders) ? payload.Orders : [];
    apiTotal += orders.length;
    for (const order of orders) {
      if (!order?.AmazonOrderId) continue;
      if (String(order.OrderStatus || '').toLowerCase() === 'canceled') continue;
      let items = [];
      try {
        items = await amzFetchOrderItems(env, token, order.AmazonOrderId);
      } catch { /* keep empty items */ }
      let financeSummary = null;
      let financesFetched = false;
      try {
        const events = await amzFetchOrderFinancials(env, token, order.AmazonOrderId);
        financeSummary = summarizeAmzFinancialEvents(events);
        financesFetched = true;
      } catch (err) {
        console.warn('Amazon finances', order.AmazonOrderId, err.message || err);
      }
      const sale = normalizeAmzOrder(order, items, financeSummary, financesFetched);
      if (!sale.externalId) continue;
      const existing = await loadMarketplaceSale(env, 'amazon', sale.externalId);
      if (existing && marketplaceSaleUnchanged(existing, sale)) unchanged += 1;
      else if (existing) updated += 1;
      else imported += 1;
      index = await upsertAmzSale(env, sale, index);
      await new Promise((r) => setTimeout(r, 250));
    }
    pages += 1;
    nextToken = payload.NextToken || null;
  } while (nextToken && pages < AMZ_SYNC_MAX_PAGES);

  // Atualiza Finances de todos os indexados (full) ou só os que faltam.
  let financesBackfilled = 0;
  for (const id of index) {
    let sale;
    sale = await loadMarketplaceSale(env, 'amazon', id);
    if (!sale) continue;
    if (sale?.financesOk && !full) continue;
    try {
      const events = await amzFetchOrderFinancials(env, token, id);
      const fin = summarizeAmzFinancialEvents(events);
      const hasRefund = !!fin.hasRefund;
      const gross = amzRound2(Number(sale.gross || 0) || fin.principalSold || 0);
      const fees = amzRound2(fin.commission);
      const shippingCost = amzRound2(fin.shipping);
      const refunds = amzRound2(fin.refunds || 0);
      const otherFees = amzRound2(fin.otherFees || 0);
      sale.gross = gross;
      sale.fees = fees;
      sale.shippingCost = shippingCost;
      sale.refunds = refunds;
      sale.otherFees = otherFees;
      sale.net = amzRound2(gross - fees - shippingCost - refunds - otherFees);
      sale.pocketNet = amzRound2(fin.net);
      sale.financesOk = true;
      sale.hasRefund = hasRefund;
      sale.feesNote = null;
      sale.syncedAt = new Date().toISOString();
      await saveMarketplaceSale(env, sale);
      financesBackfilled += 1;
      updated += 1;
      await new Promise((r) => setTimeout(r, 250));
    } catch (err) {
      console.warn('Amazon finances backfill', id, err.message || err);
    }
  }

  const report = {
    ok: true,
    marketplaceId: amzMarketplaceId(env),
    full,
    from: from.toISOString(),
    to: queryEnd.toISOString(),
    pages,
    apiTotal,
    imported,
    updated,
    unchanged,
    financesBackfilled,
    indexed: index.length,
    lastSyncedAt: now.toISOString(),
    lastError: null
  };
  await saveAmzSalesMeta(env, report);
  return report;
}

async function runScheduledAmzOrdersSync(env) {
  if (!amzAppConfigured(env)) return { skipped: true, reason: 'not_configured' };
  const meta = await getAmzSalesMeta(env);
  if (meta?.lastSyncedAt) {
    const age = Date.now() - new Date(meta.lastSyncedAt).getTime();
    if (Number.isFinite(age) && age < AMZ_SYNC_CRON_MIN_INTERVAL_MS) {
      return { skipped: true, reason: 'throttle', ageMs: age };
    }
  }
  try {
    const report = await syncAmzOrders(env, { full: !meta?.lastSyncedAt });
    console.log('Amazon orders sync cron:', JSON.stringify({
      imported: report.imported,
      updated: report.updated,
      indexed: report.indexed
    }));
    return report;
  } catch (err) {
    await saveAmzSalesMeta(env, {
      lastError: err.message || String(err),
      lastErrorAt: new Date().toISOString()
    }).catch(() => {});
    throw err;
  }
}

async function handleAdminAmzSync(request, env, origin) {
  if (!(await isValidSession(env, bearerToken(request)))) {
    return json({ error: 'Não autorizado.' }, 401, origin);
  }
  const url = new URL(request.url);
  if (request.method === 'GET') {
    const meta = await getAmzSalesMeta(env);
    const index = await getAmzSalesIndex(env);
    return json({ ok: true, meta, indexed: index.length }, 200, origin);
  }
  const daysParam = url.searchParams.get('days');
  const full = url.searchParams.get('full') === '1' || url.searchParams.get('full') === 'true';
  try {
    const report = await syncAmzOrders(env, {
      full,
      days: daysParam ? Number(daysParam) : undefined
    });
    return json(report, 200, origin);
  } catch (err) {
    return json({ error: err.message || String(err) }, 502, origin);
  }
}

async function handleAdminAmzSales(request, env, origin) {
  if (!(await isValidSession(env, bearerToken(request)))) {
    return json({ error: 'Não autorizado.' }, 401, origin);
  }
  const url = new URL(request.url);
  const limit = Math.min(5000, Math.max(1, Number(url.searchParams.get('limit')) || 5000));
  const sales = await listMarketplaceSales(env, 'amazon', limit);
  const totalIndexed = await d1CountSales(env, 'amazon');
  const meta = await getAmzSalesMeta(env);
  return json({ ok: true, meta, totalIndexed: totalIndexed || sales.length, sales }, 200, origin);
}

/** Shopee Open Platform v2 — Seller In House (BR). */
const SHOPEE_API_HOST = 'https://openplatform.shopee.com.br';
const SHOPEE_OAUTH_KV_KEY = 'shopee:oauth';
const SHOPEE_TOKEN_KV_KEY = 'shopee:token';
const SHOPEE_SALE_PREFIX = 'sale:shopee:';
const SHOPEE_SALES_INDEX_KEY = 'sales:shopee:index';
const SHOPEE_SALES_META_KEY = 'sales:shopee:meta';
const SHOPEE_REDIRECT_URI = 'https://api.sensortattoofix.com.br/admin/shopee/oauth/callback';
const SHOPEE_SYNC_LOOKBACK_DAYS = 90;
const SHOPEE_SYNC_CRON_MIN_INTERVAL_MS = 60 * 60 * 1000;
const SHOPEE_SALES_INDEX_MAX = 5000;
const SHOPEE_ORDER_WINDOW_SEC = 15 * 86400;
const SHOPEE_PAID_STATUSES = new Set([
  'READY_TO_SHIP', 'PROCESSED', 'SHIPPED', 'TO_CONFIRM_RECEIVE', 'COMPLETED'
]);

function shopeePartnerId(env) {
  return String(env.SHOPEE_PARTNER_ID || '').trim();
}

function shopeePartnerKey(env) {
  return String(env.SHOPEE_PARTNER_KEY || '').trim();
}

function shopeeAppConfigured(env) {
  return !!(shopeePartnerId(env) && shopeePartnerKey(env));
}

async function shopeeHmacHex(key, message) {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function shopeeSign(env, path, timestamp, accessToken, shopId) {
  let base = `${shopeePartnerId(env)}${path}${timestamp}`;
  if (accessToken) base += accessToken;
  if (shopId) base += String(shopId);
  return shopeeHmacHex(shopeePartnerKey(env), base);
}

async function getShopeeOAuthState(env) {
  try {
    const raw = await env.STORE_KV.get(SHOPEE_OAUTH_KV_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data && typeof data === 'object' ? data : null;
  } catch {
    return null;
  }
}

async function saveShopeeOAuthState(env, patch) {
  const prev = (await getShopeeOAuthState(env)) || {};
  const next = { ...prev, ...patch, updatedAt: new Date().toISOString() };
  await kvPut(env, SHOPEE_OAUTH_KV_KEY, JSON.stringify(next));
  return next;
}

async function getShopeeSalesMeta(env) {
  try {
    const raw = await env.STORE_KV.get(SHOPEE_SALES_META_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data && typeof data === 'object' ? data : null;
  } catch {
    return null;
  }
}

async function saveShopeeSalesMeta(env, patch) {
  const prev = (await getShopeeSalesMeta(env)) || {};
  const next = { ...prev, ...patch, updatedAt: new Date().toISOString() };
  await kvPutSafe(env, SHOPEE_SALES_META_KEY, JSON.stringify(next));
  return next;
}

async function getShopeeSalesIndex(env) {
  return getMarketplaceIndex(env, 'shopee', SHOPEE_SALES_INDEX_KEY, SHOPEE_SALES_INDEX_MAX);
}

async function persistShopeeTokens(env, data, shopId) {
  const accessToken = String(data.access_token || '').trim();
  const refreshToken = String(data.refresh_token || '').trim();
  const sid = data.shop_id != null ? String(data.shop_id) : (shopId ? String(shopId) : null);
  const expireIn = Math.max(60, Number(data.expire_in || data.expires_in || 14400) - 120);
  if (accessToken) {
    await kvPut(env, SHOPEE_TOKEN_KV_KEY, JSON.stringify({
      token: accessToken,
      expiresAt: Date.now() + expireIn * 1000,
      shopId: sid
    }));
  }
  const oauthPatch = {};
  if (refreshToken) oauthPatch.refreshToken = refreshToken;
  if (sid) oauthPatch.shopId = sid;
  if (Object.keys(oauthPatch).length) await saveShopeeOAuthState(env, oauthPatch);
  return { accessToken, refreshToken, shopId: sid };
}

async function shopeePublicPost(env, path, body) {
  const ts = Math.floor(Date.now() / 1000);
  const sign = await shopeeSign(env, path, ts);
  const url = `${SHOPEE_API_HOST}${path}?partner_id=${encodeURIComponent(shopeePartnerId(env))}&timestamp=${ts}&sign=${sign}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    const msg = data.message || data.error || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function getShopeeAccessToken(env) {
  if (!shopeeAppConfigured(env)) return null;
  try {
    const cached = await env.STORE_KV.get(SHOPEE_TOKEN_KV_KEY);
    if (cached) {
      const data = JSON.parse(cached);
      if (data?.token && data.expiresAt > Date.now()) return { token: data.token, shopId: data.shopId };
    }
  } catch { /* refresh */ }
  const state = await getShopeeOAuthState(env);
  const refreshToken = String(state?.refreshToken || '').trim();
  const shopId = String(state?.shopId || env.SHOPEE_SHOP_ID || '').trim();
  if (!refreshToken || !shopId) return null;
  try {
    const data = await shopeePublicPost(env, '/api/v2/auth/access_token/get', {
      refresh_token: refreshToken,
      partner_id: Number(shopeePartnerId(env)),
      shop_id: Number(shopId)
    });
    const persisted = await persistShopeeTokens(env, data, shopId);
    return persisted.accessToken ? { token: persisted.accessToken, shopId: persisted.shopId } : null;
  } catch (err) {
    console.warn('Shopee token refresh:', err.message || err);
    await kvDelete(env, SHOPEE_TOKEN_KV_KEY).catch(() => {});
    return null;
  }
}

async function shopeeShopGet(env, path, token, shopId, extraParams) {
  const ts = Math.floor(Date.now() / 1000);
  const sign = await shopeeSign(env, path, ts, token, shopId);
  const params = new URLSearchParams({
    partner_id: shopeePartnerId(env),
    timestamp: String(ts),
    sign,
    access_token: token,
    shop_id: String(shopId),
    ...(extraParams || {})
  });
  const res = await fetch(`${SHOPEE_API_HOST}${path}?${params}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    const msg = data.message || data.error || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function buildShopeeAuthUrl(env) {
  const path = '/api/v2/shop/auth_partner';
  const ts = Math.floor(Date.now() / 1000);
  const sign = await shopeeSign(env, path, ts);
  const params = new URLSearchParams({
    partner_id: shopeePartnerId(env),
    timestamp: String(ts),
    sign,
    redirect: SHOPEE_REDIRECT_URI
  });
  return `${SHOPEE_API_HOST}${path}?${params}`;
}

function shopeeOAuthHtmlPage({ title, ok, detail }) {
  const color = ok ? '#1a7f37' : '#b42318';
  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title></head>
<body style="font-family:system-ui,-apple-system,sans-serif;max-width:520px;margin:48px auto;padding:0 20px;color:#18181b;line-height:1.5">
  <h1 style="font-size:1.25rem;margin:0 0 8px;color:${color}">${title}</h1>
  <p style="margin:0;color:#3f3f46">${detail}</p>
  <p style="margin:1.5rem 0 0;font-size:13px;color:#71717a">Sensor Tattoo Fix · Shopee (pedidos)</p>
</body></html>`;
}

async function handleShopeeOAuthCallback(request, env) {
  const url = new URL(request.url);
  const code = String(url.searchParams.get('code') || '').trim();
  const shopId = String(url.searchParams.get('shop_id') || url.searchParams.get('shopid') || '').trim();
  const oauthErr = String(url.searchParams.get('error') || '').trim();
  const htmlHeaders = { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' };

  if (oauthErr) {
    return new Response(shopeeOAuthHtmlPage({
      title: 'Autorização recusada',
      ok: false,
      detail: oauthErr
    }), { status: 400, headers: htmlHeaders });
  }
  if (!code || !shopId) {
    return new Response(shopeeOAuthHtmlPage({
      title: 'Código ou Shop ID ausente',
      ok: false,
      detail: 'Autorize de novo pelo Admin → Vendas → Shopee. Confira se o Redirect URL do app é exatamente ' + SHOPEE_REDIRECT_URI
    }), { status: 400, headers: htmlHeaders });
  }
  if (!shopeeAppConfigured(env)) {
    return new Response(shopeeOAuthHtmlPage({
      title: 'App não configurado',
      ok: false,
      detail: 'Configure SHOPEE_PARTNER_ID e SHOPEE_PARTNER_KEY no Worker.'
    }), { status: 503, headers: htmlHeaders });
  }
  try {
    const data = await shopeePublicPost(env, '/api/v2/auth/token/get', {
      code,
      partner_id: Number(shopeePartnerId(env)),
      shop_id: Number(shopId)
    });
    await persistShopeeTokens(env, data, shopId);
    return new Response(shopeeOAuthHtmlPage({
      title: 'Shopee conectada',
      ok: true,
      detail: `Loja ${shopId} autorizada. Pode fechar e atualizar vendas no Admin.`
    }), { status: 200, headers: htmlHeaders });
  } catch (err) {
    return new Response(shopeeOAuthHtmlPage({
      title: 'Falha ao trocar o código',
      ok: false,
      detail: err.message || String(err)
    }), { status: 400, headers: htmlHeaders });
  }
}

async function checkShopeeIntegration(env) {
  if (!shopeeAppConfigured(env)) {
    return {
      configured: false,
      authOk: false,
      error: 'SHOPEE_PARTNER_ID / SHOPEE_PARTNER_KEY não configurados.',
      redirectUri: SHOPEE_REDIRECT_URI
    };
  }
  const state = await getShopeeOAuthState(env);
  if (!state?.refreshToken || !state?.shopId) {
    return {
      configured: true,
      authOk: false,
      needsOAuth: true,
      redirectUri: SHOPEE_REDIRECT_URI,
      error: 'Sem loja autorizada — use Autorizar Shopee no Admin.'
    };
  }
  try {
    const tok = await getShopeeAccessToken(env);
    if (!tok?.token) {
      return {
        configured: true,
        authOk: false,
        needsOAuth: true,
        redirectUri: SHOPEE_REDIRECT_URI,
        error: 'Falha ao renovar token Shopee — reautorize a loja.'
      };
    }
    return {
      configured: true,
      authOk: true,
      shopId: tok.shopId || state.shopId,
      lastSyncedAt: (await getShopeeSalesMeta(env))?.lastSyncedAt || null,
      redirectUri: SHOPEE_REDIRECT_URI
    };
  } catch (err) {
    return { configured: true, authOk: false, error: err.message, redirectUri: SHOPEE_REDIRECT_URI };
  }
}

function roundMoney(n) {
  return Math.round(Number(n || 0) * 100) / 100;
}

function normalizeShopeeOrder(detail, escrow) {
  const order = detail || {};
  const income = shopeeOrderIncome(escrow);
  const items = (Array.isArray(order.item_list) ? order.item_list : []).map((it) => ({
    id: it.item_id != null ? String(it.item_id) : null,
    title: it.item_name || it.model_name || null,
    quantity: Number(it.model_quantity_purchased || it.quantity || 0),
    unitPrice: Number(it.model_discounted_price ?? it.model_original_price ?? 0),
    saleFee: 0,
    currency: 'BRL'
  }));
  const itemsGross = roundMoney(items.reduce((s, it) => s + it.unitPrice * (it.quantity > 0 ? it.quantity : 0), 0));
  const gross = roundMoney(
    income.original_cost_of_goods_sold
    ?? income.cost_of_goods_sold
    ?? (itemsGross > 0 ? itemsGross : null)
    ?? order.total_amount
    ?? 0
  );
  const refunds = roundMoney(income.seller_return_refund || 0);
  const rawEscrow = income.escrow_amount ?? income.escrow_amount_after_adjustment;
  const escrowAmt = rawEscrow != null ? roundMoney(rawEscrow) : null;
  const parts = shopeeReceiptFromEscrow(gross, escrowAmt, refunds);
  const soldAtSec = Number(order.pay_time || order.create_time || 0);
  return {
    channel: 'shopee',
    externalId: String(order.order_sn || ''),
    soldAt: soldAtSec ? new Date(soldAtSec * 1000).toISOString() : null,
    status: order.order_status || null,
    currency: 'BRL',
    gross,
    fees: parts.fees,
    shippingCost: parts.shippingCost,
    refunds,
    otherFees: 0,
    net: parts.net,
    shopeeIncomeOk: parts.ok,
    buyer: {
      id: order.buyer_user_id != null ? String(order.buyer_user_id) : null,
      nickname: order.buyer_username || null
    },
    items,
    payments: order.payment_method ? [{ status: order.order_status, method: order.payment_method }] : [],
    dateCreated: order.create_time ? new Date(Number(order.create_time) * 1000).toISOString() : null,
    syncedAt: new Date().toISOString()
  };
}

async function upsertShopeeSale(env, sale, index) {
  const existing = await loadMarketplaceSale(env, 'shopee', sale.externalId);
  if (!existing || !marketplaceSaleUnchanged(existing, sale)) {
    await saveMarketplaceSale(env, sale);
  }
  const next = (index || []).filter((id) => id !== sale.externalId);
  next.unshift(sale.externalId);
  return next.slice(0, SHOPEE_SALES_INDEX_MAX);
}

async function fetchShopeeOrderSns(env, token, shopId, timeFrom, timeTo, timeRangeField = 'create_time') {
  const sns = [];
  let cursor = '';
  for (let page = 0; page < 40; page++) {
    const extra = {
      time_range_field: timeRangeField,
      time_from: String(timeFrom),
      time_to: String(timeTo),
      page_size: '100'
    };
    if (cursor) extra.cursor = cursor;
    const data = await shopeeShopGet(env, '/api/v2/order/get_order_list', token, shopId, extra);
    const list = Array.isArray(data.response?.order_list) ? data.response.order_list : [];
    for (const row of list) {
      const status = String(row.order_status || '');
      if (status && !SHOPEE_PAID_STATUSES.has(status) && status !== 'TO_RETURN' && status !== 'IN_CANCEL') {
        if (status === 'UNPAID' || status === 'CANCELLED' || status === 'IN_CANCEL') continue;
      }
      if (status === 'UNPAID' || status === 'CANCELLED') continue;
      if (row.order_sn) sns.push(String(row.order_sn));
    }
    if (!data.response?.more) break;
    cursor = String(data.response?.next_cursor || '');
    if (!cursor) break;
  }
  return sns;
}

async function fetchShopeeOrderDetails(env, token, shopId, sns) {
  const out = [];
  for (let i = 0; i < sns.length; i += 50) {
    const chunk = sns.slice(i, i + 50);
    const data = await shopeeShopGet(env, '/api/v2/order/get_order_detail', token, shopId, {
      order_sn_list: chunk.join(','),
      response_optional_fields: 'buyer_user_id,buyer_username,item_list,total_amount,actual_shipping_fee,pay_time,payment_method'
    });
    const list = Array.isArray(data.response?.order_list) ? data.response.order_list : [];
    out.push(...list);
  }
  return out;
}

async function fetchShopeeEscrow(env, token, shopId, orderSn) {
  try {
    const data = await shopeeShopGet(env, '/api/v2/payment/get_escrow_detail', token, shopId, {
      order_sn: String(orderSn)
    });
    return data.response || data;
  } catch (err) {
    console.warn('Shopee escrow', orderSn, err && err.message);
    return null;
  }
}

async function backfillShopeeIndex(env, limit) {
  const tok = await getShopeeAccessToken(env);
  if (!tok?.token || !tok.shopId) return { filled: 0, remaining: 0, skipped: true };
  const { token, shopId } = tok;
  const index = await getShopeeSalesIndex(env);
  const cap = Math.max(1, Math.min(Number(limit) || 80, 80));
  let filled = 0;
  let remaining = 0;
  for (const sn of index || []) {
    const sale = await loadMarketplaceSale(env, 'shopee', sn);
    if (sale?.shopeeIncomeOk && Number(sale.shippingCost || 0) < 0.01 && Number(sale.fees || 0) > 0) continue;
    if (filled >= cap) {
      remaining += 1;
      continue;
    }
    const details = await fetchShopeeOrderDetails(env, token, shopId, [sn]);
    const detail = details[0];
    if (!detail) {
      remaining += 1;
      continue;
    }
    const escrow = await fetchShopeeEscrow(env, token, shopId, sn);
    const next = normalizeShopeeOrder(detail, escrow);
    if (!next.externalId || !next.shopeeIncomeOk) {
      remaining += 1;
      continue;
    }
    await saveMarketplaceSale(env, next);
    filled += 1;
  }
  return { filled, remaining };
}

async function syncShopeeOrders(env, options = {}) {
  const tok = await getShopeeAccessToken(env);
  if (!tok?.token || !tok.shopId) throw new Error('Shopee sem token — autorize a loja no Admin.');
  const { token, shopId } = tok;
  const meta = await getShopeeSalesMeta(env);
  const nowSec = Math.floor(Date.now() / 1000);
  const full = options.full === true || !meta?.lastSyncedAt;
  const days = Math.min(365, Math.max(1, Number(options.days) || SHOPEE_SYNC_LOOKBACK_DAYS));
  let fromSec;
  if (full || options.days) {
    fromSec = nowSec - days * 86400;
  } else {
    const last = Math.floor(new Date(meta.lastSyncedAt).getTime() / 1000);
    fromSec = Number.isFinite(last) ? last - 2 * 86400 : nowSec - days * 86400;
  }

  let imported = 0;
  let updated = 0;
  let unchanged = 0;
  let index = await getShopeeSalesIndex(env);
  const allSns = [];

  for (let start = fromSec; start < nowSec; start += SHOPEE_ORDER_WINDOW_SEC) {
    const end = Math.min(start + SHOPEE_ORDER_WINDOW_SEC, nowSec);
    const sns = await fetchShopeeOrderSns(env, token, shopId, start, end, 'create_time');
    allSns.push(...sns);
  }
  const updateFrom = Math.max(fromSec, nowSec - 14 * 86400);
  for (let start = updateFrom; start < nowSec; start += SHOPEE_ORDER_WINDOW_SEC) {
    const end = Math.min(start + SHOPEE_ORDER_WINDOW_SEC, nowSec);
    const sns = await fetchShopeeOrderSns(env, token, shopId, start, end, 'update_time');
    allSns.push(...sns);
  }
  const uniqueSns = [...new Set(allSns)];
  const details = await fetchShopeeOrderDetails(env, token, shopId, uniqueSns);

  for (const detail of details) {
    const status = String(detail.order_status || '');
    if (status === 'UNPAID' || status === 'CANCELLED' || status === 'IN_CANCEL') continue;
    const escrow = detail.order_sn
      ? await fetchShopeeEscrow(env, token, shopId, detail.order_sn)
      : null;
    const sale = normalizeShopeeOrder(detail, escrow);
    if (!sale.externalId) continue;
    const existing = await loadMarketplaceSale(env, 'shopee', sale.externalId);
    if (existing && marketplaceSaleUnchanged(existing, sale)) unchanged += 1;
    else if (existing) updated += 1;
    else imported += 1;
    index = await upsertShopeeSale(env, sale, index);
  }

  const report = {
    ok: true,
    shopId,
    full,
    from: new Date(fromSec * 1000).toISOString(),
    to: new Date(nowSec * 1000).toISOString(),
    apiTotal: uniqueSns.length,
    imported,
    updated,
    unchanged,
    indexed: index.length,
    lastSyncedAt: new Date().toISOString(),
    lastError: null
  };
  await saveShopeeSalesMeta(env, report);
  return report;
}

async function runScheduledShopeeOrdersSync(env) {
  if (!shopeeAppConfigured(env)) return { skipped: true, reason: 'not_configured' };
  const meta = await getShopeeSalesMeta(env);
  if (meta?.lastSyncedAt) {
    const age = Date.now() - new Date(meta.lastSyncedAt).getTime();
    if (Number.isFinite(age) && age < SHOPEE_SYNC_CRON_MIN_INTERVAL_MS) {
      return { skipped: true, reason: 'throttle', ageMs: age };
    }
  }
  try {
    const report = await syncShopeeOrders(env, { full: !meta?.lastSyncedAt });
    console.log('Shopee orders sync cron:', JSON.stringify({
      imported: report.imported,
      updated: report.updated,
      indexed: report.indexed
    }));
    return report;
  } catch (err) {
    await saveShopeeSalesMeta(env, {
      lastError: err.message || String(err),
      lastErrorAt: new Date().toISOString()
    }).catch(() => {});
    throw err;
  }
}

async function handleAdminShopeeAuthUrl(request, env, origin) {
  if (!(await isValidSession(env, bearerToken(request)))) {
    return json({ error: 'Não autorizado.' }, 401, origin);
  }
  if (!shopeeAppConfigured(env)) {
    return json({ error: 'SHOPEE_PARTNER_ID / SHOPEE_PARTNER_KEY não configurados.', redirectUri: SHOPEE_REDIRECT_URI }, 400, origin);
  }
  const url = await buildShopeeAuthUrl(env);
  return json({ ok: true, url, redirectUri: SHOPEE_REDIRECT_URI }, 200, origin);
}

async function handleAdminShopeeSync(request, env, origin) {
  if (!(await isValidSession(env, bearerToken(request)))) {
    return json({ error: 'Não autorizado.' }, 401, origin);
  }
  const url = new URL(request.url);
  if (request.method === 'GET') {
    const meta = await getShopeeSalesMeta(env);
    const index = await getShopeeSalesIndex(env);
    const check = await checkShopeeIntegration(env);
    return json({ ok: true, meta, indexed: index.length, integration: check }, 200, origin);
  }
  const daysParam = url.searchParams.get('days');
  const full = url.searchParams.get('full') === '1' || url.searchParams.get('full') === 'true';
  try {
    const fix = await backfillShopeeIndex(env, 80);
    const report = await syncShopeeOrders(env, {
      full: true,
      days: daysParam ? Number(daysParam) : 90
    });
    return json({ ok: true, ...report, indexFix: fix }, 200, origin);
  } catch (err) {
    return json({ error: err.message || String(err) }, 502, origin);
  }
}

async function handleAdminShopeeSales(request, env, origin) {
  if (!(await isValidSession(env, bearerToken(request)))) {
    return json({ error: 'Não autorizado.' }, 401, origin);
  }
  const url = new URL(request.url);
  const limit = Math.min(5000, Math.max(1, Number(url.searchParams.get('limit')) || 5000));
  await backfillShopeeIndex(env, 25).catch(() => {});
  const sales = await listMarketplaceSales(env, 'shopee', limit);
  const totalIndexed = await d1CountSales(env, 'shopee');
  const meta = await getShopeeSalesMeta(env);
  return json({ ok: true, meta, totalIndexed: totalIndexed || sales.length, sales }, 200, origin);
}

/** Com token TEST-, PIX de teste não aprova sozinho — simula confirmação após alguns segundos. */
async function maybeSandboxAutoConfirmPix(env, orderId, payment) {
  if (!isMpSandbox(env)) return;

  const provider = payment?.provider || 'mercadopago';
  const paymentId = payment?.paymentId;

  if (provider === 'mercadopago' && paymentId) {
    const token = mercadoPagoToken(env);
    for (let i = 0; i < 6; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const order = await getOrder(env, orderId);
      if (!order || order.status === 'paid') return;

      const res = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
        headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' }
      });
      const data = await res.json().catch(() => ({}));
      if (data.status === 'approved') {
        await handlePaymentConfirmed(env, order, {
          id: data.id,
          provider: 'mercadopago',
          billingType: 'PIX',
          value: data.transaction_amount
        });
        return;
      }
    }
  } else {
    await new Promise((r) => setTimeout(r, 5000));
  }

  const order = await getOrder(env, orderId);
  if (order && order.status !== 'paid') {
    console.log('Sandbox PIX: auto-confirma pedido de teste', orderId, provider);
    await handlePaymentConfirmed(env, order, {
      provider,
      billingType: 'PIX',
      value: order.total,
      confirmedBy: 'sandbox_auto_test'
    });
  }
}

function mpHeaders(env, idempotencyKey) {
  return {
    Authorization: 'Bearer ' + mercadoPagoToken(env),
    'Content-Type': 'application/json',
    'X-Idempotency-Key': idempotencyKey || crypto.randomUUID()
  };
}

function asaasHeaders(apiKey) {
  return {
    access_token: apiKey,
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'User-Agent': 'SensorTattooFix/1.0'
  };
}

function normalizePhoneBR(phone) {
  let digits = onlyDigits(phone);
  if (digits.length >= 12 && digits.startsWith('55')) digits = digits.slice(2);
  return digits;
}

async function asaasReadJson(res, step) {
  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`${step}: resposta inválida do Asaas (HTTP ${res.status})`);
    }
  }
  if (!res.ok) {
    const msg = data?.errors?.[0]?.description || text || `HTTP ${res.status}`;
    throw new Error(`${step}: ${msg}`);
  }
  if (!data) {
    throw new Error(`${step}: resposta vazia do Asaas (HTTP ${res.status})`);
  }
  return data;
}

async function getConfig(env) {
  const raw = await env.STORE_KV.get(CONFIG_KEY);
  if (!raw) return structuredClone(DEFAULT_CONFIG);
  try { return withConfigDefaults(JSON.parse(raw)); } catch { return structuredClone(DEFAULT_CONFIG); }
}

async function saveConfig(env, config) {
  const normalized = withConfigDefaults(config);
  const toSave = { ...normalized, updatedAt: new Date().toISOString() };
  await kvPut(env, CONFIG_KEY, JSON.stringify(toSave));
  return toSave;
}

async function createSession(env) {
  const token = crypto.randomUUID();
  await kvPut(env, 'session:' + token, '1', { expirationTtl: 86400 });
  return token;
}

async function isValidSession(env, token) {
  return !!(token && await env.STORE_KV.get('session:' + token));
}

async function getOrder(env, orderId) {
  if (!orderId) return null;
  const fromD1 = await d1GetOrder(env, orderId);
  let order = fromD1;
  if (!order) {
    const raw = await env.STORE_KV.get('order:' + orderId);
    if (!raw) return null;
    try { order = JSON.parse(raw); } catch { return null; }
    await d1SaveOrder(env, order).catch(() => {});
  }
  if (order) {
    const { changed } = hydrateIntlOrderFields(order);
    if (changed) await saveOrder(env, order);
  }
  return order;
}

const LABEL_PDF_PREFIX = 'label-pdf:';

async function getCachedLabelPdf(env, orderId) {
  try {
    return await env.STORE_KV.get(LABEL_PDF_PREFIX + orderId);
  } catch {
    return null;
  }
}

async function saveCachedLabelPdf(env, orderId, pdfBase64) {
  if (!pdfBase64 || !orderId) return;
  try {
    await kvPut(env, LABEL_PDF_PREFIX + orderId, String(pdfBase64));
  } catch (err) {
    console.warn('label pdf cache:', orderId, err.message);
  }
}

async function readOrdersIndex(env) {
  try {
    const raw = await env.STORE_KV.get(ORDERS_INDEX);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('orders:index inválido, será reconstruído:', err.message);
    return [];
  }
}

function buildIndexEntry(order) {
  return {
    orderId: order.orderId,
    createdAt: order.createdAt,
    status: order.status,
    total: order.total,
    valorProduto: order.valorProduto,
    nome: order.nome,
    email: order.email,
    telefone: order.telefone,
    frete: order.frete,
    smartwatch: order.smartwatch,
    observacoes: trimObs(order) || null,
    modeloRelogio: formatOrderSmartwatch(order),
    pais: order.pais,
    pagamento: order.pagamento,
    endereco: order.endereco || '',
    produto: order.produto || '',
    userId: order.userId || null,
    couponCode: order.couponCode || null,
    couponCommissionerName: order.couponCommissionerName || null,
    couponCommissionerEmail: order.couponCommissionerEmail || null,
    couponDiscount: order.couponDiscount ?? null,
    couponCommissionPercent: order.couponCommissionPercent ?? null,
    couponCommissionAmount: order.couponCommissionAmount ?? null
  };
}

function orderFromIndexRow(item) {
  if (!item?.orderId) return null;
  const frete = Number(item.frete) || 0;
  const total = Number(item.total) || 0;
  return {
    ...item,
    endereco: item.endereco || '—',
    produto: item.produto || '—',
    valorProduto: item.valorProduto ?? Math.max(0, total - frete)
  };
}

async function rebuildOrdersIndexFromKv(env) {
  const list = await env.STORE_KV.list({ prefix: 'order:' });
  const entries = [];
  for (const key of list.keys) {
    const orderId = key.name.startsWith('order:') ? key.name.slice(6) : key.name;
    const order = await getOrder(env, orderId);
    if (order) entries.push(buildIndexEntry(order));
  }
  entries.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  const trimmed = entries.slice(0, 2000);
  if (trimmed.length) {
    await kvPut(env, ORDERS_INDEX, JSON.stringify(trimmed));
  }
  return trimmed;
}

async function persistFreteProductRepairs(env, orders) {
  let saved = 0;
  for (const order of orders || []) {
    if (saved >= 25) break;
    if (!orderNeedsFreteProductRepair(order)) continue;
    applyOrderFreteAccounting(order, Number(order.frete) || 0);
    await saveOrder(env, order);
    saved += 1;
  }
}

async function listOrdersForAdmin(env) {
  const fromD1 = await d1ListOrders(env, 2000);
  if (fromD1.length) {
    fromD1.sort((a, b) => String(b?.createdAt || '').localeCompare(String(a?.createdAt || '')));
    await persistFreteProductRepairs(env, fromD1);
    return fromD1;
  }
  let index = await readOrdersIndex(env);
  if (!index.length) {
    index = await rebuildOrdersIndexFromKv(env);
  }

  const orders = [];
  let missingFull = 0;
  for (const item of index.slice(0, 2000)) {
    const full = await getOrder(env, item.orderId);
    if (full) orders.push(full);
    else {
      missingFull++;
      const fallback = orderFromIndexRow(item);
      if (fallback) orders.push(fallback);
    }
  }

  if (missingFull > 0) {
    const rebuilt = await rebuildOrdersIndexFromKv(env);
    if (rebuilt.length && rebuilt.length !== index.length) {
      orders.length = 0;
      for (const item of rebuilt.slice(0, 2000)) {
        const full = await getOrder(env, item.orderId);
        orders.push(full || orderFromIndexRow(item));
      }
    }
  }

  orders.sort((a, b) => String(b?.createdAt || '').localeCompare(String(a?.createdAt || '')));
  await persistFreteProductRepairs(env, orders);
  return orders;
}

async function saveOrder(env, order) {
  const ok = await d1SaveOrder(env, order);
  if (!ok) {
    await kvPut(env, 'order:' + order.orderId, JSON.stringify(order));
    const index = await readOrdersIndex(env);
    const filtered = index.filter((o) => o.orderId !== order.orderId);
    filtered.unshift(buildIndexEntry(order));
    await kvPut(env, ORDERS_INDEX, JSON.stringify(filtered.slice(0, 2000)));
  }
  if (order.userId) await linkOrderToUser(env, order.userId, order.orderId);
}

async function unlinkOrderFromUser(env, userId, orderId) {
  if (!userId) return;
  const key = 'user:' + userId + ':orders';
  const list = JSON.parse((await env.STORE_KV.get(key)) || '[]');
  const filtered = list.filter((id) => id !== orderId);
  if (filtered.length !== list.length) {
    await kvPut(env, key, JSON.stringify(filtered));
  }
}

async function deleteOrder(env, orderId) {
  const order = await getOrder(env, orderId);
  if (!order) return false;
  await d1DeleteOrder(env, orderId);
  await kvDeleteSafe(env, 'order:' + orderId);
  try {
    const index = await readOrdersIndex(env);
    await kvPutSafe(env, ORDERS_INDEX, JSON.stringify(index.filter((o) => o.orderId !== orderId)));
  } catch (_) { /* ignore */ }
  if (order.userId) await unlinkOrderFromUser(env, order.userId, order.orderId);
  return true;
}

function normalizeWhatsAppPhone(phone) {
  let digits = onlyDigits(phone);
  if (!digits) return '';
  if (digits.length >= 12 && digits.startsWith('55')) return digits;
  if (digits.length === 10 || digits.length === 11) return '55' + digits;
  return digits;
}

async function sendWhatsApp(env, phone, message) {
  const instance = env.ZAPI_INSTANCE_ID;
  const token = env.ZAPI_TOKEN;
  if (!instance || !token) return false;

  const to = normalizeWhatsAppPhone(phone);
  if (!to) return false;

  const headers = { 'Content-Type': 'application/json' };
  if (env.ZAPI_CLIENT_TOKEN) headers['Client-Token'] = env.ZAPI_CLIENT_TOKEN;

  const res = await fetch(
    `https://api.z-api.io/instances/${instance}/token/${token}/send-text`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({ phone: to, message })
    }
  );
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    console.error('Z-API:', res.status, errText);
  }
  return res.ok;
}

function pixCustomerHint(order, shopPhone) {
  if (order.paymentProvider === 'static_pix') {
    const wa = onlyDigits(shopPhone);
    return `Pague o PIX exibido no site e envie o comprovante no WhatsApp da loja: ${wa || '5511913394665'}. A loja confirma o pagamento em seguida.`;
  }
  if (order.pagamento === 'PIX' || order.pagamento === 'pix') {
    return 'Pague o PIX gerado no site. A confirmação é automática.';
  }
  return 'Finalize o pagamento no link seguro.';
}

async function notifyWhatsApp(env, config, order, type) {
  const shopPhone = config.whatsapp || env.SHOP_WHATSAPP;
  const msgs = {
    order_customer: `✅ *Sensor Tattoo Fix*\n\nOlá ${order.nome}!\n\nPedido: *${order.orderId}*\n${watchWhatsAppBlock(order)}\nTotal: ${formatBRL(order.total)}\nPagamento: ${order.pagamento}\n\n${pixCustomerHint(order, shopPhone)}\n\nObrigado!`,
    order_shop: `🛒 *NOVO PEDIDO*\n\n${order.orderId}\n${order.nome}\n📱 ${order.telefone}\n${watchWhatsAppBlock(order)}\n🌍 ${order.pais}\n💰 ${formatBRL(order.total)}\n📦 ${order.shippingService}\n📍 ${order.endereco}`,
    paid_customer: shouldDispatchUberDelivery(order)
      ? `✅ *Pagamento confirmado!*\n\nPedido *${order.orderId}* pago.\n\n🚗 Entrega Uber solicitada. Você receberá o link de rastreio por e-mail em instantes.\n\nSensor Tattoo Fix`
      : `✅ *Pagamento confirmado!*\n\nPedido *${order.orderId}* pago com sucesso.\n\nSeu kit será postado em até 2 dias úteis. Você receberá o rastreio por e-mail.\n\nSensor Tattoo Fix`,
    paid_shop: shouldDispatchUberDelivery(order)
      ? `💰 *PAGAMENTO CONFIRMADO*\n\n${order.orderId}\nCliente: ${order.nome}\nValor: ${formatBRL(order.total)}\n${watchWhatsAppBlock(order)}\n\n🚗 Uber Direct — ${order.shippingService}\n📍 ${order.endereco}${order.uberTrackingUrl ? `\n🔗 ${order.uberTrackingUrl}` : ''}`
      : `💰 *PAGAMENTO CONFIRMADO*\n\n${order.orderId}\nCliente: ${order.nome}\nValor: ${formatBRL(order.total)}\n${watchWhatsAppBlock(order)}\n\n📮 Postar via ${order.shippingService}\n📍 ${order.endereco}`
  };

  const customerMsg = msgs[type + '_customer'];
  const shopMsg = msgs[type + '_shop'];

  if (customerMsg && order.telefone) await sendWhatsApp(env, order.telefone, customerMsg);
  if (shopMsg && shopPhone) await sendWhatsApp(env, shopPhone, shopMsg);
}

async function getCorreiosToken(env) {
  const contract = String(env.CORREIOS_CONTRACT || '').trim();
  const cacheKey = 'correios:token:' + (contract || 'user');
  const cached = await env.STORE_KV.get(cacheKey);
  if (cached) {
    const data = JSON.parse(cached);
    if (data.expiresAt > Date.now()) return data.token;
  }
  const user = env.CORREIOS_USER;
  const password = env.CORREIOS_PASSWORD;
  if (!user || !password) return null;

  const basic = btoa(user + ':' + password);
  const res = await fetch(
    contract ? 'https://api.correios.com.br/token/v1/autentica/cartaopostagem' : 'https://api.correios.com.br/token/v1/autentica',
    {
      method: 'POST',
      headers: { Authorization: 'Basic ' + basic, 'Content-Type': 'application/json' },
      body: contract ? JSON.stringify({ numero: contract }) : undefined
    }
  );
  if (!res.ok) {
    console.warn('Correios token:', res.status, await res.text().catch(() => ''));
    return null;
  }
  const data = await res.json();
  await kvPut(env, cacheKey, JSON.stringify({
    token: data.token,
    expiresAt: Date.now() + (Number(data.expiraEm || 3600) - 60) * 1000
  }));
  return data.token;
}

function uberConfigured(env) {
  return !!(
    env.UBER_DIRECT_CLIENT_ID
    && env.UBER_DIRECT_CLIENT_SECRET
    && env.UBER_DIRECT_CUSTOMER_ID
  );
}

function isUberSandbox(env) {
  const flag = String(env.UBER_DIRECT_SANDBOX || '').trim().toLowerCase();
  return flag === 'true' || flag === '1';
}

function formatCepUber(cep) {
  const d = onlyDigits(cep);
  if (d.length !== 8) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

function formatUberStructuredAddress(parts) {
  const rua = String(parts.rua || '').trim();
  const numero = String(parts.numero || '').trim();
  const complemento = String(parts.complemento || '').trim();
  const street = numero ? `${rua}, ${numero}` : rua;
  const streetAddress = [street];
  if (complemento) streetAddress.push(complemento);
  return JSON.stringify({
    street_address: streetAddress.filter(Boolean),
    city: String(parts.cidade || '').trim(),
    state: String(parts.uf || '').trim().toUpperCase(),
    zip_code: formatCepUber(parts.cep),
    country: 'BR'
  });
}

function buildUberPickupParts(config) {
  const ship = config.shipping || DEFAULT_CONFIG.shipping;
  const sender = ship.sender || {};
  return {
    rua: sender.rua,
    numero: sender.numero,
    complemento: sender.complemento,
    bairro: sender.bairro,
    cidade: sender.cidade,
    uf: sender.uf,
    cep: ship.originCep
  };
}

function dropoffPartsFromParams(params) {
  return {
    cep: params.cep,
    rua: params.rua,
    numero: params.numero,
    complemento: params.complemento,
    bairro: params.bairro,
    cidade: params.cidade,
    uf: params.uf
  };
}

function dropoffPartsFromOrder(order) {
  return {
    cep: order.cep,
    rua: order.rua,
    numero: order.numero,
    complemento: order.complemento,
    bairro: order.bairro,
    cidade: order.cidade,
    uf: order.uf
  };
}

function hasUberDropoffAddress(parts) {
  return onlyDigits(parts.cep).length === 8
    && String(parts.rua || '').trim().length >= 3
    && String(parts.cidade || '').trim().length >= 2
    && String(parts.uf || '').trim().length === 2;
}

function phoneToE164Br(phone) {
  const digits = onlyDigits(phone);
  if (!digits) return '';
  if (digits.startsWith('55') && digits.length >= 12) return `+${digits}`;
  if (digits.length === 10 || digits.length === 11) return `+55${digits}`;
  return `+${digits}`;
}

function shopPhoneE164(config, env) {
  return phoneToE164Br(config.whatsapp || env.SHOP_WHATSAPP || '5511913394665');
}

async function getUberAccessToken(env) {
  const cached = await env.STORE_KV.get('uber:token');
  if (cached) {
    const data = JSON.parse(cached);
    if (data.expiresAt > Date.now()) return data.token;
  }
  if (!uberConfigured(env)) return null;

  const res = await fetch('https://auth.uber.com/oauth/v2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.UBER_DIRECT_CLIENT_ID,
      client_secret: env.UBER_DIRECT_CLIENT_SECRET,
      grant_type: 'client_credentials',
      scope: 'eats.deliveries'
    })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.warn('Uber OAuth:', res.status, data.error_description || data.error || '');
    await kvDelete(env, 'uber:token').catch(() => {});
    return null;
  }
  const ttl = Math.max(60, Number(data.expires_in || 3600) - 60);
  await kvPut(env, 'uber:token', JSON.stringify({
    token: data.access_token,
    expiresAt: Date.now() + ttl * 1000
  }));
  return data.access_token;
}

async function uberApiFetch(env, path, options = {}) {
  const token = await getUberAccessToken(env);
  if (!token) throw new Error('Uber Direct não autenticado.');
  const customerId = encodeURIComponent(env.UBER_DIRECT_CUSTOMER_ID);
  const res = await fetch(`https://api.uber.com/v1/customers/${customerId}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers || {})
    }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.message || data.error || data.code || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.metadata = data.metadata || data;
    throw err;
  }
  return data;
}

function uberFeeToBRL(data) {
  const cents = Number(data.fee ?? data.quote?.fee ?? 0);
  return Math.round(cents) / 100;
}

function uberEtaMinutes(data) {
  const duration = Number(data.duration ?? data.quote?.duration ?? 0);
  if (duration > 0) return Math.max(15, Math.round(duration));
  const eta = data.dropoff_eta || data.quote?.dropoff_eta;
  if (eta) {
    const diff = (new Date(eta).getTime() - Date.now()) / 60000;
    if (diff > 0) return Math.round(diff);
  }
  return 60;
}

/** Pre-filter before Uber quote API. Uber Direct often allows ~10–15 km by market; we use 8 km. */
const UBER_MAX_RADIUS_KM = 8;

async function uberEstimatedRoadKm(config, dropoffParts) {
  const destCep = dropoffParts?.cep;
  if (!destCep || String(destCep).replace(/\D/g, '').length !== 8) return null;
  const [origin, dest] = await Promise.all([
    fetchOriginCoordinates(config),
    fetchDestCoordinates(destCep, dropoffParts)
  ]);
  if (!origin || !dest) return null;
  const straightKm = haversineKm(origin.lat, origin.lon, dest.lat, dest.lon);
  const roadFactor = getMotoboyConfig(config).roadFactor || DEFAULT_MOTOBOY_SHIPPING.roadFactor;
  return Math.round(straightKm * roadFactor * 10) / 10;
}

async function isWithinUberRadius(config, dropoffParts) {
  const roadKm = await uberEstimatedRoadKm(config, dropoffParts);
  if (roadKm == null) return true;
  return roadKm <= UBER_MAX_RADIUS_KM;
}

function isUberRadiusError(err) {
  const blob = `${err?.message || ''} ${JSON.stringify(err?.metadata || '')}`;
  return /deliverable area|delivery radius|Max Radius/i.test(blob);
}

async function requestUberQuote(env, config, dropoffParts) {
  const pickup = buildUberPickupParts(config);
  if (!hasUberDropoffAddress(dropoffParts)) return null;

  const body = {
    pickup_address: formatUberStructuredAddress(pickup),
    dropoff_address: formatUberStructuredAddress(dropoffParts)
  };
  const data = await uberApiFetch(env, '/delivery_quotes', {
    method: 'POST',
    body: JSON.stringify(body)
  });
  const price = uberFeeToBRL(data);
  if (price <= 0) {
    console.warn('Uber quote sem preço:', JSON.stringify(data).slice(0, 400));
    return null;
  }
  return {
    uberQuoteId: data.id,
    price,
    etaMinutes: uberEtaMinutes(data),
    currency: data.currency || data.currency_type || 'BRL'
  };
}

async function quoteUberShippingOptions(env, config, addressParams, opts = {}) {
  const methods = getEnabledShippingMethods(config, 'BR').filter(isUberMethod);
  if (!methods.length || !uberConfigured(env)) return [];

  const dropoff = dropoffPartsFromParams(addressParams);
  if (!hasUberDropoffAddress(dropoff)) return [];

  try {
    if (!(await isWithinUberRadius(config, dropoff))) {
      console.warn(`Uber quote: fora do raio (~${UBER_MAX_RADIUS_KM} km)`, dropoff.cep);
      return [];
    }
    const quote = await requestUberQuote(env, config, dropoff);
    if (!quote) return [];
    return methods.map((method) => ({
      id: method.id,
      methodId: method.id,
      serviceCode: null,
      service: method.label || 'Entrega Uber',
      price: quote.price,
      days: 0,
      etaMinutes: quote.etaMinutes,
      source: 'uber',
      provider: 'uber',
      uberQuoteId: quote.uberQuoteId,
      testMode: isUberSandbox(env),
      weightGrams: shippingWeightGrams(config, opts.weightGrams)
    }));
  } catch (err) {
    console.warn('Uber quote:', err.message);
    return [];
  }
}

function buildUberManifest(order, config) {
  const items = order.items?.length
    ? order.items
    : [{ name: config.product?.name || 'Kit Sensor Tattoo Fix', qty: 1, price: order.valorProduto || config.product?.price || 62.9 }];
  return items.map((item) => ({
    name: String(item.name || 'Produto').slice(0, 100),
    quantity: Math.max(1, Number(item.qty) || 1),
    size: 'small',
    price: Math.max(0, Math.round((Number(item.price) || 0) * 100))
  }));
}

async function createUberDeliveryForOrder(env, config, order) {
  if (!uberConfigured(env)) throw new Error('Uber Direct não configurado.');
  const pickup = buildUberPickupParts(config);
  const dropoff = dropoffPartsFromOrder(order);
  if (!hasUberDropoffAddress(dropoff)) throw new Error('Endereço incompleto para Uber.');

  const pickupPhone = shopPhoneE164(config, env);
  const dropoffPhone = phoneToE164Br(order.telefone);
  if (!pickupPhone || !dropoffPhone) throw new Error('Telefone inválido para Uber.');

  const pickupAddress = formatUberStructuredAddress(pickup);
  const dropoffAddress = formatUberStructuredAddress(dropoff);
  const sender = config.shipping?.sender || DEFAULT_CONFIG.shipping.sender;

  let quoteId = order.uberQuoteId || null;
  if (!quoteId) {
    const fresh = await requestUberQuote(env, config, dropoff);
    if (!fresh?.uberQuoteId) throw new Error('Não foi possível cotar Uber.');
    quoteId = fresh.uberQuoteId;
    order.uberQuoteId = quoteId;
  }

  const deliveryBody = {
    quote_id: quoteId,
    pickup_name: sender.brand || sender.company || 'Sensor Tattoo Fix',
    pickup_address: pickupAddress,
    pickup_phone_number: pickupPhone,
    dropoff_name: order.nome,
    dropoff_address: dropoffAddress,
    dropoff_phone_number: dropoffPhone,
    manifest_items: buildUberManifest(order, config),
    deliverable_action: 'deliverable_action_meet_at_door',
    undeliverable_action: 'return',
    external_id: order.orderId
  };
  if (isUberSandbox(env)) {
    deliveryBody.test_specifications = {
      robo_courier_specification: { mode: 'auto' }
    };
  }

  let data;
  try {
    data = await uberApiFetch(env, '/deliveries', {
      method: 'POST',
      body: JSON.stringify(deliveryBody)
    });
  } catch (err) {
    if (err.status === 400 || err.status === 409) {
      const fresh = await requestUberQuote(env, config, dropoff);
      if (!fresh?.uberQuoteId) throw err;
      deliveryBody.quote_id = fresh.uberQuoteId;
      order.uberQuoteId = fresh.uberQuoteId;
      data = await uberApiFetch(env, '/deliveries', {
        method: 'POST',
        body: JSON.stringify(deliveryBody)
      });
    } else {
      throw err;
    }
  }

  return {
    uberDeliveryId: data.id || data.delivery_id || null,
    uberTrackingUrl: data.tracking_url || data.trackingUrl || null,
    uberDeliveryStatus: data.status || 'pending',
    uberQuoteId: order.uberQuoteId,
    shippingProvider: 'uber'
  };
}

/** Endereço de teste para integração Uber — mesma rua da loja (~poucas centenas de metros). */
function uberIntegrationTestDropoff(config) {
  const ship = config?.shipping || DEFAULT_CONFIG.shipping;
  const sender = ship.sender || {};
  return {
    cep: ship.originCep || '02537190',
    rua: sender.rua || 'Rua Engenheiro Roberto Dabus Buazar',
    numero: '200',
    bairro: sender.bairro || 'Imirim',
    cidade: sender.cidade || 'São Paulo',
    uf: sender.uf || 'SP'
  };
}

async function checkSuperfreteIntegration(env, config) {
  if (!superfreteConfigured(env)) {
    return { configured: false, authOk: false, error: 'SUPERFRETE_TOKEN não configurado.' };
  }
  const sandbox = String(env.SUPERFRETE_SANDBOX || '').toLowerCase() === 'true';
  const origin = onlyDigits(config.shipping?.originCep || DEFAULT_CONFIG.shipping.originCep);
  const dest = '01310100';
  const pkg = superfretePackageFromConfig(config);
  try {
    const rows = await superfreteFetch(env, '/api/v0/calculator', {
      method: 'POST',
      body: JSON.stringify({
        from: { postal_code: origin },
        to: { postal_code: dest },
        services: '1,2,17',
        options: {
          own_hand: false,
          receipt: false,
          insurance_value: 0,
          use_insurance_value: false
        },
        package: pkg
      })
    });
    const list = Array.isArray(rows) ? rows.filter((r) => !r?.has_error && Number(r.price) > 0) : [];
    if (!list.length) {
      return {
        configured: true,
        authOk: true,
        quoteOk: false,
        sandbox,
        error: 'Token OK, mas cotação vazia (PAC/SEDEX/Mini).'
      };
    }
    const cheapest = [...list].sort((a, b) => Number(a.price) - Number(b.price))[0];
    return {
      configured: true,
      authOk: true,
      quoteOk: true,
      sandbox,
      samplePrice: Number(cheapest.price),
      sampleService: cheapest.name || String(cheapest.id)
    };
  } catch (err) {
    const msg = String(err.message || '');
    const unauth = /401|403|unauthenticated|permission/i.test(msg);
    return {
      configured: true,
      authOk: !unauth,
      quoteOk: false,
      sandbox,
      error: msg || 'Falha na cotação Super Frete'
    };
  }
}

async function checkUberIntegration(env, config) {
  if (!uberConfigured(env)) {
    return { configured: false, authOk: false, error: 'UBER_DIRECT_* não configurados.' };
  }
  const sandbox = isUberSandbox(env);
  try {
    const token = await getUberAccessToken(env);
    if (!token) {
      return {
        configured: true,
        authOk: false,
        sandbox,
        error: 'Token OAuth não obtido. Use Client ID/Secret da aba Developer (modo Test se UBER_DIRECT_SANDBOX=true).'
      };
    }
    const dropoff = uberIntegrationTestDropoff(config);
    const quote = await requestUberQuote(env, config, dropoff);
    if (!quote) {
      return {
        configured: true,
        authOk: true,
        quoteOk: false,
        sandbox,
        error: `OAuth OK, mas cotação vazia. Confira Customer ID (aba Developer). Raio pré-filtro do site: ~${UBER_MAX_RADIUS_KM} km da loja (Imirim).`
      };
    }
    return {
      configured: true,
      authOk: true,
      quoteOk: true,
      sandbox,
      samplePrice: quote.price
    };
  } catch (err) {
    if (isUberRadiusError(err)) {
      return {
        configured: true,
        authOk: true,
        quoteOk: false,
        sandbox,
        error: `OAuth OK. Cotação Uber recusada por raio (API). Pré-filtro do site: ~${UBER_MAX_RADIUS_KM} km da loja no Imirim — fora disso o checkout oculta a opção.`
      };
    }
    const extra = err.metadata ? ` — ${JSON.stringify(err.metadata)}` : '';
    return {
      configured: true,
      authOk: !!await getUberAccessToken(env),
      quoteOk: false,
      sandbox,
      error: (err.message || 'Falha na cotação Uber') + extra
    };
  }
}

function estimateBR(originCep, destCep) {
  const o = parseInt(onlyDigits(originCep).slice(0, 5), 10) || 0;
  const d = parseInt(onlyDigits(destCep).slice(0, 5), 10) || 0;
  const diff = Math.abs(o - d);
  if (diff < 800) return { price: 11.9, days: 8 };
  if (diff < 3000) return { price: 15.9, days: 10 };
  if (diff < 8000) return { price: 19.9, days: 12 };
  return { price: 24.9, days: 14 };
}

function estimateBRForMethod(originCep, destCep, method, weightFactor, config) {
  const base = estimateBR(originCep, destCep);
  const ship = config?.shipping || DEFAULT_CONFIG.shipping;
  const code = String(method?.correiosCode || '').trim();
  let priceMult = 1;
  let daysAdj = 0;
  if (code === '8010') {
    priceMult = 1.2;
    daysAdj = -1;
  }
  const maxPrice = Number(ship.estimateMaxPrice) > 0 ? Number(ship.estimateMaxPrice) : 24.9;
  const maxDays = Number(ship.estimateMaxDays) > 0 ? Number(ship.estimateMaxDays) : 14;
  const factor = Math.min(2.5, Math.max(1, Number(weightFactor) || 1));
  const price = Math.min(
    Math.round(base.price * priceMult * factor * 100) / 100,
    Math.round(maxPrice * factor * 100) / 100
  );
  const days = Math.min(Math.max(1, base.days + daysAdj), maxDays);
  return { price, days };
}

/** Estimativa conservadora (teto) quando a API Correios não responde — evita cobrar menos que o frete real. */
function estimateBRMax(config, weightGrams) {
  const ship = config?.shipping || DEFAULT_CONFIG.shipping;
  const baseWeight = shippingWeightGrams(config);
  const w = Number(weightGrams) > 0 ? Number(weightGrams) : baseWeight;
  const weightFactor = Math.min(2.5, Math.max(1, w / baseWeight));
  const maxPrice = Number(ship.estimateMaxPrice) > 0 ? Number(ship.estimateMaxPrice) : 24.9;
  const maxDays = Number(ship.estimateMaxDays) > 0 ? Number(ship.estimateMaxDays) : 14;
  return {
    price: Math.round(maxPrice * weightFactor * 100) / 100,
    days: maxDays
  };
}

const SELF_TEST_PIX_AMOUNT = 0.01;
/** Symbolic BRL charge for Brazil (.com.br) test orders. */
const SELF_TEST_BRL_AMOUNT = 0.01;
/** Symbolic USD charge for international PayPal test orders. */
const SELF_TEST_USD_AMOUNT = 0.01;
/** Symbolic EUR charge for Italian PayPal test orders. */
const SELF_TEST_EUR_AMOUNT = 0.01;
/**
 * Stripe BR accounts reject USD that converts below R$ 0.50.
 * US$ 0.01 ≈ R$ 0.05 — use US$ 0.10 for Stripe self-test.
 */
const SELF_TEST_STRIPE_USD_AMOUNT = 0.10;
const SELF_TEST_STRIPE_EUR_AMOUNT = 0.10;

function normalizeAddrPart(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeStreetNumber(value) {
  return normalizeAddrPart(value).replace(/^(s\/n|sn)$/, '0');
}

/** PIX em produção: R$ 0,01 quando entrega = endereço do remetente (admin). Só com token APP_USR-. */
function isSelfTestPixEligible(order, config, env, billingType) {
  if (billingType !== 'PIX') return false;
  if (isMpSandbox(env)) return false;
  if (!mercadoPagoToken(env)) return false;
  if ((order.paisCode || 'BR') !== 'BR') return false;

  const ship = config.shipping || DEFAULT_CONFIG.shipping || {};
  const sender = ship.sender || {};
  if (!sender.rua || !ship.originCep) return false;

  const orderCep = onlyDigits(order.cep);
  const originCep = onlyDigits(ship.originCep);
  if (orderCep.length !== 8 || orderCep !== originCep) return false;
  if (normalizeAddrPart(order.rua) !== normalizeAddrPart(sender.rua)) return false;
  if (normalizeStreetNumber(order.numero) !== normalizeStreetNumber(sender.numero)) return false;
  if (sender.bairro && normalizeAddrPart(order.bairro) !== normalizeAddrPart(sender.bairro)) return false;
  if (sender.cidade && normalizeAddrPart(order.cidade) !== normalizeAddrPart(sender.cidade)) return false;
  if (sender.uf && normalizeAddrPart(order.uf) !== normalizeAddrPart(sender.uf)) return false;

  return true;
}

function applySelfTestPixPricing(order, config, env, billingType) {
  if (!isSelfTestPixEligible(order, config, env, billingType)) return false;
  if (order.valorProdutoOriginal == null) order.valorProdutoOriginal = order.valorProduto;
  order.freteOriginal = order.frete;
  order.totalOriginal = order.total;
  order.selfTestPix = true;
  order.frete = 0;
  order.valorProduto = SELF_TEST_PIX_AMOUNT;
  order.total = SELF_TEST_PIX_AMOUNT;
  return true;
}

function paypalCredentials(env) {
  return {
    clientId: String(env.PAYPAL_CLIENT_ID || '').trim(),
    secret: String(env.PAYPAL_CLIENT_SECRET || '').trim()
  };
}

function isPayPalSandbox(env, clientId) {
  const id = clientId || paypalCredentials(env).clientId;
  const flag = String(env.PAYPAL_SANDBOX || '').trim().toLowerCase();
  if (flag === 'true' || flag === '1') return true;
  if (flag === 'false' || flag === '0') return false;
  return id.startsWith('sb-');
}

/** PayPal Live self-test (R$ 0,01 / US$ 0,01) — só contas de teste/parceiro. */
function isSelfTestCustomerEmail(email) {
  const e = String(email || '').trim().toLowerCase();
  // Partner (AU): real inbox — alex.teste.au@… has no mailbox.
  if (e === 'duairon@gmail.com') return true;
  if (!e.endsWith('@sensortattoofix.com')) return false;
  return e.includes('.teste') || e.startsWith('fabio.teste') || e.startsWith('alex.teste');
}


/** Conta marcada como testadora (admin) ou e-mail de teste conhecido. */
function isTesterUser(user) {
  if (!user) return false;
  if (user.isTester) return true;
  return isSelfTestCustomerEmail(user.email);
}

async function ensureTesterFlagFromEmail(env, user) {
  if (!user || user.isTester) return user;
  if (!isSelfTestCustomerEmail(user.email)) return user;
  user.isTester = true;
  user.testerSince = user.testerSince || new Date().toISOString();
  user.updatedAt = new Date().toISOString();
  await saveUser(env, user);
  return user;
}

/** R$ 0,01 para usuários com flag isTester (qualquer pagamento). */
async function applyTesterAccountPricing(order, env) {
  if (!order?.userId) return false;
  const user = await getUserById(env, order.userId);
  if (!isTesterUser(user)) return false;
  if (order.valorProdutoOriginal == null) order.valorProdutoOriginal = order.valorProduto;
  if (order.freteOriginal == null) order.freteOriginal = order.frete;
  if (order.totalOriginal == null) order.totalOriginal = order.total;
  order.selfTestTester = true;
  order.selfTestPix = order.selfTestPix || false;
  order.selfTestPayPal = order.selfTestPayPal || false;
  order.frete = 0;
  order.valorProduto = SELF_TEST_PIX_AMOUNT;
  order.total = SELF_TEST_PIX_AMOUNT;
  if (order.paypalFee) order.paypalFee = 0;
  return true;
}

function isSelfTestPayPalEligible(env, order, billingType) {
  if (billingType !== 'PAYPAL') return false;
  if (env.PAYPAL_SELF_TEST !== 'true' && env.PAYPAL_SELF_TEST !== '1') return false;
  if (!isSelfTestCustomerEmail(order?.email)) return false;
  const { clientId } = paypalCredentials(env);
  return !isPayPalSandbox(env, clientId) && !!clientId;
}

function applySelfTestPayPalPricing(order, env, billingType) {
  if (!isSelfTestPayPalEligible(env, order, billingType)) return false;
  if (order.valorProdutoOriginal == null) order.valorProdutoOriginal = order.valorProduto;
  order.freteOriginal = order.frete;
  order.totalOriginal = order.total;
  order.selfTestPayPal = true;
  order.frete = 0;
  order.valorProduto = SELF_TEST_PIX_AMOUNT;
  order.total = SELF_TEST_PIX_AMOUNT;
  return true;
}

/** Stripe Live self-test (US$ 0,01) — mesmos e-mails testadores do PayPal. */
function isSelfTestStripeEligible(env, order, billingType) {
  if (billingType !== 'STRIPE') return false;
  if (!stripeLiveReady(env)) return false;
  return isSelfTestCustomerEmail(order?.email);
}

function applySelfTestStripePricing(order, env, billingType) {
  if (!isSelfTestStripeEligible(env, order, billingType)) return false;
  if (order.valorProdutoOriginal == null) order.valorProdutoOriginal = order.valorProduto;
  order.freteOriginal = order.frete;
  order.totalOriginal = order.total;
  order.selfTestStripe = true;
  order.frete = 0;
  order.valorProduto = SELF_TEST_PIX_AMOUNT;
  order.total = SELF_TEST_PIX_AMOUNT;
  return true;
}

/** Pedido simbólico (PIX/PayPal/Stripe R$ 0,01) — não dispara entrega real. */
function isSelfTestOrder(order) {
  if (order?.selfTestPix || order?.selfTestPayPal || order?.selfTestStripe || order?.selfTestTester) return true;
  const total = Number(order?.total);
  return Number.isFinite(total) && total > 0 && total <= SELF_TEST_PIX_AMOUNT + 1e-9;
}

function shouldDispatchUberDelivery(order) {
  return isUberOrder(order) && !isSelfTestOrder(order);
}

function correiosPackageParams(ship, weightGrams) {
  const weight = Math.max(1, Math.round(Number(weightGrams) || 1));
  return {
    psObjeto: String(weight),
    tpObjeto: '2',
    comprimento: String(Math.max(16, Number(ship.lengthCm) || 16)),
    largura: String(Math.max(11, Number(ship.widthCm) || 12)),
    altura: String(Math.max(2, Number(ship.heightCm) || 2))
  };
}

/** Mini Envios (04227) exige serviço adicional 065 (Valor Declarado Mini Envios) junto com vlDeclarado. */
const CORREIOS_SERV_ADIC_VALOR_DECLARADO_MINI = '065';

function clampCorreiosDeclaredValue(serviceCode, declaredValue) {
  const value = Number(declaredValue);
  if (!Number.isFinite(value) || value <= 0) return 62.9;
  if (String(serviceCode || '').trim() !== '04227') return value;
  return Math.min(116.7, Math.max(12.82, value));
}

function correiosPriceServicosAdicionais(serviceCode, declaredValue) {
  const code = String(serviceCode || '').trim();
  const value = clampCorreiosDeclaredValue(code, declaredValue);
  if (code === '04227' && value > 0) {
    return [{ coServAdicional: CORREIOS_SERV_ADIC_VALOR_DECLARADO_MINI }];
  }
  return [];
}

function appendCorreiosPriceQueryParams(params, serviceCode, declaredValue) {
  for (const item of correiosPriceServicosAdicionais(serviceCode, declaredValue)) {
    params.append('servicosAdicionais', item.coServAdicional);
  }
}

function parseCorreiosPrice(data) {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== 'object') return null;
  if (row.txErro || row.cdErro) {
    console.warn('Correios preço erro:', row.txErro || row.cdErro);
    return null;
  }
  const raw = row.pcFinal ?? row.vlTotal ?? row.preco ?? row.vlPreco ?? row.valor;
  const price = parseBRPrice(raw);
  return Number.isFinite(price) && price > 0 ? price : null;
}

function parseCorreiosDays(data, fallback = 12) {
  const row = Array.isArray(data) ? data[0] : data;
  const days = Number(row?.prazoEntrega ?? row?.prazo ?? row?.nuPrazo);
  return Number.isFinite(days) && days > 0 ? days : fallback;
}

async function fetchCorreiosPriceGet(token, serviceCode, origin, dest, ship, weightGrams, declaredValue) {
  const vlDeclarado = clampCorreiosDeclaredValue(serviceCode, declaredValue);
  const params = new URLSearchParams({
    cepDestino: dest,
    cepOrigem: origin,
    ...correiosPackageParams(ship, weightGrams),
    vlDeclarado: String(vlDeclarado.toFixed(2))
  });
  appendCorreiosPriceQueryParams(params, serviceCode, vlDeclarado);
  const res = await fetch(`https://api.correios.com.br/preco/v1/nacional/${serviceCode}?${params}`, {
    headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' }
  });
  const bodyText = await res.text().catch(() => '');
  if (!res.ok) {
    console.warn('Correios preço GET:', serviceCode, res.status, bodyText.slice(0, 300));
    return null;
  }
  try {
    return bodyText ? JSON.parse(bodyText) : null;
  } catch {
    console.warn('Correios preço GET: JSON inválido', serviceCode);
    return null;
  }
}

async function fetchCorreiosPricePost(token, serviceCode, origin, dest, ship, weightGrams, declaredValue) {
  const vlDeclarado = clampCorreiosDeclaredValue(serviceCode, declaredValue);
  const servicosAdicionais = correiosPriceServicosAdicionais(serviceCode, vlDeclarado);
  const res = await fetch('https://api.correios.com.br/preco/v1/nacional', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      idLote: '1',
      parametrosProduto: [{
        coProduto: serviceCode,
        nuRequisicao: '1',
        cepOrigem: origin,
        cepDestino: dest,
        ...correiosPackageParams(ship, weightGrams),
        ...(servicosAdicionais.length ? { servicosAdicionais } : {}),
        vlDeclarado: String(vlDeclarado.toFixed(2))
      }]
    })
  });
  const bodyText = await res.text().catch(() => '');
  if (!res.ok) {
    console.warn('Correios preço POST:', serviceCode, res.status, bodyText.slice(0, 300));
    return null;
  }
  try {
    return bodyText ? JSON.parse(bodyText) : null;
  } catch {
    console.warn('Correios preço POST: JSON inválido', serviceCode);
    return null;
  }
}

async function fetchCorreiosPrazo(token, serviceCode, origin, dest) {
  const params = new URLSearchParams({ cepOrigem: origin, cepDestino: dest });
  const res = await fetch(`https://api.correios.com.br/prazo/v1/nacional/${serviceCode}?${params}`, {
    headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' }
  });
  if (!res.ok) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

const CORREIOS_INTEGRATION_TEST_DEST = '01310100';

function correiosIntegrationTestParams(config) {
  const ship = config.shipping || DEFAULT_CONFIG.shipping;
  const origin = onlyDigits(ship.originCep);
  const serviceCode = String(ship.serviceCode || '04227').trim();
  const weightGrams = shippingWeightGrams(config);
  const declaredValue = Number(config.product?.price) || 62.9;
  return { ship, origin, dest: CORREIOS_INTEGRATION_TEST_DEST, serviceCode, weightGrams, declaredValue };
}

function extractCorreiosApiError(res, bodyText) {
  const raw = String(bodyText || '').trim();
  if (raw.includes('GTW-012')) {
    const apiMatch = raw.match(/API:\s*(\d+)/i);
    return apiMatch
      ? `GTW-012 — API ${apiMatch[1]} restrita (aguardando liberação no contrato)`
      : 'GTW-012 — API restrita (aguardando liberação no contrato)';
  }
  if (!res.ok) {
    try {
      const data = JSON.parse(raw);
      return data.mensagem || data.message || (Array.isArray(data.msgs) && data.msgs[0])
        || data.txErro || (data.cdErro ? `cdErro ${data.cdErro}` : null) || `HTTP ${res.status}`;
    } catch {
      return raw ? raw.slice(0, 140) : `HTTP ${res.status}`;
    }
  }
  try {
    const data = raw ? JSON.parse(raw) : null;
    const row = Array.isArray(data) ? data[0] : data;
    if (row?.txErro) return String(row.txErro);
    if (row?.cdErro) return `cdErro ${row.cdErro}`;
  } catch { /* ignore */ }
  return null;
}

async function probeCorreiosPrecoApi(token, config) {
  const { ship, origin, dest, serviceCode, weightGrams, declaredValue } = correiosIntegrationTestParams(config);
  if (origin.length !== 8) {
    return { ok: false, detail: 'CEP de origem inválido — configure em Frete → Correios BR' };
  }
  const params = new URLSearchParams({
    cepDestino: dest,
    cepOrigem: origin,
    ...correiosPackageParams(ship, weightGrams),
    vlDeclarado: String(clampCorreiosDeclaredValue(serviceCode, declaredValue).toFixed(2))
  });
  appendCorreiosPriceQueryParams(params, serviceCode, declaredValue);
  const res = await fetch(`https://api.correios.com.br/preco/v1/nacional/${serviceCode}?${params}`, {
    headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' }
  });
  const bodyText = await res.text().catch(() => '');
  if (res.ok) {
    try {
      const data = bodyText ? JSON.parse(bodyText) : null;
      const price = parseCorreiosPrice(data);
      if (price) {
        return {
          ok: true,
          detail: `OK — serviço ${serviceCode} teste R$ ${price.toFixed(2).replace('.', ',')}`
        };
      }
      return { ok: false, detail: extractCorreiosApiError(res, bodyText) || 'Resposta sem preço válido' };
    } catch {
      return { ok: false, detail: 'Resposta JSON inválida' };
    }
  }
  return { ok: false, detail: extractCorreiosApiError(res, bodyText) };
}

async function probeCorreiosPrazoApi(token, config) {
  const { origin, dest, serviceCode } = correiosIntegrationTestParams(config);
  if (origin.length !== 8) {
    return { ok: false, detail: 'CEP de origem inválido — configure em Frete → Correios BR' };
  }
  const params = new URLSearchParams({ cepOrigem: origin, cepDestino: dest });
  const res = await fetch(`https://api.correios.com.br/prazo/v1/nacional/${serviceCode}?${params}`, {
    headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' }
  });
  const bodyText = await res.text().catch(() => '');
  if (res.ok) {
    try {
      const data = bodyText ? JSON.parse(bodyText) : null;
      const days = parseCorreiosDays(data, 0);
      if (days > 0) {
        return { ok: true, detail: `OK — serviço ${serviceCode} teste ${days} dia(s)` };
      }
      return { ok: false, detail: extractCorreiosApiError(res, bodyText) || 'Resposta sem prazo válido' };
    } catch {
      return { ok: false, detail: 'Resposta JSON inválida' };
    }
  }
  return { ok: false, detail: extractCorreiosApiError(res, bodyText) };
}

function correiosCnpj(env) {
  return onlyDigits(env.CORREIOS_USER || '');
}

function correiosCommercialContract(env) {
  return String(env.CORREIOS_COMMERCIAL_CONTRACT || '9912752041').trim();
}

function correiosCartaoPostagem(env) {
  return String(env.CORREIOS_CONTRACT || '').trim();
}

async function probeCorreiosCartaoServico(token, env, serviceCode) {
  const cnpj = correiosCnpj(env);
  const contrato = correiosCommercialContract(env);
  const cartao = correiosCartaoPostagem(env);
  if (cnpj.length !== 14) {
    return { ok: false, detail: 'CORREIOS_USER deve ser o CNPJ (14 dígitos)' };
  }
  if (!contrato || !cartao) {
    return {
      ok: false,
      detail: 'Configure CORREIOS_CONTRACT (cartão) e CORREIOS_COMMERCIAL_CONTRACT (contrato comercial)'
    };
  }
  const url = `https://api.correios.com.br/meucontrato/v1/empresas/${cnpj}/contratos/${contrato}/cartoes/${cartao}/servicos/${serviceCode}`;
  const res = await fetch(url, {
    headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' }
  });
  const bodyText = await res.text().catch(() => '');
  if (res.ok) {
    try {
      const data = bodyText ? JSON.parse(bodyText) : null;
      const desc = data?.descricao || data?.descricaoServico || 'no cartão';
      return { ok: true, detail: `OK — Correios serviço ${serviceCode} (${desc})` };
    } catch {
      return { ok: true, detail: `OK — Correios serviço ${serviceCode} no cartão ${cartao}` };
    }
  }
  if (res.status === 404 || bodyText.includes('CON-011')) {
    return {
      ok: false,
      detail: `CON-011 — Correios serviço ${serviceCode} ausente no cartão ${cartao} (solicite ao gestor Correios)`
    };
  }
  return { ok: false, detail: extractCorreiosApiError(res, bodyText) || `HTTP ${res.status}` };
}

async function probeCorreiosPrePostagemApi(token) {
  const res = await fetch('https://api.correios.com.br/prepostagem/v1/prepostagens/rotulo/assincrono/pdf', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ idsPrePostagem: [], tipoRotulo: 'P', formatoRotulo: 'ET' })
  });
  const bodyText = await res.text().catch(() => '');
  if (bodyText.includes('GTW-012')) {
    const apiMatch = bodyText.match(/API:\s*(\d+)/i);
    return {
      ok: false,
      detail: apiMatch
        ? `GTW-012 — API ${apiMatch[1]} restrita (aguardando liberação no contrato)`
        : 'GTW-012 — API 36 restrita (aguardando liberação no contrato)'
    };
  }
  if (res.status === 401 || res.status === 403) {
    return { ok: false, detail: extractCorreiosApiError(res, bodyText) || `HTTP ${res.status}` };
  }
  return { ok: true, detail: 'OK — API 36 (Pré-Postagem) acessível' };
}

/** Autentica no cartão de postagem e retorna a lista de APIs habilitadas no contrato. */
async function fetchCorreiosContractInfo(env) {
  const cartao = correiosCartaoPostagem(env);
  const user = env.CORREIOS_USER;
  const password = env.CORREIOS_PASSWORD;
  if (!user || !password || !cartao) {
    return { ok: false, detail: 'Credenciais/cartão dos Correios não configurados no Worker' };
  }
  const res = await fetch('https://api.correios.com.br/token/v1/autentica/cartaopostagem', {
    method: 'POST',
    headers: { Authorization: 'Basic ' + btoa(user + ':' + password), 'Content-Type': 'application/json' },
    body: JSON.stringify({ numero: cartao })
  });
  const bodyText = await res.text().catch(() => '');
  if (!res.ok) {
    return { ok: false, detail: `HTTP ${res.status} — ${bodyText.slice(0, 200)}` };
  }
  let data;
  try {
    data = JSON.parse(bodyText);
  } catch {
    return { ok: false, detail: 'Resposta inválida do endpoint de token' };
  }
  const card = data.cartaoPostagem || {};
  return {
    ok: true,
    token: data.token,
    ambiente: data.ambiente || null,
    contrato: card.contrato || null,
    cartao: card.numero || cartao,
    dr: card.dr ?? null,
    apis: Array.isArray(card.api) ? card.api : []
  };
}

/** Lista todos os serviços vinculados ao cartão de postagem (API Meu Contrato). */
async function listCorreiosCardServices(token, env) {
  const cnpj = correiosCnpj(env);
  const contrato = correiosCommercialContract(env);
  const cartao = correiosCartaoPostagem(env);
  if (cnpj.length !== 14 || !contrato || !cartao) return { error: 'CNPJ/contrato/cartão incompletos' };
  const url = `https://api.correios.com.br/meucontrato/v1/empresas/${cnpj}/contratos/${contrato}/cartoes/${cartao}/servicos?page=0&size=200`;
  const res = await fetch(url, { headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' } });
  const bodyText = await res.text().catch(() => '');
  if (!res.ok) {
    return { error: extractCorreiosApiError(res, bodyText) || `HTTP ${res.status}` };
  }
  let data;
  try {
    data = bodyText ? JSON.parse(bodyText) : null;
  } catch {
    return { error: 'JSON inválido' };
  }
  const items = Array.isArray(data) ? data : (data?.itens || data?.content || []);
  return {
    services: items.map((s) => ({
      codigo: String(s.codigo || s.codigoServico || '').trim() || null,
      descricao: String(s.descricao || s.descricaoServico || '').trim(),
      segmento: s.segmento || s.categoria || null
    }))
  };
}

const CORREIOS_INTL_SERVICE_RE = /EXPORTA|INTERNAC|PACKET|DOCUMENTO +INT|LEVE +INT/i;

function correiosIntlServicesFrom(services) {
  return (services || []).filter((s) => CORREIOS_INTL_SERVICE_RE.test(`${s.descricao || ''} ${s.segmento || ''}`));
}

function normalizeCorreiosPhone(telefone) {
  const d = onlyDigits(telefone);
  if (d.length >= 10) {
    return { ddd: d.slice(0, 2), numero: d.slice(-8) };
  }
  return { ddd: '11', numero: '00000000' };
}

function buildCorreiosEndereco(parts) {
  return {
    cep: onlyDigits(parts.cep),
    logradouro: String(parts.rua || parts.logradouro || '').trim().slice(0, 50),
    numero: String(parts.numero || 'S/N').trim().slice(0, 6) || 'S/N',
    complemento: String(parts.complemento || '').trim().slice(0, 30),
    bairro: String(parts.bairro || '').trim().slice(0, 30),
    cidade: String(parts.cidade || '').trim().slice(0, 30),
    uf: String(parts.uf || '').trim().toUpperCase().slice(0, 2)
  };
}

function normalizeIntlPostalCode(cep) {
  return String(cep || '').trim().replace(/\s+/g, ' ').slice(0, 17);
}

const AU_STATE_TO_REGIAO = {
  QLD: 'Queensland', NSW: 'New South Wales', VIC: 'Victoria', WA: 'Western Australia',
  SA: 'South Australia', TAS: 'Tasmania', ACT: 'Australian Capital Territory', NT: 'Northern Territory',
  QUEENSLAND: 'Queensland', 'NEW SOUTH WALES': 'New South Wales', VICTORIA: 'Victoria'
};

function buildCorreiosIntlEndereco(order) {
  const pais = String(order.paisCode || '').trim().toUpperCase().slice(0, 2);
  if (!pais || pais === 'BR' || pais === 'OT' || pais === 'XX' || pais === 'T1') {
    throw new Error('Código ISO do país obrigatório para pré-postagem internacional (ex: AU, US, IT).');
  }
  const stateRaw = String(order.uf || order.estado || order.state || '').trim();
  const stateKey = stripDiacritics(stateRaw).toUpperCase();
  const region = String(
    order.regiao || order.region || AU_STATE_TO_REGIAO[stateKey] || stateRaw || order.cidade || pais
  ).trim().slice(0, 50) || pais;
  // UF Correios exige 2 chars; estados AU (QLD/NSW) têm 3 — usa EX e guarda estado em regiao.
  let uf = stateRaw.toUpperCase();
  if (uf.length !== 2) uf = 'EX';

  let rua = String(order.rua || order.logradouro || '').trim();
  let numero = String(order.numero || '').trim();
  // "8 Davey Street" no campo rua → separar número
  if (rua && (!numero || rua.startsWith(numero + ' '))) {
    const m = rua.match(/^(\d+[A-Za-z]?)\s+(.+)$/);
    if (m) {
      numero = m[1];
      rua = m[2];
    }
  }
  if (!rua) rua = String(order.endereco || '').trim().split(/[—\-]/)[0]?.trim() || 'Address';
  if (!numero) numero = 'S/N';

  let bairro = String(order.bairro || '').trim();
  // pedidos antigos colocaram o estado em bairro
  if (!bairro || stripDiacritics(bairro).toUpperCase() === stateKey || AU_STATE_TO_REGIAO[stripDiacritics(bairro).toUpperCase()]) {
    bairro = String(order.cidade || 'Centro').trim() || 'Centro';
  }

  const postal = normalizeIntlPostalCode(order.cep || order.postalCode || order.postal);
  return {
    // Código postal internacional (opcional na prática; vazio evita validação de CEP BR via Prazo).
    cep: postal || '',
    logradouro: rua.slice(0, 50),
    numero: numero.slice(0, 6) || 'S/N',
    complemento: String(order.complemento || '').trim().slice(0, 30),
    bairro: bairro.slice(0, 30) || 'Centro',
    cidade: String(order.cidade || '').trim().slice(0, 30) || 'City',
    uf,
    regiao: region,
    pais,
    codigoPais: pais
  };
}

const CORREIOS_DDI_BY_COUNTRY = {
  US: '1', CA: '1', AU: '61', GB: '44', UK: '44', IT: '39', PT: '351', ES: '34',
  FR: '33', DE: '49', NL: '31', BE: '32', IE: '353', NZ: '64', JP: '81',
  SI: '386',
  KR: '82', CN: '86', IN: '91', MX: '52', AR: '54', CL: '56', CO: '57',
  PE: '51', UY: '598', PY: '595', BO: '591', EC: '593', VE: '58', BR: '55'
};

function normalizeCorreiosIntlPhone(telefone, paisCode) {
  let d = onlyDigits(telefone);
  const ddi = CORREIOS_DDI_BY_COUNTRY[String(paisCode || '').toUpperCase()] || '';
  if (ddi && d.startsWith(ddi)) d = d.slice(ddi.length);
  if (d.length > 8) d = d.slice(-8);
  if (d.length < 8) d = (d + '00000000').slice(0, 8);
  return {
    ddi: String(ddi || '1').slice(0, 3),
    numero: d
  };
}

function isValidExportServiceCode(code) {
  const c = String(code || '').trim();
  if (!c || c === '*' || isCorreiosImportOnlyServiceCode(c)) return false;
  return /^\d{4,5}$/.test(c);
}

async function resolveIntlExportServiceCode(order, config) {
  const existing = String(order.shippingServiceCode || '').trim();
  if (isValidExportServiceCode(existing)) return existing;

  const country = String(order.paisCode || '').trim().toUpperCase();
  if (!country || country === 'BR' || country === 'OTHER' || country === 'XX') {
    throw new Error('País de destino inválido para pré-postagem internacional (informe o código ISO, ex: AU, US, IT).');
  }
  const wantDoc = isIntlDocumentShipment(order);
  const options = await quoteCorreiosExportOptions(config, country, {
    weightGrams: shippingWeightGrams(config)
  });
  const matched = (options || []).filter((o) => {
    if (!isValidExportServiceCode(o.serviceCode)) return false;
    const isDoc = o.shipmentType === 'documento';
    return wantDoc ? isDoc : !isDoc;
  });
  const pool = matched.length ? matched : (options || []).filter((o) => isValidExportServiceCode(o.serviceCode));
  pool.sort((a, b) => Number(a.price) - Number(b.price));
  const pick = pool[0];
  if (!pick?.serviceCode) {
    throw new Error('Nenhum código de serviço de exportação (Documento/Exporta Fácil) disponível para este país.');
  }
  return String(pick.serviceCode).trim();
}

function buildPrePostagemPayload(order, config, env) {
  const ship = config.shipping || DEFAULT_CONFIG.shipping;
  const sender = ship.sender || {};
  const weightGrams = shippingWeightGrams(config);
  const declaredValue = Number(order.valorProduto) || Number(config.product?.price) || 62.9;
  const intl = isCorreiosIntlOrder(order);
  const isDocument = intl && isIntlDocumentShipment(order);
  const serviceCode = String(
    order.shippingServiceCode || (intl ? '' : (ship.serviceCode || '04227'))
  ).trim();
  if (!serviceCode || serviceCode === '*') {
    throw new Error(intl
      ? 'Pedido internacional sem código de serviço de exportação Correios'
      : 'Pedido sem código de serviço Correios');
  }
  if (intl && isCorreiosImportOnlyServiceCode(serviceCode)) {
    throw new Error(`Código ${serviceCode} é de Packet/importação, não serve para envio ao exterior`);
  }

  const remetentePhone = normalizeCorreiosPhone(config.whatsapp?.shop || config.whatsapp?.number || '');
  const payload = {
    codigoServico: serviceCode,
    pesoInformado: String(Math.max(1, Math.round(weightGrams))),
    codigoFormatoObjetoInformado: isDocument ? '1' : '2',
    cienteObjetoNaoProibido: '1',
    modalidadePagamento: intl ? '2' : '1',
    pedidoExternoOrigem: String(order.orderId || '').slice(0, 50),
    remetente: {
      nome: String(sender.company || sender.brand || 'Remetente').trim(),
      cpfCnpj: onlyDigits(sender.cnpj || env.CORREIOS_USER || ''),
      telefone: remetentePhone.numero,
      dddTelefone: remetentePhone.ddd,
      email: String(config.formsubmit?.email || '').trim(),
      endereco: buildCorreiosEndereco({
        cep: ship.originCep,
        rua: sender.rua,
        numero: sender.numero,
        complemento: sender.complemento,
        bairro: sender.bairro,
        cidade: sender.cidade,
        uf: sender.uf
      })
    },
    itensDeclaracaoConteudo: [{
      conteudo: String(order.produto || 'Produto Sensor Tattoo Fix').slice(0, 80),
      quantidade: '1',
      valor: declaredValue.toFixed(2)
    }]
  };

  if (!isDocument) {
    payload.alturaInformada = String(Math.max(2, Math.ceil(Number(ship.heightCm) || 2)));
    payload.larguraInformada = String(Math.max(11, Math.round(Number(ship.widthCm) || 12)));
    payload.comprimentoInformado = String(Math.max(16, Math.round(Number(ship.lengthCm) || 16)));
  }

  if (intl) {
    const destPhone = normalizeCorreiosIntlPhone(order.telefone || '', order.paisCode);
    payload.destinatario = {
      nome: String(order.nome || '').trim(),
      email: String(order.email || '').trim(),
      telefone: destPhone.numero,
      ddiTelefone: destPhone.ddi,
      endereco: buildCorreiosIntlEndereco(order)
    };
  } else {
    const destPhone = normalizeCorreiosPhone(order.telefone || '');
    payload.destinatario = {
      nome: String(order.nome || '').trim(),
      cpfCnpj: onlyDigits(order.cpf || ''),
      telefone: destPhone.numero,
      dddTelefone: destPhone.ddd,
      email: String(order.email || '').trim(),
      endereco: buildCorreiosEndereco({
        cep: order.cep,
        rua: order.rua,
        numero: order.numero,
        complemento: order.complemento,
        bairro: order.bairro,
        cidade: order.cidade,
        uf: order.uf
      })
    };
  }

  return payload;
}

async function findOrderByTrackingCode(env, trackingCode) {
  const code = String(trackingCode || '').trim().toUpperCase();
  if (!code) return null;
  const d1Id = await d1OrderIdByTracking(env, code);
  if (d1Id) return getOrder(env, d1Id);
  const orderId = await env.STORE_KV.get('tracking:' + code);
  if (orderId) return getOrder(env, orderId);
  const index = await readOrdersIndex(env);
  for (const item of index.slice(0, 300)) {
    const order = await getOrder(env, item.orderId);
    if (!order) continue;
    if (String(order.correiosTrackingCode || '').trim().toUpperCase() === code) {
      return order;
    }
  }
  return null;
}

function trackingSummaryFromOrder(order) {
  if (!order) return null;
  const events = [];
  if (Array.isArray(order.correiosTrackingEvents) && order.correiosTrackingEvents.length) {
    events.push(...order.correiosTrackingEvents);
  } else {
    const status = String(order.correiosTrackingStatus || '').trim();
    const manualAt = order.correiosManualUpdatedAt || order.correiosTrackingUpdatedAt;
    const note = String(order.correiosShippingManualNote || order.shippingService || '').trim();
    if (status && manualAt) {
      events.push({ date: manualAt, description: status, detail: note || undefined });
    }
    const last = order.correiosTrackingLastEvent;
    if (last?.description) {
      const dup = events.some((e) => e.description === last.description);
      if (!dup) events.unshift({
        date: last.date,
        description: last.description,
        detail: last.detail || undefined
      });
    }
  }
  const status = String(order.correiosTrackingStatus || events[0]?.description || '').trim();
  if (!status) return null;
  return {
    status,
    lastEvent: events[0] || null,
    events,
    service: order.shippingService || null,
    shippingDays: order.shippingDays ?? null,
    source: 'order'
  };
}

function mergeTrackingSummaries(apiSummary, orderSummary) {
  const api = apiSummary || { status: null, lastEvent: null, events: [] };
  const fromOrder = orderSummary || null;
  const apiEvents = Array.isArray(api.events) ? api.events : [];
  const orderEvents = Array.isArray(fromOrder?.events) ? fromOrder.events : [];

  if (apiEvents.length) {
    return {
      ...api,
      service: fromOrder?.service || null,
      shippingDays: fromOrder?.shippingDays ?? null,
      source: 'correios'
    };
  }

  if (fromOrder) {
    return {
      status: fromOrder.status,
      lastEvent: fromOrder.lastEvent,
      events: orderEvents,
      service: fromOrder.service,
      shippingDays: fromOrder.shippingDays,
      source: 'order',
      note: 'Envio registrado manualmente — a API Correios do contrato não retorna objetos postados fora do contrato.'
    };
  }

  return {
    status: api.status && api.status !== 'Pré-postado' ? api.status : 'Aguardando atualização nos Correios',
    lastEvent: api.lastEvent,
    events: [],
    source: 'none',
    note: 'Sem eventos na API Correios. Consulte também o site oficial (captcha).'
  };
}

function summarizeCorreiosTracking(data) {
  const obj = Array.isArray(data?.objetos) ? data.objetos[0] : data?.objeto;
  if (!obj) return { status: 'Sem eventos na API', lastEvent: null, events: [] };
  const events = Array.isArray(obj.eventos) ? obj.eventos : [];
  const sorted = [...events].sort((a, b) => new Date(b.dtHrCriado) - new Date(a.dtHrCriado));
  const last = sorted[0];
  const lastEvent = last ? {
    date: last.dtHrCriado,
    description: String(last.descricao || '').trim(),
    detail: String(last.detalhe || '').trim()
  } : null;
  if (!events.length) {
    return { status: 'Sem eventos na API', lastEvent: null, events: [] };
  }
  const desc = (last?.descricao || '').toLowerCase();
  let status = 'Aguardando postagem na agência';
  if (desc.includes('entregue')) status = 'Entregue';
  else if (desc.includes('saiu para entrega')) status = 'Saiu para entrega';
  else if (desc.includes('postado')) status = 'Postado';
  else if (desc.includes('trânsito') || desc.includes('transito')) status = 'Em trânsito';
  else if (lastEvent?.description) status = lastEvent.description;
  return {
    status,
    lastEvent,
    events: sorted.slice(0, 12).map((e) => ({
      date: e.dtHrCriado,
      description: String(e.descricao || '').trim(),
      detail: String(e.detalhe || '').trim()
    }))
  };
}

async function handlePublicTracking(request, env, origin, code) {
  const trackingCode = String(code || '').trim().toUpperCase();
  if (!CORREIOS_AV_RE.test(trackingCode)) {
    return json({ error: 'Código de rastreio inválido.' }, 400, origin);
  }
  const token = await getCorreiosToken(env);
  if (!token) {
    return json({ error: 'Rastreamento temporariamente indisponível.' }, 503, origin);
  }
  const order = await findOrderByTrackingCode(env, trackingCode);
  const apiSummary = await fetchCorreiosTrackingSummary(token, trackingCode);
  const orderSummary = trackingSummaryFromOrder(order);
  const summary = mergeTrackingSummaries(apiSummary, orderSummary);
  return json({
    trackingCode,
    officialUrl: correiosOfficialTrackingUrl(trackingCode),
    ...summary
  }, 200, origin);
}

async function fetchCorreiosTrackingSummary(token, trackingCode) {
  const code = String(trackingCode || '').trim().toUpperCase();
  if (!code) return null;
  const res = await fetch(
    `https://api.correios.com.br/srorastro/v1/objetos/${encodeURIComponent(code)}?resultado=T`,
    { headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' } }
  );
  if (!res.ok) {
    return { status: 'Indisponível', lastEvent: null, events: [], error: `HTTP ${res.status}` };
  }
  try {
    return summarizeCorreiosTracking(await res.json());
  } catch {
    return { status: 'Indisponível', lastEvent: null, events: [], error: 'JSON inválido' };
  }
}

async function quoteCorreiosPriceForOrder(env, config, order) {
  if (!isCorreiosBrOrder(order)) return null;
  const dest = onlyDigits(order.cep);
  if (dest.length !== 8) return null;
  const ship = config.shipping || DEFAULT_CONFIG.shipping;
  const origin = onlyDigits(ship.originCep);
  const serviceCode = String(order.shippingServiceCode || ship.serviceCode || '04227').trim();
  const weightGrams = shippingWeightGrams(config);
  const declaredValue = Number(order.valorProduto) || Number(config.product?.price) || 62.9;

  const token = await getCorreiosToken(env);
  if (!token) return null;

  let data = await fetchCorreiosPriceGet(token, serviceCode, origin, dest, ship, weightGrams, declaredValue);
  let price = parseCorreiosPrice(data);
  if (!price) {
    data = await fetchCorreiosPricePost(token, serviceCode, origin, dest, ship, weightGrams, declaredValue);
    price = parseCorreiosPrice(data);
  }
  return price;
}

async function ensureCorreiosFreteEstimate(env, order, config) {
  if (!isCorreiosBrOrder(order)) return { skipped: true, reason: 'not_correios' };
  const existing = Number(order.correiosFreteEstimado);
  if (Number.isFinite(existing) && existing > 0) {
    return { ok: true, alreadyExists: true, price: existing };
  }
  const price = await quoteCorreiosPriceForOrder(env, config, order);
  if (!price) return { ok: false, error: 'quote_failed' };
  order.correiosFreteEstimado = price;
  order.correiosFreteEstimadoAt = new Date().toISOString();
  await saveOrder(env, order);
  return { ok: true, price };
}

async function fetchCorreiosJson(token, url) {
  const res = await fetch(url, { headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' } });
  const bodyText = await res.text().catch(() => '');
  if (!res.ok) return null;
  try {
    return bodyText ? JSON.parse(bodyText) : null;
  } catch {
    return null;
  }
}

async function fetchCorreiosPrePostagemById(token, prePostagemId) {
  const id = String(prePostagemId || '').trim();
  if (!id) return null;

  let data = await fetchCorreiosJson(
    token,
    `https://api.correios.com.br/prepostagem/v1/prepostagens/${encodeURIComponent(id)}`
  );
  if (extractCorreiosAvCode(data)) return data;

  const v2Queries = [
    `id=${encodeURIComponent(id)}`,
    `ids=${encodeURIComponent(id)}`,
    `idPrePostagem=${encodeURIComponent(id)}`,
    `codigoPrePostagem=${encodeURIComponent(id)}`
  ];
  for (const q of v2Queries) {
    const listed = await fetchCorreiosJson(token, `https://api.correios.com.br/prepostagem/v2/prepostagens?${q}`);
    if (!listed) continue;
    if (extractCorreiosAvCode(listed)) return listed;
    const rows = listed.itens || listed.items || listed.content || listed.prePostagens || listed.data;
    if (Array.isArray(rows)) {
      const match = rows.find((row) => extractCorreiosAvCode(row));
      if (match) return match;
    }
  }
  return data;
}

function parseCorreiosLabelDownload(dlData) {
  if (!dlData) return { trackingCode: null, pdfBase64: null };
  let trackingCode = extractCorreiosAvCode(dlData);
  let pdfBase64 = null;
  const dados = dlData.dados;

  if (typeof dados === 'string') {
    pdfBase64 = dados;
  } else if (Array.isArray(dados)) {
    for (const row of dados) {
      if (!trackingCode) trackingCode = extractCorreiosAvCode(row);
      if (!pdfBase64) {
        const b64 = row?.conteudo || row?.pdf || row?.dados || row?.rotulo || row?.base64;
        if (typeof b64 === 'string') pdfBase64 = b64;
      }
    }
  } else if (dados && typeof dados === 'object') {
    if (!trackingCode) trackingCode = extractCorreiosAvCode(dados);
    pdfBase64 = dados.conteudo || dados.pdf || dados.dados || dados.rotulo || null;
  }

  if (!pdfBase64) {
    const alt = dlData.conteudo || dlData.pdf || dlData.rotulo || dlData.base64;
    if (typeof alt === 'string') pdfBase64 = alt;
  }
  if (typeof pdfBase64 !== 'string') pdfBase64 = null;
  return { trackingCode, pdfBase64 };
}

const CORREIOS_AV_RE = /^[A-Z]{2}\d{9}[A-Z]{2}$/;
const AV_SCAN_PATTERNS = [/AV\d{9}[A-Z]{2}/g, /[A-Z]{2}\d{9}[A-Z]{2}/g];

function extractCorreiosAvCode(data, depth = 0) {
  if (!data || depth > 8) return null;
  if (typeof data === 'string') {
    const code = data.trim().toUpperCase();
    if (CORREIOS_AV_RE.test(code)) return code;
    for (const re of AV_SCAN_PATTERNS) {
      re.lastIndex = 0;
      const matches = code.match(re);
      if (matches?.length) {
        const av = matches.find((m) => m.startsWith('AV'));
        return av || matches[0];
      }
    }
    return null;
  }
  if (typeof data !== 'object') return null;
  const keys = [
    'codigoObjeto', 'codigoRegistro', 'codigoObjetoCliente', 'numeroObjeto',
    'codigo', 'trackingCode', 'codigoRastreio', 'numeroEtiqueta', 'identificador',
    'objeto', 'numeroRegistro', 'codigoEtiqueta', 'etiqueta', 'rastreio',
    'numeroRastreio', 'barcode', 'codigoBarras', 'awb', 'tracking',
    'identificacaoObjeto', 'registro', 'codigoDeRastreio', 'codigoRastreamento'
  ];
  for (const k of keys) {
    const found = extractCorreiosAvCode(data[k], depth + 1);
    if (found) return found;
  }
  if (Array.isArray(data)) {
    for (const item of data) {
      const found = extractCorreiosAvCode(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  for (const v of Object.values(data)) {
    if (v && (typeof v === 'string' || typeof v === 'object')) {
      const found = extractCorreiosAvCode(v, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

async function requestCorreiosLabelReceipt(token, prePostagemId, opts = {}) {
  const tipoRotulo = opts.tipoRotulo || 'P';
  const res = await fetch('https://api.correios.com.br/prepostagem/v1/prepostagens/rotulo/assincrono/pdf', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      idsPrePostagem: [prePostagemId],
      tipoRotulo,
      formatoRotulo: opts.formatoRotulo || 'ET'
    })
  });
  const bodyText = await res.text().catch(() => '');
  if (!res.ok) {
    throw new Error(extractCorreiosApiError(res, bodyText) || `Falha ao solicitar rótulo (${res.status})`);
  }
  let data;
  try {
    data = bodyText ? JSON.parse(bodyText) : {};
  } catch {
    throw new Error('Resposta inválida ao solicitar rótulo');
  }
  return data.idRecibo || data.recibo || data.id || null;
}

async function pollCorreiosLabelDownload(token, idRecibo, opts = {}) {
  const requirePdf = opts.requirePdf !== false;
  const maxAttempts = opts.maxAttempts || 30;
  const firstDelay = opts.firstDelayMs ?? 500;
  const nextDelay = opts.nextDelayMs ?? 2000;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    await sleepMs(attempt === 0 ? firstDelay : nextDelay);
    const dlRes = await fetch(
      `https://api.correios.com.br/prepostagem/v1/prepostagens/rotulo/download/assincrono/${encodeURIComponent(idRecibo)}`,
      { headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' } }
    );
    const dlText = await dlRes.text().catch(() => '');
    if (!dlRes.ok) {
      if (dlRes.status === 404 || dlRes.status === 202) continue;
      throw new Error(extractCorreiosApiError(dlRes, dlText) || `Download do rótulo falhou (${dlRes.status})`);
    }
    let dlData;
    try {
      dlData = dlText ? JSON.parse(dlText) : {};
    } catch {
      continue;
    }
    const parsed = parseCorreiosLabelDownload(dlData);
    const trackingCode = parsed.trackingCode;
    const pdfBase64 = parsed.pdfBase64;
    const codeFromPdf = pdfBase64 ? await extractAvFromPdfBase64(pdfBase64) : null;
    const resolvedCode = trackingCode || codeFromPdf;
    if (resolvedCode && !requirePdf) return { trackingCode: resolvedCode, pdfBase64: pdfBase64 || null };
    if (pdfBase64) return { pdfBase64, trackingCode: resolvedCode || null };
    const status = String(dlData.status || dlData.situacao || '').toUpperCase();
    if (status === 'ERRO' || status === 'FALHA') {
      throw new Error(dlData.mensagem || dlData.message || 'Processamento do rótulo falhou');
    }
  }
  if (requirePdf) throw new Error('Tempo esgotado aguardando PDF do rótulo Correios');
  return null;
}

function pickAvFromMatches(matches) {
  if (!matches?.length) return null;
  const av = matches.find((m) => m.startsWith('AV'));
  return av || matches[0];
}

function scanAvInBytes(bytes) {
  if (!bytes?.length || bytes.length < 13) return null;
  let fallback = null;
  for (let i = 0; i <= bytes.length - 13; i += 1) {
    const b0 = bytes[i];
    const b1 = bytes[i + 1];
    if (b0 < 65 || b0 > 90 || b1 < 65 || b1 > 90) continue;
    let digitsOk = true;
    for (let j = 2; j <= 10; j += 1) {
      const c = bytes[i + j];
      if (c < 48 || c > 57) {
        digitsOk = false;
        break;
      }
    }
    if (!digitsOk) continue;
    const b11 = bytes[i + 11];
    const b12 = bytes[i + 12];
    if (b11 < 65 || b11 > 90 || b12 < 65 || b12 > 90) continue;
    const code = String.fromCharCode(b0, b1, ...bytes.slice(i + 2, i + 13));
    if (code.startsWith('AV')) return code;
    if (!fallback) fallback = code;
  }
  return fallback;
}

function scanAvInString(text) {
  if (!text) return null;
  const upper = String(text).toUpperCase();
  for (const re of AV_SCAN_PATTERNS) {
    re.lastIndex = 0;
    const found = pickAvFromMatches(upper.match(re));
    if (found) return found;
  }
  return null;
}

function decodePdfLiteral(str) {
  return str.replace(/\\([0-7]{1,3}|.)/g, (_, seq) => {
    if (seq.length <= 3 && /^[0-7]+$/.test(seq)) return String.fromCharCode(parseInt(seq, 8));
    if (seq === 'n') return '\n';
    if (seq === 'r') return '\r';
    if (seq === 't') return '\t';
    if (seq === 'b') return '\b';
    if (seq === 'f') return '\f';
    return seq;
  });
}

function scanAvInPdfRaw(raw) {
  let code = scanAvInString(raw);
  if (code) return code;

  const literalRe = /\(([^()\\]*(?:\\.[^()\\]*)*)\)/g;
  let m;
  while ((m = literalRe.exec(raw)) !== null) {
    code = scanAvInString(decodePdfLiteral(m[1]));
    if (code) return code;
  }

  const hexRe = /<([0-9A-Fa-f\s]+)>/g;
  while ((m = hexRe.exec(raw)) !== null) {
    const hex = m[1].replace(/\s/g, '');
    if (hex.length < 26 || hex.length % 2) continue;
    let decoded = '';
    for (let i = 0; i < hex.length; i += 2) {
      decoded += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16));
    }
    code = scanAvInString(decoded);
    if (code) return code;
  }
  return null;
}

async function inflatePdfChunk(bytes) {
  for (const format of ['deflate', 'deflate-raw']) {
    try {
      const buf = await new Response(
        new Blob([bytes]).stream().pipeThrough(new DecompressionStream(format))
      ).arrayBuffer();
      return new Uint8Array(buf);
    } catch {
      /* try next format */
    }
  }
  return null;
}

async function scanAvInFlateStreams(raw) {
  const streamRe = /stream\r?\n/g;
  let match;
  while ((match = streamRe.exec(raw)) !== null) {
    const ctx = raw.slice(Math.max(0, match.index - 400), match.index);
    if (!/\/FlateDecode|\/Fl[^a-zA-Z]/i.test(ctx)) continue;
    const dataStart = match.index + match[0].length;
    const endIdx = raw.indexOf('endstream', dataStart);
    if (endIdx < 0) continue;
    const chunk = raw.slice(dataStart, endIdx).replace(/\r?\n$/, '');
    const bytes = Uint8Array.from(chunk, (c) => c.charCodeAt(0) & 0xff);
    const inflated = await inflatePdfChunk(bytes);
    if (!inflated?.length) continue;
    let code = scanAvInBytes(inflated);
    if (code) return code;
    code = scanAvInPdfRaw(String.fromCharCode.apply(null, inflated.subarray(0, Math.min(inflated.length, 500000))));
    if (code) return code;
  }
  return null;
}

async function extractAvFromPdfBase64(b64) {
  if (!b64) return null;
  try {
    const raw = atob(String(b64));
    const bytes = Uint8Array.from(raw, (c) => c.charCodeAt(0) & 0xff);
    let code = scanAvInBytes(bytes);
    if (code) return code;
    code = scanAvInPdfRaw(raw);
    if (code) return code;
    return await scanAvInFlateStreams(raw);
  } catch {
    return null;
  }
}

async function fetchCorreiosLabelSync(token, prePostagemId) {
  const res = await fetch('https://api.correios.com.br/prepostagem/v1/prepostagens/rotulo', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      idsPrePostagem: [prePostagemId],
      tipoRotulo: 'P',
      formatoRotulo: 'ET'
    })
  });
  const bodyText = await res.text().catch(() => '');
  if (!res.ok) {
    throw new Error(extractCorreiosApiError(res, bodyText) || `Rótulo sync falhou (${res.status})`);
  }
  let data;
  try {
    data = bodyText ? JSON.parse(bodyText) : {};
  } catch {
    throw new Error('Resposta inválida do rótulo sync');
  }
  const parsed = parseCorreiosLabelDownload(data);
  const trackingCode = parsed.trackingCode
    || (parsed.pdfBase64 ? await extractAvFromPdfBase64(parsed.pdfBase64) : null);
  return { pdfBase64: parsed.pdfBase64, trackingCode };
}

async function fetchCorreiosAvFromLabelMeta(token, prePostagemId) {
  const idRecibo = await requestCorreiosLabelReceipt(token, prePostagemId);
  if (!idRecibo) return null;
  const result = await pollCorreiosLabelDownload(token, idRecibo, {
    requirePdf: false,
    maxAttempts: 10,
    firstDelayMs: 400,
    nextDelayMs: 1000
  });
  return result?.trackingCode || null;
}

async function syncCorreiosTrackingCodeFromPrePostagem(token, order, env, opts = {}) {
  if (order.correiosTrackingCode) return order.correiosTrackingCode;
  const id = String(order.correiosPrePostagemId || '').trim();
  if (!id) return null;
  const data = await fetchCorreiosPrePostagemById(token, id);
  let code = extractCorreiosAvCode(data);
  if (!code) {
    try {
      code = await fetchCorreiosAvFromLabelMeta(token, id);
    } catch (err) {
      console.warn('Correios AV label sync:', order.orderId, err.message);
    }
  }
  if (!code && opts.aggressive) {
    try {
      const label = await fetchCorreiosLabelSync(token, id);
      code = label.trackingCode || (label.pdfBase64 ? await extractAvFromPdfBase64(label.pdfBase64) : null);
    } catch (err) {
      console.warn('Correios AV sync label:', order.orderId, err.message);
    }
  }
  if (!code && opts.aggressive) {
    try {
      const label = await fetchCorreiosLabelPdf(token, id, correiosLabelTipoOpts(order));
      code = label.trackingCode || await extractAvFromPdfBase64(label.pdfBase64);
    } catch (err) {
      console.warn('Correios AV pdf sync:', order.orderId, err.message);
    }
  }
  if (!code) return null;
  const previousCode = order.correiosTrackingCode;
  order.correiosTrackingCode = code;
  await saveOrder(env, order);
  if (env) {
    try {
      await notifyTrackingIfNew(env, null, order, previousCode);
    } catch (err) {
      console.warn('Tracking email after AV sync:', order.orderId, err.message);
    }
  }
  return code;
}

async function ensureCorreiosPrePostagemForOrder(env, order, config) {
  if (orderLooksInternationalDestination(order) || isCorreiosIntlOrder(order)) {
    const hydrated = hydrateIntlOrderFields(order);
    if (hydrated.changed) await saveOrder(env, order);
  }
  if (!isCorreiosLabelOrder(order)) {
    return { skipped: true, reason: 'not_correios' };
  }
  if (isCorreiosBrOrder(order)) {
    try {
      await ensureCorreiosFreteEstimate(env, order, config);
    } catch (err) {
      console.warn('Correios frete estimate:', order.orderId, err.message);
    }
  }
  if (order.correiosPrePostagemId) {
    if (!order.correiosTrackingCode) {
      try {
        const token = await getCorreiosToken(env);
        if (token) await syncCorreiosTrackingCodeFromPrePostagem(token, order, env);
      } catch (err) {
        console.warn('Correios AV sync:', order.orderId, err.message);
      }
    }
    return {
      ok: true,
      alreadyExists: true,
      prePostagemId: order.correiosPrePostagemId,
      trackingCode: order.correiosTrackingCode || null,
      correiosFreteEstimado: order.correiosFreteEstimado ?? null
    };
  }
  const token = await getCorreiosToken(env);
  if (!token) throw new Error('Correios não configurado no Worker');

  if (isCorreiosIntlOrder(order)) {
    const code = await resolveIntlExportServiceCode(order, config);
    if (String(order.shippingServiceCode || '').trim() !== code) {
      order.shippingServiceCode = code;
      await saveOrder(env, order);
    }
  }

  const previousCode = order.correiosTrackingCode;
  const created = await createCorreiosPrePostagem(token, order, config, env);
  order.correiosPrePostagemId = created.id;
  if (created.codigoObjeto) order.correiosTrackingCode = created.codigoObjeto;
  if (!order.correiosTrackingCode) {
    await syncCorreiosTrackingCodeFromPrePostagem(token, order, env);
  }
  order.correiosPrePostagemAt = new Date().toISOString();
  order.correiosPrePostagemError = null;
  order.correiosPrePostagemScope = isCorreiosIntlOrder(order) ? 'intl' : 'br';
  await saveOrder(env, order);
  if (order.correiosTrackingCode) {
    try {
      await notifyTrackingIfNew(env, config, order, previousCode);
    } catch (err) {
      console.warn('Tracking email after pre-postagem:', order.orderId, err.message);
    }
  }
  return {
    ok: true,
    prePostagemId: order.correiosPrePostagemId,
    trackingCode: order.correiosTrackingCode || null,
    correiosFreteEstimado: order.correiosFreteEstimado ?? null
  };
}

async function cancelCorreiosPrePostagem(env, order) {
  if (!isCorreiosLabelOrder(order)) return { skipped: true, reason: 'not_correios' };
  const prePostagemId = String(order.correiosPrePostagemId || '').trim();
  const trackingCode = String(order.correiosTrackingCode || '').trim().toUpperCase();
  if (!prePostagemId && !trackingCode) return { skipped: true, reason: 'no_prepostagem' };

  const token = await getCorreiosToken(env);
  if (!token) return { ok: false, error: 'Correios não configurado' };

  const tryDelete = async (url) => {
    const res = await fetch(url, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' }
    });
    const bodyText = await res.text().catch(() => '');
    if (res.ok || res.status === 404) {
      return {
        ok: true,
        detail: res.status === 404 ? 'Pré-postagem já cancelada ou inexistente' : 'Pré-postagem cancelada nos Correios'
      };
    }
    return {
      ok: false,
      detail: extractCorreiosApiError(res, bodyText) || bodyText.slice(0, 160) || `HTTP ${res.status}`
    };
  };

  if (prePostagemId) {
    const byId = await tryDelete(
      `https://api.correios.com.br/prepostagem/v1/prepostagens/${encodeURIComponent(prePostagemId)}`
    );
    if (byId.ok) return { ...byId, trackingCode: trackingCode || null };
    if (!trackingCode) return byId;
  }

  const byCode = await tryDelete(
    `https://api.correios.com.br/prepostagem/v1/prepostagens/objeto/${encodeURIComponent(trackingCode)}`
  );
  return { ...byCode, trackingCode };
}

async function createCorreiosPrePostagem(token, order, config, env) {
  const basePayload = buildPrePostagemPayload(order, config, env);
  const intl = isCorreiosIntlOrder(order);
  const modalities = intl
    ? [basePayload.modalidadePagamento || '2', '1', '2'].filter((v, i, a) => a.indexOf(v) === i)
    : [basePayload.modalidadePagamento || '1'];

  // Variantes de CEP: postal real → vazio (evita PRZ-101 em intl) → só dígitos
  const cepVariants = [];
  const destCep = basePayload?.destinatario?.endereco?.cep;
  if (intl) {
    cepVariants.push(String(destCep || ''));
    if (destCep) cepVariants.push('');
    const digits = onlyDigits(destCep || '');
    if (digits && digits !== destCep) cepVariants.push(digits);
  } else {
    cepVariants.push(String(destCep || ''));
  }

  let lastDetail = '';
  for (const modalidade of modalities) {
    for (const cep of cepVariants) {
      const body = JSON.parse(JSON.stringify(basePayload));
      body.modalidadePagamento = String(modalidade);
      if (body.destinatario?.endereco) {
        body.destinatario.endereco.cep = cep;
        if (intl && body.destinatario.endereco.pais) {
          body.destinatario.endereco.codigoPais = body.destinatario.endereco.pais;
        }
      }
      const res = await fetch('https://api.correios.com.br/prepostagem/v1/prepostagens', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + token,
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      const bodyText = await res.text().catch(() => '');
      if (!res.ok) {
        lastDetail = extractCorreiosApiError(res, bodyText) || bodyText.slice(0, 280) || `HTTP ${res.status}`;
        console.warn('Correios prepostagem fail:', order.orderId, modalidade, 'cep=' + JSON.stringify(cep), lastDetail);
        continue;
      }
      let data;
      try {
        data = bodyText ? JSON.parse(bodyText) : {};
      } catch {
        throw new Error('Resposta inválida ao criar pré-postagem');
      }
      const id = data.id || data.idPrePostagem;
      if (!id) throw new Error('Pré-postagem criada sem ID');
      return {
        id,
        codigoObjeto: extractCorreiosAvCode(data),
        modalidadePagamento: String(modalidade),
        cepUsado: cep
      };
    }
  }
  throw new Error(lastDetail || 'Falha ao criar pré-postagem Correios');
}

async function sleepMs(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function correiosLabelTipoOpts(order) {
  if (!isCorreiosIntlOrder(order)) return { tipoRotulo: 'P', formatoRotulo: 'ET' };
  // CI = Carta Internacional, EI = Encomenda Internacional (API rótulo)
  return {
    tipoRotulo: isIntlDocumentShipment(order) ? 'CI' : 'EI',
    formatoRotulo: 'ET'
  };
}

async function fetchCorreiosLabelPdf(token, prePostagemId, opts = {}) {
  const idRecibo = await requestCorreiosLabelReceipt(token, prePostagemId, opts);
  if (!idRecibo) throw new Error('Recibo do rótulo não retornado');
  const result = await pollCorreiosLabelDownload(token, idRecibo, { requirePdf: true });
  if (!result?.pdfBase64) throw new Error('Tempo esgotado aguardando PDF do rótulo Correios');
  return result;
}

async function quoteCorreiosService(env, config, destCep, method, opts = {}) {
  const ship = config.shipping || DEFAULT_CONFIG.shipping;
  const origin = onlyDigits(ship.originCep);
  const dest = onlyDigits(destCep);
  if (dest.length !== 8) return null;
  const weightGrams = shippingWeightGrams(config, opts.weightGrams);
  const declaredValue = Number(opts.declaredValue) || config.product?.price || 62.9;
  const serviceCode = String(method.correiosCode || ship.serviceCode || '').trim();
  if (!serviceCode) return null;

  const token = await getCorreiosToken(env);
  if (!token) return null;

  let data = await fetchCorreiosPriceGet(token, serviceCode, origin, dest, ship, weightGrams, declaredValue);
  let price = parseCorreiosPrice(data);
  if (!price) {
    data = await fetchCorreiosPricePost(token, serviceCode, origin, dest, ship, weightGrams, declaredValue);
    price = parseCorreiosPrice(data);
  }
  if (!price) return null;

  let days = parseCorreiosDays(data);
  if (!days || days === 12) {
    const prazo = await fetchCorreiosPrazo(token, serviceCode, origin, dest);
    days = parseCorreiosDays(prazo, days);
  }

  const row = Array.isArray(data) ? data[0] : data;
  return {
    id: method.id || serviceCode,
    methodId: method.id || serviceCode,
    serviceCode,
    service: method.label || row?.nmServico || ship.serviceName || 'Correios',
    price,
    days,
    source: 'correios',
    weightGrams
  };
}

function superfreteConfigured(env) {
  return !!(env.SUPERFRETE_TOKEN || '').trim();
}

function superfreteBaseUrl(env) {
  return String(env.SUPERFRETE_SANDBOX || '').toLowerCase() === 'true'
    ? 'https://sandbox.superfrete.com'
    : 'https://api.superfrete.com';
}

function superfreteUserAgent(env) {
  return (env.SUPERFRETE_USER_AGENT || 'SensorTattooFix (contato@sensortattoofix.com.br)').trim();
}

const SUPERFRETE_SERVICE_IDS = new Set([1, 2, 3, 17, 31, 33]);

function asSuperfreteServiceId(value) {
  const n = Number(value);
  return SUPERFRETE_SERVICE_IDS.has(n) ? n : null;
}

function superfreteServiceId(method) {
  const n = asSuperfreteServiceId(method?.superfreteService ?? method?.correiosCode);
  if (n) return n;
  const id = String(method?.id || '').toLowerCase();
  if (id.includes('sedex')) return 2;
  if (id.includes('pac')) return 1;
  if (id.includes('mini')) return 17;
  if (id.includes('jadlog')) return 3;
  if (id.includes('loggi')) return 31;
  if (id.includes('jt') || id.includes('j&t')) return 33;
  const label = String(method?.label || '').toLowerCase();
  if (label.includes('sedex')) return 2;
  if (/\bpac\b/.test(label)) return 1;
  if (label.includes('mini')) return 17;
  return null;
}

/** Só casa superfreteService ou methodId — nunca “primeiro SF” por shippingProvider. */
function findSuperfreteMethod(config, body) {
  const methods = getEnabledShippingMethods(config, 'BR').filter(isSuperfreteMethod);
  const wantedSid = asSuperfreteServiceId(body?.superfreteService);
  if (wantedSid) {
    const hit = methods.find((m) => superfreteServiceId(m) === wantedSid);
    if (hit) return hit;
  }
  const methodId = String(body?.shippingMethodId || '').trim();
  if (methodId) {
    const hit = methods.find((m) => m.id === methodId);
    if (hit) return hit;
  }
  return null;
}

/** Resolve SF service id from the paid order — confia no que foi salvo no checkout, não só no rótulo. */
function resolveSuperfreteServiceFromLabel(order, config) {
  const methods = config?.shippingMethods?.length ? config.shippingMethods : DEFAULT_SHIPPING_METHODS;
  const method = methods.find((m) => m.id === order?.shippingMethodId);
  const fromMethod = superfreteServiceId(method);
  if (fromMethod) return fromMethod;

  const hay = `${order?.shippingService || ''} ${order?.shippingMethodId || ''}`.toLowerCase();
  if (hay.includes('sedex')) return 2;
  if (/\bpac\b/.test(hay)) return 1;
  if (hay.includes('mini')) return 17;
  if (hay.includes('jadlog')) return 3;
  if (hay.includes('loggi')) return 31;
  if (/\bj\s*&\s*t\b|\bjt\b/.test(hay)) return 33;
  return null;
}

/** Resolve SF service id — frete pago manda (R$ 21,16 = PAC, não SEDEX ~R$ 33). */
async function resolveSuperfreteServiceForOrder(env, config, order) {
  const paidFrete = Number(order?.frete);
  const cep = onlyDigits(order?.cep || '');

  if (Number.isFinite(paidFrete) && paidFrete > 0 && cep.length === 8 && superfreteConfigured(env)) {
    try {
      const quotes = await quoteSuperfreteOptions(env, config, cep, {
        weightGrams: shippingWeightGrams(config)
      });
      let bestSid = null;
      let bestDiff = Infinity;
      for (const q of quotes) {
        const sid = asSuperfreteServiceId(q.superfreteService);
        if (!sid) continue;
        const diff = Math.abs(Number(q.price) - paidFrete);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestSid = sid;
        }
      }
      if (bestSid != null && bestDiff <= 1.5) {
        const stored = asSuperfreteServiceId(order?.superfreteService);
        if (stored && stored !== bestSid) {
          console.warn('Super Frete: serviço pelo frete pago', order?.orderId, {
            stored,
            bestSid,
            paidFrete,
            bestDiff
          });
        }
        return bestSid;
      }
    } catch (err) {
      console.warn('Super Frete service from frete quote:', order?.orderId, err.message);
    }
  }

  if (Number.isFinite(paidFrete) && paidFrete > 0) {
    if (paidFrete <= 27) return 1;
    if (paidFrete >= 29) return 2;
  }

  const stored = asSuperfreteServiceId(order?.superfreteService);
  if (stored) return stored;

  const fromCode = asSuperfreteServiceId(order?.shippingServiceCode);
  if (fromCode) return fromCode;

  const hay = String(order?.shippingService || '').toLowerCase();
  if (hay.includes('sedex')) return 2;
  if (/\bpac\b/.test(hay)) return 1;
  if (hay.includes('mini')) return 17;
  return null;
}

function superfreteServiceLabel(sid) {
  const n = Number(sid);
  const map = { 1: 'PAC', 2: 'SEDEX', 17: 'Mini Envios', 3: 'Jadlog', 31: 'Loggi', 33: 'J&T' };
  return map[n] || null;
}

/** Nome limpo para o cliente (sem “Super Frete”). */
function superfreteCustomerLabel(sid, row, method) {
  const bySid = { 1: 'PAC', 2: 'SEDEX', 17: 'Mini Envios', 3: 'Jadlog', 31: 'Loggi', 33: 'J&T' };
  if (bySid[sid]) return bySid[sid];
  const fromMethod = String(method?.label || '').replace(/\s*\(?\s*Super\s*Frete\s*\)?\s*/gi, '').trim();
  if (fromMethod) return fromMethod;
  let name = String(row?.name || '').trim();
  if (/^jadlog/i.test(name)) return 'Jadlog';
  if (/^loggi/i.test(name)) return 'Loggi';
  return name || 'Frete';
}

function shippingOptionDedupeKey(opt) {
  if (!opt) return 'unknown';
  if (opt.source === 'uber' || opt.source === 'motoboy') {
    return `${opt.source}:${opt.methodId || opt.id}`;
  }
  const sid = Number(opt.superfreteService || 0);
  const code = String(opt.serviceCode || '').trim();
  const label = String(opt.service || '').toLowerCase();
  if (sid === 17 || code === '04227' || /mini\s*envios/.test(label)) return 'family:mini';
  if (sid === 1 || /^pac\b/.test(label) || label.includes(' pac')) return 'family:pac';
  if (sid === 2 || /sedex/.test(label)) return 'family:sedex';
  if (sid === 3 || /jadlog/.test(label)) return 'family:jadlog';
  if (sid === 31 || /loggi/.test(label)) return 'family:loggi';
  if (sid === 33 || /j\s*&\s*t|j&t|\bjt\b/.test(label)) return 'family:jt';
  return `id:${opt.methodId || opt.id || code || label}`;
}

/** Uma opção por família (PAC/Mini/…) — fica a mais barata (Correios ou Super Frete). */
function dedupeShippingOptionsCheapest(options) {
  const best = new Map();
  for (const opt of options || []) {
    const key = shippingOptionDedupeKey(opt);
    const prev = best.get(key);
    if (!prev || Number(opt.price) < Number(prev.price)) best.set(key, opt);
  }
  return [...best.values()].sort((a, b) => a.price - b.price);
}

function superfretePackageFromConfig(config, weightGrams) {
  const ship = config.shipping || DEFAULT_CONFIG.shipping;
  const grams = shippingWeightGrams(config, weightGrams);
  return {
    height: Math.max(2, Number(ship.heightCm) || 2),
    width: Math.max(11, Number(ship.widthCm) || 12),
    length: Math.max(16, Number(ship.lengthCm) || 16),
    weight: Math.max(0.001, grams / 1000)
  };
}

function personNameForSuperfrete(name, fallback = 'Loja SensorTattooFix') {
  const n = String(name || '').trim().replace(/\s+/g, ' ');
  if (!n) return fallback;
  if (!/\s/.test(n)) return `Loja ${n}`.slice(0, 50);
  return n.slice(0, 50);
}

async function superfreteFetch(env, path, opts = {}) {
  const token = (env.SUPERFRETE_TOKEN || '').trim();
  if (!token) throw new Error('SUPERFRETE_TOKEN não configurado');
  const res = await fetch(`${superfreteBaseUrl(env)}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      'User-Agent': superfreteUserAgent(env),
      accept: 'application/json',
      'content-type': 'application/json',
      ...(opts.headers || {})
    }
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const msg = data?.message || data?.error || data?.raw || text || res.statusText;
    throw new Error(`Super Frete ${res.status}: ${typeof msg === 'string' ? msg : JSON.stringify(msg)}`);
  }
  return data;
}

async function quoteSuperfreteOptions(env, config, destCep, opts = {}) {
  const methods = getEnabledShippingMethods(config, 'BR').filter(isSuperfreteMethod);
  if (!methods.length || !superfreteConfigured(env)) return [];

  const origin = onlyDigits(config.shipping?.originCep || DEFAULT_CONFIG.shipping.originCep);
  const dest = onlyDigits(destCep);
  if (dest.length !== 8) return [];

  const serviceIds = [...new Set(methods.map(superfreteServiceId).filter(Boolean))];
  if (!serviceIds.length) return [];

  const pkg = superfretePackageFromConfig(config, opts.weightGrams);
  const weightGrams = shippingWeightGrams(config, opts.weightGrams);
  // Não enviar seguro na cotação — o app Super Frete também cotiza sem valor declarado;
  // incluir `valor` do produto encarecia PAC/Mini/SEDEX vs o app.

  try {
    const rows = await superfreteFetch(env, '/api/v0/calculator', {
      method: 'POST',
      body: JSON.stringify({
        from: { postal_code: origin },
        to: { postal_code: dest },
        services: serviceIds.join(','),
        options: {
          own_hand: false,
          receipt: false,
          insurance_value: 0,
          use_insurance_value: false
        },
        package: pkg
      })
    });
    const list = Array.isArray(rows) ? rows : [];
    const byService = new Map();
    for (const row of list) {
      if (row?.has_error) continue;
      const id = Number(row.id);
      const price = Number(row.price);
      if (!id || !(price > 0)) continue;
      byService.set(id, row);
    }

    const options = [];
    for (const method of methods) {
      const sid = superfreteServiceId(method);
      const row = byService.get(sid);
      if (!row) continue;
      const company = row.company?.name || '';
      options.push({
        id: method.id,
        methodId: method.id,
        serviceCode: String(sid),
        service: superfreteCustomerLabel(sid, row, method),
        price: Number(row.price),
        days: Number(row.delivery_time) || Number(row.delivery_range?.max) || null,
        source: 'superfrete',
        provider: 'superfrete',
        superfreteService: sid,
        superfretePackage: pkg,
        weightGrams,
        company
      });
    }
    return options.sort((a, b) => a.price - b.price);
  } catch (err) {
    console.warn('Super Frete quote:', err.message);
    return [];
  }
}

function humanizeSuperfreteError(raw) {
  const msg = String(raw || '').trim();
  const low = msg.toLowerCase();
  const panel = 'https://web.superfrete.com/#/minhas-etiquetas';
  const wallet = 'https://web.superfrete.com/#/carteira';
  if (!msg) {
    return `Não foi possível gerar/pagar a etiqueta no Super Frete. Painel: ${panel}`;
  }
  // A API de checkout automático só debita SALDO da carteira — cartão cadastrado no painel
  // não entra nesse endpoint. Mensagem antiga ("cadastre um cartão") era enganosa.
  if (/saldo|balance|insufficient|crédito|credito|funds|carteira|wallet|payment.?method|cart[aã]o|card|cobran|pagamento|payment.?required|402|unpaid|não.?paga|nao.?paga/i.test(low)) {
    return `Super Frete não pagou a etiqueta automaticamente: a API só usa SALDO da carteira `
      + `(cartão cadastrado no painel NÃO entra no checkout automático). `
      + `Recarregue a carteira em ${wallet} e clique Etiqueta de novo. Painel: ${panel}. Detalhe: ${msg}`;
  }
  if (/token|unauthorized|401|403|forbidden|invalid.?token/i.test(low)) {
    return `Token Super Frete inválido ou expirado. Gere um novo em Integrações no painel Super Frete e atualize o secret SUPERFRETE_TOKEN.`;
  }
  if (/sandbox/i.test(low)) {
    return `Super Frete em modo sandbox. Confira SUPERFRETE_SANDBOX e o token de produção. Detalhe: ${msg}`;
  }
  return `Super Frete: ${msg}. Painel: ${panel}`;
}

function superfreteAutoCheckoutEnabled(env) {
  const raw = String(env.SUPERFRETE_AUTO_CHECKOUT ?? 'true').trim().toLowerCase();
  return raw !== 'false' && raw !== '0' && raw !== 'no' && raw !== 'off';
}

function isSuperfreteCartTerminalFailure(order) {
  const st = String(order?.superfreteCartStatus || '').toLowerCase();
  if (/cancel|reject|fail|expir|void|refund/.test(st)) return true;
  if (order?.superfreteCheckoutError) return true;
  return false;
}

/** Carrinho SF com preço/serviço diferente do frete pago no pedido — descarta e recria. */
async function superfreteCartMismatchPaidFrete(env, config, order) {
  const paidFrete = Number(order?.frete);
  if (!(Number.isFinite(paidFrete) && paidFrete > 0)) return false;
  const cartPrice = Number(order?.superfreteCartPrice);
  if (Number.isFinite(cartPrice) && cartPrice > 0 && Math.abs(cartPrice - paidFrete) > 1.5) {
    return true;
  }
  const expected = await resolveSuperfreteServiceForOrder(env, config, order);
  const cartSvc = asSuperfreteServiceId(order?.superfreteService);
  return !!(expected && cartSvc && expected !== cartSvc);
}

function clearSuperfreteCartFields(order, { clearTracking = false } = {}) {
  order.superfreteCartId = null;
  order.superfreteCartStatus = null;
  order.superfreteCartPrice = null;
  order.superfreteCartAt = null;
  order.superfreteCartError = null;
  order.superfreteCheckoutError = null;
  order.superfreteCheckout = null;
  if (clearTracking) {
    const sfTrack = String(order.superfreteTrackingCode || '').trim().toUpperCase();
    const av = String(order.correiosTrackingCode || '').trim().toUpperCase();
    order.superfreteTrackingCode = null;
    if (sfTrack && av && sfTrack === av) {
      order.correiosTrackingCode = null;
      if (/pré-?postado|pre-?postado/i.test(String(order.correiosTrackingStatus || ''))) {
        order.correiosTrackingStatus = null;
      }
    }
  }
}

/** Consulta status real no Super Frete (cancelamento no painel não atualiza o pedido sozinho). */
async function refreshSuperfreteCartFromApi(env, order) {
  const cartId = order?.superfreteCartId;
  if (!cartId || !superfreteConfigured(env)) return null;
  try {
    const info = await superfreteFetch(env, `/api/v0/order/info/${encodeURIComponent(cartId)}`, { method: 'GET' });
    const st = String(info?.status || info?.order_status || '').toLowerCase();
    if (st) order.superfreteCartStatus = st;
    if (info?.price != null && Number.isFinite(Number(info.price))) {
      order.superfreteCartPrice = Number(info.price);
    }
    return info;
  } catch (err) {
    const raw = String(err.message || '');
    if (/404|not.?found|não.?encontr|nao.?encontr|cancel|expir|gone/i.test(raw)) {
      order.superfreteCartStatus = 'canceled';
    }
    console.warn('Super Frete order/info:', order.orderId, raw);
    return null;
  }
}

function extractSuperfreteTracking(payload) {
  if (!payload || typeof payload !== 'object') return null;
  const candidates = [
    payload.tracking,
    payload.self_tracking,
    payload.tracking_code,
    payload.purchase?.orders?.[0]?.tracking,
    payload.orders?.[0]?.tracking,
    Array.isArray(payload) ? payload[0]?.tracking : null
  ];
  for (const c of candidates) {
    const t = String(c || '').trim().toUpperCase();
    if (t && /^[A-Z]{2}\d{9}[A-Z]{2}$/.test(t)) return t;
    if (t && t.length >= 8) return t;
  }
  return null;
}

async function applySuperfreteTrackingToOrder(env, config, order, tracking) {
  const code = String(tracking || '').trim().toUpperCase();
  if (!code) return false;
  const previousCode = order.correiosTrackingCode;
  order.superfreteTrackingCode = code;
  if (!order.correiosTrackingCode) order.correiosTrackingCode = code;
  order.correiosTrackingStatus = order.correiosTrackingStatus || 'Pré-postado';
  order.correiosTrackingUpdatedAt = new Date().toISOString();
  await saveOrder(env, order);
  try {
    await notifyTrackingIfNew(env, config, order, previousCode);
  } catch (err) {
    console.warn('Tracking email after Super Frete sync:', order.orderId, err.message);
  }
  return true;
}

/** Busca rastreio em GET /api/v0/order/info/{id} (pode demorar alguns segundos após o checkout). */
async function syncSuperfreteTrackingForOrder(env, config, order) {
  const cartId = order.superfreteCartId;
  if (!cartId || !superfreteConfigured(env)) return null;
  const info = await superfreteFetch(env, `/api/v0/order/info/${encodeURIComponent(cartId)}`, { method: 'GET' });
  const st = String(info?.status || info?.order_status || '').toLowerCase();
  if (st) order.superfreteCartStatus = st;
  if (info?.price != null && Number.isFinite(Number(info.price))) {
    order.superfreteCartPrice = Number(info.price);
  }
  const tracking = extractSuperfreteTracking(info);
  if (tracking) {
    await applySuperfreteTrackingToOrder(env, config, order, tracking);
    return tracking;
  }
  await saveOrder(env, order);
  return null;
}

async function waitSuperfreteTracking(env, config, order, { attempts = 8, delayMs = 2000 } = {}) {
  for (let i = 0; i < attempts; i++) {
    try {
      const tracking = await syncSuperfreteTrackingForOrder(env, config, order);
      if (tracking) return tracking;
    } catch (err) {
      console.warn('Super Frete tracking poll:', order.orderId, err.message);
    }
    if (i < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return order.superfreteTrackingCode || order.correiosTrackingCode || null;
}

async function checkoutSuperfreteCart(env, config, order, cartId) {
  const paid = await superfreteFetch(env, '/api/v0/checkout', {
    method: 'POST',
    body: JSON.stringify({ orders: [cartId] })
  });
  order.superfreteCheckout = paid;
  order.superfreteCartStatus = 'released';
  order.superfreteCheckoutError = null;
  order.superfreteCartError = null;
  let tracking = extractSuperfreteTracking(paid);
  if (tracking) {
    await applySuperfreteTrackingToOrder(env, config, order, tracking);
  } else {
    await saveOrder(env, order);
    tracking = await waitSuperfreteTracking(env, config, order);
  }
  return paid;
}

async function createSuperfreteCartForOrder(env, config, order, opts = {}) {
  if (!isSuperfreteOrder(order) || !superfreteConfigured(env)) {
    return { skipped: true, reason: 'not_superfrete' };
  }
  if (isSelfTestOrder(order)) {
    order.superfreteSkipped = `Pedido de teste (${formatBRL(order.total)}) — etiqueta Super Frete não gerada (evita cobrança na sua carteira).`;
    await saveOrder(env, order);
    return { skipped: true, reason: 'self_test', message: order.superfreteSkipped };
  }

  const force = opts.force === true;
  const autoPay = superfreteAutoCheckoutEnabled(env);

  if (order.superfreteCartId && !force) {
    // Cancelou no painel SF? Nosso pedido ainda pode estar "released" — consulta a API.
    await refreshSuperfreteCartFromApi(env, order);
    await saveOrder(env, order);

    const st = String(order.superfreteCartStatus || '').toLowerCase();
    const mismatch = await superfreteCartMismatchPaidFrete(env, config, order);
    if (mismatch) {
      console.warn('Super Frete: carrinho diverge do frete pago', order?.orderId, {
        frete: order.frete,
        cartPrice: order.superfreteCartPrice,
        superfreteService: order.superfreteService
      });
    }
    if (isSuperfreteCartTerminalFailure(order) || mismatch) {
      clearSuperfreteCartFields(order, { clearTracking: true });
      await saveOrder(env, order);
    } else if (st === 'released') {
      // Checkout às vezes libera sem devolver o AV na hora — busca no order/info.
      if (!order.superfreteTrackingCode && !order.correiosTrackingCode) {
        // Liberação do AV no SF pode demorar; tenta ~20s aqui e o front continua tentando.
        await waitSuperfreteTracking(env, config, order, { attempts: 8, delayMs: 2500 });
      }
      return {
        ok: true,
        alreadyExists: true,
        id: order.superfreteCartId,
        status: 'released',
        trackingCode: order.superfreteTrackingCode || order.correiosTrackingCode || null
      };
    } else if (autoPay) {
      // Ainda pending: tenta pagar; se o carrinho morreu no Super Frete, limpa e recria.
      try {
        await checkoutSuperfreteCart(env, config, order, order.superfreteCartId);
        return { ok: true, alreadyExists: true, id: order.superfreteCartId, status: 'released', paid: true };
      } catch (err) {
        const raw = String(err.message || '');
        if (/cancel|404|not.?found|não.?encontr|nao.?encontr|invalid.?order|expired|gone/i.test(raw)) {
          clearSuperfreteCartFields(order, { clearTracking: true });
          await saveOrder(env, order);
        } else {
          order.superfreteCheckoutError = humanizeSuperfreteError(raw);
          await saveOrder(env, order);
          return {
            ok: true,
            alreadyExists: true,
            id: order.superfreteCartId,
            status: order.superfreteCartStatus,
            checkoutError: order.superfreteCheckoutError
          };
        }
      }
    } else if (order.superfreteCartId) {
      return { ok: true, alreadyExists: true, id: order.superfreteCartId, status: order.superfreteCartStatus };
    }
  } else if (order.superfreteCartId && force) {
    clearSuperfreteCartFields(order, { clearTracking: true });
    await saveOrder(env, order);
  }

  const sender = config.shipping?.sender || DEFAULT_CONFIG.shipping.sender;
  const service = await resolveSuperfreteServiceForOrder(env, config, order);
  if (!service) {
    const friendly = `Não foi possível identificar o serviço Super Frete do pedido `
      + `(${order.shippingService || order.shippingMethodId || 'sem frete'}). `
      + `Abra o pedido e confira se o frete é PAC/SEDEX/Mini/Jadlog/Loggi.`;
    order.superfreteCartError = friendly;
    await saveOrder(env, order);
    throw new Error(friendly);
  }
  order.superfreteService = service;
  order.shippingServiceCode = String(service);
  const svcLabel = superfreteServiceLabel(service);
  if (svcLabel) order.shippingService = svcLabel;
  const sfMethods = getEnabledShippingMethods(config, 'BR').filter(isSuperfreteMethod);
  const methodForSvc = sfMethods.find((m) => superfreteServiceId(m) === service);
  if (methodForSvc?.id) order.shippingMethodId = methodForSvc.id;
  const pkg = order.superfretePackage || superfretePackageFromConfig(config);
  const products = (order.items || []).map((i) => ({
    name: String(i.name || 'Produto').slice(0, 80),
    quantity: String(i.qty || 1),
    unitary_value: String(Number(i.price) || Number(order.valorProdutoOriginal || order.valorProduto) || 1)
  }));
  if (!products.length) {
    products.push({
      name: String(order.produto || 'SensorTattooFix').slice(0, 80),
      quantity: '1',
      unitary_value: String(Number(order.valorProdutoOriginal || order.valorProduto) || 1)
    });
  }

  const phoneDigits = onlyDigits(order.telefone).slice(-11);
  const storeBase = String(config.storeUrlBr || config.storeUrl || 'https://www.sensortattoofix.com.br').replace(/\/$/, '');
  const payload = {
    from: {
      name: personNameForSuperfrete(sender.company || sender.brand),
      address: String(sender.rua || '').slice(0, 50),
      complement: String(sender.complemento || '').slice(0, 20),
      number: String(sender.numero || ''),
      district: String(sender.bairro || 'NA').slice(0, 60),
      city: String(sender.cidade || '').slice(0, 50),
      state_abbr: String(sender.uf || 'SP').toUpperCase(),
      postal_code: onlyDigits(config.shipping?.originCep || ''),
      document: onlyDigits(sender.cnpj || '')
    },
    to: {
      name: personNameForSuperfrete(order.nome, 'Cliente SensorTattooFix'),
      address: String(order.rua || '').slice(0, 50),
      complement: String(order.complemento || '').slice(0, 20),
      number: String(order.numero || ''),
      district: String(order.bairro || 'NA').slice(0, 50),
      city: String(order.cidade || '').slice(0, 50),
      state_abbr: String(order.uf || '').toUpperCase(),
      postal_code: onlyDigits(order.cep),
      email: order.email || null,
      document: onlyDigits(order.cpf),
      ...(phoneDigits.length === 11 ? { phone: phoneDigits } : {})
    },
    service,
    products,
    volumes: {
      height: Number(pkg.height),
      width: Number(pkg.width),
      length: Number(pkg.length),
      weight: Number(pkg.weight)
    },
    options: {
      non_commercial: true,
      // Igual à cotação do checkout (sem seguro) — evita SEDEX ~R$33 quando o cliente pagou ~R$21.
      insurance_value: 0,
      use_insurance_value: false,
      tags: [{ tag: order.orderId, url: `${storeBase}/pedidos.html` }]
    },
    platform: 'SensorTattooFix',
    tag: order.orderId
  };

  let data;
  try {
    data = await superfreteFetch(env, '/api/v0/cart', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  } catch (err) {
    const friendly = humanizeSuperfreteError(err.message);
    order.superfreteCartError = friendly;
    await saveOrder(env, order);
    throw new Error(friendly);
  }
  order.superfreteCartId = data.id;
  order.superfreteCartStatus = data.status || 'pending';
  order.superfreteCartPrice = data.price;
  order.superfreteCartAt = new Date().toISOString();
  order.superfreteCartError = null;
  order.superfreteCheckoutError = null;
  await saveOrder(env, order);

  if (autoPay && data.id) {
    try {
      await checkoutSuperfreteCart(env, config, order, data.id);
    } catch (err) {
      order.superfreteCheckoutError = humanizeSuperfreteError(err.message);
      await saveOrder(env, order);
    }
  }
  return { ok: true, id: data.id, status: order.superfreteCartStatus };
}

async function quoteCorreiosOptions(env, config, destCep, opts = {}) {
  const ship = config.shipping || DEFAULT_CONFIG.shipping;
  const origin = onlyDigits(ship.originCep);
  const dest = onlyDigits(destCep);
  if (dest.length !== 8) throw new Error('CEP inválido');

  const methods = getEnabledShippingMethods(config, 'BR').filter(
    (m) => !isUberMethod(m) && !isMotoboyMethod(m) && !isSuperfreteMethod(m)
  );
  const weightGrams = shippingWeightGrams(config, opts.weightGrams);
  const weightFactor = Math.min(2.5, Math.max(1, weightGrams / shippingWeightGrams(config)));
  const token = await getCorreiosToken(env);
  const options = [];
  const quotedIds = new Set();

  if (token && methods.length) {
    const quotes = await Promise.all(
      methods.map((method) => quoteCorreiosService(env, config, dest, method, opts))
    );
    quotes.filter(Boolean).forEach((q) => {
      options.push(q);
      quotedIds.add(q.methodId || q.id);
    });
  }

  for (const method of methods) {
    if (quotedIds.has(method.id)) continue;
    const est = estimateBRForMethod(origin, dest, method, weightFactor, config);
    options.push({
      id: method.id,
      methodId: method.id,
      serviceCode: method.correiosCode || ship.serviceCode || null,
      service: method.label || ship.serviceName || 'Correios',
      price: est.price,
      days: est.days,
      source: 'estimate',
      weightGrams,
      note: token
        ? `Estimativa por distância (CEP) — API Correios sem preço para ${method.label || method.correiosCode}.`
        : 'Estimativa por distância — configure CORREIOS_USER e CORREIOS_PASSWORD no Worker.'
    });
  }

  if (!options.length) {
    const est = estimateBRMax(config, weightGrams);
    const fallbackMethod = methods[0] || { id: 'estimate', label: ship.serviceName || 'Mini Envios' };
    options.push({
      id: fallbackMethod.id || 'estimate',
      methodId: fallbackMethod.id || 'estimate',
      serviceCode: fallbackMethod.correiosCode || ship.serviceCode || null,
      service: fallbackMethod.label || ship.serviceName || 'Mini Envios',
      price: est.price,
      days: est.days,
      source: 'estimate',
      weightGrams,
      note: token
        ? 'Estimativa máxima — API Correios sem preço válido para estes serviços.'
        : 'Estimativa máxima — configure CORREIOS_USER e CORREIOS_PASSWORD no Worker.'
    });
  }

  return options.sort((a, b) => a.price - b.price);
}

async function quoteCorreios(env, config, destCep, opts = {}) {
  const options = await quoteCorreiosOptions(env, config, destCep, opts);
  return options[0] || null;
}

function parseBRPrice(value) {
  if (value == null || value === '') return 0;
  if (typeof value === 'number') return value;
  return parseFloat(String(value).replace(/\./g, '').replace(',', '.')) || 0;
}

function cookieHeaderFrom(response) {
  const list = typeof response.headers.getSetCookie === 'function'
    ? response.headers.getSetCookie()
    : [];
  return list.map((c) => c.split(';')[0]).filter(Boolean).join('; ');
}

async function fetchExportSimulation(config, countryCode, opts = {}) {
  const ship = config.shipping || DEFAULT_CONFIG.shipping;
  const originCep = onlyDigits(ship.originCep);
  const country = String(countryCode || '').toUpperCase();
  const weightGrams = Math.max(1, Math.round(Number(opts.weightGrams) || shippingWeightGrams(config)));
  if (originCep.length !== 8 || !country) return null;

  try {
    const pageRes = await fetch('https://minhasexportacoes.correios.com.br/simulacao', {
      headers: { 'User-Agent': 'SensorTattooFix/1.0', Accept: 'text/html' }
    });
    if (!pageRes.ok) return null;

    const html = await pageRes.text();
    const csrf = html.match(/name="csrf-token"\s+content="([^"]+)"/i)?.[1];
    const cookies = cookieHeaderFrom(pageRes);
    if (!csrf) return null;

    const simTipo = String(opts.tipo || 'M').toUpperCase() === 'D' ? 'D' : 'M';
    const body = new URLSearchParams({
      tipo: simTipo,
      finalidade: 'V',
      cep_origem: originCep,
      pais_destino: country,
      peso: String(weightGrams)
    });

    const simRes = await fetch('https://minhasexportacoes.correios.com.br/simulacao/simular', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        'X-CSRF-TOKEN': csrf,
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': 'SensorTattooFix/1.0',
        ...(cookies ? { Cookie: cookies } : {})
      },
      body
    });
    const payload = await simRes.json().catch(() => null);
    if (!simRes.ok || !payload?.success || !Array.isArray(payload.data)) return null;

    const services = payload.data.filter((s) => s.precoFinal && !s.txErro);
    return services.length ? { services, country, weightGrams, simTipo } : null;
  } catch (err) {
    console.error('Exporta Fácil:', err.message);
    return null;
  }
}

function prettifyCorreiosServiceName(name) {
  const raw = String(name || '').trim();
  if (!raw) return raw;
  const known = {
    'DOCUMENTO INTERNACION STANDARD': 'Documento Internacional Standard',
    'DOCUMENTO INTERNACION EXPRESSO': 'Documento Internacional Expresso',
    'EXPORTA FACIL ECONOMICO': 'Exporta Fácil Econômico',
    'EXPORTA FACIL STANDARD': 'Exporta Fácil Standard',
    'EXPORTA FACIL EXPRESSO': 'Exporta Fácil Expresso'
  };
  const upper = raw.toUpperCase();
  if (known[upper]) return known[upper];
  return raw
    .replace(/\bINTERNACION\b/gi, 'Internacional')
    .replace(/\bEXPORTA FACIL\b/gi, 'Exporta Fácil')
    .replace(/\bECONOMICO\b/gi, 'Econômico');
}

function mapExportServiceToOption(service, config, country, weightGrams, method, simTipo = 'M') {
  const zones = config.internationalShipping || DEFAULT_CONFIG.internationalShipping;
  const zone = resolveIntlShippingZone(zones, country);
  const code = String(service.codigo);
  const price = parseBRPrice(service.precoFinal);
  if (price <= 0) return null;
  const isDocument = simTipo === 'D';
  const serviceName = prettifyCorreiosServiceName(
    service.nome || method?.label || (isDocument ? 'Documento internacional' : 'Internacional')
  );
  return {
    id: code,
    methodId: method?.id || `int-${code}`,
    serviceCode: code,
    service: serviceName,
    price,
    days: Number(service.prazoMedio || service.prazoMaximo || zone.days || 15),
    source: 'correios-export',
    shipmentType: isDocument ? 'documento' : 'encomenda',
    country,
    countryLabel: zone.label || country,
    weightGrams
  };
}

async function quoteCorreiosExportOptions(config, countryCode, opts = {}) {
  let methods = getEnabledShippingMethods(config, 'INT');
  if (opts.documentOnly) {
    methods = methods.filter((m) => resolveIntlSimTipos(m).includes('D'));
  }
  if (!methods.length) return [];

  const tiposNeeded = new Map();
  methods.forEach((method) => {
    resolveIntlSimTipos(method).forEach((tipo) => {
      if (!tiposNeeded.has(tipo)) tiposNeeded.set(tipo, []);
      tiposNeeded.get(tipo).push(method);
    });
  });

  const seenCodes = new Set();
  const options = [];

  for (const [simTipo, tipoMethods] of tiposNeeded) {
    const sim = await fetchExportSimulation(config, countryCode, { ...opts, tipo: simTipo });
    if (!sim) continue;

    tipoMethods.forEach((method) => {
      const codeFilter = String(method.correiosCode || '').trim();
      const includeAll = !codeFilter || codeFilter === '*';
      sim.services
        .filter((s) => includeAll || codeFilter === String(s.codigo))
        .forEach((s) => {
          const code = String(s.codigo);
          if (seenCodes.has(code)) return;
          seenCodes.add(code);
          const opt = mapExportServiceToOption(s, config, sim.country, sim.weightGrams, method, simTipo);
          if (opt) options.push(opt);
        });
    });
  }

  return options.sort((a, b) => a.price - b.price);
}

function intlZonePrices(zones) {
  return Object.entries(zones || {})
    .filter(([k]) => k !== 'OTHER' && k !== 'BR')
    .map(([, z]) => Number(z?.price))
    .filter((p) => Number.isFinite(p) && p > 0);
}

function intlZoneDays(zones) {
  return Object.entries(zones || {})
    .filter(([k]) => k !== 'OTHER' && k !== 'BR')
    .map(([, z]) => Number(z?.days))
    .filter((d) => Number.isFinite(d) && d > 0);
}

/** Meio-termo: (menor + maior) / 2 — fallback para país sem cotação / OTHER. */
function intlMidpointZonePrice(zones, fallback = 94.9) {
  const prices = intlZonePrices(zones);
  if (!prices.length) return fallback;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return Math.round(((min + max) / 2) * 100) / 100;
}

function intlMidpointZoneDays(zones, fallback = 18) {
  const days = intlZoneDays(zones);
  if (!days.length) return fallback;
  const min = Math.min(...days);
  const max = Math.max(...days);
  return Math.round((min + max) / 2);
}

function countryLabelPt(code) {
  const c = String(code || '').toUpperCase();
  try {
    return new Intl.DisplayNames(['pt-BR'], { type: 'region' }).of(c) || c;
  } catch {
    return c;
  }
}

/** ISO destinies for checkout — full list so the buyer picks their country (not a tiny curated table). */
const INTL_ISO_COUNTRY_CODES = (
  'AD,AE,AF,AG,AL,AM,AO,AR,AT,AU,AZ,BA,BB,BD,BE,BF,BG,BH,BI,BJ,BN,BO,BW,BY,BZ,CA,CD,CF,CG,CH,CI,CL,CM,CN,CO,CR,CU,CV,CY,CZ,'
  + 'DE,DJ,DK,DM,DO,DZ,EC,EE,EG,ER,ES,ET,FI,FJ,FM,FR,GA,GB,GD,GE,GH,GM,GN,GQ,GR,GT,GW,GY,HK,HN,HR,HT,HU,ID,IE,IL,IN,IQ,IR,IS,IT,'
  + 'JM,JO,JP,KE,KG,KH,KI,KM,KN,KP,KR,KW,KZ,LA,LB,LC,LI,LK,LR,LS,LT,LU,LV,LY,MA,MC,MD,ME,MG,MH,MK,ML,MM,MN,MO,MR,MT,MU,MV,MW,MX,MY,MZ,'
  + 'NA,NE,NG,NI,NL,NO,NP,NR,NZ,OM,PA,PE,PG,PH,PK,PL,PR,PT,PW,PY,QA,RO,RS,RU,RW,SA,SB,SC,SD,SE,SG,SI,SK,SL,SM,SN,SO,SR,SS,ST,SV,SY,SZ,'
  + 'TD,TG,TH,TJ,TL,TM,TN,TO,TR,TT,TV,TW,TZ,UA,UG,US,UY,UZ,VA,VC,VE,VN,VU,WS,YE,ZA,ZM,ZW'
).split(',');

function publicIntlCountriesList(zones) {
  const z = zones || {};
  const codes = new Set([...INTL_ISO_COUNTRY_CODES, ...Object.keys(z).filter((c) => c !== 'OTHER' && c !== 'BR')]);
  return [...codes]
    .sort((a, b) => countryLabelPt(a).localeCompare(countryLabelPt(b), 'pt-BR'))
    .map((code) => ({
      code,
      label: (z[code] && z[code].label) || countryLabelPt(code),
      hasZonePrice: !!(z[code] && Number(z[code].price) > 0)
    }));
}

function resolveIntlShippingZone(zones, countryCode) {
  const code = String(countryCode || '').toUpperCase();
  if (code && code !== 'OTHER' && zones?.[code]) return zones[code];
  const other = zones?.OTHER || { label: 'Outro país', price: 94.9, days: 18, currency: 'BRL' };
  return {
    ...other,
    label: (code && code !== 'OTHER') ? countryLabelPt(code) : other.label,
    price: intlMidpointZonePrice(zones, other.price),
    days: intlMidpointZoneDays(zones, other.days || 18)
  };
}

/** Garante que OTHER no KV/config use meio-termo (min+max)/2, nunca o teto antigo. */
function normalizeIntlOtherInZones(zones) {
  const z = { ...(zones || {}) };
  if (!z.OTHER) {
    z.OTHER = { label: 'Outro país', currency: 'BRL' };
  }
  const midPrice = intlMidpointZonePrice(z, 94.9);
  const midDays = intlMidpointZoneDays(z, 18);
  z.OTHER = {
    ...z.OTHER,
    label: z.OTHER.label || 'Outro país',
    price: midPrice,
    days: midDays,
    currency: z.OTHER.currency || 'BRL',
    lastSyncedSource: 'derived-midpoint'
  };
  return z;
}

function pickIntlFallbackQuote(options, config) {
  if (!options?.length) return null;
  const preferredCode = String((config.shipping || {}).intlServiceCode || '45128');
  return options.find((o) => o.serviceCode === preferredCode) || options[0];
}

/** Cotação mais barata via simulador Exporta Fácil (compat. admin). */
async function quoteCorreiosExport(config, countryCode, opts = {}) {
  const options = await quoteCorreiosExportOptions(config, countryCode, opts);
  if (!options.length) return null;
  return pickIntlFallbackQuote(options, config);
}

function intlZoneFromQuote(zone, pick) {
  return {
    ...zone,
    price: pick.price,
    days: pick.days,
    currency: 'BRL',
    lastSyncedAt: new Date().toISOString(),
    lastSyncedSource: pick.source || 'correios-export',
    lastSyncedService: pick.service || null
  };
}

/** Atualiza fallback de um país quando a API Exporta Fácil responde. */
async function updateIntlFallbackZone(env, countryCode, options) {
  const code = String(countryCode || '').toUpperCase();
  if (!code || code === 'BR' || code === 'OTHER') return null;

  const config = await getConfig(env);
  const pick = pickIntlFallbackQuote(options, config);
  if (!pick || pick.source !== 'correios-export') return null;
  const zones = config.internationalShipping || DEFAULT_CONFIG.internationalShipping;
  const prev = zones[code] || {
    label: countryLabelPt(code),
    currency: 'BRL',
    days: pick.days || 18
  };

  if (
    prev.price === pick.price
    && prev.days === pick.days
    && prev.lastSyncedSource === 'correios-export'
    && zones[code]
  ) {
    return config;
  }

  const internationalShipping = {
    ...zones,
    [code]: intlZoneFromQuote(prev, pick)
  };
  return saveConfig(env, { ...config, internationalShipping });
}

/** Sincroniza toda a tabela fallback internacional com o simulador Correios. */
async function syncAllIntlFallbackZones(env, config) {
  const zones = { ...(config.internationalShipping || DEFAULT_CONFIG.internationalShipping) };
  const weightGrams = shippingWeightGrams(config);
  const codes = Object.keys(zones).filter((c) => c !== 'OTHER' && c !== 'BR');
  const results = {};
  const internationalShipping = { ...zones };
  let updated = false;

  await Promise.all(codes.map(async (code) => {
    try {
      const options = await quoteCorreiosExportOptions(config, code, { weightGrams });
      const pick = pickIntlFallbackQuote(options, config);
      if (!pick) {
        results[code] = { ok: false };
        return;
      }
      internationalShipping[code] = intlZoneFromQuote(zones[code] || { label: code }, pick);
      results[code] = { ok: true, price: pick.price, days: pick.days, service: pick.service };
      updated = true;
    } catch (err) {
      results[code] = { ok: false, error: err.message };
    }
  }));

  const syncedPrices = codes
    .filter((c) => results[c]?.ok)
    .map((c) => internationalShipping[c].price);
  if (syncedPrices.length && internationalShipping.OTHER) {
    const midPrice = intlMidpointZonePrice(internationalShipping, internationalShipping.OTHER.price);
    const midDays = intlMidpointZoneDays(internationalShipping, internationalShipping.OTHER.days || 18);
    internationalShipping.OTHER = {
      ...internationalShipping.OTHER,
      price: midPrice,
      days: midDays,
      lastSyncedAt: new Date().toISOString(),
      lastSyncedSource: 'derived-midpoint'
    };
    updated = true;
    results.OTHER = { ok: true, price: midPrice, days: midDays, derived: true, midpoint: true };
  }

  if (!updated) return { config, results, updated: false };

  const saved = await saveConfig(env, { ...config, internationalShipping });
  return { config: saved, results, updated: true };
}

function getIntlSurcharge(config) {
  const n = Number(config?.internationalSurcharge ?? DEFAULT_CONFIG.internationalSurcharge);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0;
}

/** Multiplier on Correios base (min 1). Default 1 = sem markup. */
function getIntlShippingMultiplier(config) {
  const n = Number(config?.internationalShippingMultiplier ?? DEFAULT_CONFIG.internationalShippingMultiplier ?? 1);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.round(n * 100) / 100;
}

function applyIntlSurcharge(config, option) {
  if (!option || typeof option !== 'object') return option;
  const surcharge = getIntlSurcharge(config);
  const multiplier = getIntlShippingMultiplier(config);
  const base = Number(option.price) || 0;
  const multiplied = Math.round(base * multiplier * 100) / 100;
  const price = Math.round((multiplied + surcharge) * 100) / 100;
  const markup = Math.round((price - base) * 100) / 100;
  return {
    ...option,
    price,
    intlSurcharge: markup > 0 ? markup : undefined,
    intlFlatSurcharge: surcharge || undefined,
    intlMultiplier: multiplier !== 1 ? multiplier : undefined,
    intlBasePrice: (multiplier !== 1 || surcharge) ? base : undefined
  };
}

function applyIntlSurchargeToOptions(config, options) {
  const list = options || [];
  if (!list.length) return list;
  let highestIdx = 0;
  list.forEach((opt, i) => {
    if (Number(opt.price) > Number(list[highestIdx].price)) highestIdx = i;
  });
  // Multiplier + flat surcharge apply to every international option (post-office labor).
  return list.map((opt, i) => {
    const marked = { ...opt, isHighestBid: i === highestIdx };
    return applyIntlSurcharge(config, marked);
  });
}

function computePayPalFee(amountBrl, config) {
  const paypal = config?.payments?.paypal || DEFAULT_CONFIG.payments?.paypal || {};
  const pct = Number(paypal.feePercent);
  const fixed = Number(paypal.feeFixedBRL);
  const percent = Number.isFinite(pct) && pct >= 0 ? pct : 5;
  const fixedBrl = Number.isFinite(fixed) && fixed >= 0 ? fixed : 0.6;
  const base = Math.max(0, Number(amountBrl) || 0);
  return Math.round((base * percent / 100 + fixedBrl) * 100) / 100;
}

const FX_CURRENCY_MAP = {
  US: 'USD', CA: 'CAD', MX: 'MXN', GB: 'GBP', IE: 'EUR', FR: 'EUR', DE: 'EUR', IT: 'EUR',
  ES: 'EUR', PT: 'EUR', NL: 'EUR', BE: 'EUR', AT: 'EUR', CH: 'CHF', SE: 'SEK', NO: 'NOK',
  DK: 'DKK', PL: 'PLN', CZ: 'CZK', AU: 'AUD', NZ: 'NZD', JP: 'JPY', KR: 'KRW', CN: 'CNY',
  HK: 'HKD', SG: 'SGD', IN: 'INR', AE: 'AED', IL: 'ILS', ZA: 'ZAR', AR: 'ARS', CL: 'CLP',
  CO: 'COP', UY: 'UYU', PY: 'PYG', BR: 'BRL'
};

function currencyForCountryCode(code) {
  return FX_CURRENCY_MAP[String(code || '').toUpperCase()] || 'USD';
}

async function fetchFxRate(env, toCurrency) {
  const to = String(toCurrency || 'USD').toUpperCase();
  if (to === 'BRL') {
    return { base: 'BRL', to: 'BRL', rate: 1, fetchedAt: new Date().toISOString() };
  }
  const cacheKey = `fx:BRL:${to}`;
  try {
    const cached = await env.STORE_KV.get(cacheKey);
    if (cached) {
      const data = JSON.parse(cached);
      if (data?.rate && Date.now() - (data.cachedAt || 0) < 6 * 3600000) return data;
    }
  } catch { /* refresh */ }

  const res = await fetch(`https://api.frankfurter.app/latest?from=BRL&to=${encodeURIComponent(to)}`);
  if (!res.ok) throw new Error('Câmbio indisponível.');
  const payload = await res.json();
  const rate = Number(payload?.rates?.[to]);
  if (!Number.isFinite(rate) || rate <= 0) throw new Error('Taxa de câmbio inválida.');
  const row = {
    base: 'BRL',
    to,
    rate,
    date: payload.date || null,
    fetchedAt: new Date().toISOString(),
    cachedAt: Date.now()
  };
  try {
    await kvPut(env, cacheKey, JSON.stringify(row), { expirationTtl: 86400 });
  } catch { /* ignore */ }
  return row;
}

async function handleFxRate(request, env, origin) {
  const to = (new URL(request.url).searchParams.get('to') || 'USD').toUpperCase();
  try {
    const data = await fetchFxRate(env, to);
    return json(data, 200, origin);
  } catch (err) {
    return json({ error: err.message || 'Câmbio indisponível.' }, 502, origin);
  }
}

function quoteInternational(config, countryCode) {
  const zones = config.internationalShipping || DEFAULT_CONFIG.internationalShipping;
  const code = String(countryCode || '').toUpperCase();
  const zone = resolveIntlShippingZone(zones, code);
  if (!zone) throw new Error('País não atendido');
  const unknown = !code || code === 'OTHER' || !zones[code];
  return {
    price: zone.price,
    days: zone.days,
    service: 'Correios Internacional — ' + zone.label,
    source: unknown ? 'config-median' : 'config',
    country: code || 'OTHER',
    countryLabel: zone.label
  };
}

async function findAsaasCustomerByCpf(base, apiKey, cpfCnpj) {
  const res = await fetch(`${base}/customers?cpfCnpj=${encodeURIComponent(cpfCnpj)}&limit=1`, {
    headers: asaasHeaders(apiKey)
  });
  const data = await asaasReadJson(res, 'Buscar cliente Asaas');
  return data.data?.[0]?.id || null;
}

async function createAsaasCustomer(base, apiKey, order) {
  const cpfCnpj = onlyDigits(order.cpf);
  if (!cpfCnpj || (cpfCnpj.length !== 11 && cpfCnpj.length !== 14)) {
    throw new Error('CPF/CNPJ inválido para cobrança Asaas.');
  }

  const existingId = await findAsaasCustomerByCpf(base, apiKey, cpfCnpj);
  if (existingId) return existingId;

  const res = await fetch(base + '/customers', {
    method: 'POST',
    headers: asaasHeaders(apiKey),
    body: JSON.stringify({
      name: order.nome,
      email: order.email,
      cpfCnpj,
      mobilePhone: normalizePhoneBR(order.telefone),
      postalCode: onlyDigits(order.cep) || '01310100',
      address: order.rua || 'Av Paulista',
      addressNumber: order.numero || 'S/N',
      complement: order.complemento || undefined,
      province: order.bairro || order.cidade || 'Centro',
      externalReference: order.orderId,
      notificationDisabled: true
    })
  });
  const data = await asaasReadJson(res, 'Criar cliente Asaas');
  return data.id;
}

async function fetchAsaasPixQr(base, apiKey, paymentId) {
  let lastError = 'Não foi possível gerar QR Code PIX no Asaas.';
  for (let attempt = 0; attempt < 3; attempt++) {
    const qrRes = await fetch(`${base}/payments/${paymentId}/pixQrCode`, {
      headers: { access_token: apiKey, Accept: 'application/json', 'User-Agent': 'SensorTattooFix/1.0' }
    });
    const text = await qrRes.text();
    let qr = null;
    if (text) {
      try { qr = JSON.parse(text); } catch { /* retry */ }
    }
    if (qrRes.ok && qr?.payload) return qr;
    lastError = qr?.errors?.[0]?.description || text || `HTTP ${qrRes.status}`;
    if (attempt < 2) await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(lastError + ' Cadastre uma chave PIX no painel Asaas.');
}

async function createAsaasPayment(env, order, config, billingType) {
  const apiKey = asaasApiKey(env);
  if (!apiKey) return null;

  const base = asaasBase(env);
  const customerId = await createAsaasCustomer(base, apiKey, order);
  const due = new Date().toISOString().slice(0, 10);

  const res = await fetch(base + '/payments', {
    method: 'POST',
    headers: asaasHeaders(apiKey),
    body: JSON.stringify({
      customer: customerId,
      billingType,
      value: Number(order.total.toFixed(2)),
      dueDate: due,
      description: `${config.product.name} — ${formatOrderSmartwatch(order)} — ${order.orderId}`.slice(0, 500),
      externalReference: order.orderId
    })
  });
  const payment = await asaasReadJson(res, 'Criar cobrança Asaas');

  if (billingType === 'PIX') {
    const qr = await fetchAsaasPixQr(base, apiKey, payment.id);
    return {
      provider: 'asaas',
      billingType: 'PIX',
      paymentId: payment.id,
      pixCopyPaste: qr.payload,
      pixQrEncoded: qr.encodedImage,
      autoConfirm: true
    };
  }

  let invoiceUrl = payment.invoiceUrl || payment.bankSlipUrl;
  if (!invoiceUrl) {
    const detailRes = await fetch(`${base}/payments/${payment.id}`, {
      headers: asaasHeaders(apiKey)
    });
    const detail = await asaasReadJson(detailRes, 'Consultar cobrança Asaas');
    invoiceUrl = detail.invoiceUrl || detail.bankSlipUrl;
  }
  if (!invoiceUrl) {
    throw new Error(
      'Link de pagamento com cartão não foi gerado. No Asaas, ative Cartão de crédito em Configurações → Cobranças e aguarde aprovação da conta.'
    );
  }

  return {
    provider: 'asaas',
    billingType: 'CREDIT_CARD',
    paymentId: payment.id,
    invoiceUrl,
    autoConfirm: true
  };
}

function paypalBase(env) {
  return isPayPalSandbox(env)
    ? 'https://api-m.sandbox.paypal.com'
    : 'https://api-m.paypal.com';
}

function storeBaseUrl(config, env, request) {
  if (request) {
    return isComSiteRequest(request)
      ? 'https://www.sensortattoofix.com'
      : 'https://www.sensortattoofix.com.br';
  }
  const storeUrl = String(env.STORE_URL || config.store?.url || '').replace(/\/$/, '');
  if (storeUrl) return storeUrl;
  return 'https://www.sensortattoofix.com.br';
}

function paypalReturnUrls(config, order, env, request) {
  const base = storeBaseUrl(config, env, request);
  const success = new URLSearchParams({
    paypal: 'success',
    orderId: order.orderId,
    accessToken: order.accessToken
  });
  const cancel = new URLSearchParams({
    paypal: 'cancel',
    orderId: order.orderId,
    accessToken: order.accessToken
  });
  return {
    return_url: `${base}/comprar.html?${success}`,
    cancel_url: `${base}/comprar.html?${cancel}`
  };
}

async function getPayPalAccessToken(env) {
  const { clientId, secret } = paypalCredentials(env);
  if (!clientId || !secret) throw new Error('PayPal não configurado no Worker.');

  const res = await fetch(`${paypalBase(env)}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + btoa(`${clientId}:${secret}`),
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json'
    },
    body: 'grant_type=client_credentials'
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const raw = data.error_description || data.error || 'Falha ao autenticar no PayPal.';
    if (String(raw).toLowerCase().includes('client authentication')) {
      throw new Error(isPayPalSandbox(env, clientId)
        ? 'Credenciais PayPal sandbox inválidas. Use Client ID e Secret do app Sandbox no Worker.'
        : 'Credenciais PayPal Live inválidas. Copie Client ID e Secret do mesmo app (modo Live) e atualize PAYPAL_CLIENT_ID e PAYPAL_CLIENT_SECRET no Worker.');
    }
    throw new Error(raw);
  }
  return data.access_token;
}

async function checkPayPalIntegration(env) {
  const { clientId, secret } = paypalCredentials(env);
  const sandbox = isPayPalSandbox(env, clientId);
  const selfTest = env.PAYPAL_SELF_TEST === 'true' || env.PAYPAL_SELF_TEST === '1';
  if (!clientId || !secret) {
    return {
      configured: false,
      sandbox,
      selfTest,
      authOk: false,
      mode: sandbox ? 'sandbox' : 'live',
      error: 'Secrets PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET não configurados.'
    };
  }
  try {
    await getPayPalAccessToken(env);
    return {
      configured: true,
      sandbox,
      selfTest,
      authOk: true,
      mode: sandbox ? 'sandbox' : 'live',
      clientIdSuffix: clientId.slice(-8)
    };
  } catch (err) {
    return {
      configured: true,
      sandbox,
      selfTest,
      authOk: false,
      mode: sandbox ? 'sandbox' : 'live',
      clientIdSuffix: clientId.slice(-8),
      error: err.message
    };
  }
}

async function checkMercadoPagoIntegration(env) {
  const token = mercadoPagoToken(env);
  const sandbox = isMpSandbox(env);
  if (!token) {
    return { configured: false, authOk: false, sandbox, error: 'MP_ACCESS_TOKEN não configurado.' };
  }
  try {
    const res = await fetch('https://api.mercadopago.com/users/me', {
      headers: { Authorization: 'Bearer ' + token }
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return {
        configured: true,
        authOk: false,
        sandbox,
        error: data.message || `HTTP ${res.status}`
      };
    }
    return { configured: true, authOk: true, sandbox };
  } catch (err) {
    return { configured: true, authOk: false, sandbox, error: err.message };
  }
}

async function checkAsaasIntegration(env) {
  const apiKey = asaasApiKey(env);
  const sandbox = env.ASAAS_SANDBOX === 'true';
  if (!apiKey) {
    return { configured: false, authOk: false, sandbox, error: 'ASAAS_API_KEY não configurada.' };
  }
  try {
    const res = await fetch(`${asaasBase(env)}/finance/balance`, { headers: asaasHeaders(apiKey) });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return {
        configured: true,
        authOk: false,
        sandbox,
        error: data.errors?.[0]?.description || `HTTP ${res.status}`
      };
    }
    return { configured: true, authOk: true, sandbox };
  } catch (err) {
    return { configured: true, authOk: false, sandbox, error: err.message };
  }
}

async function checkResendIntegration(env) {
  const apiKey = (env.RESEND_API_KEY || '').trim();
  if (!apiKey) {
    return { configured: false, authOk: false, error: 'RESEND_API_KEY não configurada.' };
  }
  try {
    const res = await fetch('https://api.resend.com/domains?limit=1', {
      headers: { Authorization: 'Bearer ' + apiKey }
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return {
        configured: true,
        authOk: false,
        error: data.message || data.error || `HTTP ${res.status}`
      };
    }
    return { configured: true, authOk: true };
  } catch (err) {
    return { configured: true, authOk: false, error: err.message };
  }
}

async function checkZApiIntegration(env) {
  const instance = env.ZAPI_INSTANCE_ID;
  const token = env.ZAPI_TOKEN;
  if (!instance || !token) {
    return { configured: false, authOk: false, error: 'ZAPI_INSTANCE_ID / ZAPI_TOKEN não configurados.' };
  }
  const headers = {};
  if (env.ZAPI_CLIENT_TOKEN) headers['Client-Token'] = env.ZAPI_CLIENT_TOKEN;
  try {
    const res = await fetch(
      `https://api.z-api.io/instances/${instance}/token/${token}/status`,
      { headers }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        configured: true,
        authOk: false,
        connected: false,
        error: data.error || data.message || `HTTP ${res.status}`
      };
    }
    const connected = data.connected === true || data.smartphoneConnected === true;
    return {
      configured: true,
      authOk: connected,
      connected,
      error: connected ? null : 'Instância sem WhatsApp conectado.'
    };
  } catch (err) {
    return { configured: true, authOk: false, connected: false, error: err.message };
  }
}

function correiosApiRowStatus(probe) {
  if (!probe) return 'off';
  if (probe.ok) return 'ok';
  if (String(probe.detail || '').includes('GTW-012')) return 'warn';
  return 'error';
}

const CORREIOS_API_LABELS = {
  34: 'Preço',
  35: 'Prazo',
  36: 'Pré-Postagem',
  37: 'CEP',
  41: 'Rastro',
  76: 'SRO',
  78: 'Meu Contrato',
  80: 'Fale Conosco',
  83: 'Logística Reversa',
  87: 'CWS',
  93: 'Intermediação',
  566: 'Packet / Internacional',
  586: 'Pré-Postagem Internacional',
  587: 'Rotulagem Internacional'
};

function worstIntegrationStatus(statuses) {
  const rank = { error: 0, warn: 1, off: 2, ok: 3 };
  let worst = 'ok';
  for (const s of statuses) {
    const st = s || 'off';
    if ((rank[st] ?? 9) < (rank[worst] ?? 9)) worst = st;
  }
  return worst;
}

function formatCorreiosApiLine(apiId) {
  const id = String(apiId).trim();
  const name = CORREIOS_API_LABELS[id] || CORREIOS_API_LABELS[Number(id)] || 'API Correios';
  return `${id} — ${name}`;
}

/**
 * Ordem fixa da tabela Status das integrações (admin → API).
 * Ao incluir qualquer API nova no site: adicionar id aqui + probe em
 * check*Integration / buildIntegrationRows / handleAdminIntegrationsStatus.
 */
const INTEGRATION_ROW_ORDER = [
  'worker',
  'mercadopago',
  'mercadolivre',
  'amazon',
  'shopee',
  'asaas',
  'paypal',
  'stripe',
  'correios-br',
  'correios-intl',
  'correios-contract-apis',
  'correios-intl-services',
  'uber-direct',
  'superfrete',
  'resend',
  'formsubmit',
  'zapi',
  'ga4',
  'address-autocomplete'
];

function sortIntegrationRows(rows) {
  const rank = new Map(INTEGRATION_ROW_ORDER.map((id, i) => [id, i]));
  return [...(rows || [])].sort((a, b) => {
    const ra = rank.has(a.id) ? rank.get(a.id) : 900;
    const rb = rank.has(b.id) ? rank.get(b.id) : 900;
    return ra - rb;
  });
}

function buildIntegrationRows(env, config, checks) {
  const {
    paypal, mercadoPago, mercadoLivre, amazon, shopee, asaas, resend, zapi, stripe, correiosToken, correiosPreco, correiosPrazo,
    correiosPrePostagem, correiosServico04227, correiosServico86720, exportOptions, uber, superfrete
  } = checks;
  const hasCorreiosCreds = !!(env.CORREIOS_USER && env.CORREIOS_PASSWORD);
  const formsubmitEmail = (config.formsubmit?.email || '').trim();
  const ga4Secret = (env.GA4_API_SECRET || '').trim();
  const exportQuote = exportOptions[0] || null;

  const googlePlacesKey = String(env.GOOGLE_PLACES_API_KEY || '').trim();

  const rows = [
    {
      id: 'worker',
      label: 'Cloudflare Worker',
      description: 'API central — pedidos, checkout e admin',
      status: 'ok',
      detail: 'Online e autenticado'
    }
  ];

  if (!mercadoPago.configured) {
    rows.push({
      id: 'mercadopago',
      label: 'Mercado Pago',
      description: 'PIX e checkout no Brasil',
      status: 'off',
      detail: 'Não configurado'
    });
  } else if (!mercadoPago.authOk) {
    rows.push({
      id: 'mercadopago',
      label: 'Mercado Pago',
      description: 'PIX e checkout no Brasil',
      status: 'error',
      detail: mercadoPago.error || 'Falha na autenticação'
    });
  } else {
    rows.push({
      id: 'mercadopago',
      label: 'Mercado Pago',
      description: 'PIX e checkout no Brasil',
      status: mercadoPago.sandbox ? 'warn' : 'ok',
      detail: mercadoPago.sandbox ? 'Sandbox conectado' : 'Produção conectada'
    });
  }

  if (!mercadoLivre?.configured) {
    rows.push({
      id: 'mercadolivre',
      label: 'Mercado Livre',
      description: 'Importação de pedidos/vendas (marketplace)',
      status: 'off',
      detail: 'Não configurado'
    });
  } else if (!mercadoLivre.authOk) {
    rows.push({
      id: 'mercadolivre',
      label: 'Mercado Livre',
      description: 'Importação de pedidos/vendas (marketplace)',
      status: 'error',
      detail: mercadoLivre.error || 'Falha na autenticação'
    });
  } else {
    const nick = mercadoLivre.nickname ? ` · ${mercadoLivre.nickname}` : '';
    const syncHint = mercadoLivre.lastSyncedAt
      ? ` · sync ${String(mercadoLivre.lastSyncedAt).slice(0, 16).replace('T', ' ')}`
      : '';
    rows.push({
      id: 'mercadolivre',
      label: 'Mercado Livre',
      description: 'Importação de pedidos/vendas (marketplace)',
      status: 'ok',
      detail: `Conectado${nick}${syncHint}`
    });
  }

  if (!amazon?.configured) {
    rows.push({
      id: 'amazon',
      label: 'Amazon',
      description: 'Importação de pedidos/vendas (SP-API)',
      status: 'off',
      detail: 'Não configurado'
    });
  } else if (!amazon.authOk) {
    rows.push({
      id: 'amazon',
      label: 'Amazon',
      description: 'Importação de pedidos/vendas (SP-API)',
      status: 'error',
      detail: amazon.error || 'Falha na autenticação'
    });
  } else {
    const syncHint = amazon.lastSyncedAt
      ? ` · sync ${String(amazon.lastSyncedAt).slice(0, 16).replace('T', ' ')}`
      : '';
    rows.push({
      id: 'amazon',
      label: 'Amazon',
      description: 'Importação de pedidos/vendas (SP-API)',
      status: 'ok',
      detail: `Conectado · BR${syncHint}`
    });
  }

  if (!shopee?.configured) {
    rows.push({
      id: 'shopee',
      label: 'Shopee',
      description: 'Importação de pedidos/vendas (Open Platform)',
      status: 'off',
      detail: 'Não configurado'
    });
  } else if (!shopee.authOk) {
    rows.push({
      id: 'shopee',
      label: 'Shopee',
      description: 'Importação de pedidos/vendas (Open Platform)',
      status: 'error',
      detail: shopee.error || 'Autorize a loja no Admin → Vendas → Shopee'
    });
  } else {
    const shopHint = shopee.shopId ? ` · shop ${shopee.shopId}` : '';
    const syncHint = shopee.lastSyncedAt
      ? ` · sync ${String(shopee.lastSyncedAt).slice(0, 16).replace('T', ' ')}`
      : '';
    rows.push({
      id: 'shopee',
      label: 'Shopee',
      description: 'Importação de pedidos/vendas (Open Platform)',
      status: 'ok',
      detail: `Conectado${shopHint}${syncHint}`
    });
  }

  if (!asaas.configured) {
    rows.push({
      id: 'asaas',
      label: 'Asaas',
      description: 'PIX alternativo e cartão de crédito BR',
      status: 'off',
      detail: 'Não configurado'
    });
  } else if (!asaas.authOk) {
    rows.push({
      id: 'asaas',
      label: 'Asaas',
      description: 'PIX alternativo e cartão de crédito BR',
      status: 'error',
      detail: asaas.error || 'Falha na autenticação'
    });
  } else {
    rows.push({
      id: 'asaas',
      label: 'Asaas',
      description: 'PIX alternativo e cartão de crédito BR',
      status: asaas.sandbox ? 'warn' : 'ok',
      detail: asaas.sandbox ? 'Sandbox conectado' : 'Produção conectada'
    });
  }

  if (!paypal.configured) {
    rows.push({
      id: 'paypal',
      label: 'PayPal',
      description: 'Pagamentos internacionais',
      status: 'off',
      detail: 'Secrets não configurados'
    });
  } else if (!paypal.authOk) {
    rows.push({
      id: 'paypal',
      label: 'PayPal',
      description: 'Pagamentos internacionais',
      status: 'error',
      detail: paypal.error || 'Falha na autenticação'
    });
  } else {
    let detail = `${paypal.mode === 'sandbox' ? 'Sandbox' : 'Live'} conectado`;
    const paypalAppLabel = String(config.payments?.paypal?.appLabel || '').trim();
    if (paypalAppLabel) detail += ` · ${paypalAppLabel}`;
    rows.push({
      id: 'paypal',
      label: 'PayPal',
      description: 'Pagamentos internacionais',
      status: paypal.sandbox ? 'warn' : 'ok',
      detail
    });
  }

  if (!stripe?.configured) {
    rows.push({
      id: 'stripe',
      label: 'Stripe',
      description: 'Cartão, Apple Pay e Google Pay (.com)',
      status: 'off',
      detail: 'Secrets não configurados · oculto no checkout até chaves live'
    });
  } else if (stripe.mode === 'test') {
    rows.push({
      id: 'stripe',
      label: 'Stripe',
      description: 'Cartão, Apple Pay e Google Pay (.com)',
      status: 'error',
      detail: 'Chaves de TESTE — oculto no .com (só PayPal). Troque por pk_live_ / sk_live_.'
    });
  } else if (!stripe.authOk) {
    rows.push({
      id: 'stripe',
      label: 'Stripe',
      description: 'Cartão, Apple Pay e Google Pay (.com)',
      status: 'error',
      detail: (stripe.error || 'Falha na autenticação') + ' · oculto no checkout'
    });
  } else if (!stripe.liveReady) {
    rows.push({
      id: 'stripe',
      label: 'Stripe',
      description: 'Cartão, Apple Pay e Google Pay (.com)',
      status: 'error',
      detail: 'Não está live — oculto no checkout até pk_live_ / sk_live_'
    });
  } else {
    let stripeDetail = 'Live conectado · visível no .com';
    if (!stripe.webhook) stripeDetail += ' · webhook secret ausente';
    rows.push({
      id: 'stripe',
      label: 'Stripe',
      description: 'Cartão, Apple Pay e Google Pay (.com)',
      status: stripe.webhook ? 'ok' : 'warn',
      detail: stripeDetail
    });
  }

  if (!hasCorreiosCreds) {
    rows.push({
      id: 'correios-br',
      label: 'Correios BR',
      description: 'Nacional: token, preço, prazo e pré-postagem',
      status: 'warn',
      detail: 'Sem credenciais',
      detailLines: [
        'Token — sem credenciais',
        '34 Preço — aguardando',
        '35 Prazo — aguardando',
        '36 Pré-Postagem — aguardando',
        '04227 Mini Envios — aguardando',
        '86720 Pré-Postagem — aguardando'
      ]
    });
  } else if (!correiosToken) {
    rows.push({
      id: 'correios-br',
      label: 'Correios BR',
      description: 'Nacional: token, preço, prazo e pré-postagem',
      status: 'error',
      detail: 'Token não obtido',
      detailLines: [
        'Token — falhou',
        '34 Preço — sem token',
        '35 Prazo — sem token',
        '36 Pré-Postagem — sem token',
        '04227 Mini Envios — sem token',
        '86720 Pré-Postagem — sem token'
      ]
    });
  } else {
    const tokenStatus = 'ok';
    const precoStatus = correiosApiRowStatus(correiosPreco);
    const prazoStatus = correiosApiRowStatus(correiosPrazo);
    const prePostStatus = correiosApiRowStatus(correiosPrePostagem);
    const s04227Status = correiosApiRowStatus(correiosServico04227);
    const s86720Status = correiosApiRowStatus(correiosServico86720);
    rows.push({
      id: 'correios-br',
      label: 'Correios BR',
      description: 'Nacional: token, preço, prazo e pré-postagem',
      status: worstIntegrationStatus([
        tokenStatus, precoStatus, prazoStatus, prePostStatus, s04227Status, s86720Status
      ]),
      detail: 'APIs em uso',
      detailLines: [
        'Token — OK',
        `34 Preço — ${correiosPreco?.detail || 'falhou'}`,
        `35 Prazo — ${correiosPrazo?.detail || 'falhou'}`,
        `36 Pré-Postagem — ${correiosPrePostagem?.detail || 'falhou'}`,
        `04227 Mini Envios — ${correiosServico04227?.detail || 'não verificado'}`,
        `86720 Pré-Postagem — ${correiosServico86720?.detail || 'não verificado'}`
      ]
    });
  }

  if (exportOptions.length > 0 && exportQuote) {
    const price = Number(exportQuote.price).toFixed(2).replace('.', ',');
    rows.push({
      id: 'correios-intl',
      label: 'Correios Exporta Fácil',
      description: 'Cotação internacional (documento / encomenda)',
      status: 'ok',
      detail: `Simulador OK — PT ~R$ ${price}`
    });
  } else {
    rows.push({
      id: 'correios-intl',
      label: 'Correios Exporta Fácil',
      description: 'Cotação internacional (documento / encomenda)',
      status: 'error',
      detail: 'Simulador indisponível — usa tabela fallback'
    });
  }

  const uberEnabled = getEnabledShippingMethods(config, 'BR').some(isUberMethod);
  if (!uber?.configured) {
    rows.push({
      id: 'uber-direct',
      label: 'Uber Direct',
      description: 'Entrega rápida sob demanda (BR)',
      status: 'off',
      detail: uberEnabled ? 'Modalidade ativa no admin — configure secrets' : 'Não configurado'
    });
  } else if (!uber.authOk) {
    rows.push({
      id: 'uber-direct',
      label: 'Uber Direct',
      description: 'Entrega rápida sob demanda (BR)',
      status: 'error',
      detail: uber.error || 'Falha na autenticação OAuth'
    });
  } else if (uber.quoteOk === false) {
    const radiusLimit = uber.error && /raio|radius|km|mi/i.test(uber.error);
    rows.push({
      id: 'uber-direct',
      label: 'Uber Direct',
      description: 'Entrega rápida sob demanda (BR)',
      status: radiusLimit ? 'warn' : 'error',
      detail: uber.error || 'Cotação de teste falhou'
    });
  } else {
    const priceHint = uber.samplePrice ? ` · teste ~R$ ${Number(uber.samplePrice).toFixed(2)}` : '';
    rows.push({
      id: 'uber-direct',
      label: 'Uber Direct',
      description: 'Entrega rápida sob demanda (BR)',
      status: uber.sandbox ? 'warn' : (uberEnabled ? 'ok' : 'warn'),
      detail: uber.sandbox
        ? `Sandbox conectado${priceHint}`
        : (uberEnabled ? `Produção conectada${priceHint}` : `Conectado — ative modalidade Uber no frete${priceHint}`)
    });
  }

  const sfEnabled = getEnabledShippingMethods(config, 'BR').some(isSuperfreteMethod);
  if (!superfrete?.configured) {
    rows.push({
      id: 'superfrete',
      label: 'Super Frete',
      description: 'Cotação e etiqueta BR (PAC/SEDEX/Mini…)',
      status: 'off',
      detail: sfEnabled ? 'Modalidade ativa no admin — configure SUPERFRETE_TOKEN' : 'Não configurado'
    });
  } else if (!superfrete.authOk) {
    rows.push({
      id: 'superfrete',
      label: 'Super Frete',
      description: 'Cotação e etiqueta BR (PAC/SEDEX/Mini…)',
      status: 'error',
      detail: superfrete.error || 'Token inválido'
    });
  } else if (!superfrete.quoteOk) {
    rows.push({
      id: 'superfrete',
      label: 'Super Frete',
      description: 'Cotação e etiqueta BR (PAC/SEDEX/Mini…)',
      status: 'warn',
      detail: superfrete.error || 'Token OK — cotação falhou'
    });
  } else {
    const priceHint = superfrete.samplePrice != null
      ? ` · teste ${superfrete.sampleService || ''} ~R$ ${Number(superfrete.samplePrice).toFixed(2)}`
      : '';
    rows.push({
      id: 'superfrete',
      label: 'Super Frete',
      description: 'Cotação e etiqueta BR (PAC/SEDEX/Mini…)',
      status: superfrete.sandbox ? 'warn' : (sfEnabled ? 'ok' : 'warn'),
      detail: superfrete.sandbox
        ? `Sandbox conectado${priceHint}`
        : (sfEnabled
          ? `Produção conectada${priceHint}`
          : `Conectado — ative modalidade Super Frete no frete${priceHint}`)
    });
  }

  if (!resend.configured) {
    rows.push({
      id: 'resend',
      label: 'Resend',
      description: 'E-mails transacionais (pedidos, confirmações)',
      status: formsubmitEmail ? 'warn' : 'off',
      detail: formsubmitEmail ? 'Não configurado — só FormSubmit' : 'Não configurado'
    });
  } else if (!resend.authOk) {
    rows.push({
      id: 'resend',
      label: 'Resend',
      description: 'E-mails transacionais (pedidos, confirmações)',
      status: 'error',
      detail: resend.error || 'Falha na autenticação'
    });
  } else {
    rows.push({
      id: 'resend',
      label: 'Resend',
      description: 'E-mails transacionais (pedidos, confirmações)',
      status: 'ok',
      detail: 'Conectado'
    });
  }

  rows.push({
    id: 'formsubmit',
    label: 'FormSubmit',
    description: 'Fallback de e-mail se Resend falhar',
    status: formsubmitEmail ? 'ok' : 'off',
    detail: formsubmitEmail ? formsubmitEmail : 'E-mail de destino não configurado'
  });

  if (!zapi.configured) {
    rows.push({
      id: 'zapi',
      label: 'Z-API',
      description: 'WhatsApp automático (cliente e loja)',
      status: 'off',
      detail: 'Não configurado'
    });
  } else if (!zapi.authOk) {
    rows.push({
      id: 'zapi',
      label: 'Z-API',
      description: 'WhatsApp automático (cliente e loja)',
      status: zapi.connected === false ? 'warn' : 'error',
      detail: zapi.error || 'Falha na conexão'
    });
  } else {
    rows.push({
      id: 'zapi',
      label: 'Z-API',
      description: 'WhatsApp automático (cliente e loja)',
      status: 'ok',
      detail: 'Instância conectada'
    });
  }

  rows.push({
    id: 'ga4',
    label: 'GA4 (server)',
    description: 'Conversões de compra via Measurement Protocol',
    status: ga4Secret ? 'ok' : 'warn',
    detail: ga4Secret ? 'API secret configurado' : 'Só tag no site — sem conversão server-side'
  });

  rows.push({
    id: 'address-autocomplete',
    label: 'Sugestão de endereço',
    description: 'Checkout .com — completa rua e cidade',
    status: 'ok',
    detail: googlePlacesKey
      ? 'Google Places (principal) + OpenStreetMap (fallback)'
      : 'OpenStreetMap / Photon (grátis)'
  });

  return rows;
}

async function createPayPalCheckout(env, order, config, request, opts) {
  const options = opts || {};
  const accessToken = await getPayPalAccessToken(env);
  const checkoutLocale = String(order.checkoutLocale || 'pt').toLowerCase();
  const useForeign = isComSiteRequest(request) && isIntlCheckoutLocale(checkoutLocale);
  const foreignCur = intlChargeCurrencyForLocale(checkoutLocale);
  let currencyCode = 'BRL';
  let amountValue = Number(order.total).toFixed(2);
  let locale = 'pt-BR';
  if (useForeign) {
    if (isSelfTestOrder(order)) {
      currencyCode = foreignCur;
      const testAmt = foreignCur === 'EUR'
        ? SELF_TEST_EUR_AMOUNT
        : SELF_TEST_USD_AMOUNT;
      amountValue = testAmt.toFixed(2);
      locale = checkoutLocale === 'it' ? 'it-IT' : 'en-US';
      order.chargeCurrency = foreignCur;
      order.chargeAmount = testAmt;
      order.displayCurrency = foreignCur;
    } else {
      const charge = await intlForeignCharge(order, env, config, order.items, foreignCur);
      currencyCode = foreignCur;
      amountValue = Number(charge.amount).toFixed(2);
      locale = checkoutLocale === 'it' ? 'it-IT' : 'en-US';
      order.chargeCurrency = foreignCur;
      order.chargeAmount = charge.amount;
      order.chargeFxRate = charge.fxRate;
      order.displayCurrency = foreignCur;
    }
  } else if (isSelfTestOrder(order)) {
    amountValue = SELF_TEST_BRL_AMOUNT.toFixed(2);
    applySelfTestChargeCurrency(order, { intlUsd: false });
  }
  if (!(Number(amountValue) > 0)) {
    throw new Error('PayPal amount must be greater than zero.');
  }
  const description = `Sensor Tattoo Fix — ${order.orderId}`.slice(0, 127);
  const payload = {
    intent: 'CAPTURE',
    purchase_units: [{
      reference_id: order.orderId,
      custom_id: order.orderId,
      description,
      amount: {
        currency_code: currencyCode,
        value: amountValue
      }
    }]
  };
  if (!options.embedded) {
    const { return_url, cancel_url } = paypalReturnUrls(config, order, env, request);
    payload.application_context = {
      brand_name: 'Sensor Tattoo Fix',
      locale,
      landing_page: 'NO_PREFERENCE',
      user_action: 'PAY_NOW',
      return_url,
      cancel_url
    };
  } else {
    payload.application_context = {
      brand_name: 'Sensor Tattoo Fix',
      locale,
      landing_page: 'NO_PREFERENCE',
      user_action: 'PAY_NOW'
    };
  }

  const res = await fetch(`${paypalBase(env)}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = data.details?.[0]?.description || data.message;
    throw new Error(detail || 'Falha ao criar pagamento PayPal.');
  }
  const approveUrl = (data.links || []).find((l) => l.rel === 'approve')?.href || null;
  if (!options.embedded && !approveUrl) throw new Error('Link de pagamento PayPal não retornado.');

  return {
    provider: 'paypal',
    billingType: 'PAYPAL',
    paymentId: data.id,
    paypalOrderId: data.id,
    approveUrl,
    autoConfirm: true,
    embedded: !!options.embedded
  };
}

async function capturePayPalOrder(env, paypalOrderId) {
  const accessToken = await getPayPalAccessToken(env);
  const res = await fetch(`${paypalBase(env)}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const issue = data.details?.[0]?.issue;
    if (issue === 'ORDER_ALREADY_CAPTURED') {
      return { status: 'COMPLETED', id: paypalOrderId, value: null };
    }
    const detail = data.details?.[0]?.description || data.message;
    throw new Error(detail || 'Falha ao capturar pagamento PayPal.');
  }
  const capture = data.purchase_units?.[0]?.payments?.captures?.[0];
  return {
    status: data.status,
    id: capture?.id || data.id,
    value: capture?.amount?.value
  };
}

function mpErrorMessage(data, status) {
  const parts = [];
  if (Array.isArray(data.cause)) {
    data.cause.forEach((c) => {
      if (c.description) parts.push(c.description);
      else if (c.code) parts.push(String(c.code));
    });
  }
  if (data.message) parts.push(data.message);
  if (data.error && data.error !== data.message) parts.push(data.error);
  if (data.message === 'internal_error' || data.status === 'internal_error') {
    parts.push('Confira no Mercado Pago se a conta está habilitada para PIX em produção.');
  }
  return parts.filter(Boolean).join(' — ') || `HTTP ${status}`;
}

async function createMercadoPagoPixPayment(env, order, config) {
  const token = mercadoPagoToken(env);
  if (!token) return null;

  const nameParts = String(order.nome || 'Cliente').trim().split(/\s+/);
  const firstName = nameParts[0] || 'Cliente';
  const lastName = nameParts.slice(1).join(' ') || '.';
  const cpf = onlyDigits(order.cpf);

  const payer = {
    email: order.email,
    first_name: firstName.slice(0, 50),
    last_name: lastName.slice(0, 50)
  };
  if (cpf.length === 11) {
    payer.identification = { type: 'CPF', number: cpf };
  }

  const notificationUrl = (env.MP_WEBHOOK_URL || '').trim() || undefined;
  const body = {
    transaction_amount: Number(order.total.toFixed(2)),
    description: `${config.product?.name || 'Kit Sensor Tattoo Fix'} — ${order.orderId}`.slice(0, 200),
    payment_method_id: 'pix',
    external_reference: order.orderId,
    payer
  };
  if (notificationUrl) body.notification_url = notificationUrl;

  const res = await fetch('https://api.mercadopago.com/v1/payments', {
    method: 'POST',
    headers: mpHeaders(env, order.orderId),
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Mercado Pago PIX: ${mpErrorMessage(data, res.status)}`);
  }

  const tx = data.point_of_interaction?.transaction_data;
  if (!tx?.qr_code) {
    throw new Error('Mercado Pago não retornou QR Code PIX.');
  }

  return {
    provider: 'mercadopago',
    billingType: 'PIX',
    paymentId: String(data.id),
    pixCopyPaste: tx.qr_code,
    pixQrEncoded: tx.qr_code_base64 || null,
    autoConfirm: true
  };
}

/** Checkout Pro — cartão internacional (Visa/Mastercard/Amex), valor em BRL. */
async function createMercadoPagoCheckoutPro(env, order, config, request) {
  const token = mercadoPagoToken(env);
  if (!token) throw new Error('Mercado Pago não configurado no Worker.');

  const base = storeBaseUrl(config, env, request);
  const successParams = new URLSearchParams({
    mp: 'success', orderId: order.orderId, accessToken: order.accessToken
  });
  const failureParams = new URLSearchParams({
    mp: 'failure', orderId: order.orderId, accessToken: order.accessToken
  });
  const pendingParams = new URLSearchParams({
    mp: 'pending', orderId: order.orderId, accessToken: order.accessToken
  });
  const notificationUrl = (env.MP_WEBHOOK_URL || '').trim() || undefined;

  const body = {
    items: [{
      title: String(order.produto || config.product?.name || 'Sensor Tattoo Fix').slice(0, 256),
      quantity: 1,
      unit_price: Number(order.total.toFixed(2)),
      currency_id: 'BRL'
    }],
    payer: {
      email: order.email,
      name: String(order.nome || 'Cliente').slice(0, 100)
    },
    external_reference: order.orderId,
    back_urls: {
      success: `${base}/comprar.html?${successParams}`,
      failure: `${base}/loja.html`,
      pending: `${base}/comprar.html?${pendingParams}`
    },
    auto_return: 'approved',
    statement_descriptor: 'SENSOR TATTOO FIX',
    payment_methods: {
      excluded_payment_types: [{ id: 'ticket' }, { id: 'atm' }]
    }
  };
  if (notificationUrl) body.notification_url = notificationUrl;

  const res = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: mpHeaders(env, order.orderId),
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Mercado Pago checkout: ${mpErrorMessage(data, res.status)}`);
  }

  const checkoutUrl = isMpSandbox(env) ? data.sandbox_init_point : data.init_point;
  if (!checkoutUrl) throw new Error('Link de pagamento Mercado Pago não retornado.');

  return {
    provider: 'mercadopago',
    billingType: 'MP_CHECKOUT',
    paymentId: String(data.id),
    mpPreferenceId: String(data.id),
    approveUrl: checkoutUrl,
    invoiceUrl: checkoutUrl,
    autoConfirm: true
  };
}

/** Cartão ou PIX BR — processador configurado no admin, com fallback Asaas ↔ Mercado Pago. */
async function tryBrPaymentProvider(env, order, config, provider, billingType, request) {
  const hasAsaas = !!asaasApiKey(env);
  const hasMp = !!mercadoPagoToken(env);
  if (provider === 'mercadopago') {
    if (!hasMp) throw new Error('Mercado Pago não configurado no Worker.');
    if (billingType === 'CREDIT_CARD') return createMercadoPagoCheckoutPro(env, order, config, request);
    return createMercadoPagoPixPayment(env, order, config);
  }
  if (!hasAsaas) throw new Error('Asaas não configurado no Worker.');
  return createAsaasPayment(env, order, config, billingType);
}

async function createBrPaymentWithFallback(env, order, config, billingType, getProvider, fallbackEnabled, request) {
  const primary = getProvider(config);
  const alternate = primary === 'mercadopago' ? 'asaas' : 'mercadopago';
  const label = billingType === 'PIX' ? 'PIX' : 'Cartão';
  try {
    return await tryBrPaymentProvider(env, order, config, primary, billingType, request);
  } catch (primaryErr) {
    if (!fallbackEnabled(config)) throw primaryErr;
    console.error(`${label} ${primary}:`, primaryErr.message);
    try {
      const payment = await tryBrPaymentProvider(env, order, config, alternate, billingType, request);
      console.log(`${label} fallback ${primary} → ${alternate}:`, order.orderId);
      return payment;
    } catch (altErr) {
      console.error(`${label} ${alternate} (fallback):`, altErr.message);
      throw primaryErr;
    }
  }
}

async function createBrCreditCardPayment(env, order, config, request) {
  return createBrPaymentWithFallback(env, order, config, 'CREDIT_CARD', getCardBrProvider, cardBrFallbackEnabled, request);
}

async function createBrPixPayment(env, order, config) {
  return createBrPaymentWithFallback(env, order, config, 'PIX', getPixBrProvider, pixBrFallbackEnabled);
}

function getEmails(config) {
  return { ...DEFAULT_CONFIG.emails, ...(config?.emails || {}) };
}

function applyEmailTemplate(template, vars) {
  return String(template || '').replace(/\{(\w+)\}/g, (_, key) => {
    if (vars[key] == null) return '';
    return String(vars[key]);
  });
}

function emailSubject(config, key, vars = {}) {
  return applyEmailTemplate(getEmails(config)[key], vars);
}

function emailMessage(config, key, vars = {}) {
  return applyEmailTemplate(getEmails(config)[key], vars);
}

function emailFrom(env, config) {
  return env.EMAIL_FROM || getEmails(config).from || DEFAULT_CONFIG.emails.from;
}

function fieldsToHtml(fields) {
  const rows = Object.entries(fields)
    .map(([k, v]) => `<tr><td style="padding:8px;border:1px solid #ddd;font-weight:600">${k}</td><td style="padding:8px;border:1px solid #ddd">${String(v ?? '').replace(/</g, '&lt;')}</td></tr>`)
    .join('');
  return `<div style="font-family:Arial,sans-serif;max-width:560px"><table style="border-collapse:collapse;width:100%">${rows}</table><p style="color:#666;font-size:12px;margin-top:16px">Sensor Tattoo Fix — sensortattoofix.com.br</p></div>`;
}

function fieldsToText(fields) {
  return Object.entries(fields)
    .map(([k, v]) => `${k}: ${String(v ?? '')}`)
    .join('\n');
}

async function sendViaResend(env, config, to, subject, fields, replyTo, content) {
  const apiKey = (env.RESEND_API_KEY || '').trim();
  if (!apiKey) return { ok: false, error: 'RESEND_API_KEY não configurada' };

  const toAddr = String(to || '').trim().toLowerCase();
  const payload = {
    from: emailFrom(env, config),
    to: [to],
    subject,
    html: content?.html || fieldsToHtml(fields),
    text: content?.text || fieldsToText(fields)
  };
  if (replyTo) payload.reply_to = [replyTo];
  if (content?.attachments?.length) payload.attachments = content.attachments;
  const bccRaw = content?.bcc;
  if (bccRaw) {
    const bccList = (Array.isArray(bccRaw) ? bccRaw : [bccRaw])
      .map((e) => String(e || '').trim())
      .filter((e) => e && e.toLowerCase() !== toAddr);
    if (bccList.length) payload.bcc = bccList;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.message || data.error || res.statusText || 'Erro Resend';
    console.error('Resend:', res.status, msg, JSON.stringify(data));
    return { ok: false, status: res.status, error: msg };
  }
  return { ok: true, id: data.id };
}

async function sendViaFormSubmit(to, subject, fields) {
  const body = new URLSearchParams();
  body.append('_subject', subject);
  body.append('_captcha', 'false');
  body.append('_template', 'table');
  Object.entries(fields).forEach(([k, v]) => body.append(k, String(v ?? '')));
  const res = await fetch('https://formsubmit.co/ajax/' + encodeURIComponent(to), {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });
  const data = await res.json().catch(() => ({}));
  const ok = res.ok && data.success !== false;
  if (!ok) console.error('FormSubmit:', res.status, JSON.stringify(data));
  return { ok, status: res.status, data };
}

async function notifyEmail(env, config, to, subject, fields, replyTo, content) {
  if (!to) return { ok: false, error: 'Destinatário vazio' };
  try {
    const resend = await sendViaResend(env, config, to, subject, fields, replyTo, content);
    if (resend.ok) return { ok: true, provider: 'resend', id: resend.id };

    const formsubmit = await sendViaFormSubmit(to, subject, fields);
    if (formsubmit.ok) return { ok: true, provider: 'formsubmit' };

    return { ok: false, resend, formsubmit };
  } catch (err) {
    console.error('E-mail:', err.message);
    return { ok: false, error: err.message };
  }
}

async function notifyShop(env, config, subject, fields, content) {
  return notifyEmail(env, config, config.formsubmit?.email, subject, fields, null, content);
}

async function notifyCustomer(env, config, order, subject, fields, content) {
  const loc = orderCheckoutLocale(order);
  const nameKey = loc === 'en' ? 'Customer' : 'Cliente';
  return notifyEmail(env, config, order.email, subject, { [nameKey]: order.nome, ...fields }, config.formsubmit?.email, content);
}

async function notifyCustomerPendingPix(env, config, order) {
  // Safety: never email a Brazilian PIX code to an abroad / EN-IT checkout order.
  if (orderLooksInternationalDestination(order)) {
    return notifyCustomerPendingPayment(env, config, order, 'PAYPAL');
  }
  const qrAttachment = await pixQrInlineAttachment(order);
  const mail = buildPendingConsultativeEmail(order, config, env, {
    paymentKind: 'pix',
    hasQrImage: !!qrAttachment,
    includePixCode: true
  });
  const fields = {
    Pedido: order.orderId,
    Total: formatBRL(order.total),
    'Link do pedido': mail.resumeUrl,
    ...orderWatchEmailFields(order)
  };
  return notifyCustomer(
    env,
    config,
    order,
    mail.subject,
    fields,
    {
      html: mail.html,
      text: mail.text,
      attachments: qrAttachment ? [qrAttachment] : []
    }
  );
}

function pendingPaymentKind(billingType) {
  if (billingType === 'PAYPAL') return 'paypal';
  if (billingType === 'PIX') return 'pix';
  return 'card';
}

async function notifyCustomerPendingPayment(env, config, order, billingType) {
  const kind = pendingPaymentKind(billingType);
  if (kind === 'pix') return notifyCustomerPendingPix(env, config, order);
  const mail = buildPendingConsultativeEmail(order, config, env, {
    paymentKind: kind,
    includePixCode: false
  });
  const fields = (() => {
    const loc = orderCheckoutLocale(order);
    if (loc === 'en') {
      return {
        Order: order.orderId,
        Status: 'Awaiting payment',
        Total: formatOrderCharge(order),
        Payment: order.pagamento,
        'Order link': mail.resumeUrl,
        ...(billingType === 'PAYPAL' && order.paypalApproveUrl ? { 'PayPal link': order.paypalApproveUrl } : {}),
        ...(billingType === 'MP_CHECKOUT' && order.invoiceUrl ? { 'Payment link': order.invoiceUrl } : {}),
        ...orderWatchEmailFields(order),
        ...orderIntlProductFields(order)
      };
    }
    if (loc === 'it') {
      return {
        Ordine: order.orderId,
        Stato: 'In attesa di pagamento',
        Totale: formatOrderCharge(order),
        Pagamento: order.pagamento,
        'Link ordine': mail.resumeUrl,
        ...(billingType === 'PAYPAL' && order.paypalApproveUrl ? { 'Link PayPal': order.paypalApproveUrl } : {}),
        ...(billingType === 'MP_CHECKOUT' && order.invoiceUrl ? { 'Link pagamento': order.invoiceUrl } : {}),
        ...orderWatchEmailFields(order),
        ...orderIntlProductFields(order)
      };
    }
    return {
      Pedido: order.orderId,
      Status: 'Aguardando pagamento',
      Total: formatOrderCharge(order),
      Pagamento: order.pagamento,
      'Link do pedido': mail.resumeUrl,
      ...(billingType === 'PAYPAL' && order.paypalApproveUrl ? { 'Link PayPal': order.paypalApproveUrl } : {}),
      ...(billingType === 'MP_CHECKOUT' && order.invoiceUrl ? { 'Link pagamento': order.invoiceUrl } : {}),
      ...orderWatchEmailFields(order),
      ...orderIntlProductFields(order)
    };
  })();
  return notifyCustomer(env, config, order, mail.subject, fields, {
    html: mail.html,
    text: mail.text
  });
}

async function handleShippingQuote(request, env, origin, ctx) {
  const url = new URL(request.url);
  const country = (url.searchParams.get('country') || 'BR').toUpperCase();
  const config = await getConfig(env);
  const weightGrams = shippingWeightGrams(config, Number(url.searchParams.get('weightGrams')) || undefined);
  let options = [];

  if (country !== 'BR') {
    const documentOnly = isComSiteRequest(request)
      || String(url.searchParams.get('documentOnly') || '') === '1';
    options = await quoteCorreiosExportOptions(config, country, { weightGrams, documentOnly });
    if (documentOnly) {
      options = options.filter((o) => o.shipmentType === 'documento' || !o.shipmentType);
      options = options.map((o) => ({
        ...o,
        shipmentType: 'documento',
        methodId: o.methodId === 'int-encomenda' ? 'int-documento' : (o.methodId || 'int-documento')
      }));
    }
    if (options.some((o) => o.source === 'correios-export') && ctx) {
      ctx.waitUntil(
        updateIntlFallbackZone(env, country, options).catch((err) => {
          console.error('intl fallback sync:', country, err.message);
        })
      );
    }
    if (!options.length) {
      const fallback = quoteInternational(config, country);
      const baseOpt = {
        id: 'config-fallback',
        methodId: 'config-fallback',
        serviceCode: null,
        service: fallback.service,
        price: fallback.price,
        days: fallback.days,
        source: fallback.source || 'config',
        country,
        countryLabel: fallback.countryLabel,
        weightGrams,
        isHighestBid: false
      };
      options = [applyIntlSurcharge(config, baseOpt)];
    } else {
      options = applyIntlSurchargeToOptions(config, options);
    }
  } else {
    const cep = url.searchParams.get('cep');
    const declaredValue = Number(url.searchParams.get('valor')) || undefined;
    const addressParams = {
      cep,
      rua: url.searchParams.get('rua'),
      numero: url.searchParams.get('numero'),
      complemento: url.searchParams.get('complemento'),
      bairro: url.searchParams.get('bairro'),
      cidade: url.searchParams.get('cidade'),
      uf: url.searchParams.get('uf')
    };
    try {
      options = await quoteCorreiosOptions(env, config, cep, { weightGrams, declaredValue });
      const superfreteOptions = await quoteSuperfreteOptions(env, config, cep, { weightGrams, declaredValue });
      const motoboyOptions = await quoteMotoboyShippingOptions(env, config, addressParams, { weightGrams });
      const uberOptions = await quoteUberShippingOptions(env, config, addressParams, { weightGrams });
      options = dedupeShippingOptionsCheapest([
        ...options,
        ...superfreteOptions,
        ...motoboyOptions,
        ...uberOptions
      ]);
    } catch (err) {
      return json({ error: err.message }, 400, origin);
    }
  }

  return json({ options, country, weightGrams }, 200, origin);
}

async function registerCustomerUser(env, { nome, email, telefone, cpf, senha }) {
  const normalized = normalizeEmail(email);
  if (!normalized || !senha || senha.length < 6) {
    throw new Error('Informe e-mail e senha com pelo menos 6 caracteres.');
  }
  if (await getUserByEmail(env, normalized)) {
    throw new Error('Já existe uma conta com este e-mail. Faça login em Minha Conta.');
  }
  const creds = await hashPassword(senha);
  const user = {
    userId: crypto.randomUUID(),
    nome: String(nome || '').trim(),
    email: normalized,
    telefone: String(telefone || '').trim(),
    cpf: String(cpf || '').trim(),
    passwordSalt: creds.salt,
    passwordHash: creds.hash,
    createdAt: new Date().toISOString()
  };
  await saveUser(env, user);
  return user;
}

async function handleCustomerLogin(request, env, origin) {
  try {
    const ip = clientIp(request);
    const lock = await getLoginLock(env, ip, 'customer');
    if (lock?.lockedUntil && Date.now() < lock.lockedUntil) {
      return loginLockedResponse(lock, origin);
    }

    const body = await request.json().catch(() => ({}));
    const email = normalizeEmail(body.email);
    const senha = String(body.senha || '');
    const user = await getUserByEmail(env, email);
    if (!user || !(await verifyPassword(senha, user.passwordSalt, user.passwordHash))) {
      await recordLoginFailure(env, ip, 'customer');
      return json({ error: 'E-mail ou senha incorretos.' }, 401, origin);
    }
    await clearLoginFailures(env, ip, 'customer');
    try {
      await ensureTesterFlagFromEmail(env, user);
    } catch (err) {
      console.warn('tester flag:', err.message);
    }
    const token = await createCustomerSession(env, user.userId);
    return json({ ok: true, token, user: publicUserView(user) }, 200, origin);
  } catch (err) {
    console.error('customer login:', err?.message || err);
    if (err?.code === 'LOGIN_STORAGE_UNAVAILABLE' || isKvQuotaError(err)) {
      return json({
        error: 'Login temporariamente indisponível (limite diário do servidor). Tente novamente após 21h (horário de Brasília) ou continue a compra sem conta.'
      }, 503, origin);
    }
    return json({ error: 'Não foi possível entrar agora. Tente de novo em instantes.' }, 500, origin);
  }
}

async function handleCustomerRegister(request, env, origin) {
  const body = await request.json().catch(() => ({}));
  try {
    const user = await registerCustomerUser(env, body);
    try { await ensureTesterFlagFromEmail(env, user); } catch (_) { /* ignore */ }
    const token = await createCustomerSession(env, user.userId);
    return json({ ok: true, token, user: publicUserView(user) }, 200, origin);
  } catch (err) {
    console.error('customer register:', err?.message || err);
    if (err?.code === 'LOGIN_STORAGE_UNAVAILABLE' || isKvQuotaError(err)) {
      return json({
        error: 'Cadastro temporariamente indisponível (limite diário do servidor). Tente após 21h (horário de Brasília) ou continue sem criar conta.'
      }, 503, origin);
    }
    return json({ error: err.message || 'Não foi possível criar a conta.' }, 400, origin);
  }
}

async function handleCustomerSession(request, env, origin) {
  const userId = await getCustomerUserId(env, bearerToken(request));
  if (!userId) return json({ ok: false }, 401, origin);
  const user = await getUserById(env, userId);
  if (!user) return json({ ok: false }, 401, origin);
  return json({ ok: true, user: publicUserView(user) }, 200, origin);
}

async function handleCustomerLogout(request, env, origin) {
  const token = bearerToken(request);
  if (token) {
    await kvDeleteSafe(env, 'customerSession:' + token);
    try {
      await caches.default.delete(customerSessionCacheReq(token));
    } catch (_) { /* ignore */ }
  }
  return json({ ok: true }, 200, origin);
}

const PASSWORD_RESET_TTL = 3600; // 1 hora

function passwordResetLocaleFromRequest(request, bodyLocale) {
  const explicit = String(bodyLocale || '').toLowerCase();
  if (explicit === 'en' || explicit === 'it' || explicit === 'pt') return explicit;
  const lang = (request.headers.get('Accept-Language') || '').toLowerCase();
  if (lang.startsWith('it')) return 'it';
  if (lang.startsWith('en')) return 'en';
  const hay = `${request.headers.get('Origin') || ''} ${request.headers.get('Referer') || ''}`.toLowerCase();
  if (hay.includes('/it/') || hay.includes('lang=it')) return 'it';
  if (hay.includes('sensortattoofix.com') && !hay.includes('.com.br')) return 'en';
  return 'pt';
}

function passwordResetSiteBase(locale, config) {
  if (locale === 'en' || locale === 'it') return 'https://www.sensortattoofix.com';
  return String(config?.siteUrl || 'https://www.sensortattoofix.com.br').replace(/\/$/, '');
}

function passwordResetUrl(locale, config, token) {
  const base = passwordResetSiteBase(locale, config);
  const path = locale === 'it' ? '/it/minha-conta.html' : '/minha-conta.html';
  return `${base}${path}?reset=${encodeURIComponent(token)}`;
}

function passwordResetEmailCopy(locale, resetUrl) {
  if (locale === 'en') {
    return {
      subject: 'Reset your Sensor Tattoo Fix password',
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;line-height:1.5;color:#222">
        <h2 style="margin:0 0 12px">Password reset</h2>
        <p>We received a request to reset your Sensor Tattoo Fix account password.</p>
        <p><a href="${resetUrl}" style="display:inline-block;background:#ffc107;color:#111;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:8px">Choose a new password</a></p>
        <p style="font-size:13px;color:#666">This link expires in 1 hour. If you didn’t ask for this, you can ignore this email.</p>
        <p style="font-size:12px;color:#888;word-break:break-all">${resetUrl}</p>
      </div>`,
      text: `Reset your Sensor Tattoo Fix password:\n${resetUrl}\n\nThis link expires in 1 hour.`
    };
  }
  if (locale === 'it') {
    return {
      subject: 'Reimposta la password di Sensor Tattoo Fix',
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;line-height:1.5;color:#222">
        <h2 style="margin:0 0 12px">Reimposta password</h2>
        <p>Abbiamo ricevuto una richiesta per reimpostare la password del tuo account Sensor Tattoo Fix.</p>
        <p><a href="${resetUrl}" style="display:inline-block;background:#ffc107;color:#111;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:8px">Scegli una nuova password</a></p>
        <p style="font-size:13px;color:#666">Il link scade tra 1 ora. Se non hai richiesto tu, ignora questa email.</p>
        <p style="font-size:12px;color:#888;word-break:break-all">${resetUrl}</p>
      </div>`,
      text: `Reimposta la password di Sensor Tattoo Fix:\n${resetUrl}\n\nIl link scade tra 1 ora.`
    };
  }
  return {
    subject: 'Redefinir senha — Sensor Tattoo Fix',
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;line-height:1.5;color:#222">
      <h2 style="margin:0 0 12px">Redefinir senha</h2>
      <p>Recebemos um pedido para redefinir a senha da sua conta Sensor Tattoo Fix.</p>
      <p><a href="${resetUrl}" style="display:inline-block;background:#ffc107;color:#111;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:8px">Escolher nova senha</a></p>
      <p style="font-size:13px;color:#666">Este link expira em 1 hora. Se você não pediu isso, ignore este e-mail.</p>
      <p style="font-size:12px;color:#888;word-break:break-all">${resetUrl}</p>
    </div>`,
    text: `Redefina sua senha Sensor Tattoo Fix:\n${resetUrl}\n\nEste link expira em 1 hora.`
  };
}

/** Cooldown before issuing another reset email for the same account (avoids double-click). */
const FORGOT_PASSWORD_RESEND_COOLDOWN_MS = 3 * 60 * 1000;

async function enforceForgotPasswordRateLimit(env, ip) {
  const key = `forgotPw:${ip || 'unknown'}`;
  const raw = await env.STORE_KV.get(key);
  const now = Date.now();
  let state = raw ? JSON.parse(raw) : { count: 0, startedAt: now };
  if (now - (state.startedAt || 0) > 60 * 60 * 1000) {
    state = { count: 0, startedAt: now };
  }
  state.count = Number(state.count || 0) + 1;
  await kvPut(env, key, JSON.stringify(state), { expirationTtl: 60 * 60 });
  return state.count <= 8;
}

/** Per-email lock so parallel/double submits only send one message. */
async function claimForgotPasswordSend(env, email) {
  const key = `forgotPwEmail:${email}`;
  const raw = await env.STORE_KV.get(key);
  const now = Date.now();
  if (raw) {
    try {
      const prev = JSON.parse(raw);
      if (now - Number(prev.at || 0) < FORGOT_PASSWORD_RESEND_COOLDOWN_MS) {
        return false;
      }
    } catch (_) { /* replace */ }
  }
  await kvPut(env, key, JSON.stringify({ at: now }), {
    expirationTtl: Math.ceil(FORGOT_PASSWORD_RESEND_COOLDOWN_MS / 1000) + 30
  });
  return true;
}

async function recentPasswordResetStillValid(env, user) {
  const token = String(user.passwordResetToken || '').trim();
  if (!token) return false;
  const at = Date.parse(String(user.passwordResetAt || ''));
  if (!Number.isFinite(at) || Date.now() - at > FORGOT_PASSWORD_RESEND_COOLDOWN_MS) return false;
  const raw = await env.STORE_KV.get('passwordReset:' + token);
  return Boolean(raw);
}

async function handleForgotPassword(request, env, origin) {
  const body = await request.json().catch(() => ({}));
  const email = normalizeEmail(body.email);
  const locale = passwordResetLocaleFromRequest(request, body.locale);
  const okPayload = {
    ok: true,
    message: locale === 'en'
      ? 'If an account exists for this email, we sent a reset link.'
      : locale === 'it'
        ? 'Se esiste un account con questa email, abbiamo inviato un link di reset.'
        : 'Se existir uma conta com este e-mail, enviamos um link para redefinir a senha.'
  };

  if (!email) return json({ error: locale === 'en' ? 'Enter your email.' : locale === 'it' ? 'Inserisci la tua email.' : 'Informe o e-mail.' }, 400, origin);

  const ip = clientIp(request);
  if (!(await enforceForgotPasswordRateLimit(env, ip))) {
    return json({
      error: locale === 'en'
        ? 'Too many requests. Try again later.'
        : locale === 'it'
          ? 'Troppe richieste. Riprova più tardi.'
          : 'Muitas tentativas. Tente de novo em alguns minutos.'
    }, 429, origin);
  }

  const user = await getUserByEmail(env, email);
  // Always return the same message (do not reveal whether the email exists).
  if (!user) return json(okPayload, 200, origin);

  // Double-click / impatient resend: keep the first valid link, do not email again.
  if (await recentPasswordResetStillValid(env, user)) {
    return json(okPayload, 200, origin);
  }
  if (!(await claimForgotPasswordSend(env, email))) {
    return json(okPayload, 200, origin);
  }

  const config = await getConfig(env);
  const prev = String(user.passwordResetToken || '').trim();
  if (prev) await kvDelete(env, 'passwordReset:' + prev);

  const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
  await kvPut(env, 
    'passwordReset:' + token,
    JSON.stringify({
      userId: user.userId,
      email: user.email,
      locale,
      createdAt: new Date().toISOString()
    }),
    { expirationTtl: PASSWORD_RESET_TTL }
  );
  user.passwordResetToken = token;
  user.passwordResetAt = new Date().toISOString();
  await saveUser(env, user);

  const resetUrl = passwordResetUrl(locale, config, token);
  const copy = passwordResetEmailCopy(locale, resetUrl);
  const sent = await notifyEmail(env, config, user.email, copy.subject, {
    Ação: 'Recuperação de senha',
    Link: resetUrl
  }, customerSupportEmail({ checkoutLocale: locale }, config), {
    html: copy.html,
    text: copy.text
  });
  if (!sent?.ok) {
    console.error('Forgot password email failed:', user.email, sent);
    // Allow immediate retry if send failed.
    await kvDelete(env, `forgotPwEmail:${email}`);
    return json({
      error: locale === 'en'
        ? 'Could not send the email. Try again or contact support.'
        : locale === 'it'
          ? 'Impossibile inviare l\'email. Riprova o contatta il supporto.'
          : 'Não foi possível enviar o e-mail. Tente de novo ou fale com o suporte.'
    }, 502, origin);
  }

  return json(okPayload, 200, origin);
}

async function handleResetPassword(request, env, origin) {
  const body = await request.json().catch(() => ({}));
  const token = String(body.token || '').trim();
  const senha = String(body.senha || body.password || '');
  const locale = passwordResetLocaleFromRequest(request, body.locale);

  if (!token) {
    return json({
      error: locale === 'en' ? 'Invalid or expired reset link.' : locale === 'it' ? 'Link non valido o scaduto.' : 'Link inválido ou expirado.'
    }, 400, origin);
  }
  if (!senha || senha.length < 6) {
    return json({
      error: locale === 'en' ? 'Password must be at least 6 characters.' : locale === 'it' ? 'La password deve avere almeno 6 caratteri.' : 'Senha mínima: 6 caracteres.'
    }, 400, origin);
  }

  const raw = await env.STORE_KV.get('passwordReset:' + token);
  if (!raw) {
    return json({
      error: locale === 'en' ? 'Invalid or expired reset link.' : locale === 'it' ? 'Link non valido o scaduto.' : 'Link inválido ou expirado.'
    }, 400, origin);
  }

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return json({
      error: locale === 'en' ? 'Invalid or expired reset link.' : locale === 'it' ? 'Link non valido o scaduto.' : 'Link inválido ou expirado.'
    }, 400, origin);
  }

  const user = await getUserById(env, payload.userId);
  if (!user || user.passwordResetToken !== token) {
    return json({
      error: locale === 'en' ? 'Invalid or expired reset link.' : locale === 'it' ? 'Link non valido o scaduto.' : 'Link inválido ou expirado.'
    }, 400, origin);
  }

  const creds = await hashPassword(senha);
  user.passwordSalt = creds.salt;
  user.passwordHash = creds.hash;
  user.passwordResetToken = null;
  user.passwordResetAt = null;
  user.updatedAt = new Date().toISOString();
  await saveUser(env, user);
  await kvDelete(env, 'passwordReset:' + token);

  // Invalidate existing sessions by rotating: delete this user's sessions is hard without index;
  // create a fresh session for convenience after reset.
  const sessionToken = await createCustomerSession(env, user.userId);
  return json({
    ok: true,
    token: sessionToken,
    user: publicUserView(user),
    message: locale === 'en'
      ? 'Password updated. You are signed in.'
      : locale === 'it'
        ? 'Password aggiornata. Hai effettuato l\'accesso.'
        : 'Senha atualizada. Você já está logado.'
  }, 200, origin);
}

async function listAllCustomers(env, max = 500) {
  const users = [];
  let cursor;
  do {
    const page = await env.STORE_KV.list({ prefix: 'user:email:', limit: 100, cursor });
    for (const { name } of page.keys) {
      const userId = await env.STORE_KV.get(name);
      if (!userId) continue;
      const user = await getUserById(env, userId);
      if (!user) continue;
      const fromD1 = await d1OrdersForUser(env, userId);
      const orderIds = fromD1.length
        ? fromD1.map((o) => o.orderId)
        : JSON.parse((await env.STORE_KV.get('user:' + userId + ':orders')) || '[]');
      users.push({
        userId: user.userId,
        nome: user.nome,
        email: user.email,
        telefone: user.telefone,
        cpf: user.cpf || '',
        createdAt: user.createdAt || null,
        orderCount: orderIds.length,
        isTester: !!user.isTester,
        username: user.username || '',
        avatarId: user.avatarId || ''
      });
      if (users.length >= max) {
        users.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
        return users;
      }
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  users.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  return users;
}



async function deleteCustomerUser(env, userId) {
  const user = await getUserById(env, userId);
  if (!user) return false;
  await kvDelete(env, 'user:' + userId);
  if (user.email) await kvDelete(env, 'user:email:' + normalizeEmail(user.email));
  if (user.username) await kvDelete(env, 'user:username:' + String(user.username).toLowerCase());
  await kvDelete(env, 'user:' + userId + ':orders');
  if (user.passwordResetToken) {
    await kvDelete(env, 'passwordReset:' + user.passwordResetToken);
  }
  return true;
}

async function handleAdminCustomerDelete(request, env, origin, userId) {
  if (!(await isValidSession(env, bearerToken(request)))) {
    return json({ error: 'Não autorizado.' }, 401, origin);
  }
  const id = String(userId || '').trim();
  if (!id) return json({ error: 'ID inválido.' }, 400, origin);
  const user = await getUserById(env, id);
  if (!user) return json({ error: 'Cliente não encontrado.' }, 404, origin);
  await deleteCustomerUser(env, id);
  return json({
    ok: true,
    deleted: true,
    userId: id,
    email: user.email || null
  }, 200, origin);
}

async function handleAdminCustomerPatch(request, env, origin, userId) {
  if (!(await isValidSession(env, bearerToken(request)))) {
    return json({ error: 'Não autorizado.' }, 401, origin);
  }
  const user = await getUserById(env, userId);
  if (!user) return json({ error: 'Cliente não encontrado.' }, 404, origin);
  const body = await request.json();
  if (body.isTester !== undefined) {
    user.isTester = !!body.isTester;
    if (user.isTester) user.testerSince = user.testerSince || new Date().toISOString();
    else delete user.testerSince;
  }
  user.updatedAt = new Date().toISOString();
  await saveUser(env, user);
  return json({ ok: true, user: publicUserView(user) }, 200, origin);
}

async function handleAdminCustomers(request, env, origin) {
  if (!(await isValidSession(env, bearerToken(request)))) {
    return json({ error: 'Não autorizado.' }, 401, origin);
  }
  const customers = await listAllCustomers(env);
  const testers = customers.filter((c) => c.isTester);
  const clients = customers.filter((c) => !c.isTester);
  return json({
    customers,
    clients,
    testers,
    total: customers.length,
    totals: { all: customers.length, clients: clients.length, testers: testers.length },
    adminPanel: {
      username: env.ADMIN_USERNAME || 'admin',
      kind: 'panel',
      note: 'Login do painel /admin.html (não é conta de cliente da loja).'
    },
    checkedAt: new Date().toISOString()
  }, 200, origin);
}

async function handleCustomerOrders(request, env, origin) {
  const userId = await getCustomerUserId(env, bearerToken(request));
  if (!userId) return json({ error: 'Não autorizado.' }, 401, origin);
  const fromD1 = await d1OrdersForUser(env, userId);
  let orders = [];
  if (fromD1.length) {
    orders = fromD1.filter((order) => order && order.userId === userId).slice(0, 100).map((order) =>
      publicOrderView(order, {
        includePayment: order.status === 'pending_payment',
        includeResumeToken: order.status === 'pending_payment'
      })
    );
  } else {
    const ids = JSON.parse((await env.STORE_KV.get('user:' + userId + ':orders')) || '[]');
    for (const orderId of ids.slice(0, 100)) {
      const order = await getOrder(env, orderId);
      if (order && order.userId === userId) {
        orders.push(publicOrderView(order, {
          includePayment: order.status === 'pending_payment',
          includeResumeToken: order.status === 'pending_payment'
        }));
      }
    }
  }
  return json({ orders }, 200, origin);
}

async function handleCustomerUpdateProfile(request, env, origin) {
  const userId = await getCustomerUserId(env, bearerToken(request));
  if (!userId) return json({ error: 'Não autorizado.' }, 401, origin);
  const user = await getUserById(env, userId);
  if (!user) return json({ error: 'Conta não encontrada.' }, 404, origin);

  const body = await request.json();

  if (body.nome !== undefined) {
    const nome = String(body.nome || '').trim();
    if (!nome) return json({ error: 'Informe o nome.' }, 400, origin);
    user.nome = nome;
  }
  if (body.telefone !== undefined) {
    const telefone = String(body.telefone || '').trim();
    if (!telefone) return json({ error: 'Informe o WhatsApp.' }, 400, origin);
    user.telefone = telefone;
  }
  if (body.cpf !== undefined) {
    user.cpf = String(body.cpf || '').trim();
  }
  if (body.address !== undefined) {
    user.address = normalizeUserAddress(body.address);
  }

  const senhaNova = String(body.senhaNova || '').trim();
  if (senhaNova) {
    const senhaAtual = String(body.senhaAtual || '').trim();
    if (!senhaAtual) return json({ error: 'Informe a senha atual para alterá-la.' }, 400, origin);
    if (senhaNova.length < 6) return json({ error: 'Nova senha: mínimo 6 caracteres.' }, 400, origin);
    if (!(await verifyPassword(senhaAtual, user.passwordSalt, user.passwordHash))) {
      return json({ error: 'Senha atual incorreta.' }, 401, origin);
    }
    const creds = await hashPassword(senhaNova);
    user.passwordSalt = creds.salt;
    user.passwordHash = creds.hash;
  }

  user.updatedAt = new Date().toISOString();
  await saveUser(env, user);
  return json({ ok: true, user: publicUserView(user) }, 200, origin);
}

async function resolveCheckoutUser(env, request, body) {
  const customerToken = bearerToken(request) || String(body.customerToken || '').trim();
  let userId = await getCustomerUserId(env, customerToken);
  let newToken = null;

  if (!userId && body.criarConta && body.senha) {
    const user = await registerCustomerUser(env, {
      nome: body.nome,
      email: body.email,
      telefone: body.telefone,
      cpf: body.cpf,
      senha: body.senha
    });
    userId = user.userId;
    newToken = await createCustomerSession(env, userId);
  }

  return { userId, newToken };
}

async function handleCreateOrder(request, env, origin, ctx) {
  const body = await request.json();
  const config = await getPublicConfig(env);
  let frete = Number(body.frete) || 0;
  let items;
  try {
    items = resolveOrderItems(config, body);
  } catch (err) {
    return json({ error: err.message }, 400, origin);
  }
  const valorProdutoBruto = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  let couponDiscount = 0;
  let couponRecord = null;
  const couponCodeRaw = String(body.couponCode || '').trim();
  if (couponCodeRaw) {
    couponRecord = findActiveCoupon(config, couponCodeRaw);
    if (!couponRecord) {
      return json({ error: 'Cupom inválido ou inativo.' }, 400, origin);
    }
    couponDiscount = computeCouponDiscount(valorProdutoBruto, couponRecord.percent).discount;
  }
  const valorProduto = Math.max(0, valorProdutoBruto - couponDiscount);
  let couponCommissionPercent = 0;
  let couponCommissionAmount = 0;
  // Comissão só existe com e-mail de comissionado; senão é cupom só de desconto (loja).
  const commissionerEmail = couponRecord
    ? String(couponRecord.email || '').trim().toLowerCase()
    : '';
  if (couponRecord && commissionerEmail.includes('@')) {
    const rawComm = couponRecord.commissionPercent;
    const commPct = rawComm == null || rawComm === ''
      ? COMMISSIONER_COMMISSION_PERCENT
      : Number(rawComm) || 0;
    const comm = computeCouponCommission(valorProduto, commPct);
    couponCommissionPercent = comm.percent;
    couponCommissionAmount = comm.amount;
  }
  const checkoutLocale = String(body.checkoutLocale || 'pt').toLowerCase();
  const intlEmbeddedCheckout = (isComSiteRequest(request) || body.intlEmbedded === true)
    && isIntlCheckoutLocale(checkoutLocale);

  // .com / EN-IT: always document mail (lens only) — never kit/parcel choice.
  if (isComSiteRequest(request) || isIntlCheckoutLocale(checkoutLocale)) {
    body.shipmentType = 'documento';
    body.internationalLensOnly = true;
    if (String(body.shippingMethodId || '').includes('encomenda')) {
      body.shippingMethodId = 'int-documento';
    }
  }

  // Brown-class bug: empty/missing paisCode became BR → PIX for a US address.
  let paisCode = String(body.paisCode || '').trim().toUpperCase();
  if (paisCode === 'XX' || paisCode === 'T1') paisCode = '';
  const shippingLooksIntl = !!(
    body.internationalLensOnly
    || body.shipmentType === 'documento'
    || body.shipmentType === 'encomenda'
    || String(body.shippingMethodId || '').startsWith('int-')
    || /internacional|international/i.test(String(body.pais || ''))
  );
  const forceIntlPay = intlEmbeddedCheckout || (isIntlCheckoutLocale(checkoutLocale) && shippingLooksIntl);
  let isIntl = (paisCode && paisCode !== 'BR') || forceIntlPay || shippingLooksIntl;
  if (isIntl && (!paisCode || paisCode === 'BR')) {
    paisCode = 'OTHER';
  }
  if (!paisCode) paisCode = 'BR';
  isIntl = paisCode !== 'BR';

  const uberMethod = !isIntl && getEnabledShippingMethods(config, 'BR').find(
    (m) => isUberMethod(m) && (m.id === body.shippingMethodId || body.shippingProvider === 'uber')
  );
  const motoboyMethod = !isIntl && getMotoboyShippingMethods(config).find(
    (m) => m.id === body.shippingMethodId || body.shippingProvider === 'motoboy'
  );
  const superfreteMethod = !isIntl ? findSuperfreteMethod(config, body) : null;
  let uberQuoteId = body.uberQuoteId || null;
  let motoboyDistanceKm = null;
  let superfreteService = body.superfreteService || null;
  let superfretePackage = body.superfretePackage || null;
  let superfreteQuoteMethodId = body.shippingMethodId || null;

  // Conta testadora / e-mail de teste → depois vira R$ 0,01; não travar em micro-diferença de frete.
  let testerCheckout = isSelfTestCustomerEmail(body.email);
  if (!testerCheckout) {
    try {
      const tok = bearerToken(request) || String(body.customerToken || '').trim();
      const uid = await getCustomerUserId(env, tok);
      if (uid) {
        const u = await getUserById(env, uid);
        testerCheckout = isTesterUser(u);
      }
    } catch (_) { /* ignore */ }
  }

  if (superfreteMethod) {
    if (!superfreteConfigured(env)) {
      return json({ error: 'Super Frete indisponível no momento.' }, 400, origin);
    }
    const destCep = body.cep;
    if (!destCep || String(destCep).replace(/\D/g, '').length !== 8) {
      return json({ error: 'Informe um CEP válido para Super Frete.' }, 400, origin);
    }
    try {
      const quotes = await quoteSuperfreteOptions(env, config, destCep, {
        weightGrams: shippingWeightGrams(config),
        declaredValue: Number(body.valorProduto) || undefined
      });
      const wantedSid = asSuperfreteServiceId(body.superfreteService)
        || superfreteServiceId(superfreteMethod);
      const quote = quotes.find((q) => q.methodId === superfreteMethod.id)
        || (wantedSid ? quotes.find((q) => Number(q.superfreteService) === wantedSid) : null)
        || (Number.isFinite(frete) && frete > 0
          ? quotes.find((q) => Math.abs(Number(q.price) - frete) <= 0.51)
          : null);
      if (!quote) {
        return json({
          error: `Super Frete sem cotação de ${superfreteMethod.label || 'frete'} para este CEP. Escolha outro frete.`
        }, 400, origin);
      }
      if (!testerCheckout && Math.abs(Number(quote.price) - frete) > 0.51) {
        return json({ error: 'Valor do frete Super Frete desatualizado. Recalcule o frete.' }, 400, origin);
      }
      frete = quote.price;
      superfreteService = quote.superfreteService || wantedSid || superfreteServiceId(superfreteMethod);
      superfretePackage = quote.superfretePackage || superfretePackage;
      superfreteQuoteMethodId = quote.methodId || superfreteMethod.id;
    } catch (err) {
      return json({ error: 'Super Frete indisponível: ' + err.message }, 400, origin);
    }
  } else if (motoboyMethod) {
    if (!motoboyOperational(config)) {
      return json({ error: 'Envio particular (motoboy) indisponível no momento.' }, 400, origin);
    }
    const destCep = body.cep;
    if (!destCep || String(destCep).replace(/\D/g, '').length !== 8) {
      return json({ error: 'Informe um CEP válido para envio particular.' }, 400, origin);
    }
    try {
      const quote = await computeMotoboyQuote(config, destCep, body);
      if (!quote) {
        return json({ error: 'Endereço fora da área de entrega particular. Escolha outro frete.' }, 400, origin);
      }
      if (Math.abs(quote.price - frete) > 0.05) {
        return json({ error: 'Valor do frete particular desatualizado. Recalcule o frete.' }, 400, origin);
      }
      frete = quote.price;
      motoboyDistanceKm = quote.roadKm;
    } catch (err) {
      return json({ error: 'Envio particular indisponível: ' + err.message }, 400, origin);
    }
  } else if (uberMethod) {
    if (!uberConfigured(env)) {
      return json({ error: 'Entrega Uber indisponível no momento.' }, 400, origin);
    }
    const dropoff = dropoffPartsFromParams(body);
    if (!hasUberDropoffAddress(dropoff)) {
      return json({ error: 'Informe rua, cidade e UF para entrega Uber.' }, 400, origin);
    }
    try {
      const quote = await requestUberQuote(env, config, dropoff);
      if (!quote) {
        return json({ error: 'Uber não atende este endereço. Escolha outro frete.' }, 400, origin);
      }
      if (Math.abs(quote.price - frete) > 0.05) {
        return json({ error: 'Valor do frete Uber desatualizado. Recalcule o frete.' }, 400, origin);
      }
      frete = quote.price;
      uberQuoteId = quote.uberQuoteId;
    } catch (err) {
      return json({ error: 'Uber indisponível: ' + err.message }, 400, origin);
    }
  }

  let billingType;
  let pagamentoLabel;
  const paypalOnlyIntl = isIntl && isIntlCheckoutLocale(checkoutLocale) && !intlEmbeddedCheckout;
  if (isIntl || forceIntlPay) {
    // .com EN/IT or intl shipping: PayPal/Stripe only — never BR PIX.
    if (intlEmbeddedCheckout || forceIntlPay) {
      const wantStripe = body.pagamento === 'STRIPE' && stripeLiveReady(env);
      if (wantStripe) {
        billingType = 'STRIPE';
        pagamentoLabel = 'Card / Apple Pay / Google Pay';
      } else {
        if (!isInternationalPayPalAvailable(config)) {
          return json({ error: 'PayPal temporarily unavailable. Try again shortly.' }, 400, origin);
        }
        billingType = 'PAYPAL';
        pagamentoLabel = 'PayPal';
      }
    } else if (paypalOnlyIntl) {
      if (!isInternationalPayPalAvailable(config)) {
        return json({ error: 'PayPal temporariamente indisponível. Tente novamente em breve.' }, 400, origin);
      }
      billingType = 'PAYPAL';
      pagamentoLabel = 'PayPal';
    } else if (body.pagamento === 'PAYPAL') {
      if (!isInternationalPayPalAvailable(config)) {
        return json({ error: 'PayPal temporariamente indisponível. Use PIX ou tente novamente em breve.' }, 400, origin);
      }
      billingType = 'PAYPAL';
      pagamentoLabel = 'PayPal';
    } else if (body.pagamento === 'PIX') {
      billingType = 'PIX';
      pagamentoLabel = 'PIX';
    } else if (body.pagamento === 'CARTAO') {
      if (!mercadoPagoToken(env)) {
        return json({ error: 'Cartão internacional indisponível. Use PIX ou PayPal.' }, 400, origin);
      }
      billingType = 'MP_CHECKOUT';
      pagamentoLabel = 'Cartão internacional';
    } else {
      return json({ error: 'Escolha cartão, PayPal ou PIX para envio internacional.' }, 400, origin);
    }
  } else {
    if (body.pagamento === 'PAYPAL') {
      if (!isBrazilPayPalAvailable(config)) {
        return json({ error: 'PayPal temporariamente indisponível. Use PIX ou cartão.' }, 400, origin);
      }
      billingType = 'PAYPAL';
      pagamentoLabel = 'PayPal';
    } else if (body.pagamento === 'CARTAO') {
      billingType = 'CREDIT_CARD';
      pagamentoLabel = 'Cartão de crédito';
    } else if (body.pagamento === 'STRIPE') {
      return json({ error: 'Pagamento internacional indisponível neste checkout. Selecione o país de entrega.' }, 400, origin);
    } else {
      billingType = 'PIX';
      pagamentoLabel = 'PIX';
    }
  }
  const needsWatch = orderRequiresSmartwatch(items);

  let paypalFee = 0;
  // Do not pass PayPal processing fees to the buyer on any storefront (.com.br or .com).
  // Embedded PayPal does not require a buyer surcharge.

  let checkoutUser;
  try {
    checkoutUser = await resolveCheckoutUser(env, request, body);
  } catch (err) {
    return json({ error: err.message }, 400, origin);
  }

  const order = {
    orderId: generateOrderId(),
    accessToken: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    status: 'pending_payment',
    userId: checkoutUser.userId || null,
    nome: body.nome,
    email: body.email,
    telefone: body.telefone,
    cpf: body.cpf,
    smartwatch: needsWatch ? (body.smartwatch || 'Não informado') : 'N/A',
    pais: body.pais || (isIntl ? 'Internacional' : 'Brasil'),
    paisCode,
    cep: body.cep || '',
    rua: body.rua || '',
    numero: body.numero || '',
    complemento: body.complemento || '',
    bairro: body.bairro || '',
    cidade: body.cidade || '',
    uf: body.uf || '',
    endereco: body.endereco,
    observacoes: body.observacoes || '',
    items,
    produto: items.map((i) => `${i.qty}x ${i.name}`).join(', '),
    valorProdutoOriginal: couponDiscount ? valorProdutoBruto : undefined,
    valorProduto,
    couponCode: couponRecord ? normalizeCouponCode(couponRecord.code) : undefined,
    couponPercent: couponRecord ? Number(couponRecord.percent) || 0 : undefined,
    couponDiscount: couponDiscount || undefined,
    couponCommissionerEmail: couponRecord ? String(couponRecord.email || '').trim().toLowerCase() : undefined,
    couponCommissionerName: couponRecord
      ? (String(couponRecord.name || '').trim() || normalizeCouponCode(couponRecord.code))
      : undefined,
    couponCommissionPercent: couponRecord ? couponCommissionPercent : undefined,
    couponCommissionAmount: couponRecord ? couponCommissionAmount : undefined,
    frete,
    paypalFee: paypalFee > 0 ? paypalFee : undefined,
    displayCurrency: isIntl ? currencyForCountryCode(body.paisCode) : 'BRL',
    total: valorProduto + frete + paypalFee,
    shippingService: superfreteMethod
      ? (superfreteServiceLabel(superfreteService) || body.shippingService || 'Frete')
      : (body.shippingService || 'Mini Envios'),
    shippingServiceCode: superfreteMethod && superfreteService
      ? String(superfreteService)
      : (body.shippingServiceCode || null),
    shippingMethodId: superfreteMethod
      ? (superfreteQuoteMethodId || superfreteMethod.id || body.shippingMethodId || null)
      : (body.shippingMethodId || null),
    shippingProvider: uberMethod ? 'uber'
      : (motoboyMethod ? 'motoboy'
        : (superfreteMethod ? 'superfrete' : (body.shippingProvider || null))),
    uberQuoteId: uberQuoteId || null,
    motoboyDistanceKm: motoboyDistanceKm || null,
    superfreteService: superfreteMethod ? (superfreteService || null) : (body.superfreteService || null),
    superfretePackage: superfretePackage || null,
    shippingDays: body.shippingDays || null,
    shipmentType: body.shipmentType || null,
    internationalLensOnly: !!body.internationalLensOnly,
    internationalProductNote: body.internationalProductNote || '',
    pagamento: pagamentoLabel,
    checkoutLocale
  };

  if (intlEmbeddedCheckout && (billingType === 'PAYPAL' || billingType === 'STRIPE')) {
    try {
      const foreignCur = intlChargeCurrencyForLocale(checkoutLocale);
      const charge = await intlForeignCharge(order, env, config, items, foreignCur);
      order.chargeCurrency = foreignCur;
      order.chargeAmount = charge.amount;
      order.chargeFxRate = charge.fxRate;
      order.displayCurrency = foreignCur;
    } catch (err) {
      console.warn('Intl charge:', err.message);
    }
  }

  if (applySelfTestPixPricing(order, config, env, billingType)) {
    console.log('PIX self-test produção:', order.orderId, SELF_TEST_BRL_AMOUNT);
  }
  if (await applyTesterAccountPricing(order, env)) {
    console.log('Tester account pricing:', order.orderId, SELF_TEST_BRL_AMOUNT, order.email);
  }
  if (applySelfTestPayPalPricing(order, env, billingType)) {
    console.log('PayPal self-test produção:', order.orderId, SELF_TEST_BRL_AMOUNT);
  }
  if (applySelfTestStripePricing(order, env, billingType)) {
    console.log('Stripe self-test produção:', order.orderId, SELF_TEST_STRIPE_USD_AMOUNT);
  }
  // BR → R$ 0.01 · Abroad PayPal → US$ 0.01 · Abroad Stripe → US$ 0.10
  const intlSelfTestUsd = !!(isSelfTestOrder(order) && intlEmbeddedCheckout
    && (billingType === 'PAYPAL' || billingType === 'STRIPE'));
  applySelfTestChargeCurrency(order, { intlUsd: intlSelfTestUsd, billingType });
  if (intlSelfTestUsd) {
    console.log('Intl self-test USD charge:', order.orderId, order.chargeAmount, billingType);
  }

  let payment = null;
  const hasAsaas = !!asaasApiKey(env);
  const hasMp = !!mercadoPagoToken(env);

  try {
    if (billingType === 'PAYPAL' && !intlEmbeddedCheckout) {
      payment = await createPayPalCheckout(env, order, config, request);
    } else if (billingType === 'MP_CHECKOUT') {
      payment = await createMercadoPagoCheckoutPro(env, order, config, request);
    } else if (billingType === 'PIX') {
      if (hasMp || hasAsaas) {
        payment = await createBrPixPayment(env, order, config);
      }
    } else if (billingType === 'CREDIT_CARD') {
      payment = await createBrCreditCardPayment(env, order, config, request);
    }
  } catch (err) {
    console.error('Payment:', err.message);
    let msg;
    if (billingType === 'CREDIT_CARD') msg = 'Cartão indisponível: ' + err.message;
    else if (billingType === 'PAYPAL') msg = 'PayPal indisponível: ' + err.message;
    else if (billingType === 'MP_CHECKOUT') msg = 'Cartão internacional indisponível: ' + err.message;
    else msg = 'PIX indisponível: ' + err.message;
    if (billingType === 'CREDIT_CARD' || billingType === 'PAYPAL' || billingType === 'MP_CHECKOUT' || hasMp || hasAsaas) {
      return json({ error: msg }, 400, origin);
    }
  }

  if (payment) {
    order.paymentProvider = payment.provider || 'asaas';
    if (payment.provider === 'asaas') order.asaasPaymentId = payment.paymentId;
    if (payment.provider === 'mercadopago') order.mercadoPagoPaymentId = payment.paymentId;
    order.autoConfirm = payment.autoConfirm !== false;
    attachPaymentToOrder(order, payment, config);
  } else if (intlEmbeddedCheckout && (billingType === 'PAYPAL' || billingType === 'STRIPE')) {
    order.paymentProvider = billingType === 'STRIPE' ? 'stripe' : 'paypal';
    order.autoConfirm = true;
    order.intlEmbedded = true;
  } else if (billingType === 'CREDIT_CARD') {
    return json({ error: 'Cartão indisponível. Configure Asaas ou Mercado Pago.' }, 400, origin);
  } else if (hasAsaas && !hasMp) {
    return json({ error: 'Não foi possível criar cobrança no Asaas. Verifique chave PIX cadastrada no painel.' }, 400, origin);
  } else if (billingType === 'PIX') {
    order.paymentProvider = 'static_pix';
    order.autoConfirm = false;
    attachPaymentToOrder(order, { provider: 'static_pix', billingType: 'PIX', autoConfirm: false }, config);
  }

  await saveOrder(env, order);

  // Cart-abandonment email is delayed (~15 min) via cron — do not send recovery mail on create.
  const emailWork = Promise.all([
    notifyShop(env, config, config.formsubmit.subject, {
      Pedido: order.orderId, Status: order.status, Nome: order.nome,
      'E-mail': order.email, Telefone: order.telefone,
      País: order.pais, Endereço: order.endereco, Pagamento: order.pagamento,
      Produto: formatBRL(order.valorProdutoOriginal ?? order.valorProduto),
      ...(order.couponDiscount ? {
        'Desconto cupom': formatBRL(order.couponDiscount),
        'Produto c/ desconto': formatBRL(order.valorProduto)
      } : {}),
      Frete: formatBRL(order.frete),
      ...(order.paypalFee ? { 'Taxa PayPal': formatBRL(order.paypalFee) } : {}),
      Total: formatBRL(order.total),
      Envio: order.shippingService || '—',
      ...orderCouponEmailFields(order),
      ...orderIntlProductFields(order),
      ...(order.selfTestPix ? {
        'Teste PIX produção': `R$ ${SELF_TEST_PIX_AMOUNT.toFixed(2)} — endereço igual ao remetente`,
        'Total original': formatBRL(order.totalOriginal || 0)
      } : {}),
      ...(order.selfTestPayPal ? {
        'Teste PayPal produção': order.chargeCurrency === 'USD'
          ? `US$ ${SELF_TEST_USD_AMOUNT.toFixed(2)} — pedido internacional`
          : `R$ ${SELF_TEST_BRL_AMOUNT.toFixed(2)} — pedido Brasil`,
        'Total original': formatBRL(order.totalOriginal || 0)
      } : {}),
      ...(order.selfTestStripe ? {
        'Teste Stripe produção': `US$ ${SELF_TEST_STRIPE_USD_AMOUNT.toFixed(2)} — mínimo Stripe conta BR`,
        'Total original': formatBRL(order.totalOriginal || 0)
      } : {}),
      ...(order.selfTestTester && !order.selfTestPayPal && !order.selfTestStripe && !order.selfTestPix ? {
        'Teste conta testadora': order.chargeCurrency === 'USD'
          ? `US$ ${Number(order.chargeAmount || SELF_TEST_USD_AMOUNT).toFixed(2)} — pedido internacional`
          : `R$ ${SELF_TEST_BRL_AMOUNT.toFixed(2)} — pedido Brasil`,
        'Total original': formatBRL(order.totalOriginal || 0)
      } : {}),
      ...orderWatchEmailFields(order)
    }),
    notifyWhatsApp(env, config, order, 'order')
  ]).then((results) => {
    const shopResult = results[0];
    if (shopResult && !shopResult.ok) console.error('E-mail pedido falhou: loja', JSON.stringify(shopResult));
  });

  if (ctx) ctx.waitUntil(emailWork);

  if (ctx && billingType === 'PIX' && payment && isMpSandbox(env)) {
    ctx.waitUntil(maybeSandboxAutoConfirmPix(env, order.orderId, payment));
  }

  const response = {
    order: publicOrderView(order),
    accessToken: order.accessToken,
    payment: payment || { provider: 'static_pix', billingType: 'PIX', autoConfirm: false }
  };
  if (checkoutUser.newToken) response.customerToken = checkoutUser.newToken;
  return json(response, 200, origin);
}

async function handlePaymentConfirmed(env, order, payment) {
  const fresh = await getOrder(env, order.orderId);
  if (!fresh) return;
  // Already fully handled (paid + shop/customer mail claimed)
  if (fresh.paidEmailsSentAt || fresh.status === 'paid') return;

  order = fresh;
  order.status = 'paid';
  order.paidAt = new Date().toISOString();
  // Race claim: concurrent webhooks (Asaas RECEIVED+CONFIRMED, PayPal capture+webhook)
  // both may pass the status check; only the last lock writer may send e-mails.
  const notifyLock = crypto.randomUUID();
  order.paidNotifyLock = notifyLock;
  const value = payment?.value ?? order.total;
  if (payment?.id) {
    order.paymentProof = {
      provider: payment.provider || order.paymentProvider || 'asaas',
      paymentId: payment.id,
      value,
      billingType: payment.billingType
    };
  } else {
    order.paymentProof = {
      provider: payment?.provider || order.paymentProvider || 'manual',
      value,
      confirmedBy: payment?.confirmedBy || 'admin',
      confirmedAt: order.paidAt
    };
  }
  await saveOrder(env, order);

  const claimed = await getOrder(env, order.orderId);
  if (!claimed || claimed.paidNotifyLock !== notifyLock || claimed.paidEmailsSentAt) {
    return;
  }
  claimed.paidEmailsSentAt = new Date().toISOString();
  await saveOrder(env, claimed);
  order = claimed;

  const config = await getConfig(env);

  try {
    await decrementOrderStock(env, order);
    if (order.stockDecremented) await saveOrder(env, order);
  } catch (err) {
    console.error('Stock decrement:', order.orderId, err.message);
  }

  if (shouldDispatchUberDelivery(order)) {
    try {
      const uber = await createUberDeliveryForOrder(env, config, order);
      Object.assign(order, uber);
      await saveOrder(env, order);
    } catch (err) {
      console.error('Uber dispatch:', order.orderId, err.message);
      order.uberDispatchError = err.message;
      await saveOrder(env, order);
    }
  } else if (isUberOrder(order) && isSelfTestOrder(order)) {
    order.uberDispatchSkipped = `Pedido de teste (${formatBRL(order.total)}) — corrida Uber não criada.`;
    console.log('Uber dispatch ignorado — pedido de teste:', order.orderId, formatBRL(order.total));
    await saveOrder(env, order);
  } else if (isMotoboyOrder(order)) {
    try {
      const courierMails = await notifyMotoboyCouriers(env, config, order);
      order.motoboyNotifiedAt = new Date().toISOString();
      order.motoboyCourierEmails = courierMails.filter((r) => r.ok).map((r) => r.email);
      await saveOrder(env, order);
    } catch (err) {
      console.error('Motoboy notify:', order.orderId, err.message);
      order.motoboyNotifyError = err.message;
      await saveOrder(env, order);
    }
  } else if (isSuperfreteOrder(order)) {
    if (isSelfTestOrder(order)) {
      order.superfreteSkipped = `Pedido de teste (${formatBRL(order.total)}) — etiqueta Super Frete não gerada (evita cobrança na sua carteira).`;
      console.log('Super Frete ignorado — pedido de teste:', order.orderId);
      await saveOrder(env, order);
    } else {
      try {
        await createSuperfreteCartForOrder(env, config, order);
      } catch (err) {
        console.error('Super Frete cart:', order.orderId, err.message);
        order.superfreteCartError = humanizeSuperfreteError(err.message);
        await saveOrder(env, order);
      }
    }
  } else if (isCorreiosLabelOrder(order)) {
    try {
      await ensureCorreiosPrePostagemForOrder(env, order, config);
    } catch (err) {
      console.error('Correios pre-postagem:', order.orderId, err.message);
      order.correiosPrePostagemError = err.message;
      await saveOrder(env, order);
    }
  }

  const shopPaidFields = {
    Pedido: order.orderId, Status: 'PAGO', Cliente: order.nome,
    'E-mail cliente': order.email, Telefone: order.telefone,
    Pagamento: order.pagamento || payment?.billingType || '—',
    Valor: formatOrderCharge(order, value),
    Endereço: order.endereco, Envio: order.shippingService,
    ...orderWatchEmailFields(order),
    ...orderCouponEmailFields(order),
    ...orderIntlProductFields(order)
  };
  if (isUberOrder(order)) {
    if (order.uberDispatchSkipped) {
      shopPaidFields['Uber Direct'] = order.uberDispatchSkipped;
    } else {
      shopPaidFields['Uber Direct'] = order.uberDeliveryId || 'solicitado';
      if (order.uberTrackingUrl) shopPaidFields['Rastreio Uber'] = order.uberTrackingUrl;
      if (order.uberDispatchError) shopPaidFields['Erro Uber'] = order.uberDispatchError;
    }
  } else if (isMotoboyOrder(order)) {
    shopPaidFields['Envio particular'] = 'Motoboy';
    if (order.motoboyDistanceKm) shopPaidFields['Distância'] = `~${order.motoboyDistanceKm} km`;
    if (order.motoboyCourierEmails?.length) {
      shopPaidFields['Motoboys avisados'] = order.motoboyCourierEmails.join(', ');
    }
    if (order.motoboyNotifyError) shopPaidFields['Erro e-mail motoboy'] = order.motoboyNotifyError;
  } else if (isSuperfreteOrder(order)) {
    if (order.superfreteSkipped) {
      shopPaidFields['Super Frete'] = order.superfreteSkipped;
    } else {
      shopPaidFields['Super Frete'] = order.superfreteCartId || 'pendente';
      if (order.superfreteCartStatus) shopPaidFields['Status Super Frete'] = order.superfreteCartStatus;
      if (order.superfreteCartPrice != null) {
        shopPaidFields['Custo etiqueta (você paga no SF)'] = formatBRL(order.superfreteCartPrice);
      }
      shopPaidFields['Pagar / imprimir'] = 'https://web.superfrete.com/#/minhas-etiquetas';
      if (order.superfreteTrackingCode || order.correiosTrackingCode) {
        shopPaidFields['Rastreio'] = order.superfreteTrackingCode || order.correiosTrackingCode;
      }
      if (order.superfreteCartError) shopPaidFields['Erro Super Frete'] = order.superfreteCartError;
      if (order.superfreteCheckoutError) shopPaidFields['Pagamento Super Frete'] = order.superfreteCheckoutError;
    }
  } else if (isCorreiosLabelOrder(order)) {
    if (order.correiosPrePostagemId) {
      shopPaidFields['Pré-postagem Correios'] = isCorreiosIntlOrder(order)
        ? 'Registrada automaticamente (internacional)'
        : 'Registrada automaticamente';
    }
    if (order.correiosTrackingCode) {
      shopPaidFields['Rastreio Correios'] = order.correiosTrackingCode;
      shopPaidFields['Acompanhar envio'] = correiosTrackingUrl(order.correiosTrackingCode, config.siteUrl);
    }
    shopPaidFields['Imprimir etiqueta'] = labelPrintUrl(config, order.orderId);
    if (order.correiosPrePostagemError) shopPaidFields['Erro pré-postagem'] = order.correiosPrePostagemError;
  } else if ((order.paisCode || 'BR') === 'BR' && !order.internationalLensOnly) {
    shopPaidFields['Imprimir etiqueta'] = labelPrintUrl(config, order.orderId);
  }

  const shopAttachments = [];
  if (isCorreiosLabelOrder(order)) {
    const labelAtt = await tryCorreiosLabelPdfAttachment(env, order, config);
    if (labelAtt) {
      shopAttachments.push(labelAtt);
      shopPaidFields['Etiqueta PDF'] = isCorreiosIntlOrder(order)
        ? 'Anexada automaticamente (rótulo internacional Correios)'
        : 'Anexada automaticamente neste e-mail';
      if (order.correiosTrackingCode) {
        shopPaidFields['Rastreio Correios'] = order.correiosTrackingCode;
        shopPaidFields['Acompanhar envio'] = correiosTrackingUrl(order.correiosTrackingCode, config.siteUrl);
      }
    } else if (order.correiosLabelEmailError) {
      shopPaidFields['Erro etiqueta PDF'] = order.correiosLabelEmailError;
      if (isCorreiosIntlOrder(order)) {
        shopAttachments.push(buildIntlPackingSlipAttachment(order));
        shopPaidFields['Packing slip'] = 'Anexado (fallback HTML) — rótulo Correios falhou';
      }
    } else if (isCorreiosIntlOrder(order)) {
      shopAttachments.push(buildIntlPackingSlipAttachment(order));
      shopPaidFields['Packing slip'] = 'Anexado (fallback HTML) — rótulo Correios indisponível';
    }
  } else if (order.paisCode && order.paisCode !== 'BR') {
    shopAttachments.push(buildIntlPackingSlipAttachment(order));
    shopPaidFields['Packing slip'] = 'Anexado automaticamente (HTML) — envio internacional';
  }

  const shopPaid = await notifyShop(
    env,
    config,
    emailSubject(config, 'shopPaidSubject', { orderId: order.orderId }),
    shopPaidFields,
    shopAttachments.length ? { attachments: shopAttachments } : undefined
  );
  if (!shopPaid?.ok) console.error('E-mail PAGO loja falhou:', JSON.stringify(shopPaid));

  const paidCustomerMessage = paidMessageForOrder(order, config);
  const receipt = paidReceiptCopy(order, config, paidCustomerMessage);
  await notifyCustomer(env, config, order, receipt.subject, {
    ...receipt.fields,
    ...orderWatchEmailFields(order),
    ...orderIntlProductFields(order)
  }, {
    html: fieldsToHtmlLocalized(
      { [receipt.customerLabel]: order.nome, ...receipt.fields, ...orderWatchEmailFields(order), ...orderIntlProductFields(order) },
      receipt.footerSite
    ),
    text: fieldsToText({ [receipt.customerLabel]: order.nome, ...receipt.fields })
  });

  // Paid receipt already included tracking — skip the follow-up e-mail.
  if (orderTrackingCode(order) && !order.trackingEmailSentAt) {
    order.trackingEmailSentAt = new Date().toISOString();
    await saveOrder(env, order);
  }

  if (
    order.couponCommissionerEmail
    && Number(order.couponCommissionAmount) > 0
  ) {
    const commissionerPaid = await notifyCouponCommissioner(env, config, order);
    if (!commissionerPaid?.ok) console.error('E-mail comissão comissionado falhou:', JSON.stringify(commissionerPaid));
  }

  await notifyWhatsApp(env, config, order, 'paid');
  await trackGa4Purchase(env, order, payment);
}

async function trackGa4Purchase(env, order, payment) {
  const apiSecret = (env.GA4_API_SECRET || '').trim();
  if (!apiSecret) return;

  const measurementId = (env.GA4_MEASUREMENT_ID || 'G-TFLZHJG9RN').trim();
  const value = Number(payment?.value ?? order.total) || 0;
  const paymentType = order.pagamento || payment?.billingType || 'unknown';
  const itemName = order.produto || 'Kit Sensor Tattoo Fix';

  const p = String(paymentType).toLowerCase();
  const forma = p.includes('paypal') ? 'paypal'
    : (p.includes('card') || p.includes('cart') ? 'cartao' : 'pix');

  const eventParams = {
    transaction_id: order.orderId,
    value,
    currency: 'BRL',
    pagamento: forma,
    pedido: order.orderId,
    valor: value,
    moeda: 'BRL'
  };

  const payload = {
    client_id: order.orderId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 36) || 'server',
    events: [
      { name: 'purchase', params: { ...eventParams, items: [{ item_name: itemName, price: value, quantity: 1 }] } },
      { name: 'venda_confirmada', params: eventParams }
    ]
  };

  try {
    const url = `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(measurementId)}&api_secret=${encodeURIComponent(apiSecret)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) console.error('GA4 MP:', res.status, await res.text().catch(() => ''));
  } catch (err) {
    console.error('GA4 MP:', err.message);
  }
}

async function ensureCorreiosLabelCached(env, order, config) {
  if (!order || order.status !== 'paid' || !isCorreiosLabelOrder(order)) {
    return { skipped: true, reason: 'not_correios_paid' };
  }
  try {
    const hadCache = !!(await getCachedLabelPdf(env, order.orderId));
    if (hadCache && order.correiosPrePostagemId) {
      return {
        ok: true,
        cached: true,
        trackingCode: order.correiosTrackingCode || null,
        prePostagemId: order.correiosPrePostagemId
      };
    }
    await ensureCorreiosPrePostagemForOrder(env, order, config);
    const att = await tryCorreiosLabelPdfAttachment(env, order, config);
    if (!att) {
      return {
        ok: false,
        error: order.correiosLabelEmailError || 'Falha ao gerar PDF da etiqueta Correios',
        prePostagemId: order.correiosPrePostagemId || null
      };
    }
    order.correiosLabelCachedAt = new Date().toISOString();
    await saveOrder(env, order);
    return {
      ok: true,
      cached: false,
      trackingCode: order.correiosTrackingCode || null,
      prePostagemId: order.correiosPrePostagemId || null
    };
  } catch (err) {
    console.warn('ensureCorreiosLabelCached:', order.orderId, err.message);
    return { ok: false, error: err.message };
  }
}

async function handleOrderSuperfreteTracking(request, env, origin, orderId) {
  if (!(await isValidSession(env, bearerToken(request)))) {
    return json({ error: 'Não autorizado.' }, 401, origin);
  }
  const order = await getOrder(env, orderId);
  if (!order) return json({ error: 'Pedido não encontrado.' }, 404, origin);
  if (!isSuperfreteOrder(order) || !order.superfreteCartId) {
    return json({ error: 'Pedido sem etiqueta Super Frete.' }, 400, origin);
  }
  const config = await getConfig(env);
  const wait = new URL(request.url).searchParams.get('wait') === '1';
  try {
    let tracking = order.superfreteTrackingCode || order.correiosTrackingCode || null;
    if (!tracking) {
      tracking = wait
        ? await waitSuperfreteTracking(env, config, order, { attempts: 10, delayMs: 3000 })
        : await syncSuperfreteTrackingForOrder(env, config, order);
    }
    return json({
      ok: true,
      orderId,
      cartId: order.superfreteCartId,
      status: order.superfreteCartStatus || null,
      trackingCode: tracking || order.superfreteTrackingCode || order.correiosTrackingCode || null,
      pending: !(tracking || order.superfreteTrackingCode || order.correiosTrackingCode)
    }, 200, origin);
  } catch (err) {
    return json({ error: humanizeSuperfreteError(err.message) }, 400, origin);
  }
}

async function handleOrderShippingLabel(request, env, origin, orderId) {
  if (!(await isValidSession(env, bearerToken(request)))) {
    return json({ error: 'Não autorizado.' }, 401, origin);
  }
  const order = await getOrder(env, orderId);
  if (!order) return json({ error: 'Pedido não encontrado.' }, 404, origin);
  if (order.status !== 'paid') {
    return json({ error: 'Só é possível gerar etiqueta de pedido PAGO.' }, 400, origin);
  }
  if (isParticularDeliveryOrder(order)) {
    return json({ mode: 'html', useClient: true, message: 'Use etiqueta local para motoboy/Uber.' }, 200, origin);
  }
  if (isSuperfreteOrder(order)) {
    const config = await getConfig(env);
    const force = new URL(request.url).searchParams.get('force') === '1';
    try {
      const created = await createSuperfreteCartForOrder(env, config, order, { force });
      if (created?.skipped && created.reason === 'self_test') {
        return json({
          mode: 'superfrete',
          skipped: true,
          panelUrl: 'https://web.superfrete.com/#/minhas-etiquetas',
          walletUrl: 'https://web.superfrete.com/#/carteira',
          message: created.message || order.superfreteSkipped
        }, 200, origin);
      }
      const checkoutErr = order.superfreteCheckoutError || created?.checkoutError || null;
      const cartErr = order.superfreteCartError || null;
      let message;
      if (cartErr) {
        message = cartErr;
      } else if (checkoutErr) {
        message = checkoutErr;
      } else if (order.superfreteCartId && order.superfreteCartStatus === 'released') {
        const track = order.superfreteTrackingCode || order.correiosTrackingCode;
        message = track
          ? `Etiqueta Super Frete liberada. Rastreio: ${track}`
          : 'Etiqueta Super Frete paga/liberada. Imprima no painel Super Frete (rastreio ainda não disponível na API).';
      } else if (order.superfreteCartId) {
        message = 'Pedido no carrinho Super Frete. Checkout automático só usa SALDO da carteira '
          + '(cartão do painel não paga via API). Recarregue a carteira e clique Etiqueta de novo.';
      } else {
        message = 'Não foi possível criar a etiqueta Super Frete.';
      }
      return json({
        mode: 'superfrete',
        cartId: order.superfreteCartId || created.id || null,
        status: order.superfreteCartStatus || null,
        price: order.superfreteCartPrice ?? null,
        trackingCode: order.superfreteTrackingCode || order.correiosTrackingCode || created?.trackingCode || null,
        checkoutError: checkoutErr,
        cartError: cartErr,
        panelUrl: 'https://web.superfrete.com/#/minhas-etiquetas',
        walletUrl: 'https://web.superfrete.com/#/carteira',
        message
      }, 200, origin);
    } catch (err) {
      return json({
        error: humanizeSuperfreteError(err.message),
        mode: 'superfrete',
        panelUrl: 'https://web.superfrete.com/#/minhas-etiquetas',
        walletUrl: 'https://web.superfrete.com/#/carteira'
      }, 400, origin);
    }
  }
  if (!isCorreiosLabelOrder(order)) {
    return json({
      mode: 'html',
      useClient: true,
      international: orderLooksInternationalDestination(order),
      message: 'Este pedido não usa pré-postagem Correios. Use a etiqueta local / packing slip.'
    }, 200, origin);
  }

  const config = await getConfig(env);
  const ensureOnly = new URL(request.url).searchParams.get('ensure') === '1';
  const token = await getCorreiosToken(env);
  if (!token) {
    return json({
      error: 'Correios não configurado no Worker.',
      mode: 'html_fallback',
      useClient: true
    }, 503, origin);
  }

  try {
    const cachedPdf = await getCachedLabelPdf(env, orderId);
    if (cachedPdf) {
      return json({
        mode: 'pdf',
        pdfBase64: ensureOnly ? undefined : cachedPdf,
        hasPdf: true,
        trackingCode: order.correiosTrackingCode || null,
        prePostagemId: order.correiosPrePostagemId || null,
        cached: true,
        ensured: true
      }, 200, origin);
    }

    await ensureCorreiosPrePostagemForOrder(env, order, config);
    const prePostagemId = order.correiosPrePostagemId;
    if (!prePostagemId) throw new Error('Pré-postagem não criada');

    const label = await fetchCorreiosLabelPdf(token, prePostagemId, correiosLabelTipoOpts(order));
    let labelCode = label.trackingCode
      ? String(label.trackingCode).trim().toUpperCase()
      : await extractAvFromPdfBase64(label.pdfBase64);
    if (!labelCode) {
      labelCode = await syncCorreiosTrackingCodeFromPrePostagem(token, order, env, { aggressive: true });
    } else if (!order.correiosTrackingCode) {
      order.correiosTrackingCode = labelCode;
      await saveOrder(env, order);
    }

    if (label.pdfBase64) {
      await saveCachedLabelPdf(env, orderId, label.pdfBase64);
      order.correiosLabelCachedAt = new Date().toISOString();
      await saveOrder(env, order);
    }

    return json({
      mode: 'pdf',
      pdfBase64: ensureOnly ? undefined : label.pdfBase64,
      hasPdf: !!label.pdfBase64,
      trackingCode: order.correiosTrackingCode || labelCode || null,
      prePostagemId,
      ensured: true
    }, 200, origin);
  } catch (err) {
    const msg = String(err.message || 'Falha ao gerar etiqueta Correios');
    try {
      order.correiosPrePostagemError = msg;
      order.correiosLabelEmailError = msg;
      await saveOrder(env, order);
    } catch (_) { /* ignore */ }
    const blocked = msg.includes('GTW-012') || msg.includes('86720') || msg.includes('CON-011');
    const intlCepBug = /PRZ-101|cepDestino|CEP destinatário/i.test(msg);
    const serviceMissing = /ausente no cartão|CON-011|não.*liberad|nao.*liberad|serviço.*não|servico.*nao/i.test(msg);
    let error = msg;
    if (blocked) {
      error = 'Aguardando liberação Correios (API / serviços no cartão).';
    } else if (intlCepBug) {
      error = 'Correios API nacional rejeitou o CEP internacional (PRZ-101). Serviço 45039 está no cartão, mas a pré-postagem REST ainda valida CEP como Brasil. Use Minhas Exportações (MEXPO) ou agência; a etiqueta local continua disponível.';
    } else if (serviceMissing) {
      error = 'Serviço internacional não liberado no cartão de postagem: ' + msg;
    }
    return json({
      error,
      detail: msg,
      international: isCorreiosIntlOrder(order) || orderLooksInternationalDestination(order),
      mexpoUrl: 'https://minhasexportacoes.correios.com.br/',
      mode: blocked ? 'blocked' : 'html_fallback',
      useClient: true
    }, blocked ? 503 : 502, origin);
  }
}

const MANUAL_SHIPPING_METHOD_LABELS = {
  'br-mini-envios': 'Mini Envios',
  'br-carta-registrada': 'Carta Registrada',
  'correios-manual-pac': 'PAC (balcão manual)',
  'correios-manual-sedex': 'SEDEX (balcão manual)',
  'correios-manual-outro': 'Correios (manual)'
};

const MANUAL_SHIPPING_CORREIOS_CODES = {
  'br-mini-envios': '04227',
  'br-carta-registrada': '8010',
  'correios-manual-pac': '41106',
  'correios-manual-sedex': '40010'
};

function inferShippingMethodFromTracking(trackingCode) {
  const code = String(trackingCode || '').trim().toUpperCase();
  if (code.startsWith('AP')) return 'correios-manual-pac';
  if (code.startsWith('AV')) return 'br-mini-envios';
  if (code.startsWith('AD') || code.startsWith('AB')) return 'correios-manual-sedex';
  return null;
}

async function quoteManualShippingMethod(env, config, order, methodId) {
  const id = String(methodId || '').trim();
  const serviceCode = MANUAL_SHIPPING_CORREIOS_CODES[id];
  if (!serviceCode || !order) return null;
  const dest = onlyDigits(order.cep);
  if (dest.length !== 8) return null;

  const label = MANUAL_SHIPPING_METHOD_LABELS[id] || 'Correios';
  const method = { id, correiosCode: serviceCode, label };
  const declaredValue = Number(order.valorProduto) || Number(config.product?.price) || 62.9;
  const weightGrams = shippingWeightGrams(config);

  const quote = await quoteCorreiosService(env, config, dest, method, { declaredValue, weightGrams });
  if (quote?.price) {
    return {
      methodId: id,
      serviceCode,
      price: quote.price,
      days: quote.days,
      source: quote.source || 'correios'
    };
  }

  const ship = config.shipping || DEFAULT_CONFIG.shipping;
  const origin = onlyDigits(ship.originCep);
  const weightFactor = Math.min(2.5, Math.max(1, weightGrams / shippingWeightGrams(config)));
  const est = estimateBRForMethod(origin, dest, method, weightFactor, config);
  let price = est.price;
  let days = est.days;
  if (id === 'correios-manual-sedex') {
    price = Math.round(est.price * 1.55 * 100) / 100;
    days = Math.max(1, est.days - 4);
  } else if (id === 'correios-manual-pac') {
    price = Math.round(est.price * 0.85 * 100) / 100;
  }
  return { methodId: id, serviceCode, price, days, source: 'estimate' };
}

function applyOrderShippingManualUpdate(order, body) {
  const now = new Date().toISOString();
  let changed = false;

  if (body.trackingCode !== undefined) {
    const trackingCode = String(body.trackingCode || '').trim().toUpperCase();
    if (!trackingCode) {
      order.correiosTrackingCode = null;
      changed = true;
    } else if (!CORREIOS_AV_RE.test(trackingCode)) {
      throw new Error('Código de rastreio inválido.');
    } else {
      order.correiosTrackingCode = trackingCode;
      order.correiosPrePostagemError = null;
      changed = true;
    }
  }

  if (body.correiosTrackingStatus !== undefined) {
    const status = String(body.correiosTrackingStatus || '').trim();
    order.correiosTrackingStatus = status || null;
    changed = true;
  } else if (body.markPosted === true) {
    order.correiosTrackingStatus = 'Postado';
    changed = true;
  }

  if (body.correiosShippingManualNote !== undefined) {
    order.correiosShippingManualNote = String(body.correiosShippingManualNote || '').trim() || null;
    changed = true;
  }

  if (body.shippingMethodId !== undefined) {
    const methodId = String(body.shippingMethodId || '').trim();
    order.shippingMethodId = methodId || null;
    const label = MANUAL_SHIPPING_METHOD_LABELS[methodId];
    if (label) order.shippingService = label;
    changed = true;
  }

  const wantsFrete = body.frete !== undefined;
  const wantsProduct = body.valorProduto !== undefined || body.productAdjust !== undefined;
  if (wantsFrete || wantsProduct) {
    const nextFrete = wantsFrete ? Number(body.frete) : Number(order.frete);
    if (!Number.isFinite(nextFrete) || nextFrete < 0) {
      throw new Error('Frete do pedido inválido.');
    }
    if (body.valorProduto !== undefined) {
      const vp = Number(body.valorProduto);
      if (!Number.isFinite(vp) || vp < 0) throw new Error('Valor do produto inválido.');
    }
    if (body.productAdjust !== undefined) {
      const adj = Number(body.productAdjust);
      if (!Number.isFinite(adj)) throw new Error('Acerto de produto inválido.');
    }
    applyOrderFreteAccounting(order, nextFrete, {
      now,
      valorProduto: body.valorProduto,
      productAdjust: body.productAdjust
    });
    changed = true;
  } else if (orderNeedsFreteProductRepair(order)) {
    applyOrderFreteAccounting(order, Number(order.frete) || 0, { now });
    changed = true;
  }

  if (body.correiosFreteEstimado !== undefined) {
    const price = Number(body.correiosFreteEstimado);
    if (Number.isFinite(price) && price >= 0) {
      order.correiosFreteEstimado = price > 0 ? Math.round(price * 100) / 100 : null;
      order.correiosFreteEstimadoAt = now;
      changed = true;
    }
  }

  if (body.shippingDays !== undefined) {
    const days = parseInt(String(body.shippingDays), 10);
    if (Number.isFinite(days) && days > 0) {
      order.shippingDays = days;
      changed = true;
    }
  }

  if (body.shippingServiceCode !== undefined) {
    order.shippingServiceCode = String(body.shippingServiceCode || '').trim() || null;
    changed = true;
  }

  if (!changed) throw new Error('Nenhum campo para atualizar.');

  order.correiosManualUpdatedAt = now;
  order.correiosTrackingUpdatedAt = now;
  return order;
}

async function handleOrderCorreiosAv(request, env, origin, orderId) {
  if (!(await isValidSession(env, bearerToken(request)))) {
    return json({ error: 'Não autorizado.' }, 401, origin);
  }
  const body = await request.json().catch(() => ({}));
  const order = await getOrder(env, orderId);
  if (!order) return json({ error: 'Pedido não encontrado.' }, 404, origin);
  const previousCode = order.correiosTrackingCode;
  try {
    applyOrderShippingManualUpdate(order, { trackingCode: body.trackingCode });
  } catch (err) {
    return json({ error: err.message }, 400, origin);
  }
  await saveOrder(env, order);
  const config = await getConfig(env);
  try {
    await notifyTrackingIfNew(env, config, order, previousCode);
  } catch (err) {
    console.warn('Tracking email after manual AV:', orderId, err.message);
  }
  return json({ ok: true, trackingCode: order.correiosTrackingCode }, 200, origin);
}

async function handleOrderShippingUpdate(request, env, origin, orderId) {
  if (!(await isValidSession(env, bearerToken(request)))) {
    return json({ error: 'Não autorizado.' }, 401, origin);
  }
  const body = await request.json().catch(() => ({}));
  const order = await getOrder(env, orderId);
  if (!order) return json({ error: 'Pedido não encontrado.' }, 404, origin);
  const config = await getConfig(env);
  const previousCode = order.correiosTrackingCode;
  try {
    applyOrderShippingManualUpdate(order, body);

    const methodId = body.shippingMethodId !== undefined
      ? String(body.shippingMethodId || '').trim()
      : String(order.shippingMethodId || '').trim();
    const wantsAutoQuote = body.correiosFreteEstimado === undefined && body.shippingDays === undefined;

    if (body.trackingCode && !body.shippingMethodId) {
      const inferred = inferShippingMethodFromTracking(body.trackingCode);
      if (inferred && (!order.shippingMethodId || order.shippingMethodId === 'br-mini-envios')) {
        order.shippingMethodId = inferred;
        const label = MANUAL_SHIPPING_METHOD_LABELS[inferred];
        if (label) order.shippingService = label;
      }
    }

    const quoteMethodId = String(order.shippingMethodId || methodId || '').trim();
    if (wantsAutoQuote && quoteMethodId && quoteMethodId !== 'correios-manual-outro') {
      const quote = await quoteManualShippingMethod(env, config, order, quoteMethodId);
      if (quote) {
        order.correiosFreteEstimado = quote.price;
        order.correiosFreteEstimadoAt = new Date().toISOString();
        order.shippingDays = quote.days;
        order.shippingServiceCode = quote.serviceCode;
      }
    }
  } catch (err) {
    return json({ error: err.message }, 400, origin);
  }
  await saveOrder(env, order);
  let trackingEmail = { skipped: true };
  try {
    trackingEmail = await notifyTrackingIfNew(env, config, order, previousCode) || { skipped: true };
  } catch (err) {
    console.warn('Tracking email after shipping update:', orderId, err.message);
    trackingEmail = { skipped: true, error: err.message };
  }
  return json({
    ok: true,
    trackingCode: order.correiosTrackingCode || null,
    correiosTrackingStatus: order.correiosTrackingStatus || null,
    shippingMethodId: order.shippingMethodId || null,
    shippingService: order.shippingService || null,
    correiosShippingManualNote: order.correiosShippingManualNote || null,
    correiosFreteEstimado: order.correiosFreteEstimado ?? null,
    frete: order.frete ?? null,
    freteOriginal: order.freteOriginal ?? null,
    total: order.total ?? null,
    totalPaid: order.totalPaid ?? null,
    valorProduto: order.valorProduto ?? null,
    productAdjust: order.productAdjust ?? null,
    valorProdutoAtCheckout: order.valorProdutoAtCheckout ?? null,
    paypalFee: order.paypalFee ?? null,
    shippingDays: order.shippingDays ?? null,
    shippingServiceCode: order.shippingServiceCode ?? null,
    trackingEmailSentAt: order.trackingEmailSentAt || null,
    trackingEmailSent: !!(trackingEmail && trackingEmail.ok),
    trackingEmailSkipped: !!(trackingEmail && trackingEmail.skipped)
  }, 200, origin);
}

async function handleOrderShippingMethodQuote(request, env, origin, orderId) {
  if (!(await isValidSession(env, bearerToken(request)))) {
    return json({ error: 'Não autorizado.' }, 401, origin);
  }
  const url = new URL(request.url);
  const methodId = String(url.searchParams.get('methodId') || '').trim();
  if (!methodId || methodId === 'correios-manual-outro') {
    return json({ error: 'Serviço sem cotação automática.' }, 400, origin);
  }
  const order = await getOrder(env, orderId);
  if (!order) return json({ error: 'Pedido não encontrado.' }, 404, origin);
  const config = await getConfig(env);
  const quote = await quoteManualShippingMethod(env, config, order, methodId);
  if (!quote) return json({ error: 'Não foi possível cotar este serviço.' }, 400, origin);
  return json(quote, 200, origin);
}

async function handleConfirmOrder(request, env, origin, orderId) {
  if (!(await isValidSession(env, bearerToken(request)))) {
    return json({ error: 'Não autorizado.' }, 401, origin);
  }
  const order = await getOrder(env, orderId);
  if (!order) return json({ error: 'Pedido não encontrado.' }, 404, origin);
  if (order.status === 'paid') return json(order, 200, origin);

  await handlePaymentConfirmed(env, order, {
    provider: order.paymentProvider || 'manual',
    value: order.total,
    confirmedBy: 'admin'
  });
  return json(await getOrder(env, orderId), 200, origin);
}

/** Reenvia e-mail consultivo de pedido pendente (PIX / cartão / PayPal). */
async function handleResendPendingEmail(request, env, origin, orderId) {
  if (!(await isValidSession(env, bearerToken(request)))) {
    return json({ error: 'Não autorizado.' }, 401, origin);
  }
  const order = await getOrder(env, orderId);
  if (!order) return json({ error: 'Pedido não encontrado.' }, 404, origin);
  if (order.status === 'paid') {
    return json({ error: 'Pedido já está pago.' }, 400, origin);
  }
  const config = await getConfig(env);
  const pay = String(order.pagamento || order.billingType || '').toUpperCase();
  let billingType = 'PIX';
  if (/PAYPAL/.test(pay)) billingType = 'PAYPAL';
  else if (/CARD|CART[AÃ]O|APPLE|GOOGLE|STRIPE|CREDIT|MP_CHECKOUT|MERCADO/.test(pay)) billingType = 'CREDIT_CARD';
  else if (order.paymentBillingType) billingType = order.paymentBillingType;
  const result = await notifyCustomerPendingPayment(env, config, order, billingType);
  if (!result?.ok) {
    return json({ ok: false, orderId, email: order.email, ...result }, 502, origin);
  }
  return json({ ok: true, orderId, email: order.email, billingType, provider: result.provider, id: result.id }, 200, origin);
}

async function handleConfirmSelfTestOrder(request, env, origin, orderId) {
  const body = await request.json().catch(() => ({}));
  const order = await getOrder(env, orderId);
  if (!order) return json({ error: 'Pedido não encontrado.' }, 404, origin);

  const token = String(body.accessToken || '');
  if (!order.accessToken || token !== order.accessToken) {
    return json({ error: 'Não autorizado.' }, 401, origin);
  }
  if (!isSelfTestOrder(order)) {
    return json({ error: 'Disponível apenas em pedidos de teste.' }, 403, origin);
  }
  if (order.status === 'paid') {
    return json({ order: publicOrderView(order), status: 'paid' }, 200, origin);
  }

  await handlePaymentConfirmed(env, order, {
    provider: order.paymentProvider || 'self_test',
    value: order.total,
    confirmedBy: 'self_test_skip'
  });
  const updated = await getOrder(env, orderId);
  return json({ order: publicOrderView(updated), status: 'paid' }, 200, origin);
}

async function handleAsaasWebhook(request, env, origin) {
  const token = request.headers.get('asaas-access-token');
  if (env.ASAAS_WEBHOOK_TOKEN && token !== env.ASAAS_WEBHOOK_TOKEN) {
    return json({ error: 'Token inválido.' }, 401, origin);
  }
  const body = await request.json();
  // PAYMENT_CONFIRMED is enough; RECEIVED often arrives too and used to double-send e-mails.
  if (body.event === 'PAYMENT_CONFIRMED' && body.payment?.externalReference) {
    const order = await getOrder(env, body.payment.externalReference);
    if (order && order.status !== 'paid') {
      await handlePaymentConfirmed(env, order, body.payment);
    }
  } else if (body.event === 'PAYMENT_RECEIVED' && body.payment?.externalReference) {
    const order = await getOrder(env, body.payment.externalReference);
    // Only confirm on RECEIVED if still unpaid and not already claimed (card can skip CONFIRMED).
    if (order && order.status !== 'paid' && !order.paidEmailsSentAt) {
      await handlePaymentConfirmed(env, order, body.payment);
    }
  }
  return json({ ok: true }, 200, origin);
}

async function checkStripeIntegration(env) {
  const { secretKey, publishableKey, webhookSecret } = stripeCredentials(env);
  const mode = stripeKeyMode(env);
  const liveReady = stripeLiveReady(env);
  if (!secretKey && !publishableKey) {
    return { configured: false, authOk: false, webhook: false, mode, liveReady, error: null };
  }
  if (!secretKey || !publishableKey) {
    return {
      configured: true,
      authOk: false,
      webhook: !!webhookSecret,
      mode,
      liveReady,
      error: 'Secrets STRIPE_SECRET_KEY / STRIPE_PUBLISHABLE_KEY incompletos.'
    };
  }
  if (mode === 'test') {
    return {
      configured: true,
      authOk: false,
      webhook: !!webhookSecret,
      mode,
      liveReady: false,
      error: 'Chaves de teste — não usar em produção.'
    };
  }
  try {
    const res = await fetch('https://api.stripe.com/v1/balance', {
      headers: { Authorization: 'Bearer ' + secretKey, Accept: 'application/json' }
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return {
        configured: true,
        authOk: false,
        webhook: !!webhookSecret,
        mode,
        liveReady: false,
        error: data.error?.message || 'Falha na autenticação Stripe.'
      };
    }
    return { configured: true, authOk: true, webhook: !!webhookSecret, mode, liveReady, error: null };
  } catch (err) {
    return { configured: true, authOk: false, webhook: !!webhookSecret, mode, liveReady: false, error: err.message };
  }
}

async function stripeApi(env, path, params) {
  const { secretKey } = stripeCredentials(env);
  if (!secretKey) throw new Error('Stripe não configurado.');
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + secretKey,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json'
    },
    body: new URLSearchParams(params).toString()
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error?.message || 'Stripe API error.');
  return data;
}

/** Locale of Stripe receipt / invoice emails (Customer.preferred_locales). */
function stripePreferredLocales(order, request) {
  const loc = String(order?.checkoutLocale || '').toLowerCase();
  if (loc.startsWith('it')) return ['it-IT', 'it', 'en'];
  if (loc.startsWith('en') || isComSiteRequest(request) || isIntlCheckoutLocale(loc)) {
    return ['en-US', 'en'];
  }
  return ['pt-BR', 'pt'];
}

/**
 * Create/update Stripe Customer with preferred_locales so receipts are not stuck in
 * the account default (pt-BR for 3N20) on .com EN/IT checkouts.
 */
async function ensureStripeCustomer(env, order, request) {
  const locales = stripePreferredLocales(order, request);
  const email = String(order.email || '').trim().slice(0, 500);
  const name = String(order.nome || '').trim().slice(0, 200);
  if (order.stripeCustomerId) {
    const patch = { 'metadata[orderId]': order.orderId };
    if (email) patch.email = email;
    if (name) patch.name = name;
    locales.forEach((l, i) => { patch[`preferred_locales[${i}]`] = l; });
    try {
      await stripeApi(env, `customers/${order.stripeCustomerId}`, patch);
    } catch (err) {
      console.warn('Stripe customer update:', err.message);
    }
    return order.stripeCustomerId;
  }
  const params = { 'metadata[orderId]': order.orderId };
  if (email) params.email = email;
  if (name) params.name = name;
  locales.forEach((l, i) => { params[`preferred_locales[${i}]`] = l; });
  const customer = await stripeApi(env, 'customers', params);
  order.stripeCustomerId = customer.id;
  return customer.id;
}

async function handlePayPalCreate(request, env, origin, orderId) {
  const body = await request.json().catch(() => ({}));
  const order = await getOrder(env, orderId);
  if (!order) return json({ error: 'Pedido não encontrado.' }, 404, origin);
  const accessToken = String(body.accessToken || '');
  if (!order.accessToken || accessToken !== order.accessToken) {
    return json({ error: 'Não autorizado.' }, 401, origin);
  }
  if (order.status === 'paid') {
    return json({ order: publicOrderView(order), status: 'paid' }, 200, origin);
  }
  const config = await getConfig(env);
  if (!isInternationalPayPalAvailable(config)) {
    return json({ error: 'PayPal indisponível.' }, 400, origin);
  }
  try {
    const payment = await createPayPalCheckout(env, order, config, request, { embedded: true });
    order.paypalOrderId = payment.paypalOrderId;
    if (payment.approveUrl) order.paypalApproveUrl = payment.approveUrl;
    await saveOrder(env, order);
    return json({
      paypalOrderId: payment.paypalOrderId,
      approveUrl: payment.approveUrl || null
    }, 200, origin);
  } catch (err) {
    return json({ error: err.message }, 400, origin);
  }
}

function stripeOrderCharge(order, request, env) {
  let amountCents;
  let currency = 'brl';
  let amountForeign = null;
  const chargeCur = String(order.chargeCurrency || '').toUpperCase();
  const intlCharge = chargeCur === 'USD' || chargeCur === 'EUR'
    || (isComSiteRequest(request) && !chargeCur);
  if (intlCharge && (chargeCur === 'USD' || chargeCur === 'EUR' || isComSiteRequest(request))) {
    const resolvedCur = chargeCur === 'EUR' ? 'EUR' : 'USD';
    currency = resolvedCur.toLowerCase();
    let amt = Number(order.chargeAmount);
    if (isSelfTestOrder(order)) {
      amt = order.selfTestStripe || order.paymentProvider === 'stripe'
        ? (resolvedCur === 'EUR' ? SELF_TEST_STRIPE_EUR_AMOUNT : SELF_TEST_STRIPE_USD_AMOUNT)
        : (resolvedCur === 'EUR' ? SELF_TEST_EUR_AMOUNT : SELF_TEST_USD_AMOUNT);
      order.chargeCurrency = resolvedCur;
      order.chargeAmount = amt;
      if (order.paymentProvider === 'stripe') order.selfTestStripe = true;
    }
    if (!Number.isFinite(amt) || amt <= 0) {
      return null;
    }
    const minCents = isSelfTestOrder(order)
      ? Math.round((resolvedCur === 'EUR' ? SELF_TEST_STRIPE_EUR_AMOUNT : SELF_TEST_STRIPE_USD_AMOUNT) * 100)
      : 50;
    amountCents = Math.max(minCents, Math.round(amt * 100));
    amountForeign = amt;
  } else {
    const brl = isSelfTestOrder(order) ? SELF_TEST_BRL_AMOUNT : Number(order.total);
    amountCents = Math.max(isSelfTestOrder(order) ? 1 : 50, Math.round(brl * 100));
    currency = 'brl';
  }
  return { amountCents, currency, amountUsd: amountForeign };
}

async function ensureStripeIntlCharge(order, request, env) {
  const chargeCur = String(order.chargeCurrency || '').toUpperCase();
  if (!(chargeCur === 'USD' || chargeCur === 'EUR' || isComSiteRequest(request))) return;
  let amt = Number(order.chargeAmount);
  if (Number.isFinite(amt) && amt > 0) return;
  const config = await getConfig(env);
  const foreignCur = intlChargeCurrencyForLocale(order.checkoutLocale);
  const charge = await intlForeignCharge(order, env, config, order.items, foreignCur);
  order.chargeCurrency = foreignCur;
  order.chargeAmount = charge.amount;
  order.chargeFxRate = charge.fxRate;
  order.displayCurrency = foreignCur;
}

async function handleStripePaymentIntent(request, env, origin, orderId) {
  const body = await request.json().catch(() => ({}));
  const order = await getOrder(env, orderId);
  if (!order) return json({ error: 'Pedido não encontrado.' }, 404, origin);
  const accessToken = String(body.accessToken || '');
  if (!order.accessToken || accessToken !== order.accessToken) {
    return json({ error: 'Não autorizado.' }, 401, origin);
  }
  if (order.status === 'paid') {
    return json({ order: publicOrderView(order), status: 'paid' }, 200, origin);
  }
  if (!stripeLiveReady(env)) {
    return json({ error: 'Card payment temporarily unavailable. Please use PayPal.' }, 503, origin);
  }
  const config = await getConfig(env);
  const { publishableKey } = stripeCredentials(env);
  await ensureStripeIntlCharge(order, request, env);
  const charge = stripeOrderCharge(order, request, env);
  if (!charge) return json({ error: 'Could not compute charge amount.' }, 400, origin);
  const returnBase = storeBaseUrl(config, env, request);
  try {
    const customerId = await ensureStripeCustomer(env, order, request);
    const pi = await stripeApi(env, 'payment_intents', {
      amount: String(charge.amountCents),
      currency: charge.currency,
      customer: customerId,
      'automatic_payment_methods[enabled]': 'true',
      'metadata[orderId]': order.orderId,
      description: `Sensor Tattoo Fix — ${order.orderId}`.slice(0, 500),
      receipt_email: String(order.email || '').slice(0, 500)
    });
    order.stripePaymentIntentId = pi.id;
    order.paymentProvider = 'stripe';
    await saveOrder(env, order);
    return json({
      clientSecret: pi.client_secret,
      publishableKey,
      returnUrl: `${returnBase}/comprar.html?stripe=return&orderId=${encodeURIComponent(order.orderId)}&accessToken=${encodeURIComponent(order.accessToken)}`
    }, 200, origin);
  } catch (err) {
    return json({ error: err.message }, 400, origin);
  }
}

/** Hosted Stripe Checkout — fallback “Continue on Stripe.com” (like PayPal redirect). */
async function handleStripeCheckoutSession(request, env, origin, orderId) {
  const body = await request.json().catch(() => ({}));
  const order = await getOrder(env, orderId);
  if (!order) return json({ error: 'Pedido não encontrado.' }, 404, origin);
  const accessToken = String(body.accessToken || '');
  if (!order.accessToken || accessToken !== order.accessToken) {
    return json({ error: 'Não autorizado.' }, 401, origin);
  }
  if (order.status === 'paid') {
    return json({ order: publicOrderView(order), status: 'paid' }, 200, origin);
  }
  if (!stripeLiveReady(env)) {
    return json({ error: 'Card payment temporarily unavailable. Please use PayPal.' }, 503, origin);
  }
  const config = await getConfig(env);
  await ensureStripeIntlCharge(order, request, env);
  const charge = stripeOrderCharge(order, request, env);
  if (!charge) return json({ error: 'Could not compute charge amount.' }, 400, origin);
  const returnBase = storeBaseUrl(config, env, request);
  const successQs = new URLSearchParams({
    stripe: 'return',
    orderId: order.orderId,
    accessToken: order.accessToken
  });
  const cancelQs = new URLSearchParams({
    stripe: 'cancel',
    orderId: order.orderId,
    accessToken: order.accessToken
  });
  const productLabel = (
    (Array.isArray(order.items) && (order.items[0]?.name || order.items[0]?.nome))
    || order.produtoNome
    || 'Sensor Tattoo Fix'
  ).toString().slice(0, 120);
  const localeRaw = String(body.locale || order.checkoutLocale || 'en').trim().toLowerCase();
  // .com never uses pt-BR for Stripe UI/receipts — account default is Brazilian.
  const stripeLocale = localeRaw.startsWith('it')
    ? 'it'
    : (localeRaw.startsWith('pt') && !isComSiteRequest(request) ? 'pt-BR' : 'en');
  try {
    const customerId = await ensureStripeCustomer(env, order, request);
    const session = await stripeApi(env, 'checkout/sessions', {
      mode: 'payment',
      locale: stripeLocale,
      success_url: `${returnBase}/comprar.html?${successQs}`,
      cancel_url: `${returnBase}/comprar.html?${cancelQs}`,
      customer: customerId,
      'line_items[0][quantity]': '1',
      'line_items[0][price_data][currency]': charge.currency,
      'line_items[0][price_data][unit_amount]': String(charge.amountCents),
      'line_items[0][price_data][product_data][name]': productLabel,
      'metadata[orderId]': order.orderId,
      'payment_intent_data[metadata][orderId]': order.orderId,
      'payment_intent_data[description]': `Sensor Tattoo Fix — ${order.orderId}`.slice(0, 500)
    });
    order.stripeCheckoutSessionId = session.id;
    order.paymentProvider = 'stripe';
    await saveOrder(env, order);
    return json({
      checkoutUrl: session.url || null,
      sessionId: session.id
    }, 200, origin);
  } catch (err) {
    return json({ error: err.message }, 400, origin);
  }
}

async function handleStripeWebhook(request, env, origin) {
  const { webhookSecret } = stripeCredentials(env);
  const rawBody = await request.text();
  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return json({ error: 'Invalid payload.' }, 400, origin);
  }
  if (webhookSecret) {
    const sig = request.headers.get('stripe-signature') || '';
    const valid = await verifyStripeWebhookSignature(rawBody, sig, webhookSecret);
    if (!valid) return json({ error: 'Invalid signature.' }, 400, origin);
  }
  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data?.object || {};
    const orderId = pi.metadata?.orderId;
    if (orderId) {
      const order = await getOrder(env, orderId);
      if (order && order.status !== 'paid') {
        const value = pi.amount_received ? pi.amount_received / 100 : order.total;
        await handlePaymentConfirmed(env, order, {
          id: pi.id,
          provider: 'stripe',
          billingType: 'STRIPE',
          value
        });
      }
    }
  } else if (event.type === 'checkout.session.completed') {
    const session = event.data?.object || {};
    const orderId = session.metadata?.orderId;
    if (orderId && session.payment_status === 'paid') {
      const order = await getOrder(env, orderId);
      if (order && order.status !== 'paid') {
        const value = session.amount_total ? session.amount_total / 100 : order.total;
        await handlePaymentConfirmed(env, order, {
          id: session.payment_intent || session.id,
          provider: 'stripe',
          billingType: 'STRIPE',
          value
        });
      }
    }
  }
  return json({ received: true }, 200, origin);
}

async function verifyStripeWebhookSignature(payload, sigHeader, secret) {
  if (!sigHeader || !secret) return false;
  const parts = Object.fromEntries(sigHeader.split(',').map((p) => {
    const [k, v] = p.split('=');
    return [k.trim(), v];
  }));
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;
  const signed = `${timestamp}.${payload}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signed));
  const expected = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return expected === signature;
}

async function handlePayPalCapture(request, env, origin, orderId) {
  const body = await request.json().catch(() => ({}));
  const order = await getOrder(env, orderId);
  if (!order) return json({ error: 'Pedido não encontrado.' }, 404, origin);

  const accessToken = String(body.accessToken || '');
  if (!order.accessToken || accessToken !== order.accessToken) {
    return json({ error: 'Não autorizado.' }, 401, origin);
  }
  if (order.status === 'paid') {
    return json({ order: publicOrderView(order), status: 'paid' }, 200, origin);
  }

  const paypalOrderId = String(body.paypalOrderId || order.paypalOrderId || '');
  if (!paypalOrderId) return json({ error: 'Pedido PayPal não encontrado.' }, 400, origin);

  try {
    const result = await capturePayPalOrder(env, paypalOrderId);
    if (result.status === 'COMPLETED') {
      await handlePaymentConfirmed(env, order, {
        id: result.id,
        provider: 'paypal',
        billingType: 'PAYPAL',
        value: Number(result.value) || order.total
      });
    } else {
      return json({ error: 'Pagamento PayPal não concluído.', status: result.status }, 400, origin);
    }
  } catch (err) {
    return json({ error: err.message }, 400, origin);
  }

  const updated = await getOrder(env, orderId);
  return json({ order: publicOrderView(updated), status: updated.status }, 200, origin);
}

async function handlePayPalWebhook(request, env, origin) {
  const body = await request.json().catch(() => ({}));
  const eventType = body.event_type;
  const resource = body.resource || {};

  if (eventType === 'PAYMENT.CAPTURE.COMPLETED' || eventType === 'CHECKOUT.ORDER.COMPLETED') {
    const orderId = resource.custom_id || resource.purchase_units?.[0]?.custom_id
      || resource.purchase_units?.[0]?.reference_id;
    if (orderId) {
      const order = await getOrder(env, orderId);
      if (order && order.status !== 'paid') {
        await handlePaymentConfirmed(env, order, {
          id: resource.id,
          provider: 'paypal',
          billingType: 'PAYPAL',
          value: Number(resource.amount?.value) || order.total
        });
      }
    }
  }
  return json({ ok: true }, 200, origin);
}

async function handleMercadoPagoWebhook(request, env, origin) {
  const mpToken = mercadoPagoToken(env);
  if (!mpToken) return json({ error: 'MP não configurado.' }, 500, origin);

  const url = new URL(request.url);
  let paymentId = url.searchParams.get('id') || url.searchParams.get('data.id');

  if (!paymentId && request.method === 'POST') {
    const body = await request.json().catch(() => ({}));
    paymentId = body?.data?.id || body?.id;
  }
  if (!paymentId) return json({ ok: true }, 200, origin);

  const res = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: 'Bearer ' + mpToken, Accept: 'application/json' }
  });
  const payment = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error('MP webhook:', res.status, payment);
    return json({ ok: true }, 200, origin);
  }

  if (payment.status === 'approved' && payment.external_reference) {
    const order = await getOrder(env, payment.external_reference);
    if (order && order.status !== 'paid') {
      await handlePaymentConfirmed(env, order, {
        id: payment.id,
        provider: 'mercadopago',
        billingType: payment.payment_method_id === 'pix' ? 'PIX' : 'CREDIT_CARD',
        value: payment.transaction_amount
      });
    }
  }
  return json({ ok: true }, 200, origin);
}

async function handleLogin(request, env, origin) {
  if (!env.ADMIN_PASSWORD) return json({ error: 'ADMIN_PASSWORD não configurado.' }, 500, origin);

  const ip = clientIp(request);
  const lock = await getLoginLock(env, ip, 'admin');
  if (lock?.lockedUntil && Date.now() < lock.lockedUntil) {
    return loginLockedResponse(lock, origin);
  }

  const body = await request.json();
  const username = String(body.username || '').trim();
  const password = String(body.password || '');
  if (username !== (env.ADMIN_USERNAME || 'admin') || password !== env.ADMIN_PASSWORD) {
    await recordLoginFailure(env, ip, 'admin');
    return json({ error: 'Usuário ou senha incorretos.' }, 401, origin);
  }

  await clearLoginFailures(env, ip, 'admin');
  return json({ token: await createSession(env), username: env.ADMIN_USERNAME || 'admin' }, 200, origin);
}

async function handleSession(request, env, origin) {
  if (!(await isValidSession(env, bearerToken(request)))) {
    return json({ error: 'Não autorizado.' }, 401, origin);
  }
  return json({ ok: true, username: env.ADMIN_USERNAME || 'admin' }, 200, origin);
}

async function handleAdminIntegrationsStatus(request, env, origin) {
  if (!(await isValidSession(env, bearerToken(request)))) {
    return json({ error: 'Não autorizado.' }, 401, origin);
  }
  const config = await getConfig(env);
  const weightGrams = shippingWeightGrams(config);
  const hasCorreiosCreds = !!(env.CORREIOS_USER && env.CORREIOS_PASSWORD);
  const correiosToken = hasCorreiosCreds ? await getCorreiosToken(env) : null;
  const correiosPreco = correiosToken ? await probeCorreiosPrecoApi(correiosToken, config) : null;
  const correiosPrazo = correiosToken ? await probeCorreiosPrazoApi(correiosToken, config) : null;
  const [correiosPrePostagem, correiosServico04227, correiosServico86720] = correiosToken
    ? await Promise.all([
      probeCorreiosPrePostagemApi(correiosToken),
      probeCorreiosCartaoServico(correiosToken, env, '04227'),
      probeCorreiosCartaoServico(correiosToken, env, '86720')
    ])
    : [null, null, null];

  const [paypal, mercadoPago, mercadoLivre, amazon, shopee, asaas, resend, zapi, exportOptions, uber, stripe, superfrete] = await Promise.all([
    checkPayPalIntegration(env),
    checkMercadoPagoIntegration(env),
    checkMercadoLivreIntegration(env),
    checkAmazonIntegration(env),
    checkShopeeIntegration(env),
    checkAsaasIntegration(env),
    checkResendIntegration(env),
    checkZApiIntegration(env),
    quoteCorreiosExportOptions(config, 'PT', { weightGrams }).catch(() => []),
    checkUberIntegration(env, config),
    checkStripeIntegration(env),
    checkSuperfreteIntegration(env, config)
  ]);

  const integrations = buildIntegrationRows(env, config, {
    paypal,
    mercadoPago,
    mercadoLivre,
    amazon,
    shopee,
    asaas,
    resend,
    zapi,
    stripe,
    correiosToken,
    correiosPreco,
    correiosPrazo,
    correiosPrePostagem,
    correiosServico04227,
    correiosServico86720,
    exportOptions,
    uber,
    superfrete
  });

  const contractInfo = await fetchCorreiosContractInfo(env).catch((err) => ({ ok: false, detail: err.message }));
  const correiosExtra = [];
  if (!contractInfo.ok) {
    correiosExtra.push({
      id: 'correios-contract-apis',
      label: 'Correios APIs (cartão)',
      description: 'APIs habilitadas no token do cartão',
      status: 'error',
      detail: contractInfo.detail || 'Falha ao autenticar'
    });
  } else {
    const apiIds = Array.isArray(contractInfo.apis) ? contractInfo.apis : [];
    const apiLines = apiIds.map(formatCorreiosApiLine);
    correiosExtra.push({
      id: 'correios-contract-apis',
      label: 'Correios APIs (cartão)',
      description: `Cartão ${contractInfo.cartao} · contrato ${contractInfo.contrato || '?'}`,
      status: apiLines.length ? 'ok' : 'warn',
      detail: apiLines.length ? `${apiLines.length} API(s)` : 'Nenhuma API no token',
      detailLines: apiLines.length ? apiLines : ['Nenhuma API listada no token']
    });
    const cardServices = await listCorreiosCardServices(contractInfo.token, env).catch((err) => ({ error: err.message }));
    if (cardServices.error) {
      correiosExtra.push({
        id: 'correios-intl-services',
        label: 'Correios serviços intl',
        description: 'Serviços internacionais do cartão',
        status: 'error',
        detail: cardServices.error
      });
    } else {
      const intl = correiosIntlServicesFrom(cardServices.services);
      const serviceLines = intl.map((s) => {
        const code = s.codigo || '?';
        const desc = String(s.descricao || 'serviço').trim();
        const short = desc.length > 42 ? desc.slice(0, 40) + '…' : desc;
        return `${code} — ${short}`;
      });
      correiosExtra.push({
        id: 'correios-intl-services',
        label: 'Correios serviços intl',
        description: `${(cardServices.services || []).length} serviço(s) no cartão`,
        status: serviceLines.length ? 'ok' : 'warn',
        detail: serviceLines.length
          ? `${serviceLines.length} internacional(is)`
          : 'Nenhum serviço intl',
        detailLines: serviceLines.length
          ? serviceLines
          : ['Nenhum Exporta Fácil / documento / Packet no cartão']
      });
    }
  }

  integrations.push(...correiosExtra);
  const ordered = sortIntegrationRows(integrations);

  return json({ integrations: ordered, checkedAt: new Date().toISOString() }, 200, origin);
}

async function handleAdminCorreiosContract(request, env, origin) {
  if (!(await isValidSession(env, bearerToken(request)))) {
    return json({ error: 'Não autorizado.' }, 401, origin);
  }
  const info = await fetchCorreiosContractInfo(env);
  if (!info.ok) {
    return json({ ok: false, detail: info.detail }, 200, origin);
  }
  const cardServices = await listCorreiosCardServices(info.token, env);
  const services = cardServices.services || [];
  return json({
    ok: true,
    ambiente: info.ambiente,
    contrato: info.contrato,
    cartao: info.cartao,
    dr: info.dr,
    apisHabilitadas: info.apis,
    servicosNoCartao: services,
    servicosInternacionais: correiosIntlServicesFrom(services),
    servicosErro: cardServices.error || null
  }, 200, origin);
}

/** Diagnóstico: tenta descobrir URL/base das APIs 586/587 com o token do cartão. */
async function handleAdminCorreiosApi586Probe(request, env, origin) {
  if (!(await isValidSession(env, bearerToken(request)))) {
    return json({ error: 'Não autorizado.' }, 401, origin);
  }
  const token = await getCorreiosToken(env);
  if (!token) return json({ error: 'Sem token Correios' }, 503, origin);

  // Poucas URLs de propósito (limite de subrequests do Worker).
  const urls = [
    'https://api.correios.com.br/prepostagem/v3/api-docs',
    'https://api.correios.com.br/packet/v3/api-docs',
    'https://api.correios.com.br/prepostageminternacional/v3/api-docs',
    'https://api.correios.com.br/ppi/v3/api-docs',
    'https://api.correios.com.br/rotulageminternacional/v3/api-docs',
    'https://api.correios.com.br/rotulointernacional/v3/api-docs',
    'https://api.correios.com.br/mexpo/v3/api-docs',
    'https://api.correios.com.br/exportacao/v3/api-docs',
    'https://api.correios.com.br/prepostagem/internacional/v3/api-docs',
    'https://api.correios.com.br/prepostagem/internacional/v1/prepostagens',
    'https://api.correios.com.br/prepostagem/v1/internacional',
    'https://api.correios.com.br/prepostageminternacional/v1/prepostagens',
    'https://api.correios.com.br/ppi/v1/prepostagens'
  ];

  const discovery = [];
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' }
      });
      const text = await res.text().catch(() => '');
      discovery.push({
        url,
        status: res.status,
        nuApi: (text.match(/"x-nuApi"\s*:\s*(\d+)/) || [])[1] || null,
        title: (text.match(/"title"\s*:\s*"([^"]+)"/) || [])[1] || null,
        snippet: (extractCorreiosApiError(res, text) || text.replace(/\s+/g, ' ')).slice(0, 200)
      });
    } catch (err) {
      discovery.push({ url, status: 'ERR', snippet: err.message });
    }
  }

  const orderId = String(new URL(request.url).searchParams.get('orderId') || 'STF-20260726-CF26D2B504').trim();
  const order = await getOrder(env, orderId);
  const config = await getConfig(env);
  const createAttempts = [];
  if (order) {
    hydrateIntlOrderFields(order);
    try {
      if (!order.shippingServiceCode) {
        order.shippingServiceCode = await resolveIntlExportServiceCode(order, config);
      }
      const payload = buildPrePostagemPayload(order, config, env);
      const createUrls = [
        'https://api.correios.com.br/prepostagem/internacional/v1/prepostagens',
        'https://api.correios.com.br/prepostageminternacional/v1/prepostagens',
        'https://api.correios.com.br/ppi/v1/prepostagens',
        'https://api.correios.com.br/prepostagem/v1/prepostagens'
      ];
      for (const createUrl of createUrls) {
        const res = await fetch(createUrl, {
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + token,
            Accept: 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
        const text = await res.text().catch(() => '');
        let parsed = null;
        try { parsed = text ? JSON.parse(text) : null; } catch { /* ignore */ }
        const id = parsed?.id || parsed?.idPrePostagem || null;
        createAttempts.push({
          createUrl,
          status: res.status,
          ok: res.ok,
          id,
          error: res.ok ? null : (extractCorreiosApiError(res, text) || text.slice(0, 220))
        });
        if (id) {
          await fetch(`https://api.correios.com.br/prepostagem/v1/prepostagens/${encodeURIComponent(id)}`, {
            method: 'DELETE',
            headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' }
          }).catch(() => null);
        }
      }
    } catch (err) {
      createAttempts.push({ error: err.message });
    }
  }

  return json({
    ok: true,
    note: 'Token do cartão usado. 200/OpenAPI = API existe. GTW-003 = path inexistente no gateway. PRZ-101 = API 36 nacional.',
    discovery,
    createAttempts,
    orderId: order ? orderId : null
  }, 200, origin);
}

/** Diagnóstico: descobre endpoint intl e testa variantes de pré-postagem (sem expor token). */
async function handleAdminCorreiosIntlProbe(request, env, origin) {
  if (!(await isValidSession(env, bearerToken(request)))) {
    return json({ error: 'Não autorizado.' }, 401, origin);
  }
  const url = new URL(request.url);
  const orderId = String(url.searchParams.get('orderId') || 'STF-20260726-CF26D2B504').trim();
  const order = await getOrder(env, orderId);
  if (!order) return json({ error: 'Pedido não encontrado.', orderId }, 404, origin);

  hydrateIntlOrderFields(order);
  const config = await getConfig(env);
  const token = await getCorreiosToken(env);
  if (!token) return json({ error: 'Sem token Correios' }, 503, origin);

  try {
    const code = await resolveIntlExportServiceCode(order, config);
    order.shippingServiceCode = code;
  } catch (err) {
    return json({ error: 'Falha ao resolver serviço: ' + err.message, orderId }, 200, origin);
  }

  const bases = [
    'https://api.correios.com.br/prepostagem',
    'https://api.correios.com.br/prepostageminternacional',
    'https://api.correios.com.br/ppi',
    'https://api.correios.com.br/mexpo',
    'https://api.correios.com.br/exportacao',
    'https://api.correios.com.br/minhasexportacoes',
    'https://api.correios.com.br/packet',
    'https://api.correios.com.br/cws',
    'https://api.correios.com.br/rotulointernacional',
    'https://api.correios.com.br/rotulagem'
  ];
  const discovery = [];
  for (const base of bases) {
    for (const path of ['/v1/api-docs', '/v2/api-docs', '/v3/api-docs', '']) {
      try {
        const res = await fetch(base + path, {
          headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' }
        });
        const text = await res.text().catch(() => '');
        if (res.status === 404 || res.status === 503) continue;
        discovery.push({
          url: base + path,
          status: res.status,
          nuApi: (text.match(/"x-nuApi"\s*:\s*(\d+)/) || [])[1] || null,
          title: (text.match(/"title"\s*:\s*"([^"]+)"/) || [])[1] || null,
          snippet: text.replace(/\s+/g, ' ').slice(0, 160)
        });
      } catch (err) {
        discovery.push({ url: base + path, status: 'ERR', snippet: err.message });
      }
    }
  }

  let payload;
  try {
    payload = buildPrePostagemPayload(order, config, env);
  } catch (err) {
    return json({ error: 'Payload: ' + err.message, discovery }, 200, origin);
  }

  const createUrls = [
    'https://api.correios.com.br/prepostagem/v1/prepostagens',
    'https://api.correios.com.br/prepostageminternacional/v1/prepostagens',
    'https://api.correios.com.br/ppi/v1/prepostagens',
    'https://api.correios.com.br/mexpo/v1/prepostagens',
    'https://api.correios.com.br/exportacao/v1/prepostagens'
  ];
  const attempts = [];
  const variants = [
    { name: 'as_built', mutate: (p) => p },
    { name: 'cep_empty', mutate: (p) => { p.destinatario.endereco.cep = ''; return p; } },
    { name: 'cep_4123_only', mutate: (p) => { p.destinatario.endereco.cep = '4123'; return p; } },
    {
      name: 'pais_AU_codigoPais',
      mutate: (p) => {
        p.destinatario.endereco.pais = 'AU';
        p.destinatario.endereco.codigoPais = 'AU';
        return p;
      }
    }
  ];

  for (const createUrl of createUrls) {
    for (const variant of variants) {
      const body = variant.mutate(JSON.parse(JSON.stringify(payload)));
      try {
        const res = await fetch(createUrl, {
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + token,
            Accept: 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        });
        const text = await res.text().catch(() => '');
        let parsed = null;
        try { parsed = text ? JSON.parse(text) : null; } catch { /* ignore */ }
        attempts.push({
          createUrl,
          variant: variant.name,
          status: res.status,
          ok: res.ok,
          id: parsed?.id || parsed?.idPrePostagem || null,
          error: res.ok ? null : (extractCorreiosApiError(res, text) || text.slice(0, 220))
        });
        if (res.ok && (parsed?.id || parsed?.idPrePostagem)) {
          // cancel immediately to avoid orphan pré-postagem
          const id = parsed.id || parsed.idPrePostagem;
          await fetch(`https://api.correios.com.br/prepostagem/v1/prepostagens/${encodeURIComponent(id)}`, {
            method: 'DELETE',
            headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' }
          }).catch(() => null);
        }
      } catch (err) {
        attempts.push({ createUrl, variant: variant.name, status: 'ERR', error: err.message });
      }
    }
  }

  const sanePayload = JSON.parse(JSON.stringify(payload));
  if (sanePayload?.remetente?.cpfCnpj) sanePayload.remetente.cpfCnpj = '***';
  return json({
    orderId,
    serviceCode: order.shippingServiceCode,
    discovery,
    attempts,
    payloadSample: sanePayload
  }, 200, origin);
}

async function handleAdminShippingStatus(request, env, origin) {
  if (!(await isValidSession(env, bearerToken(request)))) {
    return json({ error: 'Não autorizado.' }, 401, origin);
  }
  let config = await getConfig(env);
  const paypal = await checkPayPalIntegration(env);
  const sync = await syncAllIntlFallbackZones(env, config);
  config = sync.config;
  const ship = config.shipping || DEFAULT_CONFIG.shipping;
  const hasCreds = !!(env.CORREIOS_USER && env.CORREIOS_PASSWORD);
  const correiosToken = hasCreds ? await getCorreiosToken(env) : null;
  const [correiosPreco, correiosPrazo, correiosPrePostagem, correiosServico04227, correiosServico86720] = correiosToken
    ? await Promise.all([
      probeCorreiosPrecoApi(correiosToken, config),
      probeCorreiosPrazoApi(correiosToken, config),
      probeCorreiosPrePostagemApi(correiosToken),
      probeCorreiosCartaoServico(correiosToken, env, '04227'),
      probeCorreiosCartaoServico(correiosToken, env, '86720')
    ])
    : [null, null, null, null, null];
  const weightGrams = shippingWeightGrams(config);
  const exportOptions = await quoteCorreiosExportOptions(config, 'PT', { weightGrams });
  const exportQuote = exportOptions[0] || null;
  const products = (config.products || []).map((p) => ({
    id: p.id,
    name: p.name,
    weightGrams: p.weightGrams
  }));
  const shipWeight = Number(ship.weightGrams) || weightGrams;
  const weightMismatch = products.some((p) => Math.abs(Number(p.weightGrams || 0) - shipWeight) > 0.01);

  return json({
    correiosBr: {
      credentialsConfigured: hasCreds,
      apiConnected: !!correiosToken,
      precoApiOk: !!correiosPreco?.ok,
      prazoApiOk: !!correiosPrazo?.ok,
      precoApiDetail: correiosPreco?.detail || null,
      prazoApiDetail: correiosPrazo?.detail || null,
      prePostagemApiOk: !!correiosPrePostagem?.ok,
      prePostagemApiDetail: correiosPrePostagem?.detail || null,
      servico04227OnCard: !!correiosServico04227?.ok,
      servico04227Detail: correiosServico04227?.detail || null,
      servico86720OnCard: !!correiosServico86720?.ok,
      servico86720Detail: correiosServico86720?.detail || null,
      commercialContract: correiosCommercialContract(env),
      contractConfigured: !!env.CORREIOS_CONTRACT,
      serviceCode: ship.serviceCode || '04227',
      originCep: ship.originCep || ''
    },
    correiosExport: {
      simulatorReachable: exportOptions.length > 0,
      preferredServiceCode: ship.intlServiceCode || '45128',
      sampleQuotesPT: exportOptions.slice(0, 6),
      sampleQuotePT: exportQuote
        ? {
          price: exportQuote.price,
          days: exportQuote.days,
          service: exportQuote.service,
          source: exportQuote.source,
          weightGrams: exportQuote.weightGrams
        }
        : null
    },
    package: {
      weightGrams: shipWeight,
      lengthCm: ship.lengthCm,
      widthCm: ship.widthCm,
      heightCm: ship.heightCm,
      originCep: ship.originCep
    },
    products,
    weightMismatch,
    weightMismatchHint: weightMismatch
      ? 'O peso do produto no catálogo difere do peso do pacote (Frete Mini Envios). O checkout usa o peso do pacote.'
      : null,
    internationalShipping: config.internationalShipping,
    intlFallbackSync: sync.results,
    intlFallbackUpdated: sync.updated,
    paypal
  }, 200, origin);
}

async function getClicksIndex(env) {
  try {
    return JSON.parse((await env.STORE_KV.get(CLICKS_INDEX)) || '[]');
  } catch {
    return [];
  }
}

async function getClicksBlob(env) {
  try {
    const raw = await env.STORE_KV.get(CLICKS_BLOB);
    if (!raw) return null;
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : null;
  } catch {
    return null;
  }
}

async function clicksBlobStoreActive(env) {
  const raw = await env.STORE_KV.get(CLICKS_BLOB);
  return raw !== null && raw !== undefined;
}

async function saveClicksBlob(env, list) {
  await kvPut(env, CLICKS_BLOB, JSON.stringify(list));
}


async function purgeLegacyClickIndex(env, mode) {
  const ids = await getClicksIndex(env);
  if (!ids.length) return 0;
  let removed = 0;
  const kept = [];
  for (const id of ids) {
    const raw = await env.STORE_KV.get('click:' + id);
    if (!raw) {
      if (mode === 'all') removed++;
      continue;
    }
    let row;
    try {
      row = JSON.parse(raw);
    } catch {
      if (mode === 'all') {
        removed++;
        await kvDelete(env, 'click:' + id).catch(() => {});
      } else {
        kept.push(id);
      }
      continue;
    }
    const drop = mode === 'all' || isTestClick(row);
    if (drop) {
      removed++;
      await kvDelete(env, 'click:' + id).catch(() => {});
    } else {
      kept.push(id);
    }
  }
  await kvPut(env, CLICKS_INDEX, JSON.stringify(kept));
  return removed;
}

/** D1 click store — one INSERT per event (no KV blob rewrite, no Cache buffer loss). */
const CLICKS_D1_MIGRATE_KEY = 'clicks:d1-migrated-v1';
let clicksD1SchemaReady = false;

function clicksDb(env) {
  return env.CLICKS_DB || null;
}

async function ensureClicksD1(env) {
  const db = clicksDb(env);
  if (!db) return null;
  if (clicksD1SchemaReady) return db;
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS clicks (
      id TEXT PRIMARY KEY NOT NULL,
      ts INTEGER NOT NULL,
      tipo TEXT,
      destino TEXT,
      visitante_id TEXT,
      sessao_visita TEXT,
      pagina TEXT,
      teste INTEGER NOT NULL DEFAULT 0,
      payload TEXT NOT NULL
    )
  `).run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_clicks_ts ON clicks(ts DESC)').run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_clicks_destino ON clicks(destino)').run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_clicks_visitante ON clicks(visitante_id)').run();
  clicksD1SchemaReady = true;
  return db;
}

function isCrawlerClick(entry, request) {
  const ua = `${request?.headers?.get?.('User-Agent') || ''} ${entry?.user_agent || ''}`;
  if (/googlebot|bingbot|yandexbot|baiduspider|duckduckbot|facebookexternalhit|bytespider|semrush|ahrefs|petalbot|gptbot|claudebot|applebot|slurp|dotbot|mj12bot|ia_archiver|pingdom|uptimerobot/i.test(ua)) {
    return true;
  }
  const ip = String(entry?.ip || '');
  if (/^66\.249\./.test(ip) || /^66\.102\./.test(ip)) return true;
  if (/^207\.46\./.test(ip) || /^40\.77\./.test(ip)) return true;
  return false;
}

async function insertClickD1(env, entry) {
  const db = await ensureClicksD1(env);
  if (!db) throw new Error('CLICKS_DB (D1) não configurado no Worker.');
  const id = String(entry.client_event_id || entry.id || crypto.randomUUID()).slice(0, 64);
  const ts = Number(entry.ts) || Date.now();
  const row = { ...entry, id, ts };
  const teste = (row.teste === true || row.is_test === true) ? 1 : 0;
  await db.prepare(
    `INSERT OR REPLACE INTO clicks
      (id, ts, tipo, destino, visitante_id, sessao_visita, pagina, teste, payload)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id,
    ts,
    String(row.tipo || '').slice(0, 24),
    String(row.destino || '').slice(0, 48),
    String(row.visitante_id || '').slice(0, 64),
    String(row.sessao_visita || '').slice(0, 64),
    String(row.pagina || '').slice(0, 200),
    teste,
    JSON.stringify(row)
  ).run();
  return row;
}

async function trimClicksD1(env) {
  const db = await ensureClicksD1(env);
  if (!db) return;
  const cutoff = clicksRetentionWindow().cutoffMs;
  await db.prepare('DELETE FROM clicks WHERE ts < ?').bind(cutoff).run().catch(() => {});
  await db.prepare(`
    DELETE FROM clicks WHERE ts < (
      SELECT ts FROM clicks ORDER BY ts DESC LIMIT 1 OFFSET ?
    )
  `).bind(CLICKS_MAX - 1).run().catch(() => {});
}

async function loadClicksFromD1(env, limit = CLICKS_TREE_MAX) {
  const db = clicksDb(env);
  if (!db) return null;
  await ensureClicksD1(env);
  const countRow = await db.prepare('SELECT COUNT(*) AS n FROM clicks').first();
  const total = Number(countRow?.n || 0);
  const res = await db.prepare(
    'SELECT ts, payload FROM clicks ORDER BY ts DESC LIMIT ?'
  ).bind(Math.min(CLICKS_TREE_MAX, Math.max(1, limit))).all();
  const loaded = [];
  for (const r of res?.results || []) {
    try {
      const row = JSON.parse(r.payload);
      const ts = Number(row.ts) || Number(r.ts) || 0;
      loaded.push({ ...row, ts });
    } catch { /* skip */ }
  }
  return { loaded, total };
}

/** Slim rows for retention-window charts — no full payload (keeps Admin fast). */
async function loadClicksSlimFromD1(env, cutoffMs) {
  const db = clicksDb(env);
  if (!db) return [];
  await ensureClicksD1(env);
  const res = await db.prepare(`
    SELECT ts, tipo, destino, visitante_id, sessao_visita, pagina, teste, id,
      json_extract(payload, '$.site_host') AS site_host,
      json_extract(payload, '$.idioma') AS idioma,
      json_extract(payload, '$.user_agent') AS user_agent,
      json_extract(payload, '$.ip') AS ip,
      json_extract(payload, '$.destino_label') AS destino_label,
      json_extract(payload, '$.cidade') AS cidade,
      json_extract(payload, '$.estado') AS estado,
      json_extract(payload, '$.pais') AS pais,
      json_extract(payload, '$.pais_nome') AS pais_nome,
      json_extract(payload, '$.dispositivo') AS dispositivo
    FROM clicks
    WHERE ts >= ?
    ORDER BY ts DESC
    LIMIT ?
  `).bind(cutoffMs, CLICKS_MAX).all();
  return (res?.results || []).map((r) => ({
    id: r.id,
    ts: Number(r.ts) || 0,
    tipo: r.tipo || '',
    destino: r.destino || '',
    destino_label: r.destino_label || '',
    visitante_id: r.visitante_id || '',
    sessao_visita: r.sessao_visita || '',
    pagina: r.pagina || '',
    teste: Number(r.teste) === 1,
    site_host: r.site_host || '',
    idioma: r.idioma || '',
    user_agent: r.user_agent || '',
    ip: r.ip || '',
    cidade: r.cidade || '',
    estado: r.estado || '',
    pais: r.pais || '',
    pais_nome: r.pais_nome || '',
    dispositivo: r.dispositivo || ''
  }));
}

async function clearClicksD1(env, mode) {
  const db = await ensureClicksD1(env);
  if (!db) return { removed: 0, remaining: 0 };
  if (mode === 'all') {
    const before = await db.prepare('SELECT COUNT(*) AS n FROM clicks').first();
    await db.prepare('DELETE FROM clicks').run();
    return { removed: Number(before?.n || 0), remaining: 0 };
  }
  // Remove non-real / test rows: pull candidates and delete by id (isTestClick is JS logic).
  const res = await db.prepare('SELECT id, payload FROM clicks ORDER BY ts DESC LIMIT ?').bind(CLICKS_MAX).all();
  const dropIds = [];
  for (const r of res?.results || []) {
    let row;
    try { row = JSON.parse(r.payload); } catch { dropIds.push(r.id); continue; }
    if (isTestClick(row)) dropIds.push(r.id);
  }
  for (let i = 0; i < dropIds.length; i += 40) {
    const chunk = dropIds.slice(i, i + 40);
    const placeholders = chunk.map(() => '?').join(',');
    await db.prepare(`DELETE FROM clicks WHERE id IN (${placeholders})`).bind(...chunk).run();
  }
  const after = await db.prepare('SELECT COUNT(*) AS n FROM clicks').first();
  return { removed: dropIds.length, remaining: Number(after?.n || 0) };
}

let clicksKvMigrated = false;
let droppedLegacyClickKv = false;

async function maybeMigrateKvClicksToD1(env) {
  if (clicksKvMigrated) return;
  const db = clicksDb(env);
  if (!db) return;
  try {
    if (await env.STORE_KV.get(CLICKS_D1_MIGRATE_KEY)) {
      clicksKvMigrated = true;
      return;
    }
  } catch { /* continue */ }
  await ensureClicksD1(env);
  const blob = (await getClicksBlob(env)) || [];
  if (blob.length) {
    const slice = blob.slice(0, CLICKS_MAX);
    for (let i = 0; i < slice.length; i += 25) {
      const chunk = slice.slice(i, i + 25);
      const stmts = chunk.map((entry) => {
        const id = String(entry.id || crypto.randomUUID());
        const ts = Number(entry.ts) || Date.now();
        const row = { ...entry, id, ts };
        const teste = (row.teste === true || row.is_test === true) ? 1 : 0;
        return db.prepare(
          `INSERT OR IGNORE INTO clicks
            (id, ts, tipo, destino, visitante_id, sessao_visita, pagina, teste, payload)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          id, ts,
          String(row.tipo || '').slice(0, 24),
          String(row.destino || '').slice(0, 48),
          String(row.visitante_id || '').slice(0, 64),
          String(row.sessao_visita || '').slice(0, 64),
          String(row.pagina || '').slice(0, 200),
          teste,
          JSON.stringify(row)
        );
      });
      await db.batch(stmts);
    }
  }
  await kvPutSafe(env, CLICKS_D1_MIGRATE_KEY, new Date().toISOString());
}

async function appendClickLog(env, entry) {
  return insertClickD1(env, entry);
}

async function appendClickLogBatch(env, entries) {
  const rowsIn = Array.isArray(entries) ? entries.filter(Boolean) : [];
  if (!rowsIn.length) return [];
  const written = [];
  for (const entry of rowsIn) {
    written.push(await insertClickD1(env, entry));
  }
  return written;
}

/**
 * Persist one click immediately to D1 (durable). No Cache batching — that lost events across edges.
 */
async function persistClickLog(env, entry) {
  return insertClickD1(env, {
    ...entry,
    id: entry.id || crypto.randomUUID(),
    ts: Number(entry.ts) || Date.now()
  });
}

async function isDuplicateClickEvent(eventId) {
  const id = String(eventId || '').trim().slice(0, 64);
  if (!id) return false;
  const cache = caches.default;
  const req = new Request(`https://stf-click-dedupe/${encodeURIComponent(id)}`);
  return !!(await cache.match(req));
}

/** Claim the event id before writing so beacon+fetch races cannot persist 3 rows. */
async function claimClickEvent(eventId) {
  const id = String(eventId || '').trim().slice(0, 64);
  if (!id) return true;
  const cache = caches.default;
  const req = new Request(`https://stf-click-dedupe/${encodeURIComponent(id)}`);
  if (await cache.match(req)) return false;
  await cache.put(req, new Response('1', { headers: { 'Cache-Control': 'max-age=120' } }));
  return true;
}

async function markClickEventSeen(eventId) {
  const id = String(eventId || '').trim().slice(0, 64);
  if (!id) return;
  const cache = caches.default;
  const req = new Request(`https://stf-click-dedupe/${encodeURIComponent(id)}`);
  await cache.put(req, new Response('1', { headers: { 'Cache-Control': 'max-age=120' } }));
}

const PIXEL_GIF = Uint8Array.from([71, 73, 70, 56, 57, 97, 1, 0, 1, 0, 128, 0, 0, 255, 255, 255, 0, 0, 0, 33, 249, 4, 1, 0, 0, 0, 0, 44, 0, 0, 0, 0, 1, 0, 1, 0, 0, 2, 2, 68, 1, 0, 59]);

function clickField(data, key, maxLen, fallback) {
  return String(data?.[key] ?? fallback ?? '').slice(0, maxLen);
}

function inferDispositivoFromRequest(request) {
  const ua = request.headers.get('User-Agent') || '';
  if (!ua) return '';
  const mobile = /Mobile|Android|iPhone|iPad/i.test(ua);
  let browser = 'outro';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/Chrome\//i.test(ua)) browser = 'Chrome';
  else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
  else if (/Firefox\//i.test(ua)) browser = 'Firefox';
  return (mobile ? 'Celular' : 'Computador') + ' · ' + browser;
}

function inferDispositivoFromUserAgent(uaRaw) {
  const ua = String(uaRaw || '');
  if (!ua) return '';
  const mobile = /Mobile|Android|iPhone|iPad/i.test(ua);
  return mobile ? 'Celular' : 'Computador';
}

function buildClickEntry(data, request) {
  const ip = clientIp(request);
  const geo = extractClickGeo(request);
  const userAgent = (request.headers.get('User-Agent') || '').slice(0, 200);
  const dispositivoClient = clickField(data, 'dispositivo', 80);
  const dispositivo = (dispositivoClient && dispositivoClient !== '—')
    ? dispositivoClient
    : inferDispositivoFromRequest(request);
  return {
    tipo: clickField(data, 'tipo', 24, 'clique'),
    destino: clickField(data, 'destino', 48),
    destino_label: clickField(data, 'destino_label', 80),
    rotulo: clickField(data, 'rotulo', 120),
    secao: clickField(data, 'secao', 60),
    secao_label: clickField(data, 'secao_label', 80),
    elemento: clickField(data, 'elemento', 24),
    href: clickField(data, 'href', 500),
    pagina: clickField(data, 'pagina', 200),
    titulo_pagina: clickField(data, 'titulo_pagina', 120),
    idioma: clickField(data, 'idioma', 24),
    site_host: clickField(data, 'site_host', 16),
    referrer: clickField(data, 'referrer', 200),
    dispositivo,
    user_agent: userAgent,
    fuso: clickField(data, 'fuso', 60),
    visitante_id: clickField(data, 'visitante_id', 64),
    sessao_visita: clickField(data, 'sessao_visita', 64),
    sequencia: Math.max(0, Math.min(9999, parseInt(data?.sequencia, 10) || 0)),
    cliente_nome: clickField(data, 'cliente_nome', 80),
    cliente_email: clickField(data, 'cliente_email', 120),
    pais: clickField(data, 'pais', 12, geo.pais),
    pais_nome: clickField(data, 'pais_nome', 48, geo.pais_nome),
    estado: clickField(data, 'estado', 48, geo.estado),
    cidade: clickField(data, 'cidade', 48, geo.cidade),
    ip: ip !== 'unknown' ? ip : '',
    ip_prefix: ip !== 'unknown' && ip.includes('.') ? ip.split('.').slice(0, 2).join('.') + '.x.x' : '',
    client_ts: Math.max(0, parseInt(data?.client_ts, 10) || 0),
    origem_trafego: clickField(data, 'origem_trafego', 32),
    origem_trafego_label: clickField(data, 'origem_trafego_label', 80),
    utm_source: clickField(data, 'utm_source', 48),
    utm_medium: clickField(data, 'utm_medium', 32),
    utm_campaign: clickField(data, 'utm_campaign', 64),
    teste: data?.teste === true || data?.teste === 'true' || data?.is_test === true || data?.is_test === 'true',
    client_event_id: clickField(data, 'client_event_id', 64)
  };
}

function pixelResponse(origin, status) {
  return new Response(PIXEL_GIF, {
    status: status || 200,
    headers: {
      ...corsHeaders(origin),
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store'
    }
  });
}

const REAL_VISITOR_UUID = /^v_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REAL_VISITOR_TS = /^v_\d{10,13}$/;

function isRealVisitorId(vid) {
  const v = String(vid || '').trim();
  if (!v) return false;
  if (REAL_VISITOR_UUID.test(v)) return true;
  if (REAL_VISITOR_TS.test(v)) return true;
  return false;
}

/** Só tráfego real: visitante gerado pelo analytics.js no site público. */
function isRealClick(row) {
  if (!row || typeof row !== 'object') return false;
  if (row.teste === true || row.is_test === true) return false;

  const vid = String(row.visitante_id || '').trim();
  if (!isRealVisitorId(vid)) return false;
  if (/^v_(fix|test|key|fn|diag|check|proxy|admin)/i.test(vid)) return false;

  const pagina = String(row.pagina || '').toLowerCase();
  if (/admin\.html|\/admin|documentacao|pedidos\.html|imprimir-etiqueta/.test(pagina)) return false;

  const sessao = String(row.sessao_visita || '').toLowerCase();
  if (/^admin_|^s_test|^test_/.test(sessao)) return false;

  const hay = [
    row.rotulo, row.destino, row.destino_label, row.secao, row.secao_label,
    row.elemento, row.referrer
  ].map((s) => String(s || '').toLowerCase()).join(' ');

  if (/\b(teste|test|diag|verify|proxy|deploy)\b|admin_teste|test_diag|pos-fix|pos fix|live_test|admin_panel/.test(hay)) {
    return false;
  }

  return true;
}

function isTestClick(row) {
  return !isRealClick(row);
}

async function handleAdminClearClicks(request, env, origin) {
  if (!(await isValidSession(env, bearerToken(request)))) {
    return json({ error: 'Não autorizado.' }, 401, origin);
  }
  const body = await request.json().catch(() => ({}));
  const mode = body.mode === 'all' ? 'all' : 'tests';

  let removed = 0;
  let remaining = 0;

  if (clicksDb(env)) {
    const d1 = await clearClicksD1(env, mode);
    removed += d1.removed;
    remaining = d1.remaining;
  }

  return json({ ok: true, mode, removed, remaining, store: 'd1' }, 200, origin);
}

async function checkClickRate(env, ip) {
  if (!ip || ip === 'unknown') return true;
  const minute = Math.floor(Date.now() / 60000);
  const cache = caches.default;
  const req = new Request(`https://stf-click-rate/${encodeURIComponent(ip)}/${minute}`);
  const hit = await cache.match(req);
  const n = (hit ? parseInt(await hit.text(), 10) || 0 : 0) + 1;
  if (n > 180) return false;
  await cache.put(req, new Response(String(n), { headers: { 'Cache-Control': 'max-age=120' } }));
  return true;
}

async function handleLogClick(request, env, origin, ctx) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return json({ error: 'Payload inválido.' }, 400, origin);
  }
  if (!isAllowedSiteRequest(request) && !isValidClickLogKey(body, env)) {
    return json({ error: 'Origem não permitida.' }, 403, origin);
  }

  const ip = clientIp(request);
  if (!(await checkClickRate(env, ip))) {
    return json({ ok: true, dropped: true }, 202, origin);
  }

  const eventId = String(body.client_event_id || '').trim().slice(0, 64);
  if (eventId && await isDuplicateClickEvent(eventId)) {
    return json({ ok: true, deduped: true }, 202, origin);
  }

  const entry = buildClickEntry(body, request);
  if (isCrawlerClick(entry, request)) {
    return json({ ok: true, dropped: true, reason: 'crawler' }, 202, origin);
  }

  try {
    await persistClickLog(env, entry);
  } catch (err) {
    console.error('click log:', err.message);
    if (isKvQuotaError(err)) await markKvWriteQuotaExhausted();
    return json({
      ok: false,
      error: 'storage',
      retry: true,
      kvQuota: isKvQuotaError(err) || undefined
    }, 503, origin);
  }

  // Mark after successful write — marking before put caused silent log loss on KV errors.
  if (eventId) {
    if (ctx && typeof ctx.waitUntil === 'function') ctx.waitUntil(markClickEventSeen(eventId));
    else await markClickEventSeen(eventId);
  }

  return json({ ok: true }, 202, origin);
}

async function handleLogClickPixel(request, env, origin, ctx) {
  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams.entries());
  if (!isAllowedSiteRequest(request) && !isValidClickLogKey(params, env)) {
    return pixelResponse(origin, 403);
  }

  const ip = clientIp(request);
  if (!(await checkClickRate(env, ip))) {
    return pixelResponse(origin);
  }

  const eventId = String(params.client_event_id || '').trim().slice(0, 64);
  if (eventId && await isDuplicateClickEvent(eventId)) {
    return pixelResponse(origin);
  }

  const entry = buildClickEntry(params, request);
  if (isCrawlerClick(entry, request)) {
    return pixelResponse(origin);
  }

  try {
    await persistClickLog(env, entry);
  } catch (err) {
    console.error('click pixel:', err.message);
  }

  if (eventId) {
    if (ctx && typeof ctx.waitUntil === 'function') ctx.waitUntil(markClickEventSeen(eventId));
    else await markClickEventSeen(eventId);
  }

  return pixelResponse(origin);
}

async function loadClickRows(env, ids, maxRows) {
  const rows = [];
  const batch = 50;
  for (let i = 0; i < ids.length && rows.length < maxRows; i += batch) {
    const slice = ids.slice(i, i + batch);
    const raws = await Promise.all(slice.map((id) => env.STORE_KV.get('click:' + id)));
    for (const raw of raws) {
      if (!raw) continue;
      try {
        rows.push(JSON.parse(raw));
      } catch {
        continue;
      }
    }
  }
  return rows;
}

function adminDeviceLabel(row) {
  let d = String(row?.dispositivo || '').trim();
  if (!d || d === '—') d = inferDispositivoFromUserAgent(row?.user_agent);
  if (!d) return '';
  if (/celular|mobile/i.test(d)) return 'Celular';
  if (/computador|desktop/i.test(d)) return 'Computador';
  return d.split(/[·/]/)[0].trim() || d;
}

function enrichClickRowForAdmin(row) {
  const devLabel = adminDeviceLabel(row);
  if (!devLabel) return row;
  return { ...row, dispositivo: devLabel };
}

async function flushClickWriteBufferToKv(env) {
  return 0;
}

async function dropLegacyClickKvShell(env) {
  if (droppedLegacyClickKv) return;
  droppedLegacyClickKv = true;
  try {
    if (await env.STORE_KV.get(CLICKS_BLOB) != null) await kvDelete(env, CLICKS_BLOB);
    if (await env.STORE_KV.get(CLICKS_INDEX) != null) await kvDelete(env, CLICKS_INDEX);
  } catch (err) {
    droppedLegacyClickKv = false;
    console.warn('drop legacy click KV:', err?.message || err);
  }
}

async function handleAdminListClicks(request, env, origin) {
  if (!(await isValidSession(env, bearerToken(request)))) {
    return json({ error: 'Não autorizado.' }, 401, origin);
  }

  const url = new URL(request.url);
  const q = (url.searchParams.get('q') || '').trim().toLowerCase();
  const destino = (url.searchParams.get('destino') || '').trim();
  const tipo = (url.searchParams.get('tipo') || '').trim();
  const withNav = url.searchParams.get('nav') === '1'
    || url.searchParams.get('com_navegacao') === '1'
    || url.searchParams.get('navegacao') === '1';
  const limit = Math.min(CLICKS_TREE_MAX, Math.max(20, parseInt(url.searchParams.get('limit') || String(CLICKS_TREE_MAX), 10) || CLICKS_TREE_MAX));
  const window = clicksRetentionWindow();

  const fromD1 = await loadClicksFromD1(env, limit);
  let loaded = fromD1?.loaded || [];
  let total = fromD1?.total || 0;

  function sessionKey(row) {
    const vid = String(row?.visitante_id || '').trim();
    const sid = String(row?.sessao_visita || '').trim();
    if (vid && sid) return `v:${vid}|s:${sid}`;
    if (vid) return `v:${vid}`;
    if (sid) return `s:${sid}`;
    const ip = String(row?.ip || row?.ip_prefix || '').trim();
    const day = row?.ts ? new Date(row.ts).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '';
    if (ip && day) return `ip:${ip}|d:${day}`;
    return '';
  }

  function matchesDestino(row) {
    if (destino === 'pageview') return row.tipo === 'pageview';
    if (destino) return row.destino === destino;
    return true;
  }

  function matchesQuery(row) {
    if (!q) return true;
    const hay = [
      row.rotulo, row.destino, row.destino_label, row.secao, row.secao_label,
      row.pagina, row.visitante_id, row.sessao_visita, row.cliente_email, row.cliente_nome, row.referrer, row.tipo, row.ip, row.ip_prefix,
      row.pais, row.pais_nome, row.estado, row.cidade,
      row.origem_trafego, row.origem_trafego_label, row.utm_source, row.utm_medium, row.utm_campaign,
      row.dispositivo, row.user_agent
    ].join(' ').toLowerCase();
    return hay.includes(q);
  }

  let navSessionKeys = null;
  if (withNav && (destino || tipo === 'pageview' || destino === 'pageview')) {
    navSessionKeys = new Set();
    for (const row of loaded) {
      if (!matchesDestino(row)) continue;
      if (tipo && row.tipo !== tipo) continue;
      const key = sessionKey(row);
      if (key) navSessionKeys.add(key);
    }
  }

  const clicks = [];
  for (const row of loaded) {
    if (navSessionKeys) {
      const key = sessionKey(row);
      if (!key || !navSessionKeys.has(key)) continue;
    } else {
      if (!matchesDestino(row)) continue;
      if (tipo && row.tipo !== tipo) continue;
    }
    if (!matchesQuery(row)) continue;
    clicks.push(enrichClickRowForAdmin(row));
    if (clicks.length >= limit) break;
  }

  const todayKey = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const brDateKey = (ts) => new Date(ts).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  const byDestino = {};
  let todayCount = 0;
  const statsSample = loaded.slice(0, 300);
  for (const row of statsSample) {
    if (brDateKey(row.ts) === todayKey) todayCount++;
    const key = row.destino || row.tipo || 'outro';
    byDestino[key] = (byDestino[key] || 0) + 1;
  }

  let lastClickAt = null;
  if (loaded.length && loaded[0]?.ts) {
    lastClickAt = new Date(loaded[0].ts).toISOString();
  }
  let oldestClickAt = null;
  if (loaded.length && loaded[loaded.length - 1]?.ts) {
    oldestClickAt = new Date(loaded[loaded.length - 1].ts).toISOString();
  }

  const capUsed = total;
  const capMax = CLICKS_MAX;
  const capPercent = capMax > 0 ? Math.min(100, Math.round((capUsed / capMax) * 100)) : 0;
  const capFull = capUsed >= capMax;
  const capNearFull = !capFull && capUsed >= Math.floor(capMax * 0.9);
  const dailyD1 = await buildD1DailyBudget(env);
  const whenClicks = fromD1
    ? await loadClicksSlimFromD1(env, window.cutoffMs).catch(() => [])
    : clicks.slice();

  return json({
    clicks,
    whenClicks,
    total,
    todayCount,
    byDestino,
    lastClickAt,
    oldestClickAt,
    capacity: {
      used: capUsed,
      max: capMax,
      percent: capPercent,
      full: capFull,
      nearFull: capNearFull,
      closedMonths: window.closedMonths,
      totalMonths: window.totalMonths,
      currentYm: window.currentYm,
      cutoffAt: new Date(window.cutoffMs).toISOString(),
      months: window.months,
      dropsOldestWhenFull: true
    },
    dailyD1,
    store: 'd1',
    withNav: !!navSessionKeys,
    navSessions: navSessionKeys ? navSessionKeys.size : 0,
    checkedAt: new Date().toISOString()
  }, 200, origin);
}

async function getFeedbackList(env) {
  try {
    const raw = await env.STORE_KV.get(FEEDBACK_BLOB);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

async function saveFeedbackList(env, list) {
  await kvPut(env, FEEDBACK_BLOB, JSON.stringify(list));
}

async function appendFeedback(env, entry) {
  const row = { id: crypto.randomUUID(), ts: Date.now(), ...entry };
  let list = await getFeedbackList(env);
  list.unshift(row);
  if (list.length > FEEDBACK_MAX) list.length = FEEDBACK_MAX;
  await saveFeedbackList(env, list);
  return row;
}

async function checkFeedbackRate(env, ip) {
  if (!ip || ip === 'unknown') return true;
  const hour = Math.floor(Date.now() / 3600000);
  const cache = caches.default;
  const req = new Request(`https://stf-feedback-rate/${encodeURIComponent(ip)}/${hour}`);
  const hit = await cache.match(req);
  const n = (hit ? parseInt(await hit.text(), 10) || 0 : 0) + 1;
  if (n > 12) return false;
  await cache.put(req, new Response(String(n), { headers: { 'Cache-Control': 'max-age=7200' } }));
  return true;
}

function feedbackField(data, key, maxLen) {
  return String(data?.[key] ?? '').trim().slice(0, maxLen);
}

async function handleFeedback(request, env, origin) {
  if (!isAllowedSiteRequest(request)) {
    return json({ error: 'Origem não permitida.' }, 403, origin);
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return json({ error: 'Payload inválido.' }, 400, origin);
  }

  const buscava = feedbackField(body, 'buscava', 800);
  if (buscava.length < 8) {
    return json({ error: 'Descreva o que procurava (mín. 8 caracteres).' }, 400, origin);
  }

  const ip = clientIp(request);
  if (!(await checkFeedbackRate(env, ip))) {
    return json({ error: 'Muitas respostas em pouco tempo. Tente mais tarde.' }, 429, origin);
  }

  const paisCf = (request.headers.get('CF-IPCountry') || '').trim();
  const entry = {
    buscava,
    sugestao: feedbackField(body, 'sugestao', 800),
    email: feedbackField(body, 'email', 120),
    pagina: feedbackField(body, 'pagina', 200),
    titulo_pagina: feedbackField(body, 'titulo_pagina', 120),
    idioma: feedbackField(body, 'idioma', 24),
    referrer: feedbackField(body, 'referrer', 200),
    pais: paisCf,
    ip: ip !== 'unknown' ? ip : ''
  };

  try {
    await appendFeedback(env, entry);
  } catch (err) {
    console.error('feedback save:', err.message);
    return json({ error: 'Falha ao gravar.' }, 503, origin);
  }

  const config = await getConfig(env);
  const when = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  notifyShop(env, config, 'Pesquisa site — o que faltou', {
    'Procurava': buscava,
    'Sugestão': entry.sugestao || '—',
    'E-mail visitante': entry.email || '—',
    'Página': entry.pagina || '—',
    'Idioma': entry.idioma || '—',
    'Referrer': entry.referrer || '—',
    'País': entry.pais || '—',
    'Quando': when
  }).catch(() => {});

  return json({ ok: true }, 202, origin);
}

async function handleAdminListFeedback(request, env, origin) {
  if (!(await isValidSession(env, bearerToken(request)))) {
    return json({ error: 'Não autorizado.' }, 401, origin);
  }
  const url = new URL(request.url);
  const q = (url.searchParams.get('q') || '').trim().toLowerCase();
  const limit = Math.min(200, Math.max(20, parseInt(url.searchParams.get('limit') || '100', 10) || 100));
  const loaded = await getFeedbackList(env);
  let items = loaded;
  if (q) {
    items = loaded.filter((row) => {
      const hay = [row.buscava, row.sugestao, row.email, row.pagina, row.idioma, row.pais].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }
  return json({
    feedback: items.slice(0, limit),
    total: loaded.length,
    checkedAt: new Date().toISOString()
  }, 200, origin);
}

async function handleAdminClearFeedback(request, env, origin) {
  if (!(await isValidSession(env, bearerToken(request)))) {
    return json({ error: 'Não autorizado.' }, 401, origin);
  }
  const list = await getFeedbackList(env);
  const removed = list.length;
  await saveFeedbackList(env, []);
  return json({ ok: true, removed }, 200, origin);
}

async function handleTestEmail(request, env, origin) {
  if (!(await isValidSession(env, bearerToken(request)))) {
    return json({ error: 'Não autorizado.' }, 401, origin);
  }
  const config = await getConfig(env);
  const body = await request.json().catch(() => ({}));
  const to = (body.email || getEmails(config).testTo || config.formsubmit?.email || '').trim();
  if (!to) return json({ error: 'Configure o e-mail de destino dos testes (Contato → Testes de e-mail).' }, 400, origin);

  const TEST_EMAIL_TYPES = [
    'generic',
    'shop_order',
    'shop_paid',
    'customer_order',
    'customer_order_paypal',
    'customer_order_mp',
    'customer_pix',
    'customer_paid',
    'motoboy',
    'coupon'
  ];

  const type = body.type || 'generic';
  const normalizedType = type === 'order' ? 'shop_order' : type === 'paid' ? 'shop_paid' : type;
  const types = normalizedType === 'all' ? TEST_EMAIL_TYPES : [normalizedType];
  if (!types.every((t) => TEST_EMAIL_TYPES.includes(t))) {
    return json({ error: 'Tipo de teste inválido.' }, 400, origin);
  }

  const results = [];
  const overrides = {
    nome: body.nome,
    smartwatch: body.smartwatch,
    checkoutLocale: body.checkoutLocale || body.locale,
    telefone: body.telefone,
    pais: body.pais,
    paisCode: body.paisCode,
    endereco: body.endereco,
    shippingService: body.shippingService,
    pagamento: body.pagamento
  };
  for (const t of types) {
    const result = await sendTestEmailByType(env, config, to, t, overrides);
    results.push({ type: t, ...result });
    if (!result.ok && type !== 'all') {
      return json({ ok: false, type: t, results, ...result }, 502, origin);
    }
  }

  const failed = results.filter((r) => !r.ok);
  const ok = failed.length === 0;
  return json({
    ok,
    to,
    sent: results.filter((r) => r.ok).length,
    failed: failed.length,
    results
  }, ok ? 200 : 502, origin);
}

function buildTestOrder(config, to, overrides = {}) {
  const orderId = 'STF-TESTE-' + Date.now();
  const price = Number(config.product?.price) || 62.9;
  const locale = String(overrides.checkoutLocale || 'pt').toLowerCase();
  const isIntl = locale === 'en' || locale === 'it';
  return {
    orderId,
    nome: overrides.nome || (isIntl ? 'Nicolas Brown' : 'Nicolas Brown'),
    email: to,
    telefone: overrides.telefone || (isIntl ? '+61 400 000 000' : '(11) 99999-9999'),
    smartwatch: overrides.smartwatch || 'Garmin Fenix',
    produto: config.product?.name || 'Kit Sensor Tattoo Fix',
    total: price + (isIntl ? 40 : 11.9),
    valorProduto: price,
    frete: isIntl ? 40 : 11.9,
    pagamento: overrides.pagamento || 'PIX',
    endereco: overrides.endereco || (isIntl
      ? '12 Example St — Sydney NSW — Australia 2000'
      : 'Av Paulista, 1000 — Bela Vista, São Paulo/SP — Brasil 01310100'),
    pais: overrides.pais || (isIntl ? 'Australia' : 'Brasil'),
    paisCode: overrides.paisCode || (isIntl ? 'AU' : 'BR'),
    shippingService: overrides.shippingService || (isIntl ? 'Tracked mail' : 'Mini Envios'),
    pixCopyPaste: '00020126580014BR.GOV.BCB.PIX0136123456789012345204000053039865405' + String(Math.round(price * 100)).padStart(4, '0') + '5802BR6009SAO PAULO62070503***6304TEST',
    status: 'pending_payment',
    checkoutLocale: locale === 'en' || locale === 'it' ? locale : 'pt',
    accessToken: 'test-token-' + orderId
  };
}

async function sendTestEmailByType(env, config, to, type, overrides = {}) {
  const order = buildTestOrder(config, to, overrides);
  const price = Number(config.product?.price) || 62.9;
  const adminUrl = `${(config.siteUrl || DEFAULT_CONFIG.siteUrl).replace(/\/$/, '')}/pedidos.html`;

  switch (type) {
    case 'generic':
      return notifyEmail(env, config, to, emailSubject(config, 'testSubject'), {
        Teste: 'Envio de e-mail da loja (TESTE)',
        Horário: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
        Remetente: emailFrom(env, config)
      }, config.formsubmit?.email);

    case 'shop_order':
      return notifyEmail(env, config, to, config.formsubmit?.subject || 'Novo pedido — teste', {
        Pedido: order.orderId,
        Status: 'pending_payment (TESTE)',
        Nome: order.nome,
        'E-mail': 'cliente@exemplo.com',
        Telefone: order.telefone,
        Smartwatch: order.smartwatch,
        País: order.pais,
        Pagamento: 'PIX',
        Total: formatBRL(order.total)
      }, config.formsubmit?.email);

    case 'shop_paid':
      return notifyEmail(env, config, to, emailSubject(config, 'shopPaidSubject', { orderId: order.orderId }), {
        Pedido: order.orderId,
        Status: 'PAGO (TESTE — não é pedido real)',
        Cliente: order.nome,
        'E-mail cliente': 'cliente@exemplo.com',
        Telefone: order.telefone,
        Pagamento: 'Cartão de crédito',
        Smartwatch: order.smartwatch,
        Valor: formatBRL(price),
        Endereço: order.endereco,
        Envio: order.shippingService
      }, config.formsubmit?.email);

    case 'customer_order':
      return notifyCustomerPendingPayment(env, config, { ...order, pagamento: 'Cartão de crédito' }, 'CREDIT_CARD');

    case 'customer_order_paypal':
      return notifyCustomerPendingPayment(env, config, { ...order, pagamento: 'PayPal' }, 'PAYPAL');

    case 'customer_order_mp':
      return notifyCustomerPendingPayment(env, config, { ...order, pagamento: 'Mercado Pago' }, 'MP_CHECKOUT');

    case 'customer_pix':
      return notifyCustomerPendingPix(env, config, order);

    case 'customer_paid':
      return notifyCustomer(env, config, order, emailSubject(config, 'customerPaidSubject', { orderId: order.orderId }), {
        Pedido: order.orderId,
        Status: 'PAGO (TESTE)',
        Valor: formatBRL(price),
        Mensagem: emailMessage(config, 'paidDefault')
      });

    case 'motoboy':
      return notifyEmail(env, config, to, emailSubject(config, 'motoboySubject', { orderId: order.orderId }), {
        Motoboy: 'Motoboy Teste',
        Pedido: order.orderId,
        Cliente: order.nome,
        Telefone: order.telefone,
        'E-mail cliente': 'cliente@exemplo.com',
        Endereço: order.endereco,
        Produto: order.produto,
        'Valor frete': formatBRL(order.frete),
        Distância: '~8 km',
        Prazo: `até ${getMotoboyConfig(config).deliveryHours}h`,
        'Painel pedidos': adminUrl,
        Smartwatch: order.smartwatch
      }, config.formsubmit?.email);

    case 'coupon':
      return notifyEmail(env, config, to, emailSubject(config, 'couponSubject', {
        orderId: order.orderId,
        amount: formatBRL(price * 0.1)
      }), {
        Comissionado: 'Comissionado Teste',
        Cupom: 'TESTE10',
        Pedido: order.orderId,
        Cliente: order.nome,
        'E-mail cliente': 'cliente@exemplo.com',
        Produto: order.produto,
        'Valor do produto': formatBRL(price),
        'Desconto aplicado': formatBRL(price * 0.1),
        'Total do pedido': formatBRL(order.total),
        Status: 'Pago (TESTE)',
        'Sua comissão (%)': '10%',
        'Comissão a receber': formatBRL(price * 0.1),
        'Painel pedidos': adminUrl,
        Smartwatch: order.smartwatch
      }, config.formsubmit?.email);

    default:
      return { ok: false, error: 'Tipo desconhecido' };
  }
}

const CUSTOMER_CANCEL_REASONS = [
  'changed_mind',
  'found_cheaper',
  'wrong_product',
  'shipping_too_slow',
  'payment_issue',
  'other'
];

function customerCanCancelOrder(order) {
  if (!order) return false;
  if (order.status === 'cancelled_by_user' || order.status === 'cancelled') return false;
  // Só antes do pagamento — pedido pago: cliente fala com a loja (e-mail/WhatsApp).
  return order.status === 'pending_payment';
}

async function authorizeCustomerOrderAccess(request, env, order) {
  const accessToken = new URL(request.url).searchParams.get('token')
    || (await request.clone().json().catch(() => ({}))).accessToken
    || '';
  if (accessToken && order.accessToken && accessToken === order.accessToken) return true;
  const customerId = await getCustomerUserId(env, bearerToken(request));
  return !!(customerId && order.userId === customerId);
}

async function handleCustomerCancelOrder(request, env, origin, orderId) {
  const order = await getOrder(env, orderId);
  if (!order) return json({ error: 'Pedido não encontrado.' }, 404, origin);
  if (!(await authorizeCustomerOrderAccess(request, env, order))) {
    return json({ error: 'Não autorizado.' }, 401, origin);
  }
  if (!customerCanCancelOrder(order)) {
    const paidMsg = order.status === 'paid'
      ? 'Pedido já pago não cancela pelo site. Envie um e-mail ou WhatsApp para solicitarmos o cancelamento.'
      : 'Este pedido não pode ser cancelado pelo site. Fale conosco pelo WhatsApp ou e-mail.';
    return json({ error: paidMsg, canCancel: false }, 400, origin);
  }

  const body = await request.json().catch(() => ({}));
  const reason = String(body.reason || '').trim();
  if (!CUSTOMER_CANCEL_REASONS.includes(reason)) {
    return json({
      error: 'Informe o motivo do cancelamento.',
      reasons: CUSTOMER_CANCEL_REASONS
    }, 400, origin);
  }
  const note = String(body.note || body.reasonNote || '').trim().slice(0, 500);
  if (reason === 'other' && note.length < 3) {
    return json({ error: 'Descreva o motivo (mín. 3 caracteres).' }, 400, origin);
  }

  const previousStatus = order.status;
  order.status = 'cancelled_by_user';
  order.cancelledAt = new Date().toISOString();
  order.cancelReason = reason;
  order.cancelReasonNote = note || null;
  order.cancelPreviousStatus = previousStatus;
  order.cancelAlternatives = Array.isArray(body.consideredAlternatives)
    ? body.consideredAlternatives.map((x) => String(x).slice(0, 40)).slice(0, 6)
    : [];
  await saveOrder(env, order);

  const config = await getConfig(env);
  const reasonLabel = {
    changed_mind: 'Desisti da compra',
    found_cheaper: 'Encontrei mais barato',
    wrong_product: 'Produto errado / não era o que eu queria',
    shipping_too_slow: 'Prazo de frete',
    payment_issue: 'Problema no pagamento',
    other: 'Outro'
  }[reason] || reason;

  try {
    await notifyShop(env, config, `Cancelado pelo cliente — ${order.orderId}`, {
      Pedido: order.orderId,
      Status: 'cancelled_by_user',
      Cliente: order.nome,
      Email: order.email,
      Motivo: reasonLabel,
      Detalhe: note || '—',
      'Status anterior': previousStatus,
      Alternativas: (order.cancelAlternatives || []).join(', ') || '—'
    });
  } catch (err) {
    console.warn('Cancel shop email:', order.orderId, err.message);
  }

  try {
    const loc = orderCheckoutLocale(order);
    const subject = loc === 'en'
      ? `Order cancelled — ${order.orderId}`
      : loc === 'it'
        ? `Ordine annullato — ${order.orderId}`
        : `Pedido cancelado — ${order.orderId}`;
    const msg = loc === 'en'
      ? 'Your order was cancelled. If this was a mistake, reply to this email or contact support.'
      : loc === 'it'
        ? 'Il tuo ordine è stato annullato. Se è un errore, rispondi a questa email o contatta il supporto.'
        : 'Seu pedido foi cancelado. Se foi um engano, responda este e-mail ou fale conosco.';
    await notifyCustomer(env, config, order, subject, {
      [loc === 'en' ? 'Order' : loc === 'it' ? 'Ordine' : 'Pedido']: order.orderId,
      [loc === 'en' ? 'Status' : 'Status']: 'cancelled_by_user',
      [loc === 'en' ? 'Message' : loc === 'it' ? 'Messaggio' : 'Mensagem']: msg
    });
  } catch (err) {
    console.warn('Cancel customer email:', order.orderId, err.message);
  }

  return json({
    ok: true,
    order: publicOrderView(order),
    status: order.status
  }, 200, origin);
}

async function handleGetOrder(request, env, origin, orderId) {
  let order = await getOrder(env, orderId);
  if (!order) return json({ error: 'Não encontrado.' }, 404, origin);

  if (await isValidSession(env, bearerToken(request))) {
    // Pré-postagem / PDF só em POST /orders/:id/shipping-label (botão Etiqueta), não ao abrir o pedido.
    return json(order, 200, origin);
  }

  const accessToken = new URL(request.url).searchParams.get('token') || '';
  if (accessToken && order.accessToken && accessToken === order.accessToken) {
    return json(publicOrderView(order, { includePayment: true }), 200, origin);
  }

  const customerId = await getCustomerUserId(env, bearerToken(request));
  if (customerId && order.userId === customerId) {
    return json(publicOrderView(order, { includePayment: order.status === 'pending_payment' }), 200, origin);
  }

  return json({ error: 'Não autorizado.' }, 401, origin);
}

async function handleAdminGetConfig(request, env, origin) {
  if (!(await isValidSession(env, bearerToken(request)))) {
    return json({ error: 'Não autorizado.' }, 401, origin);
  }
  // Inclui catálogo do site (smartwatches com sensorMm) mesclado ao KV.
  return json(await getPublicConfig(env), 200, origin);
}

async function handlePutConfig(request, env, origin) {
  if (!(await isValidSession(env, bearerToken(request)))) return json({ error: 'Não autorizado.' }, 401, origin);
  const body = await request.json();
  const current = await getConfig(env);
  const merged = {
    ...current, ...body,
    product: { ...current.product, ...body.product },
    pix: resolvePixConfig({ ...current.pix, ...body.pix }, DEFAULT_CONFIG.pix),
    shipping: { ...current.shipping, ...body.shipping },
    internationalShipping: { ...current.internationalShipping, ...body.internationalShipping },
    internationalSurcharge: body.internationalSurcharge != null
      ? Math.max(0, Number(body.internationalSurcharge) || 0)
      : current.internationalSurcharge,
    internationalShippingMultiplier: body.internationalShippingMultiplier != null
      ? Math.max(1, Number(body.internationalShippingMultiplier) || 1)
      : (current.internationalShippingMultiplier ?? DEFAULT_CONFIG.internationalShippingMultiplier),
    internationalProduct: { ...current.internationalProduct, ...body.internationalProduct },
    payments: {
      ...current.payments,
      ...body.payments,
      paypal: (() => {
        const merged = { ...current.payments?.paypal, ...body.payments?.paypal };
        delete merged.showAfter;
        return merged;
      })(),
      cardBr: mergeCardBrConfig(current.payments?.cardBr, body.payments?.cardBr),
      pixBr: mergePixBrConfig(current.payments?.pixBr, body.payments?.pixBr)
    },
    shippingMethods: body.shippingMethods?.length ? body.shippingMethods : current.shippingMethods,
    smartwatchModels: body.smartwatchModels != null
      ? (Array.isArray(body.smartwatchModels) ? body.smartwatchModels : current.smartwatchModels)
      : current.smartwatchModels,
    smartwatchCatalog: body.smartwatchCatalog != null
      ? mergeSmartwatchCatalog(body.smartwatchCatalog, current.smartwatchCatalog || {})
      : (current.smartwatchCatalog || {}),
    smartwatchModelMeta: body.smartwatchModelMeta != null
      ? { ...(current.smartwatchModelMeta || {}), ...body.smartwatchModelMeta }
      : (current.smartwatchModelMeta || {}),
    products: body.products?.length ? body.products : current.products,
    formsubmit: { ...current.formsubmit, ...body.formsubmit },
    emails: { ...(current.emails || {}), ...(body.emails || {}) },
    api: { ...current.api, ...body.api },
    channels: body.channels != null
      ? mergeChannelsConfig({ channels: body.channels }, DEFAULT_CONFIG)
      : mergeChannelsConfig(current, DEFAULT_CONFIG),
    kitCost: body.kitCost != null ? normalizeKitCost(body.kitCost) : normalizeKitCost(current.kitCost),
    kitCostIntl: body.kitCostIntl != null ? normalizeKitCost(body.kitCostIntl) : normalizeKitCost(current.kitCostIntl),
    kitCostVersion: body.kitCostVersion != null ? Number(body.kitCostVersion) || 3 : (current.kitCostVersion || 3),
    mlFlexShippingCost: body.mlFlexShippingCost != null
      ? Math.max(0, Math.round(Number(body.mlFlexShippingCost) * 100) / 100)
      : (current.mlFlexShippingCost ?? 0),
    homeFaq: body.homeFaq != null
      ? (Array.isArray(body.homeFaq) ? body.homeFaq : current.homeFaq || [])
      : (current.homeFaq || []),
    homeReviews: body.homeReviews != null
      ? (Array.isArray(body.homeReviews) ? body.homeReviews : current.homeReviews || [])
      : (current.homeReviews || [])
  };
  if (merged.products?.[0]) {
    merged.product = {
      name: merged.products[0].name,
      description: merged.products[0].description,
      price: merged.products[0].price,
      image: merged.products[0].image
    };
  }
  return json(await saveConfig(env, merged), 200, origin);
}

async function handleDeleteOrder(request, env, origin, orderId) {
  if (!(await isValidSession(env, bearerToken(request)))) {
    return json({ error: 'Não autorizado.' }, 401, origin);
  }
  const order = await getOrder(env, orderId);
  if (!order) return json({ error: 'Pedido não encontrado.' }, 404, origin);

  let correiosCancel = null;
  if (isCorreiosBrOrder(order) && (order.correiosPrePostagemId || order.correiosTrackingCode)) {
    correiosCancel = await cancelCorreiosPrePostagem(env, order);
  }

  await deleteOrder(env, orderId);
  return json({ ok: true, orderId, correiosCancel }, 200, origin);
}

async function handleDeletePendingOrders(request, env, origin) {
  if (!(await isValidSession(env, bearerToken(request)))) {
    return json({ error: 'Não autorizado.' }, 401, origin);
  }

  const index = await readOrdersIndex(env);
  const pendingIds = index.filter((o) => o.status !== 'paid').map((o) => o.orderId);
  let deleted = 0;
  for (const orderId of pendingIds) {
    if (await deleteOrder(env, orderId)) deleted++;
  }
  return json({ ok: true, deleted }, 200, origin);
}

async function handleAdminCorreiosTracking(request, env, origin) {
  if (!(await isValidSession(env, bearerToken(request)))) {
    return json({ error: 'Não autorizado.' }, 401, origin);
  }
  const body = await request.json().catch(() => ({}));
  const orderIds = Array.isArray(body.orderIds) ? body.orderIds.slice(0, 25) : [];
  const forceAvSync = body.forceAvSync === true;
  const token = await getCorreiosToken(env);
  if (!token) return json({ error: 'Correios não configurado.' }, 503, origin);

  const config = await getConfig(env);
  const orders = {};
  let aggressiveBudget = forceAvSync ? orderIds.length : 3;
  for (const orderId of orderIds) {
    const summary = await syncOneOrderCorreiosTracking(env, config, token, orderId, {
      forceAvSync,
      getAggressive: () => forceAvSync || aggressiveBudget > 0,
      useAggressive: () => { if (!forceAvSync) aggressiveBudget -= 1; }
    });
    if (summary) orders[orderId] = summary;
  }
  return json({ orders }, 200, origin);
}

function isTrackingFinalStatus(status) {
  const s = String(status || '').trim().toLowerCase();
  return s === 'entregue' || s.includes('entregue ao destinat');
}

async function syncOneOrderCorreiosTracking(env, config, token, orderId, opts = {}) {
  const order = await getOrder(env, orderId);
  if (!order) return null;

  if (isCorreiosBrOrder(order) && order.correiosFreteEstimado == null) {
    try {
      await ensureCorreiosFreteEstimate(env, order, config);
    } catch (err) {
      console.warn('Correios frete backfill:', orderId, err.message);
    }
  }

  const needsAvBackfill = !order.correiosTrackingCode
    && (isCorreiosBrOrder(order) || isCorreiosIntlOrder(order));
  if (needsAvBackfill) {
    if (!order.correiosPrePostagemId) {
      try {
        await ensureCorreiosPrePostagemForOrder(env, order, config);
      } catch (err) {
        console.warn('Correios pre-postagem backfill:', orderId, err.message);
      }
    }
    if (order.correiosPrePostagemId) {
      try {
        const useAggressive = typeof opts.getAggressive === 'function' ? opts.getAggressive() : false;
        if (useAggressive && typeof opts.useAggressive === 'function') opts.useAggressive();
        await syncCorreiosTrackingCodeFromPrePostagem(token, order, env, { aggressive: useAggressive });
      } catch (err) {
        console.warn('Correios AV backfill:', orderId, err.message);
      }
    }
  }

  if (!order.correiosTrackingCode) {
    const payload = {};
    if (order.correiosFreteEstimado != null) payload.correiosFreteEstimado = order.correiosFreteEstimado;
    if (order.correiosPrePostagemId || order.correiosPrePostagemAt) payload.status = 'Pré-postado';
    return Object.keys(payload).length ? payload : null;
  }

  const summary = await fetchCorreiosTrackingSummary(token, order.correiosTrackingCode);
  const hasApiEvents = Array.isArray(summary?.events) && summary.events.length > 0;
  const hasManual = order.correiosManualUpdatedAt && order.correiosTrackingStatus;
  if (hasApiEvents) {
    order.correiosTrackingStatus = summary.status;
    order.correiosTrackingLastEvent = summary.lastEvent;
    order.correiosTrackingEvents = summary.events;
    order.correiosTrackingUpdatedAt = new Date().toISOString();
  } else if (!hasManual && summary?.status && summary.status !== 'Sem eventos na API') {
    order.correiosTrackingStatus = summary.status;
    order.correiosTrackingUpdatedAt = new Date().toISOString();
  }
  await saveOrder(env, order);
  return {
    ...(hasApiEvents ? summary : trackingSummaryFromOrder(order) || summary),
    trackingCode: order.correiosTrackingCode,
    correiosFreteEstimado: order.correiosFreteEstimado ?? null
  };
}

const CORREIOS_TRACKING_CRON_STALE_MS = 30 * 60 * 1000;
const CORREIOS_TRACKING_CRON_MAX = 40;

const SAO_PAULO_TZ = 'America/Sao_Paulo';
const MONTHLY_REPORT_KV_PREFIX = 'report:monthly:';
const MARKETPLACE_DESTINOS = {
  mercado_livre: 'Mercado Livre',
  shopee: 'Shopee',
  tiktok_shop: 'TikTok Shop',
  amazon: 'Amazon'
};
const MONTH_NAMES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

function tsToSaoPauloParts(isoOrMs) {
  const d = typeof isoOrMs === 'number' ? new Date(isoOrMs) : new Date(String(isoOrMs || ''));
  if (Number.isNaN(d.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SAO_PAULO_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(d);
  const get = (type) => parts.find((p) => p.type === type)?.value;
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day'))
  };
}

function isTsInSaoPauloMonth(isoOrMs, year, month) {
  const p = tsToSaoPauloParts(isoOrMs);
  return !!p && p.year === year && p.month === month;
}

function isLastDayOfMonthInSaoPaulo(now = new Date()) {
  const tomorrow = new Date(now.getTime() + 86400000);
  const p = tsToSaoPauloParts(tomorrow);
  return !!p && p.day === 1;
}

function currentMonthYearSaoPaulo(now = new Date()) {
  const p = tsToSaoPauloParts(now);
  return p ? { year: p.year, month: p.month } : { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
}

function monthLabelPt(year, month) {
  const name = MONTH_NAMES_PT[month - 1] || String(month);
  return `${name}/${year}`;
}

function lastDayOfMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function sumMoney(values) {
  return values.reduce((acc, n) => acc + (Number(n) || 0), 0);
}

function normalizePaymentLabel(pagamento) {
  const p = String(pagamento || '').trim().toLowerCase();
  if (!p) return 'Outro';
  if (p.includes('pix')) return 'PIX';
  if (p.includes('paypal')) return 'PayPal';
  if (p.includes('cart') || p.includes('card') || p.includes('credito') || p.includes('crédito') || p.includes('asaas') || p.includes('mercado')) {
    return 'Cartão';
  }
  return pagamento || 'Outro';
}

async function aggregateMonthlyMarketplaceClicks(env, year, month) {
  const counts = Object.fromEntries(Object.keys(MARKETPLACE_DESTINOS).map((k) => [k, 0]));
  let total = 0;
  let sampleSize = 0;
  const db = await ensureClicksD1(env);
  if (!db) return { counts, total, sampleSize };
  const start = spMidnightUtcMs(year, month, 1);
  const end = month === 12 ? spMidnightUtcMs(year + 1, 1, 1) : spMidnightUtcMs(year, month + 1, 1);
  const res = await db.prepare(
    'SELECT destino, COUNT(*) AS n FROM clicks WHERE ts >= ? AND ts < ? AND teste = 0 GROUP BY destino'
  ).bind(start, end).all();
  for (const row of res?.results || []) {
    const destino = String(row.destino || '').trim();
    const n = Number(row.n) || 0;
    sampleSize += n;
    if (!MARKETPLACE_DESTINOS[destino]) continue;
    counts[destino] += n;
    total += n;
  }
  return { counts, total, sampleSize };
}

async function aggregateMonthlyOrders(env, year, month) {
  let index = await readOrdersIndex(env);
  if (!index.length) index = await rebuildOrdersIndexFromKv(env);

  const pending = { count: 0, total: 0, produto: 0, frete: 0 };
  const created = { count: 0, total: 0 };
  const paid = { count: 0, total: 0, produto: 0, frete: 0, byPayment: {} };

  for (const item of index) {
    const createdInMonth = isTsInSaoPauloMonth(item.createdAt, year, month);
    if (createdInMonth) {
      created.count += 1;
      created.total += Number(item.total) || 0;
      if (item.status === 'pending_payment') {
        pending.count += 1;
        pending.total += Number(item.total) || 0;
        pending.produto += Number(item.valorProduto) || 0;
        pending.frete += Number(item.frete) || 0;
      }
    }

    if (item.status !== 'paid') continue;
    const order = await getOrder(env, item.orderId);
    if (!order?.paidAt || !isTsInSaoPauloMonth(order.paidAt, year, month)) continue;

    paid.count += 1;
    paid.total += Number(order.total) || 0;
    paid.produto += Number(order.valorProduto) || 0;
    paid.frete += Number(order.frete) || 0;
    const payKey = normalizePaymentLabel(order.pagamento);
    if (!paid.byPayment[payKey]) paid.byPayment[payKey] = { count: 0, total: 0 };
    paid.byPayment[payKey].count += 1;
    paid.byPayment[payKey].total += Number(order.total) || 0;
  }

  const conversionPct = created.count
    ? Math.round((paid.count / created.count) * 1000) / 10
    : 0;

  return { pending, created, paid, conversionPct };
}

async function buildMonthlyReport(env, year, month) {
  const [clicks, orders] = await Promise.all([
    aggregateMonthlyMarketplaceClicks(env, year, month),
    aggregateMonthlyOrders(env, year, month)
  ]);
  return {
    year,
    month,
    label: monthLabelPt(year, month),
    periodStart: `01/${String(month).padStart(2, '0')}/${year}`,
    periodEnd: `${String(lastDayOfMonth(year, month)).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`,
    clicks,
    orders,
    generatedAt: new Date().toISOString()
  };
}

function buildMonthlyReportFields(report) {
  const fields = {
    Período: `${report.periodStart} a ${report.periodEnd} (horário de Brasília)`,
    '— Marketplaces —': '',
    'Mercado Livre (cliques)': String(report.clicks.counts.mercado_livre || 0),
    'Shopee (cliques)': String(report.clicks.counts.shopee || 0),
    'TikTok Shop (cliques)': String(report.clicks.counts.tiktok_shop || 0),
    'Amazon (cliques)': String(report.clicks.counts.amazon || 0),
    'Total cliques marketplaces': String(report.clicks.total || 0),
    '— Loja oficial —': '',
    'Pedidos criados no mês': String(report.orders.created.count),
    'Possíveis compras (aguardando pagamento)': `${report.orders.pending.count} — ${formatBRL(report.orders.pending.total)}`,
    'Valor produtos (pendentes)': formatBRL(report.orders.pending.produto),
    'Frete (pendentes)': formatBRL(report.orders.pending.frete),
    'Compras realizadas (pagas no mês)': `${report.orders.paid.count} — ${formatBRL(report.orders.paid.total)}`,
    'Valor produtos (pagos)': formatBRL(report.orders.paid.produto),
    'Frete (pagos)': formatBRL(report.orders.paid.frete),
    'Taxa de conversão (pagos / criados)': `${report.orders.conversionPct}%`
  };

  for (const [pay, data] of Object.entries(report.orders.paid.byPayment).sort((a, b) => b[1].count - a[1].count)) {
    fields[`Pagamento — ${pay}`] = `${data.count} pedido(s) — ${formatBRL(data.total)}`;
  }

  return fields;
}

function buildMonthlyReportHtml(report) {
  const marketplaceRows = Object.entries(MARKETPLACE_DESTINOS)
    .map(([slug, label]) => {
      const n = report.clicks.counts[slug] || 0;
      return `<tr><td style="padding:8px;border:1px solid #ddd">${label}</td><td style="padding:8px;border:1px solid #ddd;text-align:right;font-weight:700">${n}</td></tr>`;
    })
    .join('');

  const paymentRows = Object.entries(report.orders.paid.byPayment)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([pay, data]) =>
      `<tr><td style="padding:8px;border:1px solid #ddd">${pay}</td><td style="padding:8px;border:1px solid #ddd;text-align:right">${data.count}</td><td style="padding:8px;border:1px solid #ddd;text-align:right">${formatBRL(data.total)}</td></tr>`
    )
    .join('') || '<tr><td colspan="3" style="padding:8px;border:1px solid #ddd;color:#666">Nenhuma compra paga no período</td></tr>';

  return `<div style="font-family:Arial,sans-serif;max-width:640px;color:#222">
    <h2 style="margin:0 0 8px;color:#111">Relatório mensal — ${report.label}</h2>
    <p style="margin:0 0 20px;color:#555">Período: ${report.periodStart} a ${report.periodEnd} (horário de Brasília)</p>

    <h3 style="margin:24px 0 8px;font-size:16px">Marketplaces — cliques outbound</h3>
    <table style="border-collapse:collapse;width:100%;margin-bottom:8px">
      <tr style="background:#f5f5f5"><th style="padding:8px;border:1px solid #ddd;text-align:left">Canal</th><th style="padding:8px;border:1px solid #ddd;text-align:right">Cliques</th></tr>
      ${marketplaceRows}
      <tr style="background:#fafafa"><td style="padding:8px;border:1px solid #ddd;font-weight:700">Total</td><td style="padding:8px;border:1px solid #ddd;text-align:right;font-weight:700">${report.clicks.total}</td></tr>
    </table>

    <h3 style="margin:24px 0 8px;font-size:16px">Loja oficial — possíveis compras</h3>
    <p style="margin:0 0 16px">Pedidos criados no mês aguardando pagamento: <strong>${report.orders.pending.count}</strong> — total <strong>${formatBRL(report.orders.pending.total)}</strong><br>
    Produtos: ${formatBRL(report.orders.pending.produto)} · Frete: ${formatBRL(report.orders.pending.frete)}</p>

    <h3 style="margin:24px 0 8px;font-size:16px">Loja oficial — compras realizadas</h3>
    <p style="margin:0 0 8px">Pagamentos confirmados no mês: <strong>${report.orders.paid.count}</strong> — total <strong>${formatBRL(report.orders.paid.total)}</strong><br>
    Produtos: ${formatBRL(report.orders.paid.produto)} · Frete: ${formatBRL(report.orders.paid.frete)}</p>
    <p style="margin:0 0 16px">Pedidos criados no mês: ${report.orders.created.count} · Conversão (pagos/criados): <strong>${report.orders.conversionPct}%</strong></p>

    <table style="border-collapse:collapse;width:100%;margin-bottom:24px">
      <tr style="background:#f5f5f5"><th style="padding:8px;border:1px solid #ddd;text-align:left">Pagamento</th><th style="padding:8px;border:1px solid #ddd;text-align:right">Qtd</th><th style="padding:8px;border:1px solid #ddd;text-align:right">Total</th></tr>
      ${paymentRows}
    </table>

    <p style="color:#666;font-size:12px;margin:0">Sensor Tattoo Fix — sensortattoofix.com.br · gerado automaticamente</p>
  </div>`;
}

async function sendMonthlyReportEmail(env, config, year, month, { force = false } = {}) {
  const key = `${MONTHLY_REPORT_KV_PREFIX}${year}-${String(month).padStart(2, '0')}`;
  if (!force) {
    const sent = await env.STORE_KV.get(key);
    if (sent) return { ok: true, skipped: true, reason: 'already_sent', key };
  }

  const report = await buildMonthlyReport(env, year, month);
  const monthName = MONTH_NAMES_PT[month - 1] || String(month);
  const subject = emailSubject(config, 'monthlyReportSubject', { month: monthName, year: String(year) });
  const to = (getEmails(config).monthlyReportTo || config.formsubmit?.email || '').trim();
  if (!to) return { ok: false, error: 'E-mail de destino não configurado (formsubmit.email).' };

  const fields = buildMonthlyReportFields(report);
  const html = buildMonthlyReportHtml(report);
  const result = await notifyEmail(env, config, to, subject, fields, undefined, {
    html,
    text: fieldsToText(fields)
  });

  if (result.ok) {
    await kvPut(env, key, JSON.stringify({
      sentAt: new Date().toISOString(),
      to,
      report: {
        clicks: report.clicks.total,
        pending: report.orders.pending.count,
        paid: report.orders.paid.count
      }
    }));
  }

  return { ok: result.ok, to, subject, report, ...result };
}

async function runScheduledMonthlyReportIfDue(env) {
  if (!isLastDayOfMonthInSaoPaulo()) {
    return { ok: true, skipped: true, reason: 'not_last_day' };
  }
  const { year, month } = currentMonthYearSaoPaulo();
  const result = await sendMonthlyReportEmail(env, await getConfig(env), year, month);
  console.log('Monthly report cron:', JSON.stringify({ year, month, ...result }));
  return result;
}

async function handleAdminMonthlyReport(request, env, origin) {
  if (!(await isValidSession(env, bearerToken(request)))) {
    return json({ error: 'Não autorizado.' }, 401, origin);
  }
  const config = await getConfig(env);
  const body = await request.json().catch(() => ({}));
  const now = currentMonthYearSaoPaulo();
  const year = Number(body.year) || now.year;
  const month = Number(body.month) || now.month;
  if (month < 1 || month > 12) return json({ error: 'Mês inválido.' }, 400, origin);
  const result = await sendMonthlyReportEmail(env, config, year, month, { force: !!body.force });
  return json(result, result.ok ? 200 : 502, origin);
}

async function runScheduledCorreiosTrackingSync(env) {
  const config = await getConfig(env);
  const now = Date.now();
  const index = await readOrdersIndex(env);
  const candidates = [];
  let synced = 0;
  let sfSynced = 0;

  for (const item of index) {
    if (item.status !== 'paid') continue;
    const order = await getOrder(env, item.orderId);
    if (!order) continue;

    // Super Frete liberada sem rastreio — tenta puxar o código (SF às vezes demora).
    if (
      isSuperfreteOrder(order)
      && order.superfreteCartId
      && String(order.superfreteCartStatus || '').toLowerCase() === 'released'
      && !order.superfreteTrackingCode
      && !order.correiosTrackingCode
      && superfreteConfigured(env)
      && sfSynced < 15
    ) {
      try {
        const t = await syncSuperfreteTrackingForOrder(env, config, order);
        if (t) sfSynced += 1;
      } catch (err) {
        console.warn('Super Frete tracking cron:', order.orderId, err.message);
      }
      continue;
    }

    if (!isCorreiosBrOrder(order) && !isCorreiosIntlOrder(order)) continue;
    if (isTrackingFinalStatus(order.correiosTrackingStatus)) continue;
    if (!order.correiosTrackingCode && !order.correiosPrePostagemId && !order.correiosPrePostagemAt) continue;

    const updatedAt = order.correiosTrackingUpdatedAt
      || order.correiosManualUpdatedAt
      || order.correiosPrePostagemAt
      || order.paidAt
      || order.createdAt;
    if (updatedAt && now - new Date(updatedAt).getTime() < CORREIOS_TRACKING_CRON_STALE_MS) continue;

    candidates.push(order.orderId);
  }

  const token = await getCorreiosToken(env);
  if (!token) {
    console.warn('Correios tracking cron: token indisponível');
    const report = {
      at: new Date().toISOString(),
      sfSynced,
      ok: false,
      reason: 'no_token'
    };
    await kvPut(env, 'correios:tracking:cron:last', JSON.stringify(report));
    return report;
  }

  const batch = candidates.slice(0, CORREIOS_TRACKING_CRON_MAX);
  for (const orderId of batch) {
    try {
      const summary = await syncOneOrderCorreiosTracking(env, config, token, orderId, {
        forceAvSync: false,
        getAggressive: () => synced < 2,
        useAggressive: () => {}
      });
      if (summary) synced += 1;
    } catch (err) {
      console.warn('Correios tracking cron:', orderId, err.message);
    }
  }

  const report = {
    at: new Date().toISOString(),
    candidates: candidates.length,
    batch: batch.length,
    synced,
    sfSynced
  };
  await kvPut(env, 'correios:tracking:cron:last', JSON.stringify(report));
  console.log('Correios tracking cron:', JSON.stringify(report));
  return { ok: true, ...report };
}

async function handleListOrders(request, env, origin) {
  if (!(await isValidSession(env, bearerToken(request)))) return json({ error: 'Não autorizado.' }, 401, origin);

  const format = new URL(request.url).searchParams.get('format') || 'json';
  const index = await readOrdersIndex(env);
  const indexForExport = index.length ? index : await rebuildOrdersIndexFromKv(env);

  if (format === 'csv') {
    const header = 'orderId,createdAt,status,nome,email,telefone,smartwatch,observacoes,modeloRelogio,pais,pagamento,total,frete,couponCode,couponCommissionerName,couponDiscount,couponCommissionPercent,couponCommissionAmount\n';
    const rows = indexForExport.map((o) =>
      [o.orderId, o.createdAt, o.status, o.nome, o.email, o.telefone, o.smartwatch, o.observacoes, o.modeloRelogio, o.pais, o.pagamento, o.total, o.frete, o.couponCode, o.couponCommissionerName, o.couponDiscount, o.couponCommissionPercent, o.couponCommissionAmount]
        .map((v) => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(',')
    ).join('\n');
    return new Response(header + rows, {
      headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename=pedidos.csv', ...corsHeaders(origin) }
    });
  }

  return json(await listOrdersForAdmin(env), 200, origin);
}

export default {
  async fetch(request, env, ctx) {
    const origin = resolveRequestOrigin(request);
    const path = new URL(request.url).pathname.replace(/\/$/, '') || '/';

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) });

    try {
      if (path === '/config' && request.method === 'GET') {
        return json(publicConfigView(await getPublicConfig(env), env), 200, origin);
      }
      if (path === '/visitor/geo' && request.method === 'GET') {
        const geo = extractClickGeo(request);
        return json({ country: geo.pais || null }, 200, origin);
      }
      if (path === '/address/suggest' && request.method === 'GET') {
        return handleAddressSuggest(request, env, origin);
      }
      if (path === '/admin/config' && request.method === 'GET') return handleAdminGetConfig(request, env, origin);
      if (path === '/auth/register' && request.method === 'POST') return handleCustomerRegister(request, env, origin);
      if (path === '/auth/login' && request.method === 'POST') return handleCustomerLogin(request, env, origin);
      if (path === '/auth/logout' && request.method === 'POST') return handleCustomerLogout(request, env, origin);
      if (path === '/auth/forgot-password' && request.method === 'POST') return handleForgotPassword(request, env, origin);
      if (path === '/auth/reset-password' && request.method === 'POST') return handleResetPassword(request, env, origin);
      if (path === '/auth/session' && request.method === 'GET') return handleCustomerSession(request, env, origin);
      if (path === '/me/orders' && request.method === 'GET') return handleCustomerOrders(request, env, origin);
      if (path === '/me/profile' && request.method === 'PATCH') {
        return handleCustomerUpdateProfile(request, env, origin);
      }
      if (path === '/config' && request.method === 'PUT') return handlePutConfig(request, env, origin);
      if (path === '/admin/ml/oauth/callback' && request.method === 'GET') {
        return handleMlOAuthCallback(request, env);
      }
      if (path === '/admin/ml/auth-url' && request.method === 'GET') {
        return handleAdminMlAuthUrl(request, env, origin);
      }
      if (path === '/admin/ml/sync' && (request.method === 'GET' || request.method === 'POST')) {
        return handleAdminMlSync(request, env, origin, ctx);
      }
      if (path === '/admin/ml/sales' && request.method === 'GET') {
        return handleAdminMlSales(request, env, origin);
      }
      if (path === '/admin/amz/sync' && (request.method === 'GET' || request.method === 'POST')) {
        return handleAdminAmzSync(request, env, origin);
      }
      if (path === '/admin/amz/sales' && request.method === 'GET') {
        return handleAdminAmzSales(request, env, origin);
      }
      if (path === '/admin/shopee/oauth/callback' && request.method === 'GET') {
        return handleShopeeOAuthCallback(request, env);
      }
      if (path === '/admin/shopee/auth-url' && request.method === 'GET') {
        return handleAdminShopeeAuthUrl(request, env, origin);
      }
      if (path === '/admin/shopee/sync' && (request.method === 'GET' || request.method === 'POST')) {
        return handleAdminShopeeSync(request, env, origin);
      }
      if (path === '/admin/shopee/sales' && request.method === 'GET') {
        return handleAdminShopeeSales(request, env, origin);
      }
      if (path === '/admin/backfill-normalized' && (request.method === 'POST' || request.method === 'GET')) {
        return handleAdminBackfillNormalized(request, env, origin);
      }

        async function handleAdminBackfillNormalized(request, env, origin) {
          // Permitido para sessão admin válida ou uso de BACKFILL_KEY query
          const url = new URL(request.url);
          const key = url.searchParams.get('key') || '';
          const isAuth = await isValidSession(env, bearerToken(request));
          if (!isAuth && (!env.BACKFILL_KEY || key !== String(env.BACKFILL_KEY))) {
            return json({ error: 'Não autorizado.' }, 401, origin);
          }
          const channel = (url.searchParams.get('channel') || 'mercadolivre').toLowerCase();
          const limit = Number(url.searchParams.get('limit') || '5000');
          const ids = await d1ListSaleIds(env, channel, limit).catch(() => []);
          let updated = 0;
          const [{ normalizeMarketplaceSale }, { calculateOrderFinancials }] = await Promise.all([
            import('./order-normalizer.js'),
            import('./order-financials.js')
          ]).catch(() => [null, null]);
          for (const id of ids) {
            try {
              const sale = await d1GetSale(env, channel, id);
              if (!sale) continue;
              const existingNormalizedStr = sale.payload?.normalized ? JSON.stringify(sale.payload.normalized) : null;
              // Use the same pipeline used elsewhere to normalize/enrich/save
              try {
                await saveMarketplaceSale(env, sale);
              } catch (err) {
                console.warn('saveMarketplaceSale failed during backfill', channel, id, err && err.message);
                continue;
              }
              const after = await d1GetSale(env, channel, id);
              const newStr = after?.payload?.normalized ? JSON.stringify(after.payload.normalized) : null;
              if (newStr && existingNormalizedStr !== newStr) updated += 1;
            } catch (err) {
              console.warn('backfill normalized item failed', channel, id, err && err.message);
            }
          }
          return json({ ok: true, channel, total: ids.length, updated }, 200, origin);
        }

      if (path === '/admin/login' && request.method === 'POST') return handleLogin(request, env, origin);
      if (path === '/admin/session' && request.method === 'GET') return handleSession(request, env, origin);
      if (path === '/admin/test-email' && request.method === 'POST') return handleTestEmail(request, env, origin);
      if (path === '/admin/shipping-status' && request.method === 'GET') return handleAdminShippingStatus(request, env, origin);
      if (path === '/admin/correios-tracking' && request.method === 'POST') {
        return handleAdminCorreiosTracking(request, env, origin);
      }
      if (path === '/admin/integrations-status' && request.method === 'GET') {
        return handleAdminIntegrationsStatus(request, env, origin);
      }
      if (path === '/admin/correios-contract' && request.method === 'GET') {
        return handleAdminCorreiosContract(request, env, origin);
      }
      if (path === '/admin/correios-intl-probe' && request.method === 'GET') {
        return handleAdminCorreiosIntlProbe(request, env, origin);
      }
      if (path === '/admin/correios-api586-probe' && request.method === 'GET') {
        return handleAdminCorreiosApi586Probe(request, env, origin);
      }
      if (path === '/admin/customers' && request.method === 'GET') {
        return handleAdminCustomers(request, env, origin);
      }
      if (path === '/notify/click' && request.method === 'POST') {
        return handleLogClick(request, env, origin, ctx);
      }
      if (path === '/analytics/click' && request.method === 'POST') {
        return handleLogClick(request, env, origin, ctx);
      }
      if ((path === '/analytics/pixel' || path === '/analytics/pixel.gif') && request.method === 'GET') {
        return handleLogClickPixel(request, env, origin, ctx);
      }
      if (path === '/admin/clicks' && request.method === 'GET') {
        return handleAdminListClicks(request, env, origin);
      }
      if (path === '/admin/kv-usage' && request.method === 'GET') {
        if (!(await isValidSession(env, bearerToken(request)))) {
          return json({ error: 'Não autorizado.' }, 401, origin);
        }
        const dailyWrites = await buildKvDailyWriteBudget(env);
        return json({ ok: true, dailyWrites, checkedAt: new Date().toISOString() }, 200, origin);
      }
      if ((path === '/admin/clicks/clear' && request.method === 'POST') ||
        (path === '/admin/clicks' && request.method === 'DELETE')) {
        return handleAdminClearClicks(request, env, origin);
      }
      if (path.startsWith('/forum') || path.startsWith('/admin/forum')) {
        const forumRes = await handleForumRoute(request, env, origin, {
          json, bearerToken, isValidSession, getCustomerUserId, getUserById, saveUser, publicUserView
        });
        if (forumRes) return forumRes;
      }
      const adminCustomerId = path.match(/^\/admin\/customers\/([^/]+)$/);
      if (adminCustomerId && request.method === 'PATCH') {
        return handleAdminCustomerPatch(request, env, origin, adminCustomerId[1]);
      }
      if (adminCustomerId && request.method === 'DELETE') {
        return handleAdminCustomerDelete(request, env, origin, adminCustomerId[1]);
      }
      if (path === '/feedback' && request.method === 'POST') {
        return handleFeedback(request, env, origin);
      }
      if (path === '/admin/feedback' && request.method === 'GET') {
        return handleAdminListFeedback(request, env, origin);
      }
      if (path === '/admin/feedback' && request.method === 'DELETE') {
        return handleAdminClearFeedback(request, env, origin);
      }
      if (path === '/fx/rate' && request.method === 'GET') {
        return handleFxRate(request, env, origin);
      }
      if (path === '/shipping/quote' && request.method === 'GET') {
        return handleShippingQuote(request, env, origin, ctx);
      }
      const trackingMatch = path.match(/^\/tracking\/([A-Za-z0-9]+)$/);
      if (trackingMatch && request.method === 'GET') {
        return handlePublicTracking(request, env, origin, trackingMatch[1]);
      }
      const cepMatch = path.match(/^\/cep\/(\d{8})$/);
      if (cepMatch && request.method === 'GET') {
        return handleGetCep(request, env, origin, cepMatch[1]);
      }
      if (path === '/commissioners/register' && request.method === 'POST') {
        return handleCommissionerRegister(request, env, origin);
      }
      if (path === '/commissioners/resend-welcome' && request.method === 'POST') {
        return handleCommissionerResendWelcome(request, env, origin);
      }
      if (path === '/coupons/validate' && request.method === 'POST') {
        return handleValidateCoupon(request, env, origin);
      }
      if (path === '/orders' && request.method === 'POST') return handleCreateOrder(request, env, origin, ctx);
      if (path === '/orders' && request.method === 'GET') return handleListOrders(request, env, origin);
      if (path === '/webhook/asaas' && request.method === 'POST') return handleAsaasWebhook(request, env, origin);
      if (path === '/webhook/mercadopago' && (request.method === 'POST' || request.method === 'GET')) {
        return handleMercadoPagoWebhook(request, env, origin);
      }
      if (path === '/webhook/paypal' && request.method === 'POST') {
        return handlePayPalWebhook(request, env, origin);
      }
      if (path === '/webhook/stripe' && request.method === 'POST') {
        return handleStripeWebhook(request, env, origin);
      }

      const paypalCreateMatch = path.match(/^\/orders\/([^/]+)\/paypal\/create$/);
      if (paypalCreateMatch && request.method === 'POST') {
        return handlePayPalCreate(request, env, origin, paypalCreateMatch[1]);
      }

      const stripePiMatch = path.match(/^\/orders\/([^/]+)\/stripe\/payment-intent$/);
      if (stripePiMatch && request.method === 'POST') {
        return handleStripePaymentIntent(request, env, origin, stripePiMatch[1]);
      }
      const stripeCsMatch = path.match(/^\/orders\/([^/]+)\/stripe\/checkout-session$/);
      if (stripeCsMatch && request.method === 'POST') {
        return handleStripeCheckoutSession(request, env, origin, stripeCsMatch[1]);
      }

      const paypalCaptureMatch = path.match(/^\/orders\/([^/]+)\/paypal\/capture$/);
      if (paypalCaptureMatch && request.method === 'POST') {
        return handlePayPalCapture(request, env, origin, paypalCaptureMatch[1]);
      }

      if (path === '/orders/pending' && request.method === 'DELETE') {
        return handleDeletePendingOrders(request, env, origin);
      }

      const resendPendingMatch = path.match(/^\/orders\/([^/]+)\/resend-pending-email$/);
      if (resendPendingMatch && request.method === 'POST') {
        return handleResendPendingEmail(request, env, origin, resendPendingMatch[1]);
      }

      const confirmMatch = path.match(/^\/orders\/([^/]+)\/confirm$/);
      if (confirmMatch && request.method === 'POST') {
        return handleConfirmOrder(request, env, origin, confirmMatch[1]);
      }
      const labelMatch = path.match(/^\/orders\/([^/]+)\/shipping-label$/);
      if (labelMatch && request.method === 'POST') {
        return handleOrderShippingLabel(request, env, origin, labelMatch[1]);
      }
      const sfTrackMatch = path.match(/^\/orders\/([^/]+)\/superfrete-tracking$/);
      if (sfTrackMatch && request.method === 'POST') {
        return handleOrderSuperfreteTracking(request, env, origin, sfTrackMatch[1]);
      }
      const correiosAvMatch = path.match(/^\/orders\/([^/]+)\/correios-av$/);
      if (correiosAvMatch && request.method === 'PATCH') {
        return handleOrderCorreiosAv(request, env, origin, correiosAvMatch[1]);
      }
      const shippingMatch = path.match(/^\/orders\/([^/]+)\/shipping$/);
      if (shippingMatch && request.method === 'PATCH') {
        return handleOrderShippingUpdate(request, env, origin, shippingMatch[1]);
      }
      const shippingQuoteMatch = path.match(/^\/orders\/([^/]+)\/shipping-method-quote$/);
      if (shippingQuoteMatch && request.method === 'GET') {
        return handleOrderShippingMethodQuote(request, env, origin, shippingQuoteMatch[1]);
      }
      const selfTestConfirmMatch = path.match(/^\/orders\/([^/]+)\/confirm-test$/);
      if (selfTestConfirmMatch && request.method === 'POST') {
        return handleConfirmSelfTestOrder(request, env, origin, selfTestConfirmMatch[1]);
      }
      const cancelMatch = path.match(/^\/orders\/([^/]+)\/cancel$/);
      if (cancelMatch && request.method === 'POST') {
        return handleCustomerCancelOrder(request, env, origin, cancelMatch[1]);
      }

      const m = path.match(/^\/orders\/([^/]+)$/);
      if (m && request.method === 'GET') return handleGetOrder(request, env, origin, m[1]);
      if (m && request.method === 'DELETE') return handleDeleteOrder(request, env, origin, m[1]);
      return json({ error: 'Rota não encontrada.' }, 404, origin);
    } catch (err) {
      return json({ error: err.message }, 500, origin);
    }
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      runScheduledCorreiosTrackingSync(env).catch((err) => {
        console.error('Correios tracking cron failed:', err.message);
      })
    );
    ctx.waitUntil(
      runAbandonedCheckoutEmails(env).catch((err) => {
        console.error('Abandoned checkout cron failed:', err.message);
      })
    );
    if (event.cron === '0 */4 * * *') {
      ctx.waitUntil(
        keepMlAccessTokenAlive(env).catch((err) => {
          console.error('ML token keepalive cron failed:', err.message);
        })
      );
    }
    if (event.cron === '0 3,15 * * *') {
      ctx.waitUntil(
        keepMlAccessTokenAlive(env).catch((err) => {
          console.error('ML token keepalive failed:', err.message);
        })
      );
      ctx.waitUntil(
        trimClicksD1(env).catch((err) => {
          console.error('D1 click trim failed:', err.message);
        })
      );
      ctx.waitUntil(
        dropLegacyClickKvShell(env).catch((err) => {
          console.error('Legacy click KV drop failed:', err.message);
        })
      );
      ctx.waitUntil(
        runScheduledMlOrdersSync(env).catch((err) => {
          console.error('ML orders sync cron failed:', err.message);
        })
      );
      ctx.waitUntil(
        runScheduledAmzOrdersSync(env).catch((err) => {
          console.error('Amazon orders sync cron failed:', err.message);
        })
      );
      ctx.waitUntil(
        runScheduledShopeeOrdersSync(env).catch((err) => {
          console.error('Shopee orders sync cron failed:', err.message);
        })
      );
    }
    if (event.cron === '30 2 * * *') {
      ctx.waitUntil(
        runScheduledMonthlyReportIfDue(env).catch((err) => {
          console.error('Monthly report cron failed:', err.message);
        })
      );
      ctx.waitUntil(
        syncIntlProductPricesFromFx(env).catch((err) => {
          console.error('Intl FX price sync cron failed:', err.message);
        })
      );
    }
  }
};
