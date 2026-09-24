'use client';

/**
 * Print styles for Userwise Cashier Summary / Detail.
 * A4 landscape — same layout as screen. Clear physical-print footers.
 */
export function CashierSummaryPrintLayout({
  generatedAt,
}: {
  generatedAt?: string;
}) {
  const footerGenerated = (generatedAt || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return (
    <div className="ucs-print-root">
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

          .cashier-summary-report-root {
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

          /* Strip Card chrome/padding that shrinks content on print */
          .cashier-summary-report-root > .bg-muted\\/20,
          .cashier-summary-report-root [class*="Card"],
          .cashier-summary-report-root .bg-muted\\/20 {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: #fff !important;
          }
          .cashier-summary-report-root .rpt-print-root {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-sizing: border-box !important;
          }

          .cashier-summary-report-root .rpt-print-header {
            margin-bottom: 2mm !important;
            height: auto !important;
            overflow: visible !important;
            position: static !important;
            width: 100% !important;
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
          .cashier-summary-report-root .rpt-print-summary-bar {
            padding: 0.9mm 2mm !important;
            font-size: 7pt !important;
            font-weight: 700 !important;
            color: #000 !important;
            background: #e8e8e8 !important;
            border-bottom: 0.4pt solid #000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
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
            font-size: 6.5pt !important;
            color: #000 !important;
            font-weight: 700 !important;
          }
          .cashier-summary-report-root .rpt-print-value {
            height: auto !important;
            overflow: visible !important;
            font-size: 8.5pt !important;
            line-height: 1.25 !important;
            white-space: pre-line !important;
            color: #000 !important;
            font-weight: 700 !important;
          }
          .cashier-summary-report-root .rpt-print-root .whitespace-pre-line {
            white-space: pre-line !important;
          }
          .cashier-summary-report-root .rpt-print-body {
            margin-top: 2.5mm !important;
            width: 100% !important;
            max-width: 100% !important;
            position: static !important;
            clear: both !important;
            box-sizing: border-box !important;
          }

          .cashier-summary-report-root .ucs-screen-summary,
          .cashier-summary-report-root .ucs-screen-detail {
            width: 100% !important;
            max-width: 100% !important;
          }

          /* Remove wrapper border/radius so only table borders print */
          .cashier-summary-report-root .ucs-screen-summary .overflow-x-auto,
          .cashier-summary-report-root .ucs-screen-detail .overflow-x-auto,
          .cashier-summary-report-root .ucs-screen-summary .overflow-auto,
          .cashier-summary-report-root .ucs-screen-detail .overflow-auto,
          .cashier-summary-report-root .ucs-screen-summary .rounded-md,
          .cashier-summary-report-root .ucs-screen-detail .rounded-md {
            overflow: visible !important;
            width: 100% !important;
            max-width: 100% !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            box-sizing: border-box !important;
          }

          /*
            Full-page tables: fixed layout fills landscape width.
            Slight left inset + under-100% width keeps outer borders on Windows.
          */
          .cashier-summary-report-root .ucs-screen-summary table,
          .cashier-summary-report-root .ucs-screen-detail table {
            width: 100% !important;
            max-width: 100% !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
            border-collapse: collapse !important;
            table-layout: fixed !important;
            box-sizing: border-box !important;
            border: 0.5pt solid #000 !important;
          }
          .cashier-summary-report-root .ucs-screen-summary th,
          .cashier-summary-report-root .ucs-screen-summary td,
          .cashier-summary-report-root .ucs-screen-detail th,
          .cashier-summary-report-root .ucs-screen-detail td {
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

          /*
            Amount columns (Cash … E-wallet): min width for ≥6 digits
            (e.g. 999,999.00) — do not shrink below this on print.
          */
          .cashier-summary-report-root .ucs-amt {
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

          /*
            Tx / Receipt: stay inside cell (no bleed into next column).
            Print: Tx shows date/time + user name/code only (no shift range) → narrower;
            same Δ goes to Patient/Agency.
          */
          .cashier-summary-report-root .ucs-tx-shift {
            width: 40mm !important;
            min-width: 40mm !important;
            max-width: 40mm !important;
            overflow: hidden !important;
          }
          .cashier-summary-report-root .ucs-patient,
          .cashier-summary-report-root .ucs-consultant {
            width: 24mm !important;
            min-width: 24mm !important;
            max-width: 24mm !important;
            overflow: hidden !important;
            word-break: break-word !important;
            overflow-wrap: break-word !important;
          }
          .cashier-summary-report-root .ucs-receipt-bill {
            width: 28mm !important;
            min-width: 28mm !important;
            max-width: 28mm !important;
            overflow: hidden !important;
          }
          .cashier-summary-report-root .ucs-session {
            width: 28mm !important;
            min-width: 28mm !important;
            max-width: 28mm !important;
            white-space: nowrap !important;
            overflow: hidden !important;
          }
          .cashier-summary-report-root .ucs-tx-shift .ucs-stack-line,
          .cashier-summary-report-root .ucs-receipt-bill .ucs-stack-line {
            display: block !important;
            max-width: 100% !important;
            line-height: 1.1 !important;
            font-size: 6.5pt !important;
          }
          /* Print: hide full shift range; show compact user name + code */
          .cashier-summary-report-root .ucs-tx-shift .ucs-tx-full {
            display: none !important;
          }
          .cashier-summary-report-root .ucs-tx-shift .ucs-tx-compact {
            display: block !important;
          }
          .cashier-summary-report-root .ucs-tx-shift .ucs-stack-line:first-child,
          .cashier-summary-report-root .ucs-receipt-bill .ucs-stack-line:first-child {
            white-space: nowrap !important;
            overflow: hidden !important;
          }
          .cashier-summary-report-root .ucs-tx-shift .ucs-tx-compact,
          .cashier-summary-report-root .ucs-receipt-bill .ucs-stack-line:last-child {
            white-space: normal !important;
            overflow-wrap: break-word !important;
            word-break: break-word !important;
          }

          /* Reinforce outer edges so Windows does not drop first/last vertical lines */
          .cashier-summary-report-root .ucs-screen-summary th:first-child,
          .cashier-summary-report-root .ucs-screen-summary td:first-child,
          .cashier-summary-report-root .ucs-screen-detail th:first-child,
          .cashier-summary-report-root .ucs-screen-detail td:first-child {
            border-left: 0.7pt solid #000 !important;
            box-shadow: inset 0.7pt 0 0 #000 !important;
          }
          .cashier-summary-report-root .ucs-screen-summary th:last-child,
          .cashier-summary-report-root .ucs-screen-summary td:last-child,
          .cashier-summary-report-root .ucs-screen-detail th:last-child,
          .cashier-summary-report-root .ucs-screen-detail td:last-child {
            border-right: 0.7pt solid #000 !important;
          }
          .cashier-summary-report-root .ucs-screen-summary thead th,
          .cashier-summary-report-root .ucs-screen-detail thead th,
          .cashier-summary-report-root .ucs-screen-summary th,
          .cashier-summary-report-root .ucs-screen-detail th {
            font-size: 6.5pt !important;
            font-weight: 700 !important;
            color: #000 !important;
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
            width: 100% !important;
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

          /* Credit vs cash footer stays left-sized but not clipped */
          .cashier-summary-report-root .ucs-credit-cash-footer {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            width: auto !important;
            max-width: 90mm !important;
          }
          .cashier-summary-report-root .ucs-credit-cash-footer .max-w-md {
            max-width: 90mm !important;
            width: 90mm !important;
          }
          .cashier-summary-report-root .ucs-credit-cash-footer table {
            width: 100% !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            table-layout: fixed !important;
          }
        }
      `}</style>
    </div>
  );
}
