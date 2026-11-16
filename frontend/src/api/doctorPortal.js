import client from './client.js';

// ---- own slots (role DOCTOR). Body: { slotDate: "yyyy-MM-dd", startTime: "HH:mm", endTime: "HH:mm" }
// GET /api/doctor/slots?from=&to= -> [SlotDto] (default today..+30 days, range at most 90 days)
export function listMySlots(from, to) {
  const params = {};
  if (from) params.from = from;
  if (to) params.to = to;
  return client.get('/api/doctor/slots', { params }).then((r) => r.data);
}
export const createSlot = (body) => client.post('/api/doctor/slots', body).then((r) => r.data);
export const updateSlot = (id, body) => client.put(`/api/doctor/slots/${id}`, body).then((r) => r.data);
export const deleteSlot = (id) => client.delete(`/api/doctor/slots/${id}`).then(() => undefined); // 204

// ---- appointments on own slots
// GET /api/doctor/appointments[?status=] -> [DoctorAppointmentDto], earliest slot first
export function listDoctorAppointments(status) {
  return client.get('/api/doctor/appointments', { params: status ? { status } : {} }).then((r) => r.data);
}
export const approveAppointment = (id) => client.post(`/api/doctor/appointments/${id}/approve`).then((r) => r.data);
export const rejectAppointment = (id) => client.post(`/api/doctor/appointments/${id}/reject`).then((r) => r.data);
export const completeAppointment = (id) => client.post(`/api/doctor/appointments/${id}/complete`).then((r) => r.data);
