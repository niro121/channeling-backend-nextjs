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
import type { AmendmentFilterOption } from './sample-data';

export type AmendmentFilterValues = {
  amendmentNo: string;
  staffSearch: string;
  departmentId: string;
  amendmentTypeId: string;
  fromDate: Date | null;
  toDate: Date | null;
  statusId: string;
  requestedById: string;
};

type SectionAmendmentFiltersProps = {
  values: AmendmentFilterValues;
  departmentOptions: AmendmentFilterOption[];
  typeOptions: AmendmentFilterOption[];
  statusOptions: AmendmentFilterOption[];
  requesterOptions: AmendmentFilterOption[];
  onChange: (next: Partial<AmendmentFilterValues>) => void;
  onSearch: () => void;
  onClear: () => void;
};

export default function SectionAmendmentFilters({
  values,
  departmentOptions,
  typeOptions,
  statusOptions,
  requesterOptions,
  onChange,
  onSearch,
  onClear
}: SectionAmendmentFiltersProps) {
  return (
    <Card className="rounded-lg border border-border shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Search & Filters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label
              htmlFor="amendment-no-search"
              className="text-xs uppercase text-muted-foreground"
            >
              Amendment No
            </Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="amendment-no-search"
                className="pl-8"
                placeholder="AMD-2026-..."
                value={values.amendmentNo}
                onChange={(e) => onChange({ amendmentNo: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="amendment-staff-search"
              className="text-xs uppercase text-muted-foreground"
            >
              Staff
            </Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="amendment-staff-search"
                className="pl-8"
                placeholder="Search staff ID or name"
                value={values.staffSearch}
                onChange={(e) => onChange({ staffSearch: e.target.value })}
              />
            </div>
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
              Amendment Type
            </Label>
            <Combobox
              label="Select Amendment Type"
              options={typeOptions}
              value={values.amendmentTypeId}
              defaultValue=""
              onChange={(value) => onChange({ amendmentTypeId: value })}
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
              Requested By
            </Label>
            <Combobox
              label="Select Requested By"
              options={requesterOptions}
              value={values.requestedById}
              defaultValue=""
              onChange={(value) => onChange({ requestedById: value })}
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
