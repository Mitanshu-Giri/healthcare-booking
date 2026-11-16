import axios from 'axios';
import { getToken } from '../auth/tokenStorage.js';

// Set VITE_API_BASE_URL in frontend/.env (see .env.example). The fallback is the backend default.
const baseURL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080').replace(/\/$/, '');

const client = axios.create({
  baseURL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Called when a logged-in request gets 401 (token expired/invalid). AuthContext sets this.
let onUnauthorized = null;
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

client.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || '';
    const isAuthForm = url.startsWith('/api/auth/login') || url.startsWith('/api/auth/register');
    // A 401 on the login form just means "wrong password"; only other 401s mean "session ended".
    if (error.response?.status === 401 && !isAuthForm && onUnauthorized) onUnauthorized();
    return Promise.reject(error);
  },
);

/**
 * Turns an Axios error into { message, fieldErrors } using the backend error format:
 * { timestamp, status, error, message, fieldErrors? }
 */
export function parseApiError(error) {
  if (error.response) {
    const data = error.response.data;
    return {
      status: error.response.status,
      message: (data && data.message) || 'Something went wrong. Please try again.',
      fieldErrors: (data && data.fieldErrors) || {},
    };
  }
  if (error.code === 'ECONNABORTED') {
    return { status: 0, message: 'The server took too long to respond. Please try again.', fieldErrors: {} };
  }
  return {
    status: 0,
    message: 'Cannot reach the server. Check that the backend is running and VITE_API_BASE_URL is correct.',
    fieldErrors: {},
  };
}

export default client;
