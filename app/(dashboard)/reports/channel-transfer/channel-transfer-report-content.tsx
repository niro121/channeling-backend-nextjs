'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ReportTemplate } from '@/app/(dashboard)/report-template';
import { DateTimeRangePicker } from '@/components/common/date-time-range-picker';
import { Combobox } from '@/components/common/combobox';
import { Input } from '@/components/ui/input';
import Loading from '@/app/(dashboard)/loading';
import { getChannelTransferSessionOptionsAction } from '@/app/actions/reports/channel-transfer.sessions.action';
import { getChannelTransferReportData, exportChannelTransferReportData } from '@/app/actions/reports/channel-transfer.report.action';
import type { ChannelTransferReportExportRow, ChannelTransferReportQuery, ChannelTransferReportRow } from '@/types/reports/channel-transfer';
import { ChannelTransferReportColumns } from './columns';
import { ReportUserSelect } from '@/components/common/user-select';

type Props = {
  currentUserName: string;
  doctorOptions: Array<{ id: string; name: string }>;
  userOptions: Array<{ id: string; name: string }>;
  locationOptions: Array<{ id: string; name: string }>;
  specialityOptions: Array<{ id: string; name: string }>;
};

function getDefaultDateTimeRange(): { dateFrom: string; dateTo: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return {
    dateFrom: `${y}-${m}-${d}T00:00`,
    dateTo: `${y}-${m}-${d}T23:59`,
  };
}

function ContentInner({ currentUserName, doctorOptions, userOptions, locationOptions, specialityOptions }: Props) {
  const searchParams = useSearchParams();

  const buildQuery = (): ChannelTransferReportQuery => ({
    dateFrom: searchParams.get('dateFrom') ?? '',
    dateTo: searchParams.get('dateTo') ?? '',
    branchId: searchParams.get('branchId') ?? '__all__',
    fromSpecialityId: searchParams.get('fromSpecialityId') ?? '__all__',
    toSpecialityId: searchParams.get('toSpecialityId') ?? '__all__',
    fromDoctorId: searchParams.get('fromDoctorId') ?? '__all__',
    toDoctorId: searchParams.get('toDoctorId') ?? '__all__',
    transferredByUserId: searchParams.get('transferredByUserId') ?? '__all__',
    fromSessionId: searchParams.get('fromSessionId') ?? '__all__',
    toSessionId: searchParams.get('toSessionId') ?? '__all__',
    bookingId: searchParams.get('bookingId') ?? '',
  });

  const [fromSessionOptions, setFromSessionOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [toSessionOptions, setToSessionOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [fromSessionsLoading, setFromSessionsLoading] = useState(false);
  const [toSessionsLoading, setToSessionsLoading] = useState(false);

  // We need to load sessions based on current filter values (date range).
  const dateFrom = searchParams.get('dateFrom') ?? '';
  const dateTo = searchParams.get('dateTo') ?? '';
  const fromDoctorId = searchParams.get('fromDoctorId') ?? '__all__';
  const toDoctorId = searchParams.get('toDoctorId') ?? '__all__';

  useEffect(() => {
    const df = (dateFrom ?? '').trim();
    const dt = (dateTo ?? '').trim();
    if (!df || !dt) {
      setFromSessionOptions([]);
      return;
    }
    let active = true;
    setFromSessionsLoading(true);
    void (async () => {
      const doc = (fromDoctorId ?? '__all__').trim();
      const res = await getChannelTransferSessionOptionsAction({
        dateFrom: df,
        dateTo: dt,
        doctorId: doc !== '__all__' ? doc : undefined,
      });
      if (!active) return;
      setFromSessionOptions(res.success && res.data ? res.data : []);
      setFromSessionsLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [dateFrom, dateTo, fromDoctorId]);

  useEffect(() => {
    const df = (dateFrom ?? '').trim();
    const dt = (dateTo ?? '').trim();
    if (!df || !dt) {
      setToSessionOptions([]);
      return;
    }
    let active = true;
    setToSessionsLoading(true);
    void (async () => {
      const doc = (toDoctorId ?? '__all__').trim();
      const res = await getChannelTransferSessionOptionsAction({
        dateFrom: df,
        dateTo: dt,
        doctorId: doc !== '__all__' ? doc : undefined,
      });
      if (!active) return;
      setToSessionOptions(res.success && res.data ? res.data : []);
      setToSessionsLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [dateFrom, dateTo, toDoctorId]);

  const allFromSessionsOptions = useMemo(
    () => [{ id: '__all__', name: 'All Sessions' }, ...fromSessionOptions],
    [fromSessionOptions]
  );
  const allToSessionsOptions = useMemo(
    () => [{ id: '__all__', name: 'All Sessions' }, ...toSessionOptions],
    [toSessionOptions]
  );

  return (
    <ReportTemplate<ChannelTransferReportRow, ChannelTransferReportExportRow>
      title="Channel Transfer Report"
      description="Tracks channel booking transfers (from/to session details) using activity log + booking/session data."
      filterButtonLabel="Search"
      showBackButton={false}
      containerClassName="w-full py-2 space-y-3"
      generationDetails={{
        generatedBy: currentUserName,
        formatFilters: (values) => {
          const df = values.dateFrom ?? '';
          const dt = values.dateTo ?? '';
          const branchId = values.branchId ?? '__all__';
          const fromSpecialityId = values.fromSpecialityId ?? '__all__';
          const toSpecialityId = values.toSpecialityId ?? '__all__';
          const fromDoctorId = values.fromDoctorId ?? '__all__';
          const toDoctorId = values.toDoctorId ?? '__all__';
          const transferredByUserId = values.transferredByUserId ?? '__all__';
          const fromId = values.fromSessionId ?? '__all__';
          const toId = values.toSessionId ?? '__all__';
          const bookingId = (values.bookingId ?? '').trim();
          const branchLabel =
            branchId === '__all__'
              ? 'All Branches'
              : locationOptions.find((l) => l.id === branchId)?.name ?? branchId;
          const fromSpecialityLabel =
            fromSpecialityId === '__all__'
              ? 'All Specialities'
              : specialityOptions.find((s) => s.id === fromSpecialityId)?.name ?? fromSpecialityId;
          const toSpecialityLabel =
            toSpecialityId === '__all__'
              ? 'All Specialities'
              : specialityOptions.find((s) => s.id === toSpecialityId)?.name ?? toSpecialityId;
          const fromDoctorLabel =
            fromDoctorId === '__all__'
              ? 'All Doctors'
              : doctorOptions.find((d) => d.id === fromDoctorId)?.name ?? fromDoctorId;
          const toDoctorLabel =
            toDoctorId === '__all__'
              ? 'All Doctors'
              : doctorOptions.find((d) => d.id === toDoctorId)?.name ?? toDoctorId;
          const transferredByLabel =
            transferredByUserId === '__all__'
              ? 'All Users'
              : userOptions.find((u) => u.id === transferredByUserId)?.name ?? transferredByUserId;
          const fromLabel =
            fromId === '__all__' ? 'All Sessions' : (allFromSessionsOptions.find((o) => o.id === fromId)?.name ?? fromId);
          const toLabel =
            toId === '__all__' ? 'All Sessions' : (allToSessionsOptions.find((o) => o.id === toId)?.name ?? toId);
          return (
            <>
              <div>Range: {df} to {dt}</div>
              <div>
                Branch: {branchLabel} | Transferred by: {transferredByLabel} | From speciality: {fromSpecialityLabel} | From doctor: {fromDoctorLabel} | From session: {fromLabel} | To speciality: {toSpecialityLabel} | To doctor: {toDoctorLabel} | To session: {toLabel}
                {bookingId ? ` | Booking ID: ${bookingId}` : ''}
              </div>
            </>
          );
        },
      }}
      filterContent={({ values, setValue }) => (
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-shrink-0">
            <DateTimeRangePicker
              label="Date & time range"
              from={values.dateFrom}
              to={values.dateTo}
              onChange={({ from, to }) => {
                setValue('dateFrom', from);
                setValue('dateTo', to);
                // Reset session filters when range changes.
                setValue('fromSessionId', '__all__');
                setValue('toSessionId', '__all__');
              }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold mb-2 block">Branch</label>
            <Combobox
              label="Branch"
              options={locationOptions}
              value={values.branchId ?? '__all__'}
              defaultValue="__all__"
              clearable
              onChange={(v) => setValue('branchId', v ?? '__all__')}
            />
          </div>

          <ReportUserSelect
            userOptions={userOptions}
            value={values.transferredByUserId ?? '__all__'}
            onChange={(v) => setValue('transferredByUserId', v ?? '__all__')}
            label="Transferred By"
            placeholder="Select user"
            widthClassName="w-[240px]"
            includeAllUsers={true}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold mb-2 block">From Speciality</label>
            <Combobox
              label="From Speciality"
              options={specialityOptions}
              value={values.fromSpecialityId ?? '__all__'}
              defaultValue="__all__"
              clearable
              onChange={(v) => {
                setValue('fromSpecialityId', v ?? '__all__');
                setValue('fromDoctorId', '__all__');
                setValue('fromSessionId', '__all__');
              }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold mb-2 block">From Doctor</label>
            <Combobox
              label="From Doctor"
              options={doctorOptions}
              value={values.fromDoctorId ?? '__all__'}
              defaultValue="__all__"
              clearable
              onChange={(v) => {
                setValue('fromDoctorId', v ?? '__all__');
                setValue('fromSessionId', '__all__');
              }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold mb-2 block">To Speciality</label>
            <Combobox
              label="To Speciality"
              options={specialityOptions}
              value={values.toSpecialityId ?? '__all__'}
              defaultValue="__all__"
              clearable
              onChange={(v) => {
                setValue('toSpecialityId', v ?? '__all__');
                setValue('toDoctorId', '__all__');
                setValue('toSessionId', '__all__');
              }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold mb-2 block">To Doctor</label>
            <Combobox
              label="To Doctor"
              options={doctorOptions}
              value={values.toDoctorId ?? '__all__'}
              defaultValue="__all__"
              clearable
              onChange={(v) => {
                setValue('toDoctorId', v ?? '__all__');
                setValue('toSessionId', '__all__');
              }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold mb-2 block">From session</label>
            <Combobox
              label="From Session"
              options={allFromSessionsOptions}
              value={values.fromSessionId ?? '__all__'}
              defaultValue="__all__"
              clearable
              loading={fromSessionsLoading}
              onChange={(v) => setValue('fromSessionId', v ?? '__all__')}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold mb-2 block">To session</label>
            <Combobox
              label="To Session"
              options={allToSessionsOptions}
              value={values.toSessionId ?? '__all__'}
              defaultValue="__all__"
              clearable
              loading={toSessionsLoading}
              onChange={(v) => setValue('toSessionId', v ?? '__all__')}
            />
          </div>

          <div className="w-72">
            <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Booking ID / Bill No / Appointment No</label>
            <Input
              placeholder="e.g. 680... or CH-... or 123"
              value={values.bookingId ?? ''}
              onChange={(e) => setValue('bookingId', e.target.value)}
              className="h-10"
            />
          </div>
        </div>
      )}
      fetchData={async (params) => {
        const query: ChannelTransferReportQuery = {
          dateFrom: params.get('dateFrom') ?? '',
          dateTo: params.get('dateTo') ?? '',
          branchId: params.get('branchId') ?? '__all__',
          fromSpecialityId: params.get('fromSpecialityId') ?? '__all__',
          toSpecialityId: params.get('toSpecialityId') ?? '__all__',
          fromDoctorId: params.get('fromDoctorId') ?? '__all__',
          toDoctorId: params.get('toDoctorId') ?? '__all__',
          transferredByUserId: params.get('transferredByUserId') ?? '__all__',
          fromSessionId: params.get('fromSessionId') ?? '__all__',
          toSessionId: params.get('toSessionId') ?? '__all__',
          bookingId: params.get('bookingId') ?? '',
        };
        return getChannelTransferReportData(query);
      }}
      exportData={async () => exportChannelTransferReportData(buildQuery())}
      columns={ChannelTransferReportColumns}
      exportColumns={[
        'Transferred At',
        'Transferred By',
        'Booking ID',
        'Before',
        'After',
        'Remarks',
        'Action',
      ]}
      exportKeys={
        [
          'transferredAt',
          'transferredBy',
          'bookingId',
          'beforeActivity',
          'afterActivity',
          'remarks',
          'action',
        ] as (keyof ChannelTransferReportExportRow)[]
      }
      exportTitle="Channel Transfer Report"
      exportFileName="channel-transfer-report"
      getRowId={(row) => row.id}
      skipFetchWhenNoParams={true}
      initialFilterValues={getDefaultDateTimeRange()}
      initialEmptyMessage="No transfers found. Select filters and click Search."
      emptyMessage="No transfers found for the selected filters."
    />
  );
}

export default function ChannelTransferReportContent(props: Props) {
  return (
    <Suspense fallback={<Loading />}>
      <ContentInner {...props} />
    </Suspense>
  );
}

