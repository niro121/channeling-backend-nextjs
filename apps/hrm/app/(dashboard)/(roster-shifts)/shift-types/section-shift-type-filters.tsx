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
import type { ShiftTypeFilterOption } from './sample-data';

export type ShiftTypeFilterValues = {
  code: string;
  name: string;
  categoryId: string;
  nightShift: string;
  overnight: string;
  status: string;
};

type SectionShiftTypeFiltersProps = {
  values: ShiftTypeFilterValues;
  categoryOptions: ShiftTypeFilterOption[];
  yesNoOptions: ShiftTypeFilterOption[];
  statusOptions: ShiftTypeFilterOption[];
  onChange: (next: Partial<ShiftTypeFilterValues>) => void;
  onSearch: () => void;
  onClear: () => void;
};

export default function SectionShiftTypeFilters({
  values,
  categoryOptions,
  yesNoOptions,
  statusOptions,
  onChange,
  onSearch,
  onClear
}: SectionShiftTypeFiltersProps) {
  return (
    <Card className="rounded-lg border border-border shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Search & Filters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label
              htmlFor="shift-code-search"
              className="text-xs uppercase text-muted-foreground"
            >
              Shift Code
            </Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="shift-code-search"
                className="pl-8"
                placeholder="Search shift code"
                value={values.code}
                onChange={(e) => onChange({ code: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="shift-name-search"
              className="text-xs uppercase text-muted-foreground"
            >
              Shift Name
            </Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="shift-name-search"
                className="pl-8"
                placeholder="Search shift name"
                value={values.name}
                onChange={(e) => onChange({ name: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase text-muted-foreground">
              Category
            </Label>
            <Combobox
              label="Select Category"
              options={categoryOptions}
              value={values.categoryId}
              defaultValue=""
              onChange={(value) => onChange({ categoryId: value })}
              clearable
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase text-muted-foreground">
              Night Shift
            </Label>
            <Combobox
              label="Select Night Shift"
              options={yesNoOptions}
              value={values.nightShift}
              defaultValue=""
              onChange={(value) => onChange({ nightShift: value })}
              clearable
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label className="text-xs uppercase text-muted-foreground">
              Overnight
            </Label>
            <Combobox
              label="Select Overnight"
              options={yesNoOptions}
              value={values.overnight}
              defaultValue=""
              onChange={(value) => onChange({ overnight: value })}
              clearable
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase text-muted-foreground">
              Status
            </Label>
            <Combobox
              label="Select Status"
              options={statusOptions}
              value={values.status}
              defaultValue=""
              onChange={(value) => onChange({ status: value })}
              clearable
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
