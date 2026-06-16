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

  function destAddress(order) {
    if (order.rua || order.cep) {
      const parts = [];
      const street = [order.rua, order.numero].filter(Boolean).join(', ');
      if (street) parts.push(street);
      if (order.complemento) parts.push(order.complemento);
      const district = [order.bairro, order.cidade, order.uf].filter(Boolean).join(' — ');
      if (district) parts.push(district);
      if (order.pais) parts.push(order.pais);
      if (order.cep) parts.push('CEP ' + formatCep(order.cep));
      return parts.join('\n');
    }
    return order.endereco || '—';
  }

  function formatBRL(value) {
    return 'R$ ' + Number(value || 0).toFixed(2).replace('.', ',');
  }

  function declarationLines(order) {
    if (Array.isArray(order.items) && order.items.length) {
      return order.items.map((item) => {
        const qty = Math.max(1, Number(item.qty) || 1);
        const unitWeight = Math.max(1, Math.round(Number(item.weightGrams) || 3));
        return {
          name: String(item.name || 'Produto').slice(0, 42),
          qty,
          weight: unitWeight * qty,
          value: (Number(item.price) || 0) * qty
        };
      });
    }
    const name = order.produto || 'Kit lente ótica smartwatch Sensor Tattoo Fix';
    const qty = 1;
    const weight = 3;
    return [{
      name: String(name).slice(0, 42),
      qty,
      weight,
      value: Number(order.valorProduto) || 0
    }];
  }

  function contentDeclarationHtml(order) {
    const lines = declarationLines(order);
    const totalWeight = lines.reduce((sum, row) => sum + row.weight, 0);
    const totalValue = lines.reduce((sum, row) => sum + row.value, 0);
    const rows = lines.map((row) => `
        <tr>
          <td>${esc(row.name)}</td>
          <td>${row.qty}</td>
          <td>${row.weight} g</td>
          <td>${esc(formatBRL(row.value))}</td>
        </tr>`).join('');

    return `
    <div class="block dc-block">
      <div class="block-title">Declaração de conteúdo</div>
      <table class="dc-table">
        <thead>
          <tr>
            <th>Conteúdo</th>
            <th>Qtd</th>
            <th>Peso</th>
            <th>Valor</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="dc-totals">
        <span><strong>Peso total:</strong> ${totalWeight} g</span>
        <span><strong>Valor total:</strong> ${esc(formatBRL(totalValue))}</span>
      </div>
      <p class="dc-decl">
        Declaro verdadeiras as informações acima e que o conteúdo não é restrito ou proibido pelos Correios.
        Mercadoria sem valor comercial para o destinatário ou isenta de NF conforme legislação vigente.
      </p>
    </div>`;
  }

  function labelHtml(order) {
    const SENDER = getSender();
    const addr = destAddress(order).split('\n').map((l) => esc(l)).join('<br>');
    const obs = String(order.observacoes || '').trim();
    const created = order.createdAt
      ? new Date(order.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
      : '';

    return `<!DOCTYPE html>
<html lang="pt-br">
<head>
  <meta charset="UTF-8">
  <title>Etiqueta ${esc(order.orderId)}</title>
  <style>
    @page { size: 100mm 150mm; margin: 0; }
    * { box-sizing: border-box; }
    html, body {
      width: 100mm;
      height: 150mm;
      margin: 0;
      padding: 0;
      font-family: Arial, Helvetica, sans-serif;
      color: #000;
      background: #fff;
    }
    .label {
      width: 100mm;
      height: 150mm;
      padding: 3mm 4mm;
      display: flex;
      flex-direction: column;
      gap: 2mm;
      font-size: 8.5pt;
      line-height: 1.2;
    }
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
    .dc-block {
      padding: 2mm;
      font-size: 7pt;
      line-height: 1.2;
    }
    .dc-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 6.5pt;
      margin-top: 1mm;
    }
    .dc-table th,
    .dc-table td {
      border: 1px solid #000;
      padding: 0.8mm 1mm;
      vertical-align: top;
      text-align: left;
    }
    .dc-table th {
      font-size: 6pt;
      text-transform: uppercase;
      font-weight: 800;
    }
    .dc-table td:nth-child(2),
    .dc-table td:nth-child(3),
    .dc-table th:nth-child(2),
    .dc-table th:nth-child(3) {
      width: 9mm;
      white-space: nowrap;
    }
    .dc-table td:nth-child(4),
    .dc-table th:nth-child(4) {
      width: 16mm;
      white-space: nowrap;
    }
    .dc-totals {
      display: flex;
      justify-content: space-between;
      gap: 2mm;
      margin-top: 1.5mm;
      font-size: 6.5pt;
      font-weight: 700;
    }
    .dc-decl {
      margin: 1.5mm 0 0;
      font-size: 5.8pt;
      line-height: 1.2;
      text-align: justify;
    }
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
    @media screen {
      body { background: #ddd; display: flex; justify-content: center; padding: 16px; }
      .label { box-shadow: 0 2px 12px rgba(0,0,0,.2); }
    }
    @media print {
      body { background: #fff; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="label">
    <div class="brand">SENSOR TATTOOFIX</div>

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

    <div class="block" style="flex:0.85">
      <div class="block-title">Destinatário</div>
      <div class="dest-name">${esc(order.nome)}</div>
      <div style="margin-top:1.5mm;font-size:8.5pt">${addr}</div>
    </div>

    ${contentDeclarationHtml(order)}

    <div class="block">
      <div class="meta-grid">
        <div><strong>Pedido</strong><span class="order-id">${esc(order.orderId)}</span></div>
        <div><strong>Envio</strong>${esc(order.shippingService || SENDER.service)}</div>
      </div>
      ${obs ? `<div style="margin-top:2mm;font-size:8pt"><strong>Obs:</strong> ${esc(obs)}</div>` : ''}
      ${created ? `<div style="margin-top:1.5mm;font-size:7.5pt;color:#333">Pedido em ${esc(created)}</div>` : ''}
    </div>

    <div class="footer-note">Correios — ${esc(order.shippingService || SENDER.service)} · sensortattoofix.com.br</div>
  </div>
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
