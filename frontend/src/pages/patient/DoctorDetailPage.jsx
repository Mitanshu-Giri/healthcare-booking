import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Briefcase, CalendarX, IndianRupee, MapPin } from 'lucide-react';
import { getDoctor, getDoctorSlots } from '../../api/doctors.js';
import BookingModal from '../../components/BookingModal.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import ListSkeleton from '../../components/Skeleton.jsx';
import useFetch from '../../hooks/useFetch.js';
import { formatTime, parseISODate } from '../../utils/datetime.js';
import { formatFee, initials } from '../../utils/format.js';

export default function DoctorDetailPage() {
  const { id } = useParams();
  const doctor = useFetch(() => getDoctor(id), [id]);
  const slots = useFetch(() => getDoctorSlots(id), [id]); // default: today .. +30 days
  const [pickedDate, setPickedDate] = useState('');
  const [slot, setSlot] = useState(null);

  if (doctor.error && !doctor.data) {
    return (
      <>
        <BackLink />
        <ErrorState error={doctor.error} onRetry={doctor.reload} />
      </>
    );
  }
  if (!doctor.data) return <><BackLink /><ListSkeleton rows={2} /></>;

  const d = doctor.data;
  // group the available slots by date
  const byDate = {};
  (slots.data || []).forEach((s) => { (byDate[s.slotDate] = byDate[s.slotDate] || []).push(s); });
  const dates = Object.keys(byDate).sort();
  const activeDate = dates.includes(pickedDate) ? pickedDate : dates[0];

  return (
    <>
      <BackLink />
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xl font-semibold text-teal-700">{initials(d.fullName)}</span>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{d.fullName}</h1>
            <p className="text-slate-500">{d.qualification}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {d.specializations.map((s) => <span key={s.id} title={s.description} className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-700">{s.name}</span>)}
            </div>
          </div>
        </div>
        {d.bio && <p className="mt-4 text-sm leading-relaxed text-slate-600">{d.bio}</p>}
        <ul className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-3">
          <li className="flex items-center gap-2"><Briefcase className="h-4 w-4 text-slate-400" /> {d.experienceYears} years experience</li>
          <li className="flex items-center gap-2"><IndianRupee className="h-4 w-4 text-slate-400" /> Fee {formatFee(d.consultationFee)}</li>
          <li className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /> {d.clinicAddress}</li>
        </ul>
      </div>

      <h2 className="mb-3 mt-8 text-lg font-semibold text-slate-900">Available slots</h2>
      {slots.error && !slots.data ? <ErrorState error={slots.error} onRetry={slots.reload} /> :
        slots.loading && !slots.data ? <ListSkeleton rows={1} /> :
        dates.length === 0 ? (
          <EmptyState icon={CalendarX} title="No free slots right now" message="This doctor has no open slots in the next 30 days. Please check again later." />
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2" role="tablist" aria-label="Choose a date">
              {dates.map((dt) => {
                const day = parseISODate(dt);
                const on = dt === activeDate;
                return (
                  <button key={dt} role="tab" aria-selected={on} onClick={() => setPickedDate(dt)}
                    className={`flex w-20 shrink-0 flex-col items-center rounded-xl border px-2 py-2 text-center transition ${on ? 'border-teal-600 bg-teal-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-teal-300'}`}>
                    <span className="text-xs font-medium opacity-80">{day.toLocaleDateString('en-IN', { weekday: 'short' })}</span>
                    <span className="text-lg font-bold leading-tight">{day.getDate()}</span>
                    <span className="text-xs opacity-80">{day.toLocaleDateString('en-IN', { month: 'short' })}</span>
                    <span className={`mt-1 text-[10px] ${on ? 'text-teal-100' : 'text-slate-400'}`}>{byDate[dt].length} {byDate[dt].length === 1 ? 'slot' : 'slots'}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {byDate[activeDate].map((s) => (
                <button key={s.id} onClick={() => setSlot(s)}
                  className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2.5 text-sm font-semibold text-teal-800 transition hover:bg-teal-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-teal-300">
                  {formatTime(s.startTime)}
                  <span className="block text-xs font-normal opacity-75">to {formatTime(s.endTime)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

      <BookingModal doctor={d} slot={slot} onClose={() => setSlot(null)} onSlotGone={() => { setSlot(null); slots.reload(); }} />
    </>
  );
}

function BackLink() {
  return (
    <Link to="/patient/doctors" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 hover:underline">
      <ArrowLeft className="h-4 w-4" /> All doctors
    </Link>
  );
}
