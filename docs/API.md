# API Documentation

Base URL (dev): `http://localhost:8080`
Auth: send `Authorization: Bearer <accessToken>` on protected endpoints.

Error format (all errors):
```json
{ "timestamp": "...", "status": 400, "error": "Bad Request", "message": "Validation failed",
  "fieldErrors": { "email": "Enter a valid email address" } }
```
`fieldErrors` appears only for validation errors.

## Implemented

### POST /api/auth/register
Public. Always creates a PATIENT (role cannot be sent by the client).

Request:
```json
{ "fullName": "Asha Verma", "email": "asha@example.com", "password": "Strong123", "phone": "9876543210" }
```
Password rules: 8-64 chars, one uppercase, one lowercase, one digit. `phone` is optional.

201 Created:
```json
{ "id": 1, "fullName": "Asha Verma", "email": "asha@example.com", "role": "PATIENT" }
```
Errors: 400 validation, 409 email already registered.

### POST /api/auth/login
Public.

Request: `{ "email": "asha@example.com", "password": "Strong123" }`

200 OK:
```json
{ "accessToken": "<jwt>", "tokenType": "Bearer", "expiresInSeconds": 1800,
  "user": { "id": 1, "fullName": "Asha Verma", "email": "asha@example.com", "role": "PATIENT" } }
```
Errors: 400 validation, 401 invalid email or password, 403 account deactivated,
429 account locked (5 failed attempts locks for 15 minutes).

### GET /api/auth/me
Requires login (any role). Returns the current user (same shape as `user` above).
Errors: 401 missing/invalid/expired token.

### GET /api/specializations
Public. Returns `[ { "id": 1, "name": "General Physician", "description": "..." }, ... ]` sorted by name.

### GET /api/doctors
Public. Returns only **active** doctors (approval status APPROVED and account enabled), sorted by name.
Optional query parameters (can be combined):
- `specializationId` - id from `/api/specializations`
- `search` - part of the doctor's name, case-insensitive

200 OK:
```json
[ { "id": 1, "fullName": "Dr. Priya Sharma", "qualification": "MBBS, MD (General Medicine)",
    "bio": "...", "experienceYears": 12, "consultationFee": 600.00,
    "clinicAddress": "Sunrise Health Clinic, Bengaluru",
    "specializations": [ { "id": 1, "name": "General Physician", "description": "..." } ] } ]
```
Returns `[]` when nothing matches. Doctor email/phone are never included.
Errors: 400 if `specializationId` is not a number.

### GET /api/doctors/{id}
Public. Same object shape as one list item. `{id}` is the doctor profile id (not the user id).
Errors: 400 if id is not a number; 404 if the doctor does not exist **or is not active**
(pending/deactivated doctors look the same as non-existent ones on purpose).

### GET /api/doctors/{id}/slots
Public. Bookable slots of one active doctor: status AVAILABLE and not already started, sorted by date/time.
Optional `date=yyyy-MM-dd` for a single day; without it, today through the next 30 days.
`{id}` is the doctor profile id.

200 OK:
```json
[ { "id": 5, "doctorId": 1, "slotDate": "2026-11-20", "startTime": "10:00", "endTime": "10:30", "status": "AVAILABLE" } ]
```
Returns `[]` when there are none (or `date` is in the past).
Errors: 400 bad id or date format, 404 doctor not found/not active.

## Doctor-only endpoints (`/api/doctor/...`, singular)

Require `Authorization: Bearer <token>` of a user with role DOCTOR whose doctor profile is APPROVED.
The doctor is taken from the token, never from the URL, so a doctor can only touch their own slots.
Errors common to all of them: 401 no/invalid/expired token, 403 not a DOCTOR (e.g. a patient token) or doctor not approved.

Dates are `yyyy-MM-dd`, times are `HH:mm` (24-hour). Times are interpreted in the server timezone
`app.timezone` (default `Asia/Kolkata`).

Slot rules (create and update):
- end time after start time; length 10 to 180 minutes
- must start in the future and at most 90 days ahead
- must not overlap another slot of the same doctor on that date (back-to-back is fine: 10:00-10:30 then 10:30-11:00)
- a BOOKED slot cannot be updated or deleted
- a slot that has ever had an appointment (even a cancelled or rejected one) cannot be updated or deleted,
  because patients' appointment history points at it (409 `This slot has appointment history and cannot be ...`)

### POST /api/doctor/slots
Request: `{ "slotDate": "2026-11-20", "startTime": "10:00", "endTime": "10:30" }`
201 Created: slot object (same shape as above, status AVAILABLE).
Errors: 400 validation/rule broken, 409 overlaps another slot.

### GET /api/doctor/slots
All of the doctor's own slots (AVAILABLE and BOOKED). Optional `from` and `to` (`yyyy-MM-dd`);
default today through +30 days; range at most 90 days.
200 OK: array of slots. Errors: 400 bad dates or `to` before `from`.

### PUT /api/doctor/slots/{id}
Same body as create (full replacement of date and times). 200 OK: updated slot.
Errors: 400, 404 (not found or belongs to another doctor), 409 overlap or slot is BOOKED.

### DELETE /api/doctor/slots/{id}
204 No Content. Errors: 404 (not found or not yours), 409 slot is BOOKED.

### Other error behaviour
Unknown URL -> 404 JSON, wrong HTTP method -> 405 JSON, database constraint conflict -> 409 JSON.

## Appointments

Statuses: `PENDING`, `CONFIRMED`, `REJECTED`, `CANCELLED`, `COMPLETED`.
Allowed moves: PENDING -> CONFIRMED (doctor approves) | REJECTED (doctor rejects, slot freed) | CANCELLED (patient cancels, slot freed);
CONFIRMED -> CANCELLED (patient, before the start time, slot freed) | COMPLETED (doctor, after the start time).
REJECTED, CANCELLED and COMPLETED are final. Approving needs the slot to start in the future.
Any other move returns 409 with the current status in the message.
Booking marks the slot BOOKED; cancel/reject mark it AVAILABLE again. The patient/doctor always comes from the token.
Someone else's appointment id behaves like a non-existent one (404). Date `yyyy-MM-dd`, time `HH:mm`.

### Patient endpoints (role PATIENT; 401 without token, 403 for other roles)

**POST /api/appointments**
Request: `{ "slotId": 5, "reason": "Fever since 2 days" }` (`reason` optional, max 255 chars)
201 Created: `{ "id", "status": "PENDING", "reason", "slotId", "slotDate", "startTime", "endTime", "doctorId", "doctorName", "clinicAddress", "createdAt" }`
Errors: 400 validation, 404 slot not found (or its doctor is not active), 409 already booked / slot already started.

**GET /api/appointments/mine** (optional `?status=PENDING`, capital letters)
200: array of the caller's appointments, newest slot first (upcoming and history together). Errors: 400 bad status.

**POST /api/appointments/{id}/cancel**
200: the appointment with `status: "CANCELLED"`. Errors: 404 not found/not yours, 409 not PENDING/CONFIRMED or slot already started.

### Doctor endpoints (role DOCTOR, under `/api/doctor/appointments`; 401 / 403 as above)

**GET /api/doctor/appointments** (optional `?status=...`)
200: array, earliest slot first, only appointments on this doctor's own slots:
`{ "id", "status", "reason", "slotId", "slotDate", "startTime", "endTime", "patientId", "patientName", "patientPhone", "createdAt" }`

**POST /api/doctor/appointments/{id}/approve** PENDING -> CONFIRMED. Errors: 404 not found/not yours, 409 not PENDING or slot already passed, 403 doctor not approved.
**POST /api/doctor/appointments/{id}/reject** PENDING -> REJECTED and the slot becomes AVAILABLE. Errors: 404, 409, 403.
**POST /api/doctor/appointments/{id}/complete** CONFIRMED -> COMPLETED (slot stays BOOKED), only after the start time. Errors: 404, 409, 403.
All three return the updated appointment in the doctor shape above.

### How double booking is prevented
1. Booking runs in one transaction that first locks the slot row (`SELECT ... FOR UPDATE`), checks it is AVAILABLE, marks it BOOKED and inserts the appointment. A second request for the same slot waits for the lock, then sees BOOKED and gets 409.
2. Cancel / approve / reject / complete lock the slot row first and the appointment row second (same order everywhere, so no deadlocks).
3. Migration V3 adds a unique index on a generated column so the database itself rejects a second active (PENDING/CONFIRMED/COMPLETED) appointment for one slot.

## Planned (not implemented yet)

ADMIN endpoints.
Note: any `/api/admin/**` URL is already restricted to the ADMIN role in `SecurityConfig`.
