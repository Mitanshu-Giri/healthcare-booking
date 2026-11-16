import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../auth/AuthContext.jsx';
import { homePathFor } from '../utils/roles.js';

export default function ForbiddenPage() {
  const { user } = useAuth();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <ShieldAlert className="h-12 w-12 text-amber-500" />
      <h1 className="mt-3 text-2xl font-bold text-slate-900">Access denied</h1>
      <p className="mt-1 max-w-sm text-slate-600">Your account ({user?.role}) cannot open this page.</p>
      <Link to={user ? homePathFor(user.role) : '/login'} className="mt-4 font-medium text-teal-700 hover:underline">Go to my dashboard</Link>
    </div>
  );
}
