'use client';

/**
 * Agency Statement — PDF ONLY (A4 portrait, matches Print).
 */

import jsPDF from 'jspdf';
import autoTable, { type RowInput } from 'jspdf-autotable';
import {
  drawBrandedPdfHeader,
  type BrandedPdfSummaryItem,
} from '@/components/common/report-print';
import type { AgencyStatementReportData } from '@/types/reports/agency-statement';
import {
  AGENCY_STATEMENT_PDF_COL_PERCENTS,
  AGENCY_STATEMENT_PDF_HEADERS,
  agencyStatementPdfCompactRow,
  buildAgencyStatementCompactRows,
  type AgencyStatementCompactRow,
} from './agency-statement-export-config';

function agencyStatementPdfBody(rows: AgencyStatementCompactRow[]): RowInput[] {
  const shade = {
    fillColor: [245, 245, 245] as [number, number, number],
    fontStyle: 'bold' as const,
  };
  return rows.map((row) => {
    if (row.isClosing) {
      return [
        { content: row.particulars, colSpan: 4, styles: shade },
        { content: row.balance, styles: shade },
        { content: '', styles: shade },
      ];
    }
    return agencyStatementPdfCompactRow(row);
  });
}

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
    const y = pageHeight - 8;
    doc.text(`Generated: ${generatedAt}`, margin, y);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, y, { align: 'right' });
  }
}

export type DownloadAgencyStatementPdfOptions = {
  reportName: string;
  summaryItems: BrandedPdfSummaryItem[];
  generatedAt: string;
  data: AgencyStatementReportData;
  periodFrom: string;
  fileName?: string;
};

export async function downloadAgencyStatementReportPdf({
  reportName,
  summaryItems,
  generatedAt,
  data,
  periodFrom,
  fileName = 'agency-statement.pdf',
}: DownloadAgencyStatementPdfOptions): Promise<void> {
  const margin = 5;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const { width: pageWidth } = pageSize(doc);
  const contentWidth = pageWidth - margin * 2;

  const y = await drawBrandedPdfHeader(doc, { reportName, summaryItems, margin });
  const compactRows = buildAgencyStatementCompactRows(data, periodFrom);

  const columnStyles: Record<number, { cellWidth: number }> = {};
  AGENCY_STATEMENT_PDF_COL_PERCENTS.forEach((pct, i) => {
    columnStyles[i] = { cellWidth: (contentWidth * pct) / 100 };
  });

  autoTable(doc, {
    head: [Array.from(AGENCY_STATEMENT_PDF_HEADERS)],
    body: agencyStatementPdfBody(compactRows),
    startY: y,
    margin: { left: margin, right: margin, bottom: 10 },
    tableWidth: contentWidth,
    showHead: 'everyPage',
    rowPageBreak: 'avoid',
    styles: {
      font: 'helvetica',
      fontSize: 6,
      cellPadding: { top: 0.5, right: 0.7, bottom: 0.5, left: 0.7 },
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
      fontSize: 5.75,
      cellPadding: { top: 0.45, right: 0.7, bottom: 0.45, left: 0.7 },
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
    didParseCell: (hookData) => {
      const row = compactRows[hookData.row.index];
      if (hookData.section !== 'body' || !row) return;
      if (row.isOpening || row.isClosing) {
        hookData.cell.styles.fillColor = [245, 245, 245];
        hookData.cell.styles.fontStyle = 'bold';
      }
    },
  });

  drawFooter(doc, generatedAt, margin);
  doc.save(fileName);
}
