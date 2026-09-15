'use client';

import { ColumnDef } from '@tanstack/react-table';
import moment from 'moment';
import type { RoomOccupancyReportRow } from '@/types/reports/room-occupancy';

const hourColumns: ColumnDef<RoomOccupancyReportRow>[] = Array.from({ length: 24 }, (_, h) => ({
  id: `hour${String(h).padStart(2, '0')}`,
  header: `${String(h).padStart(2, '0')}`,
  cell: ({ row }) => {
    const booked = row.original.slots[h];
    return (
      <div className="flex items-center justify-center" aria-label={booked ? 'Booked' : 'Free'}>
        <span
          className={`inline-block h-3.5 w-3.5 rounded-full border border-border/60 ${
            booked ? 'bg-yellow-300' : 'bg-transparent'
          }`}
        />
      </div>
    );
  }
}));

export const RoomOccupancyReportColumns: ColumnDef<RoomOccupancyReportRow>[] = [
  {
    accessorKey: 'roomNumber',
    header: () => <div className="w-20 min-w-20 whitespace-nowrap">Room No</div>,
    cell: ({ row }) => (
      <div className="w-20 min-w-20 whitespace-nowrap font-medium">
        {row.original.roomNumber}
      </div>
    )
  },
  {
    accessorKey: 'date',
    header: () => <div className="w-28 min-w-28 whitespace-nowrap">Date</div>,
    cell: ({ row }) => (
      <div className="w-28 min-w-28 whitespace-nowrap">
        {moment(row.original.date).format('YYYY-MM-DD')}
      </div>
    )
  },
  ...hourColumns,
  {
    id: 'bookedHours',
    header: () => (
      <div className="sticky right-0 z-20 bg-muted text-right w-24 min-w-24 whitespace-nowrap">
        Booked Hours
      </div>
    ),
    cell: ({ row }) => (
      <div className="sticky right-0 z-10 bg-muted text-right tabular-nums w-24 min-w-24 whitespace-nowrap">
        {row.original.bookedHours.toFixed(2)}
      </div>
    )
  }
];
