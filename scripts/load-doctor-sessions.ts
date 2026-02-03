/**
 * Script to load and display doctor sessions.
 * Uses the same query shape as getAllDoctorSessionsService (see services/doctor.sessions.service.ts).
 *
 * Usage:
 *   npx tsx scripts/load-doctor-sessions.ts
 *   npx tsx scripts/load-doctor-sessions.ts --limit 20 --page 0
 *   npx tsx scripts/load-doctor-sessions.ts --doctor-id <id> --location-id <id>
 *   npx tsx scripts/load-doctor-sessions.ts --json
 */

import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_PAGE = 0;
const DEFAULT_LIMIT = 50;

function parseArgs(): {
  page: number;
  limit: number;
  doctorId?: string;
  locationId?: string;
  json: boolean;
} {
  const args = process.argv.slice(2);
  let page = DEFAULT_PAGE;
  let limit = DEFAULT_LIMIT;
  let doctorId: string | undefined;
  let locationId: string | undefined;
  let json = false;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--page':
        page = parseInt(args[++i], 10) || DEFAULT_PAGE;
        break;
      case '--limit':
        limit = parseInt(args[++i], 10) || DEFAULT_LIMIT;
        break;
      case '--doctor-id':
        doctorId = args[++i];
        break;
      case '--location-id':
        locationId = args[++i];
        break;
      case '--json':
        json = true;
        break;
      case '--help':
      case '-h':
        console.log(`
Load doctor sessions (uses getAllDoctorSessionsService)

Options:
  --page <n>         Page number (default: ${DEFAULT_PAGE})
  --limit <n>        Items per page (default: ${DEFAULT_LIMIT})
  --doctor-id <id>   Filter by doctor ID
  --location-id <id> Filter by location ID
  --json             Output raw JSON
  --help, -h         Show this help
`);
        process.exit(0);
    }
  }

  return { page, limit, doctorId, locationId, json };
}

function formatDate(d: Date | string | undefined): string {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toISOString().replace('T', ' ').slice(0, 19);
}

function showTable(records: any[], totalRecords: number): void {
  if (records.length === 0) {
    console.log('No doctor sessions found.\n');
    return;
  }

  const rows = records.map((r) => ({
    id: r.id?.slice(0, 8) ?? '—',
    name: (r.name ?? '').slice(0, 24),
    doctor: r.doctor?.name ?? '—',
    location: r.location?.name ?? '—',
    department: r.department?.name ?? '—',
    room: r.room?.number ?? '—',
    start: formatDate(r.startTime),
    end: formatDate(r.endTime),
    status: r.status === 1 ? 'Published' : 'Unpublished'
  }));

  const col = (v: string, w: number) => String(v).padEnd(w).slice(0, w);
  const widths = { id: 10, name: 26, doctor: 20, location: 18, department: 16, room: 6, start: 20, end: 20, status: 12 };
  const sep = ['id', 'name', 'doctor', 'location', 'department', 'room', 'start', 'end', 'status']
    .map((k) => '-'.repeat(widths[k as keyof typeof widths]))
    .join('-+-');

  console.log(col('id', widths.id) + ' | ' + col('name', widths.name) + ' | ' + col('doctor', widths.doctor) + ' | ' + col('location', widths.location) + ' | ' + col('department', widths.department) + ' | ' + col('room', widths.room) + ' | ' + col('start', widths.start) + ' | ' + col('end', widths.end) + ' | ' + col('status', widths.status));
  console.log(sep);

  for (const row of rows) {
    console.log(
      col(row.id, widths.id) + ' | ' +
        col(row.name, widths.name) + ' | ' +
        col(row.doctor, widths.doctor) + ' | ' +
        col(row.location, widths.location) + ' | ' +
        col(row.department, widths.department) + ' | ' +
        col(row.room, widths.room) + ' | ' +
        col(row.start, widths.start) + ' | ' +
        col(row.end, widths.end) + ' | ' +
        col(row.status, widths.status)
    );
  }

  console.log('\nTotal: ' + records.length + ' (page), ' + totalRecords + ' total\n');
}

async function main(): Promise<void> {
  const { page, limit, doctorId, locationId, json } = parseArgs();
  const skip = page * limit;

  const whereClause: Prisma.DoctorSessionWhereInput | undefined =
    doctorId || locationId
      ? {
          ...(doctorId ? { doctorId } : {}),
          ...(locationId ? { locationId } : {})
        }
      : undefined;

  try {
    const [records, totalRecords] = await Promise.all([
      prisma.doctorSession.findMany({
        skip,
        take: limit,
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        include: {
          doctor: true,
          location: true,
          department: true,
          room: true,
          createdUser: true,
          updatedUser: true
        }
      }),
      prisma.doctorSession.count({ where: whereClause })
    ]);

    if (json) {
      console.log(JSON.stringify({ records, totalRecords }, null, 2));
    } else {
      showTable(records, totalRecords);
    }
  } catch (err: any) {
    console.error('Error:', err?.message ?? 'Failed to load doctor sessions');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
