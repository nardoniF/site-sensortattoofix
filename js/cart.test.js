import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

async function createCart() {
  const storage = new Map();
  const window = {
    dispatchEvent() {},
    STF_PELICULA: null,
    STF_I18N: { isLocalized: () => false }
  };
  const context = {
    window,
    document: { querySelectorAll: () => [] },
    localStorage: {
      getItem: (key) => storage.get(key) || null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: (key) => storage.delete(key)
    },
    CustomEvent: class CustomEvent {}
  };
  vm.runInNewContext(await readFile(new URL('./cart.js', import.meta.url), 'utf8'), context);
  return window.STF_CART;
}

test('preserves selected unit models when quantities change and removes only the chosen product', async () => {
  const cart = await createCart();
  const watch = { id: 'lens-watch', name: 'Lente Smartwatch', deviceType: 'smartwatch' };
  const band = { id: 'lens-band', name: 'Lente Smartband', deviceType: 'smartband' };

  cart.add(watch, 2);
  cart.setModels(watch.id, ['Apple Watch Ultra 2', 'Samsung Galaxy Watch 7']);
  cart.setQty(watch.id, 3, watch);
  assert.deepEqual(Array.from(cart.load()[0].models), ['Apple Watch Ultra 2', 'Samsung Galaxy Watch 7', '']);

  cart.setQty(watch.id, 1, watch);
  assert.deepEqual(Array.from(cart.load()[0].models), ['Apple Watch Ultra 2']);
  cart.setQty(watch.id, 3, watch);

  cart.add(band, 2);
  cart.setModels(band.id, ['Xiaomi Smart Band 9', 'Huawei Band 9']);
  cart.remove(watch.id);

  assert.equal(cart.load().length, 1);
  assert.equal(cart.load()[0].productId, band.id);
  assert.deepEqual(Array.from(cart.load()[0].models), ['Xiaomi Smart Band 9', 'Huawei Band 9']);
});

test('appends empty model slots when adding more units of an existing product', async () => {
  const cart = await createCart();
  const watch = { id: 'lens-watch', name: 'Lente Smartwatch' };
  cart.add(watch, 1);
  cart.setModels(watch.id, ['Apple Watch Ultra 2']);
  cart.add(watch, 2);
  assert.equal(cart.load()[0].qty, 3);
  assert.deepEqual(Array.from(cart.load()[0].models), ['Apple Watch Ultra 2', '', '']);
});
