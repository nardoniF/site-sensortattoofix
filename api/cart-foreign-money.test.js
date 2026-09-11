/**
 * Mirrors checkout cartForeignMoneyParts / cart-total math:
 * product lines use list prices; shipping uses raw FX on BRL.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

function cartParts(items, currency = 'USD') {
  let brlProduct = 0;
  let foreignProduct = 0;
  for (const item of items) {
    const qty = Math.max(1, Number(item.qty) || 1);
    const unitBrl = Number(item.price) || 0;
    const field = 'price' + currency[0] + currency.slice(1).toLowerCase();
    const unitF = Number(item[field]);
    brlProduct += unitBrl * qty;
    if (Number.isFinite(unitF) && unitF > 0) foreignProduct += unitF * qty;
  }
  return {
    brlProduct: Math.round(brlProduct * 100) / 100,
    foreignProduct: Math.round(foreignProduct * 100) / 100
  };
}

function formatCartTotal(brlTotal, shipBrl, parts, fxRate) {
  const productBrl = Math.max(0, brlTotal - shipBrl);
  const foreignProd = parts.foreignProduct * (parts.brlProduct > 0 ? productBrl / parts.brlProduct : 0);
  const foreignShip = Math.round(shipBrl * fxRate * 100) / 100;
  return Math.round((foreignProd + foreignShip) * 100) / 100;
}

test('bug repro: list $25.60 must not collapse to raw FX $14.22 on subtotal', () => {
  const fx = 0.19508; // ~Frankfurter BRL→USD
  const item = { price: 72.9, priceUsd: 25.6, qty: 1 };
  const parts = cartParts([item]);
  assert.equal(parts.brlProduct, 72.9);
  assert.equal(parts.foreignProduct, 25.6);

  const rawFxSubtotal = Math.round(72.9 * fx * 100) / 100;
  assert.equal(rawFxSubtotal, 14.22);
  assert.notEqual(parts.foreignProduct, rawFxSubtotal);

  const shipBrl = 26.04; // ~$5.08 at this FX
  const foreignShip = Math.round(shipBrl * fx * 100) / 100;
  assert.equal(foreignShip, 5.08);

  const total = formatCartTotal(72.9 + shipBrl, shipBrl, parts, fx);
  assert.equal(total, 30.68); // 25.60 + 5.08 — not 19.30
  assert.notEqual(total, 14.22 + 5.08);
});

test('cart-total scales discount on list basis', () => {
  const parts = cartParts([{ price: 72.9, priceUsd: 25.6, qty: 1 }]);
  const fx = 0.19508;
  const shipBrl = 26.04;
  const discBrl = 7.29; // 10%
  const after = 72.9 - discBrl;
  const total = formatCartTotal(after + shipBrl, shipBrl, parts, fx);
  const expectedProd = Math.round(25.6 * (after / 72.9) * 100) / 100;
  const expectedShip = Math.round(shipBrl * fx * 100) / 100;
  assert.equal(total, Math.round((expectedProd + expectedShip) * 100) / 100);
});
