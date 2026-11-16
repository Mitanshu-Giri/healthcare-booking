import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Lock, Mail, Phone, User } from 'lucide-react';
import { registerRequest } from '../api/auth.js';
import { parseApiError } from '../api/client.js';
import Alert from '../components/Alert.jsx';
import AuthLayout from '../components/AuthLayout.jsx';
import TextField from '../components/TextField.jsx';
import { compact, validateEmail, validateFullName, validateNewPassword, validatePhone } from '../utils/validation.js';

const EMPTY = { fullName: '', email: '', phone: '', password: '', confirmPassword: '' };

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((p) => ({ ...p, [field]: '' }));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    const found = compact({
      fullName: validateFullName(form.fullName),
      email: validateEmail(form.email),
      phone: validatePhone(form.phone),
      password: validateNewPassword(form.password),
      confirmPassword: form.confirmPassword === form.password ? '' : 'Passwords do not match',
    });
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    try {
      const created = await registerRequest({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone.trim(),
      });
      // Registration returns no token, so go to the login page with the e-mail filled in.
      navigate('/login', { replace: true, state: { registeredEmail: created.email } });
    } catch (err) {
      const { message, fieldErrors } = parseApiError(err);
      setErrors(fieldErrors); // field names match the backend: fullName, email, password, phone
      setFormError(Object.keys(fieldErrors).length > 0 ? 'Please fix the highlighted fields.' : message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Register as a patient to start booking appointments."
      footer={<>Already have an account? <Link to="/login" className="font-medium text-teal-700 hover:underline">Log in</Link></>}
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {formError && <Alert>{formError}</Alert>}
        <TextField id="fullName" label="Full name" icon={User} autoComplete="name" placeholder="Asha Verma"
          value={form.fullName} onChange={set('fullName')} error={errors.fullName} />
        <TextField id="email" label="Email" type="email" icon={Mail} autoComplete="email" placeholder="you@example.com"
          value={form.email} onChange={set('email')} error={errors.email} />
        <TextField id="phone" label="Phone" type="tel" icon={Phone} autoComplete="tel" optional placeholder="9876543210"
          value={form.phone} onChange={set('phone')} error={errors.phone} />
        <TextField id="password" label="Password" type="password" icon={Lock} autoComplete="new-password" placeholder="Create a password"
          hint="8-64 characters with an uppercase letter, a lowercase letter and a number."
          value={form.password} onChange={set('password')} error={errors.password} />
        <TextField id="confirmPassword" label="Confirm password" type="password" icon={Lock} autoComplete="new-password" placeholder="Repeat the password"
          value={form.confirmPassword} onChange={set('confirmPassword')} error={errors.confirmPassword} />
        <button
          type="submit" disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitting ? 'Creating account...' : 'Create account'}
        </button>
      </form>
    </AuthLayout>
  );
}
