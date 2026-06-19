(function () {
  const OUTRO_MODELO = 'Outro modelo (informar nas observações)';

  function L(key, vars) {
    return window.STF_I18N?.t(key, vars) || key;
  }

  function lojaHref() {
    return window.STF_I18N?.lojaHref?.() || 'loja.html';
  }

  function resolveProductImage(image, product) {
    if (window.STF_PRODUCT_MERGE?.resolveProductImage) {
      return window.STF_PRODUCT_MERGE.resolveProductImage(image, product);
    }
    const raw = String(image || '').trim() || 'site/sensortattoofix.jpg';
    if (/^https?:\/\//i.test(raw)) return raw;
    return raw.startsWith('/') ? raw : '/' + raw.replace(/^\.\//, '');
  }

  function resolveProductThumb(image, product) {
    if (window.STF_PRODUCT_MERGE?.resolveProductThumb) {
      return window.STF_PRODUCT_MERGE.resolveProductThumb(image, product);
    }
    return resolveProductImage(image, product);
  }

  function inferAggregatedImage(product) {
    if (window.STF_PRODUCT_MERGE?.inferAggregatedImage) {
      return window.STF_PRODUCT_MERGE.inferAggregatedImage(product);
    }
    return '/produtos/pelicula-squircle.svg';
  }

  let lightboxEls = null;

  function ensureLightbox() {
    if (lightboxEls) return lightboxEls;
    const root = document.getElementById('stf-product-lightbox');
    if (!root) return null;
    const closeBtn = root.querySelector('.stf-lightbox-close');
    if (closeBtn) closeBtn.setAttribute('aria-label', L('agregados.zoomClose'));
    lightboxEls = {
      root,
      img: document.getElementById('stf-lightbox-img'),
      caption: document.getElementById('stf-lightbox-caption'),
      close: closeBtn
    };
    lightboxEls.close?.addEventListener('click', closeProductLightbox);
    root.addEventListener('click', (e) => {
      if (e.target === root) closeProductLightbox();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && root && !root.hidden) closeProductLightbox();
    });
    return lightboxEls;
  }

  function openProductLightbox(src, caption) {
    const lb = ensureLightbox();
    if (!lb || !src) return;
    lb.img.src = src;
    lb.img.alt = caption || '';
    if (lb.caption) lb.caption.textContent = caption || '';
    lb.root.hidden = false;
    lb.root.setAttribute('aria-hidden', 'false');
    document.body.classList.add('stf-lightbox-open');
    lb.close?.focus();
  }

  function closeProductLightbox() {
    const lb = ensureLightbox();
    if (!lb) return;
    lb.root.hidden = true;
    lb.root.setAttribute('aria-hidden', 'true');
    lb.img.removeAttribute('src');
    if (lb.caption) lb.caption.textContent = '';
    document.body.classList.remove('stf-lightbox-open');
  }

  function bindProductZoom(root) {
    if (!root) return;
    root.querySelectorAll('[data-product-zoom]').forEach((btn) => {
      btn.addEventListener('click', () => {
        openProductLightbox(
          btn.getAttribute('data-product-zoom'),
          btn.getAttribute('data-product-zoom-caption') || ''
        );
      });
    });
  }

  function renderZoomableThumb(thumbSrc, fullSrc, caption, fallback, extraClass) {
    const thumb = escapeHtml(thumbSrc);
    const full = escapeHtml(fullSrc || thumbSrc);
    const fb = escapeHtml(fallback || fullSrc || thumbSrc);
    const zoomLabel = escapeHtml(L('agregados.zoomImage'));
    const cap = escapeHtml(caption || '');
    return `
      <button type="button" class="stf-product-zoom-btn stf-product-zoom-btn--aggregated ${extraClass || ''}" data-product-zoom="${full}" data-product-zoom-caption="${cap}" aria-label="${zoomLabel}">
        <img src="${thumb}" alt="" loading="lazy" onerror="this.onerror=null;this.src='${fb}'">
        <span class="stf-product-zoom-icon" aria-hidden="true"><i class="fas fa-search-plus"></i></span>
      </button>`;
  }

  function setPayBtnLabel(key) {
    const label = els.btnPay?.querySelector('.btn-checkout-label');
    if (label) label.textContent = L(key);
    else if (els.btnPay) els.btnPay.textContent = L(key);
  }

  function updateCpfLabel() {
    if (!els.cpfLabel || !els.cpfInput) return;
    const key = isInternational ? 'form.docOptional' : 'form.cpf';
    const required = !isInternational;
    const text = L(key) + (required ? ' *' : '');
    els.cpfLabel.classList.add('checkout-infield');
    while (els.cpfLabel.firstChild && els.cpfLabel.firstChild !== els.cpfInput) {
      els.cpfLabel.removeChild(els.cpfLabel.firstChild);
    }
    els.cpfInput.placeholder = text;
    els.cpfInput.setAttribute('aria-label', text);
    if (required) els.cpfInput.setAttribute('required', '');
    else els.cpfInput.removeAttribute('required');
  }

  let cfg, products = [];
  let shippingCost = null, shippingInfo = null, shippingOptions = [], pollTimer = null, isInternational = false;

  const els = {
    form: document.getElementById('checkout-form'),
    steps: document.querySelectorAll('.checkout-step'),
    indicators: document.querySelectorAll('.step-indicator'),
    btnNext: document.getElementById('btn-next'),
    btnBack: document.getElementById('btn-back'),
    btnPay: document.getElementById('btn-pay'),
    cep: document.getElementById('cep'),
    paisCode: document.getElementById('pais-code'),
    addressBr: document.getElementById('address-br'),
    addressIntl: document.getElementById('address-intl'),
    smartwatchSelect: document.getElementById('smartwatch-select'),
    checkoutWatchBlock: document.getElementById('checkout-watch-block'),
    smartwatchHint: document.getElementById('smartwatch-hint'),
    smartwatchSensorWarn: document.getElementById('smartwatch-sensor-warn'),
    smartwatchError: document.getElementById('smartwatch-error'),
    summaryProduct: document.getElementById('summary-product'),
    summaryShipping: document.getElementById('summary-shipping'),
    summaryShippingLabel: document.getElementById('summary-shipping-label'),
    summaryTotal: document.getElementById('summary-total'),
    shippingHint: document.getElementById('shipping-hint'),
    shippingOptionsWrap: document.getElementById('shipping-options-wrap'),
    shippingOptionsEl: document.getElementById('shipping-options'),
    pixQr: document.getElementById('pix-qr'),
    pixCopy: document.getElementById('pix-copy'),
    pixCopyArea: document.getElementById('pix-copy-area'),
    pixAmount: document.getElementById('pix-amount'),
    orderId: document.getElementById('order-id'),
    paymentStatus: document.getElementById('payment-status'),
    cardPayLink: document.getElementById('card-pay-link'),
    cardPayText: document.getElementById('card-pay-text'),
    paypalPayLink: document.getElementById('paypal-pay-link'),
    pixUi: document.getElementById('pix-ui'),
    cardUi: document.getElementById('card-ui'),
    paypalUi: document.getElementById('paypal-ui'),
    paymentOptionsBr: document.getElementById('payment-options-br'),
    paymentOptionsIntl: document.getElementById('payment-options-intl'),
    paymentNoticeBr: document.getElementById('payment-notice-br'),
    paymentNoticeIntl: document.getElementById('payment-notice-intl'),
    cpfLabel: document.getElementById('cpf-label'),
    cpfInput: document.getElementById('cpf-input'),
    paymentPanel: document.getElementById('payment-panel'),
    confirmTitle: document.getElementById('confirm-title'),
    confirmHint: document.getElementById('confirm-hint'),
    cartSidebar: document.getElementById('cart-sidebar-items'),
    peliculaUpsell: document.getElementById('pelicula-upsell'),
    checkoutSidebar: document.querySelector('.checkout-sidebar'),
    observacoesWrap: document.getElementById('observacoes-wrap'),
    observacoes: document.getElementById('observacoes'),
    observacoesError: document.getElementById('observacoes-error'),
    observacoesLabelText: document.getElementById('observacoes-label-text'),
    criarConta: document.getElementById('criar-conta'),
    senhaWrap: document.getElementById('senha-wrap'),
    checkoutSenha: document.getElementById('checkout-senha'),
    accountCreateWrap: document.getElementById('account-create-wrap'),
    accountGuestWrap: document.getElementById('account-guest-wrap'),
    accountLoggedWrap: document.getElementById('account-logged-wrap'),
    accountLoggedName: document.getElementById('account-logged-name'),
    checkoutAccountRegister: document.getElementById('checkout-account-register'),
    checkoutAccountLogin: document.getElementById('checkout-account-login'),
    checkoutLoginEmail: document.getElementById('checkout-login-email'),
    checkoutLoginSenha: document.getElementById('checkout-login-senha'),
    checkoutLoginStatus: document.getElementById('checkout-login-status'),
    btnCheckoutLogin: document.getElementById('btn-checkout-login')
  };

  let currentStep = 1;
  let orderSidebarLocked = false;
  let orderSidebarSnapshot = null;

  function apiBase() {
    return ((cfg?.api?.baseUrl) || window.CONFIG_BOOTSTRAP?.configApiUrl || '').replace(/\/$/, '');
  }

  function formatBRL(v) {
    return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function onlyDigits(s) { return (s || '').replace(/\D/g, ''); }

  function generateOrderId() {
    const d = new Date(), p = (n) => String(n).padStart(2, '0');
    return `STF-${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
  }

  function maskCep(v) {
    const d = onlyDigits(v).slice(0, 8);
    return d.length > 5 ? d.slice(0,5)+'-'+d.slice(5) : d;
  }

  function maskPhone(v) {
    const d = onlyDigits(v).slice(0, 11);
    return d.length <= 10 ? d.replace(/(\d{2})(\d{4})(\d{0,4})/,'($1) $2-$3').trim()
      : d.replace(/(\d{2})(\d{5})(\d{0,4})/,'($1) $2-$3').trim();
  }

  function maskCpf(v) {
    const d = onlyDigits(v).slice(0, 11);
    return d.replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d{1,2})$/,'$1-$2');
  }

  function customerToken() {
    return window.STF_ACCOUNT?.getToken() || '';
  }

  function getCustomerUser() {
    return window.STF_ACCOUNT?.getUser() || null;
  }

  function isRegisterAccountMode() {
    return els.checkoutAccountRegister && !els.checkoutAccountRegister.hidden;
  }

  function showCheckoutLoginStatus(msg, type) {
    if (!els.checkoutLoginStatus) return;
    els.checkoutLoginStatus.textContent = msg;
    els.checkoutLoginStatus.className = 'admin-status form-status ' + (type || '');
    els.checkoutLoginStatus.hidden = !msg;
    if (msg) els.checkoutLoginStatus.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function setCheckoutAccountTab(mode) {
    const isLogin = mode === 'login';
    if (els.checkoutAccountRegister) els.checkoutAccountRegister.hidden = isLogin;
    if (els.checkoutAccountLogin) els.checkoutAccountLogin.hidden = !isLogin;
    document.querySelectorAll('[data-checkout-account-tab]').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-checkout-account-tab') === mode);
    });
    showCheckoutLoginStatus('', '');
  }

  async function checkoutLogin() {
    const email = els.checkoutLoginEmail?.value.trim();
    const senha = els.checkoutLoginSenha?.value || '';
    if (!email || !senha) {
      showCheckoutLoginStatus(L('account.loginNeedCreds'), 'error');
      return;
    }
    if (!window.STF_ACCOUNT) {
      showCheckoutLoginStatus(L('account.loginUnavailable'), 'error');
      return;
    }
    els.btnCheckoutLogin.disabled = true;
    showCheckoutLoginStatus(L('account.loginEntering'), '');
    try {
      const data = await window.STF_ACCOUNT.login(email, senha);
      prefillCustomer(data.user);
      renderCheckoutAccountUI();
      showCheckoutLoginStatus(L('account.loginOk'), 'success');
    } catch (err) {
      showCheckoutLoginStatus(err.message || L('account.loginFail'), 'error');
    } finally {
      els.btnCheckoutLogin.disabled = false;
    }
  }

  function renderCheckoutAccountUI() {
    const user = getCustomerUser();
    if (els.accountLoggedWrap && els.accountGuestWrap) {
      if (user) {
        const name = window.STF_ACCOUNT.displayName(user);
        const loggedP = els.accountLoggedWrap.querySelector('p:first-child');
        if (loggedP) {
          loggedP.innerHTML = `<i class="fas fa-user-check"></i> ${L('account.logged', { name: `<strong id="account-logged-name">${escapeHtml(name)}</strong>` })}`;
        }
        const ordersHint = els.accountLoggedWrap.querySelector('.checkout-hint');
        if (ordersHint) {
          ordersHint.innerHTML = `${L('account.ordersAt')} <a href="${window.STF_I18N?.accountHref?.() || 'minha-conta.html'}">${L('account.myAccount')}</a>.`;
        }
        els.accountLoggedWrap.hidden = false;
        els.accountGuestWrap.hidden = true;
        if (els.accountCreateWrap) els.accountCreateWrap.hidden = true;
      } else {
        els.accountLoggedWrap.hidden = true;
        els.accountGuestWrap.hidden = false;
        if (els.accountCreateWrap) els.accountCreateWrap.hidden = false;
      }
    }
    if (user) prefillCustomer(user);
  }

  function clearWatchFieldError() {
    els.smartwatchSelect?.classList.remove('invalid');
    if (els.checkoutWatchBlock) els.checkoutWatchBlock.classList.remove('checkout-watch-block--error');
    if (els.smartwatchError) {
      els.smartwatchError.hidden = true;
      els.smartwatchError.textContent = '';
    }
  }

  function showWatchFieldError(msg) {
    els.smartwatchSelect?.classList.add('invalid');
    if (els.checkoutWatchBlock) {
      els.checkoutWatchBlock.hidden = false;
      els.checkoutWatchBlock.classList.add('checkout-watch-block--error');
      els.checkoutWatchBlock.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
    els.smartwatchSelect?.focus();
    if (els.smartwatchError) {
      els.smartwatchError.textContent = msg;
      els.smartwatchError.hidden = false;
    }
  }

  function clearObservacoesFieldError() {
    els.observacoes?.classList.remove('invalid');
    if (els.observacoesError) {
      els.observacoesError.hidden = true;
      els.observacoesError.textContent = '';
    }
  }

  function showObservacoesFieldError(msg) {
    els.observacoes?.classList.add('invalid');
    if (els.observacoesWrap) {
      els.observacoesWrap.hidden = false;
      els.observacoesWrap.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
    els.observacoes?.focus();
    if (els.observacoesError) {
      els.observacoesError.textContent = msg;
      els.observacoesError.hidden = false;
    }
  }

  function cartSubtotal() {
    return window.STF_CART?.subtotal() || 0;
  }

  function escapeHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  }

  function isOutroModelo(value) {
    return value === OUTRO_MODELO || value === L('watch.otherModel')
      || String(value || '').includes('Outro modelo')
      || String(value || '').includes('Other model');
  }

  function updateSmartwatchVisibility() {
    const needsWatch = window.STF_CART?.requiresSmartwatch();
    if (els.checkoutWatchBlock) els.checkoutWatchBlock.hidden = !needsWatch;
    if (els.smartwatchSelect) els.smartwatchSelect.required = !!needsWatch;
    if (!needsWatch) clearWatchFieldError();
    updateObservacoesField();
  }

  function updateObservacoesField() {
    const needsWatch = window.STF_CART?.requiresSmartwatch();
    if (!els.observacoesWrap || !els.observacoes) return;

    if (!needsWatch) {
      els.observacoesWrap.hidden = true;
      els.observacoes.required = false;
      els.observacoes.value = '';
      return;
    }

    els.observacoesWrap.hidden = false;
    const outro = isOutroModelo(els.smartwatchSelect?.value);
    els.observacoes.required = outro;
    if (els.observacoesLabelText) {
      els.observacoesLabelText.textContent = outro ? `${L('form.notesRequired')} *` : L('form.notesOptional');
    }
    els.observacoes.placeholder = outro ? L('form.notesPhRequired') : L('form.notesPhOptional');
  }

  function cartLineName(item) {
    const p = products.find((x) => x.id === item.productId || x.slug === item.productId);
    if (p && window.STF_PELICULA) return window.STF_PELICULA.productLabel(p);
    return item.name;
  }

  function updateSensorWarn() {
    const el = els.smartwatchSensorWarn;
    if (!el) return;
    const watchModel = els.smartwatchSelect?.value || '';
    const meta = cfg.smartwatchModelMeta?.[watchModel];
    const watchSensor = meta?.sensorMm;
    const cart = window.STF_CART?.load() || [];
    const lensItem = cart.find((item) => {
      const p = products.find((x) => x.id === item.productId || x.slug === item.productId);
      return p && !p.aggregated && p.sensorMm;
    });
    const lensProduct = lensItem
      ? products.find((x) => x.id === lensItem.productId || x.slug === lensItem.productId)
      : null;
    const lensSensor = lensProduct?.sensorMm;
    if (watchSensor && lensSensor && Math.abs(Number(watchSensor) - Number(lensSensor)) > 0.5) {
      el.textContent = L('form.sensorMismatch', { watch: watchSensor, lens: lensSensor });
      el.hidden = false;
      return;
    }
    el.hidden = true;
    el.textContent = '';
  }

  function renderPeliculaUpsell() {
    const wrap = els.peliculaUpsell;
    if (!wrap || !window.STF_PELICULA) return;
    if (orderSidebarLocked) {
      wrap.hidden = true;
      wrap.innerHTML = '';
      return;
    }

    const needsWatch = window.STF_CART?.requiresSmartwatch();
    const watchModel = els.smartwatchSelect?.value || '';
    if (!needsWatch || !watchModel || isOutroModelo(watchModel)) {
      wrap.hidden = true;
      wrap.innerHTML = '';
      return;
    }

    const inCart = new Set((window.STF_CART?.load() || []).map((i) => i.productId));
    const compatible = window.STF_PELICULA.findCompatible(watchModel, products, cfg.smartwatchModelMeta)
      .filter((p) => !inCart.has(p.id));

    if (!compatible.length) {
      wrap.hidden = true;
      wrap.innerHTML = '';
      return;
    }

    const peliculas = compatible.filter((p) => window.STF_PELICULA.productType(p) !== 'pulseira');
    const pulseiras = compatible.filter((p) => window.STF_PELICULA.productType(p) === 'pulseira');
    const hasBoth = peliculas.length > 0 && pulseiras.length > 0;

    function renderCard(p) {
      const type = window.STF_PELICULA.productType(p);
      const addKey = type === 'pulseira' ? 'pulseira.add' : 'pelicula.add';
      const imgFull = resolveProductImage(p.image, p);
      const imgFallback = inferAggregatedImage(p);
      const title = window.STF_PELICULA.upsellShortLabel
        ? window.STF_PELICULA.upsellShortLabel(p)
        : window.STF_PELICULA.productLabel(p);
      const desc = window.STF_PELICULA.upsellShortDescription
        ? window.STF_PELICULA.upsellShortDescription(p)
        : '';
      return `
        <div class="pelicula-upsell-card" data-pelicula-id="${escapeHtml(p.id)}">
          ${renderZoomableThumb(imgFull, imgFull, title, imgFallback, 'pelicula-upsell-img-btn')}
          <div class="pelicula-upsell-info">
            <strong>${escapeHtml(title)}</strong>
            ${desc ? `<p class="pelicula-upsell-desc">${escapeHtml(desc)}</p>` : ''}
            <span class="pelicula-upsell-price">${formatBRL(p.price)}</span>
          </div>
          <button type="button" class="pelicula-upsell-btn" data-pelicula-add="${escapeHtml(p.id)}" data-product-type="${escapeHtml(type)}">${escapeHtml(L(addKey))}</button>
        </div>
      `;
    }

    function renderSection(icon, labelKey, items) {
      if (!items.length) return '';
      const header = hasBoth
        ? `<h4 class="pelicula-upsell-section"><i class="fas ${icon}"></i> ${escapeHtml(L(labelKey))}</h4>`
        : '';
      return `${header}${items.map(renderCard).join('')}`;
    }

    wrap.hidden = false;
    wrap.innerHTML = `
      <h3 class="pelicula-upsell-title"><i class="fas fa-gift"></i> ${escapeHtml(L('agregados.upsellTitle'))}</h3>
      <p class="pelicula-upsell-hint">${escapeHtml(L('agregados.upsellHint'))}</p>
      ${renderSection('fa-shield-alt', 'agregados.sectionPelicula', peliculas)}
      ${renderSection('fa-clock', 'agregados.sectionPulseira', pulseiras)}
    `;

    wrap.querySelectorAll('[data-pelicula-add]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-pelicula-add');
        const p = products.find((x) => x.id === id || x.slug === id);
        if (!p || !window.STF_CART) return;
        window.STF_CART.add({
          ...p,
          image: resolveProductImage(p.image, p),
          name: window.STF_PELICULA.productLabel(p)
        }, 1);
        shippingCost = null;
        shippingInfo = null;
        shippingOptions = [];
        renderCartSidebar();
        updateSummary();
        quoteShipping();
        btn.disabled = true;
        const inCartKey = btn.getAttribute('data-product-type') === 'pulseira' ? 'pulseira.inCart' : 'pelicula.inCart';
        btn.textContent = L(inCartKey);
      });
    });
    bindProductZoom(wrap);
  }

  function seedCartFromUrl() {
    const params = new URLSearchParams(location.search);
    const slug = params.get('produto');
    if (!slug) return false;
    const p = products.find((x) => x.slug === slug || x.id === slug);
    if (!p || window.STF_PELICULA?.isAggregated(p)) return false;
    if (params.get('comprar') === '1') window.STF_CART.clear();
    window.STF_CART.add(p, 1);
    history.replaceState({}, '', location.pathname);
    return true;
  }

  function snapshotFromOrder(data) {
    return {
      produto: data.produto || '',
      subtotal: data.valorProduto ?? 0,
      frete: data.frete ?? 0,
      total: data.total ?? 0
    };
  }

  function updateSidebarTitle() {
    const titleEl = document.querySelector('.cart-sidebar-title');
    if (!titleEl) return;
    const key = orderSidebarLocked ? 'cart.orderTitle' : 'cart.title';
    const icon = orderSidebarLocked ? 'fa-receipt' : 'fa-shopping-cart';
    titleEl.innerHTML = `<i class="fas ${icon}"></i> ${escapeHtml(L(key))}`;
  }

  function renderLockedSidebar() {
    if (!els.cartSidebar) return;
    const snap = orderSidebarSnapshot;
    updateSidebarTitle();
    if (snap?.items?.length) {
      els.cartSidebar.innerHTML = snap.items.map((item) => {
        const catalog = products.find((x) => x.id === item.productId || x.slug === item.productId);
        const lineProduct = catalog || item;
        const imgFull = resolveProductImage(item.image, lineProduct);
        const lineName = cartLineName(item);
        const thumb = item.aggregated
          ? renderZoomableThumb(imgFull, imgFull, lineName, imgFull, 'cart-line-img-btn')
          : `<img src="${escapeHtml(imgFull)}" alt="" class="cart-line-img" loading="lazy" onerror="this.onerror=null;this.src='/site/sensortattoofix.jpg'">`;
        const qtyLabel = item.qty > 1 ? `${item.qty} × ${formatBRL(item.price)}` : formatBRL(item.price);
        return `
        <div class="cart-line cart-line-locked">
          ${thumb}
          <div class="cart-line-info">
            <strong>${escapeHtml(lineName)}</strong>
            <span class="cart-line-price">${formatBRL(item.price * item.qty)}</span>
            <span class="cart-line-qty-label">${escapeHtml(qtyLabel)}</span>
          </div>
        </div>`;
      }).join('');
      bindProductZoom(els.cartSidebar);
    } else if (snap?.produto) {
      els.cartSidebar.innerHTML = `<p class="cart-order-produto">${escapeHtml(snap.produto)}</p>`;
    } else {
      els.cartSidebar.innerHTML = '';
    }
    if (snap) {
      els.summaryProduct.textContent = formatBRL(snap.subtotal ?? 0);
      els.summaryShipping.textContent = formatBRL(snap.frete ?? 0);
      els.summaryTotal.textContent = formatBRL(snap.total ?? 0);
    }
  }

  function lockCheckoutSidebar(snapshot) {
    saveCheckoutCartBackup();
    orderSidebarLocked = true;
    if (snapshot) orderSidebarSnapshot = snapshot;
    els.checkoutSidebar?.classList.add('checkout-sidebar-locked');
    if (els.peliculaUpsell) {
      els.peliculaUpsell.hidden = true;
      els.peliculaUpsell.innerHTML = '';
    }
    window.STF_CART?.clear();
    window.STF_CART?.initBadges?.();
    renderLockedSidebar();
  }

  const CHECKOUT_CART_BACKUP_KEY = 'stf_checkout_cart_backup';

  function saveCheckoutCartBackup() {
    if (!window.STF_CART) return;
    try {
      const items = window.STF_CART.load();
      if (items.length) {
        sessionStorage.setItem(CHECKOUT_CART_BACKUP_KEY, JSON.stringify(items));
      }
    } catch (_) { /* ignore */ }
  }

  function restoreCartFromBackup() {
    const raw = sessionStorage.getItem(CHECKOUT_CART_BACKUP_KEY);
    sessionStorage.removeItem(CHECKOUT_CART_BACKUP_KEY);
    if (!raw || !window.STF_CART) return false;
    try {
      const items = JSON.parse(raw);
      if (!Array.isArray(items) || !items.length) return false;
      window.STF_CART.clear();
      items.forEach((item) => window.STF_CART.add(item, item.qty));
      return true;
    } catch {
      return false;
    }
  }

  function unlockCheckoutSidebar() {
    orderSidebarLocked = false;
    orderSidebarSnapshot = null;
    els.checkoutSidebar?.classList.remove('checkout-sidebar-locked');
    updateSidebarTitle();
  }

  function applyOrderShippingState(order) {
    if (!order || order.frete == null) return;
    if (order.paisCode && els.paisCode) {
      isInternational = order.paisCode !== 'BR';
      els.paisCode.value = order.paisCode;
      els.addressBr.hidden = isInternational;
      els.addressIntl.hidden = !isInternational;
      if (els.summaryShippingLabel) {
        els.summaryShippingLabel.textContent = isInternational ? L('summary.shippingIntl') : L('summary.shipping');
      }
      updatePaymentOptionsForCountry();
      updateCpfLabel();
    }
    shippingCost = Number(order.frete);
    shippingInfo = {
      service: order.shippingService || 'Frete',
      price: shippingCost,
      methodId: order.shippingMethodId || null,
      serviceCode: order.shippingServiceCode || null
    };
  }

  async function fetchOrderForResume(orderId, accessToken) {
    const base = apiBase();
    if (!base || !orderId || !accessToken) return null;
    try {
      const res = await fetch(
        `${base}/orders/${encodeURIComponent(orderId)}?token=${encodeURIComponent(accessToken)}`,
        { cache: 'no-store' }
      );
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  async function restoreCheckoutAfterPaymentAbort(orderId, accessToken) {
    unlockCheckoutSidebar();
    const orderData = await fetchOrderForResume(orderId, accessToken);
    let restored = restoreCartFromBackup();
    if (!restored && orderData?.items?.length) {
      window.STF_CART.clear();
      orderData.items.forEach((item) => window.STF_CART.add(item, item.qty));
      restored = true;
    }
    if (!restored || window.STF_CART?.isEmpty()) return false;
    if (orderData) applyOrderShippingState(orderData);
    renderCartSidebar();
    renderPeliculaUpsell();
    updateSummary();
    updateSmartwatchVisibility();
    updateContinueButtonVisibility();
    els.btnPay.disabled = false;
    setPayBtnLabel('btn.pay');
    showStep(2);
    return true;
  }

  function renderCartSidebar() {
    if (orderSidebarLocked) {
      renderLockedSidebar();
      return;
    }
    if (!els.cartSidebar || !window.STF_CART) return;
    const items = window.STF_CART.load();
    if (!items.length) {
      els.cartSidebar.innerHTML = `<p class="conta-empty">${escapeHtml(L('cart.empty'))}</p>`;
      return;
    }
    els.cartSidebar.innerHTML = items.map((item) => {
      const catalog = products.find((x) => x.id === item.productId || x.slug === item.productId);
      const lineProduct = catalog || item;
      const imgFull = resolveProductImage(item.image, lineProduct);
      const lineName = cartLineName(item);
      const thumb = item.aggregated
        ? renderZoomableThumb(imgFull, imgFull, lineName, imgFull, 'cart-line-img-btn')
        : `<img src="${escapeHtml(imgFull)}" alt="" class="cart-line-img" loading="lazy" onerror="this.onerror=null;this.src='/site/sensortattoofix.jpg'">`;
      return `
      <div class="cart-line" data-product-id="${escapeHtml(item.productId)}">
        ${thumb}
        <div class="cart-line-info">
          <strong>${escapeHtml(cartLineName(item))}</strong>
          <span class="cart-line-price">${formatBRL(item.price)}</span>
          <div class="cart-qty" role="group" aria-label="${escapeHtml(L('cart.qty'))}">
            <button type="button" class="cart-qty-btn" data-delta="-1" aria-label="${escapeHtml(L('cart.decrease'))}">−</button>
            <span class="cart-qty-val">${item.qty}</span>
            <button type="button" class="cart-qty-btn" data-delta="1" aria-label="${escapeHtml(L('cart.increase'))}">+</button>
          </div>
        </div>
        <button type="button" class="cart-remove" title="${escapeHtml(L('cart.remove'))}" aria-label="${escapeHtml(L('cart.remove'))}">&times;</button>
      </div>`;
    }).join('');

    bindProductZoom(els.cartSidebar);

    els.cartSidebar.querySelectorAll('.cart-line').forEach((row) => {
      const id = row.getAttribute('data-product-id');
      row.querySelector('.cart-remove')?.addEventListener('click', () => {
        window.STF_CART.remove(id);
        if (window.STF_CART.isEmpty()) {
          window.location.href = lojaHref();
          return;
        }
        shippingCost = null;
        shippingInfo = null;
        shippingOptions = [];
        renderCartSidebar();
        updateSmartwatchVisibility();
        updateSummary();
        quoteShipping();
      });
      row.querySelectorAll('.cart-qty-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          const delta = Number(btn.getAttribute('data-delta'));
          const current = window.STF_CART.load().find((i) => i.productId === id);
          const p = products.find((x) => x.id === id || x.slug === id);
          window.STF_CART.setQty(id, (current?.qty || 1) + delta, p);
          if (window.STF_CART.isEmpty()) {
            window.location.href = lojaHref();
            return;
          }
          shippingCost = null;
          shippingInfo = null;
          shippingOptions = [];
          renderCartSidebar();
          updateSmartwatchVisibility();
          updateSummary();
          quoteShipping();
        });
      });
    });
    updateSmartwatchVisibility();
    renderPeliculaUpsell();
    updateSensorWarn();
  }

  async function loadCustomerSession() {
    if (!window.STF_ACCOUNT) return;
    await window.STF_ACCOUNT.refreshSession();
    renderCheckoutAccountUI();
  }

  function prefillCustomer(user) {
    const u = user || getCustomerUser();
    if (!u || !els.form) return;
    const f = els.form;
    if (f.nome) f.nome.value = u.nome || '';
    if (f.email) f.email.value = u.email || '';
    if (f.telefone) f.telefone.value = u.telefone || '';
    if (f.cpf && u.cpf) f.cpf.value = u.cpf;
    const a = u.address;
    if (a) {
      if (f.cep && a.cep) f.cep.value = maskCep(a.cep);
      if (f.rua && a.rua) f.rua.value = a.rua;
      if (f.numero && a.numero) f.numero.value = a.numero;
      if (f.complemento && a.complemento) f.complemento.value = a.complemento;
      if (f.bairro && a.bairro) f.bairro.value = a.bairro;
      if (f.cidade && a.cidade) f.cidade.value = a.cidade;
      if (f.uf && a.uf) f.uf.value = a.uf;
    }
  }

  function smartwatchGroup(model) {
    if (model.startsWith('Apple Watch')) return 'Apple Watch';
    if (model.startsWith('Samsung')) return 'Samsung Galaxy Watch';
    if (model.startsWith('Garmin')) return 'Garmin';
    if (model.startsWith('Huawei')) return 'Huawei';
    if (model.startsWith('Xiaomi') || model.startsWith('Redmi')) return 'Xiaomi / Redmi';
    if (model.startsWith('Amazfit')) return 'Amazfit';
    if (model.startsWith('Fitbit') || model.startsWith('Polar')) return L('watch.groupOtherBrands');
    return L('watch.groupOthers');
  }

  function populateSelects() {
    const models = cfg.smartwatchModels || [];
    const groups = new Map();
    models.forEach((m) => {
      const label = smartwatchGroup(m);
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label).push(m);
    });
    groups.forEach((items, label) => {
      const og = document.createElement('optgroup');
      og.label = label;
      items.forEach((m) => {
        const o = document.createElement('option');
        o.value = m;
        o.textContent = m === OUTRO_MODELO ? L('watch.otherModel') : m;
        og.appendChild(o);
      });
      els.smartwatchSelect.appendChild(og);
    });

    const intl = cfg.internationalShipping || {};
    Object.entries(intl).forEach(([code, z]) => {
      if (code === 'OTHER') return;
      const o = document.createElement('option');
      o.value = code; o.textContent = z.label;
      els.paisCode.appendChild(o);
    });
    const other = document.createElement('option');
    other.value = 'OTHER'; other.textContent = L('country.other');
    els.paisCode.appendChild(other);
    if (els.smartwatchSelect?.options[0]) {
      els.smartwatchSelect.options[0].textContent = L('form.watchSelect');
    }
  }

  function intlProductCopy() {
    return cfg.internationalProduct || {};
  }

  function buildIntlProductNote(shipmentType) {
    const ip = intlProductCopy();
    if (shipmentType === 'documento') return ip.documentNotice || '';
    if (shipmentType === 'encomenda') return ip.encomendaNotice || '';
    return '';
  }

  function shippingOptionNoticeHtml(shipmentType) {
    if (!isInternational || !shipmentType) return '';
    const text = buildIntlProductNote(shipmentType);
    if (!text) return '';
    const parts = text.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
    if (parts.length <= 1) {
      return `<div class="shipping-card-notice"><p>${escapeHtml(text)}</p></div>`;
    }
    const inner = parts.map((p, i) => {
      const foot = i === parts.length - 1 ? ' shipping-notice-foot' : '';
      return `<p class="shipping-notice-line${foot}">${escapeHtml(p)}</p>`;
    }).join('');
    return `<div class="shipping-card-notice">${inner}</div>`;
  }

  function isPayPalIntlAvailable() {
    const paypal = cfg.payments?.paypal || {};
    if (paypal.internationalEnabled === false) return false;
    const showAfterRaw = paypal.showAfter;
    if (!showAfterRaw) return true;
    const showAfter = Date.parse(showAfterRaw);
    if (Number.isFinite(showAfter) && Date.now() < showAfter) return false;
    return true;
  }

  function isCardBrMercadoPago() {
    return cfg.payments?.cardBr?.provider === 'mercadopago';
  }

  function updateCardBrPaymentHint() {
    const cardOpt = els.paymentOptionsBr?.querySelector('.payment-option:nth-child(2)');
    const small = cardOpt?.querySelector('small');
    if (small) {
      small.textContent = L(isCardBrMercadoPago() ? 'pay.cardBrHintMp' : 'pay.cardBrHint');
    }
  }

  function updatePaymentOptionsForCountry() {
    const paypalAvailable = isInternational && isPayPalIntlAvailable();
    if (els.paymentOptionsBr) els.paymentOptionsBr.hidden = isInternational;
    if (els.paymentOptionsIntl) els.paymentOptionsIntl.hidden = !isInternational;
    if (els.paymentNoticeBr) els.paymentNoticeBr.hidden = isInternational;
    if (els.paymentNoticeIntl) els.paymentNoticeIntl.hidden = !isInternational;
    const paypalRow = els.paymentOptionsIntl?.querySelector('.payment-option-paypal');
    if (paypalRow) paypalRow.hidden = !paypalAvailable;
    els.paymentOptionsBr?.querySelectorAll('input[name="pagamento"]').forEach((r) => {
      r.disabled = isInternational;
    });
    els.paymentOptionsIntl?.querySelectorAll('input[name="pagamento"]').forEach((r) => {
      const isPaypal = r.value === 'PAYPAL';
      r.disabled = !isInternational || (isPaypal && !paypalAvailable);
    });
    if (els.paymentNoticeIntl) {
      const noticeKey = paypalAvailable ? 'pay.noticeIntlAll' : 'pay.noticeIntlNoPaypal';
      els.paymentNoticeIntl.innerHTML = `<i class="fas fa-info-circle"></i> ${L(noticeKey)}`;
    }
    els.form?.querySelectorAll('input[name="pagamento"]').forEach((r) => { r.checked = false; });
    if (isInternational) {
      const cardIntl = els.paymentOptionsIntl?.querySelector('input[value="CARTAO"]');
      const paypal = els.paymentOptionsIntl?.querySelector('input[value="PAYPAL"]');
      const pixIntl = els.paymentOptionsIntl?.querySelector('input[value="PIX"]');
      if (cardIntl) cardIntl.checked = true;
      else if (paypalAvailable && paypal) paypal.checked = true;
      else if (pixIntl) pixIntl.checked = true;
    } else {
      const pix = els.paymentOptionsBr?.querySelector('input[value="PIX"]');
      if (pix) pix.checked = true;
    }
    updateCardBrPaymentHint();
    updateCpfLabel();
  }

  function toggleAddressForm() {
    isInternational = els.paisCode.value !== 'BR';
    els.addressBr.hidden = isInternational;
    els.addressIntl.hidden = !isInternational;
    els.summaryShippingLabel.textContent = isInternational ? L('summary.shippingIntl') : L('summary.shipping');
    updatePaymentOptionsForCountry();
    shippingCost = null;
    shippingInfo = null;
    shippingOptions = [];
    clearShippingOptions();
    updateSummary();
    if (isInternational) quoteShipping();
  }

  function clearShippingOptions() {
    if (els.shippingOptionsEl) els.shippingOptionsEl.innerHTML = '';
    if (els.shippingOptionsWrap) els.shippingOptionsWrap.hidden = true;
    if (els.shippingHint) {
      els.shippingHint.hidden = false;
      els.shippingHint.textContent = L('shipping.hint');
    }
    updateContinueButtonVisibility();
  }

  function shippingSourceLabel(source) {
    if (source === 'correios') return L('shipping.sourceCorreios');
    if (source === 'correios-export') return L('shipping.sourceExport');
    if (source === 'uber') return L('shipping.sourceUber');
    if (source === 'motoboy') return L('shipping.sourceMotoboy');
    if (source === 'config') return L('shipping.sourceConfigShort');
    return L('shipping.sourceEstimateShort');
  }

  function brAddressQuoteParams() {
    const f = els.form;
    const params = new URLSearchParams();
    const add = (key, val) => {
      const v = String(val || '').trim();
      if (v) params.set(key, v);
    };
    add('rua', f.rua?.value);
    add('numero', f.numero?.value);
    add('complemento', f.complemento?.value);
    add('bairro', f.bairro?.value);
    add('cidade', f.cidade?.value);
    add('uf', f.uf?.value);
    return params;
  }

  function selectShippingOption(option) {
    if (!option) return;
    shippingInfo = option;
    shippingCost = option.price;
    updateSummary();
    if (els.summaryShippingLabel) {
      els.summaryShippingLabel.textContent = isInternational ? L('summary.shippingIntl') : L('summary.shipping');
    }
    updateContinueButtonVisibility();
  }

  function updateContinueButtonVisibility() {
    if (!els.btnNext) return;
    const ready = shippingCost !== null && shippingInfo;
    els.btnNext.style.display = currentStep === 1 && ready ? 'inline-flex' : 'none';
  }

  function renderShippingOptions(options) {
    if (!els.shippingOptionsEl || !els.shippingOptionsWrap) return;
    shippingOptions = options || [];
    if (!shippingOptions.length) {
      clearShippingOptions();
      els.shippingHint.textContent = L('shipping.none');
      return;
    }

    els.shippingHint.hidden = true;
    els.shippingOptionsWrap.hidden = false;
    const defaultId = shippingOptions[0].id;
    els.shippingOptionsEl.innerHTML = shippingOptions.map((opt, i) => {
      const inputId = `ship-opt-${opt.id}`;
      const checked = i === 0 ? 'checked' : '';
      const src = shippingSourceLabel(opt.source);
      const tipoHint = opt.shipmentType === 'documento' ? ` · ${L('shipping.document')}` : '';
      const timeLabel = opt.source === 'uber'
        ? `~${opt.etaMinutes || 60} ${L('shipping.minutes')}`
        : opt.source === 'motoboy'
          ? L('shipping.motoboyEta', { hours: opt.deliveryHours || 24 })
          : `${opt.days} ${L('shipping.days')}`;
      const distHint = opt.source === 'motoboy' && opt.distanceKm
        ? ` · ~${opt.distanceKm} km`
        : '';
      const notice = shippingOptionNoticeHtml(opt.shipmentType);
      const uberTest = opt.source === 'uber' && opt.testMode
        ? `<div class="shipping-card-notice shipping-card-notice--warn"><p>${escapeHtml(L('shipping.uberTest'))}</p></div>`
        : '';
      return `
        <label class="shipping-option" for="${inputId}">
          <input type="radio" name="shippingOption" id="${inputId}" value="${opt.id}" ${checked}
            data-index="${i}">
          <div class="shipping-card${notice || uberTest ? ' shipping-card--with-notice' : ''}">
            <div class="shipping-card-row">
              <div class="shipping-card-main">
                <strong>${escapeHtml(opt.service)}</strong>
                <small>${timeLabel}${distHint} · ${src}${tipoHint}</small>
              </div>
              <span class="shipping-card-price">${formatBRL(opt.price)}</span>
            </div>
            ${uberTest}
            ${notice}
          </div>
        </label>
      `;
    }).join('');

    els.shippingOptionsEl.querySelectorAll('input[name="shippingOption"]').forEach((input) => {
      input.addEventListener('change', () => {
        const idx = Number(input.getAttribute('data-index'));
        selectShippingOption(shippingOptions[idx]);
      });
    });

    selectShippingOption(shippingOptions[0]);
  }

  /** Peso do pacote para frete: prioriza admin (Frete Mini Envios), não o catálogo antigo. */
  function shippingWeightGrams() {
    const shipW = Number(cfg.shipping?.weightGrams);
    if (shipW > 0) return shipW;
    const cartW = window.STF_CART?.totalWeight();
    if (cartW > 0) return cartW;
    return 5;
  }

  function estimateBRMax() {
    const baseWeight = Number(cfg.shipping?.weightGrams) || 5;
    const weightFactor = Math.min(2.5, Math.max(1, shippingWeightGrams() / baseWeight));
    const maxPrice = Number(cfg.shipping?.estimateMaxPrice) > 0 ? Number(cfg.shipping.estimateMaxPrice) : 24.9;
    const maxDays = Number(cfg.shipping?.estimateMaxDays) > 0 ? Number(cfg.shipping.estimateMaxDays) : 14;
    return {
      price: Math.round(maxPrice * weightFactor * 100) / 100,
      days: maxDays,
      service: 'Mini Envios',
      source: 'estimate'
    };
  }

  async function fetchShippingQuote(url) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      console.warn('Cotação API indisponível, usando estimativa local.', e);
      return null;
    }
  }

  async function quoteShipping() {
    shippingCost = null;
    shippingInfo = null;
    updateContinueButtonVisibility();
    const base = apiBase();
    els.shippingHint.hidden = false;
    els.shippingHint.textContent = L('shipping.calculating');
    if (els.shippingOptionsWrap) els.shippingOptionsWrap.hidden = true;

    try {
      const weight = shippingWeightGrams();
      let options = [];

      if (isInternational) {
        const code = els.paisCode.value;
        if (base) {
          const data = await fetchShippingQuote(
            `${base}/shipping/quote?country=${code}&weightGrams=${encodeURIComponent(weight)}`
          );
          options = data?.options || [];
        }
        if (!options.length) {
          const z = cfg.internationalShipping[code] || cfg.internationalShipping.OTHER;
          if (!z) throw new Error(L('country.unsupported'));
          options = [{
            id: 'config-fallback',
            methodId: 'config-fallback',
            service: `${L('shipping.intlPrefix')} ${z.label}`,
            price: z.price,
            days: z.days,
            source: 'config'
          }];
        }
      } else {
        const cep = onlyDigits(els.cep.value);
        if (cep.length !== 8) return;
        if (base) {
          const valor = cartSubtotal();
          const addr = brAddressQuoteParams();
          const data = await fetchShippingQuote(
            `${base}/shipping/quote?country=BR&cep=${cep}&weightGrams=${weight}&valor=${valor}&${addr.toString()}`
          );
          options = data?.options || [];
        }
        if (!options.length) {
          const est = estimateBRMax();
          options = [{
            id: 'estimate',
            methodId: 'estimate',
            service: est.service,
            price: est.price,
            days: est.days,
            source: 'estimate'
          }];
        }
      }

      renderShippingOptions(options);
    } catch {
      clearShippingOptions();
      shippingCost = null;
      shippingInfo = null;
      shippingOptions = [];
      els.shippingHint.textContent = L('shipping.error');
      updateSummary();
    }
  }

  function updateSummary() {
    const subtotal = cartSubtotal();
    els.summaryProduct.textContent = formatBRL(subtotal);
    els.summaryShipping.textContent = shippingCost === null ? '—' : formatBRL(shippingCost);
    els.summaryTotal.textContent = shippingCost === null ? '—' : formatBRL(subtotal + shippingCost);
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
    updateContinueButtonVisibility();
    els.btnPay.style.display = step === 2 ? 'inline-flex' : 'none';
    if (step === 3 && orderSidebarLocked) {
      renderLockedSidebar();
    }
    if (step === 2) updatePaymentOptionsForCountry();
  }

  let cepLookupTimer = null;
  let lastCepLookup = '';

  async function lookupCepFromField() {
    if (isInternational) return;
    const cep = onlyDigits(els.cep?.value || '');
    if (cep.length !== 8 || cep === lastCepLookup) return;
    els.cep?.classList.add('loading');
    try {
      const addr = await fetchCep(cep);
      lastCepLookup = cep;
      els.form.rua.value = addr.logradouro || '';
      els.form.bairro.value = addr.bairro || '';
      els.form.cidade.value = addr.localidade || '';
      els.form.uf.value = addr.uf || '';
      await quoteShipping();
      if (els.form.numero && !els.form.numero.value) els.form.numero.focus();
    } catch {
      lastCepLookup = '';
      if (els.shippingHint) {
        els.shippingHint.hidden = false;
        els.shippingHint.textContent = L('shipping.cepInvalid');
      }
    } finally {
      els.cep?.classList.remove('loading');
    }
  }

  async function fetchCep(cep) {
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const data = await res.json();
    if (data.erro) throw new Error(L('shipping.cepInvalid'));
    return data;
  }

  function collectOrderData() {
    const f = els.form;
    const paisCode = els.paisCode.value;
    const intlZones = cfg.internationalShipping || {};
    const paisLabel = paisCode === 'BR' ? 'Brasil' : (intlZones[paisCode]?.label || 'Internacional');

    let data;
    let endereco;
    if (isInternational) {
      const rua = document.getElementById('rua-intl').value.trim();
      const numero = document.getElementById('numero-intl')?.value.trim() || '';
      const cidade = document.getElementById('cidade-intl').value.trim();
      const provincia = document.getElementById('uf-intl').value.trim();
      const cep = document.getElementById('postal-intl').value.trim();
      data = {
        cep,
        rua,
        numero,
        complemento: '',
        bairro: '',
        cidade,
        uf: provincia || paisCode
      };
      const linha1 = numero ? `${rua}, ${numero}` : rua;
      const linha2 = provincia ? `${cidade}, ${provincia}` : cidade;
      endereco = `${linha1} — ${linha2} — ${paisLabel} ${cep}`;
    } else {
      data = {
        cep: f.cep.value.trim(), rua: f.rua.value.trim(), numero: f.numero.value.trim(),
        complemento: f.complemento.value.trim(), bairro: f.bairro.value.trim(),
        cidade: f.cidade.value.trim(), uf: f.uf.value.trim()
      };
      const comp = data.complemento ? `, ${data.complemento}` : '';
      endereco = `${data.rua}, ${data.numero}${comp} — ${data.bairro}, ${data.cidade}/${data.uf} — ${paisLabel} ${data.cep}`;
    }

    const payload = {
      nome: f.nome.value.trim(), email: f.email.value.trim(),
      telefone: f.telefone.value.trim(), cpf: f.cpf.value.trim(),
      smartwatch: f.smartwatch.value,
      observacoes: (f.observacoes?.value || '').trim(),
      pais: paisLabel, paisCode,
      ...data, endereco,
      frete: shippingCost,
      shippingService: shippingInfo?.service,
      shippingServiceCode: shippingInfo?.serviceCode || null,
      shippingMethodId: shippingInfo?.methodId || shippingInfo?.id || null,
      shippingProvider: shippingInfo?.source === 'uber' ? 'uber'
        : (shippingInfo?.source === 'motoboy' ? 'motoboy'
          : (shippingInfo?.source === 'correios' ? 'correios' : null)),
      uberQuoteId: shippingInfo?.uberQuoteId || null,
      shippingDays: shippingInfo?.days,
      shipmentType: shippingInfo?.shipmentType || null,
      internationalLensOnly: isInternational && shippingInfo?.shipmentType === 'documento',
      internationalProductNote: isInternational ? buildIntlProductNote(shippingInfo?.shipmentType) : '',
      pagamento: f.querySelector('[name=pagamento]:checked').value,
      items: window.STF_CART.load().map((i) => ({ productId: i.productId, qty: i.qty }))
    };
    if (isRegisterAccountMode() && els.criarConta?.checked && !getCustomerUser() && !els.accountGuestWrap?.hidden) {
      payload.criarConta = true;
      payload.senha = els.checkoutSenha?.value || '';
    }
    return payload;
  }

  function validateStep1() {
    const f = els.form;
    clearWatchFieldError();
    clearObservacoesFieldError();

    if (window.STF_CART?.isEmpty()) {
      alert(L('alert.cartEmpty')); return false;
    }
    const needsWatch = window.STF_CART?.requiresSmartwatch();
    if (!f.nome.value || !f.email.value || !f.telefone.value) {
      alert(L('alert.required')); return false;
    }
    if (!isInternational && !f.cpf.value) {
      alert(L('alert.cpf')); return false;
    }
    if (needsWatch && !f.smartwatch.value) {
      showWatchFieldError(L('alert.watch'));
      return false;
    }
    if (needsWatch && isOutroModelo(f.smartwatch.value) && !(f.observacoes?.value || '').trim()) {
      showObservacoesFieldError(L('alert.watchNotes'));
      return false;
    }
    if (isRegisterAccountMode() && els.criarConta?.checked && !getCustomerUser() && !els.accountGuestWrap?.hidden) {
      const senha = els.checkoutSenha?.value || '';
      if (senha.length < 6) {
        alert(L('alert.password'));
        return false;
      }
    }
    if (shippingCost === null || !shippingInfo) {
      alert(L('alert.shippingWait'));
      return false;
    }
    const selectedRadio = els.shippingOptionsEl?.querySelector('input[name="shippingOption"]:checked');
    if (els.shippingOptionsWrap && !els.shippingOptionsWrap.hidden && !selectedRadio) {
      alert(L('alert.shippingPick'));
      return false;
    }
    if (!isInternational) {
      if (onlyDigits(f.cep.value).length !== 8 || !f.rua.value || !f.numero.value || !f.bairro.value || !f.cidade.value || !f.uf.value) {
        alert(L('alert.addrBr')); return false;
      }
    } else {
      if (!document.getElementById('rua-intl').value || !document.getElementById('cidade-intl').value) {
        alert(L('alert.addrIntl')); return false;
      }
    }
    return true;
  }

  async function createOrder(orderData) {
    const base = apiBase();
    if (base) {
      const headers = { 'Content-Type': 'application/json' };
      const token = customerToken();
      if (token) headers.Authorization = 'Bearer ' + token;
      const res = await fetch(base + '/orders', {
        method: 'POST',
        headers,
        body: JSON.stringify(orderData)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || L('alert.orderError'));
      }
      return res.json();
    }

    const orderId = generateOrderId();
    const body = new FormData();
    body.append('_subject', cfg.formsubmit.subject);
    body.append('_captcha', 'false');
    body.append('_template', 'table');
    const subtotal = cartSubtotal();
    const watchFields = {
      Pedido: orderId,
      Nome: orderData.nome,
      Smartwatch: orderData.smartwatch,
      Total: formatBRL(subtotal + orderData.frete),
      Endereço: orderData.endereco
    };
    if (orderData.smartwatch && orderData.smartwatch !== 'N/A') {
      watchFields['Modelo do relógio'] = window.STF_ORDER_WATCH?.formatModel(orderData) || orderData.smartwatch;
    }
    if (orderData.observacoes) watchFields.Observações = orderData.observacoes;
    Object.entries(watchFields).forEach(([k, v]) => body.append(k, v));
    await fetch(`https://formsubmit.co/ajax/${cfg.formsubmit.email}`, { method: 'POST', body, headers: { Accept: 'application/json' } });
    return { order: { ...orderData, orderId, total: subtotal + orderData.frete }, payment: { provider: 'static_pix', billingType: 'PIX' } };
  }

  function showPixUi() {
    if (els.pixUi) els.pixUi.hidden = false;
    if (els.cardUi) els.cardUi.hidden = true;
    if (els.paypalUi) els.paypalUi.hidden = true;
    els.paymentPanel?.classList.remove('mode-card', 'mode-paypal');
    els.paymentPanel?.classList.add('mode-pix');
  }

  function showCardUi() {
    if (els.pixUi) els.pixUi.hidden = true;
    if (els.cardUi) els.cardUi.hidden = false;
    if (els.paypalUi) els.paypalUi.hidden = true;
    els.paymentPanel?.classList.remove('mode-pix', 'mode-paypal');
    els.paymentPanel?.classList.add('mode-card');
  }

  function showPayPalUi(url) {
    if (els.pixUi) els.pixUi.hidden = true;
    if (els.cardUi) els.cardUi.hidden = true;
    if (els.paypalUi) els.paypalUi.hidden = false;
    els.paymentPanel?.classList.remove('mode-pix', 'mode-card');
    els.paymentPanel?.classList.add('mode-paypal');
    if (els.paypalPayLink && url) els.paypalPayLink.href = url;
  }

  function renderPix(orderId, total, payment) {
    showPixUi();
    els.pixQr.innerHTML = '';

    if (payment.pixQrEncoded) {
      const img = document.createElement('img');
      img.src = 'data:image/png;base64,' + payment.pixQrEncoded;
      img.width = 220; img.height = 220;
      els.pixQr.appendChild(img);
      els.pixCopy.value = payment.pixCopyPaste || '';
    } else {
      const payload = PixGenerator.generatePixPayload({
        key: cfg.pix.key, keyType: cfg.pix.keyType,
        merchantName: cfg.pix.merchantName, merchantCity: cfg.pix.merchantCity,
        amount: total, txid: orderId
      });
      new QRCode(els.pixQr, { text: payload, width: 220, height: 220, correctLevel: QRCode.CorrectLevel.M });
      els.pixCopy.value = payload;
    }
  }

  function showCardPayment(url, intlMp) {
    showCardUi();
    els.pixQr.innerHTML = '';
    if (els.cardPayLink && url) els.cardPayLink.href = url;
    if (els.cardPayText) {
      els.cardPayText.textContent = intlMp ? L('card.mp') : L('card.asaas');
    }
    els.confirmTitle.textContent = intlMp ? L('title.orderCard') : L('title.orderRegistered');
    els.confirmHint.textContent = intlMp ? L('hint.mpReturn') : L('confirm.hint');
  }

  let lastPaymentMethod = 'PIX';

  function trackGa(event, params) {
    window.STF_ANALYTICS?.track(event, params);
  }

  function startPolling(orderId, accessToken, total) {
    const base = apiBase();
    if (!base || !accessToken) return;
    pollTimer = setInterval(async () => {
      try {
        const url = `${base}/orders/${encodeURIComponent(orderId)}?token=${encodeURIComponent(accessToken)}`;
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) return;
        const order = await res.json();
        if (order.status === 'paid') {
          clearInterval(pollTimer);
          els.paymentStatus.className = 'payment-status confirmed';
          els.paymentStatus.innerHTML = `<i class="fas fa-check-circle"></i> ${L('status.paid')}`;
          els.confirmTitle.textContent = L('title.paid');
          window.STF_ANALYTICS?.trackPurchase(orderId, total || order.total, lastPaymentMethod);
        }
      } catch (e) { console.warn(e); }
    }, 3000);
  }

  async function processPayment() {
    const pagamento = els.form.querySelector('[name=pagamento]:checked')?.value;
    if (isInternational && pagamento === 'PIX' && !els.form.cpf.value.trim()) {
      alert(L('alert.pixIntlCpf'));
      return;
    }
    els.btnPay.disabled = true;
    setPayBtnLabel('btn.processing');
    try {
      const orderData = collectOrderData();
      const wantsIntlCard = isInternational && orderData.pagamento === 'CARTAO';
      const wantsCardBr = !isInternational && orderData.pagamento === 'CARTAO';
      const wantsPaypal = orderData.pagamento === 'PAYPAL';
      lastPaymentMethod = wantsPaypal ? 'paypal' : ((wantsCardBr || wantsIntlCard) ? 'credit_card' : 'pix');
      const result = await createOrder(orderData);
      const total = result.order?.total || (cartSubtotal() + orderData.frete);
      const orderSnapshot = {
        items: (window.STF_CART?.load() || []).map((i) => ({ ...i })),
        subtotal: cartSubtotal(),
        frete: orderData.frete,
        total
      };
      lockCheckoutSidebar(orderSnapshot);
      const orderId = result.order?.orderId;
      const accessToken = result.accessToken;
      const payment = result.payment || {};
      if (!orderId) throw new Error(L('alert.orderInvalid'));
      if (result.customerToken && window.STF_ACCOUNT) {
        const u = getCustomerUser() || { nome: orderData.nome, email: orderData.email };
        window.STF_ACCOUNT.setSession(result.customerToken, u);
        renderCheckoutAccountUI();
        window.STF_ACCOUNT.initNav();
      }

      els.pixAmount.textContent = formatBRL(total);
      els.orderId.textContent = orderId;
      els.paymentStatus.hidden = false;
      els.paymentStatus.className = 'payment-status waiting';

      if (wantsPaypal) {
        if (payment.billingType !== 'PAYPAL' || !payment.approveUrl) {
          throw new Error(L('alert.paypalUnavailable'));
        }
        showPayPalUi(payment.approveUrl);
        els.confirmTitle.textContent = L('title.orderPaypal');
        els.confirmHint.textContent = L('hint.paypalReturn');
        els.paymentStatus.innerHTML =
          `<i class="fas fa-spinner fa-spin"></i> ${L('status.redirectPaypal')}`;
        showStep(3);
        window.location.href = payment.approveUrl;
        return;
      } else if (wantsIntlCard) {
        const mpUrl = payment.approveUrl || payment.invoiceUrl;
        if (payment.billingType !== 'MP_CHECKOUT' || !mpUrl) {
          throw new Error(L('alert.intlCardUnavailable'));
        }
        showCardPayment(mpUrl, true);
        els.confirmTitle.textContent = L('title.orderCard');
        els.confirmHint.textContent = L('hint.mpReturn');
        els.paymentStatus.innerHTML =
          `<i class="fas fa-spinner fa-spin"></i> ${L('status.redirectMp')}`;
        showStep(3);
        window.location.href = mpUrl;
        return;
      } else if (wantsCardBr) {
        const mpUrl = payment.approveUrl || payment.invoiceUrl;
        if (payment.billingType === 'MP_CHECKOUT' && mpUrl) {
          showCardPayment(mpUrl, true);
          els.confirmTitle.textContent = L('title.orderCard');
          els.confirmHint.textContent = L('hint.mpReturn');
          els.paymentStatus.innerHTML =
            `<i class="fas fa-spinner fa-spin"></i> ${L('status.redirectMp')}`;
          showStep(3);
          window.location.href = mpUrl;
          return;
        }
        if (payment.billingType !== 'CREDIT_CARD' || !payment.invoiceUrl) {
          throw new Error(L('alert.cardBrUnavailable'));
        }
        showCardPayment(payment.invoiceUrl, false);
        els.paymentStatus.innerHTML =
          `<i class="fas fa-spinner fa-spin"></i> ${L('status.cardWindow')}`;
        try { window.open(payment.invoiceUrl, '_blank', 'noopener,noreferrer'); } catch (_) { /* link visível no botão */ }
      } else {
        renderPix(orderId, total, payment);
        if (payment.autoConfirm) {
          els.paymentStatus.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${L('status.waitPix')}`;
        } else {
          const wa = (cfg.whatsapp || '5511913394665').replace(/\D/g, '');
          const waText = encodeURIComponent(L('status.pixWhatsappText', { id: orderId, total: formatBRL(total) }));
          els.paymentStatus.innerHTML =
            `<p><strong>${L('status.pixRegistered', { id: orderId })}</strong></p>` +
            `<p>${L('status.pixManualHint')}</p>` +
            `<p><a class="btn-whatsapp-proof" href="https://wa.me/${wa}?text=${waText}" target="_blank" rel="noopener">` +
            `<i class="fab fa-whatsapp"></i> ${L('status.pixWhatsapp')}</a></p>` +
            `<p class="payment-hint-small">${L('status.pixManualConfirm')}</p>`;
        }
      }

      trackGa('pedido_criado', {
        pedido: orderId,
        valor: total,
        moeda: 'BRL',
        pagamento: lastPaymentMethod === 'paypal' ? 'paypal' : (lastPaymentMethod === 'credit_card' ? 'cartao' : 'pix')
      });

      if (accessToken) startPolling(orderId, accessToken, total);
      showStep(3);
    } catch (err) {
      await restoreCheckoutAfterPaymentAbort();
      alert(err.message || L('alert.orderError'));
    } finally {
      els.btnPay.disabled = false;
      setPayBtnLabel('btn.pay');
    }
  }

  function bindPasswordToggles() {
    document.querySelectorAll('.checkout-password-toggle').forEach((btn) => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', () => {
        const input = btn.closest('.checkout-password-wrap')?.querySelector('input');
        if (!input) return;
        const show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        btn.setAttribute('aria-pressed', show ? 'true' : 'false');
        const icon = btn.querySelector('i');
        if (icon) {
          icon.classList.toggle('fa-eye', !show);
          icon.classList.toggle('fa-eye-slash', show);
        }
        btn.setAttribute('aria-label', L(show ? 'account.hidePassword' : 'account.showPassword'));
      });
    });
  }

  function bindEvents() {
    bindPasswordToggles();
    els.paisCode.addEventListener('change', toggleAddressForm);
    els.smartwatchSelect?.addEventListener('change', () => {
      clearWatchFieldError();
      updateObservacoesField();
      updateSensorWarn();
      renderPeliculaUpsell();
    });
    els.observacoes?.addEventListener('input', clearObservacoesFieldError);
    els.cep?.addEventListener('input', (e) => {
      e.target.value = maskCep(e.target.value);
      const cep = onlyDigits(e.target.value);
      if (cep.length < 8) lastCepLookup = '';
      if (cep.length === 8) {
        clearTimeout(cepLookupTimer);
        cepLookupTimer = setTimeout(() => lookupCepFromField(), 350);
      }
    });
    els.cep?.addEventListener('blur', () => lookupCepFromField());

    els.form.telefone?.addEventListener('input', (e) => { e.target.value = maskPhone(e.target.value); });
    els.form.cpf?.addEventListener('input', (e) => { if (!isInternational) e.target.value = maskCpf(e.target.value); });

    ['rua', 'numero', 'complemento', 'bairro', 'cidade', 'uf'].forEach((field) => {
      els.form[field]?.addEventListener('blur', () => {
        if (isInternational) return;
        const cep = onlyDigits(els.cep?.value);
        if (cep.length === 8) quoteShipping();
      });
    });

    ['postal-intl','rua-intl','cidade-intl'].forEach((id) => {
      document.getElementById(id)?.addEventListener('blur', () => { if (isInternational) quoteShipping(); });
    });

    els.btnNext?.addEventListener('click', () => { if (validateStep1()) showStep(2); });
    els.btnBack?.addEventListener('click', () => showStep(1));
    els.btnPay?.addEventListener('click', processPayment);

    if (els.senhaWrap && els.criarConta) {
      els.senhaWrap.hidden = !els.criarConta.checked;
      els.criarConta.addEventListener('change', () => {
        els.senhaWrap.hidden = !els.criarConta.checked;
      });
    }

    document.querySelectorAll('[data-checkout-account-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        setCheckoutAccountTab(btn.getAttribute('data-checkout-account-tab'));
      });
    });
    els.btnCheckoutLogin?.addEventListener('click', checkoutLogin);
    window.addEventListener('stf-account-changed', () => renderCheckoutAccountUI());

    document.getElementById('btn-copy-pix')?.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(els.pixCopy.value); }
      catch { els.pixCopy.select(); document.execCommand('copy'); }
    });
  }

  async function handleMercadoPagoReturn() {
    const params = new URLSearchParams(location.search);
    const mpState = params.get('mp');
    if (!mpState) return false;

    if (mpState === 'failure') {
      alert(L('alert.mpFail'));
      history.replaceState({}, '', location.pathname);
      return true;
    }

    const orderId = params.get('orderId');
    const accessToken = params.get('accessToken');
    if (!orderId || !accessToken) return false;

    els.orderId.textContent = orderId;
    els.paymentStatus.hidden = false;
    lastPaymentMethod = 'credit_card';

    if (mpState === 'success' || params.get('collection_status') === 'approved') {
      els.paymentStatus.className = 'payment-status waiting';
      els.paymentStatus.innerHTML =
        `<i class="fas fa-spinner fa-spin"></i> ${L('status.confirmMp')}`;
    } else {
      els.paymentStatus.className = 'payment-status waiting';
      els.paymentStatus.innerHTML =
        `<i class="fas fa-spinner fa-spin"></i> ${L('status.pendingMp')}`;
    }

    showCardPayment('#', true);
    els.confirmTitle.textContent = mpState === 'success' ? L('title.mpReceived') : L('title.mpProcessing');
    window.STF_CART?.clear();
    window.STF_CART?.initBadges?.();
    try {
      const res = await fetch(
        `${apiBase()}/orders/${encodeURIComponent(orderId)}?token=${encodeURIComponent(accessToken)}`,
        { cache: 'no-store' }
      );
      if (res.ok) {
        const data = await res.json();
        els.pixAmount.textContent = formatBRL(data.total);
        lockCheckoutSidebar(snapshotFromOrder(data));
      } else {
        lockCheckoutSidebar({ produto: orderId, total: 0 });
      }
    } catch {
      lockCheckoutSidebar({ produto: orderId, total: 0 });
    }
    showStep(3);
    startPolling(orderId, accessToken);
    history.replaceState({}, '', location.pathname);
    return true;
  }

  async function handlePayPalReturn() {
    const params = new URLSearchParams(location.search);
    const paypalState = params.get('paypal');
    if (!paypalState) return false;

    const orderId = params.get('orderId');
    const accessToken = params.get('accessToken');

    if (paypalState === 'cancel') {
      history.replaceState({}, '', location.pathname);
      const restored = await restoreCheckoutAfterPaymentAbort(orderId, accessToken);
      alert(restored ? L('alert.paypalCancelRetry') : L('alert.paypalCancel'));
      return restored;
    }
    if (paypalState !== 'success') return false;

    const paypalOrderId = params.get('token');
    if (!orderId || !accessToken || !paypalOrderId) return false;

    const base = apiBase();
    if (!base) return false;

    try {
      showStep(3);
      els.paymentStatus.hidden = false;
      els.paymentStatus.className = 'payment-status waiting';
      els.paymentStatus.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${L('status.confirmPaypal')}`;

      const res = await fetch(`${base}/orders/${encodeURIComponent(orderId)}/paypal/capture`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken, paypalOrderId })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || L('alert.paypalConfirmFail'));

      els.orderId.textContent = orderId;
      els.pixAmount.textContent = formatBRL(data.order?.total || 0);
      lastPaymentMethod = 'paypal';

      if (data.status === 'paid' || data.order?.status === 'paid') {
        els.paymentStatus.className = 'payment-status confirmed';
        els.paymentStatus.innerHTML = `<i class="fas fa-check-circle"></i> ${L('status.paypalOk')}`;
        els.confirmTitle.textContent = L('title.paid');
        window.STF_ANALYTICS?.trackPurchase(orderId, data.order?.total, 'paypal');
      } else {
        els.paymentStatus.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${L('status.waitPaypal')}`;
        startPolling(orderId, accessToken, data.order?.total);
      }

      if (data.order) lockCheckoutSidebar(snapshotFromOrder(data.order));
      else lockCheckoutSidebar({ produto: orderId, total: data.order?.total || 0 });

      history.replaceState({}, '', location.pathname);
      return true;
    } catch (err) {
      history.replaceState({}, '', location.pathname);
      const restored = await restoreCheckoutAfterPaymentAbort(orderId, accessToken);
      alert(restored ? `${err.message || L('alert.paypalConfirmError')}\n\n${L('alert.paypalCancelRetry')}` : (err.message || L('alert.paypalConfirmError')));
      return restored;
    }
  }

  async function resumeOrderFromUrl() {
    const params = new URLSearchParams(location.search);
    const pedido = params.get('pedido');
    const token = params.get('token');
    if (!pedido || !token) return false;

    const base = apiBase();
    if (!base) return false;

    try {
      const res = await fetch(
        `${base}/orders/${encodeURIComponent(pedido)}?token=${encodeURIComponent(token)}`,
        { cache: 'no-store' }
      );
      if (!res.ok) return false;
      const data = await res.json();
      if (!data?.orderId) return false;

      els.orderId.textContent = data.orderId;
      els.pixAmount.textContent = formatBRL(data.total);
      els.paymentStatus.hidden = false;

      if (data.status === 'paid') {
        els.paymentStatus.className = 'payment-status confirmed';
        els.paymentStatus.innerHTML = `<i class="fas fa-check-circle"></i> ${L('status.paidAlready')}`;
        els.confirmTitle.textContent = L('title.paid');
        lockCheckoutSidebar(snapshotFromOrder(data));
        showStep(3);
        history.replaceState({}, '', location.pathname);
        return true;
      }

      if (data.status !== 'pending_payment') return false;

      const payment = data.payment || {};
      lastPaymentMethod = payment.billingType === 'PAYPAL' ? 'paypal'
        : (payment.billingType === 'CREDIT_CARD' || payment.billingType === 'MP_CHECKOUT' ? 'credit_card' : 'pix');

      if (payment.billingType === 'PAYPAL' && payment.approveUrl) {
        showPayPalUi(payment.approveUrl);
        els.paymentStatus.className = 'payment-status waiting';
        els.paymentStatus.innerHTML =
          `<i class="fas fa-spinner fa-spin"></i> ${L('status.paypalBtn')}`;
      } else if (payment.billingType === 'MP_CHECKOUT' && (payment.approveUrl || payment.invoiceUrl)) {
        showCardPayment(payment.approveUrl || payment.invoiceUrl, true);
        els.paymentStatus.className = 'payment-status waiting';
        els.paymentStatus.innerHTML =
          `<i class="fas fa-spinner fa-spin"></i> ${L('status.cardMpLink')}`;
      } else if (payment.billingType === 'CREDIT_CARD' && payment.invoiceUrl) {
        showCardPayment(payment.invoiceUrl, false);
        els.paymentStatus.className = 'payment-status waiting';
        els.paymentStatus.innerHTML =
          `<i class="fas fa-spinner fa-spin"></i> ${L('status.cardLink')}`;
      } else {
        renderPix(data.orderId, data.total, payment);
        els.paymentStatus.className = 'payment-status waiting';
        els.paymentStatus.innerHTML = payment.autoConfirm
          ? `<i class="fas fa-spinner fa-spin"></i> ${L('status.waitPix')}`
          : `<p>${L('status.waitPixManual')}</p>`;
      }

      startPolling(data.orderId, token, data.total);
      lockCheckoutSidebar(snapshotFromOrder(data));
      window.STF_CART?.clear();
      window.STF_CART?.initBadges?.();
      showStep(3);
      history.replaceState({}, '', location.pathname);
      return true;
    } catch (e) {
      console.warn('Retomar pedido:', e);
      return false;
    }
  }

  async function boot() {
    window.STF_I18N?.applyCheckoutDom?.();
    cfg = await StoreConfig.load();
      products = cfg.products?.length ? cfg.products : (cfg.product ? [cfg.product] : []);
      window.STF_CART?.syncPrices?.(products);
      populateSelects();
    window.STF_CART?.initBadges();
    const mpDone = await handleMercadoPagoReturn();
    const paypalDone = mpDone ? false : await handlePayPalReturn();
    const resumed = mpDone || paypalDone || await resumeOrderFromUrl();
    if (!resumed) {
      seedCartFromUrl();
      if (window.STF_CART?.isEmpty()) {
        window.location.replace(lojaHref());
        return;
      }
      renderCartSidebar();
      updateSummary();
      updatePaymentOptionsForCountry();
      showStep(1);
    }
    await loadCustomerSession();
    window.addEventListener('stf-account-changed', () => renderCheckoutAccountUI());
    bindEvents();
    trackGa('entrou_loja', {
      valor_produto: cartSubtotal() || cfg.product?.price || 62.9,
      moeda: 'BRL'
    });
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
