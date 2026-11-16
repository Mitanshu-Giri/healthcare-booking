export const APPOINTMENT_STATUSES = ['PENDING', 'CONFIRMED', 'REJECTED', 'CANCELLED', 'COMPLETED'];

export const STATUS_STYLES = {
  PENDING: 'bg-amber-50 text-amber-800 ring-amber-200',
  CONFIRMED: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  REJECTED: 'bg-red-50 text-red-800 ring-red-200',
  CANCELLED: 'bg-slate-100 text-slate-700 ring-slate-200',
  COMPLETED: 'bg-sky-50 text-sky-800 ring-sky-200',
  AVAILABLE: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  BOOKED: 'bg-violet-50 text-violet-800 ring-violet-200',
};

export function statusLabel(s) {
  return s.charAt(0) + s.slice(1).toLowerCase();
}

/** Appointments that still need attention (not final). */
export const isActiveStatus = (s) => s === 'PENDING' || s === 'CONFIRMED';
