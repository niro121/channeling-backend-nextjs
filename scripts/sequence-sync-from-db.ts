/**
 * Sync Sequence table from existing records so the next generated code won't collide.
 * Run this once after switching to Sequence-based code generation (speciality, doctor, agency).
 *
 *   npx tsx scripts/sequence-sync-from-db.ts
 *
 * Optionally sync only one scope:
 *   npx tsx scripts/sequence-sync-from-db.ts speciality
 *   npx tsx scripts/sequence-sync-from-db.ts doctor
 *   npx tsx scripts/sequence-sync-from-db.ts agency
 */

import 'dotenv/config'
import prisma from '@/lib/prisma'

function maxNumericFromCodes(
  codes: (string | null)[],
  pattern: RegExp
): number {
  let max = 0
  for (const code of codes) {
    if (!code) continue
    const m = code.match(pattern)
    if (m) {
      const n = parseInt(m[1], 10)
      if (!Number.isNaN(n) && n > max) max = n
    }
  }
  return max
}

async function syncSpeciality() {
  const specialities = await prisma.speciality.findMany({
    select: { code: true },
  })
  const max = maxNumericFromCodes(
    specialities.map((s) => s.code),
    /(\d+)$/
  )
  await prisma.sequence.upsert({
    where: { scopeKey: 'speciality' },
    create: { scopeKey: 'speciality', lastValue: max },
    update: { lastValue: max },
  })
  console.log(`speciality: max code number=${max}, next will be RHC${String(max + 1).padStart(4, '0')}`)
}

async function syncDoctor() {
  const doctors = await prisma.doctor.findMany({
    select: { code: true },
  })
  const max = maxNumericFromCodes(
    doctors.map((d) => d.code),
    /(\d+)$/
  )
  await prisma.sequence.upsert({
    where: { scopeKey: 'doctor' },
    create: { scopeKey: 'doctor', lastValue: max },
    update: { lastValue: max },
  })
  console.log(`doctor: max code number=${max}, next will be DR${String(max + 1).padStart(4, '0')}`)
}

async function syncAgency() {
  const agencies = await prisma.agency.findMany({
    select: { code: true },
    where: { code: { not: null } },
  })
  const codes = agencies.map((a) => a.code).filter((c): c is string => c != null)
  const max = maxNumericFromCodes(codes, /^(\d+)$/)
  await prisma.sequence.upsert({
    where: { scopeKey: 'agency' },
    create: { scopeKey: 'agency', lastValue: max },
    update: { lastValue: max },
  })
  console.log(`agency: max code number=${max}, next will be ${max + 1}`)
}

async function main() {
  const scope = process.argv[2]?.toLowerCase() // 'speciality' | 'doctor' | 'agency' | undefined

  if (!scope || scope === 'speciality') await syncSpeciality()
  if (!scope || scope === 'doctor') await syncDoctor()
  if (!scope || scope === 'agency') await syncAgency()
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
