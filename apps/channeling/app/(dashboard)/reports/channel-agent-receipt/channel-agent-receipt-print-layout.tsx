'use client';

import moment from 'moment';
import { formatLKR } from '@/lib/format-money';
import type { ChannelAgentReceiptReportRow } from '@/types/reports/channel-agent-receipt';

type Props = {
  rows: ChannelAgentReceiptReportRow[];
};

/**
 * Print-only A4 portrait table for Channel Agent Receipt — matches branded PDF body.
 * Overrides ReportPrintLayout table CSS so cells don't mid-word wrap like the PDF.
 */
export function ChannelAgentReceiptPrintLayout({ rows }: Props) {
  return (
    <div className="car-print-root">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 10mm 14mm;
          }
          .channel-agent-receipt-report-root .rpt-print-header {
            margin-bottom: 2mm !important;
          }
          .channel-agent-receipt-report-root .rpt-print-brand-row {
            height: 14mm !important;
            gap: 6mm !important;
          }
          .channel-agent-receipt-report-root .rpt-print-logo {
            height: 14mm !important;
            max-width: 48mm !important;
          }
          .channel-agent-receipt-report-root .rpt-print-titles {
            height: 14mm !important;
            padding: 2.5mm 0 0.5mm !important;
          }
          .channel-agent-receipt-report-root .rpt-print-org {
            height: 4.5mm !important;
            font-size: 14pt !important;
          }
          .channel-agent-receipt-report-root .rpt-print-title-gap {
            height: 0.7mm !important;
          }
          .channel-agent-receipt-report-root .rpt-print-report-name {
            height: 4.2mm !important;
            font-size: 10pt !important;
          }
          .channel-agent-receipt-report-root .rpt-print-rule {
            margin-top: 1.5mm !important;
          }
          .channel-agent-receipt-report-root .rpt-print-summary {
            margin-top: 2mm !important;
          }
          .channel-agent-receipt-report-root .rpt-print-summary-bar {
            padding: 1mm 2mm !important;
            font-size: 7.5pt !important;
          }
          .channel-agent-receipt-report-root .rpt-print-summary-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 1.5mm 4mm !important;
            padding: 2mm !important;
          }
          .channel-agent-receipt-report-root .rpt-print-label {
            margin: 0 0 0.4mm !important;
            font-size: 6.5pt !important;
          }
          .channel-agent-receipt-report-root .rpt-print-value {
            font-size: 9pt !important;
            line-height: 1.2 !important;
          }
          .channel-agent-receipt-report-root .rpt-print-body {
            margin-top: 2.5mm !important;
          }

          .car-print-root {
            color: #000 !important;
            font-family: Helvetica, Arial, sans-serif !important;
            font-size: 5.5pt !important;
            line-height: 1.15 !important;
          }
          .channel-agent-receipt-report-root .car-print-table {
            width: 100% !important;
            border-collapse: collapse !important;
            table-layout: fixed !important;
          }
          .channel-agent-receipt-report-root .car-print-table thead {
            display: table-header-group !important;
          }
          .channel-agent-receipt-report-root .car-print-table th {
            background: #e8e8e8 !important;
            border: 0.2mm solid #000 !important;
            font-weight: 700 !important;
            font-size: 5pt !important;
            line-height: 1.15 !important;
            padding: 0.7mm 0.6mm !important;
            text-align: left !important;
            vertical-align: middle !important;
            white-space: normal !important;
            word-break: normal !important;
            overflow-wrap: normal !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .channel-agent-receipt-report-root .car-print-table td {
            border: 0.2mm solid #000 !important;
            padding: 0.7mm 0.6mm !important;
            font-size: 5.5pt !important;
            line-height: 1.15 !important;
            font-weight: 400 !important;
            text-align: left !important;
            vertical-align: middle !important;
            /* Match jsPDF linebreak: wrap on spaces/hyphens, never mid-letter. */
            white-space: normal !important;
            word-break: normal !important;
            overflow-wrap: break-word !important;
            overflow: visible !important;
            background: #fff !important;
          }
          .channel-agent-receipt-report-root .car-print-table th *,
          .channel-agent-receipt-report-root .car-print-table td * {
            font-size: inherit !important;
            line-height: inherit !important;
            color: #000 !important;
          }
          .channel-agent-receipt-report-root .car-print-table tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .channel-agent-receipt-report-root .car-print-nums {
            font-variant-numeric: tabular-nums !important;
            text-align: right !important;
          }
          .channel-agent-receipt-report-root .car-print-col-ref,
          .channel-agent-receipt-report-root .car-print-col-receipt,
          .channel-agent-receipt-report-root .car-print-col-status,
          .channel-agent-receipt-report-root .car-print-col-date,
          .channel-agent-receipt-report-root .car-print-col-bill {
            white-space: nowrap !important;
            overflow-wrap: normal !important;
          }
          /* Widths tuned so PDF-like single-line cells fit on A4 portrait. */
          .channel-agent-receipt-report-root .car-print-col-ref { width: 7% !important; }
          .channel-agent-receipt-report-root .car-print-col-receipt { width: 17% !important; }
          .channel-agent-receipt-report-root .car-print-col-agency { width: 12% !important; }
          .channel-agent-receipt-report-root .car-print-col-patient { width: 13% !important; }
          .channel-agent-receipt-report-root .car-print-col-status { width: 6% !important; }
          .channel-agent-receipt-report-root .car-print-col-creator { width: 18% !important; }
          .channel-agent-receipt-report-root .car-print-col-date { width: 16% !important; }
          .channel-agent-receipt-report-root .car-print-col-bill { width: 11% !important; }
        }
      `}</style>

      <table className="car-print-table">
        <thead>
          <tr>
            <th className="car-print-col-ref">Agent Reference</th>
            <th className="car-print-col-receipt">Receipt No</th>
            <th className="car-print-col-agency">Agency</th>
            <th className="car-print-col-patient">Patient</th>
            <th className="car-print-col-status">Status</th>
            <th className="car-print-col-creator">Creator</th>
            <th className="car-print-col-date">Created Date</th>
            <th className="car-print-col-bill">Bill Value</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="car-print-col-ref">{row.agentRef || '-'}</td>
              <td className="car-print-col-receipt">{row.refNo || '-'}</td>
              <td className="car-print-col-agency">{row.agency || '-'}</td>
              <td className="car-print-col-patient">{row.patient || '-'}</td>
              <td className="car-print-col-status">{row.status || '-'}</td>
              <td className="car-print-col-creator">{row.creator || '-'}</td>
              <td className="car-print-col-date">
                {row.createdDate
                  ? moment(row.createdDate).format('YYYY-MM-DD hh:mm A')
                  : '-'}
              </td>
              <td className="car-print-col-bill car-print-nums">
                {formatLKR(Number(row.billValue ?? 0))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
