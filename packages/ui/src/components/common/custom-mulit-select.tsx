import * as React from 'react';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger
} from '../ui/select';
import { useFormikContext } from 'formik';
import { X } from 'lucide-react';

interface MultiSelectOption {
  id: string;
  name: string;
}

interface MultiSelectProps {
  id?: string;
  options: MultiSelectOption[];
  value: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  disabled?: boolean;
  required?: boolean;
  styleClasses?: {
    parentDiv?: string;
    labelClassName?: string;
    inputClassName?: string;
    badgeClassName?: string;
  };
}

export function CustomMultiSelect({
  id,
  options,
  value,
  onChange,
  placeholder,
  disabled = false,
  required,
  styleClasses
}: MultiSelectProps) {
  const formik = useFormikContext<Record<string, unknown>>();
  const fieldName = id || '';
  const error = fieldName ? formik.errors[fieldName] : undefined;
  const touched = fieldName ? formik.touched[fieldName] : undefined;
  const showError = !!error && (!!touched || (formik.submitCount ?? 0) > 0);

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
    <div className={`space-y-2 ${styleClasses?.parentDiv ?? ''}`}>
      <Label className={styleClasses?.labelClassName}>
        {placeholder}
        {required && <span className="text-red-600"> *</span>}
      </Label>

      <div className={styleClasses?.inputClassName}>
        <Select
        value={""}
          onValueChange={handleSelect}
          disabled={disabled || availableOptions.length === 0}
        >
          <SelectTrigger
            id={id}
            className={`min-h-10 h-auto flex flex-wrap items-start gap-1 py-2 disabled:opacity-95 ${styleClasses?.inputClassName}`}
          >
            {selectedOptions.length === 0 && (
              <span className="text-muted-foreground text-sm truncate">
                {placeholder}
              </span>
            )}

            {selectedOptions.length > 0 && (
              <div className="flex flex-wrap gap-1 max-w-[85%]">
                {selectedOptions.map((option) => (
                  <Badge
                    key={option.id}
                    variant="secondary"
                    className={`flex items-center gap-1 cursor-pointer ${styleClasses?.badgeClassName || 'bg-teal-700 text-white hover:bg-teal-600'}`}
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
        {showError && (
          <div className="invalid-feedback text-red-600 text-sm whitespace-nowrap pt-1 sm:pt-0">
            {typeof error === 'string' ? error : Array.isArray(error) ? error[0] : String(error)}
          </div>
        )}
      </div>
    </div>
  );
}
