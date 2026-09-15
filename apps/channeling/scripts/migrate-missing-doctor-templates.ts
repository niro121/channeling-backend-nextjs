/**
 * Import DoctorSession rows that session migration needs but doctor-session import skipped
 * (usually legacy start_time=0 — times parsed from apply_to_date + template name).
 *
 * Usage:
 *   npm run migrate:missing-doctor-templates
 *   npx tsx scripts/migrate-missing-doctor-templates.ts --template-id=691449ea44ef9606a0536f47
 */

import 'dotenv/config';
import moment from 'moment';
import { PrismaClient } from '@prisma/client';
import {
  IMPORT_USER_EMAIL,
  MIGRATE_USER_KEY,
  migrateFetch,
  toLegacyString,
} from './lib/migrate-api';
import { importMissingDoctorTemplatesByIds } from './lib/import-missing-doctor-template';

const prisma = new PrismaClient();

const SL_OFFSET_MINUTES = 330;
const DEFAULT_FUTURE_YEARS = 5;

type SourceSession = {
  session_id: string;
  doctor_session_id: string;
};

function todayYmdSriLanka(): string {
  return moment().utcOffset(SL_OFFSET_MINUTES).format('YYYY-MM-DD');
}

async function collectMissingTemplateIds(
  fromDate: string,
  toDate: string
): Promise<string[]> {
  const list = await migrateFetch<SourceSession>('all-sessions', 'sessionlist', {
    from_date: fromDate,
    to_date: toDate,
  });
  const existing = await prisma.doctorSession.findMany({
    where: { migrateSourceId: { not: null } },
    select: { migrateSourceId: true },
  });
  const have = new Set(existing.map((r) => r.migrateSourceId).filter(Boolean) as string[]);
  const missing = new Set<string>();
  for (const row of list) {
    const tid = toLegacyString(row.doctor_session_id);
    if (tid && !have.has(tid)) missing.add(tid);
  }
  return Array.from(missing);
}

async function main(): Promise<void> {
  if (!MIGRATE_USER_KEY) {
    console.error('Set MIGRATE_USER_KEY');
    process.exit(1);
  }

  const argv = process.argv.slice(2);
  let templateIds: string[] = [];
  let fromDate = todayYmdSriLanka();
  let toDate = moment.utc(fromDate, 'YYYY-MM-DD').add(DEFAULT_FUTURE_YEARS, 'years').format('YYYY-MM-DD');

  for (const arg of argv) {
    if (arg.startsWith('--template-id=')) templateIds.push(arg.slice(14).trim());
    else if (arg.startsWith('--from-date=')) fromDate = arg.slice(12).trim();
    else if (arg.startsWith('--to-date=')) toDate = arg.slice(10).trim();
  }

  const importUser = await prisma.user.findUnique({
    where: { email: IMPORT_USER_EMAIL },
    select: { id: true },
  });
  if (!importUser) {
    console.error(`User not found: ${IMPORT_USER_EMAIL}`);
    process.exit(1);
  }

  if (templateIds.length === 0) {
    console.log(`Finding missing templates from sessions ${fromDate}..${toDate}...`);
    templateIds = await collectMissingTemplateIds(fromDate, toDate);
  }

  console.log(`Importing ${templateIds.length} doctor template(s)...\n`);
  const result = await importMissingDoctorTemplatesByIds(templateIds, importUser.id);
  console.log(`\nDone: created=${result.created} updated=${result.updated} skipped=${result.skipped}`);
  console.log('Next: npm run migrate:sessions-bookings  (or npm run migrate:all for the full pipeline)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
