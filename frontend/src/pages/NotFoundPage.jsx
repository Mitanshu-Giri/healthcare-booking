import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <p className="text-5xl font-bold text-teal-600">404</p>
      <p className="mt-2 text-slate-600">This page does not exist.</p>
      <Link to="/" className="mt-4 font-medium text-teal-700 hover:underline">Go to the home page</Link>
    </div>
  );
}
