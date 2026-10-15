'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import {
  ATTENDANCE_DEVICE_STATUS_OPTIONS,
  type AttendanceDeviceRecord,
  type AttendanceDeviceSummary
} from '@/types/attendance';
import {
  AttendanceDevicesUiProvider,
  useAttendanceDevicesUi
} from './attendance-devices-ui-context';
import { AttendanceDevicesHeaderActions } from './header-actions';
import SectionDeviceFilters, {
  type DeviceFilterValues
} from './section-device-filters';
import SectionDeviceRegister from './section-device-register';
import SectionDeviceSummary from './section-device-summary';
import SheetDeviceForm from './sheet-device-form';

type AttendanceDevicesWorkspaceProps = {
  records: AttendanceDeviceRecord[];
  totalRecords: number;
  page?: string;
  filters: DeviceFilterValues;
  summary: AttendanceDeviceSummary;
  onExport: () => Promise<{
    success: boolean;
    message?: string;
    data?: Record<string, unknown>[];
  }>;
};

const EMPTY_FILTERS: DeviceFilterValues = {
  code: '',
  name: '',
  location: '',
  status: ''
};

function AttendanceDevicesWorkspaceInner({
  records,
  totalRecords,
  page,
  filters,
  summary,
  onExport
}: AttendanceDevicesWorkspaceProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { formSheet, closeFormSheet } = useAttendanceDevicesUi();
  const [draft, setDraft] = useState<DeviceFilterValues>(filters);

  useEffect(() => {
    setDraft(filters);
  }, [filters]);

  const pushFilters = (next: DeviceFilterValues) => {
    const params = new URLSearchParams();
    const limit = searchParams.get('limit');
    if (limit) params.set('limit', limit);
    if (next.code.trim()) params.set('code', next.code.trim());
    if (next.name.trim()) params.set('name', next.name.trim());
    if (next.location.trim()) params.set('location', next.location.trim());
    if (next.status) params.set('status', next.status);
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Attendance Devices"
        description="Registry of RFID / finger-scan readers. Last seen updates on successful punch ingest."
        actions={<AttendanceDevicesHeaderActions />}
      />

      <SectionDeviceSummary summary={summary} />

      <SectionDeviceFilters
        values={draft}
        statusOptions={ATTENDANCE_DEVICE_STATUS_OPTIONS}
        onChange={(next) => setDraft((prev) => ({ ...prev, ...next }))}
        onSearch={() => pushFilters(draft)}
        onClear={() => {
          setDraft(EMPTY_FILTERS);
          const limit = searchParams.get('limit');
          router.push(limit ? `${pathname}?limit=${limit}` : pathname);
        }}
      />

      <SectionDeviceRegister
        items={records}
        totalRecords={totalRecords}
        page={page}
        onExport={onExport}
      />

      {formSheet ? (
        <SheetDeviceForm
          open
          mode={formSheet.mode}
          record={formSheet.record}
          onOpenChange={(next) => {
            if (!next) closeFormSheet();
          }}
        />
      ) : null}
    </div>
  );
}

export default function AttendanceDevicesWorkspace(
  props: AttendanceDevicesWorkspaceProps
) {
  return (
    <AttendanceDevicesUiProvider>
      <AttendanceDevicesWorkspaceInner {...props} />
    </AttendanceDevicesUiProvider>
  );
}
