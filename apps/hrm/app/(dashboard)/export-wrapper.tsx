'use client';

import { useRef, useState } from 'react';
import { downloadExcelUtil, downloadPdfUtil, formatExportFileName, printPdfUtil } from '@/lib/utils/export-wrapper-utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  ExportButtons,
  useToast,
} from '@archmage/ui';

export type ExportServerResult<T> = {
  success: boolean;
  data?: T[];
  message?: string;
  /** Full match count. When greater than exportLimit, the file contains only exportLimit rows. */
  totalRecords?: number;
  exportLimit?: number;
  limited?: boolean;
};

export type ExportWrapperProps<T> = {
  serverData: () => Promise<ExportServerResult<T>>;
  data?: T[];
  columns: string[];
  keys: (keyof T)[];
  title?: string;
  fileName?: string;
  /** When true, shows the Print button (optional; wrapper is used in other components) */
  showPrintButton?: boolean;
  /** Optional: custom print handler (PDF generation). When not provided, uses default `printPdfUtil`. */
  customPrintPdf?: (args: {
    title: string;
    data: T[];
    columns: string[];
    keys: (keyof T)[];
  }) => void | Promise<void>;
  /** Optional: custom PDF download handler. When not provided, uses default `downloadPdfUtil`. */
  customDownloadPdf?: (args: {
    title: string;
    data: T[];
    columns: string[];
    keys: (keyof T)[];
    fileName?: string;
  }) => void | Promise<void>;
  /** Optional: custom Excel download handler. When not provided, uses default `downloadExcelUtil`. */
  customDownloadExcel?: (args: {
    title: string;
    data: T[];
    columns: string[];
    keys: (keyof T)[];
    fileName?: string;
  }) => void | Promise<void>;
};

export const ExportWrapper = <T,>({
  serverData,
  data,
  columns,
  keys,
  title = 'Report',
  fileName = 'report',
  showPrintButton = false,
  customPrintPdf,
  customDownloadPdf,
  customDownloadExcel
}: ExportWrapperProps<T>) => {
  const { toast } = useToast();
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [loadingExcel, setLoadingExcel] = useState(false);
  const [loadingPrint, setLoadingPrint] = useState(false);
  const [limitNotice, setLimitNotice] = useState<{
    totalRecords: number;
    exportLimit: number;
    resolve: (accepted: boolean) => void;
  } | null>(null);
  const limitAcceptedRef = useRef(false);

  const confirmLimitedExport = (response: ExportServerResult<T>) => {
    if (!response.limited) return Promise.resolve(true);
    limitAcceptedRef.current = false;
    return new Promise<boolean>((resolve) => {
      setLimitNotice({
        totalRecords: response.totalRecords ?? response.data?.length ?? 0,
        exportLimit: response.exportLimit ?? response.data?.length ?? 0,
        resolve,
      });
    });
  };

  const settleLimitNotice = (accepted: boolean) => {
    setLimitNotice((current) => {
      current?.resolve(accepted);
      return null;
    });
  };

  // Format the file name with the standard suffix
  const formattedFileName = formatExportFileName(fileName);

  const handlePrint = async () => {
    try {
      setLoadingPrint(true);
      const response = await serverData();

      if (!response.success || !response.data?.length) {
        toast({
          variant: 'destructive',
          title: 'No data to print',
          description: response.message || 'No data available for printing'
        });
        return;
      }

      if (!(await confirmLimitedExport(response))) return;

      if (customPrintPdf) {
        await customPrintPdf({
          title,
          data: response.data,
          columns,
          keys
        });
      } else {
        printPdfUtil({
          title,
          data: response.data,
          columns,
          keys
        });
      }
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to print'
      });
    } finally {
      setLoadingPrint(false);
    }
  };

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

      if (!(await confirmLimitedExport(response))) return;

      if (customDownloadPdf) {
        await customDownloadPdf({
          title,
          data: response.data,
          columns,
          keys,
          fileName: `${formattedFileName}.pdf`
        });
      } else {
        downloadPdfUtil({
          title,
          data: response.data,
          columns,
          keys,
          fileName: `${formattedFileName}.pdf`
        });
      }
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

      if (!(await confirmLimitedExport(response))) return;

      if (customDownloadExcel) {
        await customDownloadExcel({
          title,
          data: response.data,
          columns,
          keys,
          fileName: `${formattedFileName}.xlsx`
        });
      } else {
        downloadExcelUtil({
          title,
          data: response.data,
          columns,
          keys,
          fileName: `${formattedFileName}.xlsx`
        })
      }
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

  const limitTotal = (limitNotice?.totalRecords ?? 0).toLocaleString();
  const limitCap = (limitNotice?.exportLimit ?? 0).toLocaleString();

  return (
    <>
      <ExportButtons
        onPdfExport={handlePdfDownload}
        onExcelExport={handleExcelDownload}
        onPrintExport={handlePrint}
        loadingPdf={loadingPdf}
        loadingExcel={loadingExcel}
        loadingPrint={loadingPrint}
        showPrintButton={showPrintButton}
      />
      <AlertDialog
        open={limitNotice != null}
        onOpenChange={(open) => {
          if (!open) settleLimitNotice(limitAcceptedRef.current);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Export is limited to {limitCap} records</AlertDialogTitle>
            <AlertDialogDescription>
              There are {limitTotal} matching records. This file includes only the {limitCap} most
              recently added. Download it anyway?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="cursor-pointer"
              onClick={() => {
                limitAcceptedRef.current = true;
              }}
            >
              Download
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
