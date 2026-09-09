'use client';

import { useState } from 'react';
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

export type OvernightFilterValues = {
  fromDate: Date | null;
  toDate: Date | null;
  departmentId: string;
  unitId: string;
  shiftTypeId: string;
  allocationId: string;
  staffSearch: string;
  statusId: string;
};

type SectionOvernightFiltersProps = {
  values: OvernightFilterValues;
  departmentOptions: RosterFilterOption[];
  unitOptions: RosterFilterOption[];
  shiftTypeOptions: RosterFilterOption[];
  allocationOptions: RosterFilterOption[];
  statusOptions: RosterFilterOption[];
  onChange: (next: Partial<OvernightFilterValues>) => void;
  onSearch: (values: OvernightFilterValues) => void;
  onClear: () => void;
};

const EMPTY_FILTERS: OvernightFilterValues = {
  fromDate: null,
  toDate: null,
  departmentId: '',
  unitId: '',
  shiftTypeId: '',
  allocationId: '',
  staffSearch: '',
  statusId: ''
};

export default function SectionOvernightFilters({
  values,
  departmentOptions,
  unitOptions,
  shiftTypeOptions,
  allocationOptions,
  statusOptions,
  onSearch,
  onClear
}: SectionOvernightFiltersProps) {
  const [draft, setDraft] = useState<OvernightFilterValues>(values);

  const update = (next: Partial<OvernightFilterValues>) =>
    setDraft((prev) => ({ ...prev, ...next }));

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
            value={draft.fromDate}
            onChange={(value) => update({ fromDate: value ?? null })}
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
            value={draft.toDate}
            onChange={(value) => update({ toDate: value ?? null })}
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
              value={draft.departmentId}
              defaultValue=""
              onChange={(value) => update({ departmentId: value })}
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
              value={draft.unitId}
              defaultValue=""
              onChange={(value) => update({ unitId: value })}
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
              value={draft.shiftTypeId}
              defaultValue=""
              onChange={(value) => update({ shiftTypeId: value })}
              clearable
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase text-muted-foreground">
              Allocation
            </Label>
            <Combobox
              label="Select Allocation"
              options={allocationOptions}
              value={draft.allocationId}
              defaultValue=""
              onChange={(value) => update({ allocationId: value })}
              clearable
            />
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="overnight-staff-search"
              className="text-xs uppercase text-muted-foreground"
            >
              Staff
            </Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="overnight-staff-search"
                className="pl-8"
                placeholder="Search staff ID or name"
                value={draft.staffSearch}
                onChange={(e) => update({ staffSearch: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase text-muted-foreground">
              Status
            </Label>
            <Combobox
              label="Select Status"
              options={statusOptions}
              value={draft.statusId}
              defaultValue=""
              onChange={(value) => update({ statusId: value })}
              clearable
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" className="h-9" onClick={() => onSearch(draft)}>
            Search
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 gap-1.5"
            onClick={() => {
              setDraft(EMPTY_FILTERS);
              onClear();
            }}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Clear
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
