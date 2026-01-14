import React from 'react';
import { notFound } from 'next/navigation';
import DiscountForm from '../../discount-form';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDiscountById } from '@/app/actions/discount.action';
import {
  APPLY_TO_OPTIONS,
  DISCOUNT_METHOD_OPTIONS,
  DISCOUNT_TYPE_OPTIONS,
  IS_VOUCHER_OPTIONS,
  PAYMENT_METHOD_OPTIONS
} from '@/types/discount';

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditDiscountPage({ params }: PageProps) {
  const resolvedParams = await params;
  const { id } = resolvedParams;
  const session = await getServerSession(authOptions);
  const user = session?.user;

  const { data, success } = await getDiscountById(id);

  if (!success || !data) {
    notFound();
  }

  return (
    <div className="container mx-auto py-6">
      <div className="w-full">
        <h1 className="text-2xl font-bold mb-6">Edit Doctor</h1>
        <DiscountForm
          discount={data}
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
