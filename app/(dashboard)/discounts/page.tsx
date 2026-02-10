import React, { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { SearchInput } from '@/components/common/search';
import { CustomDataTable } from '@/components/common/custom-data-table';
import Loading from '../loading';
import Link from 'next/link';
import {
  bulkDeleteDiscounts,
  getAllDiscounts
} from '@/app/actions/discount.action';
import { SelectorFilter } from '@/components/common/selector-filter';
import { DISCOUNT_TYPE_OPTIONS } from '@/types/discount';
import { DisCountColumns } from './columns';
import { checkRouteAccess } from '@/lib/server-permissions';
import { redirect } from 'next/navigation';

type SearchParams = {
  searchParams?: Promise<{
    page?: string;
    limit?: string;
    keyword?: string;
    discountType?: string;
  }>;
};

export default async function Page({ searchParams }: SearchParams) {
  const canView = await checkRouteAccess('/discounts');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const params = await searchParams;

  const { data, totalRecords } = await getAllDiscounts({
    page: params?.page,
    limit: params?.limit,
    keyword: params?.keyword,
    discountType: params?.discountType
  });

  return (
    <div className="overflow-hidden">
      <Suspense fallback={<Loading />}>
        <CustomDataTable
          heading="Discounts"
          subHeading="Manage your discounts here."
          columns={DisCountColumns}
          data={data}
          rowCount={totalRecords}
          deleteServerAction={bulkDeleteDiscounts}
          page={params?.page}
          toolbarLeft={
            <div className="flex flex-col sm:flex-row gap-3 flex-1 min-w-0">
              <div className="relative w-full sm:max-w-sm">
                <SearchInput
                  name="keyword"
                  placeholder="Search by name, voucher code"
                  className="pl-8 w-full h-9"
                />
              </div>
              <SelectorFilter
                label="All Discount Types"
                options={DISCOUNT_TYPE_OPTIONS}
                defaultValue="__all__"
                keyword="discountType"
                initialId={params?.discountType}
              />
            </div>
          }
          toolbarRight={
            <Link href="/discounts/add">
              <Button size="sm" className="gap-1.5 h-9">
                <Plus className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                  Add New
                </span>
              </Button>
            </Link>
          }
        />
      </Suspense>
    </div>
  );
}
