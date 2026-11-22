'use client';

import { Suspense } from 'react';
import { Search } from 'lucide-react';
import { Input, Label, Selector } from '@archmage/ui';
import { FilterWrapper } from '@/app/(dashboard)/filter-wrapper';
import {
  DEDUCTION_KIND_OPTIONS,
  DEDUCTION_TYPE_OPTIONS,
  type DeductionFilters
} from '@/types/payroll';

type SectionFiltersProps = {
  initial?: DeductionFilters;
};

function SectionFiltersInner({ initial = {} }: SectionFiltersProps) {
  const typeOptions = DEDUCTION_TYPE_OPTIONS.map((item) => ({
    id: item.id,
    name: item.name
  }));

  const kindOptions = DEDUCTION_KIND_OPTIONS.map((item) => ({
    id: item.id,
    name: item.name
  }));

  const initialValues = {
    search: initial.search ?? '',
    typeId: initial.typeId ?? '__all__',
    kind: initial.kind ?? '__all__'
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Search & Filters
      </h2>
      <FilterWrapper
        key={[
          initialValues.search,
          initialValues.typeId,
          initialValues.kind
        ].join('|')}
        initialValues={initialValues}
        buttonLabel="Search"
        showClearButton
        searchButton={{
          variant: 'default',
          className: 'h-10 shrink-0 gap-2'
        }}
      >
        {({ values, setValue }) => (
          <div className="grid w-full gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2">
              <Label
                htmlFor="deduction-search"
                className="text-xs uppercase text-muted-foreground"
              >
                Search
              </Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="deduction-search"
                  className="pl-8"
                  placeholder="Code or name"
                  value={values.search ?? ''}
                  onChange={(e) => setValue('search', e.target.value)}
                />
              </div>
            </div>

            <Selector
              label="Deduction Type"
              options={typeOptions}
              value={values.typeId ?? '__all__'}
              defaultValue="__all__"
              onChange={(v) => setValue('typeId', v)}
              className={{ trigger: 'h-10 w-full max-w-none self-end' }}
            />

            <Selector
              label="Kind"
              options={kindOptions}
              value={values.kind ?? '__all__'}
              defaultValue="__all__"
              onChange={(v) => setValue('kind', v)}
              className={{ trigger: 'h-10 w-full max-w-none self-end' }}
            />
          </div>
        )}
      </FilterWrapper>
    </div>
  );
}

export default function SectionFilters(props: SectionFiltersProps) {
  return (
    <Suspense
      fallback={
        <div className="rounded-lg border border-border bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
          Loading filters...
        </div>
      }
    >
      <SectionFiltersInner {...props} />
    </Suspense>
  );
}
