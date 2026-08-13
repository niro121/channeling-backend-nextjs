'use client';

import { useMemo, useState } from 'react';
import { useToast } from '@archmage/ui';
import SectionRosterFilters, {
  type RosterFilterValues
} from './section-roster-filters';
import SectionRosterGrid from './section-roster-grid';
import SectionRosterSummary from './section-roster-summary';
import {
  SAMPLE_DEPARTMENTS,
  SAMPLE_ROSTERS,
  SAMPLE_ROSTER_TOTAL_RECORDS,
  SAMPLE_UNITS,
  type RosterStaffRowSample,
  type RosterSummarySample,
  type RosterWeekMeta
} from './sample-data';

type ShiftRosterWorkspaceProps = {
  week: RosterWeekMeta;
  initialRows: RosterStaffRowSample[];
  summary: RosterSummarySample;
};

function emptyFilters(week: RosterWeekMeta): RosterFilterValues {
  return {
    departmentId: '',
    unitId: '',
    rosterId: '',
    fromDate: week.fromDateIso,
    toDate: week.toDateIso,
    staffSearch: ''
  };
}

function filterRows(
  rows: RosterStaffRowSample[],
  values: RosterFilterValues,
  departments: typeof SAMPLE_DEPARTMENTS
): RosterStaffRowSample[] {
  const deptName = departments.find((d) => d.id === values.departmentId)?.name;
  const unitName = SAMPLE_UNITS.find((u) => u.id === values.unitId)?.name;
  const q = values.staffSearch.trim().toLowerCase();

  return rows.filter((row) => {
    if (deptName && row.department !== deptName) return false;
    if (unitName && row.unit !== unitName) return false;
    if (q) {
      const hay = `${row.staffCode} ${row.staffName}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export default function ShiftRosterWorkspace({
  week,
  initialRows,
  summary
}: ShiftRosterWorkspaceProps) {
  const { toast } = useToast();
  const [draftFilters, setDraftFilters] = useState<RosterFilterValues>(() =>
    emptyFilters(week)
  );
  const [appliedFilters, setAppliedFilters] = useState<RosterFilterValues>(() =>
    emptyFilters(week)
  );
  const [staffMetaVisible, setStaffMetaVisible] = useState(true);

  const visibleRows = useMemo(
    () => filterRows(initialRows, appliedFilters, SAMPLE_DEPARTMENTS),
    [initialRows, appliedFilters]
  );

  const handleLoad = () => {
    setAppliedFilters(draftFilters);
    toast({
      title: 'Roster loaded',
      description: 'Sample data filtered locally. Server load comes in Phase 2.'
    });
  };

  const handleClear = () => {
    const cleared = emptyFilters(week);
    setDraftFilters(cleared);
    setAppliedFilters(cleared);
    setStaffMetaVisible(true);
  };

  return (
    <div className="space-y-6">
      <SectionRosterSummary
        summary={summary}
        weekRangeShort={week.weekRangeShort}
      />

      <SectionRosterFilters
        values={draftFilters}
        departmentOptions={SAMPLE_DEPARTMENTS}
        unitOptions={SAMPLE_UNITS}
        rosterOptions={SAMPLE_ROSTERS}
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
        week={week}
        rows={visibleRows}
        totalRecords={SAMPLE_ROSTER_TOTAL_RECORDS}
        staffMetaVisible={staffMetaVisible}
        conflicts={summary.conflicts}
      />
    </div>
  );
}

