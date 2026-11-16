import { useEffect, useState } from 'react';
import { CalendarClock, Clock } from 'lucide-react';
import { createSlot, updateSlot } from '../api/doctorPortal.js';
import { parseApiError } from '../api/client.js';
import { addDaysISO, todayISO } from '../utils/datetime.js';
import { slotDateBounds, validateSlotForm } from '../utils/slotValidation.js';
import Alert from './Alert.jsx';
import Button from './Button.jsx';
import Modal from './Modal.jsx';
import TextField from './TextField.jsx';
import { useToast } from './Toast.jsx';

/** Create (slot = null) or edit (slot = SlotDto) an availability slot. open: boolean. */
export default function SlotFormModal({ open, slot, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({ slotDate: '', startTime: '', endTime: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(slot
      ? { slotDate: slot.slotDate, startTime: slot.startTime, endTime: slot.endTime }
      : { slotDate: addDaysISO(todayISO(), 1), startTime: '10:00', endTime: '10:30' });
    setErrors({});
    setFormError('');
  }, [open, slot]);

  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setErrors((p) => ({ ...p, [k]: '' })); };

  async function submit(e) {
    e.preventDefault();
    setFormError('');
    const found = validateSlotForm(form);
    setErrors(found);
    if (Object.keys(found).length) return;

    setSaving(true);
    try {
      if (slot) await updateSlot(slot.id, form); else await createSlot(form);
      toast.success(slot ? 'Slot updated.' : 'Slot created.');
      onSaved();
    } catch (err) {
      const { message, fieldErrors } = parseApiError(err);
      setErrors(fieldErrors);
      setFormError(message); // overlap (409), booked/history (409), rule errors (400)
    } finally {
      setSaving(false);
    }
  }

  const { min, max } = slotDateBounds();
  return (
    <Modal open={open} title={slot ? 'Edit slot' : 'Add availability slot'} onClose={onClose} busy={saving}
      footer={<>
        <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button type="submit" form="slot-form" loading={saving}>{slot ? 'Save changes' : 'Create slot'}</Button>
      </>}>
      <form id="slot-form" onSubmit={submit} noValidate className="space-y-4">
        {formError && <Alert>{formError}</Alert>}
        <TextField id="slotDate" label="Date" type="date" icon={CalendarClock} min={min} max={max} value={form.slotDate} onChange={set('slotDate')} error={errors.slotDate} />
        <div className="grid grid-cols-2 gap-3">
          <TextField id="startTime" label="Start time" type="time" icon={Clock} value={form.startTime} onChange={set('startTime')} error={errors.startTime} />
          <TextField id="endTime" label="End time" type="time" icon={Clock} value={form.endTime} onChange={set('endTime')} error={errors.endTime} />
        </div>
        <p className="text-xs text-slate-500">Slots are 10 to 180 minutes long, must be in the future (up to 90 days ahead) and must not overlap another slot.</p>
      </form>
    </Modal>
  );
}
