/**
 * Geração de payload PIX estático (padrão BACEN EMV).
 * Sem dependências externas — funciona em qualquer navegador.
 */
(function (global) {
  function tlv(id, value) {
    const len = String(value.length).padStart(2, '0');
    return id + len + value;
  }

  function crc16(payload) {
    let crc = 0xffff;
    for (let i = 0; i < payload.length; i++) {
      crc ^= payload.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) {
        crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      }
      crc &= 0xffff;
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
  }

  function sanitize(str, max) {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9 ]/g, '')
      .toUpperCase()
      .slice(0, max);
  }

  function normalizePixKey(key, keyType) {
    const raw = (key || '').trim();
    if (keyType === 'cpf' || keyType === 'cnpj' || keyType === 'phone') {
      return raw.replace(/\D/g, '');
    }
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 14 || digits.length === 11) return digits;
    return raw;
  }

  function generatePixPayload({ key, keyType, merchantName, merchantCity, amount, txid }) {
    const name = sanitize(merchantName, 25);
    const city = sanitize(merchantCity, 15);
    const reference = (txid || 'STF' + Date.now()).replace(/[^a-zA-Z0-9]/g, '').slice(0, 25);
    const pixKey = normalizePixKey(key, keyType);

    const merchantAccount = tlv('00', 'br.gov.bcb.pix') + tlv('01', pixKey);
    let payload =
      tlv('00', '01') +
      tlv('26', merchantAccount) +
      tlv('52', '0000') +
      tlv('53', '986') +
      tlv('54', amount.toFixed(2)) +
      tlv('58', 'BR') +
      tlv('59', name) +
      tlv('60', city) +
      tlv('62', tlv('05', reference));

    payload += '6304';
    payload += crc16(payload);
    return payload;
  }

  global.PixGenerator = { generatePixPayload };
})(window);
