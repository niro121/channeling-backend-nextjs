import React from 'react';
import { checkRouteAccess, checkPermission } from '@/lib/server-permissions';
import { redirect } from 'next/navigation';
import { getAccounts } from '@/app/actions/accounting.actions';
import { getAllLocations } from '@/app/actions/location.action';
import JournalEntryForm from '../../journal-entry-form';

export default async function NewJournalEntryPage() {
  const canView = await checkRouteAccess('/accounting');
  if (!canView) {
    redirect('/unauthorized-access');
  }
  const canAdd = await checkPermission('accounting', 'add');
  if (!canAdd) {
    redirect('/unauthorized-access');
  }

  const [accountsRes, locationsRes] = await Promise.all([
    getAccounts({ limit: 500, page: 0 }),
    getAllLocations({ publishedOnly: true, limit: '500', page: '0' }),
  ]);

  const accounts =
    accountsRes.success && accountsRes.data
      ? accountsRes.data.map((a) => ({
          id: a.id,
          name: a.name,
          code: a.code ?? null,
          type: a.type,
        }))
      : [];

  const locations =
    locationsRes?.data?.map((l) => ({
      id: l.id as string,
      name: l.name,
    })) ?? [];

  return (
    <JournalEntryForm
      accounts={accounts}
      locations={locations}
    />
  );
}
