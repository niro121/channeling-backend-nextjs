'use client';

/**
 * Channel Agent Reference Book — PDF ONLY (A4 portrait, matches Print).
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  RUHUNU_HOSPITAL_LOGO_SRC,
  RUHUNU_PRINT_BRAND_NAME,
  type BrandedPdfSummaryItem,
} from '@/components/common/report-print';
import type { ExportChannelAgentReferenceBookData } from '@/types/report';
import {
  CHANNEL_AGENT_REF_PDF_COL_PERCENTS,
  CHANNEL_AGENT_REF_PDF_HEADERS,
  channelAgentReferenceBookPdfCompactRow,
  groupChannelAgentReferenceBookExportRows,
  mapChannelAgentReferenceBookCompactFromExportRow,
} from './channel-agent-reference-book-export-config';

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

async function drawCompactPortraitHeader(
  doc: jsPDF,
  opts: {
    reportName: string;
    summaryItems: BrandedPdfSummaryItem[];
    margin: number;
  }
): Promise<number> {
  const { margin, reportName, summaryItems } = opts;
  const { width: pageWidth } = pageSize(doc);
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const logoH = 9;
  const logoMaxW = 36;
  let textX = margin;
  const logoData = await loadLogoDataUrl(RUHUNU_HOSPITAL_LOGO_SRC);
  if (logoData) {
    const logoW = Math.min(logoMaxW, logoH * (526 / 160));
    doc.addImage(logoData, 'PNG', margin, y, logoW, logoH);
    textX = margin + logoW + 4;
  }

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(RUHUNU_PRINT_BRAND_NAME.toUpperCase(), textX, y + 3.6);
  doc.setFontSize(9);
  doc.setTextColor(51, 51, 51);
  doc.text(
    doc.splitTextToSize(reportName.toUpperCase(), pageWidth - textX - margin),
    textX,
    y + 7.4
  );
  y += logoH + 1.5;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageWidth - margin, y);
  y += 2;

  const summaryTop = y;
  const barH = 5;
  const padX = 1.5;
  const padY = 1;
  const colGap = 2;
  const cols = 3;
  const colW = (contentWidth - padX * 2 - colGap * (cols - 1)) / cols;

  doc.setFillColor(232, 232, 232);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(margin, summaryTop, contentWidth, barH, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(0, 0, 0);
  doc.text('REPORT SUMMARY', margin + padX, summaryTop + 3.4);

  type Cell = { label: string; value: string; col: number; row: number; span: number };
  const cells: Cell[] = [];
  let col = 0;
  let row = 0;
  for (const item of summaryItems) {
    const span = item.fullWidth ? cols : 1;
    if (col + span > cols) {
      col = 0;
      row += 1;
    }
    cells.push({
      label: item.label,
      value: item.value || '—',
      col,
      row,
      span,
    });
    col += span;
    if (col >= cols) {
      col = 0;
      row += 1;
    }
  }

  const rowCount = cells.length === 0 ? 1 : Math.max(...cells.map((c) => c.row)) + 1;
  const labelH = 2.2;
  const valueLineH = 2.8;
  const rowGap = 0.8;
  const rowHeights: number[] = Array.from({ length: rowCount }, () => 0);
  for (const cell of cells) {
    const w = colW * cell.span + colGap * (cell.span - 1);
    const valueLines = doc.splitTextToSize(cell.value, w);
    rowHeights[cell.row] = Math.max(
      rowHeights[cell.row]!,
      labelH + valueLines.length * valueLineH
    );
  }
  let bodyH = padY;
  for (let r = 0; r < rowCount; r++) {
    bodyH += rowHeights[r]!;
    if (r < rowCount - 1) bodyH += rowGap;
  }
  bodyH += padY;
  const boxH = barH + bodyH;
  doc.rect(margin, summaryTop, contentWidth, boxH, 'S');

  let rowY = summaryTop + barH + padY;
  const rowStarts: number[] = [];
  for (let r = 0; r < rowCount; r++) {
    rowStarts[r] = rowY;
    rowY += rowHeights[r]! + (r < rowCount - 1 ? rowGap : 0);
  }
  for (const cell of cells) {
    const x = margin + padX + cell.col * (colW + colGap);
    const w = colW * cell.span + colGap * (cell.span - 1);
    const cy = rowStarts[cell.row]!;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor(85, 85, 85);
    doc.text(cell.label.toUpperCase(), x, cy + 1.8);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(0, 0, 0);
    doc.text(doc.splitTextToSize(cell.value, w), x, cy + 1.8 + labelH);
  }

  return summaryTop + boxH + 2;
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

export type DownloadChannelAgentReferenceBookPdfOptions = {
  reportName: string;
  summaryItems: BrandedPdfSummaryItem[];
  generatedAt: string;
  rows: ExportChannelAgentReferenceBookData[];
  fileName?: string;
};

export async function downloadChannelAgentReferenceBookReportPdf({
  reportName,
  summaryItems,
  generatedAt,
  rows,
  fileName = 'channel-agent-reference-book-report.pdf',
}: DownloadChannelAgentReferenceBookPdfOptions): Promise<void> {
  const margin = 7;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const { width: pageWidth, height: pageHeight } = pageSize(doc);
  const contentWidth = pageWidth - margin * 2;
  const bottomLimit = pageHeight - 10;

  let y = await drawCompactPortraitHeader(doc, { reportName, summaryItems, margin });

  const groups = groupChannelAgentReferenceBookExportRows(rows);

  const columnStyles: Record<number, { cellWidth: number }> = {};
  CHANNEL_AGENT_REF_PDF_COL_PERCENTS.forEach((pct, i) => {
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
      head: [Array.from(CHANNEL_AGENT_REF_PDF_HEADERS)],
      body: groupRows.map((row) =>
        channelAgentReferenceBookPdfCompactRow(
          mapChannelAgentReferenceBookCompactFromExportRow(row)
        )
      ),
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
    });

    const last = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable;
    y = (last?.finalY ?? y) + 1.4;
  }

  drawFooter(doc, generatedAt, margin);
  doc.save(fileName);
}
