'use client';

/**
 * Channel Agent Receipt — PDF ONLY (A4 portrait, matches Print body).
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  drawBrandedPdfHeader,
  type BrandedPdfSummaryItem,
} from '@/components/common/report-print';
import { formatLKR } from '@/lib/format-money';
import type { ChannelAgentReceiptReportExportRow } from '@/types/reports/channel-agent-receipt';
import { CHANNEL_AGENT_RECEIPT_HEADERS } from './channel-agent-receipt-export-config';

function pageSize(doc: jsPDF): { width: number; height: number } {
  return {
    width: doc.internal.pageSize.getWidth(),
    height: doc.internal.pageSize.getHeight(),
  };
}

function drawFooter(doc: jsPDF, generatedAt: string, margin: number) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    const { width, height } = pageSize(doc);
    const y = height - 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text(`Generated: ${generatedAt}`, margin, y);
    doc.text(`Page ${i} of ${pageCount}`, width - margin, y, { align: 'right' });
  }
}

export type DownloadChannelAgentReceiptPdfOptions = {
  reportName: string;
  summaryItems: BrandedPdfSummaryItem[];
  generatedAt: string;
  rows: ChannelAgentReceiptReportExportRow[];
  fileName?: string;
};

export async function downloadChannelAgentReceiptReportPdf({
  reportName,
  summaryItems,
  generatedAt,
  rows,
  fileName = 'channel-agent-receipt-report.pdf',
}: DownloadChannelAgentReceiptPdfOptions): Promise<void> {
  const margin = 5;
  const doc = new jsPDF({ orientation: 'p', format: 'a4' });
  const { width: pageWidth } = pageSize(doc);
  const tableWidth = pageWidth - margin * 2;

  const startY = await drawBrandedPdfHeader(doc, { reportName, summaryItems, margin });

  const billTotal = rows.reduce((sum, row) => sum + (Number(row.billValue) || 0), 0);
  const body: Array<string[] | Array<string | { content: string; colSpan?: number; styles?: Record<string, unknown> }>> = rows.map((row) => [
    row.agentRef || '-',
    row.refNo || '-',
    row.agency || '-',
    row.patient || '-',
    row.status || '-',
    row.creator || '-',
    row.createdDate || '-',
    formatLKR(Number(row.billValue ?? 0)),
  ]);
  if (rows.length > 0) {
    body.push([
      {
        content: 'Total',
        colSpan: 7,
        styles: { fontStyle: 'bold', fillColor: [243, 243, 243], halign: 'left' },
      },
      {
        content: formatLKR(billTotal),
        styles: { fontStyle: 'bold', fillColor: [243, 243, 243], halign: 'right' },
      },
    ]);
  }

  /** Same widths as the print table. */
  const printColPercents = [7, 17, 12, 13, 6, 18, 16, 11] as const;
  const columnStyles: Record<number, Partial<{ cellWidth: number; halign: 'left' | 'right' }>> = {};
  printColPercents.forEach((pct, i) => {
    columnStyles[i] = {
      cellWidth: (tableWidth * pct) / 100,
      halign: i === 7 ? 'right' : 'left',
    };
  });

  autoTable(doc, {
    head: [Array.from(CHANNEL_AGENT_RECEIPT_HEADERS)],
    body,
    startY,
    margin: { left: margin, right: margin, bottom: 14 },
    tableWidth,
    showHead: 'everyPage',
    styles: {
      font: 'helvetica',
      fontSize: 5.5,
      cellPadding: { top: 0.7, right: 0.6, bottom: 0.7, left: 0.6 },
      overflow: 'linebreak',
      valign: 'middle',
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
      minCellHeight: 0,
    },
    headStyles: {
      fillColor: [232, 232, 232],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 5,
      cellPadding: { top: 0.7, right: 0.6, bottom: 0.7, left: 0.6 },
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
      overflow: 'linebreak',
    },
    bodyStyles: {
      fontStyle: 'normal',
    },
    columnStyles,
  });

  drawFooter(doc, generatedAt, margin);
  doc.save(fileName);
}
