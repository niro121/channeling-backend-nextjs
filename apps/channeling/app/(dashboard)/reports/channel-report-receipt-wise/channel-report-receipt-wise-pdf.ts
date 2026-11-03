'use client';

/**
 * Receipt Report — PDF ONLY (A4 portrait, matches Print).
 * Header uses shared drawBrandedPdfHeader; table body stays Receipt-specific.
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  drawBrandedPdfHeader,
  type BrandedPdfSummaryItem,
} from '@/components/common/report-print';
import type { ChannelReportReceiptWiseExportRow } from '@/types/reports/channel-report-receipt-wise';
import {
  RECEIPT_REPORT_PDF_COL_PERCENTS,
  RECEIPT_REPORT_PDF_HEADERS,
  parseReceiptAmountTotal,
  receiptReportGroupTitle,
  receiptReportPdfCompactRow,
} from './channel-report-receipt-wise-export-config';

function pageSize(doc: jsPDF): { width: number; height: number } {
  return {
    width: doc.internal.pageSize.getWidth(),
    height: doc.internal.pageSize.getHeight(),
  };
}

function drawFooter(doc: jsPDF, generatedAt: string, margin: number) {
  const { width: pageWidth, height: pageHeight } = pageSize(doc);
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(0, 0, 0);
    const y = pageHeight - 5;
    doc.text(`Generated: ${generatedAt}`, margin, y);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, y, { align: 'right' });
  }
}

export type DownloadReceiptReportPdfOptions = {
  reportName: string;
  summaryItems: BrandedPdfSummaryItem[];
  generatedAt: string;
  rows: ChannelReportReceiptWiseExportRow[];
  fileName?: string;
};

export async function downloadReceiptReportPdf({
  reportName,
  summaryItems,
  generatedAt,
  rows,
  fileName = 'receipt-report.pdf',
}: DownloadReceiptReportPdfOptions): Promise<void> {
  const margin = 10;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const { height: pageHeight } = pageSize(doc);
  const contentWidth = pageSize(doc).width - margin * 2;
  const bottomLimit = pageHeight - 12;

  let y = await drawBrandedPdfHeader(doc, { reportName, summaryItems, margin });

  let amountTotal = 0;
  let whtTotal = 0;
  let netTotal = 0;
  for (const row of rows) {
    amountTotal += parseReceiptAmountTotal(row, 'receiptAmount');
    whtTotal += parseReceiptAmountTotal(row, 'whdAmount');
    netTotal += parseReceiptAmountTotal(row, 'netAmount');
  }

  const groups = new Map<string, ChannelReportReceiptWiseExportRow[]>();
  for (const row of rows) {
    const key = receiptReportGroupTitle(row);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }

  const columnStyles: Record<number, { cellWidth: number }> = {};
  RECEIPT_REPORT_PDF_COL_PERCENTS.forEach((pct, i) => {
    columnStyles[i] = { cellWidth: (contentWidth * pct) / 100 };
  });

  const ensureSpace = (needed: number) => {
    if (y + needed <= bottomLimit) return;
    doc.addPage();
    y = margin;
  };

  for (const [groupTitle, groupRows] of groups.entries()) {
    ensureSpace(10);

    doc.setFillColor(236, 236, 236);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.rect(margin, y, contentWidth, 4.2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(0, 0, 0);
    doc.text(groupTitle, margin + 1, y + 2.9);
    y += 4.2;

    autoTable(doc, {
      head: [Array.from(RECEIPT_REPORT_PDF_HEADERS)],
      body: groupRows.map((row) => receiptReportPdfCompactRow(row)),
      startY: y,
      margin: { left: margin, right: margin, bottom: 12 },
      tableWidth: contentWidth,
      showHead: 'everyPage',
      rowPageBreak: 'avoid',
      styles: {
        font: 'helvetica',
        fontSize: 6.25,
        cellPadding: { top: 0.55, right: 0.75, bottom: 0.55, left: 0.75 },
        overflow: 'linebreak',
        valign: 'top',
        textColor: [0, 0, 0],
        lineColor: [153, 153, 153],
        lineWidth: 0.15,
        minCellHeight: 0,
      },
      headStyles: {
        fillColor: [243, 243, 243],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 6,
        cellPadding: { top: 0.5, right: 0.75, bottom: 0.5, left: 0.75 },
        lineColor: [0, 0, 0],
        lineWidth: 0.2,
        overflow: 'linebreak',
      },
      bodyStyles: {
        fontStyle: 'normal',
      },
      alternateRowStyles: {
        fillColor: [255, 255, 255],
      },
      columnStyles,
    });

    const last = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable;
    y = (last?.finalY ?? y) + 1.4;
  }

  if (rows.length > 0) {
    const totalsH = 10;
    ensureSpace(totalsH + 1);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.35);
    doc.rect(margin, y, contentWidth, totalsH);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(0, 0, 0);
    doc.text('Total', margin + 1.2, y + 3.2);

    const totals = [
      { label: 'Amount', value: amountTotal.toFixed(2) },
      { label: 'WHT', value: whtTotal.toFixed(2) },
      { label: 'Net Amount', value: netTotal.toFixed(2) },
    ];
    const colW = (contentWidth - 2.4 - 2 * 2) / 3;
    for (let i = 0; i < totals.length; i++) {
      const t = totals[i]!;
      const fx = margin + 1.2 + i * (colW + 2);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.5);
      doc.setTextColor(68, 68, 68);
      doc.text(t.label.toUpperCase(), fx, y + 5.8);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(0, 0, 0);
      doc.text(t.value, fx, y + 8.8);
    }
  }

  drawFooter(doc, generatedAt, margin);
  doc.save(fileName);
}
