'use client';

import type { AllCashierShiftHandover } from '@/types/report';
import { formatAcsShiftDateTime } from './all-cashier-summary-detail-export-config';

/**
 * Shift handover marks used on screen and print (same component).
 */
export function ShiftHandoverMarks({
  shifts,
}: {
  shifts: AllCashierShiftHandover[] | undefined;
}) {
  if (!shifts?.length) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <div className="space-y-1 text-left leading-tight">
      {shifts.map((shift) => (
        <div key={shift.shiftId}>
          <div className="font-medium tabular-nums">
            #{shift.shiftNo} · {formatAcsShiftDateTime(shift.startedAt)}
          </div>
          <div
            className={
              shift.handedOver
                ? 'font-medium text-green-700 acs-handed'
                : 'font-medium text-red-600 acs-open'
            }
          >
            {shift.handedOver
              ? `Handed over ${formatAcsShiftDateTime(shift.handedOverAt)}${shift.handoverNo ? ` · ${shift.handoverNo}` : ''}`
              : 'Not handed over'}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Print styles for All Cashier Summary / Detail.
 * A4 landscape — same horizontal payment-column layout as the screen view.
 */
export function AllCashierSummaryDetailPrintLayout({
  generatedAt,
}: {
  generatedAt?: string;
}) {
  const footerGenerated = (generatedAt || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return (
    <div className="acs-print-root">
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            /* Extra bottom margin so physical printers do not clip footer */
            margin: 8mm 10mm 18mm 10mm;
            @top-left { content: ""; }
            @top-center { content: ""; }
            @top-right { content: ""; }
            @bottom-left {
              content: "Generated: ${footerGenerated}";
              font-family: Arial, Helvetica, sans-serif;
              font-size: 10pt;
              font-weight: 700;
              color: #000;
              vertical-align: top;
              padding-top: 2mm;
            }
            @bottom-right {
              content: "Page " counter(page) " of " counter(pages);
              font-family: Arial, Helvetica, sans-serif;
              font-size: 10pt;
              font-weight: 700;
              color: #000;
              vertical-align: top;
              padding-top: 2mm;
            }
          }

          html, body {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            color: #000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .all-cashier-summary-detail-report-root {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            padding-bottom: 4mm !important;
            box-sizing: border-box !important;
            color: #000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .all-cashier-summary-detail-report-root > .bg-muted\\/20,
          .all-cashier-summary-detail-report-root [class*="Card"],
          .all-cashier-summary-detail-report-root .bg-muted\\/20 {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: #fff !important;
          }

          .all-cashier-summary-detail-report-root .rpt-print-root {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-sizing: border-box !important;
          }

          .all-cashier-summary-detail-report-root .rpt-print-header {
            margin-bottom: 2mm !important;
            height: auto !important;
            overflow: visible !important;
            position: static !important;
            width: 100% !important;
          }
          .all-cashier-summary-detail-report-root .rpt-print-brand-row {
            height: 12mm !important;
            gap: 5mm !important;
          }
          .all-cashier-summary-detail-report-root .rpt-print-logo {
            height: 12mm !important;
            max-width: 44mm !important;
          }
          .all-cashier-summary-detail-report-root .rpt-print-titles {
            height: 12mm !important;
            padding: 2mm 0 0.4mm !important;
          }
          .all-cashier-summary-detail-report-root .rpt-print-org {
            height: 4mm !important;
            font-size: 13pt !important;
          }
          .all-cashier-summary-detail-report-root .rpt-print-title-gap {
            height: 0.6mm !important;
          }
          .all-cashier-summary-detail-report-root .rpt-print-report-name {
            height: 3.8mm !important;
            font-size: 9.5pt !important;
          }
          .all-cashier-summary-detail-report-root .rpt-print-rule {
            margin-top: 1.2mm !important;
          }
          .all-cashier-summary-detail-report-root .rpt-print-summary {
            margin-top: 2mm !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            box-sizing: border-box !important;
            border: 0.5pt solid #000 !important;
            border-radius: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .all-cashier-summary-detail-report-root .rpt-print-summary-bar {
            padding: 0.9mm 2mm !important;
            font-size: 7pt !important;
            font-weight: 700 !important;
            color: #000 !important;
            background: #e8e8e8 !important;
            border-bottom: 0.4pt solid #000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .all-cashier-summary-detail-report-root .rpt-print-summary-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 1mm 3mm !important;
            padding: 1.5mm 2mm !important;
            height: auto !important;
            overflow: visible !important;
          }
          .all-cashier-summary-detail-report-root .rpt-print-label {
            margin: 0 0 0.3mm !important;
            font-size: 6.5pt !important;
            color: #000 !important;
            font-weight: 700 !important;
          }
          .all-cashier-summary-detail-report-root .rpt-print-value {
            height: auto !important;
            overflow: visible !important;
            font-size: 8.5pt !important;
            line-height: 1.25 !important;
            white-space: pre-line !important;
            color: #000 !important;
            font-weight: 700 !important;
          }
          .all-cashier-summary-detail-report-root .rpt-print-body {
            margin-top: 2.5mm !important;
            width: 100% !important;
            max-width: 100% !important;
            position: static !important;
            clear: both !important;
            box-sizing: border-box !important;
          }

          /* Print the screen tables (same layout as view) */
          .all-cashier-summary-detail-report-root .acs-screen-table {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          .all-cashier-summary-detail-report-root .acs-print-only {
            display: none !important;
          }

          .all-cashier-summary-detail-report-root .acs-screen-table .overflow-x-auto,
          .all-cashier-summary-detail-report-root .acs-screen-table .overflow-auto,
          .all-cashier-summary-detail-report-root .acs-screen-table .rounded-md {
            overflow: visible !important;
            width: 100% !important;
            max-width: 100% !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            box-sizing: border-box !important;
          }

          .all-cashier-summary-detail-report-root .acs-screen-table table {
            width: 100% !important;
            max-width: 100% !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
            border-collapse: collapse !important;
            table-layout: fixed !important;
            box-sizing: border-box !important;
            border: 0.5pt solid #000 !important;
          }
          .all-cashier-summary-detail-report-root .acs-screen-table th,
          .all-cashier-summary-detail-report-root .acs-screen-table td {
            font-size: 6.5pt !important;
            padding: 0.8mm 0.9mm !important;
            line-height: 1.15 !important;
            border: 0.5pt solid #000 !important;
            color: #000 !important;
            vertical-align: top !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            word-break: break-word !important;
            overflow-wrap: break-word !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .all-cashier-summary-detail-report-root .acs-screen-table thead th,
          .all-cashier-summary-detail-report-root .acs-screen-table th {
            font-size: 6.5pt !important;
            font-weight: 700 !important;
            color: #000 !important;
            background: #e8e8e8 !important;
            vertical-align: middle !important;
          }
          .all-cashier-summary-detail-report-root .acs-screen-table th:first-child,
          .all-cashier-summary-detail-report-root .acs-screen-table td:first-child {
            border-left: 0.7pt solid #000 !important;
            box-shadow: inset 0.7pt 0 0 #000 !important;
          }
          .all-cashier-summary-detail-report-root .acs-screen-table th:last-child,
          .all-cashier-summary-detail-report-root .acs-screen-table td:last-child {
            border-right: 0.7pt solid #000 !important;
          }

          /* Amount columns: min width for ≥6 digits */
          .all-cashier-summary-detail-report-root .acs-amt {
            width: 18mm !important;
            min-width: 18mm !important;
            white-space: nowrap !important;
            text-align: right !important;
            font-size: 6.5pt !important;
            font-variant-numeric: tabular-nums !important;
            overflow: hidden !important;
            word-break: normal !important;
            overflow-wrap: normal !important;
          }

          .all-cashier-summary-detail-report-root .acs-screen-table .acs-handed,
          .all-cashier-summary-detail-report-root .acs-screen-table .acs-handed * {
            color: #15803d !important;
            font-weight: 700 !important;
          }
          .all-cashier-summary-detail-report-root .acs-screen-table .acs-open,
          .all-cashier-summary-detail-report-root .acs-screen-table .acs-open * {
            color: #dc2626 !important;
            font-weight: 700 !important;
          }

          .all-cashier-summary-detail-report-root .acs-screen-table tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .all-cashier-summary-detail-report-root .acs-screen-table > .space-y-3 > div,
          .all-cashier-summary-detail-report-root .acs-screen-table .rounded-md {
            margin-bottom: 3mm !important;
            break-inside: auto !important;
            page-break-inside: auto !important;
          }

          .all-cashier-summary-detail-report-root .acs-screen-table .font-medium.bg-muted\\/50 td,
          .all-cashier-summary-detail-report-root .acs-screen-table tr.font-medium td {
            font-weight: 700 !important;
            background: #f3f3f3 !important;
          }

          /* Total receipts banner — same as screen, print-friendly */
          .all-cashier-summary-detail-report-root .acs-total-receipts {
            display: block !important;
            margin-top: 2mm !important;
            margin-bottom: 1mm !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
            padding: 1.2mm 2mm !important;
            border: 0.4pt solid #000 !important;
            background: #f7f7f7 !important;
            font-size: 7.5pt !important;
            color: #000 !important;
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .all-cashier-summary-detail-report-root .acs-total-receipts span {
            color: #000 !important;
            font-size: 7.5pt !important;
          }
          .all-cashier-summary-detail-report-root .acs-total-receipts .font-semibold {
            font-weight: 700 !important;
          }
        }
      `}</style>
    </div>
  );
}
