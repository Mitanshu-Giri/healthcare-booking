import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarX, Clock, MapPin } from 'lucide-react';
import { cancelAppointment, listMyAppointments } from '../../api/appointments.js';
import { parseApiError } from '../../api/client.js';
import Button from '../../components/Button.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import ListSkeleton from '../../components/Skeleton.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import StatusTabs from '../../components/StatusTabs.jsx';
import { useToast } from '../../components/Toast.jsx';
import useFetch from '../../hooks/useFetch.js';
import { formatDate, formatInstant, formatRange } from '../../utils/datetime.js';
import { isActiveStatus, statusLabel } from '../../utils/status.js';

export default function MyAppointmentsPage() {
  const toast = useToast();
  const [filter, setFilter] = useState('ALL');
  const [target, setTarget] = useState(null); // appointment awaiting cancel confirmation
  const [cancelling, setCancelling] = useState(false);
  const { data, loading, error, reload } = useFetch(() => listMyAppointments(filter === 'ALL' ? undefined : filter), [filter]);

  async function confirmCancel() {
    setCancelling(true);
    try {
      await cancelAppointment(target.id);
      toast.success('Appointment cancelled. The slot is free again.');
    } catch (err) {
      toast.error(parseApiError(err).message); // e.g. "An appointment cannot be cancelled after its start time"
    } finally {
      setCancelling(false);
      setTarget(null);
      reload(); // always refresh: the status may have changed meanwhile
    }
  }

  return (
    <>
      <PageHeader title="My appointments" subtitle="Your upcoming visits and history, newest first." />
      <div className="mb-5"><StatusTabs value={filter} onChange={setFilter} /></div>

      {error && !data ? <ErrorState error={error} onRetry={reload} /> :
        loading && !data ? <ListSkeleton rows={3} /> :
        (data || []).length === 0 ? (
          <EmptyState icon={CalendarX} title={filter === 'ALL' ? 'No appointments yet' : `No ${statusLabel(filter).toLowerCase()} appointments`}
            message={filter === 'ALL' ? 'Book your first appointment with one of our doctors.' : 'Try another filter.'}
            action={filter === 'ALL' && <Link to="/patient/doctors"><Button>Find a doctor</Button></Link>} />
        ) : (
          <ul className={`space-y-3 ${loading ? 'opacity-60' : ''}`}>
            {data.map((a) => (
              <li key={a.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <Link to={`/patient/doctors/${a.doctorId}`} className="font-semibold text-slate-900 hover:text-teal-700 hover:underline">{a.doctorName}</Link>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600"><Clock className="h-4 w-4 text-slate-400" /> {formatDate(a.slotDate)} · {formatRange(a.startTime, a.endTime)}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500"><MapPin className="h-4 w-4 text-slate-400" /> {a.clinicAddress}</p>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
                {a.reason && <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600"><span className="font-medium">Reason:</span> {a.reason}</p>}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-slate-400">Requested {formatInstant(a.createdAt)}</span>
                  {isActiveStatus(a.status) && <Button size="sm" variant="dangerOutline" onClick={() => setTarget(a)}>Cancel appointment</Button>}
                </div>
              </li>
            ))}
          </ul>
        )}

      <ConfirmDialog open={Boolean(target)} title="Cancel this appointment?" danger loading={cancelling}
        message={target ? `Your appointment with ${target.doctorName} on ${formatDate(target.slotDate)} at ${formatRange(target.startTime, target.endTime)} will be cancelled and the slot released.` : ''}
        confirmLabel="Yes, cancel it" cancelLabel="Keep appointment" onConfirm={confirmCancel} onCancel={() => setTarget(null)} />
    </>
  );
}
