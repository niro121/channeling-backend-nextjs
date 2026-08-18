'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import type {
  RosterFilterOption,
  ShiftAssignmentFilterOptions,
  ShiftAssignmentRecord,
  ShiftAssignmentSummary
} from '@/types/roster';
import { ShiftAssignmentHeaderActions } from './header-actions';
import SectionAssignmentFilters, {
  type AssignmentFilterValues
} from './section-assignment-filters';
import SectionAssignmentRegister from './section-assignment-register';
import SectionAssignmentSummary from './section-assignment-summary';
import SheetAssignmentForm from './sheet-assignment-form';
import SheetAssignmentHistory from './sheet-assignment-history';
import {
  ShiftAssignmentUiProvider,
  useShiftAssignmentUi
} from './shift-assignment-ui-context';

type FormOptions = {
  staff: RosterFilterOption[];
  shiftTypes: RosterFilterOption[];
};

type ShiftAssignmentWorkspaceProps = {
  records: ShiftAssignmentRecord[];
  totalRecords: number;
  page?: string;
  filters: AssignmentFilterValues;
  summary: ShiftAssignmentSummary;
  filterOptions: ShiftAssignmentFilterOptions;
  formOptions: FormOptions;
  onExport: () => Promise<{
    success: boolean;
    message?: string;
    data?: Record<string, unknown>[];
  }>;
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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const {
    formSheet,
    historyRecord,
    closeFormSheet,
    closeHistorySheet
  } = useShiftAssignmentUi();
  const [draft, setDraft] = useState<AssignmentFilterValues>(filters);

  useEffect(() => {
    setDraft(filters);
  }, [filters]);

  const pushFilters = (next: AssignmentFilterValues) => {
    const params = new URLSearchParams();
    const limit = searchParams.get('limit');
    if (limit) params.set('limit', limit);
    if (next.institutionId) params.set('institution', next.institutionId);
    if (next.departmentId) params.set('department', next.departmentId);
    if (next.unitId) params.set('unit', next.unitId);
    if (next.designationId) params.set('designation', next.designationId);
    if (next.staffCategoryId) params.set('staffCategory', next.staffCategoryId);
    if (next.staffGradeId) params.set('staffGrade', next.staffGradeId);
    if (next.employeeStatusId) {
      params.set('employeeStatus', next.employeeStatusId);
    }
    if (next.staffSearch.trim()) params.set('search', next.staffSearch.trim());
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

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
        institutionOptions={filterOptions.institutions}
        departmentOptions={filterOptions.departments}
        unitOptions={filterOptions.units}
        designationOptions={filterOptions.designations}
        staffCategoryOptions={filterOptions.staffCategories}
        staffGradeOptions={filterOptions.staffGrades}
        employeeStatusOptions={filterOptions.employeeStatuses}
        onChange={(next) => setDraft((prev) => ({ ...prev, ...next }))}
        onSearch={() => pushFilters(draft)}
        onClear={() => {
          setDraft(EMPTY_FILTERS);
          const limit = searchParams.get('limit');
          router.push(limit ? `${pathname}?limit=${limit}` : pathname);
        }}
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
          staffOptions={formOptions.staff}
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
