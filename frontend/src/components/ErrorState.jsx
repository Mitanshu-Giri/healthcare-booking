import { AlertCircle, RefreshCw } from 'lucide-react';
import Button from './Button.jsx';

/** Shown when a page's data could not be loaded. `error` is the object from parseApiError. */
export default function ErrorState({ error, onRetry }) {
  const status = error?.status;
  const title = status === 403 ? 'Access denied' : status === 404 ? 'Not found' : status >= 500 ? 'Server problem' : 'Could not load this page';
  return (
    <div role="alert" className="flex flex-col items-center rounded-2xl border border-red-200 bg-red-50 px-6 py-10 text-center">
      <AlertCircle className="h-8 w-8 text-red-500" />
      <h3 className="mt-3 text-base font-semibold text-red-900">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-red-800">{error?.message}</p>
      {onRetry && <Button className="mt-4" variant="secondary" size="sm" icon={RefreshCw} onClick={onRetry}>Try again</Button>}
    </div>
  );
}
