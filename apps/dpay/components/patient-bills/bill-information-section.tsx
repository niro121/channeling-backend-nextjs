'use client';

import { Hash } from 'lucide-react';
import { CustomDatePickerField, Input, Label, Textarea } from '@archmage/ui';
import type { PatientBillDraft, PatientBillFormErrors } from '@/types/patient-bill';

type BillInformationSectionProps = {
  draft: PatientBillDraft;
  errors: PatientBillFormErrors;
  onChange: (patch: Partial<PatientBillDraft>) => void;
};

function parseDateString(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toDateString(date: Date | null): string | null {
  if (!date) return null;
  return date.toISOString();
}

function BhtNumberField({
  id,
  value,
  error,
  onChange,
}: {
  id: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        BHT Number <span className="text-destructive">*</span>
      </Label>
      <div className="relative">
        <Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          placeholder="e.g. BHT-2026-000123"
          className={`h-10 pl-9 font-medium ${error ? 'border-destructive' : ''}`}
        />
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

export function BillInformationSection({ draft, errors, onChange }: BillInformationSectionProps) {
  return (
    <div className="rounded-lg border bg-card p-5 shadow-sm space-y-5">
      <div>
        <h2 className="text-base font-semibold">Bill Information</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Enter the BHT number manually. Bill number is assigned automatically on save.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <BhtNumberField
          id="bht-number"
          value={draft.bxtNumber}
          error={errors.bxtNumber}
          onChange={(value) => onChange({ bxtNumber: value })}
        />
        <div className="space-y-2">
          <Label htmlFor="bill-number">Bill Number</Label>
          <div className="relative">
            <Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="bill-number"
              readOnly
              value={draft.billNumber.trim() || 'Assigned on save'}
              className="h-10 bg-emerald-50/80 pl-9 font-medium text-foreground"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <CustomDatePickerField
          id="admission-date"
          placeholder="Admission Date"
          required
          value={parseDateString(draft.admissionDate)}
          onChange={(date) => onChange({ admissionDate: toDateString(date ?? null) })}
          onBlur={() => {}}
          error={errors.admissionDate}
          touched={!!errors.admissionDate}
          useFormikError={false}
          captionLayout="dropdown-buttons"
          styleClasses={{ parentDiv: 'space-y-2' }}
        />
        <CustomDatePickerField
          id="discharge-date"
          placeholder="Discharge Date"
          required={false}
          value={parseDateString(draft.dischargeDate)}
          onChange={(date) => onChange({ dischargeDate: toDateString(date ?? null) })}
          onBlur={() => {}}
          useFormikError={false}
          captionLayout="dropdown-buttons"
          styleClasses={{ parentDiv: 'space-y-2' }}
        />
      </div>

      <div className="border-t pt-5 space-y-4">
        <h3 className="text-sm font-semibold">Customer Details</h3>
        <div className="space-y-2">
          <Label htmlFor="customer-name">
            Customer Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="customer-name"
            placeholder="Enter customer name"
            value={draft.customerName}
            onChange={(e) => onChange({ customerName: e.target.value })}
            className={errors.customerName ? 'border-destructive' : ''}
          />
          {errors.customerName && (
            <p className="text-xs text-destructive">{errors.customerName}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="customer-nic-phone">NIC / Phone</Label>
          <Input
            id="customer-nic-phone"
            placeholder="NIC or phone number"
            value={draft.customerNicPhone}
            onChange={(e) => onChange({ customerNicPhone: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="customer-address">Customer Address</Label>
          <Textarea
            id="customer-address"
            placeholder="Enter address"
            rows={3}
            value={draft.customerAddress}
            onChange={(e) => onChange({ customerAddress: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
