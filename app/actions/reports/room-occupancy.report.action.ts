'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import moment from 'moment';
import { requirePermission } from '@/lib/server-permissions';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { getRoomOccupancyReportService } from '@/services/reports/room-occupancy.report.service';
import type { RoomOccupancyReportExportRow, RoomOccupancyReportQuery } from '@/types/reports/room-occupancy';

function dateKey(d: Date): string {
  const x = d instanceof Date ? d : new Date(d);
  return moment(x).format('YYYY-MM-DD');
}

export async function getRoomOccupancyReportData(query: RoomOccupancyReportQuery) {
  await requirePermission('reports', 'view');
  try {
    const result = await getRoomOccupancyReportService(query);
    return {
      success: result.success,
      data: result.data ?? [],
      totalRecords: result.totalRecords ?? 0,
      message: result.error?.message ?? result.message
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch room occupancy report';
    return { success: false, data: [], totalRecords: 0, message: msg };
  }
}

export async function exportRoomOccupancyReportData(
  query: RoomOccupancyReportQuery
): Promise<{ success: boolean; data?: RoomOccupancyReportExportRow[]; message?: string }> {
  await requirePermission('reports', 'view');
  try {
    const result = await getRoomOccupancyReportService(query);
    if (!result.success || !result.data?.length) {
      return { success: false, message: result.error?.message ?? result.message ?? 'No data available' };
    }
    const mapped: RoomOccupancyReportExportRow[] = result.data.map((row) => {
      const out: RoomOccupancyReportExportRow = {
        roomNumber: row.roomNumber,
        date: dateKey(row.date),
        bookedHours: row.bookedHours.toFixed(2)
      };
      for (let h = 0; h < 24; h += 1) {
        out[`hour${String(h).padStart(2, '0')}`] = row.slots[h] ? 'Booked' : '';
      }
      return out;
    });

    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: 'reports.room-occupancy.exported',
        entityType: 'Report',
        importance: 'medium',
        metadata: { count: mapped.length }
      });
    }
    return { success: true, data: mapped };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to export';
    return { success: false, message: msg };
  }
}
