'use client';

import { useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@archmage/ui';
import type {
  LoadRosterResult,
  RosterStaffRow,
  ShiftCell,
  ShiftTypeChip
} from '@/types/roster';
import SectionRosterFilters, {
  type RosterFilterValues
} from './section-roster-filters';
import SectionRosterGrid from './section-roster-grid';
import SectionRosterSummary from './section-roster-summary';
import SheetRosterAllocationForm from './sheet-roster-allocation-form';
import SheetRosterAllocationHistory from './sheet-roster-allocation-history';
import {
  ShiftRosterUiProvider,
  useShiftRosterUi
} from './shift-roster-ui-context';

type ShiftRosterWorkspaceProps = {
  data: LoadRosterResult;
};

function emptyFilters(data: LoadRosterResult): RosterFilterValues {
  return {
    departmentId: '',
    unitId: '',
    rosterId: '',
    fromDate: data.dayIsos[0] ?? '',
    toDate: data.dayIsos[data.dayIsos.length - 1] ?? '',
    staffSearch: ''
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

function ShiftRosterWorkspaceInner({ data }: ShiftRosterWorkspaceProps) {
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
    emptyFilters(data)
  );
  const [staffMetaVisible, setStaffMetaVisible] = useState(true);

  const staffOptions = staffOptionsFromRows(data.rows);

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

  return (
    <div className="space-y-6">
      <SectionRosterSummary
        summary={data.summary}
        weekRangeShort={data.weekRangeShort}
      />

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
      />

      {formTarget ? (
        <SheetRosterAllocationForm
          open
          target={formTarget}
          staffOptions={staffOptions}
          shiftTypes={data.shiftTypes}
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
