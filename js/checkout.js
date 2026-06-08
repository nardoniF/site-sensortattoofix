(function () {
  let cfg;
  let product;
  let shippingCost = null;
  let shippingInfo = null;
  let pollTimer = null;

  const els = {
    form: document.getElementById('checkout-form'),
    steps: document.querySelectorAll('.checkout-step'),
    indicators: document.querySelectorAll('.step-indicator'),
    btnNext: document.getElementById('btn-next'),
    btnBack: document.getElementById('btn-back'),
    btnPay: document.getElementById('btn-pay'),
    cep: document.getElementById('cep'),
    summaryProduct: document.getElementById('summary-product'),
    summaryShipping: document.getElementById('summary-shipping'),
    summaryTotal: document.getElementById('summary-total'),
    shippingHint: document.getElementById('shipping-hint'),
    pixPanel: document.getElementById('pix-panel'),
    pixQr: document.getElementById('pix-qr'),
    pixCopy: document.getElementById('pix-copy'),
    pixAmount: document.getElementById('pix-amount'),
    orderId: document.getElementById('order-id'),
    statusBanner: document.getElementById('status-banner'),
    paymentStatus: document.getElementById('payment-status')
  };

  let currentStep = 1;

  function apiBase() {
    const bootstrap = window.CONFIG_BOOTSTRAP || {};
    return ((cfg?.api?.baseUrl) || bootstrap.configApiUrl || '').replace(/\/$/, '');
  }

  function formatBRL(value) {
    return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function getTotal() {
    return (product?.price || 0) + (shippingCost || 0);
  }

  function onlyDigits(str) {
    return (str || '').replace(/\D/g, '');
  }

  function generateOrderId() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `STF-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${rand}`;
  }

  function maskCep(value) {
    const d = onlyDigits(value).slice(0, 8);
    return d.length > 5 ? d.slice(0, 5) + '-' + d.slice(5) : d;
  }

  function maskPhone(value) {
    const d = onlyDigits(value).slice(0, 11);
    if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').trim();
    return d.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').trim();
  }

  function maskCpf(value) {
    const d = onlyDigits(value).slice(0, 11);
    return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }

  function estimateShippingLocal(destCep) {
    const origin = onlyDigits(cfg.shipping?.originCep || '01153000');
    const dest = onlyDigits(destCep);
    const o = parseInt(origin.slice(0, 5), 10) || 0;
    const d = parseInt(dest.slice(0, 5), 10) || 0;
    const diff = Math.abs(o - d);
    let price = 24.9;
    let days = 14;
    if (diff < 800) { price = 11.9; days = 8; }
    else if (diff < 3000) { price = 15.9; days = 10; }
    else if (diff < 8000) { price = 19.9; days = 12; }
    return { price, days, service: cfg.shipping?.serviceName || 'Mini Envios', source: 'estimate' };
  }

  function updateSummary() {
    if (els.summaryProduct) els.summaryProduct.textContent = formatBRL(product.price);
    if (els.summaryShipping) {
      if (shippingCost === null) {
        els.summaryShipping.textContent = 'Informe o CEP';
      } else {
        const days = shippingInfo?.days ? ` · ${shippingInfo.days} dias úteis` : '';
        els.summaryShipping.textContent = formatBRL(shippingCost) + days;
      }
    }
    if (els.summaryTotal) {
      els.summaryTotal.textContent = shippingCost === null ? '—' : formatBRL(getTotal());
    }
  }

  async function fetchShippingQuote(cep) {
    const base = apiBase();
    if (base) {
      try {
        const res = await fetch(`${base}/shipping/quote?cep=${onlyDigits(cep)}`, { cache: 'no-store' });
        if (res.ok) return await res.json();
      } catch (e) {
        console.warn(e);
      }
    }
    return estimateShippingLocal(cep);
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function validateStep1() {
    const required = ['nome', 'email', 'telefone', 'cpf', 'cep', 'rua', 'numero', 'bairro', 'cidade', 'uf'];
    let valid = true;
    required.forEach((name) => {
      const input = els.form.querySelector(`[name="${name}"]`);
      if (!input || !input.value.trim()) {
        input?.classList.add('invalid');
        valid = false;
      } else {
        input.classList.remove('invalid');
      }
    });
    if (onlyDigits(els.form.cpf.value).length !== 11) {
      els.form.cpf.classList.add('invalid');
      valid = false;
    }
    if (onlyDigits(els.form.cep.value).length !== 8) {
      els.form.cep.classList.add('invalid');
      valid = false;
    }
    if (shippingCost === null) {
      alert('Aguarde o cálculo do frete Mini Envios ou informe um CEP válido.');
      valid = false;
    }
    if (!valid && shippingCost !== null) {
      alert('Preencha todos os campos obrigatórios.');
    }
    return valid;
  }

  async function fetchCep(cep) {
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    if (!res.ok) throw new Error('CEP não encontrado');
    const data = await res.json();
    if (data.erro) throw new Error('CEP não encontrado');
    return data;
  }

  function buildAddressText(data) {
    const comp = data.complemento ? `, ${data.complemento}` : '';
    return `${data.rua}, ${data.numero}${comp} — ${data.bairro}, ${data.cidade}/${data.uf} — CEP ${data.cep}`;
  }

  function collectOrderData() {
    const f = els.form;
    const data = {
      orderId: generateOrderId(),
      nome: f.nome.value.trim(),
      email: f.email.value.trim(),
      telefone: f.telefone.value.trim(),
      cpf: f.cpf.value.trim(),
      smartwatch: f.smartwatch?.value.trim() || 'Não informado',
      cep: f.cep.value.trim(),
      rua: f.rua.value.trim(),
      numero: f.numero.value.trim(),
      complemento: f.complemento.value.trim(),
      bairro: f.bairro.value.trim(),
      cidade: f.cidade.value.trim(),
      uf: f.uf.value.trim().toUpperCase(),
      frete: shippingCost,
      shippingService: shippingInfo?.service,
      shippingDays: shippingInfo?.days
    };
    data.endereco = buildAddressText(data);
    return data;
  }

  function renderStaticPix(orderId, total) {
    const payload = PixGenerator.generatePixPayload({
      key: cfg.pix.key,
      keyType: cfg.pix.keyType,
      merchantName: cfg.pix.merchantName,
      merchantCity: cfg.pix.merchantCity,
      amount: total,
      txid: orderId
    });

    els.pixQr.innerHTML = '';
    new QRCode(els.pixQr, {
      text: payload,
      width: 220,
      height: 220,
      colorDark: '#000000',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M
    });
    els.pixCopy.value = payload;
  }

  function renderAsaasPix(pix) {
    els.pixQr.innerHTML = '';
    if (pix.pixQrEncoded) {
      const img = document.createElement('img');
      img.src = 'data:image/png;base64,' + pix.pixQrEncoded;
      img.alt = 'QR Code PIX';
      img.width = 220;
      img.height = 220;
      els.pixQr.appendChild(img);
    }
    els.pixCopy.value = pix.pixCopyPaste || '';
  }

  function showPaymentWaiting(autoConfirm) {
    if (!els.paymentStatus) return;
    els.paymentStatus.hidden = false;
    els.paymentStatus.className = 'payment-status waiting';
    els.paymentStatus.innerHTML = autoConfirm
      ? '<i class="fas fa-spinner fa-spin"></i> Aguardando confirmação automática do PIX...'
      : '<i class="fas fa-clock"></i> Após pagar, a confirmação pode levar alguns instantes.';
  }

  function showPaymentConfirmed() {
    if (pollTimer) clearInterval(pollTimer);
    if (els.paymentStatus) {
      els.paymentStatus.className = 'payment-status confirmed';
      els.paymentStatus.innerHTML = '<i class="fas fa-check-circle"></i> Pagamento confirmado! Em breve enviamos seu rastreio.';
    }
    const icon = document.querySelector('.pix-success-icon i');
    if (icon) icon.className = 'fas fa-check-circle';
  }

  function startPaymentPolling(orderId) {
    const base = apiBase();
    if (!base) return;
    pollTimer = setInterval(async () => {
      try {
        const res = await fetch(`${base}/orders/${orderId}`, { cache: 'no-store' });
        if (!res.ok) return;
        const order = await res.json();
        if (order.status === 'paid') showPaymentConfirmed();
      } catch (e) {
        console.warn(e);
      }
    }, 3000);
  }

  async function createOrder(orderData) {
    const base = apiBase();
    if (base) {
      const res = await fetch(base + '/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erro ao registrar pedido.');
      }
      return await res.json();
    }

    const body = new FormData();
    body.append('_subject', cfg.formsubmit.subject);
    body.append('_captcha', 'false');
    body.append('_template', 'table');
    Object.entries({
      Pedido: orderData.orderId,
      Nome: orderData.nome,
      'E-mail': orderData.email,
      Telefone: orderData.telefone,
      CPF: orderData.cpf,
      Endereço: orderData.endereco,
      Frete: formatBRL(orderData.frete),
      Total: formatBRL(product.price + orderData.frete)
    }).forEach(([k, v]) => body.append(k, v));

    await fetch(`https://formsubmit.co/ajax/${cfg.formsubmit.email}`, {
      method: 'POST',
      body,
      headers: { Accept: 'application/json' }
    });

    return { order: { ...orderData, total: product.price + orderData.frete }, pix: { provider: 'static', autoConfirm: false } };
  }

  async function processPayment() {
    els.btnPay.disabled = true;
    els.btnPay.textContent = 'Processando...';

    try {
      const orderData = collectOrderData();
      const result = await createOrder(orderData);
      const total = result.order?.total || getTotal();
      const orderId = result.order?.orderId || orderData.orderId;

      els.pixAmount.textContent = formatBRL(total);
      els.orderId.textContent = orderId;

      if (result.pix?.provider === 'asaas') {
        renderAsaasPix(result.pix);
        showPaymentWaiting(true);
        startPaymentPolling(orderId);
      } else {
        renderStaticPix(orderId, total);
        showPaymentWaiting(false);
        if (apiBase()) startPaymentPolling(orderId);
      }

      showStep(3);
    } catch (err) {
      alert(err.message || 'Não foi possível processar o pedido.');
    } finally {
      els.btnPay.disabled = false;
      els.btnPay.textContent = 'Gerar PIX e finalizar';
    }
  }

  function bindEvents() {
    els.cep?.addEventListener('input', (e) => {
      e.target.value = maskCep(e.target.value);
    });
    els.form.telefone?.addEventListener('input', (e) => {
      e.target.value = maskPhone(e.target.value);
    });
    els.form.cpf?.addEventListener('input', (e) => {
      e.target.value = maskCpf(e.target.value);
    });

    els.cep?.addEventListener('blur', async () => {
      const cep = onlyDigits(els.cep.value);
      if (cep.length !== 8) return;

      try {
        els.cep.classList.add('loading');
        if (els.shippingHint) els.shippingHint.textContent = 'Calculando Mini Envios...';

        const [address, quote] = await Promise.all([
          fetchCep(cep),
          fetchShippingQuote(cep)
        ]);

        els.form.rua.value = address.logradouro || '';
        els.form.bairro.value = address.bairro || '';
        els.form.cidade.value = address.localidade || '';
        els.form.uf.value = address.uf || '';

        shippingCost = quote.price;
        shippingInfo = quote;
        updateSummary();

        const src = quote.source === 'correios' ? 'Correios' : 'estimativa';
        if (els.shippingHint) {
          els.shippingHint.textContent = `${quote.service}: ${formatBRL(quote.price)} (${quote.days} dias úteis · ${src})`;
        }
        els.form.numero.focus();
      } catch {
        els.cep.classList.add('invalid');
        shippingCost = null;
        if (els.shippingHint) els.shippingHint.textContent = 'CEP inválido ou frete indisponível.';
      } finally {
        els.cep.classList.remove('loading');
      }
    });

    els.btnNext?.addEventListener('click', () => {
      if (validateStep1()) showStep(2);
    });
    els.btnBack?.addEventListener('click', () => showStep(1));
    els.btnPay?.addEventListener('click', processPayment);

    document.getElementById('btn-copy-pix')?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(els.pixCopy.value);
        const btn = document.getElementById('btn-copy-pix');
        const orig = btn.textContent;
        btn.textContent = 'Copiado!';
        setTimeout(() => { btn.textContent = orig; }, 2000);
      } catch {
        els.pixCopy.select();
        document.execCommand('copy');
      }
    });
  }

  async function boot() {
    try {
      cfg = await StoreConfig.load();
      product = cfg.product;
      product.shipping = 0;
      updateSummary();
      bindEvents();
      showStep(1);
    } catch (err) {
      console.error(err);
      alert('Erro ao carregar a loja. Recarregue a página.');
    }
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
