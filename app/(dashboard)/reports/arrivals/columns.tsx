'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Session } from '@/types/booking.dashboard';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle } from 'lucide-react';
import moment from 'moment';
import { formatDoctorName } from '@/lib/helpers/doctor-name.helper';

export const DoctorArrivalsReportColumns: ColumnDef<Session>[] = [
  {
    accessorKey: 'doctor',
    header: 'Consultant Name',
    cell: ({ row }) => {
      const doctor = row.original.doctor;
      return (
        <div className="max-w-[200px] truncate" title={formatDoctorName(doctor)}>
          {formatDoctorName(doctor)}
        </div>
      );
    }
  },
  {
    accessorKey: 'roomAllocatedBy',
    header: 'Room Allocated By',
    cell: () => {
      // Empty for now - data not available
      return <span className="text-muted-foreground">-</span>;
    }
  },
  {
    accessorKey: 'date',
    header: 'Session Date',
    cell: ({ row }) => {
      const date = row.getValue<Date>('date');
      return date ? moment(date).format('DD/MM/YYYY') : '-';
    }
  },
  {
    accessorKey: 'startTime',
    header: 'Session Time',
    cell: ({ row }) => {
      const session = row.original;
      // startTime and endTime are in minutes from midnight
      const startTimeMinutes = Number(session.startTime) || 0;
      const endTimeMinutes = Number(session.endTime) || 0;
      
      // Convert minutes to hours and minutes
      const startHours = Math.floor(startTimeMinutes / 60);
      const startMinutes = startTimeMinutes % 60;
      const endHours = Math.floor(endTimeMinutes / 60);
      const endMinutes = endTimeMinutes % 60;
      
      // Create Date objects for formatting (using today's date as base)
      const today = new Date();
      const startTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), startHours, startMinutes);
      const endTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), endHours, endMinutes);
      
      // Format as 12-hour time with AM/PM
      const startTimeStr = moment(startTime).format('h:mm A');
      const endTimeStr = moment(endTime).format('h:mm A');
      
      return `${startTimeStr} - ${endTimeStr}`;
    }
  },
  {
    accessorKey: 'status',
    header: 'Session Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as number;
      const isActive = status === 1;
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
    accessorKey: 'arrivalTime',
    header: 'Arrival Time',
    cell: () => {
      // Empty for now - data not available
      return <span className="text-muted-foreground">-</span>;
    }
  },
  {
    accessorKey: 'departureTime',
    header: 'Departure Time',
    cell: () => {
      // Empty for now - data not available
      return <span className="text-muted-foreground">-</span>;
    }
  },
  {
    accessorKey: 'roomReleaseBy',
    header: 'Room Release By',
    cell: () => {
      // Empty for now - data not available
      return <span className="text-muted-foreground">-</span>;
    }
  },
  {
    accessorKey: 'room.number',
    header: 'Room Number',
    cell: ({ row }) => {
      const room = row.original.room;
      return room?.number || '-';
    }
  }
];
