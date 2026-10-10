'use client';

import {
  Combobox,
  DateRangePicker,
  Selector
} from '@archmage/ui';
import { FilterWrapper } from '@/app/(dashboard)/filter-wrapper';

type FilterOption = {
  id: string;
  name: string;
};

type FilterValues = Record<string, string | undefined>;

interface LeaveEntitlementFilterSectionProps {
  employeeOptions: FilterOption[];
  departmentOptions: FilterOption[];
  leaveTypeOptions: FilterOption[];
  employeeId?: string;
  departmentId?: string;
  leaveType?: string;
  fromDate?: string;
  toDate?: string;
  onValuesChange?: (values: FilterValues) => void;
}

export default function LeaveEntitlementFilterSection({
  employeeOptions,
  departmentOptions,
  leaveTypeOptions,
  employeeId,
  departmentId,
  leaveType,
  fromDate,
  toDate,
  onValuesChange
}: LeaveEntitlementFilterSectionProps) {
  const initialValues = {
    employeeId: employeeId ?? '',
    departmentId: departmentId ?? '',
    leaveType,
    fromDate,
    toDate
  };

  return (
    <FilterWrapper
      key={[
        initialValues.employeeId,
        initialValues.departmentId,
        initialValues.leaveType,
        initialValues.fromDate,
        initialValues.toDate
      ].join('|')}
      initialValues={initialValues}
      buttonLabel="Search"
      showClearButton
      onValuesChange={onValuesChange}
    >
      {({ values, setValue }) => (
        <>
          <Combobox
            label="Select Employee"
            options={employeeOptions}
            value={values.employeeId ?? ''}
            defaultValue=""
            onChange={(v) => setValue('employeeId', v)}
            clearable
          />
          <Combobox
            label="Select Department"
            options={departmentOptions}
            value={values.departmentId ?? ''}
            defaultValue=""
            onChange={(v) => setValue('departmentId', v)}
            clearable
          />
          <Selector
            label="All Leave Types"
            options={leaveTypeOptions}
            value={values.leaveType}
            defaultValue="__all__"
            onChange={(v) => setValue('leaveType', v)}
          />
          <DateRangePicker
            from={values.fromDate}
            to={values.toDate}
            onChange={({ from, to }) => {
              setValue('fromDate', from);
              setValue('toDate', to);
            }}
          />
        </>
      )}
    </FilterWrapper>
  );
}
