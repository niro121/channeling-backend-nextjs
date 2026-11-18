'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Loading from '@/app/(dashboard)/loading';
import { ReportTemplate } from '@/app/(dashboard)/report-template';
import { DateTimeRangePicker } from '@/components/common/date-time-range-picker';
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
import moment from 'moment';

type Props = {
  currentUserName: string;
  doctorOptions: Array<{ id: string; name: string }>;
  locationOptions: Array<{ id: string; name: string }>;
  specialityOptions: Array<{ id: string; name: string }>;
};

const PDF_HEADERS = [
  'No',
  'Date',
  'Doc No',
  'Consultant',
  'Speciality',
  'TIN / NIC',
  'Address',
  'Remarks',
  'Total',
  'Tax',
  'WHT',
  'Net',
] as const;

function pdfText(value: string | number | null | undefined): string {
  if (value === undefined || value === null) return '-';
  return String(value);
}

function twoLineDate(value: Date | null): React.ReactNode {
  if (!value) return '-';
  const d = moment(value);
  return (
    <>
      {d.format('DD/MM/YYYY')}
      <br />
      {d.format('HH:mm')}
    </>
  );
}

function twoLineConsultant(value: string | null | undefined): React.ReactNode {
  const name = (value ?? '').trim();
  if (!name || name === '-') return '-';
  return name;
}

function twoLineAddress(value: string | null | undefined): React.ReactNode {
  const address = (value ?? '').trim();
  if (!address || address === '-') return '-';
  const comma = address.indexOf(',');
  if (comma > 0 && comma < address.length - 1) {
    return (
      <>
        {address.slice(0, comma + 1).trim()}
        <br />
        {address.slice(comma + 1).trim()}
      </>
    );
  }
  const parts = address.split(/\s+/);
  if (parts.length < 2) return address;
  const mid = Math.ceil(parts.length / 2);
  return (
    <>
      {parts.slice(0, mid).join(' ')}
      <br />
      {parts.slice(mid).join(' ')}
    </>
  );
}

/** Wrap only after "-" or "/" so receipt numbers stay readable. */
function breakableText(value: string | null | undefined): React.ReactNode {
  const text = pdfText(value);
  if (text === '-') return '-';
  const parts = text.split(/([-/])/);
  return parts.map((part, index) =>
    part === '-' || part === '/' ? (
      <React.Fragment key={index}>
        {part}
        <wbr />
      </React.Fragment>
    ) : (
      <React.Fragment key={index}>{part}</React.Fragment>
    )
  );
}

function tinNicCell(tin: string | null | undefined, nic: string | null | undefined): React.ReactNode {
  return (
    <>
      <span className="wht-id-label">TIN</span> {pdfText(tin)}
      <br />
      <span className="wht-id-label">NIC</span> {pdfText(nic)}
    </>
  );
}

/** Print body: same columns and cell values as the branded PDF, including Total. */
function renderWithholdingTaxPrint(rows: WithholdingTaxReportRow[]) {
  const totalAmt = rows.reduce((sum, row) => sum + (Number(row.totalAmt) || 0), 0);
  const holdingTax = rows.reduce((sum, row) => sum + (Number(row.holdingTax) || 0), 0);
  const netAmt = rows.reduce((sum, row) => sum + (Number(row.netAmt) || 0), 0);

  return (
    <table className="wht-pdf-table">
      <colgroup>
        <col className="wht-col-no" />
        <col className="wht-col-date" />
        <col className="wht-col-doc" />
        <col className="wht-col-name" />
        <col className="wht-col-spec" />
        <col className="wht-col-id" />
        <col className="wht-col-address" />
        <col className="wht-col-remarks" />
        <col className="wht-col-amt" />
        <col className="wht-col-tax" />
        <col className="wht-col-amt" />
        <col className="wht-col-amt" />
      </colgroup>
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
            <td className="wht-nowrap">{pdfText(row.sNo)}</td>
            <td className="wht-two-line">{twoLineDate(row.docDate)}</td>
            <td className="wht-doc">{breakableText(row.docNo)}</td>
            <td className="wht-wrap">{twoLineConsultant(row.consultant)}</td>
            <td className="wht-wrap">{pdfText(row.speciality)}</td>
            <td className="wht-id">{tinNicCell(row.tinNumber, row.nic)}</td>
            <td className="wht-address">{twoLineAddress(row.address)}</td>
            <td className="wht-remarks">{breakableText(row.remarks)}</td>
            <td className="wht-amt">{formatLKR(row.totalAmt ?? 0)}</td>
            <td className="wht-amt">{Number(row.taxPercent ?? 0).toFixed(2)}</td>
            <td className="wht-amt">{formatLKR(row.holdingTax ?? 0)}</td>
            <td className="wht-amt">{formatLKR(row.netAmt ?? 0)}</td>
          </tr>
        ))}
        <tr className="rpt-print-total">
          <td className="wht-nowrap">Total</td>
          <td />
          <td />
          <td />
          <td />
          <td />
          <td />
          <td />
          <td className="wht-amt">{formatLKR(totalAmt)}</td>
          <td />
          <td className="wht-amt">{formatLKR(holdingTax)}</td>
          <td className="wht-amt">{formatLKR(netAmt)}</td>
        </tr>
      </tbody>
    </table>
  );
}

/** Default from = today 00:00, to = today 23:59 in YYYY-MM-DDTHH:mm (same as Userwise Cashier report). */
function getDefaultDateTimeRange(): { fromDateTime: string; toDateTime: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return { fromDateTime: `${y}-${m}-${d}T00:00`, toDateTime: `${y}-${m}-${d}T23:59` };
}

function ContentInner({
  currentUserName,
  doctorOptions,
  locationOptions,
  specialityOptions
}: Props) {
  const searchParams = useSearchParams();
  const defaultRange = getDefaultDateTimeRange();

  const buildQuery = (): WithholdingTaxReportQuery => ({
    fromDateTime: searchParams.get('fromDateTime') ?? defaultRange.fromDateTime,
    toDateTime: searchParams.get('toDateTime') ?? defaultRange.toDateTime,
    doctorId: searchParams.get('doctorId') ?? '__all__',
    locationId: searchParams.get('locationId') ?? '__all__',
    specialityId: searchParams.get('specialityId') ?? '__all__',
    reportType: (searchParams.get('reportType') as 'detail' | 'summary') ?? 'detail'
  });

  return (
    <>
      <style>{`
        @media print {
          .withholding-tax-report-root,
          .withholding-tax-report-root.container {
            width: 100% !important;
            max-width: none !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
          }
          .withholding-tax-report-root .rpt-print-root,
          .withholding-tax-report-root .rpt-print-body {
            width: 100% !important;
            max-width: none !important;
            box-sizing: border-box !important;
          }
          .withholding-tax-report-root .rpt-print-body .overflow-x-auto,
          .withholding-tax-report-root .rpt-print-body .overflow-auto,
          .withholding-tax-report-root .rpt-print-body .overflow-hidden,
          .withholding-tax-report-root .rpt-print-body .rounded-lg,
          .withholding-tax-report-root .rpt-print-body .rounded-md {
            overflow: visible !important;
            width: 100% !important;
            max-width: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }
          .withholding-tax-report-root .rpt-print-root table.wht-pdf-table {
            table-layout: fixed !important;
            width: 100% !important;
            max-width: 100% !important;
            border-collapse: collapse !important;
            border: 0.5pt solid #000 !important;
          }
          .withholding-tax-report-root .rpt-print-root table.wht-pdf-table thead {
            display: table-header-group !important;
          }
          .withholding-tax-report-root .rpt-print-root table.wht-pdf-table col.wht-col-no { width: 5% !important; }
          .withholding-tax-report-root .rpt-print-root table.wht-pdf-table col.wht-col-date { width: 8% !important; }
          .withholding-tax-report-root .rpt-print-root table.wht-pdf-table col.wht-col-doc { width: 12% !important; }
          .withholding-tax-report-root .rpt-print-root table.wht-pdf-table col.wht-col-name { width: 11% !important; }
          .withholding-tax-report-root .rpt-print-root table.wht-pdf-table col.wht-col-spec { width: 10% !important; }
          .withholding-tax-report-root .rpt-print-root table.wht-pdf-table col.wht-col-id { width: 11% !important; }
          .withholding-tax-report-root .rpt-print-root table.wht-pdf-table col.wht-col-address { width: 7% !important; }
          .withholding-tax-report-root .rpt-print-root table.wht-pdf-table col.wht-col-remarks { width: 8% !important; }
          .withholding-tax-report-root .rpt-print-root table.wht-pdf-table col.wht-col-amt { width: 8% !important; }
          .withholding-tax-report-root .rpt-print-root table.wht-pdf-table col.wht-col-tax { width: 4% !important; }
          .withholding-tax-report-root .rpt-print-root table.wht-pdf-table th,
          .withholding-tax-report-root .rpt-print-root table.wht-pdf-table td {
            font-size: 8pt !important;
            font-weight: 400 !important;
            padding: 1.2mm 1mm !important;
            line-height: 1.25 !important;
            text-align: left !important;
            white-space: normal !important;
            word-break: normal !important;
            overflow-wrap: normal !important;
            hyphens: manual !important;
            overflow: visible !important;
            border: 0.5pt solid #000 !important;
            color: #000 !important;
            background: #fff !important;
            vertical-align: top !important;
            box-sizing: border-box !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .withholding-tax-report-root .rpt-print-root table.wht-pdf-table thead th {
            font-size: 7.5pt !important;
            font-weight: 700 !important;
            background: #e8e8e8 !important;
            vertical-align: middle !important;
          }
          .withholding-tax-report-root .rpt-print-root table.wht-pdf-table th {
            white-space: nowrap !important;
            overflow-wrap: normal !important;
            word-break: normal !important;
          }
          .withholding-tax-report-root .rpt-print-root table.wht-pdf-table td.wht-nowrap {
            white-space: nowrap !important;
          }
          .withholding-tax-report-root .rpt-print-root table.wht-pdf-table td.wht-amt {
            text-align: right !important;
            white-space: nowrap !important;
            font-variant-numeric: tabular-nums !important;
            font-size: 7.5pt !important;
          }
          .withholding-tax-report-root .rpt-print-root table.wht-pdf-table td.wht-id .wht-id-label {
            font-weight: 700 !important;
          }
          .withholding-tax-report-root .rpt-print-root table.wht-pdf-table th:first-child,
          .withholding-tax-report-root .rpt-print-root table.wht-pdf-table td:first-child {
            border-left: 0.7pt solid #000 !important;
            text-align: center !important;
          }
          .withholding-tax-report-root .rpt-print-root table.wht-pdf-table th:last-child,
          .withholding-tax-report-root .rpt-print-root table.wht-pdf-table td:last-child {
            border-right: 0.7pt solid #000 !important;
          }
          .withholding-tax-report-root .rpt-print-root table.wht-pdf-table tr.rpt-print-total td {
            font-weight: 700 !important;
            background: #f3f3f3 !important;
          }
          .withholding-tax-report-root .rpt-print-root table.wht-pdf-table tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>
      <ReportTemplate<WithholdingTaxReportRow, WithholdingTaxReportExportRow>
      title="Withholding Tax Report"
      description="Shows doctor payments with WHT deductions."
      filterButtonLabel="Search"
      skipFetchWhenNoParams={true}
      printPageSize="A4 portrait"
      printPageMargins="6mm 4mm 16mm"
      exportOrientation="portrait"
      containerClassName="container mx-auto py-3 space-y-4 withholding-tax-report-root"
      generationDetails={{
        generatedBy: currentUserName,
        formatFilters: (values) => {
          const fromDateTime = values.fromDateTime ?? '';
          const toDateTime = values.toDateTime ?? '';
          const doctorId = values.doctorId ?? '__all__';
          const locationId = values.locationId ?? '__all__';
          const specialityId = values.specialityId ?? '__all__';
          const reportType = (values.reportType ?? 'detail') as 'detail' | 'summary';
          const doctorLabel = doctorId === '__all__' ? 'All Doctors' : (doctorOptions.find((d) => d.id === doctorId)?.name ?? doctorId);
          const branchLabel =
            locationId === '__all__' ? 'All Branches' : (locationOptions.find((l) => l.id === locationId)?.name ?? locationId);
          const specialityLabel =
            specialityId === '__all__'
              ? 'All Specialities'
              : (specialityOptions.find((s) => s.id === specialityId)?.name ?? specialityId);
          const typeLabel = reportType === 'summary' ? 'Summary' : 'Detail';
          return (
            <>
              <div>Range: {formatReportRangeLabel(fromDateTime, toDateTime)}</div>
              <div>
                Consultant: {doctorLabel} | Branch: {branchLabel} | Speciality: {specialityLabel} | Report Type: {typeLabel}
              </div>
            </>
          );
        },
        formatPrintSummaryItems: (values) => {
          const fromDateTime = values.fromDateTime ?? '';
          const toDateTime = values.toDateTime ?? '';
          const doctorId = values.doctorId ?? '__all__';
          const locationId = values.locationId ?? '__all__';
          const specialityId = values.specialityId ?? '__all__';
          const reportType = (values.reportType ?? 'detail') as 'detail' | 'summary';
          return [
            {
              label: 'Period',
              value:
                fromDateTime && toDateTime
                  ? formatReportRangeLabel(fromDateTime, toDateTime)
                  : `${fromDateTime || '—'} to ${toDateTime || '—'}`,
              fullWidth: true,
            },
            {
              label: 'Doctor',
              value:
                doctorId === '__all__'
                  ? 'All Doctors'
                  : (doctorOptions.find((d) => d.id === doctorId)?.name ?? doctorId),
            },
            {
              label: 'Branch',
              value:
                locationId === '__all__'
                  ? 'All Branches'
                  : (locationOptions.find((l) => l.id === locationId)?.name ?? locationId),
            },
            {
              label: 'Speciality',
              value:
                specialityId === '__all__'
                  ? 'All Specialities'
                  : (specialityOptions.find((s) => s.id === specialityId)?.name ?? specialityId),
            },
            {
              label: 'Type',
              value: reportType === 'summary' ? 'Summary' : 'Detail',
            },
          ];
        },
      }}
      initialFilterValues={{
        ...getDefaultDateTimeRange(),
        doctorId: '__all__',
        locationId: '__all__',
        specialityId: '__all__',
        reportType: 'detail'
      }}
      filterContent={({ values, setValue }) => (
        <div className="flex flex-wrap items-end gap-3">
          <DateTimeRangePicker
            label="Date & Time Range"
            from={values.fromDateTime}
            to={values.toDateTime}
            onChange={({ from, to }) => {
              setValue('fromDateTime', from);
              setValue('toDateTime', to);
            }}
          />
          <Combobox
            label="Consultant"
            options={doctorOptions}
            value={values.doctorId ?? '__all__'}
            defaultValue="__all__"
            onChange={(v) => setValue('doctorId', v ?? '__all__')}
          />
          <Combobox
            label="Speciality"
            options={specialityOptions}
            value={values.specialityId ?? '__all__'}
            defaultValue="__all__"
            onChange={(v) => setValue('specialityId', v ?? '__all__')}
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
          fromDateTime: params.get('fromDateTime') ?? defaultRange.fromDateTime,
          toDateTime: params.get('toDateTime') ?? defaultRange.toDateTime,
          doctorId: params.get('doctorId') ?? '__all__',
          locationId: params.get('locationId') ?? '__all__',
          specialityId: params.get('specialityId') ?? '__all__',
          reportType: (params.get('reportType') as 'detail' | 'summary') ?? 'detail'
        })
      }
      exportData={async () => exportWithholdingTaxReportData(buildQuery())}
      columns={WithholdingTaxReportColumns}
      exportColumns={['S.No', 'Doc Date', 'Doc No', 'Consultant', 'Speciality', 'TIN Number', 'NIC', 'Address', 'Remarks', 'Total Amt', 'Tax %', 'Holding Tax', 'Net Amt']}
      exportKeys={['sNo', 'docDate', 'docNo', 'consultant', 'speciality', 'tinNumber', 'nic', 'address', 'remarks', 'totalAmt', 'taxPercent', 'holdingTax', 'netAmt']}
      exportTitle="Withholding Tax Report"
      exportFileName="withholding-tax-report"
      excelColumnNumberFormats={[
        '0', // S.No
        undefined, // Doc Date
        undefined, // Doc No
        undefined, // Consultant
        undefined, // Speciality
        undefined, // TIN Number
        undefined, // NIC
        undefined, // Address
        undefined, // Remarks
        '"LKR "#,##0.00', // Total Amt
        '0.00', // Tax %
        '"LKR "#,##0.00', // Holding Tax
        '"LKR "#,##0.00', // Net Amt
      ]}
      excelColumnWidths={[6, 18, 22, 22, 16, 16, 16, 28, 28, 16, 8, 16, 16]}
      excelExtraWrapColumnIndexes={[2, 3, 4, 5, 6, 7, 8]}
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
      renderPrintContent={renderWithholdingTaxPrint}
    />
    </>
  );
}

export default function WithholdingTaxReportContent(props: Props) {
  return (
    <Suspense fallback={<Loading />}>
      <ContentInner {...props} />
    </Suspense>
  );
}
