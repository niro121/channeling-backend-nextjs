'use client';

import { Suspense, useState } from 'react';
import { Copy, Printer, Search } from 'lucide-react';
import {
  Button,
  Combobox,
  DateRangePicker,
  Input,
  Label,
  useToast
} from '@archmage/ui';
import { FilterWrapper } from '@/app/(dashboard)/filter-wrapper';
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
  initial?: Partial<RosterFilterValues>;
  departmentOptions: RosterFilterOption[];
  unitOptions: RosterFilterOption[];
  rosterOptions: RosterFilterOption[];
  onCopyPreviousWeek: (values: {
    department?: string;
    unit?: string;
    roster?: string;
    fromDate: string;
    toDate: string;
  }) => void;
  onCopyPreviousMonth: (values: {
    department?: string;
    unit?: string;
    roster?: string;
    fromDate: string;
    toDate: string;
  }) => void;
  onHideStaffMeta: () => void;
  onShowStaffMeta: () => void;
  staffMetaVisible: boolean;
};

const LATER = 'Will be wired in a later phase.';

function SectionRosterFiltersInner({
  initial = {},
  departmentOptions,
  unitOptions,
  rosterOptions,
  onCopyPreviousWeek,
  onCopyPreviousMonth,
  onHideStaffMeta,
  onShowStaffMeta,
  staffMetaVisible
}: SectionRosterFiltersProps) {
  const { toast } = useToast();
  const [draftDates, setDraftDates] = useState({
    fromDate: initial.fromDate ?? '',
    toDate: initial.toDate ?? ''
  });
  const [draftMeta, setDraftMeta] = useState({
    department: initial.departmentId ?? '',
    unit: initial.unitId ?? '',
    roster: initial.rosterId ?? ''
  });

  const initialValues = {
    department: initial.departmentId ?? '',
    unit: initial.unitId ?? '',
    roster: initial.rosterId ?? '',
    fromDate: initial.fromDate ?? '',
    toDate: initial.toDate ?? '',
    search: initial.staffSearch ?? ''
  };

  const notify = (title: string) => {
    toast({ title, description: LATER });
  };

  const workflowPayload = () => ({
    department: draftMeta.department || undefined,
    unit: draftMeta.unit || undefined,
    roster: draftMeta.roster || undefined,
    fromDate: draftDates.fromDate,
    toDate: draftDates.toDate
  });

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Search & Filters
      </h2>
      <div className="space-y-3">
        <FilterWrapper
          key={Object.values(initialValues).join('|')}
          initialValues={initialValues}
          buttonLabel="Load Roster"
          showClearButton
          preserveQueryKeys={['limit']}
          onValuesChange={(values) => {
            setDraftDates({
              fromDate: values.fromDate ?? '',
              toDate: values.toDate ?? ''
            });
            setDraftMeta({
              department: values.department ?? '',
              unit: values.unit ?? '',
              roster: values.roster ?? ''
            });
          }}
          searchButton={{
            variant: 'default',
            className: 'h-10 shrink-0 gap-2'
          }}
        >
          {({ values, setValue }) => (
            <div className="flex w-full flex-wrap items-end gap-3">
              <Combobox
                label="Department"
                options={departmentOptions}
                value={values.department ?? ''}
                defaultValue=""
                onChange={(value) => setValue('department', value)}
                clearable
                triggerClassName="self-end"
              />
              <Combobox
                label="Unit"
                options={unitOptions}
                value={values.unit ?? ''}
                defaultValue=""
                onChange={(value) => setValue('unit', value)}
                clearable
                triggerClassName="self-end"
              />
              <Combobox
                label="Roster"
                options={rosterOptions}
                value={values.roster ?? ''}
                defaultValue=""
                onChange={(value) => setValue('roster', value)}
                clearable
                triggerClassName="self-end"
              />
              <div className="flex flex-col gap-1">
                <Label className="text-xs uppercase text-muted-foreground">
                  Date Range
                </Label>
                <DateRangePicker
                  from={values.fromDate || undefined}
                  to={values.toDate || undefined}
                  onChange={({ from, to }) => {
                    setValue('fromDate', from ?? undefined);
                    setValue('toDate', to ?? undefined);
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
                    value={values.search ?? ''}
                    onChange={(e) => setValue('search', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
        </FilterWrapper>

        <div className="flex flex-wrap items-center gap-2">
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
            onClick={() => onCopyPreviousWeek(workflowPayload())}
          >
            <Copy className="h-3.5 w-3.5" />
            Copy Previous Week
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 gap-1.5"
            onClick={() => onCopyPreviousMonth(workflowPayload())}
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
      </div>
    </div>
  );
}

export default function SectionRosterFilters(props: SectionRosterFiltersProps) {
  return (
    <Suspense
      fallback={
        <div className="rounded-lg border border-border bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
          Loading filters...
        </div>
      }
    >
      <SectionRosterFiltersInner {...props} />
    </Suspense>
  );
}
