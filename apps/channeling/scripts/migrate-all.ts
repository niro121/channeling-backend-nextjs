/**
 * Run the full legacy → Next.js migration pipeline in order.
 *
 *   npm run migrate:all
 *   npm run migrate:all -- --from-date=2024-01-01 --to-date=2024-12-31
 *   npm run migrate:all -- --help
 *
 * Steps (stops on first failure):
 *   1. migrate-import
 *   2. migrate-accounting-accounts (location/doctor/agency GL accounts; no wipe)
 *   3. migrate-doctor-sessions
 *   4. migrate-missing-doctor-templates (legacy start_time=0 templates; same lib as [fix] in step 5)
 *   5. migrate-sessions-bookings (--no-fix-templates; preflight already ran in step 4)
 *   6. sequence-sync-from-db
 *   7. migrate-agency-opening-balances
 *
 * Env: MIGRATE_BASE_URL, MIGRATE_USER_KEY, MONGODB_URI (same as child scripts).
 */

import { spawnSync } from 'child_process';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');

type PipelineArgs = {
  help: boolean;
  importFlush: boolean;
  doctorNoWipe: boolean;
  doctorIncludeUnpublished: boolean;
  sessionsNoWipe: boolean;
  sessionsFromDate: string | null;
  sessionsToDate: string | null;
  sessionsDoctor: string | null;
  sessionsDryRun: boolean;
  sessionConcurrency: number | null;
  bookingConcurrency: number | null;
  skipSequenceSync: boolean;
  skipAgencyOpeningBalances: boolean;
  skipAccountingAccounts: boolean;
  importOnly: string | null;
  skipImport: boolean;
  skipDoctorSessions: boolean;
  skipSessionsBookings: boolean;
  skipMissingDoctorTemplates: boolean;
  /** Use only the inline [fix] inside migrate-sessions-bookings (skip step 3). */
  inlineFixOnly: boolean;
};

function printHelp(): void {
  console.log(`
Full migration pipeline (runs child scripts via tsx).

Usage:
  npm run migrate:all
  npm run migrate:all -- [options]

Options:
  --help                    Show this help

  Step 1 (migrate-import):
  --no-flush-import         Import without flushing migrate tables (default: --flush)
  --only=specialities,...   Pass through to migrate-import --only=
  --skip-import             Skip step 1

  Step 2 (GL accounts):
  --skip-accounting-accounts  Skip creating missing location/doctor/agency GL accounts

  Step 3 (migrate-doctor-sessions):
  --no-wipe-templates       Keep existing DoctorSession rows (default: wipe)
  --no-include-unpublished  Only published legacy templates (default: --include-unpublished)
  --skip-doctor-sessions    Skip step 3

  Step 4 (migrate-missing-doctor-templates):
  --skip-missing-doctor-templates  Skip preflight template import
  --inline-fix-only         Skip step 4; use [fix] inside sessions step only (old behaviour)

  Step 5 (migrate-sessions-bookings):
  --no-wipe-sessions        Keep existing sessions/bookings (default: wipe)
  --from-date=YYYY-MM-DD    Date range for steps 4–5 (default: today .. +5y)
  --to-date=YYYY-MM-DD
  --doctor=<legacyId>       Filter by legacy doctor migrateSourceId
  --dry-run                 Sessions/bookings dry run (no writes; skips step 4)
  --concurrency=N           Session import parallelism (default 50 in child script)
  --booking-concurrency=N   Booking import parallelism (default 20; lower if DB feels slow)
  --skip-sessions-bookings  Skip step 5

  Step 6 (sequence-sync):
  --skip-sequence-sync      Skip sequence:sync

  Step 7 (agency opening balances):
  --skip-agency-opening-balances  Skip posting Sails agency balances onto Agent Opening Balances

Examples:
  npm run migrate:all
  npm run migrate:all -- --from-date=2024-01-01 --to-date=2024-12-31
  npm run migrate:all -- --no-flush-import --no-wipe-sessions
`);
}

function parseArgs(argv: string[]): PipelineArgs {
  const out: PipelineArgs = {
    help: false,
    importFlush: true,
    doctorNoWipe: false,
    doctorIncludeUnpublished: true,
    sessionsNoWipe: false,
    sessionsFromDate: null,
    sessionsToDate: null,
    sessionsDoctor: null,
    sessionsDryRun: false,
    sessionConcurrency: null,
    bookingConcurrency: null,
    skipSequenceSync: false,
    skipAgencyOpeningBalances: false,
    skipAccountingAccounts: false,
    importOnly: null,
    skipImport: false,
    skipDoctorSessions: false,
    skipSessionsBookings: false,
    skipMissingDoctorTemplates: false,
    inlineFixOnly: false,
  };

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') out.help = true;
    else if (arg === '--no-flush-import') out.importFlush = false;
    else if (arg === '--no-wipe-templates') out.doctorNoWipe = true;
    else if (arg === '--no-include-unpublished') out.doctorIncludeUnpublished = false;
    else if (arg === '--no-wipe-sessions') out.sessionsNoWipe = true;
    else if (arg === '--dry-run') out.sessionsDryRun = true;
    else if (arg === '--skip-import') out.skipImport = true;
    else if (arg === '--skip-doctor-sessions') out.skipDoctorSessions = true;
    else if (arg === '--skip-sessions-bookings') out.skipSessionsBookings = true;
    else if (arg === '--skip-missing-doctor-templates') out.skipMissingDoctorTemplates = true;
    else if (arg === '--inline-fix-only') out.inlineFixOnly = true;
    else if (arg === '--skip-sequence-sync') out.skipSequenceSync = true;
    else if (arg === '--skip-agency-opening-balances') out.skipAgencyOpeningBalances = true;
    else if (arg === '--skip-accounting-accounts') out.skipAccountingAccounts = true;
    else if (arg.startsWith('--only=')) out.importOnly = arg.slice(7).trim() || null;
    else if (arg.startsWith('--from-date=')) out.sessionsFromDate = arg.slice(12).trim() || null;
    else if (arg.startsWith('--to-date=')) out.sessionsToDate = arg.slice(10).trim() || null;
    else if (arg.startsWith('--doctor=')) out.sessionsDoctor = arg.slice(9).trim() || null;
    else if (arg.startsWith('--concurrency=')) {
      const n = Number(arg.slice(14).trim());
      if (Number.isFinite(n) && n >= 1) out.sessionConcurrency = Math.floor(n);
    } else if (arg.startsWith('--booking-concurrency=')) {
      const n = Number(arg.slice(22).trim());
      if (Number.isFinite(n) && n >= 1) out.bookingConcurrency = Math.floor(n);
    }
  }

  return out;
}

const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  /** Bold bright white on black — major step banners. */
  banner: '\x1b[1;97;40m',
};

const BANNER_WIDTH = 72;

function bannerLine(text = ''): string {
  const body = text.length > BANNER_WIDTH ? text.slice(0, BANNER_WIDTH) : text.padEnd(BANNER_WIDTH, ' ');
  return `${ANSI.banner}${body}${ANSI.reset}`;
}

function printStepBanner(step: number, total: number, title: string): void {
  const heading = `  Step ${step}/${total}: ${title}`;
  console.log('');
  console.log(bannerLine());
  console.log(bannerLine(heading));
  console.log(bannerLine());
}

type PlanStatus = 'pending' | 'running' | 'done' | 'failed';

type PipelineStep = {
  title: string;
  detail: string;
  script: string;
  args: string[];
};

function mark(status: PlanStatus): string {
  if (status === 'done') return `${ANSI.green}${ANSI.bold}[x]${ANSI.reset}`;
  if (status === 'running') return `${ANSI.bold}[>]${ANSI.reset}`;
  if (status === 'failed') return `${ANSI.red}${ANSI.bold}[!]${ANSI.reset}`;
  return '[ ]';
}

function printPlan(steps: PipelineStep[], statuses: PlanStatus[], skipped: string[]): void {
  console.log(`\n${ANSI.bold}Migration plan${ANSI.reset}`);
  console.log(`${ANSI.dim}  [ ] pending   [>] running   [x] done   [!] failed${ANSI.reset}\n`);
  steps.forEach((s, i) => {
    const st = statuses[i];
    const title =
      st === 'running' || st === 'done' || st === 'failed'
        ? `${ANSI.bold}${s.title}${ANSI.reset}`
        : s.title;
    console.log(`  ${mark(st)} ${i + 1}. ${title}`);
    if (s.detail) console.log(`         ${ANSI.dim}${s.detail}${ANSI.reset}`);
  });
  if (skipped.length > 0) {
    console.log(`\n  ${ANSI.dim}Not running:${ANSI.reset}`);
    for (const line of skipped) console.log(`  ${ANSI.dim}[-] ${line}${ANSI.reset}`);
  }
  console.log('');
}

function dateRangeLabel(from: string | null, to: string | null): string {
  if (from && to) return `${from} .. ${to}`;
  if (from) return `${from} .. +5y`;
  if (to) return `today .. ${to}`;
  return 'today .. +5y';
}

function runStep(step: PipelineStep): number {
  const scriptPath = path.join(ROOT, step.script);
  console.log(`  npx tsx ${path.relative(ROOT, scriptPath)} ${step.args.join(' ')}\n`);

  const result = spawnSync('npx', ['tsx', scriptPath, ...step.args], {
    cwd: ROOT,
    env: process.env,
    stdio: 'inherit',
    shell: false,
  });

  return result.status ?? 1;
}

function main(): void {
  const argv = process.argv.slice(2);
  const opts = parseArgs(argv);

  if (opts.help) {
    printHelp();
    process.exit(0);
  }

  const steps: PipelineStep[] = [];
  const skipped: string[] = [];
  const range = dateRangeLabel(opts.sessionsFromDate, opts.sessionsToDate);

  if (!opts.skipImport) {
    const importArgs = [opts.importFlush ? '--flush' : '--no-flush'];
    if (opts.importOnly) importArgs.push(`--only=${opts.importOnly}`);
    const what = opts.importOnly ?? 'specialities, doctors, departments, locations, zones, rooms, tags, discounts, agencies, agency books, staff';
    steps.push({
      title: 'Reference import',
      detail: opts.importFlush
        ? `Flush migrate tables, then import ${what}`
        : `Import without flush: ${what}`,
      script: 'scripts/migrate-import.ts',
      args: importArgs,
    });
  } else {
    skipped.push('Reference import (--skip-import)');
  }

  if (!opts.skipAccountingAccounts) {
    steps.push({
      title: 'GL accounts',
      detail: 'Create missing Main Cash Book, location cash/income/expense, doctor and agency payables (no wipe)',
      script: 'scripts/migrate-accounting-accounts.ts',
      args: [],
    });
  } else {
    skipped.push('GL accounts (--skip-accounting-accounts)');
  }

  if (!opts.skipDoctorSessions) {
    const doctorArgs: string[] = [];
    if (opts.doctorNoWipe) doctorArgs.push('--no-wipe');
    if (opts.doctorIncludeUnpublished) doctorArgs.push('--include-unpublished');
    if (opts.sessionConcurrency != null) doctorArgs.push(`--concurrency=${opts.sessionConcurrency}`);
    const wipe = opts.doctorNoWipe ? 'keep existing DoctorSession rows' : 'wipe all DoctorSession rows';
    const pub = opts.doctorIncludeUnpublished ? 'including unpublished templates' : 'published templates only';
    steps.push({
      title: 'Doctor session templates',
      detail: `${wipe}, then import (${pub})`,
      script: 'scripts/migrate-doctor-sessions.ts',
      args: doctorArgs,
    });
  } else {
    skipped.push('Doctor session templates (--skip-doctor-sessions)');
  }

  const runMissingTemplatesPreflight =
    !opts.skipSessionsBookings &&
    !opts.sessionsDryRun &&
    !opts.skipMissingDoctorTemplates &&
    !opts.inlineFixOnly;

  if (runMissingTemplatesPreflight) {
    const missingArgs: string[] = [];
    if (opts.sessionsFromDate) missingArgs.push(`--from-date=${opts.sessionsFromDate}`);
    if (opts.sessionsToDate) missingArgs.push(`--to-date=${opts.sessionsToDate}`);
    steps.push({
      title: 'Missing doctor templates',
      detail: `Import templates sessions need but step 2 skipped (legacy start_time=0). Range ${range}`,
      script: 'scripts/migrate-missing-doctor-templates.ts',
      args: missingArgs,
    });
  } else if (opts.skipSessionsBookings) {
    skipped.push('Missing doctor templates (sessions/bookings skipped)');
  } else if (opts.sessionsDryRun) {
    skipped.push('Missing doctor templates (--dry-run)');
  } else if (opts.skipMissingDoctorTemplates) {
    skipped.push('Missing doctor templates (--skip-missing-doctor-templates)');
  } else if (opts.inlineFixOnly) {
    skipped.push('Missing doctor templates (--inline-fix-only; fix runs inside sessions step)');
  }

  if (!opts.skipSessionsBookings) {
    const sessionArgs: string[] = [];
    if (opts.sessionsNoWipe) sessionArgs.push('--no-wipe');
    if (opts.sessionsFromDate) sessionArgs.push(`--from-date=${opts.sessionsFromDate}`);
    if (opts.sessionsToDate) sessionArgs.push(`--to-date=${opts.sessionsToDate}`);
    if (opts.sessionsDoctor) sessionArgs.push(`--doctor=${opts.sessionsDoctor}`);
    if (opts.sessionsDryRun) sessionArgs.push('--dry-run');
    if (opts.sessionConcurrency != null) sessionArgs.push(`--concurrency=${opts.sessionConcurrency}`);
    if (opts.bookingConcurrency != null) sessionArgs.push(`--booking-concurrency=${opts.bookingConcurrency}`);
    if (runMissingTemplatesPreflight) sessionArgs.push('--no-fix-templates');
    const wipe = opts.sessionsNoWipe ? 'keep existing sessions/bookings' : 'wipe all sessions and bookings';
    const dry = opts.sessionsDryRun ? 'DRY RUN — no writes. ' : '';
    const doctor = opts.sessionsDoctor ? ` Doctor ${opts.sessionsDoctor}.` : '';
    steps.push({
      title: 'Sessions & bookings',
      detail: `${dry}${wipe}, then import sessions and bookings. Range ${range}.${doctor}`,
      script: 'scripts/migrate-sessions-bookings.ts',
      args: sessionArgs,
    });
  } else {
    skipped.push('Sessions & bookings (--skip-sessions-bookings)');
  }

  if (!opts.skipSequenceSync && !opts.sessionsDryRun) {
    steps.push({
      title: 'Sequence sync',
      detail: 'Set Sequence.lastValue from imported rows (codes, appointments, bookings, receipts)',
      script: 'scripts/sequence-sync-from-db.ts',
      args: [],
    });
  } else if (opts.skipSequenceSync) {
    skipped.push('Sequence sync (--skip-sequence-sync)');
  } else if (opts.sessionsDryRun) {
    skipped.push('Sequence sync (--dry-run)');
  }

  if (!opts.skipAgencyOpeningBalances && !opts.sessionsDryRun) {
    steps.push({
      title: 'Agency opening balances',
      detail:
        'Empty Agent Opening Balances, then Dr control / Cr Agent PAYABLE from Sails agency.balance (reverse if negative)',
      script: 'scripts/migrate-agency-opening-balances.ts',
      args: [],
    });
  } else if (opts.skipAgencyOpeningBalances) {
    skipped.push('Agency opening balances (--skip-agency-opening-balances)');
  } else if (opts.sessionsDryRun) {
    skipped.push('Agency opening balances (--dry-run)');
  }

  if (steps.length === 0) {
    console.error('[migrate-all] Nothing to run (all steps skipped).');
    process.exit(1);
  }

  const statuses: PlanStatus[] = steps.map(() => 'pending');

  console.log(`${ANSI.bold}Migrate-all pipeline${ANSI.reset}`);
  console.log(`${ANSI.dim}  Report: temp/migrate-report.xlsx (reset at start of step 1 when import runs)${ANSI.reset}`);
  printPlan(steps, statuses, skipped);

  for (let i = 0; i < steps.length; i++) {
    statuses[i] = 'running';
    printPlan(steps, statuses, skipped);
    printStepBanner(i + 1, steps.length, steps[i].title);

    const status = runStep(steps[i]);
    if (status !== 0) {
      statuses[i] = 'failed';
      printPlan(steps, statuses, skipped);
      console.error(
        `${ANSI.red}${ANSI.bold}[!] Step ${i + 1} failed (${steps[i].title}). Exit code: ${status}${ANSI.reset}`
      );
      process.exit(status);
    }

    statuses[i] = 'done';
    console.log(`\n${ANSI.green}${ANSI.bold}[x] Step ${i + 1} done: ${steps[i].title}${ANSI.reset}`);
  }

  printPlan(steps, statuses, skipped);
  console.log(bannerLine());
  console.log(bannerLine('  Migrate-all completed successfully.'));
  console.log(bannerLine('  Report: temp/migrate-report.xlsx'));
  console.log(bannerLine());
  console.log('');
}

main();
