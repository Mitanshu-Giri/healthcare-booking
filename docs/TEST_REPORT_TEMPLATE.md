# Test report (fill in after each run)

| Field | Value |
|---|---|
| Date / time | |
| Tester | |
| Backend commit / zip version | |
| Base URL | http://localhost:8080 |
| Run with | Postman Runner / newman (delete one) |
| Folder 10 (time rules) included? | yes / no |
| Totals | requests: ___ PASS: ___ FAIL: ___ NOT RUN: ___ |

How to fill: **Result** = PASS or FAIL or NOT RUN. **Actual result** = what really happened (HTTP code and message). Leave nothing blank for a FAIL. `node tests/postman/summarize-newman.mjs tests/postman/newman-report.json` prints this table for you automatically when you use newman.


## 00 Setup (creates its own test data)

| Test | Expected | Result | Actual result |
|---|---|---|---|
| S01 Login Doctor 1 | see title | | |
| S02 Login Doctor 2 | see title | | |
| S03 Login Doctor 3 | see title | | |
| S04 Login deactivated demo doctor | see title | | |
| S05 Find doctor profile ids from the public list | see title | | |
| S06 Register Patient A (new unique account) | see title | | |
| S07 Login Patient A | see title | | |
| S08 Register Patient B | see title | | |
| S09 Login Patient B | see title | | |
| S10 Create slot M1 (Doctor 1) and compute test dates | see title | | |
| S11 Create slot M2 | see title | | |
| S12 Create slot M3 | see title | | |
| S13 Create slot M4 | see title | | |
| S14 Create slot F1 (free slot, never booked) | see title | | |
| S15 Create slot D2 (Doctor 2 own slot) | see title | | |

## 01 Auth validation and token security

| Test | Expected | Result | Actual result |
|---|---|---|---|
| AUTH-01 Register with empty body {} | 400 with 3 field errors | | |
| AUTH-02 Register with invalid email | 400 | | |
| AUTH-03 Register with weak password (no uppercase) | 400 | | |
| AUTH-04 Register with too-short password | 400 | | |
| AUTH-05 Register with invalid phone | 400 | | |
| AUTH-06 Register with an existing email | 409 | | |
| AUTH-07 Register with existing email in UPPER CASE | 409 (case-insensitive) | | |
| AUTH-08 Register with malformed JSON | 400 | | |
| AUTH-09 Mass assignment: register with role=ADMIN is ignored | PATIENT | | |
| AUTH-10 Login with wrong password | 401 | | |
| AUTH-11 Login with unknown email | 401 with the SAME message (no user enumeration) | | |
| AUTH-12 Login with empty body {} | 400 | | |
| AUTH-13 Login success body: token fields present, no password/hash | see title | | |
| AUTH-14 GET /me without token | 401 | | |
| AUTH-15 GET /me with garbage token | 401 | | |
| AUTH-16 GET /me with empty Bearer value | 401 | | |
| AUTH-17 GET /me with signature altered inside the signature | 401 | | |
| AUTH-18 GET /me with payload role changed to ADMIN, old signature | 401 | | |
| AUTH-19 GET /me with subject (user id) changed, old signature | 401 | | |
| AUTH-20 GET /me with alg=none unsigned token | 401 | | |
| AUTH-21 GET /me with valid token | 200 (control) | | |
| AUTH-22 Register throwaway account for the lock test | see title | | |
| AUTH-23.1 Wrong password attempt 1 of 5 on throwaway account | 401 | | |
| AUTH-23.2 Wrong password attempt 2 of 5 on throwaway account | 401 | | |
| AUTH-23.3 Wrong password attempt 3 of 5 on throwaway account | 401 | | |
| AUTH-23.4 Wrong password attempt 4 of 5 on throwaway account | 401 | | |
| AUTH-23.5 Wrong password attempt 5 of 5 on throwaway account | 401 | | |
| AUTH-24 Correct password after 5 failures | 429 locked | | |
| AUTH-25 Wrong password while locked | 429 | | |
| AUTH-26 Patient A can still log in (lock is per account) | see title | | |

## 02 Public API negatives and data exposure

| Test | Expected | Result | Actual result |
|---|---|---|---|
| PUB-01 Doctors list is public and exposes no email/phone/password | see title | | |
| PUB-02 Doctor id that is not a number | 400 | | |
| PUB-03 Unknown doctor id | 404 | | |
| PUB-04 specializationId not a number | 400 | | |
| PUB-05 Unknown specializationId | 200 empty list | | |
| PUB-06 SQL-injection string in search is treated as plain text | 200 [] | | |
| PUB-07 Slots of unknown doctor | 404 | | |
| PUB-08 Slots with date that is not a date | 400 | | |
| PUB-09 Slots with doctor id not a number | 400 | | |
| PUB-10 Slots for a past date | 200 empty list | | |
| PUB-11 Slots for test date: M1 is listed, all AVAILABLE, times are HH:mm | see title | | |

## 03 Slot management negatives

| Test | Expected | Result | Actual result |
|---|---|---|---|
| SLOT-01 Create slot without token | 401 | | |
| SLOT-02 Create slot with PATIENT token | 403 | | |
| SLOT-03 Create slot as deactivated doctor | 403 | | |
| SLOT-04 Create slot with empty body {} | 400 three field errors | | |
| SLOT-05 Create slot with time "10am" | 400 malformed | | |
| SLOT-06 Create slot with impossible date 2026-13-45 | 400 malformed | | |
| SLOT-07 End time before start time | 400 | | |
| SLOT-08 End time equal to start time | 400 | | |
| SLOT-09 Slot shorter than 10 minutes | 400 | | |
| SLOT-10 Slot longer than 180 minutes | 400 | | |
| SLOT-11 Slot in the past | 400 | | |
| SLOT-12 Slot more than 90 days ahead | 400 | | |
| SLOT-13 Exact duplicate of slot M1 | 409 | | |
| SLOT-14 Partial overlap with M1 and M2 | 409 | | |
| SLOT-15 Slot fully inside M1 | 409 | | |
| SLOT-16 Back-to-back slot (starts when F1 ends) is allowed | 201 | | |
| SLOT-17 List own slots with to before from | 400 | | |
| SLOT-18 List own slots with range over 90 days | 400 | | |
| SLOT-19 List own slots with bad date | 400 | | |
| SLOT-20 List own slots without token | 401 | | |
| SLOT-21 List own slots with PATIENT token | 403 | | |
| SLOT-22 Doctor 2 updates Doctor 1's slot | 404 | | |
| SLOT-23 Doctor 2 deletes Doctor 1's slot | 404 | | |
| SLOT-24 Update unknown slot id | 404 | | |
| SLOT-25 Delete unknown slot id | 404 | | |
| SLOT-26 Update with empty body | 400 | | |
| SLOT-27 Delete with id that is not a number | 400 | | |
| SLOT-28 Doctor 2's list shows its own slot but never Doctor 1's slots | see title | | |
| SLOT-29 Update own free slot to the same time is allowed (self-overlap ignored) | 200 | | |

## 04 Booking: happy path and negatives

| Test | Expected | Result | Actual result |
|---|---|---|---|
| BOOK-01 Patient A books M1 | 201 PENDING | | |
| BOOK-02 Booked slot disappears from the public slot list | see title | | |
| BOOK-03 Doctor's own slot list shows M1 as BOOKED | see title | | |
| BOOK-04 Patient B books the same slot | 409 | | |
| BOOK-05 Patient A books the same slot again | 409 | | |
| BOOK-06 Unknown slot id | 404 | | |
| BOOK-07 Negative slot id | 404 | | |
| BOOK-08 Slot id 0 | 404 | | |
| BOOK-09 Missing slotId {} | 400 with fieldErrors.slotId | | |
| BOOK-10 slotId as text "abc" | 400 malformed | | |
| BOOK-11 No request body at all | 400 malformed | | |
| BOOK-12 Reason of 256 characters | 400 | | |
| BOOK-13 Reason of exactly 255 characters | 201 (boundary) | | |
| BOOK-14 Mass assignment + script text in reason: extra fields ignored, text stored as plain data | see title | | |
| BOOK-15 DOCTOR token cannot book | 403 | | |
| BOOK-16 Booking without token | 401 | | |
| BOOK-17 Deactivated doctor token cannot book | 403 | | |
| BOOK-18 DELETE /api/appointments (wrong method) | 405 | | |
| BOOK-19 GET /api/appointments (no such route, only /mine) | 405 | | |

## 05 Authorization and ownership

| Test | Expected | Result | Actual result |
|---|---|---|---|
| AUTHZ-01 Patient B cancels Patient A's appointment | 404 | | |
| AUTHZ-02 DOCTOR token on the patient cancel endpoint | 403 | | |
| AUTHZ-03 Cancel without token | 401 | | |
| AUTHZ-04 Cancel unknown appointment | 404 | | |
| AUTHZ-05 Cancel with id "abc" | 400 | | |
| AUTHZ-06 My appointments without token | 401 | | |
| AUTHZ-07 My appointments with DOCTOR token | 403 | | |
| AUTHZ-08.1 Doctor 2 approves Doctor 1's appointment | 404 | | |
| AUTHZ-08.2 Doctor 2 rejects Doctor 1's appointment | 404 | | |
| AUTHZ-08.3 Doctor 2 completes Doctor 1's appointment | 404 | | |
| AUTHZ-09.1 PATIENT token on doctor approve endpoint | 403 | | |
| AUTHZ-09.2 PATIENT token on doctor reject endpoint | 403 | | |
| AUTHZ-09.3 PATIENT token on doctor complete endpoint | 403 | | |
| AUTHZ-10 Doctor approve without token | 401 | | |
| AUTHZ-11 Doctor approves unknown appointment | 404 | | |
| AUTHZ-12 Doctor approve with id "abc" | 400 | | |
| AUTHZ-13 Doctor 2's appointment list does not contain Doctor 1's appointments | see title | | |
| AUTHZ-14 Patient B's list does not contain Patient A's appointments | see title | | |
| AUTHZ-15 Doctor list: no access with PATIENT token (403)  | see title | | |
| AUTHZ-16 Doctor list without token | 401 | | |
| AUTHZ-17 Doctor 1 sees the appointment with patient name/phone but NOT the patient email | see title | | |
| AUTHZ-18 /api/admin/** with PATIENT token | 403 | | |
| AUTHZ-19 /api/admin/** with DOCTOR token | 403 | | |
| AUTHZ-20 /api/admin/** without token | 401 | | |

## 06 Status transitions

| Test | Expected | Result | Actual result |
|---|---|---|---|
| STATE-01 Complete a PENDING appointment | 409 | | |
| STATE-02 Doctor 1 approves A | 200 CONFIRMED | | |
| STATE-03 Approve again | 409 | | |
| STATE-04 Reject a CONFIRMED appointment | 409 | | |
| STATE-05 Complete before the start time | 409 | | |
| STATE-06 Patient A cancels the CONFIRMED appointment | 200 CANCELLED | | |
| STATE-07 Cancelled slot M1 is bookable again (listed AVAILABLE) | see title | | |
| STATE-08 Cancel again | 409 | | |
| STATE-09 Approve a CANCELLED appointment | 409 | | |
| STATE-10 Reject a CANCELLED appointment | 409 | | |
| STATE-11 Complete a CANCELLED appointment | 409 | | |
| STATE-12 Patient B books M2 | 201 | | |
| STATE-13 Doctor 1 rejects B | 200 REJECTED | | |
| STATE-14 Reject again | 409 | | |
| STATE-15 Approve a REJECTED appointment | 409 | | |
| STATE-16 Patient B cancels a REJECTED appointment | 409 | | |
| STATE-17 Complete a REJECTED appointment | 409 | | |
| STATE-18 Rejected slot M2 is listed again | see title | | |
| STATE-19 Patient B can book the freed slot M1 | 201 | | |
| STATE-20 Patient A cancels a PENDING appointment (boundary one on M3) | 200 | | |

## 07 Filters, sorting and list isolation

| Test | Expected | Result | Actual result |
|---|---|---|---|
| LIST-01 Patient list with status=BOGUS | 400 | | |
| LIST-02 Patient A status=CANCELLED | only CANCELLED, includes both cancelled ones | | |
| LIST-03 Patient A status=PENDING | includes the XSS-text appointment, excludes cancelled A | | |
| LIST-04 Patient A list is sorted newest slot first | see title | | |
| LIST-05 Patient B status=REJECTED | includes B's rejected, nothing of A | | |
| LIST-06 Patient B full list has apptB (REJECTED) and apptB2 (PENDING) | see title | | |
| LIST-07 Doctor 1 status=CONFIRMED | all CONFIRMED, apptA no longer there | | |
| LIST-08 Doctor 1 status=PENDING | includes apptB2 and apptXss, not apptA | | |
| LIST-09 Doctor 1 list is sorted earliest slot first | see title | | |
| LIST-10 Doctor list with status=BOGUS | 400 | | |

## 08 Slot history guard

| Test | Expected | Result | Actual result |
|---|---|---|---|
| HIST-01 Delete currently BOOKED slot M1 | 409 | | |
| HIST-02 Update currently BOOKED slot M1 | 409 | | |
| HIST-03 Delete AVAILABLE slot M2 that has a REJECTED appointment | 409 | | |
| HIST-04 Update AVAILABLE slot M2 that has history | 409 | | |
| HIST-05 Delete AVAILABLE slot M3 that has a CANCELLED appointment | 409 | | |
| HIST-06 History survived: cancelled/rejected appointments are still listed | see title | | |
| HIST-07 History survived for Patient B (REJECTED) | see title | | |
| HIST-08 Slot without history (F1) can be deleted | 204 | | |
| HIST-09 Deleting F1 again | 404 | | |

## 09 Security extras

| Test | Expected | Result | Actual result |
|---|---|---|---|
| SEC-01 CORS preflight from the allowed origin | 200 with matching Allow-Origin | | |
| SEC-02 CORS preflight from a foreign origin | 403 and no Allow-Origin | | |
| SEC-03 Security headers on a public response | see title | | |
| SEC-04 SQL-injection text in login email | 401, not 500 | | |
| SEC-05 Valid token in the query string is ignored | 401 | | |
| SEC-06 Basic auth scheme instead of Bearer | 401 | | |
| SEC-07 Unknown URL with a valid token | 404 JSON | | |
| SEC-08 Unknown URL without token | 401 (does not reveal which URLs exist) | | |
| SEC-09 Register with 200-character email | 400 | | |
| SEC-10 Register with 101-character name | 400 | | |

## 10 Time rules (needs about 4 minutes of waiting)

| Test | Expected | Result | Actual result |
|---|---|---|---|
| TIME-01 Create slots starting in a few minutes: Doctor 1, 2 and 3 (one request creates Doctor 1; next two create the others) | see title | | |
| TIME-02 Create the same time slot for Doctor 2 | see title | | |
| TIME-03 Create the same time slot for Doctor 3 | see title | | |
| TIME-04 Patient A books the Doctor 1 slot | 201 | | |
| TIME-05 Doctor 1 approves it (still before the start time) | 200 | | |
| TIME-06 Patient B books the Doctor 2 slot (stays PENDING) | 201 | | |
| TIME-07 Complete before the start time | 409 | | |
| TIME-08 WAIT until the slots have started (pre-request timer), then check the token still works | see title | | |
| TIME-09 Doctor 1 completes the CONFIRMED appointment | 200 COMPLETED | | |
| TIME-10 Slot stays BOOKED after completion | see title | | |
| TIME-11 Complete again | 409 | | |
| TIME-12 Patient cancels a COMPLETED appointment | 409 | | |
| TIME-13 Approve / reject a COMPLETED appointment | 409 (approve) | | |
| TIME-14 Reject a COMPLETED appointment | 409 | | |
| TIME-15 Doctor 2 approves a PENDING request whose slot already started | 409 | | |
| TIME-16 Patient B cancels after the start time | 409 | | |
| TIME-17 Doctor 2 may still reject the late PENDING request | 200 REJECTED | | |
| TIME-18 Booking an AVAILABLE slot that already started | 409 | | |
| TIME-19 Started slot is hidden from the public slot list | see title | | |
| TIME-20 Freed-but-started slot is also hidden from the public list | see title | | |

## 11 Suspected defects (these may FAIL)

| Test | Expected | Result | Actual result |
|---|---|---|---|
| DEF-01 Wrong Content-Type (text/plain) on a JSON endpoint should be 415, code suggests 500 | see title | | |

## 12 Cleanup and concurrency-test slot

| Test | Expected | Result | Actual result |
|---|---|---|---|
| CLN-01 Delete back-to-back test slot (no history) | 204 | | |
| CLN-02 Delete Doctor 2's test slot (no history) | 204 | | |
| CLN-03 Create a fresh slot for the concurrency script | see title | | |

## Concurrency test (scripts/concurrency-test.mjs)

| Run | Command | Output line "201 Created: .. | 409 Conflict: .. | other: .." | Result | Actual result |
|---|---|---|---|---|
| 1 | node scripts/concurrency-test.mjs <slotId> 5 | | | |
| 2 | node scripts/concurrency-test.mjs <slotId> 10 | | | |
| 3 | node scripts/concurrency-test.mjs <slotId> 20 | | | |

Database cross-check after each run (must be 1): `SELECT COUNT(*) FROM appointments WHERE slot_id = <slotId> AND status IN ('PENDING','CONFIRMED','COMPLETED');` Actual: ___
