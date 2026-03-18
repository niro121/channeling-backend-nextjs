import React from 'react';
import { notFound } from 'next/navigation';
import { checkRouteAccess } from '@/lib/server-permissions';
import { redirect } from 'next/navigation';
import { BackButton } from '@/components/common/back-button';
import BankAccountForm from '../../bank-account-form';
import { getBankAccountById } from '@/app/actions/bank-account.actions';

type Props = { params: Promise<{ id: string }> };

export default async function BankAccountEditPage({ params }: Props) {
  const canView = await checkRouteAccess('/bank-accounts');
  if (!canView) redirect('/unauthorized-access');

  const { id } = await params;
  const res = await getBankAccountById(id);
  if (!res.success || !res.data) notFound();

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Edit Bank Account</h2>
        <BackButton href="/bank-accounts" />
      </div>
      <div className="h-full flex-1 flex-col space-y-8">
        <BankAccountForm bankAccount={res.data} />
      </div>
    </div>
  );
}
