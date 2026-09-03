/**
 * Run the full legacy → Next.js migration pipeline in order.
 *
 *   npm run migrate:all
 *   npm run migrate:all -- --from-date=2024-01-01 --to-date=2024-12-31
 *   npm run migrate:all -- --help
 *
 * Steps (stops on first failure):
 *   1. migrate-import
 *   2. migrate-doctor-sessions
 *   3. migrate-missing-doctor-templates (legacy start_time=0 templates; same lib as [fix] in step 4)
 *   4. migrate-sessions-bookings (--no-fix-templates; preflight already ran in step 3)
 *   5. sequence-sync-from-db
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

  Step 2 (migrate-doctor-sessions):
  --no-wipe-templates       Keep existing DoctorSession rows (default: wipe)
  --no-include-unpublished  Only published legacy templates (default: --include-unpublished)
  --skip-doctor-sessions    Skip step 2

  Step 3 (migrate-missing-doctor-templates):
  --skip-missing-doctor-templates  Skip preflight template import
  --inline-fix-only         Skip step 3; use [fix] inside sessions step only (old behaviour)

  Step 4 (migrate-sessions-bookings):
  --no-wipe-sessions        Keep existing sessions/bookings (default: wipe)
  --from-date=YYYY-MM-DD    Date range for steps 3–4 (default: today .. +5y)
  --to-date=YYYY-MM-DD
  --doctor=<legacyId>       Filter by legacy doctor migrateSourceId
  --dry-run                 Sessions/bookings dry run (no writes; skips step 3)
  --concurrency=N           Session import parallelism (default 50 in child script)
  --booking-concurrency=N   Booking import parallelism (default 20; lower if DB feels slow)
  --skip-sessions-bookings  Skip step 4

  Step 5 (sequence-sync):
  --skip-sequence-sync      Skip sequence:sync

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

function runStep(step: number, total: number, title: string, scriptRel: string, args: string[]): void {
  const scriptPath = path.join(ROOT, scriptRel);
  console.log(`\n${'='.repeat(72)}`);
  console.log(`Step ${step}/${total}: ${title}`);
  console.log(`  npx tsx ${path.relative(ROOT, scriptPath)} ${args.join(' ')}`);
  console.log(`${'='.repeat(72)}\n`);

  const result = spawnSync('npx', ['tsx', scriptPath, ...args], {
    cwd: ROOT,
    env: process.env,
    stdio: 'inherit',
    shell: false,
  });

  if (result.status !== 0) {
    console.error(`\n[migrate-all] Step ${step} failed (${title}). Exit code: ${result.status ?? 1}`);
    process.exit(result.status ?? 1);
  }
}

function main(): void {
  const argv = process.argv.slice(2);
  const opts = parseArgs(argv);

  if (opts.help) {
    printHelp();
    process.exit(0);
  }

  const steps: Array<{ title: string; script: string; args: string[] }> = [];

  if (!opts.skipImport) {
    const importArgs = [opts.importFlush ? '--flush' : '--no-flush'];
    if (opts.importOnly) importArgs.push(`--only=${opts.importOnly}`);
    steps.push({ title: 'Reference import (specialities, doctors, staff, …)', script: 'scripts/migrate-import.ts', args: importArgs });
  }

  if (!opts.skipDoctorSessions) {
    const doctorArgs: string[] = [];
    if (opts.doctorNoWipe) doctorArgs.push('--no-wipe');
    if (opts.doctorIncludeUnpublished) doctorArgs.push('--include-unpublished');
    if (opts.sessionConcurrency != null) doctorArgs.push(`--concurrency=${opts.sessionConcurrency}`);
    steps.push({ title: 'Doctor session templates (DoctorSession)', script: 'scripts/migrate-doctor-sessions.ts', args: doctorArgs });
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
      title: 'Missing doctor templates (legacy start_time=0)',
      script: 'scripts/migrate-missing-doctor-templates.ts',
      args: missingArgs,
    });
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
    steps.push({ title: 'Sessions & bookings', script: 'scripts/migrate-sessions-bookings.ts', args: sessionArgs });
  }

  if (!opts.skipSequenceSync && !opts.sessionsDryRun) {
    steps.push({ title: 'Sequence sync from DB', script: 'scripts/sequence-sync-from-db.ts', args: [] });
  } else if (opts.skipSequenceSync) {
    console.log('\n[migrate-all] Skipping sequence:sync (--skip-sequence-sync).');
  } else if (opts.sessionsDryRun) {
    console.log('\n[migrate-all] Skipping sequence:sync (sessions step was --dry-run).');
  }

  if (steps.length === 0) {
    console.error('[migrate-all] Nothing to run (all steps skipped).');
    process.exit(1);
  }

  console.log('Migrate-all pipeline');
  console.log(`  Steps: ${steps.length}`);
  console.log(`  Report: temp/migrate-report.xlsx (reset at start of step 1 when import runs)`);

  const total = steps.length;
  steps.forEach((s, i) => runStep(i + 1, total, s.title, s.script, s.args));

  console.log(`\n${'='.repeat(72)}`);
  console.log('Migrate-all completed successfully.');
  console.log('  Report: temp/migrate-report.xlsx');
  console.log(`${'='.repeat(72)}\n`);
}

main();
