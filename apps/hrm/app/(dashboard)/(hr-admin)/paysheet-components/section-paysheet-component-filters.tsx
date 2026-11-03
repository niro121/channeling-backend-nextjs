'use client';

import { Suspense } from 'react';
import { Search } from 'lucide-react';
import { Input, Label, Selector } from '@archmage/ui';
import { FilterWrapper } from '@/app/(dashboard)/filter-wrapper';
import { MultiSelect } from '@/components/common/multi-select';
import {
  PAYSHEET_COMPONENT_INCLUDED_FOR,
  PAYSHEET_COMPONENT_INCLUDED_FOR_LABELS,
  PAYSHEET_COMPONENT_TYPES,
  PAYSHEET_COMPONENT_TYPE_LABELS,
  type PaysheetComponentKind
} from '@/types/paysheet-component';

export type PaysheetComponentListFilters = {
  search?: string;
  typeId?: string;
  includedFor?: string;
};

type Props = {
  activeKind: PaysheetComponentKind;
  initial?: PaysheetComponentListFilters;
};

const TYPE_FILTER_OPTIONS = [
  { id: '__all__', name: 'All types' },
  ...PAYSHEET_COMPONENT_TYPES.map((id) => ({
    id,
    name: PAYSHEET_COMPONENT_TYPE_LABELS[id]
  }))
];

const INCLUDED_FOR_OPTIONS = PAYSHEET_COMPONENT_INCLUDED_FOR.map((id) => ({
  id,
  name: PAYSHEET_COMPONENT_INCLUDED_FOR_LABELS[id]
}));

function SectionPaysheetComponentFiltersInner({
  activeKind,
  initial = {}
}: Props) {
  const initialValues = {
    search: initial.search ?? '',
    typeId: initial.typeId || '__all__',
    includedFor: initial.includedFor ?? '',
    kind: activeKind
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Search & Filters
      </h2>
      <FilterWrapper
        key={[
          activeKind,
          initialValues.search,
          initialValues.typeId,
          initialValues.includedFor
        ].join('|')}
        initialValues={initialValues}
        buttonLabel="Search"
        showClearButton
        preserveQueryKeys={['kind']}
        searchButton={{
          variant: 'default',
          className: 'h-10 shrink-0 gap-2'
        }}
      >
        {({ values, setValue }) => (
          <>
            <div className="flex w-60 flex-col justify-end gap-2 self-end">
              <Label
                htmlFor="paysheet-component-search"
                className="text-xs uppercase text-muted-foreground"
              >
                Search
              </Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="paysheet-component-search"
                  name="search"
                  data-filter-include
                  defaultValue={values.search ?? ''}
                  placeholder="Name, code, type..."
                  className="h-10 pl-9"
                  aria-label="Search paysheet components"
                />
              </div>
            </div>

            <div className="flex w-60 flex-col justify-end self-end">
              <Selector
                label="Component Type"
                options={TYPE_FILTER_OPTIONS}
                value={values.typeId}
                defaultValue="__all__"
                onChange={(v) => setValue('typeId', v)}
                className={{ trigger: 'h-10 w-full' }}
              />
            </div>

            <div className="flex w-60 flex-col justify-end gap-2 self-end">
              <Label className="text-xs uppercase text-muted-foreground">
                Included for
              </Label>
              <MultiSelect
                key={`included-${values.includedFor ?? 'none'}-${activeKind}`}
                id="includedFor"
                options={INCLUDED_FOR_OPTIONS}
                value={
                  (values.includedFor ?? '')
                    .split(',')
                    .map((v) => v.trim())
                    .filter(Boolean)
                }
                onChange={(ids) =>
                  setValue('includedFor', ids.length ? ids.join(',') : undefined)
                }
                placeholder="Select included for"
                className="min-h-10 w-full"
              />
            </div>
          </>
        )}
      </FilterWrapper>
    </div>
  );
}

export default function SectionPaysheetComponentFilters(props: Props) {
  return (
    <Suspense
      fallback={
        <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground shadow-sm">
          Loading filters…
        </div>
      }
    >
      <SectionPaysheetComponentFiltersInner {...props} />
    </Suspense>
  );
}
