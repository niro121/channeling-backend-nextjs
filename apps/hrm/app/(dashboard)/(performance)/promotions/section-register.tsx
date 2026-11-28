'use client';

import { Suspense } from 'react';
import {
  CommonDataTable,
  DataTableExportFeature
} from '@/components/common/common-data-table';
import {
  PROMOTION_STATUS_LABELS,
  PROMOTION_TYPE_LABELS,
  type PerformanceSelectOption,
  type PromotionFilters,
  type PromotionRecord
} from '@/types/performance';
import {
  PROMOTION_EXPORT_COLUMNS,
  PROMOTION_EXPORT_KEYS,
  promotionColumns
} from './columns';
import SectionFilters from './section-filters';

type PromotionExportRow = Record<
  (typeof PROMOTION_EXPORT_KEYS)[number],
  string
>;

type SectionRegisterProps = {
  records?: PromotionRecord[];
  totalRecords?: number;
  page?: string;
  initialFilters?: PromotionFilters;
  institutionOptions?: PerformanceSelectOption[];
  departmentOptions?: PerformanceSelectOption[];
  currentDesignationOptions?: PerformanceSelectOption[];
  proposedDesignationOptions?: PerformanceSelectOption[];
};

export default function SectionRegister({
  records = [],
  totalRecords = 0,
  page,
  initialFilters = {},
  institutionOptions = [],
  departmentOptions = [],
  currentDesignationOptions = [],
  proposedDesignationOptions = []
}: SectionRegisterProps) {
  // UI preview: exports the rows currently held in memory. Replace with a
  // server export (re-query by filters) when the data is dynamic.
  const handleExport = async (): Promise<{
    success: boolean;
    data?: PromotionExportRow[];
    message?: string;
  }> => {
    if (records.length === 0) {
      return { success: false, message: 'No promotion requests found' };
    }

    return {
      success: true,
      data: records.map((row) => ({
        requestId: row.requestId,
        staffCode: row.staffCode,
        staffName: row.staffName,
        department: row.department,
        currentDesignation: row.currentDesignation,
        proposedDesignation: row.proposedDesignation,
        currentGrade: row.currentGrade,
        proposedGrade: row.proposedGrade,
        requestedBy: row.requestedBy,
        requestDate: row.requestDate,
        effectiveDate: row.effectiveDate,
        promotionType: PROMOTION_TYPE_LABELS[row.promotionType],
        approvalStatus: PROMOTION_STATUS_LABELS[row.approvalStatus]
      }))
    };
  };

  return (
    <div className="space-y-4">
      <SectionFilters
        initial={initialFilters}
        institutionOptions={institutionOptions}
        departmentOptions={departmentOptions}
        currentDesignationOptions={currentDesignationOptions}
        proposedDesignationOptions={proposedDesignationOptions}
      />

      <Suspense
        fallback={
          <div className="rounded-lg border border-border bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
            Loading promotion requests...
          </div>
        }
      >
        <CommonDataTable
          heading="Promotion Request Register"
          subHeading={`${totalRecords} ${totalRecords === 1 ? 'record' : 'records'}`}
          columns={promotionColumns}
          data={records}
          rowCount={totalRecords}
          page={page}
          showPagination
          toolbarRight={
            <DataTableExportFeature
              showColumnToggle
              showPrintButton
              serverData={handleExport}
              columns={[...PROMOTION_EXPORT_COLUMNS]}
              keys={[...PROMOTION_EXPORT_KEYS]}
              title="Promotion Requests"
              fileName="promotion-requests"
            />
          }
        />
      </Suspense>
    </div>
  );
}
