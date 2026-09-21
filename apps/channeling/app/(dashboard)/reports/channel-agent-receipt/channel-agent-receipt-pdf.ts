'use client';

/**
 * Channel Agent Receipt — PDF ONLY (A4 portrait, matches Print body).
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  RUHUNU_HOSPITAL_LOGO_SRC,
  RUHUNU_PRINT_BRAND_NAME,
  type BrandedPdfSummaryItem,
} from '@/components/common/report-print';
import { formatLKR } from '@/lib/format-money';
import type { ChannelAgentReceiptReportExportRow } from '@/types/reports/channel-agent-receipt';
import {
  CHANNEL_AGENT_RECEIPT_COL_PERCENTS,
  CHANNEL_AGENT_RECEIPT_HEADERS,
} from './channel-agent-receipt-export-config';

function pageSize(doc: jsPDF): { width: number; height: number } {
  return {
    width: doc.internal.pageSize.getWidth(),
    height: doc.internal.pageSize.getHeight(),
  };
}

let cachedLogoDataUrl: string | null | undefined;

async function loadLogoDataUrl(src: string): Promise<string | null> {
  if (cachedLogoDataUrl !== undefined && src === RUHUNU_HOSPITAL_LOGO_SRC) {
    return cachedLogoDataUrl;
  }
  try {
    const res = await fetch(src);
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    if (src === RUHUNU_HOSPITAL_LOGO_SRC) cachedLogoDataUrl = dataUrl;
    return dataUrl;
  } catch {
    if (src === RUHUNU_HOSPITAL_LOGO_SRC) cachedLogoDataUrl = null;
    return null;
  }
}

async function drawHeader(
  doc: jsPDF,
  opts: {
    reportName: string;
    summaryItems: BrandedPdfSummaryItem[];
    margin: number;
  }
): Promise<number> {
  const { margin, reportName, summaryItems } = opts;
  const { width: pageWidth } = pageSize(doc);
  let y = margin;

  const logoH = 12;
  const logoMaxW = 48;
  let textX = margin;
  const logoData = await loadLogoDataUrl(RUHUNU_HOSPITAL_LOGO_SRC);
  if (logoData) {
    const logoW = Math.min(logoMaxW, logoH * (526 / 160));
    doc.addImage(logoData, 'PNG', margin, y, logoW, logoH);
    textX = margin + logoW + 4;
  }

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(RUHUNU_PRINT_BRAND_NAME.toUpperCase(), textX, y + 4.5);
  doc.setFontSize(10);
  doc.setTextColor(51, 51, 51);
  doc.text(
    doc.splitTextToSize(reportName.toUpperCase(), pageWidth - textX - margin),
    textX,
    y + 9.5
  );
  y += logoH + 2;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.45);
  doc.line(margin, y, pageWidth - margin, y);
  y += 3;

  const barH = 5.5;
  const contentWidth = pageWidth - margin * 2;
  doc.setFillColor(232, 232, 232);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.25);
  doc.rect(margin, y, contentWidth, barH, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(0, 0, 0);
  doc.text('REPORT SUMMARY', margin + 2, y + 3.7);
  y += barH;

  const padX = 2;
  const padY = 2;
  const boxTop = y;
  let innerY = y + padY;
  for (const item of summaryItems) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(85, 85, 85);
    doc.text(item.label.toUpperCase(), margin + padX, innerY + 2.2);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text(item.value || '—', margin + padX, innerY + 6.2);
    innerY += 8;
  }
  const boxH = Math.max(10, innerY + padY - boxTop);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.25);
  doc.rect(margin, boxTop, contentWidth, boxH, 'S');
  y = boxTop + boxH + 3.5;

  return y;
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
  const margin = 10;
  const doc = new jsPDF({ orientation: 'p', format: 'a4' });
  const { width: pageWidth } = pageSize(doc);
  const tableWidth = pageWidth - margin * 2;

  const startY = await drawHeader(doc, { reportName, summaryItems, margin });

  const body = rows.map((row) => [
    row.agentRef || '-',
    row.refNo || '-',
    row.agency || '-',
    row.patient || '-',
    row.status || '-',
    row.creator || '-',
    row.createdDate || '-',
    formatLKR(Number(row.billValue ?? 0)),
  ]);

  const columnStyles: Record<number, Partial<{ cellWidth: number; halign: 'left' | 'right' }>> = {};
  CHANNEL_AGENT_RECEIPT_COL_PERCENTS.forEach((pct, i) => {
    columnStyles[i] = {
      cellWidth: (tableWidth * pct) / 100,
      halign: i === 7 ? 'right' : 'left',
    };
  });

  autoTable(doc, {
    head: [Array.from(CHANNEL_AGENT_RECEIPT_HEADERS)],
    body,
    startY,
    margin: { left: margin, right: margin, bottom: 12 },
    tableWidth,
    showHead: 'everyPage',
    styles: {
      font: 'helvetica',
      fontSize: 7,
      cellPadding: { top: 1.1, right: 1.1, bottom: 1.1, left: 1.1 },
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
      fontSize: 6.5,
      cellPadding: { top: 1.1, right: 1.1, bottom: 1.1, left: 1.1 },
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
