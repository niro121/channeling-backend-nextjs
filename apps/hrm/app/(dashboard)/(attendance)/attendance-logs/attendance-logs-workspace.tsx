'use client';

import { CommonManagerHeader } from '@/components/common/common-manager-header';
import type {
  AttendanceLogCards,
  AttendanceLogFilterOptions,
  AttendanceLogRecord
} from '@/types/attendance';
import {
  AttendanceLogsUiProvider,
  useAttendanceLogsUi
} from './attendance-logs-ui-context';
import SectionLogCards from './section-log-cards';
import SectionLogFilters from './section-log-filters';
import SectionLogRegister from './section-log-register';
import SheetLogDetail from './sheet-log-detail';
import SheetLogHistory from './sheet-log-history';

type AttendanceLogsWorkspaceProps = {
  periodLabel: string;
  cards: AttendanceLogCards;
  rows: AttendanceLogRecord[];
  totalRecords: number;
  page?: string;
  filterOptions: AttendanceLogFilterOptions;
  initialFilters: {
    fromDate?: string;
    toDate?: string;
    staffSearch?: string;
    department?: string;
    actionType?: string;
    attendanceStatus?: string;
    source?: string;
    performedById?: string;
  };
  onExport: () => Promise<{
    success: boolean;
    message?: string;
    data?: Record<string, unknown>[];
  }>;
};

function AttendanceLogsWorkspaceInner({
  periodLabel,
  cards,
  rows,
  totalRecords,
  page,
  filterOptions,
  initialFilters,
  onExport
}: AttendanceLogsWorkspaceProps) {
  const {
    detailRecord,
    historyRecord,
    closeDetail,
    closeHistory
  } = useAttendanceLogsUi();

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Attendance Log"
        description="Read-only audit history of attendance events, corrections and system actions."
      />

      <SectionLogCards cards={cards} />

      <SectionLogFilters
        filterOptions={filterOptions}
        initial={initialFilters}
      />

      <SectionLogRegister
        items={rows}
        totalRecords={totalRecords}
        page={page}
        periodLabel={periodLabel}
        onExport={onExport}
      />

      <SheetLogDetail
        open={!!detailRecord}
        record={detailRecord}
        onOpenChange={(next) => {
          if (!next) closeDetail();
        }}
      />

      <SheetLogHistory
        open={!!historyRecord}
        record={historyRecord}
        onOpenChange={(next) => {
          if (!next) closeHistory();
        }}
      />
    </div>
  );
}

export default function AttendanceLogsWorkspace(
  props: AttendanceLogsWorkspaceProps
) {
  return (
    <AttendanceLogsUiProvider>
      <AttendanceLogsWorkspaceInner {...props} />
    </AttendanceLogsUiProvider>
  );
}
