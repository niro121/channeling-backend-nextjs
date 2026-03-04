/**
 * Create accounting accounts linked to Location, Agency, and Doctor models:
 * - Main Cash Book (if missing)
 * - One Cash account per Location (branch cash books), linked to main Cash Book
 * - One Payable account per Agency (agent accounts), linked to Agency
 * - One Payable account per Doctor (doctor accounts), linked to Doctor
 *
 * When run as a fresh seed, first removes all accounts and their journal entries
 * (FloatRequest → JournalLine → Journal → Account), then creates accounts from scratch.
 * Only published entities (status === 1) are processed.
 *
 * Run: npx tsx scripts/seed-accounting-accounts.ts
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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

  // --- 3. Agent accounts (one Payable per published agency) ---
  const agencies = await prisma.agency.findMany({
    where: { status: 1 },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });

  let agencyCreated = 0;
  let agencySkipped = 0;

  for (const ag of agencies) {
    const existing = await prisma.account.findFirst({
      where: { type: "PAYABLE", agencyId: ag.id, isActive: true },
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
        type: "PAYABLE",
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

  // --- 4. Doctor accounts (one Payable per published doctor) ---
  const doctors = await prisma.doctor.findMany({
    where: { status: 1 },
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
        name: `Doctor Payable - ${doc.name}`,
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

  console.log("Done.");
  console.log("Summary:");
  console.log("  Main Cash Book: 1");
  console.log(`  Location cash books: ${locationCreated} created, ${locationSkipped} existing`);
  console.log(`  Agent accounts: ${agencyCreated} created, ${agencySkipped} existing`);
  console.log(`  Doctor accounts: ${doctorCreated} created, ${doctorSkipped} existing`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
