function digits(value) {
  return String(value || '').replace(/\D/g, '');
}

function normalizedName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function recipientKeys(order) {
  const keys = new Set();
  const email = String(order?.email || '').trim().toLowerCase();
  const cpf = digits(order?.cpf);
  const phone = digits(order?.telefone);
  if (email) keys.add(`email:${email}`);
  if (cpf.length === 11 || cpf.length === 14) keys.add(`document:${cpf}`);
  if (phone.length >= 10) keys.add(`phone:${phone.slice(-11)}`);

  const name = normalizedName(order?.nome);
  const postalCode = digits(order?.cep);
  const street = normalizedName([
    order?.rua,
    order?.numero,
    order?.cidade,
    order?.uf,
    !order?.rua ? order?.endereco : ''
  ].filter(Boolean).join(' '));
  if (name && postalCode && street) keys.add(`address:${name}|${postalCode}|${street}`);
  return keys;
}

export function hasExistingShippingLabel(order) {
  return !!(
    order?.correiosPrePostagemId
    || order?.superfreteCartId
    || order?.correiosTrackingCode
    || order?.superfreteTrackingCode
    || order?.correiosLabelCachedAt
  );
}

export function sameShippingRecipient(first, second) {
  const firstKeys = recipientKeys(first);
  for (const key of recipientKeys(second)) {
    if (firstKeys.has(key)) return true;
  }
  return false;
}

export function findExistingShippingLabel(orders, target) {
  return (orders || []).find((order) => {
    if (!order || order.orderId === target?.orderId || !hasExistingShippingLabel(order)) return false;
    return sameShippingRecipient(order, target);
  }) || null;
}

export function shippingLabelDuplicateMessage(existingOrder) {
  const orderId = String(existingOrder?.orderId || '').trim();
  const status = String(existingOrder?.superfreteCartStatus || existingOrder?.status || 'registrada').trim();
  return `Já existe etiqueta para esta pessoa no pedido ${orderId} (status: ${status}). Nenhuma nova etiqueta foi criada.`;
}
