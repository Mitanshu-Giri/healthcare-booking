import { Route, Routes } from 'react-router-dom';
import AppLayout from './components/AppLayout.jsx';
import { ADMIN_NAV, DOCTOR_NAV, PATIENT_NAV } from './components/navConfig.js';
import { GuestRoute, ProtectedRoute, RoleHome, RoleRoute } from './components/RouteGuards.jsx';
import AdminPage from './pages/admin/AdminPage.jsx';
import DoctorAppointmentsPage from './pages/doctor/DoctorAppointmentsPage.jsx';
import DoctorDashboardPage from './pages/doctor/DoctorDashboardPage.jsx';
import DoctorSlotsPage from './pages/doctor/DoctorSlotsPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import DoctorDetailPage from './pages/patient/DoctorDetailPage.jsx';
import DoctorsPage from './pages/patient/DoctorsPage.jsx';
import MyAppointmentsPage from './pages/patient/MyAppointmentsPage.jsx';
import PatientDashboardPage from './pages/patient/PatientDashboardPage.jsx';
import ProfilePage from './pages/patient/ProfilePage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<RoleHome />} />
      </Route>

      <Route element={<RoleRoute role="PATIENT" />}>
        <Route element={<AppLayout nav={PATIENT_NAV} />}>
          <Route path="/patient" element={<PatientDashboardPage />} />
          <Route path="/patient/doctors" element={<DoctorsPage />} />
          <Route path="/patient/doctors/:id" element={<DoctorDetailPage />} />
          <Route path="/patient/appointments" element={<MyAppointmentsPage />} />
          <Route path="/patient/profile" element={<ProfilePage />} />
        </Route>
      </Route>

      <Route element={<RoleRoute role="DOCTOR" />}>
        <Route element={<AppLayout nav={DOCTOR_NAV} />}>
          <Route path="/doctor" element={<DoctorDashboardPage />} />
          <Route path="/doctor/slots" element={<DoctorSlotsPage />} />
          <Route path="/doctor/appointments" element={<DoctorAppointmentsPage />} />
        </Route>
      </Route>

      <Route element={<RoleRoute role="ADMIN" />}>
        <Route element={<AppLayout nav={ADMIN_NAV} />}>
          <Route path="/admin" element={<AdminPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
