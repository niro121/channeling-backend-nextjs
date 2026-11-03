'use client';

import { Input, Label } from '@archmage/ui';
import { CustomDateTimePartInput } from './custom-datetime-part-input';
import {
  clampDateTimeParts,
  formatCombinedDateTime,
  type DateTimePartKey,
  type DateTimeParts,
  type DateTimePartsConfig
} from './custom-datetime-parts';

const PART_FIELDS: Array<{ key: DateTimePartKey; label: string }> = [
  { key: 'year', label: 'YYYY' },
  { key: 'month', label: 'MM' },
  { key: 'day', label: 'DD' },
  { key: 'hour', label: 'H' },
  { key: 'minute', label: 'M' },
  { key: 'second', label: 'S' }
];

export type DateTimePartsFieldProps = {
  id: string;
  label: string;
  value: DateTimeParts;
  onChange: (next: DateTimeParts) => void;
  showCombined?: boolean;
  config?: DateTimePartsConfig;
  className?: string;
};

export function CustomDateTimePartsField({
  id,
  label,
  value,
  onChange,
  showCombined = false,
  config,
  className
}: DateTimePartsFieldProps) {
  const handlePartChange = (key: DateTimePartKey, nextValue: string) => {
    const draft = { ...value, [key]: nextValue };
    if (key === 'year' || key === 'month') {
      onChange(clampDateTimeParts(draft, config));
      return;
    }
    onChange(draft);
  };

  return (
    <div className={className ?? 'space-y-2'}>
      <Label className="text-sm font-semibold capitalize text-black">
        {label}
      </Label>
      <div className="grid grid-cols-6 gap-2">
        {PART_FIELDS.map((field) => (
          <CustomDateTimePartInput
            key={field.key}
            id={`${id}-${field.key}`}
            label={field.label}
            partKey={field.key}
            parts={value}
            value={value[field.key]}
            config={config}
            onChange={(nextValue) => handlePartChange(field.key, nextValue)}
          />
        ))}
      </div>
      {showCombined ? (
        <Input
          id={`${id}-combined`}
          readOnly
          value={formatCombinedDateTime(value, config)}
          className="h-9 bg-muted/40 tabular-nums"
        />
      ) : null}
    </div>
  );
}
