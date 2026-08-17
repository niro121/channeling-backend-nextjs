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
import type { PublicHolidayFilterOption } from './sample-data';

export type HolidayFilterValues = {
  holidayId: string;
  holidayTypeId: string;
  fromDate: Date | null;
  toDate: Date | null;
  departmentId: string;
  unitId: string;
  payRateId: string;
  statusId: string;
};

type SectionHolidayFiltersProps = {
  values: HolidayFilterValues;
  holidayOptions: PublicHolidayFilterOption[];
  holidayTypeOptions: PublicHolidayFilterOption[];
  departmentOptions: PublicHolidayFilterOption[];
  unitOptions: PublicHolidayFilterOption[];
  payRateOptions: PublicHolidayFilterOption[];
  statusOptions: PublicHolidayFilterOption[];
  onChange: (next: Partial<HolidayFilterValues>) => void;
  onSearch: () => void;
  onClear: () => void;
};

export default function SectionHolidayFilters({
  values,
  holidayOptions,
  holidayTypeOptions,
  departmentOptions,
  unitOptions,
  payRateOptions,
  statusOptions,
  onChange,
  onSearch,
  onClear
}: SectionHolidayFiltersProps) {
  return (
    <Card className="rounded-lg border border-border shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Search & Filters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label className="text-xs uppercase text-muted-foreground">
              Holiday
            </Label>
            <Combobox
              label="Select Holiday"
              options={holidayOptions}
              value={values.holidayId}
              defaultValue=""
              onChange={(value) => onChange({ holidayId: value })}
              clearable
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase text-muted-foreground">
              Holiday Type
            </Label>
            <Combobox
              label="Select Holiday Type"
              options={holidayTypeOptions}
              value={values.holidayTypeId}
              defaultValue=""
              onChange={(value) => onChange({ holidayTypeId: value })}
              clearable
            />
          </div>
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
              Pay Rate
            </Label>
            <Combobox
              label="Select Pay Rate"
              options={payRateOptions}
              value={values.payRateId}
              defaultValue=""
              onChange={(value) => onChange({ payRateId: value })}
              clearable
            />
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
