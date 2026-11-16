import { HeartPulse, LogOut } from 'lucide-react';
import { useAuth } from '../auth/AuthContext.jsx';

// Temporary landing page after login. It only proves that the session works;
// the real pages (doctors list, booking, my appointments) come in the next frontend tasks.
export default function HomePage() {
  const { user, logout } = useAuth();
  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex items-center gap-2 text-lg font-semibold text-teal-700">
          <HeartPulse className="h-6 w-6" /> MediBook
        </div>
        <h1 className="mt-6 text-2xl font-bold text-slate-900">Hello, {user.fullName}</h1>
        <p className="mt-1 text-slate-600">You are logged in as <span className="font-medium">{user.role}</span> ({user.email}).</p>
        <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-500">
          Login works. Doctors, booking and appointments pages are built in the next steps.
        </p>
        <button
          onClick={logout}
          className="mt-6 inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-200"
        >
          <LogOut className="h-4 w-4" /> Log out
        </button>
      </div>
    </div>
  );
}
