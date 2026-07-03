import * as React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface CustomSwitchProps {
  id: string;
  placeholder?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  required?: boolean;
  styleClasses?: {
    parentDiv?: string;
    labelClassName?: string;
    switchClassName?: string;
  };
}

export function CustomSwitch({
  id,
  placeholder,
  checked,
  onChange,
  disabled = false,
  required = false,
  styleClasses
}: CustomSwitchProps) {
  return (
    <div className={`flex items-center gap-2 ${styleClasses?.parentDiv ?? ''}`}>
      {placeholder && (
        <Label
          htmlFor={id}
          className={`cursor-pointer ${styleClasses?.labelClassName ?? ''}`}
        >
          {placeholder}
          {required && <span className="text-red-600"> *</span>}
        </Label>
      )}
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        className={styleClasses?.switchClassName}
      />
    </div>
  );
}
