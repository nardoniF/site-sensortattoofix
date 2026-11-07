import { test } from 'node:test';
import assert from 'node:assert/strict';
import { superfreteApiErrorDetails } from './superfrete-utils.js';

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
