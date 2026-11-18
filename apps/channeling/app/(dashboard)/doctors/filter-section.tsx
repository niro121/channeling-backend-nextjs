'use client';

import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { FilterWrapper } from '../filter-wrapper';
import { Selector } from '@/components/common/selector';
import { X } from 'lucide-react';

interface DoctorFiltersProps {
  specialityOptions: { id: string; name: string }[];
  locationOptions: { id: string; name: string }[];
  specialityId?: string;
  /** Comma-separated location ids from the URL. */
  locationIds?: string;
}

function parseIds(value?: string): string[] {
  if (!value?.trim()) return [];
  return [...new Set(value.split(',').map((id) => id.trim()).filter(Boolean))];
}

function BranchMultiSelect({
  options,
  value,
  onChange,
}: {
  options: { id: string; name: string }[];
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  const selected = options.filter((o) => value.includes(o.id));
  const available = options.filter((o) => !value.includes(o.id));

  return (
    <Select
      value=""
      onValueChange={(id) => {
        if (!value.includes(id)) onChange([...value, id]);
      }}
      disabled={available.length === 0 && selected.length === 0}
    >
      <SelectTrigger className="min-h-9 h-auto w-60 font-semibold hover:bg-accent hover:text-accent-foreground cursor-pointer py-1.5">
        {selected.length === 0 ? (
          <span className="text-sm truncate">All Branches</span>
        ) : (
          <div className="flex flex-wrap gap-1 max-w-[85%]">
            {selected.map((option) => (
              <Badge
                key={option.id}
                variant="secondary"
                className="flex items-center gap-1 bg-teal-700 text-white hover:bg-teal-600"
              >
                {option.name}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onChange(value.filter((id) => id !== option.id));
                  }}
                />
              </Badge>
            ))}
          </div>
        )}
      </SelectTrigger>
      <SelectContent>
        {available.length === 0 ? (
          <div className="px-3 py-2 text-sm text-muted-foreground">All branches selected</div>
        ) : (
          available.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.name}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}

export default function FilterSection({
  specialityOptions,
  locationOptions,
  specialityId,
  locationIds,
}: DoctorFiltersProps) {
  return (
    <FilterWrapper
      initialValues={{
        specialityId,
        locationIds,
      }}
    >
      {({ values, setValue }) => (
        <>
          <Selector
            label="All Specialities"
            options={specialityOptions}
            value={values.specialityId}
            onChange={(v) => setValue('specialityId', v)}
          />
          <BranchMultiSelect
            options={locationOptions}
            value={parseIds(values.locationIds)}
            onChange={(ids) => setValue('locationIds', ids.length ? ids.join(',') : undefined)}
          />
        </>
      )}
    </FilterWrapper>
  );
}
