window.STF_ORDER_WATCH = (function () {
  function trimObs(order) {
    return String(order?.observacoes ?? '').trim();
  }

  function isPlaceholder(s) {
    const t = String(s || '').trim();
    if (!t || t === '—' || t === 'N/A') return true;
    return /outro modelo|other model|altro modello/i.test(t);
  }

  function formatModel(order) {
    const model = String(order?.modeloRelogio || order?.smartwatch || '').trim();
    const obs = trimObs(order);
    if (isPlaceholder(model)) return obs || model || '—';
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
