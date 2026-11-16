import { Loader2 } from 'lucide-react';

const VARIANTS = {
  primary: 'bg-teal-600 text-white hover:bg-teal-700 focus:ring-teal-300 shadow-sm',
  secondary: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus:ring-teal-200',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-300 shadow-sm',
  dangerOutline: 'border border-red-200 bg-white text-red-700 hover:bg-red-50 focus:ring-red-200',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-300 shadow-sm',
};
const SIZES = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2.5 text-sm' };

export default function Button({ variant = 'primary', size = 'md', loading = false, icon: Icon, children, className = '', disabled, type = 'button', ...rest }) {
  return (
    <button type={type} disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...rest}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}
