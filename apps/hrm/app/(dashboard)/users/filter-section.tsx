'use client';

import { Combobox, Input, Selector } from '@archmage/ui';
import { FilterWrapper } from '@/app/(dashboard)/filter-wrapper';

type FilterOption = {
  id: string;
  name: string;
};

type FilterValues = Record<string, string | undefined>;

type UserFilterSectionProps = {
  userOptions: FilterOption[];
  userId?: string;
  keyword?: string;
  status?: string;
  onValuesChange?: (values: FilterValues) => void;
};

const STATUS_OPTIONS = [
  { id: '1', name: 'Published' },
  { id: '0', name: 'Unpublished' }
];

export default function UserFilterSection({
  userOptions,
  userId,
  keyword,
  status,
  onValuesChange
}: UserFilterSectionProps) {
  const initialValues = {
    userId: userId ?? '',
    keyword: keyword ?? '',
    status
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
        <Input
            name="keyword"
            placeholder="Search email, staff, staff code"
            className="w-60 h-10"
            value={values.keyword ?? ''}
            onChange={(e) => setValue('keyword', e.target.value)}
          />
          <Combobox
            label="Select User"
            options={userOptions}
            value={values.userId ?? ''}
            defaultValue=""
            onChange={(v) => setValue('userId', v)}
            clearable
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
