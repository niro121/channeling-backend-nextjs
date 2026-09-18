'use client';

import type { ChannelTransferReportRow } from '@/types/reports/channel-transfer';
import { mapChannelTransferCompactFromReportRow } from './channel-transfer-export-config';

type Props = {
  rows: ChannelTransferReportRow[];
};

/**
 * Print-only compact A4 portrait cards for Channel Transfer Report.
 * Body mapping is shared with PDF/Excel via channel-transfer-export-config.
 * Header chrome comes from shared ReportPrintLayout via ReportTemplate.
 */
export function ChannelTransferPrintLayout({ rows }: Props) {
  return (
    <div className="ct-print-root">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 6mm 7mm 11mm;
          }
          .channel-transfer-report-root .rpt-print-header {
            margin-bottom: 1mm !important;
          }
          .channel-transfer-report-root .rpt-print-brand-row {
            height: 9mm !important;
            gap: 4mm !important;
          }
          .channel-transfer-report-root .rpt-print-logo {
            height: 9mm !important;
            max-width: 36mm !important;
          }
          .channel-transfer-report-root .rpt-print-titles {
            height: 9mm !important;
            padding: 1.2mm 0 0.2mm !important;
          }
          .channel-transfer-report-root .rpt-print-org {
            height: 3.4mm !important;
            font-size: 11pt !important;
          }
          .channel-transfer-report-root .rpt-print-title-gap {
            height: 0.5mm !important;
          }
          .channel-transfer-report-root .rpt-print-report-name {
            height: 3.4mm !important;
            font-size: 9pt !important;
          }
          .channel-transfer-report-root .rpt-print-rule {
            margin-top: 1mm !important;
          }
          .channel-transfer-report-root .rpt-print-summary {
            margin-top: 1mm !important;
          }
          .channel-transfer-report-root .rpt-print-summary-bar {
            padding: 0.5mm 1.5mm !important;
            font-size: 6.5pt !important;
            letter-spacing: 0.08em !important;
          }
          .channel-transfer-report-root .rpt-print-summary-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 0.6mm 2mm !important;
            padding: 0.8mm 1.5mm !important;
          }
          .channel-transfer-report-root .rpt-print-label {
            margin: 0 0 0.15mm !important;
            font-size: 5.5pt !important;
            letter-spacing: 0.04em !important;
          }
          .channel-transfer-report-root .rpt-print-value {
            font-size: 6.5pt !important;
            line-height: 1.08 !important;
            font-weight: 600 !important;
          }
          .channel-transfer-report-root .rpt-print-body {
            margin-top: 1mm !important;
          }

          .ct-print-root {
            color: #000 !important;
            font-family: Verdana, Geneva, Tahoma, sans-serif;
            font-size: 7pt;
            line-height: 1.15;
          }
          .ct-print-card {
            border: 0.5pt solid #000;
            margin: 0 0 1.4mm;
            padding: 1mm 1.3mm;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .ct-print-head {
            display: flex;
            flex-wrap: wrap;
            gap: 0.4mm 2.5mm;
            align-items: baseline;
            margin: 0 0 0.6mm;
            padding: 0 0 0.5mm;
            border-bottom: 0.35pt solid #999;
          }
          .ct-print-when {
            font-weight: 700;
            font-size: 7.25pt;
            font-variant-numeric: tabular-nums;
          }
          .ct-print-by {
            font-weight: 600;
          }
          .ct-print-row {
            display: grid;
            grid-template-columns: 16mm 1fr;
            column-gap: 1.2mm;
            align-items: start;
            margin-top: 0.35mm;
          }
          .ct-print-k {
            font-size: 5.75pt;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.03em;
            color: #444 !important;
            padding-top: 0.15mm;
          }
          .ct-print-v {
            min-width: 0;
            word-break: break-word;
            overflow-wrap: anywhere;
            color: #000 !important;
          }
          .ct-print-mono {
            font-family: 'Courier New', Courier, monospace;
            font-size: 6.75pt;
            word-break: break-all;
            overflow-wrap: anywhere;
          }
          .ct-print-muted {
            color: #333 !important;
          }
          .ct-print-strong {
            font-weight: 700;
          }
          .ct-print-inline {
            display: flex;
            flex-wrap: wrap;
            gap: 0.3mm 3mm;
          }
          .ct-print-inline-item {
            min-width: 0;
          }
          .ct-print-meta-block {
            margin-top: 0.5mm;
            padding-top: 0.45mm;
            border-top: 0.3pt solid #bbb;
          }
          .ct-print-meta-lines {
            display: flex;
            flex-direction: column;
            gap: 0.35mm;
            min-width: 0;
          }
          .ct-print-meta-line {
            display: flex;
            flex-wrap: wrap;
            gap: 0.25mm 2.5mm;
            align-items: baseline;
            color: #000 !important;
            font-family: 'Courier New', Courier, monospace;
            font-size: 6.5pt;
            font-weight: 700;
            word-break: break-all;
            overflow-wrap: anywhere;
          }
          .ct-print-meta-item {
            min-width: 0;
          }
          .ct-print-meta-label {
            font-family: Verdana, Geneva, Tahoma, sans-serif;
            font-size: 5.75pt;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.02em;
            color: #444 !important;
            margin-right: 0.6mm;
          }
        }
        @media screen {
          .ct-print-root { display: none; }
        }
      `}</style>

      {rows.map((row) => {
        const t = mapChannelTransferCompactFromReportRow(row);
        const metaTop = t.meta.filter(
          (f) => f.label === 'New Appt' || f.label === 'From Sess'
        );
        const metaBottom = t.meta.filter(
          (f) => f.label === 'To Sess' || f.label === 'To Doctor'
        );
        return (
          <article key={row.id} className="ct-print-card">
            <div className="ct-print-head">
              <span className="ct-print-when">{t.when}</span>
              <span className="ct-print-by">{t.by}</span>
            </div>

            <div className="ct-print-row">
              <span className="ct-print-k">Booking</span>
              <div className="ct-print-v ct-print-inline">
                <span className="ct-print-inline-item ct-print-mono ct-print-strong">
                  {t.bookingId}
                </span>
                <span className="ct-print-inline-item">
                  <span className="ct-print-muted">Remarks: </span>
                  <span className="ct-print-strong">{t.remarks}</span>
                </span>
              </div>
            </div>

            <div className="ct-print-row">
              <span className="ct-print-k">From</span>
              <div className="ct-print-v">{t.fromLine}</div>
            </div>

            <div className="ct-print-row">
              <span className="ct-print-k">To</span>
              <div className="ct-print-v">{t.toLine}</div>
            </div>

            <div className="ct-print-meta-block">
              <div className="ct-print-row">
                <span className="ct-print-k">Meta</span>
                <div className="ct-print-meta-lines">
                  <div className="ct-print-meta-line">
                    {metaTop.map((field) => (
                      <span key={field.label} className="ct-print-meta-item">
                        <span className="ct-print-meta-label">{field.label}</span>
                        {field.value}
                      </span>
                    ))}
                  </div>
                  <div className="ct-print-meta-line">
                    {metaBottom.map((field) => (
                      <span key={field.label} className="ct-print-meta-item">
                        <span className="ct-print-meta-label">{field.label}</span>
                        {field.value}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
