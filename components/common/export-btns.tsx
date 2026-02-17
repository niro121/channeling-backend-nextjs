'use client';

import { Button } from '@/components/ui/button';
import { FileText, FileSpreadsheet } from 'lucide-react';

type ExportButtonsProps = {
  onPdfExport: () => Promise<void>;
  onExcelExport?: () => Promise<void>;
};

export const ExportButtons = ({
  onPdfExport,
  onExcelExport
}: ExportButtonsProps) => {
  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={onPdfExport}
        className="gap-2 cursor-pointer"
      >
        <FileText size={16} />
        Download
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={onExcelExport}
        className="gap-2 cursor-pointer"
      >
        <FileSpreadsheet size={16} />
        Excel
      </Button>
    </div>
  );
};
