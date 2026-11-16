import Button from './Button.jsx';
import Modal from './Modal.jsx';

/** Asks before a destructive action. `onConfirm` may be async; `loading` disables the buttons. */
export default function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Keep it', danger = true, loading = false, onConfirm, onCancel }) {
  return (
    <Modal open={open} title={title} onClose={onCancel} busy={loading}
      footer={<>
        <Button variant="secondary" onClick={onCancel} disabled={loading}>{cancelLabel}</Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
      </>}>
      <p className="text-sm text-slate-600">{message}</p>
    </Modal>
  );
}
