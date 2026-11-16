export const ROLES = { PATIENT: 'PATIENT', DOCTOR: 'DOCTOR', ADMIN: 'ADMIN' };

export function homePathFor(role) {
  switch (role) {
    case ROLES.PATIENT: return '/patient';
    case ROLES.DOCTOR: return '/doctor';
    case ROLES.ADMIN: return '/admin';
    default: return '/login';
  }
}
