'use server';

import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { getInclusiveDaySpan, getReportMaxRangeDays, getReportMaxRecords } from '@/lib/report-limits';
import type { RoomOccupancyReportQuery, RoomOccupancyReportRow } from '@/types/reports/room-occupancy';

const MAX_RANGE_DAYS = getReportMaxRangeDays('room_occupancy', 62);
const MAX_RECORDS_SCAN = getReportMaxRecords('room_occupancy', 25000);
const HOUR_MS = 60 * 60 * 1000;

function parseFromBound(val: string): Date {
  const trimmed = val.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return new Date(`${trimmed}T00:00:00`);
  return new Date(trimmed);
}

function parseToBound(val: string): Date {
  const trimmed = val.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return new Date(`${trimmed}T23:59:59.999`);
  return new Date(trimmed);
}

function getDayBounds(d: Date): { start: Date; end: Date } {
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  const end = new Date(d);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function forEachDate(from: Date, to: Date, cb: (d: Date) => void) {
  const c = new Date(from);
  c.setHours(0, 0, 0, 0);
  const limit = new Date(to);
  limit.setHours(0, 0, 0, 0);
  while (c.getTime() <= limit.getTime()) {
    cb(new Date(c));
    c.setDate(c.getDate() + 1);
  }
}

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function getRoomOccupancyReportService(query: RoomOccupancyReportQuery): Promise<{
  success: boolean;
  data?: RoomOccupancyReportRow[];
  totalRecords?: number;
  message?: string;
  error?: { message?: string };
}> {
  try {
    const hasDateFilter = Boolean(query.fromDateTime?.trim()) && Boolean(query.toDateTime?.trim());
    if (!hasDateFilter) return { success: true, data: [], totalRecords: 0 };

    const fromBound = parseFromBound(query.fromDateTime!);
    const toBound = parseToBound(query.toDateTime!);
    if (isNaN(fromBound.getTime()) || isNaN(toBound.getTime()) || fromBound.getTime() > toBound.getTime()) {
      return {
        success: false,
        data: [],
        totalRecords: 0,
        error: { message: 'Invalid date range. Please select a valid From and To date/time.' }
      };
    }

    const daySpan = getInclusiveDaySpan(fromBound, toBound);
    if (daySpan > MAX_RANGE_DAYS) {
      return {
        success: false,
        data: [],
        totalRecords: 0,
        error: { message: `Date range is too large. Please select ${MAX_RANGE_DAYS} days or less.` }
      };
    }

    const where: Prisma.SessionWhereInput = {
      date: { gte: fromBound, lte: toBound },
      status: 1,
      roomId: { not: null },
    };
    if (query.institutionId && query.institutionId !== '__all__' && query.institutionId !== '') {
      const instNum = parseInt(query.institutionId, 10);
      if (!isNaN(instNum)) where.institution = instNum;
    }
    if (query.locationId && query.locationId !== '__all__' && query.locationId !== '') {
      where.locationId = query.locationId;
    }
    if (query.departmentId && query.departmentId !== '__all__' && query.departmentId !== '') {
      where.departmentId = query.departmentId;
    }
    if (query.roomId && query.roomId !== '__all__' && query.roomId !== '') {
      where.roomId = query.roomId;
    }

    const matchedCount = await prisma.session.count({ where });
    if (matchedCount > MAX_RECORDS_SCAN) {
      return {
        success: false,
        data: [],
        totalRecords: 0,
        error: {
          message: `Too many records in selected range (${matchedCount}). Please narrow filters or date range.`
        }
      };
    }

    const sessions = await prisma.session.findMany({
      where,
      select: {
        id: true,
        roomId: true,
        date: true,
        startTime: true,
        endTime: true,
        room: { select: { number: true } }
      },
      orderBy: [{ roomId: 'asc' }, { date: 'asc' }, { startTime: 'asc' }]
    });

    const map = new Map<string, RoomOccupancyReportRow>();
    for (const s of sessions) {
      if (!s.roomId) continue;
      const sDate = s.date instanceof Date ? s.date : new Date(s.date);
      const key = `${s.roomId}::${dateKey(sDate)}`;
      if (!map.has(key)) {
        map.set(key, {
          id: key,
          roomId: s.roomId,
          roomNumber: s.room?.number ?? '-',
          roomNumberRowSpan: 1,
          date: sDate,
          slots: Array.from({ length: 24 }, () => false),
          bookedHours: 0
        });
      }

      const row = map.get(key)!;
      const { start: dayStart, end: dayEnd } = getDayBounds(sDate);
      const rawStart = s.startTime instanceof Date ? s.startTime : new Date(s.startTime);
      const rawEnd = s.endTime instanceof Date ? s.endTime : new Date(s.endTime);
      const intervalStart = new Date(Math.max(rawStart.getTime(), dayStart.getTime()));
      const intervalEnd = new Date(Math.min(rawEnd.getTime(), dayEnd.getTime()));
      if (intervalEnd.getTime() <= intervalStart.getTime()) continue;

      row.bookedHours += (intervalEnd.getTime() - intervalStart.getTime()) / HOUR_MS;
      for (let h = 0; h < 24; h += 1) {
        const slotStart = new Date(dayStart.getTime() + h * HOUR_MS);
        const slotEnd = new Date(slotStart.getTime() + HOUR_MS);
        if (intervalStart.getTime() < slotEnd.getTime() && intervalEnd.getTime() > slotStart.getTime()) {
          row.slots[h] = true;
        }
      }
    }

    const rows = [...map.values()].sort((a, b) => {
      const roomCompare = a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true });
      if (roomCompare !== 0) return roomCompare;
      return a.date.getTime() - b.date.getTime();
    });
    let i = 0;
    while (i < rows.length) {
      const roomId = rows[i].roomId;
      let j = i + 1;
      while (j < rows.length && rows[j].roomId === roomId) j += 1;
      const span = j - i;
      rows[i].roomNumberRowSpan = span;
      for (let k = i + 1; k < j; k += 1) rows[k].roomNumberRowSpan = 0;
      i = j;
    }

    return { success: true, data: rows, totalRecords: rows.length };
  } catch (error: unknown) {
    console.error('getRoomOccupancyReportService error:', error);
    return {
      success: false,
      data: [],
      totalRecords: 0,
      error: { message: error instanceof Error ? error.message : 'Failed to fetch room occupancy report' }
    };
  }
}
