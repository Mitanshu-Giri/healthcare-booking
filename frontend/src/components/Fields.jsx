// Plain form controls styled like TextField (which handles text/date/time inputs with icons).
const base = 'block w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:ring-2';
const ok = 'border-slate-300 focus:border-teal-500 focus:ring-teal-200';
const bad = 'border-red-400 focus:border-red-500 focus:ring-red-200';

export function Select({ id, label, error, children, ...rest }) {
  return (
    <div>
      {label && <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>}
      <select id={id} className={`${base} ${error ? bad : ok}`} {...rest}>{children}</select>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function TextArea({ id, label, error, hint, optional = false, maxLength, value, ...rest }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}{optional && <span className="ml-1 font-normal text-slate-400">(optional)</span>}
      </label>
      <textarea id={id} rows={3} value={value} maxLength={maxLength} aria-invalid={error ? 'true' : 'false'} className={`${base} ${error ? bad : ok}`} {...rest} />
      <div className="mt-1 flex justify-between text-xs">
        <span className={error ? 'text-red-600' : 'text-slate-500'}>{error || hint || ''}</span>
        {maxLength && <span className="text-slate-400">{value.length}/{maxLength}</span>}
      </div>
    </div>
  );
}
