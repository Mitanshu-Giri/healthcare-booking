import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { HeartPulse, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../auth/AuthContext.jsx';

/** Top navbar + sidebar (drawer on mobile) shared by all logged-in pages. `nav` = [{ to, label, icon, end? }] */
export default function AppLayout({ nav }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => { setOpen(false); }, [location.pathname]);

  const link = ({ isActive }) =>
    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${isActive ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white px-4 sm:px-6">
        <button onClick={() => setOpen((o) => !o)} aria-label="Toggle menu" aria-expanded={open} className="rounded-md p-2 text-slate-600 hover:bg-slate-100 lg:hidden">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <div className="flex items-center gap-2 text-lg font-semibold text-teal-700"><HeartPulse className="h-6 w-6" /> MediBook</div>
        <div className="ml-auto flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium leading-tight text-slate-900">{user.fullName}</p>
            <p className="text-xs text-slate-500">{user.role}</p>
          </div>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-100 text-sm font-semibold text-teal-700" aria-hidden="true">
            {user.fullName.trim().charAt(0).toUpperCase()}
          </span>
          <button onClick={logout} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
            <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Log out</span>
          </button>
        </div>
      </header>

      <div className="lg:flex">
        {open && <div className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden" onClick={() => setOpen(false)} aria-hidden="true" />}
        <aside className={`fixed inset-y-0 left-0 z-40 w-64 transform border-r border-slate-200 bg-white px-3 pb-6 pt-20 transition-transform lg:sticky lg:top-16 lg:z-0 lg:h-[calc(100vh-4rem)] lg:translate-x-0 lg:pt-6 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
          <nav className="space-y-1" aria-label="Main">
            {nav.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} className={link}><Icon className="h-5 w-5" /> {label}</NavLink>
            ))}
          </nav>
        </aside>
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl"><Outlet /></div>
        </main>
      </div>
    </div>
  );
}
