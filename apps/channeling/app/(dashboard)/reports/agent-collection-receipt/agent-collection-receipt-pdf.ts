'use client';

/**
 * Agent Collection Receipt — PDF ONLY (A4 portrait, matches Print).
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  RUHUNU_HOSPITAL_LOGO_SRC,
  RUHUNU_PRINT_BRAND_NAME,
  type BrandedPdfSummaryItem,
} from '@/components/common/report-print';
import type { AgentCollectionReceiptReportExportRow } from '@/types/reports/agent-collection-receipt';
import {
  ACR_PDF_COL_PERCENTS,
  ACR_PDF_HEADERS,
  acrPdfCompactRow,
  buildAcrCompactRowsFromExport,
} from './agent-collection-receipt-export-config';

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

  const logoH = 11;
  const logoMaxW = 44;
  let textX = margin;
  const logoData = await loadLogoDataUrl(RUHUNU_HOSPITAL_LOGO_SRC);
  if (logoData) {
    const logoW = Math.min(logoMaxW, logoH * (526 / 160));
    doc.addImage(logoData, 'PNG', margin, y, logoW, logoH);
    textX = margin + logoW + 3.5;
  }

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(RUHUNU_PRINT_BRAND_NAME.toUpperCase(), textX, y + 4);
  doc.setFontSize(9.5);
  doc.setTextColor(51, 51, 51);
  doc.text(
    doc.splitTextToSize(reportName.toUpperCase(), pageWidth - textX - margin),
    textX,
    y + 8.5
  );
  y += logoH + 1.8;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageWidth - margin, y);
  y += 2.5;

  const barH = 5;
  const contentWidth = pageWidth - margin * 2;
  doc.setFillColor(232, 232, 232);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.25);
  doc.rect(margin, y, contentWidth, barH, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(0, 0, 0);
  doc.text('REPORT SUMMARY', margin + 2, y + 3.4);
  y += barH;

  const padX = 2;
  const padY = 1.8;
  const boxTop = y;
  const items = summaryItems.length ? summaryItems : [{ label: '—', value: '—' }];
  const cols = Math.min(3, items.length);
  const colW = (contentWidth - padX * 2) / cols;
  let maxLines = 1;
  items.forEach((item, i) => {
    const col = i % cols;
    const rowIdx = Math.floor(i / cols);
    const x = margin + padX + col * colW;
    const baseY = boxTop + padY + rowIdx * 9;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(85, 85, 85);
    doc.text(item.label.toUpperCase(), x, baseY + 2);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    const lines = doc.splitTextToSize(item.value || '—', colW - 2);
    doc.text(lines, x, baseY + 5.5);
    maxLines = Math.max(maxLines, rowIdx + 1);
  });
  const boxH = Math.max(10, padY * 2 + maxLines * 9);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.25);
  doc.rect(margin, boxTop, contentWidth, boxH, 'S');
  return boxTop + boxH + 3;
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

export type DownloadAcrPdfOptions = {
  reportName: string;
  summaryItems: BrandedPdfSummaryItem[];
  generatedAt: string;
  rows: AgentCollectionReceiptReportExportRow[];
  fileName?: string;
};

export async function downloadAgentCollectionReceiptReportPdf({
  reportName,
  summaryItems,
  generatedAt,
  rows,
  fileName = 'agent-collection-receipt-report.pdf',
}: DownloadAcrPdfOptions): Promise<void> {
  const margin = 8;
  const doc = new jsPDF({ orientation: 'p', format: 'a4' });
  const { width: pageWidth } = pageSize(doc);
  const tableWidth = pageWidth - margin * 2;

  const startY = await drawHeader(doc, { reportName, summaryItems, margin });
  const compactRows = buildAcrCompactRowsFromExport(rows);

  const columnStyles: Record<
    number,
    Partial<{ cellWidth: number; halign: 'left' | 'right' | 'center' }>
  > = {};
  ACR_PDF_COL_PERCENTS.forEach((pct, i) => {
    columnStyles[i] = {
      cellWidth: (tableWidth * pct) / 100,
      halign: i === 0 ? 'center' : 'left',
    };
  });

  autoTable(doc, {
    head: [Array.from(ACR_PDF_HEADERS)],
    body: compactRows.map(acrPdfCompactRow),
    startY,
    margin: { left: margin, right: margin, bottom: 12 },
    tableWidth,
    showHead: 'everyPage',
    styles: {
      font: 'helvetica',
      fontSize: 6.25,
      cellPadding: { top: 1, right: 0.9, bottom: 1, left: 0.9 },
      overflow: 'linebreak',
      valign: 'top',
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [232, 232, 232],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 6,
      valign: 'middle',
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
    },
    columnStyles,
    didParseCell: (hookData) => {
      const row = compactRows[hookData.row.index];
      if (hookData.section !== 'body' || !row) return;
      if (row.isTotal) {
        hookData.cell.styles.fontStyle = 'bold';
        hookData.cell.styles.fillColor = [243, 243, 243];
      }
      if (row.isNegative) {
        hookData.cell.styles.textColor = [185, 28, 28];
      }
    },
  });

  drawFooter(doc, generatedAt, margin);
  doc.save(fileName);
}
