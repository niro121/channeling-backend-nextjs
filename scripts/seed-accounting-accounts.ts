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
  const locationIds = locations.map((l) => l.id);
  const existingLocationAccounts = await prisma.account.findMany({
    where: { type: "CASH", locationId: { in: locationIds }, isActive: true },
    select: { locationId: true },
  });
  const existingLocationIds = new Set(
    (existingLocationAccounts.map((a) => a.locationId).filter(Boolean) as string[])
  );
  const locationsToCreate = locations.filter((loc) => !existingLocationIds.has(loc.id));
  let locationCreated = 0;
  if (locationsToCreate.length > 0) {
    const result = await prisma.account.createMany({
      data: locationsToCreate.map((loc) => ({
        name: `Cash Book - ${loc.name}`,
        code: `CB-${loc.code}`,
        type: "CASH",
        parentAccountId: mainCash.id,
        locationId: loc.id,
        doctorId: null,
        agencyId: null,
        userId: null,
        creditCustomerId: null,
        minBalanceAllowed: null,
        isActive: true,
      })),
    });
    locationCreated = result.count;
    console.log("  Created", locationCreated, "location cash book(s).");
  }
  const locationSkipped = locations.length - locationCreated;
  console.log(`Locations: ${locationCreated} created, ${locationSkipped} already had accounts.\n`);

  // --- 3. Agent accounts (one Receivable per published agency; agency is debtor) ---
  const agencies = await prisma.agency.findMany({
    where: { status: 1 },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });
  const agencyIds = agencies.map((a) => a.id);
  const existingAgencyAccounts = await prisma.account.findMany({
    where: { type: "RECEIVABLE", agencyId: { in: agencyIds }, isActive: true },
    select: { agencyId: true },
  });
  const existingAgencyIds = new Set(
    (existingAgencyAccounts.map((a) => a.agencyId).filter(Boolean) as string[])
  );
  const agenciesToCreate = agencies.filter((ag) => !existingAgencyIds.has(ag.id));
  let agencyCreated = 0;
  if (agenciesToCreate.length > 0) {
    const result = await prisma.account.createMany({
      data: agenciesToCreate.map((ag) => ({
        name: `Agent - ${ag.name}`,
        code: ag.code ? `AGT-${ag.code}` : `AGT-${ag.id}`,
        type: "RECEIVABLE",
        parentAccountId: null,
        locationId: null,
        doctorId: null,
        agencyId: ag.id,
        userId: null,
        creditCustomerId: null,
        minBalanceAllowed: null,
        isActive: true,
      })),
    });
    agencyCreated = result.count;
    console.log("  Created", agencyCreated, "agent account(s).");
  }
  const agencySkipped = agencies.length - agencyCreated;
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
  const doctorIds = doctors.map((d) => d.id);
  const existingDoctorAccounts = await prisma.account.findMany({
    where: { type: "PAYABLE", doctorId: { in: doctorIds }, isActive: true },
    select: { doctorId: true },
  });
  const existingDoctorIds = new Set(
    (existingDoctorAccounts.map((a) => a.doctorId).filter(Boolean) as string[])
  );
  const doctorsToCreate = doctors.filter((doc) => !existingDoctorIds.has(doc.id));
  let doctorCreated = 0;
  if (doctorsToCreate.length > 0) {
    const result = await prisma.account.createMany({
      data: doctorsToCreate.map((doc) => ({
        name: doc.name,
        code: `DOC-${doc.code}`,
        type: "PAYABLE",
        parentAccountId: null,
        locationId: null,
        doctorId: doc.id,
        agencyId: null,
        userId: null,
        creditCustomerId: null,
        minBalanceAllowed: null,
        isActive: true,
      })),
    });
    doctorCreated = result.count;
    console.log("  Created", doctorCreated, "doctor account(s).");
  }
  const doctorSkipped = doctors.length - doctorCreated;
  console.log(`Doctors: ${doctorCreated} created, ${doctorSkipped} already had accounts.\n`);

  // --- 5. Credit Customer accounts (one Receivable per published credit customer) ---
  const creditCustomers = await prisma.creditCustomer.findMany({
    where: { status: 1 },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });
  const ccIds = creditCustomers.map((c) => c.id);
  const existingCcAccounts = await prisma.account.findMany({
    where: { type: "RECEIVABLE", creditCustomerId: { in: ccIds }, isActive: true },
    select: { creditCustomerId: true },
  });
  const existingCcIds = new Set(
    (existingCcAccounts.map((a) => a.creditCustomerId).filter(Boolean) as string[])
  );
  const ccsToCreate = creditCustomers.filter((cc) => !existingCcIds.has(cc.id));
  let creditCustomerCreated = 0;
  if (ccsToCreate.length > 0) {
    const result = await prisma.account.createMany({
      data: ccsToCreate.map((cc) => ({
        name: `Credit - ${cc.name}`,
        code: cc.code ?? `CC-${cc.id}`,
        type: "RECEIVABLE",
        parentAccountId: null,
        locationId: null,
        doctorId: null,
        agencyId: null,
        creditCustomerId: cc.id,
        userId: null,
        minBalanceAllowed: null,
        isActive: true,
      })),
    });
    creditCustomerCreated = result.count;
    console.log("  Created", creditCustomerCreated, "credit customer account(s).");
  }
  const creditCustomerSkipped = creditCustomers.length - creditCustomerCreated;
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
