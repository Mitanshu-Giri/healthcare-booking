import { Info, Mail, ShieldCheck, User } from 'lucide-react';
import { meRequest } from '../../api/auth.js';
import ErrorState from '../../components/ErrorState.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import ListSkeleton from '../../components/Skeleton.jsx';
import useFetch from '../../hooks/useFetch.js';
import { initials } from '../../utils/format.js';

// The backend only offers GET /api/auth/me (id, fullName, email, role): no phone, no edit endpoint.
export default function ProfilePage() {
  const { data, error, reload } = useFetch(() => meRequest(), []);
  return (
    <>
      <PageHeader title="My profile" subtitle="Your account details." />
      {error && !data ? <ErrorState error={error} onRetry={reload} /> : !data ? <ListSkeleton rows={1} /> : (
        <div className="max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-teal-100 text-xl font-semibold text-teal-700">{initials(data.fullName)}</span>
            <div><p className="text-xl font-bold text-slate-900">{data.fullName}</p><p className="text-sm text-slate-500">Patient</p></div>
          </div>
          <dl className="mt-6 space-y-4 text-sm">
            <Row icon={User} label="Full name" value={data.fullName} />
            <Row icon={Mail} label="Email" value={data.email} />
            <Row icon={ShieldCheck} label="Account type" value={data.role} />
          </dl>
          <p className="mt-6 flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
            <Info className="mt-0.5 h-4 w-4 shrink-0" /> Editing the profile (and showing the phone number) is not available yet because the backend has no API for it.
          </p>
        </div>
      )}
    </>
  );
}

function Row({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 text-slate-400" />
      <dt className="w-28 text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900">{value}</dd>
    </div>
  );
}
