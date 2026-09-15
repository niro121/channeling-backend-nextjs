'use client';

import { useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
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
    toDate: initialFilters?.toDate ?? data.dayIsos[data.dayIsos.length - 1] ?? '',
    staffSearch: initialFilters?.search ?? ''
  };
}

function staffOptionsFromRows(
  rows: RosterStaffRow[]
): Array<{ id: string; name: string; staffCode: string; department: string; unit: string; designation: string }> {
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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const {
    formTarget,
    historyRow,
    closeFormSheet,
    closeHistorySheet
  } = useShiftRosterUi();
  const [draftFilters, setDraftFilters] = useState<RosterFilterValues>(() =>
    emptyFilters(data, initialFilters)
  );
  const [staffMetaVisible, setStaffMetaVisible] = useState(true);

  const staffOptions = staffOptionsFromRows(data.rows);
  const workflowPayload = {
    department: draftFilters.departmentId || undefined,
    unit: draftFilters.unitId || undefined,
    roster: draftFilters.rosterId || undefined,
    fromDate: draftFilters.fromDate,
    toDate: draftFilters.toDate
  };

  const handleLoad = () => {
    const params = new URLSearchParams();
    if (draftFilters.departmentId) params.set('department', draftFilters.departmentId);
    if (draftFilters.unitId) params.set('unit', draftFilters.unitId);
    if (draftFilters.rosterId) params.set('roster', draftFilters.rosterId);
    if (draftFilters.fromDate) params.set('fromDate', draftFilters.fromDate);
    if (draftFilters.toDate) params.set('toDate', draftFilters.toDate);
    if (draftFilters.staffSearch.trim()) params.set('search', draftFilters.staffSearch.trim());
    const limit = searchParams.get('limit');
    if (limit) params.set('limit', limit);
    const query = params.toString();
    startTransition(() => {
      router.push(query ? `${pathname}?${query}` : pathname);
    });
  };

  const handleClear = () => {
    setDraftFilters(emptyFilters(data));
    setStaffMetaVisible(true);
    startTransition(() => {
      router.push(pathname);
    });
  };

  const handleCopyPreviousWeek = async () => {
    const result = await copyPreviousWeekRosterAction(workflowPayload);
    if (result.isError) {
      const errorMessage =
        'message' in result.errors
          ? (result.errors.message as string | undefined)
          : undefined;
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage ?? 'Could not copy previous week roster.'
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

  const handleCopyPreviousMonth = async () => {
    const result = await copyPreviousMonthRosterAction(workflowPayload);
    if (result.isError) {
      const errorMessage =
        'message' in result.errors
          ? (result.errors.message as string | undefined)
          : undefined;
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage ?? 'Could not copy previous month roster.'
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
        values={draftFilters}
        departmentOptions={data.filterOptions.departments}
        unitOptions={data.filterOptions.units}
        rosterOptions={data.filterOptions.rosters}
        onChange={(next) =>
          setDraftFilters((prev) => ({ ...prev, ...next }))
        }
        onLoad={handleLoad}
        onClear={handleClear}
        onCopyPreviousWeek={() => void handleCopyPreviousWeek()}
        onCopyPreviousMonth={() => void handleCopyPreviousMonth()}
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
          periodFromDate={draftFilters.fromDate}
          periodToDate={draftFilters.toDate}
          rosterValue={draftFilters.rosterId}
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
