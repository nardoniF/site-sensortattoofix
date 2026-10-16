/**
 * Guard: Stripe intl must charge in order.chargeCurrency (PLN/SEK/…), never fall back to BRL.
 * Mirrors stripeOrderCharge abroad branch (worker.js).
 */
import test from 'node:test';
import assert from 'node:assert/strict';

function stripeOrderChargeSim(order, { isCom = true } = {}) {
  const chargeCur = String(order.chargeCurrency || '').toUpperCase();
  const abroad = (order.paisCode && order.paisCode !== 'BR')
    || isCom
    || (chargeCur && chargeCur !== 'BRL');
  if (abroad && chargeCur && chargeCur !== 'BRL') {
    const amt = Number(order.chargeAmount);
    if (!Number.isFinite(amt) || amt <= 0) return null;
    return {
      amountCents: Math.max(50, Math.round(amt * 100)),
      currency: chargeCur.toLowerCase(),
      amountUsd: amt
    };
  }
  if (abroad && isCom) {
    const amt = Number(order.chargeAmount);
    return {
      amountCents: Math.max(50, Math.round(amt * 100)),
      currency: 'usd',
      amountUsd: amt
    };
  }
  return {
    amountCents: Math.max(50, Math.round(Number(order.total) * 100)),
    currency: 'brl',
    amountUsd: null
  };
}

test('Poland Stripe uses PLN cents, not BRL', () => {
  const c = stripeOrderChargeSim({
    chargeCurrency: 'PLN',
    chargeAmount: 123.24,
    total: 100.45,
    paisCode: 'PL'
  });
  assert.equal(c.currency, 'pln');
  assert.equal(c.amountCents, 12324);
});

test('Sweden Stripe uses SEK, not BRL', () => {
  const c = stripeOrderChargeSim({
    chargeCurrency: 'SEK',
    chargeAmount: 297.76,
    total: 80,
    paisCode: 'SE'
  });
  assert.equal(c.currency, 'sek');
  assert.equal(c.amountCents, 29776);
});

test('France Stripe uses EUR', () => {
  const c = stripeOrderChargeSim({
    chargeCurrency: 'EUR',
    chargeAmount: 28.11,
    total: 100,
    paisCode: 'FR'
  });
  assert.equal(c.currency, 'eur');
  assert.equal(c.amountCents, 2811);
});

test('Brazil Stripe stays BRL', () => {
  const c = stripeOrderChargeSim({
    chargeCurrency: 'BRL',
    chargeAmount: null,
    total: 82.85,
    paisCode: 'BR'
  }, { isCom: false });
  assert.equal(c.currency, 'brl');
  assert.equal(c.amountCents, 8285);
});
