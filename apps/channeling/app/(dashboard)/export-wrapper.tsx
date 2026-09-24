'use client';

import { useRef, useState } from 'react';
import { formatExportFileName, printPdfUtil } from '@/lib/utils';
import { ExportButtons } from '@/components/common/export-btns';
import { useToast } from '@/components/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  downloadBrandedReportExcel,
  downloadBrandedReportPdf,
  type BrandedPdfSummaryItem,
} from '@/components/common/report-print';

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
  /**
   * When provided, Print uses browser printing (e.g. window.print + ReportPrintLayout)
   * instead of generating a jsPDF document.
   */
  onBrowserPrint?: () => void | Promise<void>;
  /** Optional: custom print handler (PDF generation). When not provided, uses default `printPdfUtil`. */
  customPrintPdf?: (args: {
    title: string;
    data: T[];
    columns: string[];
    keys: (keyof T)[];
  }) => void | Promise<void>;
  /** Optional: custom PDF download handler. When not provided, uses branded hospital PDF. */
  customDownloadPdf?: (args: {
    title: string;
    data: T[];
    columns: string[];
    keys: (keyof T)[];
    fileName?: string;
  }) => void | Promise<void>;
  /**
   * Report Summary cells for branded PDF/Excel download (same structure as print header).
   * Ignored when the matching custom download handler is provided.
   */
  pdfSummaryItems?: BrandedPdfSummaryItem[] | (() => BrandedPdfSummaryItem[]);
  /** Timestamp shown in branded PDF/Excel footer / summary. Defaults to now. */
  pdfGeneratedAt?: string;
  /**
   * Optional: custom Excel download handler.
   * When not provided, uses branded hospital Excel (logo + Report Summary + table).
   */
  customDownloadExcel?: (args: {
    title: string;
    data: T[];
    columns: string[];
    keys: (keyof T)[];
    fileName?: string;
  }) => void | Promise<void>;
  /** Page orientation for branded PDF/Excel when using default handlers. Defaults to landscape. */
  exportOrientation?: 'portrait' | 'landscape';
  /** Smaller fonts/columns for wide portrait exports. */
  compactTable?: boolean;
};

function resolveSummaryItems(
  pdfSummaryItems: BrandedPdfSummaryItem[] | (() => BrandedPdfSummaryItem[]) | undefined,
  generatedAt: string,
  recordCount: number
): BrandedPdfSummaryItem[] {
  const resolved =
    typeof pdfSummaryItems === 'function' ? pdfSummaryItems() : pdfSummaryItems;
  if (resolved?.length) return resolved;
  return [
    { label: 'Generated At', value: generatedAt },
    { label: 'Total Records', value: String(recordCount) },
  ];
}

export const ExportWrapper = <T,>({
  serverData,
  data,
  columns,
  keys,
  title = 'Report',
  fileName = 'report',
  showPrintButton = false,
  onBrowserPrint,
  customPrintPdf,
  customDownloadPdf,
  pdfSummaryItems,
  pdfGeneratedAt,
  customDownloadExcel,
  exportOrientation = 'landscape',
  compactTable = false,
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

      if (onBrowserPrint) {
        await onBrowserPrint();
        return;
      }

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
        const generatedAt = pdfGeneratedAt ?? new Date().toLocaleString();
        await downloadBrandedReportPdf({
          reportName: title,
          summaryItems: resolveSummaryItems(pdfSummaryItems, generatedAt, response.data.length),
          generatedAt,
          data: response.data,
          columns,
          keys,
          fileName: `${formattedFileName}.pdf`,
          orientation: exportOrientation,
          compactTable: compactTable || exportOrientation === 'portrait',
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
        const generatedAt = pdfGeneratedAt ?? new Date().toLocaleString();
        await downloadBrandedReportExcel({
          reportName: title,
          summaryItems: resolveSummaryItems(pdfSummaryItems, generatedAt, response.data.length),
          generatedAt,
          data: response.data,
          columns,
          keys,
          fileName: `${formattedFileName}.xlsx`,
          sheetName: title.slice(0, 31),
          orientation: exportOrientation,
          compactTable: compactTable || exportOrientation === 'portrait',
        });
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
