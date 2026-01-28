"use client"

import React from 'react';
import { Input } from '@/components/ui/input';

interface NumericCellProps {
  value: number | string;
  onChange: (val: number) => void;
}

export const NumericInputCell: React.FC<NumericCellProps> = ({ value, onChange }) => {
  const [localValue, setLocalValue] = React.useState(value?.toString() ?? '');

  React.useEffect(() => {
    setLocalValue(value?.toString() ?? '');
  }, [value]);

  return (
    <Input
      type="text"
      inputMode="decimal"
      className="p-2 text-right"
      value={localValue}
      onChange={(e) => {
        const val = e.target.value;
        if (/^\d*\.?\d*$/.test(val)) {
          setLocalValue(val);
        }
      }}
      onBlur={() => {
        const num = parseFloat(localValue);
        onChange(isNaN(num) ? 0 : num);
      }}
    />
  );
};
