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
 * Notes:
 * - This script is best-effort: it resolves `doctor` by DB `migrateSourceId`, and resolves `department` by name,
 *   `location` by code, and `room` by number+location (when present).
 * - It matches fees in the same shape your service validates/stores:
 *   { id: string, name: string, feeType: string, localFee: number, foreignFee: number }
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

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

function parseArgs(): { wipe: boolean; doctorCode?: string } {
  const argv = process.argv.slice(2);
  const wipe = !(argv.includes('--no-wipe') || argv.includes('--keep'));
  const doctorCodeArg = argv.find((a) => a.startsWith('--doctor-code='));
  const doctorCode = doctorCodeArg ? doctorCodeArg.split('=')[1]?.trim() : undefined;
  return { wipe, doctorCode };
}

async function migrateFetch<T>(
  endpoint: string,
  listKey: string,
  params?: { id?: string; doctor?: string }
): Promise<T[]> {
  let url = `${MIGRATE_BASE_URL.replace(/\/$/, '')}/api/v1/migrate/${endpoint}?user_key=${encodeURIComponent(
    MIGRATE_USER_KEY
  )}`;
  if (params?.id) url += `&id=${encodeURIComponent(params.id)}`;
  if (params?.doctor) url += `&doctor=${encodeURIComponent(params.doctor)}`;

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

function msToDateOrInvalid(ms: unknown): Date {
  if (ms == null) return new Date(NaN);
  const n = typeof ms === 'number' ? ms : Number(ms);
  if (!Number.isFinite(n)) return new Date(NaN);
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

async function main(): Promise<void> {
  if (!MIGRATE_USER_KEY) {
    console.error('Missing MIGRATE_USER_KEY. Set it in your environment/.env.');
    process.exit(1);
  }

  const { wipe, doctorCode } = parseArgs();

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

  const doctorsFiltered = doctorCode ? doctors.filter((d) => d.code === doctorCode) : doctors;
  console.log(`Found ${doctorsFiltered.length} doctors to migrate.`);

  // Resolve reference entities once to avoid N+1 queries.
  const departments = await prisma.department.findMany({
    where: { status: 1 },
    select: { id: true, name: true },
  });
  const departmentsByName = new Map<string, string>(departments.map((d) => [d.name, d.id]));

  const locations = await prisma.location.findMany({
    where: { status: 1 },
    select: { id: true, code: true, name: true },
  });
  const locationsByCode = new Map<string, string>(locations.map((l) => [l.code, l.id]));
  const locationsByName = new Map<string, string>(locations.map((l) => [l.name, l.id]));

  const rooms = await prisma.room.findMany({
    select: { id: true, number: true, locationId: true },
  });
  const roomsByKey = new Map<string, string>(
    rooms.map((r) => [`${String(r.locationId)}::${r.number}`, r.id])
  );

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const doctor of doctorsFiltered) {
    const doctorSourceId = doctor.migrateSourceId;
    if (!doctorSourceId) continue;

    console.log(`\n[Doctor] code=${doctor.code} prismaDoctorId=${doctor.id} migrateSourceId=${doctorSourceId}`);
    console.log(`  [API] GET all-doctor-sessions?doctor=${doctorSourceId}`);

    // If the legacy API supports filtering by doctor, pass &id=<doctorSourceId>.
    // If it does not, this still works because we dedupe by time+dayType+doctorId.
    const apiSessions = await migrateFetch<SourceDoctorSession>(
      'all-doctor-sessions',
      'doctorsessionlist',
      { doctor: doctorSourceId }
    );

    console.log(`  sessions received (filtered by id): ${apiSessions.length}`);

    // Some legacy deployments may ignore/interpret the `id` filter differently.
    // If we got nothing, fall back to fetching all sessions and filter by doctor code.
    let sessionsToUse = apiSessions;
    if (apiSessions.length === 0) {
      console.warn(
        '  [warning] No sessions returned for this doctor with `id=<doctorSourceId>`. Falling back to fetching all sessions and filtering by doctor code...'
      );
      const allSessions = await migrateFetch<SourceDoctorSession>(
        'all-doctor-sessions',
        'doctorsessionlist'
      );
      console.log(`  sessions received (all): ${allSessions.length}`);
      sessionsToUse = allSessions.filter((x) => x.doctor === doctor.code);
      console.log(`  sessions after doctor-code filter: ${sessionsToUse.length}`);
    }

    // Link plan: store legacy previous-id pairs, then apply after we upsert all rows.
    // Legacy ids are Mongo ObjectId strings from Sails.
    const legacyToPrismaSessionId = new Map<string, string>();
    const linkRequests: Array<{ currentLegacyId: string | null; previousLegacyId: string | null }> = [];

    let i = 0;
    const totalSessions = sessionsToUse.length;
    for (const s of sessionsToUse) {
      i++;
      // One-by-one trail for debugging/migration verification.
      // (Keeps existing behavior; only adds logs/try-catch.)
      try {
      const legacyDoctorSessionId =
        toLegacyString(s.id) ?? toLegacyString(s.doctor_session_id) ?? null;
      const legacyPreviousDoctorSessionId = toLegacyString(s.previous_doctor_session) ?? null;

      const departmentId = departmentsByName.get(s.department);
      const locationId =
        locationsByCode.get(s.location) ?? locationsByName.get(s.location) ?? undefined;

      if (!departmentId || !locationId) {
        skipped++;
        console.warn(
          `  [skip] ${s.name}: missing department/location mapping (department="${s.department}", location="${s.location}").`
        );
        continue;
      }

      const roomStr = (s.room ?? '').toString().trim();
      const roomId =
        roomStr.length > 0
          ? roomsByKey.get(`${String(locationId)}::${roomStr}`) ?? undefined
          : undefined;

      // Prefer unix ms fields. The API may also provide `start_time`/`end_time` display strings.
      const startTime =
        msToDateOrInvalid(s.start_time_unix ?? (typeof s.start_time === 'number' ? s.start_time : undefined));
      const endTime =
        msToDateOrInvalid(s.end_time_unix ?? (typeof s.end_time === 'number' ? s.end_time : undefined));
      if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
        skipped++;
        console.warn(`  [skip] ${s.name}: invalid start_time/end_time.`);
        continue;
      }

      const applyTo =
        msToDateOrNull(s.apply_to) ?? ymdStringToUtcDateOrNull(s.apply_to_date);
      const dayType = mapApiDayType(s.day_type);

      if (dayType === 8 && !applyTo) {
        console.warn(
          '  [warning] dayType=Specific Date Only (8) but apply_to is missing/0.',
          {
            name: s.name,
            doctor: s.doctor,
            legacy_day_type: s.day_type,
            apply_to: s.apply_to,
            apply_to_date: s.apply_to_date,
          }
        );
      }

      const fees = mapApiFees(s.fees);

      const feeLocalSum = fees.reduce((acc, f) => acc + (safeNumber(f.localFee) || 0), 0);
      const feeForeignSum = fees.reduce(
        (acc, f) => acc + (safeNumber(f.foreignFee) || 0),
        0
      );

      const amountLocal = s.amount_local != null ? safeNumber(s.amount_local) : feeLocalSum;
      const amountForeign = s.amount_foreign != null ? safeNumber(s.amount_foreign) : feeForeignSum;

      const legacyScheduleId = toLegacyInt(s.schedule_id);

      // Dedupe:
      // - During wipe runs (default), we can safely insert without relying on legacy ids in the DB schema.
      // - Keep a stable time-based dedupe so re-running (without wipe) avoids duplicates.
      console.log(
        `  [Session ${i}/${totalSessions}] importing name="${s.name}" legacyCurrentId=${legacyDoctorSessionId ?? 'null'} previousLegacyId=${
          legacyPreviousDoctorSessionId ?? 'null'
        } start=${startTime.toISOString()} end=${endTime.toISOString()} dayType=${dayType} applyTo=${
          applyTo ? applyTo.toISOString() : 'null'
        } deptId=${departmentId} locId=${locationId} roomId=${roomId ?? 'null'}`
      );
      const existing = await prisma.doctorSession.findFirst({
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

      // Capture legacy id->prisma id mapping when possible for second-pass chaining.
      // If legacy ids are missing for some reason, we won't be able to chain those rows.
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
      };

      if (existing) {
        await prisma.doctorSession.update({
          where: { id: existing.id },
          data: {
            doctorId: doctor.id,
            departmentId,
            locationId,
            roomId: roomId ?? null,
            ...scalars,
            previousSessionId: null,
            updatedBy: importUser.id,
          },
        });
        updated++;
        console.log(`  [Session] updated prismaDoctorSessionId=${existing.id}`);
        if (legacyDoctorSessionId != null) {
          legacyToPrismaSessionId.set(legacyDoctorSessionId, existing.id);
        }
      } else {
        const createdRow = await prisma.doctorSession.create({
          data: {
            doctorId: doctor.id,
            departmentId,
            locationId,
            roomId: roomId ?? null,
            ...scalars,
            createdBy: importUser.id,
            updatedBy: importUser.id,
            previousSessionId: null,
          },
          select: { id: true },
        });
        created++;
        console.log(`  [Session] created prismaDoctorSessionId=${createdRow.id}`);
        if (legacyDoctorSessionId != null) {
          legacyToPrismaSessionId.set(legacyDoctorSessionId, createdRow.id);
        }
      }

      linkRequests.push({ currentLegacyId: legacyDoctorSessionId, previousLegacyId: legacyPreviousDoctorSessionId });
      } catch (e) {
        skipped++;
        const message = e instanceof Error ? e.message : String(e);
        console.error('  [Session] failed to import:', {
          name: s.name,
          legacyCurrentId: s.id ?? s.doctor_session_id ?? null,
          legacyPreviousId: s.previous_doctor_session ?? null,
          message,
        });
        // continue with next session
      }
    }

    // Second pass: set PreviousSession links using legacy Mongo ids -> prisma ids mapping.
    for (const req of linkRequests) {
      if (req.currentLegacyId == null || req.previousLegacyId == null) continue;
      const currentId = legacyToPrismaSessionId.get(req.currentLegacyId);
      const previousId = legacyToPrismaSessionId.get(req.previousLegacyId);
      if (!currentId) continue;
      if (!previousId) {
        console.warn(
          '  [warning] previous_doctor_session could not be linked (previousLegacyId not found in this doctor import).',
          { currentLegacyId: req.currentLegacyId, previousLegacyId: req.previousLegacyId }
        );
      }
      await prisma.doctorSession.update({
        where: { id: currentId },
        data: { previousSessionId: previousId ?? null },
      });
    }
  }

  console.log('\nMigration summary');
  console.log({ created, updated, skipped });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

