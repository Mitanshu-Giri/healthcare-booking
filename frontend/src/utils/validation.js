// Client-side checks that mirror the backend rules (RegisterRequest / LoginRequest).
// They only give faster feedback; the backend still validates everything.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^$|^[0-9+\- ]{7,20}$/;

export function validateEmail(value) {
  const v = value.trim();
  if (!v) return 'Email is required';
  if (v.length > 150) return 'Email must be at most 150 characters';
  if (!EMAIL_RE.test(v)) return 'Enter a valid email address';
  return '';
}

export function validateFullName(value) {
  const v = value.trim();
  if (!v) return 'Full name is required';
  if (v.length > 100) return 'Full name must be at most 100 characters';
  return '';
}

export function validatePhone(value) {
  if (!PHONE_RE.test(value.trim())) return 'Enter a valid phone number';
  return '';
}

export function validateNewPassword(value) {
  if (!value) return 'Password is required';
  if (value.length < 8 || value.length > 64) return 'Password must be 8 to 64 characters';
  if (!/[a-z]/.test(value) || !/[A-Z]/.test(value) || !/\d/.test(value)) {
    return 'Password needs an uppercase letter, a lowercase letter and a number';
  }
  return '';
}

export function validateLoginPassword(value) {
  return value ? '' : 'Password is required';
}

/** Removes empty messages so `Object.keys(errors).length === 0` means "valid". */
export function compact(errors) {
  return Object.fromEntries(Object.entries(errors).filter(([, msg]) => msg));
}
