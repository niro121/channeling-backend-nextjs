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
    <div className="container mx-auto py-6">
      <div className="w-full">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Edit Bank Account</h1>
          <BackButton href="/bank-accounts" />
        </div>
        <BankAccountForm bankAccount={res.data} />
      </div>
    </div>
  );
}
