import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  APPLY_TO_OPTIONS,
  DISCOUNT_METHOD_OPTIONS,
  DISCOUNT_TYPE_OPTIONS,
  IS_VOUCHER_OPTIONS,
  PAYMENT_METHOD_OPTIONS
} from '@/types/discount';
import DiscountForm from '../discount-form';
import { BackButton } from '@/components/common/back-button';

export default async function AddDiscountPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  return (
    <div className="container mx-auto py-6">
      <div className="w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Add New Discount</h1>
          <BackButton href="/discounts" />
        </div>
        <DiscountForm
          discount={null}
          applyToOptions={APPLY_TO_OPTIONS}
          discountMethodOptions={DISCOUNT_METHOD_OPTIONS}
          discountTypeOptions={DISCOUNT_TYPE_OPTIONS}
          paymentTypeOptions={PAYMENT_METHOD_OPTIONS}
          voucherOptions={IS_VOUCHER_OPTIONS}
          isEditPage={false}
          user={{
            id: user?.id,
            name: user?.name || ''
          }}
        />
      </div>
    </div>
  );
}
