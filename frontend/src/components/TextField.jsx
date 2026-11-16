import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

/** Label + input with a left icon, an optional show/hide button for passwords, and an error line. */
export default function TextField({ id, label, icon: Icon, type = 'text', error, hint, optional = false, ...inputProps }) {
  const [visible, setVisible] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword && visible ? 'text' : type;
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
        {optional && <span className="ml-1 font-normal text-slate-400">(optional)</span>}
      </label>
      <div className="relative">
        {Icon && <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />}
        <input
          id={id}
          type={inputType}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={describedBy}
          className={`block w-full rounded-lg border bg-white py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:ring-2 ${
            Icon ? 'pl-10' : 'pl-3'
          } ${isPassword ? 'pr-11' : 'pr-3'} ${
            error ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : 'border-slate-300 focus:border-teal-500 focus:ring-teal-200'
          }`}
          {...inputProps}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Hide password' : 'Show password'}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-200"
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1 text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}
