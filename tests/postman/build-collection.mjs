// Generates the Postman collection + environment for the negative / validation / security tests.
// Usage (from the project root):  node tests/postman/build-collection.mjs [--skip-time]
// --skip-time writes an extra collection file without folder 10 (the ~4 minute time-rule tests).
// The generated JSON files are what you import into Postman. Edit THIS file, then regenerate.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

// ------------------------------------------------------------------ shared script code (ES5 so it runs everywhere)
const PRELUDE = String.raw`
var CODE = pm.response.code;
var TXT = pm.response.text();
var J = null; try { J = JSON.parse(TXT); } catch (e) { J = null; }
function check(name, cond, detail) {
  pm.test(name, function () { if (!cond) { throw new Error(detail || ('assertion failed: ' + name)); } });
}
function snip() { return String(TXT).replace(/\s+/g, ' ').slice(0, 240); }
function status(n) { check('HTTP status is ' + n, CODE === n, 'expected HTTP ' + n + ' but got ' + CODE + ' | body: ' + snip()); }
function err(n, part) {
  status(n);
  check('error JSON: status=' + n + (part ? ', message contains "' + part + '"' : ''),
    J !== null && J.status === n && typeof J.message === 'string' && typeof J.error === 'string' &&
    (!part || J.message.toLowerCase().indexOf(part.toLowerCase()) !== -1),
    'actual body: ' + snip());
  check('error body leaks no internals (stack trace / SQL / class names)',
    !/Exception|\bat com\.|\.java|stackTrace|SQLSyntax|Hibernate/i.test(TXT), 'actual body: ' + snip());
}
function fieldErr(field, part) {
  check('fieldErrors.' + field + (part ? ' contains "' + part + '"' : ' is present'),
    J !== null && J.fieldErrors && typeof J.fieldErrors[field] === 'string' &&
    (!part || J.fieldErrors[field].toLowerCase().indexOf(part.toLowerCase()) !== -1),
    'actual fieldErrors: ' + JSON.stringify(J && J.fieldErrors));
}
function env(k) { return pm.environment.get(k); }
function put(k, v) { pm.environment.set(k, String(v)); }
function num(k) { return parseInt(pm.environment.get(k), 10); }
function isArr(x) { return Object.prototype.toString.call(x) === '[object Array]'; }
function findId(list, id) { if (!isArr(list)) { return null; } for (var i = 0; i < list.length; i++) { if (String(list[i].id) === String(id)) { return list[i]; } } return null; }
function hdr(name) { return pm.response.headers.get(name); }
`;

const PRE_HELPERS = "function env(k) { return pm.environment.get(k); }\nfunction put(k, v) { pm.environment.set(k, String(v)); }\n";

const DATE_HELPERS = String.raw`
var OFF = parseInt(pm.environment.get('serverUtcOffsetMinutes') || '330', 10);
function p2(n) { return (n < 10 ? '0' : '') + n; }
function ist(ms) { return new Date(ms + OFF * 60000); }
function ymd(ms) { var d = ist(ms); return d.getUTCFullYear() + '-' + p2(d.getUTCMonth() + 1) + '-' + p2(d.getUTCDate()); }
function hm(ms) { var d = ist(ms); return p2(d.getUTCHours()) + ':' + p2(d.getUTCMinutes()); }
var DAY = 86400000;
`;

const TOKEN_HELPERS = String.raw`
var B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function b64decode(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/'); var out = '', bits = 0, acc = 0;
  for (var i = 0; i < s.length; i++) {
    var v = B64.indexOf(s.charAt(i)); if (v < 0) { continue; }
    acc = (acc << 6) | v; bits += 6;
    if (bits >= 8) { bits -= 8; out += String.fromCharCode((acc >> bits) & 255); acc = acc & ((1 << bits) - 1); }
  }
  return out;
}
function b64urlEncode(str) {
  var out = '', bits = 0, acc = 0;
  for (var i = 0; i < str.length; i++) {
    acc = (acc << 8) | (str.charCodeAt(i) & 255); bits += 8;
    while (bits >= 6) { bits -= 6; out += B64.charAt((acc >> bits) & 63); acc = acc & ((1 << bits) - 1); }
  }
  if (bits > 0) { out += B64.charAt((acc << (6 - bits)) & 63); }
  return out.replace(/\+/g, '-').replace(/\//g, '_');
}
function jwtParts() {
  var t = pm.environment.get('patientAToken'); var p = String(t).split('.');
  if (p.length !== 3) { throw new Error('patientAToken is not a JWT - did 00 Setup run?'); }
  return p;
}
`;

// ------------------------------------------------------------------ builder
const TOK = { A: 'patientAToken', B: 'patientBToken', D1: 'doctor1Token', D2: 'doctor2Token', D3: 'doctor3Token', X: 'inactiveDoctorToken' };
const folders = [];
function folder(name, description) { const f = { name, description, item: [] }; folders.push(f); return f; }

function add(f, id, title, o) {
  const headers = [];
  if (o.as) { headers.push({ key: 'Authorization', value: 'Bearer {{' + TOK[o.as] + '}}' }); }
  if (o.authValue) { headers.push({ key: 'Authorization', value: o.authValue }); }
  const hasBody = o.body !== undefined;
  if (hasBody || o.json) { headers.push({ key: 'Content-Type', value: o.ct || 'application/json' }); }
  (o.h || []).forEach(([k, v]) => headers.push({ key: k, value: v }));
  const item = { name: id + ' ' + title, event: [], request: { method: o.m || 'GET', header: headers, url: '{{baseUrl}}' + o.u } };
  if (hasBody) {
    item.request.body = {
      mode: 'raw',
      raw: typeof o.body === 'string' ? o.body : JSON.stringify(o.body),
      options: { raw: { language: o.ct && o.ct !== 'application/json' ? 'text' : 'json' } },
    };
  }
  if (o.pre) { item.event.push({ listen: 'prerequest', script: { type: 'text/javascript', exec: (PRE_HELPERS + o.pre).split('\n') } }); }
  item.event.push({ listen: 'test', script: { type: 'text/javascript', exec: (PRELUDE + '\n' + o.t).split('\n') } });
  f.item.push(item);
}

const J = (x) => JSON.stringify(x);
const longStr = (n) => 'x'.repeat(n);

// ================================================================== 00 SETUP
const f00 = folder('00 Setup (creates its own test data)',
  'Logs in the demo doctors, registers two NEW patients, and creates test slots 30-85 days ahead at night hours. Must run first, in order.');

add(f00, 'S01', 'Login Doctor 1', {
  m: 'POST', u: '/api/auth/login', body: '{"email":"{{doctor1Email}}","password":"{{doctorPassword}}"}',
  pre: "if (!pm.environment.get('baseUrl')) { throw new Error('Select the \"Healthcare Local\" environment (top-right in Postman) before running.'); }",
  t: "status(200); check('role is DOCTOR', J && J.user && J.user.role === 'DOCTOR', 'body: ' + snip()); check('accessToken present', J && typeof J.accessToken === 'string' && J.accessToken.split('.').length === 3); if (J && J.accessToken) { put('doctor1Token', J.accessToken); }",
});
add(f00, 'S02', 'Login Doctor 2', {
  m: 'POST', u: '/api/auth/login', body: '{"email":"{{doctor2Email}}","password":"{{doctorPassword}}"}',
  t: "status(200); check('role is DOCTOR', J && J.user && J.user.role === 'DOCTOR', 'body: ' + snip()); if (J && J.accessToken) { put('doctor2Token', J.accessToken); }",
});
add(f00, 'S03', 'Login Doctor 3', {
  m: 'POST', u: '/api/auth/login', body: '{"email":"{{doctor3Email}}","password":"{{doctorPassword}}"}',
  t: "status(200); check('role is DOCTOR', J && J.user && J.user.role === 'DOCTOR', 'body: ' + snip()); if (J && J.accessToken) { put('doctor3Token', J.accessToken); }",
});
add(f00, 'S04', 'Login deactivated demo doctor', {
  m: 'POST', u: '/api/auth/login', body: '{"email":"{{inactiveDoctorEmail}}","password":"{{doctorPassword}}"}',
  t: "status(200); check('role is DOCTOR (account enabled, doctor profile DEACTIVATED)', J && J.user && J.user.role === 'DOCTOR', 'body: ' + snip()); if (J && J.accessToken) { put('inactiveDoctorToken', J.accessToken); }",
});
add(f00, 'S05', 'Find doctor profile ids from the public list', {
  u: '/api/doctors',
  t: "status(200); check('list is an array', isArr(J)); var names = { doctor1Id: env('doctor1Name'), doctor2Id: env('doctor2Name'), doctor3Id: env('doctor3Name') };\n" +
    "for (var k in names) { var hit = null; if (isArr(J)) { for (var i = 0; i < J.length; i++) { if (J[i].fullName === names[k]) { hit = J[i]; } } } check(names[k] + ' is in the active doctor list', hit !== null, 'not found - check doctor*Name in the environment'); if (hit) { put(k, hit.id); } }\n" +
    "var inactive = false; if (isArr(J)) { for (var j = 0; j < J.length; j++) { if (String(J[j].fullName).indexOf('Inactive') !== -1) { inactive = true; } } } check('deactivated doctor is NOT in the public list', inactive === false);",
});
add(f00, 'S06', 'Register Patient A (new unique account)', {
  m: 'POST', u: '/api/auth/register',
  pre: "var run = Date.now(); put('runId', run); put('patientAEmail', 'autotest_a_' + run + '@example.com'); put('patientBEmail', 'autotest_b_' + run + '@example.com');",
  body: '{"fullName":"AutoTest Patient A","email":"{{patientAEmail}}","password":"Test@1234","phone":"9876500001"}',
  t: "status(201); check('role is PATIENT, no password in response', J && J.role === 'PATIENT' && !/password/i.test(TXT), 'body: ' + snip());",
});
add(f00, 'S07', 'Login Patient A', {
  m: 'POST', u: '/api/auth/login', body: '{"email":"{{patientAEmail}}","password":"Test@1234"}',
  t: "status(200); if (J && J.accessToken) { put('patientAToken', J.accessToken); put('patientAUserId', J.user.id); }",
});
add(f00, 'S08', 'Register Patient B', {
  m: 'POST', u: '/api/auth/register', body: '{"fullName":"AutoTest Patient B","email":"{{patientBEmail}}","password":"Test@1234"}',
  t: "status(201); check('role is PATIENT', J && J.role === 'PATIENT');",
});
add(f00, 'S09', 'Login Patient B', {
  m: 'POST', u: '/api/auth/login', body: '{"email":"{{patientBEmail}}","password":"Test@1234"}',
  t: "status(200); if (J && J.accessToken) { put('patientBToken', J.accessToken); put('patientBUserId', J.user.id); }",
});
add(f00, 'S10', 'Create slot M1 (Doctor 1) and compute test dates', {
  m: 'POST', u: '/api/doctor/slots', as: 'D1',
  pre: DATE_HELPERS +
    "var base = Date.now() + (30 + Math.floor(Math.random() * 56)) * DAY;\n" +
    "put('testDate', ymd(base)); put('testDate2', ymd(base + DAY)); put('pastDate', ymd(Date.now() - 2 * DAY)); put('farDate', ymd(Date.now() + 100 * DAY));\n" +
    "var h = Math.floor(Math.random() * 4);   // start hour 00..03 so leftover test slots sit at night\n" +
    "function t(mins) { return p2(h + Math.floor(mins / 60)) + ':' + p2(mins % 60); }\n" +
    "put('t0', t(0)); put('t1', t(30)); put('t2', t(60)); put('t3', t(90)); put('t4', t(120)); put('t5', t(150)); put('t6', t(180));\n" +
    "put('tIn0', t(5)); put('tIn1', t(20)); put('tq0', t(15)); put('tq1', t(45));",
  body: '{"slotDate":"{{testDate}}","startTime":"{{t0}}","endTime":"{{t1}}"}',
  t: "status(201); check('slot is AVAILABLE', J && J.status === 'AVAILABLE', 'body: ' + snip()); if (J && J.id) { put('slotM1Id', J.id); } else { console.log('If this is 409 the random date collided with an old test run - just run again.'); }",
});
[['S11', 'M2', 'D1', 't1', 't2'], ['S12', 'M3', 'D1', 't2', 't3'], ['S13', 'M4', 'D1', 't3', 't4'], ['S14', 'F1 (free slot, never booked)', 'D1', 't4', 't5'], ['S15', 'D2 (Doctor 2 own slot)', 'D2', 't0', 't1']].forEach(([id, label, who, a, b]) => {
  const varName = { M2: 'slotM2Id', M3: 'slotM3Id', M4: 'slotM4Id', 'F1 (free slot, never booked)': 'slotFreeId', 'D2 (Doctor 2 own slot)': 'slotD2Id' }[label];
  add(f00, id, 'Create slot ' + label, {
    m: 'POST', u: '/api/doctor/slots', as: who, body: '{"slotDate":"{{testDate}}","startTime":"{{' + a + '}}","endTime":"{{' + b + '}}"}',
    t: "status(201); if (J && J.id) { put('" + varName + "', J.id); }",
  });
});

// ================================================================== 01 AUTH
const f01 = folder('01 Auth validation and token security', 'Register/login negatives, mass assignment, forged/tampered tokens, brute-force lock (uses a throwaway account).');
add(f01, 'AUTH-01', 'Register with empty body {} -> 400 with 3 field errors', { m: 'POST', u: '/api/auth/register', body: '{}',
  t: "err(400, 'Validation failed'); fieldErr('fullName', 'required'); fieldErr('email', 'required'); fieldErr('password', 'required');" });
add(f01, 'AUTH-02', 'Register with invalid email -> 400', { m: 'POST', u: '/api/auth/register', body: '{"fullName":"X","email":"not-an-email","password":"Test@1234"}',
  t: "err(400, 'Validation failed'); fieldErr('email', 'valid email');" });
add(f01, 'AUTH-03', 'Register with weak password (no uppercase) -> 400', { m: 'POST', u: '/api/auth/register', body: '{"fullName":"X","email":"weak1@example.com","password":"alllowercase1"}',
  t: "err(400, 'Validation failed'); fieldErr('password', 'uppercase');" });
add(f01, 'AUTH-04', 'Register with too-short password -> 400', { m: 'POST', u: '/api/auth/register', body: '{"fullName":"X","email":"weak2@example.com","password":"Ab1"}',
  t: "err(400, 'Validation failed'); fieldErr('password', '8 to 64');" });
add(f01, 'AUTH-05', 'Register with invalid phone -> 400', { m: 'POST', u: '/api/auth/register', body: '{"fullName":"X","email":"phone1@example.com","password":"Test@1234","phone":"abc"}',
  t: "err(400, 'Validation failed'); fieldErr('phone', 'phone');" });
add(f01, 'AUTH-06', 'Register with an existing email -> 409', { m: 'POST', u: '/api/auth/register', body: '{"fullName":"Dup","email":"{{patientAEmail}}","password":"Test@1234"}',
  t: "err(409, 'already exists');" });
add(f01, 'AUTH-07', 'Register with existing email in UPPER CASE -> 409 (case-insensitive)', {
  m: 'POST', u: '/api/auth/register', pre: "put('patientAEmailUpper', env('patientAEmail').toUpperCase());",
  body: '{"fullName":"Dup","email":"{{patientAEmailUpper}}","password":"Test@1234"}', t: "err(409, 'already exists');" });
add(f01, 'AUTH-08', 'Register with malformed JSON -> 400', { m: 'POST', u: '/api/auth/register', body: '{"fullName": "X", "email": ',
  t: "err(400, 'Malformed');" });
add(f01, 'AUTH-09', 'Mass assignment: register with role=ADMIN is ignored -> PATIENT', {
  m: 'POST', u: '/api/auth/register', pre: "put('massEmail', 'autotest_mass_' + Date.now() + '@example.com');",
  body: '{"fullName":"Mass Assign","email":"{{massEmail}}","password":"Test@1234","role":"ADMIN","enabled":true}',
  t: "status(201); check('role is still PATIENT', J && J.role === 'PATIENT', 'actual role: ' + (J && J.role));" });
add(f01, 'AUTH-10', 'Login with wrong password -> 401', { m: 'POST', u: '/api/auth/login', body: '{"email":"{{patientAEmail}}","password":"Wrong@1234"}',
  t: "err(401, 'Invalid email or password');" });
add(f01, 'AUTH-11', 'Login with unknown email -> 401 with the SAME message (no user enumeration)', { m: 'POST', u: '/api/auth/login', body: '{"email":"nobody_{{runId}}@example.com","password":"Test@1234"}',
  t: "err(401, 'Invalid email or password');" });
add(f01, 'AUTH-12', 'Login with empty body {} -> 400', { m: 'POST', u: '/api/auth/login', body: '{}',
  t: "err(400, 'Validation failed'); fieldErr('email', 'required'); fieldErr('password', 'required');" });
add(f01, 'AUTH-13', 'Login success body: token fields present, no password/hash', { m: 'POST', u: '/api/auth/login', body: '{"email":"{{patientAEmail}}","password":"Test@1234"}',
  t: "status(200); check('tokenType is Bearer, expiresInSeconds is a number', J && J.tokenType === 'Bearer' && typeof J.expiresInSeconds === 'number', 'body: ' + snip()); check('user has id, fullName, email, role', J && J.user && J.user.id && J.user.fullName && J.user.email && J.user.role === 'PATIENT'); check('response contains no password or hash', !/password|hash/i.test(TXT), 'body: ' + snip());" });
add(f01, 'AUTH-14', 'GET /me without token -> 401', { u: '/api/auth/me', t: "err(401, 'Authentication required');" });
add(f01, 'AUTH-15', 'GET /me with garbage token -> 401', { u: '/api/auth/me', authValue: 'Bearer not.a.jwt', t: "err(401, 'Authentication required');" });
add(f01, 'AUTH-16', 'GET /me with empty Bearer value -> 401', { u: '/api/auth/me', authValue: 'Bearer ', t: "err(401, 'Authentication required');" });
add(f01, 'AUTH-17', 'GET /me with signature altered inside the signature -> 401', {
  u: '/api/auth/me', authValue: 'Bearer {{tamperedSigToken}}',
  pre: TOKEN_HELPERS + "var p = jwtParts(); var sig = p[2]; var i = 8; var c = sig.charAt(i) === 'A' ? 'B' : 'A'; put('tamperedSigToken', p[0] + '.' + p[1] + '.' + sig.substring(0, i) + c + sig.substring(i + 1));",
  t: "err(401, 'Authentication required');" });
add(f01, 'AUTH-18', 'GET /me with payload role changed to ADMIN, old signature -> 401', {
  u: '/api/auth/me', authValue: 'Bearer {{tamperedRoleToken}}',
  pre: TOKEN_HELPERS + "var p = jwtParts(); var pay = JSON.parse(b64decode(p[1])); pay.role = 'ADMIN'; put('tamperedRoleToken', p[0] + '.' + b64urlEncode(JSON.stringify(pay)) + '.' + p[2]);",
  t: "err(401, 'Authentication required');" });
add(f01, 'AUTH-19', 'GET /me with subject (user id) changed, old signature -> 401', {
  u: '/api/auth/me', authValue: 'Bearer {{tamperedSubToken}}',
  pre: TOKEN_HELPERS + "var p = jwtParts(); var pay = JSON.parse(b64decode(p[1])); pay.sub = '1'; put('tamperedSubToken', p[0] + '.' + b64urlEncode(JSON.stringify(pay)) + '.' + p[2]);",
  t: "err(401, 'Authentication required');" });
add(f01, 'AUTH-20', 'GET /me with alg=none unsigned token -> 401', {
  u: '/api/auth/me', authValue: 'Bearer {{algNoneToken}}',
  pre: TOKEN_HELPERS + "var p = jwtParts(); put('algNoneToken', b64urlEncode('{\"alg\":\"none\",\"typ\":\"JWT\"}') + '.' + p[1] + '.');",
  t: "err(401, 'Authentication required');" });
add(f01, 'AUTH-21', 'GET /me with valid token -> 200 (control)', { u: '/api/auth/me', as: 'A',
  t: "status(200); check('returns Patient A, role PATIENT', J && J.role === 'PATIENT' && J.email === env('patientAEmail'), 'body: ' + snip());" });
add(f01, 'AUTH-22', 'Register throwaway account for the lock test', {
  m: 'POST', u: '/api/auth/register', pre: "put('lockEmail', 'autotest_lock_' + Date.now() + '@example.com');",
  body: '{"fullName":"Lock Test","email":"{{lockEmail}}","password":"Test@1234"}', t: "status(201);" });
for (let i = 1; i <= 5; i++) {
  add(f01, 'AUTH-23.' + i, 'Wrong password attempt ' + i + ' of 5 on throwaway account -> 401', { m: 'POST', u: '/api/auth/login', body: '{"email":"{{lockEmail}}","password":"Wrong@1234"}',
    t: "err(401, 'Invalid email or password');" });
}
add(f01, 'AUTH-24', 'Correct password after 5 failures -> 429 locked', { m: 'POST', u: '/api/auth/login', body: '{"email":"{{lockEmail}}","password":"Test@1234"}',
  t: "err(429, 'locked');" });
add(f01, 'AUTH-25', 'Wrong password while locked -> 429', { m: 'POST', u: '/api/auth/login', body: '{"email":"{{lockEmail}}","password":"Wrong@1234"}',
  t: "err(429, 'locked');" });
add(f01, 'AUTH-26', 'Patient A can still log in (lock is per account)', { m: 'POST', u: '/api/auth/login', body: '{"email":"{{patientAEmail}}","password":"Test@1234"}', t: "status(200);" });

// ================================================================== 02 PUBLIC
const f02 = folder('02 Public API negatives and data exposure', 'Doctors list/detail/slots without login.');
add(f02, 'PUB-01', 'Doctors list is public and exposes no email/phone/password', { u: '/api/doctors',
  t: "status(200); check('array with at least 3 doctors', isArr(J) && J.length >= 3); var bad = false; if (isArr(J)) { for (var i = 0; i < J.length; i++) { var d = J[i]; if ('email' in d || 'phone' in d || 'password' in d || 'passwordHash' in d || 'userId' in d) { bad = true; } } } check('no email/phone/password/userId keys on any doctor', bad === false);" });
add(f02, 'PUB-02', 'Doctor id that is not a number -> 400', { u: '/api/doctors/abc', t: "err(400, \"Invalid value for parameter 'id'\");" });
add(f02, 'PUB-03', 'Unknown doctor id -> 404', { u: '/api/doctors/999999', t: "err(404, 'Doctor not found');" });
add(f02, 'PUB-04', 'specializationId not a number -> 400', { u: '/api/doctors?specializationId=abc', t: "err(400, 'specializationId');" });
add(f02, 'PUB-05', 'Unknown specializationId -> 200 empty list', { u: '/api/doctors?specializationId=999999', t: "status(200); check('empty array', isArr(J) && J.length === 0, 'body: ' + snip());" });
add(f02, 'PUB-06', "SQL-injection string in search is treated as plain text -> 200 []", { u: "/api/doctors?search=%27%20OR%20%271%27%3D%271", t: "status(200); check('empty array (no row matches the literal text)', isArr(J) && J.length === 0, 'body: ' + snip());" });
add(f02, 'PUB-07', 'Slots of unknown doctor -> 404', { u: '/api/doctors/999999/slots', t: "err(404, 'Doctor not found');" });
add(f02, 'PUB-08', 'Slots with date that is not a date -> 400', { u: '/api/doctors/{{doctor1Id}}/slots?date=notadate', t: "err(400, \"Invalid value for parameter 'date'\");" });
add(f02, 'PUB-09', 'Slots with doctor id not a number -> 400', { u: '/api/doctors/abc/slots', t: "err(400, \"Invalid value for parameter 'doctorId'\");" });
add(f02, 'PUB-10', 'Slots for a past date -> 200 empty list', { u: '/api/doctors/{{doctor1Id}}/slots?date={{pastDate}}', t: "status(200); check('empty array', isArr(J) && J.length === 0, 'body: ' + snip());" });
add(f02, 'PUB-11', 'Slots for test date: M1 is listed, all AVAILABLE, times are HH:mm', { u: '/api/doctors/{{doctor1Id}}/slots?date={{testDate}}',
  t: "status(200); var m1 = findId(J, env('slotM1Id')); check('slot M1 is listed', m1 !== null, 'ids: ' + JSON.stringify((J || []).map(function (s) { return s.id; }))); var ok = true; for (var i = 0; i < J.length; i++) { if (J[i].status !== 'AVAILABLE' || !/^\\d\\d:\\d\\d$/.test(J[i].startTime) || String(J[i].doctorId) !== env('doctor1Id')) { ok = false; } } check('every slot is AVAILABLE, startTime is HH:mm, doctorId matches', ok);" });

// ================================================================== 03 SLOT MANAGEMENT
const f03 = folder('03 Slot management negatives', 'Doctor slot create/list/update/delete: auth, validation, overlap, ownership.');
const slotBody = (date, s, e) => '{"slotDate":"' + date + '","startTime":"' + s + '","endTime":"' + e + '"}';
add(f03, 'SLOT-01', 'Create slot without token -> 401', { m: 'POST', u: '/api/doctor/slots', body: slotBody('{{testDate}}', '{{t5}}', '{{t6}}'), t: "err(401, 'Authentication required');" });
add(f03, 'SLOT-02', 'Create slot with PATIENT token -> 403', { m: 'POST', u: '/api/doctor/slots', as: 'A', body: slotBody('{{testDate}}', '{{t5}}', '{{t6}}'), t: "err(403, 'permission');" });
add(f03, 'SLOT-03', 'Create slot as deactivated doctor -> 403', { m: 'POST', u: '/api/doctor/slots', as: 'X', body: slotBody('{{testDate}}', '{{t5}}', '{{t6}}'), t: "err(403, 'not approved');" });
add(f03, 'SLOT-04', 'Create slot with empty body {} -> 400 three field errors', { m: 'POST', u: '/api/doctor/slots', as: 'D1', body: '{}', t: "err(400, 'Validation failed'); fieldErr('slotDate'); fieldErr('startTime'); fieldErr('endTime');" });
add(f03, 'SLOT-05', 'Create slot with time "10am" -> 400 malformed', { m: 'POST', u: '/api/doctor/slots', as: 'D1', body: slotBody('{{testDate}}', '10am', '11am'), t: "err(400, 'Malformed');" });
add(f03, 'SLOT-06', 'Create slot with impossible date 2026-13-45 -> 400 malformed', { m: 'POST', u: '/api/doctor/slots', as: 'D1', body: slotBody('2026-13-45', '{{t5}}', '{{t6}}'), t: "err(400, 'Malformed');" });
add(f03, 'SLOT-07', 'End time before start time -> 400', { m: 'POST', u: '/api/doctor/slots', as: 'D1', body: slotBody('{{testDate}}', '{{t6}}', '{{t5}}'), t: "err(400, 'End time must be after start time');" });
add(f03, 'SLOT-08', 'End time equal to start time -> 400', { m: 'POST', u: '/api/doctor/slots', as: 'D1', body: slotBody('{{testDate}}', '{{t5}}', '{{t5}}'), t: "err(400, 'End time must be after start time');" });
add(f03, 'SLOT-09', 'Slot shorter than 10 minutes -> 400', { m: 'POST', u: '/api/doctor/slots', as: 'D1', body: slotBody('{{testDate}}', '{{t5}}', '{{t5plus5}}'),
  pre: "var p = env('t5').split(':'); var m = parseInt(p[0], 10) * 60 + parseInt(p[1], 10) + 5; put('t5plus5', (m < 600 ? '0' : '') + Math.floor(m / 60) + ':' + (m % 60 < 10 ? '0' : '') + (m % 60));",
  t: "err(400, 'between 10 and 180');" });
add(f03, 'SLOT-10', 'Slot longer than 180 minutes -> 400', { m: 'POST', u: '/api/doctor/slots', as: 'D1', body: slotBody('{{testDate}}', '10:00', '14:00'), t: "err(400, 'between 10 and 180');" });
add(f03, 'SLOT-11', 'Slot in the past -> 400', { m: 'POST', u: '/api/doctor/slots', as: 'D1', body: slotBody('{{pastDate}}', '10:00', '10:30'), t: "err(400, 'future');" });
add(f03, 'SLOT-12', 'Slot more than 90 days ahead -> 400', { m: 'POST', u: '/api/doctor/slots', as: 'D1', body: slotBody('{{farDate}}', '10:00', '10:30'), t: "err(400, '90 days');" });
add(f03, 'SLOT-13', 'Exact duplicate of slot M1 -> 409', { m: 'POST', u: '/api/doctor/slots', as: 'D1', body: slotBody('{{testDate}}', '{{t0}}', '{{t1}}'), t: "err(409, 'overlaps');" });
add(f03, 'SLOT-14', 'Partial overlap with M1 and M2 -> 409', { m: 'POST', u: '/api/doctor/slots', as: 'D1', body: slotBody('{{testDate}}', '{{tq0}}', '{{tq1}}'), t: "err(409, 'overlaps');" });
add(f03, 'SLOT-15', 'Slot fully inside M1 -> 409', { m: 'POST', u: '/api/doctor/slots', as: 'D1', body: slotBody('{{testDate}}', '{{tIn0}}', '{{tIn1}}'), t: "err(409, 'overlaps');" });
add(f03, 'SLOT-16', 'Back-to-back slot (starts when F1 ends) is allowed -> 201', { m: 'POST', u: '/api/doctor/slots', as: 'D1', body: slotBody('{{testDate}}', '{{t5}}', '{{t6}}'),
  t: "status(201); if (J && J.id) { put('slotAdjId', J.id); }" });
add(f03, 'SLOT-17', 'List own slots with to before from -> 400', { u: '/api/doctor/slots?from=2030-02-01&to=2030-01-01', as: 'D1', t: "err(400, 'must not be before');" });
add(f03, 'SLOT-18', 'List own slots with range over 90 days -> 400', { u: '/api/doctor/slots?from=2030-01-01&to=2030-12-31', as: 'D1', t: "err(400, '90 days');" });
add(f03, 'SLOT-19', 'List own slots with bad date -> 400', { u: '/api/doctor/slots?from=yesterday', as: 'D1', t: "err(400, \"Invalid value for parameter 'from'\");" });
add(f03, 'SLOT-20', 'List own slots without token -> 401', { u: '/api/doctor/slots', t: "err(401, 'Authentication required');" });
add(f03, 'SLOT-21', 'List own slots with PATIENT token -> 403', { u: '/api/doctor/slots', as: 'A', t: "err(403, 'permission');" });
add(f03, 'SLOT-22', "Doctor 2 updates Doctor 1's slot -> 404", { m: 'PUT', u: '/api/doctor/slots/{{slotFreeId}}', as: 'D2', body: slotBody('{{testDate}}', '{{t4}}', '{{t5}}'), t: "err(404, 'Slot not found');" });
add(f03, 'SLOT-23', "Doctor 2 deletes Doctor 1's slot -> 404", { m: 'DELETE', u: '/api/doctor/slots/{{slotFreeId}}', as: 'D2', t: "err(404, 'Slot not found');" });
add(f03, 'SLOT-24', 'Update unknown slot id -> 404', { m: 'PUT', u: '/api/doctor/slots/999999', as: 'D1', body: slotBody('{{testDate}}', '{{t4}}', '{{t5}}'), t: "err(404, 'Slot not found');" });
add(f03, 'SLOT-25', 'Delete unknown slot id -> 404', { m: 'DELETE', u: '/api/doctor/slots/999999', as: 'D1', t: "err(404, 'Slot not found');" });
add(f03, 'SLOT-26', 'Update with empty body -> 400', { m: 'PUT', u: '/api/doctor/slots/{{slotFreeId}}', as: 'D1', body: '{}', t: "err(400, 'Validation failed');" });
add(f03, 'SLOT-27', 'Delete with id that is not a number -> 400', { m: 'DELETE', u: '/api/doctor/slots/abc', as: 'D1', t: "err(400, \"Invalid value for parameter 'id'\");" });
add(f03, 'SLOT-28', "Doctor 2's list shows its own slot but never Doctor 1's slots", { u: '/api/doctor/slots?from={{testDate}}&to={{testDate}}', as: 'D2',
  t: "status(200); check('own slot D2 is listed', findId(J, env('slotD2Id')) !== null); check(\"Doctor 1's slots M1 and F1 are not listed\", findId(J, env('slotM1Id')) === null && findId(J, env('slotFreeId')) === null);" });
add(f03, 'SLOT-29', 'Update own free slot to the same time is allowed (self-overlap ignored) -> 200', { m: 'PUT', u: '/api/doctor/slots/{{slotFreeId}}', as: 'D1', body: slotBody('{{testDate}}', '{{t4}}', '{{t5}}'),
  t: "status(200); check('slot unchanged and AVAILABLE', J && J.status === 'AVAILABLE' && J.startTime === env('t4') && J.endTime === env('t5'), 'body: ' + snip());" });

// ================================================================== 04 BOOKING
const f04 = folder('04 Booking: happy path and negatives', 'Patient A books M1, then duplicate/invalid/validation/role cases.');
add(f04, 'BOOK-01', 'Patient A books M1 -> 201 PENDING', { m: 'POST', u: '/api/appointments', as: 'A', body: '{"slotId":{{slotM1Id}},"reason":"Fever since 2 days"}',
  t: "status(201); check('status PENDING, slotId matches, reason kept', J && J.status === 'PENDING' && String(J.slotId) === env('slotM1Id') && J.reason === 'Fever since 2 days', 'body: ' + snip()); check('patient view has doctor info but no patient fields', J && J.doctorName && !('patientName' in J) && !('patientPhone' in J)); if (J && J.id) { put('apptAId', J.id); }" });
add(f04, 'BOOK-02', 'Booked slot disappears from the public slot list', { u: '/api/doctors/{{doctor1Id}}/slots?date={{testDate}}',
  t: "status(200); check('M1 no longer listed', findId(J, env('slotM1Id')) === null); check('M2 still listed', findId(J, env('slotM2Id')) !== null);" });
add(f04, 'BOOK-03', "Doctor's own slot list shows M1 as BOOKED", { u: '/api/doctor/slots?from={{testDate}}&to={{testDate}}', as: 'D1',
  t: "status(200); var s = findId(J, env('slotM1Id')); check('M1 status is BOOKED', s !== null && s.status === 'BOOKED', 'slot: ' + JSON.stringify(s));" });
add(f04, 'BOOK-04', 'Patient B books the same slot -> 409', { m: 'POST', u: '/api/appointments', as: 'B', body: '{"slotId":{{slotM1Id}}}', t: "err(409, 'already been booked');" });
add(f04, 'BOOK-05', 'Patient A books the same slot again -> 409', { m: 'POST', u: '/api/appointments', as: 'A', body: '{"slotId":{{slotM1Id}}}', t: "err(409, 'already been booked');" });
add(f04, 'BOOK-06', 'Unknown slot id -> 404', { m: 'POST', u: '/api/appointments', as: 'A', body: '{"slotId":999999}', t: "err(404, 'Slot not found');" });
add(f04, 'BOOK-07', 'Negative slot id -> 404', { m: 'POST', u: '/api/appointments', as: 'A', body: '{"slotId":-1}', t: "err(404, 'Slot not found');" });
add(f04, 'BOOK-08', 'Slot id 0 -> 404', { m: 'POST', u: '/api/appointments', as: 'A', body: '{"slotId":0}', t: "err(404, 'Slot not found');" });
add(f04, 'BOOK-09', 'Missing slotId {} -> 400 with fieldErrors.slotId', { m: 'POST', u: '/api/appointments', as: 'A', body: '{}', t: "err(400, 'Validation failed'); fieldErr('slotId', 'required');" });
add(f04, 'BOOK-10', 'slotId as text "abc" -> 400 malformed', { m: 'POST', u: '/api/appointments', as: 'A', body: '{"slotId":"abc"}', t: "err(400, 'Malformed');" });
add(f04, 'BOOK-11', 'No request body at all -> 400 malformed', { m: 'POST', u: '/api/appointments', as: 'A', json: true, t: "err(400, 'Malformed');" });
add(f04, 'BOOK-12', 'Reason of 256 characters -> 400', { m: 'POST', u: '/api/appointments', as: 'A', pre: "put('reason256', '" + longStr(256) + "');", body: '{"slotId":{{slotM3Id}},"reason":"{{reason256}}"}',
  t: "err(400, 'Validation failed'); fieldErr('reason', '255');" });
add(f04, 'BOOK-13', 'Reason of exactly 255 characters -> 201 (boundary)', { m: 'POST', u: '/api/appointments', as: 'A', pre: "put('reason255', '" + longStr(255) + "');", body: '{"slotId":{{slotM3Id}},"reason":"{{reason255}}"}',
  t: "status(201); check('reason stored fully (255 chars)', J && J.reason && J.reason.length === 255, 'length: ' + (J && J.reason && J.reason.length)); if (J && J.id) { put('apptBoundaryId', J.id); }" });
add(f04, 'BOOK-14', 'Mass assignment + script text in reason: extra fields ignored, text stored as plain data', { m: 'POST', u: '/api/appointments', as: 'A',
  body: '{"slotId":{{slotM4Id}},"reason":"<script>alert(1)</script>","status":"CONFIRMED","id":1,"patientId":1}',
  t: "status(201); check('status is PENDING (client cannot set status)', J && J.status === 'PENDING', 'actual: ' + (J && J.status)); check('response is JSON, not HTML', String(hdr('Content-Type')).indexOf('application/json') !== -1, 'Content-Type: ' + hdr('Content-Type')); check('reason echoed as plain text', J && J.reason === '<script>alert(1)</script>'); if (J && J.id) { put('apptXssId', J.id); }" });
add(f04, 'BOOK-15', 'DOCTOR token cannot book -> 403', { m: 'POST', u: '/api/appointments', as: 'D1', body: '{"slotId":{{slotM2Id}}}', t: "err(403, 'permission');" });
add(f04, 'BOOK-16', 'Booking without token -> 401', { m: 'POST', u: '/api/appointments', body: '{"slotId":{{slotM2Id}}}', t: "err(401, 'Authentication required');" });
add(f04, 'BOOK-17', 'Deactivated doctor token cannot book -> 403', { m: 'POST', u: '/api/appointments', as: 'X', body: '{"slotId":{{slotM2Id}}}', t: "err(403, 'permission');" });
add(f04, 'BOOK-18', 'DELETE /api/appointments (wrong method) -> 405', { m: 'DELETE', u: '/api/appointments', as: 'A', t: "err(405, 'method');" });
add(f04, 'BOOK-19', 'GET /api/appointments (no such route, only /mine) -> 405', { u: '/api/appointments', as: 'A', t: "err(405, 'method');" });

// ================================================================== 05 AUTHZ / OWNERSHIP
const f05 = folder('05 Authorization and ownership', 'Appointment A (PENDING, Patient A / Doctor 1) is attacked by the wrong patient, wrong doctor, wrong roles.');
add(f05, 'AUTHZ-01', "Patient B cancels Patient A's appointment -> 404", { m: 'POST', u: '/api/appointments/{{apptAId}}/cancel', as: 'B', t: "err(404, 'Appointment not found');" });
add(f05, 'AUTHZ-02', 'DOCTOR token on the patient cancel endpoint -> 403', { m: 'POST', u: '/api/appointments/{{apptAId}}/cancel', as: 'D1', t: "err(403, 'permission');" });
add(f05, 'AUTHZ-03', 'Cancel without token -> 401', { m: 'POST', u: '/api/appointments/{{apptAId}}/cancel', t: "err(401, 'Authentication required');" });
add(f05, 'AUTHZ-04', 'Cancel unknown appointment -> 404', { m: 'POST', u: '/api/appointments/999999/cancel', as: 'A', t: "err(404, 'Appointment not found');" });
add(f05, 'AUTHZ-05', 'Cancel with id "abc" -> 400', { m: 'POST', u: '/api/appointments/abc/cancel', as: 'A', t: "err(400, \"Invalid value for parameter 'id'\");" });
add(f05, 'AUTHZ-06', 'My appointments without token -> 401', { u: '/api/appointments/mine', t: "err(401, 'Authentication required');" });
add(f05, 'AUTHZ-07', 'My appointments with DOCTOR token -> 403', { u: '/api/appointments/mine', as: 'D1', t: "err(403, 'permission');" });
['approve', 'reject', 'complete'].forEach((act, i) => {
  add(f05, 'AUTHZ-08.' + (i + 1), "Doctor 2 " + act + "s Doctor 1's appointment -> 404", { m: 'POST', u: '/api/doctor/appointments/{{apptAId}}/' + act, as: 'D2', t: "err(404, 'Appointment not found');" });
});
['approve', 'reject', 'complete'].forEach((act, i) => {
  add(f05, 'AUTHZ-09.' + (i + 1), 'PATIENT token on doctor ' + act + ' endpoint -> 403', { m: 'POST', u: '/api/doctor/appointments/{{apptAId}}/' + act, as: 'A', t: "err(403, 'permission');" });
});
add(f05, 'AUTHZ-10', 'Doctor approve without token -> 401', { m: 'POST', u: '/api/doctor/appointments/{{apptAId}}/approve', t: "err(401, 'Authentication required');" });
add(f05, 'AUTHZ-11', 'Doctor approves unknown appointment -> 404', { m: 'POST', u: '/api/doctor/appointments/999999/approve', as: 'D1', t: "err(404, 'Appointment not found');" });
add(f05, 'AUTHZ-12', 'Doctor approve with id "abc" -> 400', { m: 'POST', u: '/api/doctor/appointments/abc/approve', as: 'D1', t: "err(400, \"Invalid value for parameter 'id'\");" });
add(f05, 'AUTHZ-13', "Doctor 2's appointment list does not contain Doctor 1's appointments", { u: '/api/doctor/appointments', as: 'D2',
  t: "status(200); check('array', isArr(J)); check('none of A\\'s appointments leak to Doctor 2', findId(J, env('apptAId')) === null && findId(J, env('apptBoundaryId')) === null && findId(J, env('apptXssId')) === null);" });
add(f05, 'AUTHZ-14', "Patient B's list does not contain Patient A's appointments", { u: '/api/appointments/mine', as: 'B',
  t: "status(200); check('array', isArr(J)); check('none of A\\'s appointments leak to Patient B', findId(J, env('apptAId')) === null && findId(J, env('apptBoundaryId')) === null && findId(J, env('apptXssId')) === null);" });
add(f05, 'AUTHZ-15', 'Doctor list: no access with PATIENT token (403) ', { u: '/api/doctor/appointments', as: 'A', t: "err(403, 'permission');" });
add(f05, 'AUTHZ-16', 'Doctor list without token -> 401', { u: '/api/doctor/appointments', t: "err(401, 'Authentication required');" });
add(f05, 'AUTHZ-17', 'Doctor 1 sees the appointment with patient name/phone but NOT the patient email', { u: '/api/doctor/appointments', as: 'D1',
  t: "status(200); var a = findId(J, env('apptAId')); check('appointment A is listed', a !== null); check('patientName and patientPhone present', a && a.patientName === 'AutoTest Patient A' && a.patientPhone === '9876500001', 'item: ' + JSON.stringify(a)); check('patient email is not exposed', a && !('patientEmail' in a) && JSON.stringify(a).indexOf(env('patientAEmail')) === -1);" });
add(f05, 'AUTHZ-18', '/api/admin/** with PATIENT token -> 403', { u: '/api/admin/anything', as: 'A', t: "err(403, 'permission');" });
add(f05, 'AUTHZ-19', '/api/admin/** with DOCTOR token -> 403', { u: '/api/admin/anything', as: 'D1', t: "err(403, 'permission');" });
add(f05, 'AUTHZ-20', '/api/admin/** without token -> 401', { u: '/api/admin/anything', t: "err(401, 'Authentication required');" });

// ================================================================== 06 STATE MACHINE
const f06 = folder('06 Status transitions', 'Every allowed move and every forbidden move. Appointment A on M1; Appointment B on M2; Patient B rebooks M1.');
add(f06, 'STATE-01', 'Complete a PENDING appointment -> 409', { m: 'POST', u: '/api/doctor/appointments/{{apptAId}}/complete', as: 'D1', t: "err(409, 'Only CONFIRMED appointments can be completed (this one is PENDING)');" });
add(f06, 'STATE-02', 'Doctor 1 approves A -> 200 CONFIRMED', { m: 'POST', u: '/api/doctor/appointments/{{apptAId}}/approve', as: 'D1', t: "status(200); check('status CONFIRMED with patient info', J && J.status === 'CONFIRMED' && J.patientName === 'AutoTest Patient A', 'body: ' + snip());" });
add(f06, 'STATE-03', 'Approve again -> 409', { m: 'POST', u: '/api/doctor/appointments/{{apptAId}}/approve', as: 'D1', t: "err(409, 'Only PENDING appointments can be approved (this one is CONFIRMED)');" });
add(f06, 'STATE-04', 'Reject a CONFIRMED appointment -> 409', { m: 'POST', u: '/api/doctor/appointments/{{apptAId}}/reject', as: 'D1', t: "err(409, 'Only PENDING appointments can be rejected (this one is CONFIRMED)');" });
add(f06, 'STATE-05', 'Complete before the start time -> 409', { m: 'POST', u: '/api/doctor/appointments/{{apptAId}}/complete', as: 'D1', t: "err(409, 'only after its start time');" });
add(f06, 'STATE-06', 'Patient A cancels the CONFIRMED appointment -> 200 CANCELLED', { m: 'POST', u: '/api/appointments/{{apptAId}}/cancel', as: 'A', t: "status(200); check('status CANCELLED', J && J.status === 'CANCELLED', 'body: ' + snip());" });
add(f06, 'STATE-07', 'Cancelled slot M1 is bookable again (listed AVAILABLE)', { u: '/api/doctors/{{doctor1Id}}/slots?date={{testDate}}', t: "status(200); check('M1 listed again', findId(J, env('slotM1Id')) !== null);" });
add(f06, 'STATE-08', 'Cancel again -> 409', { m: 'POST', u: '/api/appointments/{{apptAId}}/cancel', as: 'A', t: "err(409, 'Only PENDING or CONFIRMED appointments can be cancelled (this one is CANCELLED)');" });
add(f06, 'STATE-09', 'Approve a CANCELLED appointment -> 409', { m: 'POST', u: '/api/doctor/appointments/{{apptAId}}/approve', as: 'D1', t: "err(409, '(this one is CANCELLED)');" });
add(f06, 'STATE-10', 'Reject a CANCELLED appointment -> 409', { m: 'POST', u: '/api/doctor/appointments/{{apptAId}}/reject', as: 'D1', t: "err(409, '(this one is CANCELLED)');" });
add(f06, 'STATE-11', 'Complete a CANCELLED appointment -> 409', { m: 'POST', u: '/api/doctor/appointments/{{apptAId}}/complete', as: 'D1', t: "err(409, '(this one is CANCELLED)');" });
add(f06, 'STATE-12', 'Patient B books M2 -> 201', { m: 'POST', u: '/api/appointments', as: 'B', body: '{"slotId":{{slotM2Id}},"reason":"Checkup"}', t: "status(201); if (J && J.id) { put('apptBId', J.id); }" });
add(f06, 'STATE-13', 'Doctor 1 rejects B -> 200 REJECTED', { m: 'POST', u: '/api/doctor/appointments/{{apptBId}}/reject', as: 'D1', t: "status(200); check('status REJECTED', J && J.status === 'REJECTED', 'body: ' + snip());" });
add(f06, 'STATE-14', 'Reject again -> 409', { m: 'POST', u: '/api/doctor/appointments/{{apptBId}}/reject', as: 'D1', t: "err(409, 'Only PENDING appointments can be rejected (this one is REJECTED)');" });
add(f06, 'STATE-15', 'Approve a REJECTED appointment -> 409', { m: 'POST', u: '/api/doctor/appointments/{{apptBId}}/approve', as: 'D1', t: "err(409, '(this one is REJECTED)');" });
add(f06, 'STATE-16', 'Patient B cancels a REJECTED appointment -> 409', { m: 'POST', u: '/api/appointments/{{apptBId}}/cancel', as: 'B', t: "err(409, '(this one is REJECTED)');" });
add(f06, 'STATE-17', 'Complete a REJECTED appointment -> 409', { m: 'POST', u: '/api/doctor/appointments/{{apptBId}}/complete', as: 'D1', t: "err(409, '(this one is REJECTED)');" });
add(f06, 'STATE-18', 'Rejected slot M2 is listed again', { u: '/api/doctors/{{doctor1Id}}/slots?date={{testDate}}', t: "status(200); check('M2 listed again', findId(J, env('slotM2Id')) !== null);" });
add(f06, 'STATE-19', 'Patient B can book the freed slot M1 -> 201', { m: 'POST', u: '/api/appointments', as: 'B', body: '{"slotId":{{slotM1Id}},"reason":"Rebook"}', t: "status(201); check('PENDING', J && J.status === 'PENDING'); if (J && J.id) { put('apptB2Id', J.id); }" });
add(f06, 'STATE-20', 'Patient A cancels a PENDING appointment (boundary one on M3) -> 200', { m: 'POST', u: '/api/appointments/{{apptBoundaryId}}/cancel', as: 'A', t: "status(200); check('status CANCELLED', J && J.status === 'CANCELLED', 'body: ' + snip());" });

// ================================================================== 07 FILTERS
const f07 = folder('07 Filters, sorting and list isolation', 'Uses the appointments created above. Assertions only look at THIS run\'s ids, so existing data does not disturb them.');
add(f07, 'LIST-01', 'Patient list with status=BOGUS -> 400', { u: '/api/appointments/mine?status=BOGUS', as: 'A', t: "err(400, \"Invalid value for parameter 'status'\");" });
add(f07, 'LIST-02', 'Patient A status=CANCELLED -> only CANCELLED, includes both cancelled ones', { u: '/api/appointments/mine?status=CANCELLED', as: 'A',
  t: "status(200); var ok = isArr(J); for (var i = 0; ok && i < J.length; i++) { if (J[i].status !== 'CANCELLED') { ok = false; } } check('every item is CANCELLED', ok); check('contains apptA and boundary appointment', findId(J, env('apptAId')) !== null && findId(J, env('apptBoundaryId')) !== null);" });
add(f07, 'LIST-03', 'Patient A status=PENDING -> includes the XSS-text appointment, excludes cancelled A', { u: '/api/appointments/mine?status=PENDING', as: 'A',
  t: "status(200); var ok = isArr(J); for (var i = 0; ok && i < J.length; i++) { if (J[i].status !== 'PENDING') { ok = false; } } check('every item is PENDING', ok); check('contains apptXss, not apptA', findId(J, env('apptXssId')) !== null && findId(J, env('apptAId')) === null);" });
add(f07, 'LIST-04', 'Patient A list is sorted newest slot first', { u: '/api/appointments/mine', as: 'A',
  t: "status(200); var ok = isArr(J) && J.length >= 3; for (var i = 1; ok && i < J.length; i++) { var prev = J[i - 1].slotDate + ' ' + J[i - 1].startTime; var cur = J[i].slotDate + ' ' + J[i].startTime; if (prev < cur) { ok = false; } } check('sorted by slotDate+startTime descending', ok, 'order: ' + JSON.stringify((J || []).map(function (a) { return a.slotDate + ' ' + a.startTime; })));" });
add(f07, 'LIST-05', 'Patient B status=REJECTED -> includes B\'s rejected, nothing of A', { u: '/api/appointments/mine?status=REJECTED', as: 'B',
  t: "status(200); check('contains apptB', findId(J, env('apptBId')) !== null); check('no appointment of A', findId(J, env('apptAId')) === null && findId(J, env('apptXssId')) === null);" });
add(f07, 'LIST-06', 'Patient B full list has apptB (REJECTED) and apptB2 (PENDING)', { u: '/api/appointments/mine', as: 'B',
  t: "status(200); var b = findId(J, env('apptBId')); var b2 = findId(J, env('apptB2Id')); check('apptB REJECTED', b && b.status === 'REJECTED'); check('apptB2 PENDING', b2 && b2.status === 'PENDING');" });
add(f07, 'LIST-07', 'Doctor 1 status=CONFIRMED -> all CONFIRMED, apptA no longer there', { u: '/api/doctor/appointments?status=CONFIRMED', as: 'D1',
  t: "status(200); var ok = isArr(J); for (var i = 0; ok && i < J.length; i++) { if (J[i].status !== 'CONFIRMED') { ok = false; } } check('every item is CONFIRMED', ok); check('apptA (cancelled) not listed', findId(J, env('apptAId')) === null);" });
add(f07, 'LIST-08', 'Doctor 1 status=PENDING -> includes apptB2 and apptXss, not apptA', { u: '/api/doctor/appointments?status=PENDING', as: 'D1',
  t: "status(200); var ok = isArr(J); for (var i = 0; ok && i < J.length; i++) { if (J[i].status !== 'PENDING') { ok = false; } } check('every item is PENDING', ok); check('contains apptB2 and apptXss, not apptA', findId(J, env('apptB2Id')) !== null && findId(J, env('apptXssId')) !== null && findId(J, env('apptAId')) === null);" });
add(f07, 'LIST-09', 'Doctor 1 list is sorted earliest slot first', { u: '/api/doctor/appointments', as: 'D1',
  t: "status(200); var ok = isArr(J); for (var i = 1; ok && i < J.length; i++) { var prev = J[i - 1].slotDate + ' ' + J[i - 1].startTime; var cur = J[i].slotDate + ' ' + J[i].startTime; if (prev > cur) { ok = false; } } check('sorted by slotDate+startTime ascending', ok);" });
add(f07, 'LIST-10', 'Doctor list with status=BOGUS -> 400', { u: '/api/doctor/appointments?status=BOGUS', as: 'D1', t: "err(400, \"Invalid value for parameter 'status'\");" });

// ================================================================== 08 HISTORY GUARD
const f08 = folder('08 Slot history guard', 'Slots that are booked or ever had an appointment cannot be edited/deleted; history must survive.');
add(f08, 'HIST-01', 'Delete currently BOOKED slot M1 -> 409', { m: 'DELETE', u: '/api/doctor/slots/{{slotM1Id}}', as: 'D1', t: "err(409, 'booked slot cannot be deleted');" });
add(f08, 'HIST-02', 'Update currently BOOKED slot M1 -> 409', { m: 'PUT', u: '/api/doctor/slots/{{slotM1Id}}', as: 'D1', body: slotBody('{{testDate}}', '{{t0}}', '{{t1}}'), t: "err(409, 'booked slot cannot be changed');" });
add(f08, 'HIST-03', 'Delete AVAILABLE slot M2 that has a REJECTED appointment -> 409', { m: 'DELETE', u: '/api/doctor/slots/{{slotM2Id}}', as: 'D1', t: "err(409, 'appointment history and cannot be deleted');" });
add(f08, 'HIST-04', 'Update AVAILABLE slot M2 that has history -> 409', { m: 'PUT', u: '/api/doctor/slots/{{slotM2Id}}', as: 'D1', body: slotBody('{{testDate}}', '{{t1}}', '{{t2}}'), t: "err(409, 'appointment history and cannot be changed');" });
add(f08, 'HIST-05', 'Delete AVAILABLE slot M3 that has a CANCELLED appointment -> 409', { m: 'DELETE', u: '/api/doctor/slots/{{slotM3Id}}', as: 'D1', t: "err(409, 'appointment history and cannot be deleted');" });
add(f08, 'HIST-06', 'History survived: cancelled/rejected appointments are still listed', { u: '/api/appointments/mine?status=CANCELLED', as: 'A',
  t: "status(200); check('apptA and boundary appointment still exist', findId(J, env('apptAId')) !== null && findId(J, env('apptBoundaryId')) !== null);" });
add(f08, 'HIST-07', 'History survived for Patient B (REJECTED)', { u: '/api/appointments/mine?status=REJECTED', as: 'B', t: "status(200); check('apptB still exists', findId(J, env('apptBId')) !== null);" });
add(f08, 'HIST-08', 'Slot without history (F1) can be deleted -> 204', { m: 'DELETE', u: '/api/doctor/slots/{{slotFreeId}}', as: 'D1', t: "status(204); check('empty body', TXT === '');" });
add(f08, 'HIST-09', 'Deleting F1 again -> 404', { m: 'DELETE', u: '/api/doctor/slots/{{slotFreeId}}', as: 'D1', t: "err(404, 'Slot not found');" });

// ================================================================== 09 SECURITY EXTRAS
const f09 = folder('09 Security extras', 'CORS, headers, injection strings, wrong methods, unknown URLs, oversized input.');
add(f09, 'SEC-01', 'CORS preflight from the allowed origin -> 200 with matching Allow-Origin', { m: 'OPTIONS', u: '/api/appointments',
  h: [['Origin', '{{allowedOrigin}}'], ['Access-Control-Request-Method', 'POST'], ['Access-Control-Request-Headers', 'authorization,content-type']],
  t: "status(200); check('Access-Control-Allow-Origin equals the allowed origin', hdr('Access-Control-Allow-Origin') === env('allowedOrigin'), 'actual: ' + hdr('Access-Control-Allow-Origin')); check('Allow-Methods includes POST', String(hdr('Access-Control-Allow-Methods')).indexOf('POST') !== -1, 'actual: ' + hdr('Access-Control-Allow-Methods'));" });
add(f09, 'SEC-02', 'CORS preflight from a foreign origin -> 403 and no Allow-Origin', { m: 'OPTIONS', u: '/api/appointments',
  h: [['Origin', 'https://evil.example'], ['Access-Control-Request-Method', 'POST']],
  t: "status(403); check('no Access-Control-Allow-Origin header', !hdr('Access-Control-Allow-Origin'), 'actual: ' + hdr('Access-Control-Allow-Origin'));" });
add(f09, 'SEC-03', 'Security headers on a public response', { u: '/api/specializations',
  t: "status(200); check('X-Content-Type-Options: nosniff', String(hdr('X-Content-Type-Options')).toLowerCase() === 'nosniff', 'actual: ' + hdr('X-Content-Type-Options')); check('no X-Powered-By header', !hdr('X-Powered-By')); check('JSON content type', String(hdr('Content-Type')).indexOf('application/json') !== -1);" });
add(f09, 'SEC-04', 'SQL-injection text in login email -> 401, not 500', { m: 'POST', u: '/api/auth/login', body: '{"email":"x\' OR \'1\'=\'1","password":"Whatever1"}', t: "err(401, 'Invalid email or password');" });
add(f09, 'SEC-05', 'Valid token in the query string is ignored -> 401', { u: '/api/auth/me?access_token={{patientAToken}}', t: "err(401, 'Authentication required');" });
add(f09, 'SEC-06', 'Basic auth scheme instead of Bearer -> 401', { u: '/api/auth/me', authValue: 'Basic dXNlcjpwYXNz', t: "err(401, 'Authentication required');" });
add(f09, 'SEC-07', 'Unknown URL with a valid token -> 404 JSON', { u: '/api/does-not-exist', as: 'A', t: "err(404, 'Resource not found');" });
add(f09, 'SEC-08', 'Unknown URL without token -> 401 (does not reveal which URLs exist)', { u: '/api/does-not-exist', t: "err(401, 'Authentication required');" });
add(f09, 'SEC-09', 'Register with 200-character email -> 400', { m: 'POST', u: '/api/auth/register', pre: "put('longEmail', '" + longStr(200) + "@example.com');", body: '{"fullName":"X","email":"{{longEmail}}","password":"Test@1234"}',
  t: "err(400, 'Validation failed'); fieldErr('email');" });
add(f09, 'SEC-10', 'Register with 101-character name -> 400', { m: 'POST', u: '/api/auth/register', pre: "put('longName', '" + longStr(101) + "');", body: '{"fullName":"{{longName}}","email":"toolong_{{runId}}@example.com","password":"Test@1234"}',
  t: "err(400, 'Validation failed'); fieldErr('fullName', '100');" });

// ================================================================== 10 TIME RULES
const f10 = folder('10 Time rules (needs about 4 minutes of waiting)',
  'Slots that start a few minutes from now. Part A prepares and checks everything that must happen BEFORE the start time; the WAIT request pauses until after it; Part B checks the rules that apply AFTER the start time. Uncheck this folder in the Runner to skip it. Do not run between 23:45 and 00:00 (server time).');
add(f10, 'TIME-01', 'Create slots starting in a few minutes: Doctor 1, 2 and 3 (one request creates Doctor 1; next two create the others)', {
  m: 'POST', u: '/api/doctor/slots', as: 'D1',
  pre: DATE_HELPERS +
    "var lead = parseInt(pm.environment.get('timeLeadMinutes') || '3', 10);\n" +
    "var startMs = (Math.floor(Date.now() / 60000) + lead + 1) * 60000;\n" +
    "if (hm(startMs + 10 * 60000) < hm(startMs)) { throw new Error('Too close to midnight (server time) - run this folder later.'); }\n" +
    "put('timeStartMs', startMs); put('timeSlotDate', ymd(startMs)); put('timeStart', hm(startMs)); put('timeEnd', hm(startMs + 10 * 60000));",
  body: slotBody('{{timeSlotDate}}', '{{timeStart}}', '{{timeEnd}}'),
  t: "status(201); if (J && J.id) { put('slotTimeCId', J.id); } else { console.log('Could not create the time-rule slot. If 409: you already have a slot at that time today.'); }" });
add(f10, 'TIME-02', 'Create the same time slot for Doctor 2', { m: 'POST', u: '/api/doctor/slots', as: 'D2', body: slotBody('{{timeSlotDate}}', '{{timeStart}}', '{{timeEnd}}'), t: "status(201); if (J && J.id) { put('slotTimePId', J.id); }" });
add(f10, 'TIME-03', 'Create the same time slot for Doctor 3', { m: 'POST', u: '/api/doctor/slots', as: 'D3', body: slotBody('{{timeSlotDate}}', '{{timeStart}}', '{{timeEnd}}'), t: "status(201); if (J && J.id) { put('slotTimeOId', J.id); }" });
add(f10, 'TIME-04', 'Patient A books the Doctor 1 slot -> 201', { m: 'POST', u: '/api/appointments', as: 'A', body: '{"slotId":{{slotTimeCId}}}', t: "status(201); if (J && J.id) { put('apptTimeCId', J.id); }" });
add(f10, 'TIME-05', 'Doctor 1 approves it (still before the start time) -> 200', { m: 'POST', u: '/api/doctor/appointments/{{apptTimeCId}}/approve', as: 'D1', t: "status(200); check('CONFIRMED', J && J.status === 'CONFIRMED', 'body: ' + snip()); console.log('If this is 409 \"already passed\", the preparation took longer than timeLeadMinutes - increase it in the environment.');" });
add(f10, 'TIME-06', 'Patient B books the Doctor 2 slot (stays PENDING) -> 201', { m: 'POST', u: '/api/appointments', as: 'B', body: '{"slotId":{{slotTimePId}}}', t: "status(201); if (J && J.id) { put('apptTimePId', J.id); }" });
add(f10, 'TIME-07', 'Complete before the start time -> 409', { m: 'POST', u: '/api/doctor/appointments/{{apptTimeCId}}/complete', as: 'D1', t: "err(409, 'only after its start time');" });
add(f10, 'TIME-08', 'WAIT until the slots have started (pre-request timer), then check the token still works', {
  u: '/api/auth/me', as: 'A',
  pre: "var startMs = parseInt(pm.environment.get('timeStartMs'), 10); var waitMs = Math.max(0, startMs + 20000 - Date.now());\n" +
    "if (waitMs > 600000) { throw new Error('Wait would exceed 10 minutes - timeStartMs looks wrong.'); }\n" +
    "console.log('Waiting ' + Math.round(waitMs / 1000) + ' seconds until the slots have started...'); setTimeout(function () {}, waitMs);",
  t: "status(200); var started = Date.now() >= parseInt(env('timeStartMs'), 10); check('the slot start time has now passed', started, 'The pre-request wait did not run (Date.now() is still before the start time). Run the next folder part later, or use newman, or increase the Postman Runner delay.');" });
add(f10, 'TIME-09', 'Doctor 1 completes the CONFIRMED appointment -> 200 COMPLETED', { m: 'POST', u: '/api/doctor/appointments/{{apptTimeCId}}/complete', as: 'D1', t: "status(200); check('COMPLETED', J && J.status === 'COMPLETED', 'body: ' + snip());" });
add(f10, 'TIME-10', 'Slot stays BOOKED after completion', { u: '/api/doctor/slots?from={{timeSlotDate}}&to={{timeSlotDate}}', as: 'D1', t: "status(200); var s = findId(J, env('slotTimeCId')); check('slot BOOKED', s !== null && s.status === 'BOOKED', 'slot: ' + JSON.stringify(s));" });
add(f10, 'TIME-11', 'Complete again -> 409', { m: 'POST', u: '/api/doctor/appointments/{{apptTimeCId}}/complete', as: 'D1', t: "err(409, 'Only CONFIRMED appointments can be completed (this one is COMPLETED)');" });
add(f10, 'TIME-12', 'Patient cancels a COMPLETED appointment -> 409', { m: 'POST', u: '/api/appointments/{{apptTimeCId}}/cancel', as: 'A', t: "err(409, '(this one is COMPLETED)');" });
add(f10, 'TIME-13', 'Approve / reject a COMPLETED appointment -> 409 (approve)', { m: 'POST', u: '/api/doctor/appointments/{{apptTimeCId}}/approve', as: 'D1', t: "err(409, '(this one is COMPLETED)');" });
add(f10, 'TIME-14', 'Reject a COMPLETED appointment -> 409', { m: 'POST', u: '/api/doctor/appointments/{{apptTimeCId}}/reject', as: 'D1', t: "err(409, '(this one is COMPLETED)');" });
add(f10, 'TIME-15', 'Doctor 2 approves a PENDING request whose slot already started -> 409', { m: 'POST', u: '/api/doctor/appointments/{{apptTimePId}}/approve', as: 'D2', t: "err(409, 'already passed');" });
add(f10, 'TIME-16', 'Patient B cancels after the start time -> 409', { m: 'POST', u: '/api/appointments/{{apptTimePId}}/cancel', as: 'B', t: "err(409, 'after its start time');" });
add(f10, 'TIME-17', 'Doctor 2 may still reject the late PENDING request -> 200 REJECTED', { m: 'POST', u: '/api/doctor/appointments/{{apptTimePId}}/reject', as: 'D2', t: "status(200); check('REJECTED', J && J.status === 'REJECTED', 'body: ' + snip());" });
add(f10, 'TIME-18', 'Booking an AVAILABLE slot that already started -> 409', { m: 'POST', u: '/api/appointments', as: 'A', body: '{"slotId":{{slotTimeOId}}}', t: "err(409, 'no longer available');" });
add(f10, 'TIME-19', 'Started slot is hidden from the public slot list', { u: '/api/doctors/{{doctor3Id}}/slots?date={{timeSlotDate}}', t: "status(200); check('started slot not listed', findId(J, env('slotTimeOId')) === null);" });
add(f10, 'TIME-20', 'Freed-but-started slot is also hidden from the public list', { u: '/api/doctors/{{doctor2Id}}/slots?date={{timeSlotDate}}', t: "status(200); check('started slot not listed', findId(J, env('slotTimePId')) === null);" });

// ================================================================== 11 SUSPECTED DEFECTS
const f11 = folder('11 Suspected defects (these may FAIL)',
  'Cases where the code reading says the backend probably misbehaves. A FAIL here is a finding, not a broken collection. The backend was NOT changed.');
add(f11, 'DEF-01', 'Wrong Content-Type (text/plain) on a JSON endpoint should be 415, code suggests 500', { m: 'POST', u: '/api/appointments', as: 'A', ct: 'text/plain', body: 'slotId=1',
  t: "status(415); check('response is not a 500', CODE !== 500, 'GlobalExceptionHandler has no handler for HttpMediaTypeNotSupportedException, so the catch-all returns 500. See docs/AUTOMATED_TESTS.md for the 4-line fix.');" });

// ================================================================== 12 CLEANUP + RACE SLOT
const f12 = folder('12 Cleanup and concurrency-test slot', 'Deletes the leftover slots that have no history and creates one fresh slot for scripts/concurrency-test.mjs.');
add(f12, 'CLN-01', 'Delete back-to-back test slot (no history) -> 204', { m: 'DELETE', u: '/api/doctor/slots/{{slotAdjId}}', as: 'D1', t: "status(204);" });
add(f12, 'CLN-02', "Delete Doctor 2's test slot (no history) -> 204", { m: 'DELETE', u: '/api/doctor/slots/{{slotD2Id}}', as: 'D2', t: "status(204);" });
add(f12, 'CLN-03', 'Create a fresh slot for the concurrency script', { m: 'POST', u: '/api/doctor/slots', as: 'D1', body: slotBody('{{testDate2}}', '{{t0}}', '{{t1}}'),
  t: "status(201); if (J && J.id) { put('raceSlotId', J.id); var cmd = 'node scripts/concurrency-test.mjs ' + J.id + ' 10'; put('raceCommand', cmd); console.log('Now run in a terminal from the project root:  ' + cmd); }" });

// ------------------------------------------------------------------ write files
const collection = {
  info: {
    name: 'Healthcare Booking - Negative, Validation and Security Tests',
    description: 'Automated negative/validation/authorization/security tests. Import together with the "Healthcare Local" environment, select that environment, and run the whole collection in order (or run it with newman). It creates its own users and slots. See docs/AUTOMATED_TESTS.md.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  item: folders.map((f) => ({ name: f.name, description: f.description, item: f.item })),
};
writeFileSync(join(here, 'Healthcare-Booking-Negative-Tests.postman_collection.json'), JSON.stringify(collection, null, 2) + '\n');

if (process.argv.includes('--skip-time')) {
  const slim = { ...collection, info: { ...collection.info, name: collection.info.name + ' (without time rules)' }, item: collection.item.filter((f) => !f.name.startsWith('10 ')) };
  writeFileSync(join(here, 'Healthcare-Booking-Negative-Tests-NoTime.postman_collection.json'), JSON.stringify(slim, null, 2) + '\n');
  console.log('Also wrote the NoTime collection (folder 10 removed).');
}

const cfg = {
  baseUrl: 'http://localhost:8080',
  doctorPassword: 'Doctor@123',
  doctor1Email: 'priya.sharma@demo.healthcare.example', doctor1Name: 'Dr. Priya Sharma',
  doctor2Email: 'rahul.mehta@demo.healthcare.example', doctor2Name: 'Dr. Rahul Mehta',
  doctor3Email: 'ananya.iyer@demo.healthcare.example', doctor3Name: 'Dr. Ananya Iyer',
  inactiveDoctorEmail: 'inactive.example@demo.healthcare.example',
  allowedOrigin: 'http://localhost:5173',
  serverUtcOffsetMinutes: '330',
  timeLeadMinutes: '3',
};
const runtime = ['runId', 'patientAEmail', 'patientAToken', 'patientAUserId', 'patientBEmail', 'patientBToken', 'patientBUserId',
  'doctor1Token', 'doctor2Token', 'doctor3Token', 'inactiveDoctorToken', 'doctor1Id', 'doctor2Id', 'doctor3Id',
  'testDate', 'testDate2', 'pastDate', 'farDate', 't0', 't1', 't2', 't3', 't4', 't5', 't6',
  'slotM1Id', 'slotM2Id', 'slotM3Id', 'slotM4Id', 'slotFreeId', 'slotAdjId', 'slotD2Id',
  'apptAId', 'apptBId', 'apptB2Id', 'apptBoundaryId', 'apptXssId',
  'timeStartMs', 'timeSlotDate', 'slotTimeCId', 'slotTimePId', 'slotTimeOId', 'apptTimeCId', 'apptTimePId',
  'raceSlotId', 'raceCommand'];
const environment = {
  id: 'f2a1c1e0-0000-4000-8000-healthcarelocal',
  name: 'Healthcare Local',
  values: [
    ...Object.entries(cfg).map(([key, value]) => ({ key, value, type: 'default', enabled: true })),
    ...runtime.map((key) => ({ key, value: '', type: 'default', enabled: true })),
  ],
  _postman_variable_scope: 'environment',
};
writeFileSync(join(here, 'Healthcare-Local.postman_environment.json'), JSON.stringify(environment, null, 2) + '\n');

const count = folders.reduce((n, f) => n + f.item.length, 0);
console.log('Wrote collection with ' + folders.length + ' folders, ' + count + ' requests, and the environment file.');
