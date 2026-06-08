(function () {
  const PURCHASE_KEY = 'stf_ga_purchase_sent';

  function canTrack() {
    return typeof window.gtag === 'function';
  }

  function track(event, params) {
    if (!canTrack()) return;
    window.gtag('event', event, params || {});
  }

  function trackPurchase(orderId, total, paymentMethod) {
    if (!orderId || !canTrack()) return;
    const sentKey = PURCHASE_KEY + ':' + orderId;
    if (sessionStorage.getItem(sentKey)) return;
    sessionStorage.setItem(sentKey, '1');

    const params = {
      transaction_id: orderId,
      value: Number(total) || 0,
      currency: 'BRL',
      payment_type: paymentMethod || 'unknown',
      items: [{
        item_id: 'kit-sensor-tattoo-fix',
        item_name: 'Kit Sensor Tattoo Fix',
        price: Number(total) || 0,
        quantity: 1
      }]
    };
    track('purchase', params);
    track('stf_compra', params);
  }

  window.STF_ANALYTICS = { track, trackPurchase };
})();
