'use client';

import { Trash2 } from 'lucide-react';
import { Button, Input } from '@archmage/ui';
import type { BillLineItem } from '@/types/patient-bill';
import { clampAmount, parseAmountInput } from '@/lib/patient-bills/validations';
import { DoctorSearchSelect } from './doctor-search-select';

type BillBreakdownRowProps = {
  index: number;
  item: BillLineItem;
  canDelete: boolean;
  errors?: { doctorName?: string; description?: string; amount?: string };
  onChange: (patch: Partial<BillLineItem>) => void;
  onDelete: () => void;
};

export function BillBreakdownRow({
  index,
  item,
  canDelete,
  errors,
  onChange,
  onDelete,
}: BillBreakdownRowProps) {
  return (
    <tr className="border-b last:border-b-0">
      <td className="px-3 py-3 text-sm text-muted-foreground w-10">{index + 1}</td>
      <td className="px-3 py-3 min-w-[220px]">
        <DoctorSearchSelect
          value={item.doctorName}
          onChange={(doctorName) => onChange({ doctorName })}
          placeholder="Select doctor..."
          hasError={Boolean(errors?.doctorName)}
        />
        {errors?.doctorName && (
          <p className="text-xs text-destructive mt-1">{errors.doctorName}</p>
        )}
      </td>
      <td className="px-3 py-3 min-w-[200px]">
        <Input
          placeholder="Service description"
          value={item.description}
          onChange={(e) => onChange({ description: e.target.value })}
          className={errors?.description ? 'border-destructive' : ''}
        />
        {errors?.description && (
          <p className="text-xs text-destructive mt-1">{errors.description}</p>
        )}
      </td>
      <td className="px-3 py-3 w-36">
        <Input
          type="number"
          min={0}
          step="0.01"
          placeholder="0"
          value={item.amount === 0 ? '' : item.amount}
          onChange={(e) => onChange({ amount: parseAmountInput(e.target.value) })}
          onBlur={(e) => onChange({ amount: clampAmount(parseAmountInput(e.target.value)) })}
          className={errors?.amount ? 'border-destructive' : ''}
        />
        {errors?.amount && <p className="text-xs text-destructive mt-1">{errors.amount}</p>}
      </td>
      <td className="px-3 py-3 w-12 text-right">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={onDelete}
          disabled={!canDelete}
          aria-label="Delete row"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </td>
    </tr>
  );
}
