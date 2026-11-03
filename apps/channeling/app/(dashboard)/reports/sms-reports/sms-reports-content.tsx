'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ReportTemplate } from '@/app/(dashboard)/report-template';
import { DateTimeRangePicker } from '@/components/common/date-time-range-picker';
import { Selector } from '@/components/common/selector';
import { Combobox } from '@/components/common/combobox';
import { Input } from '@/components/ui/input';
import { withAllBranchesOptions } from '@/lib/report-branch-options';
import Loading from '@/app/(dashboard)/loading';
import { getSmsReportData, exportSmsReportData } from '@/app/actions/reports/sms.report.action';
import { SmsReportsColumns } from './columns';
import {
  SmsReportExportRow,
  SmsReportQuery,
  SmsReportRow,
  SmsReportsContentProps,
} from '@/types/reports/sms.report';
import { formatReportRangeLabel } from '@/lib/format-report-range-label';

function getDefaultDateTimeRange(): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return {
    from: `${y}-${m}-${d}T00:00`,
    to: `${y}-${m}-${d}T23:59`,
  };
}

function SmsReportsContentInner({ currentUserName, locationOptions }: SmsReportsContentProps) {
  const searchParams = useSearchParams();
  const defaultRange = React.useMemo(() => getDefaultDateTimeRange(), []);
  const branchOptions = React.useMemo(() => withAllBranchesOptions(locationOptions, 'Branch'), [locationOptions]);
  const statusOptions = [
    { id: 'all', name: 'All Status' },
    { id: 'sent', name: 'Sent' },
    { id: 'failed', name: 'Failed' },
  ];

  const buildQuery = (): SmsReportQuery => ({
    fromDateTime: searchParams.get('fromDateTime') ?? defaultRange.from,
    toDateTime: searchParams.get('toDateTime') ?? defaultRange.to,
    status: (searchParams.get('status') as SmsReportQuery['status']) ?? 'all',
    locationId: searchParams.get('locationId') ?? undefined,
    phoneNo: searchParams.get('phoneNo') ?? undefined,
  });

  return (
    <>
    <style>{`
      @media print {
        .sms-reports-report-root,
        .sms-reports-report-root.container,
        .sms-reports-report-root.rpt-template-root {
          width: 100% !important;
          max-width: none !important;
          margin: 0 !important;
          padding: 0 !important;
          color: #000 !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .sms-reports-report-root .rpt-template-card,
        .sms-reports-report-root .rpt-template-card > div,
        .sms-reports-report-root .rpt-print-root,
        .sms-reports-report-root .rpt-print-header,
        .sms-reports-report-root .rpt-print-summary,
        .sms-reports-report-root .rpt-print-body {
          width: 100% !important;
          max-width: none !important;
          margin-left: 0 !important;
          margin-right: 0 !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
          box-sizing: border-box !important;
        }
        .sms-reports-report-root .rpt-print-root table {
          width: 100% !important;
          max-width: none !important;
          table-layout: fixed !important;
          border-collapse: collapse !important;
        }
        .sms-reports-report-root .rpt-print-root th:first-child,
        .sms-reports-report-root .rpt-print-root td:first-child {
          border-left: 0.35mm solid #000 !important;
        }
        .sms-reports-report-root .rpt-print-root th:last-child,
        .sms-reports-report-root .rpt-print-root td:last-child {
          border-right: 0.35mm solid #000 !important;
          box-shadow: inset -0.35mm 0 0 #000 !important;
        }
        /* Date | Status | Source | Phone | Message | Count */
        .sms-reports-report-root .rpt-print-root th:nth-child(1),
        .sms-reports-report-root .rpt-print-root td:nth-child(1) { width: 16% !important; }
        .sms-reports-report-root .rpt-print-root th:nth-child(2),
        .sms-reports-report-root .rpt-print-root td:nth-child(2) { width: 8% !important; }
        .sms-reports-report-root .rpt-print-root th:nth-child(3),
        .sms-reports-report-root .rpt-print-root td:nth-child(3) { width: 12% !important; }
        .sms-reports-report-root .rpt-print-root th:nth-child(4),
        .sms-reports-report-root .rpt-print-root td:nth-child(4) { width: 14% !important; }
        .sms-reports-report-root .rpt-print-root th:nth-child(5),
        .sms-reports-report-root .rpt-print-root td:nth-child(5) { width: 44% !important; }
        .sms-reports-report-root .rpt-print-root th:nth-child(6),
        .sms-reports-report-root .rpt-print-root td:nth-child(6) { width: 6% !important; }

        .sms-reports-report-root .rpt-print-root td:nth-child(4),
        .sms-reports-report-root .rpt-print-root td:nth-child(4) * {
          white-space: normal !important;
          overflow-wrap: anywhere !important;
          word-break: break-word !important;
        }
        .sms-reports-report-root .rpt-print-root td:nth-child(5),
        .sms-reports-report-root .rpt-print-root td:nth-child(5) * {
          min-width: 0 !important;
          max-width: none !important;
          width: auto !important;
          white-space: pre-wrap !important;
          overflow: visible !important;
          overflow-wrap: break-word !important;
          word-break: break-word !important;
        }
        .sms-reports-report-root .rpt-print-root th:nth-child(6),
        .sms-reports-report-root .rpt-print-root td:nth-child(6),
        .sms-reports-report-root .rpt-print-root td:nth-child(6) * {
          text-align: right !important;
          white-space: nowrap !important;
        }
      }
    `}</style>
    <ReportTemplate<SmsReportRow, SmsReportExportRow>
      title="SMS Reports"
      description="View SMS logs by date & time range, branch, status, and phone number"
      filterButtonLabel="Search"
      printPageMargins="7mm 5mm 18mm"
      pdfPageMarginMm={5}
      excelColumnWidths={[18, 12, 16, 14, 62, 8]}
      excelExtraWrapColumnIndexes={[4]}
      containerClassName="container mx-auto py-3 space-y-4 sms-reports-report-root"
      generationDetails={{
        generatedBy: currentUserName,
        formatFilters: (values) => {
          const locId = values.locationId ?? '__all__';
          const branchDisplay =
            locId === '__all__' || !locId
              ? 'All Branches'
              : branchOptions.find((o) => o.id === locId)?.name ?? locId;
          return (
            <>
              <div>
                Date & time range: {values.fromDateTime ?? defaultRange.from} to {values.toDateTime ?? defaultRange.to}
              </div>
              <div>
                Branch: {branchDisplay} | Status:{' '}
                {values.status === 'sent' ? 'Sent' : values.status === 'failed' ? 'Failed' : 'All Status'}
                {values.phoneNo?.trim() ? ` | Phone: ${values.phoneNo.trim()}` : ''}
              </div>
            </>
          );
        },
        formatPrintSummaryItems: (values) => {
          const locId = values.locationId ?? '__all__';
          const items = [
            {
              label: 'Period',
              value: `${values.fromDateTime ?? defaultRange.from} to ${values.toDateTime ?? defaultRange.to}`,
              fullWidth: true,
            },
            {
              label: 'Branch',
              value:
                locId === '__all__' || !locId
                  ? 'All Branches'
                  : (branchOptions.find((o) => o.id === locId)?.name ?? locId),
            },
            {
              label: 'Status',
              value:
                values.status === 'sent'
                  ? 'Sent'
                  : values.status === 'failed'
                    ? 'Failed'
                    : 'All Status',
            },
          ];
          if (values.phoneNo?.trim()) {
            items.push({ label: 'Phone', value: values.phoneNo.trim() });
          }
          return items;
        },
      }}
      initialFilterValues={{
        fromDateTime: defaultRange.from,
        toDateTime: defaultRange.to,
        status: 'all',
        locationId: '__all__',
        phoneNo: '',
      }}
      filterContent={({ values, setValue }) => (
        <div className="flex min-w-0 flex-1 flex-nowrap items-end gap-3 overflow-x-auto pb-0.5">
          {/* min-width must fit singleRow From+To (labels + 2× datetime-local); a smaller cap caused To to overflow into Branch */}
          <div className="shrink-0 min-w-[min(100%,28rem)]">
            <DateTimeRangePicker
              label="Date & Time Range"
              from={values.fromDateTime}
              to={values.toDateTime}
              singleRow
              onChange={({ from, to }) => {
                setValue('fromDateTime', from);
                setValue('toDateTime', to);
              }}
            />
          </div>
          <div className="w-[200px] shrink-0">
            <Combobox
              label="Branch"
              options={branchOptions}
              value={values.locationId ?? '__all__'}
              defaultValue="__all__"
              clearable
              onChange={(v) => setValue('locationId', v ?? '__all__')}
            />
          </div>
          <Selector
            label="Status"
            options={statusOptions}
            value={values.status ?? 'all'}
            showDefaultOption={false}
            onChange={(v) => setValue('status', v)}
            className={{
              trigger: 'self-end!',
            }}
          />
          <div className="w-44 shrink-0 self-end">
            <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Phone No</label>
            <Input
              id="phoneNo"
              placeholder="Search phone"
              value={values.phoneNo ?? ''}
              onChange={(e) => setValue('phoneNo', e.target.value)}
              className="h-10"
            />
          </div>
        </div>
      )}
      fetchData={async (params) => {
        const query: SmsReportQuery = {
          fromDateTime: params.get('fromDateTime') ?? defaultRange.from,
          toDateTime: params.get('toDateTime') ?? defaultRange.to,
          status: (params.get('status') as SmsReportQuery['status']) ?? 'all',
          locationId: params.get('locationId') ?? undefined,
          phoneNo: params.get('phoneNo') ?? undefined,
        };
        return getSmsReportData(query);
      }}
      exportData={async () => exportSmsReportData(buildQuery())}
      columns={SmsReportsColumns}
      exportColumns={['Date / Time', 'Status', 'Source', 'Phone', 'Message', 'Count']}
      exportKeys={['dateTime', 'status', 'source', 'phone', 'message', 'count'] as (keyof SmsReportExportRow)[]}
      exportTitle="SMS Reports"
      exportFileName="sms-reports"
      excelColumnNumberFormats={[
        undefined, // Date / Time
        undefined, // Status
        undefined, // Source
        undefined, // Phone
        undefined, // Message
        '0', // Count
      ]}
      getRowId={(row) => row.id}
      showPrintButton={true}
      emptyMessage="No SMS records found for the selected filters."
      totalColumnIds={['count']}
      formatTotalValue={(_, sum) => <span className="font-semibold">{sum.toLocaleString()}</span>}
      getTotalNumericValue={(row, columnId) => (columnId === 'count' ? row.count ?? 0 : 0)}
    />
    </>
  );
}

export default function SmsReportsContent(props: SmsReportsContentProps) {
  return (
    <Suspense fallback={<Loading />}>
      <SmsReportsContentInner {...props} />
    </Suspense>
  );
}
