"use client"
'use client';

import React from 'react';
import { ErrorMessage } from 'formik';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../ui/select';

interface CustomTimeFieldProps {
  timeId: string;
  meridiemId: string;
  label: string;
  timeValue: string;
  meridiemValue: 'AM' | 'PM';
  onTimeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onMeridiemChange: (value: 'AM' | 'PM') => void;
  required?: boolean;
  disabled?: boolean;
  styleClasses?: {
    parentDiv?: string;
    labelClassName?: string;
    inputWrapper?: string;
    timeInput?: string;
    selectInput?: string;
  };
}

export const CustomTimeField = ({
  timeId,
  meridiemId,
  label,
  timeValue,
  meridiemValue,
  onTimeChange,
  onMeridiemChange,
  required = false,
  disabled = false,
  styleClasses
}: CustomTimeFieldProps) => {
  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onTimeChange(e);

    if (!value) return;

    const hour = Number(value.split(':')[0]);
    const nextMeridiem: 'AM' | 'PM' = hour >= 12 ? 'PM' : 'AM';

    if (nextMeridiem !== meridiemValue) {
      onMeridiemChange(nextMeridiem);
    }
  };

  const handleMeridiemChange = (value: 'AM' | 'PM') => {
    if (!timeValue) {
      onMeridiemChange(value);
      return;
    }

    let [hour, minute] = timeValue.split(':').map(Number);

    if (value === 'PM' && hour < 12) hour += 12;
    if (value === 'AM' && hour >= 12) hour -= 12;

    const updatedTime = `${hour.toString().padStart(2, '0')}:${minute
      .toString()
      .padStart(2, '0')}`;

    onMeridiemChange(value);

    onTimeChange({
      target: { id: timeId, value: updatedTime }
    } as React.ChangeEvent<HTMLInputElement>);
  };

  return (
    <div className={styleClasses?.parentDiv}>
      <Label className={styleClasses?.labelClassName}>
        {label}
        {required && <span className="text-red-600"> *</span>}
      </Label>

      <div className={`flex gap-3 ${styleClasses?.inputWrapper || ''}`}>
        <div className="flex-1">
          <Input
            id={timeId}
            type="time"
            value={timeValue}
            onChange={handleTimeChange}
            disabled={disabled}
            className={`focus-visible:ring-offset-0! ${
              styleClasses?.timeInput || ''
            }`}
          />
          <ErrorMessage
            name={timeId}
            component="div"
            className="text-red-600 text-sm pt-1"
          />
        </div>

        <div className="w-28">
          <Select
            value={meridiemValue}
            onValueChange={handleMeridiemChange}
            disabled={disabled}
          >
            <SelectTrigger
              className={`focus-visible:ring-offset-0! ${
                styleClasses?.selectInput || ''
              }`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AM">AM</SelectItem>
              <SelectItem value="PM">PM</SelectItem>
            </SelectContent>
          </Select>
          <ErrorMessage
            name={meridiemId}
            component="div"
            className="text-red-600 text-sm pt-1"
          />
        </div>
      </div>
    </div>
  );
};
