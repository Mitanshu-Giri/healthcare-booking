// Where the login session lives in the browser.
//
// We use sessionStorage: it survives a page refresh but is erased when the tab/browser is closed
// and is never shared between tabs. The token is NOT put in localStorage (which would keep it
// for weeks) and NOT in a cookie (the backend uses the Authorization header, not cookies).
// Honest limit: any browser storage can be read by injected JavaScript (XSS). React escapes
// output by default and we never use dangerouslySetInnerHTML, which is the main defence here.
// The token is short-lived (30 min by default) and the backend re-checks the user on every request.

const KEY = 'hb.session';

function safe(fn, fallback) {
  try {
    return fn();
  } catch {
    return fallback; // storage can be blocked (private mode, strict settings)
  }
}

export function saveSession({ accessToken, expiresInSeconds, user }) {
  const expiresAt = Date.now() + expiresInSeconds * 1000;
  safe(() => sessionStorage.setItem(KEY, JSON.stringify({ accessToken, expiresAt, user })));
}

export function saveUser(user) {
  const s = readSession();
  if (s) safe(() => sessionStorage.setItem(KEY, JSON.stringify({ ...s, user })));
}

/** Returns the stored session, or null if there is none or it has expired. */
export function readSession() {
  const raw = safe(() => sessionStorage.getItem(KEY), null);
  if (!raw) return null;
  try {
    const s = JSON.parse(raw);
    if (!s.accessToken || !s.expiresAt || s.expiresAt <= Date.now()) {
      clearSession();
      return null;
    }
    return s;
  } catch {
    clearSession();
    return null;
  }
}

export function getToken() {
  const s = readSession();
  return s ? s.accessToken : null;
}

export function clearSession() {
  safe(() => sessionStorage.removeItem(KEY));
}
