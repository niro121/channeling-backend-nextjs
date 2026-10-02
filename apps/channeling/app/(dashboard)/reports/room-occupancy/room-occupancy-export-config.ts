/**
 * Room Occupancy — PDF/Excel helpers matching Print landscape hour grid.
 */

import type { RoomOccupancyReportExportRow } from '@/types/reports/room-occupancy';

export const ROOM_OCCUPANCY_HOURS = Array.from({ length: 24 }, (_, h) => h);

export const ROOM_OCCUPANCY_EXPORT_COLUMNS = [
  'Room No',
  'Date',
  ...ROOM_OCCUPANCY_HOURS.map((h) => String(h).padStart(2, '0')),
  'Booked Hours',
];

export const ROOM_OCCUPANCY_EXPORT_KEYS = [
  'roomNumber',
  'date',
  ...ROOM_OCCUPANCY_HOURS.map((h) => `hour${String(h).padStart(2, '0')}`),
  'bookedHours',
] as const;

/** Print/PDF table headers (Date + hours + Booked Hrs). Room is group title. */
export const ROOM_OCCUPANCY_PDF_HEADERS = [
  'Date',
  ...ROOM_OCCUPANCY_HOURS.map((h) => String(h).padStart(2, '0')),
  'Booked Hrs',
] as const;

/** Column widths as % of content width: Date, 24 hours, Booked Hrs */
export const ROOM_OCCUPANCY_PDF_COL_PERCENTS = [
  8,
  ...ROOM_OCCUPANCY_HOURS.map(() => 3.4),
  10.4,
];

export function roomOccupancyHourKey(hour: number): string {
  return `hour${String(hour).padStart(2, '0')}`;
}

export function roomOccupancyIsHourBooked(
  row: RoomOccupancyReportExportRow,
  hour: number
): boolean {
  const v = row[roomOccupancyHourKey(hour)];
  if (v == null) return false;
  const text = String(v).trim().toLowerCase();
  return text !== '' && text !== '-' && text !== 'free' && text !== '0';
}

export function roomOccupancySlotMark(booked: boolean): string {
  return booked ? '●' : '○';
}

/** PDF body uses ASCII flags (Helvetica has no ●/○); dots are drawn in the PDF module. */
export function roomOccupancyPdfSlotFlag(booked: boolean): string {
  return booked ? '1' : '0';
}

export function roomOccupancyGroupTitle(row: RoomOccupancyReportExportRow): string {
  const room = String(row.roomNumber ?? '').trim();
  return room ? `Room ${room}` : 'Room —';
}

export function roomOccupancyGroupKey(row: RoomOccupancyReportExportRow): string {
  return String(row.roomNumber ?? '').trim() || '—';
}

function formatPdfDate(raw: string): string {
  const text = String(raw ?? '').trim();
  if (!text || text === '-') return '-';
  // Accept YYYY-MM-DD from export and show DD/MM/YY like Print
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  if (m) return `${m[3]}/${m[2]}/${m[1]!.slice(2)}`;
  return text;
}

/** Compact body row matching Print (Date | 24 slot flags | Booked Hrs). */
export function roomOccupancyPdfCompactRow(row: RoomOccupancyReportExportRow): string[] {
  const date = formatPdfDate(String(row.date ?? ''));
  const booked = String(row.bookedHours ?? '').trim() || '0.00';
  return [
    date,
    ...ROOM_OCCUPANCY_HOURS.map((h) =>
      roomOccupancyPdfSlotFlag(roomOccupancyIsHourBooked(row, h))
    ),
    booked,
  ];
}

export function parseRoomOccupancyBookedHours(row: RoomOccupancyReportExportRow): number {
  const text = String(row.bookedHours ?? '').trim().replace(/,/g, '');
  if (!text || text === '-') return 0;
  const n = parseFloat(text);
  return Number.isFinite(n) ? n : 0;
}
