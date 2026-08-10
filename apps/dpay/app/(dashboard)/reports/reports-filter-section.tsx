'use client';

import { FilterWrapper } from '../filter-wrapper';
import { ReportDateRangeFields } from './report-date-range-fields';

type ReportsFilterSectionProps = {
  dateFrom?: string;
  dateTo?: string;
};

export default function ReportsFilterSection({
  dateFrom,
  dateTo,
}: ReportsFilterSectionProps) {
  return (
    <FilterWrapper
      initialValues={{
        dateFrom: dateFrom ?? '',
        dateTo: dateTo ?? '',
      }}
      buttonLabel="Apply"
    >
      {({ values, setValue }) => (
        <ReportDateRangeFields
          dateFrom={values.dateFrom ?? ''}
          dateTo={values.dateTo ?? ''}
          onDateFromChange={(value) => setValue('dateFrom', value)}
          onDateToChange={(value) => setValue('dateTo', value)}
          idPrefix="report"
        />
      )}
    </FilterWrapper>
  );
}
