(function () {
  let cfg, products = [];
  let shippingCost = null, shippingInfo = null, pollTimer = null, isInternational = false;

  const els = {
    form: document.getElementById('checkout-form'),
    steps: document.querySelectorAll('.checkout-step'),
    indicators: document.querySelectorAll('.step-indicator'),
    btnNext: document.getElementById('btn-next'),
    btnBack: document.getElementById('btn-back'),
    btnPay: document.getElementById('btn-pay'),
    cep: document.getElementById('cep'),
    paisCode: document.getElementById('pais-code'),
    addressBr: document.getElementById('address-br'),
    addressIntl: document.getElementById('address-intl'),
    smartwatchSelect: document.getElementById('smartwatch-select'),
    summaryProduct: document.getElementById('summary-product'),
    summaryShipping: document.getElementById('summary-shipping'),
    summaryShippingLabel: document.getElementById('summary-shipping-label'),
    summaryTotal: document.getElementById('summary-total'),
    shippingHint: document.getElementById('shipping-hint'),
    pixQr: document.getElementById('pix-qr'),
    pixCopy: document.getElementById('pix-copy'),
    pixCopyArea: document.getElementById('pix-copy-area'),
    pixAmount: document.getElementById('pix-amount'),
    orderId: document.getElementById('order-id'),
    paymentStatus: document.getElementById('payment-status'),
    cardPayLink: document.getElementById('card-pay-link'),
    pixUi: document.getElementById('pix-ui'),
    cardUi: document.getElementById('card-ui'),
    paymentPanel: document.getElementById('payment-panel'),
    confirmTitle: document.getElementById('confirm-title'),
    confirmHint: document.getElementById('confirm-hint'),
    cartSidebar: document.getElementById('cart-sidebar-items'),
    smartwatchWrap: document.getElementById('smartwatch-wrap'),
    criarConta: document.getElementById('criar-conta'),
    senhaWrap: document.getElementById('senha-wrap'),
    checkoutSenha: document.getElementById('checkout-senha'),
    accountCreateWrap: document.getElementById('account-create-wrap'),
    accountGuestWrap: document.getElementById('account-guest-wrap'),
    accountLoggedWrap: document.getElementById('account-logged-wrap'),
    accountLoggedName: document.getElementById('account-logged-name')
  };

  let currentStep = 1;

  function apiBase() {
    return ((cfg?.api?.baseUrl) || window.CONFIG_BOOTSTRAP?.configApiUrl || '').replace(/\/$/, '');
  }

  function formatBRL(v) {
    return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function onlyDigits(s) { return (s || '').replace(/\D/g, ''); }

  function generateOrderId() {
    const d = new Date(), p = (n) => String(n).padStart(2, '0');
    return `STF-${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
  }

  function maskCep(v) {
    const d = onlyDigits(v).slice(0, 8);
    return d.length > 5 ? d.slice(0,5)+'-'+d.slice(5) : d;
  }

  function maskPhone(v) {
    const d = onlyDigits(v).slice(0, 11);
    return d.length <= 10 ? d.replace(/(\d{2})(\d{4})(\d{0,4})/,'($1) $2-$3').trim()
      : d.replace(/(\d{2})(\d{5})(\d{0,4})/,'($1) $2-$3').trim();
  }

  function maskCpf(v) {
    const d = onlyDigits(v).slice(0, 11);
    return d.replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d{1,2})$/,'$1-$2');
  }

  function customerToken() {
    return window.STF_ACCOUNT?.getToken() || '';
  }

  function getCustomerUser() {
    return window.STF_ACCOUNT?.getUser() || null;
  }

  function renderCheckoutAccountUI() {
    const user = getCustomerUser();
    if (els.accountLoggedWrap && els.accountGuestWrap) {
      if (user) {
        if (els.accountLoggedName) {
          els.accountLoggedName.textContent = window.STF_ACCOUNT.displayName(user);
        }
        els.accountLoggedWrap.hidden = false;
        els.accountGuestWrap.hidden = true;
      } else {
        els.accountLoggedWrap.hidden = true;
        els.accountGuestWrap.hidden = false;
      }
    }
    if (user) prefillCustomer(user);
  }

  function cartSubtotal() {
    return window.STF_CART?.subtotal() || 0;
  }

  function escapeHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  }

  function updateSmartwatchVisibility() {
    const needsWatch = window.STF_CART?.requiresSmartwatch();
    if (els.smartwatchWrap) els.smartwatchWrap.hidden = !needsWatch;
    if (els.smartwatchSelect) els.smartwatchSelect.required = !!needsWatch;
  }

  function seedCartFromUrl() {
    const params = new URLSearchParams(location.search);
    const slug = params.get('produto');
    if (!slug) return false;
    const p = products.find((x) => x.slug === slug || x.id === slug);
    if (!p) return false;
    if (params.get('comprar') === '1') window.STF_CART.clear();
    window.STF_CART.add(p, 1);
    history.replaceState({}, '', location.pathname);
    return true;
  }

  function renderCartSidebar() {
    if (!els.cartSidebar || !window.STF_CART) return;
    const items = window.STF_CART.load();
    if (!items.length) {
      els.cartSidebar.innerHTML = '<p class="conta-empty">Carrinho vazio</p>';
      return;
    }
    els.cartSidebar.innerHTML = items.map((item) => `
      <div class="cart-line" data-product-id="${escapeHtml(item.productId)}">
        <img src="${escapeHtml(item.image)}" alt="" class="cart-line-img">
        <div class="cart-line-info">
          <strong>${escapeHtml(item.name)}</strong>
          <span class="cart-line-price">${formatBRL(item.price)}</span>
          <div class="cart-qty" role="group" aria-label="Quantidade">
            <button type="button" class="cart-qty-btn" data-delta="-1" aria-label="Diminuir">−</button>
            <span class="cart-qty-val">${item.qty}</span>
            <button type="button" class="cart-qty-btn" data-delta="1" aria-label="Aumentar">+</button>
          </div>
        </div>
        <button type="button" class="cart-remove" title="Remover" aria-label="Remover">&times;</button>
      </div>
    `).join('');

    els.cartSidebar.querySelectorAll('.cart-line').forEach((row) => {
      const id = row.getAttribute('data-product-id');
      row.querySelector('.cart-remove')?.addEventListener('click', () => {
        window.STF_CART.remove(id);
        if (window.STF_CART.isEmpty()) {
          window.location.href = 'loja.html';
          return;
        }
        shippingCost = null;
        shippingInfo = null;
        renderCartSidebar();
        updateSmartwatchVisibility();
        updateSummary();
        quoteShipping();
      });
      row.querySelectorAll('.cart-qty-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          const delta = Number(btn.getAttribute('data-delta'));
          const current = window.STF_CART.load().find((i) => i.productId === id);
          window.STF_CART.setQty(id, (current?.qty || 1) + delta);
          if (window.STF_CART.isEmpty()) {
            window.location.href = 'loja.html';
            return;
          }
          shippingCost = null;
          shippingInfo = null;
          renderCartSidebar();
          updateSmartwatchVisibility();
          updateSummary();
          quoteShipping();
        });
      });
    });
    updateSmartwatchVisibility();
  }

  async function loadCustomerSession() {
    if (!window.STF_ACCOUNT) return;
    await window.STF_ACCOUNT.refreshSession();
    renderCheckoutAccountUI();
  }

  function prefillCustomer(user) {
    const u = user || getCustomerUser();
    if (!u || !els.form) return;
    const f = els.form;
    if (f.nome) f.nome.value = u.nome || '';
    if (f.email) f.email.value = u.email || '';
    if (f.telefone) f.telefone.value = u.telefone || '';
    if (f.cpf && u.cpf) f.cpf.value = u.cpf;
  }

  function smartwatchGroup(model) {
    if (model.startsWith('Apple Watch')) return 'Apple Watch';
    if (model.startsWith('Samsung')) return 'Samsung Galaxy Watch';
    if (model.startsWith('Garmin')) return 'Garmin';
    if (model.startsWith('Huawei')) return 'Huawei';
    if (model.startsWith('Xiaomi') || model.startsWith('Redmi')) return 'Xiaomi / Redmi';
    if (model.startsWith('Amazfit')) return 'Amazfit';
    if (model.startsWith('Fitbit') || model.startsWith('Polar')) return 'Outras marcas';
    return 'Outros';
  }

  function populateSelects() {
    const models = cfg.smartwatchModels || [];
    const groups = new Map();
    models.forEach((m) => {
      const label = smartwatchGroup(m);
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label).push(m);
    });
    groups.forEach((items, label) => {
      const og = document.createElement('optgroup');
      og.label = label;
      items.forEach((m) => {
        const o = document.createElement('option');
        o.value = m;
        o.textContent = m;
        og.appendChild(o);
      });
      els.smartwatchSelect.appendChild(og);
    });

    const intl = cfg.internationalShipping || {};
    Object.entries(intl).forEach(([code, z]) => {
      if (code === 'OTHER') return;
      const o = document.createElement('option');
      o.value = code; o.textContent = z.label;
      els.paisCode.appendChild(o);
    });
    const other = document.createElement('option');
    other.value = 'OTHER'; other.textContent = 'Outro país';
    els.paisCode.appendChild(other);
  }

  function toggleAddressForm() {
    isInternational = els.paisCode.value !== 'BR';
    els.addressBr.hidden = isInternational;
    els.addressIntl.hidden = !isInternational;
    els.summaryShippingLabel.textContent = isInternational ? 'Frete internacional' : 'Frete Mini Envios';
    shippingCost = null;
    shippingInfo = null;
    updateSummary();
    if (isInternational) quoteShipping();
  }

  function estimateBR(destCep) {
    const o = parseInt(onlyDigits(cfg.shipping?.originCep).slice(0, 5), 10) || 0;
    const d = parseInt(onlyDigits(destCep).slice(0, 5), 10) || 0;
    const diff = Math.abs(o - d);
    let base;
    if (diff < 800) base = { price: 11.9, days: 8 };
    else if (diff < 3000) base = { price: 15.9, days: 10 };
    else if (diff < 8000) base = { price: 19.9, days: 12 };
    else base = { price: 24.9, days: 14 };
    const weightFactor = Math.min(2.5, Math.max(1, (window.STF_CART?.totalWeight() || 120) / 120));
    return {
      price: Math.round(base.price * weightFactor * 100) / 100,
      days: base.days,
      service: 'Mini Envios',
      source: 'estimate'
    };
  }

  async function fetchShippingQuote(url) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      console.warn('Cotação API indisponível, usando estimativa local.', e);
      return null;
    }
  }

  async function quoteShipping() {
    const base = apiBase();
    try {
      if (isInternational) {
        const code = els.paisCode.value;
        if (base) {
          const data = await fetchShippingQuote(`${base}/shipping/quote?country=${code}`);
          if (data?.price) { shippingInfo = data; shippingCost = data.price; }
        }
        if (!shippingCost) {
          const z = cfg.internationalShipping[code] || cfg.internationalShipping.OTHER;
          if (!z) throw new Error('País não atendido');
          shippingInfo = { price: z.price, days: z.days, service: 'Internacional — ' + z.label, source: 'config' };
          shippingCost = z.price;
        }
      } else {
        const cep = onlyDigits(els.cep.value);
        if (cep.length !== 8) return;
        if (base) {
          const weight = window.STF_CART?.totalWeight() || 120;
          const valor = cartSubtotal();
          const data = await fetchShippingQuote(
            `${base}/shipping/quote?country=BR&cep=${cep}&weightGrams=${weight}&valor=${valor}`
          );
          if (data?.price) { shippingInfo = data; shippingCost = data.price; }
        }
        if (!shippingCost) {
          shippingInfo = estimateBR(cep);
          shippingCost = shippingInfo.price;
        }
      }
      updateSummary();
      const src = shippingInfo.source === 'correios' ? 'Correios' : (shippingInfo.source === 'international' ? 'Internacional' : 'estimativa');
      els.shippingHint.textContent = `${shippingInfo.service}: ${formatBRL(shippingCost)} (${shippingInfo.days} dias · ${src})`;
    } catch {
      els.shippingHint.textContent = 'Erro ao calcular frete.';
      shippingCost = null;
    }
  }

  function updateSummary() {
    const subtotal = cartSubtotal();
    els.summaryProduct.textContent = formatBRL(subtotal);
    els.summaryShipping.textContent = shippingCost === null ? '—' : formatBRL(shippingCost);
    els.summaryTotal.textContent = shippingCost === null ? '—' : formatBRL(subtotal + shippingCost);
  }

  function showStep(step) {
    currentStep = step;
    els.steps.forEach((s) => s.classList.toggle('active', Number(s.dataset.step) === step));
    els.indicators.forEach((ind) => {
      const n = Number(ind.dataset.step);
      ind.classList.toggle('active', n === step);
      ind.classList.toggle('done', n < step);
    });
    els.btnBack.style.display = step > 1 && step < 3 ? 'inline-flex' : 'none';
    els.btnNext.style.display = step === 1 ? 'inline-flex' : 'none';
    els.btnPay.style.display = step === 2 ? 'inline-flex' : 'none';
  }

  async function fetchCep(cep) {
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const data = await res.json();
    if (data.erro) throw new Error('CEP inválido');
    return data;
  }

  function collectOrderData() {
    const f = els.form;
    const paisCode = els.paisCode.value;
    const intlZones = cfg.internationalShipping || {};
    const paisLabel = paisCode === 'BR' ? 'Brasil' : (intlZones[paisCode]?.label || 'Internacional');

    let data;
    if (isInternational) {
      data = {
        cep: document.getElementById('postal-intl').value,
        rua: document.getElementById('rua-intl').value.trim(),
        numero: 'S/N',
        complemento: '',
        bairro: document.getElementById('uf-intl').value.trim() || '-',
        cidade: document.getElementById('cidade-intl').value.trim(),
        uf: document.getElementById('uf-intl').value.trim() || paisCode
      };
    } else {
      data = {
        cep: f.cep.value.trim(), rua: f.rua.value.trim(), numero: f.numero.value.trim(),
        complemento: f.complemento.value.trim(), bairro: f.bairro.value.trim(),
        cidade: f.cidade.value.trim(), uf: f.uf.value.trim()
      };
    }

    const comp = data.complemento ? `, ${data.complemento}` : '';
    const endereco = `${data.rua}, ${data.numero}${comp} — ${data.bairro}, ${data.cidade}/${data.uf} — ${paisLabel} ${data.cep}`;

    const payload = {
      nome: f.nome.value.trim(), email: f.email.value.trim(),
      telefone: f.telefone.value.trim(), cpf: f.cpf.value.trim(),
      smartwatch: f.smartwatch.value,
      pais: paisLabel, paisCode,
      ...data, endereco,
      frete: shippingCost,
      shippingService: shippingInfo?.service,
      shippingDays: shippingInfo?.days,
      pagamento: f.querySelector('[name=pagamento]:checked').value,
      items: window.STF_CART.load().map((i) => ({ productId: i.productId, qty: i.qty }))
    };
    if (els.criarConta?.checked && !getCustomerUser() && !els.accountGuestWrap?.hidden) {
      payload.criarConta = true;
      payload.senha = els.checkoutSenha?.value || '';
    }
    return payload;
  }

  function validateStep1() {
    const f = els.form;
    if (window.STF_CART?.isEmpty()) {
      alert('Seu carrinho está vazio.'); return false;
    }
    const needsWatch = window.STF_CART?.requiresSmartwatch();
    if (!f.nome.value || !f.email.value || !f.telefone.value || !f.cpf.value) {
      alert('Preencha todos os campos obrigatórios.'); return false;
    }
    if (needsWatch && !f.smartwatch.value) {
      alert('Selecione o modelo do smartwatch.'); return false;
    }
    if (els.criarConta?.checked && !getCustomerUser() && !els.accountGuestWrap?.hidden) {
      const senha = els.checkoutSenha?.value || '';
      if (senha.length < 6) {
        alert('Crie uma senha com pelo menos 6 caracteres ou desmarque "Criar conta".');
        return false;
      }
    }
    if (shippingCost === null) { alert('Aguarde o cálculo do frete.'); return false; }
    if (!isInternational) {
      if (onlyDigits(f.cep.value).length !== 8 || !f.rua.value || !f.numero.value || !f.bairro.value || !f.cidade.value || !f.uf.value) {
        alert('Preencha o endereço brasileiro completo.'); return false;
      }
    } else {
      if (!document.getElementById('rua-intl').value || !document.getElementById('cidade-intl').value) {
        alert('Preencha o endereço internacional.'); return false;
      }
    }
    return true;
  }

  async function createOrder(orderData) {
    const base = apiBase();
    if (base) {
      const headers = { 'Content-Type': 'application/json' };
      const token = customerToken();
      if (token) headers.Authorization = 'Bearer ' + token;
      const res = await fetch(base + '/orders', {
        method: 'POST',
        headers,
        body: JSON.stringify(orderData)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erro ao registrar pedido.');
      }
      return res.json();
    }

    const orderId = generateOrderId();
    const body = new FormData();
    body.append('_subject', cfg.formsubmit.subject);
    body.append('_captcha', 'false');
    body.append('_template', 'table');
    const subtotal = cartSubtotal();
    Object.entries({ Pedido: orderId, Nome: orderData.nome, Smartwatch: orderData.smartwatch,
      Total: formatBRL(subtotal + orderData.frete), Endereço: orderData.endereco }).forEach(([k, v]) => body.append(k, v));
    await fetch(`https://formsubmit.co/ajax/${cfg.formsubmit.email}`, { method: 'POST', body, headers: { Accept: 'application/json' } });
    return { order: { ...orderData, orderId, total: subtotal + orderData.frete }, payment: { provider: 'static_pix', billingType: 'PIX' } };
  }

  function showPixUi() {
    if (els.pixUi) els.pixUi.hidden = false;
    if (els.cardUi) els.cardUi.hidden = true;
    els.paymentPanel?.classList.remove('mode-card');
    els.paymentPanel?.classList.add('mode-pix');
  }

  function showCardUi() {
    if (els.pixUi) els.pixUi.hidden = true;
    if (els.cardUi) els.cardUi.hidden = false;
    els.paymentPanel?.classList.remove('mode-pix');
    els.paymentPanel?.classList.add('mode-card');
  }

  function renderPix(orderId, total, payment) {
    showPixUi();
    els.pixQr.innerHTML = '';

    if (payment.pixQrEncoded) {
      const img = document.createElement('img');
      img.src = 'data:image/png;base64,' + payment.pixQrEncoded;
      img.width = 220; img.height = 220;
      els.pixQr.appendChild(img);
      els.pixCopy.value = payment.pixCopyPaste || '';
    } else {
      const payload = PixGenerator.generatePixPayload({
        key: cfg.pix.key, keyType: cfg.pix.keyType,
        merchantName: cfg.pix.merchantName, merchantCity: cfg.pix.merchantCity,
        amount: total, txid: orderId
      });
      new QRCode(els.pixQr, { text: payload, width: 220, height: 220, correctLevel: QRCode.CorrectLevel.M });
      els.pixCopy.value = payload;
    }
  }

  function showCardPayment(url) {
    showCardUi();
    els.pixQr.innerHTML = '';
    els.cardPayLink.href = url;
    els.confirmTitle.textContent = 'Pedido registrado — finalize o pagamento';
    els.confirmHint.textContent = 'Após pagar no Asaas, volte a esta página. A confirmação é automática.';
  }

  let lastPaymentMethod = 'PIX';

  function trackGa(event, params) {
    window.STF_ANALYTICS?.track(event, params);
  }

  function startPolling(orderId, accessToken, total) {
    const base = apiBase();
    if (!base || !accessToken) return;
    pollTimer = setInterval(async () => {
      try {
        const url = `${base}/orders/${encodeURIComponent(orderId)}?token=${encodeURIComponent(accessToken)}`;
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) return;
        const order = await res.json();
        if (order.status === 'paid') {
          clearInterval(pollTimer);
          els.paymentStatus.className = 'payment-status confirmed';
          els.paymentStatus.innerHTML = '<i class="fas fa-check-circle"></i> Pagamento confirmado! Você receberá a confirmação por e-mail em instantes.';
          els.confirmTitle.textContent = 'Pagamento confirmado!';
          window.STF_ANALYTICS?.trackPurchase(orderId, total || order.total, lastPaymentMethod);
        }
      } catch (e) { console.warn(e); }
    }, 3000);
  }

  async function processPayment() {
    els.btnPay.disabled = true;
    els.btnPay.textContent = 'Processando...';
    try {
      const orderData = collectOrderData();
      const wantsCard = orderData.pagamento === 'CARTAO';
      lastPaymentMethod = wantsCard ? 'credit_card' : 'pix';
      const result = await createOrder(orderData);
      const total = result.order?.total || (cartSubtotal() + orderData.frete);
      window.STF_CART?.clear();
      const orderId = result.order?.orderId;
      const accessToken = result.accessToken;
      const payment = result.payment || {};
      if (!orderId) throw new Error('Resposta inválida da API ao registrar pedido.');
      if (result.customerToken && window.STF_ACCOUNT) {
        const u = getCustomerUser() || { nome: orderData.nome, email: orderData.email };
        window.STF_ACCOUNT.setSession(result.customerToken, u);
        renderCheckoutAccountUI();
        window.STF_ACCOUNT.initNav();
      }

      els.pixAmount.textContent = formatBRL(total);
      els.orderId.textContent = orderId;
      els.paymentStatus.hidden = false;
      els.paymentStatus.className = 'payment-status waiting';

      if (wantsCard) {
        if (payment.billingType !== 'CREDIT_CARD' || !payment.invoiceUrl) {
          throw new Error(
            'Pagamento com cartão indisponível no momento. Escolha PIX ou tente mais tarde.'
          );
        }
        showCardPayment(payment.invoiceUrl);
        els.paymentStatus.innerHTML =
          '<i class="fas fa-spinner fa-spin"></i> Abra a janela do Asaas, pague com cartão e volte aqui — a confirmação é automática.';
        try { window.open(payment.invoiceUrl, '_blank', 'noopener,noreferrer'); } catch (_) { /* link visível no botão */ }
      } else {
        renderPix(orderId, total, payment);
        if (payment.autoConfirm) {
          els.paymentStatus.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Aguardando confirmação automática do PIX...';
        } else {
          const wa = (cfg.whatsapp || '5511913394665').replace(/\D/g, '');
          const waText = encodeURIComponent(`Olá! Paguei o PIX do pedido ${orderId} (${formatBRL(total)}). Segue o comprovante.`);
          els.paymentStatus.innerHTML =
            `<p><strong>Pedido ${orderId} registrado!</strong></p>` +
            `<p>O PIX é na conta da loja — a confirmação é manual (não automática).</p>` +
            `<p><a class="btn-whatsapp-proof" href="https://wa.me/${wa}?text=${waText}" target="_blank" rel="noopener">` +
            `<i class="fab fa-whatsapp"></i> Enviar comprovante no WhatsApp</a></p>` +
            `<p class="payment-hint-small">Esta página atualiza quando a loja confirmar o pagamento.</p>`;
        }
      }

      trackGa('pedido_criado', {
        pedido: orderId,
        valor: total,
        moeda: 'BRL',
        pagamento: lastPaymentMethod === 'credit_card' ? 'cartao' : 'pix'
      });

      if (accessToken) startPolling(orderId, accessToken, total);
      showStep(3);
    } catch (err) {
      alert(err.message || 'Erro ao processar pedido.');
    } finally {
      els.btnPay.disabled = false;
      els.btnPay.textContent = 'Finalizar pedido';
    }
  }

  function bindEvents() {
    els.paisCode.addEventListener('change', toggleAddressForm);
    els.cep?.addEventListener('input', (e) => { e.target.value = maskCep(e.target.value); });
    els.form.telefone?.addEventListener('input', (e) => { e.target.value = maskPhone(e.target.value); });
    els.form.cpf?.addEventListener('input', (e) => { if (!isInternational) e.target.value = maskCpf(e.target.value); });

    els.cep?.addEventListener('blur', async () => {
      if (isInternational) return;
      const cep = onlyDigits(els.cep.value);
      if (cep.length !== 8) return;
      try {
        const addr = await fetchCep(cep);
        els.form.rua.value = addr.logradouro || '';
        els.form.bairro.value = addr.bairro || '';
        els.form.cidade.value = addr.localidade || '';
        els.form.uf.value = addr.uf || '';
        await quoteShipping();
        els.form.numero.focus();
      } catch { els.shippingHint.textContent = 'CEP inválido.'; }
    });

    ['postal-intl','rua-intl','cidade-intl'].forEach((id) => {
      document.getElementById(id)?.addEventListener('blur', () => { if (isInternational) quoteShipping(); });
    });

    els.btnNext?.addEventListener('click', () => { if (validateStep1()) showStep(2); });
    els.btnBack?.addEventListener('click', () => showStep(1));
    els.btnPay?.addEventListener('click', processPayment);

    if (els.senhaWrap && els.criarConta) {
      els.senhaWrap.hidden = !els.criarConta.checked;
      els.criarConta.addEventListener('change', () => {
        els.senhaWrap.hidden = !els.criarConta.checked;
      });
    }

    document.getElementById('btn-copy-pix')?.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(els.pixCopy.value); }
      catch { els.pixCopy.select(); document.execCommand('copy'); }
    });
  }

  async function resumeOrderFromUrl() {
    const params = new URLSearchParams(location.search);
    const pedido = params.get('pedido');
    const token = params.get('token');
    if (!pedido || !token) return false;

    const base = apiBase();
    if (!base) return false;

    try {
      const res = await fetch(
        `${base}/orders/${encodeURIComponent(pedido)}?token=${encodeURIComponent(token)}`,
        { cache: 'no-store' }
      );
      if (!res.ok) return false;
      const data = await res.json();
      if (!data?.orderId) return false;

      els.orderId.textContent = data.orderId;
      els.pixAmount.textContent = formatBRL(data.total);
      els.paymentStatus.hidden = false;

      if (data.status === 'paid') {
        els.paymentStatus.className = 'payment-status confirmed';
        els.paymentStatus.innerHTML = '<i class="fas fa-check-circle"></i> Pagamento já confirmado! Você receberá os detalhes por e-mail.';
        els.confirmTitle.textContent = 'Pagamento confirmado!';
        showStep(3);
        history.replaceState({}, '', location.pathname);
        return true;
      }

      if (data.status !== 'pending_payment') return false;

      const payment = data.payment || {};
      lastPaymentMethod = payment.billingType === 'CREDIT_CARD' ? 'credit_card' : 'pix';

      if (payment.billingType === 'CREDIT_CARD' && payment.invoiceUrl) {
        showCardPayment(payment.invoiceUrl);
        els.paymentStatus.className = 'payment-status waiting';
        els.paymentStatus.innerHTML =
          '<i class="fas fa-spinner fa-spin"></i> Abra o link do cartão e volte aqui — a confirmação é automática.';
      } else {
        renderPix(data.orderId, data.total, payment);
        els.paymentStatus.className = 'payment-status waiting';
        els.paymentStatus.innerHTML = payment.autoConfirm
          ? '<i class="fas fa-spinner fa-spin"></i> Aguardando confirmação automática do PIX...'
          : '<p>Escaneie o QR Code ou copie o PIX abaixo. Esta página atualiza quando o pagamento for confirmado.</p>';
      }

      startPolling(data.orderId, token, data.total);
      showStep(3);
      history.replaceState({}, '', location.pathname);
      return true;
    } catch (e) {
      console.warn('Retomar pedido:', e);
      return false;
    }
  }

  async function boot() {
    cfg = await StoreConfig.load();
    products = cfg.products?.length ? cfg.products : (cfg.product ? [cfg.product] : []);
    populateSelects();
    window.STF_CART?.initBadges();
    const resumed = await resumeOrderFromUrl();
    if (!resumed) {
      seedCartFromUrl();
      if (window.STF_CART?.isEmpty()) {
        window.location.replace('loja.html');
        return;
      }
      renderCartSidebar();
      updateSummary();
      showStep(1);
    }
    await loadCustomerSession();
    window.addEventListener('stf-account-changed', () => renderCheckoutAccountUI());
    bindEvents();
    trackGa('entrou_loja', {
      valor_produto: cartSubtotal() || cfg.product?.price || 59.9,
      moeda: 'BRL'
    });
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
