"use client"
'use client';

import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../ui/select';
import { Button } from '../ui/button';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

type Option = {
  id: string;
  name: string;
};

type SelectorFilterProps = {
  label: string
  options: Option[];
  defaultValue: string
  keyword: string
  initialId?: string;
};

export function SelectorFilter({
  label,
  options,
  initialId,
  keyword,
  defaultValue = '__all__'
}: SelectorFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [value, setValue] = React.useState(
    initialId && initialId.length > 0
      ? initialId
      : defaultValue
  );

  const applyFilter = () => {
    const params = new URLSearchParams(searchParams.toString());

    if (value && value !== defaultValue) {
      params.set(keyword, value);
    } else {
      params.delete(keyword);
    }

    // reset page when changing filter
    params.delete('page');

    const queryString = params.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname);
  };

  return (
    <div className="flex items-center gap-2">
      <Select
        value={value}
        onValueChange={(val) => {
          setValue(val);
        }}
      >
        <SelectTrigger className="`w-60 font-semibold hover:bg-accent hover:text-accent-foreground cursor-pointer">
          <SelectValue placeholder="Filter by Speciality" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={defaultValue}>
            {label}
          </SelectItem>
          {options.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="button" size="sm" variant="outline" onClick={applyFilter}>
        Apply
      </Button>
    </div>
  );
}
