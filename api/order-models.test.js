import test from 'node:test';
import assert from 'node:assert/strict';
import { orderDeviceModelsText, resolveOrderItemModels } from './order-models.js';

const config = {
  smartwatchModels: [
    'Apple Watch Ultra 2',
    'Samsung Galaxy Watch 7',
    'Apple Watch Series 9',
    'Xiaomi Smart Band 9',
    'Huawei Band 9'
  ],
  smartwatchCatalog: {
    Apple: [
      { label: 'Apple Watch Ultra 2', kind: 'smartwatch' },
      { label: 'Apple Watch Series 9', kind: 'smartwatch' }
    ],
    Samsung: [{ label: 'Samsung Galaxy Watch 7', kind: 'smartwatch' }],
    Xiaomi: [{ label: 'Xiaomi Smart Band 9', kind: 'smartband' }],
    Huawei: [{ label: 'Huawei Band 9', kind: 'smartband' }]
  }
};

const watch = { id: 'kit-smartwatch', deviceType: 'smartwatch' };
const band = { id: 'kit-smartband', deviceType: 'smartband' };

test('accepts multiple compatible models for separate smartwatch units', () => {
  assert.deepEqual(
    resolveOrderItemModels(watch, 3, ['Apple Watch Ultra 2', 'Samsung Galaxy Watch 7', 'Apple Watch Series 9'], '', config),
    ['Apple Watch Ultra 2', 'Samsung Galaxy Watch 7', 'Apple Watch Series 9']
  );
});

test('rejects models from the other lens category', () => {
  assert.throws(
    () => resolveOrderItemModels(watch, 1, ['Xiaomi Smart Band 9'], '', config),
    /não é compatível com smartwatch/
  );
  assert.throws(
    () => resolveOrderItemModels(band, 1, ['Apple Watch Ultra 2'], '', config),
    /não é compatível com smartband/
  );
});

test('requires one non-empty model per purchased unit', () => {
  assert.throws(
    () => resolveOrderItemModels(watch, 2, ['Apple Watch Ultra 2'], '', config),
    /cada unidade/
  );
  assert.throws(
    () => resolveOrderItemModels(watch, 2, ['Apple Watch Ultra 2', ''], '', config),
    /cada unidade/
  );
});

test('supports the legacy single-lens model and records mixed product quantities', () => {
  assert.deepEqual(resolveOrderItemModels(watch, 1, undefined, 'Apple Watch Ultra 2', config), ['Apple Watch Ultra 2']);
  const items = [
    { name: 'Lente Smartwatch', qty: 2, models: ['Apple Watch Ultra 2', 'Samsung Galaxy Watch 7'] },
    { name: 'Lente Smartband', qty: 3, models: ['Xiaomi Smart Band 9', 'Huawei Band 9', 'Xiaomi Smart Band 9'] }
  ];
  assert.equal(
    orderDeviceModelsText(items),
    'Lente Smartwatch (2): 1× Apple Watch Ultra 2\n1× Samsung Galaxy Watch 7\n'
      + 'Lente Smartband (3): 2× Xiaomi Smart Band 9\n1× Huawei Band 9'
  );
  assert.deepEqual(JSON.parse(JSON.stringify({ items })).items.map((item) => item.models), [
    ['Apple Watch Ultra 2', 'Samsung Galaxy Watch 7'],
    ['Xiaomi Smart Band 9', 'Huawei Band 9', 'Xiaomi Smart Band 9']
  ]);
});
