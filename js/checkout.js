(function () {
  const cfg = window.CHECKOUT_CONFIG;
  const product = cfg.product;

  const els = {
    form: document.getElementById('checkout-form'),
    steps: document.querySelectorAll('.checkout-step'),
    indicators: document.querySelectorAll('.step-indicator'),
    btnNext: document.getElementById('btn-next'),
    btnBack: document.getElementById('btn-back'),
    btnPay: document.getElementById('btn-pay'),
    cep: document.getElementById('cep'),
    paymentPix: document.getElementById('pay-pix'),
    paymentMp: document.getElementById('pay-mercadopago'),
    summaryProduct: document.getElementById('summary-product'),
    summaryShipping: document.getElementById('summary-shipping'),
    summaryTotal: document.getElementById('summary-total'),
    pixPanel: document.getElementById('pix-panel'),
    pixQr: document.getElementById('pix-qr'),
    pixCopy: document.getElementById('pix-copy'),
    pixAmount: document.getElementById('pix-amount'),
    orderId: document.getElementById('order-id'),
    statusBanner: document.getElementById('status-banner')
  };

  let currentStep = 1;
  let orderData = null;

  function formatBRL(value) {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function getTotal() {
    return product.price + product.shipping;
  }

  function generateOrderId() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `STF-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${rand}`;
  }

  function onlyDigits(str) {
    return (str || '').replace(/\D/g, '');
  }

  function maskCep(value) {
    const d = onlyDigits(value).slice(0, 8);
    return d.length > 5 ? d.slice(0, 5) + '-' + d.slice(5) : d;
  }

  function maskPhone(value) {
    const d = onlyDigits(value).slice(0, 11);
    if (d.length <= 10) {
      return d.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').trim();
    }
    return d.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').trim();
  }

  function maskCpf(value) {
    const d = onlyDigits(value).slice(0, 11);
    return d
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }

  function updateSummary() {
    const total = getTotal();
    if (els.summaryProduct) els.summaryProduct.textContent = formatBRL(product.price);
    if (els.summaryShipping) {
      els.summaryShipping.textContent = product.shipping === 0 ? 'Grátis (Correios)' : formatBRL(product.shipping);
    }
    if (els.summaryTotal) els.summaryTotal.textContent = formatBRL(total);
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
    const cpf = onlyDigits(els.form.cpf.value);
    if (cpf.length !== 11) {
      els.form.cpf.classList.add('invalid');
      valid = false;
    }
    const cep = onlyDigits(els.form.cep.value);
    if (cep.length !== 8) {
      els.form.cep.classList.add('invalid');
      valid = false;
    }
    if (!valid) {
      alert('Preencha todos os campos obrigatórios para envio pelos Correios.');
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

  function collectOrderData() {
    const f = els.form;
    return {
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
      produto: product.name,
      valorProduto: product.price,
      frete: product.shipping,
      total: getTotal(),
      pagamento: els.paymentMp?.checked ? 'Mercado Pago' : 'PIX'
    };
  }

  function buildAddressText(data) {
    const comp = data.complemento ? `, ${data.complemento}` : '';
    return `${data.rua}, ${data.numero}${comp} — ${data.bairro}, ${data.cidade}/${data.uf} — CEP ${data.cep}`;
  }

  async function notifySeller(data) {
    const body = new FormData();
    body.append('_subject', cfg.formsubmit.subject);
    body.append('_captcha', 'false');
    body.append('_template', 'table');
    body.append('Pedido', data.orderId);
    body.append('Nome', data.nome);
    body.append('E-mail', data.email);
    body.append('Telefone', data.telefone);
    body.append('CPF', data.cpf);
    body.append('Smartwatch', data.smartwatch);
    body.append('Endereço Correios', buildAddressText(data));
    body.append('Produto', data.produto);
    body.append('Valor produto', formatBRL(data.valorProduto));
    body.append('Frete', formatBRL(data.frete));
    body.append('Total', formatBRL(data.total));
    body.append('Pagamento', data.pagamento);

    await fetch(`https://formsubmit.co/ajax/${cfg.formsubmit.email}`, {
      method: 'POST',
      body: body,
      headers: { Accept: 'application/json' }
    });
  }

  function renderPixQr(data) {
    const payload = PixGenerator.generatePixPayload({
      key: cfg.pix.key,
      merchantName: cfg.pix.merchantName,
      merchantCity: cfg.pix.merchantCity,
      amount: data.total,
      txid: data.orderId
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
    els.pixAmount.textContent = formatBRL(data.total);
    els.orderId.textContent = data.orderId;
  }

  async function payWithMercadoPago(data) {
    if (!cfg.mercadoPago.apiUrl) {
      throw new Error('Mercado Pago ainda não configurado. Use PIX ou configure o Worker.');
    }

    const res = await fetch(cfg.mercadoPago.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: data.orderId,
        title: product.name,
        description: product.description,
        price: data.total,
        quantity: 1,
        payer: {
          name: data.nome,
          email: data.email,
          phone: onlyDigits(data.telefone),
          cpf: onlyDigits(data.cpf)
        },
        shipping: {
          zip_code: onlyDigits(data.cep),
          street_name: data.rua,
          street_number: data.numero,
          city: data.cidade,
          state: data.uf
        },
        backUrls: {
          success: cfg.mercadoPago.successUrl + '&pedido=' + data.orderId,
          pending: cfg.mercadoPago.pendingUrl + '&pedido=' + data.orderId,
          failure: cfg.mercadoPago.failureUrl + '&pedido=' + data.orderId
        }
      })
    });

    if (!res.ok) throw new Error('Erro ao criar pagamento no Mercado Pago');
    const result = await res.json();
    if (!result.init_point) throw new Error('Resposta inválida do Mercado Pago');
    window.location.href = result.init_point;
  }

  function buildWhatsAppLink(data) {
    const msg = encodeURIComponent(
      `Olá! Acabei de fazer o pedido ${data.orderId} no site.\n` +
        `Produto: ${data.produto}\n` +
        `Total: ${formatBRL(data.total)}\n` +
        `Pagamento: ${data.pagamento}\n` +
        `Endereço: ${buildAddressText(data)}`
    );
    return `https://wa.me/${cfg.whatsapp}?text=${msg}`;
  }

  async function processPayment() {
    els.btnPay.disabled = true;
    els.btnPay.textContent = 'Processando...';

    try {
      orderData = collectOrderData();
      await notifySeller(orderData);

      if (els.paymentMp?.checked) {
        await payWithMercadoPago(orderData);
        return;
      }

      renderPixQr(orderData);
      const waLink = document.getElementById('whatsapp-confirm');
      if (waLink) waLink.href = buildWhatsAppLink(orderData);
      showStep(3);
    } catch (err) {
      alert(err.message || 'Não foi possível processar o pedido. Tente novamente ou chame no WhatsApp.');
    } finally {
      els.btnPay.disabled = false;
      els.btnPay.textContent = 'Finalizar pedido';
    }
  }

  function showReturnStatus() {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    const pedido = params.get('pedido');
    if (!status || !els.statusBanner) return;

    const messages = {
      aprovado: { type: 'success', text: `Pagamento aprovado! Pedido ${pedido || ''} — em breve você recebe o código de rastreio dos Correios.` },
      pendente: { type: 'warning', text: `Pagamento pendente. Pedido ${pedido || ''} — assim que confirmar, enviamos seu kit.` },
      recusado: { type: 'error', text: 'Pagamento não concluído. Tente novamente ou escolha PIX.' }
    };
    const msg = messages[status];
    if (msg) {
      els.statusBanner.className = `status-banner ${msg.type}`;
      els.statusBanner.textContent = msg.text;
      els.statusBanner.hidden = false;
    }
  }

  function initMpOption() {
    if (!cfg.mercadoPago.apiUrl && els.paymentMp) {
      els.paymentMp.disabled = true;
      const label = els.paymentMp.closest('label');
      if (label) {
        label.classList.add('disabled');
        const hint = document.createElement('small');
        hint.textContent = ' (configure o Worker para ativar)';
        label.appendChild(hint);
      }
      if (els.paymentPix) els.paymentPix.checked = true;
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
        const data = await fetchCep(cep);
        els.form.rua.value = data.logradouro || '';
        els.form.bairro.value = data.bairro || '';
        els.form.cidade.value = data.localidade || '';
        els.form.uf.value = data.uf || '';
        els.form.numero.focus();
      } catch {
        els.cep.classList.add('invalid');
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

  document.addEventListener('DOMContentLoaded', () => {
    updateSummary();
    initMpOption();
    showReturnStatus();
    bindEvents();
    showStep(1);
  });
})();
