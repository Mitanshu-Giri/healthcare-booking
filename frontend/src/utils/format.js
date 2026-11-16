export function formatFee(fee) {
  return `₹${Number(fee).toLocaleString('en-IN')}`;
}

export function initials(name) {
  return name.replace(/^Dr\.?\s+/i, '').trim().split(/\s+/).slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join('');
}
