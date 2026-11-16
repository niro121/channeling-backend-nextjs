'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  addDays,
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
  startOfWeek
} from 'date-fns';
import { useToast } from '@archmage/ui';
import {
  copyPreviousMonthRosterAction,
  copyPreviousWeekRosterAction,
  getShiftRosterExportAction
} from '@/app/actions/roster-actions/shift-roster.actions';
import { printPdfUtil } from '@/lib/utils/export-wrapper-utils';
import {
  buildShiftRosterExport,
  type ShiftRosterExportMode
} from '@/lib/utils/shift-roster-export';
import type {
  DutyRosterFormOptions,
  LoadRosterParams,
  LoadRosterResult,
  RosterStaffRow,
  ShiftRosterExportScope
} from '@/types/roster';
import DialogExportScope from './dialog-export-scope';
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
  formOptions: DutyRosterFormOptions;
};

type ExportBundleResult = {
  success: boolean;
  cancelled?: boolean;
  message?: string;
  rows: RosterStaffRow[];
  dayIsos: string[];
  weekLabel: string;
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

function toWeekRange(anchorIso: string): { fromDate: string; toDate: string } {
  const anchor = parseISO(anchorIso || format(new Date(), 'yyyy-MM-dd'));
  const weekStart = startOfWeek(anchor, { weekStartsOn: 0 });
  return {
    fromDate: format(weekStart, 'yyyy-MM-dd'),
    toDate: format(addDays(weekStart, 6), 'yyyy-MM-dd')
  };
}

function toMonthRange(anchorIso: string): { fromDate: string; toDate: string } {
  const anchor = parseISO(anchorIso || format(new Date(), 'yyyy-MM-dd'));
  return {
    fromDate: format(startOfMonth(anchor), 'yyyy-MM-dd'),
    toDate: format(endOfMonth(anchor), 'yyyy-MM-dd')
  };
}

function ShiftRosterWorkspaceInner({
  data,
  initialFilters,
  formOptions
}: ShiftRosterWorkspaceProps) {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    formTarget,
    historyRow,
    closeFormSheet,
    closeHistorySheet
  } = useShiftRosterUi();
  const [staffMetaVisible, setStaffMetaVisible] = useState(true);
  const [exportScopeOpen, setExportScopeOpen] = useState(false);
  const [exportScopeChoice, setExportScopeChoice] =
    useState<ShiftRosterExportScope>('500');
  const exportScopeResolverRef = useRef<
    ((value: ShiftRosterExportScope | null) => void) | null
  >(null);

  const filters = emptyFilters(data, initialFilters);
  const viewMode: 'weekly' | 'monthly' =
    data.dayIsos.length > 7 ? 'monthly' : 'weekly';

  const exportParams = useMemo<LoadRosterParams>(
    () => ({
      department: filters.departmentId || undefined,
      unit: filters.unitId || undefined,
      roster: filters.rosterId || undefined,
      fromDate: filters.fromDate,
      toDate: filters.toDate,
      search: filters.staffSearch || undefined
    }),
    [filters]
  );

  const pushDateRange = (fromDate: string, toDate: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('fromDate', fromDate);
    params.set('toDate', toDate);
    params.delete('page');
    router.push(`/shift-roster?${params.toString()}`);
  };

  const handleViewModeChange = (mode: 'weekly' | 'monthly') => {
    const anchor =
      filters.fromDate || data.dayIsos[0] || format(new Date(), 'yyyy-MM-dd');
    if (mode === 'monthly') {
      const range = toMonthRange(anchor);
      if (
        range.fromDate === filters.fromDate &&
        range.toDate === filters.toDate
      ) {
        return;
      }
      pushDateRange(range.fromDate, range.toDate);
      return;
    }
    const range = toWeekRange(anchor);
    if (
      range.fromDate === filters.fromDate &&
      range.toDate === filters.toDate
    ) {
      return;
    }
    pushDateRange(range.fromDate, range.toDate);
  };

  const resolveExportScope = (value: ShiftRosterExportScope | null) => {
    const resolve = exportScopeResolverRef.current;
    exportScopeResolverRef.current = null;
    setExportScopeOpen(false);
    resolve?.(value);
  };

  const askExportScope = () =>
    new Promise<ShiftRosterExportScope | null>((resolve) => {
      exportScopeResolverRef.current = resolve;
      setExportScopeChoice('500');
      setExportScopeOpen(true);
    });

  const loadExportBundle = async (): Promise<ExportBundleResult> => {
    const scope = await askExportScope();
    if (!scope) {
      return {
        success: false,
        cancelled: true,
        rows: [],
        dayIsos: [],
        weekLabel: ''
      };
    }

    const result = await getShiftRosterExportAction({
      ...exportParams,
      exportScope: scope
    });
    if (!result.success || !result.data) {
      return {
        success: false,
        message: result.message ?? 'Failed to load roster for export.',
        rows: [],
        dayIsos: [],
        weekLabel: ''
      };
    }
    if (result.limited) {
      toast({
        title: 'Export limited',
        description:
          result.message ??
          `Showing first ${result.data.rows.length} of ${result.totalRecords} staff.`
      });
    }
    return {
      success: true,
      rows: result.data.rows,
      dayIsos: result.data.dayIsos,
      weekLabel: result.data.weekLabel
    };
  };

  const printRoster = async (mode: ShiftRosterExportMode) => {
    const bundle = await loadExportBundle();
    if (bundle.cancelled) return;
    if (!bundle.success || !bundle.rows.length) {
      toast({
        variant: 'destructive',
        title: 'No data to print',
        description: bundle.message ?? 'Load a roster before printing.'
      });
      return;
    }
    const built = buildShiftRosterExport({
      rows: bundle.rows,
      dayIsos: bundle.dayIsos,
      mode,
      includeStaffMeta: staffMetaVisible
    });
    const title =
      mode === 'blank'
        ? `Blank Shift Roster — ${bundle.weekLabel}`
        : `Shift Roster — ${bundle.weekLabel}`;
    printPdfUtil({
      title,
      data: built.data,
      columns: built.columns,
      keys: built.keys
    });
  };

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
        onPrintBlank={() => printRoster('blank')}
        onPrintFilled={() => printRoster('filled')}
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
        periodFromDate={filters.fromDate}
        periodToDate={filters.toDate}
        rosterValue={filters.rosterId}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        onExportRoster={loadExportBundle}
      />

      {formTarget ? (
        <SheetRosterAllocationForm
          open
          target={formTarget}
          formOptions={formOptions}
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
        dayIsos={data.dayIsos}
        onOpenChange={(next) => {
          if (!next) closeHistorySheet();
        }}
      />

      <DialogExportScope
        open={exportScopeOpen}
        value={exportScopeChoice}
        totalMatching={data.totalRecords}
        onValueChange={setExportScopeChoice}
        onCancel={() => resolveExportScope(null)}
        onConfirm={() => resolveExportScope(exportScopeChoice)}
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
