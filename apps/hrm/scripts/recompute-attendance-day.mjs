/**
 * Recompute AttendanceDay for a Colombo civil date (Absent job / overnight posting).
 *
 * Usage (from apps/hrm, HRM server running):
 *   npm run recompute:attendance
 *   npm run recompute:attendance -- 2025-08-15
 *
 * Env: ATTENDANCE_DEVICE_API_KEY, optional ATTENDANCE_BASE_URL
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
const dateArg = process.argv[2]?.trim().slice(0, 10);

if (!apiKey) {
  console.error('ATTENDANCE_DEVICE_API_KEY is missing.');
  process.exit(1);
}

const body = dateArg ? { date: dateArg } : {};

const res = await fetch(`${baseUrl}/api/attendance/recompute`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Attendance-Api-Key': apiKey
  },
  body: JSON.stringify(body)
});

const json = await res.json().catch(() => ({}));
console.log(res.status, JSON.stringify(json, null, 2));
if (!res.ok || json.success !== true) {
  process.exit(1);
}
console.log('Recompute OK');
