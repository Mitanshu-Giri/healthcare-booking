import client from './client.js';

// POST /api/appointments { slotId, reason? } -> 201 AppointmentDto (status PENDING)
export function bookAppointment(slotId, reason) {
  const body = { slotId };
  if (reason) body.reason = reason;
  return client.post('/api/appointments', body).then((r) => r.data);
}

// GET /api/appointments/mine[?status=PENDING] -> [AppointmentDto], newest slot first
export function listMyAppointments(status) {
  return client.get('/api/appointments/mine', { params: status ? { status } : {} }).then((r) => r.data);
}

// POST /api/appointments/{id}/cancel -> AppointmentDto (CANCELLED)
export const cancelAppointment = (id) => client.post(`/api/appointments/${id}/cancel`).then((r) => r.data);
