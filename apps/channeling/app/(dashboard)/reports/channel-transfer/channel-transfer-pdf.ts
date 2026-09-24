'use client';

/**
 * Channel Transfer — PDF ONLY (A4 portrait cards matching Print).
 * Header uses shared drawBrandedPdfHeader.
 */

import jsPDF from 'jspdf';
import {
  drawBrandedPdfHeader,
  type BrandedPdfSummaryItem,
} from '@/components/common/report-print';
import type { ChannelTransferReportExportRow } from '@/types/reports/channel-transfer';
import {
  mapChannelTransferCompactFromExportRow,
  type ChannelTransferCompactCard,
} from './channel-transfer-export-config';

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

function estimateCardHeight(
  doc: jsPDF,
  card: ChannelTransferCompactCard,
  contentWidth: number
): number {
  const valueWidth = contentWidth - 18;
  const lines = (text: string, fontSize: number) => {
    doc.setFontSize(fontSize);
    return doc.splitTextToSize(text, valueWidth).length;
  };
  const metaTop = card.meta
    .filter((f) => f.label === 'New Appt' || f.label === 'From Sess')
    .map((f) => `${f.label} ${f.value}`)
    .join('   ');
  const metaBottom = card.meta
    .filter((f) => f.label === 'To Sess' || f.label === 'To Doctor')
    .map((f) => `${f.label} ${f.value}`)
    .join('   ');

  let h = 4; // head
  h += 1.2 + lines(`Booking ${card.bookingId}  Receipt: ${card.receiptId}  Remarks: ${card.remarks}`, 6.5) * 3;
  h += 1.2 + lines(card.fromLine, 6.5) * 3;
  h += 1.2 + lines(card.toLine, 6.5) * 3;
  h += 1.5 + lines(metaTop, 6.25) * 2.8;
  h += 1.2 + lines(metaBottom, 6.25) * 2.8;
  h += 3; // padding/border
  return h;
}

function drawLabeledRow(
  doc: jsPDF,
  opts: {
    x: number;
    y: number;
    label: string;
    value: string;
    contentWidth: number;
    mono?: boolean;
  }
): number {
  const { x, y, label, value, contentWidth, mono } = opts;
  const labelW = 16;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.75);
  doc.setTextColor(68, 68, 68);
  doc.text(label.toUpperCase(), x, y + 2.2);

  doc.setFont('helvetica', mono ? 'bold' : 'normal');
  if (mono) doc.setFont('courier', 'bold');
  doc.setFontSize(mono ? 6.5 : 6.75);
  doc.setTextColor(0, 0, 0);
  const lines = doc.splitTextToSize(value, contentWidth - labelW - 2);
  doc.text(lines, x + labelW, y + 2.2);
  return Math.max(3.2, lines.length * (mono ? 2.8 : 3) + 0.6);
}

function drawCard(
  doc: jsPDF,
  card: ChannelTransferCompactCard,
  opts: { x: number; y: number; width: number }
): number {
  const { x, y, width } = opts;
  const pad = 1.4;
  const startY = y;

  // Measure first by drawing off-screen? Better: draw then get height from cursor.
  let cy = y + pad + 0.4;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.25);
  doc.setTextColor(0, 0, 0);
  doc.text(card.when, x + pad, cy + 2);
  const whenW = doc.getTextWidth(card.when);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.75);
  doc.text(card.by, x + pad + whenW + 2.5, cy + 2);
  cy += 3.6;

  doc.setDrawColor(153, 153, 153);
  doc.setLineWidth(0.2);
  doc.line(x + pad, cy, x + width - pad, cy);
  cy += 1.2;

  cy += drawLabeledRow(doc, {
    x: x + pad,
    y: cy,
    label: 'Booking',
    value: `${card.bookingId}   Receipt: ${card.receiptId}   Remarks: ${card.remarks}`,
    contentWidth: width - pad * 2,
    mono: true,
  });
  cy += drawLabeledRow(doc, {
    x: x + pad,
    y: cy,
    label: 'From',
    value: card.fromLine,
    contentWidth: width - pad * 2,
  });
  cy += drawLabeledRow(doc, {
    x: x + pad,
    y: cy,
    label: 'To',
    value: card.toLine,
    contentWidth: width - pad * 2,
  });

  cy += 0.6;
  doc.setDrawColor(187, 187, 187);
  doc.setLineWidth(0.15);
  doc.line(x + pad, cy, x + width - pad, cy);
  cy += 1;

  const metaTop = card.meta.filter(
    (f) => f.label === 'New Appt' || f.label === 'From Sess'
  );
  const metaBottom = card.meta.filter(
    (f) => f.label === 'To Sess' || f.label === 'To Doctor'
  );
  const valueX = x + pad + 16;
  const valueW = width - pad * 2 - 16;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.75);
  doc.setTextColor(68, 68, 68);
  doc.text('META', x + pad, cy + 2.2);

  const drawMetaLine = (fields: typeof metaTop, lineY: number): number => {
    let cursorX = valueX;
    let maxH = 2.8;
    for (const field of fields) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.75);
      doc.setTextColor(68, 68, 68);
      const label = `${field.label.toUpperCase()} `;
      doc.text(label, cursorX, lineY + 2.2);
      cursorX += doc.getTextWidth(label);

      doc.setFont('courier', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(0, 0, 0);
      const remain = Math.max(8, valueX + valueW - cursorX);
      const lines = doc.splitTextToSize(field.value, remain);
      doc.text(lines, cursorX, lineY + 2.2);
      const blockW = doc.getTextWidth(String(lines[0] ?? '')) + 3.5;
      cursorX += blockW;
      maxH = Math.max(maxH, lines.length * 2.8);
      if (cursorX > valueX + valueW - 10) break;
    }
    return maxH + 0.4;
  };

  cy += drawMetaLine(metaTop, cy);
  cy += drawMetaLine(metaBottom, cy);

  cy += pad;
  const height = cy - startY;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.35);
  doc.rect(x, startY, width, height);

  return height + 1.4;
}

export type DownloadChannelTransferPdfOptions = {
  reportName: string;
  summaryItems: BrandedPdfSummaryItem[];
  generatedAt: string;
  rows: ChannelTransferReportExportRow[];
  fileName?: string;
};

export async function downloadChannelTransferReportPdf({
  reportName,
  summaryItems,
  generatedAt,
  rows,
  fileName = 'channel-transfer-report.pdf',
}: DownloadChannelTransferPdfOptions): Promise<void> {
  const margin = 10;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const { height: pageHeight } = pageSize(doc);
  const contentWidth = pageSize(doc).width - margin * 2;
  const bottomLimit = pageHeight - 12;

  let y = await drawBrandedPdfHeader(doc, { reportName, summaryItems, margin });

  for (const row of rows) {
    const card = mapChannelTransferCompactFromExportRow(row);
    const needed = estimateCardHeight(doc, card, contentWidth);
    if (y + needed > bottomLimit) {
      doc.addPage();
      y = margin;
    }
    y += drawCard(doc, card, { x: margin, y, width: contentWidth });
  }

  drawFooter(doc, generatedAt, margin);
  doc.save(fileName);
}
