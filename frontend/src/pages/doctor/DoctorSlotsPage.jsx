import { useState } from 'react';
import { CalendarX, Pencil, Plus, Trash2 } from 'lucide-react';
import { deleteSlot, listDoctorAppointments, listMySlots } from '../../api/doctorPortal.js';
import { parseApiError } from '../../api/client.js';
import Button from '../../components/Button.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import ListSkeleton from '../../components/Skeleton.jsx';
import SlotFormModal from '../../components/SlotFormModal.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import TextField from '../../components/TextField.jsx';
import { useToast } from '../../components/Toast.jsx';
import useFetch from '../../hooks/useFetch.js';
import { addDaysISO, diffDays, formatDate, formatRange, startsAt, todayISO } from '../../utils/datetime.js';

export default function DoctorSlotsPage() {
  const toast = useToast();
  const [from, setFrom] = useState(todayISO());
  const [to, setTo] = useState(addDaysISO(todayISO(), 30));
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const rangeError = !from || !to ? 'Choose both dates' : to < from ? "'To' date must not be before 'From' date" : diffDays(from, to) > 90 ? 'Date range can be at most 90 days' : '';
  const slots = useFetch(() => (rangeError ? Promise.resolve([]) : listMySlots(from, to)), [from, to]);
  // Every appointment of this doctor (all statuses): a slot with any appointment can never be edited or deleted.
  const history = useFetch(() => listDoctorAppointments(), []);
  const historyIds = new Set((history.data || []).map((a) => a.slotId));

  function refresh() { slots.reload(); history.reload(); }

  async function confirmDelete() {
    setBusy(true);
    try {
      await deleteSlot(deleting.id);
      toast.success('Slot deleted.');
    } catch (err) {
      toast.error(parseApiError(err).message);
    } finally {
      setBusy(false);
      setDeleting(null);
      refresh();
    }
  }

  const byDate = {};
  (slots.data || []).forEach((s) => { (byDate[s.slotDate] = byDate[s.slotDate] || []).push(s); });
  const dates = Object.keys(byDate).sort();
  const now = new Date();

  return (
    <>
      <PageHeader title="My slots" subtitle="Time slots patients can book. Booked slots and slots with appointment history cannot be changed."
        actions={<Button icon={Plus} onClick={() => { setEditing(null); setFormOpen(true); }}>Add slot</Button>} />

      <div className="mb-5 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2">
        <TextField id="from" label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <TextField id="to" label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} error={rangeError} />
      </div>

      {slots.error && !slots.data ? <ErrorState error={slots.error} onRetry={slots.reload} /> :
        slots.loading && !slots.data ? <ListSkeleton rows={3} /> :
        dates.length === 0 ? (
          <EmptyState icon={CalendarX} title="No slots in this range" message="Add availability slots so patients can book you."
            action={<Button icon={Plus} onClick={() => { setEditing(null); setFormOpen(true); }}>Add slot</Button>} />
        ) : (
          <div className={`space-y-5 ${slots.loading ? 'opacity-60' : ''}`}>
            {dates.map((dt) => (
              <section key={dt}>
                <h2 className="mb-2 text-sm font-semibold text-slate-700">{formatDate(dt)}</h2>
                <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white shadow-sm">
                  {byDate[dt].map((s) => {
                    const hasHistory = historyIds.has(s.id);
                    const started = startsAt(s.slotDate, s.startTime) <= now;
                    const locked = s.status !== 'AVAILABLE' || hasHistory;
                    return (
                      <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-slate-900">{formatRange(s.startTime, s.endTime)}</span>
                          <StatusBadge status={s.status} />
                          {s.status === 'AVAILABLE' && hasHistory && <span className="text-xs text-slate-500">has appointment history</span>}
                        </div>
                        {locked ? (
                          <span className="text-xs text-slate-400">{s.status === 'BOOKED' ? 'Booked: locked' : 'Locked'}</span>
                        ) : (
                          <div className="flex gap-2">
                            {!started && <Button size="sm" variant="secondary" icon={Pencil} onClick={() => { setEditing(s); setFormOpen(true); }}>Edit</Button>}
                            <Button size="sm" variant="dangerOutline" icon={Trash2} onClick={() => setDeleting(s)}>Delete</Button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}

      <SlotFormModal open={formOpen} slot={editing} onClose={() => setFormOpen(false)} onSaved={() => { setFormOpen(false); refresh(); }} />
      <ConfirmDialog open={Boolean(deleting)} title="Delete this slot?" danger loading={busy}
        message={deleting ? `${formatDate(deleting.slotDate)}, ${formatRange(deleting.startTime, deleting.endTime)} will be removed. Patients will no longer see it.` : ''}
        confirmLabel="Yes, delete" cancelLabel="Keep slot" onConfirm={confirmDelete} onCancel={() => setDeleting(null)} />
    </>
  );
}
