import { useState } from 'react';
import { Check, Clock, Phone, User, X } from 'lucide-react';
import { approveAppointment, completeAppointment, rejectAppointment } from '../api/doctorPortal.js';
import { parseApiError } from '../api/client.js';
import { formatDate, formatInstant, formatRange } from '../utils/datetime.js';
import Button from './Button.jsx';
import ConfirmDialog from './ConfirmDialog.jsx';
import StatusBadge from './StatusBadge.jsx';
import { useToast } from './Toast.jsx';

const ACTIONS = {
  approve: { fn: approveAppointment, done: 'Appointment confirmed.' },
  reject: { fn: rejectAppointment, done: 'Request rejected. The slot is free again.' },
  complete: { fn: completeAppointment, done: 'Appointment marked as completed.' },
};

/** Appointment cards for the doctor with Approve / Reject / Complete. Calls onChanged() after any attempt. */
export default function DoctorAppointmentList({ appointments, onChanged }) {
  const toast = useToast();
  const [busy, setBusy] = useState(null); // { id, type }
  const [confirm, setConfirm] = useState(null); // { type: 'reject' | 'complete', appt }

  async function run(type, appt) {
    setBusy({ id: appt.id, type });
    try {
      await ACTIONS[type].fn(appt.id);
      toast.success(ACTIONS[type].done);
    } catch (err) {
      toast.error(parseApiError(err).message); // e.g. "An appointment can be completed only after its start time"
    } finally {
      setBusy(null);
      setConfirm(null);
      onChanged();
    }
  }

  const isBusy = (a, type) => busy && busy.id === a.id && busy.type === type;

  return (
    <>
      <ul className="space-y-3">
        {appointments.map((a) => (
          <li key={a.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="flex items-center gap-2 font-semibold text-slate-900"><User className="h-4 w-4 text-slate-400" /> {a.patientName}</p>
                <p className="mt-1 flex items-center gap-2 text-sm text-slate-600">
                  <Phone className="h-4 w-4 text-slate-400" />
                  {a.patientPhone ? <a href={`tel:${a.patientPhone}`} className="hover:text-teal-700 hover:underline">{a.patientPhone}</a> : <span className="text-slate-400">No phone provided</span>}
                </p>
                <p className="mt-1 flex items-center gap-2 text-sm text-slate-600"><Clock className="h-4 w-4 text-slate-400" /> {formatDate(a.slotDate)} · {formatRange(a.startTime, a.endTime)}</p>
              </div>
              <StatusBadge status={a.status} />
            </div>
            {a.reason && <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600"><span className="font-medium">Reason:</span> {a.reason}</p>}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-slate-400">Requested {formatInstant(a.createdAt)}</span>
              <div className="flex gap-2">
                {a.status === 'PENDING' && (
                  <>
                    <Button size="sm" variant="success" icon={Check} loading={isBusy(a, 'approve')} disabled={Boolean(busy)} onClick={() => run('approve', a)}>Approve</Button>
                    <Button size="sm" variant="dangerOutline" icon={X} disabled={Boolean(busy)} onClick={() => setConfirm({ type: 'reject', appt: a })}>Reject</Button>
                  </>
                )}
                {a.status === 'CONFIRMED' && (
                  <Button size="sm" icon={Check} disabled={Boolean(busy)} onClick={() => setConfirm({ type: 'complete', appt: a })}>Mark completed</Button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>

      <ConfirmDialog open={confirm?.type === 'reject'} title="Reject this request?" danger loading={Boolean(busy)}
        message={confirm ? `${confirm.appt.patientName}'s request for ${formatDate(confirm.appt.slotDate)} at ${formatRange(confirm.appt.startTime, confirm.appt.endTime)} will be rejected and the slot released. This cannot be undone.` : ''}
        confirmLabel="Yes, reject" cancelLabel="Go back" onConfirm={() => run('reject', confirm.appt)} onCancel={() => setConfirm(null)} />
      <ConfirmDialog open={confirm?.type === 'complete'} title="Mark as completed?" danger={false} loading={Boolean(busy)}
        message={confirm ? `Confirm that the visit with ${confirm.appt.patientName} has taken place. This cannot be undone.` : ''}
        confirmLabel="Mark completed" cancelLabel="Not yet" onConfirm={() => run('complete', confirm.appt)} onCancel={() => setConfirm(null)} />
    </>
  );
}
