'use client';

import { FilterWrapper } from '../filter-wrapper';
import { Selector } from '@/components/common/selector';

interface TagFiltersProps {
  tagTypeOptions: { id: string; name: string }[];
  typeId?: string;
}

export default function FilterSection({
  tagTypeOptions,
  typeId
}: TagFiltersProps) {
  return (
    <FilterWrapper
      initialValues={{
        type: typeId
      }}
    >
      {({ values, setValue }) => (
        <>
          <Selector
            label="All Tag Types"
            options={tagTypeOptions}
            value={values.type}
            onChange={(v) => setValue('type', v)}
          />
        </>
      )}
    </FilterWrapper>
  );
}
