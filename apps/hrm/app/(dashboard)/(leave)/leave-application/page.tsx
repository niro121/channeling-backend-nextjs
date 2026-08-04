import { redirect } from 'next/navigation';
import { checkRouteAccess } from '@/lib/server-permissions';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import SectionApplicationList from './section-leave-form-list';
import type { LeaveApplicationRecord } from './columns';

const sampleStaffOptions = [
  { id: 'emp-1', name: 'Nimal Perera' },
  { id: 'emp-2', name: 'Kamal Silva' },
  { id: 'emp-3', name: 'Samanthi Fernando' }
];

const sampleLeaveTypeOptions = [
  { id: 'annual', name: 'Annual Leave' },
  { id: 'casual', name: 'Casual Leave' },
  { id: 'medical', name: 'Medical Leave' },
  { id: 'maternity', name: 'Maternity Leave' }
];

const sampleApproverOptions = [
  { id: 'apr-1', name: 'Dr. Wijesinghe' },
  { id: 'apr-2', name: 'Ms. Jayasuriya' },
  { id: 'apr-3', name: 'Mr. Bandara' }
];

const sampleApplications: LeaveApplicationRecord[] = [
  {
    id: '1',
    staffId: 'emp-1',
    staffCode: 'STF-001',
    staffName: 'Nimal Perera',
    leaveType: 'Annual Leave',
    leaveTypeId: 'annual',
    fromDate: '2026-03-10',
    toDate: '2026-03-12',
    days: 3,
    approverId: 'apr-1',
    approverName: 'Dr. Wijesinghe',
    status: 'approved',
    approvedAt: '2026-03-02',
    shiftDate: '2026-03-10',
    createdAt: '2026-03-01T09:15:00',
    updatedAt: '2026-03-02T11:40:00',
    createdUser: { name: 'System Admin' },
    updatedUser: { name: 'Dr. Wijesinghe' }
  },
  {
    id: '2',
    staffId: 'emp-2',
    staffCode: 'STF-002',
    staffName: 'Kamal Silva',
    leaveType: 'Casual Leave',
    leaveTypeId: 'casual',
    fromDate: '2026-03-15',
    toDate: '2026-03-15',
    days: 1,
    approverId: 'apr-2',
    approverName: 'Ms. Jayasuriya',
    status: 'pending',
    approvedAt: null,
    shiftDate: '2026-03-15',
    createdAt: '2026-03-08T14:20:00',
    updatedAt: '2026-03-08T14:20:00',
    createdUser: { name: 'Kamal Silva' },
    updatedUser: { name: 'Kamal Silva' }
  },
  {
    id: '3',
    staffId: 'emp-3',
    staffCode: 'STF-003',
    staffName: 'Samanthi Fernando',
    leaveType: 'Medical Leave',
    leaveTypeId: 'medical',
    fromDate: '2026-02-20',
    toDate: '2026-02-22',
    days: 3,
    approverId: 'apr-1',
    approverName: 'Dr. Wijesinghe',
    status: 'approved',
    approvedAt: '2026-02-18',
    shiftDate: '2026-02-20',
    createdAt: '2026-02-18T08:05:00',
    updatedAt: '2026-02-18T16:45:00',
    createdUser: { name: 'Samanthi Fernando' },
    updatedUser: { name: 'Dr. Wijesinghe' }
  },
  {
    id: '4',
    staffId: 'emp-1',
    staffCode: 'STF-001',
    staffName: 'Nimal Perera',
    leaveType: 'Casual Leave',
    leaveTypeId: 'casual',
    fromDate: '2026-04-01',
    toDate: '2026-04-02',
    days: 2,
    approverId: 'apr-3',
    approverName: 'Mr. Bandara',
    status: 'rejected',
    approvedAt: '2026-03-26',
    shiftDate: '2026-04-01',
    createdAt: '2026-03-25T10:00:00',
    updatedAt: '2026-03-26T09:30:00',
    createdUser: { name: 'Nimal Perera' },
    updatedUser: { name: 'Mr. Bandara' }
  },
  {
    id: '5',
    staffId: 'emp-2',
    staffCode: 'STF-002',
    staffName: 'Kamal Silva',
    leaveType: 'Annual Leave',
    leaveTypeId: 'annual',
    fromDate: '2026-01-10',
    toDate: '2026-01-14',
    days: 5,
    approverId: 'apr-2',
    approverName: 'Ms. Jayasuriya',
    status: 'cancelled',
    approvedAt: '2026-01-03',
    shiftDate: '2026-01-10',
    createdAt: '2026-01-02T11:10:00',
    updatedAt: '2026-01-05T13:00:00',
    createdUser: { name: 'Kamal Silva' },
    updatedUser: { name: 'Ms. Jayasuriya' }
  }
];

type SearchParams = {
  searchParams?: Promise<{
    staffId?: string;
    leaveType?: string;
    approverId?: string;
    fromDate?: string;
    toDate?: string;
    dateSearchBy?: string;
    outWithCancel?: string;
  }>;
};

function toDateKey(value?: string | Date | null): string | null {
  if (!value) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return value.slice(0, 10);
}

function getDateField(
  row: LeaveApplicationRecord,
  dateSearchBy?: string
): string | null {
  switch (dateSearchBy) {
    case 'approved':
      return toDateKey(row.approvedAt);
    case 'shift':
      return toDateKey(row.shiftDate);
    case 'created':
    default:
      return toDateKey(row.createdAt);
  }
}

function filterApplications(
  rows: LeaveApplicationRecord[],
  filters: {
    staffId?: string;
    leaveType?: string;
    approverId?: string;
    fromDate?: string;
    toDate?: string;
    dateSearchBy?: string;
    outWithCancel?: string;
  }
): LeaveApplicationRecord[] {
  return rows.filter((row) => {
    if (filters.staffId && row.staffId !== filters.staffId) return false;
    if (filters.leaveType && row.leaveTypeId !== filters.leaveType)
      return false;
    if (filters.approverId && row.approverId !== filters.approverId)
      return false;

    if (filters.outWithCancel === 'yes' && row.status === 'cancelled')
      return false;
    if (filters.outWithCancel === 'no' && row.status !== 'cancelled')
      return false;

    const dateValue = getDateField(row, filters.dateSearchBy);
    if (filters.fromDate || filters.toDate) {
      if (!dateValue) return false;
      if (filters.fromDate && dateValue < filters.fromDate) return false;
      if (filters.toDate && dateValue > filters.toDate) return false;
    }

    return true;
  });
}

export default async function LeaveApplicationPage({
  searchParams
}: SearchParams) {
  const canView = await checkRouteAccess('/leave-application');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const params = await searchParams;
  const filters = {
    staffId: params?.staffId,
    leaveType: params?.leaveType,
    approverId: params?.approverId,
    fromDate: params?.fromDate,
    toDate: params?.toDate,
    dateSearchBy: params?.dateSearchBy,
    outWithCancel: params?.outWithCancel
  };

  const filtered = filterApplications(sampleApplications, filters);

  const handleExport = async () => {
    'use server';

    const rows = filterApplications(sampleApplications, {
      staffId: params?.staffId,
      leaveType: params?.leaveType,
      approverId: params?.approverId,
      fromDate: params?.fromDate,
      toDate: params?.toDate,
      dateSearchBy: params?.dateSearchBy,
      outWithCancel: params?.outWithCancel
    });

    if (!rows.length) {
      return {
        success: false,
        message: 'No leave application records found'
      };
    }

    return {
      success: true,
      data: rows.map((row) => ({
        staffCode: row.staffCode,
        staffName: row.staffName,
        leaveType: row.leaveType,
        fromDate: row.fromDate,
        toDate: row.toDate,
        days: row.days,
        approverName: row.approverName,
        status: row.status,
        outWithCancel: row.status !== 'cancelled' ? 'Yes' : 'No',
        approvedAt: row.approvedAt ?? '',
        shiftDate: row.shiftDate,
        updatedBy: row.updatedUser?.name ?? '',
        updatedAt: row.updatedAt,
        createdBy: row.createdUser?.name ?? '',
        createdAt: row.createdAt
      }))
    };
  };

  /** Stub until leave-application delete API exists. */
  const handleBulkDelete = async (ids: string[]) => {
    'use server';
    console.info('[leave-application] bulk delete stub', ids);
    return true;
  };

  const getBulkDeleteDescription = async (ids: string[]) => {
    'use server';
    return `This will permanently delete ${ids.length} leave application${ids.length === 1 ? '' : 's'}. This action cannot be undone.`;
  };

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Leave Application"
        description="Submit and track leave applications."
      />

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="col-span-3 min-h-40 rounded-md border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
          35% container
        </div>

        <div className="col-span-9">
          <SectionApplicationList
            records={filtered}
            staffOptions={sampleStaffOptions}
            leaveTypeOptions={sampleLeaveTypeOptions}
            approverOptions={sampleApproverOptions}
            filters={filters}
            onExport={handleExport}
            onBulkDelete={handleBulkDelete}
            getBulkDeleteDescription={getBulkDeleteDescription}
          />
        </div>
      </div>
    </div>
  );
}
