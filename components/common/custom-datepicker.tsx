"use client"
import React from 'react';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { Calendar } from '../ui/base-calendar';

interface CustomDatePickerProps {
    id: string
    value: Date
    onChange: (date: Date | undefined) => void
}

const CustomDatePicker = ({ id, value, onChange}: CustomDatePickerProps) => {
   
    return (
        <Popover >
            <PopoverTrigger asChild className='w-full'>
                <Button
                    variant={"outline"}
                    className={cn(
                        "justify-start text-left font-normal gap-2",
                        !value && "text-muted-foreground"
                    )}
                >
                    <CalendarIcon />
                    {value ? format(value, "PPP") : <span>Pick a date</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
                <Calendar
                    id={id}
                    mode="single"
                    selected={value}
                    onSelect={onChange}
                    initialFocus
                />
            </PopoverContent>
        </Popover>
    );
};

export default CustomDatePicker;