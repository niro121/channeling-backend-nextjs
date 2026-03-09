/**
 * Debug script: run the same find query as getOrCreateAccount for PAYABLE + doctorId
 * to see why the account is not found.
 *
 * Run: npx tsx scripts/debug-get-or-create-account.ts
 * Or with a doctor id: npx tsx scripts/debug-get-or-create-account.ts 699291bd1e3b17119840a946
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DOCTOR_ID = process.argv[2]?.trim() || "699291bd1e3b17119840a946";

async function main() {
  console.log("Debug getOrCreateAccount lookup for PAYABLE + doctorId\n");
  console.log("Doctor ID:", DOCTOR_ID);
  console.log("");

  // 1. Exact same where as get-or-create.service.ts (PAYABLE + doctorId string)
  const whereExact = {
    type: "PAYABLE" as const,
    locationId: null,
    doctorId: DOCTOR_ID,
    agencyId: null,
    creditCustomerId: null,
    userId: null,
    isActive: true,
  };

  console.log("--- 1. Exact where (same as getOrCreateAccount) ---");
  console.log("where:", JSON.stringify(whereExact, null, 2));

  const rowsExact = await prisma.account.findMany({
    where: whereExact,
    take: 1,
    include: {
      location: { select: { id: true, name: true } },
      doctor: { select: { id: true, name: true, code: true } },
      agency: { select: { id: true, name: true, code: true } },
      creditCustomer: { select: { id: true, name: true, code: true } },
    },
  });
  console.log("findMany result count:", rowsExact.length);
  if (rowsExact[0]) {
    console.log("First row id:", rowsExact[0].id);
    console.log("First row doctorId (type):", typeof rowsExact[0].doctorId, "value:", rowsExact[0].doctorId);
  } else {
    console.log("No rows returned.");
  }
  console.log("");

  // 2. All PAYABLE accounts (no doctorId filter)
  console.log("--- 2. All PAYABLE + isActive:true (no doctorId) ---");
  const allPayable = await prisma.account.findMany({
    where: { type: "PAYABLE", isActive: true },
    select: { id: true, code: true, name: true, doctorId: true },
    take: 20,
  });
  console.log("Count:", allPayable.length);
  for (const a of allPayable) {
    console.log("  ", a.id, "| doctorId:", a.doctorId, "|", a.code, a.name);
  }
  console.log("");

  // 3. Does a Doctor with this id exist?
  console.log("--- 3. Doctor with id exists? ---");
  const doctor = await prisma.doctor.findUnique({
    where: { id: DOCTOR_ID },
    select: { id: true, name: true, code: true },
  });
  console.log(doctor ? `Yes: ${doctor.name} (${doctor.code})` : "No doctor found with that id.");
  console.log("");

  // 4. findFirst with same where (in case findMany vs findFirst differs)
  console.log("--- 4. findFirst with same where ---");
  const first = await prisma.account.findFirst({
    where: whereExact,
    include: { doctor: { select: { id: true, name: true } } },
  });
  console.log("findFirst result:", first ? first.id : null);
  console.log("");

  // 5. Count by doctorId only (type PAYABLE)
  console.log("--- 5. Count where type=PAYABLE and doctorId=<string> ---");
  const countStr = await prisma.account.count({
    where: { type: "PAYABLE", doctorId: DOCTOR_ID, isActive: true },
  });
  console.log("count(doctorId string):", countStr);
  console.log("");

  // 6. Plain query: doctorId only (no type, no other fields)
  console.log("--- 6. findMany where doctorId only ---");
  const byDoctorIdOnly = await prisma.account.findMany({
    where: { doctorId: DOCTOR_ID },
    select: { id: true, code: true, name: true, type: true, doctorId: true },
  });
  console.log("where: { doctorId: '" + DOCTOR_ID + "' }");
  console.log("findMany result count:", byDoctorIdOnly.length);
  if (byDoctorIdOnly.length > 0) {
    byDoctorIdOnly.forEach((a, i) => console.log("  ", i + 1, a.id, "|", a.type, "|", a.code, a.name));
  } else {
    console.log("No rows returned.");
  }

  console.log("\nDone.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
