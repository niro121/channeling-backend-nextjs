import React from 'react';
import Link from 'next/link';
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
import { Button } from '@/components/ui/button';
import { BookOpen } from 'lucide-react';

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
    { value: 'INCOME', label: 'Income' },
    { value: 'EXPENSE', label: 'Expense' },
  ];

  const typeLabel = types.find((t) => t.value === account.type)?.label ?? account.type;

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Edit Account</h2>
          <BackButton href="/accounting" />
        </div>

        {/* Context: which account is being edited */}
        <div className="grid gap-4 rounded-lg border-2 border-primary/30 bg-primary/5 p-4 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-md border bg-background/70 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Account</p>
              <p className="mt-1 text-sm font-semibold leading-snug text-foreground">
                {account.name}
              </p>
              {account.code ? (
                <p className="mt-1 text-xs text-muted-foreground">Code: {account.code}</p>
              ) : null}
            </div>

            <div className="rounded-md border bg-background/70 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Type</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{typeLabel}</p>
            </div>

            {account.userId && account.user ? (
              <div className="rounded-md border bg-background/70 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Linked user</p>
                <p className="mt-1 text-sm font-semibold leading-snug text-foreground">
                  {account.user.name}
                  {account.user.staffCode ? (
                    <span className="ml-1 text-muted-foreground font-medium">({account.user.staffCode})</span>
                  ) : null}
                </p>
                <p className="mt-1 text-xs text-muted-foreground break-all">{account.user.email}</p>
              </div>
            ) : null}
          </div>

          {account.id && (
            <div className="flex justify-start">
              <Button size="sm" variant="outline" className="gap-1.5" asChild>
                <Link href={`/accounting/${account.id}/statement`}>
                  <BookOpen className="h-4 w-4" />
                  View statement
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="h-full flex-1 flex-col space-y-8">
        <AccountForm
          key={`${account.id}-${account.updatedAt?.toString?.() ?? ''}`}
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
