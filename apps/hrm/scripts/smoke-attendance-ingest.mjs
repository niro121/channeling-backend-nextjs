/**
 * Smoke-test Staff Attendance punch ingest (no hardware required).
 *
 * Prerequisites:
 *   1. HRM running on ATTENDANCE_BASE_URL (default http://localhost:3001)
 *   2. ATTENDANCE_DEVICE_API_KEY set (env or apps/hrm/.env)
 *   3. Optional: ATTENDANCE_SMOKE_RFID = a real Staff.fingerPrintRfid for a matched punch
 *
 * Usage (from apps/hrm):
 *   npm run smoke:attendance
 *   node scripts/smoke-attendance-ingest.mjs
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(__dirname, '..');

function loadDotEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const text = readFileSync(filePath, 'utf8');
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadDotEnvFile(resolve(appRoot, '.env'));
loadDotEnvFile(resolve(appRoot, '.env.local'));

const baseUrl = (process.env.ATTENDANCE_BASE_URL || 'http://localhost:3001').replace(
  /\/$/,
  ''
);
const apiKey = process.env.ATTENDANCE_DEVICE_API_KEY?.trim();
const rfid = (process.env.ATTENDANCE_SMOKE_RFID || 'SMOKE-RFID-001').trim();

if (!apiKey) {
  console.error(
    'ATTENDANCE_DEVICE_API_KEY is missing. Set it in apps/hrm/.env or the shell.'
  );
  process.exit(1);
}

async function postPunch(body) {
  const res = await fetch(`${baseUrl}/api/attendance/punches`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Attendance-Api-Key': apiKey
    },
    body: JSON.stringify(body)
  });
  let json = {};
  try {
    json = await res.json();
  } catch {
    json = { error: 'Non-JSON response' };
  }
  return { status: res.status, json };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const punchedAt = new Date().toISOString();
const externalPunchId = `smoke-${Date.now()}`;

async function main() {
  console.log('Staff Attendance ingest smoke');
  console.log('  Base URL :', baseUrl);
  console.log('  RFID     :', rfid);
  console.log('  Punch ID :', externalPunchId);

  const first = await postPunch({
    deviceCode: 'DEV-LOCAL',
    externalPunchId,
    rfid,
    punchedAt,
    direction: 'unknown'
  });
  console.log('\n[1] first punch →', first.status, JSON.stringify(first.json));
  assert(first.status === 200 && first.json.success === true, 'First punch failed');
  assert(first.json.duplicate !== true, 'First punch must not be a duplicate');

  if (first.json.data?.matchStatus === 'matched') {
    console.log('  matchStatus=matched, dayId=', first.json.dayId ?? null);
  } else {
    console.log(
      '  matchStatus=',
      first.json.data?.matchStatus,
      '(set ATTENDANCE_SMOKE_RFID to a real staff RFID for matched + AttendanceDay)'
    );
  }

  const dup = await postPunch({
    deviceCode: 'DEV-LOCAL',
    externalPunchId,
    rfid,
    punchedAt
  });
  console.log('\n[2] duplicate →', dup.status, JSON.stringify(dup.json));
  assert(dup.status === 200 && dup.json.duplicate === true, 'Expected duplicate: true');

  const unmatchedId = `${externalPunchId}-unmatched`;
  const unmatched = await postPunch({
    deviceCode: 'DEV-LOCAL',
    externalPunchId: unmatchedId,
    rfid: `UNKNOWN-${Date.now()}`,
    punchedAt
  });
  console.log('\n[3] unmatched →', unmatched.status, JSON.stringify(unmatched.json));
  assert(
    unmatched.status === 200 && unmatched.json.success === true,
    'Unmatched punch failed'
  );
  assert(
    unmatched.json.data?.matchStatus === 'unmatched',
    'Expected matchStatus unmatched'
  );

  console.log('\nSmoke OK');
}

main().catch((err) => {
  console.error('\nSmoke FAILED:', err.message || err);
  process.exit(1);
});
