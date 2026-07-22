/**
 * International checkout (.com) — Stripe Payment Element + PayPal embedded.
 */
window.STF_INTL_PAY = (function () {
  let cfg = null;
  let stripe = null;
  let stripeElements = null;
  let stripeClientSecret = null;
  let paypalRendered = false;
  let pendingReturnUrl = '';

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

  async function initUi() {
    if (!isActive()) return false;
    await loadConfig();
    const payCfg = cfg?.payments || {};
    const hasStripe = !!(payCfg.stripe?.publishableKey);
    const hasPaypal = !!(payCfg.paypal?.clientId && payCfg.paypal?.internationalEnabled !== false);
    const stripeTab = document.querySelector('#payment-options-intl .payment-option-stripe');
    const paypalTab = document.querySelector('#payment-options-intl .payment-option-paypal');
    if (stripeTab) stripeTab.hidden = !hasStripe;
    if (paypalTab) paypalTab.hidden = !hasPaypal;
    const notice = document.getElementById('payment-notice-intl');
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

  async function loadPayPalJs(clientId) {
    if (window.paypal) return window.paypal;
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://www.paypal.com/sdk/js?client-id=' + encodeURIComponent(clientId)
        + '&currency=USD&intent=capture&components=buttons';
      s.setAttribute('data-sdk-integration-source', 'button-factory');
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
    return window.paypal;
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
    stripeElements = stripe.elements({ clientSecret: stripeClientSecret });
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
  }

  async function confirmStripe() {
    if (!stripe || !stripeClientSecret) throw new Error('Stripe not ready.');
    const result = await stripe.confirmPayment({
      elements: stripeElements,
      clientSecret: stripeClientSecret,
      confirmParams: { return_url: pendingReturnUrl },
      redirect: 'if_required'
    });
    if (result.error) throw new Error(result.error.message || 'Payment failed.');
    return result.paymentIntent;
  }

  function fundingEligible(paypal, fundingSource) {
    if (!paypal || !fundingSource) return false;
    try {
      if (typeof paypal.isFundingEligible === 'function') {
        return !!paypal.isFundingEligible(fundingSource);
      }
      // Older / standard JS SDK: Buttons(...).isEligible()
      if (typeof paypal.Buttons === 'function') {
        return !!paypal.Buttons({ fundingSource }).isEligible();
      }
    } catch (err) {
      console.warn('PayPal funding check:', fundingSource, err);
    }
    return false;
  }

  function renderPayPalButton(paypal, orderId, accessToken, base, paypalOrderId, onDone, containerId, fundingSource) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const source = fundingSource || paypal.FUNDING?.PAYPAL;
    if (source && fundingSource && !fundingEligible(paypal, source)) return;
    const opts = {
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
        alert((err && err.message) || 'PayPal error.');
      }
    };
    if (source) opts.fundingSource = source;
    try {
      const buttons = paypal.Buttons(opts);
      if (typeof buttons.isEligible === 'function' && !buttons.isEligible()) return;
      buttons.render('#' + containerId);
    } catch (e) {
      console.warn('PayPal button render:', e);
    }
  }

  async function mountPayPal(orderId, accessToken, onDone) {
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
    const container = document.getElementById('paypal-button-container');
    if (!container) throw new Error('PayPal container missing.');
    if (paypalRendered) {
      container.innerHTML = '';
      const walletBox = document.getElementById('paypal-wallet-buttons');
      if (walletBox) walletBox.innerHTML = '';
      paypalRendered = false;
    }
    renderPayPalButton(paypal, orderId, accessToken, base, paypalOrderId, onDone, 'paypal-button-container');
    const walletBox = document.getElementById('paypal-wallet-buttons');
    if (walletBox && paypal.FUNDING) {
      if (fundingEligible(paypal, paypal.FUNDING.APPLEPAY)) {
        const appleDiv = document.createElement('div');
        appleDiv.id = 'paypal-applepay-container';
        walletBox.appendChild(appleDiv);
        renderPayPalButton(paypal, orderId, accessToken, base, paypalOrderId, onDone, 'paypal-applepay-container', paypal.FUNDING.APPLEPAY);
      }
      if (fundingEligible(paypal, paypal.FUNDING.GOOGLEPAY)) {
        const gDiv = document.createElement('div');
        gDiv.id = 'paypal-googlepay-container';
        walletBox.appendChild(gDiv);
        renderPayPalButton(paypal, orderId, accessToken, base, paypalOrderId, onDone, 'paypal-googlepay-container', paypal.FUNDING.GOOGLEPAY);
      }
    }
    paypalRendered = true;
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
          try {
            const intent = await confirmStripe();
            if (intent?.status === 'succeeded' && callbacks?.onSuccess) {
              callbacks.onSuccess({ provider: 'stripe', orderId });
            }
          } catch (err) {
            alert(err.message || 'Payment failed.');
            confirmBtn.disabled = false;
          }
        };
      }
      return { provider: 'stripe', mounted: true };
    }
    await mountPayPal(orderId, accessToken, callbacks?.onSuccess);
    return { provider: 'paypal', pending: true };
  }

  return {
    enabled: isActive,
    initUi,
    payAfterOrder,
    confirmStripe,
    selectedMethod
  };
})();
