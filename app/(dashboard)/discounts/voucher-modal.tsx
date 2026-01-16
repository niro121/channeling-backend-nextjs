'use client';

import React from 'react';
import { CustomContentAlertDialog } from '@/components/common/custom-content-alert-dialog';
import { Button } from '@/components/ui/button';
import CustomFormField from '@/components/common/form-field';
import { Trash2, Plus } from 'lucide-react';

type VoucherInput = {
  code: string;
  limit: number;
};

type VoucherModalProps = {
  open: boolean;
  vouchers: VoucherInput[];
  onClose: () => void;
  onSave: (vouchers: VoucherInput[]) => void;
};

export function VoucherModal({
  open,
  vouchers,
  onClose,
  onSave
}: VoucherModalProps) {
  const [localVouchers, setLocalVouchers] =
    React.useState<VoucherInput[]>(vouchers);

  React.useEffect(() => {
    setLocalVouchers(vouchers);
  }, [vouchers]);

  const addVoucher = () => {
    setLocalVouchers((prev) => [...prev, { code: '', limit: 0 }]);
  };

  const updateVoucher = (
    index: number,
    field: keyof VoucherInput,
    value: string | number
  ) => {
    const copy = [...localVouchers];
    copy[index] = { ...copy[index], [field]: value };
    setLocalVouchers(copy);
  };

  const removeVoucher = (index: number) => {
    setLocalVouchers((prev) => prev.filter((_, i) => i !== index));
  };

  const handleContinue = () => {
    onSave(localVouchers);
    onClose();
  };

  return (
    <CustomContentAlertDialog
      open={open}
      title="Voucher Codes"
      description="Add voucher codes and usage limits"
      handleVisibilityChange={(v) => !v && onClose()}
      handleContinue={handleContinue}
      loading={false}
    >
      <div className="space-y-4">
        {localVouchers.map((voucher, index) => {
          return (
            <div key={index}>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 w-full items-end">
                <CustomFormField
                  id={`code-${index}`}
                  type="text"
                  placeholder="Voucher Code"
                  value={voucher.code}
                  required={false}
                  onChange={(e) => updateVoucher(index, 'code', e.target.value)}
                  onBlur={() =>
                    updateVoucher(
                      index,
                      'code',
                      voucher.code.trim().toUpperCase()
                    )
                  }
                />

                <CustomFormField
                  id={`limit-${index}`}
                  type="number"
                  placeholder="Limit"
                  value={voucher.limit}
                  required={false}
                  onChange={(e) =>
                    updateVoucher(index, 'limit', Number(e.target.value))
                  }
                  onBlur={() =>
                    updateVoucher(
                      index,
                      'code',
                      voucher.code.trim().toUpperCase()
                    )
                  }
                />

                <Button
                  type="button"
                  variant="outline"
                  className="flex items-center justify-center text-red-500"
                  onClick={() => removeVoucher(index)}
                >
                  <Trash2 size={16} />
                </Button>
              </div>

              {localVouchers.length !== 0 && <hr className="bg-slate-300 my-4" />}
            </div>
          );
        })}

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={addVoucher}
        >
          <Plus size={16} className="mr-2" />
          Add Voucher
        </Button>
      </div>
    </CustomContentAlertDialog>
  );
}
