# Frontend manual test checklist

**Status:** the frontend was NOT run in a browser by the author of this code. It was only checked with esbuild (all 53 modules bundle,
imports/named exports/routes resolve) and Node runs of the utility logic. Treat every item below as untested until you tick it.
When something fails, note the page, what you clicked, the red toast/panel text, and the browser console (F12) error.

## 0. Prepare
1. MySQL + backend running (`SEED_DEMO_DATA` not `false`). Frontend: `cd frontend`, `npm install`, `npm run dev`, open http://localhost:5173.
2. Accounts: Doctor `priya.sharma@demo.healthcare.example` / `Doctor@123` (second doctor: `rahul.mehta@demo.healthcare.example`).
   Patients: register two new ones in step 1 (Patient A, Patient B). Admin only exists if `ADMIN_EMAIL`/`ADMIN_PASSWORD` were set when the backend started.
3. Use two browsers (or one normal + one private window) so a doctor and a patient can be logged in at the same time (login is stored per tab/session).

## 1. Login / Register (regression of the earlier module)
- [ ] Register Patient A with valid data -> lands on login with the e-mail filled in and "Account created".
- [ ] Register with an existing e-mail -> "An account with this email already exists". Weak password and mismatched confirm show field errors.
- [ ] Log in with a wrong password -> "Invalid email or password". Correct password -> Patient dashboard.
- [ ] Register Patient B the same way.

## 2. Role routing
- [ ] While logged in as a patient open `/doctor` -> "Access denied" page with a link back. `/admin` -> same.
- [ ] Open `/login` while logged in -> redirected to your dashboard. Open `/` -> your dashboard. Open `/nonsense` -> 404 page.
- [ ] Log out -> `/patient` redirects to `/login`.

## 3. Doctor: slots (do this first so the patient has something to book)
Log in as Dr. Priya Sharma.
- [ ] Dashboard loads (numbers may be 0), no errors.
- [ ] My slots -> empty state or existing slots -> "Add slot": try a past date, end before start, a 5-minute slot -> field errors; nothing is sent.
- [ ] Create 3 slots for tomorrow (e.g. 10:00-10:30, 10:30-11:00, 11:00-11:30) and one for the day after -> success toast, they appear grouped by date.
- [ ] Create an overlapping slot (10:15-10:45) -> red message "This time overlaps with another slot of yours" inside the dialog.
- [ ] Edit a free slot (change the time) -> updated. Delete a free slot -> confirmation dialog -> "Keep slot" does nothing; "Yes, delete" removes it.

## 4. Patient: browse and book (Patient A)
- [ ] Dashboard: stat cards show 0, "No upcoming appointments", speciality chips; clicking a chip opens the doctor list filtered.
- [ ] Find doctors: all active doctors (6 demo doctors; the deactivated one must NOT appear). Search "Sharma" (waits ~0.3 s), speciality filter, sort by experience and fee. Search for "zzz" -> empty state.
- [ ] Open Dr. Priya Sharma: qualification, bio, experience, fee, address, speciality chips. Date chips show dates with slot counts; clicking a chip shows its time buttons.
- [ ] Click a slot -> dialog. Type 256+ characters (counter stops at 255). Book with reason "Fever since 2 days" -> success toast and My appointments opens with a PENDING appointment.
- [ ] Go back to the doctor page: the booked slot is gone from the list.
- [ ] Open `/patient/doctors/999999` -> "Not found" panel. Open `/patient/doctors/abc` -> error panel (400 message).

## 5. Double booking from the UI (409)
- [ ] Patient A and Patient B (second browser) both open the same doctor page and the same free slot. Patient A books it. Then Patient B clicks Request -> red toast "This slot has already been booked", dialog closes, the slot disappears from the list.

## 6. Doctor: handle requests
Log in as Dr. Priya in the other browser.
- [ ] Dashboard: "Pending requests" count and list. Appointments tab defaults to Pending; patient name, phone (if registered with one; otherwise "No phone provided"), date/time, reason are shown. The patient e-mail must NOT be shown.
- [ ] Approve one -> toast, it moves to Confirmed (filter tabs: All / Pending / Confirmed / Rejected / Cancelled / Completed).
- [ ] Reject another -> confirmation dialog -> "Go back" / "Yes, reject" -> Rejected. In My slots that slot is free again; the patient sees it as Rejected.
- [ ] "Mark completed" on a confirmed appointment whose time is in the future -> red toast "An appointment can be completed only after its start time" (expected). Completing works only after the slot has started (see section 8).

## 7. Patient: my appointments and cancel
- [ ] Filter tabs work; empty states read "No rejected appointments" etc.
- [ ] Cancel a Pending or Confirmed appointment -> confirmation -> success toast -> status Cancelled, the slot becomes bookable again on the doctor page.
- [ ] Rejected/Cancelled/Completed appointments have no Cancel button.
- [ ] Dashboard now shows correct counts and the "Next appointment" card. Profile page shows name, e-mail, role (phone/edit are not available: backend has no API).

## 8. Slot protection (doctor)
- [ ] A booked slot shows "Booked: locked" without Edit/Delete. A freed slot that had an appointment shows "has appointment history" and is locked.
- [ ] Optional completion test: create a slot that starts in ~3 minutes (DoctorSlotsPage, today), book it as a patient, approve it, wait until it started, then "Mark completed" -> Completed.

## 9. Errors and sessions
- [ ] Stop the backend, click around -> "Cannot reach the server ..." in panels/toasts; start it again and press "Try again".
- [ ] Session expiry: start the backend with `JWT_EXPIRATION_MINUTES=1`, log in, wait 2 minutes, click a page -> "Your session has expired" toast and the login page. (Optional.)
- [ ] Log in as a doctor and call a patient page by URL (`/patient/appointments`) -> Access denied.

## 10. Admin
- [ ] If an admin account exists: log in -> `/admin` shows "Admin tools are not available yet". No other admin functionality exists by design.

## 11. Responsive
- [ ] Desktop: sidebar visible. At phone width (~375 px, F12 device toolbar): sidebar hidden, hamburger opens a drawer, cards stack, dialogs slide from the bottom, date chips scroll sideways, no horizontal page scroll.

## Result log
| Section | Pass / Fail | Notes (page, action, message, console error) |
|---|---|---|
