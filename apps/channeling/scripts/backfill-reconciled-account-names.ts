/**
 * Rename branch reconciled cash accounts to the branch-code convention.
 *
 * Before: name "Reconciled", code "REC-{locationId}"
 * After:  name "Reconciled - {branch name}", code "REC-{branch code}"
 *
 * Usage (from apps/channeling):
 *   Dry run:
 *     npx tsx scripts/backfill-reconciled-account-names.ts
 *
 *   Apply:
 *     npx tsx scripts/backfill-reconciled-account-names.ts --apply
 */

import "dotenv/config"
import prisma from "@/lib/prisma"
import {
  branchReconciledAccountCode,
  branchReconciledAccountName,
  isBranchReconciledCashAccount,
} from "@/services/accounting/account/branch-reconciled-account.constants"

function printUsage(): void {
  console.log(`Usage:
  npx tsx scripts/backfill-reconciled-account-names.ts [--apply]

  Without --apply, only reports the rename.`)
}

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply")
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    printUsage()
    return
  }

  const cashAccounts = await prisma.account.findMany({
    where: { type: "CASH", userId: null },
    select: {
      id: true,
      name: true,
      code: true,
      locationId: true,
      isActive: true,
      userId: true,
    },
    orderBy: { createdAt: "asc" },
  })

  const reconciled = cashAccounts.filter((account) => isBranchReconciledCashAccount(account))
  if (reconciled.length === 0) {
    console.log("No branch reconciled cash accounts found.")
    return
  }

  const locationIds = [...new Set(reconciled.map((account) => account.locationId).filter((id): id is string => Boolean(id)))]
  const locations = await prisma.location.findMany({
    where: { id: { in: locationIds } },
    select: { id: true, name: true, code: true },
  })
  const locationById = new Map(locations.map((location) => [location.id, location]))

  const codedAccounts = await prisma.account.findMany({
    where: { code: { not: null } },
    select: { id: true, code: true },
  })
  const codesInUse = new Map(
    codedAccounts
      .filter((account) => account.code)
      .map((account) => [account.code as string, account.id])
  )

  let updated = 0
  let unchanged = 0
  let skipped = 0

  for (const account of reconciled) {
    const label = `${account.name ?? "-"} (${account.code ?? "-"})`
    if (!account.locationId) {
      console.log(`SKIP ${label}: no branch location`)
      skipped += 1
      continue
    }
    const location = locationById.get(account.locationId)
    if (!location?.code?.trim()) {
      console.log(`SKIP ${label}: branch code is missing`)
      skipped += 1
      continue
    }

    const name = branchReconciledAccountName(location.name)
    const code = branchReconciledAccountCode(location.code)
    if (account.name === name && account.code === code) {
      console.log(`OK   ${label}`)
      unchanged += 1
      continue
    }

    const ownerId = codesInUse.get(code)
    if (ownerId && ownerId !== account.id) {
      console.log(`SKIP ${label}: code ${code} is already used by another account`)
      skipped += 1
      continue
    }

    console.log(`${apply ? "UPDATE" : "WOULD"} ${label} -> ${name} (${code})${account.isActive ? "" : " [inactive]"}`)
    if (!apply) {
      updated += 1
      continue
    }

    await prisma.account.update({
      where: { id: account.id },
      data: { name, code },
    })
    if (account.code) codesInUse.delete(account.code)
    codesInUse.set(code, account.id)
    updated += 1
  }

  console.log(
    apply
      ? `Done. Updated ${updated}, already correct ${unchanged}, skipped ${skipped}.`
      : `Dry run. Would update ${updated}, already correct ${unchanged}, skipped ${skipped}. Re-run with --apply to write.`
  )
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
