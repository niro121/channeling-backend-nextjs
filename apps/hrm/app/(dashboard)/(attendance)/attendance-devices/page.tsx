import { redirect } from 'next/navigation';
import { checkRouteAccess } from '@/lib/server-permissions';
import {
  getAttendanceDeviceSummaryAction,
  getAttendanceDevicesAction,
  getAttendanceDevicesExportAction,
  logAttendanceDevicesVisitAction
} from '@/app/actions/attendance-actions/device.actions';
import type { AttendanceDeviceSummary } from '@/types/attendance';
import AttendanceDevicesWorkspace from './attendance-devices-workspace';
import type { DeviceFilterValues } from './section-device-filters';

type SearchParams = {
  searchParams?: Promise<{
    page?: string;
    limit?: string;
    code?: string;
    name?: string;
    location?: string;
    status?: string;
  }>;
};

const EMPTY_SUMMARY: AttendanceDeviceSummary = {
  total: 0,
  active: 0,
  inactive: 0,
  seenRecently: 0
};

export default async function AttendanceDevicesPage({
  searchParams
}: SearchParams) {
  const canView = await checkRouteAccess('/attendance-devices');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  void logAttendanceDevicesVisitAction();

  const params = await searchParams;
  const filters: DeviceFilterValues = {
    code: params?.code ?? '',
    name: params?.name ?? '',
    location: params?.location ?? '',
    status: params?.status ?? ''
  };

  const listParams = {
    page: params?.page,
    limit: params?.limit,
    code: params?.code,
    name: params?.name,
    location: params?.location,
    status: params?.status
  };

  const [listRes, summaryRes] = await Promise.all([
    getAttendanceDevicesAction(listParams),
    getAttendanceDeviceSummaryAction()
  ]);

  const records = listRes.isError ? [] : (listRes.data?.data ?? []);
  const totalRecords = listRes.isError
    ? 0
    : (listRes.data?.totalRecords ?? 0);
  const summary = summaryRes.isError
    ? EMPTY_SUMMARY
    : (summaryRes.data ?? EMPTY_SUMMARY);

  const handleExport = async () => {
    'use server';

    const exportResponse = await getAttendanceDevicesExportAction(listParams);
    if (!exportResponse.success || !exportResponse.data?.length) {
      return {
        success: false,
        message: exportResponse.message ?? 'No devices to export'
      };
    }
    return {
      success: true,
      data: exportResponse.data
    };
  };

  return (
    <AttendanceDevicesWorkspace
      records={records}
      totalRecords={totalRecords}
      page={params?.page}
      filters={filters}
      summary={summary}
      onExport={handleExport}
    />
  );
}
