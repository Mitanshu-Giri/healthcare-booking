# Automated negative / validation / security tests

Files (all new, nothing existing was changed):

| File | What it is |
|---|---|
| `tests/postman/Healthcare-Booking-Negative-Tests.postman_collection.json` | The collection to import (201 requests, 13 folders, about 550 assertions) |
| `tests/postman/Healthcare-Booking-Negative-Tests-NoTime.postman_collection.json` | Same, without folder 10 (the one that waits about 4 minutes) |
| `tests/postman/Healthcare-Local.postman_environment.json` | Environment: base URL, demo doctor logins, and all runtime variables |
| `tests/postman/build-collection.mjs` | Generator. Edit it and run `node tests/postman/build-collection.mjs [--skip-time]` to regenerate the JSON files |
| `tests/postman/summarize-newman.mjs` | Turns a newman JSON report into a PASS/FAIL table |
| `docs/TEST_REPORT_TEMPLATE.md` | Empty report: one row per test with Result and Actual result |

## IMPORTANT: what has and has not been verified

**Nothing here has been run against your real backend or MySQL.** The cloud session that wrote it has no Maven network and no MySQL.
What was done instead:
- Every expected status code and message text was compared with the real Java source (DTO annotations, `ApiException` messages, `GlobalExceptionHandler`, `SecurityConfig`, controller parameter names).
- The Postman scripts were executed (201 requests, 551 assertions) against a small mock server I wrote from `docs/API.md`, with a tiny Postman-like runner. This only proves the scripts and the request order are consistent. It says **nothing** about whether your backend behaves like the documentation.
- A negative control (mock without the history guard) made exactly the expected HIST tests fail, so the assertions can fail.

So expect that a few tests may fail on your first real run, either because the backend differs from my reading of the code (a real finding) or because an assertion text is slightly off (a test bug). Send me the failing lines and I will sort out which it is.

## 1. Setup (once)

1. Backend running, MySQL running. The demo data must exist (`SEED_DEMO_DATA` not set to `false`) because the tests log in as the demo doctors. The password is `Doctor@123` unless you changed `DEMO_DOCTOR_PASSWORD`; if so, edit `doctorPassword` in the environment.
2. Postman: **Import** the collection JSON and the environment JSON.
3. Top right, select the environment **Healthcare Local**. Without it the first request stops with a clear error message.
4. Check the `baseUrl` value (default `http://localhost:8080`). Doctor names/e-mails are in the environment too; change them only if your data differs.
5. Optional: if your frontend runs on another port than 5173, set `allowedOrigin` (used by the CORS tests; it must equal the backend setting `CORS_ALLOWED_ORIGINS`, default `http://localhost:5173`).
6. `serverUtcOffsetMinutes` is `330` (India, `app.timezone=Asia/Kolkata`). Change it only if you changed `app.timezone`.

## 2. Run all tests

**Postman:** right-click the collection > **Run collection** > keep the order > Run. Turn **off** "Save responses" and "Persist responses" if the run is slow. Folders run top to bottom; **00 Setup must run first** (it creates the patients and slots all other folders use).
To skip the slow folder, untick folder `10 Time rules` in the Runner or import the NoTime collection instead.

**newman (command line, Windows PowerShell or cmd, Node 18):**
```
cd healthcare-booking
npx newman run tests\postman\Healthcare-Booking-Negative-Tests.postman_collection.json -e tests\postman\Healthcare-Local.postman_environment.json --reporters cli,json --reporter-json-export tests\postman\newman-report.json
node tests\postman\summarize-newman.mjs tests\postman\newman-report.json > tests\postman\report.md
```
(`npx` downloads newman the first time, so it needs internet. For the fast run use the `-NoTime` collection file.) Newman does not write variables back to the environment file, which is fine because each run creates its own data.

Duration: about 1-2 minutes without folder 10 (5 BCrypt logins with cost 12 are in the auth folder), plus about 4 minutes of waiting for folder 10.

Then copy the results into `docs/TEST_REPORT_TEMPLATE.md` (or use the generated `report.md`). Mark PASS/FAIL from what really happened.

## 3. What gets created in your database

Nothing is deleted or reset. Each run adds (the API has no way to delete users or appointments):
- 4 patients named `autotest_a_<time>@example.com`, `autotest_b_...`, `autotest_mass_...`, `autotest_lock_...` (the last one is deliberately locked by 5 failed logins; it is a throwaway account).
- A few appointments (CANCELLED / REJECTED / PENDING / COMPLETED) on test slots.
- Test slots on a random day **30 to 85 days ahead**, between 00:00 and 06:00, for Dr. Priya Sharma, Dr. Rahul Mehta, Dr. Ananya Iyer. Folder 10 additionally creates 10-minute slots starting a few minutes from "now" (today). Slots without history are deleted again by folders 08 and 12; the rest cannot be deleted because they have appointment history (that is itself tested).

They do not disturb your own demo data (your slots are probably in normal day hours). To find them in MySQL (read-only queries):
```sql
SELECT id, email, created_at FROM users WHERE email LIKE 'autotest\_%@example.com' OR email LIKE 'race%@example.com';
SELECT s.id, s.doctor_id, s.slot_date, s.start_time FROM availability_slots s WHERE s.start_time < '06:00:00' AND s.slot_date > CURDATE() + INTERVAL 29 DAY;
```
I recommend **not** deleting anything. If you still want to, check the foreign keys first (`SHOW CREATE TABLE appointments;`), back up, and delete appointments before users. I did not write delete statements because I could not test the foreign-key order.

## 4. Folder guide and what each proves

| Folder | IDs | Covers |
|---|---|---|
| 00 Setup | S01-S15 | Logins, two new patients, slots M1-M4, F1, D2. Also checks that the deactivated doctor is hidden from the public list |
| 01 Auth | AUTH-01..26 | Validation (empty, email, password rules, phone), duplicate email incl. upper case, malformed JSON, role mass-assignment, same message for wrong password and unknown e-mail, forged tokens (changed signature / role / subject / `alg:none` / garbage / empty / Basic / token in query string), brute-force lock (429) |
| 02 Public | PUB-01..11 | Bad ids and dates, no e-mail/phone leakage, SQL text in search, past date |
| 03 Slots | SLOT-01..29 | 401/403 incl. deactivated doctor, every validation rule, overlap variants, back-to-back allowed, range errors, other doctor's slot gives 404, list isolation |
| 04 Booking | BOOK-01..19 | Duplicate booking, invalid/negative/zero/text slot id, empty body, no body, reason 256 vs 255, mass assignment (client cannot set status), script text stored as plain data, wrong roles, 405 |
| 05 Authorization | AUTHZ-01..20 | Patient B cancelling A's appointment (404), Doctor 2 approve/reject/complete Doctor 1's appointment (404), role and token checks, list isolation, patient e-mail not exposed to doctors, `/api/admin/**` |
| 06 Transitions | STATE-01..20 | Every forbidden move (double approve/reject/cancel, approve/reject/complete after cancel/reject, complete too early), slot freed after cancel/reject, rebooking |
| 07 Lists | LIST-01..10 | Invalid status filter, filters, sorting, isolation |
| 08 History | HIST-01..09 | Edit/delete of booked slot and of freed slots that have history (409); history survives; clean slot can be deleted |
| 09 Security | SEC-01..10 | CORS allowed/foreign origin, nosniff, no `X-Powered-By`, SQL text in login, token in query string, Basic scheme, unknown URL, very long input |
| 10 Time rules | TIME-01..20 | Complete after start, late cancel/approve (409), reject allowed, booking a started slot (409), hidden from public list |
| 11 Suspected defects | DEF-01 | See section 6. **May fail** |
| 12 Cleanup | CLN-01..03 | Deletes leftover clean slots, creates the slot for the concurrency test |

Documented cases from `APPOINTMENT_TESTS.md` section 2 that were already covered by your manual 15 tests (happy path) are repeated only where later tests depend on them.

### Notes on specific tests
- **AUTH-23/24** assume the lock applies after the 5th failed attempt, so the 6th attempt (even with the right password) is 429. If your 5th failure already returns 429, AUTH-23.5 fails: adjust the expectation, it is a documentation question, not a defect.
- **BOOK-17**: a deactivated doctor token is rejected at the role level (it is a DOCTOR token), so the expected result is 403.
- **TIME-08** waits using a Postman pre-request timer. Postman and newman wait for pending timers in pre-request scripts, but I could not test that in a real Postman here. If TIME-08 fails with "the slot start time has now passed" false, the wait did not run: run folder 10 again later, or after the first 4 minutes just run TIME-08 onwards again (the variables are kept). It needs a stable clock: do not run folder 10 between 23:45 and 00:00 (the script refuses to run then).
- **TIME-05** must reach the server before the slot starts (default lead is 3 minutes, `timeLeadMinutes` in the environment). On a slow machine raise it to 5.
- **S10** (and others) can return 409 if a random date collides with an old test slot at the same hour. Just run again.

## 5. Concurrency test (real parallel requests)

Postman cannot send truly simultaneous requests, so this stays a Node script (`scripts/concurrency-test.mjs`, unchanged).

1. Run the collection (at least folder 00 and folder 12). Folder 12 request **CLN-03** creates a fresh AVAILABLE slot and prints the exact command in the Postman Console, and stores it in the environment variable `raceCommand`. Or create a slot yourself as a doctor.
2. In a terminal in the project folder:
```
node scripts\concurrency-test.mjs <slotId> 5
node scripts\concurrency-test.mjs <slotId2> 10 http://127.0.0.1:8080
```
Use a **new** slot for every run (a slot that is already booked gives 0 wins and the script reports FAIL, which is correct).
3. Expected last lines: `201 Created: 1 | 409 Conflict: 4 | other: 0 | patients holding an appointment: 1` and `PASS`. Exit code 0 = PASS, 1 = FAIL, 2 = could not run.
4. Cross-check in MySQL (must return 1):
```sql
SELECT COUNT(*) FROM appointments WHERE slot_id = <slotId> AND status IN ('PENDING','CONFIRMED','COMPLETED');
```
5. Record the output in the report template.

**Review of the script against your setup (no change needed):**
- Works with Node 18 (uses the built-in `fetch`; no packages).
- On Windows, `localhost` can resolve to IPv6 `::1` first. If you get `ERROR: fetch failed`, pass the third argument `http://127.0.0.1:8080`.
- It registers N new patients first. Each registration/login uses BCrypt cost 12, so 10-20 parallel patients take a few seconds, that is normal. Keep N at 20 or less; the default Hikari pool has 10 connections, so more than that mostly tests the pool, not the lock.
- Each run leaves N patients `race<time>_<i>@example.com` and one appointment in your database (cannot be removed through the API). Harmless.
- It only proves what HTTP returned (one 201, the rest 409, one patient holding an appointment). The SQL query in step 4 is the independent check on MySQL.
- It cannot fake a pass: any 500, timeout or second 201 gives FAIL; a connection error gives exit code 2.

## 6. Suspected defect (not fixed, by your instruction)

`DEF-01` sends `Content-Type: text/plain` to `POST /api/appointments`. Spring raises `HttpMediaTypeNotSupportedException`. `GlobalExceptionHandler` has no handler for it, so the catch-all handler most likely answers **500 "Something went wrong"** instead of **415**. The test expects 415, so it will FAIL if my reading is right. If you want to fix it, add to `GlobalExceptionHandler`:
```java
@ExceptionHandler(org.springframework.web.HttpMediaTypeNotSupportedException.class)
public ResponseEntity<ErrorResponse> handleUnsupportedMedia(org.springframework.web.HttpMediaTypeNotSupportedException ex) {
    return ResponseEntity.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE)
            .body(ErrorResponse.of(415, "Unsupported Media Type", "Content-Type must be application/json"));
}
```
(Check the exact `ErrorResponse.of` signature in your file.) It is low risk, but it is a change to backend code, so it was left for you to decide.

## 7. What cannot be automated safely (and what to do instead)

| Case | Why not | Do this instead |
|---|---|---|
| Expired JWT (30 min) | Needs a token older than its expiry, or changing `JWT_EXPIRATION`/the server clock | Optional: start the backend once with a 1-minute expiry, log in, wait, call `/api/auth/me`, expect 401 |
| Lock expiry after 15 minutes | 15 minutes of waiting, and changes the lock state | Manual, or skip |
| Booking a slot of a deactivated doctor (expects 404) | The API can neither create a slot for that doctor nor re-assign one. It needs SQL inserts into your database | Skip, or insert a slot with SQL on a copy of the database |
| V3 unique index rejecting a second active appointment | Needs a direct INSERT into MySQL | The SQL steps in `docs/APPOINTMENT_TESTS.md` section 4 |
| Truly simultaneous requests | Postman sends sequentially | Section 5 |
| Admin-only positive paths | No admin endpoints exist yet | Only the 401/403 on `/api/admin/**` is tested |
| Disabled (not deactivated-doctor) patient token | Needs an SQL UPDATE of a user | Skip |
| Rate limiting beyond the login lock | Not implemented | n/a |
