# PROJECT_STATUS.md — Healthcare Appointment Booking System

Last updated: 2026-11-14

## 1. Current state (read this first)

**Confirmed working by the student on their own machine:** backend starts, MySQL connects, Flyway migrations run, patient register + login work, `GET /api/doctors` returns the 6 active demo doctors (reported 2026-11-14).
Not explicitly confirmed by the student yet: doctor detail endpoint, doctor filters, doctor login, error-handling changes.

**Doctor slots (added 2026-11-14) are written but NOT compiled or run.** The Claude cloud session has no Maven network and no MySQL. The only checks possible were a syntax-only `javac` pass (no syntax errors; every unresolved symbol was a missing-dependency one, and the only unresolved methods were inherited JpaRepository ones: save, saveAndFlush, delete, findById). The student must run it locally and report errors.

Added in this step:
- Doctor-only endpoints under `/api/doctor/slots` (create, list own, update, delete)
- Public `GET /api/doctors/{id}/slots` (available future slots)
- Overlap prevention; doctor row is locked (`SELECT ... FOR UPDATE`) during slot create/update/delete so simultaneous requests cannot create overlapping slots
- `GlobalExceptionHandler` now also maps `AccessDeniedException` -> 403 (previously `@PreAuthorize` denials would have become 500) and `DataIntegrityViolationException` -> 409
- No schema change, no new migration (table `availability_slots` already existed in V1)
- Doctor login needs no new code: `/api/auth/login` works for any role and `JwtAuthFilter` reads the role from the DB

How to verify slots (student), in this order (request shapes are in `docs/API.md`):
1. Login as `priya.sharma@demo.healthcare.example` / `Doctor@123` -> `role` must be DOCTOR
2. `POST /api/doctor/slots` with a future date -> 201
3. Same request again -> 409 (overlap); adjacent time -> 201
4. `GET /api/doctor/slots` -> lists them; `GET /api/doctors/{doctorId}/slots` (no token) -> lists them
5. `PUT` / `DELETE` own slot -> 200 / 204; other doctor's slot id -> 404
6. Patient token on `/api/doctor/slots` -> 403; no token -> 401
7. Login as `inactive.example@demo.healthcare.example` (deactivated doctor) then POST slot -> 403 "not approved"

DEADLINE UPDATE (2026-11-12 17:32 IST): student has only **3 days** (until about 2026-11-15). Cut: no admin dashboard, no refresh tokens, no OTP, minimal tests. Doctors are seeded by an initializer (no doctor signup UI). Priority: working patient booking flow + doctor approve/reject + polished React UI.

Scope decision: **Reduced scope**. Schema keeps all 8 tables so the full spec can still be added later.

## 2. Files (all under `healthcare-booking/`)

Root: `README.md`, `PROJECT_STATUS.md`, `.env.example`, `.gitignore`, `docs/API.md`

Backend (`backend/`):
- `pom.xml` (Spring Boot 3.3.5, Java 17, jjwt 0.12.6, Flyway + flyway-mysql, MySQL connector; no Lombok)
- `src/main/resources/application.yml`
- `src/main/resources/db/migration/V1__create_schema.sql`, `V2__seed_specializations.sql` (no V3)
- Package `com.healthcare.booking`:
  - `HealthcareBookingApplication`
  - entity: `Role`, `User`, `PatientProfile`, `Specialization`, `ApprovalStatus`, `DoctorProfile`, `SlotStatus`, `AvailabilitySlot`
  - repository: `UserRepository`, `PatientProfileRepository`, `SpecializationRepository`, `DoctorProfileRepository` (+`findByUserId`, `findByUserIdForUpdate`), `AvailabilitySlotRepository`
  - dto: `RegisterRequest`, `LoginRequest`, `UserDto`, `AuthResponse`, `SpecializationDto`, `DoctorDto`, `SlotRequest`, `SlotDto`
  - exception: `ApiException`, `ErrorResponse`, `GlobalExceptionHandler`
  - security: `JwtService`, `JwtAuthFilter`, `AuthenticatedUser`
  - config: `SecurityConfig`, `AdminInitializer`, `DemoDataInitializer`
  - service: `AuthService`, `DoctorService`, `SlotService`
  - controller: `AuthController`, `SpecializationController`, `DoctorController`, `DoctorSlotController` (`/api/doctor/slots`), `DoctorAvailabilityController` (`/api/doctors/{doctorId}/slots`)

## 3. Implemented features

- Patient registration (role forced to PATIENT server-side), BCrypt(12) hashing
- Login -> JWT access token (30 min default); `GET /api/auth/me`
- Brute-force protection: 5 failed logins -> locked 15 min (`noRollbackFor` so the counter persists)
- Public doctors list/search/filter/detail; demo doctors seeded by `DemoDataInitializer`
- Doctor slot management + public available-slot view (unverified, see Section 1)
- `/api/doctor/**` needs ROLE_DOCTOR, `/api/admin/**` needs ROLE_ADMIN; 401/403 returned as JSON
- CORS from `CORS_ALLOWED_ORIGINS`; JWT secret required from env (min 32 chars)
- Optional first admin from `ADMIN_EMAIL` / `ADMIN_PASSWORD`

## 4. Database schema

Created by `V1__create_schema.sql`: `users`, `patient_profiles`, `specializations`, `doctor_profiles`, `doctor_specializations`, `availability_slots`, `appointments`, `refresh_tokens`.
Entities exist for: users, patient_profiles, specializations, doctor_profiles (+ doctor_specializations join), availability_slots. Not yet: appointments, refresh_tokens.
Hibernate `ddl-auto: none` (Flyway owns schema). Do not edit V1/V2 after they have run; add V3+ for changes.
`availability_slots.doctor_id` references `doctor_profiles.id` (not `users.id`). Unique: (doctor_id, slot_date, start_time).
Note: `appointments` has no unique on `slot_id`; cancelled/rejected appointments must free the slot (set slot back to AVAILABLE).

## 5. API endpoints

Implemented: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `GET /api/specializations`, `GET /api/doctors`, `GET /api/doctors/{id}`, `GET /api/doctors/{id}/slots`, `POST/GET /api/doctor/slots`, `PUT/DELETE /api/doctor/slots/{id}`. Full contract in `docs/API.md`.
Rules:
- Doctor-only endpoints live under `/api/doctor/...` (singular). `/api/doctors/**` GETs are public (only the exact patterns listed in `SecurityConfig`).
- "Active doctor" = `approval_status = APPROVED` and `users.enabled = true`.
- Slot rules: 10-180 min, future only, max 90 days ahead, no overlap per doctor/date, BOOKED slots cannot be edited/deleted. Time zone from `app.timezone` (default `Asia/Kolkata`).
- Dates `yyyy-MM-dd`, times `HH:mm` (set with `@JsonFormat` on the DTOs).
- Demo doctors: `SEED_DEMO_DATA` (default true), `DEMO_DOCTOR_PASSWORD` (default `Doctor@123`, demo only).

## 6. Architectural decisions

- Spring Boot; layered packages; DTOs only in responses
- Stateless JWT in `Authorization: Bearer`, CSRF disabled for that reason
- Role always read from DB in `JwtAuthFilter`, never from client input
- Doctor identity always comes from the token, never from URL/body
- Concurrency: pessimistic row locks. Doctor row locked for slot changes; the booking code (next phase) must lock the slot row with `findOwnedForUpdate`-style `SELECT ... FOR UPDATE`, re-check `status = AVAILABLE`, set it to BOOKED and insert the appointment in ONE transaction
- Refresh-token rotation + HttpOnly cookie deferred (table exists)

## 7. Known issues / risks

- Slot code never compiled or run (see Section 1)
- No automated tests written yet
- No frontend yet
- Student is new to Spring: explain each phase briefly while building

## 8. Build and test results

Cloud session: nothing compiled or executed (no Maven network, no MySQL). Syntax-only javac pass: clean.
Student's local runs: see Section 1 for what was confirmed.

## 9. Exact next steps

1. Student runs the slot checks from Section 1 and reports any errors; fix them.
2. Phase 4 remainder: `Appointment` entity/repository; `POST /api/appointments` (patient books a slot: lock slot row, check AVAILABLE, mark BOOKED, create PENDING appointment); patient `GET /api/appointments/mine` and cancel (frees the slot); doctor `GET /api/doctor/appointments`, approve/reject (reject frees the slot).
3. React frontend (Vite + Tailwind): login/register, doctors list, doctor page with slot buttons, booking, My Appointments, doctor dashboard (slots + requests).
4. One important test (double booking), docs polish, deployment.

## 10. Resume rules

Read this file, then inspect actual files. Do not assume a feature works because the file exists. Never regenerate the project from scratch.
