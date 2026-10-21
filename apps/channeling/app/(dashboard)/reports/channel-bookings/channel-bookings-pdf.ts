'use client';

/**
 * Channel Booking Details Report — PDF ONLY.
 * A4 landscape compact table matching the current Print layout.
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  RUHUNU_HOSPITAL_LOGO_SRC,
  RUHUNU_PRINT_BRAND_NAME,
  type BrandedPdfSummaryItem,
} from '@/components/common/report-print';
import type { ChannelBookingsReportExportRow } from '@/types/reports/channel-bookings';
import {
  CHANNEL_BOOKINGS_PDF_COL_PERCENTS,
  CHANNEL_BOOKINGS_PDF_HEADERS,
  channelBookingsDoctorGroupTitle,
  channelBookingsPdfCompactRow,
  parseFeeTotal,
} from './channel-bookings-export-config';

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

async function drawCompactLandscapeHeader(
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
  const cols = 8;
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

export type DownloadChannelBookingsReportPdfOptions = {
  reportName: string;
  summaryItems: BrandedPdfSummaryItem[];
  generatedAt: string;
  rows: ChannelBookingsReportExportRow[];
  fileName?: string;
};

export async function downloadChannelBookingsReportPdf({
  reportName,
  summaryItems,
  generatedAt,
  rows,
  fileName = 'channel-bookings-report.pdf',
}: DownloadChannelBookingsReportPdfOptions): Promise<void> {
  const margin = 7;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const { width: pageWidth, height: pageHeight } = pageSize(doc);
  const contentWidth = pageWidth - margin * 2;
  const bottomLimit = pageHeight - 10;

  let y = await drawCompactLandscapeHeader(doc, { reportName, summaryItems, margin });

  const groups = new Map<string, ChannelBookingsReportExportRow[]>();
  for (const row of rows) {
    const key = channelBookingsDoctorGroupTitle(row);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }

  let hospitalFeeTotal = 0;
  let doctorFeeTotal = 0;
  let discountTotal = 0;
  let totalFeeTotal = 0;
  for (const row of rows) {
    hospitalFeeTotal += parseFeeTotal(row, 'hospitalFee');
    doctorFeeTotal += parseFeeTotal(row, 'doctorFee');
    discountTotal += parseFeeTotal(row, 'discount');
    totalFeeTotal += parseFeeTotal(row, 'totalFee');
  }

  const columnStyles: Record<number, { cellWidth: number }> = {};
  CHANNEL_BOOKINGS_PDF_COL_PERCENTS.forEach((pct, i) => {
    columnStyles[i] = { cellWidth: (contentWidth * pct) / 100 };
  });

  const ensureSpace = (needed: number) => {
    if (y + needed <= bottomLimit) return;
    doc.addPage();
    y = margin;
  };

  for (const [groupTitle, groupRows] of groups.entries()) {
    // Doctor heading + a few rows can start mid-page; only break if heading alone won't fit
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
      head: [Array.from(CHANNEL_BOOKINGS_PDF_HEADERS)],
      body: groupRows.map((row) => channelBookingsPdfCompactRow(row)),
      startY: y,
      margin: { left: margin, right: margin, bottom: 10 },
      tableWidth: contentWidth,
      showHead: 'everyPage',
      rowPageBreak: 'avoid',
      styles: {
        font: 'helvetica',
        fontSize: 6.5,
        cellPadding: { top: 0.55, right: 0.8, bottom: 0.55, left: 0.8 },
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
        cellPadding: { top: 0.5, right: 0.8, bottom: 0.5, left: 0.8 },
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
    doc.text('Total', margin + 1.2, y + 3.2);

    const totals = [
      { label: 'Hospital Fee', value: hospitalFeeTotal.toFixed(2) },
      { label: 'Doctor Fee', value: doctorFeeTotal.toFixed(2) },
      { label: 'Discount', value: discountTotal.toFixed(2) },
      { label: 'Total Fee', value: totalFeeTotal.toFixed(2) },
    ];
    const colW = (contentWidth - 2.4 - 3 * 2) / 4;
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
