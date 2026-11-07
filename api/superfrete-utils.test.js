import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  shouldAutoCheckoutSuperfrete,
  superfreteApiErrorDetails
} from './superfrete-utils.js';

test('manual label action leaves the cart unpaid for the user to pay', () => {
  assert.equal(shouldAutoCheckoutSuperfrete({ autoPay: true, skipCheckout: true }), false);
  assert.equal(shouldAutoCheckoutSuperfrete({ autoPay: true }), true);
  assert.equal(shouldAutoCheckoutSuperfrete({ autoPay: false }), false);
});

test('SuperFrete validation details are surfaced without dumping the entire response', () => {
  assert.equal(
    superfreteApiErrorDetails([
      { field: 'to.document', message: 'is required' },
      { property: 'to.postal_code', constraints: ['must be valid'] }
    ]),
    'to.document: is required; to.postal_code: must be valid'
  );
  assert.equal(
    superfreteApiErrorDetails({ 'to.phone': ['must be a valid phone'] }),
    'to.phone: must be a valid phone'
  );
  assert.equal(superfreteApiErrorDetails(null), '');
});
