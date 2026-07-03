'use client';

import { Button } from '@/components/ui/button';
import { FileText, FileSpreadsheet, Loader2, Printer } from 'lucide-react';

type ExportButtonsProps = {
  onPdfExport: () => Promise<void>;
  onExcelExport?: () => Promise<void>;
  onPrintExport?: () => void | Promise<void>;
  loadingPdf?: boolean;
  loadingExcel?: boolean;
  loadingPrint?: boolean;
  /** When true, shows the Print button (optional for backwards compatibility) */
  showPrintButton?: boolean;
};

export const ExportButtons = ({
  onPdfExport,
  onExcelExport,
  onPrintExport,
  loadingPdf = false,
  loadingExcel = false,
  loadingPrint = false,
  showPrintButton = false
}: ExportButtonsProps) => {
  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={onPdfExport}
        disabled={loadingPdf || loadingExcel || loadingPrint}
        className="gap-2 cursor-pointer"
      >
        {loadingPdf ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <FileText size={16} />
        )}
        PDF
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={onExcelExport}
        disabled={loadingPdf || loadingExcel || loadingPrint}
        className="gap-2 cursor-pointer"
      >
        {loadingExcel ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <FileSpreadsheet size={16} />
        )}
        Excel
      </Button>

      {showPrintButton && (
        <Button
          variant="outline"
          size="sm"
          onClick={onPrintExport}
          disabled={loadingPdf || loadingExcel || loadingPrint}
          className="gap-2 cursor-pointer"
        >
          {loadingPrint ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Printer size={16} />
          )}
          Print
        </Button>
      )}
    </div>
  );
};
