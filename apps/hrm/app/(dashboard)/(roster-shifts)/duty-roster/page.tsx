import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { format, parseISO } from 'date-fns';
import { checkRouteAccess } from '@/lib/server-permissions';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import {
  getDutyRosterAction,
  getDutyRosterExport,
  getDutyRosterFilterOptionsAction,
  getDutyRosterFormOptionsAction
} from '@/app/actions/roster-actions/duty-roster.actions';
import type {
  DutyRosterFilterOptions,
  DutyRosterFormOptions,
  DutyRosterRow,
  DutyRosterSummary
} from '@/types/roster';
import { parseDutyView } from '@/lib/utils/duty-roster-view';
import DutyRosterWorkspace from './duty-roster-workspace';
import type { DutyFilterValues } from './section-duty-filters';

type SearchParams = {
  searchParams?: Promise<{
    page?: string;
    limit?: string;
    department?: string;
    unit?: string;
    roster?: string;
    shiftTypeId?: string;
    view?: string;
    dutyDate?: string;
    search?: string;
  }>;
};

const EMPTY_SUMMARY: DutyRosterSummary = {
  onDutyToday: 0,
  present: 0,
  lateArrivals: 0,
  unfilledDuties: 0
};

const EMPTY_FILTERS: DutyRosterFilterOptions = {
  departments: [],
  units: [],
  rosters: [],
  shifts: []
};

const EMPTY_FORM_OPTIONS: DutyRosterFormOptions = {
  staff: [],
  shiftTypes: [],
  supervisors: [],
  locations: [],
  units: []
};

function parseDutyDate(value?: string): Date {
  if (!value) return new Date();
  try {
    return parseISO(value);
  } catch {
    return new Date();
  }
}

export default async function DutyRosterPage({ searchParams }: SearchParams) {
  const canView = await checkRouteAccess('/duty-roster');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'duty-roster.visited',
      entityType: 'DutyRoster',
      importance: 'low'
    });
  }

  const params = await searchParams;
  const dutyDate = parseDutyDate(params?.dutyDate);
  const viewMode = parseDutyView(params?.view);
  const filters: DutyFilterValues = {
    departmentId: params?.department ?? '',
    unitId: params?.unit ?? '',
    dutyDate,
    shiftId: params?.shiftTypeId ?? '',
    rosterId: params?.roster ?? ''
  };

  const listParams = {
    page: params?.page,
    limit: params?.limit,
    department: params?.department,
    unit: params?.unit,
    roster: params?.roster,
    shiftTypeId: params?.shiftTypeId,
    dutyDate: format(dutyDate, 'yyyy-MM-dd'),
    view: viewMode,
    search: params?.search
  };

  const [listRes, filterOptionsRes, formOptionsRes] = await Promise.all([
    getDutyRosterAction(listParams),
    getDutyRosterFilterOptionsAction(),
    getDutyRosterFormOptionsAction()
  ]);

  const records = (
    listRes.isError ? [] : (listRes.data?.data ?? [])
  ) as DutyRosterRow[];
  const totalRecords = listRes.isError
    ? 0
    : (listRes.data?.totalRecords ?? 0);
  const summary = listRes.isError
    ? EMPTY_SUMMARY
    : (listRes.data?.summary ?? EMPTY_SUMMARY);
  const filterOptions = filterOptionsRes.isError
    ? EMPTY_FILTERS
    : (filterOptionsRes.data ?? EMPTY_FILTERS);
  const formOptions = formOptionsRes.isError
    ? EMPTY_FORM_OPTIONS
    : (formOptionsRes.data ?? EMPTY_FORM_OPTIONS);

  const handleExport = async () => {
    'use server';

    const exportResponse = await getDutyRosterExport(listParams);
    if (!exportResponse.success || !exportResponse.data?.length) {
      return {
        success: false,
        message: exportResponse.success
          ? 'No duty roster rows found'
          : (exportResponse.message ?? 'Failed to export duty roster')
      };
    }

    return {
      success: true,
      data: exportResponse.data.map((row) => ({
        ...(viewMode !== 'daily'
          ? { date: row.date ? row.date.slice(0, 10) : '' }
          : {}),
        staffCode: row.staffCode,
        staffName: row.staffName,
        shiftName: row.shiftName,
        startTime: row.startTime,
        endTime: row.endTime,
        dutyLocation: row.dutyLocation,
        wardUnit: row.wardUnit,
        supervisorName: row.supervisorName,
        status: row.status,
        attendance: row.attendance ?? '',
        updatedBy: row.updatedUser?.name ?? '',
        updatedAt: row.updatedAt,
        createdBy: row.createdUser?.name ?? '',
        createdAt: row.createdAt
      }))
    };
  };

  return (
    <DutyRosterWorkspace
      records={records}
      totalRecords={totalRecords}
      page={params?.page}
      filters={filters}
      viewMode={viewMode}
      summary={summary}
      filterOptions={filterOptions}
      formOptions={formOptions}
      onExport={handleExport}
    />
  );
}
