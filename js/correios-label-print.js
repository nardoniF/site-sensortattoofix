/**
 * Etiqueta Correios: renderiza o PDF em tela cheia (crop + scale) para impressora térmica.
 * Tamanho do papel você ajusta na impressora; aqui a etiqueta ocupa 100% da área.
 */
window.STF_CORREIOS_LABEL_PRINT = (function () {
  function openPdfBase64(b64, filename) {
    if (!b64) return false;
    const key = 'stf-correios-pdf-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    try {
      sessionStorage.setItem(key, String(b64));
    } catch (err) {
      console.warn('sessionStorage:', err);
      return false;
    }
    const url = '/etiqueta-correios-print.html?key=' + encodeURIComponent(key)
      + '&t=' + Date.now();
    const w = window.open(url, '_blank');
    if (!w) {
      sessionStorage.removeItem(key);
      alert('Permita pop-ups para imprimir a etiqueta.');
      return false;
    }
    return true;
  }

  return { openPdfBase64 };
})();
