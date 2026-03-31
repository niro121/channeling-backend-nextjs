'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ReportTemplate } from '@/app/(dashboard)/report-template';
import { DateAndTimeRangePicker } from '@/components/common/date-and-time-range-picker';
import { Selector } from '@/components/common/selector';
import { Combobox } from '@/components/common/combobox';
import { withAllBranchesOptions } from '@/lib/report-branch-options';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  getChannelBookingsReportData,
  exportChannelBookingsReportData
} from '@/app/actions/reports/channel-bookings.report.action';
import { ChannelBookingsReportColumns } from './columns';
import Loading from '@/app/(dashboard)/loading';
import {
  ChannelBookingsReportExportRow,
  ChannelBookingsReportRow
} from '@/types/reports/channel-bookings';
import type { ChannelBookingsReportContentProps } from '@/types/reports/channel-bookings';

function ChannelBookingsReportContentInner(
  props: ChannelBookingsReportContentProps
) {
  const searchParams = useSearchParams();

  const buildQuery = () => ({
    fromDateTime: searchParams.get('fromDateTime') ?? undefined,
    toDateTime: searchParams.get('toDateTime') ?? undefined,
    dateType: searchParams.get('dateType') ?? undefined,
    institutionId: searchParams.get('institutionId') ?? undefined,
    locationId: searchParams.get('locationId') ?? undefined,
    departmentId: searchParams.get('departmentId') ?? undefined,
    branchTypeId: searchParams.get('branchTypeId') ?? undefined,
    specialityId: searchParams.get('specialityId') ?? undefined,
    doctorId: searchParams.get('doctorId') ?? undefined,
    status: searchParams.get('status') ?? undefined,
    refundStatus: searchParams.get('refundStatus') ?? undefined,
    areaId: searchParams.get('areaId') ?? undefined,
    agencyId: searchParams.get('agencyId') ?? undefined,
    patientPhone: searchParams.get('patientPhone') ?? undefined,
    gender: searchParams.get('gender') ?? undefined,
    paymentTypeId: searchParams.get('paymentTypeId') ?? undefined,
    methodId: searchParams.get('methodId') ?? undefined
  });

  return (
    <ReportTemplate<ChannelBookingsReportRow, ChannelBookingsReportExportRow>
      title="Channel Booking Details Report"
      description="View channel booking records with filters for date range, data type, institution, branch, department, speciality, doctor, status, refund status, area, agency, patient phone, gender, payment type, and method"
      filterButtonLabel="Search"
      filterContent={({ values, setValue }) => {
        const hasDateRange = Boolean(
          values.fromDateTime?.trim() && values.toDateTime?.trim()
        );
        return (
          <>
            <div className="flex flex-wrap gap-3">
              {/* Date */}
              <div className="flex flex-col gap-1.5">
                <div className="flex flex-wrap items-end gap-3">
                  <DateAndTimeRangePicker
                    label="Date & Time Range"
                    from={values.fromDateTime}
                    to={values.toDateTime}
                    onChange={({ from, to }) => {
                      setValue('fromDateTime', from);
                      setValue('toDateTime', to);
                    }}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    Date Type
                  </span>
                  <Selector
                    label="Date Type"
                    options={props.dateTypeOptions}
                    value={values.dateType ?? 'session_date'}
                    onChange={(v) => setValue('dateType', v)}
                    disabled={!hasDateRange}
                  />
                  {!hasDateRange && (
                    <span className="text-xs text-muted-foreground max-w-56">
                      Select a date range first to choose date type
                    </span>
                  )}
                </div>
              </div>
              {/* Institution & Branch */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  Location
                </span>
                <div className="flex flex-wrap items-end gap-3">
                  <Selector
                    label="Institution"
                    options={props.institutionOptions}
                    value={values.institutionId ?? '__all__'}
                    onChange={(v) => setValue('institutionId', v)}
                    className={{ trigger: 'self-end!' }}
                  />
                  <Selector
                    label="Branch Type"
                    options={props.branchTypeOptions}
                    value={values.branchTypeId ?? '__all__'}
                    defaultValue="__all__"
                    onChange={(v) => setValue('branchTypeId', v)}
                    className={{ trigger: 'self-end!' }}
                  />
                  <Combobox
                    label="Branch (Site)"
                    options={withAllBranchesOptions(props.locationOptions)}
                    value={values.locationId ?? '__all__'}
                    defaultValue="__all__"
                    clearable
                    onChange={(v) => setValue('locationId', v)}
                  />
                </div>
                <div className="flex flex-wrap items-end gap-3">
                  <Combobox
                    label="Department"
                    options={props.departmentOptions}
                    value={values.departmentId ?? '__all__'}
                    defaultValue="__all__"
                    onChange={(v) => setValue('departmentId', v)}
                  />
                  <Combobox
                    label="Area"
                    options={props.areaOptions}
                    value={values.areaId ?? '__all__'}
                    defaultValue="__all__"
                    onChange={(v) => setValue('areaId', v)}
                  />
                  <Combobox
                    label="Agency"
                    options={props.agencyOptions}
                    value={values.agencyId ?? '__all__'}
                    defaultValue="__all__"
                    onChange={(v) => setValue('agencyId', v)}
                  />
                </div>
              </div>
              {/* Doctor & Speciality */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  Consultant
                </span>
                <div className="flex flex-wrap items-end gap-3">
                  <Combobox
                    label="Doctor"
                    options={props.doctorOptions}
                    value={values.doctorId ?? '__all__'}
                    defaultValue="__all__"
                    onChange={(v) => setValue('doctorId', v)}
                  />
                  <Combobox
                    label="Speciality"
                    options={props.specialityOptions}
                    value={values.specialityId ?? '__all__'}
                    defaultValue="__all__"
                    onChange={(v) => setValue('specialityId', v)}
                  />
                </div>
              </div>
              {/* Patient */}
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Patient
                  </Label>
                  <Input
                    name="patientPhone"
                    placeholder="Search by phone"
                    className="h-10 w-40"
                    value={values.patientPhone ?? ''}
                    onChange={(e) =>
                      setValue(
                        'patientPhone',
                        e.target.value.trim() || undefined
                      )
                    }
                    data-filter-include
                  />
                </div>
                <Selector
                  label="Gender"
                  options={props.genderOptions}
                  value={values.gender ?? '__all__'}
                  onChange={(v) => setValue('gender', v)}
                  className={{ trigger: 'self-end!' }}
                />
              </div>
              {/* Status & Refund */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  Status
                </span>
                <div className="flex flex-wrap items-end gap-3">
                  <Selector
                    label="All Status"
                    options={props.statusOptions}
                    value={values.status ?? '__all__'}
                    onChange={(v) => setValue('status', v)}
                    className={{ trigger: 'self-end!' }}
                  />
                  <Selector
                    label="All Refund Status"
                    options={props.refundStatusOptions}
                    value={values.refundStatus ?? '__all__'}
                    onChange={(v) => setValue('refundStatus', v)}
                    className={{ trigger: 'self-end!' }}
                  />
                </div>
              </div>
              {/* Payment */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  Payment
                </span>
                <div className="flex flex-wrap items-end gap-3">
                  <Selector
                    label="All Payment Types"
                    options={props.paymentTypeOptions}
                    value={values.paymentTypeId ?? '__all__'}
                    onChange={(v) => setValue('paymentTypeId', v)}
                    className={{ trigger: 'self-end!' }}
                  />
                  <Selector
                    label="All Methods"
                    options={props.methodOptions}
                    value={values.methodId ?? '__all__'}
                    onChange={(v) => setValue('methodId', v)}
                    className={{ trigger: 'self-end!' }}
                  />
                </div>
              </div>
            </div>
          </>
        );
      }}
      fetchData={async (params) => {
        const query = {
          fromDateTime: params.get('fromDateTime') ?? undefined,
          toDateTime: params.get('toDateTime') ?? undefined,
          dateType: params.get('dateType') ?? undefined,
          institutionId: params.get('institutionId') ?? undefined,
          locationId: params.get('locationId') ?? undefined,
          departmentId: params.get('departmentId') ?? undefined,
          branchTypeId: params.get('branchTypeId') ?? undefined,
          specialityId: params.get('specialityId') ?? undefined,
          doctorId: params.get('doctorId') ?? undefined,
          status: params.get('status') ?? undefined,
          refundStatus: params.get('refundStatus') ?? undefined,
          areaId: params.get('areaId') ?? undefined,
          agencyId: params.get('agencyId') ?? undefined,
          patientPhone: params.get('patientPhone') ?? undefined,
          gender: params.get('gender') ?? undefined,
          paymentTypeId: params.get('paymentTypeId') ?? undefined,
          methodId: params.get('methodId') ?? undefined
        };
        return getChannelBookingsReportData(query);
      }}
      exportData={async () => exportChannelBookingsReportData(buildQuery())}
      columns={ChannelBookingsReportColumns}
      exportColumns={[
        'Consultant Code-Name',
        'Speciality',
        'Apply Date',
        'Apply Time',
        'Apply Number',
        'Bill Number',
        'Method',
        'Status',
        'Refund Status',
        'Refunded At',
        'Refunded By',
        'Patient Name',
        'Patient Number',
        'Area',
        'Updater',
        'Creator',
        'Hospital Fee',
        'Doctor Fee',
        'Discount',
        'Total Fee',
        'Payment Mode',
        'Agent Name'
      ]}
      exportKeys={
        [
          'consultantCodeName',
          'speciality',
          'applyDate',
          'applyTime',
          'applyNumber',
          'billNumber',
          'method',
          'status',
          'refundStatus',
          'refundedAt',
          'refundedBy',
          'patientName',
          'patientNumber',
          'area',
          'updater',
          'creator',
          'hospitalFee',
          'doctorFee',
          'discount',
          'totalFee',
          'paymentMode',
          'agentName'
        ] as (keyof ChannelBookingsReportExportRow)[]
      }
      exportTitle="Channel Bookings Report"
      exportFileName="channel-bookings-report"
      getRowId={(row) => row.id}
      showPrintButton={true}
      totalColumnIds={['hospitalFee', 'doctorFee', 'discount', 'totalFee']}
      getTotalNumericValue={(row, columnId) => {
        const o = row as Record<string, unknown>;
        const fromCents = (key: string) =>
          typeof o[key] === 'number' ? (o[key] as number) / 100 : 0;
        switch (columnId) {
          case 'hospitalFee':
            return fromCents('hospitalFee');
          case 'doctorFee':
            return fromCents('professionalFee');
          case 'discount':
            return fromCents('discount');
          case 'totalFee':
            return fromCents('amount');
          default:
            return 0;
        }
      }}
      emptyMessage="No channel bookings found. Apply filters and click Search."
      skipFetchWhenNoParams={true}
      groupBy={(row) => (row as { doctor?: { id?: string } }).doctor?.id ?? ''}
      renderGroupHeader={(_, rows) => {
        const first = rows[0] as { doctor?: { code?: string; name?: string } };
        const code = first?.doctor?.code ?? '-';
        const name = first?.doctor?.name ?? '-';
        return `${code} – ${name}`;
      }}
    />
  );
}

export default function ChannelBookingsReportContent(
  props: ChannelBookingsReportContentProps
) {
  return (
    <Suspense fallback={<Loading />}>
      <ChannelBookingsReportContentInner {...props} />
    </Suspense>
  );
}
