import React from 'react';
import { checkRouteAccess, checkPermission } from '@/lib/server-permissions';
import { redirect } from 'next/navigation';
import { BackButton } from '@/components/common/back-button';
import BankAccountForm from '../bank-account-form';

export default async function BankAccountAddPage() {
  const canView = await checkRouteAccess('/bank-accounts');
  if (!canView) redirect('/unauthorized-access');
  const canAdd = await checkPermission('bank-accounts', 'add');
  if (!canAdd) redirect('/unauthorized-access');

  return (
    <div className="container mx-auto py-6">
      <div className="w-full">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Add Bank Account</h1>
          <BackButton href="/bank-accounts" />
        </div>
        <BankAccountForm />
      </div>
    </div>
  );
}
