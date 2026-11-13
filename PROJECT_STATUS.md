# PROJECT_STATUS.md — Healthcare Appointment Booking System

Last updated: 2026-11-12

## 1. Current state (read this first)

**Verified by the student on their own machine (2026-11-14):** backend starts, MySQL connects, Flyway migrations run, register and login work.

**Doctors API (added 2026-11-14) is written but NOT compiled or run.** The Claude cloud session has no Maven network and no MySQL, so the only check done was a syntax-only `javac` pass (no syntax errors; all remaining errors were missing-dependency ones). The student must run it locally and report errors.
Added: `GET /api/doctors`, `GET /api/doctors/{id}` (public), demo doctor seeding, 404/400/405 JSON error handling.

How to verify (student): restart backend, then
- `GET /api/doctors` -> 6 doctors (Dr. Inactive Example must NOT appear)
- `GET /api/doctors?specializationId=<id of Cardiologist>` -> only Dr. Rahul Mehta
- `GET /api/doctors?search=priya` -> Dr. Priya Sharma
- `GET /api/doctors/1` -> one doctor; `GET /api/doctors/9999` -> 404; `GET /api/doctors/abc` -> 400; `GET /api/nothing` -> 404 (was a 500)
- `POST /api/auth/login` as `priya.sharma@demo.healthcare.example` / `Doctor@123` -> token with role DOCTOR
- Confirm register/login/me still work (auth was not modified)

DEADLINE UPDATE (2026-11-12 17:32 IST): student now has only **3 days** (until about 2026-11-15). Cut further: no admin dashboard, no refresh tokens, no OTP, minimal tests. Doctors are seeded by an initializer (no doctor signup UI). Priority: working patient booking flow + doctor approve/reject + polished React UI.

Scope decision: **Reduced scope** (assumed because the student said "start building" without choosing). Schema keeps all 8 tables so the full spec can still be added later.

## 2. Files created (all under `healthcare-booking/`)

Root: `README.md`, `PROJECT_STATUS.md`, `.env.example`, `.gitignore`, `docs/API.md`

Backend (`backend/`):
- `pom.xml` (Spring Boot 3.3.5, Java 17, jjwt 0.12.6, Flyway + flyway-mysql, MySQL connector; no Lombok)
- `src/main/resources/application.yml`
- `src/main/resources/db/migration/V1__create_schema.sql`, `V2__seed_specializations.sql`
- Package `com.healthcare.booking`:
  - `HealthcareBookingApplication`
  - entity: `Role`, `User`, `PatientProfile`, `Specialization`, `ApprovalStatus`, `DoctorProfile`
  - repository: `UserRepository`, `PatientProfileRepository`, `SpecializationRepository` (+`findByName`), `DoctorProfileRepository`
  - dto: `RegisterRequest`, `LoginRequest`, `UserDto`, `AuthResponse`, `SpecializationDto`, `DoctorDto`
  - exception: `ApiException`, `ErrorResponse`, `GlobalExceptionHandler` (now also handles 404/400-type-mismatch/405)
  - security: `JwtService`, `JwtAuthFilter`, `AuthenticatedUser`
  - config: `SecurityConfig` (+public GET doctors rules), `AdminInitializer`, `DemoDataInitializer`
  - service: `AuthService`, `DoctorService`
  - controller: `AuthController`, `SpecializationController`, `DoctorController`

## 3. Implemented features (unverified)

- Patient registration (role forced to PATIENT server-side), BCrypt(12) hashing
- Login -> JWT access token (30 min default); `GET /api/auth/me`
- Brute-force protection: 5 failed logins -> locked 15 min (`noRollbackFor` so the counter persists)
- `/api/admin/**` restricted to ADMIN; 401/403 returned as JSON
- CORS from `CORS_ALLOWED_ORIGINS`; JWT secret required from env (min 32 chars)
- Optional first admin created from `ADMIN_EMAIL` / `ADMIN_PASSWORD` env vars

## 4. Database schema

Created by `V1__create_schema.sql` (not yet executed): `users`, `patient_profiles`, `specializations`, `doctor_profiles`, `doctor_specializations`, `availability_slots`, `appointments`, `refresh_tokens`.
Entities exist only for users, patient_profiles, specializations. Hibernate `ddl-auto: none` (Flyway owns schema).
Double-booking guard (to be used in Phase 4): `UNIQUE(doctor_id, slot_date, start_time)` on slots, plus atomic slot status update inside a transaction. Note: `appointments` has no unique on `slot_id`; cancelled/rejected appointments must free the slot.

## 5. API endpoints

Implemented: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `GET /api/specializations`, `GET /api/doctors`, `GET /api/doctors/{id}`. Details in `docs/API.md`.
Rule: authenticated doctor-only endpoints must NOT live under `/api/doctors/**` (public GET there); use `/api/doctor/...`.
"Active doctor" = `approval_status = APPROVED` and `users.enabled = true`. Pending/deactivated doctors return 404 on the detail endpoint.
Demo doctors are created by `DemoDataInitializer` (Java, not SQL, so no password hash sits in migrations). Controlled by `SEED_DEMO_DATA` (default true) and `DEMO_DOCTOR_PASSWORD` (default `Doctor@123`, demo only). V1/V2 migrations were not changed and no V3 migration exists.

## 6. Architectural decisions

- Spring Boot (not plain Spring); layered packages; DTOs only in responses
- Stateless JWT in `Authorization: Bearer` header, CSRF disabled for that reason
- Role always read from DB in `JwtAuthFilter`, never from client input
- Refresh-token rotation + HttpOnly cookie deferred (table exists); can be added after core flow works

## 7. Known issues / risks

- Never compiled: expect small compile/startup fixes
- No tests written yet
- No frontend yet
- Student is new to Spring: explain each phase briefly while building

## 8. Build and test results

None executed.

## 9. Exact next steps

1. Student restarts backend with the Doctors API and runs the checks in Section 1; reports any errors; fix them.
2. Next in Phase 4: `availability_slots` + `appointments` entities, slot listing for a doctor, appointment booking with double-booking protection, patient cancel, doctor approve/reject (doctor-only endpoints under `/api/doctor/...`).
4. Then React frontend (Vite + Tailwind, login/register, doctors, booking, my appointments, doctor dashboard).
5. Tests (JUnit/Mockito/Spring Boot Test), then docs polish and deployment.

## 10. Resume rules

Read this file, then inspect actual files. Do not assume a feature works because the file exists. Never regenerate the project from scratch.
