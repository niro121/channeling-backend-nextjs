'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ReportTemplate } from '@/app/(dashboard)/report-template';
import { DateAndTimeRangePicker } from '@/components/common/date-and-time-range-picker';
import { Selector } from '@/components/common/selector';
import { Combobox } from '@/components/common/combobox';
import { withAllBranchesOptions } from '@/lib/report-branch-options';
import { formatReportRangeLabel } from '@/lib/format-report-range-label';
import {
  getConsultantPaymentsReportData,
  exportConsultantPaymentsReportData,
  ConsultantPaymentsReportExportRow
} from '@/app/actions/reports/consultant.payments.report.action';
import { ConsultantPaymentsReportColumns } from './columns';
import Loading from '@/app/(dashboard)/loading'
import type { ConsultantPaymentsReportRow } from '@/types/report';
import { formatLKR } from '@/lib/format-money';
import moment from 'moment';

const PDF_HEADERS = [
  'S.No',
  'Branch',
  'Consultant',
  'Consultant Code',
  'Payment Receipt',
  'Channel Receipt',
  'Consultation Date/Session Time',
  'Patient Name',
  'Mode of Pay',
  'Consultation Charge',
  'Discount Amount',
  'WHT',
  'Net Amount',
  'Payment Status',
  'Paid By',
  'Paid Date',
  'Handed By',
] as const;

function pdfCell(value: string | number | null | undefined): string {
  if (value === undefined || value === null || value === '') return '-';
  return String(value);
}

/** Print body uses the same columns and cell values as the branded PDF. */
function renderConsultantPaymentsPrint(rows: ConsultantPaymentsReportRow[]) {
  return (
    <table className="cpr-pdf-table">
      <thead>
        <tr>
          {PDF_HEADERS.map((label) => (
            <th key={label}>{label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            <td>{pdfCell(row.sNo)}</td>
            <td>{pdfCell(row.branch)}</td>
            <td>{pdfCell(row.consultant)}</td>
            <td>{pdfCell(row.consultantCode)}</td>
            <td>{pdfCell(row.paymentReceipt)}</td>
            <td>{pdfCell(row.channelReceipt)}</td>
            <td>{pdfCell(row.consultationSession)}</td>
            <td>{pdfCell(row.patientName)}</td>
            <td>{pdfCell(row.modeOfPay)}</td>
            <td>{pdfCell(row.consultationCharge ?? 0)}</td>
            <td>{pdfCell(row.discountAmount ?? 0)}</td>
            <td>{pdfCell(row.whtAmount ?? 0)}</td>
            <td>{pdfCell(row.netAmount ?? 0)}</td>
            <td>{pdfCell(row.paymentStatus)}</td>
            <td>{pdfCell(row.paidBy)}</td>
            <td>{row.paidDate ? moment(row.paidDate).format('DD/MM/YYYY HH:mm') : '-'}</td>
            <td>{pdfCell(row.handedBy)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

type ConsultantPaymentsReportContentProps = {
  currentUserName: string;
  institutionOptions: Array<{ id: string; name: string }>;
  locationOptions: Array<{ id: string; name: string }>;
  departmentOptions: Array<{ id: string; name: string }>;
  specialityOptions: Array<{ id: string; name: string }>;
  doctorOptions: Array<{ id: string; name: string }>;
};

/** Default from = today 00:00, to = today 23:59 (local) in YYYY-MM-DDTHH:mm */
function getTodayDateTimeRange(): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return {
    from: `${y}-${m}-${d}T00:00`,
    to: `${y}-${m}-${d}T23:59`
  };
}

function ConsultantPaymentsReportContentInner({
  currentUserName,
  institutionOptions,
  locationOptions,
  departmentOptions,
  specialityOptions,
  doctorOptions
}: ConsultantPaymentsReportContentProps) {
  const searchParams = useSearchParams();

  const buildQuery = () => ({
    fromDateTime: searchParams.get('fromDateTime') ?? undefined,
    toDateTime: searchParams.get('toDateTime') ?? undefined,
    institutionId: searchParams.get('institutionId') ?? undefined,
    locationId: searchParams.get('locationId') ?? undefined,
    departmentId: searchParams.get('departmentId') ?? undefined,
    specialityId: searchParams.get('specialityId') ?? undefined,
    doctorId: searchParams.get('doctorId') ?? undefined,
    status: searchParams.get('status') ?? undefined,
    sessionType: searchParams.get('sessionType') ?? undefined
  });

  const statusOptions = [
    { id: '__all__', name: 'All Status' },
    { id: '1', name: 'Paid' },
    { id: '0', name: 'Due Pay' }
  ];

  const sessionOptions = [
    { id: '__all__', name: 'All Session' },
    { id: 'morning', name: 'Morning (12.00 AM – 11.59 AM)' },
    { id: 'evening', name: 'Evening (12.00 PM – 11.59 PM)' }
  ];

  return (
    <>
      <style>{`
        @media print {
          .consultant-payments-report-root,
          .consultant-payments-report-root.container {
            width: 100% !important;
            max-width: none !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
          }
          .consultant-payments-report-root .rpt-print-root,
          .consultant-payments-report-root .rpt-print-body {
            width: 100% !important;
            max-width: none !important;
            box-sizing: border-box !important;
          }
          .consultant-payments-report-root .rpt-print-body .overflow-x-auto,
          .consultant-payments-report-root .rpt-print-body .overflow-auto,
          .consultant-payments-report-root .rpt-print-body .overflow-hidden,
          .consultant-payments-report-root .rpt-print-body .rounded-lg,
          .consultant-payments-report-root .rpt-print-body .rounded-md {
            overflow: visible !important;
            width: 100% !important;
            max-width: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }
          .consultant-payments-report-root .rpt-print-root table {
            table-layout: fixed !important;
            width: 100% !important;
            max-width: 100% !important;
            border-collapse: collapse !important;
            border: 0.5pt solid #000 !important;
          }
          .consultant-payments-report-root .rpt-print-root th,
          .consultant-payments-report-root .rpt-print-root td {
            width: auto !important;
            font-size: 5.5pt !important;
            font-weight: 400 !important;
            padding: 0.7mm !important;
            line-height: 1.15 !important;
            text-align: left !important;
            white-space: normal !important;
            word-break: break-word !important;
            overflow-wrap: anywhere !important;
            overflow: hidden !important;
            border: 0.5pt solid #000 !important;
            color: #000 !important;
            background: #fff !important;
            vertical-align: middle !important;
            box-sizing: border-box !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .consultant-payments-report-root .rpt-print-root th *,
          .consultant-payments-report-root .rpt-print-root td * {
            font-size: inherit !important;
            line-height: inherit !important;
            color: #000 !important;
          }
          .consultant-payments-report-root .rpt-print-root thead th {
            font-size: 5pt !important;
            font-weight: 700 !important;
            background: #e8e8e8 !important;
          }
          .consultant-payments-report-root .rpt-print-root th:first-child,
          .consultant-payments-report-root .rpt-print-root td:first-child {
            border-left: 0.7pt solid #000 !important;
          }
          .consultant-payments-report-root .rpt-print-root th:last-child,
          .consultant-payments-report-root .rpt-print-root td:last-child {
            border-right: 0.7pt solid #000 !important;
          }
          .consultant-payments-report-root .rpt-print-root tr.rpt-print-total td {
            font-weight: 700 !important;
            background: #f3f3f3 !important;
          }
          .consultant-payments-report-root .rpt-print-root tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>
      <ReportTemplate<ConsultantPaymentsReportRow, ConsultantPaymentsReportExportRow>
      title="Consultant Payments Report"
      description="View consultant (doctor) payments for channeling bookings with filters for date & time range, institution, branch, department, speciality, doctor, and payment status"
      filterButtonLabel="Search"
      skipFetchWhenNoParams={true}
      printPageSize="A4 portrait"
      printPageMargins="7mm 5mm 18mm"
      containerClassName="container mx-auto py-3 space-y-4 consultant-payments-report-root"
      generationDetails={{
        generatedBy: currentUserName,
        formatFilters: (values) => {
          const fromDateTime = values.fromDateTime ?? '';
          const toDateTime = values.toDateTime ?? '';
          const institutionId = values.institutionId ?? '__all__';
          const locationId = values.locationId ?? '__all__';
          const departmentId = values.departmentId ?? '__all__';
          const specialityId = values.specialityId ?? '__all__';
          const doctorId = values.doctorId ?? '__all__';
          const status = values.status ?? '__all__';
          const sessionType = values.sessionType ?? '__all__';

          const institutionLabel =
            institutionId === '__all__' ? 'All Institutions' : (institutionOptions.find((i) => i.id === institutionId)?.name ?? institutionId);
          const branchLabel =
            locationId === '__all__' ? 'All Branches' : (locationOptions.find((l) => l.id === locationId)?.name ?? locationId);
          const departmentLabel =
            departmentId === '__all__' ? 'All Departments' : (departmentOptions.find((d) => d.id === departmentId)?.name ?? departmentId);
          const specialityLabel =
            specialityId === '__all__' ? 'All Specialities' : (specialityOptions.find((s) => s.id === specialityId)?.name ?? specialityId);
          const doctorLabel =
            doctorId === '__all__' ? 'All Doctors' : (doctorOptions.find((d) => d.id === doctorId)?.name ?? doctorId);
          const statusLabel = status === '__all__' ? 'All Status' : status === '1' ? 'Paid' : 'Due Pay';
          const sessionLabel = sessionType === '__all__' ? 'All Session' : sessionType === 'morning' ? 'Morning' : 'Evening';
          return (
            <>
              <div>Range: {formatReportRangeLabel(fromDateTime, toDateTime)}</div>
              <div>
                Institution: {institutionLabel} | Branch: {branchLabel} | Department: {departmentLabel}
              </div>
              <div>
                Speciality: {specialityLabel} | Doctor: {doctorLabel} | Status: {statusLabel} | Session: {sessionLabel}
              </div>
            </>
          );
        },
        formatPrintSummaryItems: (values) => {
          const fromDateTime = values.fromDateTime ?? '';
          const toDateTime = values.toDateTime ?? '';
          const institutionId = values.institutionId ?? '__all__';
          const locationId = values.locationId ?? '__all__';
          const departmentId = values.departmentId ?? '__all__';
          const specialityId = values.specialityId ?? '__all__';
          const doctorId = values.doctorId ?? '__all__';
          const status = values.status ?? '__all__';
          const sessionType = values.sessionType ?? '__all__';
          return [
            {
              label: 'Period',
              value: formatReportRangeLabel(fromDateTime, toDateTime),
              fullWidth: true,
            },
            {
              label: 'Institution',
              value:
                institutionId === '__all__'
                  ? 'All Institutions'
                  : (institutionOptions.find((i) => i.id === institutionId)?.name ?? institutionId),
            },
            {
              label: 'Branch',
              value:
                locationId === '__all__'
                  ? 'All Branches'
                  : (locationOptions.find((l) => l.id === locationId)?.name ?? locationId),
            },
            {
              label: 'Department',
              value:
                departmentId === '__all__'
                  ? 'All Departments'
                  : (departmentOptions.find((d) => d.id === departmentId)?.name ?? departmentId),
            },
            {
              label: 'Speciality',
              value:
                specialityId === '__all__'
                  ? 'All Specialities'
                  : (specialityOptions.find((s) => s.id === specialityId)?.name ?? specialityId),
            },
            {
              label: 'Doctor',
              value:
                doctorId === '__all__'
                  ? 'All Doctors'
                  : (doctorOptions.find((d) => d.id === doctorId)?.name ?? doctorId),
            },
            {
              label: 'Status',
              value: status === '__all__' ? 'All Status' : status === '1' ? 'Paid' : 'Due Pay',
            },
            {
              label: 'Session',
              value:
                sessionType === '__all__'
                  ? 'All Session'
                  : sessionType === 'morning'
                    ? 'Morning'
                    : 'Evening',
            },
          ];
        },
      }}
      initialFilterValues={{
        fromDateTime: getTodayDateTimeRange().from,
        toDateTime: getTodayDateTimeRange().to,
        status: '__all__',
        sessionType: '__all__'
      }}
      filterContent={({ values, setValue }) => (
        <>
          <div className="flex-shrink-0">
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
          <div className='flex flex-wrap gap-3'>
            <Selector
              label="Institution"
              options={institutionOptions}
              value={values.institutionId ?? '__all__'}
              onChange={(v) => setValue('institutionId', v)}
              className={{
                trigger: 'self-end!'
              }}
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
              label="Speciality"
              options={specialityOptions}
              value={values.specialityId ?? '__all__'}
              defaultValue="__all__"
              onChange={(v) => setValue('specialityId', v)}
            />
            <Combobox
              label="Doctor"
              options={doctorOptions}
              value={values.doctorId ?? '__all__'}
              defaultValue="__all__"
              onChange={(v) => setValue('doctorId', v)}
            />
            <Selector
              label="All Status"
              options={statusOptions}
              value={values.status || '__all__'}
              showDefaultOption={false}
              onChange={(v) => setValue('status', v)}
              className={{
                trigger: 'self-end!'
              }}
            />
            <Selector
              label="All Session"
              options={sessionOptions}
              value={values.sessionType || '__all__'}
              showDefaultOption={false}
              onChange={(v) => setValue('sessionType', v)}
              className={{
                trigger: 'self-end!'
              }}
            />
          </div>
        </>
      )}
      fetchData={async (params) => {
        const query = {
          fromDateTime: params.get('fromDateTime') ?? undefined,
          toDateTime: params.get('toDateTime') ?? undefined,
          institutionId: params.get('institutionId') ?? undefined,
          locationId: params.get('locationId') ?? undefined,
          departmentId: params.get('departmentId') ?? undefined,
          specialityId: params.get('specialityId') ?? undefined,
          doctorId: params.get('doctorId') ?? undefined,
          status: params.get('status') ?? undefined,
          sessionType: params.get('sessionType') ?? undefined
        };
        return getConsultantPaymentsReportData(query);
      }}
      exportData={async () => exportConsultantPaymentsReportData(buildQuery())}
      columns={ConsultantPaymentsReportColumns}
      exportColumns={[
        'S.No',
        'Branch',
        'Consultant',
        'Consultant Code',
        'Payment Receipt',
        'Channel Receipt',
        'Consultation Date/Session Time',
        'Patient Name',
        'Mode of Pay',
        'Consultation Charge',
        'Discount Amount',
        'WHT',
        'Net Amount',
        'Payment Status',
        'Paid By',
        'Paid Date',
        'Handed By'
      ]}
      exportKeys={
        [
          'sNo',
          'branch',
          'consultant',
          'consultantCode',
          'paymentReceipt',
          'channelReceipt',
          'consultationSession',
          'patientName',
          'modeOfPay',
          'consultationCharge',
          'discountAmount',
          'whtAmount',
          'netAmount',
          'paymentStatus',
          'paidBy',
          'paidDate',
          'handedBy'
        ] as (keyof ConsultantPaymentsReportExportRow)[]
      }
      exportTitle="Consultant Payments Report"
      exportFileName="consultant-payments-report"
      tableClassName="text-[11px] [&_th]:px-1.5 [&_td]:px-1.5 [&_th]:border-r [&_th:last-child]:border-r-0 [&_td]:border-r [&_td:last-child]:border-r-0"
      getRowId={(row) => row.id}
      showPrintButton={true}
      totalColumnIds={['consultationCharge', 'discountAmount', 'whtAmount', 'netAmount']}
      formatTotalValue={(columnId, sum) => {
        if (
          columnId === 'consultationCharge' ||
          columnId === 'discountAmount' ||
          columnId === 'whtAmount' ||
          columnId === 'netAmount'
        ) {
          return <span className="tabular-nums font-medium">{formatLKR(sum)}</span>;
        }
        return sum.toLocaleString(undefined, {
          maximumFractionDigits: 2,
          minimumFractionDigits: 0
        });
      }}
      initialEmptyMessage="No consultant payments found. Select filters and click Search."
      emptyMessage="No consultant payments found for the selected filters."
      renderPrintContent={renderConsultantPaymentsPrint}
    />
    </>
  );
}

export default function ConsultantPaymentsReportContent(props: ConsultantPaymentsReportContentProps) {
  return (
    <Suspense fallback={<Loading />}>
      <ConsultantPaymentsReportContentInner {...props} />
    </Suspense>
  );
}
