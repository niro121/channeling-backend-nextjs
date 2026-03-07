import React, { Suspense } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SearchInput } from '@/components/common/search';
import { CustomDataTable } from '@/components/common/custom-data-table';
import { CreditCustomerColumns } from './columns';
import { CreditCustomersToolbar } from './credit-customers-toolbar';
import Loading from '../loading';
import {
  bulkDeleteCreditCustomers,
  getAllCreditCustomers,
  getCreditCustomersExport,
} from '@/app/actions/credit-customer.actions';
import { checkRouteAccess, checkPermission } from '@/lib/server-permissions';
import { logActivity } from '@/lib/activity-log';
import { redirect } from 'next/navigation';

type SearchParams = {
  searchParams?: Promise<{ page?: string; limit?: string; keyword?: string }>;
};

export default async function Page({ searchParams }: SearchParams) {
  const canView = await checkRouteAccess('/credit-customers');
  if (!canView) {
    redirect('/unauthorized-access');
  }
  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    await logActivity({
      userId: session.user.id,
      action: 'credit-customers.visited',
      entityType: 'CreditCustomers',
      importance: 'low',
    });
  }

  const canAdd = await checkPermission('credit-customers', 'add');
  const params = await searchParams;
  const { data, totalRecords } = await getAllCreditCustomers({
    page: params?.page,
    limit: params?.limit,
    keyword: params?.keyword,
  });

  const handleExport = async () => {
    'use server';
    const res = await getCreditCustomersExport({ keyword: params?.keyword });
    if (!res.success || !res.data?.length) {
      return {
        success: false,
        message: res.success ? 'No credit customers found' : res.message,
      };
    }
    const mapped = res.data.map((c) => ({
      code: c.code ?? '-',
      name: c.name,
      email: c.email ?? '-',
      phone: c.phone ?? '-',
      contactPerson: c.contactPersonName ?? '-',
      balance: (c.balance ?? 0).toFixed(2),
    }));
    return { success: true, data: mapped };
  };

  return (
    <div className="overflow-hidden">
      <Suspense fallback={<Loading />}>
        <CustomDataTable
          heading="Credit Customers"
          subHeading="Manage credit customers (companies) for credit sales."
          columns={CreditCustomerColumns}
          data={data}
          rowCount={totalRecords}
          deleteServerAction={bulkDeleteCreditCustomers}
          page={params?.page}
          toolbarLeft={
            <div className="relative w-full sm:max-w-sm">
              <SearchInput
                name="keyword"
                placeholder="Search by name, code, email, phone"
                className="pl-8 w-full h-9"
              />
            </div>
          }
          toolbarRight={
            <CreditCustomersToolbar
              canAdd={canAdd}
              serverData={handleExport}
            />
          }
        />
      </Suspense>
    </div>
  );
}
