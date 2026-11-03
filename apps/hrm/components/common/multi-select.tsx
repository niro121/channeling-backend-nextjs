'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import {
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger
} from '@archmage/ui';

export type MultiSelectOption = {
  id: string;
  name: string;
};

type MultiSelectProps = {
  id?: string;
  options: MultiSelectOption[];
  value: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  badgeClassName?: string;
};

export function MultiSelect({
  id,
  options,
  value,
  onChange,
  placeholder = 'Select options',
  disabled = false,
  className,
  badgeClassName
}: MultiSelectProps) {
  const selectedOptions = options.filter((o) => value.includes(o.id));
  const availableOptions = options.filter((o) => !value.includes(o.id));

  const handleSelect = (val: string) => {
    if (!value.includes(val)) {
      onChange([...value, val]);
    }
  };

  const handleRemove = (val: string, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange(value.filter((v) => v !== val));
  };

  return (
    <Select
      value=""
      onValueChange={handleSelect}
      disabled={disabled || availableOptions.length === 0}
    >
      <SelectTrigger
        id={id}
        className={`flex h-auto min-h-10 w-full flex-wrap items-start gap-1 py-2 disabled:opacity-95 ${className ?? ''}`}
      >
        {selectedOptions.length === 0 && (
          <span className="truncate text-sm text-muted-foreground">
            {placeholder}
          </span>
        )}

        {selectedOptions.length > 0 && (
          <div className="flex max-w-[85%] flex-wrap gap-1">
            {selectedOptions.map((option) => (
              <Badge
                key={option.id}
                variant="secondary"
                className={`flex cursor-pointer items-center gap-1 ${
                  badgeClassName ||
                  'bg-teal-700 text-white hover:bg-teal-600'
                }`}
              >
                {option.name}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onPointerDown={(e) => handleRemove(option.id, e)}
                />
              </Badge>
            ))}
          </div>
        )}
      </SelectTrigger>

      <SelectContent>
        {availableOptions.map((option) => (
          <SelectItem key={option.id} value={option.id}>
            {option.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
