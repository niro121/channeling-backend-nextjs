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
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Add Bank Account</h2>
        <BackButton href="/bank-accounts" />
      </div>
      <div className="h-full flex-1 flex-col space-y-8">
        <BankAccountForm />
      </div>
    </div>
  );
}
