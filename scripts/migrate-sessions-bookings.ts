/**
 * Migrate operational Session and Booking records from the legacy Sails migrate API.
 *
 * Run order (or use npm run migrate:all for all steps):
 *   1. npm run migrate:import
 *   2. npx tsx scripts/migrate-doctor-sessions.ts  (must populate DoctorSession.migrateSourceId)
 *   3. npm run migrate:sessions-bookings
 *      (no dates → today through +5 years, Sri Lanka calendar day; past sessions/bookings skipped)
 *
 * By default deletes ALL existing Session and Booking rows (and appointment sequences) before import.
 * To merge/upsert without deleting first: --no-wipe (or --keep). Skipped when --dry-run.
 *
 * Usage:
 *   npm run migrate:sessions-bookings
 *   npm run migrate:sessions-bookings -- --no-wipe --from-date=2024-01-01 --to-date=2024-12-31
 *   npm run migrate:sessions-bookings -- --from-date=2024-01-01 --to-date=2024-01-31 --doctor=507f1f77bcf86cd799439011
 *   npm run migrate:sessions-bookings -- --only=sessions --from-date=... --to-date=...
 *   npm run migrate:sessions-bookings -- --only=bookings --from-date=... --to-date=...
 *   npm run migrate:sessions-bookings -- --dry-run --from-date=... --to-date=...
 *
 * Sessions upserts run in parallel (default 50). Bookings use a lower default (20) — 50
 * parallel sessions each doing many DB round-trips often saturates MongoDB and feels "stuck".
 * Override: --concurrency=50 --booking-concurrency=10
 *
 * Before import: prints legacy counts (eligible vs in-range). After import: transferred
 * totals and highlights any difference. Use --skip-plan to skip the pre-count phase.
 *
 * Missing doctor templates (legacy start_time=0): npm run migrate:all runs
 * migrate-missing-doctor-templates before this step (--no-fix-templates). Standalone:
 * npm run migrate:missing-doctor-templates. Or keep inline [fix] with --inline-fix-only on migrate:all.
 *
 * Bookings plan + import use one bulk all-bookings request filtered by session date
 * (not booking createdAt). Use --per-session-bookings for legacy per-session API calls.
 *
 * Env: MIGRATE_BASE_URL, MIGRATE_USER_KEY, MONGODB_URI
 *
 * Receipt rows are NOT created; legacy receipt fields are stored inline on Booking only.
 *
 * Excel summary appended to temp/migrate-report.xlsx after each run (MIGRATE_REPORT=0 to disable).
 *
 * After migration, run: npm run sequence:sync  (reconcile all Sequence scopes from DB; see sequence-sync-from-db.ts)
 */

import 'dotenv/config';
import moment from 'moment';
import { Prisma, PrismaClient } from '@prisma/client';
import {
  IMPORT_USER_EMAIL,
  MIGRATE_USER_KEY,
  migrateFetch,
  retryOnConflict,
  safeNumber,
  toLegacyString,
  unixToDate,
  unixToSeconds,
} from './lib/migrate-api';
import {
  importMissingDoctorTemplatesByIds,
  refreshDoctorSessionsInMaps,
} from './lib/import-missing-doctor-template';
import {
  createMigrateReporter,
  finishMigrateReporter,
} from './lib/migrate-report';

const prisma = new PrismaClient();

function appointmentSequenceScopeKey(sessionId: string): string {
  return `appointment:${sessionId}`;
}

type SourceFee = {
  id: string | number;
  name?: string;
  fee_type?: string;
  local_value?: number;
  foreign_value?: number;
};

type AppFee = {
  id: string;
  name: string;
  feeType: string;
  localFee: number;
  foreignFee: number;
};

type SourceSession = {
  session_id: string;
  institution: number;
  date: string;
  doctor_session_id: string;
  previous_doctor_session?: string;
  doctor: string;
  department: string;
  location: string;
  room?: string | null;
  start_time_unix?: number;
  end_time_unix?: number;
  start_time?: number | string;
  end_time?: number | string;
  duration_minutes?: number;
  starting_patient_number?: number;
  max_patient_number?: number;
  refundable?: number;
  fees?: SourceFee[];
  amount_local?: number;
  amount_foreign?: number;
  doctor_arrival_time?: unknown;
  doctor_depature_time?: unknown;
  doctor_leave_remark?: string;
  doctor_leave_creator?: string;
  doctor_leave_createdAt?: number;
  status?: number;
  remarks?: string;
  appointment_no?: number;
  isScan?: boolean;
  createdAt?: number;
  updatedAt?: number;
};

/** Subset of legacy doctor_sessions row (migrate API). */
type SourceDoctorSessionLookup = {
  doctor_session_id?: string | null;
  id?: string | null;
  name?: string;
  doctor?: string;
  department?: string;
  location?: string;
  day_type?: number;
  status?: number | string;
  apply_to_date?: string;
  start_time_unix?: number;
  end_time_unix?: number;
};

type SourceBooking = {
  booking_id: string;
  bookingid?: number;
  bookingid_string?: string;
  receipt_no?: number;
  receipt_no_string?: string;
  receipt_payment_method?: number;
  receipt_no_createdAt?: number;
  receipt_no_id?: string;
  title?: string;
  name?: string;
  phone?: string;
  sex?: string;
  area?: string;
  remarks?: string;
  canceled_at?: number;
  canceled_by?: string;
  appointment_no?: number;
  foriegner?: boolean;
  method?: number;
  amount?: number;
  discount?: number;
  hospital_fee_discount?: number;
  professionsal_fee_discount?: number;
  auto_discount_id?: string;
  discount_id?: string;
  discount_division?: Record<string, number>;
  status?: number;
  fees?: unknown;
  professional_fee?: number;
  hospital_fee?: number;
  refund?: number;
  refund_receipt_no_id?: string;
  refund_receipt_createAt?: number;
  refund_receipt_no_string?: string;
  refund_amount?: number;
  refund_amount_professional_fee?: number;
  refund_amount_hospital_fee?: number;
  refund_reason?: string;
  session_id?: string;
  session_date?: string;
  session_start_time?: number;
  session_end_time?: number;
  agency_ref?: string;
  doctor?: string;
  agency?: string;
  staff?: string;
  location?: string;
  user_location?: string;
  referred_doctor?: string;
  referred_agency?: string;
  referred_staff?: string;
  doctor_payment?: boolean;
  doctor_payment_date?: number;
  doctor_payment_receipt?: string;
  doctor_payment_receipt_string?: string;
  movedby?: string;
  movedDate?: number;
  movedfrom?: number | string;
  movedRemarks?: string;
  isScan?: boolean;
  createdAt?: number;
  updatedAt?: number;
  createdBy?: string;
  updatedBy?: string;
};

const ALL_STEPS = ['sessions', 'bookings'] as const;
type StepName = (typeof ALL_STEPS)[number];

/** Align with channeling app (UTC+5:30) for “today”. */
const SL_OFFSET_MINUTES = 330;
const DEFAULT_FUTURE_YEARS = 5;
const DEFAULT_CONCURRENCY = 50;
/** Bookings: fewer parallel sessions; each session still does many writes. */
const DEFAULT_BOOKING_CONCURRENCY = 20;
const BOOKING_CREATE_MANY_CHUNK = 100;

type SessionUpsertStats = {
  created: number;
  updated: number;
  skipped: number;
  skippedPast: number;
  failed: number;
  legacyId?: string;
  prismaId?: string;
};

type SessionSkipReason = 'eligible' | 'noId' | 'past' | 'missingRefs' | 'invalidTime';

type SessionPlanStats = {
  legacyInRange: number;
  eligible: number;
  skippedPast: number;
  skippedNoId: number;
  skippedMissingRefs: number;
  skippedInvalidTime: number;
  eligibleLegacyIds: string[];
};

type SessionImportStats = {
  created: number;
  updated: number;
  skipped: number;
  skippedPast: number;
  failed: number;
};

type BookingSkipReason = 'eligible' | 'past' | 'invalid';

type BookingPlanStats = {
  legacyTotal: number;
  eligible: number;
  skippedPast: number;
  skippedInvalid: number;
  sessionsCounted: number;
};

type BookingImportStats = {
  created: number;
  updated: number;
  skipped: number;
  sessionsProcessed: number;
};

const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  dim: '\x1b[2m',
};

function todayYmdSriLanka(): string {
  return moment().utcOffset(SL_OFFSET_MINUTES).format('YYYY-MM-DD');
}

function isValidYmd(value: string): boolean {
  return moment.utc(value, 'YYYY-MM-DD', true).isValid();
}

/** Compare session date strings (YYYY-MM-DD). */
function isOnOrAfterYmd(sessionYmd: string, minYmd: string): boolean {
  return sessionYmd >= minYmd;
}

/**
 * When both dates omitted: from today (SL) through +5 years.
 * When both provided: use as-is (historical ranges allowed).
 * When only one provided: error.
 */
function resolveMigrateDateRange(
  fromDate: string | null,
  toDate: string | null
): { fromDate: string; toDate: string; usedDefaultRange: boolean } {
  if (fromDate && toDate) {
    if (!isValidYmd(fromDate) || !isValidYmd(toDate)) {
      throw new Error('Invalid --from-date or --to-date. Use YYYY-MM-DD.');
    }
    if (fromDate > toDate) {
      throw new Error(`--from-date (${fromDate}) must be on or before --to-date (${toDate}).`);
    }
    return { fromDate, toDate, usedDefaultRange: false };
  }
  if (fromDate || toDate) {
    throw new Error(
      'Provide both --from-date and --to-date, or omit both to import today and future only.'
    );
  }
  const from = todayYmdSriLanka();
  const to = moment.utc(from, 'YYYY-MM-DD').add(DEFAULT_FUTURE_YEARS, 'years').format('YYYY-MM-DD');
  return { fromDate: from, toDate: to, usedDefaultRange: true };
}

function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
}

function parseArgs(): {
  fromDate: string | null;
  toDate: string | null;
  doctor: string | null;
  only: StepName[];
  wipeSessions: boolean;
  dryRun: boolean;
  legacySessionId: string | null;
  concurrency: number;
  bookingConcurrency: number;
  skipPlan: boolean;
  skipFixTemplates: boolean;
  perSessionBookings: boolean;
  perSessionAppointmentSync: boolean;
} {
  const argv = process.argv.slice(2);
  let fromDate: string | null = null;
  let toDate: string | null = null;
  let doctor: string | null = null;
  let only: StepName[] = [...ALL_STEPS];
  const noWipe = argv.includes('--no-wipe') || argv.includes('--keep');
  let wipeSessions = !noWipe;
  let dryRun = false;
  let legacySessionId: string | null = null;
  let concurrency = DEFAULT_CONCURRENCY;
  let bookingConcurrency = DEFAULT_BOOKING_CONCURRENCY;
  let skipPlan = false;
  let skipFixTemplates = false;
  let perSessionBookings = false;
  let perSessionAppointmentSync = false;

  for (const arg of argv) {
    if (arg.startsWith('--from-date=')) fromDate = arg.slice(12).trim() || null;
    else if (arg.startsWith('--to-date=')) toDate = arg.slice(10).trim() || null;
    else if (arg.startsWith('--doctor=')) doctor = arg.slice(9).trim() || null;
    else if (arg.startsWith('--only=')) {
      const steps = arg
        .slice(7)
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter((s): s is StepName => ALL_STEPS.includes(s as StepName));
      if (steps.length) only = steps;
    } else if (arg === '--wipe-sessions') wipeSessions = true;
    else if (arg === '--no-wipe' || arg === '--keep') wipeSessions = false;
    else if (arg === '--dry-run') dryRun = true;
    else if (arg === '--skip-plan') skipPlan = true;
    else if (arg === '--no-fix-templates') skipFixTemplates = true;
    else if (arg === '--per-session-bookings') perSessionBookings = true;
    else if (arg.startsWith('--session-id=')) legacySessionId = arg.slice(13).trim() || null;
    else if (arg.startsWith('--concurrency=')) {
      const n = Number(arg.slice(14).trim());
      if (Number.isFinite(n) && n >= 1) concurrency = Math.floor(n);
    } else if (arg.startsWith('--booking-concurrency=')) {
      const n = Number(arg.slice(22).trim());
      if (Number.isFinite(n) && n >= 1) bookingConcurrency = Math.floor(n);
    } else if (arg === '--per-session-appointment-sync') {
      perSessionAppointmentSync = true;
    }
  }

  return {
    fromDate,
    toDate,
    doctor,
    only,
    wipeSessions,
    dryRun,
    legacySessionId,
    concurrency,
    bookingConcurrency,
    skipPlan,
    skipFixTemplates,
    perSessionBookings,
    perSessionAppointmentSync,
  };
}

function classifySessionRow(
  row: SourceSession,
  maps: RefMaps,
  minSessionDateYmd: string
): { reason: SessionSkipReason; legacyId?: string } {
  const legacyId = toLegacyString(row.session_id);
  if (!legacyId) return { reason: 'noId' };

  const sessionYmd = (row.date ?? '').trim().slice(0, 10);
  if (sessionYmd && !isOnOrAfterYmd(sessionYmd, minSessionDateYmd)) {
    return { reason: 'past', legacyId };
  }

  const doctorSessionId = toLegacyString(row.doctor_session_id);
  const doctorSession = doctorSessionId
    ? maps.doctorSessionsBySourceId.get(doctorSessionId)
    : undefined;
  const doctorId = maps.doctorsByCode.get(row.doctor);
  const departmentId = maps.departmentsByName.get(row.department);
  const locationId = resolveLocationId(maps, row.location);

  if (!doctorSession || !doctorId || !departmentId || !locationId) {
    return { reason: 'missingRefs', legacyId };
  }

  const startTime = unixToDate(row.start_time_unix) ?? unixMsToDate(row.start_time);
  const endTime = unixToDate(row.end_time_unix) ?? unixMsToDate(row.end_time);
  if (!startTime || !endTime) return { reason: 'invalidTime', legacyId };

  return { reason: 'eligible', legacyId };
}

function analyzeLegacySessions(
  list: SourceSession[],
  maps: RefMaps,
  minSessionDateYmd: string
): SessionPlanStats {
  const stats: SessionPlanStats = {
    legacyInRange: list.length,
    eligible: 0,
    skippedPast: 0,
    skippedNoId: 0,
    skippedMissingRefs: 0,
    skippedInvalidTime: 0,
    eligibleLegacyIds: [],
  };

  for (const row of list) {
    const { reason, legacyId } = classifySessionRow(row, maps, minSessionDateYmd);
    switch (reason) {
      case 'eligible':
        stats.eligible++;
        if (legacyId) stats.eligibleLegacyIds.push(legacyId);
        break;
      case 'past':
        stats.skippedPast++;
        break;
      case 'noId':
        stats.skippedNoId++;
        break;
      case 'missingRefs':
        stats.skippedMissingRefs++;
        break;
      case 'invalidTime':
        stats.skippedInvalidTime++;
        break;
    }
  }
  return stats;
}

async function fetchLegacySessionList(
  fromDate: string,
  toDate: string,
  doctorFilter: string | null
): Promise<SourceSession[]> {
  const params: { from_date: string; to_date: string; doctor?: string } = {
    from_date: fromDate,
    to_date: toDate,
  };
  if (doctorFilter) params.doctor = doctorFilter;
  console.log(
    `[plan] Fetching legacy sessions ${fromDate}..${toDate}${doctorFilter ? ` doctor=${doctorFilter}` : ''}`
  );
  const list = await migrateFetch<SourceSession>('all-sessions', 'sessionlist', params);
  console.log(`[plan] Legacy API returned ${list.length} session(s) in date range`);
  return list;
}

function classifyBookingRow(row: SourceBooking, minSessionDateYmd: string): BookingSkipReason {
  const legacyId = toLegacyString(row.booking_id);
  const appointmentNo = safeNumber(row.appointment_no);
  if (!legacyId || !appointmentNo) return 'invalid';

  const bookingSessionYmd = (row.session_date ?? '').trim().slice(0, 10);
  if (bookingSessionYmd && !isOnOrAfterYmd(bookingSessionYmd, minSessionDateYmd)) {
    return 'past';
  }
  return 'eligible';
}

function analyzeLegacyBookings(
  rows: SourceBooking[],
  minSessionDateYmd: string
): Pick<BookingPlanStats, 'legacyTotal' | 'eligible' | 'skippedPast' | 'skippedInvalid'> {
  let eligible = 0;
  let skippedPast = 0;
  let skippedInvalid = 0;
  for (const row of rows) {
    const reason = classifyBookingRow(row, minSessionDateYmd);
    if (reason === 'eligible') eligible++;
    else if (reason === 'past') skippedPast++;
    else skippedInvalid++;
  }
  return {
    legacyTotal: rows.length,
    eligible,
    skippedPast,
    skippedInvalid,
  };
}

async function fetchLegacyBookingsBulk(
  fromDate: string,
  toDate: string,
  doctorFilter: string | null
): Promise<SourceBooking[]> {
  console.log(
    `[bookings] Fetching all-bookings ${fromDate}..${toDate} by session date (single request)${doctorFilter ? ` doctor=${doctorFilter}` : ''}...`
  );
  const rows = await migrateFetch<SourceBooking>('all-bookings', 'bookinglist', {
    from_date: fromDate,
    to_date: toDate,
    by_session_date: true,
    ...(doctorFilter ? { doctor: doctorFilter } : {}),
  });
  console.log(`[bookings] Legacy API returned ${rows.length} booking row(s)`);
  if (rows.length === 0) {
    console.warn(
      `${ANSI.yellow}[bookings] 0 rows — ensure Sails was restarted (all-bookings needs by_session_date=1). ` +
        `Without it, from_date/to_date filter booking createdAt, not session day.${ANSI.reset}`
    );
  }
  return rows;
}

function groupBookingsByLegacySessionId(rows: SourceBooking[]): Map<string, SourceBooking[]> {
  const map = new Map<string, SourceBooking[]>();
  for (const row of rows) {
    const sessionId = toLegacyString(row.session_id);
    if (!sessionId) continue;
    const list = map.get(sessionId) ?? [];
    list.push(row);
    map.set(sessionId, list);
  }
  return map;
}

async function planLegacyBookings(
  legacySessionIds: string[],
  minSessionDateYmd: string,
  prefetchedAllBookings: SourceBooking[]
): Promise<BookingPlanStats> {
  if (legacySessionIds.length === 0) {
    return {
      legacyTotal: 0,
      eligible: 0,
      skippedPast: 0,
      skippedInvalid: 0,
      sessionsCounted: 0,
    };
  }

  const sessionSet = new Set(legacySessionIds);
  const filtered = prefetchedAllBookings.filter((row) => {
    const sid = toLegacyString(row.session_id);
    return sid && sessionSet.has(sid);
  });

  console.log(
    `[plan] Bookings for ${legacySessionIds.length} session(s): ${filtered.length} row(s) from bulk fetch (${prefetchedAllBookings.length} total in range)`
  );

  const analyzed = analyzeLegacyBookings(filtered, minSessionDateYmd);
  return {
    ...analyzed,
    sessionsCounted: legacySessionIds.length,
  };
}

function printSessionPlan(stats: SessionPlanStats, minSessionDateYmd: string): void {
  console.log(`\n${ANSI.bold}── Legacy sessions (before import) ──${ANSI.reset}`);
  console.log(`  In API date range:     ${stats.legacyInRange}`);
  console.log(`  ${ANSI.green}Should migrate:${ANSI.reset}       ${stats.eligible}`);
  if (stats.skippedPast > 0) {
    console.log(`  Excluded (before ${minSessionDateYmd}): ${stats.skippedPast}`);
  }
  if (stats.skippedMissingRefs > 0) {
    console.log(`  Excluded (missing refs): ${stats.skippedMissingRefs}`);
  }
  if (stats.skippedInvalidTime > 0) {
    console.log(`  Excluded (invalid time): ${stats.skippedInvalidTime}`);
  }
  if (stats.skippedNoId > 0) {
    console.log(`  Excluded (no session id): ${stats.skippedNoId}`);
  }
}

function printBookingPlan(stats: BookingPlanStats, minSessionDateYmd: string): void {
  console.log(`\n${ANSI.bold}── Legacy bookings (before import) ──${ANSI.reset}`);
  console.log(`  Sessions scanned:      ${stats.sessionsCounted}`);
  console.log(`  Booking rows (session date range): ${stats.legacyTotal}`);
  console.log(`  ${ANSI.green}Should migrate:${ANSI.reset}       ${stats.eligible}`);
  if (stats.skippedPast > 0) {
    console.log(`  Excluded (before ${minSessionDateYmd}): ${stats.skippedPast}`);
  }
  if (stats.skippedInvalid > 0) {
    console.log(`  Excluded (no id / appt#): ${stats.skippedInvalid}`);
  }
}

function printPhaseDiff(
  label: string,
  shouldMigrate: number,
  transferred: number,
  extra?: { created: number; updated: number; skipped: number; failed?: number }
): void {
  const diff = shouldMigrate - transferred;
  console.log(`\n${ANSI.bold}── ${label} ──${ANSI.reset}`);
  console.log(`  Should migrate (legacy): ${shouldMigrate}`);
  console.log(`  Transferred (create+update): ${transferred}`);
  if (extra) {
    console.log(
      `    created=${extra.created} updated=${extra.updated} skipped=${extra.skipped}` +
        (extra.failed != null && extra.failed > 0 ? ` failed=${extra.failed}` : '')
    );
  }
  if (diff === 0) {
    console.log(`  ${ANSI.green}Difference: 0 (OK)${ANSI.reset}`);
  } else {
    console.log(
      `  ${ANSI.red}${ANSI.bold}*** DIFFERENCE: ${diff} not transferred ***${ANSI.reset}`
    );
  }
}

function collectMissingDoctorSessionRefs(
  list: SourceSession[],
  maps: RefMaps,
  minSessionDateYmd: string
): Map<string, { sessionLegacyIds: string[]; sampleDate?: string }> {
  const byTemplate = new Map<string, { sessionLegacyIds: string[]; sampleDate?: string }>();
  for (const row of list) {
    const { reason, legacyId } = classifySessionRow(row, maps, minSessionDateYmd);
    if (reason !== 'missingRefs' || !legacyId) continue;
    const templateId = toLegacyString(row.doctor_session_id);
    if (!templateId) continue;
    const entry = byTemplate.get(templateId) ?? { sessionLegacyIds: [] };
    entry.sessionLegacyIds.push(legacyId);
    if (!entry.sampleDate && row.date) entry.sampleDate = row.date.trim().slice(0, 10);
    byTemplate.set(templateId, entry);
  }
  return byTemplate;
}

function isLegacyTemplatePublished(status: unknown): boolean {
  return status === 1 || status === '1';
}

type TemplateImportDiagnostics = {
  departmentsActive: Set<string>;
  departmentsAll: Set<string>;
  locationsActiveCode: Set<string>;
  locationsActiveName: Set<string>;
  locationsAllCode: Set<string>;
  locationsAllName: Set<string>;
};

async function loadTemplateImportDiagnostics(): Promise<TemplateImportDiagnostics> {
  const [deptsActive, deptsAll, locsActive, locsAll] = await Promise.all([
    prisma.department.findMany({ where: { status: 1 }, select: { name: true } }),
    prisma.department.findMany({ select: { name: true } }),
    prisma.location.findMany({ where: { status: 1 }, select: { code: true, name: true } }),
    prisma.location.findMany({ select: { code: true, name: true } }),
  ]);
  return {
    departmentsActive: new Set(deptsActive.map((d) => d.name)),
    departmentsAll: new Set(deptsAll.map((d) => d.name)),
    locationsActiveCode: new Set(locsActive.map((l) => l.code)),
    locationsActiveName: new Set(locsActive.map((l) => l.name)),
    locationsAllCode: new Set(locsAll.map((l) => l.code)),
    locationsAllName: new Set(locsAll.map((l) => l.name)),
  };
}

async function explainMissingTemplateImport(
  row: SourceDoctorSessionLookup,
  templateId: string,
  diag: TemplateImportDiagnostics,
  includePastDoctorTemplates: boolean,
  todayYmd: string
): Promise<string> {
  const existing = await prisma.doctorSession.findFirst({
    where: { migrateSourceId: templateId },
    select: { id: true },
  });
  if (existing) {
    return 'DoctorSession row exists in DB — re-run sessions import (ref map should pick it up)';
  }

  const dept = (row.department ?? '').trim();
  const loc = (row.location ?? '').trim();
  const doctorCode = (row.doctor ?? '').trim();

  const doctor = doctorCode
    ? await prisma.doctor.findFirst({
        where: { code: doctorCode },
        select: { migrateSourceId: true, status: true },
      })
    : null;
  if (!doctor) {
    return `Doctor code ${doctorCode || '(empty)'} not in Next — run migrate:import`;
  }
  if (!doctor.migrateSourceId) {
    return `Doctor ${doctorCode} has no migrateSourceId — run migrate:import for doctors`;
  }
  if (doctor.status !== 1) {
    return `Doctor ${doctorCode} status≠1 — excluded from doctor-session import doctor list`;
  }

  if (dept && !diag.departmentsAll.has(dept)) {
    return `Department "${dept}" missing in Next — run migrate:import`;
  }
  if (dept && diag.departmentsAll.has(dept) && !diag.departmentsActive.has(dept)) {
    return `Department "${dept}" exists but status≠1 — older doctor-session import skipped it; re-run migrate-doctor-sessions.ts (now uses all departments)`;
  }

  const locKnown =
    diag.locationsAllCode.has(loc) || diag.locationsAllName.has(loc);
  const locActive =
    diag.locationsActiveCode.has(loc) || diag.locationsActiveName.has(loc);
  if (loc && !locKnown) {
    return `Location "${loc}" missing in Next — run migrate:import`;
  }
  if (loc && locKnown && !locActive) {
    return `Location "${loc}" exists but status≠1 — older doctor-session import only loaded status=1 locations (sessions import does not); re-run migrate-doctor-sessions.ts`;
  }

  const dayType = safeNumber(row.day_type);
  const applyYmd = (row.apply_to_date ?? '').trim();
  const isSpecificDate = dayType === 7 || dayType === 8;
  if (
    isSpecificDate &&
    applyYmd &&
    applyYmd < todayYmd &&
    !includePastDoctorTemplates
  ) {
    return `Specific-date template (day_type=${dayType}, applyTo=${applyYmd}) skipped by doctor-session import (use --include-past)`;
  }

  if (!isLegacyTemplatePublished(row.status)) {
    return 'Legacy template status≠1 — use migrate-doctor-sessions --include-unpublished';
  }

  const rowWithUnix = row as SourceDoctorSessionLookup & {
    start_time_unix?: number;
    end_time_unix?: number;
  };
  if (
    safeNumber(rowWithUnix.start_time_unix) === 0 ||
    safeNumber(rowWithUnix.end_time_unix) === 0
  ) {
    return (
      `Legacy template has start_time/end_time=0 in DB (clock only in name/applyTo) — import with:\n` +
      `      npx tsx scripts/migrate-missing-doctor-templates.ts --template-id=${templateId}`
    );
  }

  return `Doctor-session import skipped this template — try: npx tsx scripts/migrate-missing-doctor-templates.ts --template-id=${templateId}`;
}

async function reportMissingDoctorSessionTemplates(
  list: SourceSession[],
  maps: RefMaps,
  minSessionDateYmd: string,
  concurrency: number,
  includePastDoctorTemplates: boolean
): Promise<void> {
  const byTemplate = collectMissingDoctorSessionRefs(list, maps, minSessionDateYmd);
  if (byTemplate.size === 0) return;

  const todayYmd = todayYmdSriLanka();
  const diag = await loadTemplateImportDiagnostics();
  console.log(
    `\n${ANSI.bold}── Why ${byTemplate.size} doctor template(s) block ${Array.from(byTemplate.values()).reduce((n, e) => n + e.sessionLegacyIds.length, 0)} session(s) ──${ANSI.reset}`
  );
  console.log(
    `${ANSI.dim}Sessions import resolves doctor/dept/location on the session row; templates must exist as DoctorSession.migrateSourceId = doctor_session_id.${ANSI.reset}`
  );

  const templateIds = Array.from(byTemplate.keys());
  const batches = chunk(templateIds, concurrency);

  for (let b = 0; b < batches.length; b++) {
    const batch = batches[b];
    await Promise.all(
      batch.map(async (templateId) => {
        const entry = byTemplate.get(templateId)!;
        const sessionCount = entry.sessionLegacyIds.length;
        const sampleSession = entry.sessionLegacyIds[0];

        let rows: SourceDoctorSessionLookup[] = [];
        try {
          rows = await migrateFetch<SourceDoctorSessionLookup>('all-doctor-sessions', 'doctorsessionlist', {
            template_id: templateId,
            include_unpublished: true,
          });
        } catch {
          rows = [];
        }

        const row = rows.find(
          (r) =>
            toLegacyString(r.doctor_session_id) === templateId || toLegacyString(r.id) === templateId
        );

        if (!row) {
          console.log(
            `\n  ${ANSI.red}template ${templateId}${ANSI.reset} → ${sessionCount} session(s) (e.g. ${sampleSession})`
          );
          console.log(
            `    ${ANSI.red}Legacy: template not found${ANSI.reset} (deleted or invalid id; Sails analysesessions marks these as "ORIGINAL SESSION DELETED")`
          );
          return;
        }

        const reason = await explainMissingTemplateImport(
          row,
          templateId,
          diag,
          includePastDoctorTemplates,
          todayYmd
        );

        console.log(
          `\n  ${ANSI.yellow}template ${templateId}${ANSI.reset} → ${sessionCount} session(s) (e.g. ${sampleSession}, date ${entry.sampleDate ?? '?'})`
        );
        const dayType = safeNumber(row.day_type);
        const applyYmd = (row.apply_to_date ?? '').trim();
        console.log(
          `    legacy: name="${row.name ?? ''}" doctor=${row.doctor ?? '?'} dept=${row.department ?? '?'} loc=${row.location ?? '?'} status=${row.status ?? '?'} day_type=${dayType}${applyYmd ? ` applyTo=${applyYmd}` : ''}`
        );
        console.log(`    ${ANSI.yellow}${reason}${ANSI.reset}`);
      })
    );
  }

  console.log(
    `\n${ANSI.bold}Fix:${ANSI.reset} import missing templates (legacy start_time often 0), then sessions:\n` +
      `  npm run migrate:missing-doctor-templates\n` +
      `  npm run migrate:sessions-bookings`
  );
}

function buildBookingWorkList(
  sessionIdMap: Map<string, string>,
  maps: RefMaps,
  legacySessionIdFilter: string | null,
  dryRun: boolean
): Array<[string, string]> {
  const entries: Array<[string, string | undefined]> = legacySessionIdFilter
    ? [
        [
          legacySessionIdFilter,
          sessionIdMap.get(legacySessionIdFilter) ??
            maps.sessionsBySourceId.get(legacySessionIdFilter),
        ],
      ]
    : Array.from(sessionIdMap.entries());

  const work: Array<[string, string]> = [];
  for (const [legacySessionId, prismaSessionId] of entries) {
    if (!prismaSessionId || prismaSessionId.startsWith('dry-run-')) {
      if (!dryRun) {
        console.warn(`[bookings] skip session ${legacySessionId}: no prisma session id`);
      }
      continue;
    }
    work.push([legacySessionId, prismaSessionId]);
  }
  return work;
}

function mapApiFees(
  fees: SourceFee[] | null | undefined,
  templateFees?: AppFee[] | null
): AppFee[] {
  const list = fees ?? [];
  const templates = templateFees ?? [];
  return list.map((f) => {
    const tmpl = templates.find((t) => t.id === String(f.id));
    return {
      id: String(f.id),
      name: f.name ?? tmpl?.name ?? '',
      feeType: f.fee_type ?? tmpl?.feeType ?? '',
      localFee: safeNumber(f.local_value ?? tmpl?.localFee),
      foreignFee: safeNumber(f.foreign_value ?? tmpl?.foreignFee),
    };
  });
}

function sessionDateUtc(ymd: string): Date {
  return moment.utc(ymd, 'YYYY-MM-DD').startOf('day').toDate();
}

function unixMsToDate(value: unknown): Date | null {
  if (value == null) return null;
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return new Date(n >= 1e12 ? n : n * 1000);
}

function isValidObjectId(s: string | null | undefined): boolean {
  return !!s && /^[a-f0-9]{24}$/i.test(s);
}

type RefMaps = {
  doctorsByCode: Map<string, string>;
  departmentsByName: Map<string, string>;
  locationsByCode: Map<string, string>;
  locationsByName: Map<string, string>;
  roomsByKey: Map<string, string>;
  doctorSessionsBySourceId: Map<string, { id: string; fees: AppFee[] }>;
  agenciesBySourceId: Map<string, string>;
  discountsBySourceId: Map<string, string>;
  doctorsBySourceId: Map<string, string>;
  staffByCode: Map<string, string>;
  sessionsBySourceId: Map<string, string>;
};

async function loadRefMaps(): Promise<RefMaps> {
  const [doctors, departments, locations, rooms, doctorSessions, agencies, discounts, staff, sessions] =
    await Promise.all([
      prisma.doctor.findMany({ select: { id: true, code: true, migrateSourceId: true } }),
      prisma.department.findMany({ select: { id: true, name: true } }),
      prisma.location.findMany({ select: { id: true, code: true, name: true } }),
      prisma.room.findMany({ select: { id: true, number: true, locationId: true } }),
      prisma.doctorSession.findMany({
        where: { migrateSourceId: { not: null } },
        select: { id: true, migrateSourceId: true, fees: true },
      }),
      prisma.agency.findMany({
        where: { migrateSourceId: { not: null } },
        select: { id: true, migrateSourceId: true },
      }),
      prisma.discount.findMany({
        where: { migrateSourceId: { not: null } },
        select: { id: true, migrateSourceId: true },
      }),
      prisma.staff.findMany({ select: { id: true, code: true } }),
      prisma.session.findMany({
        where: { migrateSourceId: { not: null } },
        select: { id: true, migrateSourceId: true },
      }),
    ]);

  const doctorSessionsBySourceId = new Map<string, { id: string; fees: AppFee[] }>();
  for (const ds of doctorSessions) {
    if (!ds.migrateSourceId) continue;
    const fees = Array.isArray(ds.fees) ? (ds.fees as AppFee[]) : [];
    doctorSessionsBySourceId.set(ds.migrateSourceId, { id: ds.id, fees });
  }

  return {
    doctorsByCode: new Map(doctors.map((d) => [d.code, d.id])),
    doctorsBySourceId: new Map(
      doctors.filter((d) => d.migrateSourceId).map((d) => [d.migrateSourceId!, d.id])
    ),
    departmentsByName: new Map(departments.map((d) => [d.name, d.id])),
    locationsByCode: new Map(locations.map((l) => [l.code, l.id])),
    locationsByName: new Map(locations.map((l) => [l.name, l.id])),
    roomsByKey: new Map(rooms.map((r) => [`${r.locationId}::${r.number}`, r.id])),
    doctorSessionsBySourceId,
    agenciesBySourceId: new Map(
      agencies.filter((a) => a.migrateSourceId).map((a) => [a.migrateSourceId!, a.id])
    ),
    discountsBySourceId: new Map(
      discounts.filter((d) => d.migrateSourceId).map((d) => [d.migrateSourceId!, d.id])
    ),
    staffByCode: new Map(staff.map((s) => [s.code, s.id])),
    sessionsBySourceId: new Map(
      sessions.filter((s) => s.migrateSourceId).map((s) => [s.migrateSourceId!, s.id])
    ),
  };
}

function resolveLocationId(maps: RefMaps, codeOrName: string | undefined): string | undefined {
  if (!codeOrName) return undefined;
  return maps.locationsByCode.get(codeOrName) ?? maps.locationsByName.get(codeOrName);
}

async function wipeSessionsAndBookings(): Promise<void> {
  console.log('[wipe] Deleting bookings and sessions...');
  const b = await prisma.booking.deleteMany({});
  console.log(`  booking: ${b.count}`);
  const seq = await prisma.sequence.deleteMany({
    where: { scopeKey: { startsWith: 'appointment:' } },
  });
  console.log(`  appointment sequences: ${seq.count}`);
  const s = await prisma.session.deleteMany({});
  console.log(`  session: ${s.count}`);
}

async function syncSessionAppointmentCounters(
  sessionId: string,
  startingPatientNumber: number,
  sessionAppointmentNo: number
): Promise<void> {
  const bookings = await prisma.booking.findMany({
    where: { sessionId },
    select: { appointmentNo: true },
  });
  const maxBooking = bookings.reduce((m, b) => Math.max(m, b.appointmentNo), 0);
  const lastValue = Math.max(maxBooking, sessionAppointmentNo, startingPatientNumber - 1);

  await prisma.session.update({
    where: { id: sessionId },
    data: { appointmentNo: lastValue },
  });

  const scopeKey = appointmentSequenceScopeKey(sessionId);
  await prisma.sequence.upsert({
    where: { scopeKey },
    create: { scopeKey, lastValue },
    update: { lastValue },
  });
}

async function upsertOneSession(
  row: SourceSession,
  maps: RefMaps,
  importUserId: string,
  dryRun: boolean,
  minSessionDateYmd: string
): Promise<SessionUpsertStats> {
  const empty: SessionUpsertStats = {
    created: 0,
    updated: 0,
    skipped: 1,
    skippedPast: 0,
    failed: 0,
  };
  const emptyPast: SessionUpsertStats = {
    created: 0,
    updated: 0,
    skipped: 0,
    skippedPast: 1,
    failed: 0,
  };

  const { reason, legacyId } = classifySessionRow(row, maps, minSessionDateYmd);
  if (reason === 'noId') return empty;
  if (reason === 'past') return emptyPast;
  if (!legacyId) return empty;

  if (reason === 'missingRefs') {
    const doctorSessionId = toLegacyString(row.doctor_session_id);
    const doctorSession = doctorSessionId
      ? maps.doctorSessionsBySourceId.get(doctorSessionId)
      : undefined;
    console.warn(
      `[sessions] skip ${legacyId}: missing template doctor_session_id=${doctorSessionId ?? '(empty)'} (not in DoctorSession.migrateSourceId)`
    );
    return empty;
  }
  if (reason === 'invalidTime') {
    console.warn(`[sessions] skip ${legacyId}: invalid start/end time`);
    return empty;
  }

  const doctorSessionId = toLegacyString(row.doctor_session_id)!;
  const doctorSession = maps.doctorSessionsBySourceId.get(doctorSessionId)!;
  const doctorId = maps.doctorsByCode.get(row.doctor)!;
  const departmentId = maps.departmentsByName.get(row.department)!;
  const locationId = resolveLocationId(maps, row.location)!;

  const roomStr = (row.room ?? '').toString().trim();
  const roomId =
    roomStr.length > 0 ? maps.roomsByKey.get(`${locationId}::${roomStr}`) ?? null : null;

  const startTime = unixToDate(row.start_time_unix) ?? unixMsToDate(row.start_time);
  const endTime = unixToDate(row.end_time_unix) ?? unixMsToDate(row.end_time);
  if (!startTime || !endTime) {
    console.warn(`[sessions] skip ${legacyId}: invalid start/end time`);
    return empty;
  }

  const fees = mapApiFees(row.fees, doctorSession.fees);
  const feeLocalSum = fees.reduce((acc, f) => acc + f.localFee, 0);
  const feeForeignSum = fees.reduce((acc, f) => acc + f.foreignFee, 0);

  const data: Prisma.SessionUncheckedCreateInput = {
    migrateSourceId: legacyId,
    institution: safeNumber(row.institution),
    date: sessionDateUtc(row.date),
    doctorSessionId: doctorSession.id,
    previousDoctorSession: toLegacyString(row.previous_doctor_session),
    startTime,
    endTime,
    durationMinutes: row.duration_minutes != null ? safeNumber(row.duration_minutes) : null,
    startingPatientNumber: safeNumber(row.starting_patient_number),
    maxPatientNumber: safeNumber(row.max_patient_number),
    refundable: safeNumber(row.refundable),
    fees: fees as unknown as Prisma.InputJsonValue,
    amountLocal:
      row.amount_local != null ? Math.round(safeNumber(row.amount_local)) : Math.round(feeLocalSum),
    amountForeign:
      row.amount_foreign != null
        ? Math.round(safeNumber(row.amount_foreign))
        : Math.round(feeForeignSum),
    doctorArrivalTime: (row.doctor_arrival_time ?? []) as Prisma.InputJsonValue,
    doctorDepatureTime: (row.doctor_depature_time ?? []) as Prisma.InputJsonValue,
    doctorLeaveRemark: row.doctor_leave_remark ?? null,
    doctorLeaveCreator: row.doctor_leave_creator ?? null,
    doctorLeaveCreatedAt: row.doctor_leave_createdAt ?? null,
    status: safeNumber(row.status),
    remarks: row.remarks ?? null,
    appointmentNo: safeNumber(row.appointment_no),
    blockedAppointmentNumbers: [],
    channelCurrentPatientNumber: 0,
    isScan: Boolean(row.isScan),
    doctorId,
    departmentId,
    locationId,
    roomId,
    createdBy: importUserId,
    updatedBy: importUserId,
    ...(row.createdAt ? { createdAt: unixMsToDate(row.createdAt)! } : {}),
    ...(row.updatedAt ? { updatedAt: unixMsToDate(row.updatedAt)! } : {}),
  };

  if (dryRun) {
    return {
      created: 1,
      updated: 0,
      skipped: 0,
      skippedPast: 0,
      failed: 0,
      legacyId,
      prismaId: `dry-run-${legacyId}`,
    };
  }

  const existing = await prisma.session.findFirst({
    where: { migrateSourceId: legacyId },
    select: { id: true },
  });

  try {
    const rowId = await retryOnConflict(async () => {
      if (existing) {
        await prisma.session.update({
          where: { id: existing.id },
          data: { ...data, updatedBy: importUserId },
        });
        return { id: existing.id, created: false };
      }
      const createdRow = await prisma.session.create({ data, select: { id: true } });
      return { id: createdRow.id, created: true };
    });
    return {
      created: rowId.created ? 1 : 0,
      updated: rowId.created ? 0 : 1,
      skipped: 0,
      skippedPast: 0,
      failed: 0,
      legacyId,
      prismaId: rowId.id,
    };
  } catch (e) {
    console.error(`[sessions] failed ${legacyId}:`, e instanceof Error ? e.message : e);
    return { ...empty, failed: 1, skipped: 0 };
  }
}

async function importSessions(
  maps: RefMaps,
  importUserId: string,
  fromDate: string,
  toDate: string,
  doctorFilter: string | null,
  dryRun: boolean,
  minSessionDateYmd: string,
  concurrency: number,
  prefetchedList?: SourceSession[]
): Promise<{ sessionIdMap: Map<string, string>; stats: SessionImportStats }> {
  const sessionIdMap = new Map<string, string>(maps.sessionsBySourceId);
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let skippedPast = 0;
  let failed = 0;

  const list =
    prefetchedList ?? (await fetchLegacySessionList(fromDate, toDate, doctorFilter));
  console.log(`[sessions] Upserting ${list.length} rows in batches of ${concurrency}`);

  const batches = chunk(list, concurrency);
  for (let b = 0; b < batches.length; b++) {
    const batch = batches[b];
    const results = await Promise.all(
      batch.map((row) => upsertOneSession(row, maps, importUserId, dryRun, minSessionDateYmd))
    );
    for (const r of results) {
      created += r.created;
      updated += r.updated;
      skipped += r.skipped;
      skippedPast += r.skippedPast;
      failed += r.failed;
      if (r.legacyId && r.prismaId) sessionIdMap.set(r.legacyId, r.prismaId);
    }
    if ((b + 1) % 10 === 0 || b === batches.length - 1) {
      console.log(`[sessions] batch ${b + 1}/${batches.length} done`);
    }
  }

  console.log(
    `[sessions] summary: created=${created} updated=${updated} skipped=${skipped}` +
      (failed > 0 ? ` failed=${failed}` : '') +
      (skippedPast > 0 ? ` skippedPast(before ${minSessionDateYmd})=${skippedPast}` : '')
  );
  return {
    sessionIdMap,
    stats: { created, updated, skipped, skippedPast, failed },
  };
}

function buildBookingData(
  row: SourceBooking,
  sessionId: string,
  doctorId: string,
  locationId: string | null,
  maps: RefMaps,
  importUserId: string
): Prisma.BookingUncheckedCreateInput | null {
  const legacyId = toLegacyString(row.booking_id);
  if (!legacyId) return null;

  const appointmentNo = safeNumber(row.appointment_no);
  if (!appointmentNo) return null;

  const agencySourceId = toLegacyString(row.agency);
  const discountSourceId = toLegacyString(row.discount_id);
  const autoDiscountSourceId = toLegacyString(row.auto_discount_id);
  const referredDoctorSourceId = toLegacyString(row.referred_doctor);
  const referredAgencySourceId = toLegacyString(row.referred_agency);
  const staffCode = toLegacyString(row.staff);
  const referredStaffCode = toLegacyString(row.referred_staff);

  const movedFromLegacy =
    row.movedfrom != null && String(row.movedfrom).trim() !== '' && String(row.movedfrom) !== '0'
      ? String(row.movedfrom)
      : null;

  const canceledAt = unixMsToDate(row.canceled_at);
  const canceledByRaw = toLegacyString(row.canceled_by);
  const canceledBy = isValidObjectId(canceledByRaw) ? canceledByRaw : null;

  const receiptNoId = isValidObjectId(row.receipt_no_id) ? row.receipt_no_id! : null;
  const refundReceiptId = isValidObjectId(row.refund_receipt_no_id) ? row.refund_receipt_no_id! : null;
  const doctorPaymentReceiptId = isValidObjectId(row.doctor_payment_receipt)
    ? row.doctor_payment_receipt!
    : null;
  const movedBy = isValidObjectId(row.movedby) ? row.movedby! : null;

  return {
    migrateSourceId: legacyId,
    title: row.title ?? '',
    name: (row.name ?? '').toUpperCase(),
    phone: row.phone ?? '',
    sex: row.sex ?? '',
    area: row.area ?? '',
    remarks: row.remarks ?? '',
    method: safeNumber(row.method),
    sessionId,
    doctorId,
    amount: safeNumber(row.amount),
    discount: safeNumber(row.discount),
    foriegner: Boolean(row.foriegner),
    status: safeNumber(row.status),
    createdBy: isValidObjectId(row.createdBy) ? row.createdBy! : importUserId,
    updatedBy: isValidObjectId(row.updatedBy) ? row.updatedBy! : importUserId,
    fees: (row.fees ?? []) as Prisma.InputJsonValue,
    refund: safeNumber(row.refund),
    refundAmount: safeNumber(row.refund_amount),
    refundReason: row.refund_reason ?? null,
    refundAmountProfessionalFee: safeNumber(row.refund_amount_professional_fee),
    refundAmountHospitalFee: safeNumber(row.refund_amount_hospital_fee),
    refundReceiptId,
    refundReceiptNoString: row.refund_receipt_no_string || null,
    refundReceiptCreatedAt: unixMsToDate(row.refund_receipt_createAt),
    canceledAt,
    canceledBy,
    agencyRef: row.agency_ref ?? '',
    agencyId: agencySourceId ? maps.agenciesBySourceId.get(agencySourceId) ?? null : null,
    staffId: staffCode ? maps.staffByCode.get(staffCode) ?? null : null,
    discountDivision: (row.discount_division ?? null) as Prisma.InputJsonValue,
    hospitalFeeDiscount: safeNumber(row.hospital_fee_discount),
    professionsalFeeDiscount: safeNumber(row.professionsal_fee_discount),
    professionalFee: safeNumber(row.professional_fee),
    hospitalFee: safeNumber(row.hospital_fee),
    referredDoctorId: referredDoctorSourceId
      ? maps.doctorsBySourceId.get(referredDoctorSourceId) ??
        maps.doctorsByCode.get(referredDoctorSourceId) ??
        null
      : null,
    referredAgencyId: referredAgencySourceId
      ? maps.agenciesBySourceId.get(referredAgencySourceId) ?? null
      : null,
    referredStaffId: referredStaffCode ? maps.staffByCode.get(referredStaffCode) ?? null : null,
    sessionStartTime: unixToSeconds(row.session_start_time),
    sessionEndTime: unixToSeconds(row.session_end_time),
    isScan: Boolean(row.isScan),
    locationId,
    bookingid: row.bookingid != null ? safeNumber(row.bookingid) : null,
    bookingid_string: row.bookingid_string ?? null,
    appointmentNo,
    discountId: discountSourceId ? maps.discountsBySourceId.get(discountSourceId) ?? null : null,
    autoDiscountId: autoDiscountSourceId
      ? maps.discountsBySourceId.get(autoDiscountSourceId) ?? null
      : null,
    receiptNo: row.receipt_no != null ? safeNumber(row.receipt_no) : null,
    receiptNoString: row.receipt_no_string ?? null,
    receiptPaymentMethod:
      row.receipt_payment_method != null ? safeNumber(row.receipt_payment_method) : null,
    receiptNoCreatedAt: unixMsToDate(row.receipt_no_createdAt),
    receiptNoId,
    doctorPayment: Boolean(row.doctor_payment),
    doctorPaymentAt: unixMsToDate(row.doctor_payment_date),
    doctorPaymentReceiptId,
    doctorPaymentReceiptString: row.doctor_payment_receipt_string ?? null,
    movedFromSessionId: movedFromLegacy ? maps.sessionsBySourceId.get(movedFromLegacy) ?? null : null,
    movedBy,
    movedAt: unixMsToDate(row.movedDate),
    movedRemarks: row.movedRemarks ?? null,
    ...(row.createdAt ? { createdAt: unixMsToDate(row.createdAt)! } : {}),
    ...(row.updatedAt ? { updatedAt: unixMsToDate(row.updatedAt)! } : {}),
  };
}

type SessionBookingMeta = {
  doctorId: string;
  locationId: string | null;
  startingPatientNumber: number;
  appointmentNo: number;
};

type ExistingBookingRef = {
  id: string;
  sessionId: string;
  appointmentNo: number;
};

type BookingBatchContext = {
  sessionsById: Map<string, SessionBookingMeta>;
  existingByMigrateSourceId: Map<string, ExistingBookingRef>;
  existingIdBySessionAppt: Map<string, string>;
};

function sessionApptKey(sessionId: string, appointmentNo: number): string {
  return `${sessionId}::${appointmentNo}`;
}

async function loadBookingBatchContext(prismaSessionIds: string[]): Promise<BookingBatchContext> {
  const empty: BookingBatchContext = {
    sessionsById: new Map(),
    existingByMigrateSourceId: new Map(),
    existingIdBySessionAppt: new Map(),
  };
  if (prismaSessionIds.length === 0) return empty;

  const sessions = await prisma.session.findMany({
    where: { id: { in: prismaSessionIds } },
    select: {
      id: true,
      doctorId: true,
      locationId: true,
      startingPatientNumber: true,
      appointmentNo: true,
    },
  });
  const sessionsById = new Map<string, SessionBookingMeta>();
  for (const s of sessions) {
    if (!s.doctorId) continue;
    sessionsById.set(s.id, {
      doctorId: s.doctorId,
      locationId: s.locationId,
      startingPatientNumber: s.startingPatientNumber,
      appointmentNo: s.appointmentNo,
    });
  }

  const existingRows = await prisma.booking.findMany({
    where: { sessionId: { in: prismaSessionIds } },
    select: { id: true, migrateSourceId: true, sessionId: true, appointmentNo: true },
  });
  const existingByMigrateSourceId = new Map<string, ExistingBookingRef>();
  const existingIdBySessionAppt = new Map<string, string>();
  for (const b of existingRows) {
    const sessionId = b.sessionId;
    if (!sessionId) continue;
    if (b.migrateSourceId) {
      existingByMigrateSourceId.set(b.migrateSourceId, {
        id: b.id,
        sessionId,
        appointmentNo: b.appointmentNo,
      });
    }
    existingIdBySessionAppt.set(sessionApptKey(sessionId, b.appointmentNo), b.id);
  }

  return { sessionsById, existingByMigrateSourceId, existingIdBySessionAppt };
}

async function syncAppointmentCountersForSessions(
  sessionIds: string[],
  sessionsById: Map<string, SessionBookingMeta>,
  syncConcurrency: number
): Promise<void> {
  const ids = sessionIds.filter((id) => sessionsById.has(id));
  if (!ids.length) return;

  console.log(`[bookings] Syncing appointment counters for ${ids.length} session(s)...`);
  const batches = chunk(ids, syncConcurrency);
  let done = 0;
  for (const batch of batches) {
    await Promise.all(
      batch.map((id) => {
        const s = sessionsById.get(id)!;
        return syncSessionAppointmentCounters(id, s.startingPatientNumber, s.appointmentNo);
      })
    );
    done += batch.length;
    if (done % 250 === 0 || done === ids.length) {
      console.log(`[bookings] appointment sync ${done}/${ids.length}`);
    }
  }
}

async function importBookingsForSession(
  legacySessionId: string,
  prismaSessionId: string,
  maps: RefMaps,
  importUserId: string,
  dryRun: boolean,
  minSessionDateYmd: string,
  batchCtx: BookingBatchContext | null,
  opts: {
    prefetchedBookings?: SourceBooking[];
    deferAppointmentSync: boolean;
    useCreateMany: boolean;
  }
): Promise<{ created: number; updated: number; skipped: number; shouldSyncCounters: boolean }> {
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let shouldSyncCounters = false;

  const list =
    opts.prefetchedBookings ??
    (await migrateFetch<SourceBooking>('all-bookings', 'bookinglist', {
      session: legacySessionId,
    }));

  const sessionRow = batchCtx?.sessionsById.get(prismaSessionId) ?? null;
  if (!sessionRow?.doctorId) {
    console.warn(`[bookings] skip session ${legacySessionId}: session not found or no doctorId`);
    return { created: 0, updated: 0, skipped: list.length, shouldSyncCounters: false };
  }

  const toCreate: Prisma.BookingUncheckedCreateInput[] = [];

  for (const row of list) {
    const bookingSessionYmd = (row.session_date ?? '').trim().slice(0, 10);
    if (bookingSessionYmd && !isOnOrAfterYmd(bookingSessionYmd, minSessionDateYmd)) {
      skipped++;
      continue;
    }

    const data = buildBookingData(
      row,
      prismaSessionId,
      sessionRow.doctorId,
      sessionRow.locationId,
      maps,
      importUserId
    );
    if (!data?.migrateSourceId) {
      skipped++;
      continue;
    }
    shouldSyncCounters = true;

    if (dryRun) {
      created++;
      continue;
    }

    const existing = batchCtx?.existingByMigrateSourceId.get(data.migrateSourceId);

    if (!existing && opts.useCreateMany) {
      toCreate.push(data);
      continue;
    }

    try {
      await retryOnConflict(async () => {
        if (existing) {
          await prisma.booking.update({
            where: { id: existing.id },
            data: { ...data, updatedBy: importUserId },
          });
          updated++;
        } else {
          const createdRow = await prisma.booking.create({ data, select: { id: true } });
          created++;
          if (batchCtx && data.migrateSourceId) {
            batchCtx.existingByMigrateSourceId.set(data.migrateSourceId, {
              id: createdRow.id,
              sessionId: prismaSessionId,
              appointmentNo: data.appointmentNo,
            });
            batchCtx.existingIdBySessionAppt.set(
              sessionApptKey(prismaSessionId, data.appointmentNo),
              createdRow.id
            );
          }
        }
      });
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code;
      if (code === 'P2002' && data.migrateSourceId) {
        const byApptId = batchCtx?.existingIdBySessionAppt.get(
          sessionApptKey(prismaSessionId, data.appointmentNo)
        );
        if (byApptId) {
          await prisma.booking.update({
            where: { id: byApptId },
            data: { ...data, updatedBy: importUserId },
          });
          updated++;
          continue;
        }
      }
      skipped++;
      console.error(
        `[bookings] failed ${data.migrateSourceId} session=${legacySessionId}:`,
        e instanceof Error ? e.message : e
      );
    }
  }

  if (!dryRun && toCreate.length > 0) {
    for (const part of chunk(toCreate, BOOKING_CREATE_MANY_CHUNK)) {
      const result = await prisma.booking.createMany({ data: part });
      created += result.count;
    }
  }

  if (!dryRun && !opts.deferAppointmentSync) {
    await syncSessionAppointmentCounters(
      prismaSessionId,
      sessionRow.startingPatientNumber,
      sessionRow.appointmentNo
    );
  }

  return { created, updated, skipped, shouldSyncCounters };
}

async function importBookings(
  sessionIdMap: Map<string, string>,
  maps: RefMaps,
  importUserId: string,
  dryRun: boolean,
  legacySessionIdFilter: string | null,
  minSessionDateYmd: string,
  bookingConcurrency: number,
  bookingsBySession: Map<string, SourceBooking[]> | undefined,
  opts: { deferAppointmentSync: boolean; useCreateMany: boolean }
): Promise<BookingImportStats> {
  const work = buildBookingWorkList(sessionIdMap, maps, legacySessionIdFilter, dryRun);

  let totalCreated = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;

  const mode = bookingsBySession ? 'bulk (in-memory)' : 'per-session API';
  const syncNote = opts.deferAppointmentSync ? ', deferred appointment sync' : '';
  const createNote = opts.useCreateMany ? ', createMany for new rows' : '';
  console.log(
    `[bookings] Importing ${work.length} sessions in batches of ${bookingConcurrency} [${mode}${syncNote}${createNote}]`
  );

  const allSessionsMeta = new Map<string, SessionBookingMeta>();
  const syncSessionIds = new Set<string>();

  const batches = chunk(work, bookingConcurrency);
  for (let b = 0; b < batches.length; b++) {
    const batch = batches[b];
    const prismaSessionIds = batch.map(([, id]) => id);
    const batchCtx = dryRun ? null : await loadBookingBatchContext(prismaSessionIds);
    if (batchCtx) {
      for (const [id, meta] of batchCtx.sessionsById) {
        allSessionsMeta.set(id, meta);
      }
    }

    const results = await Promise.all(
      batch.map(async ([legacySessionId, prismaSessionId]) => {
        const result = await importBookingsForSession(
          legacySessionId,
          prismaSessionId,
          maps,
          importUserId,
          dryRun,
          minSessionDateYmd,
          batchCtx,
          {
            prefetchedBookings: bookingsBySession?.get(legacySessionId),
            deferAppointmentSync: opts.deferAppointmentSync,
            useCreateMany: opts.useCreateMany,
          }
        );
        return { prismaSessionId, result };
      })
    );
    for (const { prismaSessionId, result } of results) {
      totalCreated += result.created;
      totalUpdated += result.updated;
      totalSkipped += result.skipped;
      if (result.shouldSyncCounters) {
        syncSessionIds.add(prismaSessionId);
      }
    }
    if ((b + 1) % 5 === 0 || b === batches.length - 1) {
      console.log(
        `[bookings] batch ${b + 1}/${batches.length} done (created=${totalCreated} updated=${totalUpdated} skipped=${totalSkipped})`
      );
    }
  }

  if (!dryRun && opts.deferAppointmentSync) {
    await syncAppointmentCountersForSessions(
      Array.from(syncSessionIds),
      allSessionsMeta,
      Math.min(bookingConcurrency, 30)
    );
  }

  console.log(
    `[bookings] summary: sessions=${work.length} created=${totalCreated} updated=${totalUpdated} skipped=${totalSkipped}`
  );
  return {
    created: totalCreated,
    updated: totalUpdated,
    skipped: totalSkipped,
    sessionsProcessed: work.length,
  };
}

async function loadSessionMapForBookingsOnly(
  fromDate: string,
  toDate: string,
  doctorFilter: string | null
): Promise<Map<string, string>> {
  const from = sessionDateUtc(fromDate);
  const to = moment.utc(toDate, 'YYYY-MM-DD').endOf('day').toDate();

  const rows = await prisma.session.findMany({
    where: {
      migrateSourceId: { not: null },
      date: { gte: from, lte: to },
      ...(doctorFilter
        ? { doctor: { migrateSourceId: doctorFilter } }
        : {}),
    },
    select: { id: true, migrateSourceId: true },
  });

  const map = new Map<string, string>();
  for (const r of rows) {
    if (r.migrateSourceId) map.set(r.migrateSourceId, r.id);
  }
  return map;
}

async function main(): Promise<void> {
  if (!MIGRATE_USER_KEY) {
    console.error('Set MIGRATE_USER_KEY in .env');
    process.exit(1);
  }

  const {
    fromDate: fromArg,
    toDate: toArg,
    doctor,
    only,
    wipeSessions,
    dryRun,
    legacySessionId,
    concurrency,
    bookingConcurrency,
    skipPlan,
    skipFixTemplates,
    perSessionBookings,
    perSessionAppointmentSync,
  } = parseArgs();

  let fromDate: string;
  let toDate: string;
  let usedDefaultRange: boolean;
  try {
    ({ fromDate, toDate, usedDefaultRange } = resolveMigrateDateRange(fromArg, toArg));
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  }
  const minSessionDateYmd = usedDefaultRange ? fromDate : '0000-01-01';

  const importUser = await prisma.user.findUnique({
    where: { email: IMPORT_USER_EMAIL },
    select: { id: true },
  });
  if (!importUser) {
    console.error(`Import user not found: ${IMPORT_USER_EMAIL}`);
    process.exit(1);
  }

  console.log('Migrate sessions & bookings\n');
  if (dryRun) console.log('DRY RUN — no database writes\n');
  if (usedDefaultRange) {
    console.log(
      `Range (default): ${fromDate} .. ${toDate} — today and future only (Sri Lanka date, +${DEFAULT_FUTURE_YEARS}y cap)`
    );
  } else {
    console.log(`Range: ${fromDate} .. ${toDate}`);
  }
  if (doctor) console.log(`Doctor filter: ${doctor}`);
  console.log(`Concurrency: sessions=${concurrency} bookings=${bookingConcurrency}`);
  if (!perSessionAppointmentSync) {
    console.log('Bookings: appointment counter sync deferred until end of import (faster).');
  }
  console.log(`Steps: ${only.join(', ')}\n`);

  const reporter = createMigrateReporter('migrate-sessions-bookings', {
    fromDate,
    toDate,
    doctor: doctor ?? '',
    only: only.join(','),
    dryRun: String(dryRun),
    wipeSessions: String(wipeSessions),
    perSessionBookings: String(perSessionBookings),
  });

  if (dryRun && wipeSessions) {
    console.log('[wipe] Would delete all sessions and bookings (default). Use --no-wipe to skip on a real run.\n');
  } else if (wipeSessions) {
    console.log('[wipe] Deleting all sessions and bookings before import. Use --no-wipe to keep existing data.\n');
    await wipeSessionsAndBookings();
  } else {
    console.log('[wipe] --no-wipe: keeping existing sessions/bookings; upserting from legacy API.\n');
  }

  const maps = await loadRefMaps();
  let sessionIdMap = maps.sessionsBySourceId;

  let sessionPlan: SessionPlanStats | null = null;
  let sessionImport: SessionImportStats | null = null;
  let bookingPlan: BookingPlanStats | null = null;
  let bookingImport: BookingImportStats | null = null;
  let legacySessionList: SourceSession[] | null = null;

  const runSessions = only.includes('sessions');
  const runBookings = only.includes('bookings');

  if (!skipPlan && (runSessions || runBookings)) {
    legacySessionList = await fetchLegacySessionList(fromDate, toDate, doctor);
    if (runSessions) {
      sessionPlan = analyzeLegacySessions(legacySessionList, maps, minSessionDateYmd);
      printSessionPlan(sessionPlan, minSessionDateYmd);
    }
  }

  if (
    runSessions &&
    legacySessionList &&
    sessionPlan &&
    sessionPlan.skippedMissingRefs > 0 &&
    !dryRun &&
    !skipFixTemplates
  ) {
    const templateIds = Array.from(
      collectMissingDoctorSessionRefs(legacySessionList, maps, minSessionDateYmd).keys()
    );
    console.log(
      `\n${ANSI.bold}[fix] Importing ${templateIds.length} missing doctor template(s) (legacy start_time=0)...${ANSI.reset}`
    );
    const fixResult = await importMissingDoctorTemplatesByIds(templateIds, importUser.id);
    console.log(
      `[fix] templates: created=${fixResult.created} updated=${fixResult.updated} skipped=${fixResult.skipped}`
    );
    await refreshDoctorSessionsInMaps(maps);
    sessionPlan = analyzeLegacySessions(legacySessionList, maps, minSessionDateYmd);
    console.log(
      `[fix] Sessions should migrate: ${sessionPlan.eligible} (missing refs: ${sessionPlan.skippedMissingRefs})\n`
    );
  }

  if (runSessions) {
    const { sessionIdMap: importedMap, stats } = await importSessions(
      maps,
      importUser.id,
      fromDate,
      toDate,
      doctor,
      dryRun,
      minSessionDateYmd,
      concurrency,
      legacySessionList ?? undefined
    );
    sessionIdMap = importedMap;
    sessionImport = stats;
    for (const [k, v] of Array.from(sessionIdMap.entries())) {
      if (!v.startsWith('dry-run-')) maps.sessionsBySourceId.set(k, v);
    }
    if (legacySessionList && (sessionPlan?.skippedMissingRefs ?? 0) > 0) {
      await reportMissingDoctorSessionTemplates(
        legacySessionList,
        maps,
        minSessionDateYmd,
        concurrency,
        false
      );
    }
  } else if (runBookings) {
    sessionIdMap = await loadSessionMapForBookingsOnly(fromDate, toDate, doctor);
    console.log(`[bookings] Loaded ${sessionIdMap.size} sessions from DB for date range`);
  }

  if (runBookings) {
    const work = buildBookingWorkList(sessionIdMap, maps, legacySessionId, dryRun);
    const legacyIdsForPlan = work.map(([id]) => id);

    let bookingsBySession: Map<string, SourceBooking[]> | undefined;
    let legacyBookingsBulk: SourceBooking[] | undefined;

    if (!perSessionBookings) {
      legacyBookingsBulk = await fetchLegacyBookingsBulk(fromDate, toDate, doctor);
      bookingsBySession = groupBookingsByLegacySessionId(legacyBookingsBulk);
    }

    if (!skipPlan) {
      if (legacyBookingsBulk) {
        bookingPlan = await planLegacyBookings(
          legacyIdsForPlan,
          minSessionDateYmd,
          legacyBookingsBulk
        );
        printBookingPlan(bookingPlan, minSessionDateYmd);
      } else {
        console.log(
          `${ANSI.yellow}[plan] Booking pre-count skipped (--per-session-bookings: plan needs bulk fetch; import still per-session).${ANSI.reset}`
        );
      }
    }

    bookingImport = await importBookings(
      sessionIdMap,
      maps,
      importUser.id,
      dryRun,
      legacySessionId,
      minSessionDateYmd,
      bookingConcurrency,
      bookingsBySession,
      {
        deferAppointmentSync: !perSessionAppointmentSync,
        useCreateMany: !dryRun && wipeSessions,
      }
    );
  }

  console.log(`\n${ANSI.bold}════════ Migration summary ════════${ANSI.reset}`);
  if (sessionPlan && sessionImport) {
    const transferred = sessionImport.created + sessionImport.updated;
    printPhaseDiff('Sessions', sessionPlan.eligible, transferred, {
      created: sessionImport.created,
      updated: sessionImport.updated,
      skipped: sessionImport.skipped,
      failed: sessionImport.failed,
    });
  } else if (sessionPlan && !sessionImport) {
    console.log(`\n${ANSI.dim}(Sessions planned but import step was not run)${ANSI.reset}`);
  }

  if (bookingPlan && bookingImport) {
    const transferred = bookingImport.created + bookingImport.updated;
    printPhaseDiff('Bookings', bookingPlan.eligible, transferred, {
      created: bookingImport.created,
      updated: bookingImport.updated,
      skipped: bookingImport.skipped,
    });
    const workCount = bookingImport.sessionsProcessed;
    if (
      sessionPlan &&
      sessionPlan.eligible > 0 &&
      workCount < sessionPlan.eligible
    ) {
      console.log(
        `  ${ANSI.yellow}Note: bookings scanned ${workCount} session(s) with a Prisma id; ` +
          `${sessionPlan.eligible - workCount} eligible legacy session(s) were not imported (check session phase).${ANSI.reset}`
      );
    }
  } else if (bookingPlan && !bookingImport) {
    console.log(`\n${ANSI.dim}(Bookings planned but import step was not run)${ANSI.reset}`);
  }

  if (skipPlan) {
    console.log(`\n${ANSI.dim}(--skip-plan: no before/after comparison)${ANSI.reset}`);
  }

  if (sessionPlan) {
    reporter?.task('sessions-plan', {
      detected: sessionPlan.legacyInRange,
      created: 0,
      updated: 0,
      skipped:
        sessionPlan.skippedPast +
        sessionPlan.skippedNoId +
        sessionPlan.skippedMissingRefs +
        sessionPlan.skippedInvalidTime,
      notes: `eligible=${sessionPlan.eligible}; excluded past=${sessionPlan.skippedPast} noId=${sessionPlan.skippedNoId} missingRefs=${sessionPlan.skippedMissingRefs} invalidTime=${sessionPlan.skippedInvalidTime}`,
    });
  }
  if (sessionImport) {
    reporter?.task('sessions-import', {
      detected: sessionPlan?.eligible ?? sessionImport.created + sessionImport.updated + sessionImport.skipped,
      created: sessionImport.created,
      updated: sessionImport.updated,
      skipped: sessionImport.skipped,
      failed: sessionImport.failed,
      notes: dryRun ? 'dry-run' : undefined,
    });
  }
  if (bookingPlan) {
    reporter?.task('bookings-plan', {
      detected: bookingPlan.legacyTotal,
      created: 0,
      updated: 0,
      skipped: bookingPlan.skippedPast + bookingPlan.skippedInvalid,
      notes: `eligible=${bookingPlan.eligible}; sessionsCounted=${bookingPlan.sessionsCounted}; excluded past=${bookingPlan.skippedPast} invalid=${bookingPlan.skippedInvalid}`,
    });
  }
  if (bookingImport) {
    reporter?.task('bookings-import', {
      detected: bookingPlan?.eligible ?? bookingImport.created + bookingImport.updated + bookingImport.skipped,
      created: bookingImport.created,
      updated: bookingImport.updated,
      skipped: bookingImport.skipped,
      notes: `sessionsProcessed=${bookingImport.sessionsProcessed}${dryRun ? '; dry-run' : ''}`,
    });
  }

  await finishMigrateReporter(reporter);
  console.log('\nDone.');
}

main()
  .catch(async (e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
