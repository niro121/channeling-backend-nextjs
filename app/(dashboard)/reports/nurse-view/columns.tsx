import type { ColumnDef } from '@tanstack/react-table';
import type { NurseViewBookingData } from '@/types/report';

export const NurseViewReportColumns: ColumnDef<NurseViewBookingData>[] = [
  {
    accessorKey: 'appointmentNo',
    header: 'App.No'
  },
  {
    id: 'patientName',
    header: 'Patient Name',
    cell: ({ row }) => {
      const r = row.original;
      return `${r.title ?? ''} ${r.name ?? ''}`.trim() || '-';
    }
  },
  {
    accessorKey: 'status',
    header: 'Payment Status',
    cell: ({ row }) => (row.original.status === 1 ? 'Paid' : 'Pending')
  },
  {
    accessorKey: 'remarks',
    header: 'Remark',
    cell: ({ row }) => row.original.remarks || '-'
  },
  {
    accessorKey: 'area',
    header: 'Area',
    cell: ({ row }) => row.original.area || '-'
  },
  {
    id: 'agentStaff',
    header: 'Agent/ Staff',
    cell: ({ row }) => row.original.agency?.name ?? row.original.staff?.name ?? '-'
  },
  {
    id: 'creditCustomer',
    header: 'Credit Customer',
    cell: ({ row }) => row.original.creditCustomer?.name ?? '-'
  },
  {
    accessorKey: 'agencyRef',
    header: 'Agent Ref.',
    cell: ({ row }) => row.original.agencyRef || '-'
  },
  {
    id: 'markAbsent',
    header: 'Mark Absent',
    cell: () => '-'
  }
];

