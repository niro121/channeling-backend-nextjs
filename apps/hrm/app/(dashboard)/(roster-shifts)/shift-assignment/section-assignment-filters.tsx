'use client';

import { RefreshCw, Search } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Combobox,
  Input,
  Label
} from '@archmage/ui';
import type { RosterFilterOption } from '@/types/roster';

export type AssignmentFilterValues = {
  institutionId: string;
  departmentId: string;
  unitId: string;
  designationId: string;
  staffCategoryId: string;
  staffGradeId: string;
  employeeStatusId: string;
  staffSearch: string;
};

type SectionAssignmentFiltersProps = {
  values: AssignmentFilterValues;
  institutionOptions: RosterFilterOption[];
  departmentOptions: RosterFilterOption[];
  unitOptions: RosterFilterOption[];
  designationOptions: RosterFilterOption[];
  staffCategoryOptions: RosterFilterOption[];
  staffGradeOptions: RosterFilterOption[];
  employeeStatusOptions: RosterFilterOption[];
  onChange: (next: Partial<AssignmentFilterValues>) => void;
  onSearch: () => void;
  onClear: () => void;
};

export default function SectionAssignmentFilters({
  values,
  institutionOptions,
  departmentOptions,
  unitOptions,
  designationOptions,
  staffCategoryOptions,
  staffGradeOptions,
  employeeStatusOptions,
  onChange,
  onSearch,
  onClear
}: SectionAssignmentFiltersProps) {
  return (
    <Card className="rounded-lg border border-border shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Search & Filters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label className="text-xs uppercase text-muted-foreground">
              Institution
            </Label>
            <Combobox
              label="Select Institution"
              options={institutionOptions}
              value={values.institutionId}
              defaultValue=""
              onChange={(value) => onChange({ institutionId: value })}
              clearable
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase text-muted-foreground">
              Department
            </Label>
            <Combobox
              label="Select Department"
              options={departmentOptions}
              value={values.departmentId}
              defaultValue=""
              onChange={(value) => onChange({ departmentId: value })}
              clearable
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase text-muted-foreground">
              Unit
            </Label>
            <Combobox
              label="Select Unit"
              options={unitOptions}
              value={values.unitId}
              defaultValue=""
              onChange={(value) => onChange({ unitId: value })}
              clearable
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase text-muted-foreground">
              Designation
            </Label>
            <Combobox
              label="Select Designation"
              options={designationOptions}
              value={values.designationId}
              defaultValue=""
              onChange={(value) => onChange({ designationId: value })}
              clearable
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase text-muted-foreground">
              Staff Category
            </Label>
            <Combobox
              label="Select Staff Category"
              options={staffCategoryOptions}
              value={values.staffCategoryId}
              defaultValue=""
              onChange={(value) => onChange({ staffCategoryId: value })}
              clearable
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase text-muted-foreground">
              Staff Grade
            </Label>
            <Combobox
              label="Select Staff Grade"
              options={staffGradeOptions}
              value={values.staffGradeId}
              defaultValue=""
              onChange={(value) => onChange({ staffGradeId: value })}
              clearable
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase text-muted-foreground">
              Employee Status
            </Label>
            <Combobox
              label="Select Employee Status"
              options={employeeStatusOptions}
              value={values.employeeStatusId}
              defaultValue=""
              onChange={(value) => onChange({ employeeStatusId: value })}
              clearable
            />
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="assignment-staff-search"
              className="text-xs uppercase text-muted-foreground"
            >
              Staff Search
            </Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="assignment-staff-search"
                className="pl-8"
                placeholder="Search staff ID or name"
                value={values.staffSearch}
                onChange={(e) => onChange({ staffSearch: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" className="h-9" onClick={onSearch}>
            Search
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 gap-1.5"
            onClick={onClear}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Clear
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
