'use client';

import { Combobox, DateRangePicker } from '@archmage/ui';
import { FilterWrapper } from '@/app/(dashboard)/filter-wrapper';
import type { ExtraShiftFilterOption, ExtraShiftListFilters } from './sample-data';

type ExtraShiftFilterSectionProps = ExtraShiftListFilters & {
  staffOptions: ExtraShiftFilterOption[];
  approverOptions: ExtraShiftFilterOption[];
};

export default function ExtraShiftFilterSection({
  staffOptions,
  approverOptions,
  staffId,
  approverId,
  fromDate,
  toDate
}: ExtraShiftFilterSectionProps) {
  const initialValues = {
    staffId: staffId ?? '',
    approverId: approverId ?? '',
    fromDate,
    toDate
  };

  return (
    <FilterWrapper
      key={[
        initialValues.staffId,
        initialValues.approverId,
        initialValues.fromDate,
        initialValues.toDate
      ].join('|')}
      initialValues={initialValues}
      buttonLabel="Search Shift Date"
      showClearButton
    >
      {({ values, setValue }) => (
        <>
          <DateRangePicker
            from={values.fromDate}
            to={values.toDate}
            onChange={({ from, to }) => {
              setValue('fromDate', from);
              setValue('toDate', to);
            }}
          />
          <Combobox
            label="Staff"
            options={staffOptions}
            value={values.staffId ?? ''}
            defaultValue=""
            onChange={(value) => setValue('staffId', value)}
            clearable
          />
          <Combobox
            label="Approved Person"
            options={approverOptions}
            value={values.approverId ?? ''}
            defaultValue=""
            onChange={(value) => setValue('approverId', value)}
            clearable
          />
        </>
      )}
    </FilterWrapper>
  );
}
