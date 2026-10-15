/**
 * Post agency prepaid balances from the legacy Sails migrate API onto Next.js ledgers.
 *
 * For each agency with a non-zero Sails `balance`:
 *   positive → Dr Agent Opening Balances, Cr Agent PAYABLE  (same as a credit note, contra is the control account)
 *   negative → Dr Agent PAYABLE, Cr Agent Opening Balances  (same as a debit note)
 *
 * Always empties the control account first (deletes journals that touch it) so re-runs are idempotent.
 * Creates the control account if missing.
 *
 *   npm run migrate:agency-opening-balances
 *   npm run migrate:agency-opening-balances -- --dry-run
 *
 * Env: MIGRATE_BASE_URL, MIGRATE_USER_KEY, MONGODB_URI
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { getNextSequenceNumber } from '@/services/channel-booking/helpers/sequence';
import { getOrCreateAgentOpeningBalancesAccount } from '@/services/accounting/account/agent-opening-balances-account.service';
import {
  AGENT_OPENING_BALANCES_ACCOUNT_CODE,
  AGENT_OPENING_BALANCES_ACCOUNT_NAME,
} from '@/services/accounting/account/agent-opening-balances-account.constants';
import { REFERENCE_TYPES } from '@/types/accounting';
import {
  createMigrateReporter,
  finishMigrateReporter,
  type MigrateSheetRow,
} from './lib/migrate-report';

const prisma = new PrismaClient();

const BASE_URL = process.env.MIGRATE_BASE_URL || 'http://localhost:1337';
const USER_KEY = process.env.MIGRATE_USER_KEY || '';
const IMPORT_USER_EMAIL = 'developer@archmage.lk';
const JOURNAL_SEQUENCE_SCOPE = 'journal';

const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
};

type SourceAgency = {
  id: string;
  name?: string;
  code?: string;
  balance?: number;
  status?: number;
};

type MigrateResponse<T> = {
  status: boolean;
  error_code: number;
} & Record<string, T[]>;

function fmtN(n: number): string {
  return n.toLocaleString('en-US');
}

function fmtMoney(cents: number): string {
  return (cents / 100).toFixed(2);
}

function rupeesToCents(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n === 0) return 0;
  return Math.round(n * 100);
}

function parseArgs(argv: string[]): { dryRun: boolean; help: boolean } {
  let dryRun = false;
  let help = false;
  for (const arg of argv) {
    if (arg === '--dry-run') dryRun = true;
    else if (arg === '--help' || arg === '-h') help = true;
  }
  return { dryRun, help };
}

function printHelp(): void {
  console.log(`
Post Sails agency balances onto Agent PAYABLE vs ${AGENT_OPENING_BALANCES_ACCOUNT_NAME}.

Usage:
  npm run migrate:agency-opening-balances
  npm run migrate:agency-opening-balances -- --dry-run

Always deletes existing journals on the control account, then re-posts from the live Sails balance.
`);
}

async function migrateFetch<T>(endpoint: string, listKey: string): Promise<T[]> {
  const url = `${BASE_URL.replace(/\/$/, '')}/api/v1/migrate/${endpoint}?user_key=${encodeURIComponent(USER_KEY)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  const data = (await res.json()) as MigrateResponse<T>;
  if (data.error_code !== 0) {
    if (data.error_code === 1) {
      throw new Error(`Invalid or missing user_key. Check MIGRATE_USER_KEY. URL: ${url}`);
    }
    throw new Error(`API error_code ${data.error_code}: ${url}`);
  }
  const list = data[listKey];
  return Array.isArray(list) ? list : [];
}

async function emptyOpeningBalanceAccount(accountId: string): Promise<{ journals: number; lines: number }> {
  const lines = await prisma.journalLine.findMany({
    where: { accountId },
    select: { journalId: true },
  });
  const journalIds = [...new Set(lines.map((l) => l.journalId))];
  if (journalIds.length === 0) return { journals: 0, lines: 0 };

  const deletedLines = await prisma.journalLine.deleteMany({
    where: { journalId: { in: journalIds } },
  });
  const deletedJournals = await prisma.journal.deleteMany({
    where: { id: { in: journalIds } },
  });
  return { journals: deletedJournals.count, lines: deletedLines.count };
}

async function getOrCreateAgencyPayable(agency: {
  id: string;
  name: string;
  code: string | null;
}): Promise<{ id: string; created: boolean }> {
  const existing = await prisma.account.findFirst({
    where: { type: 'PAYABLE', agencyId: agency.id, isActive: true },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  });
  if (existing) return { id: existing.id, created: false };

  const inactive = await prisma.account.findFirst({
    where: { type: 'PAYABLE', agencyId: agency.id, isActive: false },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  });
  if (inactive) {
    await prisma.account.update({
      where: { id: inactive.id },
      data: { isActive: true },
    });
    return { id: inactive.id, created: false };
  }

  const code = agency.code ? `AGT-${agency.code}` : `AGT-${agency.id}`.slice(0, 50);
  try {
    const created = await prisma.account.create({
      data: {
        name: `Agent - ${agency.name}`,
        code,
        type: 'PAYABLE',
        agencyId: agency.id,
        isActive: true,
      },
      select: { id: true },
    });
    return { id: created.id, created: true };
  } catch {
    const byCode = await prisma.account.findUnique({
      where: { code },
      select: { id: true, agencyId: true, type: true },
    });
    if (byCode && byCode.type === 'PAYABLE' && byCode.agencyId === agency.id) {
      return { id: byCode.id, created: false };
    }
    const fallback = await prisma.account.create({
      data: {
        name: `Agent - ${agency.name}`,
        code: `AGT-${agency.id}`.slice(0, 50),
        type: 'PAYABLE',
        agencyId: agency.id,
        isActive: true,
      },
      select: { id: true },
    });
    return { id: fallback.id, created: true };
  }
}

async function nextJournalNumber(): Promise<number | null> {
  const seq = await getNextSequenceNumber(JOURNAL_SEQUENCE_SCOPE, { startFrom: 1 });
  return seq.success ? seq.value : null;
}

async function main(): Promise<void> {
  const { dryRun, help } = parseArgs(process.argv.slice(2));
  if (help) {
    printHelp();
    return;
  }

  if (!USER_KEY) {
    console.error('Set MIGRATE_USER_KEY (and optionally MIGRATE_BASE_URL) in .env');
    process.exit(1);
  }

  const importUser = await prisma.user.findUnique({
    where: { email: IMPORT_USER_EMAIL },
    select: { id: true },
  });
  if (!importUser) {
    console.error(`Import user not found: ${IMPORT_USER_EMAIL}. Create it first.`);
    process.exit(1);
  }

  const reporter = createMigrateReporter('migrate-agency-opening-balances', {
    baseUrl: BASE_URL,
    dryRun: String(dryRun),
  });

  console.log(`\n${ANSI.bold}Agency opening balances${ANSI.reset}`);
  console.log(`  Source   ${BASE_URL}`);
  console.log(`  User     ${IMPORT_USER_EMAIL}`);
  console.log(`  Account  ${AGENT_OPENING_BALANCES_ACCOUNT_NAME} (${AGENT_OPENING_BALANCES_ACCOUNT_CODE})`);
  console.log(`  Mode     ${dryRun ? 'DRY RUN — no writes' : 'empty control account, then post journals'}`);
  console.log('');

  const source = await migrateFetch<SourceAgency>('all-agencies', 'agencylist');
  const withBalance = source.filter((a) => rupeesToCents(a.balance) !== 0);
  console.log(
    `  ${fmtN(source.length)} agencies from API  ·  ${fmtN(withBalance.length)} with non-zero balance`
  );

  let openingAccountId: string | null = null;
  if (dryRun) {
    const existing = await prisma.account.findFirst({
      where: {
        OR: [{ code: AGENT_OPENING_BALANCES_ACCOUNT_CODE }, { name: AGENT_OPENING_BALANCES_ACCOUNT_NAME }],
      },
      select: { id: true, name: true, code: true },
    });
    if (!existing) {
      console.log(`  Control  would create ${AGENT_OPENING_BALANCES_ACCOUNT_NAME} (${AGENT_OPENING_BALANCES_ACCOUNT_CODE})`);
    } else {
      openingAccountId = existing.id;
      const toClear = await prisma.journalLine.count({ where: { accountId: existing.id } });
      console.log(`  Control  ${existing.name}  ${existing.code ?? ''}  id=${existing.id}`);
      console.log(`  ${ANSI.yellow}Would empty ${fmtN(toClear)} journal line(s) on the control account${ANSI.reset}`);
    }
  } else {
    const opening = await getOrCreateAgentOpeningBalancesAccount();
    if (!opening.success) {
      throw new Error(opening.error);
    }
    openingAccountId = opening.account.id;
    console.log(`  Control  ${opening.account.name}  ${opening.account.code ?? ''}  id=${opening.account.id}`);
    const cleared = await emptyOpeningBalanceAccount(opening.account.id);
    console.log(
      `  Emptied  ${fmtN(cleared.journals)} journal(s), ${fmtN(cleared.lines)} line(s)`
    );
  }

  const agencies = await prisma.agency.findMany({
    where: { migrateSourceId: { not: null } },
    select: { id: true, name: true, code: true, migrateSourceId: true },
  });
  const byLegacyId = new Map(agencies.map((a) => [a.migrateSourceId as string, a]));

  const sheetRows: MigrateSheetRow[] = [];
  let posted = 0;
  let skippedZero = source.length - withBalance.length;
  let skippedMissing = 0;
  let failed = 0;
  let accountsCreated = 0;

  for (const src of withBalance) {
    const cents = rupeesToCents(src.balance);
    const agency = byLegacyId.get(src.id);
    if (!agency) {
      skippedMissing++;
      reporter?.issue(
        'agency-opening-balances',
        'missing_agency',
        src.id,
        `${src.name ?? ''} ${src.code ?? ''} balance=${src.balance}`
      );
      sheetRows.push({
        result: 'skipped',
        legacyId: src.id,
        code: src.code ?? '',
        name: src.name ?? '',
        sailsBalance: src.balance ?? 0,
        cents,
        note: 'agency not imported',
      });
      continue;
    }

    const side = cents > 0 ? 'credit agent' : 'debit agent';
    const amount = Math.abs(cents);

    if (dryRun) {
      posted++;
      sheetRows.push({
        result: 'dry-run',
        legacyId: src.id,
        code: agency.code ?? '',
        name: agency.name,
        sailsBalance: src.balance ?? 0,
        cents,
        note: side,
      });
      continue;
    }

    try {
      const payable = await getOrCreateAgencyPayable(agency);
      if (payable.created) accountsCreated++;

      const journalNumber = await nextJournalNumber();
      const agentDebit = cents < 0 ? amount : 0;
      const agentCredit = cents > 0 ? amount : 0;
      const openingDebit = cents > 0 ? amount : 0;
      const openingCredit = cents < 0 ? amount : 0;

      const journal = await prisma.journal.create({
        data: {
          journalNumber,
          date: new Date(),
          description: `Agency opening balance — ${agency.name}${agency.code ? ` (${agency.code})` : ''}`,
          referenceType: REFERENCE_TYPES.AgencyOpeningBalance,
          referenceId: agency.id,
          createdBy: importUser.id,
        },
      });

      await prisma.journalLine.createMany({
        data: [
          {
            journalId: journal.id,
            accountId: openingAccountId!,
            debitAmount: openingDebit,
            creditAmount: openingCredit,
            memo: side,
          },
          {
            journalId: journal.id,
            accountId: payable.id,
            debitAmount: agentDebit,
            creditAmount: agentCredit,
            memo: side,
          },
        ],
      });

      posted++;
      sheetRows.push({
        result: 'posted',
        legacyId: src.id,
        code: agency.code ?? '',
        name: agency.name,
        sailsBalance: src.balance ?? 0,
        cents,
        note: side,
      });
    } catch (e) {
      failed++;
      const message = e instanceof Error ? e.message : String(e);
      reporter?.issue('agency-opening-balances', 'post_failed', src.id, message);
      sheetRows.push({
        result: 'failed',
        legacyId: src.id,
        code: agency.code ?? '',
        name: agency.name,
        sailsBalance: src.balance ?? 0,
        cents,
        note: message,
      });
    }
  }

  reporter?.records(
    'Agency opening balances',
    [
      { header: 'Result', key: 'result', width: 12 },
      { header: 'Legacy id', key: 'legacyId', width: 28 },
      { header: 'Code', key: 'code', width: 14 },
      { header: 'Name', key: 'name', width: 36 },
      { header: 'Sails balance', key: 'sailsBalance', width: 16 },
      { header: 'Cents', key: 'cents', width: 12 },
      { header: 'Note', key: 'note', width: 28 },
    ],
    sheetRows
  );

  reporter?.task('agency-opening-balances', {
    detected: source.length,
    created: posted,
    skipped: skippedZero + skippedMissing,
    failed,
    notes: [
      dryRun ? 'dry-run' : undefined,
      `${fmtN(skippedZero)} zero balance`,
      skippedMissing > 0 ? `${fmtN(skippedMissing)} missing agency` : undefined,
      accountsCreated > 0 ? `${fmtN(accountsCreated)} agent accounts created` : undefined,
    ]
      .filter(Boolean)
      .join('; '),
  });

  await finishMigrateReporter(reporter);

  console.log('');
  console.log(`${ANSI.bold}${dryRun ? 'Dry run complete' : 'Agency opening balances complete'}${ANSI.reset}`);
  console.log(`  Posted   ${fmtN(posted)}${dryRun ? ' (would post)' : ''}`);
  console.log(`  Zero     ${fmtN(skippedZero)} skipped`);
  if (skippedMissing > 0) {
    console.log(`  ${ANSI.yellow}Missing  ${fmtN(skippedMissing)} (not imported)${ANSI.reset}`);
  }
  if (accountsCreated > 0) {
    console.log(`  Accounts ${fmtN(accountsCreated)} agent PAYABLE created`);
  }
  if (failed > 0) {
    console.log(`  ${ANSI.red}Failed   ${fmtN(failed)}${ANSI.reset}`);
  }
  const postedCents = sheetRows
    .filter((r) => r.result === 'posted' || r.result === 'dry-run')
    .reduce((sum, r) => sum + (Number(r.cents) || 0), 0);
  console.log(`  Total    ${fmtMoney(postedCents)} on agent payables`);
  console.log('');

  if (failed > 0) process.exit(1);
}

main()
  .catch(async (e) => {
    console.error(`${ANSI.red}${ANSI.bold}Agency opening balances failed:${ANSI.reset}`, e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
