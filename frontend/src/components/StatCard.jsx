export default function StatCard({ icon: Icon, label, value, tone = 'teal' }) {
  const tones = { teal: 'bg-teal-50 text-teal-700', amber: 'bg-amber-50 text-amber-700', emerald: 'bg-emerald-50 text-emerald-700', sky: 'bg-sky-50 text-sky-700', slate: 'bg-slate-100 text-slate-600' };
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}><Icon className="h-5 w-5" /></span>
      <div>
        <p className="text-2xl font-bold leading-none text-slate-900">{value}</p>
        <p className="mt-1 text-xs font-medium text-slate-500">{label}</p>
      </div>
    </div>
  );
}
