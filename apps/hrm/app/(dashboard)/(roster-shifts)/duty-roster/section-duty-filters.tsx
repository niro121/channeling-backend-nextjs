'use client';

import { RefreshCw } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Combobox,
  CustomDatePickerField,
  Label
} from '@archmage/ui';
import type { DutyRosterFilterOption } from './sample-data';

export type DutyFilterValues = {
  departmentId: string;
  unitId: string;
  dutyDate: Date | null;
  shiftId: string;
  rosterId: string;
};

type SectionDutyFiltersProps = {
  values: DutyFilterValues;
  departmentOptions: DutyRosterFilterOption[];
  unitOptions: DutyRosterFilterOption[];
  shiftOptions: DutyRosterFilterOption[];
  rosterOptions: DutyRosterFilterOption[];
  onChange: (next: Partial<DutyFilterValues>) => void;
  onLoad: () => void;
  onClear: () => void;
};

export default function SectionDutyFilters({
  values,
  departmentOptions,
  unitOptions,
  shiftOptions,
  rosterOptions,
  onChange,
  onLoad,
  onClear
}: SectionDutyFiltersProps) {
  return (
    <Card className="rounded-lg border border-border shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Search & Filters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
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
          <CustomDatePickerField
            id="dutyDate"
            placeholder="Date"
            value={values.dutyDate}
            onChange={(value) => onChange({ dutyDate: value ?? null })}
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
              Shift
            </Label>
            <Combobox
              label="Select Shift"
              options={shiftOptions}
              value={values.shiftId}
              defaultValue=""
              onChange={(value) => onChange({ shiftId: value })}
              clearable
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase text-muted-foreground">
              Roster
            </Label>
            <Combobox
              label="Select Roster"
              options={rosterOptions}
              value={values.rosterId}
              defaultValue=""
              onChange={(value) => onChange({ rosterId: value })}
              clearable
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" className="h-9" onClick={onLoad}>
            Load Duty Roster
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
