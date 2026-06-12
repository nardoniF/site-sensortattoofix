/**
 * Traduções PT/EN — checkout, loja e textos dinâmicos.
 * Use ?lang=en na URL ou venha de /en/
 */
window.STF_I18N = (function () {
  const STRINGS = {
    pt: {
      'nav.cart': 'Carrinho',
      'nav.back': 'Voltar',
      'cart.title': 'Seu carrinho',
      'cart.addMore': 'Adicionar mais produtos',
      'summary.subtotal': 'Subtotal',
      'summary.shipping': 'Frete',
      'summary.shippingIntl': 'Frete internacional',
      'summary.total': 'Total',
      'trust.pix': 'PIX automático',
      'trust.card': 'Cartão',
      'trust.email': 'Confirmação por e-mail',
      'step.data': 'Dados',
      'step.payment': 'Pagamento',
      'step.confirm': 'Confirmação',
      'pay.title': 'Forma de pagamento',
      'pay.pix': 'PIX',
      'pay.pixHint': 'Confirmação automática · QR Code na hora',
      'pay.cardBr': 'Cartão de crédito',
      'pay.cardBrHint': 'Pagamento seguro via Asaas',
      'pay.intlCard': 'Cartão internacional',
      'pay.intlCardHint': 'Visa, Mastercard, Amex — valor em R$, seu banco converte',
      'pay.paypal': 'PayPal',
      'pay.paypalHint': 'Cartão, débito ou saldo PayPal',
      'pay.pixIntl': 'PIX',
      'pay.pixIntlHint': 'Para quem tem conta bancária no Brasil (mesmo morando fora)',
      'pay.noticeBr': 'Após o pagamento, a confirmação é automática no site e por e-mail.',
      'pay.noticeIntl': 'Valores em reais (BRL). Cartão internacional pelo Mercado Pago — como na Amazon, seu banco converte a moeda.',
      'pay.noticeIntlAll': 'Valores em reais (BRL). Cartão internacional (Mercado Pago) — seu banco converte. PayPal ou PIX também disponíveis.',
      'pay.noticeIntlNoPaypal': 'Valores em reais (BRL). Cartão internacional (Visa/Mastercard) — seu banco converte. PIX se tiver conta no Brasil.',
      'btn.continue': 'Continuar',
      'btn.back': 'Voltar',
      'btn.pay': 'Finalizar pedido',
      'btn.processing': 'Processando...',
      'btn.copyPix': 'Copiar PIX',
      'btn.openCard': 'Abrir pagamento com cartão',
      'btn.payPaypal': 'Pagar com PayPal',
      'card.asaas': 'Pagamento seguro processado pelo Asaas.',
      'card.mp': 'Pagamento seguro no Mercado Pago (Visa, Mastercard, Amex). Valor em reais — seu banco converte.',
      'paypal.redirect': 'Redirecionando ao PayPal… Se não abrir, use o botão abaixo.',
      'confirm.hint': 'A confirmação é enviada automaticamente por e-mail.',
      'store.priceSuffix': 'PIX e cartão',
      'store.intlSuffix': 'Cartão internacional · Envio para o exterior',
      'alert.mpFail': 'Pagamento com cartão não foi concluído. Tente novamente.',
      'alert.intlCardUnavailable': 'Cartão internacional indisponível. Escolha PIX ou tente mais tarde.',
      'alert.paypalUnavailable': 'PayPal indisponível no momento. Tente novamente ou fale conosco no WhatsApp.',
      'status.redirectMp': 'Redirecionando ao pagamento com cartão…',
      'status.confirmMp': 'Confirmando pagamento com cartão…',
      'status.pendingMp': 'Pagamento em análise — esta página atualiza automaticamente.',
      'status.redirectPaypal': 'Redirecionando ao PayPal…',
      'title.orderCard': 'Pedido registrado — pagamento com cartão',
      'title.orderPaypal': 'Pedido registrado — pagamento PayPal',
      'title.orderRegistered': 'Pedido registrado!',
      'title.paid': 'Pagamento confirmado!',
      'hint.mpReturn': 'Você será redirecionado ao Mercado Pago. A confirmação é automática ao voltar.',
      'hint.paypalReturn': 'Após pagar no PayPal, você voltará aqui com a confirmação automática.'
    },
    en: {
      'nav.cart': 'Cart',
      'nav.back': 'Back',
      'cart.title': 'Your cart',
      'cart.addMore': 'Add more products',
      'summary.subtotal': 'Subtotal',
      'summary.shipping': 'Shipping',
      'summary.shippingIntl': 'International shipping',
      'summary.total': 'Total',
      'trust.pix': 'Instant PIX',
      'trust.card': 'Card',
      'trust.email': 'Email confirmation',
      'step.data': 'Details',
      'step.payment': 'Payment',
      'step.confirm': 'Confirmation',
      'pay.title': 'Payment method',
      'pay.pix': 'PIX',
      'pay.pixHint': 'Instant confirmation · QR code',
      'pay.cardBr': 'Credit card',
      'pay.cardBrHint': 'Secure payment via Asaas',
      'pay.intlCard': 'International card',
      'pay.intlCardHint': 'Visa, Mastercard, Amex — charged in BRL; your bank converts',
      'pay.paypal': 'PayPal',
      'pay.paypalHint': 'Card, debit or PayPal balance',
      'pay.pixIntl': 'PIX',
      'pay.pixIntlHint': 'If you have a Brazilian bank account (even abroad)',
      'pay.noticeBr': 'After payment, confirmation is automatic on this page and by email.',
      'pay.noticeIntl': 'Prices in Brazilian reais (BRL). International card via Mercado Pago — like Amazon, your bank converts currency.',
      'pay.noticeIntlAll': 'Prices in BRL. International card (Mercado Pago) — your bank converts. PayPal or PIX also available.',
      'pay.noticeIntlNoPaypal': 'Prices in BRL. International card (Visa/Mastercard) — your bank converts. PIX if you have a BR bank account.',
      'btn.continue': 'Continue',
      'btn.back': 'Back',
      'btn.pay': 'Place order',
      'btn.processing': 'Processing...',
      'btn.copyPix': 'Copy PIX code',
      'btn.openCard': 'Open card payment',
      'btn.payPaypal': 'Pay with PayPal',
      'card.asaas': 'Secure payment processed by Asaas.',
      'card.mp': 'Secure payment on Mercado Pago (Visa, Mastercard, Amex). BRL amount — your bank converts.',
      'paypal.redirect': 'Redirecting to PayPal… If nothing opens, use the button below.',
      'confirm.hint': 'Confirmation is sent automatically by email.',
      'store.priceSuffix': 'PIX & card',
      'store.intlSuffix': 'International cards · Worldwide shipping',
      'alert.mpFail': 'Card payment was not completed. Please try again.',
      'alert.intlCardUnavailable': 'International card unavailable. Choose PIX or try again later.',
      'alert.paypalUnavailable': 'PayPal unavailable right now. Try again or contact us on WhatsApp.',
      'status.redirectMp': 'Redirecting to card payment…',
      'status.confirmMp': 'Confirming card payment…',
      'status.pendingMp': 'Payment under review — this page updates automatically.',
      'status.redirectPaypal': 'Redirecting to PayPal…',
      'title.orderCard': 'Order placed — card payment',
      'title.orderPaypal': 'Order placed — PayPal payment',
      'title.orderRegistered': 'Order placed!',
      'title.paid': 'Payment confirmed!',
      'hint.mpReturn': 'You will be redirected to Mercado Pago. Confirmation is automatic when you return.',
      'hint.paypalReturn': 'After paying on PayPal, you will return here with automatic confirmation.'
    }
  };

  function getLang() {
    try {
      const q = new URLSearchParams(location.search).get('lang');
      if (q === 'en' || q === 'pt') return q;
    } catch (e) { /* ignore */ }
    if (location.pathname.includes('/en/')) return 'en';
    try {
      const stored = sessionStorage.getItem('stf_lang');
      if (stored === 'en' || stored === 'pt') return stored;
    } catch (e) { /* ignore */ }
    const htmlLang = document.documentElement.lang || '';
    return htmlLang.toLowerCase().startsWith('en') ? 'en' : 'pt';
  }

  function setLang(lang) {
    const l = lang === 'en' ? 'en' : 'pt';
    try { sessionStorage.setItem('stf_lang', l); } catch (e) { /* ignore */ }
    document.documentElement.lang = l === 'en' ? 'en' : 'pt-BR';
    return l;
  }

  function t(key) {
    const lang = getLang();
    return STRINGS[lang]?.[key] ?? STRINGS.pt[key] ?? key;
  }

  function applyText(sel, key) {
    const el = document.querySelector(sel);
    if (el && key) el.textContent = t(key);
  }

  function applyCheckoutDom() {
    if (getLang() !== 'en') return;

    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      const val = t(key);
      if (val) el.textContent = val;
    });

    const cartLink = document.querySelector('.cart-nav-link');
    if (cartLink) {
      const badge = cartLink.querySelector('[data-cart-badge]');
      cartLink.innerHTML = `<i class="fas fa-shopping-cart"></i> ${t('nav.cart')} `;
      if (badge) cartLink.appendChild(badge);
    }
    const backLink = document.querySelector('.checkout-nav a[href*="index"]');
    if (backLink) backLink.innerHTML = `<i class="fas fa-arrow-left"></i> ${t('nav.back')}`;
    const cartTitle = document.querySelector('.cart-sidebar-title');
    if (cartTitle) cartTitle.innerHTML = `<i class="fas fa-shopping-cart"></i> ${t('cart.title')}`;
    applyText('.cart-add-more', 'cart.addMore');
    applyText('.checkout-summary .summary-row:nth-child(1) span', 'summary.subtotal');
    applyText('.checkout-summary .summary-row.total span', 'summary.total');
    const stepLabels = { 1: 'step.data', 2: 'step.payment', 3: 'step.confirm' };
    document.querySelectorAll('.step-indicator[data-step]').forEach((ind) => {
      const n = ind.dataset.step;
      const key = stepLabels[n];
      if (!key) return;
      const num = ind.querySelector('span')?.textContent || n;
      ind.innerHTML = `<span>${num}</span> ${t(key)}`;
    });
    applyText('.checkout-step[data-step="2"] h3', 'pay.title');
    applyText('#btn-next .btn-checkout-label', 'btn.continue');
    applyText('#btn-back .btn-checkout-label', 'btn.back');
    applyText('#btn-pay .btn-checkout-label', 'btn.pay');
    applyText('#btn-copy-pix', 'btn.copyPix');
    applyText('#card-pay-link', 'btn.openCard');
    applyText('#paypal-pay-link', 'btn.payPaypal');
    applyText('#confirm-hint', 'confirm.hint');

    const trust = document.querySelectorAll('.checkout-trust span');
    if (trust[0]) trust[0].innerHTML = `<i class="fas fa-qrcode"></i> ${t('trust.pix')}`;
    if (trust[1]) trust[1].innerHTML = `<i class="fas fa-credit-card"></i> ${t('trust.card')}`;
    if (trust[2]) trust[2].innerHTML = `<i class="fas fa-envelope"></i> ${t('trust.email')}`;

    const payBr = document.querySelector('#payment-options-br .payment-option:nth-child(1)');
    if (payBr) {
      payBr.querySelector('strong').textContent = t('pay.pix');
      payBr.querySelector('small').textContent = t('pay.pixHint');
    }
    const payBrCard = document.querySelector('#payment-options-br .payment-option:nth-child(2)');
    if (payBrCard) {
      payBrCard.querySelector('strong').textContent = t('pay.cardBr');
      payBrCard.querySelector('small').textContent = t('pay.cardBrHint');
    }

    const intlCard = document.querySelector('.payment-option-intl-card');
    if (intlCard) {
      intlCard.querySelector('strong').textContent = t('pay.intlCard');
      intlCard.querySelector('small').textContent = t('pay.intlCardHint');
    }
    const intlPaypal = document.querySelector('.payment-option-paypal');
    if (intlPaypal) {
      intlPaypal.querySelector('strong').textContent = t('pay.paypal');
      intlPaypal.querySelector('small').textContent = t('pay.paypalHint');
    }
    const intlPix = document.querySelector('#payment-options-intl .payment-option:last-child');
    if (intlPix) {
      intlPix.querySelector('strong').textContent = t('pay.pixIntl');
      intlPix.querySelector('small').textContent = t('pay.pixIntlHint');
    }

    const noticeBr = document.getElementById('payment-notice-br');
    if (noticeBr) noticeBr.innerHTML = `<i class="fas fa-info-circle"></i> ${t('pay.noticeBr')}`;
    const noticeIntl = document.getElementById('payment-notice-intl');
    if (noticeIntl) noticeIntl.innerHTML = `<i class="fas fa-info-circle"></i> ${t('pay.noticeIntl')}`;

    const footer = document.querySelector('[data-site-footer]');
    if (footer) footer.dataset.lang = 'en';

    document.title = 'Checkout | Sensor Tattoo Fix — Official Store';
  }

  function init() {
    try {
      const q = new URLSearchParams(location.search).get('lang');
      if (q === 'en' || q === 'pt') setLang(q);
    } catch (e) { /* ignore */ }
    if (document.body?.classList.contains('checkout-page')) applyCheckoutDom();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { t, getLang, setLang, applyCheckoutDom, STRINGS };
})();
