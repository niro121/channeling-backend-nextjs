'use client';

/**
 * User Activity Report — PDF ONLY (A4 portrait, matches Print).
 * Columns: No. | Date | User | Activity (Action / Type / ID) | Meta (IP / Imp)
 */

import jsPDF from 'jspdf';
import autoTable, { type RowInput } from 'jspdf-autotable';
import {
  RUHUNU_HOSPITAL_LOGO_SRC,
  RUHUNU_PRINT_BRAND_NAME,
  type BrandedPdfSummaryItem,
} from '@/components/common/report-print';
import type { ExportUserActivityData } from '@/types/report';

const COL_PERCENTS = [5, 14, 16, 42, 23] as const;

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

  let cursorY = boxTop + padY;
  const fullWidthItems = items.filter((i) => i.fullWidth);
  const gridItems = items.filter((i) => !i.fullWidth);

  for (const item of fullWidthItems) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(85, 85, 85);
    doc.text(item.label.toUpperCase(), margin + padX, cursorY + 2);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    const lines = doc.splitTextToSize(item.value || '—', contentWidth - padX * 2);
    doc.text(lines, margin + padX, cursorY + 5.5);
    cursorY += Math.max(9, 5.5 + lines.length * 3.2);
  }

  if (gridItems.length) {
    const cols = Math.min(3, gridItems.length);
    const colW = (contentWidth - padX * 2) / cols;
    let maxRows = 1;
    gridItems.forEach((item, i) => {
      const col = i % cols;
      const rowIdx = Math.floor(i / cols);
      const x = margin + padX + col * colW;
      const baseY = cursorY + rowIdx * 9;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(85, 85, 85);
      doc.text(item.label.toUpperCase(), x, baseY + 2);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      const lines = doc.splitTextToSize(item.value || '—', colW - 2);
      doc.text(lines, x, baseY + 5.5);
      maxRows = Math.max(maxRows, rowIdx + 1);
    });
    cursorY += maxRows * 9;
  }

  const boxH = Math.max(10, cursorY - boxTop + padY);
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

function display(value: string | undefined | null): string {
  if (value == null || value === '' || value === '-') return '—';
  return value;
}

function isNoteRow(row: ExportUserActivityData): boolean {
  return !row.createdAt && row.action.toLowerCase().startsWith('note:');
}

function splitDateTime(createdAt: string): { date: string; time: string } {
  const m = createdAt.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})/);
  if (m) return { date: m[1], time: m[2] };
  if (!createdAt) return { date: '—', time: '' };
  return { date: createdAt, time: '' };
}

type LabeledLine = { label: string; value: string };

function activityLines(row: ExportUserActivityData): LabeledLine[] {
  return [
    { label: 'Action', value: display(row.action) },
    { label: 'Type', value: display(row.entityType) },
    { label: 'ID', value: display(row.entityId) },
  ];
}

function metaLines(row: ExportUserActivityData): LabeledLine[] {
  return [
    { label: 'IP', value: display(row.ipAddress) },
    { label: 'Imp', value: display(row.importance) },
  ];
}

function labeledHeightText(lines: LabeledLine[]): string {
  return lines.map((l) => `${l.label} ${l.value}`).join('\n');
}

type CellMeta = {
  uaActivity?: LabeledLine[];
  uaMeta?: LabeledLine[];
};

export type DownloadUserActivityPdfOptions = {
  reportName: string;
  summaryItems: BrandedPdfSummaryItem[];
  generatedAt: string;
  rows: ExportUserActivityData[];
  fileName?: string;
};

export async function downloadUserActivityReportPdf({
  reportName,
  summaryItems,
  generatedAt,
  rows,
  fileName = 'user-activity-report.pdf',
}: DownloadUserActivityPdfOptions): Promise<void> {
  const margin = 8;
  const doc = new jsPDF({ orientation: 'p', format: 'a4' });
  const { width: pageWidth } = pageSize(doc);
  const tableWidth = pageWidth - margin * 2;

  const startY = await drawHeader(doc, { reportName, summaryItems, margin });

  const columnStyles: Record<
    number,
    Partial<{ cellWidth: number; halign: 'left' | 'right' | 'center' }>
  > = {};
  COL_PERCENTS.forEach((pct, i) => {
    columnStyles[i] = {
      cellWidth: (tableWidth * pct) / 100,
      halign: i === 0 ? 'center' : 'left',
    };
  });

  let dataIndex = 0;
  const body: RowInput[] = rows.map((r) => {
    if (isNoteRow(r)) {
      return ['', r.action, '', '', ''];
    }
    dataIndex += 1;
    const { date, time } = splitDateTime(r.createdAt);
    return [
      String(dataIndex),
      time ? `${date}\n${time}` : date,
      display(r.userName),
      labeledHeightText(activityLines(r)),
      labeledHeightText(metaLines(r)),
    ];
  });

  autoTable(doc, {
    head: [['No.', 'Date', 'User', 'Activity', 'Meta']],
    body,
    startY,
    margin: { left: margin, right: margin, bottom: 12 },
    tableWidth,
    showHead: 'everyPage',
    styles: {
      font: 'helvetica',
      fontSize: 6,
      cellPadding: { top: 0.8, right: 0.7, bottom: 0.8, left: 0.7 },
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
      fontSize: 5.75,
      valign: 'middle',
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
    },
    columnStyles,
    didParseCell: (hook) => {
      if (hook.section !== 'body') return;
      const row = rows[hook.row.index];
      if (!row) return;
      if (isNoteRow(row)) {
        hook.cell.styles.fontStyle = 'italic';
        hook.cell.styles.fillColor = [243, 243, 243];
        if (hook.column.index === 1) {
          hook.cell.colSpan = 4;
        } else if (hook.column.index > 1) {
          hook.cell.text = [];
        }
        return;
      }
      if (hook.column.index === 3) {
        (hook.cell as typeof hook.cell & CellMeta).uaActivity = activityLines(row);
      }
      if (hook.column.index === 4) {
        (hook.cell as typeof hook.cell & CellMeta).uaMeta = metaLines(row);
      }
    },
    willDrawCell: (hook) => {
      const meta = hook.cell as typeof hook.cell & CellMeta;
      if (meta.uaActivity || meta.uaMeta) {
        hook.cell.text = [];
      }
    },
    didDrawCell: (hook) => {
      const meta = hook.cell as typeof hook.cell & CellMeta;
      const lines = meta.uaActivity ?? meta.uaMeta;
      if (!lines?.length) return;

      const padX = Number(hook.cell.padding('left') ?? 0.7);
      const padY = Number(hook.cell.padding('top') ?? 0.8);
      const fontSize = Number(hook.cell.styles.fontSize ?? 6);
      const lineH = fontSize * 0.4;
      const maxW = hook.cell.width - padX - Number(hook.cell.padding('right') ?? 0.7);
      let y = hook.cell.y + padY + fontSize * 0.28;

      doc.setTextColor(0, 0, 0);
      for (const { label, value } of lines) {
        const labelText = `${label} `;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(fontSize);
        const labelW = doc.getTextWidth(labelText);
        doc.text(labelText, hook.cell.x + padX, y);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(fontSize);
        const valueLines = doc.splitTextToSize(value || '—', Math.max(4, maxW - labelW));
        doc.text(valueLines, hook.cell.x + padX + labelW, y);
        y += lineH * Math.max(1, valueLines.length);
      }
    },
  });

  drawFooter(doc, generatedAt, margin);
  doc.save(fileName);
}
