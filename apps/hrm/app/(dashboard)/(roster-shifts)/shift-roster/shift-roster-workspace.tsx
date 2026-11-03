'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@archmage/ui';
import {
  copyPreviousMonthRosterAction,
  copyPreviousWeekRosterAction
} from '@/app/actions/roster-actions/shift-roster.actions';
import type {
  LoadRosterParams,
  LoadRosterResult,
  RosterStaffRow
} from '@/types/roster';
import SectionRosterFilters, {
  type RosterFilterValues
} from './section-roster-filters';
import SectionRosterGrid from './section-roster-grid';
import SectionRosterInstructions from './section-roster-instructions';
import SectionRosterSummary from './section-roster-summary';
import SheetRosterAllocationForm from './sheet-roster-allocation-form';
import SheetRosterAllocationHistory from './sheet-roster-allocation-history';
import {
  ShiftRosterUiProvider,
  useShiftRosterUi
} from './shift-roster-ui-context';

type ShiftRosterWorkspaceProps = {
  data: LoadRosterResult;
  initialFilters: LoadRosterParams;
};

function emptyFilters(
  data: LoadRosterResult,
  initialFilters?: LoadRosterParams
): RosterFilterValues {
  return {
    departmentId: initialFilters?.department ?? '',
    unitId: initialFilters?.unit ?? '',
    rosterId: initialFilters?.roster ?? '',
    fromDate: initialFilters?.fromDate ?? data.dayIsos[0] ?? '',
    toDate:
      initialFilters?.toDate ??
      data.dayIsos[data.dayIsos.length - 1] ??
      '',
    staffSearch: initialFilters?.search ?? ''
  };
}

function staffOptionsFromRows(
  rows: RosterStaffRow[]
): Array<{
  id: string;
  name: string;
  staffCode: string;
  department: string;
  unit: string;
  designation: string;
}> {
  return rows.map((row) => ({
    id: row.staffId,
    name: `${row.staffName} (${row.staffCode})`,
    staffCode: row.staffCode,
    department: row.department,
    unit: row.unit,
    designation: row.designation
  }));
}

function ShiftRosterWorkspaceInner({
  data,
  initialFilters
}: ShiftRosterWorkspaceProps) {
  const { toast } = useToast();
  const router = useRouter();
  const {
    formTarget,
    historyRow,
    closeFormSheet,
    closeHistorySheet
  } = useShiftRosterUi();
  const [staffMetaVisible, setStaffMetaVisible] = useState(true);

  const filters = emptyFilters(data, initialFilters);
  const staffOptions = staffOptionsFromRows(data.rows);

  const runCopy = async (
    action: typeof copyPreviousWeekRosterAction,
    fallbackMessage: string,
    payload: {
      department?: string;
      unit?: string;
      roster?: string;
      fromDate: string;
      toDate: string;
    }
  ) => {
    const result = await action(payload);
    if (result.isError) {
      const errorMessage =
        'message' in result.errors
          ? (result.errors.message as string | undefined)
          : undefined;
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage ?? fallbackMessage
      });
      return;
    }
    toast({
      variant: 'success',
      title: 'Success',
      description: `Copied ${result.data?.copied ?? 0} allocation(s).`
    });
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <SectionRosterSummary
        summary={data.summary}
        weekRangeShort={data.weekRangeShort}
      />

      <SectionRosterInstructions />

      <SectionRosterFilters
        initial={filters}
        departmentOptions={data.filterOptions.departments}
        unitOptions={data.filterOptions.units}
        rosterOptions={data.filterOptions.rosters}
        onCopyPreviousWeek={(payload) =>
          void runCopy(
            copyPreviousWeekRosterAction,
            'Could not copy previous week roster.',
            payload
          )
        }
        onCopyPreviousMonth={(payload) =>
          void runCopy(
            copyPreviousMonthRosterAction,
            'Could not copy previous month roster.',
            payload
          )
        }
        staffMetaVisible={staffMetaVisible}
        onHideStaffMeta={() => setStaffMetaVisible(false)}
        onShowStaffMeta={() => setStaffMetaVisible(true)}
      />

      <SectionRosterGrid
        weekLabel={data.weekLabel}
        dayIsos={data.dayIsos}
        rows={data.rows}
        totalRecords={data.totalRecords}
        staffMetaVisible={staffMetaVisible}
        conflicts={data.summary.conflicts}
        shiftTypes={data.shiftTypes}
        periodAudit={data.periodAudit}
      />

      {formTarget ? (
        <SheetRosterAllocationForm
          open
          target={formTarget}
          staffOptions={staffOptions}
          shiftTypes={data.shiftTypes}
          periodFromDate={filters.fromDate}
          periodToDate={filters.toDate}
          rosterValue={filters.rosterId}
          onOpenChange={(next) => {
            if (!next) closeFormSheet();
          }}
        />
      ) : null}

      <SheetRosterAllocationHistory
        open={!!historyRow}
        record={historyRow}
        onOpenChange={(next) => {
          if (!next) closeHistorySheet();
        }}
      />
    </div>
  );
}

export default function ShiftRosterWorkspace(props: ShiftRosterWorkspaceProps) {
  return (
    <ShiftRosterUiProvider>
      <ShiftRosterWorkspaceInner {...props} />
    </ShiftRosterUiProvider>
  );
}
