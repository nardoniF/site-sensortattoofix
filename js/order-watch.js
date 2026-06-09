window.STF_ORDER_WATCH = (function () {
  function trimObs(order) {
    return String(order?.observacoes ?? '').trim();
  }

  function formatModel(order) {
    const model = String(order?.modeloRelogio || order?.smartwatch || '').trim();
    const obs = trimObs(order);
    if (order?.modeloRelogio) return order.modeloRelogio;
    if (!model || model === 'N/A') return obs || '—';
    if (model.includes('Outro modelo')) return obs || model;
    return obs ? `${model} — ${obs}` : model;
  }

  function detailLines(order) {
    const model = String(order?.smartwatch || '').trim();
    const obs = trimObs(order);
    const lines = [];
    if (model && model !== 'N/A') lines.push(`Smartwatch: ${model}`);
    if (obs) lines.push(`Observações: ${obs}`);
    lines.push(`Modelo do relógio: ${formatModel(order)}`);
    return lines;
  }

  return { formatModel, detailLines, trimObs };
})();
