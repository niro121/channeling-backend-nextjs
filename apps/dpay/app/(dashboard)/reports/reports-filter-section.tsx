'use client';

import { FilterWrapper } from '../filter-wrapper';

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
        <>
          <input
            type="date"
            value={values.dateFrom ?? ''}
            onChange={(e) => setValue('dateFrom', e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            aria-label="Date from"
          />
          <input
            type="date"
            value={values.dateTo ?? ''}
            onChange={(e) => setValue('dateTo', e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            aria-label="Date to"
          />
        </>
      )}
    </FilterWrapper>
  );
}
