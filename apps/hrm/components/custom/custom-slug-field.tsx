'use client';

import type { ChangeEventHandler, FocusEventHandler } from 'react';
import { ErrorMessage } from 'formik';
import { Button, Input, Label } from '@archmage/ui';
import { slugify, type SlugifyOptions } from '@/lib/utils/slug';

type StyleClasses = {
  parentDiv?: string;
  labelClassName?: string;
  inputClassName?: string;
};

export type SlugFieldProps = {
  id: string;
  /** Field label (also used as input placeholder). */
  placeholder?: string;
  value: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  onBlur: FocusEventHandler<HTMLInputElement>;
  /** Text used when the user clicks Auto generate (e.g. job title). */
  sourceValue?: string;
  /** Apply generated slug into Formik / local state. */
  onSlugChange: (slug: string) => void;
  required?: boolean;
  disabled?: boolean;
  styleClasses?: StyleClasses;
  /** Show the Auto generate control (default true). */
  showAutoGenerate?: boolean;
  autoGenerateLabel?: string;
  slugifyOptions?: SlugifyOptions;
};

/**
 * Optional slug input with a reusable Auto generate action from `sourceValue`.
 */
export function CustomSlugField({
  id,
  placeholder = 'Slug',
  value,
  onChange,
  onBlur,
  sourceValue = '',
  onSlugChange,
  required = false,
  disabled = false,
  styleClasses,
  showAutoGenerate = true,
  autoGenerateLabel = 'Auto generate',
  slugifyOptions
}: SlugFieldProps) {
  const canGenerate = Boolean(sourceValue.trim()) && !disabled;

  const handleAutoGenerate = () => {
    if (!canGenerate) return;
    onSlugChange(slugify(sourceValue, slugifyOptions));
  };

  return (
    <div className={styleClasses?.parentDiv}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id} className={styleClasses?.labelClassName || ''}>
          {placeholder}
          {required ? <span className="text-red-600"> *</span> : null}
        </Label>
        {showAutoGenerate ? (
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto shrink-0 px-0 py-0 text-xs font-medium"
            disabled={!canGenerate}
            onClick={handleAutoGenerate}
          >
            {autoGenerateLabel}
          </Button>
        ) : null}
      </div>
      <div className={styleClasses?.inputClassName}>
        <Input
          className={`rounded border p-2 focus-visible:ring-offset-0! ${
            styleClasses?.inputClassName || ''
          }`}
          type="text"
          id={id}
          name={id}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled}
        />
        <ErrorMessage
          name={id}
          component="div"
          className="invalid-feedback whitespace-pre-wrap pt-1 text-sm text-red-600 sm:pt-0"
        />
      </div>
    </div>
  );
}
