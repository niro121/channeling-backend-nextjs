import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger
} from '@/components/ui/select';
import { ErrorMessage } from 'formik';
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
            className={`min-h-10 flex items-center justify-between gap-2 disabled:opacity-95 ${styleClasses?.inputClassName}`}
          >
            {selectedOptions.length === 0 && (
              <span className="text-muted-foreground text-sm truncate">
                {placeholder}
              </span>
            )}

            {selectedOptions.length > 0 && (
              <div className="mr-auto flex flex-wrap justify-end gap-1 max-w-[85%]">
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
        <ErrorMessage
          name={id || ''}
          component="div"
          className="invalid-feedback text-red-600 text-sm whitespace-nowrap pt-1 sm:pt-0"
        />
      </div>
    </div>
  );
}
