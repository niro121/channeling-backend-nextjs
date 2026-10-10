/**
 * Sync Sequence.lastValue from existing DB rows so the next generated number won't collide.
 *
 * Run after migrate import / migrate:sessions-bookings (or any time sequences may be stale).
 *
 *   npx tsx scripts/sequence-sync-from-db.ts
 *   npx tsx scripts/sequence-sync-from-db.ts appointment
 *   npx tsx scripts/sequence-sync-from-db.ts doctor agency
 *
 * Scopes (default: all):
 *   speciality, doctor, agency, credit_customer — UI auto-code generation
 *   journal — accounting journal numbers
 *   appointment — per-session appointment:sessionId (from Session + Booking)
 *   booking — per-location {locationId}-bookings + booking:global
 *   receipt — per-location receipt counters from Receipt + inline Booking receipt fields
 *
 * Staff codes are NOT sequence-based (legacy/manual codes only).
 */

import 'dotenv/config';
import prisma from '@/lib/prisma';
import { appointmentSequenceScopeKey } from '@/services/channel-booking/helpers/appointment-number';
import { getBookingSequenceInfo } from '@/services/channel-booking/helpers/get-booking-sequence';
import { getReceiptSequenceInfo } from '@/services/channel-booking/helpers/get-receipt-sequence';

const ALL_SCOPES = [
  'speciality',
  'doctor',
  'agency',
  'credit_customer',
  'journal',
  'appointment',
  'booking',
  'receipt',
] as const;

type SyncScope = (typeof ALL_SCOPES)[number];

function parseArgs(): SyncScope[] {
  const argv = process.argv.slice(2).map((a) => a.toLowerCase());
  if (!argv.length || argv.includes('all')) return [...ALL_SCOPES];
  const picked = argv.filter((a): a is SyncScope => ALL_SCOPES.includes(a as SyncScope));
  if (!picked.length) {
    console.error(`Unknown scope(s). Use: ${ALL_SCOPES.join(', ')} or all`);
    process.exit(1);
  }
  return picked;
}

function shouldRun(scopes: SyncScope[], name: SyncScope): boolean {
  return scopes.includes(name);
}

async function upsertSequence(scopeKey: string, lastValue: number): Promise<void> {
  await prisma.sequence.upsert({
    where: { scopeKey },
    create: { scopeKey, lastValue },
    update: { lastValue },
  });
}

function maxNumericFromCodes(codes: (string | null)[], pattern: RegExp): number {
  let max = 0;
  for (const code of codes) {
    if (!code) continue;
    const m = code.match(pattern);
    if (m) {
      const n = parseInt(m[1], 10);
      if (!Number.isNaN(n) && n > max) max = n;
    }
  }
  return max;
}

/** Align with seed-accounting-accounts / getNextSpecialityCode (RHC0001). */
async function syncSpeciality(): Promise<void> {
  const rows = await prisma.speciality.findMany({ select: { code: true } });
  const max = maxNumericFromCodes(
    rows.map((s) => s.code),
    /RHC0*(\d+)$/i
  );
  await upsertSequence('speciality', max);
  console.log(`speciality: lastValue=${max} (next RHC${String(max + 1).padStart(4, '0')})`);
}

/** Align with seed / getNextDoctorCode (DR0001). */
async function syncDoctor(): Promise<void> {
  const rows = await prisma.doctor.findMany({ select: { code: true } });
  const numbers = rows
    .map((d) => (d.code ? parseInt(d.code.replace(/^DR0*/i, '') || '0', 10) : 0))
    .filter((n) => !Number.isNaN(n) && n > 0);
  const max = numbers.length ? Math.max(...numbers) : 0;
  const existing = await prisma.sequence.findUnique({ where: { scopeKey: 'doctor' } });
  const lastValue = Math.max(existing?.lastValue ?? 0, max);
  await upsertSequence('doctor', lastValue);
  console.log(`doctor: lastValue=${lastValue} (next DR${String(lastValue + 1).padStart(4, '0')})`);
}

/** Align with getNextAgencyCode (numeric string codes). */
async function syncAgency(): Promise<void> {
  const rows = await prisma.agency.findMany({
    select: { code: true },
    where: { code: { not: null } },
  });
  const numbers = rows
    .map((a) => (a.code ? parseInt(a.code, 10) : 0))
    .filter((n) => !Number.isNaN(n) && n > 0);
  const max = numbers.length ? Math.max(...numbers) : 0;
  const existing = await prisma.sequence.findUnique({ where: { scopeKey: 'agency' } });
  const lastValue = Math.max(existing?.lastValue ?? 0, max);
  await upsertSequence('agency', lastValue);
  console.log(`agency: lastValue=${lastValue} (next ${lastValue + 1})`);
}

/** CC-00001 format. */
async function syncCreditCustomer(): Promise<void> {
  const rows = await prisma.creditCustomer.findMany({ select: { code: true } });
  const numbers = rows
    .map((c) => (c.code ? parseInt(c.code.replace(/^CC-0*/i, '') || '0', 10) : 0))
    .filter((n) => !Number.isNaN(n) && n > 0);
  const max = numbers.length ? Math.max(...numbers) : 0;
  const existing = await prisma.sequence.findUnique({ where: { scopeKey: 'credit_customer' } });
  const lastValue = Math.max(existing?.lastValue ?? 0, max);
  await upsertSequence('credit_customer', lastValue);
  console.log(`credit_customer: lastValue=${lastValue} (next CC-${String(lastValue + 1).padStart(5, '0')})`);
}

async function syncJournal(): Promise<void> {
  const agg = await prisma.journal.aggregate({ _max: { journalNumber: true } });
  const max = agg._max.journalNumber ?? 0;
  const existing = await prisma.sequence.findUnique({ where: { scopeKey: 'journal' } });
  const lastValue = Math.max(existing?.lastValue ?? 0, max);
  await upsertSequence('journal', lastValue);
  console.log(`journal: lastValue=${lastValue} (next ${lastValue + 1})`);
}

/** Same rule as migrate-sessions-bookings syncSessionAppointmentCounters. */
async function syncAppointments(): Promise<void> {
  const sessions = await prisma.session.findMany({
    select: { id: true, startingPatientNumber: true, appointmentNo: true },
  });
  let synced = 0;
  for (const s of sessions) {
    const bookings = await prisma.booking.findMany({
      where: { sessionId: s.id },
      select: { appointmentNo: true },
    });
    const maxBooking = bookings.reduce((m, b) => Math.max(m, b.appointmentNo), 0);
    const lastValue = Math.max(maxBooking, s.appointmentNo, s.startingPatientNumber - 1);
    await upsertSequence(appointmentSequenceScopeKey(s.id), lastValue);
    synced++;
  }

  const sessionIds = new Set(sessions.map((s) => s.id));
  const orphanRows = await prisma.sequence.findMany({
    where: { scopeKey: { startsWith: 'appointment:' } },
    select: { id: true, scopeKey: true },
  });
  const orphanIds = orphanRows
    .filter((r) => !sessionIds.has(r.scopeKey.slice('appointment:'.length)))
    .map((r) => r.id);
  if (orphanIds.length > 0) {
    await prisma.sequence.deleteMany({ where: { id: { in: orphanIds } } });
  }

  console.log(
    `appointment: synced ${synced} session(s)${orphanIds.length ? `, removed ${orphanIds.length} orphan sequence row(s)` : ''}`
  );
}

async function bumpScopeMax(map: Map<string, number>, scopeKey: string, value: number | null | undefined): Promise<void> {
  if (value == null || !Number.isFinite(value) || value <= 0) return;
  const n = Math.floor(value);
  map.set(scopeKey, Math.max(map.get(scopeKey) ?? 0, n));
}

async function syncBooking(): Promise<void> {
  const maxByScope = new Map<string, number>();

  const bookings = await prisma.booking.findMany({
    select: { locationId: true, bookingid: true },
  });
  for (const b of bookings) {
    const { scopeKey } = await getBookingSequenceInfo(b.locationId);
    await bumpScopeMax(maxByScope, scopeKey, b.bookingid);
  }

  for (const [scopeKey, max] of maxByScope) {
    const existing = await prisma.sequence.findUnique({ where: { scopeKey } });
    const lastValue = Math.max(existing?.lastValue ?? 0, max);
    await upsertSequence(scopeKey, lastValue);
  }

  console.log(`booking: synced ${maxByScope.size} scope(s) from Booking.bookingid`);
}

async function syncReceipt(): Promise<void> {
  const maxByScope = new Map<string, number>();

  const receipts = await prisma.receipt.findMany({
    select: { locationId: true, userLocationId: true, method: true, receiptNo: true },
  });
  for (const r of receipts) {
    const { scopeKey } = await getReceiptSequenceInfo(r.locationId, r.method, r.userLocationId);
    await bumpScopeMax(maxByScope, scopeKey, r.receiptNo);
  }

  const bookingsWithReceipt = await prisma.booking.findMany({
    where: { receiptNo: { not: null } },
    select: {
      locationId: true,
      receiptNo: true,
      receiptPaymentMethod: true,
    },
  });
  for (const b of bookingsWithReceipt) {
    const method = b.receiptPaymentMethod ?? 1;
    const { scopeKey } = await getReceiptSequenceInfo(b.locationId, method, null);
    await bumpScopeMax(maxByScope, scopeKey, b.receiptNo);
  }

  for (const [scopeKey, max] of maxByScope) {
    const existing = await prisma.sequence.findUnique({ where: { scopeKey } });
    const lastValue = Math.max(existing?.lastValue ?? 0, max);
    await upsertSequence(scopeKey, lastValue);
  }

  console.log(
    `receipt: synced ${maxByScope.size} scope(s) from Receipt + Booking inline receipt fields`
  );
}

async function main(): Promise<void> {
  const scopes = parseArgs();
  console.log(`Sequence sync from DB — scopes: ${scopes.join(', ')}\n`);

  if (shouldRun(scopes, 'speciality')) await syncSpeciality();
  if (shouldRun(scopes, 'doctor')) await syncDoctor();
  if (shouldRun(scopes, 'agency')) await syncAgency();
  if (shouldRun(scopes, 'credit_customer')) await syncCreditCustomer();
  if (shouldRun(scopes, 'journal')) await syncJournal();
  if (shouldRun(scopes, 'appointment')) await syncAppointments();
  if (shouldRun(scopes, 'booking')) await syncBooking();
  if (shouldRun(scopes, 'receipt')) await syncReceipt();

  console.log('\nDone.');
  console.log('Note: Staff.code is not sequence-managed — no staff scope to sync.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
