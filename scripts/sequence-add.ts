/**
 * Add or update a record in the Sequence table.
 * Use this to initialize or fix a sequence (e.g. speciality code) so the next
 * getNextSequenceNumber(scopeKey) returns lastValue + 1.
 *
 * Usage:
 *   npx tsx scripts/sequence-add.ts [scopeKey] [lastValue]
 *
 * Examples:
 *   npx tsx scripts/sequence-add.ts speciality 5     # Next speciality code will be 6 → RHC0006
 *   npx tsx scripts/sequence-add.ts speciality 0    # Next will be 1 → RHC0001
 *   npx tsx scripts/sequence-add.ts "receipt:loc-id" 100
 *
 * If lastValue is omitted, defaults to 0 (so next value will be 1 for startFrom:1).
 */

import 'dotenv/config'
import prisma from '@/lib/prisma'

async function main() {
  const scopeKey = process.argv[2] ?? 'speciality'
  const lastValueArg = process.argv[3]
  const lastValue = lastValueArg !== undefined ? parseInt(lastValueArg, 10) : 0
  if (Number.isNaN(lastValue)) {
    console.error('Invalid lastValue. Use a number.')
    process.exit(1)
  }

  const seq = await prisma.sequence.upsert({
    where: { scopeKey },
    create: { scopeKey, lastValue },
    update: { lastValue },
  })

  console.log(`Sequence: scopeKey="${seq.scopeKey}" lastValue=${seq.lastValue} (next value will be ${seq.lastValue + 1})`)
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
