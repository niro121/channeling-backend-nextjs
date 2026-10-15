'use client';

import { Button, Input, Label } from '@archmage/ui';
import { cn } from '@/lib/utils';

const HEX_6_REGEX = /^#([0-9A-Fa-f]{6})$/;
const HEX_3_OR_6_REGEX = /^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/;

const DEFAULT_FALLBACK_COLOR = '#64748b';

export const DEFAULT_COLOR_SWATCHES = [
  '#22c55e',
  '#16a34a',
  '#3b82f6',
  '#2563eb',
  '#ef4444',
  '#f59e0b',
  '#a855f7',
  '#64748b',
  '#0f172a',
  '#ffffff'
] as const;

export type CustomColorPickerStyleClasses = {
  parentDiv?: string;
  labelClassName?: string;
  inputClassName?: string;
};

export type CustomColorPickerProps = {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  /** Shown in the native picker when the text value is empty or invalid. */
  fallbackColor?: string;
  swatches?: readonly string[];
  showSwatches?: boolean;
  styleClasses?: CustomColorPickerStyleClasses;
  className?: string;
};

/** Expand `#abc` → `#aabbcc` for the native color input. */
export function expandHexColor(value: string): string | null {
  const trimmed = value.trim();
  if (HEX_6_REGEX.test(trimmed)) return trimmed.toLowerCase();
  const short = trimmed.match(/^#([0-9A-Fa-f]{3})$/);
  if (!short) return null;
  const [r, g, b] = short[1].split('');
  return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
}

export function isValidHexColor(value: string): boolean {
  return HEX_3_OR_6_REGEX.test(value.trim());
}

export function CustomColorPicker({
  id = 'color',
  label = 'Color',
  value,
  onChange,
  onBlur,
  placeholder = '#22c55e',
  required = false,
  disabled = false,
  error,
  fallbackColor = DEFAULT_FALLBACK_COLOR,
  swatches = DEFAULT_COLOR_SWATCHES,
  showSwatches = true,
  styleClasses,
  className
}: CustomColorPickerProps) {
  const pickerId = `${id}-picker`;
  const textId = id;
  const expanded = expandHexColor(value);
  const pickerValue = expanded ?? fallbackColor;

  return (
    <div
      className={cn(
        styleClasses?.parentDiv ?? 'grid grid-cols-1 gap-1.5 items-start',
        className
      )}
    >
      <Label
        htmlFor={textId}
        className={
          styleClasses?.labelClassName ??
          'text-xs font-medium uppercase tracking-wide text-muted-foreground'
        }
      >
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>

      <div
        className={cn(
          'flex flex-col gap-2',
          styleClasses?.inputClassName ?? 'w-full'
        )}
      >
        <div className="flex items-center gap-2">
          <input
            id={pickerId}
            type="color"
            value={pickerValue}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value.toLowerCase())}
            onBlur={onBlur}
            className="h-10 w-12 shrink-0 cursor-pointer rounded-md border border-input bg-transparent p-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            title="Pick color"
            aria-label={`${label} picker`}
          />
          <Input
            id={textId}
            name={textId}
            type="text"
            placeholder={placeholder}
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            className="h-10"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${textId}-error` : undefined}
          />
          {value ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-10 shrink-0"
              disabled={disabled}
              onClick={() => onChange('')}
            >
              Clear
            </Button>
          ) : null}
        </div>

        {showSwatches && swatches.length > 0 ? (
          <div className="flex flex-wrap gap-1.5" role="listbox" aria-label={`${label} presets`}>
            {swatches.map((swatch) => {
              const selected =
                expandHexColor(value)?.toLowerCase() ===
                expandHexColor(swatch)?.toLowerCase();
              return (
                <button
                  key={swatch}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  title={swatch}
                  disabled={disabled}
                  onClick={() => onChange(swatch.toLowerCase())}
                  className={cn(
                    'h-6 w-6 rounded-md border border-border shadow-sm transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50',
                    selected && 'ring-2 ring-primary ring-offset-1'
                  )}
                  style={{ backgroundColor: swatch }}
                />
              );
            })}
          </div>
        ) : null}

        {error ? (
          <p id={`${textId}-error`} className="text-xs text-destructive">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
