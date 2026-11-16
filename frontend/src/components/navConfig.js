import { CalendarCheck, CalendarClock, ClipboardList, LayoutDashboard, ShieldCheck, Stethoscope, User } from 'lucide-react';

export const PATIENT_NAV = [
  { to: '/patient', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/patient/doctors', label: 'Find doctors', icon: Stethoscope },
  { to: '/patient/appointments', label: 'My appointments', icon: CalendarCheck },
  { to: '/patient/profile', label: 'My profile', icon: User },
];

export const DOCTOR_NAV = [
  { to: '/doctor', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/doctor/slots', label: 'My slots', icon: CalendarClock },
  { to: '/doctor/appointments', label: 'Appointments', icon: ClipboardList },
];

export const ADMIN_NAV = [
  { to: '/admin', label: 'Overview', icon: ShieldCheck, end: true },
];
