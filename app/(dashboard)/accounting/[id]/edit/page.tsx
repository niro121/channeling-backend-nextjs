import React from 'react';
import AccountForm from '../../account-form';
import { BackButton } from '@/components/common/back-button';
import { getAccountById, getAccounts } from '@/app/actions/accounting.actions';
import { getAllLocations } from '@/app/actions/location.action';
import { getAllDoctors } from '@/app/actions/doctor.actions';
import { getAllAgenciesOptions } from '@/app/actions/agency.actions';
import { getAllCreditCustomersOptions } from '@/app/actions/credit-customer.actions';
import { checkRouteAccess, checkPermission } from '@/lib/server-permissions';
import { redirect, notFound } from 'next/navigation';
import type { AccountType } from '@/types/accounting';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AccountEditPage({ params }: Props) {
  const canView = await checkRouteAccess('/accounting');
  if (!canView) {
    redirect('/unauthorized-access');
  }
  const canEdit = await checkPermission('accounting', 'edit');
  if (!canEdit) {
    redirect('/unauthorized-access');
  }

  const { id } = await params;
  const [
    accountRes,
    accountsRes,
    locationsRes,
    doctorsRes,
    agenciesRes,
    creditCustomersRes,
  ] = await Promise.all([
    getAccountById(id),
    getAccounts({ type: 'CASH', limit: 200 }),
    getAllLocations({ publishedOnly: true, limit: '500', page: '0' }),
    getAllDoctors({ page: '0', limit: '500' }),
    getAllAgenciesOptions(),
    getAllCreditCustomersOptions().catch(() => ({ success: false as const, data: [] })),
  ]);

  const account = accountRes.data ?? null;
  if (!account) {
    notFound();
  }

  const cashAccounts = (accountsRes.data ?? [])
    .filter((a): a is typeof a & { id: string; name: string; code: string | null } => !!a && a.id !== id)
    .map((a) => ({ id: a.id, name: a.name, code: a.code ?? null }));

  const locations =
    locationsRes?.data?.map((l) => ({ id: l.id as string, name: l.name })) ?? [];
  const doctors =
    doctorsRes?.data?.map((d) => ({
      id: d.id as string,
      name: d.name,
      code: d.code,
    })) ?? [];
  const agencies =
    agenciesRes?.data?.map((a) => ({
      id: a.id as string,
      name: a.name,
      code: a.code ?? null,
    })) ?? [];
  const creditCustomers =
    Array.isArray(creditCustomersRes?.data)
      ? creditCustomersRes.data.map((c) => ({
          id: c.id,
          name: c.name,
          code: c.code ?? null,
        }))
      : [];

  const types: { value: AccountType; label: string }[] = [
    { value: 'CASH', label: 'Cash' },
    { value: 'PAYABLE', label: 'Payable' },
    { value: 'RECEIVABLE', label: 'Receivable' },
  ];

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Edit account</h2>
        <BackButton href="/accounting" />
      </div>
      <div className="h-full flex-1 flex-col space-y-8">
        <AccountForm
          account={account}
          types={types}
          locations={locations}
          doctors={doctors}
          agencies={agencies}
          creditCustomers={creditCustomers}
          cashAccounts={cashAccounts}
        />
      </div>
    </div>
  );
}
