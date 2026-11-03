'use client';

import { Suspense } from 'react';
import { Search } from 'lucide-react';
import { Input, Label, Selector } from '@archmage/ui';
import { FilterWrapper } from '@/app/(dashboard)/filter-wrapper';
import {
  BRANCH_TYPE_OPTIONS,
  LOCATION_STATUS_OPTIONS
} from '@/types/location';

export type LocationListFilters = {
  search?: string;
  branchType?: string;
  status?: string;
};

type Props = {
  initial?: LocationListFilters;
};

const BRANCH_TYPE_FILTER_OPTIONS = [
  { id: '__all__', name: 'All branch types' },
  ...BRANCH_TYPE_OPTIONS.map((opt) => ({
    id: opt.id,
    name: opt.name
  }))
];

const STATUS_FILTER_OPTIONS = [
  { id: '__all__', name: 'All statuses' },
  ...LOCATION_STATUS_OPTIONS.map((opt) => ({
    id: opt.id,
    name: opt.name
  }))
];

function SectionLocationFiltersInner({ initial = {} }: Props) {
  const initialValues = {
    search: initial.search ?? '',
    branchType: initial.branchType || '__all__',
    status: initial.status || '__all__'
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Search & Filters
      </h2>
      <FilterWrapper
        key={[
          initialValues.search,
          initialValues.branchType,
          initialValues.status
        ].join('|')}
        initialValues={initialValues}
        buttonLabel="Search"
        showClearButton
        preserveQueryKeys={['id']}
        searchButton={{
          variant: 'default',
          className: 'h-10 shrink-0 gap-2'
        }}
      >
        {({ values, setValue }) => (
          <>
            <div className="flex w-60 flex-col justify-end gap-2 self-end">
              <Label
                htmlFor="location-search"
                className="text-xs uppercase text-muted-foreground"
              >
                Search
              </Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="location-search"
                  name="search"
                  data-filter-include
                  defaultValue={values.search ?? ''}
                  placeholder="Name, code, or city..."
                  className="h-10 pl-9"
                  aria-label="Search locations"
                />
              </div>
            </div>

            <div className="flex w-60 flex-col justify-end self-end">
              <Selector
                label="All branch types"
                options={BRANCH_TYPE_FILTER_OPTIONS}
                value={values.branchType}
                defaultValue="__all__"
                showDefaultOption={false}
                onChange={(v) => setValue('branchType', v)}
                className={{ trigger: 'h-10 w-full' }}
              />
            </div>

            <div className="flex w-60 flex-col justify-end self-end">
              <Selector
                label="All statuses"
                options={STATUS_FILTER_OPTIONS}
                value={values.status}
                defaultValue="__all__"
                showDefaultOption={false}
                onChange={(v) => setValue('status', v)}
                className={{ trigger: 'h-10 w-full' }}
              />
            </div>
          </>
        )}
      </FilterWrapper>
    </div>
  );
}

export default function SectionLocationFilters(props: Props) {
  return (
    <Suspense
      fallback={
        <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground shadow-sm">
          Loading filters…
        </div>
      }
    >
      <SectionLocationFiltersInner {...props} />
    </Suspense>
  );
}
