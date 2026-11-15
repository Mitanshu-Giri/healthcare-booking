# PROJECT_STATUS.md — Healthcare Appointment Booking System

Last updated: 2026-11-15

## 1. Current state (read this first)

**Confirmed working by the student on their own machine:** backend + MySQL + Flyway (V1, V2), patient register/login, Doctors API (`GET /api/doctors` returned the 6 demo doctors), doctor login, and all planned Postman tests for doctor slots (create/list/update/delete, overlap 409, public slot view, role checks) passed.

**Update 2026-11-15:** the student confirmed the appointment module on their machine: 15 happy-path Postman tests passed, Flyway V3 applied, backend runs. The "NOT verified" list below is therefore partly outdated (real compile, V3, basic flows are OK). Still unverified: the negative/security tests and the real concurrency run. Automated negative tests were added in `tests/postman/` (see `docs/AUTOMATED_TESTS.md`); they were only checked against a mock, NOT the real backend. Suspected defect: text/plain body gives 500 instead of 415 (DEF-01), not fixed.

**Appointment booking module (added 2026-11-14), original verification notes:**
What WAS checked in the Claude cloud session (no Maven network, no MySQL there):
- Type-check of 38 project files (all entity/repository/dto/service/controller code incl. the new module) against hand-written stubs of Spring/JPA: clean. A deliberately injected typo was caught, so the check is not vacuous. SecurityConfig, JwtService, JwtAuthFilter, AuthService, AuthController, GlobalExceptionHandler and the initializers were NOT type-checked (they need heavy library stubs); only SecurityConfig changed (one added line).
- 45 behaviour checks of `AppointmentService` and the new `SlotService` guard using in-memory fake repositories: 45 passed, 0 failed (state machine, error codes/messages, ownership 404s, doctor-not-approved 403, past-slot rules, history guard).
- `scripts/concurrency-test.mjs` was validated against a mock server (PASS with a correct mock, FAIL with a double-booking mock).
NOT verified: real Maven compile, Flyway V3 on MySQL, the JPQL queries, SELECT ... FOR UPDATE behaviour, HTTP/security wiring, the real concurrency test.
**Student must:** restart the backend (V3 runs), then follow `docs/APPOINTMENT_TESTS.md` and run `node scripts/concurrency-test.mjs <slotId>`. Report errors. If V3 breaks startup see the "If V3 fails" section of that file.

DEADLINE: student has only 3 days from 2026-11-12 (until about 2026-11-15). Cut: no admin dashboard, no refresh tokens, no OTP, minimal tests. Doctors are seeded (no doctor signup UI). Priority now: verify appointments, then the React frontend.

Scope decision: **Reduced scope**. Schema keeps all 8 tables.

## 2. Files (all under `healthcare-booking/`)

Root: `README.md`, `PROJECT_STATUS.md`, `.env.example`, `.gitignore`
Docs: `docs/API.md`, `docs/APPOINTMENT_TESTS.md`, `docs/AUTOMATED_TESTS.md`, `docs/TEST_REPORT_TEMPLATE.md`
Tests: `tests/postman/` (collection, NoTime collection, environment, `build-collection.mjs`, `summarize-newman.mjs`)
Scripts: `scripts/concurrency-test.mjs`

Backend (`backend/`):
- `pom.xml` (Spring Boot 3.3.5, Java 17, jjwt 0.12.6, Flyway + flyway-mysql, MySQL connector; no Lombok), `application.yml`
- Migrations: `V1__create_schema.sql`, `V2__seed_specializations.sql`, `V3__one_active_appointment_per_slot.sql` (NEW, unverified on MySQL)
- Package `com.healthcare.booking`:
  - entity: `Role`, `User`, `PatientProfile`, `Specialization`, `ApprovalStatus`, `DoctorProfile`, `SlotStatus`, `AvailabilitySlot` (+`markBooked/markAvailable`), `AppointmentStatus`, `Appointment`
  - repository: `UserRepository`, `PatientProfileRepository` (+`findByUserId`), `SpecializationRepository`, `DoctorProfileRepository`, `AvailabilitySlotRepository` (+`findByIdForUpdate`), `AppointmentRepository`
  - dto: `RegisterRequest`, `LoginRequest`, `UserDto`, `AuthResponse`, `SpecializationDto`, `DoctorDto`, `SlotRequest`, `SlotDto`, `BookAppointmentRequest`, `AppointmentDto`, `DoctorAppointmentDto`
  - exception: `ApiException`, `ErrorResponse`, `GlobalExceptionHandler`
  - security: `JwtService`, `JwtAuthFilter`, `AuthenticatedUser`
  - config: `SecurityConfig`, `AdminInitializer`, `DemoDataInitializer`
  - service: `AuthService`, `DoctorService`, `SlotService` (+history guard), `AppointmentService`
  - controller: `AuthController`, `SpecializationController`, `DoctorController`, `DoctorSlotController`, `DoctorAvailabilityController`, `AppointmentController` (`/api/appointments`), `DoctorAppointmentController` (`/api/doctor/appointments`)

## 3. Implemented features

- Auth: patient registration (role forced server-side), BCrypt(12), JWT, brute-force lock (5 fails -> 15 min), `/me`
- Public doctors list/search/filter/detail; demo doctors via `DemoDataInitializer`
- Doctor slot management + public available-slot view
- Appointments: patient books (PENDING, slot -> BOOKED), patient lists own, patient cancels (PENDING/CONFIRMED, before start, slot freed); doctor lists own, approves, rejects (slot freed), completes (extra, after start)
- Role rules: `/api/appointments/**` PATIENT, `/api/doctor/**` DOCTOR, `/api/admin/**` ADMIN; 401/403 JSON

## 4. Database schema

`V1`: users, patient_profiles, specializations, doctor_profiles, doctor_specializations, availability_slots, appointments, refresh_tokens. Entities exist for all except refresh_tokens.
`V3`: adds virtual generated column `appointments.active_slot_id` (= slot_id while status is PENDING/CONFIRMED/COMPLETED, else NULL) with UNIQUE index `uq_appt_one_active_per_slot`. Not mapped in Hibernate. Never edit V1-V3 after they ran; add V4+.
`appointments.created_at` is set by Java (not the DB default); `updated_at` is maintained by MySQL and not mapped.
FK `fk_appt_slot` is ON DELETE CASCADE, so `SlotService` refuses to edit/delete any slot that ever had an appointment.

## 5. API endpoints

Auth: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`. Public: `GET /api/specializations`, `GET /api/doctors`, `GET /api/doctors/{id}`, `GET /api/doctors/{id}/slots`.
Doctor: `POST/GET /api/doctor/slots`, `PUT/DELETE /api/doctor/slots/{id}`, `GET /api/doctor/appointments`, `POST /api/doctor/appointments/{id}/approve|reject|complete`.
Patient: `POST /api/appointments`, `GET /api/appointments/mine`, `POST /api/appointments/{id}/cancel`.
Full contract: `docs/API.md`. Dates `yyyy-MM-dd`, times `HH:mm`, server zone `app.timezone` (default `Asia/Kolkata`). Status query params use capitals.

## 6. Architectural decisions

- Layered packages; DTOs only; stateless JWT; role read from DB in `JwtAuthFilter`; user identity always from the token
- Concurrency: lock the SLOT row first (`SELECT ... FOR UPDATE`), then the appointment row, in every method that changes either. Same order everywhere = no deadlocks. Locking reads see the latest committed data (MySQL default isolation is REPEATABLE READ), so ownership lookups return only a slot id (scalar) and the appointment is loaded only after the slot lock.
- Doctor row lock for slot create/update/delete (prevents overlapping slots under simultaneous requests)
- V3 unique index = database-level backstop
- Ownership: other people's appointment ids give 404, not 403
- Refresh-token rotation deferred (table exists)

## 7. Known issues / limitations

- Nothing in Section 1 "NOT verified" has been run for real yet
- A slot that ever had an appointment can't be edited or deleted, so a doctor can't withdraw a freed slot (idea: V4 adds a CLOSED slot status)
- No rule stopping one patient from holding overlapping appointments with different doctors
- Cancel rule is simple: allowed until the start time, no minimum notice
- No automated tests in the repo yet (only throwaway checks in the cloud session); no frontend yet
- Student is new to Spring: explain each phase briefly while building

## 8. Build and test results

Cloud session: stub type-check clean; 45/45 fake-repository behaviour checks passed; concurrency script validated against mocks; no real compile, no MySQL.
Student's machine: see Section 1 for confirmed items. Appointment results: pending.

## 9. Exact next steps

1. Student imports `tests/postman/*` and runs it (`docs/AUTOMATED_TESTS.md`), runs the concurrency script, fills `docs/TEST_REPORT_TEMPLATE.md`, reports failures; fix real defects (decide on DEF-01).
2. React frontend (Vite + Tailwind): login/register, doctors list/search, doctor page with slot buttons + book, My Appointments (cancel), doctor dashboard (slots + requests approve/reject). Use Axios with the Bearer token; show toasts and loading states.
3. If time: one real JUnit/Spring test for double booking; README screenshots; deployment.

## 10. Resume rules

Read this file, then inspect actual files. Do not assume a feature works because the file exists. Never regenerate the project from scratch.
