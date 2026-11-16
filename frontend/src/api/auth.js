import client from './client.js';

// POST /api/auth/login  -> { accessToken, tokenType, expiresInSeconds, user: { id, fullName, email, role } }
export async function loginRequest(email, password) {
  const { data } = await client.post('/api/auth/login', { email, password });
  return data;
}

// POST /api/auth/register -> 201 { id, fullName, email, role }  (no token; the user must log in afterwards)
// The role is never sent: the backend always creates a PATIENT.
export async function registerRequest({ fullName, email, password, phone }) {
  const body = { fullName, email, password };
  if (phone) body.phone = phone; // optional field
  const { data } = await client.post('/api/auth/register', body);
  return data;
}

// GET /api/auth/me -> { id, fullName, email, role }
export async function meRequest() {
  const { data } = await client.get('/api/auth/me');
  return data;
}
