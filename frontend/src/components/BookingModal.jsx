import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { bookAppointment } from '../api/appointments.js';
import { parseApiError } from '../api/client.js';
import { formatDate, formatRange } from '../utils/datetime.js';
import Alert from './Alert.jsx';
import Button from './Button.jsx';
import { TextArea } from './Fields.jsx';
import Modal from './Modal.jsx';
import { useToast } from './Toast.jsx';

const MAX_REASON = 255;

/** Confirms a slot and asks for an optional reason. onSlotGone() is called when the slot was taken/removed meanwhile. */
export default function BookingModal({ doctor, slot, onClose, onSlotGone }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [reasonError, setReasonError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { setReason(''); setError(''); setReasonError(''); }, [slot]);

  async function submit() {
    if (reason.length > MAX_REASON) { setReasonError(`Reason must be at most ${MAX_REASON} characters`); return; }
    setSubmitting(true);
    setError('');
    try {
      await bookAppointment(slot.id, reason.trim());
      toast.success('Appointment requested. The doctor will confirm it shortly.');
      navigate('/patient/appointments');
    } catch (err) {
      const { status, message, fieldErrors } = parseApiError(err);
      if (fieldErrors.reason) setReasonError(fieldErrors.reason);
      else if (status === 409 || status === 404) { toast.error(message); onSlotGone(); } // slot booked by someone else / removed
      else setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={Boolean(slot)} title="Book appointment" onClose={onClose} busy={submitting}
      footer={<>
        <Button variant="secondary" onClick={onClose} disabled={submitting}>Back</Button>
        <Button onClick={submit} loading={submitting}>Request appointment</Button>
      </>}>
      {slot && (
        <div className="space-y-4">
          {error && <Alert>{error}</Alert>}
          <div className="rounded-lg bg-slate-50 p-3 text-sm">
            <p className="font-semibold text-slate-900">{doctor.fullName}</p>
            <p className="text-slate-600">{formatDate(slot.slotDate)}</p>
            <p className="text-slate-600">{formatRange(slot.startTime, slot.endTime)}</p>
            <p className="text-slate-500">{doctor.clinicAddress}</p>
          </div>
          <TextArea id="reason" label="Reason for visit" optional maxLength={MAX_REASON} value={reason}
            placeholder="e.g. Fever since 2 days" error={reasonError}
            onChange={(e) => { setReason(e.target.value); setReasonError(''); }} />
          <p className="text-xs text-slate-500">The doctor must approve the request before it is confirmed.</p>
        </div>
      )}
    </Modal>
  );
}
