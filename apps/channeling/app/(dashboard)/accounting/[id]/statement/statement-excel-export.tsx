'use client';

import { useState } from 'react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { FileSpreadsheet, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/hooks/use-toast';
import { formatExportFileName } from '@/lib/utils';

export type StatementExcelLine = {
  date: string;
  journalNumber: number | null;
  description: string;
  referenceType: string | null;
  referenceId: string | null;
  debitAmount: number;
  creditAmount: number;
  runningBalance: number;
};

type Props = {
  accountName: string;
  accountCode: string | null;
  accountType: string;
  locationName?: string | null;
  doctorLabel?: string | null;
  agencyLabel?: string | null;
  fromDate?: string;
  toDate?: string;
  openingBalance: number;
  closingBalance: number;
  lines: StatementExcelLine[];
  disabled?: boolean;
};

const MONEY_FORMAT = '#,##0.00';

function centsToAmount(cents: number): number {
  return cents / 100;
}

function formatRef(referenceType: string | null, referenceId: string | null): string {
  if (referenceType && referenceId) {
    return `${referenceType}:${String(referenceId).slice(-6)}`;
  }
  return '-';
}

function formatLineDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString();
}

function applyMoneyStyle(row: ExcelJS.Row, startCol: number, endCol: number) {
  for (let col = startCol; col <= endCol; col += 1) {
    const cell = row.getCell(col);
    cell.numFmt = MONEY_FORMAT;
    cell.alignment = { horizontal: 'right' };
  }
}

export function StatementExcelExport({
  accountName,
  accountCode,
  accountType,
  locationName,
  doctorLabel,
  agencyLabel,
  fromDate,
  toDate,
  openingBalance,
  closingBalance,
  lines,
  disabled = false,
}: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    try {
      setLoading(true);

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Statement');
      sheet.columns = [
        { width: 14 },
        { width: 12 },
        { width: 42 },
        { width: 18 },
        { width: 14 },
        { width: 14 },
        { width: 16 },
      ];

      sheet.mergeCells('A1:G1');
      sheet.getCell('A1').value = 'Statement of Account';
      sheet.getCell('A1').font = { bold: true, size: 16 };

      sheet.addRow(['Account', accountName]);
      if (accountCode) sheet.addRow(['Code', accountCode]);
      sheet.addRow(['Type', accountType]);
      if (locationName) sheet.addRow(['Location', locationName]);
      if (doctorLabel) sheet.addRow(['Doctor', doctorLabel]);
      if (agencyLabel) sheet.addRow(['Agency', agencyLabel]);

      const periodParts = [fromDate && `From ${fromDate}`, toDate && `To ${toDate}`].filter(Boolean);
      const period = periodParts.length > 0 ? periodParts.join(' ') : 'All dates';
      sheet.addRow(['Period', period]);
      sheet.addRow([]);

      const openingRow = sheet.addRow(['Opening balance', centsToAmount(openingBalance)]);
      openingRow.getCell(1).font = { bold: true };
      openingRow.getCell(2).numFmt = MONEY_FORMAT;
      openingRow.getCell(2).font = { bold: true };

      const closingMetaRow = sheet.addRow(['Closing balance', centsToAmount(closingBalance)]);
      closingMetaRow.getCell(1).font = { bold: true };
      closingMetaRow.getCell(2).numFmt = MONEY_FORMAT;
      closingMetaRow.getCell(2).font = { bold: true };

      sheet.addRow([]);

      const headerRow = sheet.addRow([
        'Date',
        'Journal #',
        'Description',
        'Ref',
        'Debit',
        'Credit',
        'Balance',
      ]);
      headerRow.font = { bold: true };
      headerRow.getCell(5).alignment = { horizontal: 'right' };
      headerRow.getCell(6).alignment = { horizontal: 'right' };
      headerRow.getCell(7).alignment = { horizontal: 'right' };

      const openingTxnRow = sheet.addRow([
        fromDate ?? '',
        '',
        'Opening balance',
        '',
        null,
        null,
        centsToAmount(openingBalance),
      ]);
      applyMoneyStyle(openingTxnRow, 5, 7);

      for (const line of lines) {
        const row = sheet.addRow([
          formatLineDate(line.date),
          line.journalNumber ?? '-',
          line.description,
          formatRef(line.referenceType, line.referenceId),
          line.debitAmount > 0 ? centsToAmount(line.debitAmount) : null,
          line.creditAmount > 0 ? centsToAmount(line.creditAmount) : null,
          centsToAmount(line.runningBalance),
        ]);
        applyMoneyStyle(row, 5, 7);
      }

      const closingTxnRow = sheet.addRow([
        toDate ?? '',
        '',
        'Closing balance',
        '',
        null,
        null,
        centsToAmount(closingBalance),
      ]);
      closingTxnRow.font = { bold: true };
      applyMoneyStyle(closingTxnRow, 5, 7);

      const slugSource = (accountCode || accountName).replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
      const fileName = `${formatExportFileName(`account-statement-${slugSource}`)}.xlsx`;
      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), fileName);
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to export Excel',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={disabled || loading}
      className="gap-2 cursor-pointer"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
      Excel
    </Button>
  );
}
