'use client';

import { Combobox, Selector } from '@archmage/ui';
import { FilterWrapper } from '@/app/(dashboard)/filter-wrapper';

type FilterOption = {
  id: string;
  name: string;
};

type FilterValues = Record<string, string | undefined>;

type UserGroupFilterSectionProps = {
  groupOptions: FilterOption[];
  userGroupId?: string;
  status?: string;
  onValuesChange?: (values: FilterValues) => void;
};

const STATUS_OPTIONS = [
  { id: '1', name: 'Published' },
  { id: '0', name: 'Unpublished' }
];

export default function UserGroupFilterSection({
  groupOptions,
  userGroupId,
  status,
  onValuesChange
}: UserGroupFilterSectionProps) {
  const initialValues = {
    userGroupId: userGroupId ?? '',
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
          <Combobox
            label="Select Group"
            options={groupOptions}
            value={values.userGroupId ?? ''}
            defaultValue=""
            onChange={(v) => setValue('userGroupId', v)}
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
