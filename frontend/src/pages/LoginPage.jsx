import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Loader2, Lock, Mail } from 'lucide-react';
import { parseApiError } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';
import Alert from '../components/Alert.jsx';
import AuthLayout from '../components/AuthLayout.jsx';
import TextField from '../components/TextField.jsx';
import { compact, validateEmail, validateLoginPassword } from '../utils/validation.js';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const registeredEmail = location.state?.registeredEmail;
  const returnTo = location.state?.from?.pathname || '/';

  const [email, setEmail] = useState(registeredEmail || '');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    const found = compact({ email: validateEmail(email), password: validateLoginPassword(password) });
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate(returnTo, { replace: true });
    } catch (err) {
      const { message, fieldErrors } = parseApiError(err);
      setErrors(fieldErrors);
      setFormError(message); // e.g. "Invalid email or password", "Account temporarily locked ..."
      setPassword('');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to book and manage your appointments."
      footer={<>New here? <Link to="/register" className="font-medium text-teal-700 hover:underline">Create an account</Link></>}
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {registeredEmail && !formError && <Alert type="success">Account created. Please log in.</Alert>}
        {formError && <Alert>{formError}</Alert>}
        <TextField
          id="email" label="Email" type="email" icon={Mail} autoComplete="username" placeholder="you@example.com"
          value={email} onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: '' })); }}
          error={errors.email}
        />
        <TextField
          id="password" label="Password" type="password" icon={Lock} autoComplete="current-password" placeholder="Your password"
          value={password} onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: '' })); }}
          error={errors.password}
        />
        <button
          type="submit" disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitting ? 'Logging in...' : 'Log in'}
        </button>
      </form>
    </AuthLayout>
  );
}
