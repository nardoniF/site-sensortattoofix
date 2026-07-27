/**
 * International checkout (.com) — Stripe Payment Element + PayPal embedded.
 */
window.STF_INTL_PAY = (function () {
  let cfg = null;
  let stripe = null;
  let stripeElements = null;
  let stripeClientSecret = null;
  let pendingReturnUrl = '';
  let paypalButtons = null;
  let paypalMountKey = '';
  let mountInFlight = null;

  function apiBase() {
    return String(window.CONFIG_BOOTSTRAP?.configApiUrl || cfg?.api?.baseUrl || '')
      .replace(/\/$/, '');
  }

  function isActive() {
    return !!(window.STF_SITE?.isIntlHost?.() || /\.sensortattoofix\.com$/i.test(location.hostname));
  }

  async function loadConfig() {
    if (cfg) return cfg;
    const base = apiBase();
    if (!base) return null;
    const res = await fetch(base + '/config', { cache: 'no-store' });
    if (!res.ok) return null;
    cfg = await res.json();
    return cfg;
  }

  function selectedMethod() {
    return document.querySelector('#payment-options-intl [name=pagamento]:checked')?.value || 'STRIPE';
  }

  function showPaySection(method) {
    const stripeWrap = document.getElementById('intl-stripe-wrap');
    const paypalWrap = document.getElementById('intl-paypal-wrap');
    if (stripeWrap) stripeWrap.hidden = method !== 'STRIPE';
    if (paypalWrap) paypalWrap.hidden = method !== 'PAYPAL';
  }

  function clearPayPalDom() {
    const container = document.getElementById('paypal-button-container');
    const walletBox = document.getElementById('paypal-wallet-buttons');
    if (paypalButtons && typeof paypalButtons.close === 'function') {
      try { paypalButtons.close(); } catch (_) { /* ok */ }
    }
    paypalButtons = null;
    if (container) container.innerHTML = '';
    if (walletBox) walletBox.innerHTML = '';
  }

  function paypalCurrency() {
    try {
      const lang = window.STF_I18N?.getLang?.();
      if (lang === 'it') return 'EUR';
    } catch (_) { /* ignore */ }
    const path = String(location.pathname || '');
    if (path.includes('/it/')) return 'EUR';
    const htmlLang = String(document.documentElement.lang || '').toLowerCase();
    if (htmlLang.startsWith('it')) return 'EUR';
    return 'USD';
  }

  function payNoticeHtml(key) {
    try {
      const t = window.STF_I18N?.t?.(key);
      if (t) return `<i class="fas fa-info-circle"></i> ${t}`;
    } catch (_) { /* ignore */ }
    const cur = paypalCurrency();
    if (cur === 'EUR') {
      return '<i class="fas fa-info-circle"></i> Addebito in EUR · spedizione tracciata.';
    }
    return '<i class="fas fa-info-circle"></i> Charged in USD · tracked shipping.';
  }

  async function initUi() {
    if (!isActive()) return false;
    await loadConfig();
    const payCfg = cfg?.payments || {};
    const pk = String(payCfg.stripe?.publishableKey || '');
    const hasStripe = !!(payCfg.stripe?.enabled && /^pk_live_/.test(pk));
    const hasPaypal = !!(payCfg.paypal?.clientId && payCfg.paypal?.internationalEnabled !== false);
    const stripeTab = document.querySelector('#payment-options-intl .payment-option-stripe');
    const paypalTab = document.querySelector('#payment-options-intl .payment-option-paypal');
    if (stripeTab) stripeTab.hidden = !hasStripe;
    if (paypalTab) paypalTab.hidden = !hasPaypal;
    const notice = document.getElementById('payment-notice-intl');
    const stripeInput = document.querySelector('#payment-options-intl input[value="STRIPE"]');
    const paypalInput = document.querySelector('#payment-options-intl input[value="PAYPAL"]');
    if (stripeInput) {
      stripeInput.disabled = !hasStripe;
      if (!hasStripe) stripeInput.checked = false;
      else if (hasStripe) {
        stripeInput.checked = true;
        if (paypalInput) paypalInput.checked = false;
      }
    }
    if (hasStripe && notice && !notice.dataset.stfLocked) {
      notice.innerHTML = payNoticeHtml('pay.noticeIntlEmbeddedStripe');
    } else if (!hasStripe && hasPaypal && paypalInput) {
      paypalInput.checked = true;
      if (notice && !notice.dataset.stfLocked) {
        notice.innerHTML = payNoticeHtml('pay.noticeIntlEmbeddedPaypal');
      }
    }
    if (!hasStripe && !hasPaypal && notice) {
      notice.innerHTML = '<i class="fas fa-info-circle"></i> Online payment is not configured yet. Card and PayPal will appear here after Stripe/PayPal API keys are added to the server.';
    }
    document.querySelectorAll('#payment-options-intl [name=pagamento]').forEach((el) => {
      el.addEventListener('change', () => showPaySection(el.value));
    });
    const checked = document.querySelector('#payment-options-intl [name=pagamento]:checked');
    showPaySection(checked?.value || (hasStripe ? 'STRIPE' : 'PAYPAL'));
    return hasStripe || hasPaypal;
  }

  async function loadStripeJs() {
    if (window.Stripe) return window.Stripe;
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://js.stripe.com/v3/';
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
    return window.Stripe;
  }

  function paypalSdkLocale() {
    try {
      const lang = window.STF_I18N?.getLang?.();
      if (lang === 'it') return 'it_IT';
      if (lang === 'en') return 'en_US';
    } catch (_) { /* ignore */ }
    const path = String(location.pathname || '');
    if (path.includes('/it/')) return 'it_IT';
    const htmlLang = String(document.documentElement.lang || '').toLowerCase();
    if (htmlLang.startsWith('it')) return 'it_IT';
    if (htmlLang.startsWith('en') || /\.sensortattoofix\.com$/i.test(location.hostname)) return 'en_US';
    return 'pt_BR';
  }

  async function loadPayPalJs(clientId) {
    const locale = paypalSdkLocale();
    const currency = paypalCurrency();
    const sdkKey = locale + ':' + currency;
    const existing = document.querySelector('script[data-stf-paypal-sdk]');
    if (existing && existing.getAttribute('data-stf-paypal-key') === sdkKey && window.paypal?.Buttons) {
      return window.paypal;
    }
    if (existing && existing.getAttribute('data-stf-paypal-key') !== sdkKey) {
      existing.remove();
      try { delete window.paypal; } catch (_) { window.paypal = undefined; }
    }
    await new Promise((resolve, reject) => {
      const again = document.querySelector('script[data-stf-paypal-sdk]');
      if (again) {
        again.addEventListener('load', resolve);
        again.addEventListener('error', reject);
        return;
      }
      const s = document.createElement('script');
      s.src = 'https://www.paypal.com/sdk/js?client-id=' + encodeURIComponent(clientId)
        + '&currency=' + encodeURIComponent(currency) + '&intent=capture&components=buttons'
        + '&locale=' + encodeURIComponent(locale);
      s.setAttribute('data-stf-paypal-sdk', '1');
      s.setAttribute('data-stf-paypal-key', sdkKey);
      s.setAttribute('data-stf-paypal-locale', locale);
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
    return window.paypal;
  }

  function stripeLocale() {
    try {
      const lang = window.STF_I18N?.getLang?.();
      if (lang === 'it') return 'it';
      if (lang === 'en') return 'en';
      if (lang === 'pt') return 'pt-BR';
    } catch (_) { /* ignore */ }
    const path = String(location.pathname || '');
    if (path.includes('/it/')) return 'it';
    if (path.includes('/en/') || /\.sensortattoofix\.com$/i.test(location.hostname)) return 'en';
    const htmlLang = String(document.documentElement.lang || '').toLowerCase();
    if (htmlLang.startsWith('it')) return 'it';
    if (htmlLang.startsWith('en')) return 'en';
    if (htmlLang.startsWith('pt')) return 'pt-BR';
    return 'en';
  }

  async function mountStripeRedirectLink(orderId, accessToken) {
    const linkEl = document.getElementById('stripe-redirect-link');
    if (!linkEl) return null;
    try {
      const base = apiBase();
      const res = await fetch(base + '/orders/' + encodeURIComponent(orderId) + '/stripe/checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken, locale: stripeLocale() })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.checkoutUrl) {
        linkEl.hidden = true;
        return null;
      }
      linkEl.href = data.checkoutUrl;
      linkEl.hidden = false;
      return data.checkoutUrl;
    } catch (_) {
      linkEl.hidden = true;
      return null;
    }
  }

  async function mountStripe(orderId, accessToken) {
    await loadConfig();
    const pk = cfg?.payments?.stripe?.publishableKey;
    if (!pk) throw new Error('Stripe is not configured.');
    const base = apiBase();
    const res = await fetch(base + '/orders/' + encodeURIComponent(orderId) + '/stripe/payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Could not start card payment.');
    stripeClientSecret = data.clientSecret;
    pendingReturnUrl = data.returnUrl || (location.origin + location.pathname + '?stripe=return&orderId='
      + encodeURIComponent(orderId) + '&accessToken=' + encodeURIComponent(accessToken));
    const StripeCtor = await loadStripeJs();
    stripe = StripeCtor(pk);
    stripeElements = stripe.elements({
      clientSecret: stripeClientSecret,
      locale: stripeLocale()
    });
    const mount = document.getElementById('stripe-payment-element');
    if (!mount) throw new Error('Payment form missing.');
    mount.innerHTML = '';
    const paymentElement = stripeElements.create('payment', {
      layout: 'tabs',
      wallets: { applePay: 'auto', googlePay: 'auto' }
    });
    paymentElement.mount('#stripe-payment-element');
    const confirmBtn = document.getElementById('btn-stripe-confirm');
    if (confirmBtn) confirmBtn.hidden = false;
    // Hosted Checkout fallback — same idea as “Continue on PayPal.com”
    mountStripeRedirectLink(orderId, accessToken);
  }

  async function confirmStripe() {
    if (!stripe || !stripeElements || !stripeClientSecret) throw new Error('Stripe not ready.');
    // Stripe requires elements.submit() before confirmPayment; tolerate the
    // clientSecret-flow variant where submit() is unnecessary.
    if (typeof stripeElements.submit === 'function') {
      const submitResult = await stripeElements.submit();
      if (submitResult?.error && !/client secret/i.test(submitResult.error.message || '')) {
        throw new Error(submitResult.error.message || 'Payment validation failed.');
      }
    }
    const result = await stripe.confirmPayment({
      elements: stripeElements,
      clientSecret: stripeClientSecret,
      confirmParams: { return_url: pendingReturnUrl },
      redirect: 'if_required'
    });
    if (result.error) throw new Error(result.error.message || 'Payment failed.');
    return result.paymentIntent;
  }

  function payErrorStrings() {
    let lang = 'en';
    try { lang = window.STF_I18N?.getLang?.() || 'en'; } catch (_) { /* ignore */ }
    const path = String(location.pathname || '');
    if (lang === 'it' || path.includes('/it/')) {
      return {
        generic: 'Non è stato possibile completare il pagamento. Riprova o usa un altro metodo.',
        card: 'La carta è stata rifiutata. Controlla i dati o prova un\'altra carta.',
        network: 'Problema di connessione. Controlla la rete e riprova.',
        retry: 'Riprova'
      };
    }
    if (lang === 'pt' || (!path.includes('/en/') && !path.includes('/it/') && !/\.sensortattoofix\.com$/i.test(location.hostname))) {
      return {
        generic: 'Não foi possível concluir o pagamento. Tente novamente ou use outro método.',
        card: 'Cartão recusado. Confira os dados ou tente outro cartão.',
        network: 'Falha de conexão. Verifique a internet e tente de novo.',
        retry: 'Tentar novamente'
      };
    }
    return {
      generic: 'We couldn\'t complete your payment. Please try again or use another method.',
      card: 'Your card was declined. Check the details or try another card.',
      network: 'Connection problem. Check your internet and try again.',
      retry: 'Try again'
    };
  }

  function friendlyPayMessage(err) {
    const raw = String(err?.message || '').toLowerCase();
    const s = payErrorStrings();
    if (/declin|card|cvc|expir|insuffic|incorrect/.test(raw)) return s.card;
    if (/network|connection|fetch|timeout|failed to/.test(raw)) return s.network;
    // elements.submit / integration errors → generic, never show Stripe internals.
    return s.generic;
  }

  function showStripeError(err) {
    const box = document.getElementById('stripe-pay-error');
    const msg = friendlyPayMessage(err);
    if (!box) { alert(msg); return; }
    box.textContent = msg;
    box.hidden = false;
    try { box.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (_) { /* ok */ }
  }

  function clearStripeError() {
    const box = document.getElementById('stripe-pay-error');
    if (box) { box.hidden = true; box.textContent = ''; }
  }

  async function mountPayPal(orderId, accessToken, onDone) {
    const key = orderId + ':' + accessToken;
    if (paypalMountKey === key && paypalButtons) {
      return { reused: true };
    }
    if (mountInFlight) return mountInFlight;

    mountInFlight = (async () => {
      await loadConfig();
      const clientId = cfg?.payments?.paypal?.clientId;
      if (!clientId) throw new Error('PayPal is not configured.');
      const base = apiBase();
      const createRes = await fetch(base + '/orders/' + encodeURIComponent(orderId) + '/paypal/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken })
      });
      const createData = await createRes.json().catch(() => ({}));
      if (!createRes.ok) throw new Error(createData.error || 'Could not start PayPal.');
      const paypalOrderId = createData.paypalOrderId;
      const approveUrl = createData.approveUrl;
      const linkEl = document.getElementById('paypal-redirect-link');
      if (linkEl && approveUrl) {
        linkEl.href = approveUrl;
        linkEl.hidden = false;
      }

      const paypal = await loadPayPalJs(clientId);
      if (!paypal?.Buttons) throw new Error('PayPal SDK failed to load.');

      clearPayPalDom();
      const container = document.getElementById('paypal-button-container');
      if (!container) throw new Error('PayPal container missing.');

      const buttons = paypal.Buttons({
        style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'paypal' },
        createOrder: function () { return paypalOrderId; },
        onApprove: async function () {
          const cap = await fetch(base + '/orders/' + encodeURIComponent(orderId) + '/paypal/capture', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accessToken, paypalOrderId })
          });
          const capData = await cap.json().catch(() => ({}));
          if (!cap.ok) throw new Error(capData.error || 'PayPal capture failed.');
          if (onDone) onDone(capData);
        },
        onError: function (err) {
          console.error('PayPal:', err);
        }
      });

      if (typeof buttons.isEligible === 'function' && !buttons.isEligible()) {
        // Fall back to redirect link only
        if (linkEl && approveUrl) linkEl.hidden = false;
        return { redirectOnly: true, approveUrl };
      }

      await buttons.render('#paypal-button-container');
      paypalButtons = buttons;
      paypalMountKey = key;
      return { mounted: true, approveUrl };
    })();

    try {
      return await mountInFlight;
    } finally {
      mountInFlight = null;
    }
  }

  /**
   * After order is created — mount embedded payment UI.
   */
  async function payAfterOrder(orderId, accessToken, callbacks) {
    const method = selectedMethod();
    document.getElementById('intl-embedded-pay')?.removeAttribute('hidden');
    showPaySection(method);
    if (method === 'STRIPE') {
      await mountStripe(orderId, accessToken);
      const confirmBtn = document.getElementById('btn-stripe-confirm');
      if (confirmBtn) {
        confirmBtn.onclick = async () => {
          confirmBtn.disabled = true;
          clearStripeError();
          try {
            const intent = await confirmStripe();
            if (intent?.status === 'succeeded' && callbacks?.onSuccess) {
              callbacks.onSuccess({ provider: 'stripe', orderId });
            } else {
              confirmBtn.disabled = false;
            }
          } catch (err) {
            console.error('Stripe:', err);
            showStripeError(err);
            confirmBtn.disabled = false;
          }
        };
      }
      return { provider: 'stripe', mounted: true };
    }
    const paypalResult = await mountPayPal(orderId, accessToken, callbacks?.onSuccess);
    return { provider: 'paypal', pending: true, ...paypalResult };
  }

  return {
    enabled: isActive,
    initUi,
    payAfterOrder,
    confirmStripe,
    selectedMethod,
    clearPayPalDom
  };
})();
