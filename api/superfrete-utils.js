export function superfreteRecipientNumber(numberValue, complementValue = '') {
  const rawNumber = String(numberValue || '').trim();
  const number = rawNumber.slice(0, 10);
  const overflow = rawNumber.slice(10).trim();
  const complementParts = [
    overflow ? `Nº: ${overflow}` : '',
    String(complementValue || '').trim()
  ].filter(Boolean);
  return {
    number,
    complement: complementParts.join(' / ').slice(0, 20)
  };
}

function messageFromErrorEntry(entry, fieldHint = '') {
  if (typeof entry === 'string') {
    return [fieldHint, entry.trim()].filter(Boolean).join(': ');
  }
  if (!entry || typeof entry !== 'object') return '';

  const field = entry.field || entry.property || entry.param || entry.key || entry.attribute || fieldHint;
  const message = entry.message || entry.msg || entry.error;
  if (typeof message === 'string' && message.trim()) {
    return [field, message.trim()].filter(Boolean).join(': ');
  }
  if (Array.isArray(entry.constraints)) {
    const constraints = entry.constraints.filter((item) => typeof item === 'string').join(', ');
    return [field, constraints].filter(Boolean).join(': ');
  }
  return field ? String(field) : '';
}

export function superfreteApiErrorDetails(errors) {
  const messages = Array.isArray(errors)
    ? errors.map((entry) => messageFromErrorEntry(entry))
    : errors && typeof errors === 'object'
      ? Object.entries(errors).flatMap(([field, entries]) => (
        Array.isArray(entries)
          ? entries.map((entry) => messageFromErrorEntry(entry, field))
          : [messageFromErrorEntry(entries, field)]
      ))
      : [messageFromErrorEntry(errors)];

  return [...new Set(messages.map((message) => message.trim()).filter(Boolean))]
    .slice(0, 5)
    .join('; ')
    .slice(0, 500);
}
