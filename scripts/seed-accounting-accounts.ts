/**
 * Create accounting accounts linked to Location, Agency, Doctor, and CreditCustomer models:
 * - Main Cash Book (if missing)
 * - One Cash account per Location (branch cash books), linked to main Cash Book
 * - One Payable account per Agency (agent accounts), linked to Agency
 * - One Payable account per Doctor (doctor accounts), linked to Doctor
 * - One Receivable account per Credit Customer (credit accounts), linked to CreditCustomer
 *
 * When run as a fresh seed, first removes all accounts and their journal entries
 * (FloatRequest → JournalLine → Journal → Account), then creates accounts from scratch.
 * Only published entities (status === 1) are processed.
 *
 * After creating accounts, syncs Sequence table for credit_customer, agency, and doctor
 * so the next created entity gets the correct next code (avoids "code already in use").
 *
 * Run: npx tsx scripts/seed-accounting-accounts.ts
 * Optional: pass a doctor code to create only that doctor's payable account (e.g. DR0478).
 *   npx tsx scripts/seed-accounting-accounts.ts DR0478
 *   Or set env: DOCTOR_CODE=DR0478
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Optional doctor code: only create payable account for this doctor. From argv[2] or env DOCTOR_CODE. */
const doctorCodeFilter =
  process.argv[2]?.trim() || process.env.DOCTOR_CODE?.trim() || null;

async function main() {
  console.log("Seeding accounting accounts...\n");

  // --- 0. Fresh seed: remove all accounting data (order respects FKs) ---
  console.log("Removing existing accounting data...");
  const deletedRequests = await prisma.floatRequest.deleteMany({});
  console.log("  Deleted", deletedRequests.count, "float request(s).");
  const deletedLines = await prisma.journalLine.deleteMany({});
  console.log("  Deleted", deletedLines.count, "journal line(s).");
  const deletedJournals = await prisma.journal.deleteMany({});
  console.log("  Deleted", deletedJournals.count, "journal(s).");
  // Clear parent link so Account self-relation doesn't block deleteMany
  await prisma.account.updateMany({ data: { parentAccountId: null } });
  const deletedAccounts = await prisma.account.deleteMany({});
  console.log("  Deleted", deletedAccounts.count, "account(s).");
  console.log("");

  // --- 1. Main Cash Book ---
  let mainCash = await prisma.account.findFirst({
    where: { type: "CASH", parentAccountId: null, locationId: null, isActive: true },
  });

  if (!mainCash) {
    mainCash = await prisma.account.create({
      data: {
        name: "Main Cash Book",
        code: "CB-MAIN",
        type: "CASH",
        parentAccountId: null,
        locationId: null,
        doctorId: null,
        agencyId: null,
        userId: null,
        minBalanceAllowed: null,
        isActive: true,
      },
    });
    console.log("Created Main Cash Book:", mainCash.id);
  } else {
    console.log("Main Cash Book already exists:", mainCash.id);
  }

  // --- 2. Location cash books (one per published location) ---
  const locations = await prisma.location.findMany({
    where: { status: 1 },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });

  let locationCreated = 0;
  let locationSkipped = 0;

  for (const loc of locations) {
    const existing = await prisma.account.findFirst({
      where: { type: "CASH", locationId: loc.id, isActive: true },
    });
    if (existing) {
      locationSkipped++;
      continue;
    }
    await prisma.account.create({
      data: {
        name: `Cash Book - ${loc.name}`,
        code: `CB-${loc.code}`,
        type: "CASH",
        parentAccountId: mainCash.id,
        locationId: loc.id,
        doctorId: null,
        agencyId: null,
        userId: null,
        minBalanceAllowed: null,
        isActive: true,
      },
    });
    locationCreated++;
    console.log("  Created cash book for location:", loc.name);
  }

  console.log(`Locations: ${locationCreated} created, ${locationSkipped} already had accounts.\n`);

  // --- 3. Agent accounts (one Receivable per published agency; agency is debtor) ---
  const agencies = await prisma.agency.findMany({
    where: { status: 1 },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });

  let agencyCreated = 0;
  let agencySkipped = 0;

  for (const ag of agencies) {
    const existing = await prisma.account.findFirst({
      where: { type: "RECEIVABLE", agencyId: ag.id, isActive: true },
    });
    if (existing) {
      agencySkipped++;
      continue;
    }
    // code must be unique; use agency code or fall back to id (only one null allowed globally)
    const code = ag.code ? `AGT-${ag.code}` : `AGT-${ag.id}`;
    await prisma.account.create({
      data: {
        name: `Agent - ${ag.name}`,
        code,
        type: "RECEIVABLE",
        parentAccountId: null,
        locationId: null,
        doctorId: null,
        agencyId: ag.id,
        userId: null,
        minBalanceAllowed: null,
        isActive: true,
      },
    });
    agencyCreated++;
    console.log("  Created agent account:", ag.name);
  }

  console.log(`Agencies: ${agencyCreated} created, ${agencySkipped} already had accounts.\n`);

  // --- 4. Doctor accounts (one Payable per published doctor, or only the doctor matching DOCTOR_CODE) ---
  const doctorWhere: { status: number; code?: string } = { status: 1 };
  if (doctorCodeFilter) {
    doctorWhere.code = doctorCodeFilter;
    console.log(`Doctor filter: only code "${doctorCodeFilter}"\n`);
  }
  const doctors = await prisma.doctor.findMany({
    where: doctorWhere,
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });

  let doctorCreated = 0;
  let doctorSkipped = 0;

  for (const doc of doctors) {
    const existing = await prisma.account.findFirst({
      where: { type: "PAYABLE", doctorId: doc.id, isActive: true },
    });
    if (existing) {
      doctorSkipped++;
      continue;
    }
    await prisma.account.create({
      data: {
        name: doc.name,
        code: `DOC-${doc.code}`,
        type: "PAYABLE",
        parentAccountId: null,
        locationId: null,
        doctorId: doc.id,
        agencyId: null,
        userId: null,
        minBalanceAllowed: null,
        isActive: true,
      },
    });
    doctorCreated++;
    console.log("  Created doctor account:", doc.name);
  }

  console.log(`Doctors: ${doctorCreated} created, ${doctorSkipped} already had accounts.\n`);

  // --- 5. Credit Customer accounts (one Receivable per published credit customer) ---
  const creditCustomers = await prisma.creditCustomer.findMany({
    where: { status: 1 },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });

  let creditCustomerCreated = 0;
  let creditCustomerSkipped = 0;

  for (const cc of creditCustomers) {
    const existing = await prisma.account.findFirst({
      where: { type: "RECEIVABLE", creditCustomerId: cc.id, isActive: true },
    });
    if (existing) {
      creditCustomerSkipped++;
      continue;
    }
    const code = cc.code ?? `CC-${cc.id}`;
    await prisma.account.create({
      data: {
        name: `Credit - ${cc.name}`,
        code,
        type: "RECEIVABLE",
        parentAccountId: null,
        locationId: null,
        doctorId: null,
        agencyId: null,
        creditCustomerId: cc.id,
        userId: null,
        minBalanceAllowed: null,
        isActive: true,
      },
    });
    creditCustomerCreated++;
    console.log("  Created credit customer account:", cc.name);
  }

  console.log(`Credit Customers: ${creditCustomerCreated} created, ${creditCustomerSkipped} already had accounts.\n`);

  // --- 6. Sync Sequence table so next created entity gets correct code ---
  console.log("Syncing Sequence table...");

  const CREDIT_CUSTOMER_SCOPE = "credit_customer";
  const AGENCY_SCOPE = "agency";
  const DOCTOR_SCOPE = "doctor";

  const allCreditCustomers = await prisma.creditCustomer.findMany({
    select: { code: true },
  });
  const ccNumbers = allCreditCustomers
    .map((c) => (c.code ? parseInt(c.code.replace(/^CC-0*/, "") || "0", 10) : 0))
    .filter((n) => !Number.isNaN(n));
  const maxCc = ccNumbers.length ? Math.max(...ccNumbers) : 0;
  if (maxCc > 0) {
    const existingCc = await prisma.sequence.findUnique({ where: { scopeKey: CREDIT_CUSTOMER_SCOPE } });
    const newLastCc = Math.max(existingCc?.lastValue ?? 0, maxCc);
    await prisma.sequence.upsert({
      where: { scopeKey: CREDIT_CUSTOMER_SCOPE },
      create: { scopeKey: CREDIT_CUSTOMER_SCOPE, lastValue: newLastCc },
      update: { lastValue: newLastCc },
    });
    console.log("  credit_customer sequence synced to lastValue:", newLastCc);
  }

  const allAgencies = await prisma.agency.findMany({
    select: { code: true },
  });
  const agNumbers = allAgencies
    .map((a) => (a.code ? parseInt(a.code, 10) : 0))
    .filter((n) => !Number.isNaN(n) && n > 0);
  const maxAg = agNumbers.length ? Math.max(...agNumbers) : 0;
  if (maxAg > 0) {
    const existingAg = await prisma.sequence.findUnique({ where: { scopeKey: AGENCY_SCOPE } });
    const newLastAg = Math.max(existingAg?.lastValue ?? 0, maxAg);
    await prisma.sequence.upsert({
      where: { scopeKey: AGENCY_SCOPE },
      create: { scopeKey: AGENCY_SCOPE, lastValue: newLastAg },
      update: { lastValue: newLastAg },
    });
    console.log("  agency sequence synced to lastValue:", newLastAg);
  }

  const allDoctors = await prisma.doctor.findMany({
    select: { code: true },
  });
  const docNumbers = allDoctors
    .map((d) => (d.code ? parseInt(d.code.replace(/^DR0*/, "") || "0", 10) : 0))
    .filter((n) => !Number.isNaN(n));
  const maxDoc = docNumbers.length ? Math.max(...docNumbers) : 0;
  if (maxDoc > 0) {
    const existingDoc = await prisma.sequence.findUnique({ where: { scopeKey: DOCTOR_SCOPE } });
    const newLastDoc = Math.max(existingDoc?.lastValue ?? 0, maxDoc);
    await prisma.sequence.upsert({
      where: { scopeKey: DOCTOR_SCOPE },
      create: { scopeKey: DOCTOR_SCOPE, lastValue: newLastDoc },
      update: { lastValue: newLastDoc },
    });
    console.log("  doctor sequence synced to lastValue:", newLastDoc);
  }

  console.log("");

  console.log("Done.");
  console.log("Summary:");
  console.log("  Main Cash Book: 1");
  console.log(`  Location cash books: ${locationCreated} created, ${locationSkipped} existing`);
  console.log(`  Agent accounts: ${agencyCreated} created, ${agencySkipped} existing`);
  console.log(`  Doctor accounts: ${doctorCreated} created, ${doctorSkipped} existing`);
  console.log(`  Credit Customer accounts: ${creditCustomerCreated} created, ${creditCustomerSkipped} existing`);
  console.log("  Sequences synced: credit_customer, agency, doctor");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
