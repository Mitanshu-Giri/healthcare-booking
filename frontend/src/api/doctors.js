import client from './client.js';

// GET /api/specializations -> [{ id, name, description }]
export const listSpecializations = () => client.get('/api/specializations').then((r) => r.data);

// GET /api/doctors?specializationId=&search= -> [DoctorDto]  (only active doctors)
export function listDoctors({ specializationId, search } = {}) {
  const params = {};
  if (specializationId) params.specializationId = specializationId;
  if (search) params.search = search;
  return client.get('/api/doctors', { params }).then((r) => r.data);
}

// GET /api/doctors/{id} -> DoctorDto
export const getDoctor = (id) => client.get(`/api/doctors/${id}`).then((r) => r.data);

// GET /api/doctors/{id}/slots[?date=yyyy-MM-dd] -> [SlotDto]  (AVAILABLE, not started; default today..+30 days)
export function getDoctorSlots(id, date) {
  return client.get(`/api/doctors/${id}/slots`, { params: date ? { date } : {} }).then((r) => r.data);
}
