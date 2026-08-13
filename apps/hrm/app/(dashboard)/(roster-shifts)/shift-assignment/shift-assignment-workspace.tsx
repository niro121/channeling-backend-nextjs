'use client';

import { useMemo, useState } from 'react';
import { useToast } from '@archmage/ui';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import { formatDateTime } from '@/lib/utils/date';
import { ShiftAssignmentHeaderActions } from './header-actions';
import SectionAssignmentFilters, {
  type AssignmentFilterValues
} from './section-assignment-filters';
import SectionAssignmentRegister from './section-assignment-register';
import SectionAssignmentSummary from './section-assignment-summary';
import SheetAssignmentForm from './sheet-assignment-form';
import SheetAssignmentHistory from './sheet-assignment-history';
import {
  SAMPLE_ASSIGNMENT_AUDIT,
  SAMPLE_DEPARTMENTS,
  SAMPLE_DESIGNATIONS,
  SAMPLE_EMPLOYEE_STATUS,
  SAMPLE_INSTITUTIONS,
  SAMPLE_STAFF_CATEGORIES,
  SAMPLE_STAFF_GRADES,
  SAMPLE_UNITS,
  type ShiftAssignmentSample,
  type ShiftAssignmentSummarySample
} from './sample-data';
import {
  ShiftAssignmentUiProvider,
  useShiftAssignmentUi
} from './shift-assignment-ui-context';

type ShiftAssignmentWorkspaceProps = {
  initialRows: ShiftAssignmentSample[];
  summary: ShiftAssignmentSummarySample;
};

const EMPTY_FILTERS: AssignmentFilterValues = {
  institutionId: '',
  departmentId: '',
  unitId: '',
  designationId: '',
  staffCategoryId: '',
  staffGradeId: '',
  employeeStatusId: '',
  staffSearch: ''
};

function filterRows(
  rows: ShiftAssignmentSample[],
  values: AssignmentFilterValues
): ShiftAssignmentSample[] {
  const deptName = SAMPLE_DEPARTMENTS.find(
    (d) => d.id === values.departmentId
  )?.name;
  const unitName = SAMPLE_UNITS.find((u) => u.id === values.unitId)?.name;
  const designationName = SAMPLE_DESIGNATIONS.find(
    (d) => d.id === values.designationId
  )?.name;
  const q = values.staffSearch.trim().toLowerCase();

  return rows.filter((row) => {
    if (deptName && row.department !== deptName) return false;
    if (unitName && row.unit !== unitName) return false;
    if (designationName && row.designation !== designationName) return false;
    if (q) {
      const hay = `${row.staffCode} ${row.staffName}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function ShiftAssignmentWorkspaceInner({
  initialRows,
  summary
}: ShiftAssignmentWorkspaceProps) {
  const { toast } = useToast();
  const {
    formSheet,
    historyRecord,
    closeFormSheet,
    closeHistorySheet
  } = useShiftAssignmentUi();
  const [draft, setDraft] = useState<AssignmentFilterValues>(EMPTY_FILTERS);
  const [applied, setApplied] =
    useState<AssignmentFilterValues>(EMPTY_FILTERS);

  const rows = useMemo(
    () => filterRows(initialRows, applied),
    [initialRows, applied]
  );

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Shift Assignment"
        description="Link staff to shift types from the Shift Types master. Assignments feed the Duty Roster and Shift Roster automatically."
        actions={<ShiftAssignmentHeaderActions />}
      />

      <SectionAssignmentSummary summary={summary} />

      <SectionAssignmentFilters
        values={draft}
        institutionOptions={SAMPLE_INSTITUTIONS}
        departmentOptions={SAMPLE_DEPARTMENTS}
        unitOptions={SAMPLE_UNITS}
        designationOptions={SAMPLE_DESIGNATIONS}
        staffCategoryOptions={SAMPLE_STAFF_CATEGORIES}
        staffGradeOptions={SAMPLE_STAFF_GRADES}
        employeeStatusOptions={SAMPLE_EMPLOYEE_STATUS}
        onChange={(next) => setDraft((prev) => ({ ...prev, ...next }))}
        onSearch={() => {
          setApplied(draft);
          toast({
            title: 'Filters applied',
            description:
              'Sample data filtered locally. Server search comes in a later phase.'
          });
        }}
        onClear={() => {
          setDraft(EMPTY_FILTERS);
          setApplied(EMPTY_FILTERS);
        }}
      />

      <SectionAssignmentRegister items={rows} />

      <div className="space-y-1 text-xs text-muted-foreground">
        <p>
          Created by: {SAMPLE_ASSIGNMENT_AUDIT.createdBy} ·{' '}
          {formatDateTime(SAMPLE_ASSIGNMENT_AUDIT.createdAt)}
        </p>
        <p>
          Last updated: {SAMPLE_ASSIGNMENT_AUDIT.updatedBy} ·{' '}
          {formatDateTime(SAMPLE_ASSIGNMENT_AUDIT.updatedAt)}
        </p>
      </div>

      {formSheet ? (
        <SheetAssignmentForm
          open
          mode={formSheet.mode}
          sample={formSheet.record}
          selectedCount={formSheet.selectedCount}
          onOpenChange={(next) => {
            if (!next) closeFormSheet();
          }}
        />
      ) : null}

      <SheetAssignmentHistory
        open={!!historyRecord}
        record={historyRecord}
        onOpenChange={(next) => {
          if (!next) closeHistorySheet();
        }}
      />
    </div>
  );
}

export default function ShiftAssignmentWorkspace(
  props: ShiftAssignmentWorkspaceProps
) {
  return (
    <ShiftAssignmentUiProvider>
      <ShiftAssignmentWorkspaceInner {...props} />
    </ShiftAssignmentUiProvider>
  );
}
