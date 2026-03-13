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
  className?: {
    trigger?: string,
    content?: string
  }
};

export function Selector({
  label,
  options,
  value,
  onChange,
  defaultValue = '__all__',
  className
}: SelectorProps) {
  const hasDefaultInOptions = options.some((o) => o.id === (value ?? defaultValue));

  return (
    <Select value={value ?? defaultValue} onValueChange={onChange}>
      <SelectTrigger className={`w-60 font-semibold hover:bg-accent hover:text-accent-foreground cursor-pointer ${className?.trigger || ""}`} disabled={options.length === 0}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent className={`${className?.content || ""}`}>
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
