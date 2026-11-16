import { Link } from 'react-router-dom';
import { CalendarCheck, CalendarClock, ClipboardList, Clock } from 'lucide-react';
import { listDoctorAppointments, listMySlots } from '../../api/doctorPortal.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import Button from '../../components/Button.jsx';
import DoctorAppointmentList from '../../components/DoctorAppointmentList.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import ListSkeleton from '../../components/Skeleton.jsx';
import StatCard from '../../components/StatCard.jsx';
import useFetch from '../../hooks/useFetch.js';
import { todayISO } from '../../utils/datetime.js';

export default function DoctorDashboardPage() {
  const { user } = useAuth();
  const appts = useFetch(() => listDoctorAppointments(), []);
  const slots = useFetch(() => listMySlots(), []); // default: today .. +30 days

  const a = appts.data || [];
  const today = todayISO();
  const pending = a.filter((x) => x.status === 'PENDING');
  const todays = a.filter((x) => x.slotDate === today && (x.status === 'PENDING' || x.status === 'CONFIRMED'));
  const confirmed = a.filter((x) => x.status === 'CONFIRMED');
  const openSlots = (slots.data || []).filter((s) => s.status === 'AVAILABLE').length;
  const loadingStats = appts.loading && !appts.data;

  return (
    <>
      <PageHeader title={`Good day, ${user.fullName}`} subtitle="Your requests and schedule at a glance."
        actions={<Link to="/doctor/slots"><Button icon={CalendarClock}>Manage slots</Button></Link>} />

      {appts.error && !appts.data ? <ErrorState error={appts.error} onRetry={appts.reload} /> : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard icon={ClipboardList} label="Pending requests" value={loadingStats ? '-' : pending.length} tone="amber" />
            <StatCard icon={Clock} label="Today's appointments" value={loadingStats ? '-' : todays.length} tone="teal" />
            <StatCard icon={CalendarCheck} label="Confirmed" value={loadingStats ? '-' : confirmed.length} tone="emerald" />
            <StatCard icon={CalendarClock} label="Open slots (next 30 days)" value={slots.data ? openSlots : '-'} tone="sky" />
          </div>

          <section className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Pending requests</h2>
              <Link to="/doctor/appointments" className="text-sm font-semibold text-teal-700 hover:underline">All appointments</Link>
            </div>
            {loadingStats ? <ListSkeleton rows={2} /> : pending.length === 0 ? (
              <EmptyState icon={ClipboardList} title="No pending requests" message="New booking requests from patients will show up here." />
            ) : (
              <DoctorAppointmentList appointments={pending.slice(0, 5)} onChanged={appts.reload} />
            )}
          </section>
        </>
      )}
    </>
  );
}
