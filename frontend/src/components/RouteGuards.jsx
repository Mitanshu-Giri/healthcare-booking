import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import ForbiddenPage from '../pages/ForbiddenPage.jsx';
import { homePathFor } from '../utils/roles.js';
import Spinner from './Spinner.jsx';

/** Pages that need a login. Anonymous visitors are sent to /login and returned here afterwards. */
export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <Spinner fullScreen />;
  if (status === 'anonymous') return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}

/** Pages for one role only. A logged-in user of another role sees the "access denied" page. */
export function RoleRoute({ role }) {
  const { status, user } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <Spinner fullScreen />;
  if (status === 'anonymous') return <Navigate to="/login" replace state={{ from: location }} />;
  if (user.role !== role) return <ForbiddenPage />;
  return <Outlet />;
}

/** "/" sends each role to its own dashboard. */
export function RoleHome() {
  const { user } = useAuth();
  return <Navigate to={homePathFor(user.role)} replace />;
}

/** Login/Register: a logged-in user has no business here, so send them to their dashboard. */
export function GuestRoute() {
  const { status, user } = useAuth();
  if (status === 'loading') return <Spinner fullScreen />;
  if (status === 'authenticated') return <Navigate to={homePathFor(user.role)} replace />;
  return <Outlet />;
}
