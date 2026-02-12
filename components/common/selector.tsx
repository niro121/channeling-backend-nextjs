import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

type Option = {
  id: string;
  name: string;
};

type SelectorProps = {
  label: string
  value?: string;
  options: Option[];
  defaultValue?: string;
  onChange: (value: string) => void
};

export function Selector({
  label,
  options,
  value,
  onChange,
  defaultValue = '__all__'
}: SelectorProps) {
  const hasDefaultInOptions = options.some((o) => o.id === (value ?? defaultValue));

  return (
    <Select value={value ?? defaultValue} onValueChange={onChange}>
      <SelectTrigger className="w-60" disabled={options.length === 0}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={defaultValue} className="[&>span:first-child]:hidden">
          {label}
        </SelectItem>
        {options.map((s) => (
          <SelectItem key={s.id} value={s.id} className="[&>span:first-child]:hidden">
            {s.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
