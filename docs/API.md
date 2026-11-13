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

### Other error behaviour
Unknown URL -> 404 JSON, wrong HTTP method -> 405 JSON.

## Planned (not implemented yet)

AVAILABILITY, APPOINTMENTS, ADMIN endpoints. Contract will be added here before each is coded.
Convention: authenticated doctor-only endpoints go under a different prefix (e.g. `/api/doctor/...`),
because `GET /api/doctors/{id}` is public and would otherwise also match paths like `/api/doctors/me`.
Note: any `/api/admin/**` URL is already restricted to the ADMIN role in `SecurityConfig`.
