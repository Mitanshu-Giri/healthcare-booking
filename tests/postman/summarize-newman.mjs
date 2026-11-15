// Turns a newman JSON report into a PASS/FAIL markdown table with the ACTUAL results.
// Usage: node tests/postman/summarize-newman.mjs tests/postman/newman-report.json > tests/postman/report.md
import { readFileSync } from 'node:fs';
const file = process.argv[2];
if (!file) { console.error('Usage: node tests/postman/summarize-newman.mjs <newman-report.json>'); process.exit(2); }
const run = JSON.parse(readFileSync(file, 'utf8')).run;
const rows = []; let pass = 0, fail = 0;
for (const ex of run.executions) {
  const name = ex.item.name; const code = ex.response ? ex.response.code : 'no response';
  const bad = (ex.assertions || []).filter((a) => a.error);
  const reqErr = ex.requestError ? [ex.requestError.message] : [];
  const ok = bad.length === 0 && reqErr.length === 0;
  ok ? pass++ : fail++;
  const actual = ok ? 'HTTP ' + code : [...reqErr, ...bad.map((a) => a.assertion + ': ' + String(a.error.message).replace(/\|/g, '/'))].join(' ; ');
  rows.push(`| ${name.replace(/\|/g, '/')} | ${ok ? 'PASS' : 'FAIL'} | ${actual.replace(/\n/g, ' ').slice(0, 400)} |`);
}
console.log(`# Test run summary\n\nRequests: ${rows.length} | PASS: ${pass} | FAIL: ${fail}\n`);
console.log('| Test | Result | Actual result |\n|---|---|---|');
console.log(rows.join('\n'));
