"use client"

import React from 'react';
import { Input } from '@/components/ui/input';

const formatFee = (v: number | string): string => {
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return (isNaN(n) ? 0 : n).toFixed(2);
};

interface NumericCellProps {
  value: number | string;
  onChange: (val: number) => void;
}

export const NumericInputCell: React.FC<NumericCellProps> = ({ value, onChange }) => {
  const [localValue, setLocalValue] = React.useState(() => formatFee(value ?? 0));
  const isFocusedRef = React.useRef(false);

  React.useEffect(() => {
    if (!isFocusedRef.current) {
      setLocalValue(formatFee(value ?? 0));
    }
  }, [value]);

  return (
    <Input
      type="text"
      inputMode="decimal"
      className="h-8 w-24 px-2 text-right text-sm tabular-nums"
      value={localValue}
      placeholder="0.00"
      onFocus={() => {
        isFocusedRef.current = true;
      }}
      onChange={(e) => {
        const val = e.target.value;
        if (/^\d*\.?\d*$/.test(val)) {
          setLocalValue(val);
        }
      }}
      onBlur={() => {
        isFocusedRef.current = false;
        const num = parseFloat(localValue);
        const parsed = isNaN(num) ? 0 : num;
        onChange(parsed);
        setLocalValue(formatFee(parsed));
      }}
    />
  );
};
