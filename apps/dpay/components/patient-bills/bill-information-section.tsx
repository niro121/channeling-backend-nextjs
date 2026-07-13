'use client';

import { Hash } from 'lucide-react';
import { Badge, CustomDatePickerField, Input, Label, Textarea } from '@archmage/ui';
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

function AutoNumberField({ id, label, value }: { id: string; label: string; value: string }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          readOnly
          value={value}
          className="h-10 bg-emerald-50/80 pl-9 pr-16 font-medium text-foreground"
        />
        <Badge
          variant="secondary"
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
        >
          AUTO
        </Badge>
      </div>
    </div>
  );
}

export function BillInformationSection({ draft, errors, onChange }: BillInformationSectionProps) {
  return (
    <div className="rounded-lg border bg-card p-5 shadow-sm space-y-5">
      <div>
        <h2 className="text-base font-semibold">Bill Information</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Auto-generated identifiers and admission details.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <AutoNumberField id="bxt-number" label="BXT Number" value={draft.bxtNumber} />
        <AutoNumberField id="bill-number" label="Bill Number" value={draft.billNumber} />
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
