/**
 * Create missing GL accounts for migrated locations, doctors, agencies, and credit customers.
 *
 * Does NOT wipe journals or existing accounts (unlike seed-accounting-accounts).
 * Re-runs only create what is still missing.
 *
 *   npm run migrate:accounting-accounts
 *
 * Env: MONGODB_URI
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { getOrCreateAccount } from '@/services/accounting/account/get-or-create.service';
import { getMainCashBookAccount } from '@/services/accounting/account/read.service';
import { createAccount } from '@/services/accounting/account/write.service';
import { getOrCreateWhtPayableAccount } from '@/services/accounting/account/wht-payable-account.service';
import { getOrCreateAgentOpeningBalancesAccount } from '@/services/accounting/account/agent-opening-balances-account.service';
import {
  createMigrateReporter,
  finishMigrateReporter,
} from './lib/migrate-report';

const prisma = new PrismaClient();

const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
};

function fmtN(n: number): string {
  return n.toLocaleString('en-US');
}

type EnsureStats = { created: number; existing: number; failed: number };

function emptyStats(): EnsureStats {
  return { created: 0, existing: 0, failed: 0 };
}

function printHelp(): void {
  console.log(`
Create missing GL accounts for locations (cash/income/expense), doctors, agencies, credit customers,
Main Cash Book, WHT Payable, and Agent Opening Balances.

Does not delete existing accounts or journals.

Usage:
  npm run migrate:accounting-accounts
`);
}

async function ensureMainCashBook(): Promise<{ created: boolean; id: string }> {
  const existing = await getMainCashBookAccount();
  if (existing) return { created: false, id: existing.id };

  const created = await createAccount({
    name: 'Main Cash Book',
    code: 'CB-MAIN',
    type: 'CASH',
    parentAccountId: null,
    locationId: null,
    doctorId: null,
    agencyId: null,
    creditCustomerId: null,
    userId: null,
    minBalanceAllowed: null,
  });
  if (!created.success || !created.account) {
    throw new Error(created.success ? 'Could not create Main Cash Book' : created.error);
  }
  return { created: true, id: created.account.id };
}

async function ensureOne(
  params: Parameters<typeof getOrCreateAccount>[0],
  stats: EnsureStats,
  failures: string[],
  label: string
): Promise<void> {
  const before = await lookupExisting(params);
  const result = await getOrCreateAccount(params);
  if (!result.success) {
    stats.failed++;
    failures.push(`${label}: ${result.error}`);
    return;
  }
  if (before) stats.existing++;
  else stats.created++;
}

async function lookupExisting(params: Parameters<typeof getOrCreateAccount>[0]): Promise<boolean> {
  const where: {
    type: typeof params.type;
    isActive: boolean;
    locationId?: string;
    doctorId?: string;
    agencyId?: string;
    creditCustomerId?: string;
    userId?: string;
  } = { type: params.type, isActive: true };
  if (params.locationId) where.locationId = params.locationId;
  if (params.doctorId) where.doctorId = params.doctorId;
  if (params.agencyId) where.agencyId = params.agencyId;
  if (params.creditCustomerId) where.creditCustomerId = params.creditCustomerId;
  if (params.userId) where.userId = params.userId;
  const row = await prisma.account.findFirst({ where, select: { id: true } });
  return Boolean(row);
}

async function main(): Promise<void> {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    printHelp();
    return;
  }

  const reporter = createMigrateReporter('migrate-accounting-accounts', {});
  const failures: string[] = [];

  console.log(`\n${ANSI.bold}GL accounts${ANSI.reset}`);
  console.log(`  Create missing location / doctor / agency / credit-customer accounts (no wipe)\n`);

  const mainCash = await ensureMainCashBook();
  console.log(
    `  Main Cash Book  ${mainCash.created ? `${ANSI.green}created${ANSI.reset}` : 'already exists'}  ${mainCash.id}`
  );

  const locationStats = emptyStats();
  const locations = await prisma.location.findMany({
    select: { id: true, name: true, code: true },
    orderBy: { name: 'asc' },
  });
  for (const loc of locations) {
    await ensureOne({ type: 'CASH', locationId: loc.id }, locationStats, failures, `Cash ${loc.code ?? loc.name}`);
    await ensureOne({ type: 'INCOME', locationId: loc.id }, locationStats, failures, `Income ${loc.code ?? loc.name}`);
    await ensureOne({ type: 'EXPENSE', locationId: loc.id }, locationStats, failures, `Expense ${loc.code ?? loc.name}`);
  }
  console.log(
    `  Locations (${fmtN(locations.length)})  cash/income/expense  ${fmtN(locationStats.created)} created  ${fmtN(locationStats.existing)} existing` +
      (locationStats.failed ? `  ${ANSI.red}${fmtN(locationStats.failed)} failed${ANSI.reset}` : '')
  );

  const doctorStats = emptyStats();
  const doctors = await prisma.doctor.findMany({
    select: { id: true, name: true, code: true },
    orderBy: { name: 'asc' },
  });
  for (const doc of doctors) {
    await ensureOne(
      { type: 'PAYABLE', doctorId: doc.id },
      doctorStats,
      failures,
      `Doctor ${doc.code ?? doc.name}`
    );
  }
  console.log(
    `  Doctors (${fmtN(doctors.length)})  PAYABLE  ${fmtN(doctorStats.created)} created  ${fmtN(doctorStats.existing)} existing` +
      (doctorStats.failed ? `  ${ANSI.red}${fmtN(doctorStats.failed)} failed${ANSI.reset}` : '')
  );

  const agencyStats = emptyStats();
  const agencies = await prisma.agency.findMany({
    select: { id: true, name: true, code: true },
    orderBy: { name: 'asc' },
  });
  for (const ag of agencies) {
    await ensureOne(
      { type: 'PAYABLE', agencyId: ag.id },
      agencyStats,
      failures,
      `Agency ${ag.code ?? ag.name}`
    );
  }
  console.log(
    `  Agencies (${fmtN(agencies.length)})  PAYABLE  ${fmtN(agencyStats.created)} created  ${fmtN(agencyStats.existing)} existing` +
      (agencyStats.failed ? `  ${ANSI.red}${fmtN(agencyStats.failed)} failed${ANSI.reset}` : '')
  );

  const ccStats = emptyStats();
  const creditCustomers = await prisma.creditCustomer.findMany({
    select: { id: true, name: true, code: true },
    orderBy: { name: 'asc' },
  });
  for (const cc of creditCustomers) {
    await ensureOne(
      { type: 'RECEIVABLE', creditCustomerId: cc.id },
      ccStats,
      failures,
      `Credit ${cc.code ?? cc.name}`
    );
  }
  console.log(
    `  Credit customers (${fmtN(creditCustomers.length)})  RECEIVABLE  ${fmtN(ccStats.created)} created  ${fmtN(ccStats.existing)} existing` +
      (ccStats.failed ? `  ${ANSI.red}${fmtN(ccStats.failed)} failed${ANSI.reset}` : '')
  );

  const wht = await getOrCreateWhtPayableAccount();
  if (!wht.success) {
    failures.push(`WHT Payable: ${wht.error}`);
    console.log(`  ${ANSI.red}WHT Payable  failed: ${wht.error}${ANSI.reset}`);
  } else {
    console.log(`  WHT Payable  ${wht.account.code ?? ''}  ${wht.account.id}`);
  }

  const opening = await getOrCreateAgentOpeningBalancesAccount();
  if (!opening.success) {
    failures.push(`Agent Opening Balances: ${opening.error}`);
    console.log(`  ${ANSI.red}Agent Opening Balances  failed: ${opening.error}${ANSI.reset}`);
  } else {
    console.log(`  Agent Opening Balances  ${opening.account.code ?? ''}  ${opening.account.id}`);
  }

  for (const line of failures) {
    reporter?.issue('accounting-accounts', 'create_failed', line.split(':')[0] ?? 'account', line);
  }

  const created =
    (mainCash.created ? 1 : 0) +
    locationStats.created +
    doctorStats.created +
    agencyStats.created +
    ccStats.created;
  const existing =
    (mainCash.created ? 0 : 1) +
    locationStats.existing +
    doctorStats.existing +
    agencyStats.existing +
    ccStats.existing;
  const failed = locationStats.failed + doctorStats.failed + agencyStats.failed + ccStats.failed + (wht.success ? 0 : 1) + (opening.success ? 0 : 1);

  reporter?.task('accounting-accounts', {
    detected: locations.length + doctors.length + agencies.length + creditCustomers.length,
    created,
    updated: existing,
    failed,
    notes: failures.length ? failures.slice(0, 5).join('; ') : undefined,
  });

  await finishMigrateReporter(reporter);

  console.log('');
  console.log(`${ANSI.bold}GL accounts complete${ANSI.reset}`);
  console.log(`  Created  ${fmtN(created)}  ·  already existed  ${fmtN(existing)}`);
  if (failed > 0) {
    console.log(`  ${ANSI.red}Failed   ${fmtN(failed)}${ANSI.reset}`);
    for (const line of failures.slice(0, 20)) {
      console.log(`         ${ANSI.dim}${line}${ANSI.reset}`);
    }
    if (failures.length > 20) console.log(`         ${ANSI.dim}… ${failures.length - 20} more${ANSI.reset}`);
    console.log('');
    process.exit(1);
  }
  console.log('');
}

main()
  .catch((e) => {
    console.error(`${ANSI.red}${ANSI.bold}GL accounts failed:${ANSI.reset}`, e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
