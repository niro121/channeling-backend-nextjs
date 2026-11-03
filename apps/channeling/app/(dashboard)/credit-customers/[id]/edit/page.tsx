import React from 'react';
import CreditCustomerForm from '../../credit-customer-form';
import { getCreditCustomerById } from '@/app/actions/credit-customer.actions';
import { BackButton } from '@/components/common/back-button';
import { notFound } from 'next/navigation';
import { checkRouteAccess } from '@/lib/server-permissions';
import { redirect } from 'next/navigation';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: PageProps) {
  const canView = await checkRouteAccess('/credit-customers');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const { id } = await params;
  const result = await getCreditCustomerById(id);

  if (!result.success || !result.data) {
    notFound();
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Edit Credit Customer</h2>
        <BackButton href="/credit-customers" />
      </div>
      <div className="h-full flex-1 flex-col space-y-8">
        <CreditCustomerForm creditCustomer={result.data} isEditPage />
      </div>
    </div>
  );
}
