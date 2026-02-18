'use client';

import { useState } from 'react';
import { downloadExcelUtil, downloadPdfUtil, formatExportFileName } from '@/lib/utils';
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
  fileName = 'report',
}: ExportWrapperProps<T>) => {
  const { toast } = useToast();
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [loadingExcel, setLoadingExcel] = useState(false);

  // Format the file name with the standard suffix
  const formattedFileName = formatExportFileName(fileName);

  const handlePdfDownload = async () => {
    try {
      setLoadingPdf(true);
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
        fileName: `${formattedFileName}.pdf`
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to export PDF'
      });
    } finally {
      setLoadingPdf(false);
    }
  };

  const handleExcelDownload = async () => {
    try {
      setLoadingExcel(true);
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
        fileName: `${formattedFileName}.xlsx`
      })
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to export Excel'
      });
    } finally {
      setLoadingExcel(false);
    }
  }

  return (
    <ExportButtons
      onPdfExport={handlePdfDownload}
      onExcelExport={handleExcelDownload}
      loadingPdf={loadingPdf}
      loadingExcel={loadingExcel}
    />
  );
};
