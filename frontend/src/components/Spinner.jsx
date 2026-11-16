import { Loader2 } from 'lucide-react';

export default function Spinner({ fullScreen = false }) {
  const icon = <Loader2 className="h-8 w-8 animate-spin text-teal-600" aria-label="Loading" />;
  if (!fullScreen) return icon;
  return <div className="flex min-h-screen items-center justify-center">{icon}</div>;
}
