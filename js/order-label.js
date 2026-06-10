window.STF_ORDER_LABEL = (function () {
  const SENDER = {
    brand: 'Sensor Tattoo Fix',
    company: '3N20 Soluções Tecnológicas LTDA',
    cnpj: '29.321.223/0001-32',
    city: 'São Paulo/SP',
    cep: '01153-000',
    service: 'Mini Envios'
  };

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

  function labelHtml(order) {
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
      padding: 4mm 5mm;
      display: flex;
      flex-direction: column;
      gap: 3mm;
      font-size: 9pt;
      line-height: 1.25;
    }
    .brand {
      text-align: center;
      font-weight: 900;
      font-size: 11pt;
      letter-spacing: 0.04em;
      border-bottom: 1px solid #000;
      padding-bottom: 2mm;
    }
    .block { border: 1px solid #000; padding: 2.5mm; }
    .block-title {
      font-size: 7pt;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-bottom: 1.5mm;
    }
    .dest-name {
      font-size: 12pt;
      font-weight: 800;
      margin-bottom: 1mm;
      word-break: break-word;
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

    <div class="block">
      <div class="block-title">Remetente</div>
      <strong>${esc(SENDER.brand)}</strong><br>
      ${esc(SENDER.company)}<br>
      CNPJ ${esc(SENDER.cnpj)}<br>
      ${esc(SENDER.city)}<br>
      CEP ${esc(SENDER.cep)}
    </div>

    <div class="block" style="flex:1">
      <div class="block-title">Destinatário</div>
      <div class="dest-name">${esc(order.nome)}</div>
      <div style="margin-top:2mm">${addr}</div>
    </div>

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

  return { print, labelHtml };
})();
