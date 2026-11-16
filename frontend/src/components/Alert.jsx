import { AlertCircle, CheckCircle2 } from 'lucide-react';

export default function Alert({ type = 'error', children }) {
  const isError = type === 'error';
  const Icon = isError ? AlertCircle : CheckCircle2;
  const styles = isError
    ? 'border-red-200 bg-red-50 text-red-800'
    : 'border-emerald-200 bg-emerald-50 text-emerald-800';
  return (
    <div role={isError ? 'alert' : 'status'} className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm ${styles}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}
