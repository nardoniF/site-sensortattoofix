/**
 * Autocomplete de endereço internacional no checkout.
 * Usa a API /address/suggest (Photon grátis; Google Places se GOOGLE_PLACES_API_KEY no Worker).
 */
window.STF_ADDRESS_AUTOCOMPLETE = (function () {
  let apiBase = '';
  let listEl = null;
  let debounceTimer = null;
  let activeIndex = -1;
  let lastSuggestions = [];
  let boundInput = null;

  function streetInput() {
    return document.getElementById('rua-intl');
  }

  function countryCode() {
    const sel = document.getElementById('pais-code');
    const code = String(sel?.value || '').toUpperCase();
    if (!code || code === 'BR') return '';
    return code;
  }

  function field(id) {
    return document.getElementById(id);
  }

  function resolveApiBase(config) {
    return String(config?.api?.baseUrl || window.CONFIG_BOOTSTRAP?.configApiUrl || '').replace(/\/$/, '');
  }

  function ensureList(input) {
    if (listEl?.parentElement) return listEl;
    const wrap = input.closest('label') || input.parentElement;
    if (!wrap) return null;
    wrap.classList.add('stf-address-suggest-wrap');
    listEl = document.createElement('ul');
    listEl.className = 'stf-address-suggest';
    listEl.hidden = true;
    listEl.setAttribute('role', 'listbox');
    wrap.appendChild(listEl);
    return listEl;
  }

  function hideList() {
    if (!listEl) return;
    listEl.hidden = true;
    listEl.innerHTML = '';
    activeIndex = -1;
    lastSuggestions = [];
  }

  function fillFromSuggestion(item) {
    const rua = field('rua-intl');
    const cidade = field('cidade-intl');
    const uf = field('uf-intl');
    const postalEl = field('postal-intl');
    const numero = field('numero-intl');

    if (rua && item.street) rua.value = item.street;
    if (cidade && item.city) cidade.value = item.city;
    if (uf && item.state) uf.value = item.state;
    if (postalEl && item.postal) postalEl.value = item.postal;
    if (numero && item.number && !numero.value) numero.value = item.number;

    hideList();
    rua?.dispatchEvent(new Event('input', { bubbles: true }));
    cidade?.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function renderSuggestions(items) {
    const input = streetInput();
    const list = ensureList(input);
    if (!list) return;
    lastSuggestions = items;
    list.innerHTML = '';
    if (!items.length) {
      hideList();
      return;
    }
    items.forEach((item, idx) => {
      const li = document.createElement('li');
      li.className = 'stf-address-suggest-item';
      li.setAttribute('role', 'option');
      li.textContent = item.label;
      li.addEventListener('mousedown', (e) => {
        e.preventDefault();
        fillFromSuggestion(item);
      });
      li.addEventListener('mouseenter', () => {
        activeIndex = idx;
        list.querySelectorAll('.stf-address-suggest-item').forEach((el, i) => {
          el.classList.toggle('is-active', i === idx);
        });
      });
      list.appendChild(li);
    });
    list.hidden = false;
    activeIndex = -1;
  }

  async function fetchSuggestions(query) {
    const cc = countryCode();
    if (!apiBase || !cc || query.length < 3) {
      hideList();
      return;
    }
    try {
      const params = new URLSearchParams({ q: query, country: cc });
      const res = await fetch(`${apiBase}/address/suggest?${params}`, { cache: 'no-store' });
      if (!res.ok) return hideList();
      const data = await res.json();
      renderSuggestions(data.suggestions || []);
    } catch {
      hideList();
    }
  }

  function onInput() {
    const input = streetInput();
    if (!input) return;
    clearTimeout(debounceTimer);
    const q = input.value.trim();
    if (q.length < 3) {
      hideList();
      return;
    }
    debounceTimer = setTimeout(() => fetchSuggestions(q), 280);
  }

  function onKeydown(e) {
    if (!listEl || listEl.hidden || !lastSuggestions.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIndex = Math.min(activeIndex + 1, lastSuggestions.length - 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      fillFromSuggestion(lastSuggestions[activeIndex]);
      return;
    } else if (e.key === 'Escape') {
      hideList();
      return;
    } else {
      return;
    }
    listEl.querySelectorAll('.stf-address-suggest-item').forEach((el, i) => {
      el.classList.toggle('is-active', i === activeIndex);
    });
  }

  function unbind() {
    if (!boundInput) return;
    boundInput.removeEventListener('input', onInput);
    boundInput.removeEventListener('keydown', onKeydown);
    boundInput.removeEventListener('blur', hideList);
    boundInput = null;
    hideList();
  }

  function bind() {
    const input = streetInput();
    if (!input) return;
    const cc = countryCode();
    if (!cc) {
      unbind();
      return;
    }
    if (boundInput === input) return;
    unbind();
    boundInput = input;
    input.setAttribute('autocomplete', 'off');
    input.addEventListener('input', onInput);
    input.addEventListener('keydown', onKeydown);
    input.addEventListener('blur', () => setTimeout(hideList, 180));
  }

  function init(config) {
    apiBase = resolveApiBase(config);
    bind();
  }

  window.addEventListener('stf-config-ready', (e) => init(e.detail));
  if (window.CHECKOUT_CONFIG?._loaded) init(window.CHECKOUT_CONFIG);

  return { init, rebind: bind };
})();
