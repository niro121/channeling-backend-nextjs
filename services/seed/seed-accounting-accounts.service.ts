/**
 * Seed accounting accounts (same logic as scripts/seed-accounting-accounts.ts).
 * Removes all accounting data then creates Main Cash Book, location cash books,
 * agent/doctor/credit-customer accounts, and syncs Sequence table.
 * Runs only when SEED_HELPER is enabled in .env.
 */

import prisma from "@/lib/prisma"
import { isSeedHelperEnabled, SEED_HELPER_DISABLED_MESSAGE } from "./seed-helper-enabled"

export type SeedAccountingAccountsResult =
  | { success: true; message: string; details: string }
  | { success: false; message: string }

export async function runSeedAccountingAccounts(
  doctorCodeFilter?: string | null
): Promise<SeedAccountingAccountsResult> {
  if (!isSeedHelperEnabled()) {
    return { success: false, message: SEED_HELPER_DISABLED_MESSAGE }
  }
  try {
    const lines: string[] = []

    const deletedRequests = await prisma.floatRequest.deleteMany({})
    // Break self-relation (forwardedToHandoverId) before deleting handovers
    await prisma.shiftHandover.updateMany({ data: { forwardedToHandoverId: null } })
    const deletedHandovers = await prisma.shiftHandover.deleteMany({})
    const deletedLines = await prisma.journalLine.deleteMany({})
    const deletedJournals = await prisma.journal.deleteMany({})
    await prisma.account.updateMany({ data: { parentAccountId: null } })
    const deletedAccounts = await prisma.account.deleteMany({})
    await prisma.receipt.updateMany({ data: { shiftId: null } })
    const deletedShifts = await prisma.shift.deleteMany({})
    lines.push(
      `Removed ${deletedRequests.count} float request(s), ${deletedHandovers.count} handover(s), ${deletedLines.count} journal line(s), ${deletedJournals.count} journal(s), ${deletedAccounts.count} account(s), ${deletedShifts.count} shift(s).`
    )

    let mainCash = await prisma.account.findFirst({
      where: { type: "CASH", parentAccountId: null, locationId: null, isActive: true },
    })
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
          maxBalanceAllowed: null,
          isActive: true,
        },
      })
      lines.push("Created Main Cash Book.")
    } else {
      lines.push("Main Cash Book already exists.")
    }

    const locations = await prisma.location.findMany({
      where: { status: 1 },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    })
    const locationIds = locations.map((l) => l.id)
    const existingLocationAccounts = await prisma.account.findMany({
      where: { type: "CASH", locationId: { in: locationIds }, isActive: true },
      select: { locationId: true },
    })
    const existingLocationIds = new Set(
      existingLocationAccounts.map((a) => a.locationId).filter(Boolean) as string[]
    )
    const locationsToCreate = locations.filter((loc) => !existingLocationIds.has(loc.id))
    let locationCreated = 0
    if (locationsToCreate.length > 0) {
      const result = await prisma.account.createMany({
        data: locationsToCreate.map((loc) => ({
          name: `Cash Book - ${loc.name}`,
          code: `CB-${loc.code}`,
          type: "CASH",
          parentAccountId: mainCash!.id,
          locationId: loc.id,
          doctorId: null,
          agencyId: null,
          userId: null,
          creditCustomerId: null,
          minBalanceAllowed: null,
          maxBalanceAllowed: null,
          isActive: true,
        })),
      })
      locationCreated = result.count
    }
    const locationSkipped = locations.length - locationCreated
    lines.push(`Location cash books: ${locationCreated} created, ${locationSkipped} existing.`)

    const agencies = await prisma.agency.findMany({
      where: { status: 1 },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    })
    const agencyIds = agencies.map((a) => a.id)
    const existingAgencyAccounts = await prisma.account.findMany({
      where: { type: "RECEIVABLE", agencyId: { in: agencyIds }, isActive: true },
      select: { agencyId: true },
    })
    const existingAgencyIds = new Set(
      existingAgencyAccounts.map((a) => a.agencyId).filter(Boolean) as string[]
    )
    const agenciesToCreate = agencies.filter((ag) => !existingAgencyIds.has(ag.id))
    let agencyCreated = 0
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
          maxBalanceAllowed: null,
          isActive: true,
        })),
      })
      agencyCreated = result.count
    }
    const agencySkipped = agencies.length - agencyCreated
    lines.push(`Agent accounts: ${agencyCreated} created, ${agencySkipped} existing.`)

    const doctorWhere: { status: number; code?: string } = { status: 1 }
    if (doctorCodeFilter?.trim()) {
      doctorWhere.code = doctorCodeFilter.trim()
    }
    const doctors = await prisma.doctor.findMany({
      where: doctorWhere,
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    })
    const doctorIds = doctors.map((d) => d.id)
    const existingDoctorAccounts = await prisma.account.findMany({
      where: { type: "PAYABLE", doctorId: { in: doctorIds }, isActive: true },
      select: { doctorId: true },
    })
    const existingDoctorIds = new Set(
      existingDoctorAccounts.map((a) => a.doctorId).filter(Boolean) as string[]
    )
    const doctorsToCreate = doctors.filter((doc) => !existingDoctorIds.has(doc.id))
    let doctorCreated = 0
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
          maxBalanceAllowed: null,
          isActive: true,
        })),
      })
      doctorCreated = result.count
    }
    const doctorSkipped = doctors.length - doctorCreated
    lines.push(`Doctor accounts: ${doctorCreated} created, ${doctorSkipped} existing.`)

    const creditCustomers = await prisma.creditCustomer.findMany({
      where: { status: 1 },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    })
    const ccIds = creditCustomers.map((c) => c.id)
    const existingCcAccounts = await prisma.account.findMany({
      where: { type: "RECEIVABLE", creditCustomerId: { in: ccIds }, isActive: true },
      select: { creditCustomerId: true },
    })
    const existingCcIds = new Set(
      existingCcAccounts.map((a) => a.creditCustomerId).filter(Boolean) as string[]
    )
    const ccsToCreate = creditCustomers.filter((cc) => !existingCcIds.has(cc.id))
    let creditCustomerCreated = 0
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
          maxBalanceAllowed: null,
          isActive: true,
        })),
      })
      creditCustomerCreated = result.count
    }
    const creditCustomerSkipped = creditCustomers.length - creditCustomerCreated
    lines.push(
      `Credit customer accounts: ${creditCustomerCreated} created, ${creditCustomerSkipped} existing.`
    )

    const CREDIT_CUSTOMER_SCOPE = "credit_customer"
    const AGENCY_SCOPE = "agency"
    const DOCTOR_SCOPE = "doctor"

    const allCreditCustomers = await prisma.creditCustomer.findMany({ select: { code: true } })
    const ccNumbers = allCreditCustomers
      .map((c) => (c.code ? parseInt(c.code.replace(/^CC-0*/, "") || "0", 10) : 0))
      .filter((n) => !Number.isNaN(n))
    const maxCc = ccNumbers.length ? Math.max(...ccNumbers) : 0
    if (maxCc > 0) {
      const existingCc = await prisma.sequence.findUnique({
        where: { scopeKey: CREDIT_CUSTOMER_SCOPE },
      })
      const newLastCc = Math.max(existingCc?.lastValue ?? 0, maxCc)
      await prisma.sequence.upsert({
        where: { scopeKey: CREDIT_CUSTOMER_SCOPE },
        create: { scopeKey: CREDIT_CUSTOMER_SCOPE, lastValue: newLastCc },
        update: { lastValue: newLastCc },
      })
    }

    const allAgencies = await prisma.agency.findMany({ select: { code: true } })
    const agNumbers = allAgencies
      .map((a) => (a.code ? parseInt(a.code, 10) : 0))
      .filter((n) => !Number.isNaN(n) && n > 0)
    const maxAg = agNumbers.length ? Math.max(...agNumbers) : 0
    if (maxAg > 0) {
      const existingAg = await prisma.sequence.findUnique({ where: { scopeKey: AGENCY_SCOPE } })
      const newLastAg = Math.max(existingAg?.lastValue ?? 0, maxAg)
      await prisma.sequence.upsert({
        where: { scopeKey: AGENCY_SCOPE },
        create: { scopeKey: AGENCY_SCOPE, lastValue: newLastAg },
        update: { lastValue: newLastAg },
      })
    }

    const allDoctors = await prisma.doctor.findMany({ select: { code: true } })
    const docNumbers = allDoctors
      .map((d) => (d.code ? parseInt(d.code.replace(/^DR0*/, "") || "0", 10) : 0))
      .filter((n) => !Number.isNaN(n))
    const maxDoc = docNumbers.length ? Math.max(...docNumbers) : 0
    if (maxDoc > 0) {
      const existingDoc = await prisma.sequence.findUnique({ where: { scopeKey: DOCTOR_SCOPE } })
      const newLastDoc = Math.max(existingDoc?.lastValue ?? 0, maxDoc)
      await prisma.sequence.upsert({
        where: { scopeKey: DOCTOR_SCOPE },
        create: { scopeKey: DOCTOR_SCOPE, lastValue: newLastDoc },
        update: { lastValue: newLastDoc },
      })
    }

    lines.push("Sequences synced: credit_customer, agency, doctor.")

    return {
      success: true,
      message: "Accounting accounts seeded successfully.",
      details: lines.join("\n"),
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, message: `Seed failed: ${message}` }
  }
}
