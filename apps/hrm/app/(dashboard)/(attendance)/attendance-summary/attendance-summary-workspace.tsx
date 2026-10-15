'use client';

import { CommonManagerHeader } from '@/components/common/common-manager-header';
import type {
  AttendanceSummaryCards,
  AttendanceSummaryFilterOptions,
  AttendanceSummaryRow
} from '@/types/attendance';
import {
  AttendanceSummaryUiProvider,
  useAttendanceSummaryUi
} from './attendance-summary-ui-context';
import SectionSummaryCards from './section-summary-cards';
import SectionSummaryFilters from './section-summary-filters';
import SectionSummaryRegister from './section-summary-register';
import SheetSummaryDetail from './sheet-summary-detail';

type AttendanceSummaryWorkspaceProps = {
  fromDate: string;
  toDate: string;
  periodLabel: string;
  cards: AttendanceSummaryCards;
  rows: AttendanceSummaryRow[];
  totalRecords: number;
  page?: string;
  filterOptions: AttendanceSummaryFilterOptions;
  initialFilters: {
    fromDate?: string;
    toDate?: string;
    institution?: string;
    department?: string;
    room?: string;
    staffCategory?: string;
    designation?: string;
    staffId?: string;
    shiftTypeId?: string;
  };
  onExport: () => Promise<{
    success: boolean;
    message?: string;
    data?: Record<string, unknown>[];
  }>;
};

function AttendanceSummaryWorkspaceInner({
  fromDate,
  toDate,
  periodLabel,
  cards,
  rows,
  totalRecords,
  page,
  filterOptions,
  initialFilters,
  onExport
}: AttendanceSummaryWorkspaceProps) {
  const { detailRecord, closeDetail } = useAttendanceSummaryUi();

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Attendance Summary"
        description={`Management overview by staff member for the ${periodLabel} period.`}
      />

      <SectionSummaryCards cards={cards} />

      <SectionSummaryFilters
        filterOptions={filterOptions}
        initial={initialFilters}
      />

      <SectionSummaryRegister
        items={rows}
        totalRecords={totalRecords}
        page={page}
        periodLabel={periodLabel}
        onExport={onExport}
      />

      <SheetSummaryDetail
        open={!!detailRecord}
        record={detailRecord}
        fromDate={fromDate}
        toDate={toDate}
        onOpenChange={(next) => {
          if (!next) closeDetail();
        }}
      />
    </div>
  );
}

export default function AttendanceSummaryWorkspace(
  props: AttendanceSummaryWorkspaceProps
) {
  return (
    <AttendanceSummaryUiProvider>
      <AttendanceSummaryWorkspaceInner {...props} />
    </AttendanceSummaryUiProvider>
  );
}
