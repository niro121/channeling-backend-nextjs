'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Loading from '@/app/(dashboard)/loading';
import { ReportTemplate } from '@/app/(dashboard)/report-template';
import { DateRangePicker } from '@/components/common/date-range-picker';
import { Combobox } from '@/components/common/combobox';
import { withAllBranchesOptions } from '@/lib/report-branch-options';
import {
  exportWithholdingTaxReportData,
  getWithholdingTaxReportData
} from '@/app/actions/reports/withholding-tax.report.action';
import { WithholdingTaxReportColumns } from './columns';
import type { WithholdingTaxReportExportRow, WithholdingTaxReportQuery, WithholdingTaxReportRow } from '@/types/report';
import { formatLKR } from '@/lib/format-money';
import { TableCell, TableRow } from '@/components/ui/table';
import { formatReportRangeLabel } from '@/lib/format-report-range-label';

type Props = {
  currentUserName: string;
  doctorOptions: Array<{ id: string; name: string }>;
  locationOptions: Array<{ id: string; name: string }>;
};

function getDefaultDateRange(): { fromDate: string; toDate: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return { fromDate: `${y}-${m}-01`, toDate: `${y}-${m}-${d}` };
}

function ContentInner({ currentUserName, doctorOptions, locationOptions }: Props) {
  const searchParams = useSearchParams();

  const buildQuery = (): WithholdingTaxReportQuery => ({
    fromDate: searchParams.get('fromDate') ?? '',
    toDate: searchParams.get('toDate') ?? '',
    doctorId: searchParams.get('doctorId') ?? '__all__',
    locationId: searchParams.get('locationId') ?? '__all__',
    reportType: (searchParams.get('reportType') as 'detail' | 'summary') ?? 'detail'
  });

  return (
    <ReportTemplate<WithholdingTaxReportRow, WithholdingTaxReportExportRow>
      title="Withholding Tax Report"
      description="Shows doctor payments with WHT deductions."
      filterButtonLabel="Search"
      skipFetchWhenNoParams={true}
      generationDetails={{
        generatedBy: currentUserName,
        formatFilters: (values) => {
          const fromDate = values.fromDate ?? '';
          const toDate = values.toDate ?? '';
          const doctorId = values.doctorId ?? '__all__';
          const locationId = values.locationId ?? '__all__';
          const reportType = (values.reportType ?? 'detail') as 'detail' | 'summary';
          const doctorLabel = doctorId === '__all__' ? 'All Doctors' : (doctorOptions.find((d) => d.id === doctorId)?.name ?? doctorId);
          const branchLabel = locationId === '__all__' ? 'All Branches' : (locationOptions.find((l) => l.id === locationId)?.name ?? locationId);
          const typeLabel = reportType === 'summary' ? 'Summary' : 'Detail';
          return (
            <>
              <div>Range: {formatReportRangeLabel(fromDate, toDate)}</div>
              <div>Consultant: {doctorLabel} | Branch: {branchLabel} | Report Type: {typeLabel}</div>
            </>
          );
        }
      }}
      initialFilterValues={{
        ...getDefaultDateRange(),
        doctorId: '__all__',
        locationId: '__all__',
        reportType: 'detail'
      }}
      filterContent={({ values, setValue }) => (
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-shrink-0">
            <label className="text-sm font-semibold mb-2 block">Date Range</label>
            <DateRangePicker
              from={values.fromDate}
              to={values.toDate}
              onChange={({ from, to }) => {
                setValue('fromDate', from);
                setValue('toDate', to);
              }}
            />
          </div>
          <Combobox
            label="Consultant"
            options={doctorOptions}
            value={values.doctorId ?? '__all__'}
            defaultValue="__all__"
            onChange={(v) => setValue('doctorId', v ?? '__all__')}
          />
          <Combobox
            label="Branch"
            options={withAllBranchesOptions(locationOptions)}
            value={values.locationId ?? '__all__'}
            defaultValue="__all__"
            clearable
            onChange={(v) => setValue('locationId', v ?? '__all__')}
          />
          <Combobox
            label="Report Type"
            options={[
              { id: 'detail', name: 'Detail' },
              { id: 'summary', name: 'Summary' }
            ]}
            value={values.reportType ?? 'detail'}
            defaultValue="detail"
            clearable={false}
            onChange={(v) => setValue('reportType', v ?? 'detail')}
          />
        </div>
      )}
      fetchData={async (params) =>
        getWithholdingTaxReportData({
          fromDate: params.get('fromDate') ?? '',
          toDate: params.get('toDate') ?? '',
          doctorId: params.get('doctorId') ?? '__all__',
          locationId: params.get('locationId') ?? '__all__',
          reportType: (params.get('reportType') as 'detail' | 'summary') ?? 'detail'
        })
      }
      exportData={async () => exportWithholdingTaxReportData(buildQuery())}
      columns={WithholdingTaxReportColumns}
      exportColumns={['S.No', 'Doc Date', 'Doc No', 'Consultant', 'Speciality', 'Remarks', 'Total Amt', 'Tax %', 'Holding Tax', 'Net Amt']}
      exportKeys={['sNo', 'docDate', 'docNo', 'consultant', 'speciality', 'remarks', 'totalAmt', 'taxPercent', 'holdingTax', 'netAmt']}
      exportTitle="Withholding Tax Report"
      exportFileName="withholding-tax-report"
      tableClassName="text-[11px] [&_th]:px-1.5 [&_td]:px-1.5 [&_th]:border-r [&_th:last-child]:border-r-0 [&_td]:border-r [&_td:last-child]:border-r-0"
      getRowId={(row) => row.id}
      showPrintButton={true}
      footerRow={(rows) => {
        const totalAmt = rows.reduce((sum, row) => sum + (row.totalAmt ?? 0), 0);
        const totalHoldingTax = rows.reduce((sum, row) => sum + (row.holdingTax ?? 0), 0);
        const totalNetAmt = rows.reduce((sum, row) => sum + (row.netAmt ?? 0), 0);
        return (
          <TableRow className="bg-muted/50 font-bold hover:bg-muted/50">
            <TableCell className="font-bold">Total</TableCell>
            <TableCell />
            <TableCell />
            <TableCell />
            <TableCell />
            <TableCell />
            <TableCell className="text-right tabular-nums font-bold">{formatLKR(totalAmt)}</TableCell>
            <TableCell />
            <TableCell className="text-right tabular-nums font-bold">{formatLKR(totalHoldingTax)}</TableCell>
            <TableCell className="text-right tabular-nums font-bold">{formatLKR(totalNetAmt)}</TableCell>
          </TableRow>
        );
      }}
      initialEmptyMessage="No withholding tax records found. Select filters and click Search."
      emptyMessage="No withholding tax records found for the selected filters."
    />
  );
}

export default function WithholdingTaxReportContent(props: Props) {
  return (
    <Suspense fallback={<Loading />}>
      <ContentInner {...props} />
    </Suspense>
  );
}
