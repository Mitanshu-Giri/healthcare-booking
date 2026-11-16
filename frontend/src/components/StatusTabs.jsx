import { APPOINTMENT_STATUSES, statusLabel } from '../utils/status.js';

/** Filter chips: "All" + the five appointment statuses. value 'ALL' means no filter. */
export default function StatusTabs({ value, onChange }) {
  const items = ['ALL', ...APPOINTMENT_STATUSES];
  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Filter by status">
      {items.map((s) => (
        <button key={s} role="tab" aria-selected={value === s} onClick={() => onChange(s)}
          className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition ${value === s ? 'bg-teal-600 text-white shadow-sm' : 'border border-slate-300 bg-white text-slate-600 hover:bg-slate-50'}`}>
          {s === 'ALL' ? 'All' : statusLabel(s)}
        </button>
      ))}
    </div>
  );
}
