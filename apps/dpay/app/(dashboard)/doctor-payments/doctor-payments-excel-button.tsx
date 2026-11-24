'use client';

import { useState } from 'react';
import { Button, useToast } from '@archmage/ui';
import { FileSpreadsheet, Loader2 } from 'lucide-react';
import type { BrandedPdfSummaryItem } from '@/lib/report-print/report-excel-branded';
import { downloadDoctorPaymentsExcel } from '@/lib/doctor-payments/doctor-payments-excel';
import type { DoctorPaymentExportRow } from '@/types/doctor-payment';

type DoctorPaymentsExcelButtonProps = {
  /** Fetches all matching rows (not paged), filtered by the date range when one is set. */
  serverData: () => Promise<{
    success: boolean;
    data?: DoctorPaymentExportRow[];
    message?: string;
  }>;
  summaryItems: BrandedPdfSummaryItem[];
};

export function DoctorPaymentsExcelButton({ serverData, summaryItems }: DoctorPaymentsExcelButtonProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleExcelDownload = async () => {
    try {
      setLoading(true);
      const response = await serverData();

      if (!response.success || !response.data?.length) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: response.message || 'No data available',
        });
        return;
      }

      await downloadDoctorPaymentsExcel({
        rows: response.data,
        summaryItems: [
          ...summaryItems,
          { label: 'Records', value: String(response.data.length) },
        ],
      });
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
      type="button"
      variant="outline"
      size="sm"
      className="gap-1.5 h-9 cursor-pointer"
      onClick={handleExcelDownload}
      disabled={loading}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
      Export Excel
    </Button>
  );
}
