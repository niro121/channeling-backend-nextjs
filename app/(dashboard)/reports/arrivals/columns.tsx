'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle } from 'lucide-react';
import moment from 'moment';
import type { DoctorArrivalsReportRow } from '@/types/reports/doctor.arrivals';

function sessionCalendarLabel(d: Date): string {
  const x = d instanceof Date ? d : new Date(d);
  return moment.utc(x).format('Do MMMM YYYY');
}

function sessionStartLabel(d: Date): string {
  return moment(d).utcOffset(330).format('h.mmA');
}

export const DoctorArrivalsReportColumns: ColumnDef<DoctorArrivalsReportRow>[] = [
  {
    accessorKey: 'doctorCode',
    header: () => <span className="whitespace-nowrap">Doctor Code</span>,
    cell: ({ row }) => (
      <div className="max-w-28">
        {row.original.doctorCode}
      </div>
    )
  },
  {
    accessorKey: 'doctorName',
    header: () => <span className="whitespace-nowrap">Doctor Name</span>,
    cell: ({ row }) => (
      <div className="max-w-[200px]">
        {row.original.doctorName}
      </div>
    )
  },
  {
    id: 'roomAllocatedBy',
    header: 'Room Allocated By',
    cell: ({ row }) => (
      <div className="max-w-40 truncate text-xs" title={row.original.roomAllocatedBy}>
        {row.original.roomAllocatedBy}
      </div>
    )
  },
  {
    accessorKey: 'sessionDate',
    header: () => <span className="whitespace-nowrap">Session Date</span>,
    cell: ({ row }) => <span className="text-xs whitespace-nowrap">{sessionCalendarLabel(row.original.sessionDate)}</span>
  },
  {
    accessorKey: 'sessionStartTime',
    header: 'Session Start Time',
    cell: ({ row }) => sessionStartLabel(row.original.sessionStartTime)
  },
  {
    accessorKey: 'sessionStatus',
    header: 'Session Status',
    cell: ({ row }) => {
      const isActive = row.original.sessionStatus === 1;
      return (
        <Badge
          variant={isActive ? 'default' : 'secondary'}
          className={
            isActive
              ? 'gap-1 bg-primary/10 text-primary hover:bg-primary/20 border-0'
              : 'gap-1 bg-muted text-muted-foreground hover:bg-muted'
          }
        >
          {isActive ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          {isActive ? 'Active' : 'Leave'}
        </Badge>
      );
    }
  },
  {
    accessorKey: 'doctorArrivalDisplay',
    header: 'Doctor Arrival Time',
    cell: ({ row }) => row.original.doctorArrivalDisplay
  },
  {
    accessorKey: 'doctorDepartureDisplay',
    header: 'Doctor Departure Time',
    cell: ({ row }) => row.original.doctorDepartureDisplay
  },
  {
    id: 'roomReleasedBy',
    header: 'Room Released By',
    cell: ({ row }) => (
      <div className="max-w-40 truncate text-xs" title={row.original.roomReleasedBy}>
        {row.original.roomReleasedBy}
      </div>
    )
  },
  {
    accessorKey: 'roomNumber',
    header: 'Room Number',
    cell: ({ row }) => row.original.roomNumber
  }
];
