'use client';

import { DateRangePicker } from '@/components/common/date-range-picker';
import { FilterWrapper } from '../filter-wrapper';
import { Combobox } from '@/components/common/combobox';

export type ShiftUserOption = { id: string; name: string };

interface ShiftsFilterSectionProps {
  userOptions: ShiftUserOption[];
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export default function ShiftsFilterSection({
  userOptions,
  userId,
  dateFrom,
  dateTo,
}: ShiftsFilterSectionProps) {
  const options = [
    { id: '__all__', name: 'All users' },
    ...userOptions.map((u) => ({ id: u.id, name: u.name })),
  ];
  return (
    <FilterWrapper
      initialValues={{
        userId: userId ?? '__all__',
        fromDate: dateFrom,
        toDate: dateTo,
      }}
    >
      {({ values, setValue }) => (
        <>
          <Combobox
            label="User"
            options={options}
            value={values.userId ?? '__all__'}
            defaultValue="__all__"
            onChange={(v) => setValue('userId', v)}
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
