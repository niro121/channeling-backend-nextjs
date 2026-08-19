/**
 * Phase 5 — Backfill UserGroup.app on the shared auth database.
 *
 * Dry-run (default): lists groups and suggested app from permission keys.
 * Apply: tag groups with --app or --auto.
 *
 * Prerequisites:
 *   1. AUTH_DATABASE_URL set (e.g. via --env-file=apps/hrm/.env)
 *   2. Generated Prisma client: npm run db:generate -w @archmage/db-auth
 *
 * Usage:
 *   node --env-file=apps/hrm/.env packages/db-auth/scripts/backfill-user-group-app.mjs
 *   node --env-file=apps/hrm/.env packages/db-auth/scripts/backfill-user-group-app.mjs --apply --auto
 *   node --env-file=apps/hrm/.env packages/db-auth/scripts/backfill-user-group-app.mjs --apply --app=hrm --ids=<id1>,<id2>
 */

import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const clientEntry = join(__dirname, '../src/generated/client/index.js');

if (!existsSync(clientEntry)) {
  console.error('Auth Prisma client not found. Generate it first:');
  console.error('  npm run db:generate -w @archmage/db-auth');
  process.exit(1);
}

const { PrismaClient } = await import(pathToFileURL(clientEntry).href);

const HRM_PERMISSION_KEYS = new Set([
  'staff',
  'leave-types',
  'leave-entitlement',
  'leave-management',
  'leave-application',
  'overtime-requests',
  'employees',
  'departments',
  'positions',
  'leave-requests',
  'attendance',
  'payroll',
  'salary-structures',
]);

const DPAY_PERMISSION_KEYS = new Set([
  'doctor-payments',
  'payments',
  'receipts',
  'bank-accounts',
  'ledger',
  'reconciliation',
  'settlements',
]);

const VALID_APPS = new Set(['hrm', 'dpay', 'channeling']);

function parseArgs(argv) {
  const args = {
    apply: false,
    auto: false,
    app: null,
    ids: [],
  };

  for (const arg of argv) {
    if (arg === '--apply') args.apply = true;
    else if (arg === '--auto') args.auto = true;
    else if (arg.startsWith('--app=')) args.app = arg.slice('--app='.length).trim();
    else if (arg.startsWith('--ids=')) {
      args.ids = arg
        .slice('--ids='.length)
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);
    }
  }

  return args;
}

function permissionKeys(permissions) {
  if (!permissions || typeof permissions !== 'object' || Array.isArray(permissions)) {
    return [];
  }
  return Object.keys(permissions);
}

function suggestApp(permissions) {
  const keys = permissionKeys(permissions);
  const hrmHits = keys.filter((key) => HRM_PERMISSION_KEYS.has(key)).length;
  const dpayHits = keys.filter((key) => DPAY_PERMISSION_KEYS.has(key)).length;

  if (hrmHits > 0 && dpayHits === 0) return 'hrm';
  if (dpayHits > 0 && hrmHits === 0) return 'dpay';
  return null;
}

function resolveTargetApp(group, args) {
  if (args.app) return args.app;
  if (args.auto) return suggestApp(group.permissions);
  return null;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!process.env.AUTH_DATABASE_URL) {
    console.error('AUTH_DATABASE_URL is required. Example:');
    console.error(
      '  node --env-file=apps/hrm/.env packages/db-auth/scripts/backfill-user-group-app.mjs'
    );
    process.exit(1);
  }

  if (args.app && !VALID_APPS.has(args.app)) {
    console.error(`Invalid --app=${args.app}. Use one of: ${[...VALID_APPS].join(', ')}`);
    process.exit(1);
  }

  if (args.apply && !args.auto && !args.app) {
    console.error('When using --apply, pass --auto and/or --app=<hrm|dpay|channeling>.');
    process.exit(1);
  }

  const prisma = new PrismaClient();

  try {
    const groups = await prisma.userGroup.findMany({
      select: {
        id: true,
        name: true,
        app: true,
        status: true,
        permissions: true,
        _count: { select: { users: true } },
      },
      orderBy: { name: 'asc' },
    });

    const untagged = groups.filter((g) => g.app == null || g.app === '');
    const tagged = groups.filter((g) => g.app != null && g.app !== '');

    console.log(`Total groups: ${groups.length}`);
    console.log(`Tagged: ${tagged.length}`);
    console.log(`Untagged (app null/empty): ${untagged.length}`);
    console.log('');

    if (tagged.length) {
      console.log('--- Already tagged ---');
      for (const group of tagged) {
        console.log(
          `  [${group.app}] ${group.name} (${group.id}) users=${group._count.users}`
        );
      }
      console.log('');
    }

    if (!untagged.length) {
      console.log('Nothing to backfill.');
      return;
    }

    const selected = args.ids.length
      ? untagged.filter((g) => args.ids.includes(g.id))
      : untagged;

    if (args.ids.length && !selected.length) {
      console.error('None of the provided --ids matched untagged groups.');
      process.exit(1);
    }

    console.log(args.apply ? '--- Applying updates ---' : '--- Dry-run (no writes) ---');

    let updated = 0;
    let skipped = 0;

    for (const group of selected) {
      const suggested = suggestApp(group.permissions);
      const targetApp = resolveTargetApp(group, args);

      if (!args.apply) {
        console.log(
          `  ${group.name} (${group.id}) users=${group._count.users} suggested=${suggested ?? 'manual'} keys=[${permissionKeys(group.permissions).join(', ') || 'none'}]`
        );
        continue;
      }

      if (!targetApp) {
        console.log(
          `  SKIP ${group.name} (${group.id}) — no target app (ambiguous or empty permissions)`
        );
        skipped += 1;
        continue;
      }

      await prisma.userGroup.update({
        where: { id: group.id },
        data: { app: targetApp, updatedAt: new Date() },
      });
      updated += 1;
      console.log(`  SET app=${targetApp} ← ${group.name} (${group.id})`);
    }

    if (args.apply) {
      console.log('');
      console.log(`Done. Updated ${updated}, skipped ${skipped}.`);
    } else {
      console.log('');
      console.log('Re-run with --apply --auto to tag by permission heuristics,');
      console.log('or --apply --app=hrm --ids=<id1>,<id2> for explicit updates.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
