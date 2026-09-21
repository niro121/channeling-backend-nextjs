'use client';

/**
 * Room Occupancy — PDF ONLY (A4 landscape hour grid matching Print).
 * Header uses shared drawBrandedPdfHeader.
 * Hour cells draw yellow/empty squares (Helvetica cannot render ●/○).
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  drawBrandedPdfHeader,
  type BrandedPdfSummaryItem,
} from '@/components/common/report-print';
import type { RoomOccupancyReportExportRow } from '@/types/reports/room-occupancy';
import {
  ROOM_OCCUPANCY_PDF_COL_PERCENTS,
  ROOM_OCCUPANCY_PDF_HEADERS,
  roomOccupancyGroupKey,
  roomOccupancyGroupTitle,
  roomOccupancyPdfCompactRow,
} from './room-occupancy-export-config';

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

function drawLegendDot(
  doc: jsPDF,
  x: number,
  y: number,
  booked: boolean,
  size = 2.2
) {
  doc.setDrawColor(51, 51, 51);
  doc.setLineWidth(0.25);
  if (booked) {
    doc.setFillColor(246, 208, 96);
    doc.roundedRect(x, y, size, size, 0.2, 0.2, 'FD');
  } else {
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, y, size, size, 0.2, 0.2, 'FD');
  }
}

export type DownloadRoomOccupancyPdfOptions = {
  reportName: string;
  summaryItems: BrandedPdfSummaryItem[];
  generatedAt: string;
  rows: RoomOccupancyReportExportRow[];
  fileName?: string;
};

export async function downloadRoomOccupancyReportPdf({
  reportName,
  summaryItems,
  generatedAt,
  rows,
  fileName = 'room-occupancy-report.pdf',
}: DownloadRoomOccupancyPdfOptions): Promise<void> {
  const margin = 8;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const { height: pageHeight } = pageSize(doc);
  const contentWidth = pageSize(doc).width - margin * 2;
  const bottomLimit = pageHeight - 10;

  let y = await drawBrandedPdfHeader(doc, { reportName, summaryItems, margin });

  // Legend matching Print (drawn boxes — not Unicode)
  drawLegendDot(doc, margin, y, true);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(0, 0, 0);
  doc.text('Booked', margin + 3.2, y + 1.7);

  drawLegendDot(doc, margin + 18, y, false);
  doc.text('Free', margin + 21.2, y + 1.7);

  doc.setFont('helvetica', 'normal');
  doc.text('Hours 00-23 · blocks every 6 hours', margin + 36, y + 1.7);
  y += 5;

  const groups = new Map<string, RoomOccupancyReportExportRow[]>();
  for (const row of rows) {
    const key = roomOccupancyGroupKey(row);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }

  const columnStyles: Record<number, { cellWidth: number; halign?: 'left' | 'center' | 'right' }> =
    {};
  ROOM_OCCUPANCY_PDF_COL_PERCENTS.forEach((pct, i) => {
    columnStyles[i] = {
      cellWidth: (contentWidth * pct) / 100,
      halign: i === 0 ? 'left' : i === ROOM_OCCUPANCY_PDF_HEADERS.length - 1 ? 'right' : 'center',
    };
  });

  const ensureSpace = (needed: number) => {
    if (y + needed <= bottomLimit) return;
    doc.addPage();
    y = margin;
  };

  for (const [, groupRows] of groups.entries()) {
    const groupTitle = roomOccupancyGroupTitle(groupRows[0]!);
    ensureSpace(12);

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
      head: [Array.from(ROOM_OCCUPANCY_PDF_HEADERS)],
      body: groupRows.map((row) => roomOccupancyPdfCompactRow(row)),
      startY: y,
      margin: { left: margin, right: margin, bottom: 10 },
      tableWidth: contentWidth,
      showHead: 'everyPage',
      rowPageBreak: 'avoid',
      styles: {
        font: 'helvetica',
        fontSize: 6,
        cellPadding: { top: 0.55, right: 0.25, bottom: 0.55, left: 0.25 },
        overflow: 'linebreak',
        valign: 'middle',
        textColor: [0, 0, 0],
        lineColor: [153, 153, 153],
        lineWidth: 0.12,
        minCellHeight: 4.2,
      },
      headStyles: {
        fillColor: [243, 243, 243],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 5.25,
        cellPadding: { top: 0.4, right: 0.15, bottom: 0.4, left: 0.15 },
        lineColor: [0, 0, 0],
        lineWidth: 0.18,
        overflow: 'linebreak',
        halign: 'center',
      },
      bodyStyles: {
        fontStyle: 'normal',
      },
      alternateRowStyles: {
        fillColor: [255, 255, 255],
      },
      columnStyles,
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index >= 1 && data.column.index <= 24) {
          // Hide 1/0 flags — dots are drawn in didDrawCell
          data.cell.text = [''];
        }
        if (data.section === 'head' && data.column.index === 0) {
          data.cell.styles.halign = 'left';
        }
        if (
          data.section === 'head' &&
          data.column.index === ROOM_OCCUPANCY_PDF_HEADERS.length - 1
        ) {
          data.cell.styles.halign = 'right';
        }
        if (data.column.index >= 1 && data.column.index <= 24) {
          const hourIndex = data.column.index - 1;
          if (hourIndex > 0 && hourIndex % 6 === 0) {
            data.cell.styles.lineColor = [0, 0, 0];
          }
        }
      },
      didDrawCell: (data) => {
        if (data.section !== 'body') return;
        const col = data.column.index;
        if (col < 1 || col > 24) return;

        const raw = String(data.cell.raw ?? '');
        const booked = raw === '1';
        const size = Math.min(2.1, data.cell.width * 0.55, data.cell.height * 0.55);
        const x = data.cell.x + (data.cell.width - size) / 2;
        const cy = data.cell.y + (data.cell.height - size) / 2;

        doc.setDrawColor(51, 51, 51);
        doc.setLineWidth(0.22);
        if (booked) {
          doc.setFillColor(246, 208, 96);
          doc.roundedRect(x, cy, size, size, 0.15, 0.15, 'FD');
        } else {
          doc.setFillColor(255, 255, 255);
          doc.roundedRect(x, cy, size, size, 0.15, 0.15, 'FD');
        }
      },
    });

    const last = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable;
    y = (last?.finalY ?? y) + 1.6;
  }

  drawFooter(doc, generatedAt, margin);
  doc.save(fileName);
}
