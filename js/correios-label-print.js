/**
 * Etiqueta Correios: renderiza o PDF em tela cheia (crop + scale) para impressora térmica.
 * Tamanho do papel você ajusta na impressora; aqui a etiqueta ocupa 100% da área.
 */
window.STF_CORREIOS_LABEL_PRINT = (function () {
  function openPdfBlobWindow(blob, filename) {
    const url = URL.createObjectURL(blob);
    const w = window.open(url, '_blank');
    if (!w) {
      URL.revokeObjectURL(url);
      return false;
    }
    setTimeout(function () { URL.revokeObjectURL(url); }, 120000);
    return true;
  }

  function openPdfBase64(b64, filename) {
    if (!b64) return false;
    const key = 'stf-correios-pdf-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    let stored = false;
    try {
      sessionStorage.setItem(key, String(b64));
      stored = true;
    } catch (err) {
      console.warn('sessionStorage:', err);
    }
    if (stored) {
      const url = '/etiqueta-correios-print.html?key=' + encodeURIComponent(key)
        + '&t=' + Date.now();
      const w = window.open(url, '_blank');
      if (w) return true;
      sessionStorage.removeItem(key);
    }
    try {
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const blob = new Blob([bytes], { type: 'application/pdf' });
      if (openPdfBlobWindow(blob, filename)) return true;
    } catch (err) {
      console.warn('pdf blob:', err);
    }
    alert('Permita pop-ups para imprimir a etiqueta.');
    return false;
  }

  return { openPdfBase64 };
})();
