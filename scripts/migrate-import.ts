/**
 * Migrate API import script.
 * Imports data from Sails Migrate API into the Next.js Prisma (MongoDB) database.
 *
 * Usage:
 *   npm run migrate:all                              # full pipeline (recommended)
 *   npm run migrate:import
 *   npm run migrate:import -- --flush                    # Flush tables then import (no prompt)
 *   npm run migrate:import -- --no-flush                 # Import only, do not delete
 *   npm run migrate:import -- --only=specialities       # Run only specialities (then exit)
 * Report state in temp/ is cleared automatically at the start of each migrate:import run.
 * Steps 2–3 append to the same temp/migrate-report.xlsx (set MIGRATE_REPORT=0 to disable).
 *   npm run migrate:import -- --flush --only=specialities  # Flush, then import only specialities
 *
 * Steps for --only (comma-separated): specialities, doctors, departments, locations, zones, rooms, tags, discounts, agencies, staff.
 * Zones: imported from API (all-zones, zonelist) per MIGRATE_API_IMPORT_GUIDE; fallback to one Default zone per location if API returns none.
 *
 * All created/updated-by fields are set to the user with email developer@archmage.lk (must exist).
 *
 * Env (set in .env or shell):
 *   MIGRATE_BASE_URL  - e.g. http://localhost:1337
 *   MIGRATE_USER_KEY  - API key (user_key query param). Required.
 *   MONGODB_URI       - used by Prisma
 *
 * See: node/ruhunu-backend-channeling-sails/migrate/MIGRATE_API_IMPORT_GUIDE.md
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as readline from 'readline';
import { DiscountMethod, PaymentType } from '@prisma/client';
import { getTitleNameById } from '@/types/doctor';
import {
  createMigrateReporter,
  finishMigrateReporter,
  resetMigrateReportState,
  type MigrateReporter,
  type MigrateTaskStats,
} from './lib/migrate-report';

const prisma = new PrismaClient();

/** Run an async operation, retrying on Prisma P2034 (write conflict/deadlock). */
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

function safeNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

const BASE_URL = process.env.MIGRATE_BASE_URL || 'http://localhost:1337';
const USER_KEY = process.env.MIGRATE_USER_KEY || '';
const IMPORT_USER_EMAIL = 'developer@archmage.lk';

// --- API types (from MIGRATE_API_IMPORT_GUIDE.md) ---
type MigrateResponse<T> = {
  status: boolean;
  version: number;
  error_code: number;
} & Record<string, T[]>;

async function migrateFetch<T>(
  endpoint: string,
  listKey: string,
  params?: { id?: string }
): Promise<T[]> {
  let url = `${BASE_URL.replace(/\/$/, '')}/api/v1/migrate/${endpoint}?user_key=${encodeURIComponent(USER_KEY)}`;
  if (params?.id) url += `&id=${encodeURIComponent(params.id)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  const data = (await res.json()) as MigrateResponse<T>;
  if (data.error_code !== 0) {
    if (data.error_code === 1) {
      throw new Error(`Invalid or missing user_key. Check MIGRATE_USER_KEY matches Sails config/custom.js API_KEY. URL: ${url}`);
    }
    if (data.error_code === 2) {
      throw new Error(
        `Legacy migrate API failed while querying the database (error_code 2). ` +
          `The API key is valid; check the Sails server terminal for the logged error. ` +
          `Common causes: MongoDB not running, wrong connection URL (e.g. NODE_ENV=production with mongodb://root@localhost), or empty DB. URL: ${url}`
      );
    }
    throw new Error(`API error_code ${data.error_code}: ${url}`);
  }
  const list = data[listKey];
  return Array.isArray(list) ? list : [];
}

const ALL_STEPS = [
  'specialities',
  'doctors',
  'departments',
  'locations',
  'zones',
  'rooms',
  'tags',
  'discounts',
  'agencies',
  'staff',
] as const;
type StepName = (typeof ALL_STEPS)[number];

function parseArgs(): {
  flush: boolean | null;
  only: StepName[] | null;
} {
  const argv = process.argv.slice(2);
  let flush: boolean | null = null;
  let only: StepName[] | null = null;
  for (const arg of argv) {
    if (arg === '--flush') flush = true;
    else if (arg === '--no-flush') flush = false;
    else if (arg.startsWith('--only=')) {
      const val = arg.slice(7).trim();
      const steps = val ? val.split(',').map((s) => s.trim().toLowerCase()) : [];
      const valid = steps.filter((s): s is StepName => ALL_STEPS.includes(s as StepName));
      if (valid.length) only = valid;
    }
  }
  return { flush, only };
}

// --- Prompt ---
function ask(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve((answer || '').trim().toLowerCase());
    });
  });
}

async function deleteMigrateTables(): Promise<void> {
  console.log('Deleting existing data in migrate-related tables...');
  const r0a = await prisma.receipt.deleteMany({});
  console.log('  receipt:', r0a.count);
  const r0b = await prisma.booking.deleteMany({});
  console.log('  booking:', r0b.count);
  const rUserStaff = await prisma.user.updateMany({
    where: { staffId: { not: null } },
    data: { staffId: null },
  });
  console.log('  user.staffId cleared:', rUserStaff.count);
  const rStaff = await prisma.staff.deleteMany({});
  console.log('  staff:', rStaff.count);
  const r1 = await prisma.session.deleteMany({});
  console.log('  session:', r1.count);
  await prisma.doctorSession.updateMany({ where: {}, data: { previousSessionId: null } });
  const r2 = await prisma.doctorSession.deleteMany({});
  console.log('  doctorSession:', r2.count);
  const r3 = await prisma.agencyBook.deleteMany({});
  console.log('  agencyBook:', r3.count);
  const r4 = await prisma.log.deleteMany({});
  console.log('  log:', r4.count);
  const r5 = await prisma.agency.deleteMany({});
  console.log('  agency:', r5.count);
  const r6 = await prisma.voucherCode.deleteMany({});
  console.log('  voucherCode:', r6.count);
  const r7 = await prisma.discount.deleteMany({});
  console.log('  discount:', r7.count);
  const r8 = await prisma.room.deleteMany({});
  console.log('  room:', r8.count);
  const r9 = await prisma.zone.deleteMany({});
  console.log('  zone:', r9.count);
  // Location is referenced by live User/Till rows (onDelete: NoAction on User.userLocationId).
  await prisma.shiftHandover.updateMany({
    where: { forwardedToHandoverId: { not: null } },
    data: { forwardedToHandoverId: null },
  });
  const rSh = await prisma.shiftHandover.deleteMany({});
  console.log('  shiftHandover:', rSh.count);
  const rShift = await prisma.shift.deleteMany({});
  console.log('  shift:', rShift.count);
  const rTill = await prisma.till.deleteMany({});
  console.log('  till:', rTill.count);
  const rUbl = await prisma.userBookingLocation.deleteMany({});
  console.log('  userBookingLocation:', rUbl.count);
  const rUserLoc = await prisma.user.updateMany({
    where: { userLocationId: { not: null } },
    data: { userLocationId: null },
  });
  console.log('  user.userLocationId cleared:', rUserLoc.count);
  const r10 = await prisma.location.deleteMany({});
  console.log('  location:', r10.count);
  const r11 = await prisma.doctor.deleteMany({});
  console.log('  doctor:', r11.count);
  const r12 = await prisma.department.deleteMany({});
  console.log('  department:', r12.count);
  const r13 = await prisma.speciality.deleteMany({});
  console.log('  speciality:', r13.count);
  // Tags are referenced by BankAccount (onDelete: Restrict) and Patient.area.
  const rBank = await prisma.bankAccount.deleteMany({});
  console.log('  bankAccount:', rBank.count);
  const rPatientArea = await prisma.patient.updateMany({
    where: { areaId: { not: null } },
    data: { areaId: null },
  });
  console.log('  patient.areaId cleared:', rPatientArea.count);
  const r14 = await prisma.tag.deleteMany({});
  console.log('  tag:', r14.count);
  console.log('Done.\n');
}

// --- Import steps ---
type SourceSpeciality = { id: string; name: string; code: string; description?: string; status: number };
type SourceDoctor = {
  id: string; title: string | number; name: string; code: string; order: number; phone?: string; fax?: string; mobile?: string;
  address_line_01?: string; address_line_02?: string; city?: string; registration_number?: string; qualification?: string;
  referral_charge?: number; session_no_prefix?: string; speciality?: string; speciality_id: string; status: number;
};
type SourceDepartment = { id: string; name: string; description?: string; institution?: string; status: string };
type SourceLocation = {
  id: string; name: string; code?: string; address_line_01?: string; address_line_02?: string; city?: string;
  branch_type?: number; status: number;
};
type SourceZone = { id: string; name: string; description?: string; status: number; location: string };
/** Room list item: location and zone are source system ids (same as Location/Zone migrateSourceId). */
type SourceRoom = {
  id: string;
  number: string;
  description?: string;
  status: number;
  location: string; // source location id → resolve via locationIdMap
  zone: string | { id?: string }; // source zone id (migrateSourceId) → resolve via zoneIdMap
};
/** Old system: taglist items are type definitions (id 0=City, 1=Staff Category, 2=Staff Designation, 3=Staff Grade, 4=Bank). id is the type. */
type SourceTag = { id: string | number; name: string; type?: number; status?: number };
type SourceDiscount = {
  id: string; name: string; discount_type: number; discount_method: number; payment_type?: number;
  discount_value: number; discount_value_foreign: number; from_date: number; to_date: number;
  is_voucher: number; auto_apply?: boolean; status: number; apply_to?: number;
};
type SourceAgency = {
  id: string; name: string; cheque_printing_name?: string; code?: string; credit_limit?: number;
  allowed_credit_limit?: number; max_credit_limit?: number; balance?: number; phone?: string; memo?: string;
  mobile?: string; fax?: string; email?: string; address_line_01?: string; address_line_02?: string; city?: string;
  website?: string; contact_person_name?: string; contact_person_phone?: string; contact_person_mobile?: string;
  contact_person_email?: string; send_sms?: number; status: number; parent_agency?: string;
};

const DISCOUNT_METHOD_MAP: Record<number, DiscountMethod> = {
  0: 'POS',
  1: 'ON_CALL',
  2: 'AGENT',
  3: 'STAFF',
  4: 'API'
};
const PAYMENT_TYPE_MAP: Record<number, PaymentType> = {
  0: 'CASH',
  1: 'CREDIT_CARD',
  2: 'SLIP',
  3: 'CHEQUE'
};

/** Build source speciality id -> target id map from DB. Uses migrateSourceId so every migrated speciality is in the map (even if not returned by API). Falls back to code match for records without migrateSourceId. */
async function getSpecialityIdMapFromDb(): Promise<Map<string, string>> {
  const dbList = await prisma.speciality.findMany({
    select: { id: true, code: true, migrateSourceId: true }
  });
  const map = new Map<string, string>();
  for (const r of dbList) {
    if (r.migrateSourceId) map.set(r.migrateSourceId, r.id);
  }
  if (map.size > 0) return map;
  // Fallback: no migrateSourceIds (e.g. pre-migrate data) – build from API + code
  const list = await migrateFetch<SourceSpeciality>('all-specialties', 'specialitylist');
  const codeToId = new Map(dbList.map((r) => [r.code, r.id]));
  for (const s of list) {
    const targetId = codeToId.get(s.code ?? '');
    if (targetId) map.set(s.id, targetId);
  }
  return map;
}

async function importSpecialities(importUserId: string): Promise<{
  map: Map<string, string>;
  stats: MigrateTaskStats;
}> {
  const list = await migrateFetch<SourceSpeciality>('all-specialties', 'specialitylist');
  const map = new Map<string, string>();
  let created = 0;
  for (const s of list) {
    const row = await retryOnConflict(() =>
      prisma.speciality.create({
        data: {
          name: s.name || '',
          code: s.code || `S${s.id}`,
          description: s.description ?? '',
          status: s.status ?? 0,
          migrateSourceId: s.id,
          createdBy: importUserId,
          updatedBy: importUserId
        }
      })
    );
    map.set(s.id, row.id);
    created++;
  }
  console.log(`  Specialities: ${list.length}`);
  return {
    map,
    stats: { detected: list.length, created, updated: 0, skipped: 0 },
  };
}

/** Fetch one speciality by source id from API; create in DB if found and return target id. Updates map in place. */
async function ensureSpecialityInMap(
  sourceId: string,
  map: Map<string, string>,
  importUserId: string
): Promise<string | null> {
  const existing = map.get(sourceId);
  if (existing) return existing;
  const list = await migrateFetch<SourceSpeciality>('all-specialties', 'specialitylist', { id: sourceId });
  const s = list[0];
  if (!s) return null;
  const created = await retryOnConflict(() =>
    prisma.speciality.create({
      data: {
        name: s.name || '',
        code: s.code || `S${s.id}`,
        description: s.description ?? '',
        status: s.status ?? 0,
        migrateSourceId: s.id,
        createdBy: importUserId,
        updatedBy: importUserId
      }
    })
  );
  map.set(s.id, created.id);
  return created.id;
}

async function importDoctors(
  specialityIdMap: Map<string, string>,
  importUserId: string,
  reporter: MigrateReporter | null
): Promise<MigrateTaskStats> {
  const list = await migrateFetch<SourceDoctor>('all-doctors', 'doctorlist');
  let created = 0;
  let skipped = 0;
  for (const d of list) {
    let specialityId = specialityIdMap.get(d.speciality_id);
    if (!specialityId) {
      specialityId = await ensureSpecialityInMap(d.speciality_id, specialityIdMap, importUserId) ?? undefined;
    }
    if (!specialityId) {
      const msg = `specialty ${d.speciality_id} not found`;
      console.warn(`  Skip doctor ${d.id} (${d.name}): ${msg}`);
      reporter?.issue('doctors', 'missing_speciality', d.code ?? d.id, `${d.name}: ${msg}`);
      skipped++;
      continue;
    }
    try {
      const titleName = getTitleNameById(d.title) ?? (typeof d.title === 'string' ? d.title : '');
      await retryOnConflict(() =>
        prisma.doctor.create({
          data: {
            title: titleName || 'OTHER',
            name: d.name ?? '',
            code: d.code ?? `D${d.id}`,
            order: d.order ?? 0,
            phone: d.phone ?? null,
            fax: d.fax ?? null,
            mobile: d.mobile ? String(d.mobile).trim() || null : null,
            addressLine1: d.address_line_01 ?? null,
            addressLine2: d.address_line_02 ?? null,
            city: d.city ?? null,
            registrationNumber: d.registration_number ? String(d.registration_number).trim() || null : null,
            qualification: d.qualification ?? '',
            referralCharge: Number(d.referral_charge) ?? 0,
            sessionNoPrefix: d.session_no_prefix ?? null,
            status: d.status ?? 0,
            specialityId,
            migrateSourceId: d.id,
            createdBy: importUserId,
            updatedBy: importUserId
          }
        })
      );
      created++;
    } catch (e: any) {
      if (e?.code === 'P2002') {
        const target = e?.meta?.target ?? 'unique constraint';
        const msg = `duplicate ${target}`;
        console.warn(`  Skip doctor ${d.id} (${d.name}): ${msg}`);
        reporter?.issue('doctors', 'duplicate_code', d.code ?? d.id, `${d.name}: ${msg}`);
        skipped++;
      } else {
        throw e;
      }
    }
  }
  console.log(`  Doctors: ${list.length} imported${skipped > 0 ? `, ${skipped} skipped` : ''}`);
  return { detected: list.length, created, updated: 0, skipped };
}

async function importDepartments(): Promise<MigrateTaskStats> {
  const list = await migrateFetch<SourceDepartment>('all-departments', 'departmentlist');
  let created = 0;
  for (const d of list) {
    await retryOnConflict(() =>
      prisma.department.create({
        data: {
          name: d.name ?? '',
          description: d.description ?? null,
          status: d.status === '1' ? 1 : 0,
          migrateSourceId: d.id
        }
      })
    );
    created++;
  }
  console.log(`  Departments: ${list.length}`);
  return { detected: list.length, created, updated: 0, skipped: 0 };
}

async function importLocations(importUserId: string): Promise<{
  map: Map<string, string>;
  stats: MigrateTaskStats;
}> {
  const list = await migrateFetch<SourceLocation>('all-locations', 'locationlist');
  const map = new Map<string, string>();
  let created = 0;
  for (const l of list) {
    const row = await retryOnConflict(() =>
      prisma.location.create({
        data: {
          name: l.name ?? '',
          code: l.code ?? `L${l.id}`,
          addressLine1: l.address_line_01 ?? '',
          addressLine2: l.address_line_02 ?? '',
          city: l.city ?? '',
          branchType: l.branch_type ?? 0,
          status: l.status ?? 0,
          migrateSourceId: l.id,
          createdBy: importUserId,
          updatedBy: importUserId
        }
      })
    );
    map.set(l.id, row.id);
    created++;
  }
  console.log(`  Locations: ${list.length}`);
  return { map, stats: { detected: list.length, created, updated: 0, skipped: 0 } };
}

/** Import zones from Migrate API (all-zones, zonelist). Returns source zone id -> our zone id. Per MIGRATE_API_IMPORT_GUIDE. */
async function importZonesFromApi(
  locationIdMap: Map<string, string>,
  importUserId: string,
  reporter: MigrateReporter | null
): Promise<{ map: Map<string, string>; stats: MigrateTaskStats }> {
  let list: SourceZone[];
  try {
    list = await migrateFetch<SourceZone>('all-zones', 'zonelist');
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (message.includes('HTTP 404') || message.includes('HTTP 401')) {
      console.warn(
        `  [zones] GET all-zones failed (${message.includes('HTTP 401') ? '401 — add migrate/all-zones to Sails policies.js' : '404 — endpoint missing'}). Will create Default zone per location.`
      );
      return {
        map: new Map(),
        stats: {
          detected: 0,
          created: 0,
          updated: 0,
          skipped: 0,
          notes: 'API unavailable — default zones used',
        },
      };
    }
    throw e;
  }
  const zoneIdMap = new Map<string, string>();
  let created = 0;
  let skipped = 0;
  for (const z of list) {
    const locationId = locationIdMap.get(z.location);
    if (!locationId) {
      const msg = `location ${z.location} not found`;
      console.warn(`  Skip zone ${z.id} (${z.name}): ${msg}`);
      reporter?.issue('zones', 'missing_location', z.id, `${z.name}: ${msg}`);
      skipped++;
      continue;
    }
    const zone = await retryOnConflict(() =>
      prisma.zone.create({
        data: {
          name: z.name ?? 'Default',
          description: z.description ?? null,
          status: z.status === 1 ? 1 : 0,
          locationId,
          migrateSourceId: z.id,
          createdBy: importUserId,
          updatedBy: importUserId
        }
      })
    );
    zoneIdMap.set(z.id, zone.id);
    created++;
  }
  console.log(`  Zones: ${list.length} from API${skipped > 0 ? `, ${skipped} skipped` : ''}`);
  return {
    map: zoneIdMap,
    stats: { detected: list.length, created, updated: 0, skipped },
  };
}

/** Create one default Zone per location (skip locations that already have a zone). Fallback when not importing zones from API. */
async function createDefaultZones(
  locationIdMap: Map<string, string>,
  importUserId: string
): Promise<{ map: Map<string, string>; stats: MigrateTaskStats }> {
  const existingZones = await prisma.zone.findMany({ select: { locationId: true, id: true } });
  const zoneByLocation = new Map<string, string>();
  for (const z of existingZones) { if (z.locationId != null) zoneByLocation.set(z.locationId, z.id); }
  const locationIdsNeedingZone = [...new Set(locationIdMap.values())].filter((id) => !zoneByLocation.has(id));
  for (const locationId of locationIdsNeedingZone) {
    const zone = await retryOnConflict(() =>
      prisma.zone.create({
        data: {
          name: 'Default',
          description: 'Default zone (migrate)',
          status: 1,
          locationId,
          createdBy: importUserId,
          updatedBy: importUserId
        }
      })
    );
    zoneByLocation.set(locationId, zone.id);
  }
  console.log(`  Zones (default per location): ${zoneByLocation.size} total, ${locationIdsNeedingZone.length} created this run`);
  return {
    map: zoneByLocation,
    stats: {
      detected: locationIdMap.size,
      created: locationIdsNeedingZone.length,
      updated: 0,
      skipped: locationIdMap.size - locationIdsNeedingZone.length,
      notes: 'default zone per location (fallback)',
    },
  };
}

/** Build location and zone maps from DB using migrateSourceId. Use when running --only=rooms (or zones) without importing in this run. */
async function getLocationAndZoneMapsFromDb(): Promise<{
  locationIdMap: Map<string, string>;
  zoneIdMap: Map<string, string>;
  zoneByLocationMap: Map<string, string>;
}> {
  const dbLocations = await prisma.location.findMany({ select: { id: true, migrateSourceId: true, code: true } });
  const locationIdMap = new Map<string, string>();
  for (const loc of dbLocations) {
    if (loc.migrateSourceId) locationIdMap.set(loc.migrateSourceId, loc.id);
  }
  if (locationIdMap.size === 0) {
    const list = await migrateFetch<SourceLocation>('all-locations', 'locationlist');
    const codeToOurId = new Map(dbLocations.map((r) => [r.code, r.id]));
    for (const apiLoc of list) {
      const ourId = codeToOurId.get(apiLoc.code ?? '');
      if (ourId) locationIdMap.set(apiLoc.id, ourId);
    }
    if (locationIdMap.size === 0) {
      for (const loc of dbLocations) locationIdMap.set(loc.id, loc.id);
    }
  }
  const dbZones = await prisma.zone.findMany({ select: { id: true, locationId: true, migrateSourceId: true } });
  const zoneIdMap = new Map<string, string>();
  const zoneByLocationMap = new Map<string, string>();
  for (const z of dbZones) {
    if (z.migrateSourceId) zoneIdMap.set(z.migrateSourceId, z.id);
    if (z.locationId != null) zoneByLocationMap.set(z.locationId, z.id);
  }
  return { locationIdMap, zoneIdMap, zoneByLocationMap };
}

/** Room.zone from API is source zone id (migrateSourceId). Normalize in case API returns populated object. */
function getSourceZoneId(room: SourceRoom): string | null {
  const z = room.zone;
  if (!z) return null;
  if (typeof z === 'string') return z;
  const id = (z as { id?: string }).id;
  return id != null ? String(id) : null;
}

async function importRooms(
  locationIdMap: Map<string, string>,
  zoneIdMap: Map<string, string>,
  zoneByLocationMap: Map<string, string>,
  importUserId: string,
  reporter: MigrateReporter | null
): Promise<MigrateTaskStats> {
  const list = await migrateFetch<SourceRoom>('all-rooms', 'roomlist');
  let created = 0;
  let skipped = 0;
  let usedFallbackZone = 0;
  for (const r of list) {
    const locationId = locationIdMap.get(r.location);
    if (!locationId) {
      console.warn(`  Skip room ${r.id}: location ${r.location} not found`);
      reporter?.issue('rooms', 'missing_location', r.number ?? r.id, `legacy location ${r.location}`);
      skipped++;
      continue;
    }
    const sourceZoneId = getSourceZoneId(r);
    const zoneIdFromMap = sourceZoneId ? zoneIdMap.get(sourceZoneId) : undefined;
    const zoneId = zoneIdFromMap ?? zoneByLocationMap.get(locationId);
    if (zoneIdFromMap === undefined && sourceZoneId && zoneByLocationMap.has(locationId)) usedFallbackZone++;
    if (!zoneId) {
      console.warn(`  Skip room ${r.id}: no zone for location ${r.location}`);
      reporter?.issue('rooms', 'missing_zone', r.number ?? r.id, `location ${r.location}`);
      skipped++;
      continue;
    }
    await retryOnConflict(() =>
      prisma.room.create({
        data: {
          number: r.number ?? '',
          description: r.description ?? '',
          status: r.status ?? 0,
          locationId,
          zoneId,
          migrateSourceId: r.id,
          createdBy: importUserId,
          updatedBy: importUserId
        }
      })
    );
    created++;
  }
  const fallbackNote =
    usedFallbackZone > 0
      ? `${usedFallbackZone} used location default zone`
      : undefined;
  if (usedFallbackZone > 0) {
    console.warn(
      `  Rooms: ${list.length} imported, ${usedFallbackZone} linked to location default zone (source zone id not in zoneIdMap – import zones from API with migrateSourceId first)`
    );
  } else {
    console.log(`  Rooms: ${list.length}`);
  }
  return {
    detected: list.length,
    created,
    updated: 0,
    skipped,
    notes: fallbackNote,
  };
}

/** Resolve tag type: explicit type, or id when id is the type (0=City, 1=Staff Category, 2=Staff Designation, 3=Staff Grade, 4=Bank). */
function resolveTagType(t: SourceTag): number | null {
  if (t.type != null) {
    const n = typeof t.type === 'number' ? t.type : parseInt(String(t.type), 10);
    if (!Number.isNaN(n)) return n;
  }
  const rawId = t.id;
  if (typeof rawId === 'number' && rawId >= 0 && rawId <= 4) return rawId;
  if (typeof rawId === 'string') {
    const n = parseInt(rawId, 10);
    if (!Number.isNaN(n) && n >= 0 && n <= 4) return n;
  }
  return null;
}

async function importTags(importUserId: string): Promise<MigrateTaskStats> {
  const list = await migrateFetch<SourceTag>('all-tags', 'taglist');
  let created = 0;
  for (const t of list) {
    const typeNum = resolveTagType(t);
    await retryOnConflict(() =>
      prisma.tag.create({
        data: {
          name: t.name ?? null,
          type: typeNum,
          status: t.status != null ? Number(t.status) : null,
          migrateSourceId: String(t.id),
          createdBy: importUserId,
          updatedBy: importUserId
        }
      })
    );
    created++;
  }
  console.log(`  Tags: ${list.length}`);
  return { detected: list.length, created, updated: 0, skipped: 0 };
}

async function importDiscounts(importUserId: string): Promise<MigrateTaskStats> {
  const list = await migrateFetch<SourceDiscount>('all-discounts', 'discountlist');
  let created = 0;
  for (const d of list) {
    const method = DISCOUNT_METHOD_MAP[d.discount_method] ?? 'POS';
    const payment = d.payment_type != null && PAYMENT_TYPE_MAP[d.payment_type] != null
      ? PAYMENT_TYPE_MAP[d.payment_type]
      : PaymentType.CASH;
    await retryOnConflict(() =>
      prisma.discount.create({
        data: {
          name: d.name ?? '',
          discountType: d.discount_type ?? 0,
          discountMethod: [method],
          paymentType: [payment],
          discountValue: d.discount_value ?? 0,
          discountValueForeign: d.discount_value_foreign ?? 0,
          fromDate: new Date(d.from_date ?? 0),
          toDate: new Date(d.to_date ?? 0),
          isVoucher: d.is_voucher ?? 0,
          autoApply: d.auto_apply ?? false,
          status: d.status ?? 0,
          applyTo: d.apply_to ?? 0,
          migrateSourceId: d.id,
          createdBy: importUserId,
          updatedBy: importUserId
        }
      })
    );
    created++;
  }
  console.log(`  Discounts: ${list.length}`);
  return { detected: list.length, created, updated: 0, skipped: 0 };
}

type SourceStaff = {
  staff_legacy_id?: string | null;
  staff_id?: string;
  code?: string;
  title?: string;
  zone_code?: string;
  initials?: string;
  surname?: string;
  full_name?: string;
  name_with_initials?: string;
  last_name?: string;
  nic?: string;
  home?: string;
  mobile?: string;
  email_01?: string;
  email_02?: string;
  address_line_01?: string;
  address_line_02?: string;
  city?: string;
  gender?: string;
  birthDay?: number;
  finger_print_id?: string;
  epf?: string;
  epf_registration_date?: number;
  date_joined?: number;
  date_resigning?: number;
  institution?: string;
  emloyee_status?: string;
  staff_catagory?: string;
  staff_grade?: string;
  staff_designation?: string;
  working_department?: string;
  speciality?: string;
  status?: number;
  remarks?: string;
};

const LEGACY_DATE_MIN_YEAR = 1900;
const LEGACY_DATE_MAX_YEAR = 2100;

function isReasonableLegacyDate(d: Date): boolean {
  if (Number.isNaN(d.getTime())) return false;
  const y = d.getUTCFullYear();
  return y >= LEGACY_DATE_MIN_YEAR && y <= LEGACY_DATE_MAX_YEAR;
}

/** Parse 8-digit YYYYMMDD (e.g. 19850315). */
function parseYmdInteger(n: number): Date | null {
  const s = String(Math.trunc(n));
  if (s.length !== 8) return null;
  const y = Number(s.slice(0, 4));
  const m = Number(s.slice(4, 6));
  const d = Number(s.slice(6, 8));
  if (y < LEGACY_DATE_MIN_YEAR || y > LEGACY_DATE_MAX_YEAR) return null;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return isReasonableLegacyDate(dt) ? dt : null;
}

/** Parse 8-digit DDMMYYYY (e.g. 15031985). */
function parseDmyInteger(n: number): Date | null {
  const s = String(Math.trunc(n));
  if (s.length !== 8) return null;
  const day = Number(s.slice(0, 2));
  const month = Number(s.slice(2, 4));
  const year = Number(s.slice(4, 8));
  if (year < LEGACY_DATE_MIN_YEAR || year > LEGACY_DATE_MAX_YEAR) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const dt = new Date(Date.UTC(year, month - 1, day));
  return isReasonableLegacyDate(dt) ? dt : null;
}

function legacyUnixToDate(value: unknown): Date | null {
  if (value == null || value === '') return null;
  if (value instanceof Date) return isReasonableLegacyDate(value) ? value : null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = new Date(trimmed);
    if (isReasonableLegacyDate(parsed)) return parsed;
    const n = Number(trimmed);
    if (!Number.isFinite(n)) return null;
    return legacyUnixToDate(n);
  }
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;

  if (n >= 1e7 && n < 1e8) {
    const ymd = parseYmdInteger(n);
    if (ymd) return ymd;
    const dmy = parseDmyInteger(n);
    if (dmy) return dmy;
  }

  const d = new Date(n >= 1e12 ? n : n * 1000);
  return isReasonableLegacyDate(d) ? d : null;
}

function resolveStaffLegacyId(row: SourceStaff): string | null {
  const legacy = (row.staff_legacy_id ?? '').toString().trim();
  return legacy.length > 0 ? legacy : null;
}

function resolveStaffCode(row: SourceStaff, legacyId: string | null): string | null {
  const code = (row.code ?? '').toString().trim();
  if (code) return code;
  const staffId = (row.staff_id ?? '').toString().trim();
  if (staffId) return staffId;
  if (legacyId) return `ST${legacyId.slice(-10)}`;
  return null;
}

function resolveStaffName(row: SourceStaff): string {
  const full = (row.full_name ?? '').toString().trim();
  if (full) return full;
  const withInit = (row.name_with_initials ?? '').toString().trim();
  if (withInit) return withInit;
  const combined = `${(row.initials ?? '').toString().trim()} ${(row.surname ?? row.last_name ?? '').toString().trim()}`.trim();
  if (combined) return combined;
  const code = (row.code ?? '').toString().trim();
  return code || 'Unknown';
}

function resolveStaffAddress(row: SourceStaff): string {
  const parts = [
    (row.address_line_01 ?? '').toString().trim(),
    (row.address_line_02 ?? '').toString().trim(),
    (row.city ?? '').toString().trim(),
  ].filter(Boolean);
  return parts.join(', ') || '-';
}

function resolveStaffGender(row: SourceStaff): string {
  const g = (row.gender ?? '').toString().trim();
  if (!g) return 'Not specified';
  const lower = g.toLowerCase();
  if (lower === 'm' || lower === 'male') return 'Male';
  if (lower === 'f' || lower === 'female') return 'Female';
  return g;
}

function resolveStaffMobile(row: SourceStaff): string {
  const mobile = (row.mobile ?? '').toString().trim();
  if (mobile) return mobile.replace(/\s+/g, '');
  const home = (row.home ?? '').toString().trim();
  if (home) return home.replace(/\s+/g, '');
  return '0700000000';
}

function resolveStaffNic(row: SourceStaff, legacyId: string | null): string {
  const nic = (row.nic ?? '').toString().trim();
  if (nic) return nic;
  const staffId = (row.staff_id ?? '').toString().trim();
  if (staffId) return staffId;
  if (legacyId) return `MIG-${legacyId}`;
  return 'MIG-UNKNOWN';
}

function resolveStaffStatus(row: SourceStaff): number {
  const s = safeNumber(row.status);
  if (s === 0 || s === 1) return s;
  const emp = (row.emloyee_status ?? '').toString().trim().toLowerCase();
  if (emp === '0' || emp === 'inactive') return 0;
  return 1;
}

function findLegacyStaffCodeDuplicates(list: SourceStaff[]): Map<string, SourceStaff[]> {
  const byCode = new Map<string, SourceStaff[]>();
  for (const row of list) {
    const legacyId = resolveStaffLegacyId(row);
    const code = resolveStaffCode(row, legacyId);
    if (!code) continue;
    if (!byCode.has(code)) byCode.set(code, []);
    byCode.get(code)!.push(row);
  }
  return new Map([...byCode.entries()].filter(([, rows]) => rows.length > 1));
}

async function importStaff(
  importUserId: string,
  reporter: MigrateReporter | null
): Promise<MigrateTaskStats> {
  const list = await migrateFetch<SourceStaff>('all-staff', 'stafflist');
  let created = 0;
  let updated = 0;
  let skipped = 0;

  const legacyDupCodes = findLegacyStaffCodeDuplicates(list);
  if (legacyDupCodes.size > 0) {
    console.warn(`  Staff: ${legacyDupCodes.size} duplicate code(s) in legacy API (see report Issues sheet)`);
    for (const [code, rows] of legacyDupCodes) {
      for (const row of rows) {
        reporter?.issue(
          'staff',
          'legacy_duplicate_code',
          code,
          `${resolveStaffName(row)} | legacy=${resolveStaffLegacyId(row) ?? '?'} status=${row.status ?? '?'}`
        );
      }
    }
  }

  const statusCounts = { active: 0, inactive: 0 };
  for (const row of list) {
    if (resolveStaffStatus(row) === 1) statusCounts.active++;
    else statusCounts.inactive++;
  }

  for (const row of list) {
    const legacyId = resolveStaffLegacyId(row);
    const code = resolveStaffCode(row, legacyId);
    if (!code) {
      console.warn('  Skip staff: missing code and legacy id');
      reporter?.issue('staff', 'missing_code', legacyId ?? '?', resolveStaffName(row));
      skipped++;
      continue;
    }

    const data = {
      code,
      title: (row.title ?? '').toString().trim(),
      name: resolveStaffName(row),
      nic: resolveStaffNic(row, legacyId),
      dateOfBirth: legacyUnixToDate(row.birthDay),
      gender: resolveStaffGender(row),
      contactMobile: resolveStaffMobile(row),
      address: resolveStaffAddress(row),
      dateJoined: legacyUnixToDate(row.date_joined),
      status: resolveStaffStatus(row),
      ...(legacyId ? { migrateSourceId: legacyId } : {}),
      createdBy: importUserId,
      updatedBy: importUserId,
    };

    try {
      const existing = legacyId
        ? await prisma.staff.findFirst({
            where: { migrateSourceId: legacyId },
            select: { id: true },
          })
        : await prisma.staff.findUnique({ where: { code }, select: { id: true } });

      if (existing) {
        await retryOnConflict(() =>
          prisma.staff.update({
            where: { id: existing.id },
            data: { ...data, updatedBy: importUserId },
          })
        );
        updated++;
      } else {
        await retryOnConflict(() => prisma.staff.create({ data }));
        created++;
      }
    } catch (e: unknown) {
      const codeErr = (e as { code?: string })?.code;
      if (codeErr === 'P2002') {
        console.warn(`  Skip staff ${code} (${data.name}): duplicate code`);
        reporter?.issue(
          'staff',
          'duplicate_code_skip',
          code,
          `${data.name} | legacy=${legacyId ?? 'none'}`
        );
        skipped++;
      } else {
        throw e;
      }
    }
  }

  console.log(
    `  Staff: ${list.length} from API → created=${created} updated=${updated}${skipped > 0 ? ` skipped=${skipped}` : ''}`
  );
  return {
    detected: list.length,
    created,
    updated,
    skipped,
    notes: `legacy status active=${statusCounts.active} inactive=${statusCounts.inactive}; API duplicate codes=${legacyDupCodes.size}; all legacy statuses imported (no published filter)`,
  };
}

async function importAgencies(importUserId: string): Promise<{
  idMap: Map<string, string>;
  stats: MigrateTaskStats;
}> {
  const list = await migrateFetch<SourceAgency>('all-agencies', 'agencylist');
  const idMap = new Map<string, string>();
  let created = 0;
  // First pass: create all without parent
  for (const a of list) {
    const row = await retryOnConflict(() =>
      prisma.agency.create({
        data: {
          name: a.name ?? '',
          code: a.code ?? null,
          chequePrintingName: a.cheque_printing_name ?? a.name ?? '',
          allowedCreditLimit: safeNumber(a.allowed_credit_limit),
          creditLimit: safeNumber(a.credit_limit),
          phone: a.phone ?? null,
          mobile: a.mobile ?? null,
          fax: a.fax ?? null,
          email: a.email ?? null,
          website: a.website ?? null,
          memo: a.memo ?? null,
        addressLine1: a.address_line_01 ?? null,
        addressLine2: a.address_line_02 ?? null,
        city: a.city ?? null,
        contactPersonName: a.contact_person_name ?? '',
        contactPersonPhone: a.contact_person_phone ?? null,
        contactPersonMobile: a.contact_person_mobile ?? null,
        contactPersonEmail: a.contact_person_email ?? null,
        sendSms: a.send_sms ?? 0,
        status: a.status ?? 1,
        migrateSourceId: a.id,
        createdBy: importUserId,
        updatedBy: importUserId
      }
    })
    );
    idMap.set(a.id, row.id);
    created++;
  }
  // Second pass: set parentAgencyId where applicable
  for (const a of list) {
    if (!a.parent_agency) continue;
    const targetId = idMap.get(a.id);
    const parentId = idMap.get(a.parent_agency);
    if (targetId && parentId) {
      await prisma.agency.update({
        where: { id: targetId },
        data: { parentAgencyId: parentId, updatedBy: importUserId }
      });
    }
  }
  console.log(`  Agencies: ${list.length}`);
  return {
    idMap,
    stats: { detected: list.length, created, updated: 0, skipped: 0 },
  };
}

async function main(): Promise<void> {
  if (!USER_KEY) {
    console.error('Set MIGRATE_USER_KEY (and optionally MIGRATE_BASE_URL) in .env');
    process.exit(1);
  }

  const { flush, only } = parseArgs();
  const stepsToRun = only ?? [...ALL_STEPS];

  resetMigrateReportState();
  console.log('Cleared temp/ migration report (fresh run).\n');

  const reporter = createMigrateReporter('migrate-import', {
    baseUrl: BASE_URL,
    steps: stepsToRun.join(','),
    flush: String(flush ?? 'prompt'),
  });

  console.log('Migrate API import\n');
  console.log(`Base URL: ${BASE_URL}`);
  if (only?.length) console.log(`Only steps: ${stepsToRun.join(', ')}`);

  let doFlush: boolean;
  if (flush === true) {
    doFlush = true;
    console.log('--flush: will delete migrate tables then import.\n');
  } else if (flush === false) {
    doFlush = false;
    console.log('--no-flush: import only (no delete).\n');
  } else {
    const answer = await ask('Delete existing data in migrate-related tables and import as new? (yes/no): ');
    doFlush = answer === 'yes' || answer === 'y';
    if (!doFlush) {
      console.log('Aborted.');
      process.exit(0);
    }
  }

  if (doFlush) await deleteMigrateTables();

  const importUser = await prisma.user.findUnique({
    where: { email: IMPORT_USER_EMAIL },
    select: { id: true }
  });
  if (!importUser) {
    console.error(`Import user not found: ${IMPORT_USER_EMAIL}. Create this user first.`);
    process.exit(1);
  }
  const importUserId = importUser.id;
  console.log(`Using import user: ${IMPORT_USER_EMAIL} (${importUserId})\n`);

  console.log('Importing (one by one, in dependency order)...\n');
  try {
    let specialityIdMap = new Map<string, string>();
    let locationIdMap = new Map<string, string>();
    let zoneIdMap = new Map<string, string>();
    let zoneByLocationMap = new Map<string, string>();

    if (stepsToRun.includes('specialities')) {
      console.log('[Step] Specialities');
      const r = await importSpecialities(importUserId);
      specialityIdMap = r.map;
      reporter?.task('specialities', r.stats);
    } else if (stepsToRun.includes('doctors')) {
      specialityIdMap = await getSpecialityIdMapFromDb();
    }

    if (stepsToRun.includes('doctors')) {
      console.log('[Step] Doctors');
      reporter?.task('doctors', await importDoctors(specialityIdMap, importUserId, reporter));
    }

    if (stepsToRun.includes('departments')) {
      console.log('[Step] Departments');
      reporter?.task('departments', await importDepartments());
    }

    if (stepsToRun.includes('locations')) {
      console.log('[Step] Locations');
      const r = await importLocations(importUserId);
      locationIdMap = r.map;
      reporter?.task('locations', r.stats);
    }

    if (stepsToRun.includes('zones')) {
      console.log('[Step] Zones');
      if (locationIdMap.size === 0) {
        const maps = await getLocationAndZoneMapsFromDb();
        locationIdMap = maps.locationIdMap;
      }
      const z = await importZonesFromApi(locationIdMap, importUserId, reporter);
      zoneIdMap = z.map;
      reporter?.task('zones', z.stats);
      if (zoneIdMap.size === 0) {
        console.log('  [zones] No zones from API — creating Default zone per location');
        const d = await createDefaultZones(locationIdMap, importUserId);
        zoneByLocationMap = d.map;
        reporter?.task('zones-default', d.stats);
      } else {
        const zones = await prisma.zone.findMany({ select: { id: true, locationId: true } });
        for (const z of zones) { if (z.locationId != null) zoneByLocationMap.set(z.locationId, z.id); }
      }
    }

    if (stepsToRun.includes('rooms')) {
      console.log('[Step] Rooms');
      const dbMaps = await getLocationAndZoneMapsFromDb();
      if (dbMaps.locationIdMap.size > 0) {
        locationIdMap = dbMaps.locationIdMap;
        zoneIdMap = dbMaps.zoneIdMap;
        zoneByLocationMap = dbMaps.zoneByLocationMap;
      } else if (locationIdMap.size === 0 || (zoneIdMap.size === 0 && zoneByLocationMap.size === 0)) {
        locationIdMap = dbMaps.locationIdMap;
        zoneIdMap = dbMaps.zoneIdMap;
        zoneByLocationMap = dbMaps.zoneByLocationMap;
      }
      reporter?.task('rooms', await importRooms(locationIdMap, zoneIdMap, zoneByLocationMap, importUserId, reporter));
    }

    if (stepsToRun.includes('tags')) {
      console.log('[Step] Tags');
      reporter?.task('tags', await importTags(importUserId));
    }

    if (stepsToRun.includes('discounts')) {
      console.log('[Step] Discounts');
      reporter?.task('discounts', await importDiscounts(importUserId));
    }

    if (stepsToRun.includes('agencies')) {
      console.log('[Step] Agencies');
      const r = await importAgencies(importUserId);
      reporter?.task('agencies', r.stats);
    }

    if (stepsToRun.includes('staff')) {
      console.log('[Step] Staff');
      reporter?.task('staff', await importStaff(importUserId, reporter));
    }
  } catch (e) {
    console.error('Import failed:', e);
    reporter?.task('import', {
      detected: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      failed: 1,
      notes: e instanceof Error ? e.message : String(e),
    });
    await finishMigrateReporter(reporter);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }

  await finishMigrateReporter(reporter);
  console.log('\nImport completed.');
}

main();
