'use client';

import { Copy, Printer, RefreshCw, Search } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Combobox,
  DateRangePicker,
  Input,
  Label,
  useToast
} from '@archmage/ui';
import type { RosterFilterOption } from '@/types/roster';

export type RosterFilterValues = {
  departmentId: string;
  unitId: string;
  rosterId: string;
  fromDate: string;
  toDate: string;
  staffSearch: string;
};

type SectionRosterFiltersProps = {
  values: RosterFilterValues;
  departmentOptions: RosterFilterOption[];
  unitOptions: RosterFilterOption[];
  rosterOptions: RosterFilterOption[];
  onChange: (next: Partial<RosterFilterValues>) => void;
  onLoad: () => void;
  onClear: () => void;
  onHideStaffMeta: () => void;
  onShowStaffMeta: () => void;
  staffMetaVisible: boolean;
};

const LATER = 'Will be wired in a later phase.';

export default function SectionRosterFilters({
  values,
  departmentOptions,
  unitOptions,
  rosterOptions,
  onChange,
  onLoad,
  onClear,
  onHideStaffMeta,
  onShowStaffMeta,
  staffMetaVisible
}: SectionRosterFiltersProps) {
  const { toast } = useToast();

  const notify = (title: string) => {
    toast({ title, description: LATER });
  };

  return (
    <Card className="rounded-lg border border-border shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">
          Search & Filters
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
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
          <div className="flex flex-col gap-1">
            <Label className="text-xs uppercase text-muted-foreground">
              Date Range
            </Label>
            <DateRangePicker
              from={values.fromDate || undefined}
              to={values.toDate || undefined}
              onChange={({ from, to }) => {
                onChange({
                  fromDate: from ?? '',
                  toDate: to ?? ''
                });
              }}
            />
          </div>
          <div className="min-w-[16rem] flex-1 space-y-2">
            <Label
              htmlFor="roster-staff-search"
              className="text-xs uppercase text-muted-foreground"
            >
              Staff Search
            </Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="roster-staff-search"
                className="pl-8"
                placeholder="Search staff ID or name"
                value={values.staffSearch}
                onChange={(e) => onChange({ staffSearch: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" className="h-9" onClick={onLoad}>
            Load Roster
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
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9"
            disabled={!staffMetaVisible}
            onClick={onHideStaffMeta}
          >
            Hide
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9"
            disabled={staffMetaVisible}
            onClick={onShowStaffMeta}
          >
            Visible
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 gap-1.5"
            onClick={() => notify('Copy Previous Week')}
          >
            <Copy className="h-3.5 w-3.5" />
            Copy Previous Week
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 gap-1.5"
            onClick={() => notify('Copy Previous Month')}
          >
            <Copy className="h-3.5 w-3.5" />
            Copy Previous Month
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 gap-1.5"
            onClick={() => notify('Print Blank Roster')}
          >
            <Printer className="h-3.5 w-3.5" />
            Print Blank Roster
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 gap-1.5"
            onClick={() => notify('Print Filled Roster')}
          >
            <Printer className="h-3.5 w-3.5" />
            Print Filled Roster
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
