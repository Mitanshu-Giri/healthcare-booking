import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { loginRequest, meRequest } from '../api/auth.js';
import { setUnauthorizedHandler } from '../api/client.js';
import { useToast } from '../components/Toast.jsx';
import { clearSession, readSession, saveSession, saveUser } from './tokenStorage.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // 'loading' while we check a stored token after a page refresh, then 'authenticated' or 'anonymous'
  const [status, setStatus] = useState('loading');
  const toast = useToast();
  const statusRef = useRef(status);
  statusRef.current = status;

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
    setStatus('anonymous');
  }, []);

  // Any 401 on a logged-in request (expired token) logs the user out.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      const wasLoggedIn = statusRef.current === 'authenticated';
      logout();
      if (wasLoggedIn) toast.error('Your session has expired. Please log in again.');
    });
    return () => setUnauthorizedHandler(null);
  }, [logout, toast]);

  // On first load / refresh: if a non-expired token is stored, confirm it with the backend.
  useEffect(() => {
    let cancelled = false;
    const session = readSession();
    if (!session) {
      setStatus('anonymous');
      return undefined;
    }
    meRequest()
      .then((freshUser) => {
        if (cancelled) return;
        saveUser(freshUser);
        setUser(freshUser);
        setStatus('authenticated');
      })
      .catch(() => {
        if (cancelled) return;
        logout(); // invalid/expired token, or backend unreachable: start from the login page
      });
    return () => {
      cancelled = true;
    };
  }, [logout]);

  const login = useCallback(async (email, password) => {
    const data = await loginRequest(email, password);
    saveSession(data);
    setUser(data.user);
    setStatus('authenticated');
    return data.user;
  }, []);

  const value = useMemo(() => ({ user, status, login, logout }), [user, status, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
