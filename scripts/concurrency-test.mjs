// Double-booking race test. Needs Node 18+ (built-in fetch). Run it against your running backend.
//
// Usage:   node scripts/concurrency-test.mjs <slotId> [parallelRequests=5] [baseUrl=http://localhost:8080]
// Example: node scripts/concurrency-test.mjs 12
//
// What it does: registers N brand-new patients, logs them in, then makes all N book the SAME slot
// at the same instant. Exactly ONE request may succeed (201); every other one must get 409.
// Use a slot that is currently AVAILABLE (create one as a doctor first, see docs/APPOINTMENT_TESTS.md).

const [slotArg, parallelArg, baseArg] = process.argv.slice(2);
if (!slotArg || Number.isNaN(Number(slotArg))) {
  console.error('Usage: node scripts/concurrency-test.mjs <slotId> [parallelRequests=5] [baseUrl]');
  process.exit(2);
}
const slotId = Number(slotArg);
const parallel = Number(parallelArg ?? 5);
const base = (baseArg ?? 'http://localhost:8080').replace(/\/$/, '');
const stamp = Date.now();
const password = 'Race@1234';

async function call(method, path, body, token) {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { /* empty body */ }
  return { status: res.status, json };
}

async function newPatientToken(i) {
  const email = `race${stamp}_${i}@example.com`;
  const reg = await call('POST', '/api/auth/register', { fullName: `Race Patient ${i}`, email, password });
  if (reg.status !== 201) throw new Error(`register failed (${reg.status}): ${JSON.stringify(reg.json)}`);
  const login = await call('POST', '/api/auth/login', { email, password });
  if (login.status !== 200) throw new Error(`login failed (${login.status}): ${JSON.stringify(login.json)}`);
  return login.json.accessToken;
}

async function main() {
  console.log(`Preparing ${parallel} patients...`);
  const tokens = await Promise.all(Array.from({ length: parallel }, (_, i) => newPatientToken(i)));

  console.log(`Firing ${parallel} booking requests for slot ${slotId} at the same time...`);
  const results = await Promise.all(
    tokens.map((t) => call('POST', '/api/appointments', { slotId, reason: 'race test' }, t)),
  );

  results.forEach((r, i) => console.log(`  patient ${i}: HTTP ${r.status}${r.json?.message ? ' - ' + r.json.message : ''}`));

  const wins = results.filter((r) => r.status === 201).length;
  const conflicts = results.filter((r) => r.status === 409).length;
  const other = results.length - wins - conflicts;

  // Cross-check: how many of the new patients now actually hold an appointment?
  const lists = await Promise.all(tokens.map((t) => call('GET', '/api/appointments/mine', null, t)));
  const holders = lists.filter((l) => l.status === 200 && Array.isArray(l.json) && l.json.length > 0).length;

  console.log(`\n201 Created: ${wins} | 409 Conflict: ${conflicts} | other: ${other} | patients holding an appointment: ${holders}`);
  if (wins === 1 && conflicts === parallel - 1 && other === 0 && holders === 1) {
    console.log('PASS: exactly one booking succeeded, the rest were rejected.');
    process.exit(0);
  }
  console.log('FAIL: expected exactly one 201 and all others 409. Check the slot was AVAILABLE and the backend log.');
  process.exit(1);
}

main().catch((e) => { console.error('ERROR:', e.message); process.exit(2); });
