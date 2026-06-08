(function () {
  let cfg, product, shippingCost = null, shippingInfo = null, pollTimer = null, isInternational = false;

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
    confirmTitle: document.getElementById('confirm-title'),
    confirmHint: document.getElementById('confirm-hint')
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

  function populateSelects() {
    const models = cfg.smartwatchModels || [];
    models.forEach((m) => {
      const o = document.createElement('option');
      o.value = m; o.textContent = m;
      els.smartwatchSelect.appendChild(o);
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
    const o = parseInt(onlyDigits(cfg.shipping?.originCep).slice(0,5),10)||0;
    const d = parseInt(onlyDigits(destCep).slice(0,5),10)||0;
    const diff = Math.abs(o-d);
    if (diff < 800) return { price: 11.9, days: 8, service: 'Mini Envios', source: 'estimate' };
    if (diff < 3000) return { price: 15.9, days: 10, service: 'Mini Envios', source: 'estimate' };
    if (diff < 8000) return { price: 19.9, days: 12, service: 'Mini Envios', source: 'estimate' };
    return { price: 24.9, days: 14, service: 'Mini Envios', source: 'estimate' };
  }

  async function quoteShipping() {
    const base = apiBase();
    try {
      if (isInternational) {
        const code = els.paisCode.value;
        if (base) {
          const res = await fetch(`${base}/shipping/quote?country=${code}`, { cache: 'no-store' });
          if (res.ok) { shippingInfo = await res.json(); shippingCost = shippingInfo.price; }
        }
        if (!shippingCost) {
          const z = cfg.internationalShipping[code] || cfg.internationalShipping.OTHER;
          shippingInfo = { price: z.price, days: z.days, service: 'Internacional — ' + z.label, source: 'config' };
          shippingCost = z.price;
        }
      } else {
        const cep = onlyDigits(els.cep.value);
        if (cep.length !== 8) return;
        if (base) {
          const res = await fetch(`${base}/shipping/quote?country=BR&cep=${cep}`, { cache: 'no-store' });
          if (res.ok) { shippingInfo = await res.json(); shippingCost = shippingInfo.price; }
        }
        if (!shippingCost) shippingInfo = estimateBR(cep), shippingCost = shippingInfo.price;
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
    els.summaryProduct.textContent = formatBRL(product.price);
    els.summaryShipping.textContent = shippingCost === null ? '—' : formatBRL(shippingCost);
    els.summaryTotal.textContent = shippingCost === null ? '—' : formatBRL(product.price + shippingCost);
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

    return {
      orderId: generateOrderId(),
      nome: f.nome.value.trim(), email: f.email.value.trim(),
      telefone: f.telefone.value.trim(), cpf: f.cpf.value.trim(),
      smartwatch: f.smartwatch.value,
      pais: paisLabel, paisCode,
      ...data, endereco,
      frete: shippingCost,
      shippingService: shippingInfo?.service,
      shippingDays: shippingInfo?.days,
      pagamento: f.querySelector('[name=pagamento]:checked').value
    };
  }

  function validateStep1() {
    const f = els.form;
    if (!f.nome.value || !f.email.value || !f.telefone.value || !f.cpf.value || !f.smartwatch.value) {
      alert('Preencha todos os campos obrigatórios.'); return false;
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
      const res = await fetch(base + '/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erro ao registrar pedido.');
      }
      return res.json();
    }

    const body = new FormData();
    body.append('_subject', cfg.formsubmit.subject);
    body.append('_captcha', 'false');
    body.append('_template', 'table');
    Object.entries({ Pedido: orderData.orderId, Nome: orderData.nome, Smartwatch: orderData.smartwatch,
      Total: formatBRL(product.price + orderData.frete), Endereço: orderData.endereco }).forEach(([k,v]) => body.append(k,v));
    await fetch(`https://formsubmit.co/ajax/${cfg.formsubmit.email}`, { method: 'POST', body, headers: { Accept: 'application/json' } });
    return { order: { ...orderData, total: product.price + orderData.frete }, payment: { provider: 'static_pix', billingType: 'PIX' } };
  }

  function renderPix(orderId, total, payment) {
    els.pixQr.innerHTML = '';
    els.pixCopyArea.hidden = false;
    els.cardPayLink.hidden = true;

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
    els.pixQr.innerHTML = '';
    els.pixCopyArea.hidden = true;
    els.cardPayLink.hidden = false;
    els.cardPayLink.href = url;
    els.confirmTitle.textContent = 'Pedido registrado — finalize o pagamento';
    els.confirmHint.textContent = 'Clique no botão abaixo para pagar com cartão de forma segura.';
  }

  function startPolling(orderId) {
    const base = apiBase();
    if (!base) return;
    pollTimer = setInterval(async () => {
      try {
        const res = await fetch(`${base}/orders/${orderId}`, { cache: 'no-store' });
        if (!res.ok) return;
        const order = await res.json();
        if (order.status === 'paid') {
          clearInterval(pollTimer);
          els.paymentStatus.className = 'payment-status confirmed';
          els.paymentStatus.innerHTML = '<i class="fas fa-check-circle"></i> Pagamento confirmado! Você receberá WhatsApp em instantes.';
          els.confirmTitle.textContent = 'Pagamento confirmado!';
        }
      } catch (e) { console.warn(e); }
    }, 3000);
  }

  async function processPayment() {
    els.btnPay.disabled = true;
    els.btnPay.textContent = 'Processando...';
    try {
      const orderData = collectOrderData();
      const result = await createOrder(orderData);
      const total = result.order?.total || (product.price + orderData.frete);
      const orderId = result.order?.orderId || orderData.orderId;
      const payment = result.payment || {};

      els.pixAmount.textContent = formatBRL(total);
      els.orderId.textContent = orderId;
      els.paymentStatus.hidden = false;
      els.paymentStatus.className = 'payment-status waiting';
      els.paymentStatus.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Aguardando confirmação automática...';

      if (payment.billingType === 'CREDIT_CARD' && payment.invoiceUrl) {
        showCardPayment(payment.invoiceUrl);
      } else {
        renderPix(orderId, total, payment);
      }

      startPolling(orderId);
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

    document.getElementById('btn-copy-pix')?.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(els.pixCopy.value); }
      catch { els.pixCopy.select(); document.execCommand('copy'); }
    });
  }

  async function boot() {
    cfg = await StoreConfig.load();
    product = cfg.product;
    populateSelects();
    updateSummary();
    bindEvents();
    showStep(1);
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
