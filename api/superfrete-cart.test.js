import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runSuperfreteCartAction } from './superfrete-cart.js';

function harness(initialOrder = {}) {
  const order = { orderId: 'STF-test-1', ...initialOrder };
  const calls = { create: 0, get: 0, persistId: 0, save: 0, release: 0 };
  let claim = null;
  let response = { id: 'sf-cart-1', status: 'pending' };
  let saveError = null;
  let persistError = null;
  const run = (options = {}) => runSuperfreteCartAction({
    orderId: order.orderId,
    refreshExisting: options.refreshExisting || false,
    loadOrder: async () => order,
    loadClaim: async () => claim,
    claimCreation: async () => {
      if (claim) return false;
      claim = { state: 'creating', cartId: null };
      return true;
    },
    createCart: async () => {
      calls.create++;
      if (response instanceof Error) throw response;
      return response;
    },
    getCart: async () => {
      calls.get++;
      return response;
    },
    persistCartId: async (_orderId, cartId) => {
      calls.persistId++;
      if (persistError) throw persistError;
      claim = { state: 'created', cartId };
    },
    saveOrder: async (value) => {
      calls.save++;
      if (saveError) throw saveError;
      Object.assign(order, value);
    },
    completeClaim: async (_orderId, cartId) => {
      claim = { state: 'ready', cartId };
    },
    releaseClaim: async () => {
      calls.release++;
      claim = null;
    },
    applyRemoteCart: async (target, remote) => {
      target.superfreteCartStatus = remote.status;
      target.superfreteTrackingCode = remote.tracking;
      target.correiosTrackingCode = remote.tracking;
    },
    ...options.dependencies
  });
  return {
    order,
    calls,
    run,
    setResponse(value) { response = value; },
    setSaveError(error) { saveError = error; },
    setPersistError(error) { persistError = error; }
  };
}

test('purchase confirmation creates one unpaid pending cart', async () => {
  const h = harness();
  const result = await h.run();
  assert.equal(h.calls.create, 1);
  assert.equal(h.order.superfreteCartId, 'sf-cart-1');
  assert.equal(h.order.superfreteCartStatus, 'pending');
  assert.equal(result.status, 'pending');
});

test('five simultaneous admin clicks share one cart creation', async () => {
  const h = harness();
  const results = await Promise.all(
    Array.from({ length: 5 }, () => h.run({ refreshExisting: true }))
  );
  assert.equal(h.calls.create, 1);
  assert.equal(h.calls.get, 0);
  assert.equal(h.order.superfreteCartId, 'sf-cart-1');
  assert.ok(results.every((result) => result.cartId === 'sf-cart-1'));
});

test('five repeated admin clicks after creation do not create more carts', async () => {
  const h = harness();
  for (let click = 0; click < 5; click++) {
    await h.run({ refreshExisting: true });
  }
  assert.equal(h.calls.create, 1);
  assert.equal(h.calls.get, 4);
});

test('an existing cart ID is queried without creating another cart', async () => {
  const h = harness({ superfreteCartId: 'already-created' });
  h.setResponse({ status: 'pending', tracking: null });
  const result = await h.run({ refreshExisting: true });
  assert.equal(h.calls.get, 1);
  assert.equal(h.calls.create, 0);
  assert.equal(result.cartId, 'already-created');
});

test('a held per-order lock prevents another API creation', async () => {
  const h = harness();
  await assert.rejects(h.run({
    dependencies: {
      claimCreation: async () => false,
      loadClaim: async () => ({ state: 'creating', cartId: null })
    }
  }), /Nenhum novo carrinho foi criado/);
  assert.equal(h.calls.create, 0);
});

test('a paid SuperFrete cart updates status and tracking', async () => {
  const h = harness({ superfreteCartId: 'already-created' });
  h.setResponse({ status: 'released', tracking: 'AB123456789BR' });
  const result = await h.run({ refreshExisting: true });
  assert.equal(h.calls.get, 1);
  assert.equal(result.status, 'released');
  assert.equal(result.tracking, 'AB123456789BR');
  assert.equal(h.order.correiosTrackingCode, 'AB123456789BR');
});

test('422 and insufficient-balance errors remain clear and do not auto-retry', async (t) => {
  for (const message of [
    'Super Frete 422: to.number: must be at most 10 characters',
    'Super Frete 402: saldo insuficiente na carteira'
  ]) {
    await t.test(message, async () => {
      const h = harness();
      h.setResponse(new Error(message));
      await assert.rejects(h.run(), { message });
      assert.equal(h.calls.create, 1);
      assert.equal(h.calls.release, 1);
    });
  }
});

test('failure to save the cart ID blocks any second cart creation', async () => {
  const h = harness();
  h.setPersistError(new Error('D1 unavailable'));
  await assert.rejects(h.run(), /Carrinho sf-cart-1 foi criado.*não foi possível registrar seu ID/);
  assert.equal(h.calls.create, 1);
  assert.equal(h.calls.persistId, 1);

  h.setPersistError(null);
  await assert.rejects(h.run(), /criação do carrinho deste pedido já foi iniciada/);
  assert.equal(h.calls.create, 1);

  const afterRecord = harness();
  afterRecord.setSaveError(new Error('D1 unavailable'));
  await assert.rejects(afterRecord.run(), /Carrinho sf-cart-1 foi registrado para recuperação.*não foi possível salvar o ID no pedido/);
  assert.equal(afterRecord.calls.create, 1);
  assert.equal(afterRecord.calls.persistId, 1);

  afterRecord.setSaveError(null);
  const result = await afterRecord.run();
  assert.equal(afterRecord.calls.create, 1);
  assert.equal(result.cartId, 'sf-cart-1');
});
