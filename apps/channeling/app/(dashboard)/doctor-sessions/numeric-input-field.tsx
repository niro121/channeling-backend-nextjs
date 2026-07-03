"use client"

import React from 'react';
import { Input } from '@/components/ui/input';

/** Format for display: full number with commas and 2 decimals (e.g. 1,500.00) */
const formatFeeDisplay = (v: number | string): string => {
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/,/g, ''));
  return (isNaN(n) ? 0 : n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

interface NumericCellProps {
  value: number | string;
  onChange: (val: number) => void;
}

export const NumericInputCell: React.FC<NumericCellProps> = ({ value, onChange }) => {
  const [localValue, setLocalValue] = React.useState(() => formatFeeDisplay(value ?? 0));
  const isFocusedRef = React.useRef(false);

  React.useEffect(() => {
    if (!isFocusedRef.current) {
      setLocalValue(formatFeeDisplay(value ?? 0));
    }
  }, [value]);

  return (
    <Input
      type="text"
      inputMode="decimal"
      className="h-8 min-w-[6rem] w-28 px-2 text-right text-sm tabular-nums"
      value={localValue}
      placeholder="0.00"
      onFocus={() => {
        isFocusedRef.current = true;
        const num = parseFloat(String(localValue).replace(/,/g, ''));
        if (!isNaN(num)) setLocalValue(num.toFixed(2));
      }}
      onChange={(e) => {
        const val = e.target.value;
        if (/^\d*\.?\d*$/.test(val)) {
          setLocalValue(val);
        }
      }}
      onBlur={() => {
        isFocusedRef.current = false;
        const num = parseFloat(String(localValue).replace(/,/g, ''));
        const parsed = isNaN(num) ? 0 : num;
        onChange(parsed);
        setLocalValue(formatFeeDisplay(parsed));
      }}
    />
  );
};
