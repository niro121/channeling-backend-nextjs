'use client';

import { Suspense } from 'react';
import { CustomDatePickerField, Input, Label, Selector } from '@archmage/ui';
import { FilterWrapper } from '@/app/(dashboard)/filter-wrapper';
import {
  PROMOTION_STATUS_LABELS,
  PROMOTION_STATUSES,
  PROMOTION_TYPE_LABELS,
  PROMOTION_TYPES,
  type PerformanceSelectOption,
  type PromotionFilters
} from '@/types/performance';

type SectionFiltersProps = {
  initial?: PromotionFilters;
  institutionOptions?: PerformanceSelectOption[];
  departmentOptions?: PerformanceSelectOption[];
  currentDesignationOptions?: PerformanceSelectOption[];
  proposedDesignationOptions?: PerformanceSelectOption[];
};

const labelClassName = 'text-xs uppercase text-muted-foreground';
const selectTriggerClass = { trigger: 'h-10 w-full max-w-none' };

function parseFilterDate(value?: string): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toYmd(date?: Date): string {
  if (!date) return '';
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function SectionFiltersInner({
  initial = {},
  institutionOptions = [],
  departmentOptions = [],
  currentDesignationOptions = [],
  proposedDesignationOptions = []
}: SectionFiltersProps) {
  const typeOptions = PROMOTION_TYPES.map((id) => ({
    id,
    name: PROMOTION_TYPE_LABELS[id]
  }));
  const statusOptions = PROMOTION_STATUSES.map((id) => ({
    id,
    name: PROMOTION_STATUS_LABELS[id]
  }));

  const initialValues = {
    staffName: initial.staffName ?? '',
    staffCode: initial.staffCode ?? '',
    institution: initial.institution ?? '__all__',
    department: initial.department ?? '__all__',
    currentDesignation: initial.currentDesignation ?? '__all__',
    proposedDesignation: initial.proposedDesignation ?? '__all__',
    promotionType: initial.promotionType ?? '__all__',
    requestDate: initial.requestDate ?? '',
    effectiveDate: initial.effectiveDate ?? '',
    approvalStatus: initial.approvalStatus ?? '__all__'
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Search & Filters
      </h2>
      <FilterWrapper
        key={Object.values(initialValues).join('|')}
        initialValues={initialValues}
        buttonLabel="Search"
        clearButtonLabel="Reset"
        showClearButton
        searchButton={{
          variant: 'default',
          className: 'h-10 shrink-0 gap-2'
        }}
      >
        {({ values, setValue }) => (
          <div className="grid w-full gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="pm-staff-name" className={labelClassName}>
                Staff Name
              </Label>
              <Input
                id="pm-staff-name"
                value={values.staffName ?? ''}
                onChange={(e) => setValue('staffName', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pm-staff-code" className={labelClassName}>
                Staff Code
              </Label>
              <Input
                id="pm-staff-code"
                value={values.staffCode ?? ''}
                onChange={(e) => setValue('staffCode', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className={labelClassName}>Institution</Label>
              <Selector
                label="Select Institution"
                options={institutionOptions}
                value={values.institution ?? '__all__'}
                defaultValue="__all__"
                onChange={(v) => setValue('institution', v)}
                className={selectTriggerClass}
              />
            </div>

            <div className="space-y-2">
              <Label className={labelClassName}>Department</Label>
              <Selector
                label="Select Department"
                options={departmentOptions}
                value={values.department ?? '__all__'}
                defaultValue="__all__"
                onChange={(v) => setValue('department', v)}
                className={selectTriggerClass}
              />
            </div>

            <div className="space-y-2">
              <Label className={labelClassName}>Current Designation</Label>
              <Selector
                label="Select Current Designation"
                options={currentDesignationOptions}
                value={values.currentDesignation ?? '__all__'}
                defaultValue="__all__"
                onChange={(v) => setValue('currentDesignation', v)}
                className={selectTriggerClass}
              />
            </div>

            <div className="space-y-2">
              <Label className={labelClassName}>Proposed Designation</Label>
              <Selector
                label="Select Proposed Designation"
                options={proposedDesignationOptions}
                value={values.proposedDesignation ?? '__all__'}
                defaultValue="__all__"
                onChange={(v) => setValue('proposedDesignation', v)}
                className={selectTriggerClass}
              />
            </div>

            <div className="space-y-2">
              <Label className={labelClassName}>Promotion Type</Label>
              <Selector
                label="Select Promotion Type"
                options={typeOptions}
                value={values.promotionType ?? '__all__'}
                defaultValue="__all__"
                onChange={(v) => setValue('promotionType', v)}
                className={selectTriggerClass}
              />
            </div>

            <CustomDatePickerField
              id="pm-request-date"
              placeholder="Request Date"
              value={parseFilterDate(values.requestDate)}
              onChange={(date) => setValue('requestDate', toYmd(date))}
              onBlur={() => undefined}
              required={false}
              useFormikError={false}
              styleClasses={{
                parentDiv: 'space-y-2',
                labelClassName,
                inputClassName: 'w-full'
              }}
            />

            <CustomDatePickerField
              id="pm-effective-date"
              placeholder="Effective Date"
              value={parseFilterDate(values.effectiveDate)}
              onChange={(date) => setValue('effectiveDate', toYmd(date))}
              onBlur={() => undefined}
              required={false}
              useFormikError={false}
              styleClasses={{
                parentDiv: 'space-y-2',
                labelClassName,
                inputClassName: 'w-full'
              }}
            />

            <div className="space-y-2">
              <Label className={labelClassName}>Approval Status</Label>
              <Selector
                label="Select Approval Status"
                options={statusOptions}
                value={values.approvalStatus ?? '__all__'}
                defaultValue="__all__"
                onChange={(v) => setValue('approvalStatus', v)}
                className={selectTriggerClass}
              />
            </div>
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
