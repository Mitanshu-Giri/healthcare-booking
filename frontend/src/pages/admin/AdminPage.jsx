import { Info, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext.jsx';
import PageHeader from '../../components/PageHeader.jsx';

// The backend has NO admin endpoints: only the URL area /api/admin/** is locked to the ADMIN role,
// and an admin account can be created on startup. So there is nothing real to show here yet.
// This page is deliberately honest instead of faking data.
const PENDING = ['List, approve and deactivate doctors', 'List and manage patients', 'Dashboard statistics (totals, appointments per status)'];

export default function AdminPage() {
  const { user } = useAuth();
  return (
    <>
      <PageHeader title="Admin" subtitle={`Signed in as ${user.fullName}.`} />
      <div className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700"><ShieldCheck className="h-6 w-6" /></span>
        <h2 className="mt-4 text-lg font-semibold text-slate-900">Admin tools are not available yet</h2>
        <p className="mt-1 text-sm text-slate-600">Your admin login works, but the backend does not provide any admin APIs yet, so no data can be shown or managed here.</p>
        <p className="mt-4 text-sm font-medium text-slate-700">Waiting for backend support:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">{PENDING.map((p) => <li key={p}>{p}</li>)}</ul>
        <p className="mt-5 flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
          <Info className="mt-0.5 h-4 w-4 shrink-0" /> This page will be replaced once admin endpoints exist in the backend.
        </p>
      </div>
    </>
  );
}
