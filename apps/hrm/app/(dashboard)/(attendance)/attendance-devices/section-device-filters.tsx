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
import type { RfidFilterOption } from '@/types/attendance';

export type DeviceFilterValues = {
  code: string;
  name: string;
  location: string;
  status: string;
};

type SectionDeviceFiltersProps = {
  values: DeviceFilterValues;
  statusOptions: RfidFilterOption[];
  onChange: (next: Partial<DeviceFilterValues>) => void;
  onSearch: () => void;
  onClear: () => void;
};

export default function SectionDeviceFilters({
  values,
  statusOptions,
  onChange,
  onSearch,
  onClear
}: SectionDeviceFiltersProps) {
  return (
    <Card className="rounded-lg border border-border shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Search & Filters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label
              htmlFor="device-code-search"
              className="text-xs uppercase text-muted-foreground"
            >
              Device Code
            </Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="device-code-search"
                className="pl-8"
                placeholder="ATD-1 / GATE-01"
                value={values.code}
                onChange={(e) => onChange({ code: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="device-name-search"
              className="text-xs uppercase text-muted-foreground"
            >
              Device Name
            </Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="device-name-search"
                className="pl-8"
                placeholder="Search name"
                value={values.name}
                onChange={(e) => onChange({ name: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="device-location-search"
              className="text-xs uppercase text-muted-foreground"
            >
              Location
            </Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="device-location-search"
                className="pl-8"
                placeholder="Search location"
                value={values.location}
                onChange={(e) => onChange({ location: e.target.value })}
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
