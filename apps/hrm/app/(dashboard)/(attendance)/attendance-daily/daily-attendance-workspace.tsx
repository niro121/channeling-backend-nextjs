'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, RefreshCw } from 'lucide-react';
import { Button, CustomAlertDialog, useToast } from '@archmage/ui';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import { usePermissions } from '@/components/hooks/use-permissions';
import { recomputeAttendanceDaysForDateAction } from '@/app/actions/attendance-actions/attendance-day.actions';
import { confirmAttendanceDateToRosterAction } from '@/app/actions/attendance-actions/attendance-confirm-roster.actions';
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
  const canEdit = has('attendance', 'edit');
  const [refreshing, setRefreshing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const eligibleCount = rows.filter((r) => r.canConfirmToRoster).length;

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

  const handleBulkConfirm = async () => {
    setConfirming(true);
    const result = await confirmAttendanceDateToRosterAction(date);
    setConfirming(false);
    setConfirmOpen(false);
    if (result.isError || !result.data) {
      toast({
        variant: 'destructive',
        title: 'Confirm failed',
        description:
          (result.errors as { message?: string })?.message ??
          'Could not confirm attendance to duty roster.'
      });
      return;
    }
    toast({
      variant: 'success',
      title: 'Confirm to Duty Roster',
      description: `Confirmed ${result.data.confirmed} · skipped ${result.data.skipped} · failed ${result.data.failed} for ${dateLabel}.`
    });
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Daily Attendance"
        description={`Operational attendance register for ${dateLabel}.`}
        actions={
          canEdit ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
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
              <Button
                type="button"
                size="sm"
                className="h-9 gap-1.5"
                disabled={confirming}
                onClick={() => setConfirmOpen(true)}
              >
                <CheckCircle2 className="h-4 w-4" />
                Confirm to Duty Roster
              </Button>
            </div>
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

      <CustomAlertDialog
        open={confirmOpen}
        handleVisibilityChange={setConfirmOpen}
        loading={confirming}
        title="Confirm to Duty Roster"
        description={`Copy eligible attendance statuses for ${dateLabel} onto duty roster cells (present / late / absent). Missing punches, leave, and off days are skipped. This page shows ${eligibleCount} eligible of ${rows.length} loaded rows; all days for the date will be processed.`}
        handleContinue={() => {
          void handleBulkConfirm();
        }}
      />
    </div>
  );
}
