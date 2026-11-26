'use client';

import { Input, Selector } from '@archmage/ui';
import { FilterWrapper } from '@/app/(dashboard)/filter-wrapper';

type StaffFilterSectionProps = {
  keyword?: string;
  status?: string;
};

const STATUS_OPTIONS = [
  { id: '1', name: 'Published' },
  { id: '0', name: 'Unpublished' }
];

export default function StaffFilterSection({
  keyword,
  status
}: StaffFilterSectionProps) {
  const initialValues = {
    keyword: keyword ?? '',
    status
  };

  return (
    <FilterWrapper
      key={Object.values(initialValues).join('|')}
      initialValues={initialValues}
      buttonLabel="Search"
      showClearButton
    >
      {({ values, setValue }) => (
        <>
          <Input
            name="keyword"
            placeholder="Search by name, code, NIC, contact"
            className="w-60 h-10"
            value={values.keyword ?? ''}
            onChange={(e) => setValue('keyword', e.target.value)}
          />
          <Selector
            label="All Statuses"
            options={STATUS_OPTIONS}
            value={values.status}
            defaultValue="__all__"
            onChange={(v) => setValue('status', v)}
          />
        </>
      )}
    </FilterWrapper>
  );
}
