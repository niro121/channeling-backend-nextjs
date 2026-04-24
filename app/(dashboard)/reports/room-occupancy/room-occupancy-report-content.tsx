'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ReportTemplate } from '@/app/(dashboard)/report-template';
import { DateTimeRangePicker } from '@/components/common/date-time-range-picker';
import { Selector } from '@/components/common/selector';
import { Combobox } from '@/components/common/combobox';
import { withAllBranchesOptions } from '@/lib/report-branch-options';
import Loading from '@/app/(dashboard)/loading';
import {
  getRoomOccupancyReportData,
  exportRoomOccupancyReportData
} from '@/app/actions/reports/room-occupancy.report.action';
import { RoomOccupancyReportColumns } from './columns';
import type {
  RoomOccupancyReportContentProps,
  RoomOccupancyReportExportRow,
  RoomOccupancyReportRow
} from '@/types/reports/room-occupancy';

function filterOptionLabel(
  id: string | undefined,
  allLabel: string,
  options: Array<{ id: string; name: string }>
): string {
  if (id == null || id === '' || id === '__all__') return allLabel;
  return options.find((o) => o.id === id)?.name ?? id;
}

function getDefaultDateTimeRange(): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return { from: `${y}-${m}-${d}T00:00`, to: `${y}-${m}-${d}T23:59` };
}

function ContentInner({
  currentUserName,
  institutionOptions,
  locationOptions,
  departmentOptions,
  roomOptions
}: RoomOccupancyReportContentProps) {
  const searchParams = useSearchParams();

  const initialFilterValues = React.useMemo(() => {
    const { from, to } = getDefaultDateTimeRange();
    return { fromDateTime: from, toDateTime: to };
  }, []);

  const buildQuery = () => ({
    fromDateTime: searchParams.get('fromDateTime') ?? undefined,
    toDateTime: searchParams.get('toDateTime') ?? undefined,
    institutionId: searchParams.get('institutionId') ?? undefined,
    locationId: searchParams.get('locationId') ?? undefined,
    departmentId: searchParams.get('departmentId') ?? undefined,
    roomId: searchParams.get('roomId') ?? undefined
  });

  const exportColumns = [
    'Room No',
    'Date',
    ...Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}`),
    'Booked Hours'
  ];
  const exportKeys = [
    'roomNumber',
    'date',
    ...Array.from({ length: 24 }, (_, h) => `hour${String(h).padStart(2, '0')}`),
    'bookedHours'
  ] as (keyof RoomOccupancyReportExportRow)[];

  return (
    <ReportTemplate<RoomOccupancyReportRow, RoomOccupancyReportExportRow>
      title="Room Occupancy"
      description="Highlight booked room hours by date using session start and end time."
      filterButtonLabel="Search"
      generationDetails={{
        generatedBy: currentUserName,
        formatFilters: (values) => (
          <>
            <div>
              Date & time range: {values.fromDateTime || '—'} to {values.toDateTime || '—'}
            </div>
            <div>
              Institution: {filterOptionLabel(values.institutionId, 'All Institutions', institutionOptions)} | Branch:{' '}
              {filterOptionLabel(values.locationId, 'All Branches', withAllBranchesOptions(locationOptions))} | Department:{' '}
              {filterOptionLabel(values.departmentId, 'All Departments', departmentOptions)} | Room No:{' '}
              {filterOptionLabel(values.roomId, 'All Rooms', roomOptions)}
            </div>
          </>
        )
      }}
      filterContent={({ values, setValue }) => (
        <>
          <div className="basis-full shrink-0">
            <DateTimeRangePicker
              label="Date & Time Range"
              from={values.fromDateTime}
              to={values.toDateTime}
              onChange={({ from, to }) => {
                setValue('fromDateTime', from);
                setValue('toDateTime', to);
              }}
            />
          </div>
          <Selector
            label="Institution"
            options={institutionOptions}
            value={values.institutionId ?? '__all__'}
            onChange={(v) => setValue('institutionId', v)}
            className={{ trigger: 'self-end!' }}
          />
          <Combobox
            label="Branch"
            options={withAllBranchesOptions(locationOptions)}
            value={values.locationId ?? '__all__'}
            defaultValue="__all__"
            clearable
            onChange={(v) => setValue('locationId', v)}
          />
          <Combobox
            label="Department"
            options={departmentOptions}
            value={values.departmentId ?? '__all__'}
            defaultValue="__all__"
            onChange={(v) => setValue('departmentId', v)}
          />
          <Combobox
            label="Room No"
            options={roomOptions}
            value={values.roomId ?? '__all__'}
            defaultValue="__all__"
            onChange={(v) => setValue('roomId', v)}
          />
        </>
      )}
      fetchData={async (params) =>
        getRoomOccupancyReportData({
          fromDateTime: params.get('fromDateTime') ?? undefined,
          toDateTime: params.get('toDateTime') ?? undefined,
          institutionId: params.get('institutionId') ?? undefined,
          locationId: params.get('locationId') ?? undefined,
          departmentId: params.get('departmentId') ?? undefined,
          roomId: params.get('roomId') ?? undefined
        })
      }
      exportData={async () => exportRoomOccupancyReportData(buildQuery())}
      columns={RoomOccupancyReportColumns}
      exportColumns={exportColumns}
      exportKeys={exportKeys}
      exportTitle="Room Occupancy"
      exportFileName="room-occupancy-report"
      getRowId={(row) => row.id}
      showPrintButton={true}
      emptyMessage="No room occupancy records found. Select filters and click Search."
      initialEmptyMessage="No room occupancy records found. Select filters and click Search."
      skipFetchWhenNoParams={true}
      initialFilterValues={initialFilterValues}
      tableClassName="text-[11px] min-w-max [&_th]:border-r [&_th]:border-border [&_th:last-child]:border-r-0 [&_td]:border-r [&_td]:border-border [&_td:last-child]:border-r-0 [&_th:last-child]:sticky [&_th:last-child]:right-0 [&_th:last-child]:z-30 [&_th:last-child]:bg-muted [&_td:last-child]:sticky [&_td:last-child]:right-0 [&_td:last-child]:z-20 [&_td:last-child]:bg-muted"
      getCellRowSpan={(row, columnId) => {
        if (columnId !== 'roomNumber') return undefined;
        return row.roomNumberRowSpan;
      }}
    />
  );
}

export default function RoomOccupancyReportContent(props: RoomOccupancyReportContentProps) {
  return (
    <Suspense fallback={<Loading />}>
      <ContentInner {...props} />
    </Suspense>
  );
}
