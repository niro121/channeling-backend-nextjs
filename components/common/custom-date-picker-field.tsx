"use client";

import * as React from "react";
import { ErrorMessage } from "formik";
import { format as fmt, isBefore, isAfter, startOfDay, endOfDay, startOfToday, endOfToday } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type ShadcnCaptionLayout = "dropdown" | "label" | "dropdown-months" | "dropdown-years";

type ExternalCaptionLayout = ShadcnCaptionLayout | "buttons" | "dropdown-buttons";

interface StyleClasses {
    parentDiv?: string;
    labelClassName?: string;
    inputClassName?: string;
}

interface CustomDatePickerFieldProps {
    id: string;
    placeholder: string;
    value: Date | null | undefined;
    onChange: (value?: Date) => void;
    onBlur: React.FocusEventHandler<any>;
    disabled?: boolean;
    required: boolean;
    styleClasses?: StyleClasses;
    error?: string;
    touched?: boolean;

    /** Disable dates before today */
    disablePast?: boolean;
    /** Disable dates after today */
    disableFuture?: boolean;
    /** Hard-disabled dates (Date objects or "YYYY-MM-DD" strings) */
    disabledDates?: (Date | string)[];

    minDate?: Date;
    maxDate?: Date;

    /** Calendar caption layout */
    captionLayout?: ExternalCaptionLayout;
    /** Year dropdown bounds (if using dropdowns) */
    fromYear?: number;
    toYear?: number;
    
    /** Whether to use Formik's ErrorMessage component. Set to false when using outside Formik forms. */
    useFormikError?: boolean;
}

const normalizeToYMD = (d: Date | string) => {
    const date = typeof d === "string" ? new Date(d) : d;
    // Format to consistent YYYY-MM-DD key
    const y = date.getFullYear();
    const m = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    return `${y}-${m}-${day}`;
};

export default function CustomDatePickerField({
    id,
    placeholder,
    value,
    onChange,
    onBlur,
    disabled = false,
    required,
    styleClasses,
    error,
    touched,
    disablePast = false,
    disableFuture = false,
    disabledDates = [],
    minDate,
    maxDate,
    captionLayout = "dropdown-buttons",
    fromYear,
    toYear,
    useFormikError = true,
}: CustomDatePickerFieldProps) {
    const [open, setOpen] = React.useState(false);

    const disabledSet = React.useMemo(() => {
        const set = new Set<string>();
        disabledDates.forEach((d) => set.add(normalizeToYMD(d)));
        return set;
    }, [disabledDates]);

    const isDisabled = React.useCallback(
        (date: Date) => {
            // Disable by past/future constraints
            if (disablePast && isBefore(startOfDay(date), startOfToday())) return true;
            if (disableFuture && isAfter(endOfDay(date), endOfToday())) return true;

            // Disable by min/max
            if (minDate && isBefore(startOfDay(date), startOfDay(minDate))) return true;
            if (maxDate && isAfter(endOfDay(date), endOfDay(maxDate))) return true;

            // Disable by explicit list
            if (disabledSet.has(normalizeToYMD(date))) return true;

            return false;
        },
        [disablePast, disableFuture, minDate, maxDate, disabledSet]
    );

    // Close popover after selecting an enabled date
    const handleSelect = (selected?: Date) => {
        if (!selected) return;
        if (!isDisabled(selected)) {
            onChange(selected);
            setOpen(false);
        }
    };

    const mappedCaptionLayout: ShadcnCaptionLayout =
        captionLayout === "buttons"
            ? "label"
            : captionLayout === "dropdown-buttons"
                ? "dropdown"
                : (captionLayout ?? "label");

    return (
        <div className={styleClasses?.parentDiv}>
            <Label htmlFor={id} className={styleClasses?.labelClassName || ""}>
                {placeholder}
                {required && <span className="text-red-600"> *</span>}
            </Label>

            <div className={styleClasses?.inputClassName}>
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={disabled}
                            onBlur={onBlur}
                            className={cn(
                                "w-99 pl-3 text-left font-normal p-2 border rounded outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
                                !value && "text-muted-foreground",
                                error && touched ? "border-red-600" : "border-gray-300"
                            )}
                            id={id}
                            aria-invalid={!!(error && touched)}
                            aria-describedby={error && touched ? `${id}-error` : undefined}
                        >
                            {value ? fmt(value, "PPP") : <span>{placeholder}</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                    </PopoverTrigger>

                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={value ?? undefined}
                            onSelect={handleSelect}
                            // react-day-picker supports function or matcher array
                            disabled={isDisabled}
                            captionLayout={mappedCaptionLayout}
                            startMonth={fromYear ? new Date(fromYear, 0) : undefined}
                            endMonth={toYear ? new Date(toYear, 11) : undefined}
                        />
                    </PopoverContent>
                </Popover>

                {error && touched ? (
                    <div
                        id={`${id}-error`}
                        className="invalid-feedback text-red-600 text-sm whitespace-pre-wrap pt-1 sm:pt-0 mt-2"
                    >
                        {error}
                    </div>
                ) : useFormikError ? (
                    <ErrorMessage
                        name={id}
                        component="div"
                        id={`${id}-error`}
                        className="invalid-feedback text-red-600 text-sm whitespace-pre-wrap pt-1 sm:pt-0 mt-2"
                    />
                ) : null}
            </div>
        </div>
    );
}
