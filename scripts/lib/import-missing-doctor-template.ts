/**
 * Upsert DoctorSession rows by legacy template id (for migrate scripts).
 */

import { Prisma, PrismaClient } from '@prisma/client';
import { migrateFetch, retryOnConflict, safeNumber, toLegacyString } from './migrate-api';
import { resolveLegacyTemplateTimes } from './resolve-legacy-template-times';

const prisma = new PrismaClient();

export type LegacyDoctorSessionRow = {
  id?: string | null;
  doctor_session_id?: string | null;
  name: string;
  doctor: string;
  department: string;
  location: string;
  room?: string | null;
  institution: number;
  start_time: number | string;
  end_time: number | string;
  start_time_unix?: number | null;
  end_time_unix?: number | null;
  duration_minutes: number;
  starting_patient_number: number;
  max_patient_number: number;
  refundable: number;
  advanced_booking_days: number;
  fees: Array<{
    id: string | number;
    name: string;
    fee_type: string;
    local_value: number;
    foreign_value: number;
  }>;
  amount_local?: number;
  amount_foreign?: number;
  apply_to?: number | string | null;
  apply_to_date?: string | null;
  day_type?: number;
  status: number | string;
  schedule_id?: number | string | null;
};

export type TemplateImportResult = {
  created: number;
  updated: number;
  skipped: number;
};

function mapApiDayType(dayType: number | undefined): number {
  const dtOld = safeNumber(dayType);
  if (dtOld >= 0 && dtOld <= 7) return dtOld + 1;
  if (dtOld >= 1 && dtOld <= 8) return dtOld;
  return 1;
}

function mapApiFees(fees: LegacyDoctorSessionRow['fees'] | null | undefined) {
  return (fees ?? []).map((f) => ({
    id: String(f.id),
    name: f.name ?? '',
    feeType: f.fee_type ?? '',
    localFee: safeNumber(f.local_value),
    foreignFee: safeNumber(f.foreign_value),
  }));
}

function ymdStringToUtcDateOrNull(ymd: string | null | undefined): Date | null {
  if (!ymd) return null;
  const trimmed = ymd.trim();
  if (!trimmed) return null;
  return new Date(`${trimmed.slice(0, 10)}T00:00:00.000Z`);
}

function msToDateOrNull(ms: number | string | undefined | null): Date | null {
  const n = safeNumber(ms);
  if (!n) return null;
  return new Date(n >= 1e12 ? n : n * 1000);
}

async function upsertOneTemplate(
  s: LegacyDoctorSessionRow,
  importUserId: string,
  quiet: boolean
): Promise<'created' | 'updated' | 'skipped'> {
  const legacyId = toLegacyString(s.id) ?? toLegacyString(s.doctor_session_id);
  if (!legacyId) return 'skipped';

  const doctor = await prisma.doctor.findFirst({
    where: { code: s.doctor },
    select: { id: true },
  });
  if (!doctor) {
    if (!quiet) console.warn(`  skip ${legacyId}: doctor ${s.doctor} not in Next`);
    return 'skipped';
  }

  const department = await prisma.department.findFirst({
    where: { name: s.department },
    select: { id: true },
  });
  const location =
    (await prisma.location.findFirst({ where: { code: s.location }, select: { id: true } })) ??
    (await prisma.location.findFirst({ where: { name: s.location }, select: { id: true } }));

  if (!department || !location) {
    if (!quiet) {
      console.warn(`  skip ${legacyId}: dept/location ("${s.department}", "${s.location}")`);
    }
    return 'skipped';
  }

  let roomId: string | null = null;
  const roomStr = (s.room ?? '').toString().trim();
  if (roomStr) {
    const room = await prisma.room.findFirst({
      where: { locationId: location.id, number: roomStr },
      select: { id: true },
    });
    roomId = room?.id ?? null;
  }

  const resolved = resolveLegacyTemplateTimes({
    start_time_unix: s.start_time_unix,
    end_time_unix: s.end_time_unix,
    start_time: s.start_time,
    end_time: s.end_time,
    apply_to: s.apply_to,
    apply_to_date: s.apply_to_date,
    duration_minutes: s.duration_minutes,
    name: s.name,
  });
  if (!resolved) {
    if (!quiet) {
      console.warn(`  skip ${legacyId}: times unresolved (name="${s.name}")`);
    }
    return 'skipped';
  }

  const applyTo = msToDateOrNull(s.apply_to) ?? ymdStringToUtcDateOrNull(s.apply_to_date);
  const fees = mapApiFees(s.fees);
  const feeLocalSum = fees.reduce((acc, f) => acc + f.localFee, 0);
  const feeForeignSum = fees.reduce((acc, f) => acc + f.foreignFee, 0);

  const data: Prisma.DoctorSessionUncheckedCreateInput = {
    migrateSourceId: legacyId,
    name: s.name ?? '',
    institution: safeNumber(s.institution),
    startTime: resolved.startTime,
    endTime: resolved.endTime,
    durationMinutes: safeNumber(s.duration_minutes),
    startingPatientNumber: safeNumber(s.starting_patient_number),
    maxPatientNumber: safeNumber(s.max_patient_number),
    refundable: safeNumber(s.refundable),
    advancedBookingDays: safeNumber(s.advanced_booking_days),
    fees: fees as unknown as Prisma.InputJsonValue,
    amountLocal: s.amount_local != null ? safeNumber(s.amount_local) : feeLocalSum,
    amountForeign: s.amount_foreign != null ? safeNumber(s.amount_foreign) : feeForeignSum,
    applyTo,
    dayType: mapApiDayType(s.day_type),
    status: safeNumber(s.status),
    doctorId: doctor.id,
    departmentId: department.id,
    locationId: location.id,
    roomId,
    createdBy: importUserId,
    updatedBy: importUserId,
  };

  const existing = await prisma.doctorSession.findFirst({
    where: { migrateSourceId: legacyId },
    select: { id: true },
  });

  if (existing) {
    await retryOnConflict(() =>
      prisma.doctorSession.update({
        where: { id: existing.id },
        data: { ...data, updatedBy: importUserId },
      })
    );
    if (!quiet) console.log(`  ~ ${legacyId} (${s.name}) [${resolved.source}]`);
    return 'updated';
  }

  await retryOnConflict(() => prisma.doctorSession.create({ data }));
  if (!quiet) console.log(`  + ${legacyId} (${s.name}) [${resolved.source}]`);
  return 'created';
}

/** Import legacy doctor_sessions rows by Mongo template id. */
export async function importMissingDoctorTemplatesByIds(
  templateIds: string[],
  importUserId: string,
  opts: { quiet?: boolean } = {}
): Promise<TemplateImportResult> {
  const quiet = opts.quiet ?? false;
  const result: TemplateImportResult = { created: 0, updated: 0, skipped: 0 };

  for (const templateId of templateIds) {
    const rows = await migrateFetch<LegacyDoctorSessionRow>(
      'all-doctor-sessions',
      'doctorsessionlist',
      { template_id: templateId, include_unpublished: true }
    );
    const row = rows.find(
      (r) =>
        toLegacyString(r.doctor_session_id) === templateId || toLegacyString(r.id) === templateId
    );
    if (!row) {
      if (!quiet) console.warn(`  skip ${templateId}: not in legacy API`);
      result.skipped++;
      continue;
    }
    const r = await upsertOneTemplate(row, importUserId, quiet);
    if (r === 'created') result.created++;
    else if (r === 'updated') result.updated++;
    else result.skipped++;
  }
  return result;
}

type AppFee = { id: string; name: string; feeType: string; localFee: number; foreignFee: number };

export async function refreshDoctorSessionsInMaps(maps: {
  doctorSessionsBySourceId: Map<string, { id: string; fees: AppFee[] }>;
}): Promise<void> {
  const rows = await prisma.doctorSession.findMany({
    where: { migrateSourceId: { not: null } },
    select: { id: true, migrateSourceId: true, fees: true },
  });
  maps.doctorSessionsBySourceId.clear();
  for (const ds of rows) {
    if (!ds.migrateSourceId) continue;
    const fees = Array.isArray(ds.fees) ? (ds.fees as AppFee[]) : [];
    maps.doctorSessionsBySourceId.set(ds.migrateSourceId, { id: ds.id, fees });
  }
}
