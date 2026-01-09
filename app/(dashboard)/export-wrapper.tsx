'use client';

import { downloadExcelUtil, downloadPdfUtil } from '@/lib/utils';
import { ExportButtons } from '@/components/common/export-btns';
import { useToast } from '@/components/hooks/use-toast';

export type ExportWrapperProps<T> = {
  serverData: () => Promise<{ success: boolean; data?: T[]; message?: string }>;
  data?: T[];
  columns: string[];
  keys: (keyof T)[];
  title?: string;
  fileName?: string;
};

export const ExportWrapper = <T,>({
  serverData,
  data,
  columns,
  keys,
  title = 'Report',
  fileName = 'report.pdf',
}: ExportWrapperProps<T>) => {
  const { toast } = useToast();

  const handlePdfDownload = async () => {
    const response = await serverData();

    if (!response.success || !response.data?.length) {
      console.error(response.message || 'No data available');
      toast({
        variant: 'destructive',
        title: 'Error',
        description: response.message || 'No data available'
      });
      return;
    }

    downloadPdfUtil({
      title,
      data: response.data,
      columns,
      keys,
      fileName: `${fileName}.pdf`
    });
  };

  const handleExcelDownload = async () => {
    const response = await serverData()

    if (!response.success || !response.data?.length) {
      console.error(response.message || 'No data available');
      toast({
        variant: 'destructive',
        title: 'Error',
        description: response.message || 'No data available'
      });
      return;
    }

    downloadExcelUtil({
      title,
      data: response.data,
      columns,
      keys,
      fileName: `${fileName}.xlsx`
    })
  }

  return (
    <ExportButtons
      onPdfExport={handlePdfDownload}
      onExcelExport={handleExcelDownload}
    />
  );
};
