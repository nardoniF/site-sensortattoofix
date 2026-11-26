(function () {
  function apiBase() {
    return String(window.CONFIG_BOOTSTRAP?.configApiUrl || 'https://api.sensortattoofix.com.br').replace(/\/$/, '');
  }

  function normalizeCode(raw) {
    return String(raw || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  }

  function escHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  const form = document.getElementById('comissionado-form');
  const statusEl = document.getElementById('comissionado-status');
  const successEl = document.getElementById('comissionado-success');
  const submitBtn = document.getElementById('comissionado-submit');
  const pixInput = form?.querySelector('[name="pix"]');
  const pixError = document.getElementById('comissionado-pix-error');

  if (!form) return;

  function setStatus(msg, type) {
    if (!statusEl) return;
    statusEl.hidden = !msg;
    statusEl.textContent = msg || '';
    statusEl.className = 'comissionado-status' + (type ? ` ${type}` : '');
  }

  function setPixInvalid(msg) {
    if (pixInput) {
      pixInput.classList.toggle('is-invalid', !!msg);
      pixInput.setAttribute('aria-invalid', msg ? 'true' : 'false');
      try {
        pixInput.setCustomValidity(msg || '');
      } catch (_) { /* ignore */ }
    }
    if (pixError) {
      pixError.hidden = !msg;
      pixError.textContent = msg || '';
    }
  }

  function validatePix(raw) {
    const pix = String(raw || '').trim().replace(/\s+/g, '');
    if (!pix || pix.length < 8) {
      return {
        ok: false,
        value: pix,
        message: 'Informe sua chave PIX (CPF, e-mail, celular ou chave aleatória).'
      };
    }
    return { ok: true, value: pix, message: '' };
  }

  form.setAttribute('novalidate', '');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    setStatus('');
    setPixInvalid('');
    if (successEl) successEl.hidden = true;

    const fd = new FormData(form);
    const name = String(fd.get('name') || '').trim();
    const email = String(fd.get('email') || '').trim();
    const code = normalizeCode(fd.get('code'));
    const pixCheck = validatePix(fd.get('pix'));

    if (!pixCheck.ok) {
      setPixInvalid(pixCheck.message);
      setStatus(pixCheck.message, 'error');
      pixInput?.focus();
      return;
    }

    if (submitBtn) submitBtn.disabled = true;

    try {
      const res = await fetch(`${apiBase()}/commissioners/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, code, pix: pixCheck.value })
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const errMsg = data.error || 'Não foi possível criar o cupom. Tente novamente.';
        if (/pix/i.test(errMsg)) {
          setPixInvalid(errMsg);
          pixInput?.focus();
        }
        setStatus(errMsg, 'error');
        return;
      }

      form.hidden = true;
      if (successEl) {
        successEl.hidden = false;
        successEl.innerHTML = `
          <p><strong>Cupom criado com sucesso!</strong></p>
          <p>Seu código:</p>
          <code>${escHtml(data.code)}</code>
          <p>10% de desconto para clientes · 20% de comissão para você.</p>
          <p>PIX cadastrado: <strong>${escHtml(pixCheck.value)}</strong></p>
          <p>Link para compartilhar:<br>
            <a href="${escHtml(data.buyUrl)}" target="_blank" rel="noopener">${escHtml(data.buyUrl)}</a>
          </p>
          <p style="font-size:0.88rem;color:#bbb;margin-top:12px">
            ${data.emailSent
              ? 'Enviamos um e-mail com arte para postar e instruções do programa.'
              : 'Seu cupom já está ativo. Se não receber o e-mail em alguns minutos, confira a caixa de spam.'}
          </p>
        `;
      }
    } catch {
      setStatus('Erro de conexão. Verifique sua internet e tente de novo.', 'error');
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });

  const codeInput = form.querySelector('[name="code"]');
  if (codeInput) {
    codeInput.addEventListener('input', () => {
      const pos = codeInput.selectionStart;
      codeInput.value = normalizeCode(codeInput.value);
      codeInput.setSelectionRange(pos, pos);
    });
  }

  if (pixInput) {
    pixInput.addEventListener('input', () => setPixInvalid(''));
    pixInput.addEventListener('blur', () => {
      if (!pixInput.value.trim()) return;
      const check = validatePix(pixInput.value);
      if (!check.ok) setPixInvalid(check.message);
    });
  }
})();
