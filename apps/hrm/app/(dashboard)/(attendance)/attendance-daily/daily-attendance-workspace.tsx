'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { Button, useToast } from '@archmage/ui';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import { usePermissions } from '@/components/hooks/use-permissions';
import { recomputeAttendanceDaysForDateAction } from '@/app/actions/attendance-actions/attendance-day.actions';
import type {
  DailyAttendanceFilterOptions,
  DailyAttendanceRow,
  DailyAttendanceSummary
} from '@/types/attendance';
import SectionDailyFilters from './section-daily-filters';
import SectionDailyRegister from './section-daily-register';
import SectionDailySummary from './section-daily-summary';

type DailyAttendanceWorkspaceProps = {
  date: string;
  dateLabel: string;
  summary: DailyAttendanceSummary;
  rows: DailyAttendanceRow[];
  totalRecords: number;
  page?: string;
  initialFilters: {
    date?: string;
    institution?: string;
    department?: string;
    room?: string;
    staffCategory?: string;
    designation?: string;
    staffId?: string;
    shiftTypeId?: string;
    status?: string;
  };
  filterOptions: DailyAttendanceFilterOptions;
  onExport: () => Promise<{
    success: boolean;
    message?: string;
    data?: Record<string, unknown>[];
  }>;
};

export default function DailyAttendanceWorkspace({
  date,
  dateLabel,
  summary,
  rows,
  totalRecords,
  page,
  initialFilters,
  filterOptions,
  onExport
}: DailyAttendanceWorkspaceProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { has } = usePermissions();
  const canRefresh = has('attendance', 'edit');
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    const result = await recomputeAttendanceDaysForDateAction(date);
    setRefreshing(false);
    if (result.isError) {
      toast({
        variant: 'destructive',
        title: 'Refresh failed',
        description:
          (result.errors as { message?: string })?.message ??
          'Could not recompute attendance for this date.'
      });
      return;
    }
    toast({
      variant: 'success',
      title: 'Attendance refreshed',
      description: `Recomputed ${result.data?.processed ?? 0} staff for ${dateLabel}.`
    });
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Daily Attendance"
        description={`Operational attendance register for ${dateLabel}.`}
        actions={
          canRefresh ? (
            <Button
              type="button"
              size="sm"
              className="h-9 gap-1.5"
              disabled={refreshing}
              onClick={() => {
                void handleRefresh();
              }}
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
              />
              Refresh Attendance
            </Button>
          ) : null
        }
      />

      <SectionDailySummary summary={summary} />

      <SectionDailyFilters
        filterOptions={filterOptions}
        initial={initialFilters}
      />

      <SectionDailyRegister
        items={rows}
        totalRecords={totalRecords}
        page={page}
        onExport={onExport}
      />
    </div>
  );
}
