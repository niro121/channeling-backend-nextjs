'use client';

import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button, Input } from '@archmage/ui';
import type { BillLineItem } from '@/types/patient-bill';
import { formatAmountFixed, parseAmountInput } from '@/lib/patient-bills/validations';
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
  const [amountDraft, setAmountDraft] = useState(
    item.amount === 0 ? '' : formatAmountFixed(item.amount)
  );

  useEffect(() => {
    setAmountDraft(item.amount === 0 ? '' : formatAmountFixed(item.amount));
  }, [item.id, item.amount]);

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
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          value={amountDraft}
          onChange={(e) => {
            setAmountDraft(e.target.value);
            onChange({ amount: parseAmountInput(e.target.value) });
          }}
          onBlur={() => {
            const next = parseAmountInput(amountDraft);
            onChange({ amount: next });
            setAmountDraft(next === 0 ? '' : formatAmountFixed(next));
          }}
          className={errors?.amount ? 'border-destructive tabular-nums' : 'tabular-nums'}
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
