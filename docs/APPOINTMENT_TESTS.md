# Appointment module: Postman test guide

Base URL `http://localhost:8080`. All dates must be in the future. Send tokens as
Postman > Authorization > Bearer Token. Error bodies look like
`{ "timestamp": "...", "status": 409, "error": "Conflict", "message": "..." }` (only `status` and `message` are shown below).

**Before you start:** restart the backend once. Flyway runs `V3__one_active_appointment_per_slot.sql` on startup.
If the backend does not start, see "If V3 fails" at the bottom.

## 0. Setup (tokens)

| Who | Request | Keep |
|---|---|---|
| Doctor 1 | `POST /api/auth/login` `{"email":"priya.sharma@demo.healthcare.example","password":"Doctor@123"}` | `DOC1` token |
| Doctor 2 | same with `rahul.mehta@demo.healthcare.example` | `DOC2` token |
| Patient A | `POST /api/auth/register` `{"fullName":"Patient A","email":"a@test.com","password":"Test@1234"}` then login | `PA` token |
| Patient B | same with `b@test.com` | `PB` token |

(If a patient already exists, just log in.) Find Priya's doctor id with `GET /api/doctors` (probably `1`).

## 1. Happy path

| # | Request (token) | Expected |
|---|---|---|
| 1 | `POST /api/doctor/slots` (DOC1) `{"slotDate":"2026-11-25","startTime":"10:00","endTime":"10:30"}` | **201**. Note the slot `id` (called `SLOT` below) |
| 2 | `POST /api/appointments` (PA) `{"slotId": SLOT, "reason":"Fever since 2 days"}` | **201**, body below, `status: "PENDING"` |
| 3 | `GET /api/doctors/1/slots?date=2026-11-25` (no token) | **200** `[]`: the booked slot is gone from the list |
| 4 | `GET /api/doctor/slots?from=2026-11-25&to=2026-11-25` (DOC1) | slot is listed with `"status":"BOOKED"` |
| 5 | `GET /api/appointments/mine` (PA) | **200**, array with the appointment |
| 6 | `GET /api/doctor/appointments` (DOC1) | **200**, array with the appointment incl. `patientName` and `patientPhone` |
| 7 | `GET /api/doctor/appointments?status=PENDING` (DOC1) | same appointment; with `?status=CONFIRMED` it is `[]` |
| 8 | `POST /api/doctor/appointments/{id}/approve` (DOC1) | **200**, `status: "CONFIRMED"` |
| 9 | `GET /api/appointments/mine` (PA) | status now `CONFIRMED` |
| 10 | `POST /api/appointments/{id}/cancel` (PA) | **200**, `status: "CANCELLED"` |
| 11 | `GET /api/doctors/1/slots?date=2026-11-25` (no token) | slot is listed again (`AVAILABLE`) |
| 12 | `POST /api/appointments` (PB) same `slotId` | **201** (freed slot can be booked again) |
| 13 | `POST /api/doctor/appointments/{id}/reject` (DOC1) | **200**, `status: "REJECTED"`; slot is listed again |
| 14 | `GET /api/appointments/mine` (PA) | the cancelled appointment is still there (history) |

Patient response (step 2):
```json
{ "id": 1, "status": "PENDING", "reason": "Fever since 2 days", "slotId": 5,
  "slotDate": "2026-11-25", "startTime": "10:00", "endTime": "10:30",
  "doctorId": 1, "doctorName": "Dr. Priya Sharma",
  "clinicAddress": "Sunrise Health Clinic, Bengaluru", "createdAt": "2026-11-14T13:40:12.123Z" }
```
Doctor response (steps 6, 8, 13):
```json
{ "id": 1, "status": "PENDING", "reason": "Fever since 2 days", "slotId": 5,
  "slotDate": "2026-11-25", "startTime": "10:00", "endTime": "10:30",
  "patientId": 1, "patientName": "Patient A", "patientPhone": null, "createdAt": "..." }
```

## 2. Failure cases

Use a fresh AVAILABLE slot for the ones that need it.

| Case | Request (token) | Expected |
|---|---|---|
| Slot already booked | `POST /api/appointments` (PB) for a slot PA already holds | **409** `This slot has already been booked` |
| Same patient books twice | same request again (PA) | **409** `This slot has already been booked` |
| Unknown slot | `POST /api/appointments` (PA) `{"slotId":999999}` | **404** `Slot not found` |
| Missing slotId | `POST /api/appointments` (PA) `{}` | **400** `Validation failed` with `fieldErrors.slotId` |
| Reason too long | reason of 300 characters | **400** `fieldErrors.reason` |
| No token | any endpoint below without Authorization | **401** |
| Doctor tries to book | `POST /api/appointments` (DOC1) | **403** |
| Patient uses doctor area | `GET /api/doctor/appointments` (PA) | **403** |
| Doctor uses patient list | `GET /api/appointments/mine` (DOC1) | **403** |
| Other patient cancels | `POST /api/appointments/{A's id}/cancel` (PB) | **404** `Appointment not found` |
| Other doctor approves | `POST /api/doctor/appointments/{id}/approve` (DOC2) | **404** `Appointment not found` |
| Other doctor lists | `GET /api/doctor/appointments` (DOC2) | **200** `[]` |
| Approve twice | approve an already CONFIRMED one (DOC1) | **409** `Only PENDING appointments can be approved (this one is CONFIRMED)` |
| Reject a confirmed one | reject (DOC1) | **409** `Only PENDING appointments can be rejected ...` |
| Cancel twice | cancel a CANCELLED one (PA) | **409** `Only PENDING or CONFIRMED appointments can be cancelled (this one is CANCELLED)` |
| Cancel a rejected one | (PB) | **409** same message with `REJECTED` |
| Complete too early | `POST /api/doctor/appointments/{id}/complete` on a CONFIRMED future appointment (DOC1) | **409** `An appointment can be completed only after its start time` |
| Bad status filter | `GET /api/appointments/mine?status=BOGUS` | **400** `Invalid value for parameter 'status'` (use capitals for real values: `PENDING`) |
| Bad id | `POST /api/appointments/abc/cancel` (PA) | **400** |
| Edit/delete slot with history | `DELETE /api/doctor/slots/{SLOT}` (DOC1) after the slot had an appointment | **409** `This slot has appointment history and cannot be deleted` (same for PUT, `changed`) |
| Edit/delete booked slot | while currently booked | **409** (`A booked slot cannot be ...`) |
| Deactivated doctor | login as `inactive.example@demo.healthcare.example`, approve something | not reachable: they own no appointments (**404**) |

**Complete (optional, needs waiting):** book and approve a slot that starts in a few minutes, wait until the
start time has passed, then `POST /api/doctor/appointments/{id}/complete` (DOC1) -> **200** `COMPLETED`.
Afterwards cancel/approve/reject on it give **409**. (Slots in the past cannot be created through the API, so this
cannot be tested instantly.)

## 3. Double booking under simultaneous requests

1. As DOC1 create a fresh slot (step 1 above) and note its id.
2. Run: `node scripts/concurrency-test.mjs <slotId> 5` (needs Node 18+; it creates 5 new patients and books at the same instant).
3. Expected output ends with: `201 Created: 1 | 409 Conflict: 4 | other: 0 | patients holding an appointment: 1` and `PASS`.
   Try it a few times with new slots and with `10` as the second argument.

## 4. Database check of V3 (optional)

```sql
SHOW CREATE TABLE appointments;   -- must contain active_slot_id and uq_appt_one_active_per_slot
-- Pick a slot id that currently has NO active appointment (AVAILABLE), then:
INSERT INTO appointments (patient_id, slot_id, status, reason) VALUES (1, <slotId>, 'PENDING', 'sql-test');  -- succeeds
INSERT INTO appointments (patient_id, slot_id, status, reason) VALUES (1, <slotId>, 'PENDING', 'sql-test');  -- must FAIL: Duplicate entry
DELETE FROM appointments WHERE reason = 'sql-test';   -- clean up
```

## If V3 fails

(Written without being able to run MySQL, so this is the one step that could surprise us.)
If startup stops with a Flyway error mentioning V3:
1. Copy the full error and send it.
2. Recover: in MySQL run
   `ALTER TABLE appointments DROP COLUMN active_slot_id;` (ignore "check that column exists" if it was never added; this also drops its index),
   then `DELETE FROM flyway_schema_history WHERE success = 0;`
3. The app still works without V3 because the row lock already prevents double booking; V3 is only the database-level safety net.
   To run without it, delete the file `V3__one_active_appointment_per_slot.sql` after step 2.
