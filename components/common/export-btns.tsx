'use client';

import { Button } from '@/components/ui/button';
import { FileText, FileSpreadsheet, Loader2 } from 'lucide-react';

type ExportButtonsProps = {
  onPdfExport: () => Promise<void>;
  onExcelExport?: () => Promise<void>;
  loadingPdf?: boolean;
  loadingExcel?: boolean;
};

export const ExportButtons = ({
  onPdfExport,
  onExcelExport,
  loadingPdf = false,
  loadingExcel = false
}: ExportButtonsProps) => {
  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={onPdfExport}
        disabled={loadingPdf || loadingExcel}
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
        disabled={loadingPdf || loadingExcel}
        className="gap-2 cursor-pointer"
      >
        {loadingExcel ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <FileSpreadsheet size={16} />
        )}
        Excel
      </Button>
    </div>
  );
};
