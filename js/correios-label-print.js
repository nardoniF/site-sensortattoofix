/**
 * Abre PDF de etiqueta Correios em página 4×6" (102×152 mm) para impressora térmica.
 */
window.STF_CORREIOS_LABEL_PRINT = (function () {
  const LABEL_W_MM = 102;
  const LABEL_H_MM = 152;

  function esc(text) {
    return String(text ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  function openPdfBase64(b64, filename) {
    if (!b64) return false;
    const bin = atob(String(b64));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
    const pdfUrl = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    const title = esc(filename || 'Etiqueta Correios');

    const html = `<!DOCTYPE html>
<html lang="pt-br">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    @page { size: ${LABEL_W_MM}mm ${LABEL_H_MM}mm; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: ${LABEL_W_MM}mm;
      height: ${LABEL_H_MM}mm;
      overflow: hidden;
      background: #fff;
    }
    .sheet {
      width: ${LABEL_W_MM}mm;
      height: ${LABEL_H_MM}mm;
      position: relative;
      overflow: hidden;
      background: #fff;
    }
    embed {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      border: 0;
      display: block;
    }
    .hint {
      position: fixed;
      bottom: 12px;
      left: 50%;
      transform: translateX(-50%);
      font: 12px/1.4 Arial, sans-serif;
      color: #333;
      background: rgba(255,255,255,.95);
      border: 1px solid #ccc;
      border-radius: 8px;
      padding: 8px 12px;
      max-width: 92vw;
      text-align: center;
      z-index: 9;
    }
    @media print {
      .hint { display: none !important; }
      html, body, .sheet, embed { width: ${LABEL_W_MM}mm; height: ${LABEL_H_MM}mm; }
    }
    @media screen {
      html, body {
        width: auto;
        height: auto;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;
        padding: 16px;
        background: #bbb;
      }
      .sheet {
        box-shadow: 0 6px 24px rgba(0,0,0,.28);
      }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <embed src="${pdfUrl}#toolbar=0&navpanes=0&view=FitH" type="application/pdf" />
  </div>
  <p class="hint">Papel <strong>4×6″</strong> (${LABEL_W_MM}×${LABEL_H_MM} mm) · Escala 100% · sem margens</p>
  <script>
    window.addEventListener('load', function () {
      setTimeout(function () { window.print(); }, 700);
    });
  </script>
</body>
</html>`;

    const pageBlob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const pageUrl = URL.createObjectURL(pageBlob);
    const w = window.open(pageUrl, '_blank');
    if (!w) {
      URL.revokeObjectURL(pdfUrl);
      URL.revokeObjectURL(pageUrl);
      return false;
    }
    setTimeout(function () {
      URL.revokeObjectURL(pdfUrl);
      URL.revokeObjectURL(pageUrl);
    }, 120000);
    return true;
  }

  return { openPdfBase64, LABEL_W_MM, LABEL_H_MM };
})();
