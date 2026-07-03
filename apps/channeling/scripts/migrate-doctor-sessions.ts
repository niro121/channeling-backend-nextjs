/**
 * Migrate doctor schedule definitions (DoctorSession) from the legacy Sails migrate API.
 *
 * Endpoint (per user request):
 *   {{base_url}}/api/v1/migrate/all-doctor-sessions?user_key={{user_key}}[&id={{doctor-migrateSourceId}}]
 *
 * Usage:
 *   MIGRATE_BASE_URL=http://localhost:1337 MIGRATE_USER_KEY=... npx tsx scripts/migrate-doctor-sessions.ts
 *
 * By default it wipes all existing `DoctorSession` rows before importing.
 * To skip wiping:
 *   npx tsx scripts/migrate-doctor-sessions.ts --no-wipe
 *
 * Specific-date schedules (dayType 8 / legacy day_type 7) with applyTo before today
 * (Sri Lanka calendar) are skipped to reduce noise. Use --include-past to import all.
 *
 * Default migrate API returns published templates only (status=1). Use --include-unpublished
 * so sessions that reference inactive legacy templates can resolve (restart Sails after API change).
 *
 * Doctors are processed in parallel (default 10 at a time). Override: --concurrency=5
 *
 * Notes:
 * - This script is best-effort: it resolves `doctor` by DB `migrateSourceId`, and resolves `department` by name,
 *   `location` by code, and `room` by number+location (when present).
 * - It matches fees in the same shape your service validates/stores:
 *   { id: string, name: string, feeType: string, localFee: number, foreignFee: number }
 */

import 'dotenv/config';
import moment from 'moment';
import { PrismaClient } from '@prisma/client';
import { resolveLegacyTemplateTimes } from './lib/resolve-legacy-template-times';
import {
  createMigrateReporter,
  finishMigrateReporter,
} from './lib/migrate-report';

const prisma = new PrismaClient();

const MIGRATE_BASE_URL = process.env.MIGRATE_BASE_URL || 'http://localhost:1337';
const MIGRATE_USER_KEY = process.env.MIGRATE_USER_KEY || '';
const IMPORT_USER_EMAIL = 'developer@archmage.lk';

type SourceFee = {
  id: string | number;
  name: string;
  fee_type: string;
  local_value: number;
  foreign_value: number;
};

type SourceDoctorSession = {
  // Legacy schedule row identifier (Mongo id string in the Sails migration response).
  id?: string | null;
  doctor_session_id?: string | null;

  // Numeric schedule_id if present in legacy data (often 0 / null).
  schedule_id?: number | string | null;

  name: string;
  doctor: string; // doctor code, e.g. DR0009
  department: string;
  location: string; // expected to match Location.code (e.g. RH)
  room?: string | null;
  institution: number;
  // For migrate API:
  // - `start_time`/`end_time` are now AM/PM display strings
  // - keep unix ms in `start_time_unix`/`end_time_unix` for migration logic
  start_time: number | string; // display hh:mm A
  end_time: number | string; // display hh:mm A
  start_time_unix?: number | null;
  end_time_unix?: number | null;
  duration_minutes: number;
  starting_patient_number: number;
  max_patient_number: number;
  refundable: number;
  advanced_booking_days: number;
  fees: SourceFee[];
  amount_local?: number;
  amount_foreign?: number;
  apply_to?: number | string | null; // unix ms
  apply_to_date?: string | null; // formatted as YYYY-MM-DD from migrate API
  day_type?: number; // legacy day type (observed: 0..7)
  status: number;

  // Optional legacy fields (not always returned by your sample)
  previous_doctor_session?: string | null;
  previous_schedule_id?: number | string | null;
};

/** dayType 8 = Specific Date Only (legacy day_type 7). */
const SPECIFIC_DATE_DAY_TYPE = 8;
const SL_OFFSET_MINUTES = 330;
const DEFAULT_DOCTOR_CONCURRENCY = 10;

type DoctorRow = { id: string; code: string; migrateSourceId: string | null };

type RefMaps = {
  departmentsByName: Map<string, string>;
  locationsByCode: Map<string, string>;
  locationsByName: Map<string, string>;
  roomsByKey: Map<string, string>;
};

type DoctorMigrateStats = {
  created: number;
  updated: number;
  skipped: number;
  skippedPastSpecificDate: number;
};

/** Shared fallback when per-doctor API filter returns no rows (single fetch for all doctors). */
let allDoctorSessionsFallback: Promise<SourceDoctorSession[]> | null = null;
let allDoctorSessionsFallbackKey = '';

function getAllDoctorSessionsFallback(includeUnpublished: boolean): Promise<SourceDoctorSession[]> {
  const key = includeUnpublished ? 'unpub' : 'pub';
  if (!allDoctorSessionsFallback || allDoctorSessionsFallbackKey !== key) {
    allDoctorSessionsFallbackKey = key;
    allDoctorSessionsFallback = migrateFetch<SourceDoctorSession>('all-doctor-sessions', 'doctorsessionlist', {
      include_unpublished: includeUnpublished,
    });
  }
  return allDoctorSessionsFallback;
}

function todayYmdSriLanka(): string {
  return moment().utcOffset(SL_OFFSET_MINUTES).format('YYYY-MM-DD');
}

function applyToYmd(applyTo: Date): string {
  return applyTo.toISOString().slice(0, 10);
}

function parseArgs(): {
  wipe: boolean;
  doctorCode?: string;
  includePast: boolean;
  includeUnpublished: boolean;
  concurrency: number;
  verbose: boolean;
} {
  const argv = process.argv.slice(2);
  const wipe = !(argv.includes('--no-wipe') || argv.includes('--keep'));
  const includePast = argv.includes('--include-past');
  const includeUnpublished = argv.includes('--include-unpublished');
  const verbose = argv.includes('--verbose');
  const doctorCodeArg = argv.find((a) => a.startsWith('--doctor-code='));
  const doctorCode = doctorCodeArg ? doctorCodeArg.split('=')[1]?.trim() : undefined;
  const concurrencyArg = argv.find((a) => a.startsWith('--concurrency='));
  let concurrency = DEFAULT_DOCTOR_CONCURRENCY;
  if (concurrencyArg) {
    const n = Number(concurrencyArg.split('=')[1]?.trim());
    if (Number.isFinite(n) && n >= 1) concurrency = Math.floor(n);
  }
  return { wipe, doctorCode, includePast, includeUnpublished, concurrency, verbose };
}

function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
}

/** Retry Prisma writes on P2034 when running doctors in parallel. */
async function retryOnConflict<T>(
  fn: () => Promise<T>,
  opts: { maxAttempts?: number; delayMs?: number } = {}
): Promise<T> {
  const maxAttempts = opts.maxAttempts ?? 5;
  const delayMs = opts.delayMs ?? 80;
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e: unknown) {
      lastError = e;
      const code = (e as { code?: string })?.code;
      if (code === 'P2034' && attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, delayMs * attempt));
        continue;
      }
      throw e;
    }
  }
  throw lastError;
}

async function migrateFetch<T>(
  endpoint: string,
  listKey: string,
  params?: { id?: string; doctor?: string; template_id?: string; include_unpublished?: boolean }
): Promise<T[]> {
  let url = `${MIGRATE_BASE_URL.replace(/\/$/, '')}/api/v1/migrate/${endpoint}?user_key=${encodeURIComponent(
    MIGRATE_USER_KEY
  )}`;
  if (params?.id) url += `&id=${encodeURIComponent(params.id)}`;
  if (params?.doctor) url += `&doctor=${encodeURIComponent(params.doctor)}`;
  if (params?.template_id) url += `&template_id=${encodeURIComponent(params.template_id)}`;
  if (params?.include_unpublished) url += `&include_unpublished=1`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);

  const data = (await res.json()) as { status: boolean; error_code: number } & Record<string, T[]>;
  if (data.error_code !== 0) throw new Error(`API error_code ${data.error_code}: ${url}`);

  const list = data[listKey];
  return Array.isArray(list) ? list : [];
}

function safeNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function mapApiFees(fees: SourceFee[] | null | undefined) {
  const list = fees ?? [];
  return list.map((f) => ({
    id: String(f.id),
    name: f.name ?? '',
    feeType: f.fee_type ?? '',
    localFee: safeNumber(f.local_value),
    foreignFee: safeNumber(f.foreign_value),
  }));
}

/**
 * Map legacy `day_type` -> our `DoctorSession.dayType`.
 *
 * Old system (WEEK_DAY_TYPES):
 *   0=Sunday, 1=Monday, ..., 6=Saturday, 7=Specific Date Only
 *
 * New system:
 *   1=Sunday, 2=Monday, ..., 7=Saturday, 8=Specific Date Only
 *
 * So for legacy ids 0..7 we do: newDayType = oldDayType + 1
 */
function mapApiDayType(dayType: number | undefined): number {
  const dtOld = safeNumber(dayType);
  if (dtOld >= 0 && dtOld <= 7) return dtOld + 1;
  // Fallback: if API already matches the new range (1..8), keep it.
  if (dtOld >= 1 && dtOld <= 8) return dtOld;
  return 1;
}

function ymdStringToUtcDateOrNull(ymd: string | null | undefined): Date | null {
  if (!ymd) return null;
  const trimmed = ymd.trim();
  if (!trimmed) return null;
  // Interpret as UTC midnight to keep the legacy date stable across timezones.
  return new Date(`${trimmed}T00:00:00.000Z`);
}

function msToDateOrNull(ms: number | string | undefined | null): Date | null {
  const n = safeNumber(ms);
  if (!n) return null;
  return new Date(n);
}

function toLegacyString(value: unknown): string | null {
  if (value == null) return null;
  const s = typeof value === 'string' ? value : String(value);
  const trimmed = s.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toLegacyInt(value: unknown): number | null {
  if (value == null) return null;
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.floor(n);
}

async function migrateOneDoctor(
  doctor: DoctorRow,
  ctx: {
    maps: RefMaps;
    importUserId: string;
    todayYmd: string;
    includePast: boolean;
    includeUnpublished: boolean;
    verbose: boolean;
  }
): Promise<DoctorMigrateStats> {
  const stats: DoctorMigrateStats = {
    created: 0,
    updated: 0,
    skipped: 0,
    skippedPastSpecificDate: 0,
  };

  const doctorSourceId = doctor.migrateSourceId;
  if (!doctorSourceId) return stats;

  const { maps, importUserId, todayYmd, includePast, includeUnpublished, verbose } = ctx;
  const { departmentsByName, locationsByCode, locationsByName, roomsByKey } = maps;

  console.log(`[Doctor] code=${doctor.code} migrateSourceId=${doctorSourceId}`);

  let sessionsToUse = await migrateFetch<SourceDoctorSession>(
    'all-doctor-sessions',
    'doctorsessionlist',
    { doctor: doctorSourceId, include_unpublished: includeUnpublished }
  );

  if (sessionsToUse.length === 0) {
    const allSessions = await getAllDoctorSessionsFallback(includeUnpublished);
    sessionsToUse = allSessions.filter((x) => x.doctor === doctor.code);
    if (verbose) {
      console.log(`  [${doctor.code}] fallback filter: ${sessionsToUse.length} sessions`);
    }
  } else if (verbose) {
    console.log(`  [${doctor.code}] API sessions: ${sessionsToUse.length}`);
  }

  const legacyToPrismaSessionId = new Map<string, string>();
  const linkRequests: Array<{ currentLegacyId: string | null; previousLegacyId: string | null }> =
    [];

  for (const s of sessionsToUse) {
    try {
      const legacyDoctorSessionId =
        toLegacyString(s.id) ?? toLegacyString(s.doctor_session_id) ?? null;
      const legacyPreviousDoctorSessionId = toLegacyString(s.previous_doctor_session) ?? null;

      const departmentId = departmentsByName.get(s.department);
      const locationId =
        locationsByCode.get(s.location) ?? locationsByName.get(s.location) ?? undefined;

      if (!departmentId || !locationId) {
        stats.skipped++;
        console.warn(
          `  [${doctor.code}] skip ${s.name}: missing department/location ("${s.department}", "${s.location}")`
        );
        continue;
      }

      const roomStr = (s.room ?? '').toString().trim();
      const roomId =
        roomStr.length > 0
          ? roomsByKey.get(`${String(locationId)}::${roomStr}`) ?? undefined
          : undefined;

      const resolvedTimes = resolveLegacyTemplateTimes({
        start_time_unix: s.start_time_unix,
        end_time_unix: s.end_time_unix,
        start_time: s.start_time,
        end_time: s.end_time,
        apply_to: s.apply_to,
        apply_to_date: s.apply_to_date,
        duration_minutes: s.duration_minutes,
        name: s.name,
      });
      if (!resolvedTimes) {
        stats.skipped++;
        console.warn(
          `  [${doctor.code}] skip ${s.name}: invalid start/end time (unix=${s.start_time_unix ?? 0} display="${s.start_time}/${s.end_time}")`
        );
        continue;
      }
      const { startTime, endTime } = resolvedTimes;

      const applyTo =
        msToDateOrNull(s.apply_to) ?? ymdStringToUtcDateOrNull(s.apply_to_date);
      const dayType = mapApiDayType(s.day_type);

      if (
        !includePast &&
        dayType === SPECIFIC_DATE_DAY_TYPE &&
        applyTo &&
        applyToYmd(applyTo) < todayYmd
      ) {
        stats.skipped++;
        stats.skippedPastSpecificDate++;
        continue;
      }

      const fees = mapApiFees(s.fees);
      const feeLocalSum = fees.reduce((acc, f) => acc + (safeNumber(f.localFee) || 0), 0);
      const feeForeignSum = fees.reduce((acc, f) => acc + (safeNumber(f.foreignFee) || 0), 0);
      const amountLocal = s.amount_local != null ? safeNumber(s.amount_local) : feeLocalSum;
      const amountForeign = s.amount_foreign != null ? safeNumber(s.amount_foreign) : feeForeignSum;
      const legacyScheduleId = toLegacyInt(s.schedule_id);

      let existing: { id: string } | null = null;
      if (legacyDoctorSessionId) {
        existing = await prisma.doctorSession.findFirst({
          where: { migrateSourceId: legacyDoctorSessionId },
          select: { id: true },
        });
      }
      if (!existing) {
        existing = await prisma.doctorSession.findFirst({
          where: {
            doctorId: doctor.id,
            startTime,
            endTime,
            dayType,
            institution: safeNumber(s.institution),
            departmentId,
            locationId,
            roomId: roomId ?? null,
          },
          select: { id: true },
        });
      }

      const scalars = {
        name: s.name ?? '',
        institution: safeNumber(s.institution),
        startTime,
        endTime,
        durationMinutes: safeNumber(s.duration_minutes),
        startingPatientNumber: safeNumber(s.starting_patient_number),
        maxPatientNumber: safeNumber(s.max_patient_number),
        refundable: safeNumber(s.refundable),
        advancedBookingDays: safeNumber(s.advanced_booking_days),
        fees,
        amountLocal,
        amountForeign,
        applyTo,
        dayType,
        status: safeNumber(s.status),
        ...(legacyScheduleId != null ? { scheduleId: legacyScheduleId } : {}),
        ...(legacyDoctorSessionId ? { migrateSourceId: legacyDoctorSessionId } : {}),
      };

      if (existing) {
        await retryOnConflict(() =>
          prisma.doctorSession.update({
            where: { id: existing!.id },
            data: {
              doctorId: doctor.id,
              departmentId,
              locationId,
              roomId: roomId ?? null,
              ...scalars,
              previousSessionId: null,
              updatedBy: importUserId,
            },
          })
        );
        stats.updated++;
        if (legacyDoctorSessionId != null) {
          legacyToPrismaSessionId.set(legacyDoctorSessionId, existing.id);
        }
      } else {
        const createdRow = await retryOnConflict(() =>
          prisma.doctorSession.create({
            data: {
              doctorId: doctor.id,
              departmentId,
              locationId,
              roomId: roomId ?? null,
              ...scalars,
              createdBy: importUserId,
              updatedBy: importUserId,
              previousSessionId: null,
            },
            select: { id: true },
          })
        );
        stats.created++;
        if (legacyDoctorSessionId != null) {
          legacyToPrismaSessionId.set(legacyDoctorSessionId, createdRow.id);
        }
      }

      linkRequests.push({
        currentLegacyId: legacyDoctorSessionId,
        previousLegacyId: legacyPreviousDoctorSessionId,
      });
    } catch (e) {
      stats.skipped++;
      console.error(`  [${doctor.code}] session failed:`, {
        name: s.name,
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  for (const req of linkRequests) {
    if (req.currentLegacyId == null || req.previousLegacyId == null) continue;
    const currentId = legacyToPrismaSessionId.get(req.currentLegacyId);
    const previousId = legacyToPrismaSessionId.get(req.previousLegacyId);
    if (!currentId) continue;
    await retryOnConflict(() =>
      prisma.doctorSession.update({
        where: { id: currentId },
        data: { previousSessionId: previousId ?? null },
      })
    );
  }

  console.log(
    `  [${doctor.code}] done: +${stats.created} ~${stats.updated} skip=${stats.skipped}` +
      (stats.skippedPastSpecificDate > 0 ? ` pastSpecific=${stats.skippedPastSpecificDate}` : '')
  );

  return stats;
}

async function main(): Promise<void> {
  if (!MIGRATE_USER_KEY) {
    console.error('Missing MIGRATE_USER_KEY. Set it in your environment/.env.');
    process.exit(1);
  }

  const { wipe, doctorCode, includePast, includeUnpublished, concurrency, verbose } = parseArgs();
  const todayYmd = todayYmdSriLanka();
  const reporter = createMigrateReporter('migrate-doctor-sessions', {
    doctorFilter: doctorCode ?? '',
    includePast: String(includePast),
    includeUnpublished: String(includeUnpublished),
    concurrency: String(concurrency),
  });

  const importUser = await prisma.user.findUnique({
    where: { email: IMPORT_USER_EMAIL },
    select: { id: true },
  });
  if (!importUser) {
    console.error(`Import user not found: ${IMPORT_USER_EMAIL}. Create it first.`);
    process.exit(1);
  }

  if (wipe) {
    console.log('[wipe] Deleting existing DoctorSession rows...');
    // Prisma blocks deleting DoctorSession rows that are referenced by the self-relation
    // `PreviousSession` (DoctorSession.previousSessionId). Clear the link first.
    await prisma.doctorSession.updateMany({
      where: { previousSessionId: { not: null } },
      data: { previousSessionId: null },
    });
    await prisma.doctorSession.deleteMany({});
  }

  const doctors = await prisma.doctor.findMany({
    where: { status: 1, migrateSourceId: { not: null } },
    select: { id: true, code: true, migrateSourceId: true },
    orderBy: { name: 'asc' },
  });

  const doctorsFiltered = (doctorCode ? doctors.filter((d) => d.code === doctorCode) : doctors).filter(
    (d) => d.migrateSourceId
  );
  console.log(
    `Found ${doctorsFiltered.length} doctors to migrate (concurrency=${concurrency}).`
  );

  const maps: RefMaps = {
    departmentsByName: new Map(),
    locationsByCode: new Map(),
    locationsByName: new Map(),
    roomsByKey: new Map(),
  };

  // Match session import: resolve dept/location by name/code without status filter
  // (inactive locations like RHM were skipped before, blocking templates while sessions still imported).
  const departments = await prisma.department.findMany({
    select: { id: true, name: true },
  });
  maps.departmentsByName = new Map(departments.map((d) => [d.name, d.id]));

  const locations = await prisma.location.findMany({
    select: { id: true, code: true, name: true },
  });
  maps.locationsByCode = new Map(locations.map((l) => [l.code, l.id]));
  maps.locationsByName = new Map(locations.map((l) => [l.name, l.id]));

  const rooms = await prisma.room.findMany({
    select: { id: true, number: true, locationId: true },
  });
  maps.roomsByKey = new Map(rooms.map((r) => [`${String(r.locationId)}::${r.number}`, r.id]));

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let skippedPastSpecificDate = 0;

  if (!includePast) {
    console.log(
      `Skipping Specific Date Only schedules (dayType ${SPECIFIC_DATE_DAY_TYPE}) with applyTo before ${todayYmd}. Use --include-past to import all.\n`
    );
  }
  if (includeUnpublished) {
    console.log('Including unpublished/inactive legacy templates (include_unpublished).\n');
  } else {
    console.log(
      'Only published legacy templates (status=1). Use --include-unpublished if sessions fail on missing doctorSession.\n'
    );
  }

  const ctx = {
    maps,
    importUserId: importUser.id,
    todayYmd,
    includePast,
    includeUnpublished,
    verbose,
  };
  const batches = chunk(doctorsFiltered, concurrency);

  for (let b = 0; b < batches.length; b++) {
    const batch = batches[b];
    console.log(`\n[Batch ${b + 1}/${batches.length}] ${batch.length} doctors in parallel...`);
    const results = await Promise.all(batch.map((doctor) => migrateOneDoctor(doctor, ctx)));
    for (const r of results) {
      created += r.created;
      updated += r.updated;
      skipped += r.skipped;
      skippedPastSpecificDate += r.skippedPastSpecificDate;
    }
  }

  console.log('\nMigration summary');
  console.log({
    created,
    updated,
    skipped,
    ...(skippedPastSpecificDate > 0
      ? { skippedPastSpecificDate: `${skippedPastSpecificDate} (applyTo < ${todayYmd})` }
      : {}),
  });

  const detectedNote = includeUnpublished
    ? 'all legacy templates (include_unpublished)'
    : 'published legacy templates only (status=1)';
  reporter?.task('doctor-sessions', {
    detected: doctorsFiltered.length,
    created,
    updated,
    skipped,
    notes: [
      detectedNote,
      !includePast ? `skippedPastSpecificDate=${skippedPastSpecificDate} (applyTo < ${todayYmd})` : undefined,
      `doctorsProcessed=${doctorsFiltered.length}`,
    ]
      .filter(Boolean)
      .join('; '),
  });
  await finishMigrateReporter(reporter);
}

main()
  .catch(async (e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

