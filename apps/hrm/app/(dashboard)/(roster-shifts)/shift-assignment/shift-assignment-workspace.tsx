'use client';

import { CommonManagerHeader } from '@/components/common/common-manager-header';
import type {
  ShiftAssignmentFilterOptions,
  ShiftAssignmentFormOptions,
  ShiftAssignmentRecord,
  ShiftAssignmentSummary
} from '@/types/roster';
import { ShiftAssignmentHeaderActions } from './header-actions';
import SectionAssignmentFilters, {
  type AssignmentFilterValues
} from './section-assignment-filters';
import SectionAssignmentInstructions from './section-assignment-instructions';
import SectionAssignmentRegister from './section-assignment-register';
import SectionAssignmentSummary from './section-assignment-summary';
import SheetAssignmentForm from './sheet-assignment-form';
import SheetAssignmentHistory from './sheet-assignment-history';
import {
  ShiftAssignmentUiProvider,
  useShiftAssignmentUi
} from './shift-assignment-ui-context';

type ShiftAssignmentWorkspaceProps = {
  records: ShiftAssignmentRecord[];
  totalRecords: number;
  page?: string;
  filters: AssignmentFilterValues;
  summary: ShiftAssignmentSummary;
  filterOptions: ShiftAssignmentFilterOptions;
  formOptions: ShiftAssignmentFormOptions;
  onExport: () => Promise<{
    success: boolean;
    message?: string;
    data?: Record<string, unknown>[];
  }>;
};

function ShiftAssignmentWorkspaceInner({
  records,
  totalRecords,
  page,
  filters,
  summary,
  filterOptions,
  formOptions,
  onExport
}: ShiftAssignmentWorkspaceProps) {
  const {
    formSheet,
    historyRecord,
    closeFormSheet,
    closeHistorySheet
  } = useShiftAssignmentUi();

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Shift Assignment"
        description="Link staff to shift types from the Shift Types master. Assignments feed the Duty Roster and Shift Roster automatically."
        actions={<ShiftAssignmentHeaderActions />}
      />

      <SectionAssignmentSummary summary={summary} />

      <SectionAssignmentInstructions />

      <SectionAssignmentFilters
        initial={filters}
        institutionOptions={filterOptions.institutions}
        departmentOptions={filterOptions.departments}
        unitOptions={filterOptions.units}
        designationOptions={filterOptions.designations}
        staffCategoryOptions={filterOptions.staffCategories}
        staffGradeOptions={filterOptions.staffGrades}
        employeeStatusOptions={filterOptions.employeeStatuses}
      />

      <SectionAssignmentRegister
        items={records}
        totalRecords={totalRecords}
        page={page}
        onExport={onExport}
      />

      {formSheet ? (
        <SheetAssignmentForm
          open
          mode={formSheet.mode}
          record={formSheet.record}
          selectedCount={formSheet.selectedCount}
          selectedStaffIds={formSheet.selectedStaffIds}
          rosterOptions={formOptions.rosters}
          shiftTypeOptions={formOptions.shiftTypes}
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
