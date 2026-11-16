import { Link } from 'react-router-dom';
import { CalendarCheck, CalendarClock, CheckCircle2, Clock, MapPin, Stethoscope } from 'lucide-react';
import { listSpecializations } from '../../api/doctors.js';
import { listMyAppointments } from '../../api/appointments.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import Button from '../../components/Button.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import ListSkeleton from '../../components/Skeleton.jsx';
import StatCard from '../../components/StatCard.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import useFetch from '../../hooks/useFetch.js';
import { formatDate, formatRange, startsAt } from '../../utils/datetime.js';
import { isActiveStatus } from '../../utils/status.js';

export default function PatientDashboardPage() {
  const { user } = useAuth();
  const appts = useFetch(() => listMyAppointments(), []);
  const specs = useFetch(() => listSpecializations(), []);

  const list = appts.data || [];
  const count = (s) => list.filter((a) => a.status === s).length;
  const now = new Date();
  const next = list
    .filter((a) => isActiveStatus(a.status) && startsAt(a.slotDate, a.startTime) >= now)
    .sort((a, b) => startsAt(a.slotDate, a.startTime) - startsAt(b.slotDate, b.startTime))[0];

  return (
    <>
      <PageHeader title={`Welcome, ${user.fullName.split(' ')[0]}`} subtitle="Book a doctor and keep track of your appointments."
        actions={<Link to="/patient/doctors"><Button icon={Stethoscope}>Find a doctor</Button></Link>} />

      {appts.error && !appts.data ? <ErrorState error={appts.error} onRetry={appts.reload} /> : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard icon={CalendarCheck} label="Total appointments" value={appts.loading && !appts.data ? '-' : list.length} tone="slate" />
            <StatCard icon={Clock} label="Pending approval" value={appts.loading && !appts.data ? '-' : count('PENDING')} tone="amber" />
            <StatCard icon={CalendarClock} label="Confirmed" value={appts.loading && !appts.data ? '-' : count('CONFIRMED')} tone="emerald" />
            <StatCard icon={CheckCircle2} label="Completed" value={appts.loading && !appts.data ? '-' : count('COMPLETED')} tone="sky" />
          </div>

          <section className="mt-8">
            <h2 className="mb-3 text-lg font-semibold text-slate-900">Next appointment</h2>
            {appts.loading && !appts.data ? <ListSkeleton rows={1} /> : next ? (
              <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{next.doctorName}</p>
                  <p className="text-sm text-slate-600">{formatDate(next.slotDate)} · {formatRange(next.startTime, next.endTime)}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500"><MapPin className="h-4 w-4" /> {next.clinicAddress}</p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={next.status} />
                  <Link to="/patient/appointments" className="text-sm font-semibold text-teal-700 hover:underline">Manage</Link>
                </div>
              </div>
            ) : (
              <EmptyState icon={CalendarClock} title="No upcoming appointments" message="Find a doctor and pick a time that suits you."
                action={<Link to="/patient/doctors"><Button>Browse doctors</Button></Link>} />
            )}
          </section>
        </>
      )}

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Browse by speciality</h2>
        {specs.error && !specs.data ? <ErrorState error={specs.error} onRetry={specs.reload} /> : (
          <div className="flex flex-wrap gap-2">
            {(specs.data || []).map((s) => (
              <Link key={s.id} to={`/patient/doctors?specializationId=${s.id}`} title={s.description}
                className="rounded-full border border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 transition hover:border-teal-400 hover:text-teal-700">
                {s.name}
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
