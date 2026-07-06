window.STF_ORDER_LABEL = (function () {
  const FALLBACK_SENDER = {
    brand: 'Sensor Tattoo Fix',
    company: '3N20 Soluções Tecnológicas LTDA',
    cnpj: '29.321.223/0001-32',
    street: 'Rua Engenheiro Roberto Dabus Buazar, 56',
    district: 'Imirim',
    city: 'São Paulo/SP',
    country: 'Brasil',
    cep: '02537-190',
    service: 'Mini Envios'
  };

  let activeSender = null;

  function esc(text) {
    return String(text ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatCep(cep) {
    const d = String(cep || '').replace(/\D/g, '');
    if (d.length !== 8) return cep || '';
    return `${d.slice(0, 5)}-${d.slice(5)}`;
  }

  function senderFromShipping(shipping) {
    if (!shipping) return { ...FALLBACK_SENDER };
    const s = shipping.sender || {};
    const streetParts = [s.rua, s.numero].filter(Boolean);
    if (s.complemento) streetParts.push(s.complemento);
    const street = streetParts.join(', ');
    const city = [s.cidade, s.uf].filter(Boolean).join('/');
    return {
      brand: s.brand || FALLBACK_SENDER.brand,
      company: s.company || FALLBACK_SENDER.company,
      cnpj: s.cnpj || FALLBACK_SENDER.cnpj,
      street: street || FALLBACK_SENDER.street,
      district: s.bairro || FALLBACK_SENDER.district,
      city: city || FALLBACK_SENDER.city,
      country: s.pais || FALLBACK_SENDER.country,
      cep: formatCep(shipping.originCep) || FALLBACK_SENDER.cep,
      service: shipping.serviceName || FALLBACK_SENDER.service
    };
  }

  function getSender() {
    return activeSender || { ...FALLBACK_SENDER };
  }

  function configure(shipping) {
    activeSender = senderFromShipping(shipping);
  }

  function destAddressLines(order) {
    if (order.rua || order.cep) {
      const street = [order.rua, order.numero].filter(Boolean).join(', ');
      const lines = [];
      if (street) lines.push(street);
      if (order.complemento) lines.push(order.complemento);
      const district = [order.bairro, order.cidade, order.uf].filter(Boolean).join(' — ');
      if (district) lines.push(district);
      if (order.pais) lines.push(order.pais);
      if (order.cep) lines.push('CEP ' + formatCep(order.cep));
      return lines;
    }
    return String(order.endereco || '—').split(/\s*[—–-]\s*|\n/).map((l) => l.trim()).filter(Boolean);
  }

  function destAddress(order) {
    const lines = destAddressLines(order);
    return lines.length ? lines.join('\n') : '—';
  }

  function formatBRL(value) {
    return 'R$ ' + Number(value || 0).toFixed(2).replace('.', ',');
  }

  function shippingKind(order) {
    const provider = String(order.shippingProvider || '').toLowerCase();
    const service = String(order.shippingService || '').toLowerCase();
    if (provider === 'motoboy' || service.includes('motoboy') || service.includes('particular')) return 'motoboy';
    if (provider === 'uber' || service.includes('uber')) return 'uber';
    return 'correios';
  }

  function shippingLabel(order) {
    if (order.shippingService) return order.shippingService;
    const kind = shippingKind(order);
    if (kind === 'motoboy') return 'Envio particular (motoboy)';
    if (kind === 'uber') return 'Uber Direct';
    return getSender().service;
  }

  function declarationTotals(order) {
    let totalWeight = 0;
    let totalValue = Number(order.valorProduto) || 0;
    if (Array.isArray(order.items) && order.items.length) {
      totalWeight = order.items.reduce((sum, item) => {
        const qty = Math.max(1, Number(item.qty) || 1);
        const unitWeight = Math.max(1, Math.round(Number(item.weightGrams) || 3));
        return sum + unitWeight * qty;
      }, 0);
      totalValue = order.items.reduce((sum, item) => {
        const qty = Math.max(1, Number(item.qty) || 1);
        return sum + (Number(item.price) || 0) * qty;
      }, 0);
    } else {
      totalWeight = Math.max(3, Math.round(totalWeight) || 3);
    }
    return { totalWeight, totalValue };
  }

  /** DACE resumida — estilo Mercado Livre: remetente, destinatário, totais, texto legal. Sem lista de itens. */
  function daceResumidaHtml(order, SENDER) {
    const { totalWeight, totalValue } = declarationTotals(order);
    const created = order.createdAt
      ? new Date(order.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
      : new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    const destLines = destAddressLines(order);

    return `
    <div class="label label-dace page-break">
      <div class="dace-head">
        <div class="dace-title">Declaração auxiliar de conteúdo</div>
        <div class="dace-sub">DACE resumida · Transporte pelos Correios</div>
      </div>
      <div class="dace-meta">
        <span><strong>Pedido:</strong> ${esc(order.orderId)}</span>
        <span><strong>Emissão:</strong> ${esc(created)}</span>
      </div>

      <div class="dace-party">
        <div class="block-title">Remetente</div>
        <strong>${esc(SENDER.company)}</strong><br>
        CNPJ ${esc(SENDER.cnpj)}<br>
        ${esc(SENDER.street)}<br>
        ${esc(SENDER.district)}, ${esc(SENDER.city)}<br>
        CEP ${esc(SENDER.cep)}
      </div>

      <div class="dace-party">
        <div class="block-title">Destinatário</div>
        <strong>${esc(order.nome)}</strong><br>
        ${destLines.map((l) => esc(l)).join('<br>')}
      </div>

      <div class="dace-summary">
        <div><strong>Natureza:</strong> Mercadoria (e-commerce)</div>
        <div><strong>Peso total:</strong> ${totalWeight} g</div>
        <div><strong>Valor declarado:</strong> ${esc(formatBRL(totalValue))}</div>
        <div><strong>Modalidade:</strong> ${esc(shippingLabel(order))}</div>
      </div>

      <p class="dace-legal">
        Declaro, para fins de fiscalização e postagem, que as informações acima são verdadeiras,
        que o conteúdo não é restrito ou proibido pelos Correios e que a mercadoria foi adquirida
        por meio eletrônico (loja oficial Sensor Tattoo Fix). O destinatário é o comprador indicado.
        Documento auxiliar — não substitui Nota Fiscal quando exigida por lei.
      </p>

      <div class="dace-foot">${esc(order.orderId)} · sensortattoofix.com.br</div>
    </div>`;
  }

  function privateCourierBlockHtml(order) {
    const kind = shippingKind(order);
    const title = kind === 'uber' ? 'Entrega Uber Direct' : 'Entrega particular (motoboy)';
    const tel = String(order.telefone || '').trim();
    return `
    <div class="block private-courier-block">
      <div class="block-title">${title}</div>
      <p class="private-courier-lead">Pedido <strong>${esc(order.orderId)}</strong></p>
      <p>Entregar <strong>somente</strong> a ${esc(order.nome)}.</p>
      ${tel ? `<p>Tel. destinatário: ${esc(tel)}</p>` : ''}
      <p class="private-courier-note">Sem declaração de conteúdo — envio direto, não é Correios.</p>
    </div>`;
  }

  function footerNote(order) {
    const kind = shippingKind(order);
    const service = shippingLabel(order);
    if (kind === 'motoboy') return `Envio particular · ${esc(service)} · sensortattoofix.com.br`;
    if (kind === 'uber') return `Uber Direct · sensortattoofix.com.br`;
    return `Correios · ${esc(service)} · sensortattoofix.com.br`;
  }

  function labelStyles() {
    return `
    @page { size: 102mm 152mm; margin: 0; }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      font-family: Arial, Helvetica, sans-serif;
      color: #000;
      background: #fff;
    }
    .label {
      width: 102mm;
      height: 152mm;
      padding: 3mm 4mm;
      display: flex;
      flex-direction: column;
      gap: 2mm;
      font-size: 8.5pt;
      line-height: 1.2;
      page-break-after: always;
    }
    .label:last-child { page-break-after: auto; }
    .page-break { break-before: page; page-break-before: always; }
    .brand {
      text-align: center;
      font-weight: 900;
      font-size: 11pt;
      letter-spacing: 0.04em;
      border-bottom: 1px solid #000;
      padding-bottom: 2mm;
    }
    .block { border: 1px solid #000; padding: 2mm; }
    .block-sender { font-size: 7.5pt; line-height: 1.15; }
    .block-title {
      font-size: 7pt;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-bottom: 1.5mm;
    }
    .dest-name {
      font-size: 11pt;
      font-weight: 800;
      margin-bottom: 1mm;
      word-break: break-word;
    }
    .private-courier-block { font-size: 8pt; line-height: 1.25; }
    .private-courier-lead { margin: 0 0 1mm; }
    .private-courier-note { margin: 1.5mm 0 0; font-size: 6.5pt; color: #333; }
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2mm;
      font-size: 8pt;
    }
    .meta-grid strong { display: block; font-size: 7pt; text-transform: uppercase; }
    .order-id {
      font-family: 'Courier New', monospace;
      font-size: 10pt;
      font-weight: 700;
      letter-spacing: 0.02em;
      word-break: break-all;
    }
    .footer-note {
      margin-top: auto;
      font-size: 7pt;
      text-align: center;
      border-top: 1px dashed #000;
      padding-top: 2mm;
    }
    .label-dace { font-size: 7.5pt; line-height: 1.22; }
    .dace-head { text-align: center; border-bottom: 1px solid #000; padding-bottom: 2mm; margin-bottom: 1mm; }
    .dace-title { font-size: 9pt; font-weight: 900; text-transform: uppercase; letter-spacing: 0.04em; }
    .dace-sub { font-size: 6.5pt; margin-top: 1mm; color: #333; }
    .dace-meta {
      display: flex;
      justify-content: space-between;
      gap: 2mm;
      font-size: 6.5pt;
      border: 1px solid #000;
      padding: 1.5mm 2mm;
    }
    .dace-party {
      border: 1px solid #000;
      padding: 2mm;
      font-size: 7pt;
      line-height: 1.2;
    }
    .dace-summary {
      border: 1px solid #000;
      padding: 2mm;
      font-size: 7pt;
      line-height: 1.35;
      display: grid;
      gap: 1mm;
    }
    .dace-legal {
      margin: 0;
      font-size: 5.8pt;
      line-height: 1.25;
      text-align: justify;
      flex: 1;
    }
    .dace-foot {
      margin-top: auto;
      text-align: center;
      font-size: 6.5pt;
      font-family: 'Courier New', monospace;
      border-top: 1px dashed #000;
      padding-top: 2mm;
    }
    @media screen {
      body { background: #ddd; display: flex; flex-direction: column; align-items: center; padding: 16px; gap: 16px; }
      .label { box-shadow: 0 2px 12px rgba(0,0,0,.2); background: #fff; }
    }
    @media print {
      body { background: #fff; }
      .no-print { display: none !important; }
    }`;
  }

  function labelHtml(order) {
    const SENDER = getSender();
    const kind = shippingKind(order);
    const shipLabel = shippingLabel(order);
    const addr = destAddress(order).split('\n').map((l) => esc(l)).join('<br>');
    const obs = String(order.observacoes || '').trim();
    const created = order.createdAt
      ? new Date(order.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
      : '';
    const middleBlock = kind === 'correios' ? '' : privateCourierBlockHtml(order);
    const dacePage = kind === 'correios' ? daceResumidaHtml(order, SENDER) : '';

    return `<!DOCTYPE html>
<html lang="pt-br">
<head>
  <meta charset="UTF-8">
  <title>Etiqueta ${esc(order.orderId)}</title>
  <style>${labelStyles()}</style>
</head>
<body>
  <div class="label">
    <div class="brand">SENSOR TATTOO FIX</div>

    <div class="block block-sender">
      <div class="block-title">Remetente</div>
      <strong>${esc(SENDER.brand)}</strong><br>
      ${esc(SENDER.company)}<br>
      CNPJ ${esc(SENDER.cnpj)}<br>
      ${esc(SENDER.street)}<br>
      ${esc(SENDER.district)} — ${esc(SENDER.city)}<br>
      ${esc(SENDER.country)}<br>
      CEP ${esc(SENDER.cep)}
    </div>

    <div class="block" style="flex:1">
      <div class="block-title">Destinatário</div>
      <div class="dest-name">${esc(order.nome)}</div>
      <div style="margin-top:1.5mm;font-size:8.5pt">${addr}</div>
    </div>

    ${middleBlock}

    <div class="block">
      <div class="meta-grid">
        <div><strong>Pedido</strong><span class="order-id">${esc(order.orderId)}</span></div>
        <div><strong>Envio</strong>${esc(shipLabel)}</div>
      </div>
      ${obs ? `<div style="margin-top:2mm;font-size:8pt"><strong>Obs:</strong> ${esc(obs)}</div>` : ''}
      ${created ? `<div style="margin-top:1.5mm;font-size:7.5pt;color:#333">Pedido em ${esc(created)}</div>` : ''}
      ${kind === 'correios' ? '<div style="margin-top:1.5mm;font-size:6.5pt;color:#333">Página 1 — Etiqueta de endereço · DACE na página seguinte</div>' : ''}
    </div>

    <div class="footer-note">${footerNote(order)}</div>
  </div>
  ${dacePage}
  <script>
    window.addEventListener('load', function () {
      setTimeout(function () { window.print(); }, 250);
    });
  </script>
</body>
</html>`;
  }

  function print(order) {
    if (!order?.orderId) return;
    const html = labelHtml(order);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, '_blank');
    if (!w) {
      URL.revokeObjectURL(url);
      alert('Permita pop-ups para imprimir a etiqueta.');
      return;
    }
    setTimeout(() => URL.revokeObjectURL(url), 120000);
  }

  return { print, labelHtml, configure, senderFromShipping };
})();
