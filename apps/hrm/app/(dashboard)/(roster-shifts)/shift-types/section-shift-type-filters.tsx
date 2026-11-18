'use client';

import { Suspense } from 'react';
import { Search } from 'lucide-react';
import { Combobox, Input, Label } from '@archmage/ui';
import { FilterWrapper } from '@/app/(dashboard)/filter-wrapper';
import {
  SHIFT_TYPE_CATEGORY_OPTIONS,
  SHIFT_TYPE_STATUS_OPTIONS,
  ROSTER_YES_NO_OPTIONS
} from '@/types/roster';

export type ShiftTypeFilterValues = {
  code: string;
  name: string;
  categoryId: string;
  nightShift: string;
  overnight: string;
  status: string;
};

type SectionShiftTypeFiltersProps = {
  initial?: Partial<ShiftTypeFilterValues>;
};

function SectionShiftTypeFiltersInner({
  initial = {}
}: SectionShiftTypeFiltersProps) {
  const initialValues = {
    code: initial.code ?? '',
    name: initial.name ?? '',
    category: initial.categoryId ?? '',
    nightShift: initial.nightShift ?? '',
    overnight: initial.overnight ?? '',
    status: initial.status ?? ''
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Search & Filters
      </h2>
      <FilterWrapper
        key={[
          initialValues.code,
          initialValues.name,
          initialValues.category,
          initialValues.nightShift,
          initialValues.overnight,
          initialValues.status
        ].join('|')}
        initialValues={initialValues}
        buttonLabel="Search"
        showClearButton
        preserveQueryKeys={['limit']}
        searchButton={{
          variant: 'default',
          className: 'h-10 shrink-0 gap-2'
        }}
      >
        {({ values, setValue }) => (
          <div className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
                  value={values.code ?? ''}
                  onChange={(e) => setValue('code', e.target.value)}
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
                  value={values.name ?? ''}
                  onChange={(e) => setValue('name', e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">
                Category
              </Label>
              <Combobox
                label="Select Category"
                options={SHIFT_TYPE_CATEGORY_OPTIONS}
                value={values.category ?? ''}
                defaultValue=""
                onChange={(value) => setValue('category', value)}
                clearable
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">
                Night Shift
              </Label>
              <Combobox
                label="Select Night Shift"
                options={ROSTER_YES_NO_OPTIONS}
                value={values.nightShift ?? ''}
                defaultValue=""
                onChange={(value) => setValue('nightShift', value)}
                clearable
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">
                Overnight
              </Label>
              <Combobox
                label="Select Overnight"
                options={ROSTER_YES_NO_OPTIONS}
                value={values.overnight ?? ''}
                defaultValue=""
                onChange={(value) => setValue('overnight', value)}
                clearable
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">
                Status
              </Label>
              <Combobox
                label="Select Status"
                options={SHIFT_TYPE_STATUS_OPTIONS}
                value={values.status ?? ''}
                defaultValue=""
                onChange={(value) => setValue('status', value)}
                clearable
              />
            </div>
          </div>
        )}
      </FilterWrapper>
    </div>
  );
}

export default function SectionShiftTypeFilters(
  props: SectionShiftTypeFiltersProps
) {
  return (
    <Suspense
      fallback={
        <div className="rounded-lg border border-border bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
          Loading filters...
        </div>
      }
    >
      <SectionShiftTypeFiltersInner {...props} />
    </Suspense>
  );
}
