import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  superfreteApiErrorDetails,
  superfreteRecipientNumber
} from './superfrete-utils.js';

test('SuperFrete recipient number respects its 10-character limit', () => {
  assert.deepEqual(superfreteRecipientNumber('1234567890123', 'Fundos'), {
    number: '1234567890',
    complement: 'Nº: 123 / Fundos'
  });
  assert.deepEqual(superfreteRecipientNumber('42', ''), {
    number: '42',
    complement: ''
  });
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
