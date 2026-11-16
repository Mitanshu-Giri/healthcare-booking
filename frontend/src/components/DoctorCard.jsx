import { Link } from 'react-router-dom';
import { Briefcase, ChevronRight, IndianRupee, MapPin } from 'lucide-react';
import { formatFee, initials } from '../utils/format.js';

export default function DoctorCard({ doctor }) {
  return (
    <Link to={`/patient/doctors/${doctor.id}`} className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-teal-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-teal-300">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-teal-100 text-base font-semibold text-teal-700">{initials(doctor.fullName)}</span>
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-slate-900">{doctor.fullName}</h3>
          <p className="truncate text-sm text-slate-500">{doctor.qualification}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {doctor.specializations.map((s) => (
          <span key={s.id} className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-700">{s.name}</span>
        ))}
      </div>
      <ul className="mt-4 space-y-1.5 text-sm text-slate-600">
        <li className="flex items-center gap-2"><Briefcase className="h-4 w-4 text-slate-400" /> {doctor.experienceYears} {doctor.experienceYears === 1 ? 'year' : 'years'} of experience</li>
        <li className="flex items-center gap-2"><IndianRupee className="h-4 w-4 text-slate-400" /> Consultation fee {formatFee(doctor.consultationFee)}</li>
        <li className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /> <span>{doctor.clinicAddress}</span></li>
      </ul>
      <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-teal-700">View slots &amp; book <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></span>
    </Link>
  );
}
