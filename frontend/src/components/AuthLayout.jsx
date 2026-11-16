import { CalendarCheck, HeartPulse, ShieldCheck, Stethoscope } from 'lucide-react';

const points = [
  { icon: Stethoscope, text: 'Find verified doctors by speciality' },
  { icon: CalendarCheck, text: 'Book an open slot in a few clicks' },
  { icon: ShieldCheck, text: 'Your password is stored hashed, never in plain text' },
];

/** Two-column shell for Login/Register: brand panel (desktop only) + form card. */
export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-cyan-600 p-12 text-white lg:flex">
        <div className="flex items-center gap-2 text-xl font-semibold">
          <HeartPulse className="h-7 w-7" /> MediBook
        </div>
        <div>
          <h2 className="max-w-md text-4xl font-bold leading-tight">Healthcare appointments, without the waiting room.</h2>
          <ul className="mt-8 space-y-4">
            {points.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-teal-50">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15"><Icon className="h-5 w-5" /></span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-teal-100">Internship project: React + Spring Boot + MySQL</p>
      </aside>

      <main className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-2 text-xl font-semibold text-teal-700 lg:hidden">
            <HeartPulse className="h-6 w-6" /> MediBook
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          <div className="mt-6">{children}</div>
          <div className="mt-6 text-center text-sm text-slate-600">{footer}</div>
        </div>
      </main>
    </div>
  );
}
