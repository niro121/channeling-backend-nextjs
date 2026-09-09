'use client';

import { Selector } from '@archmage/ui';
import { FilterWrapper } from '@/app/(dashboard)/filter-wrapper';

type FilterValues = Record<string, string | undefined>;

type LeaveTypeFilterSectionProps = {
  status?: string;
  isPaid?: string;
  requiresApproval?: string;
  allowHalfDay?: string;
  onValuesChange?: (values: FilterValues) => void;
};

const YES_NO_OPTIONS = [
  { id: 'yes', name: 'Yes' },
  { id: 'no', name: 'No' }
];

const STATUS_OPTIONS = [
  { id: '1', name: 'Published' },
  { id: '0', name: 'Unpublished' }
];

export default function LeaveTypeFilterSection({
  status,
  isPaid,
  requiresApproval,
  allowHalfDay,
  onValuesChange
}: LeaveTypeFilterSectionProps) {
  const initialValues = {
    status,
    isPaid,
    requiresApproval,
    allowHalfDay
  };

  return (
    <FilterWrapper
      key={Object.values(initialValues).join('|')}
      initialValues={initialValues}
      buttonLabel="Search"
      showClearButton
      onValuesChange={onValuesChange}
    >
      {({ values, setValue }) => (
        <>
          <Selector
            label="All Statuses"
            options={STATUS_OPTIONS}
            value={values.status}
            defaultValue="__all__"
            onChange={(v) => setValue('status', v)}
          />
          <Selector
            label="All Paid Types"
            options={YES_NO_OPTIONS}
            value={values.isPaid}
            defaultValue="__all__"
            onChange={(v) => setValue('isPaid', v)}
          />
          <Selector
            label="Approval Required"
            options={YES_NO_OPTIONS}
            value={values.requiresApproval}
            defaultValue="__all__"
            onChange={(v) => setValue('requiresApproval', v)}
          />
          <Selector
            label="Half-day Allowed"
            options={YES_NO_OPTIONS}
            value={values.allowHalfDay}
            defaultValue="__all__"
            onChange={(v) => setValue('allowHalfDay', v)}
          />
        </>
      )}
    </FilterWrapper>
  );
}
