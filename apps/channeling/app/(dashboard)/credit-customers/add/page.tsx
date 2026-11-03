import React from 'react';
import CreditCustomerForm from '../credit-customer-form';
import { BackButton } from '@/components/common/back-button';
import { checkRouteAccess, checkPermission } from '@/lib/server-permissions';
import { redirect } from 'next/navigation';

export default async function Page() {
  const canView = await checkRouteAccess('/credit-customers');
  if (!canView) {
    redirect('/unauthorized-access');
  }
  const canAdd = await checkPermission('credit-customers', 'add');
  if (!canAdd) {
    redirect('/unauthorized-access');
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Add Credit Customer</h2>
        <BackButton href="/credit-customers" />
      </div>
      <div className="h-full flex-1 flex-col space-y-8">
        <CreditCustomerForm />
      </div>
    </div>
  );
}
