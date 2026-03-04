import React from 'react';
import AccountForm from '../account-form';
import { getAccounts } from '@/app/actions/accounting.actions';
import { getAllLocations } from '@/app/actions/location.action';
import { getAllDoctors } from '@/app/actions/doctor.actions';
import { getAllAgenciesOptions } from '@/app/actions/agency.actions';
import { checkRouteAccess, checkPermission } from '@/lib/server-permissions';
import { redirect } from 'next/navigation';
import type { AccountType } from '@/types/accounting';

export default async function AccountingAddPage() {
  const canView = await checkRouteAccess('/accounting');
  if (!canView) {
    redirect('/unauthorized-access');
  }
  const canAdd = await checkPermission('accounting', 'add');
  if (!canAdd) {
    redirect('/unauthorized-access');
  }

  const [accountsRes, locationsRes, doctorsRes, agenciesRes] = await Promise.all([
    getAccounts({ type: 'CASH', limit: 200 }),
    getAllLocations({ publishedOnly: true, limit: '500', page: '0' }),
    getAllDoctors({ page: '0', limit: '500' }),
    getAllAgenciesOptions(),
  ]);

  const cashAccounts = (accountsRes.data ?? [])
    .filter((a): a is typeof a & { id: string; name: string; code: string | null } => !!a)
    .map((a) => ({ id: a.id, name: a.name, code: a.code ?? null }));

  const locations =
    locationsRes?.data?.map((l) => ({
      id: l.id as string,
      name: l.name,
    })) ?? [];

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

  const types: { value: AccountType; label: string }[] = [
    { value: 'CASH', label: 'Cash' },
    { value: 'PAYABLE', label: 'Payable' },
    { value: 'RECEIVABLE', label: 'Receivable' },
  ];

  return (
    <AccountForm
      types={types}
      locations={locations}
      doctors={doctors}
      agencies={agencies}
      cashAccounts={cashAccounts}
    />
  );
}
