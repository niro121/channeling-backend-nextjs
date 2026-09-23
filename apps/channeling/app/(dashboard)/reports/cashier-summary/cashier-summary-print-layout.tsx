'use client';

/**
 * Print styles for Userwise Cashier Summary / Detail.
 * Body prints the same horizontal table layout as on screen (A4 portrait).
 * Branded ReportPrintLayout header is unchanged. PDF/Excel are separate modules.
 */
export function CashierSummaryPrintLayout() {
  return (
    <div className="ucs-print-root">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 7mm 8mm 12mm;
          }

          .cashier-summary-report-root .rpt-print-header {
            margin-bottom: 2mm !important;
            height: auto !important;
            overflow: visible !important;
            position: static !important;
          }
          .cashier-summary-report-root .rpt-print-brand-row {
            height: 12mm !important;
            gap: 5mm !important;
          }
          .cashier-summary-report-root .rpt-print-logo {
            height: 12mm !important;
            max-width: 44mm !important;
          }
          .cashier-summary-report-root .rpt-print-titles {
            height: 12mm !important;
            padding: 2mm 0 0.4mm !important;
          }
          .cashier-summary-report-root .rpt-print-org {
            height: 4mm !important;
            font-size: 13pt !important;
          }
          .cashier-summary-report-root .rpt-print-title-gap {
            height: 0.6mm !important;
          }
          .cashier-summary-report-root .rpt-print-report-name {
            height: 3.8mm !important;
            font-size: 9.5pt !important;
          }
          .cashier-summary-report-root .rpt-print-rule {
            margin-top: 1.2mm !important;
          }
          .cashier-summary-report-root .rpt-print-summary {
            margin-top: 2mm !important;
            height: auto !important;
            overflow: visible !important;
          }
          .cashier-summary-report-root .rpt-print-summary-bar {
            padding: 0.9mm 2mm !important;
            font-size: 7pt !important;
          }
          .cashier-summary-report-root .rpt-print-summary-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 1mm 3mm !important;
            padding: 1.5mm 2mm !important;
            height: auto !important;
            overflow: visible !important;
          }
          .cashier-summary-report-root .rpt-print-label {
            margin: 0 0 0.3mm !important;
            font-size: 6pt !important;
          }
          .cashier-summary-report-root .rpt-print-value {
            height: auto !important;
            overflow: visible !important;
            font-size: 8pt !important;
            line-height: 1.25 !important;
            white-space: pre-line !important;
          }
          .cashier-summary-report-root .rpt-print-root .whitespace-pre-line {
            white-space: pre-line !important;
          }
          .cashier-summary-report-root .rpt-print-body {
            margin-top: 2.5mm !important;
            position: static !important;
            clear: both !important;
          }

          /* Body: same horizontal multi-column tables as the screen view */
          .cashier-summary-report-root .ucs-screen-summary .overflow-x-auto,
          .cashier-summary-report-root .ucs-screen-detail .overflow-x-auto,
          .cashier-summary-report-root .ucs-screen-summary .overflow-auto,
          .cashier-summary-report-root .ucs-screen-detail .overflow-auto {
            overflow: visible !important;
          }
          .cashier-summary-report-root .ucs-screen-summary table,
          .cashier-summary-report-root .ucs-screen-detail table {
            width: 100% !important;
            border-collapse: collapse !important;
            table-layout: auto !important;
          }
          .cashier-summary-report-root .ucs-screen-summary th,
          .cashier-summary-report-root .ucs-screen-summary td,
          .cashier-summary-report-root .ucs-screen-detail th,
          .cashier-summary-report-root .ucs-screen-detail td {
            font-size: 7.5pt !important;
            padding: 1mm 1.2mm !important;
            line-height: 1.2 !important;
            border: 0.2mm solid #000 !important;
            color: #000 !important;
            vertical-align: top !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .cashier-summary-report-root .ucs-screen-summary thead th,
          .cashier-summary-report-root .ucs-screen-detail thead th,
          .cashier-summary-report-root .ucs-screen-summary th,
          .cashier-summary-report-root .ucs-screen-detail th {
            font-size: 7pt !important;
            font-weight: 700 !important;
            background: #e8e8e8 !important;
          }
          .cashier-summary-report-root .ucs-screen-summary h3,
          .cashier-summary-report-root .ucs-screen-detail h3 {
            font-size: 9pt !important;
            font-weight: 700 !important;
            margin: 0 0 1.5mm !important;
            color: #000 !important;
            break-after: avoid !important;
            page-break-after: avoid !important;
          }
          .cashier-summary-report-root .ucs-screen-summary > div,
          .cashier-summary-report-root .ucs-screen-detail > div {
            margin-bottom: 3mm !important;
            break-inside: auto !important;
            page-break-inside: auto !important;
          }
          .cashier-summary-report-root .ucs-screen-summary tr,
          .cashier-summary-report-root .ucs-screen-detail tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .cashier-summary-report-root .cashier-section-empty {
            display: none !important;
          }

          /* Keep credit vs cash summary together (do not split across pages) */
          .cashier-summary-report-root .ucs-credit-cash-footer {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .cashier-summary-report-root .ucs-credit-cash-footer table {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>
    </div>
  );
}
