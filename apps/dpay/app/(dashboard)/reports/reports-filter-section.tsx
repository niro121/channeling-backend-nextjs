'use client';

import { FilterWrapper } from '../filter-wrapper';
import {
  DateTimeRangePicker,
  getDefaultDateTimeRange,
} from '@/components/common/date-time-range-picker';

type ReportsFilterSectionProps = {
  dateFrom?: string;
  dateTo?: string;
};

export default function ReportsFilterSection({
  dateFrom,
  dateTo,
}: ReportsFilterSectionProps) {
  const defaults = getDefaultDateTimeRange();

  return (
    <FilterWrapper
      initialValues={{
        dateFrom: dateFrom || defaults.from,
        dateTo: dateTo || defaults.to,
      }}
      buttonLabel="Apply"
    >
      {({ values, setValue }) => (
        <DateTimeRangePicker
          label="Date & Time Range"
          from={values.dateFrom}
          to={values.dateTo}
          onChange={({ from, to }) => {
            setValue('dateFrom', from);
            setValue('dateTo', to);
          }}
        />
      )}
    </FilterWrapper>
  );
}
