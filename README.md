# Healthcare Appointment Booking System

Full-stack project: React frontend + Spring Boot 3 backend + MySQL.
**Status:** backend foundation + authentication written; frontend not started. See `PROJECT_STATUS.md`.

## What exists today
- MySQL schema (8 tables) managed by Flyway
- Patient registration, login with JWT, `/me`
- BCrypt password hashing, brute-force lock (5 failed logins -> 15 min lock)
- Role-based access (`ADMIN` area locked), CORS, central JSON error handling
- Public specializations list (seeded)
- Public doctors list/search/filter and doctor details (`/api/doctors`, `/api/doctors/{id}`)
- Doctor slot management (`/api/doctor/slots`, doctor role only) and public view of a doctor's available slots
- Appointment booking: patients book/cancel/list, doctors approve/reject/complete; the slot row is locked so two patients can never book the same slot (see `docs/APPOINTMENT_TESTS.md`, `scripts/concurrency-test.mjs`)
- Demo doctors created on startup (set `SEED_DEMO_DATA=false` to disable). Demo doctor login:
  `priya.sharma@demo.healthcare.example` / `Doctor@123` (password from `DEMO_DOCTOR_PASSWORD`)

## Run the backend (first time)
Requirements: JDK 17+, Maven 3.9+, MySQL 8 running locally.

1. Set the environment variables from `.env.example` (at minimum `DB_PASSWORD` and `JWT_SECRET`).
   Spring does not read `.env` files by itself; put them in your IDE run configuration or export them.
2. From the `backend` folder: `mvn spring-boot:run`
3. Flyway creates the database tables and seeds specializations automatically on first start.

## Quick test (Postman or curl)
```
POST http://localhost:8080/api/auth/register
{ "fullName": "Test User", "email": "test@example.com", "password": "Strong123" }

POST http://localhost:8080/api/auth/login
{ "email": "test@example.com", "password": "Strong123" }

GET http://localhost:8080/api/auth/me     (Header: Authorization: Bearer <token from login>)
GET http://localhost:8080/api/specializations
```

## Folder structure
```
backend/src/main/java/com/healthcare/booking/
  controller/   HTTP endpoints
  service/      business logic (AuthService)
  repository/   database access (Spring Data JPA)
  entity/       database tables as Java classes
  dto/          request/response shapes (never expose entities)
  security/     JWT creation + request filter
  config/       SecurityConfig, AdminInitializer
  exception/    one place that turns errors into JSON
backend/src/main/resources/db/migration/   V1 schema, V2 seed
docs/API.md    endpoint documentation
```

## Automated tests
Importable Postman collection with ~200 negative/validation/security requests in `tests/postman/`; instructions in `docs/AUTOMATED_TESTS.md`.

## Not built yet
Admin APIs, the entire React frontend, JUnit tests.
