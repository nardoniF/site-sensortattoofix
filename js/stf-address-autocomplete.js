/**
 * Google Places Autocomplete para endereço internacional no checkout.
 * Ativo apenas com integrations.googlePlaces.apiKey na config pública.
 */
window.STF_ADDRESS_AUTOCOMPLETE = (function () {
  let apiKey = '';
  let autocomplete = null;
  let loadPromise = null;

  function streetInput() {
    return document.getElementById('rua-intl');
  }

  function countryCode() {
    const sel = document.getElementById('pais-code');
    const code = String(sel?.value || '').toUpperCase();
    if (!code || code === 'BR' || code === 'OTHER') return '';
    return code.toLowerCase();
  }

  function field(id) {
    return document.getElementById(id);
  }

  function component(components, type) {
    return components?.find((c) => c.types?.includes(type));
  }

  function shortName(components, type) {
    return component(components, type)?.short_name || '';
  }

  function longName(components, type) {
    return component(components, type)?.long_name || '';
  }

  function fillFromPlace(place) {
    const comps = place.address_components || [];
    const streetNum = shortName(comps, 'street_number');
    const route = longName(comps, 'route');
    const street = [route, streetNum].filter(Boolean).join(streetNum ? ', ' : '') || place.name || '';
    const city = longName(comps, 'locality')
      || longName(comps, 'postal_town')
      || longName(comps, 'administrative_area_level_2');
    const state = shortName(comps, 'administrative_area_level_1');
    const postal = shortName(comps, 'postal_code');

    const rua = field('rua-intl');
    const cidade = field('cidade-intl');
    const uf = field('uf-intl');
    const postalEl = field('postal-intl');
    const numero = field('numero-intl');

    if (rua && street) rua.value = street;
    if (cidade && city) cidade.value = city;
    if (uf && state) uf.value = state;
    if (postalEl && postal) postalEl.value = postal;
    if (numero && streetNum && !numero.value) numero.value = streetNum;

    rua?.dispatchEvent(new Event('input', { bubbles: true }));
    cidade?.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function loadMaps(key) {
    if (window.google?.maps?.places) return Promise.resolve();
    if (loadPromise) return loadPromise;
    loadPromise = new Promise((resolve, reject) => {
      const cb = '__stfPlacesInit';
      window[cb] = () => {
        delete window[cb];
        resolve();
      };
      const s = document.createElement('script');
      const lang = (document.documentElement.lang || 'en').slice(0, 2);
      s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places&language=${encodeURIComponent(lang)}&callback=${cb}`;
      s.async = true;
      s.onerror = () => reject(new Error('Google Maps failed to load'));
      document.head.appendChild(s);
    });
    return loadPromise;
  }

  function destroyAutocomplete() {
    if (autocomplete && window.google?.maps?.event) {
      window.google.maps.event.clearInstanceListeners(autocomplete);
    }
    autocomplete = null;
  }

  async function bind() {
    const input = streetInput();
    if (!input || !apiKey) return;
    const cc = countryCode();
    if (!cc) {
      destroyAutocomplete();
      return;
    }
    try {
      await loadMaps(apiKey);
      destroyAutocomplete();
      autocomplete = new window.google.maps.places.Autocomplete(input, {
        componentRestrictions: { country: cc },
        fields: ['address_components', 'name', 'formatted_address'],
        types: ['address']
      });
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place) fillFromPlace(place);
      });
    } catch (e) {
      console.warn('Places autocomplete:', e);
    }
  }

  function init(config) {
    apiKey = String(config?.integrations?.googlePlaces?.apiKey || '').trim();
    if (!apiKey) return;
    bind();
  }

  window.addEventListener('stf-config-ready', (e) => init(e.detail));
  if (window.CHECKOUT_CONFIG?._loaded) init(window.CHECKOUT_CONFIG);

  return { init, rebind: bind };
})();
