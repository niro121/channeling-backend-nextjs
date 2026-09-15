import { format } from 'date-fns';
import { TZDate } from '@date-fns/tz';
import prisma from '@/lib/prisma';
import {
  ATTENDANCE_TIMEZONE,
  colomboDateIsoToUtc,
  toColomboDateIso
} from '@/lib/helpers/attendance-timezone.helper';
import type {
  RfidAttendanceDashboard,
  RfidAttendanceFilters,
  RfidLiveCheckInRow,
  RfidLiveStatusLabel
} from '@/types/attendance';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ''}${parts[parts.length - 1]![0] ?? ''}`.toUpperCase();
}

function formatTimeLabel(iso: string | null): string {
  if (!iso) return '—';
  const zoned = new TZDate(new Date(iso).getTime(), ATTENDANCE_TIMEZONE);
  return format(zoned, 'HH:mm');
}

function formatDateLabel(dateIso: string): string {
  const d = colomboDateIsoToUtc(dateIso);
  const zoned = new TZDate(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0),
    ATTENDANCE_TIMEZONE
  );
  return format(zoned, 'd MMM yyyy');
}

export function toLiveStatusLabel(input: {
  status: string;
  flags: string[];
}): RfidLiveStatusLabel {
  if (input.status === 'on_leave') return 'Leave';
  if (input.status === 'late') return 'Late';
  if (input.status === 'absent') return 'Absent';
  if (input.status === 'missing_punch') {
    if (input.flags.includes('missing_in')) return 'Missing In';
    return 'Missing Out';
  }
  if (input.status === 'present') return 'In';
  if (input.flags.includes('exception') || input.status === 'not_rostered') {
    return 'Exception';
  }
  return 'In';
}

function pct(part: number, total: number): number | null {
  if (total <= 0) return null;
  return Math.round((part / total) * 1000) / 10;
}

/**
 * RFID Attendance dashboard: summary cards + live check-in rows for a Colombo date.
 */
export async function getRfidAttendanceDashboard(
  filters: RfidAttendanceFilters = {}
): Promise<{
  success: boolean;
  data?: RfidAttendanceDashboard;
  error?: { message?: string };
}> {
  try {
    const dateIso =
      filters.date?.trim().slice(0, 10) || toColomboDateIso(new Date());
    const civilDay = colomboDateIsoToUtc(dateIso);

    const dayWhere: Record<string, unknown> = { date: civilDay };
    if (filters.department?.trim()) {
      dayWhere.department = filters.department.trim();
    }
    if (filters.location?.trim()) {
      dayWhere.location = filters.location.trim();
    }
    if (filters.shiftTypeId?.trim() && filters.shiftTypeId !== '__all__') {
      dayWhere.shiftTypeId = filters.shiftTypeId.trim();
    }
    if (filters.staffId?.trim()) {
      dayWhere.staffId = filters.staffId.trim();
    }

    const [days, optionDays, activeReaders, recentDevicePunch, unmatchedCount, shiftTypes] =
      await Promise.all([
        prisma.attendanceDay.findMany({
          where: dayWhere,
          orderBy: [{ firstInAt: 'desc' }, { staffName: 'asc' }],
          take: 200
        }),
        prisma.attendanceDay.findMany({
          where: { date: civilDay },
          select: {
            staffId: true,
            staffCode: true,
            staffName: true,
            department: true,
            location: true
          },
          take: 500
        }),
        prisma.attendanceDevice.count({ where: { status: 'active' } }),
        prisma.attendancePunch.findFirst({
          where: {
            punchedAt: {
              gte: new Date(Date.now() - 5 * 60 * 1000)
            }
          },
          select: { id: true }
        }),
        prisma.attendancePunch.count({
          where: {
            matchStatus: 'unmatched',
            punchedAt: {
              gte: civilDay,
              lt: new Date(civilDay.getTime() + 24 * 60 * 60 * 1000)
            }
          }
        }),
        prisma.shiftType.findMany({
          where: { status: 'active' },
          select: { id: true, name: true, code: true },
          orderBy: { name: 'asc' },
          take: 100
        })
      ]);

    const present = days.filter((d) => d.status === 'present').length;
    const late = days.filter((d) => d.status === 'late').length;
    const missingPunches = days.filter((d) => d.status === 'missing_punch').length;
    const absent = days.filter((d) => d.status === 'absent').length;
    const rosteredTotal = days.filter((d) => d.status !== 'not_rostered').length;
    const exceptions =
      days.filter(
        (d) =>
          d.flags.includes('exception') || d.status === 'not_rostered'
      ).length + unmatchedCount;

    let lateAfterLabel: string | null = null;
    const lateDay = days.find((d) => d.status === 'late' && d.shiftTypeId);
    if (lateDay?.shiftTypeId) {
      const shift = await prisma.shiftType.findUnique({
        where: { id: lateDay.shiftTypeId },
        select: { startTime: true, graceMinutes: true }
      });
      if (shift?.startTime) {
        const [h, m] = shift.startTime.split(':').map(Number);
        const total = (h || 0) * 60 + (m || 0) + (shift.graceMinutes || 0);
        const hh = String(Math.floor(total / 60) % 24).padStart(2, '0');
        const mm = String(total % 60).padStart(2, '0');
        lateAfterLabel = `After ${hh}:${mm}`;
      }
    }

    const liveRows: RfidLiveCheckInRow[] = days.map((d) => {
      const statusLabel = toLiveStatusLabel({
        status: d.status,
        flags: d.flags
      });
      const punchedAt = d.firstInAt?.toISOString() ?? d.lastOutAt?.toISOString() ?? null;
      return {
        id: d.id,
        staffId: d.staffId,
        staffCode: d.staffCode,
        staffName: d.staffName,
        department: d.department || '—',
        timeLabel: formatTimeLabel(punchedAt),
        punchedAt,
        statusLabel,
        avatarInitials: initials(d.staffName)
      };
    });

    const departments = [
      ...new Map(
        optionDays
          .filter((d) => d.department?.trim())
          .map((d) => [d.department, { id: d.department, name: d.department }])
      ).values()
    ].sort((a, b) => a.name.localeCompare(b.name));

    const locations = [
      ...new Map(
        optionDays
          .filter((d) => d.location?.trim())
          .map((d) => [d.location, { id: d.location, name: d.location }])
      ).values()
    ].sort((a, b) => a.name.localeCompare(b.name));

    const staff = [
      ...new Map(
        optionDays.map((d) => [
          d.staffId,
          {
            id: d.staffId,
            name: d.staffCode
              ? `${d.staffName} (${d.staffCode})`
              : d.staffName
          }
        ])
      ).values()
    ].sort((a, b) => a.name.localeCompare(b.name));

    return {
      success: true,
      data: {
        date: dateIso,
        dateLabel: formatDateLabel(dateIso),
        activeReaderCount: activeReaders,
        streaming: Boolean(recentDevicePunch) || activeReaders > 0,
        summary: {
          present: present + late,
          presentPct: pct(present + late, rosteredTotal || days.length),
          late,
          lateAfterLabel,
          missingPunches,
          absent,
          absentPct: pct(absent, rosteredTotal || days.length),
          exceptions,
          rosteredTotal
        },
        liveRows,
        filterOptions: {
          departments,
          locations,
          shifts: shiftTypes.map((s) => ({
            id: s.id,
            name: s.code ? `${s.name} (${s.code})` : s.name
          })),
          staff
        }
      }
    };
  } catch (error: any) {
    console.error('getRfidAttendanceDashboard error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to load RFID attendance' }
    };
  }
}
