# Frontend (React + Vite + Tailwind)

Stack: React 18, Vite 5, Tailwind CSS 3, React Router 6, Axios, Lucide React (JavaScript). Node 18+ is enough
(newer Vite/Router majors need Node 20, so these versions were chosen on purpose). No other libraries.

## Run
```
cd frontend
copy .env.example .env      (skip if .env already exists; macOS/Linux: cp)
npm install
npm run dev                 -> http://localhost:5173   (port is fixed: the backend allows only this origin)
npm run build               (optional: production build check)
```
Backend must run on `VITE_API_BASE_URL` (default `http://localhost:8080`). Restart `npm run dev` after editing `.env`.
Manual test steps: `docs/FRONTEND_TESTING.md`.

## Routes
| Path | Role | Page |
|---|---|---|
| `/login`, `/register` | logged-out only | Login / Register |
| `/` | any logged-in | redirects to the role's dashboard |
| `/patient` | PATIENT | Dashboard |
| `/patient/doctors` | PATIENT | Doctors list (search, speciality, sort) |
| `/patient/doctors/:id` | PATIENT | Doctor details, date-wise slots, booking |
| `/patient/appointments` | PATIENT | My appointments (status filter, cancel) |
| `/patient/profile` | PATIENT | Read-only profile |
| `/doctor` | DOCTOR | Dashboard |
| `/doctor/slots` | DOCTOR | Own slots: add / edit / delete |
| `/doctor/appointments` | DOCTOR | Requests: status filter, approve, reject, complete |
| `/admin` | ADMIN | "Not available yet" page (backend has no admin APIs) |

A logged-in user of another role who opens a wrong URL sees the "Access denied" page. Unknown URLs show 404.

## Structure
```
src/
  api/          client.js (Axios, Bearer token, 401 handling, parseApiError), auth.js, doctors.js, appointments.js, doctorPortal.js
  auth/         tokenStorage.js (sessionStorage), AuthContext.jsx
  hooks/        useFetch.js (load/error/reload, ignores outdated responses)
  components/   AppLayout (navbar + sidebar), navConfig, RouteGuards, Button, Modal, ConfirmDialog, Toast, StatusBadge, StatusTabs,
                EmptyState, ErrorState, Skeleton, StatCard, PageHeader, TextField, Fields (Select, TextArea), DoctorCard,
                BookingModal, SlotFormModal, DoctorAppointmentList, Alert, Spinner, AuthLayout
  pages/        LoginPage, RegisterPage, NotFoundPage, ForbiddenPage; patient/*, doctor/*, admin/*
  utils/        datetime, status, roles, format, validation, slotValidation
```

## JWT handling (unchanged from the login module)
Token + expiry + user live in `sessionStorage` (`hb.session`). Axios adds `Authorization: Bearer ...`. A 401 on a logged-in
request logs the user out, shows "Your session has expired" and sends them to `/login`. On refresh the token is re-checked with `GET /api/auth/me`.

## Error handling
Every API error uses the backend format `{ status, message, fieldErrors? }`. Pages show the backend `message`:
401 -> logout + login page; 403/404/500 on page load -> error panel with "Try again"; 409/404/403 on actions (book, cancel, approve, ...) -> toast + the list is refreshed;
validation (400) -> messages under the form fields; no connection -> "Cannot reach the server ...".
