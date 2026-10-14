'use client';

import { Suspense } from 'react';
import { Combobox, Selector } from '@archmage/ui';
import { FilterWrapper } from '@/app/(dashboard)/filter-wrapper';
import { BANK_OPTIONS } from '@/types/bank';
import { MONTH_OPTIONS, YEAR_OPTIONS } from '@/types/calendar-options';
import { INSTITUTION_OPTIONS } from '@/types/institution';
import {
  BANK_TRANSFER_BATCH_STATUS_OPTIONS,
  type BankTransferFilters,
  type SalaryFilterOption
} from '@/types/payroll';

type SectionFiltersProps = {
  departmentOptions?: SalaryFilterOption[];
  batchOptions?: SalaryFilterOption[];
  initial?: BankTransferFilters;
};

function SectionFiltersInner({
  departmentOptions = [],
  batchOptions = [],
  initial = {}
}: SectionFiltersProps) {
  const statusOptions = BANK_TRANSFER_BATCH_STATUS_OPTIONS.map((item) => ({
    id: item.id,
    name: item.name
  }));

  const initialValues = {
    salaryMonth: initial.salaryMonth ?? '__all__',
    salaryYear: initial.salaryYear ?? '__all__',
    institution: initial.institution ?? '__all__',
    departmentId: initial.departmentId ?? '',
    bankId: initial.bankId ?? '__all__',
    batchStatus: initial.batchStatus ?? '__all__',
    batchId: initial.batchId ?? ''
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Search & Filters
      </h2>
      <FilterWrapper
        key={[
          initialValues.salaryMonth,
          initialValues.salaryYear,
          initialValues.institution,
          initialValues.departmentId,
          initialValues.bankId,
          initialValues.batchStatus,
          initialValues.batchId
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
            <Selector
              label="Salary Month"
              options={MONTH_OPTIONS}
              value={values.salaryMonth ?? '__all__'}
              defaultValue="__all__"
              onChange={(v) => setValue('salaryMonth', v)}
              className={{ trigger: 'h-10 w-full max-w-none self-end' }}
            />

            <Selector
              label="Salary Year"
              options={YEAR_OPTIONS}
              value={values.salaryYear ?? '__all__'}
              defaultValue="__all__"
              onChange={(v) => setValue('salaryYear', v)}
              className={{ trigger: 'h-10 w-full max-w-none self-end' }}
            />

            <Selector
              label="Institution"
              options={INSTITUTION_OPTIONS}
              value={values.institution ?? '__all__'}
              defaultValue="__all__"
              onChange={(v) => setValue('institution', v)}
              className={{ trigger: 'h-10 w-full max-w-none self-end' }}
            />

            <Combobox
              label="Department"
              options={departmentOptions}
              value={values.departmentId ?? ''}
              defaultValue=""
              onChange={(v) => setValue('departmentId', v)}
              clearable
              triggerClassName="self-end"
            />

            <Selector
              label="Bank"
              options={BANK_OPTIONS}
              value={values.bankId ?? '__all__'}
              defaultValue="__all__"
              onChange={(v) => setValue('bankId', v)}
              className={{ trigger: 'h-10 w-full max-w-none self-end' }}
            />

            <Selector
              label="Batch Status"
              options={statusOptions}
              value={values.batchStatus ?? '__all__'}
              defaultValue="__all__"
              onChange={(v) => setValue('batchStatus', v)}
              className={{ trigger: 'h-10 w-full max-w-none self-end' }}
            />

            <Combobox
              label="Payroll Batch"
              options={batchOptions}
              value={values.batchId ?? ''}
              defaultValue=""
              onChange={(v) => setValue('batchId', v)}
              clearable
              triggerClassName="self-end"
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
