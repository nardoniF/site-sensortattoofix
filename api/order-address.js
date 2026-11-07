const ADDRESS_FIELD_LIMITS = {
  cep: 24,
  rua: 200,
  numero: 10,
  complemento: 120,
  bairro: 120,
  cidade: 120,
  uf: 40
};

export function updateOrderAddress(currentOrder, address, { superfrete = false } = {}) {
  const updated = {};
  const limits = {
    ...ADDRESS_FIELD_LIMITS,
    numero: superfrete ? 10 : 40
  };
  for (const [field, maxLength] of Object.entries(limits)) {
    if (address?.[field] === undefined) continue;
    const value = String(address[field] || '').trim();
    if (value.length > maxLength) {
      throw new Error(`${field}: máximo de ${maxLength} caracteres.`);
    }
    updated[field] = value || null;
  }

  const value = (field, fallback) => (
    Object.hasOwn(updated, field) ? updated[field] : fallback
  );
  const combined = [
    [value('rua', currentOrder.rua), value('numero', currentOrder.numero)]
      .filter(Boolean).join(', '),
    value('complemento', currentOrder.complemento),
    value('bairro', currentOrder.bairro),
    value('cidade', currentOrder.cidade),
    value('uf', currentOrder.uf || currentOrder.estado || currentOrder.state),
    value('cep', currentOrder.cep)
  ].filter(Boolean);

  updated.endereco = combined.join(' — ');
  updated.addressUpdatedAt = new Date().toISOString();
  return updated;
}
