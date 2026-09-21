'use client';

/**
 * Daily Returns Summary — PDF ONLY (A4 portrait, matches Print).
 * Columns: No. | Receipt Type | Count | Methods (2-part) | Float Total
 */

import jsPDF from 'jspdf';
import autoTable, { type RowInput } from 'jspdf-autotable';
import {
  RUHUNU_HOSPITAL_LOGO_SRC,
  RUHUNU_PRINT_BRAND_NAME,
  type BrandedPdfSummaryItem,
} from '@/components/common/report-print';
import type { DailyReturnsSummaryReportExportRow } from '@/types/reports/daily-returns-summary';

const COL_PERCENTS = [5, 26, 10, 42, 17] as const;

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

/** Two-part Methods cell matching print (left + right columns). */
function methodsText(row: DailyReturnsSummaryReportExportRow): string {
  const left = [
    `Cash ${row.cash}`,
    `Card ${row.creditCard}`,
    `Slip ${row.slip}`,
    `Cheque ${row.cheque}`,
  ];
  const right = [
    `E-Wallet ${row.eWallet}`,
    `Agent ${row.agent}`,
    `Credit ${row.credit}`,
  ];
  const pad = 22;
  const lines: string[] = [];
  const max = Math.max(left.length, right.length);
  for (let i = 0; i < max; i += 1) {
    const L = (left[i] ?? '').padEnd(pad, ' ');
    const R = right[i] ?? '';
    lines.push(R ? `${L}${R}` : left[i] ?? '');
  }
  return lines.join('\n');
}

function isTotalRow(row: DailyReturnsSummaryReportExportRow): boolean {
  return /^sub\s*total$/i.test(row.method.trim());
}

export type DownloadDailyReturnsSummaryPdfOptions = {
  reportName: string;
  summaryItems: BrandedPdfSummaryItem[];
  generatedAt: string;
  rows: DailyReturnsSummaryReportExportRow[];
  fileName?: string;
};

export async function downloadDailyReturnsSummaryReportPdf({
  reportName,
  summaryItems,
  generatedAt,
  rows,
  fileName = 'daily-returns-summary.pdf',
}: DownloadDailyReturnsSummaryPdfOptions): Promise<void> {
  const margin = 8;
  const doc = new jsPDF({ orientation: 'p', format: 'a4' });
  const { width: pageWidth } = pageSize(doc);
  const tableWidth = pageWidth - margin * 2;

  const startY = await drawHeader(doc, { reportName, summaryItems, margin });

  const dataRows = rows.filter((r) => !isTotalRow(r));
  const totalFromExport = rows.find(isTotalRow);

  const totals = totalFromExport
    ? totalFromExport
    : dataRows.reduce(
        (acc, r) => {
          const add = (s: string) => Number(String(s).replace(/,/g, '')) || 0;
          acc.count = String(Number(acc.count) + Number(r.count || 0));
          acc.cash = String(add(acc.cash) + add(r.cash));
          acc.creditCard = String(add(acc.creditCard) + add(r.creditCard));
          acc.slip = String(add(acc.slip) + add(r.slip));
          acc.cheque = String(add(acc.cheque) + add(r.cheque));
          acc.eWallet = String(add(acc.eWallet) + add(r.eWallet));
          acc.agent = String(add(acc.agent) + add(r.agent));
          acc.credit = String(add(acc.credit) + add(r.credit));
          acc.floatTotal = String(add(acc.floatTotal) + add(r.floatTotal));
          return acc;
        },
        {
          method: 'Sub Total',
          count: '0',
          cash: '0',
          creditCard: '0',
          slip: '0',
          cheque: '0',
          eWallet: '0',
          agent: '0',
          credit: '0',
          floatTotal: '0',
        } as DailyReturnsSummaryReportExportRow
      );

  const fmt = (n: string) => {
    const num = Number(String(n).replace(/,/g, ''));
    if (!Number.isFinite(num)) return n;
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const normalizedTotal: DailyReturnsSummaryReportExportRow = totalFromExport
    ? totalFromExport
    : {
        ...totals,
        cash: fmt(totals.cash),
        creditCard: fmt(totals.creditCard),
        slip: fmt(totals.slip),
        cheque: fmt(totals.cheque),
        eWallet: fmt(totals.eWallet),
        agent: fmt(totals.agent),
        credit: fmt(totals.credit),
        floatTotal: fmt(totals.floatTotal),
      };

  const body: RowInput[] = [
    ...dataRows.map((r, i) => [
      String(i + 1),
      r.method || '—',
      r.count || '0',
      methodsText(r),
      r.floatTotal || '0.00',
    ]),
    [
      '',
      'Sub Total',
      normalizedTotal.count,
      methodsText(normalizedTotal),
      normalizedTotal.floatTotal,
    ],
  ];

  const columnStyles: Record<
    number,
    Partial<{ cellWidth: number; halign: 'left' | 'right' | 'center' }>
  > = {};
  COL_PERCENTS.forEach((pct, i) => {
    columnStyles[i] = {
      cellWidth: (tableWidth * pct) / 100,
      halign: i === 0 || i === 2 ? 'center' : i === 4 ? 'right' : 'left',
    };
  });

  autoTable(doc, {
    head: [['No.', 'Receipt Type', 'Count', 'Methods', 'Float Total']],
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
      if (hook.row.index === body.length - 1) {
        hook.cell.styles.fontStyle = 'bold';
        hook.cell.styles.fillColor = [243, 243, 243];
      }
    },
  });

  drawFooter(doc, generatedAt, margin);
  doc.save(fileName);
}
