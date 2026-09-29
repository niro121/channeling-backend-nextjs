'use client';

import { Suspense } from 'react';
import { Search } from 'lucide-react';
import {
  Combobox,
  Input,
  Label,
  Selector
} from '@archmage/ui';
import { FilterWrapper } from '@/app/(dashboard)/filter-wrapper';
import { MONTH_OPTIONS, YEAR_OPTIONS } from '@/types/calendar-options';
import { INSTITUTION_OPTIONS } from '@/types/institution';
import {
  PAYSLIP_PAYMENT_STATUS_OPTIONS,
  type PaysheetStaffOption,
  type PayslipFilters,
  type SalaryFilterOption
} from '@/types/payroll';

type SectionFiltersProps = {
  staffOptions?: PaysheetStaffOption[];
  departmentOptions?: SalaryFilterOption[];
  designationOptions?: SalaryFilterOption[];
  initial?: PayslipFilters;
};

function SectionFiltersInner({
  staffOptions = [],
  departmentOptions = [],
  designationOptions = [],
  initial = {}
}: SectionFiltersProps) {
  const statusOptions = PAYSLIP_PAYMENT_STATUS_OPTIONS.map((item) => ({
    id: item.id,
    name: item.name
  }));

  const initialValues = {
    salaryMonth: initial.salaryMonth ?? '__all__',
    salaryYear: initial.salaryYear ?? '__all__',
    staffId: initial.staffId ?? '',
    staffCode: initial.staffCode ?? '',
    departmentId: initial.departmentId ?? '',
    designationId: initial.designationId ?? '',
    institution: initial.institution ?? '__all__',
    paymentStatus: initial.paymentStatus ?? '__all__'
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
          initialValues.staffId,
          initialValues.staffCode,
          initialValues.departmentId,
          initialValues.designationId,
          initialValues.institution,
          initialValues.paymentStatus
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

            <Combobox
              label="Staff"
              options={staffOptions}
              value={values.staffId ?? ''}
              defaultValue=""
              onChange={(v) => setValue('staffId', v)}
              clearable
              triggerClassName="self-end"
            />

            <div className="space-y-2">
              <Label
                htmlFor="payslip-staff-code"
                className="text-xs uppercase text-muted-foreground"
              >
                Staff Code
              </Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="payslip-staff-code"
                  className="pl-8"
                  placeholder="E-0000"
                  value={values.staffCode ?? ''}
                  onChange={(e) => setValue('staffCode', e.target.value)}
                />
              </div>
            </div>

            <Combobox
              label="Department"
              options={departmentOptions}
              value={values.departmentId ?? ''}
              defaultValue=""
              onChange={(v) => setValue('departmentId', v)}
              clearable
              triggerClassName="self-end"
            />

            <Combobox
              label="Designation"
              options={designationOptions}
              value={values.designationId ?? ''}
              defaultValue=""
              onChange={(v) => setValue('designationId', v)}
              clearable
              triggerClassName="self-end"
            />

            <Selector
              label="Institution"
              options={INSTITUTION_OPTIONS}
              value={values.institution ?? '__all__'}
              defaultValue="__all__"
              onChange={(v) => setValue('institution', v)}
              className={{ trigger: 'h-10 w-full max-w-none self-end' }}
            />

            <Selector
              label="Payroll Status"
              options={statusOptions}
              value={values.paymentStatus ?? '__all__'}
              defaultValue="__all__"
              onChange={(v) => setValue('paymentStatus', v)}
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
