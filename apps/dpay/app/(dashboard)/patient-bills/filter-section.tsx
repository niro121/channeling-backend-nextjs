'use client';

import { useState } from 'react';
import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Button,
  Calendar,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@archmage/ui';
import { format } from 'date-fns';
import { CalendarIcon, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PatientBillStatus } from '@/types/patient-bill';

const STATUS_OPTIONS: { value: PatientBillStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'partial', label: 'Partial' },
  { value: 'paid', label: 'Paid' },
  { value: 'closed', label: 'Closed' },
];

export default function PatientBillsFilterSection() {
  const [keyword, setKeyword] = useState('');
  const [patientId, setPatientId] = useState('all');
  const [status, setStatus] = useState<string>('all');
  const [date, setDate] = useState<Date | null>(null);

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by bill no. or patient"
            className="pl-8 h-9"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>

        <Select value={patientId} onValueChange={setPatientId}>
          <SelectTrigger className="w-[180px] h-9">
            <SelectValue placeholder="Patient" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All patients</SelectItem>
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-[200px] h-9 justify-start text-left font-normal',
                !date && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, 'dd MMM yyyy') : 'Date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={date ?? undefined} onSelect={(d) => setDate(d ?? null)} />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
