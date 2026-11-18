'use client';

import { Suspense } from 'react';
import { useToast } from '@archmage/ui';
import {
  CommonDataTable,
  DataTableExportFeature
} from '@/components/common/common-data-table';
import type {
  BankTransferBatchRecord,
  SalaryFilterOption
} from '@/types/payroll';
import {
  BANK_TRANSFER_EXPORT_COLUMNS,
  BANK_TRANSFER_EXPORT_KEYS,
  bankTransferColumns
} from './columns';
import SectionFilters from './section-filters';

type SectionRegisterProps = {
  records?: BankTransferBatchRecord[];
  totalRecords?: number;
  page?: string;
  departmentOptions?: SalaryFilterOption[];
  batchOptions?: SalaryFilterOption[];
};

export default function SectionRegister({
  records = [],
  totalRecords = 0,
  page,
  departmentOptions = [],
  batchOptions = []
}: SectionRegisterProps) {
  const { toast } = useToast();

  const handleExport = async () => {
    toast({
      title: 'Export',
      description: 'Will be wired in the dynamic phase.'
    });
    return {
      success: false,
      message: 'Export will be wired in the dynamic phase.'
    };
  };

  return (
    <div className="space-y-4">
      <SectionFilters
        departmentOptions={departmentOptions}
        batchOptions={batchOptions}
      />

      <Suspense
        fallback={
          <div className="rounded-lg border border-border bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
            Loading bank transfer batches...
          </div>
        }
      >
        <CommonDataTable
          heading="Payroll Transfer Batches"
          subHeading="Bank transfer batches generated from approved payroll runs."
          columns={bankTransferColumns}
          data={records}
          rowCount={totalRecords}
          page={page}
          showPagination
          toolbarRight={
            <DataTableExportFeature
              showColumnToggle
              showPrintButton
              serverData={handleExport}
              columns={[...BANK_TRANSFER_EXPORT_COLUMNS]}
              keys={[...BANK_TRANSFER_EXPORT_KEYS]}
              title="Bank Transfer Batches"
              fileName="bank-transfer-batches"
            />
          }
        />
      </Suspense>
    </div>
  );
}
