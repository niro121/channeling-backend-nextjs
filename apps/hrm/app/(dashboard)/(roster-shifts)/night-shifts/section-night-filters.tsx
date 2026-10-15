'use client';

import { RefreshCw, Search } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Combobox,
  CustomDatePickerField,
  Input,
  Label
} from '@archmage/ui';
import type { RosterFilterOption } from '@/types/roster';

export type NightFilterValues = {
  fromDate: Date | null;
  toDate: Date | null;
  departmentId: string;
  unitId: string;
  shiftTypeId: string;
  staffSearch: string;
  statusId: string;
  salaryCycleId: string;
};

type SectionNightFiltersProps = {
  values: NightFilterValues;
  departmentOptions: RosterFilterOption[];
  unitOptions: RosterFilterOption[];
  shiftTypeOptions: RosterFilterOption[];
  statusOptions: RosterFilterOption[];
  salaryCycleOptions: RosterFilterOption[];
  onChange: (next: Partial<NightFilterValues>) => void;
  onSearch: () => void;
  onClear: () => void;
};

export default function SectionNightFilters({
  values,
  departmentOptions,
  unitOptions,
  shiftTypeOptions,
  statusOptions,
  salaryCycleOptions,
  onChange,
  onSearch,
  onClear
}: SectionNightFiltersProps) {
  return (
    <Card className="rounded-lg border border-border shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Search & Filters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <CustomDatePickerField
            id="fromDate"
            placeholder="From Date"
            value={values.fromDate}
            onChange={(value) => onChange({ fromDate: value ?? null })}
            onBlur={() => undefined}
            required={false}
            useFormikError={false}
            styleClasses={{
              parentDiv: 'grid grid-cols-1 gap-2 items-start',
              labelClassName: 'text-xs uppercase text-muted-foreground',
              inputClassName: 'w-full'
            }}
          />
          <CustomDatePickerField
            id="toDate"
            placeholder="To Date"
            value={values.toDate}
            onChange={(value) => onChange({ toDate: value ?? null })}
            onBlur={() => undefined}
            required={false}
            useFormikError={false}
            styleClasses={{
              parentDiv: 'grid grid-cols-1 gap-2 items-start',
              labelClassName: 'text-xs uppercase text-muted-foreground',
              inputClassName: 'w-full'
            }}
          />
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
              Shift Type
            </Label>
            <Combobox
              label="Select Shift Type"
              options={shiftTypeOptions}
              value={values.shiftTypeId}
              defaultValue=""
              onChange={(value) => onChange({ shiftTypeId: value })}
              clearable
            />
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="night-staff-search"
              className="text-xs uppercase text-muted-foreground"
            >
              Staff
            </Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="night-staff-search"
                className="pl-8"
                placeholder="Search staff ID or name"
                value={values.staffSearch}
                onChange={(e) => onChange({ staffSearch: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase text-muted-foreground">
              Approval Status
            </Label>
            <Combobox
              label="Select Approval Status"
              options={statusOptions}
              value={values.statusId}
              defaultValue=""
              onChange={(value) => onChange({ statusId: value })}
              clearable
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase text-muted-foreground">
              Salary Cycle
            </Label>
            <Combobox
              label="Select Salary Cycle"
              options={salaryCycleOptions}
              value={values.salaryCycleId}
              defaultValue=""
              onChange={(value) => onChange({ salaryCycleId: value })}
              clearable
            />
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
