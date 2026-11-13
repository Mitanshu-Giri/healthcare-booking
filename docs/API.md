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

## Planned (not implemented yet)

APPOINTMENTS (book, cancel, approve/reject, complete), ADMIN endpoints. Contract will be added here before each is coded.
Booking must lock the slot row (`SELECT ... FOR UPDATE`) and re-check `status = AVAILABLE` inside one transaction.
Note: any `/api/admin/**` URL is already restricted to the ADMIN role in `SecurityConfig`.
