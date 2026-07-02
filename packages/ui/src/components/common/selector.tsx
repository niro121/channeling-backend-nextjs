import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../ui/select';
import { Loader2 } from 'lucide-react';

type Option = {
  id: string;
  name: string;
};

type SelectorProps = {
  label: string
  value?: string;
  options: Option[];
  defaultValue?: string;
  showDefaultOption?: boolean;
  onChange: (value: string) => void
  className?: {
    trigger?: string,
    content?: string
  }
  disabled?: boolean;
  loading?: boolean;
};

export function Selector({
  label,
  options,
  value,
  onChange,
  defaultValue = '__all__',
  showDefaultOption = true,
  className,
  disabled: disabledProp,
  loading = false,
}: SelectorProps) {
  const disabled = loading || options.length === 0 || disabledProp;
  const selectedValue = value ?? defaultValue;
  const selectedLabel =
    selectedValue === defaultValue
      ? label
      : options.find((o) => o.id === selectedValue)?.name ?? label;

  return (
    <Select value={selectedValue} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger
        className={`w-60 font-semibold hover:bg-accent hover:text-accent-foreground cursor-pointer ${className?.trigger || ""}`}
        disabled={disabled}
      >
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin opacity-70" /> : null}
        <span className="truncate">{selectedLabel}</span>
      </SelectTrigger>
      <SelectContent className={`${className?.content || ""}`}>
        {loading ? (
          <div className="py-2 px-3 text-sm text-muted-foreground">Loading...</div>
        ) : (
          <>
            {showDefaultOption ? (
              <SelectItem value={defaultValue} className="[&>span:first-child]:hidden">
                {label}
              </SelectItem>
            ) : null}
            {options.map((s) => (
              <SelectItem key={s.id} value={s.id} className="[&>span:first-child]:hidden">
                {s.name}
              </SelectItem>
            ))}
          </>
        )}
      </SelectContent>
    </Select>
  );
}
